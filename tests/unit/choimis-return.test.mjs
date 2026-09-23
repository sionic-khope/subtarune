import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Story, QA_POINTS, partyFromFlags, storyExitScript, storyBgm } from '../../src/core/story.js';
import { YONGJUN_SHOP, YONGJUN_RESCUE_SHOP, yongjunShop } from '../../src/data/shops.js';
import { ITEMS } from '../../src/data/items.js';
import { shopItemState, purchaseShopItem, saleItemState, sellShopItem } from '../../src/core/shop.js';
import { Shop } from '../../src/ui/shop.js';
import { ShipPursuitAmbient } from '../../src/scenes/ship-pursuit-ambient.js';
import { jjajang_night_cliff_scene } from '../../src/data/cutscenes/jjajang_night_cliff.js';
import { choimis_rescue } from '../../src/data/cutscenes/choimis_rescue.js';

const map = JSON.parse(readFileSync('assets/maps/ship_lounge.json', 'utf8'));
const visible = flags => map.entities.filter(e => !(e.unless && flags[e.unless]) && !(e.requires && !flags[e.requires]));
const game = (flags = {}) => ({
  flags, money: 100, inventory: [], party: ['gyeongsub', 'ppaman'], partyHp: {}, attack: 4, hpBonus: 60, saves: 0,
  has(id) { return !!this.flags[id]; }, setFlag(id) { this.flags[id] = true; },
  autosave() { this.saves++; }, hpOf(id) { return this.partyHp[id] ?? 160; }, maxHpOf() { return 160; },
  sound: { sfx() {} },
});

test('old299 won saves resume shared rescue without battle or duplicate reward', () => {
  const gate = jjajang_night_cliff_scene[0];
  assert.equal(gate.goto, 'rescue');
  assert.equal(gate.if({ choimis_flower_won: true }), true);
  assert.equal(gate.if({ choimis_flower_won: true, choimis_rescued: true }), false);
  assert.ok(!gate.if({ choimis_flower_done: true }));
  const resumed = jjajang_night_cliff_scene.slice(jjajang_night_cliff_scene.findIndex(n => n.label === 'rescue') + 1);
  assert.deepEqual(resumed, [...choimis_rescue]);
  assert.ok(resumed.every(n => !n.battle));
  const cliff = JSON.parse(readFileSync('assets/maps/jjajang_night_cliff.json', 'utf8'));
  assert.equal(cliff.enter.flag, undefined);
  assert.equal(jjajang_night_cliff_scene[1].if({ night_cliff_scene_started: true }), true);
  assert.equal(jjajang_night_cliff_scene[1].if({ night_cliff_scene_done: true }), true);
  assert.ok(jjajang_night_cliff_scene.some(n => n.set?.night_cliff_scene_started === true));
});

test('rescue stage restores trio and completed castle gate after save/load', () => {
  const first = new Story({}); first.advance('choimis_rescued');
  const flags = {}; const restored = new Story(flags); restored.load(JSON.parse(JSON.stringify(first.toJSON())));
  assert.equal(restored.stage, 'choimis_rescued');
  assert.equal(flags.ship_castle_done, true);
  assert.deepEqual(partyFromFlags(flags), ['gyeongsub', 'ppaman']);
  const entities = visible(flags);
  assert.equal(entities.filter(e => e.id === 'lounge_choimis_sealed').length, 1);
  assert.equal(entities.filter(e => e.id.startsWith('lounge_return_')).length, 3);
  assert.ok(!entities.some(e => e.id === 'ship_castle_trigger'));
  assert.ok(!entities.some(e => ['lounge_youngcle', 'lounge_junhee', 'lounge_yongjun'].includes(e.id)));
});

test('old lounge keeps original actors and castle scene until rescue', () => {
  const entities = visible({ ship_ending_done: true });
  assert.ok(entities.some(e => e.id === 'ship_castle_trigger'));
  assert.ok(entities.some(e => e.id === 'lounge_youngcle'));
  assert.ok(!entities.some(e => e.id.startsWith('lounge_return_') || e.id === 'lounge_choimis_sealed'));
  assert.deepEqual(map.spawns.from_rescue, { x: 372, y: 900, facing: 'up' });
  assert.deepEqual(map.spawns.lounge_free, { x: 372, y: 520, facing: 'up' });
});

