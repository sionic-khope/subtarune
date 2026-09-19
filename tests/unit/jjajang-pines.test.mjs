// 검은 소나무 숲(BUILD226): 굽이 길 모양(오른쪽→위→왼쪽→아래→가운데 오른쪽 끝), 정사각 공터+둘레 풀숲, 소나무 밑동은 길 밖, 양쪽 문, 브금 my_castle_town(다음 맵부터)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { QA_POINTS, storyBgm } from '../../src/core/story.js';
import { getTile } from '../../src/world/tiles.js';

const map = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_pines.json', import.meta.url), 'utf8'));
const torii = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_torii.json', import.meta.url), 'utf8'));
const rows = map.rows;
const walk = (c, r) => rows[r]?.[c] === '$' || rows[r]?.[c] === '"' || rows[r]?.[c] === '&';

test('test_pines_road_winds_right_up_left_down_then_straight_right', () => {
  assert.ok([16, 17].every(r => [...Array(14).keys()].every(c => walk(c, r))), '왼쪽 가장자리에서 오른쪽으로');
  assert.ok([...Array(14).keys()].slice(4).every(r => walk(12, r) && walk(13, r)), '12~13열로 위로');
  assert.ok([4, 5].every(r => [...Array(10).keys()].map(c => c + 4).every(c => walk(c, r))), '4~5행으로 왼쪽으로');
  assert.ok([...Array(8).keys()].map(r => r + 4).every(r => walk(4, r) && walk(5, r)), '4~5열로 아래로');
  assert.ok([10, 11].every(r => [...Array(60).keys()].map(c => c + 4).every(c => walk(c, r))), '가운데 10~11행으로 오른쪽 끝까지');
  assert.equal(rows[10][63], '&'); assert.equal(rows[16][0], '&'); assert.ok(!walk(1, 19) && !walk(2, 21), '아래 줄기는 없다(곧은 길에서 왼쪽으로 들어온다)');
  assert.ok(!walk(2, 10) && !walk(20, 16) && !walk(30, 4), '길 밖은 숲');
});

test('test_pines_plaza_is_square_with_lush_rim_and_open_centre', () => {
  const [c0, c1, r0, r1] = map.meta.plaza;
  assert.equal(c1 - c0, r1 - r0, '정사각형');
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const rim = r === r0 || r === r1 || c === c0 || c === c1;
    const expected = (r === 10 || r === 11) ? '$' : rim ? '"' : '$';
    assert.equal(rows[r][c], expected, `plaza ${c},${r} (둘레만 풀숲, 가운데는 비움 — 사용자 정정)`);
  }
  assert.ok(rows.every((row, r) => [...row].every((ch, c) => ch !== '"' || (c >= c0 && c <= c1 && r >= r0 && r <= r1))), '풀숲은 공터 안에만');
  assert.equal(getTile('"').solid, false); assert.equal(getTile('"').step.ripple, false);
});

test('test_pines_props_stand_off_the_road_and_doors_link_both_ways', () => {
  const pines = map.entities.filter(e => e.type === 'prop');
  assert.ok(pines.length >= 18 && pines.length <= 24, '드문드문(18~24그루)');
  for (const p of pines) {
    assert.ok(p.image.startsWith('assets/props/jjajang_pine_') && p.w === 24 && p.h === 12);
    const c = Math.floor((p.x + 12) / 32), r = Math.floor((p.y + 6) / 32);
    assert.equal(rows[r][c], '@', `소나무 밑동 ${c},${r} 은 숲 칸`);
    assert.ok(p.ix >= 0 && p.iy >= 0, '그림이 맵 안');
  }
  const west = map.entities.find(e => e.type === 'door');
  assert.deepEqual([west.to, west.spawn, west.x, west.w], ['jjajang_walk', 'from_east', 0, 10], '왼쪽 가장자리 문 → 곧은 길 오른쪽');
  const east = torii.entities.find(e => e.id === 'torii_pines_door');
  assert.deepEqual([east.to, east.spawn, east.w], ['jjajang_bend', 'from_west', 10], '토리이 길 오른쪽 문은 굽이 길로');
  assert.ok(map.spawns.from_west.x > 10 && map.spawns.from_west.y >= 16 * 32 && map.spawns.from_west.facing === 'right');
});

test('test_pines_bgm_and_qa_point', () => {
  assert.equal(map.bgm, 'my_castle_town');
  assert.equal(storyBgm('jjajang_pines', { torii_janitor_joined: true }), 'my_castle_town');
  assert.equal(map.vision, undefined, '“다시 펼쳐지는” 맵 — 원형 시야 없음');
  const qa = QA_POINTS.find(p => p.id === 'jjajang_pines');
  assert.deepEqual(qa.party, ['janitor']); assert.ok(qa.flags.torii_janitor_joined);
});

test('test_pines_east_door_leads_to_the_statue_forest', () => {
  const east = map.entities.find(e => e.id === 'pines_statue_door');
  assert.deepEqual([east.to, east.spawn, east.x, east.y, east.w, east.h], ['jjajang_statue', 'from_west', 64 * 32 - 10, 10 * 32, 10, 64], '오른쪽 끝 10px 문 → 석상 앞 숲(BUILD228)');
  assert.ok(map.spawns.from_east.x < east.x - 20 && map.spawns.from_east.facing === 'left');
});
