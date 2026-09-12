import test from 'node:test';
import assert from 'node:assert/strict';
import { YONGJUN_SHOP } from '../../src/data/shops.js';
import { ITEMS } from '../../src/data/items.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { purchaseShopItem, shopItemState } from '../../src/core/shop.js';
import { QA_POINTS, stateFromFlags } from '../../src/core/story.js';

const saveFields = ['flags', 'inventory', 'party', 'partyHp', 'money', 'attack', 'hpBonus'];
const snapshot = (game) => JSON.parse(JSON.stringify(Object.fromEntries(saveFields.map((key) => [key, game[key]]))));
const makeGame = (state = {}) => ({
  flags: {}, inventory: [], party: ['gyeongsub', 'ppaman'], partyHp: {}, money: 5000, attack: 2, hpBonus: 20,
  saves: [],
  has(key) { return !!this.flags[key]; },
  setFlag(key) { this.flags[key] = true; },
  maxHpOf(id) { return (CHARACTERS[id]?.hp ?? 100) + this.hpBonus; },
  hpOf(id) { const max = this.maxHpOf(id); return Math.max(0, Math.min(max, this.partyHp[id] ?? max)); },
  autosave() { this.saves.push(snapshot(this)); },
  ...state,
});

test('test_shop_catalog_prices_effects_and_consumable_contract', () => {
  assert.deepEqual(YONGJUN_SHOP.map(({ name, price }) => [name, price]), [['에그타르트', 50], ['위장약', 100], ['씨알리스', 1000], ['바세린', 1500]]);
  for (const item of YONGJUN_SHOP.filter((item) => item.item)) assert.equal(ITEMS[item.item].kind, 'plain');
  assert.equal(ITEMS['에그타르트'].heal, 100);
  assert.equal(ITEMS['위장약'].heal, 200);
});

test('test_shop_repeated_consumables_cost_money_and_save_complete_transaction', () => {
  const game = makeGame({ money: 200 });
  for (const id of ['eggtart', 'eggtart', 'stomach_medicine']) assert.equal(purchaseShopItem(game, id).ok, true);
  assert.deepEqual(game.inventory, ['에그타르트', '에그타르트', '위장약']);
  assert.equal(game.money, 0);
  assert.equal(game.saves.length, 3);
  assert.deepEqual(game.saves.at(-1), snapshot(game));
});

test('test_shop_unknown_insufficient_and_cancel_inspection_do_not_mutate_or_save', () => {
  const game = makeGame({ money: 49 });
  const before = snapshot(game);
  assert.equal(shopItemState(game, 'cialis').reason, 'insufficient_money');
  assert.equal(purchaseShopItem(game, 'eggtart').reason, 'insufficient_money');
  assert.equal(purchaseShopItem(game, 'missing').reason, 'unknown');
  assert.deepEqual(snapshot(game), before);
  assert.equal(game.saves.length, 0);
});

test('test_shop_cialis_applies_once_to_shared_attack_without_inventory_item', () => {
  const game = makeGame();
  assert.equal(purchaseShopItem(game, 'cialis').ok, true);
  assert.equal(game.attack, 3);
  assert.equal(game.money, 4000);
  assert.equal(game.flags.shop_yongjun_cialis, true);
  assert.deepEqual(game.inventory, []);
  const before = snapshot(game);
  assert.equal(purchaseShopItem(game, 'cialis').reason, 'sold_out');
  assert.deepEqual(snapshot(game), before);
  assert.equal(game.saves.length, 1);
});

test('test_shop_vaseline_preserves_missing_hp_for_leader_and_party_and_returning_member', () => {
  const game = makeGame({ party: ['ppaman'], partyHp: { hyungsub: 35, ppaman: 0, gyeongsub: 51 } });
  const before = Object.fromEntries(['hyungsub', 'ppaman', 'gyeongsub'].map((id) => [id, { max: game.maxHpOf(id), hp: game.hpOf(id) }]));
  assert.equal(purchaseShopItem(game, 'vaseline').ok, true);
  assert.equal(game.hpBonus, 40);
  assert.equal(game.money, 3500);
  for (const [id, old] of Object.entries(before)) {
    assert.equal(game.maxHpOf(id), old.max + 20);
    assert.equal(game.hpOf(id), old.hp + 20);
    assert.equal(game.maxHpOf(id) - game.hpOf(id), old.max - old.hp);
  }
  assert.deepEqual(game.inventory, []);
});

test('test_shop_shared_upgrades_cover_future_party_and_default_full_hp', () => {
  const game = makeGame({ party: [], attack: 1, hpBonus: 0 });
  purchaseShopItem(game, 'cialis');
  purchaseShopItem(game, 'vaseline');
  game.party.push('gyeongsub', 'ppaman');
  for (const id of ['hyungsub', ...game.party]) {
    assert.equal(game.maxHpOf(id), CHARACTERS[id].hp + 20);
    assert.equal(game.hpOf(id), game.maxHpOf(id));
  }
  assert.equal(game.attack, 2);
});

test('test_shop_save_reload_keeps_purchases_sold_out_without_amplification', () => {
  let game = makeGame();
  purchaseShopItem(game, 'cialis');
  purchaseShopItem(game, 'vaseline');
  const expected = snapshot(game);
  for (let i = 0; i < 3; i++) {
    game = makeGame(snapshot(game));
    assert.equal(purchaseShopItem(game, 'cialis').reason, 'sold_out');
    assert.equal(purchaseShopItem(game, 'vaseline').reason, 'sold_out');
    assert.deepEqual(snapshot(game), expected);
    assert.equal(game.saves.length, 0);
  }
  const otherSlot = makeGame();
  assert.equal(shopItemState(otherSlot, 'cialis').ok, true);
  assert.equal(shopItemState(otherSlot, 'vaseline').ok, true);
});

test('test_shop_qa_reconstruction_adds_upgrades_after_story_buffs_and_subtracts_cost_once', () => {
  const flags = { teal9_boss_won: true, shop_yongjun_cialis: true, shop_yongjun_vaseline: true };
  const options = { enemyMoney: () => 1500 };
  const expected = { inventory: [], money: 500, attack: 3, hpBonus: 40 };
  assert.deepEqual(stateFromFlags(flags, options), expected);
  assert.deepEqual(stateFromFlags(flags, options), expected);
  const reconstructed = makeGame({ ...expected, flags });
  assert.equal(shopItemState(reconstructed, 'cialis').reason, 'sold_out');
  assert.equal(shopItemState(reconstructed, 'vaseline').reason, 'sold_out');
  assert.equal(stateFromFlags({ shop_yongjun_cialis: true }).money, 0);
});

test('test_shop_normal_lounge_qa_does_not_grant_purchases_and_legacy_flags_remain_unrelated', () => {
  const point = QA_POINTS.find((point) => point.id === 'maillard_lounge');
  assert.ok(point);
  for (const item of YONGJUN_SHOP.filter((item) => item.onceFlag)) assert.equal(!!point.flags?.[item.onceFlag], false);
  const derived = stateFromFlags(point.flags);
  assert.equal(derived.attack, 2);
  assert.equal(derived.hpBonus, 20);
  const legacy = makeGame({ flags: { vaseline: true } });
  assert.equal(shopItemState(legacy, 'vaseline').ok, true);
});
