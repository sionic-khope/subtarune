// 파란 토리이 길(BUILD230): 곧은 검은 물길('*' 물걸음·물결), 파란 토리이 두 조각(길 위·아래 칸), 기둥 사이 트리거(매번, once 없음), 석상 앞 숲 오른쪽 문 ↔ 왼쪽 문, 달리기 구간 길이, 러너 스프라이트·소리 등록, QA
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { jjajang_run_start, jjajang_run_intro, jjajang_run_outro, OUTRO_WALK_FROM, OUTRO_STOP_GAP } from '../../src/data/cutscenes/jjajang_run.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { QA_POINTS, storyBgm, JJAJANG_AFTER_JOIN_MAPS } from '../../src/core/story.js';
import { CHARACTER_MOTIONS } from '../../src/data/character-motions.js';
import { getTile } from '../../src/world/tiles.js';
import { RUNNER } from '../../src/world/runner-core.js';

const map = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_run.json', import.meta.url), 'utf8'));
const statue = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_statue.json', import.meta.url), 'utf8'));
const rows = map.rows;

test('test_run_map_is_one_long_black_water_road_with_the_blue_torii_and_a_per_pass_trigger', () => {
  const [r0, r1] = [8, 9];
  const W = rows[0].length;
  assert.equal(W, 209); assert.equal(rows.length, 14);
  for (let c = 1; c < W - 1; c++) { assert.equal(rows[r0][c], '*'); assert.equal(rows[r1][c], '*'); }
  assert.equal(rows[r0][0], '+'); assert.equal(rows[r0][W - 1], '+');
  assert.equal(getTile('+').name, 'jjajang_black_water_edge', '가장자리 출입구 칸도 검은 물 그림(회색 상자 금지)');
  assert.ok(rows.every((row, r) => (r === r0 || r === r1) || [...row].every(ch => ch === '@')), '길 밖은 검은 숲');
  const tile = getTile('*');
  assert.ok(!tile.solid && tile.step && tile.step.ripple !== false && tile.variants === 3, '검은 물: 걸을 수 있고 물걸음 루프 + 물결 고리');
  const back = map.entities.find(e => e.id === 'jjajang_torii_blue_back'), front = map.entities.find(e => e.id === 'jjajang_torii_blue_front');
  assert.ok(back.image.endsWith('jjajang_torii_blue_back.png') && front.image.endsWith('jjajang_torii_blue_front.png'));
  assert.ok(existsSync(new URL('../../' + back.image, import.meta.url)) && existsSync(new URL('../../' + front.image, import.meta.url)));
  assert.ok(front.y >= (r1 + 1) * 32 && front.y + front.h <= (r1 + 2) * 32, '가까운 기둥은 길 아래 칸');
  assert.ok(back.y >= (r0 - 1) * 32 && back.y + back.h <= r0 * 32, '먼 기둥은 길 위 칸');
  assert.ok(front.iy >= 0 && back.iy >= 0, '그림이 맵 안');
  const trig = map.entities.find(e => e.id === 'run_torii_trigger');
  assert.deepEqual({ script: trig.script, once: trig.once, flag: trig.flag, y: trig.y, h: trig.h }, { script: 'jjajang_run_start', once: undefined, flag: undefined, y: r0 * 32, h: 64 }, '지날 때마다(once 없음)');
  assert.ok(trig.x > front.x && trig.x >= 32 * 32 && trig.x + trig.w <= 34 * 32, '기둥 사이를 지나는 자리');
  assert.ok(map.meta.run.startX >= trig.x + trig.w && map.meta.run.endX === W * 32 - 386 && map.meta.run.speed === RUNNER.speed);
  const intro = map.entities.find(e => e.id === 'run_intro_trigger');
  assert.deepEqual({ script: intro.script, once: intro.once, flag: intro.flag, unless: intro.unless }, { script: 'jjajang_run_intro', once: true, flag: 'run_intro_started', unless: 'run_intro_done' }, '토리이 앞 청소부 연출은 한 번');
  assert.ok(intro.x + intro.w <= front.x && map.spawns.before_torii.x < intro.x, '토리이 앞, QA 스폰은 그 앞');
  // 연출이 시작될 때(플레이어 상자가 트리거 왼쪽 변에 닿는 x) 카메라(가운데 = x+12, 화면 480) 오른쪽 변이 먼 기둥까지 담는다 — 사용자 2026-09-19 “파란 토리이가 보이기도 전에 대사가 나온다”
  const camRightAtIntro = (intro.x - 24 + 12) - 240 + 480;
  assert.ok(camRightAtIntro >= back.x + back.w / 2 && camRightAtIntro >= front.ix + 200, `연출 시작 때 가까운 기둥·가로대·먼 기둥 가운데까지 화면 안 (${camRightAtIntro} ≥ ${back.x + back.w / 2})`);
  assert.deepEqual([map.meta.run.outro, map.meta.run.outroFlag], ['jjajang_run_outro', 'run_outro_done'], '달리기 끝 연출은 맵 meta 로');
  assert.deepEqual(map.meta.runRoadRows, [r0, r1], '바닥 물결 줄기 행은 맵이 준다(하드코딩 금지)');
  // 제동·정지 자리에서도 카메라(최대 x = pxW-480)가 캐릭터를 화면 왼쪽 22% 에 둘 수 있다(리뷰 2026-09-19)
  assert.ok(Math.abs((map.meta.run.endX + 12) - (W * 32 - 480) - 480 * RUNNER.cameraLeft) <= 8, '끝에서도 왼쪽 22% 구도');
  assert.ok((map.meta.run.endX - map.meta.run.startX) / map.meta.run.speed > 9.5, '달리기 구간 약 10초');
  for (const p of map.entities.filter(e => /jjajang_pine_/.test(e.image || ''))) {
    const c = Math.floor((p.x + 12) / 32), r = Math.floor((p.y + 6) / 32);
    assert.equal(rows[r][c], '@'); assert.ok(p.ix >= 0 && p.iy >= 0);
  }
});

