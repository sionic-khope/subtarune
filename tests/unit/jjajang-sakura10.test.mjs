// 벚꽃 숲 10·11(BUILD283): 파란 토리이 10초 달리기(장애물 없음) · 절벽 오르막 도약(러너 finale: 오르막 → 도약(점프 소리) → 잔상 슬로우 6초 → 낙하 → outro) · 나무 정상 착지 맵 · 문 연결 · QA
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { jjajang_sakura10_start, jjajang_sakura10_outro, LANDING, FADE_OUT, FADE_IN } from '../../src/data/cutscenes/jjajang_sakura10.js';
import { QA_POINTS } from '../../src/core/story.js';
import { RUNNER, FINALE, createRunner, stepRunner } from '../../src/world/runner-core.js';

const load = id => JSON.parse(readFileSync(new URL(`../../assets/maps/${id}.json`, import.meta.url), 'utf8'));
const here = rel => existsSync(new URL(`../../${rel}`, import.meta.url));
const ent = (m, id) => m.entities.find(e => e.id === id);
const DT = 1 / 60, WALK = 121, SPRITE_ABOVE_FEET = 60;

test('test_sakura10_map_is_a_ten_second_obstacle_free_left_run_ending_at_a_cliff_ramp', () => {
  const m = load('jjajang_sakura10'), S = m.meta.sakura10, run = m.meta.runs.a;
  assert.equal(SCRIPTS.jjajang_sakura10_start, jjajang_sakura10_start);
  assert.ok(jjajang_sakura10_start[0].action && jjajang_sakura10_start[1].end === true, '토리이를 지나면 러너 시작');
  const t = ent(m, 'sakura10_torii_a');
  assert.deepEqual([t.script, t.x, t.y], ['jjajang_sakura10_start', S.runStartX, S.runRows[0] * 32]);
  assert.ok(t.x < m.spawns.torii.x && t.x < ent(m, 'jjajang_torii_blue_a_front').x, '트리거는 토리이 왼쪽(지나면 달린다)');
  assert.ok((m.spawns.from_east.x - m.spawns.torii.x) / WALK <= 4, '동쪽 끝에서 토리이까지 조금');
  const ride = (S.runStartX - run.endX) / run.speed;
  assert.ok(ride >= 9.5 && ride <= 11 && Math.abs(S.rideSeconds - ride) < 0.1, `10초쯤 (${ride.toFixed(1)}초)`);
  assert.deepEqual([run.dir, run.obstacles, run.water, run.outro, run.endX, run.types, run.outroFlag], [-1, false, false, 'jjajang_sakura10_outro', S.endX, undefined, undefined]);
  // 오르막 소품: 비탈 시작 픽셀이 (endX, 발 높이), 꼭대기까지가 finale.ramp/rise, 항상 뒤에 그리고 막지 않는다
  const ramp = ent(m, 'sakura10_cliff_ramp'), c = JSON.parse(readFileSync(new URL('../../assets/source/sakura10-v1/ramp-contract.json', import.meta.url), 'utf8'));
  assert.ok(here(ramp.image) && m.preload.includes(ramp.image) && ramp.sortY === -1 && ramp.solid === false, '오르막 소품');
  assert.deepEqual([ramp.ix + c.slope_start[0], ramp.iy + c.slope_start[1]], [run.endX, S.feetY], '비탈 시작 = 밑동·발 높이');
  assert.deepEqual([run.finale.ramp, run.finale.rise], [c.slope_start[0] - c.slope_top[0], c.slope_start[1] - c.slope_top[1]], '오르막 길이·높이는 그림 그대로');
  assert.deepEqual([S.ramp.len, S.ramp.rise, S.ramp.topX], [run.finale.ramp, run.finale.rise, ramp.ix + c.slope_top[0]]);
  // 길은 밑동에서 동쪽 끝까지, 밑동 왼쪽·하늘·절벽 아래는 허공, 절벽 근처엔 나무 없음
  for (const row of S.runRows) { assert.equal(m.rows[row].at(-1), ')'); assert.equal(m.rows[row][Math.floor(run.endX / 32)], ')'); assert.equal(m.rows[row][Math.floor(run.endX / 32) - 1], '@'); }
  assert.ok(m.rows.slice(0, S.runRows[0]).every(r => !r.includes(')')), '길 위는 하늘');
  assert.ok(m.entities.filter(e => e.id.startsWith('sakura10_tree')).every(e => e.x > ramp.ix + ramp.w + 96), '절벽 근처엔 나무 없음');
  // 멀리뛰기(사용자 “옆으로도 쭉, 맵 자체가”): 절벽 왼쪽 허공이 도약+슬로우 활공+낙하 거리보다 길어 맵 안에서 떨어진다
  const travel = FINALE.leapVx * FINALE.leapTime + FINALE.glide * FINALE.slow + FINALE.glide * 1.3;
  assert.ok(S.ramp.topX - travel >= 24, `허공 ${S.ramp.topX}px ≥ 멀리뛰기 ${travel.toFixed(0)}px + 여유`);
  assert.ok(m.rows.every(r => !r.slice(0, Math.floor(ramp.ix / 32)).includes(')')), '절벽 왼쪽은 전부 허공');
  // 꼭대기(오르막 rise + 도약 leapV²/2g)에서도 스프라이트 위 끝이 화면 안(cam.y 는 0 아래로 못 간다)
  const apex = run.finale.rise + FINALE.leapV * FINALE.leapV / (2 * RUNNER.gravity);
  assert.ok(S.feetY - apex - SPRITE_ABOVE_FEET >= 0, `꼭대기에서도 화면 안 (${(S.feetY - apex - SPRITE_ABOVE_FEET).toFixed(0)}px 여유)`);
});

