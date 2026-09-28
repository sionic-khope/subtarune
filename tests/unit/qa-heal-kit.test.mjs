import test from 'node:test';
import assert from 'node:assert/strict';
import { qaHealKit, QA_HEAL_KIT_COUNT, QA_POINTS } from '../../src/core/story.js';
import { ITEMS } from '../../src/data/items.js';

const count = (list, name) => list.filter(n => n === name).length;

// BUILD406(사용자 “shift q 로 넘어갈 때 각 구간마다 얻을 수 있는 아이템들 빵빵하게, 힐템 10개씩”)
test('the Shift+Q heal kit gives ten of each heal item reachable by that point', () => {
  assert.deepEqual(qaHealKit({}), []);
  const early = qaHealKit({ teal3_cs_won: true });
  assert.equal(count(early, '바나나'), QA_HEAL_KIT_COUNT);
  assert.equal(count(early, '위장약'), 0);
  const late = qaHealKit({ teal3_cs_won: true, maillard_cart_done: true, choimis_rescued: true });
  for (const name of ['바나나', '에그타르트', '위장약', '핫도그', '기름떡볶이']) {
    assert.equal(count(late, name), QA_HEAL_KIT_COUNT, name);
    assert.equal(ITEMS[name].kind, 'plain', name);
    assert.ok(ITEMS[name].heal > 0, name);
  }
});

test('the last Shift+Q points carry the full kit', () => {
  const last = QA_POINTS.filter(p => !p.hidden).at(-1);
  assert.ok(qaHealKit(last.flags || {}).length >= 5 * QA_HEAL_KIT_COUNT, last.id);
});
