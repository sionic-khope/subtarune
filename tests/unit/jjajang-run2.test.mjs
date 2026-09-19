// 토리이 굽이 길(BUILD236): A 오른쪽 → 밑길 → B 왼쪽 → 밑길 → C 오른쪽, 토리이 셋(각 길 위·아래 칸), 방향별 트리거·meta.runs(끝 자리는 카메라 구도 안), 장애물 켜짐,
// 입구 청소부 한마디·휘리릭·사라짐, C 끝 outro(걸어와 “껄껄 이제 적응좀 됐나보구만” + 웃음 뒤 합류), 러너 상태기계의 왼쪽 달리기·장애물(쳐냄·맞음)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { jjajang_run2_enter, jjajang_run2_start_a, jjajang_run2_start_b, jjajang_run2_outro } from '../../src/data/cutscenes/jjajang_run2.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { QA_POINTS, storyBgm, JJAJANG_AFTER_JOIN_MAPS } from '../../src/core/story.js';
import { RUNNER, OBSTACLES, OBSTACLE_SPAWN, createRunner, stepRunner } from '../../src/world/runner-core.js';

const map = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_run2.json', import.meta.url), 'utf8'));
const prev = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_run.json', import.meta.url), 'utf8'));
const rows = map.rows;
const W = rows[0].length;
const walk = (c, r) => rows[r]?.[c] === '*' || rows[r]?.[c] === '+';
const DT = 1 / 60;
const run = (s, seconds, input = {}) => { const ev = []; for (let t = 0; t < seconds; t += DT) ev.push(...stepRunner(s, DT, input)); return ev; };

test('test_run2_map_zigzags_right_down_left_down_right_with_three_torii', () => {
  const [[a0, a1], [b0, b1], [c0, c1]] = map.meta.runRoadRows;
  assert.ok(a0 < b0 && b0 < c0, '위에서 아래로 A·B·C');
  for (let c = 1; c <= 113; c++) assert.ok(walk(c, a0) && walk(c, a1), `A ${c}`);
  for (let c = 6; c <= 113; c++) assert.ok(walk(c, b0) && walk(c, b1), `B ${c}`);
  for (let c = 6; c < W; c++) assert.ok(walk(c, c0) && walk(c, c1), `C ${c}`);
  for (let r = a0; r <= b1; r++) assert.ok(walk(112, r) && walk(113, r), `오른쪽 밑길 ${r}`);
  for (let r = b0; r <= c1; r++) assert.ok(walk(6, r) && walk(7, r), `왼쪽 밑길 ${r}`);
  assert.ok(!walk(60, a1 + 1) && !walk(60, b0 - 1) && !walk(3, b0) && !walk(116, b0), '길 밖은 숲');
  assert.equal(rows[a0][0], '+'); assert.equal(rows[c0][W - 1], '+');
  for (const [tag, rr] of [['a', [a0, a1]], ['b', [b0, b1]], ['c', [c0, c1]]]) {
    const front = map.entities.find(e => e.id === `jjajang_torii_blue_${tag}_front`), back = map.entities.find(e => e.id === `jjajang_torii_blue_${tag}_back`);
    assert.ok(front.y >= (rr[1] + 1) * 32 && front.y + front.h <= (rr[1] + 2) * 32, `${tag}: 가까운 기둥은 길 아래 칸`);
    assert.ok(back.y >= (rr[0] - 1) * 32 && back.y + back.h <= rr[0] * 32, `${tag}: 먼 기둥은 길 위 칸`);
    assert.ok(front.iy >= 0);
  }
  for (const p of map.entities.filter(e => /jjajang_pine_/.test(e.image || ''))) {
    const c = Math.floor((p.x + 12) / 32), r = Math.floor((p.y + 6) / 32);
    assert.equal(rows[r][c], '@'); assert.ok(p.ix >= 0 && p.iy >= 0);
  }
});

