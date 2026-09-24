// 적 데이터 감사: 잡담(idle) 문구는 다른 적을 가리키면 안 된다 — 그 적이 죽은 뒤에도 뜨기 때문 (사용자 2026-09-10 "블루 CS 가 레드 CS 를 힐끗 본다 — 레드 죽었을 때도 뜨니까").
import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMIES } from '../../src/data/enemies.js';
import { Bullet, PATTERNS } from '../../src/battle/bullets.js';
import { getBattleMode } from '../../src/battle/modes.js';
import fs from 'node:fs';

test('test_enemies_idle_lines_do_not_mention_other_enemies', () => {
  const names = Object.values(ENEMIES).map((e) => e.name);
  for (const [id, e] of Object.entries(ENEMIES)) for (const line of [...(e.lines?.idle || []), ...(e.lines?.speak || [])]) {
    for (const other of names) if (other !== e.name && !e.name.includes(other)) assert.ok(!line.includes(other), `${id} idle 문구가 다른 적 '${other}' 를 언급: ${line}`);   // 자기 이름에 포함된 이름('레드 CS' 의 '레드')은 제외
    assert.ok(!/서로|둘이서|둘이 |둘 다|CS 들이|들이 서로/.test(line), `${id} idle 문구가 복수의 적을 전제: ${line}`);   // '들이쉰다' 같은 낱말은 제외
  }
});
test('test_enemies_every_entry_has_hp_lines_and_money', () => {
  for (const [id, e] of Object.entries(ENEMIES)) {
    assert.ok(Number.isInteger(e.hp) && e.hp > 0, `${id}: hp`);
    assert.ok(e.lines?.appear && e.lines?.die && (e.lines.idle || []).length >= 1, `${id}: lines.appear/die/idle`);
    assert.ok(Number.isInteger(e.money ?? 30), `${id}: money`);
  }
});
test('test_enemies_patterns_and_images_exist', () => {
  for (const [id, e] of Object.entries(ENEMIES)) {
    for (const c of e.patterns || []) { if (c.mode) assert.equal(typeof getBattleMode('enemy', c.mode), 'function', `${id}: 모르는 적 턴 모드 '${c.mode}'`); else assert.ok(PATTERNS[c.type], `${id}: 모르는 탄막 패턴 '${c.type}'`); for (const q of c.parts || []) assert.ok(PATTERNS[q.type], `${id}: combo 안 모르는 패턴 '${q.type}'`); if (c.type === 'combo') assert.ok((c.parts || []).length >= 2, `${id}: combo 는 parts 2개 이상`); }
    for (const c of e.patterns || []) for (const q of [c, ...(c.parts || [])]) if (['slam', 'zone', 'beam', 'giant', 'bomb'].includes(q.type)) assert.ok((q.warn ?? 0.55) >= 0.3, `${id}: ${q.type} 예고 ${q.warn}s 는 너무 짧다(≥0.3 — 보고 피할 수 있어야)`);
    const img = e.image || e.sheet?.src; assert.ok(img && fs.existsSync(new URL('../../' + img, import.meta.url)), `${id}: 이미지 없음 ${img}`);
  }
});

test('test_baron_has_250_hp_cannon_support_and_standard_enemy_patterns', () => {
  const baron = ENEMIES.baron;
  assert.equal(baron.hp, 250);
  assert.equal(baron.support, 'baron_cannon');
  assert.equal(baron.defense, undefined);
  assert.equal(baron.patterns.length, 6);
  assert.equal(baron.damage, 12);
  assert.ok(baron.patterns.every((p) => p.type.startsWith('baron_') && p.warn >= 0.45));
  assert.deepEqual(baron.pivot, [128, 238]);
  assert.equal(baron.sheet.px, 1);
  assert.equal(baron.idle.swayX, 0);
  assert.equal(baron.idle.swayY, 0);
});

test('test_castle_regular_enemy_damage_is_25_without_pattern_or_bullet_overrides', () => {
  const health = { yisub: 45, syndrasub: 45, taliyahsub: 45, aurelionsub: 45,
    seobruto: 50, jiroesub: 50, udyrsub: 50 };
  for (const [id, hp] of Object.entries(health)) {
    const enemy = ENEMIES[id];
    assert.equal(enemy.hp, hp, id);
    assert.equal(enemy.damage, 25, id);
    assert.equal(enemy.damageStep, 0, id);
    for (const config of enemy.patterns) {
      assert.equal(config.damage, undefined, `${id}/${config.type} inherits enemy damage`);
      const pattern = PATTERNS[config.type](config), emitted = [];
      const api = { box: { x: 120, y: 130, w: 240, h: 170 }, soul: { x: 240, y: 210, r: 6 },
        rnd: () => 0.4, sfx() {}, present() {},
        emit(spec) { const bullet = new Bullet(spec); emitted.push(bullet); return bullet; } };
      for (let t = 0; t <= pattern.duration + 0.1; t += 1 / 60) pattern.update(t, 1 / 60, api);
      assert.ok(emitted.some(bullet => !bullet.harmless), `${id}/${config.type} emits attacks`);
      for (const bullet of emitted.filter(b => !b.harmless)) {
        assert.equal(bullet.dmg, null, `${id}/${config.type} inherits pattern damage`);
      }
    }
  }
  for (const id of ['malzahar_sub', 'choimis_flower', 'drum_devil', 'youngcle_tvform', 'obangsun', 'naram_giant']) {
    assert.equal(ENEMIES[id].damage, 15, `${id} is outside the regular castle roster`);
  }
});
