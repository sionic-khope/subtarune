// QA 지점 상태 유도 감사 (2026-09-11 사용자 "QA 점프도 바나나 2개·레드블루 버프 같은 상태를 최신화해야 인게임 문제를 놓치지 않는다"):
//   1) 스크립트가 inventory.push 하는 모든 아이템은 STATE_FROM_FLAGS 규칙에 있다(빠지면 QA 점프에서 그 아이템이 없다)
//   2) 컷신 전투 {battle:{enemies, flag}} 마다 규칙의 enemies 가 같다(돈)
//   3) 규칙의 플래그는 실제로 어딘가에서 선다
//   4) 본 줄기 QA 지점을 순서대로 가면 유도된 상태(아이템·돈·공격력·HP 보너스)가 줄어들지 않는다(뒤 지점이 앞 지점의 플래그를 빠뜨리지 않았는지)
//   5) 예: obj0(레드·블루 뒤) 는 공격 2·HP+20·바나나 2·열쇠?·돈 > 0
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { QA_POINTS, STATE_FROM_FLAGS, stateFromFlags, STAGES } from '../../src/core/story.js';
import { ENEMIES } from '../../src/data/enemies.js';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const walk = (dir, out = []) => { for (const f of fs.readdirSync(path.join(ROOT, dir))) { const p = path.join(dir, f); if (fs.statSync(path.join(ROOT, p)).isDirectory()) walk(p, out); else if (/\.(js|json)$/.test(f)) out.push(p); } return out; };
const SRC = [...walk('src'), ...walk('assets/maps')].map((p) => [p, read(p)]);
const scriptSrc = SRC.filter(([p]) => p.startsWith('src/data/')).map(([, s]) => s).join('\n');
const idx = JSON.parse(read('assets/maps/index.json')).maps;
const maps = Object.fromEntries(idx.map((id) => [id, JSON.parse(read(`assets/maps/${id}.json`))]));
const enemyMoney = (id) => ENEMIES[id]?.money ?? 30;
const derive = (pt) => stateFromFlags({ ...Object.fromEntries(STAGES.slice(0, STAGES.findIndex((s) => s.id === pt.stage) + 1).map((s) => [s.id, true])), ...(pt.flags || {}) }, { maps, enemyMoney });
const IGNORE_ITEMS = new Set(['낡은 열쇠']);   // 테스트 방 상자(chest_test) — 본편 아님

