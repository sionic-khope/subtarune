import test from 'node:test';
import assert from 'node:assert/strict';
import { YONGJUN_SHOP, YONGJUN_RESCUE_SHOP } from '../../src/data/shops.js';
import { purchaseShopItem, shopItemState } from '../../src/core/shop.js';
import { ITEMS } from '../../src/data/items.js';
import { stateFromFlags } from '../../src/core/story.js';

const game = () => ({
  flags: { choimis_rescued: true, shop_yongjun_cialis: true, shop_yongjun_vaseline: true },
  money: 100, inventory: [], party: ['gyeongsub', 'ppaman'], partyHp: { hyungsub: 60, gyeongsub: 80, ppaman: 40 }, attack: 5, hpBonus: 20, saves: 0,
  has(k) { return !!this.flags[k]; }, setFlag(k) { this.flags[k] = true; }, autosave() { this.saves++; },
  hpOf(k) { return this.partyHp[k]; }, maxHpOf() { return 100 + this.hpBonus; },
});

test('rescued catalog contains two new permanent tiers and two repeatable foods only', () => {
  assert.deepEqual(YONGJUN_RESCUE_SHOP.map(i => i.id), ['strong_vaseline', 'strong_cialis', 'hotdog', 'oil_tteokbokki']);
  assert.deepEqual(YONGJUN_RESCUE_SHOP[0].stat, { hpBonus: 20 });
  assert.deepEqual(YONGJUN_RESCUE_SHOP[1].stat, { attack: 1 });
  assert.ok(YONGJUN_RESCUE_SHOP.every(i => i.price === 10));
  assert.deepEqual(YONGJUN_SHOP.map(i => i.id), ['eggtart', 'stomach_medicine', 'cialis', 'vaseline']);
});

test('old normal upgrade flags do not consume the new tier and each stronger tier buys once', () => {
  const g = game();
  assert.ok(purchaseShopItem(g, 'strong_vaseline').ok);
  assert.ok(purchaseShopItem(g, 'strong_cialis').ok);
  assert.equal(g.money, 80); assert.equal(g.attack, 6); assert.equal(g.hpBonus, 40);
  assert.deepEqual(g.partyHp, { hyungsub: 80, gyeongsub: 100, ppaman: 60 });
  assert.deepEqual(g.inventory, []);
  const restored = { ...game(), ...JSON.parse(JSON.stringify(g)) };
  assert.equal(shopItemState(restored, 'strong_vaseline').reason, 'sold_out');
  assert.equal(purchaseShopItem(restored, 'strong_cialis').reason, 'sold_out');
  assert.equal(restored.money, 80); assert.equal(restored.attack, 6); assert.equal(restored.saves, 2);
});

test('food scope is single150 and current party100', () => {
  assert.equal(ITEMS['핫도그'].heal, 150);
  assert.notEqual(ITEMS['핫도그'].target, 'party');
  assert.equal(ITEMS['기름떡볶이'].heal, 100);
  assert.equal(ITEMS['기름떡볶이'].target, 'party');
});

test('QA reconstruction sums old and new permanent tiers exactly once', () => {
  const old = stateFromFlags({ shop_yongjun_cialis: true, shop_yongjun_vaseline: true });
  const both = stateFromFlags({ shop_yongjun_cialis: true, shop_yongjun_vaseline: true, shop_yongjun_strong_cialis: true, shop_yongjun_strong_vaseline: true });
  assert.equal(both.attack, old.attack + 1);
  assert.equal(both.hpBonus, old.hpBonus + 20);
});
