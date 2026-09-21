// 벚꽃 숲 8·9(BUILD282): 갈림길 맵(오른쪽 3초 → 갈림목 연출: 경섭 이탈·억빠맨 가드) · 파란 토리이 왼쪽 달리기 15초(분홍 나뭇잎·꽃가지) · 문 연결 · 대사 원문 · QA · 러너 per-run 옵션
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { jjajang_sakura8_split, jjajang_sakura8_no_right, jjajang_sakura9_start, ROAD_Y, UP_VIEW, CAM, GUARD_SPOT, EXIT_SPOT, FRONT_ROW, SAKURA8_SPLIT_FLAG, NO_RIGHT_LINE } from '../../src/data/cutscenes/jjajang_sakura8.js';
import { QA_POINTS } from '../../src/core/story.js';
import { MAP_RUNTIME_ASSETS } from '../../src/data/map-runtime-assets.js';
import { OBSTACLES, OBSTACLE_SPAWN, createRunner, stepRunner } from '../../src/world/runner-core.js';

const load = id => JSON.parse(readFileSync(new URL(`../../assets/maps/${id}.json`, import.meta.url), 'utf8'));
const here = rel => existsSync(new URL(`../../${rel}`, import.meta.url));
const WALK = 121;   // 걷기 px/s(맵 초 계산)
const line = n => n.text ? [n.speaker, n.text.replace(/^\* /, '')] : null;
const idx = (s, pred) => s.findIndex(pred);
const ent = (m, id) => m.entities.find(e => e.id === id);

test('test_sakura8_map_is_a_three_second_road_to_a_fork_with_up_and_right_branches', () => {
  const m = load('jjajang_sakura8'), S = m.meta.sakura8;
  const roadLen = S.junctionCols[0] - S.entryCols[0];
  assert.ok(roadLen * 32 / WALK >= 3 && roadLen * 32 / WALK <= 6.5, `갈림목까지 3초쯤(걷기 ${(roadLen * 32 / WALK).toFixed(1)}초)`);
  for (const row of [S.roadRows[0], S.roadRows[1]]) { assert.equal(m.rows[row][0], ')', '서쪽 끝 길'); assert.equal(m.rows[row].at(-1), ')', '동쪽 끝 오른쪽 길'); }
  for (const col of [S.junctionCols[0], S.junctionCols[1]]) assert.equal(m.rows[0][col], ')', '윗길은 맵 위 끝까지');
  assert.equal(S.roadY, ROAD_Y); assert.deepEqual(S.guard, GUARD_SPOT);
  assert.ok(S.guard[0] > S.junctionCols[1] * 32 && S.guard[0] < S.junctionCols[1] * 32 + 5 * 32, '가드는 갈림목 바로 오른쪽');
  // 갈림목 연출 트리거: 갈림목 앞 세로 띠(길 두 줄 전체) · 한 번 · 연출 뒤 없음
  const t = ent(m, 'sakura8_split_trigger');
  assert.deepEqual([t.once, t.flag, t.unless, t.script, t.x, t.y, t.h], [true, 'sakura8_split_started', SAKURA8_SPLIT_FLAG, 'jjajang_sakura8_split', S.sceneCols[0] * 32, S.roadRows[0] * 32, (S.roadRows[1] - S.roadRows[0] + 1) * 32]);
  assert.ok(m.spawns.fork.x + 24 < t.x && m.spawns.fork.y === ROAD_Y && m.spawns.from_west.x + 24 < t.x, '입구·갈림목 QA 자리는 트리거 왼쪽');
  // 오른쪽 길 막기: 가드 바로 앞 띠, 플래그로 열기 전엔 항상 되돌린다
  const b = ent(m, 'sakura8_block_trigger');
  assert.deepEqual([b.once, b.unless, b.script, b.x, b.h], [undefined, 'sakura8_right_open', 'jjajang_sakura8_no_right', S.blockCols[0] * 32, (S.roadRows[1] - S.roadRows[0] + 1) * 32]);
  assert.ok(b.x + b.w <= S.guard[0] && b.x > m.spawns.after.x + 24, '막기 띠는 연출 뒤 자리와 가드 사이');
  // 경섭·억빠맨 사본(연출용, 숨김, 연출 뒤 없음) · 가드(연출 뒤에만, 왼쪽 보고 막아섬)
  for (const id of ['gyeongsub_npc', 'ppaman_npc']) { const e = ent(m, id); assert.ok(e.hidden && e.unless === SAKURA8_SPLIT_FLAG && e.solid === false && e.wander === 0, id); }
  const g = ent(m, 'ppaman_guard');
  assert.deepEqual([g.sprite, g.requires, g.solid, g.facing, g.wander, [g.x, g.y]], ['ppaman', SAKURA8_SPLIT_FLAG, true, 'left', 0, GUARD_SPOT]);
  assert.deepEqual(EXIT_SPOT, [m.rows[0].length * 32 + 48, ROAD_Y + FRONT_ROW * 2], '경섭은 앞줄로 동쪽 끝 밖으로');
  assert.ok(ROAD_Y + FRONT_ROW * 2 + 16 <= (S.roadRows[1] + 1) * 32, '앞줄도 길 위');
  assert.deepEqual(m.spawns.after, { x: S.junctionX, y: ROAD_Y, facing: 'up' });
});