test('test_qa_state_every_scripted_item_grant_has_a_flag_rule', () => {
  const granted = new Set([...scriptSrc.matchAll(/inventory\.push\(([^)]*)\)/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((k) => k[1])));
  const ruled = new Set(STATE_FROM_FLAGS.flatMap((r) => r.items || []));
  const missing = [...granted].filter((n) => !ruled.has(n) && !IGNORE_ITEMS.has(n));
  assert.deepEqual(missing, [], `규칙 없는 아이템(STATE_FROM_FLAGS 에 한 줄): ${missing.join(', ')}`);
});
test('test_qa_state_cutscene_battle_flags_match_rule_enemies', () => {
  const battles = [...scriptSrc.matchAll(/battle:\s*\{\s*enemies:\s*\[([^\]]*)\][^}]*?flag:\s*'([a-z0-9_]+)'/g)].map((m) => [m[2], [...m[1].matchAll(/'([a-z0-9_]+)'/g)].map((k) => k[1]).sort()]);
  assert.ok(battles.length >= 2, '컷신 전투를 못 찾음');
  for (const [flag, enemies] of battles) {
    const r = STATE_FROM_FLAGS.find((x) => x.flag === flag);
    assert.ok(r, `컷신 전투 플래그 '${flag}' 의 규칙이 없다(돈 유도)`);
    assert.deepEqual([...(r.enemies || [])].sort(), enemies, `'${flag}' 규칙의 enemies 가 스크립트와 다르다`);
  }
});
test('test_qa_state_rule_flags_are_set_somewhere', () => {
  const all = SRC.map(([, s]) => s).join('\n');
  for (const r of STATE_FROM_FLAGS) for (const f of [r.flag, r.with].filter(Boolean)) {
    const setBy = new RegExp(`set:\\s*\\{[^}]*\\b${f}\\b|flag:\\s*'${f}'|"flag":\\s*"${f}"|id:\\s*'${f}'|setFlag\\('${f}'`).test(all);
    assert.ok(setBy, `규칙 플래그 '${f}' 를 세우는 곳이 없다`);
  }
});
const MAIN = ['void', 'raft', 'void3', 'void4', 'void4_end', 'ppaman', 'key', 'rock1', 'rock2', 'rock3', 'raft8', 'void9', 'void10', 'void11', 'teal1', 'teal2', 'teal3', 'teal4', 'teal5', 'teal6', 'teal7', 'teal8', 'teal9', 'obj0', 'obj1'];
test('test_qa_state_main_line_points_never_lose_items_money_or_buffs', () => {
  const pts = MAIN.map((id) => QA_POINTS.find((q) => q.id === id)).filter(Boolean);
  assert.ok(pts.length >= 20, '본 줄기 QA 지점을 못 찾음');
  let prev = null;
  for (const pt of pts) {
    const d = derive(pt);
    if (prev) {
      const count = (arr) => arr.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
      const pc = count(prev.d.inventory), cc = count(d.inventory);
      for (const [k, n] of Object.entries(pc)) assert.ok((cc[k] || 0) >= n, `QA '${pt.id}' 에서 '${k}' ×${n} 이 사라진다(앞 지점 '${prev.id}' 에는 있음) — flags 에 빠진 플래그`);
      assert.ok(d.money >= prev.d.money, `QA '${pt.id}' 돈 ${d.money} < '${prev.id}' ${prev.d.money}`);
      assert.ok(d.attack >= prev.d.attack && d.hpBonus >= prev.d.hpBonus, `QA '${pt.id}' 버프가 '${prev.id}' 보다 낮다`);
    }
    prev = { id: pt.id, d };
  }
});
test('test_qa_state_examples_obj0_has_buff_bananas_key_and_money', () => {
  const d = derive(QA_POINTS.find((q) => q.id === 'obj0'));
  assert.equal(d.attack, 2); assert.equal(d.hpBonus, 20);
  assert.equal(d.inventory.filter((n) => n === '바나나').length, 2);
  assert.ok(d.inventory.includes('열쇠?') && d.inventory.includes('보라색 코드 ?'), JSON.stringify(d.inventory));
  assert.ok(d.money >= 60 + 300, `돈 ${d.money}`);   // 청록숲3 CS 둘(30+30) + 레드·블루(150+150) 이상
  const early = derive(QA_POINTS.find((q) => q.id === 'void'));
  assert.deepEqual(early, { inventory: ['보라색 코드 ?'], money: 0, attack: 1, hpBonus: 0 });
});

test('test_qa_state_captain_and_later_points_include_purchased_upgrades_and_cost', () => {
  const captainIndex = QA_POINTS.findIndex((point) => point.id === 'maillard_captain');
  assert.ok(captainIndex >= 0);
  for (const point of QA_POINTS.slice(captainIndex)) {
    const beforePurchase = derive({ ...point, flags: { ...point.flags, shop_yongjun_cialis: false, shop_yongjun_vaseline: false } });
    const state = derive(point);
    assert.equal(point.flags.shop_yongjun_cialis, true, point.id);
    assert.equal(point.flags.shop_yongjun_vaseline, true, point.id);
    assert.equal(state.attack, 3, point.id);
    assert.equal(state.hpBonus, 40, point.id);
    assert.equal(state.money, beforePurchase.money - 20, point.id);
    assert.deepEqual(state.inventory, beforePurchase.inventory, point.id);
  }
});

test('test_qa_state_before_captain_keeps_optional_shop_upgrades_unpurchased', () => {
  const captainIndex = QA_POINTS.findIndex((point) => point.id === 'maillard_captain');
  assert.ok(captainIndex >= 0);
  for (const point of QA_POINTS.slice(0, captainIndex)) {
    assert.equal(!!point.flags?.shop_yongjun_cialis, false, point.id);
    assert.equal(!!point.flags?.shop_yongjun_vaseline, false, point.id);
  }
});
