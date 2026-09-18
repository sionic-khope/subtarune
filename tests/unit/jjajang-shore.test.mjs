import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { jjajang_shore_arrival } from '../../src/data/cutscenes/jjajang_shore.js';
import { ship_sinking } from '../../src/data/cutscenes/ship_sinking.js';
import {
  SHIP_MEMORY,
  SHIP_MEMORY_BEATS,
  SHIP_MEMORY_PANEL_BEAT_DURATION,
} from '../../src/data/ship-memory.js';

const map = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_shore.json', import.meta.url), 'utf8'));
const textOf = script => script.filter(node => node.text).map(node => node.text.replace(/^\* /, ''));

test('test_ship_sinking_preserves_exact_narration_and_slow_five_panel_contract', () => {
  assert.deepEqual(textOf(ship_sinking), [
    '...',
    '... ... ... 가재맨',
    '어쩌다가 우린',
    '이렇게 된걸까',
    '분명 행복한 삶이지 않았는가.',
    '... 그럼에도',
    '난 ... 포기할수...',
  ]);
  assert.deepEqual(ship_sinking.map(node => node.shipMemoryBeat).filter(Boolean), SHIP_MEMORY_BEATS.slice(1));
  assert.ok(ship_sinking.some(node => node.wait === SHIP_MEMORY.timing.preTextDelay));
  assert.equal(ship_sinking.filter(node => node.wait === SHIP_MEMORY_PANEL_BEAT_DURATION).length, 5);
  assert.ok(ship_sinking.some(node => node.wait === SHIP_MEMORY.timing.returnTransition));
  assert.ok(ship_sinking.some(node => node.wait === SHIP_MEMORY.timing.shoreTransition));
});

test('test_shore_arrival_keeps_yoplait_lying_for_two_exact_lines_then_returns_control_solo', () => {
  assert.deepEqual(textOf(jjajang_shore_arrival), ['... ...', '여긴 어디지.']);
  const lying = jjajang_shore_arrival.findIndex(node => node.pose === 'player' && node.to === 'lying');
  const standing = jjajang_shore_arrival.findIndex(node => node.pose === 'player' && node.to === 'stand');
  const firstText = jjajang_shore_arrival.findIndex(node => node.text);
  const lastText = jjajang_shore_arrival.findLastIndex(node => node.text);
  assert.ok(lying >= 0 && lying < firstText);
  assert.ok(standing > lastText);
  assert.ok(jjajang_shore_arrival.some(node => node.stage === 'ship_sinking_done'));

  const solo = jjajang_shore_arrival.find(node => node.action);
  const game = {
    party: ['gyeongsub', 'ppaman'],
    partyHp: { hyungsub: 73, gyeongsub: 91, ppaman: 66 },
    inventory: ['바나나'],
    spawnPartyCalls: 0,
    spawnParty() { this.spawnPartyCalls += 1; },
  };
  solo.action(game);
  assert.deepEqual(game.party, []);
  assert.deepEqual(game.partyHp, { hyungsub: 73, gyeongsub: 91, ppaman: 66 });
  assert.deepEqual(game.inventory, ['바나나']);
  assert.equal(game.spawnPartyCalls, 1);
});

test('test_jjajang_shore_is_south_sea_wide_beach_and_one_blocked_forest_path', () => {
  assert.deepEqual([map.rows[0].length, map.rows.length], [20, 35]);
  assert.ok(new Set(map.meta.coastlineRows).size >= 3);
  map.meta.coastlineRows.forEach((edge, col) => {
    assert.ok(map.rows.slice(edge).every(row => ['o', 'O'].includes(row[col])));
    if (col > 0 && col < map.rows[0].length - 1) assert.equal(map.rows[edge - 1][col], '?');
  });
  assert.ok(map.rows.slice(25, 29).every(row => row.slice(1, 9).includes('?') && row.slice(11, 19).includes('?')));
  assert.ok(map.rows.slice(7, 25).every(row => row.slice(9, 11) === '%%'));
  assert.equal(map.rows.slice(25, 30).some(row => row.includes('%')), false);
  assert.ok([...map.rows[6]].every(tile => tile === '@'));
  assert.equal(map.entities.some(entity => entity.type === 'door'), false);
  assert.equal(map.entities.some(entity => entity.type === 'npc' || entity.type === 'follower'), false);
  assert.ok(map.entities.filter(entity => entity.id.startsWith('jjajang_tree_')).every(entity => entity.scale === 2));
  const trees = map.entities.filter(entity => entity.id.startsWith('jjajang_tree_'));
  const waves = map.entities.filter(entity => entity.id.startsWith('shore_foam_'));
  assert.ok(trees.filter(entity => entity.iy <= 5 * 32).length >= 20);
  assert.equal(waves.length, 8);
  assert.ok(waves.length < map.rows[0].length);
  assert.ok(waves.every(entity => entity.oscillate?.dx && entity.oscillate?.dy));
  assert.deepEqual(map.spawns.washed_up, { x: 312, y: 908, facing: 'up' });
  assert.deepEqual(map.enter, { script: 'jjajang_shore_arrival', early: true });
  const pathSeconds = (map.meta.route[0][1] - map.meta.route[1][1]) * 32 / 218.4;
  assert.ok(pathSeconds >= 3 && pathSeconds <= 4, String(pathSeconds));
});

test('test_sinking_transition_finishes_helper_before_map_and_removes_only_active_followers', () => {
  const mapIndex = ship_sinking.findIndex(node => node.map === 'jjajang_shore');
  assert.equal(ship_sinking[mapIndex].spawn, 'washed_up');
  const calls = [];
  const game = {
    party: ['gyeongsub', 'ppaman'],
    partyHp: { gyeongsub: 120, ppaman: 90 },
    finishShipMemory(abort) { calls.push(['finish', abort]); },
    spawnParty() { calls.push(['spawnParty', [...this.party]]); },
  };
  ship_sinking[mapIndex - 2].action(game);
  ship_sinking[mapIndex - 1].action(game);
  assert.deepEqual(calls, [['finish', false], ['spawnParty', []]]);
  assert.deepEqual(game.partyHp, { gyeongsub: 120, ppaman: 90 });
});

test('test_jjajang_runtime_assets_are_exact_pixel_dimensions', () => {
  for (const name of ['jjajang_forest_black', 'jjajang_path_black', 'jjajang_sand']) {
    const png = readFileSync(new URL(`../../assets/tiles/${name}.png`, import.meta.url));
    assert.equal(png.readUInt32BE(16), 32);
    assert.equal(png.readUInt32BE(20), 32);
  }
  for (const number of [1, 2, 3]) {
    const png = readFileSync(new URL(`../../assets/props/jjajang_tree_${number}.png`, import.meta.url));
    assert.equal(png.readUInt32BE(16), 32);
    assert.equal(png.readUInt32BE(20), 64);
  }
});