test('test_sakura8_doors_connect_sakura7_sakura8_and_sakura9_both_ways', () => {
  const seven = load('jjajang_sakura7'), eight = load('jjajang_sakura8'), nine = load('jjajang_sakura9');
  const e7 = ent(seven, 'sakura7_east_door'), w8 = ent(eight, 'sakura8_west_door'), u8 = ent(eight, 'sakura8_up_door'), s9 = ent(nine, 'sakura9_south_door');
  assert.deepEqual([e7.to, e7.spawn, e7.x + e7.w], ['jjajang_sakura8', 'from_west', seven.rows[0].length * 32]);
  assert.deepEqual([w8.to, w8.spawn, w8.x], ['jjajang_sakura7', 'from_east', 0]);
  assert.deepEqual([u8.to, u8.spawn, u8.y], ['jjajang_sakura9', 'from_south', 0]);
  assert.deepEqual([s9.to, s9.spawn, s9.y + s9.h], ['jjajang_sakura8', 'from_north', nine.rows.length * 32]);
  assert.deepEqual([seven.spawns.from_east.facing, eight.spawns.from_west.facing, eight.spawns.from_north.facing, nine.spawns.from_south.facing], ['left', 'right', 'down', 'up']);
  assert.ok(u8.x <= eight.spawns.from_north.x && eight.spawns.from_north.x + 24 <= u8.x + u8.w, '북쪽 스폰은 윗문 폭 안');
});

test('test_sakura8_split_scene_has_verbatim_lines_camera_to_the_up_road_then_gyeongsub_leaves_and_ppaman_guards', () => {
  const s = jjajang_sakura8_split; assert.equal(SCRIPTS.jjajang_sakura8_split, s);
  assert.deepEqual(s.map(line).filter(Boolean), [
    ['경섭', '빠맨아,'], ['억빠맨', '네?'], ['경섭', '아마 저 다음에 미스가 있는거같은데,'], ['경섭', '내가 혼자 갔다오마'], ['억빠맨', '아 네'],
    ['경섭', '그동안 그 어둠의짜장면?(보라색)을 얻을 방법을 좀 궁리해보는게 좋을듯 싶다.'], ['억빠맨', '흠.. 저 고민좀 해볼게요'], ['억빠맨', '요플래형은 뭐 한번 저기라도 가보실래요?'],
    ['경섭', '갔다오마.'],
  ]);
  // (윗길로 카메라를 가리킨다): 억빠맨이 위를 보고 카메라가 천천히 윗길로 갔다가 돌아온 뒤 “갔다오마.”
  const ask = idx(s, n => n.text?.includes('저기라도 가보실래요')), up = idx(s, n => n.face === 'ppaman' && n.dir === 'up'), cam = idx(s, n => n.camera === UP_VIEW), back = idx(s, n => n.camera === 'player'), bye = idx(s, n => n.text === '* 갔다오마.');
  assert.ok(ask < up && up < cam && cam < back && back < bye, '카메라 먼저, 대사는 그 뒤');
  assert.ok(s[cam].duration >= 1 && s[cam + 1].wait >= 0.5 && s[back].duration >= 1, '카메라는 천천히');
  assert.deepEqual([s[cam].duration, s[cam + 1].wait, s[back].duration, s[back + 1].wait], [CAM.up, CAM.hold, CAM.back, CAM.back]);   // 돌아오는 동안도 기다린 뒤 “갔다오마.”
  const eight = load('jjajang_sakura8'), S = eight.meta.sakura8;
  const camTop = UP_VIEW[1] * 32 - 164, camLeft = UP_VIEW[0] * 32 - 224;
  assert.ok(camTop >= 0 && camTop + 230 <= S.roadRows[0] * 32 + 64 && camLeft < S.junctionCols[0] * 32 && camLeft + 480 > S.junctionCols[1] * 32, '윗길 뷰: 길 위쪽(윗줄)이 보이는 영역 안');
  // (경섭이 오른쪽으로 쭉 걸어감): 사본이 서고 → 동료에서 빠짐 → 동쪽 끝 밖으로 → 사라짐. 그 뒤 억빠맨도 빠져 가드 자리로(왼쪽 보고 막아섬) → 플래그
  const kStand = idx(s, (n, i) => i > bye && n.action), kLeave = idx(s, n => n.leave === 'gyeongsub'), kGo = idx(s, n => n.move === 'gyeongsub_npc' && n.px === EXIT_SPOT && n.exact), kGone = idx(s, n => n.remove === 'gyeongsub_npc');
  const pLeave = idx(s, n => n.leave === 'ppaman'), pGo = idx(s, n => n.move === 'ppaman_npc' && n.px === GUARD_SPOT && n.exact), pFace = idx(s, n => n.face === 'ppaman_npc' && n.dir === 'left'), flag = idx(s, n => n.set?.[SAKURA8_SPLIT_FLAG]);
  assert.ok(bye < kStand && kStand < kLeave && kLeave < kGo && kGo < kGone && kGone < pLeave && pLeave < pGo && pGo < pFace && pFace < flag && flag === s.length - 1);
  const kFront = idx(s, n => n.move === 'gyeongsub_npc' && n.by?.[1] === FRONT_ROW), pFront = idx(s, n => n.move === 'ppaman_npc' && n.by?.[1] === FRONT_ROW);
  assert.ok(kLeave < kFront && kFront < kGo && pLeave < pFront && pFront < pGo, '둘 다 앞줄로 내려와 지나간다(일행과 겹쳐 통과하지 않게)');
  assert.ok(!s.some(n => n.leave === 'player') && !s.some(n => n.join), '요플래(주인공)만 남고 아무도 다시 합류하지 않는다');
});