test('test_run2_triggers_runs_and_camera_framing', () => {
  const runs = map.meta.runs;
  assert.deepEqual([runs.a.dir, runs.b.dir, runs.c.dir], [1, -1, 1], 'A 오른쪽, B 왼쪽, C 오른쪽');
  assert.ok(runs.a.obstacles && runs.b.obstacles && runs.c.obstacles, '세 구간 모두 장애물');
  assert.ok(runs.a.keepFollowersHidden && runs.b.keepFollowersHidden && !runs.c.keepFollowersHidden, 'A·B 끝은 청소부가 사라진 채, C 끝에 돌아온다');
  assert.deepEqual([runs.c.outro, runs.c.outroFlag], ['jjajang_run2_outro', 'run2_outro_done']);
  const pxW = W * 32;
  assert.ok(Math.abs((runs.a.endX + 12) - Math.min(runs.a.endX + 12 - 480 * 0.22, pxW - 480) - 480 * 0.22) <= 8, 'A 끝: 카메라가 캐릭터를 22% 에 둘 수 있다');
  assert.ok(Math.abs((runs.b.endX + 12) - 480 * (1 - 0.22)) <= 8, 'B 끝: 카메라 최소 x(0)에서 캐릭터가 78%');
  assert.ok(Math.abs((runs.c.endX + 12) - (pxW - 480) - 480 * 0.22) <= 8, 'C 끝: 22%');
  const t = id => map.entities.find(e => e.id === id);
  const [[a0], [b0], [c0]] = map.meta.runRoadRows;
  assert.deepEqual([t('run2_torii_a').script, t('run2_torii_b').script, t('run2_torii_c').script], ['jjajang_run2_start_a', 'jjajang_run2_start_b', 'jjajang_run2_start_c']);
  assert.ok(t('run2_torii_a').y === a0 * 32 && t('run2_torii_b').y === b0 * 32 && t('run2_torii_c').y === c0 * 32);
  assert.ok(t('run2_torii_a').once === undefined && t('run2_torii_b').once === undefined, '지날 때마다');
  assert.ok(t('run2_torii_a').x > t('jjajang_torii_blue_a_front').x && t('run2_torii_b').x + t('run2_torii_b').w < t('jjajang_torii_blue_b_front').x + 20, '토리이를 지난 자리(A 오른쪽, B 왼쪽)');
  const enter = t('run2_enter_trigger');
  assert.deepEqual({ script: enter.script, once: enter.once, flag: enter.flag, unless: enter.unless }, { script: 'jjajang_run2_enter', once: true, flag: 'run2_enter_started', unless: 'run2_enter_done' });
  const west = map.entities.find(e => e.type === 'door');
  assert.deepEqual([west.to, west.spawn, west.x], ['jjajang_run', 'from_east', 0]);
  const east = prev.entities.find(e => e.id === 'run_run2_door');
  assert.deepEqual([east.to, east.spawn, east.x], ['jjajang_run2', 'from_west', 209 * 32 - 10], '파란 토리이 길 오른쪽 끝 → 굽이 길');
  assert.ok(prev.spawns.from_east && prev.spawns.from_east.facing === 'left');
  assert.equal(map.bgm, 'my_castle_town'); assert.ok(JJAJANG_AFTER_JOIN_MAPS.includes('jjajang_run2'));
  assert.equal(storyBgm('jjajang_run2', { torii_janitor_joined: true }), 'my_castle_town');
  for (const p of ['assets/props/run_leaf_1.png', 'assets/props/run_leaf_2.png', 'assets/props/run_branch.png', 'assets/props/run_needles.png']) assert.ok(map.preload.includes(p) && existsSync(new URL('../../' + p, import.meta.url)), p);
  for (const sfx of ['deflect', 'hurt_dr']) assert.ok(existsSync(new URL(`../../assets/audio/sfx/${sfx}.mp3`, import.meta.url)), sfx);
  for (const id of ['jjajang_run2', 'jjajang_run2_b', 'jjajang_run2_c']) { const qa = QA_POINTS.find(p => p.id === id); assert.deepEqual(qa.party, ['janitor']); assert.ok(qa.flags.run_outro_done); }
  assert.equal(map.spawns.before_b.facing, 'left'); assert.ok(map.spawns.before_b.x > t('run2_torii_b').x + t('run2_torii_b').w);
});

