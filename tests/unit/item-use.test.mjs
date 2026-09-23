import test from 'node:test';
import assert from 'node:assert/strict';
import { useFieldItem, useBattleItem } from '../../src/core/item-use.js';
import { normalizeItemNames } from '../../src/data/items.js';

const field = (inventory = ['핫도그', '기름떡볶이']) => ({
  inventory, party: ['gyeongsub', 'ppaman'], partyHp: { hyungsub: 1, gyeongsub: 80, ppaman: 0 }, saves: 0, sounds: [],
  maxHpOf: id => ({ hyungsub: 200, gyeongsub: 180, ppaman: 150 })[id],
  hpOf(id) { return this.partyHp[id]; }, autosave() { this.saves++; },
  sound: { sfx() {} },
});
const combat = (inventory = ['기름떡볶이']) => ({
  game: { inventory }, sounds: [], text: '',
  members: [{ name: '요플래', hp: 1, maxHp: 200 }, { name: '경섭', hp: 175, maxHp: 180 }, { name: '빠맨', hp: 0, maxHp: 150, down: true }],
  sfx(name) { this.sounds.push(name); }, setText(value) { this.text = value; },
});

test('field hotdog affects only selected member and consumes exactly one', () => {
  const game = field();
  assert.equal(useFieldItem(game, '핫도그', 'hyungsub'), true);
  assert.deepEqual(game.partyHp, { hyungsub: 151, gyeongsub: 80, ppaman: 0 });
  assert.deepEqual(game.inventory, ['기름떡볶이']); assert.equal(game.saves, 1);
});

test('field shared food heals current party once, caps each HP and preserves absent member', () => {
  const game = field(['기름떡볶이', '기름떡볶이']); game.partyHp.junhee = 2;
  assert.equal(useFieldItem(game, '기름떡볶이', 'gyeongsub'), true);
  assert.deepEqual(game.partyHp, { hyungsub: 101, gyeongsub: 180, ppaman: 100, junhee: 2 });
  assert.equal(game.inventory.length, 1); assert.equal(game.saves, 1);
});

test('field invalid target or missing item cannot consume or heal', () => {
  const game = field(); const before = JSON.stringify(game);
  assert.equal(useFieldItem(game, '기름떡볶이', 'junhee'), false);
  assert.equal(useFieldItem(game, '위장약', 'hyungsub'), false);
  assert.equal(JSON.stringify(game), before);
});

test('battle shared food consumes once, heals all members and revives downed ally', () => {
  const battle = combat();
  assert.equal(useBattleItem(battle, { name: '기름떡볶이', target: battle.members[0] }), true);
  assert.deepEqual(battle.members.map(m => m.hp), [101, 180, 100]);
  assert.equal(battle.members[2].down, false);
  assert.deepEqual(battle.members.map(m => m.popup.text), ['+100', '+5', '+100']);
  assert.deepEqual(battle.game.inventory, []); assert.deepEqual(battle.sounds, ['heal']);
  assert.equal(useBattleItem(battle, { name: '기름떡볶이', target: battle.members[0] }), false);
  assert.deepEqual(battle.members.map(m => m.hp), [101, 180, 100]);
});

test('battle hotdog remains a single-target capped heal', () => {
  const battle = combat(['핫도그']);
  useBattleItem(battle, { name: '핫도그', target: battle.members[1], member: battle.members[0] });
  assert.deepEqual(battle.members.map(m => m.hp), [1, 180, 0]);
  assert.equal(battle.members[2].down, true);
});

test('negative recovery preserves field minimum and battle down state', () => {
  const game = field(['돌']); useFieldItem(game, '돌', 'hyungsub'); assert.equal(game.partyHp.hyungsub, 1);
  const battle = combat(['돌']); useBattleItem(battle, { name: '돌', target: battle.members[2] });
  assert.equal(battle.members[2].hp, 0); assert.equal(battle.members[2].down, true);
});

test('legacy inventory rename preserves counts and unrelated items without granting upgrades', () => {
  const old = ['더 강한 바세린', '열쇠?', '더 강한 씨알리스', '더 강한 바세린'];
  const converted = normalizeItemNames(old);
  assert.deepEqual(converted, ['핫도그', '열쇠?', '기름떡볶이', '핫도그']);
  assert.equal(old[0], '더 강한 바세린');
  assert.deepEqual(normalizeItemNames(converted), converted);
});
