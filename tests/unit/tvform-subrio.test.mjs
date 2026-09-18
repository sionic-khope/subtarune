// 특별 패턴 1 섭리오(2026-09-18 사용자 보정) 순수 로직 검사:
//   ① 원작처럼 요플래 → 경섭 → 억빠맨 순으로 하늘에서 떨어지고, 셋이 다 착지하고 1.9초 뒤에야 도트 영클이 하늘에서 쿵 떨어진다(걸어오지 않는다).
//   ② 레이저는 영클 총구에서 왼쪽으로 뻗는다(맞으면 15 피해).  ③ 그릴 때 영클 시트를 뒤집지 않는다(시트가 이미 왼쪽을 본다 — 뒤집으면 등지고 쏜다) + 1.9배.
//   ④ 쓰러진 동안에는 요플래가 때리지 않아도 억빠맨의 불·경섭의 시계가 같은 카운터로 쌓인다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSubrioGame } from '../../src/battle/modes/tvform-subrio.js';
import { YOUNGCLE_SPECIAL as S } from '../../src/data/youngcle-special.js';

const K = S.subrio;
const GROUND = K.rows.findIndex(r => /^#=+#$/.test(r)) * 16;

const fakeBattle = () => {
  const yc = { id: 'youngcle_tvform', hp: 200, x: 340, y: 246 };
  let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  return { yc, sfxLog: [], hurt: [], hits: [], shakes: [],
    sfx(n) { this.sfxLog.push(n); }, rnd,
    get game() { const self = this; return { set shake(v) { self.shakes.push(v); }, get shake() { return null; } }; },
    hitEnemy(e, by, dmg) { this.hits.push(dmg); e.hp -= dmg; return dmg; },
    hurtParty(d) { this.hurt.push(d); },
    board: { setTarget() {} }, setText() {} };
};
const input = (state = {}) => ({ down: k => !!state[k], just: k => !!state['just:' + k] });
const runUntil = (g, pred, limit = 60, inp = input()) => { const step = 1 / 60; let t = 0; while (!pred(g.snapshot) && t < limit) { g.update(step, typeof inp === 'function' ? inp(t) : inp); t += step; } return t; };

test('test_party_falls_in_order_then_youngcle_drops_from_sky', () => {
  const b = fakeBattle(); const g = createSubrioGame(b, b.yc, K);
  let first = g.snapshot;
  assert.deepEqual(first.party.map(p => p.id), ['hyungsub', 'gyeongsub', 'ppaman'], '떨어지는 순서는 요플래 → 경섭 → 억빠맨');
  assert.equal(first.phase, 'drop');
  assert.ok(first.party.every(p => !p.dropped), '시작할 때는 아직 아무도 안 내려왔다');
  assert.equal(first.ycDropped, false);
  assert.equal(first.yc.y, K.ycDrop.from, '도트 영클은 하늘(맵 밖)에서 시작한다');
  // 착지 순서: 대장 → 경섭 → 억빠맨 (0.55초 간격으로 떨어지므로 착지도 그 순서)
  const landed = [];
  const step = 1 / 60; let t = 0;
  while (t < 12 && g.snapshot.phase !== 'lasers') {
    g.update(step, input()); t += step;
    for (const p of g.snapshot.party) if (p.dropped && !landed.includes(p.id)) landed.push(p.id);
    if (g.snapshot.phase === 'drop') assert.equal(g.snapshot.ycDropped, false, '파티가 다 내려오기 전에는 영클이 안 떨어진다');
  }
  assert.deepEqual(landed, ['hyungsub', 'gyeongsub', 'ppaman'], '착지 순서');
  assert.equal(g.snapshot.phase, 'lasers');
  assert.equal(g.snapshot.ycDropped, true);
  assert.equal(g.snapshot.yc.x, K.ycStand, '영클은 오른쪽 자리에 선다');
  assert.equal(g.snapshot.yc.y, GROUND, '하늘에서 떨어져 바닥에 선다');
  assert.ok(b.sfxLog.filter(n => n === K.drop.sfx).length === 3, '셋 다 착지음이 난다');
  assert.ok(b.sfxLog.includes(K.ycDrop.sfx), '영클 착지 쿵');
  assert.ok(b.shakes.some(s => s && s.amp === K.ycDrop.shake.amp), '영클이 떨어질 때 화면이 흔들린다');
  assert.ok(t > K.drop.wait, `대장 착지 뒤 ${K.drop.wait}초를 기다린 뒤에야 시작한다 (${t.toFixed(2)}s)`);
});

test('test_laser_fires_leftward_from_youngcle_and_hurts_party', () => {
  const b = fakeBattle(); const g = createSubrioGame(b, b.yc, K);
  runUntil(g, s => s.phase === 'lasers', 12);
  // 첫 레이저가 발사될 때까지
  runUntil(g, s => s.lasers.some(l => l.fired), 8);
  assert.ok(g.snapshot.lasers.some(x => x.fired), '레이저가 발사됐다');
  // 발사 직후 두 프레임: 빔이 총구에서 왼쪽으로 자라는 중
  g.update(1 / 60, input()); g.update(1 / 60, input());
  const l = g.snapshot.lasers.find(x => x.fired);
  assert.ok(l, '빔이 살아 있다');
  assert.ok(l.x2 < K.ycStand, '총구는 영클의 왼쪽(파티 쪽)이다');
  assert.ok(l.x1 < l.x2, '빔은 총구에서 왼쪽으로 뻗는다');
  // fire 초가 지나면 왼쪽 벽까지 닿는다
  runUntil(g, s => { const f = s.lasers.find(x => x.fired); return !!f && f.x1 <= 16; }, 2);
  const full = g.snapshot.lasers.find(x => x.fired);
  assert.ok(full && full.x1 <= 16, '0.12초 뒤에는 왼쪽 벽까지 뻗어 있다');
  assert.ok(K.lasers.heights.includes(GROUND - l.y), '레이저 높이는 바닥·발판 1단·2단 중 하나');
  // 요플래는 왼쪽 바닥에 서 있으므로 바닥 높이 레이저에 맞는다 → 파티 15 피해
  runUntil(g, () => b.hurt.length > 0, 14);
  assert.deepEqual(b.hurt.slice(0, 1), [K.lasers.damage], '레이저에 맞으면 15 피해');
});

test('test_youngcle_sprite_is_drawn_facing_left_and_scaled', async () => {
  // 그림 뒤집기를 기록하는 가짜 캔버스: 영클 시트에 scale(-1,1) 이 걸리면(= 오른쪽을 보면) 잡는다
  const draws = [];
  const makeCtx = (record) => {
    let sx = 1, sy = 1; const stack = [];
    const noop = () => {};
    return { imageSmoothingEnabled: true, font: '', textAlign: '', textBaseline: '', fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
      save() { stack.push([sx, sy]); }, restore() { const s = stack.pop(); if (s) { sx = s[0]; sy = s[1]; } },
      translate: noop, scale(a, b) { sx *= a; sy *= b; }, rotate: noop,
      createLinearGradient: () => ({ addColorStop: noop }),
      fillRect: noop, strokeRect: noop, clearRect: noop, setLineDash: noop, fillText: noop, strokeText: noop,
      beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, arc: noop, ellipse: noop, fill: noop, stroke: noop, clip: noop,
      measureText: () => ({ width: 10 }),
      drawImage(img, ...args) { if (record) draws.push({ src: img && img.src, sx, sy, args }); } };
  };
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => makeCtx(false) }) };
  globalThis.Image = class { constructor() { this.onload = null; this.onerror = null; } set src(v) { this._src = v; queueMicrotask(() => this.onload && this.onload()); } get src() { return this._src; } };
  try {
    const b = fakeBattle(); const g = createSubrioGame(b, b.yc, K);
    await new Promise(r => setTimeout(r, 10));
    runUntil(g, s => s.phase === 'lasers', 12);
    const ctx = makeCtx(true);
    g.draw(ctx);
    const yc = draws.find(d => (d.src || '').includes('subrio_youngcle'));
    assert.ok(yc, '도트 영클을 그렸다');
    assert.ok(yc.sx > 0, `영클 시트는 그대로 그려야 왼쪽(파티 쪽)을 본다 — scale x ${yc.sx}`);
    assert.equal(yc.sx, K.yc.scale, `1.9배로 크게 그린다 (${yc.sx})`);
    // 요플래: 시트는 오른쪽을 보므로 왼쪽으로 걸으면 뒤집힌다
    const hero = draws.find(d => (d.src || '').includes('subrio_pantheon'));
    assert.ok(hero && hero.sx > 0, '오른쪽을 보고 있으면 그대로');
    runUntil(g, () => false, 1.0, input({ left: true }));
    draws.length = 0; g.draw(ctx);
    const heroL = draws.find(d => (d.src || '').includes('subrio_pantheon'));
    assert.ok(heroL && heroL.sx < 0, '왼쪽으로 걸으면 왼쪽을 본다');
  } finally { delete globalThis.document; delete globalThis.Image; }
});

