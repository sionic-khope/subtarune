import test from 'node:test';
import assert from 'node:assert/strict';
import { qaHealKit, QA_HEAL_KIT_COUNT, QA_POINTS } from '../../src/core/story.js';
import { ITEMS } from '../../src/data/items.js';

const count = (list, name) => list.filter(n => n === name).length;

// BUILD407(사용자 “50개 말고 각 지점마다 적절한 아이템 10개씩”)
test('the Shift+Q heal kit is ten heal items reachable by that point', () => {
  assert.deepEqual(qaHealKit({}), []);
  const early = qaHealKit({ teal3_cs_won: true });
  assert.deepEqual([early.length, count(early, '바나나')], [10, 10]);
  const ship = qaHealKit({ teal3_cs_won: true, maillard_cart_done: true });
  assert.equal(ship.length, QA_HEAL_KIT_COUNT);
  assert.equal(count(ship, '핫도그') + count(ship, '기름떡볶이'), 0);
  const late = qaHealKit({ teal3_cs_won: true, maillard_cart_done: true, ship_sinking_done: true });
  assert.equal(late.length, QA_HEAL_KIT_COUNT);
  for (const name of new Set([...early, ...ship, ...late])) {
    assert.equal(ITEMS[name].kind, 'plain', name);
    assert.ok(ITEMS[name].heal > 0, name);
  }
});

test('the last Shift+Q points carry the late kit', () => {
  const last = QA_POINTS.filter(p => !p.hidden).at(-1);
  assert.equal(qaHealKit(last.flags || {}).length, QA_HEAL_KIT_COUNT, last.id);
});