test('test_run2_enter_outro_and_start_scripts', () => {
  assert.equal(SCRIPTS.jjajang_run2_enter, jjajang_run2_enter); assert.equal(SCRIPTS.jjajang_run2_outro, jjajang_run2_outro);
  assert.deepEqual(jjajang_run2_enter.filter(n => n.text).map(n => [n.speaker, n.text]), [['청소부', '* 껄껄 이번에도 한번 잘 해보게 그럼 이따보게']]);
  const li = jjajang_run2_enter.findIndex(n => n.motion === 'janitor' && n.name === 'laugh');
  assert.ok(li > 0 && jjajang_run2_enter[li - 1].text.startsWith('* 껄껄'), '껄껄 뒤 웃음');
  const whoosh = jjajang_run2_enter.findIndex(n => Array.isArray(n.parallel) && n.parallel.some(b => b.sfx === 'wing'));
  const hide = jjajang_run2_enter.findIndex(n => n.hide === 'janitor');
  assert.ok(li < whoosh && whoosh < hide && jjajang_run2_enter.some(n => n.set?.run2_enter_done), '웃음 → 휘리릭 → 사라짐 → 플래그');
  const outroLines = jjajang_run2_outro.filter(n => n.text).map(n => n.text);
  assert.deepEqual(outroLines, ['* 껄껄 이제 적응좀 됐나보구만'], '맵 끝 합류 대사(사용자 문장 그대로)');
  const oli = jjajang_run2_outro.findIndex(n => n.motion === 'janitor' && n.name === 'laugh');
  assert.ok(oli > 0 && jjajang_run2_outro[oli - 1].text.startsWith('* 껄껄') && jjajang_run2_outro[oli].sfx === 'laugh_janitor', '껄껄 뒤 웃음');
  const moves = jjajang_run2_outro.filter(n => n.move === 'janitor');
  assert.equal(moves.length, 2); assert.ok(moves[1].speed <= 60 && moves[1].footsteps);
  assert.ok(jjajang_run2_outro.findIndex(n => n.show === 'janitor') < jjajang_run2_outro.indexOf(moves[1]) && jjajang_run2_outro.indexOf(moves[1]) < oli && jjajang_run2_outro.findIndex(n => n.regroup) > jjajang_run2_outro.findIndex(n => n.set?.run2_outro_done), '걸어온 뒤 대사, 플래그 뒤 합류');
  // 시작 스크립트: 그 방향을 볼 때만, 맵 meta.runs 의 설정으로
  const calls = [];
  const game = { runner: null, player: { facing: 'right' }, map: { def: { meta: { runs: map.meta.runs } } }, startRunner: cfg => calls.push(cfg) };
  jjajang_run2_start_a[0].action(game); assert.equal(calls.length, 1); assert.equal(calls[0].dir, 1); assert.equal(calls[0].id, 'a'); assert.equal(calls[0].endX, map.meta.runs.a.endX);
  jjajang_run2_start_b[0].action(game); assert.equal(calls.length, 1, '오른쪽을 보며 b 트리거를 밟으면 안 켜짐');
  game.player.facing = 'left'; jjajang_run2_start_b[0].action(game); assert.equal(calls.length, 2); assert.equal(calls[1].dir, -1);
  game.runner = {}; jjajang_run2_start_a[0].action(game); assert.equal(calls.length, 2, '달리는 중엔 무시');
});

test('test_runner_core_runs_left_and_obstacles_deflect_or_hurt', () => {
  // 왼쪽 달리기: x 가 줄고 끝(endX)에서 정확히 선다
  const l = createRunner({ x: 3000, endX: 362, dir: -1 });
  run(l, 2); assert.ok(l.phase === 'run' && l.x < 2550 && l.x > 2300 && l.vx === RUNNER.speed, '왼쪽으로 달린다 ' + l.x);
  run(l, 8); assert.equal(l.phase, 'done'); assert.equal(l.x, 362);
  // 장애물: 결정적(seed) 생성, 베지 않으면 맞고(hurt, 무적), 베면 쳐낸다(deflect)
  const a = createRunner({ x: 0, endX: 100000, obstacles: true, seed: 5 });
  const evA = run(a, 12);
  assert.ok(a.hurtCount >= 1 && evA.includes('hurt'), `아무것도 안 하면 맞는다 (${a.hurtCount})`);
  assert.ok(a.hurtCount <= 12 / 0.9 + 1, '무적 시간(0.9초) 안엔 두 번 안 맞는다');
  const b = createRunner({ x: 0, endX: 100000, obstacles: true, seed: 5 });
  let deflects = 0, hurts = 0, t = 0;
  while (t < 12) {
    // 앞 40~120px 에 장애물이 오면 베기(땅) 또는 공중 베기
    const near = b.obstacles.find(o => !o.deflected && (o.x - (b.x + 12)) * b.dir > 30 && (o.x - (b.x + 12)) * b.dir < 110);
    const ev = stepRunner(b, DT, { attack: !!near && !b.attack && b.grounded });
    deflects += ev.filter(e => e === 'deflect').length; hurts += ev.filter(e => e === 'hurt').length; t += DT;
  }
  assert.ok(deflects >= 3, `베면 쳐낸다 (${deflects})`); assert.equal(b.deflectCount, deflects);
  assert.ok(hurts < a.hurtCount, `쳐내면 덜 맞는다 (${hurts} < ${a.hurtCount})`);
  assert.ok(Object.keys(OBSTACLES).every(k => OBSTACLES[k].hurt === 10), '못 쳐내면 피 10');
  assert.ok(OBSTACLE_SPAWN.types.every(k => OBSTACLES[k]));
  const c1 = createRunner({ x: 0, endX: 100000, obstacles: true, seed: 9 }), c2 = createRunner({ x: 0, endX: 100000, obstacles: true, seed: 9 });
  run(c1, 5); run(c2, 5);
  assert.deepEqual(c1.obstacles.map(o => [o.type, Math.round(o.x)]), c2.obstacles.map(o => [o.type, Math.round(o.x)]), '같은 seed 는 같은 장애물');
});