test('test_companions_attack_the_downed_youngcle_and_share_the_hit_counter', () => {
  const b = fakeBattle(); const g = createSubrioGame(b, b.yc, K);
  // 오른쪽만 계속 눌러 영클 옆까지 간다(C 는 한 번도 안 누른다 → 창·밟기 없음)
  const right = input({ right: true });
  runUntil(g, s => s.phase === 'down', 40, right);
  assert.equal(g.snapshot.phase, 'down');
  assert.equal(g.snapshot.hits, 0, '쓰러지기 전에는 명중이 없다');
  const before = g.snapshot.party;
  assert.ok(before.every(p => p.x > 250), `셋 다 영클 쪽으로 따라왔다 ${JSON.stringify(before.map(p => p.x))}`);
  runUntil(g, s => s.phase !== 'down', 12, right);
  const snap = g.snapshot;
  assert.ok(snap.hits > 0, `요플래가 안 때려도 억빠맨 불·경섭 시계가 맞는다 (${snap.hits}타)`);
  assert.equal(snap.damageDealt, Math.min(K.down.maxDamage, Math.floor(snap.hits / K.down.hitsPerDamage)), '같은 카운터로 5대마다 1 피해');
  assert.equal(b.yc.hp, 200 - snap.damageDealt);
  assert.ok(b.sfxLog.includes(K.mateSfx.fire) || b.sfxLog.includes(K.mateSfx.clock), '동료 공격 소리가 난다');
});

