// 탄막 템플릿 계약 (2026-09-11): 모든 PATTERNS 가 기본 옵션으로 탄을 내고, 영역 계열은 예고 동안 무해·그 뒤 사각형 안만 맞으며, giant 는 띠 예고 뒤 큰 탄, homing 은 소울 쪽으로 꺾이고, bomb 은 고리 예고 뒤 파편.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PATTERNS, Bullet } from '../../src/battle/bullets.js';
import { ENEMIES } from '../../src/data/enemies.js';

const BOX = { x: 140, y: 139, w: 200, h: 150 };
const SOUL = { x: 240, y: 214, r: 6 };
function run(type, opts = {}) {
  // Arrange: 결정적 난수 + 탄을 모으는 가짜 api
  const p = PATTERNS[type](opts); const out = []; let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const images = Object.fromEntries(Object.keys(ENEMIES.park_guardian.projectiles).map(key => [key, { key }]));
  const api = { box: BOX, soul: SOUL, rnd, images, emit: (o) => out.push(new Bullet(o)) };
  // Act: duration 동안 60fps 로 돌린다
  const dt = 1 / 60; for (let t = 0; t < p.duration + 0.05; t += dt) p.update(t, dt, api);
  return { p, out };
}

test('test_patterns_every_template_emits_bullets_with_default_options', () => {
  for (const type of Object.keys(PATTERNS)) {
    if (type === 'combo') continue;
    const { out } = run(type);
    assert.ok(out.length > 0, `${type}: 기본 옵션으로 탄이 하나도 안 나온다`);
  }
});

test('test_patterns_zone_and_beam_are_harmless_during_warn_then_hit_only_inside_rect', () => {
  for (const type of ['zone', 'beam']) {
    const { out } = run(type, { warn: 0.8, hit: 0.3 });
    const z = out.find((b) => b.zone && !b.harmless); assert.ok(z, `${type}: 영역 탄 없음`);
    assert.ok(z.x >= BOX.x && z.x + z.w <= BOX.x + BOX.w && z.y >= BOX.y && z.y + z.h <= BOX.y + BOX.h, `${type}: 영역이 상자 밖으로 나간다`);
    const inside = { x: z.x + z.w / 2, y: z.y + z.h / 2, r: 6 }, outside = { x: BOX.x - 40, y: BOX.y - 40, r: 6 };
    z.age = 0.4; assert.equal(z.hits(inside), false, `${type}: 예고 동안 맞으면 안 된다`);
    z.age = 0.9; assert.equal(z.hits(inside), true, `${type}: 예고 뒤 안에 있으면 맞아야 한다`); assert.equal(z.hits(outside), false, `${type}: 밖은 안 맞는다`);
    assert.equal(z.out({ x: 0, y: 0, w: 480, h: 360 }), false); z.age = 1.2; assert.equal(z.out({ x: 0, y: 0, w: 480, h: 360 }), true, `${type}: warn+hit 뒤 사라져야 한다`);
  }
});

test('test_patterns_zone_safe_leaves_exactly_that_many_cells_clear', () => {
  const { out } = run('zone', { cols: 3, rows: 2, safe: 1, every: 100 });
  assert.equal(out.length, 5, '3×2 에서 safe 1 → 위험 칸 5');
});

test('test_patterns_giant_telegraphs_a_harmless_band_then_sends_one_big_bullet_along_it', () => {
  const { out } = run('giant', { warn: 0.8, r: 34, from: 'left', every: 100 });
  const band = out.find((b) => b.zone && b.harmless), big = out.find((b) => !b.zone && b.r >= 24);
  assert.ok(band && big, '띠 예고와 거대 탄이 둘 다 있어야 한다');
  assert.ok(big.y >= band.y && big.y <= band.y + band.h && big.vx > 0, '거대 탄은 예고 띠 안을 지나 오른쪽으로 간다');
});

