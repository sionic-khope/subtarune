// 벚꽃 숲 2·3(BUILD264): 빙글빙글 길·끊긴 샛길·벚꽃다리 위 최미스·가순이·연출 대사 원문·문 연결 / 뗏목 물길·8초·4초 꽃잎·QA
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { jjajang_sakura2_bridge, BRIDGE_VIEW, SAKURA2_BRIDGE_FLAG } from '../../src/data/cutscenes/jjajang_sakura2.js';
import { QA_POINTS } from '../../src/core/story.js';
import { MAP_RUNTIME_ASSETS } from '../../src/data/map-runtime-assets.js';

const load = id => JSON.parse(readFileSync(new URL(`../../assets/maps/${id}.json`, import.meta.url), 'utf8'));

test('test_sakura2_winds_right_up_around_and_up_with_a_cut_side_road_to_the_bridge', () => {
  const m = load('jjajang_sakura2'), S = m.meta.sakura2;
  assert.deepEqual([m.bgm, m.dim], ['sakura', 0]);
  assert.ok(m.rows.every(r => !r.includes('(')), '땅은 전부 분홍 꽃잎 땅(이미 핀 뒤)');
  const walk = (c, r) => m.rows[r][c] === ')';
  assert.ok(walk(0, S.entryRows[0]) && walk(S.colA[0], S.entryRows[1]), '왼쪽 가장자리에서 들어와 오른쪽으로');
  assert.ok(walk(S.colA[0], S.loopBottom[0]) && walk(S.colB[1], S.loopBottom[1]) && walk(S.colB[0], S.loopTop[0]) && walk(S.colA[0], S.loopTop[1]) && walk(S.colA[1], S.junction[0]), '위 → 오른쪽 → 위 → 왼쪽 → 위(빙글빙글)');
  assert.ok(!walk(S.colA[1] + 2, (S.loopTop[1] + S.loopBottom[0]) >> 1), '빙글 가운데는 숲(고리)');
  assert.ok(walk(S.sideEnd, S.junction[0]) && !walk(S.sideEnd + 1, S.junction[0]) && !walk(S.bridgeCol - 1, S.junction[1]), '오른쪽 샛길은 끊겨 있고 다리까지 검은 숲');
  assert.ok(walk(S.colA[0], 1) && m.rows[0].slice(S.colA[0], S.colA[1] + 1) === '))))', '마무리는 위로(윗줄 문)');
  const bridge = m.entities.find(e => e.id === 'sakura_bridge');
  assert.ok(bridge && bridge.x === S.bridgeCol * 32 && existsSync(new URL(`../../${bridge.image}`, import.meta.url)) && m.preload.includes(bridge.image), '벚꽃다리 소품');
  const choimis = m.entities.find(e => e.id === 'choimis'), girls = ['gasuni1', 'gasuni2', 'gasuni3'].map(id => m.entities.find(e => e.id === id));
  assert.ok(choimis && girls.every(Boolean), '최미스·가순이 셋');
  for (const e of [choimis, ...girls]) assert.ok(e.x >= bridge.x && e.x + e.w <= bridge.x + bridge.w && e.y >= bridge.y && e.y + e.h <= bridge.y + bridge.h, `${e.id} 는 다리 위`);
  assert.ok([choimis, ...girls].every(e => e.hidden && !e.unless), '연출 전용 배우(hidden) — 닿을 수 없는 다리 위, 연출이 보이게 한다');
  const trig = m.entities.find(e => e.id === 'sakura2_bridge_trigger');
  assert.deepEqual([trig.once, trig.unless, trig.script, trig.x + trig.w], [true, SAKURA2_BRIDGE_FLAG, 'jjajang_sakura2_bridge', (S.sideEnd + 1) * 32]);
  const west = m.entities.find(e => e.id === 'sakura2_west_door'), north = m.entities.find(e => e.id === 'sakura2_north_door');
  assert.deepEqual([west.to, west.spawn, north.to, north.spawn], ['jjajang_sakura', 'from_east', 'jjajang_sakura3', 'from_south']);
  const one = load('jjajang_sakura'), east = one.entities.find(e => e.id === 'sakura_east_door');
  assert.deepEqual([east.to, east.spawn], ['jjajang_sakura2', 'from_west']); assert.ok(one.spawns.from_east && one.rows[one.meta.sakura.turn[0][0]].endsWith('('), '벚꽃 숲 1 오른쪽 끝이 열렸다');
  assert.deepEqual(MAP_RUNTIME_ASSETS.jjajang_sakura2.sprites, ['choimis', 'gasuni1', 'gasuni2', 'gasuni3']);
});

