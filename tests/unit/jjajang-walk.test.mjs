// 짜장 곧은 길(BUILD227): 오른쪽으로 쭉, 중간 트리거 → 청소부 “천천히 걷기” 연출(대사 원문·한 발짝 앞·뒤돌아봄·껄껄 웃음), 문·브금·QA
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jjajang_walk_pause } from '../../src/data/cutscenes/jjajang_walk.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { QA_POINTS, storyBgm } from '../../src/core/story.js';

const map = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_walk.json', import.meta.url), 'utf8'));
const bend = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_bend.json', import.meta.url), 'utf8'));
const rows = map.rows;

test('test_walk_map_is_one_straight_road_to_the_right', () => {
  for (const r of [5, 6]) assert.ok([...rows[r]].every(ch => ch === '$' || ch === '&'), `row ${r} 전부 길`);
  assert.equal(rows[5][0], '&'); assert.equal(rows[5][51], '&');
  assert.ok(rows.every((row, r) => r === 5 || r === 6 || ![...row].some(ch => ch === '$')), '길은 5~6행뿐');
  const trigger = map.entities.find(e => e.type === 'trigger');
  assert.deepEqual({ script: trigger.script, once: trigger.once, flag: trigger.flag, unless: trigger.unless }, { script: 'jjajang_walk_pause', once: true, flag: 'jjajang_walk_started', unless: 'jjajang_walk_done' });
  assert.ok(Math.abs(trigger.x + trigger.w / 2 - map.rows[0].length * 32 / 2) <= 32, '중간쯤');
  const west = map.entities.find(e => e.id === 'walk_bend_door'), east = map.entities.find(e => e.id === 'walk_pines_door');
  assert.deepEqual([west.to, west.spawn], ['jjajang_bend', 'from_north']); assert.deepEqual([east.to, east.spawn], ['jjajang_pines', 'from_west']);
  const bendNorth = bend.entities.find(e => e.id === 'bend_pines_door');
  assert.deepEqual([bendNorth.to, bendNorth.spawn], ['jjajang_walk', 'from_west']);
  assert.ok(map.spawns.before_pause.x < trigger.x);
});

test('test_walk_pause_script_lines_and_beats', () => {
  const texts = jjajang_walk_pause.filter(n => n.text).map(n => n.text.replace(/^\* /, ''));
  assert.deepEqual(texts, ['어이 잠깐', '너무 빠르네 조금 천천히 걸어보는건 어떤가?', '시프트를 누르면 천천히 걸을 수 있네', '싫다고 ? 껄껄 알겠네', '때로는 천천히 가는것도 좋을 수 있다네.']);
  assert.ok(jjajang_walk_pause.filter(n => n.text).every(n => n.speaker === '청소부' && n.voice === 'janitor'));
  const idx = pred => jjajang_walk_pause.findIndex(pred);
  const first = idx(n => n.text?.includes('어이 잠깐')), step = idx(n => n.move === 'player'), turn = idx(n => n.face === 'player' && n.dir === 'left');
  const second = idx(n => n.text?.includes('너무 빠르네')), laugh = idx(n => n.motion === 'janitor' && n.name === 'laugh'), last = idx(n => n.text?.includes('때로는'));
  const flag = idx(n => n.set?.jjajang_walk_done), regroup = idx(n => n.regroup);
  assert.ok(first < step && step < turn && turn < second, '어이 잠깐 → 요플래 한 발짝 앞 → 뒤돌아봄 → 다음 대사');
  assert.deepEqual(jjajang_walk_pause[step].by, [16, 0], '한 발짝 = 한 칸(by 16 = 32px)');
  assert.ok(jjajang_walk_pause[laugh - 1].text?.includes('껄껄') && laugh < last, '껄껄 뒤에만 웃음');
  assert.ok(last < flag && flag < regroup, '끝나면 플래그·동료 재정렬');
  assert.equal(SCRIPTS.jjajang_walk_pause, jjajang_walk_pause);
  assert.equal(jjajang_walk_pause[0].if({ jjajang_walk_done: true, torii_janitor_joined: true }), true);
});

test('test_walk_bgm_and_qa', () => {
  assert.equal(map.bgm, 'my_castle_town');
  assert.equal(storyBgm('jjajang_walk', { torii_janitor_joined: true }), 'my_castle_town');
  const qa = QA_POINTS.find(p => p.id === 'jjajang_walk');
  assert.deepEqual(qa.party, ['janitor']); assert.equal(qa.spawn, 'before_pause');
});