test('test_patterns_homing_bullets_turn_toward_the_soul_and_go_harmless_before_expiring', () => {
  const { out } = run('homing', { speed: 90, turn: 2.2, life: 2.6 });
  const b = out[0]; assert.equal(typeof b.steer, 'function'); assert.equal(b.life, 2.6);
  b.x = 100; b.y = 100; b.vx = 90; b.vy = 0; b.age = 0;                          // 소울(240,214)은 오른쪽 아래
  for (let i = 0; i < 30; i++) b.steer(b, 1 / 60);
  assert.ok(b.vy > 0, '소울 쪽(아래)으로 꺾여야 한다'); assert.ok(Math.abs(Math.hypot(b.vx, b.vy) - 90) < 0.01, '속도 크기는 유지');
  b.age = 2.5; b.steer(b, 1 / 60); assert.equal(b.harmless, true, '수명 끝 0.3s 는 무해');
});

test('test_patterns_bomb_marks_the_landing_spot_then_bursts_fragments_from_it', () => {
  const { out } = run('bomb', { warn: 0.7, frags: 8, every: 100 });
  const mark = out.find((b) => b.shape === 'mark'); assert.ok(mark && mark.harmless && mark.life === 0.7, '착지 고리(무해, warn 동안)');
  const shell = out.find((b) => b.shape === 'cannonball'); assert.ok(shell && shell.harmless, '떨어지는 포탄은 무해');
  const frags = out.filter((b) => !b.harmless && b.shape === 'circle'); assert.equal(frags.length, 8);
  for (const f of frags) { assert.equal(Math.round(f.x), Math.round(mark.x)); assert.equal(Math.round(f.y), Math.round(mark.y)); }
});

test('test_patterns_burst_spreads_n_equal_speed_bullets_evenly', () => {
  const { out } = run('burst', { n: 12, speed: 110, every: 100 });
  assert.equal(out.length, 12);
  for (const b of out) assert.ok(Math.abs(Math.hypot(b.vx, b.vy) - 110) < 0.01);
  const angles = out.map((b) => Math.atan2(b.vy, b.vx)).sort((a, c) => a - c);
  for (let i = 1; i < angles.length; i++) assert.ok(Math.abs((angles[i] - angles[i - 1]) - Math.PI / 6) < 0.01, '30° 간격');
});

test('test_baron_patterns_emit_damage_with_warned_areas_and_safe_space', () => {
  for (const config of ENEMIES.baron.patterns) {
    const pattern = PATTERNS[config.type](config);
    let bullets = [], damaging = 0, seed = 17;
    const dt = 1 / 60;
    const api = {
      box: BOX, soul: SOUL,
      rnd: () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; },
      emit: (options) => {
        const bullet = new Bullet(options);
        if (!bullet.harmless) damaging++;
        if (bullet.zone) assert.ok(bullet.warn >= 0.3, `${config.type}: 영역 예고`);
        bullets.push(bullet);
      },
    };
    assert.ok(pattern.duration >= 6 && pattern.duration <= 7, `${config.type}: 사용자 요청의 긴 보스 방어 시간`);
    for (let t = 0; t < pattern.duration; t += dt) {
      pattern.update(t, dt, api);
      for (const bullet of bullets) bullet.update(dt, BOX);
      bullets = bullets.filter((bullet) => !bullet.out(BOX));
      let safe = false;
      for (let x = BOX.x + 12; x < BOX.x + BOX.w - 12 && !safe; x += 8) {
        for (let y = BOX.y + 12; y < BOX.y + BOX.h - 12 && !safe; y += 8) {
          safe = bullets.every((bullet) => !bullet.hits({ x, y, r: SOUL.r }));
        }
      }
      assert.ok(safe, `${config.type}: ${t.toFixed(2)}초에 피할 공간 없음`);
    }
    assert.ok(damaging > 0, `${config.type}: 피해를 주는 탄이 없음`);
  }
});