// ── B 판(가로로 긴 치지직 맵 + 내려찍기) ──
const Bk = K.b;
const makeB = () => { const b = fakeBattle(); return { b, g: createSubrioGame(b, b.yc, K, { variant: 'b' }) }; };
const toPhase = (g, want, limit, inp) => runUntil(g, s => s.phase === want, limit, inp);

test('test_variant_b_map_is_long_and_teal_and_camera_follows_hero', () => {
  assert.equal(Bk.rows.length, 22); assert.ok(Bk.rows.every(r => r.length === 72), '72칸 가로 긴 맵');
  assert.ok(Bk.rows[20].startsWith('#====') && /^#=+#$/.test(Bk.rows[20]), '바닥');
  assert.ok(Bk.theme.tiles.includes('teal'), '치지직(1-2 teal) 타일');
  const { g } = makeB();
  assert.equal(g.snapshot.variant, 'b');
  assert.equal(g.snapshot.cam, 0, '왼쪽 끝에서는 카메라가 0');
  // 오른쪽으로 한참 달리면 카메라가 따라 흐른다(가로로 긴 맵)
  toPhase(g, 'vanish', 12);
  runUntil(g, () => false, 4, input({ right: true }));
  assert.ok(g.snapshot.cam > 100, `카메라가 요플래를 따라 흐른다 (cam ${g.snapshot.cam})`);
  assert.ok(g.snapshot.cam <= 72 * 16 - 480, '맵 끝을 넘지 않는다');
});

test('test_variant_b_marker_follows_hero_then_locks_before_the_slam', () => {
  const { g } = makeB();
  toPhase(g, 'marker', 12);
  const first = g.snapshot;
  assert.ok(first.marker, '영역 표시가 뜬다');
  assert.ok(Math.abs(first.marker.x - (first.hero.x + 8)) <= 4, `영역은 요플래 자리에 잡힌다 ${JSON.stringify([first.marker.x, first.hero.x])}`);
  // 표시 동안 오른쪽으로 달린다: markerTrack 까지는 따라오다 굳는다
  const right = input({ right: true });
  const step = 1 / 60; let t = 0;
  while (g.snapshot.phase === 'marker' && t < Bk.markerTrack + 0.02) { g.update(step, right); t += step; }
  const locked = g.snapshot.marker.x;
  while (g.snapshot.phase === 'marker' && t < 2) { g.update(step, right); t += step; }
  assert.equal(g.snapshot.phase, 'dive', '표시가 끝나면 하늘에서 떨어진다');
  assert.equal(g.snapshot.yc.x, locked, '굳은 자리로 내려찍는다(따라오다 멈춘다)');
  assert.ok(g.snapshot.hero.x > first.hero.x + 20, '그 사이 요플래는 옆으로 피했다');
});

test('test_variant_b_slam_hits_a_standing_hero_once_and_the_shield_blocks_it', () => {
  // 가만히 서 있으면 맞는다 — 한 번의 내려찍기에 한 번만
  const { b, g } = makeB();
  toPhase(g, 'slam', 14);
  runUntil(g, s => s.phase !== 'slam', 2);
  assert.deepEqual(b.hurt, [Bk.slamDamage], `가만히 서 있으면 ${Bk.slamDamage} 피해 한 번`);
  assert.equal(g.snapshot.slams, 1);
  // 방패(X)를 들고 있으면 막힌다
  const { b: b2, g: g2 } = makeB();
  toPhase(g2, 'marker', 14);
  runUntil(g2, s => s.phase !== 'slam' && s.slams >= 1, 4, input({ cancel: true }));
  assert.deepEqual(b2.hurt, [], '방패로 막으면 파티 피해가 없다');
});

test('test_variant_b_stumbles_after_n_slams_then_the_same_attack_window', () => {
  const { b, g } = makeB();
  // 계속 오른쪽으로 달려 내려찍기를 피한다
  const right = input({ right: true });
  toPhase(g, 'stumble', 40, right);
  assert.equal(g.snapshot.slams, Bk.slams, `${Bk.slams}번 내려찍고 발을 헛디딘다`);
  assert.ok(b.sfxLog.filter(n => n === Bk.vanishSfx).length >= Bk.slams, '사라지는 지지직이 매번 난다');
  assert.ok(b.sfxLog.includes(Bk.markerSfx) && b.sfxLog.includes(Bk.slamSfx), '영역 표시음·착지음');
  toPhase(g, 'down', 3, right);
  assert.equal(g.snapshot.yc.frame, 4, '넘어진 프레임');
  // A 판과 같은 공격 타이밍: 창 연타로 5대마다 1 피해
  let frame = 0;
  const step = 1 / 60; let t = 0;
  while (g.snapshot.phase === 'down' && t < 12) { g.update(step, input(frame % 8 === 0 ? { 'just:confirm': true } : {})); frame++; t += step; }
  const snap = g.snapshot;
  assert.ok(snap.hits > 0, `쓰러진 동안 ${snap.hits}타`);
  assert.equal(snap.damageDealt, Math.min(K.down.maxDamage, Math.floor(snap.hits / K.down.hitsPerDamage)), '5대마다 1 피해');
  assert.equal(b.yc.hp, 200 - snap.damageDealt);
  runUntil(g, s => s.phase === 'done', 4);
  assert.equal(g.snapshot.phase, 'done');
});

test('test_variant_b_youngcle_turns_to_face_the_hero', () => {
  const { g } = makeB();
  // 영클은 요플래 오른쪽(ycEnterX 356 > heroSpawn 96)에 떨어지므로 왼쪽을 본다 — 시트 기본 방향이라 뒤집지 않는다
  toPhase(g, 'vanish', 12);
  assert.equal(g.snapshot.yc.facing, -1, '요플래가 왼쪽에 있으면 왼쪽을 본다');
  // 영역이 굳은 뒤에도 계속 오른쪽으로 달리면 요플래가 내려찍는 자리보다 오른쪽에 선다 → 돌아본다
  const right = input({ right: true });
  toPhase(g, 'dive', 4, right);
  const s2 = g.snapshot;
  assert.ok(s2.hero.x + 8 > s2.yc.x, '요플래가 내려찍는 자리 오른쪽으로 빠져나갔다');
  assert.equal(s2.yc.facing, 1, '오른쪽에 있으면 오른쪽을 본다(그릴 때만 뒤집는다)');
});