test('rescue catalog replaces old stock with separate upgrade tier and food', () => {
  assert.equal(yongjunShop({}), YONGJUN_SHOP);
  assert.equal(yongjunShop({ choimis_rescued: true }), YONGJUN_RESCUE_SHOP);
  assert.deepEqual(YONGJUN_RESCUE_SHOP.slice(0, 2).map(e => [e.name, e.price]), [['더 강한 바세린', 10], ['더 강한 씨알리스', 10]]);
  assert.equal(YONGJUN_RESCUE_SHOP[2].item, '핫도그');
  assert.equal(YONGJUN_RESCUE_SHOP[3].item, '기름떡볶이');
  const current = game({ choimis_rescued: true, shop_yongjun_cialis: true });
  assert.equal(new Shop(current).products, YONGJUN_RESCUE_SHOP);
  assert.equal(shopItemState(current, 'cialis').reason, 'unknown');
  assert.equal(shopItemState(current, 'strong_cialis').ok, true);
  assert.equal(shopItemState(current, 'eggtart').reason, 'unknown');
  assert.equal(shopItemState(game(), 'strong_cialis').reason, 'unknown');
});

test('healing food can be repeatedly bought and resold for half price', () => {
  const current = game({ choimis_rescued: true });
  for (const id of ['hotdog', 'oil_tteokbokki', 'hotdog']) assert.equal(purchaseShopItem(current, id).ok, true);
  assert.equal(current.money, 70); assert.equal(current.saves, 3);
  assert.deepEqual(current.inventory, ['핫도그', '기름떡볶이', '핫도그']);
  assert.equal(current.attack, 4); assert.equal(current.hpBonus, 60);
  assert.equal(saleItemState(current, 1).price, 5);
  assert.equal(sellShopItem(current, 1).ok, true);
  assert.equal(current.money, 75); assert.equal(current.inventory.length, 2);
});

test('food has the requested recovery values and group scope', () => {
  assert.equal(ITEMS['핫도그'].heal, 150);
  assert.equal(ITEMS['기름떡볶이'].heal, 100);
  assert.equal(ITEMS['기름떡볶이'].target, 'party');
});

test('rescue releases pursuit backtracking and ambient without altering pre-rescue pursuit', () => {
  const flags = { captain_attack_done: true };
  const routes = [['youngcle_bridge', 'maillard_boarding'], ['maillard_boarding', 'maillard_starboard'], ['maillard_starboard', 'maillard_saloon'], ['maillard_saloon', 'maillard_lounge']];
  for (const [from, to] of routes) {
    assert.equal(storyExitScript(from, to, flags), 'ship_pursuit_backtrack');
    assert.equal(storyExitScript(from, to, { ...flags, choimis_rescued: true }), undefined);
    assert.equal(storyBgm(from, { ...flags, choimis_rescued: true }), undefined);
  }
  const current = { flags: { ...flags, choimis_rescued: true }, mapId: 'maillard_saloon', state: 'field' };
  const ambient = new ShipPursuitAmbient(current); ambient.resume();
  assert.equal(ambient.effect, null);
});

test('post-briefing QA derives actual progression and offers the same shop inside the lounge', () => {
  const point = QA_POINTS.find(p => p.id === 'choimis_return');
  assert.equal(point.stage, 'ship_lounge_briefed'); assert.equal(point.map, 'ship_lounge');
  assert.equal(point.flags.choimis_flower_won, true); assert.deepEqual(point.party, ['gyeongsub', 'ppaman']);
  assert.ok(visible(point.flags).some(e => e.id === 'ship_lounge_shop_door' && e.script === 'maillard_shop'));
  const maillard = JSON.parse(readFileSync('assets/maps/maillard_lounge.json', 'utf8'));
  assert.equal(maillard.entities.find(e => e.id === 'lounge_shop_door').script, 'maillard_shop');
});
