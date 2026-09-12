import test from 'node:test';
import assert from 'node:assert/strict';
import { MENU_LAYOUT, menuWindow, menuInventoryRows, menuTextLines } from '../../src/ui/menu-layout.js';
import { F } from '../../src/ui/font.js';
import L from '../../src/data/locale/ko.js';

const ctx = { measureText: (text) => ({ width: [...text].reduce((sum, glyph) => sum + (/[^\x00-\x7f]/.test(glyph) ? 16 : 8), 0) }) };

test('test_menu_inventory_every_duplicate_and_key_item_is_reachable_after_many_purchases', () => {
  const plain = [...Array(150).fill('위장약'), '에그타르트'];
  const keys = ['나무총', '보라색 코드 ?', ...Array.from({ length: 30 }, (_, i) => `열쇠 ${i}`)];
  const items = [...plain, ...keys], rows = menuInventoryRows(plain, keys, L);
  assert.deepEqual(rows.filter((row) => row.index !== null).map((row) => row.label), items);
  for (let index = 0; index < items.length; index++) {
    const selected = rows.findIndex((row) => row.index === index);
    const { start, end } = menuWindow(rows.length, selected, MENU_LAYOUT.listRows);
    assert.ok(selected >= start && selected < end);
    assert.ok(end - start <= MENU_LAYOUT.listRows);
    assert.equal(rows[selected].label, items[index]);
  }
});

test('test_menu_empty_inventory_keeps_both_sections_without_selectable_placeholders', () => {
  const rows = menuInventoryRows([], [], L);
  assert.deepEqual(rows.map((row) => row.label), [L.menu_plain_items, L.menu_no_plain, L.menu_key_items, L.menu_no_key]);
  assert.ok(rows.every((row) => row.index === null));
});

test('test_menu_text_wraps_korean_without_scaling_and_bounds_long_unbroken_names', () => {
  const text = '아주긴아이템이름'.repeat(20);
  const lines = menuTextLines(ctx, text, 340, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines.every((line) => ctx.measureText(line).width <= 340));
  assert.ok(lines.at(-1).endsWith('…'));
  assert.deepEqual(menuTextLines(ctx, 'HP 100/140', 148), ['HP 100/140']);
  assert.deepEqual(menuTextLines(ctx, '이름\n역할', 148, 2), ['이름', '역할']);
});

test('test_menu_shop_descriptions_prefer_whole_words_and_preserve_explicit_newlines', () => {
  assert.deepEqual(menuTextLines(ctx, '팀 전체 공격력 영구 +1. 한 번만 구매 가능.', 144, 4), [
    '팀 전체 공격력', '영구 +1. 한 번만', '구매 가능.',
  ]);
  assert.deepEqual(menuTextLines(ctx, '팀 전체 최대 HP 영구 +10. 한 번만 구매 가능.', 144, 4), [
    '팀 전체 최대 HP', '영구 +10. 한 번만', '구매 가능.',
  ]);
  assert.deepEqual(menuTextLines(ctx, '이름\n\n역할\n', 144, 4), ['이름', '', '역할', '']);
  const limited = menuTextLines(ctx, '팀 전체 공격력 영구 +1. 한 번만 구매 가능.', 144, 2);
  assert.equal(limited.length, 2);
  assert.ok(limited.at(-1).endsWith('…'));
  assert.ok(limited.every((line) => ctx.measureText(line).width <= 144));
});

test('test_menu_panels_and_member_windows_fit_the_game_without_inventory_dependent_height', () => {
  const layout = MENU_LAYOUT;
  assert.equal(layout.x + layout.width, 472);
  assert.equal(layout.y + layout.height, 352);
  assert.ok(layout.listY + layout.listRows * F.lineH <= layout.footerY);
  assert.ok(layout.footerY + 2 * F.lineH <= 326);
  for (const [top, capacity] of [[layout.memberY, layout.memberRows], [layout.targetY, layout.targetRows]]) {
    for (let index = 0; index < 12; index++) {
      const { start, end } = menuWindow(12, index, capacity);
      assert.ok(index >= start && index < end);
      assert.ok(top + (end - start) * layout.memberHeight < 326);
    }
  }
});
