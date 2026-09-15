import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Player, TileMap } from '../../src/world/world.js';
import { allTiles, getTile } from '../../src/world/tiles.js';
import { WATER_WALK } from '../../src/data/footsteps.js';

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
before(() => {
  globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() {} }) }) };
});
after(() => {
  if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
  else delete globalThis.document;
});

function fixture(row = 'I'.repeat(40), x = 32) {
  const sounds = [], walks = [], ripples = [];
  const game = { entities: [], dialogue: { running: false },
    spriteOverrides: { iron_step_test: { width: 64, height: 64 } },
    map: new TileMap({ rows: [row, row, row] }),
    sound: { sfx: (id, options) => sounds.push({ id, ...options }), walk: value => walks.push(value) },
    emitRipple: (...position) => ripples.push(position) };
  const player = new Player({ x, y: 32, w: 24, h: 16, sprite: 'iron_step_test' }, game);
  game.entities.push(player);
  return { player, sounds, walks, ripples };
}
function walk(player, { seconds = 2, direction = 1, slow = false } = {}) {
  const input = { axis: () => ({ x: direction, y: 0 }), down: key => key === 'cancel' && slow };
  for (let tick = 0; tick < seconds * 60; tick++) player.update(1 / 60, input);
}

test('test_iron_step_metadata_is_exclusive_to_iron_and_separate_from_water', () => {
  assert.deepEqual(allTiles().filter(tile => tile.stepSfx).map(tile => tile.char), ['I', 'J', 'F', 'G']);
  for (const char of ['I', 'J']) assert.equal(getTile(char).step, undefined);
  assert.equal(getTile('a').step, WATER_WALK);
});

for (const slow of [false, true]) test(`test_iron_${slow ? 'walking' : 'running'}_alternates_contact_sounds_without_ripples`, () => {
  const { player, sounds, walks, ripples } = fixture();
  walk(player, { slow });
  assert.ok(player.x > 200);
  assert.ok(sounds.length >= 6 && sounds.length <= 12);
  for (const [index, sound] of sounds.entries()) {
    assert.equal(sound.id, index % 2 ? 'iron_step_2' : 'iron_step_1');
    assert.equal(sound.volume, 0.35);
  }
  assert.deepEqual(ripples, []);
  assert.ok(walks.every(value => value === null));
});

test('test_iron_steps_stop_when_standing_or_pushing_a_wall', () => {
  const { player, sounds } = fixture('IIIIJ', 104);
  walk(player);
  walk(player, { direction: 0 });
  assert.equal(player.x, 104);
  assert.equal(player.moving, false);
  assert.deepEqual(sounds, []);
});

test('test_moving_from_iron_to_wood_stops_metal_sounds', () => {
  const { player, sounds } = fixture('IIII' + 'M'.repeat(36));
  walk(player, { seconds: 1 });
  assert.ok(player.x > 128);
  assert.ok(sounds.length > 0);
  const count = sounds.length;
  walk(player);
  assert.equal(sounds.length, count);
});

test('test_wood_walk_is_silent_and_water_keeps_its_loop_and_ripples', () => {
  const wood = fixture('M'.repeat(40));
  walk(wood.player);
  assert.deepEqual(wood.sounds, []);
  const water = fixture('a'.repeat(40));
  walk(water.player);
  assert.deepEqual(water.sounds, []);
  assert.ok(water.walks.every(value => value === WATER_WALK));
  assert.ok(water.ripples.length > 0);
});
