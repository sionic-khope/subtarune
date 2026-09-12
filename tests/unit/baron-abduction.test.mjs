import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWaiter } from '../../src/ui/cutscene.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { QA_POINTS, storyBgm } from '../../src/core/story.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { abductionBeats } from '../../src/data/cutscenes/obj4_abduction.js';

test('carried actor stays at the configured offset throughout a move', () => {
  const carrier = { id: 'carrier', x: 0, y: 0, w: 24, h: 16 };
  const passenger = { id: 'passenger', x: 99, y: 99, w: 24, h: 16 };
  const game = { entities: [carrier, passenger] };
  const move = makeWaiter(game, { move: 'carrier', by: [0, 120], speed: 90, carry: { id: 'passenger', offset: [35, 150] } });
  for (let frame = 0; frame < 90; frame++) {
    move.update(1 / 60);
    assert.equal(passenger.x - carrier.x, 35);
    assert.equal(passenger.y - carrier.y, 150);
    assert.equal(passenger.moving, false);
  }
});

test('turning right carries the passenger at the head without a walking animation', () => {
  const carrier = { id: 'carrier', x: 100, y: 200, w: 24, h: 16 };
  const passenger = { id: 'passenger', x: 135, y: 350, w: 24, h: 16 };
  const game = { entities: [carrier, passenger] };
  const move = makeWaiter(game, { move: 'carrier', by: [150, 0], speed: 120, carry: { id: 'passenger', offset: [165, 28], facing: 'down' } });
  move.update(0.25);
  assert.deepEqual([carrier.x, carrier.y], [160, 200]);
  assert.deepEqual([passenger.x, passenger.y, passenger.facing, passenger.frame], [325, 228, 'down', 0]);
});

test('prone directions follow the source row order and carry close to each head', () => {
  assert.deepEqual(CHARACTERS.baron_chase.rowOrder, ['down', 'left', 'right', 'up']);
  const scale = 1.43 * 1.05 / 2;
  const headOffset = (440 - 256) * scale;
  const carriers = abductionBeats.filter((n) => n.carry).map((n) => n.carry);
  const down = carriers.find((n) => n.offset[0] === 35);
  const right = carriers.find((n) => n.offset[0] === 165);
  assert.ok(Math.hypot(down.offset[0], down.offset[1] - headOffset) < 45);
  assert.ok(Math.hypot(right.offset[0] - headOffset, right.offset[1]) < 45);
});

test('the plaza corner preserves the captive world position as Baron turns', () => {
  const carrier = { id: 'baron_chase', x: 1100, y: 306, w: 24, h: 16, facing: 'down' };
  const passenger = { id: 'yongjun_captive', x: 1135, y: 456, w: 24, h: 16 };
  const statue = { id: 'statue2', x: 1600, y: 448, w: 32, h: 32 };
  const game = { entities: [carrier, passenger, statue] };
  const corner = abductionBeats.findIndex((n) => n.rel === 'recall');
  abductionBeats[corner + 1].action(game);
  makeWaiter(game, abductionBeats[corner + 2]);
  assert.deepEqual([passenger.x, passenger.y], [1135, 456]);
  assert.deepEqual([carrier.x, carrier.y, carrier.facing], [970, 428, 'right']);
});

test('post-win QA recovers the abduction while completed QA skips it', () => {
  const pending = QA_POINTS.find((p) => p.id === 'obj4_abduction');
  assert.ok(pending?.flags.obj4_baron_won);
  assert.equal(!!pending.flags.obj4_abduction_done, false);
  assert.ok(QA_POINTS.find((p) => p.id === 'obj4_after').flags.obj4_abduction_done);
  assert.ok(SCRIPTS.obj4_baron_abduction);
});

test('test_abduction_chase_music_survives_route_maps_only_after_abduction', () => {
  for (const map of ['obj1', 'obj2', 'obj3', 'obj4']) {
    assert.equal(storyBgm(map, { obj4_abduction_done: true }), 'baron_intro');
    assert.equal(storyBgm(map, { obj4_baron_won: true }), undefined);
  }
  assert.equal(storyBgm('teal9', { obj4_abduction_done: true }), undefined);
});

test('test_abduction_capture_has_boss_impact_sound_at_contact', () => {
  const contact = abductionBeats.findIndex(n => n.move === 'baron_chase' && n.rel === 'yongjun_captive');
  assert.equal(abductionBeats[contact + 1].sfx, 'baron_slam');
});
