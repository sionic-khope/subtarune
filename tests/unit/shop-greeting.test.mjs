import test from 'node:test';
import assert from 'node:assert/strict';
import { Shop, SHOP_LAYOUT } from '../../src/ui/shop.js';
import { TextBox } from '../../src/ui/dialogue.js';
import { stateFromFlags } from '../../src/core/story.js';

const input = (press = null, held = press) => ({ just: (action) => action === press, down: (action) => action === held });
const idle = input();
const snapshot = (game) => structuredClone({ flags: game.flags, inventory: game.inventory, money: game.money, attack: game.attack, hpBonus: game.hpBonus, partyHp: game.partyHp });
function fixture(saved = {}) {
  const game = {
    flags: {}, inventory: [], money: 3000, attack: 2, hpBonus: 20, partyHp: { ppaman: 87 },
    ctx: { measureText: (text) => ({ width: [...text].length * 16 }) }, portraits: { ppaman: {} },
    saves: [], voices: [], sounds: [], sound: { sfx(name) { game.sounds.push(name); }, blip(voice) { game.voices.push(voice); } },
    has(key) { return !!this.flags[key]; }, setFlag(key, value = true) { this.flags[key] = value; },
    autosave() { this.saves.push(snapshot(this)); }, ...saved,
  };
  game.textbox = new TextBox(game.sound, game.portraits);
  game.shop = new Shop(game);
  return game;
}
function unlock(shop) { shop.update(0.2, idle); }
function next(shop) {
  shop.update(0, input('confirm'));
  shop.update(0, idle);
  shop.update(0, input('confirm'));
  shop.update(0, idle);
}

test('test_shop_first_greeting_plays_exact_six_lines_and_saves_only_completion', () => {
  const game = fixture();
  const before = snapshot(game);
  game.shop.open(); unlock(game.shop);
  const expected = [
    ['박용준', '오 안녕하세요 형', 'yongjun'],
    ['억빠맨', '너 뭐해 여기서', 'ppaman'],
    ['박용준', '알바하면 자꾸 잘려서 제가 편의점을 차렸어요', 'yongjun'],
    ['억빠맨', '걍 다내놔 시발새끼야', 'ppaman'],
    ['박용준', '어허 안됩니다', 'yongjun'],
    ['박용준', '필요한거 있으시면{n}말씀주세요 ㅎㅎ', 'yongjun'],
  ];
  for (const [speaker, text, voice] of expected) {
    assert.equal(game.shop.mode, 'greeting');
    const box = game.shop.greeting.active;
    assert.equal(box.node.speaker, speaker);
    assert.equal(box.node.text, `* ${text}`);
    assert.equal(box.voice, voice);
    assert.equal(game.saves.length, 0);
    assert.deepEqual(snapshot(game), before);
    game.shop.update(0.05, idle);
    assert.equal(game.voices.at(-1), voice);
    if (voice === 'ppaman') {
      assert.equal(box, game.textbox);
      assert.equal(box.portrait, game.portraits.ppaman);
      assert.deepEqual(box.layoutRect(), { x: 12, y: 248, w: 456, h: 104 });
    } else assert.deepEqual(box.layoutRect(), SHOP_LAYOUT.products);
    next(game.shop);
  }
  assert.equal(game.shop.mode, 'home');
  assert.equal(game.state, 'shop');
  assert.deepEqual(snapshot(game), { ...before, flags: { shop_yongjun_greeted: true } });
  assert.deepEqual(game.saves, [snapshot(game)]);
  assert.equal(game.textbox.isOpen, false);
});

test('test_shop_greeting_entry_cancel_and_closing_press_cannot_buy_or_exit', () => {
  const game = fixture();
  game.shop.open();
  game.shop.update(0.5, input('confirm'));
  assert.equal(game.shop.greeting.active.revealed, 0);
  unlock(game.shop);
  game.shop.update(0, input('cancel'));
  assert.equal(game.shop.greeting.active.state, 'waiting');
  game.shop.update(0, input('cancel'));
  assert.equal(game.shop.greeting.active.node.text, '* 오 안녕하세요 형');
  assert.equal(game.shop.mode, 'greeting');
  game.shop.update(0, input('confirm'));
  for (let i = 1; i < 5; i++) next(game.shop);
  game.shop.update(0, input('confirm'));
  game.shop.update(0, idle);
  game.shop.update(0, input('confirm'));
  assert.equal(game.shop.mode, 'home');
  game.shop.update(0.5, input('confirm'));
  assert.equal(game.shop.mode, 'home');
  assert.equal(game.money, 3000);
  unlock(game.shop);
  game.shop.update(0, input('confirm'));
  assert.equal(game.shop.mode, 'browse');
  assert.equal(game.money, 3000);
});