test('test_sakura2_bridge_scene_pans_right_by_grid_speaks_the_brief_verbatim_and_returns', () => {
  assert.equal(SCRIPTS.jjajang_sakura2_bridge, jjajang_sakura2_bridge);
  const lines = jjajang_sakura2_bridge.filter(n => n.text).map(n => `${n.speaker}: ${n.text.replace(/^\* /, '')}`);
  assert.deepEqual(lines, ['최미스: 허허 스읍 미스 ㅋㅋㅋㅋ', '가순이1: 떙땡이오빠 미용실 어디다녀요?', '최미스: 아 ㅋㅋ 전 뭐 인스타에서 연락오고 막.. 저인거  알아보던데', '최미스: 스읍 ㅋㅋㅋㅋㅋ', '억빠맨: 좆같네씨발']);
  const pan = jjajang_sakura2_bridge.findIndex(n => Array.isArray(n.camera)), back = jjajang_sakura2_bridge.findIndex(n => n.camera === 'player');
  const shows = ['choimis', 'gasuni1', 'gasuni2', 'gasuni3'].map(id => jjajang_sakura2_bridge.findIndex(n => n.show === id));
  assert.ok(shows.every(i => i >= 0 && i < pan), '배우 넷은 카메라가 가기 전에 보이게');
  const poseNode = jjajang_sakura2_bridge.find((n, i) => typeof n.action === 'function' && i < pan && /masked/.test(String(n.action)));
  assert.ok(poseNode && /loopCharacterMotion/.test(String(poseNode.action)), '카메라가 가기 전에 최미스는 가면 쓴 자세(masked)');
  const last = jjajang_sakura2_bridge.findIndex(n => n.text?.includes('스읍 ㅋㅋㅋㅋㅋ')), ppaman = jjajang_sakura2_bridge.findIndex(n => n.speaker === '억빠맨');
  assert.ok(pan >= 0 && pan < jjajang_sakura2_bridge.findIndex(n => n.text) && last < back && back < ppaman, '카메라 오른쪽(그리드) → 대사 넷 → 카메라 주인공 → 억빠맨');
  assert.deepEqual(jjajang_sakura2_bridge[pan].camera, BRIDGE_VIEW); assert.ok(BRIDGE_VIEW[0] >= 30, '다리 자리로');
  assert.ok(!jjajang_sakura2_bridge.some(n => 'bgm' in n), '브금 유지');
  assert.ok(jjajang_sakura2_bridge.some(n => n.set?.[SAKURA2_BRIDGE_FLAG]));
});

test('test_sakura3_raft_runs_right_then_down_on_blue_water_for_eight_seconds_with_a_gust_at_four', () => {
  const m = load('jjajang_sakura3'), S = m.meta.sakura3, raft = m.entities.find(e => e.type === 'raft');
  const walk = (c, r) => m.rows[r][c] === ')', water = (c, r) => m.rows[r][c] === '[';
  assert.ok(walk(S.entryCols[0], m.rows.length - 1) && walk(S.entryCols[1], S.roadRows[0]) && walk(S.shoreCol, S.roadRows[1]), '위로 → 오른쪽으로 물가');
  assert.ok(water(S.channel[0][0], S.channel[1][0]) && water(S.channel[0][1], S.channel[1][1]) && water(S.down[0][0], S.down[1]) && !water(S.down[0][0], S.down[1] + 1), '파란 물길 오른쪽 → 아래');
  assert.ok(walk(S.landing[0][0], S.landing[1][0]) && walk(S.landing[0][1], S.landing[1][1]), '아래 물가 뭍');
  assert.deepEqual([raft.walkOn, raft.swim, raft.speed, raft.route.length], [true, ['ppaman', 'gyeongsub'], 171, 2]);
  assert.equal(raft.route[0][1], raft.y); assert.equal(raft.route[1][0], raft.route[0][0]); assert.ok(raft.route[0][0] > raft.x && raft.route[1][1] > raft.y, '오른쪽으로 갔다가 아래로');
  const px = (raft.route[0][0] - raft.x) + (raft.route[1][1] - raft.y);
  assert.ok(px / raft.speed >= 7.5 && px / raft.speed <= 9, `8초쯤 ${(px / raft.speed).toFixed(1)}`);
  assert.deepEqual(m.meta.rideGust, { at: 4.0, burst: 160, rate: 60, seconds: 2.0 });
  const south = m.entities.find(e => e.id === 'sakura3_south_door'); assert.deepEqual([south.to, south.spawn], ['jjajang_sakura2', 'from_north']);
  assert.ok(m.spawns.dock && m.spawns.landing && m.spawns.from_south);
  const tiles = readFileSync(new URL('../../src/world/tiles.js', import.meta.url), 'utf8');
  const line = tiles.split('\n').find(l => l.includes("registerTile('['")); assert.ok(line && /solid: true/.test(line), '파란 물은 막힘(뗏목으로만)');
  const qa = id => QA_POINTS.find(p => p.id === id);
  assert.deepEqual([qa('jjajang_sakura2').spawn, qa('jjajang_sakura2_bridge').spawn, qa('jjajang_sakura3').spawn, qa('jjajang_sakura3_dock').spawn], ['from_west', 'junction', 'from_south', 'dock']);
  assert.ok(qa('jjajang_sakura2').flags.sakura_bloom && qa('jjajang_sakura3').flags.sakura2_bridge_done);
});
