// 아이템 레지스트리 감사: 스크립트/컷신이 인벤토리에 넣는 이름은 전부 src/data/items.js 에 등록돼 있어야 한다(레거시 '보라색 코드 ?'·'낡은 열쇠' 가 미등록이었음, 2026-09-10).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ITEMS, itemKind, plainItems, keyItems } from '../../src/data/items.js';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '../..');
const files = ['src/data/scripts.js', ...fs.readdirSync(path.join(ROOT, 'src/data/cutscenes')).map((f) => 'src/data/cutscenes/' + f)];
const pushed = new Set();
for (const f of files) for (const m of fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/inventory\.push\(([^)]*)\)/g)) for (const q of m[1].matchAll(/'([^']+)'/g)) pushed.add(q[1]);

test('test_items_every_pushed_name_is_registered', () => {
  assert.ok(pushed.size >= 5, `push 하는 아이템을 찾지 못함: ${[...pushed]}`);
  for (const n of pushed) assert.ok(ITEMS[n], `미등록 아이템 '${n}' (src/data/items.js 에 kind/desc 등록)`);
});
test('test_items_every_entry_has_kind_and_desc_and_plain_has_heal', () => {
  for (const [n, d] of Object.entries(ITEMS)) {
    assert.ok(d.kind === 'key' || d.kind === 'plain', `${n}: kind`);
    assert.ok(typeof d.desc === 'string' && d.desc.length > 0, `${n}: desc`);
    // heal 은 0 이 아닌 정수 — 음수는 사용자가 지정한 돌(체력회복 -5, BUILD227)만
    if (d.kind === 'plain') assert.ok(Number.isInteger(d.heal) && (d.heal > 0 || n === '돌'), `${n}: 그냥 아이템은 heal 필요`);
  }
});
test('test_items_legacy_categories_dust_heals_1_cord_and_keys_are_key', () => {
  assert.equal(ITEMS['먼지'].kind, 'plain'); assert.equal(ITEMS['먼지'].heal, 1);
  for (const n of ['보라색 코드 ?', '낡은 열쇠', '열쇠?']) assert.equal(itemKind(n), 'key', n);
  const inv = ['보라색 코드 ?', '먼지', '바나나', '열쇠?'];
  assert.deepEqual(plainItems(inv), ['먼지', '바나나']); assert.deepEqual(keyItems(inv), ['보라색 코드 ?', '열쇠?']);
});
