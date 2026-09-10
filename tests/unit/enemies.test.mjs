// 적 데이터 감사: 잡담(idle) 문구는 다른 적을 가리키면 안 된다 — 그 적이 죽은 뒤에도 뜨기 때문 (사용자 2026-09-10 "블루 CS 가 레드 CS 를 힐끗 본다 — 레드 죽었을 때도 뜨니까").
import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMIES } from '../../src/data/enemies.js';
import { PATTERNS } from '../../src/battle/bullets.js';
import fs from 'node:fs';

test('test_enemies_idle_lines_do_not_mention_other_enemies', () => {
  const names = Object.values(ENEMIES).map((e) => e.name);
  for (const [id, e] of Object.entries(ENEMIES)) for (const line of [...(e.lines?.idle || []), ...(e.lines?.speak || [])]) {
    for (const other of names) if (other !== e.name) assert.ok(!line.includes(other), `${id} idle 문구가 다른 적 '${other}' 를 언급: ${line}`);
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
    for (const c of e.patterns || []) { assert.ok(PATTERNS[c.type], `${id}: 모르는 탄막 패턴 '${c.type}'`); for (const q of c.parts || []) assert.ok(PATTERNS[q.type], `${id}: combo 안 모르는 패턴 '${q.type}'`); if (c.type === 'combo') assert.ok((c.parts || []).length >= 2, `${id}: combo 는 parts 2개 이상`); }
    for (const c of e.patterns || []) for (const q of [c, ...(c.parts || [])]) if (q.type === 'slam') assert.ok((q.warn ?? 0.55) >= 0.3, `${id}: slam 예고 ${q.warn}s 는 너무 짧다(≥0.3 — 보고 피할 수 있어야)`);
    const img = e.image || e.sheet?.src; assert.ok(img && fs.existsSync(new URL('../../' + img, import.meta.url)), `${id}: 이미지 없음 ${img}`);
  }
});
