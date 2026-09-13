import test from 'node:test';
import assert from 'node:assert/strict';
import { YONGJUN_SHOP } from '../../src/data/shops.js';
import { ITEMS } from '../../src/data/items.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { purchaseShopItem, saleItemState, sellShopItem, shopItemState } from '../../src/core/shop.js';
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
  assert.deepEqual(YONGJUN_SHOP.map(({ name, price }) => [name, price]), [['에그타르트', 50], ['위장약', 100], ['씨알리스', 10], ['바세린', 10]]);
  assert.deepEqual(YONGJUN_SHOP.filter((item) => item.event).map((item) => item.id), ['cialis', 'vaseline']);
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
  assert.equal(shopItemState(game, 'stomach_medicine').reason, 'insufficient_money');
  assert.equal(purchaseShopItem(game, 'eggtart').reason, 'insufficient_money');
  assert.equal(purchaseShopItem(game, 'missing').reason, 'unknown');
  assert.deepEqual(snapshot(game), before);
  assert.equal(game.saves.length, 0);
});

test('test_shop_cialis_applies_once_to_shared_attack_without_inventory_item', () => {
  const game = makeGame();
  assert.equal(purchaseShopItem(game, 'cialis').ok, true);
  assert.equal(game.attack, 3);
  assert.equal(game.money, 4990);
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
  assert.equal(game.money, 4990);
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
  const expected = { inventory: [], money: 2980, attack: 3, hpBonus: 40 };
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

test('test_shop_captain_qa_has_full_upgraded_party_and_cannot_repurchase_after_reload', () => {
  const point = QA_POINTS.find((point) => point.id === 'maillard_captain');
  assert.ok(point);
  let game = makeGame({ ...stateFromFlags(point.flags), flags: { ...point.flags }, party: [...point.party] });
  const expected = snapshot(game);
  for (let reload = 0; reload < 3; reload++) {
    for (const [id, hp] of [['hyungsub', 140], ['gyeongsub', 160], ['ppaman', 130]]) {
      assert.equal(game.maxHpOf(id), hp);
      assert.equal(game.hpOf(id), hp);
    }
    assert.equal(game.attack, 3);
    assert.equal(purchaseShopItem(game, 'cialis').reason, 'sold_out');
    assert.equal(purchaseShopItem(game, 'vaseline').reason, 'sold_out');
    assert.deepEqual(snapshot(game), expected);
    assert.equal(game.saves.length, 0);
    game = makeGame(snapshot(game));
  }
});

test('test_shop_event_prices_accept_exact_money_and_reject_short_balance', () => {
  for (const id of ['cialis', 'vaseline']) {
    const short = makeGame({ money: 9 });
    const before = snapshot(short);
    assert.equal(purchaseShopItem(short, id).reason, 'insufficient_money');
    assert.deepEqual(snapshot(short), before);
    assert.equal(short.saves.length, 0);
    const exact = makeGame({ money: 10 });
    assert.equal(purchaseShopItem(exact, id).ok, true);
    assert.equal(exact.money, 0);
  }
});

test('test_shop_sale_prices_and_read_only_inspection', () => {
  const game = makeGame({ inventory: ['에그타르트', '위장약', '바나나', '먼지'] });
  const before = snapshot(game);
  for (const [inventoryIndex, price] of [25, 50, 10, 1].entries()) {
    const result = saleItemState(game, inventoryIndex);
    assert.deepEqual(result, { ok: true, reason: null, name: game.inventory[inventoryIndex], item: ITEMS[game.inventory[inventoryIndex]], price, inventoryIndex });
  }
  assert.deepEqual(snapshot(game), before);
  assert.equal(game.saves.length, 0);
});

test('test_shop_sale_removes_only_selected_duplicate_and_saves_complete_transaction', () => {
  const game = makeGame({ inventory: ['에그타르트', '바나나', '에그타르트', '낡은 열쇠'], money: 0, flags: { shop_yongjun_cialis: true, shop_yongjun_vaseline: true } });
  const before = snapshot(game);
  assert.equal(sellShopItem(game, 2).ok, true);
  assert.deepEqual(game.inventory, ['에그타르트', '바나나', '낡은 열쇠']);
  assert.equal(game.money, 25);
  assert.equal(game.saves.length, 1);
  assert.deepEqual(game.saves[0], snapshot(game));
  for (const key of ['flags', 'attack', 'hpBonus', 'partyHp', 'party']) assert.deepEqual(game[key], before[key]);
});

test('test_shop_sale_last_item_then_stale_index_cannot_sell_again', () => {
  const game = makeGame({ inventory: ['먼지'], money: 0 });
  assert.equal(sellShopItem(game, 0).ok, true);
  assert.deepEqual(game.inventory, []);
  assert.equal(game.money, 1);
  assert.equal(sellShopItem(game, 0).reason, 'invalid_index');
  assert.equal(game.money, 1);
  assert.equal(game.saves.length, 1);
});

test('test_shop_sale_direct_commands_reject_key_unknown_and_invalid_indices', () => {
  const names = [...Object.keys(ITEMS).filter((name) => ITEMS[name].kind === 'key'), '미등록 물건', '__proto__'];
  const game = makeGame({ inventory: names });
  const before = snapshot(game);
  for (const [index, name] of names.entries()) {
    assert.equal(saleItemState(game, index).ok, false);
    assert.equal(sellShopItem(game, index).reason, Object.hasOwn(ITEMS, name) ? 'key_item' : 'unknown');
  }
  for (const index of [-1, names.length, 0.5, '0', null, undefined, NaN, Infinity]) {
    assert.equal(sellShopItem(game, index).reason, 'invalid_index');
  }
  assert.deepEqual(snapshot(game), before);
  assert.equal(game.saves.length, 0);
});

test('test_shop_sale_rechecks_inventory_before_committing', () => {
  const game = makeGame({ inventory: ['바나나'] });
  assert.equal(saleItemState(game, 0).ok, true);
  game.inventory[0] = '나무총';
  const before = snapshot(game);
  assert.equal(sellShopItem(game, 0).reason, 'key_item');
  assert.deepEqual(snapshot(game), before);
  assert.equal(game.saves.length, 0);
});