test('test_sakura10_doors_connect_both_ways_with_sakura9', () => {
  const nine = load('jjajang_sakura9'), ten = load('jjajang_sakura10');
  const w9 = ent(nine, 'sakura9_west_door'), e10 = ent(ten, 'sakura10_east_door');
  assert.deepEqual([w9.to, w9.spawn, w9.x], ['jjajang_sakura10', 'from_east', 0]);
  assert.deepEqual([e10.to, e10.spawn, e10.x + e10.w], ['jjajang_sakura9', 'from_west', ten.rows[0].length * 32]);
  assert.deepEqual([nine.spawns.from_west.facing, ten.spawns.from_east.facing], ['right', 'left']);
  assert.ok(ten.spawns.from_east.x + 24 < e10.x, '동쪽 스폰은 문 밖');
});

test('test_runner_finale_runs_up_the_ramp_leaps_with_a_jump_sound_hangs_six_seconds_in_slow_motion_then_falls_to_the_outro', () => {
  const m = load('jjajang_sakura10'), S = m.meta.sakura10, run = m.meta.runs.a;
  const s = createRunner({ x: S.runStartX, endX: run.endX, speed: run.speed, dir: -1, finale: run.finale });
  const ev = [], at = {}; let t = 0, peak = 0, floatTrail = 0, xAtLeap = null, airAtLeap = null, groundMax = 0, airAtFloatEnd = null, xAtFloat = null, xAtFall = null;
  for (; t < 40 && s.phase !== 'done'; t += DT) {
    const e = stepRunner(s, DT, {}); for (const n of e) { ev.push(n); if (at[n] === undefined) at[n] = t; }
    if (s.phase === 'ramp') groundMax = Math.max(groundMax, s.groundY);
    if (e.includes('leap')) { xAtLeap = s.x; airAtLeap = s.airY; }
    if (e.includes('float')) xAtFloat = s.x;
    if (e.includes('fall')) { airAtFloatEnd = s.airY; xAtFall = s.x; }
    if (s.phase === 'float') floatTrail = Math.max(floatTrail, s.trail.length);
    peak = Math.max(peak, s.airY);
  }
  assert.deepEqual(ev.filter(n => ['ramp', 'jump', 'leap', 'float', 'fall', 'end', 'skid', 'land'].includes(n)), ['ramp', 'jump', 'leap', 'float', 'fall', 'end'], '오르막 → 점프 소리 + 도약 → 슬로우 → 낙하 → 끝(제동·착지 없음)');
  assert.ok(Math.abs(at.ramp - (RUNNER.prepTime + RUNNER.dashTime / 2 + S.rideSeconds)) < 1.2, `10초쯤 달려 오르막 (${at.ramp.toFixed(1)}초)`);
  const frameStep = run.speed * DT;   // 표본은 틱 뒤 값: 마지막 오르막 틱은 꼭대기 한 걸음 전, 도약 틱은 이미 한 틱 솟았다
  assert.ok(groundMax >= run.finale.rise - frameStep * run.finale.rise / run.finale.ramp - 0.01 && groundMax <= run.finale.rise && airAtLeap >= run.finale.rise && airAtLeap <= run.finale.rise + FINALE.leapV * DT + 0.01, `비탈 끝에서 발이 rise 만큼 올라 있다 (${groundMax.toFixed(1)}, ${airAtLeap.toFixed(1)})`);
  assert.ok(Math.abs(xAtLeap - (run.endX - run.finale.ramp)) < 2 * run.speed * DT + 1, `도약 자리 = 비탈 꼭대기 (${xAtLeap})`);   // 표본은 도약 틱 뒤(한 틱 전진 + 넘친 만큼)
  assert.ok(Math.abs((at.float - at.leap) - FINALE.leapTime) < 0.05 && Math.abs((at.fall - at.float) - FINALE.slow) < 0.05, '보통 속도 0.22초 → 슬로우 6초');
  assert.ok(peak >= run.finale.rise + 150 && peak <= run.finale.rise + 210, `꽤 뛴다 (${peak.toFixed(0)}px)`);
  assert.ok(airAtFloatEnd > peak - 40, '슬로우가 끝날 때까지 꼭대기 근처에 떠 있다');
  assert.ok(floatTrail >= 8, `슬로우 동안 잔상이 촘촘히 (${floatTrail})`);
  assert.ok(Math.abs((xAtFloat - xAtFall) - FINALE.glide * FINALE.slow) < 12 && xAtFall < xAtFloat, `슬로우 동안 앞으로 쭉 멀리뛰기 (${(xAtFloat - xAtFall).toFixed(0)}px)`);
  assert.ok(s.x >= 24 && s.x < xAtFall, `맵 안에서 떨어진다 (x ${s.x.toFixed(0)})`);
  assert.ok(at.end - at.fall < 1.5 && s.airY <= (run.finale.fallTo ?? FINALE.fallTo) && s.phase === 'done', `낙하는 보통 속도로 화면 아래까지 → 끝 (${(at.end - at.fall).toFixed(2)}초, airY ${s.airY.toFixed(0)})`);
  // finale 없는 러너는 그대로 제동한다
  const plain = createRunner({ x: 2000, endX: 400, speed: 420, dir: -1 }); const pe = []; for (let k = 0; k < 60 * 12; k++) pe.push(...stepRunner(plain, DT, {}));
  assert.ok(pe.includes('skid') && pe.includes('end') && !pe.includes('ramp') && plain.x === 400);
});