test('test_sakura8_no_right_guard_says_one_line_and_pushes_the_player_back_a_tile', () => {
  const s = jjajang_sakura8_no_right; assert.equal(SCRIPTS.jjajang_sakura8_no_right, s);
  assert.deepEqual(s.map(line).filter(Boolean), [['억빠맨', NO_RIGHT_LINE]]);
  assert.equal(NO_RIGHT_LINE, '윗길로 가보시는게 어때요?');
  const back = s.find(n => n.move === 'player'); assert.deepEqual([back.by, back.speed], [[-32, 0], 60]);
  assert.ok(idx(s, n => n.move === 'player') > idx(s, n => n.text) && s.at(-1).face === 'player' && s.at(-1).dir === 'up', '되돌린 뒤 윗길을 보게');
});

test('test_sakura9_map_is_a_short_up_then_left_walk_to_a_blue_torii_and_a_fifteen_second_left_run_with_pink_obstacles', () => {
  const m = load('jjajang_sakura9'), S = m.meta.sakura9, run = m.meta.runs.a;
  assert.equal(SCRIPTS.jjajang_sakura9_start, jjajang_sakura9_start);
  assert.ok(jjajang_sakura9_start[0].action && jjajang_sakura9_start[1].end === true, '토리이를 지나면 러너 시작(토리이 굽이 길 방식)');
  // 위로 살짝 → 왼쪽으로 살짝 → 토리이
  assert.ok((m.rows.length - S.runRows[1]) * 32 / WALK <= 2.5, '위로 살짝');
  assert.ok((S.entryCols[0] - S.toriiCol) * 32 / WALK <= 4, '왼쪽으로 살짝');
  const t = ent(m, 'sakura9_torii_a');
  assert.deepEqual([t.script, t.x, t.y], ['jjajang_sakura9_start', S.runStartX, S.runRows[0] * 32]);
  assert.ok(t.x < m.spawns.torii.x && t.x < ent(m, 'jjajang_torii_blue_a_front').x, '트리거는 토리이 왼쪽(지나면 달린다)');
  assert.ok(ent(m, 'jjajang_torii_blue_a_back').image.includes('torii_blue') && ent(m, 'jjajang_torii_blue_a_front').image.includes('torii_blue'), '파란 토리이');
  // 달리기: 왼쪽으로, 15초쯤, 분홍 장애물만, 물 없음, 분홍 조각
  const ride = (S.runStartX - run.endX) / run.speed;
  assert.deepEqual([run.dir, run.obstacles, run.water, run.endX, S.rideSeconds], [-1, true, false, S.endX, Math.round(ride * 10) / 10]);
  assert.ok(ride >= 13.5 && ride <= 16.5, `15초쯤 (${ride.toFixed(1)}초)`);
  assert.ok(run.endX >= 32 * 4 && run.endX < 32 * 16, '끝은 왼쪽 끝 근처');
  assert.deepEqual(m.spawns.end, { x: run.endX + 20, y: S.roadY, facing: 'left' });
  assert.ok(run.types.length >= 4 && run.types.every(ty => ty.startsWith('sakura_') && OBSTACLES[ty]), '장애물은 전부 분홍(sakura_*)');
  assert.ok(run.types.includes('sakura_branch') && run.types.includes('sakura_leaf'), '나뭇가지와 나뭇잎');
  assert.ok(run.petals.length >= 2 && run.petals.every(c => /^#[0-9a-f]{6}$/.test(c)), '분홍 조각 색');
  for (const rel of ['assets/props/run_sakura_leaf_1.png', 'assets/props/run_sakura_leaf_2.png', 'assets/props/run_sakura_branch.png', 'assets/props/run_sakura_petals.png', 'assets/props/jjajang_torii_blue_back.png', 'assets/props/jjajang_torii_blue_front.png']) { assert.ok(here(rel), rel); assert.ok(m.preload.includes(rel), `미리 적재 ${rel}`); }
  for (const row of [S.runRows[0], S.runRows[1]]) assert.equal(m.rows[row][0], ')', '왼쪽 끝까지 길');
  assert.equal(m.rows.at(-1)[S.entryCols[0]], ')', '아래 가장자리 입구');
});

test('test_runner_core_uses_the_per_run_obstacle_types_and_pink_ones_share_the_original_physics', () => {
  for (const [pink, base] of [['sakura_leaf', 'leaf'], ['sakura_leaf2', 'leaf2'], ['sakura_petals', 'needles'], ['sakura_branch', 'branch']]) {
    const { draw: _d, ...a } = OBSTACLES[pink], { draw: _e, ...b } = OBSTACLES[base];
    assert.deepEqual(a, b, `${pink} 는 ${base} 와 같은 물리`);
  }
  const types = ['sakura_leaf', 'sakura_petals', 'sakura_leaf2', 'sakura_branch'];
  const s = createRunner({ x: 6496, endX: 362, speed: 420, dir: -1, obstacles: true, seed: 41, types });
  const seen = [];
  for (let i = 0; i < 900 && seen.length < 4; i++) { stepRunner(s, 1 / 60, {}); for (const o of s.obstacles) if (!seen.includes(o.type)) seen.push(o.type); }
  assert.deepEqual(seen, types, '맵이 준 순서대로 나온다');
  const d = createRunner({ x: 0, endX: 4000, speed: 420, obstacles: true, seed: 1 });
  assert.equal(d.types, OBSTACLE_SPAWN.types, 'types 를 안 주면 원래 순서');
});

test('test_sakura8_qa_points_and_runtime_assets', () => {
  const qa = id => QA_POINTS.find(q => q.id === id);
  assert.deepEqual([qa('jjajang_sakura8').spawn, qa('jjajang_sakura8_fork').spawn, qa('jjajang_sakura8_after').spawn, qa('jjajang_sakura9').spawn, qa('jjajang_sakura9_torii').spawn], ['from_west', 'fork', 'after', 'from_south', 'torii']);
  assert.deepEqual([qa('jjajang_sakura8').party, qa('jjajang_sakura8_after').party, qa('jjajang_sakura9').party, qa('jjajang_sakura9_torii').party], [['gyeongsub', 'ppaman'], [], [], []]);
  assert.ok(qa('jjajang_sakura8').flags.sakura7_scene_done && !qa('jjajang_sakura8').flags.sakura8_split_done && qa('jjajang_sakura8_after').flags.sakura8_split_done && qa('jjajang_sakura9').flags.sakura8_split_done);
  const ids = QA_POINTS.map(q => q.id); assert.ok(ids.indexOf('jjajang_sakura8') > ids.indexOf('jjajang_sakura7_after') && ids.indexOf('jjajang_sakura9_torii') === ids.length - 1);
  assert.deepEqual(MAP_RUNTIME_ASSETS.jjajang_sakura8, { sprites: ['gyeongsub', 'ppaman'], portraits: ['gyeongsub', 'ppaman'] });
});
