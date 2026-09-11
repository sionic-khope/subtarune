// 전투 배경 레지스트리 계약 (2026-09-11): 맵·컷신이 쓰는 bg 이름이 전부 등록돼 있고, 각 배경은 함수다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BATTLE_BGS } from '../../src/battle/backgrounds.js';

test('test_battle_bgs_builtins_are_registered_functions', () => {
  for (const name of ['teal', 'temple']) assert.equal(typeof BATTLE_BGS[name], 'function', `${name} 배경 없음`);
});

test('test_battle_bgs_every_bg_name_used_by_maps_and_cutscenes_is_registered', () => {
  // Arrange: 맵 JSON battleBg + 컷신/스크립트 소스의 bg:'…'
  const root = new URL('../../', import.meta.url).pathname;
  const names = new Set();
  const idx = JSON.parse(fs.readFileSync(`${root}assets/maps/index.json`, 'utf-8'));
  for (const id of idx.maps) { const m = JSON.parse(fs.readFileSync(`${root}assets/maps/${id}.json`, 'utf-8')); if (m.battleBg) names.add(m.battleBg); }
  for (const f of fs.readdirSync(`${root}src/data/cutscenes`)) { const src = fs.readFileSync(`${root}src/data/cutscenes/${f}`, 'utf-8'); for (const m of src.matchAll(/\bbg:\s*'([a-z_]+)'/g)) names.add(m[1]); }
  // Assert
  for (const n of names) assert.equal(typeof BATTLE_BGS[n], 'function', `등록 안 된 전투 배경 '${n}' (src/battle/backgrounds.js registerBattleBg)`);
  assert.ok(names.has('temple'), '청록숲9 보스전이 temple 배경을 쓴다');
});