test('test_sakura10_outro_fades_changes_to_the_treetop_and_drops_the_player_onto_the_deck', () => {
  assert.equal(SCRIPTS.jjajang_sakura10_outro, jjajang_sakura10_outro);
  const s = jjajang_sakura10_outro;
  assert.deepEqual([s[0].fade, s[0].duration, s[1].map, s[1].spawn], ['out', FADE_OUT, 'jjajang_sakura11', 'landing']);
  const par = s.find(n => n.parallel?.some(x => x.drop === 'player')), drop = par.parallel.find(x => x.drop === 'player'), fadeIn = par.parallel.find(x => x.fade === 'in');
  assert.deepEqual([drop.height, drop.duration, drop.sfx, drop.land, drop.quake, fadeIn.duration], [LANDING.height, LANDING.duration, false, LANDING.land, LANDING.quake, FADE_IN], '밝아지며 떨어져 착지');
  assert.ok(s.indexOf(par) > 1 && s.at(-1).end === true && !s.some(n => n.text), '맵이 바뀐 뒤 착지, 대사 없음(검은 화면으로 끝나지 않는다)');
});

test('test_sakura11_is_a_round_wooden_deck_ringed_by_blossom_trees_with_the_landing_in_the_middle', () => {
  const m = load('jjajang_sakura11'), S = m.meta.sakura11;
  const deck = m.rows.flatMap(r => [...r].filter(ch => ch === '-'));
  assert.ok(deck.length >= 100 && m.rows.every(r => /^[@-]+$/.test(r)), '널빤지 바닥과 허공만');
  const [cx, cy] = S.center; assert.equal(m.rows[cy][cx], '-');
  const landing = m.spawns.landing; assert.deepEqual([Math.floor((landing.x + 12) / 32), Math.floor((landing.y + 8) / 32)], [cx, cy], '착지는 가운데');
  assert.ok(!m.rows.at(-1).includes('-') && [...m.rows[0]].every((ch, col) => ch === '@' || (col >= S.pathCols[0] && col <= S.pathCols[1])), '가장자리는 허공(위쪽 길만 뚫림, BUILD284)');
  const trees = m.entities.filter(e => e.id.startsWith('sakura11_tree'));
  assert.ok(trees.length >= 10 && m.entities.every(e => e.type === 'prop' || e.id === 'sakura11_north_door' || e.id.startsWith('sakura11_')), '나무 둘레, 문은 위쪽 길 끝뿐(BUILD284), 그 밖은 위쪽 길 브금 띠(BUILD285)');
  for (const t of trees) { const col = Math.floor((t.x + 12) / 32), row = Math.floor((t.y + 12) / 32); assert.notEqual(m.rows[row]?.[col], '-', `${t.id} 밑동은 바닥 밖`); assert.ok(Math.hypot(t.x - landing.x, t.y + 12 - landing.y) > 96, '착지 자리 근처 밑동 없음'); }
  assert.ok(m.meta.petals && m.bgm === 'sakura');
});

test('test_sakura10_qa_points', () => {
  const qa = id => QA_POINTS.find(q => q.id === id);
  assert.deepEqual([qa('jjajang_sakura10').spawn, qa('jjajang_sakura10_torii').spawn, qa('jjajang_sakura11').spawn], ['from_east', 'torii', 'landing']);
  assert.ok([qa('jjajang_sakura10'), qa('jjajang_sakura10_torii'), qa('jjajang_sakura11')].every(q => q.party.length === 0 && q.flags.sakura8_split_done));
  const ids = QA_POINTS.map(q => q.id); assert.ok(ids.indexOf('jjajang_sakura10') > ids.indexOf('jjajang_sakura9_torii') && ids.indexOf('jjajang_sakura11') > ids.indexOf('jjajang_sakura10_torii'), 'QA 순서');
});
