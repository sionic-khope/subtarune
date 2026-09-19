// 파란 토리이 길(BUILD230): 곧은 검은 물길('*' 물걸음·물결), 파란 토리이 두 조각(길 위·아래 칸), 기둥 사이 트리거(매번, once 없음), 석상 앞 숲 오른쪽 문 ↔ 왼쪽 문, 달리기 구간 길이, 러너 스프라이트·소리 등록, QA
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { jjajang_run_start } from '../../src/data/cutscenes/jjajang_run.js';
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
  assert.equal(rows[0].length, 200); assert.equal(rows.length, 14);
  for (let c = 1; c < 199; c++) { assert.equal(rows[r0][c], '*'); assert.equal(rows[r1][c], '*'); }
  assert.equal(rows[r0][0], '+'); assert.equal(rows[r0][199], '+');
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
  const trig = map.entities.find(e => e.type === 'trigger');
  assert.deepEqual({ script: trig.script, once: trig.once, flag: trig.flag, y: trig.y, h: trig.h }, { script: 'jjajang_run_start', once: undefined, flag: undefined, y: r0 * 32, h: 64 }, '지날 때마다(once 없음)');
  assert.ok(trig.x > front.x && trig.x >= 32 * 32 && trig.x + trig.w <= 34 * 32, '기둥 사이를 지나는 자리');
  assert.ok(map.meta.run.startX >= trig.x + trig.w && map.meta.run.endX === 200 * 32 - 96 && map.meta.run.speed === RUNNER.speed);
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
  for (const name of ['runner_prep', 'runner_run', 'runner_jump', 'runner_slash']) {
    const d = m[name];
    assert.ok(d && d.faces === 'right' && d.frames.length === 4 && d.src === `assets/sprites/hyungsub-${name.replace('_', '-')}.png`, name);
    assert.ok(existsSync(new URL('../../' + d.src, import.meta.url)));
    for (const f of d.frames) { assert.ok(f.pivot[1] * d.scale > 35 && f.pivot[1] * d.scale < 60, `${name}: 발 pivot`); assert.ok(f.duration > 0); }
  }
  // 달리기 프레임 ≈ 46px(흩날리는 머리 끝까지) = 걷기 52px 보다 살짝 작게(사용자 “살짝 작아져야”) — 계약 파일의 실측 높이로
  const contract = JSON.parse(readFileSync(new URL('../../assets/source/runner-v1/runner-contract.json', import.meta.url), 'utf8'));
  const runH = contract.run.reduce((a, f) => a + f.height, 0) / contract.run.length;
  assert.equal(m.runner_run.scale, contract.scale);
  assert.ok(Math.abs(runH * m.runner_run.scale - 46) < 2, `달리기 키 ${(runH * m.runner_run.scale).toFixed(1)}px`);
  for (const sfx of ['swing', 'criticalswing', 'weaponpull', 'jump', 'wing']) assert.ok(existsSync(new URL(`../../assets/audio/sfx/${sfx}.mp3`, import.meta.url)), sfx);
});
