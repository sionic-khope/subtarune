import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { ship_castle } from '../../src/data/cutscenes/ship_castle.js';
import { SHIP_CASTLE, SHIP_CASTLE_BEATS } from '../../src/data/ship-castle.js';
import { QA_POINTS, partyFromFlags, stateFromFlags } from '../../src/core/story.js';

const texts = ship_castle.filter(node => node.text).map(node => node.text.replace(/^\* /, ''));
const beatNames = ship_castle.map(node => node.shipCastleBeat).filter(Boolean);

test('test_ship_castle_requested_dialogue_preserves_ordered_presentation_beats', () => {
  assert.deepEqual(texts, [
    '여기임', '생각보다 ㅈㄴ 크네', 'ㅇㅇ', '그럼 여기에 그 코드를 꼽으면 될까요?', 'ㅇㅇ', '그럼 부탁드립니다.',
    '긴 여정의 끝을 얘기하는 문이다.', '나는 {c=yellow}보라색 코드{/c}를 꺼내 문에 갖다대기 시작했다.',
    '오 이게 뭐노', '요플래!!!',
    '후후후 마음데로 될줄알았나.', 'ㅋㅋ이제 제대로 하는건가.', '저 저게뭐노', '씨발 저게 뭐야!!!', '요 요플래!!!!',
    '일 일단 후퇴다 다시 돌아오자.\n저건 이길수없음', '큭 꼭 살아만 있어라 요플래',
  ]);
  assert.deepEqual(beatNames, SHIP_CASTLE_BEATS);
  assert.equal(SHIP_CASTLE.timing.floatHold, 2);
  assert.equal(SHIP_CASTLE.timing.doorHold, 2);
  const ocean = ship_castle.findIndex(node => node.shipCastleBeat === 'ocean_rise');
  const sky = ship_castle.findIndex(node => node.shipCastleBeat === 'sky_tug');
  const firstSkyLine = ship_castle.findIndex(node => node.text?.includes('마음데로'));
  assert.ok(ocean < sky && sky < firstSkyLine);
  const youngcleSees = ship_castle.findIndex(node => node.text?.includes('오 이게 뭐노'));
  const junheeCalls = ship_castle.findIndex(node => node.text?.includes('요플래!!!'));
  const pushStart = ship_castle.findIndex(node => String(node.action).includes('beginAscent'));
  assert.ok(ocean < youngcleSees && youngcleSees < junheeCalls && junheeCalls < pushStart && pushStart < sky);
  assert.equal(ship_castle[youngcleSees].speaker, '영클');
  assert.equal(ship_castle[junheeCalls].speaker, '쥰희');
  const gajaeman = ship_castle.find(node => node.spawn?.id === 'ship_castle_gajaeman').spawn;
  const carriedMoves = ship_castle.filter(node => node.carry?.id === 'player');
  assert.equal(gajaeman.visualScale, 1.89);
  assert.deepEqual(carriedMoves.map(node => node.px), [[622, 150], [900, 150]]);
});

test('test_ship_castle_lounge_map_owns_real_proximity_trigger_and_right_window', () => {
  const map = JSON.parse(readFileSync(new URL('../../assets/maps/ship_lounge.json', import.meta.url), 'utf8'));
  const trigger = map.entities.find(entity => entity.id === 'ship_castle_trigger');
  assert.deepEqual({ type: trigger.type, once: trigger.once, flag: trigger.flag, script: trigger.script },
    { type: 'trigger', once: true, flag: 'ship_castle_started', script: 'ship_castle' });
  const windows = map.entities.filter(entity => (entity.id || '').includes('window'));
  assert.ok(windows.length >= 1);
  assert.ok(windows.every(entity => entity.image === 'assets/props/ship_lounge_window.png'));
  assert.equal(map.spawns.castle_approach.facing, 'up');
});

test('test_ship_castle_stolen_cord_does_not_return_in_flag_derived_state', () => {
  assert.ok(stateFromFlags({ cord_found: true }).inventory.includes('보라색 코드 ?'));
  assert.ok(!stateFromFlags({ cord_found: true, ship_castle_cord_stolen: true }).inventory.includes('보라색 코드 ?'));
  const point = QA_POINTS.find(entry => entry.id === 'ship_castle');
  assert.equal(point.script, undefined);
  assert.equal(point.flags.ship_castle_started, undefined);
  assert.deepEqual(partyFromFlags({ ppaman_joined: true, void11_done: true, ship_sinking_done: true }), []);
});
