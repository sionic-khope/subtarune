// 적 데이터 감사: 잡담(idle) 문구는 다른 적을 가리키면 안 된다 — 그 적이 죽은 뒤에도 뜨기 때문 (사용자 2026-09-10 "블루 CS 가 레드 CS 를 힐끗 본다 — 레드 죽었을 때도 뜨니까").
import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMIES } from '../../src/data/enemies.js';

test('test_enemies_idle_lines_do_not_mention_other_enemies', () => {
  const names = Object.values(ENEMIES).map((e) => e.name);
  for (const [id, e] of Object.entries(ENEMIES)) for (const line of [...(e.lines?.idle || []), ...(e.lines?.speak || [])]) {
    for (const other of names) if (other !== e.name) assert.ok(!line.includes(other), `${id} idle 문구가 다른 적 '${other}' 를 언급: ${line}`);
    assert.ok(!/서로|둘이|들이/.test(line), `${id} idle 문구가 복수의 적을 전제: ${line}`);
  }
});
test('test_enemies_every_entry_has_hp_lines_and_money', () => {
  for (const [id, e] of Object.entries(ENEMIES)) {
    assert.ok(Number.isInteger(e.hp) && e.hp > 0, `${id}: hp`);
    assert.ok(e.lines?.appear && e.lines?.die && (e.lines.idle || []).length >= 1, `${id}: lines.appear/die/idle`);
    assert.ok(Number.isInteger(e.money ?? 30), `${id}: money`);
  }
});