test('test_run_map_doors_bgm_qa_and_start_script', () => {
  const west = map.entities.find(e => e.type === 'door');
  assert.deepEqual([west.to, west.spawn, west.x, west.w, west.y], ['jjajang_statue', 'from_east', 0, 10, 8 * 32]);
  assert.ok(statue.spawns.from_east && statue.spawns.from_east.facing === 'left');
  const east = statue.entities.find(e => e.id === 'statue_run_door');
  assert.deepEqual([east.to, east.spawn, east.x, east.w], ['jjajang_run', 'from_west', 60 * 32 - 10, 10], '석상 앞 숲 오른쪽 끝 → 파란 토리이 길');
  assert.equal(map.bgm, 'my_castle_town'); assert.ok(JJAJANG_AFTER_JOIN_MAPS.includes('jjajang_run'));
  assert.equal(storyBgm('jjajang_run', { torii_janitor_joined: true }), 'my_castle_town');
  assert.equal(map.spawns.before_torii.facing, 'right'); assert.ok(map.spawns.before_torii.x < 30 * 32);
  for (const id of ['jjajang_run', 'jjajang_run_torii']) {
    const qa = QA_POINTS.find(p => p.id === id);
    assert.deepEqual(qa.party, ['janitor']); assert.ok(qa.flags.jjajang_statue_told && qa.flags.pines_ajimkiya_won, `${id}: 석상 이야기 뒤 상태`);
  }
  assert.equal(SCRIPTS.jjajang_run_start, jjajang_run_start);
  const calls = [];
  const fake = { runner: null, player: { facing: 'right' }, startRunner: () => calls.push('start') };
  jjajang_run_start[0].action(fake); assert.deepEqual(calls, ['start'], '오른쪽을 볼 때 시작');
  jjajang_run_start[0].action({ runner: null, player: { facing: 'left' }, startRunner: () => calls.push('bad') });
  jjajang_run_start[0].action({ runner: {}, player: { facing: 'right' }, startRunner: () => calls.push('bad') });
  assert.deepEqual(calls, ['start'], '왼쪽으로 되돌아 지날 때·이미 달리는 중엔 안 켠다');
  assert.ok(map.preload.every(p => existsSync(new URL('../../' + p, import.meta.url))), '러너 시트 4장 미리 읽기');
});

test('test_runner_sprites_are_right_facing_side_sheets_sized_to_the_walk_frame', () => {
  const m = CHARACTER_MOTIONS.hyungsub;
  for (const name of ['runner_prep', 'runner_run', 'runner_jump', 'runner_slash', 'runner_airslash']) {
    const d = m[name];
    assert.ok(d && d.faces === 'right' && d.frames.length === 4 && d.src === `assets/sprites/hyungsub-${name.replace('_', '-')}.png`, name);
    assert.ok(existsSync(new URL('../../' + d.src, import.meta.url)));
    for (const f of d.frames) { assert.ok(f.pivot[1] * d.scale > 30 && f.pivot[1] * d.scale < 72, `${name}: 발 pivot`); assert.ok(f.duration > 0); }
  }
  // 달리기 프레임 ≈ 46px(흩날리는 머리 끝까지) = 걷기 52px 보다 살짝 작게(사용자 “살짝 작아져야”) — 계약 파일의 실측 높이로
  const contract = JSON.parse(readFileSync(new URL('../../assets/source/runner-v1/runner-contract.json', import.meta.url), 'utf8'));
  const runH = contract.run.reduce((a, f) => a + f.height, 0) / contract.run.length;
  assert.equal(m.runner_run.scale, contract.scale);
  assert.ok(Math.abs(runH * m.runner_run.scale - 46) < 2, `달리기 키 ${(runH * m.runner_run.scale).toFixed(1)}px`);
  for (const sfx of ['swing', 'criticalswing', 'weaponpull', 'jump', 'wing']) assert.ok(existsSync(new URL(`../../assets/audio/sfx/${sfx}.mp3`, import.meta.url)), sfx);
});