test('test_shop_greeting_completed_reentry_reload_and_qa_have_no_stat_effects', () => {
  const game = fixture();
  game.shop.open(); unlock(game.shop);
  for (let i = 0; i < 6; i++) next(game.shop);
  game.shop.close(); game.shop.open();
  assert.equal(game.shop.mode, 'home');
  const loaded = fixture(game.saves.at(-1));
  loaded.shop.open();
  assert.equal(loaded.shop.mode, 'home');
  assert.deepEqual(snapshot(loaded), snapshot(game));
  assert.equal(game.flags.shop_yongjun_greeted, true);
  assert.equal(loaded.saves.length, 0);
  assert.deepEqual(stateFromFlags({ shop_yongjun_greeted: true }), stateFromFlags({}));
});

test('test_shop_greeting_interrupted_reload_and_reset_restart_from_first_line', () => {
  const game = fixture();
  game.shop.open(); unlock(game.shop); next(game.shop);
  assert.equal(game.shop.greeting.active, game.textbox);
  const loaded = fixture(snapshot(game));
  loaded.shop.open();
  assert.equal(loaded.shop.greeting.active.node.text, '* 오 안녕하세요 형');
  game.shop.reset();
  assert.equal(game.textbox.isOpen, false);
  assert.equal(game.shop.greeting, null);
  assert.equal(game.shop.mode, 'closed');
  assert.equal(game.saves.length, 0);
  game.shop.open();
  assert.equal(game.shop.greeting.active.node.text, '* 오 안녕하세요 형');
});

test('test_shop_home_buy_cancel_returns_home_and_event_upgrade_is_not_inventory', () => {
  const game = fixture({ flags: { shop_yongjun_greeted: true } });
  const shop = game.shop;
  shop.open(); unlock(shop);
  shop.update(0, input('confirm')); unlock(shop);
  assert.equal(shop.mode, 'browse');
  shop.update(0, input('down'));
  shop.update(0, input('down'));
  shop.update(0, input('confirm')); unlock(shop);
  assert.equal(shop.mode, 'confirm');
  assert.equal(shop.choice, 0);
  shop.update(0, input('confirm')); unlock(shop);
  assert.equal(shop.mode, 'message');
  assert.equal(game.sounds.at(-1), 'shop_buy');
  assert.equal(game.money, 2990);
  assert.equal(game.attack, 3);
  assert.deepEqual(game.inventory, []);
  shop.update(0, input('cancel')); unlock(shop);
  assert.equal(shop.mode, 'browse');
  shop.update(0, input('cancel')); unlock(shop);
  assert.equal(shop.mode, 'home');
  assert.equal(game.state, 'shop');
});

test('test_shop_sell_confirms_one_inventory_copy_protects_keys_and_returns_home', () => {
  const game = fixture({ flags: { shop_yongjun_greeted: true }, inventory: ['바나나', '낡은 열쇠', '바나나'] });
  const shop = game.shop;
  shop.open(); unlock(shop);
  shop.update(0, input('down'));
  shop.update(0, input('confirm')); unlock(shop);
  assert.equal(shop.mode, 'sell');
  shop.update(0, input('down'));
  shop.update(0, input('confirm')); unlock(shop);
  assert.equal(shop.message.reason, 'key_item');
  assert.equal(game.saves.length, 0);
  shop.update(0, input('cancel')); unlock(shop);
  shop.update(0, input('down'));
  shop.update(0, input('confirm')); unlock(shop);
  assert.equal(shop.mode, 'confirm');
  assert.equal(shop.transaction.inventoryIndex, 2);
  shop.update(0, input('cancel')); unlock(shop);
  assert.equal(game.money, 3000);
  shop.update(0, input('confirm')); unlock(shop);
  shop.update(0, input('left'));
  shop.update(0, input('confirm')); unlock(shop);
  assert.equal(shop.mode, 'message');
  assert.equal(shop.message.price, 10);
  assert.deepEqual(game.inventory, ['바나나', '낡은 열쇠']);
  assert.equal(game.money, 3010);
  assert.equal(game.saves.length, 1);
  shop.update(0, input('confirm')); unlock(shop);
  assert.equal(shop.index, 2);
  shop.update(0, input('confirm')); unlock(shop);
  assert.equal(shop.mode, 'home');
  assert.equal(game.state, 'shop');
});

test('test_shop_sell_stale_confirmation_cannot_sell_a_different_item', () => {
  const game = fixture({ flags: { shop_yongjun_greeted: true }, inventory: ['바나나', '에그타르트'] });
  const shop = game.shop;
  shop.open(); unlock(shop);
  shop.update(0, input('down'));
  shop.update(0, input('confirm')); unlock(shop);
  shop.update(0, input('confirm')); unlock(shop);
  game.inventory.shift();
  shop.update(0, input('left'));
  shop.update(0, input('confirm'));
  assert.equal(shop.mode, 'message');
  assert.equal(shop.message.reason, 'invalid_index');
  assert.deepEqual(game.inventory, ['에그타르트']);
  assert.equal(game.money, 3000);
  assert.equal(game.saves.length, 0);
});
