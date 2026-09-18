// 짜장숲(BUILD226): 길 타일 '$' 는 그림이 해안 길 '%' 와 같고 발소리만 옵젝영역0 얕은 물의 에코 걸음 루프(WATER_WALK), 물결 고리는 없다.
//   사용자 2026-09-18 “그 숲부터는 발소리도 오브제맵 발소리 써줄 수 있나 / 짜장숲 발소리” — 숲 이전(해안)은 그대로 무음.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getTile } from '../../src/world/tiles.js';
import { WATER_WALK } from '../../src/data/footsteps.js';

const forest = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_forest.json', import.meta.url), 'utf8'));
const shore = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_shore.json', import.meta.url), 'utf8'));
const rowsOf = map => map.tiles || map.rows;

test('test_jjajang_forest_path_uses_obj0_water_walk_echo_without_ripples', () => {
  const echo = getTile('$');
  assert.equal(echo.name, 'jjajang_path_echo');
  assert.equal(echo.solid, false);
  assert.equal(echo.step.loop, WATER_WALK.loop);
  assert.equal(echo.step.tail, WATER_WALK.tail);
  assert.deepEqual(echo.step.onsets, WATER_WALK.onsets);
  assert.equal(echo.step.ripple, false, '흙길이라 물결 고리는 내지 않는다');
  assert.equal(getTile('a').step.ripple, undefined, '옵젝영역0 얕은 물은 물결 그대로');
  assert.equal(getTile('%').step, undefined, '해안 길은 여전히 무음');
});

test('test_jjajang_forest_map_walks_on_echo_path_and_shore_stays_silent', () => {
  const rows = rowsOf(forest);
  for (let r = 1; r < rows.length - 1; r++) assert.equal(rows[r].slice(9, 11), '$$', `row ${r}`);
  assert.equal(rows[0].slice(9, 11), '&&');
  assert.equal(rows[rows.length - 1].slice(9, 11), '&&');
  assert.ok(rows.every(row => !row.includes('%')), '숲에는 무음 길 칸이 없다');
  assert.ok(rowsOf(shore).every(row => !row.includes('$')), '해안에는 에코 길 칸이 없다');
});