test('test_run_intro_and_outro_scripts_follow_the_brief', () => {
  const texts = arr => arr.filter(n => n.text).map(n => n.text.replace(/^\* /, ''));
  assert.equal(SCRIPTS.jjajang_run_intro, jjajang_run_intro); assert.equal(SCRIPTS.jjajang_run_outro, jjajang_run_outro);
  assert.deepEqual(texts(jjajang_run_intro), ['파란 토리이', '토리이는 신과 인간의 세계를 나누는 경계, 뭐 대강 경계의 표시일새', '영적 결계의 의미를 담고있지만, 빠르게 달린다면', '그 결계의 효과를 뚫는다나 뭐라나',
    '사실 별볼일없는 전설일뿐이고 그냥 지나가면 되는거지만', '한번 아까 말했던 검을 너무 크게 경직되게 휘두른다를 생각해보세', '몸놀림을 더 가볍게, 검을 가볍게 움직여보는건 어떻겠는가',
    '그렇게되면, 도착지까지 더욱 빨리 가는 방법을 배울수있을지도 모르지', '기억하게, 호리이를 지나면, 결계를 뚫는다는 느낌으로 빠르게 달려보는거라네', '말이 너무 어렵다고? 껄껄 이런느낌일새.. 이따보게'], '기억하게 줄이 앞, 이거일세+이따보게가 마지막 줄(사용자 정정 2026-09-19 BUILD242)');
  assert.ok(jjajang_run_intro.filter(n => n.text).every(n => n.speaker === '청소부' && n.voice === 'janitor'));
  const li = jjajang_run_intro.map((n, i) => (n.motion === 'janitor' && n.name === 'laugh' ? i : -1)).filter(i => i >= 0);
  assert.equal(li.length, 0, '토리이 앞 연출엔 웃음 없음(사용자 정정 2026-09-19 “웃음 빼”)');
  const idx = (arr, pred) => arr.findIndex(pred);
  const lastLine = jjajang_run_intro.map((n, i) => (n.text ? i : -1)).filter(i => i >= 0).pop();
  const whoosh = idx(jjajang_run_intro, n => Array.isArray(n.parallel) && n.parallel.some(b => b.sfx === 'wing') && n.parallel.some(b => b.slide === 'janitor'));
  const hide = idx(jjajang_run_intro, n => n.hide === 'janitor'), done = idx(jjajang_run_intro, n => n.set?.run_intro_done);
  assert.ok(lastLine < whoosh && whoosh < hide && hide < done, '대사 뒤 휘리릭(휘융 + 확 밀림) → 사라짐 → 플래그');
  assert.equal(jjajang_run_intro[0].if({ run_intro_done: true, torii_janitor_joined: true }), true);
  // outro: 오른쪽 화면 밖에서 천천히 걸어와 마주 봄 → 대사 4줄(껄껄 두 곳 뒤 웃음) → 동료 정렬
  assert.deepEqual(texts(jjajang_run_outro), ['껄껄', '어떤가 무슨 느낌인지 알았나?', 'c로 검을 휘두르고 x로 점프를하면 된다네,', '껄껄 점프하면서 공격할수도 있겠지. 뭐 일단 이어서 가보새']);
  const lo = jjajang_run_outro.map((n, i) => (n.motion === 'janitor' && n.name === 'laugh' ? i : -1)).filter(i => i >= 0);
  assert.equal(lo.length, 2); assert.equal(jjajang_run_outro[lo[0] - 1].text, '* 껄껄'); assert.ok(jjajang_run_outro[lo[1] - 1].text.startsWith('* 껄껄 점프'));
  const moves = jjajang_run_outro.filter(n => n.move === 'janitor');
  assert.equal(moves.length, 2);
  assert.deepEqual(moves[0].px({ player: { x: 1000, y: 300 } }), [1000 + OUTRO_WALK_FROM, 300], '오른쪽 화면 밖으로');
  assert.deepEqual(moves[1].px({ player: { x: 1000, y: 300 } }), [1000 + OUTRO_STOP_GAP, 300], '요플래 오른쪽 앞까지');
  assert.ok(moves[1].speed <= 60 && moves[1].footsteps, '천천히, 발소리와 함께');
  const show = idx(jjajang_run_outro, n => n.show === 'janitor'), firstLine = idx(jjajang_run_outro, n => n.text), regroup = idx(jjajang_run_outro, n => n.regroup), setDone = idx(jjajang_run_outro, n => n.set?.run_outro_done);
  assert.ok(idx(jjajang_run_outro, n => n.hide === 'janitor') < jjajang_run_outro.indexOf(moves[0]) && jjajang_run_outro.indexOf(moves[0]) < show && show < jjajang_run_outro.indexOf(moves[1]) && jjajang_run_outro.indexOf(moves[1]) < firstLine && lo[1] < setDone && setDone < regroup, '순서: 숨김 → 오른쪽 밖 → 보임 → 걸어옴 → 대사 → 플래그 → 정렬');
});
