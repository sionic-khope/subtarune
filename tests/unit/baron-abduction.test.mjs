import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWaiter } from '../../src/ui/cutscene.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { QA_POINTS, storyBgm } from '../../src/core/story.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { abductionBeats } from '../../src/data/cutscenes/obj4_abduction.js';

test('test_abduction_moving_baron_keeps_boss_scale_after_victory_and_map_cuts', () => {
  const opening = abductionBeats.find(n => n.spawn?.sprite === 'baron_intro').spawn;
  assert.equal(opening.visualScale, 1.4);
  const baron = { ...opening, def: { ...opening }, setSprite(sprite) { this.def.sprite = sprite; } };
  const charge = abductionBeats.findIndex(n => n.bgm === 'baron_intro');
  abductionBeats[charge + 1].action({ entities: [baron] });
  const scales = [baron.def.visualScale, ...abductionBeats.filter(n => n.spawn?.sprite === 'baron_chase').map(n => n.spawn.visualScale)];
  assert.equal(scales.length, 3);
  for (const scale of scales) {
    const bodyLength = 438 * 1.43 * scale / 2;
    assert.ok(bodyLength >= 500 && bodyLength <= 565, `moving Baron body length ${bodyLength}px must retain boss scale`);
    assert.equal(scale, scales[0], 'map cuts must preserve the moving Baron scale');
  }
});

test('test_abduction_yongjun_faces_up_before_capture_and_throughout_carry', () => {
  const spawns = abductionBeats.filter(n => n.spawn?.id === 'yongjun_captive');
  assert.equal(spawns.length, 3);
  for (const node of spawns) assert.equal(node.spawn.facing, 'up');
  const carries = abductionBeats.filter(n => n.carry);
  assert.ok(carries.length >= 5);
  for (const node of carries) assert.equal(node.carry.facing, 'up');
});

test('carried actor stays at the configured offset throughout a move', () => {
  const carrier = { id: 'carrier', x: 0, y: 0, w: 24, h: 16 };
  const passenger = { id: 'passenger', x: 99, y: 99, w: 24, h: 16 };
  const game = { entities: [carrier, passenger] };
  const move = makeWaiter(game, { move: 'carrier', by: [0, 120], speed: 90, carry: { id: 'passenger', offset: [57, 243], facing: 'up' } });
  for (let frame = 0; frame < 90; frame++) {
    move.update(1 / 60);
    assert.equal(passenger.x - carrier.x, 57);
    assert.equal(passenger.y - carrier.y, 243);
    assert.equal(passenger.moving, false);
    assert.equal(passenger.facing, 'up');
  }
});

test('turning right carries the passenger at the head without a walking animation', () => {
  const carrier = { id: 'carrier', x: 100, y: 200, w: 24, h: 16 };
  const passenger = { id: 'passenger', x: 157, y: 443, w: 24, h: 16 };
  const game = { entities: [carrier, passenger] };
  const move = makeWaiter(game, { move: 'carrier', by: [150, 0], speed: 120, carry: { id: 'passenger', offset: [267, 45], facing: 'up' } });
  move.update(0.25);
  assert.deepEqual([carrier.x, carrier.y], [160, 200]);
  assert.deepEqual([passenger.x, passenger.y, passenger.facing, passenger.frame], [427, 245, 'up', 0]);
});

test('prone directions follow the source row order and carry close to each head', () => {
  assert.deepEqual(CHARACTERS.baron_chase.rowOrder, ['down', 'left', 'right', 'up']);
  const scale = 1.43 * abductionBeats.find(n => n.spawn?.sprite === 'baron_chase').spawn.visualScale / 2;
  const headOffset = (440 - 256) * scale;
  const carriers = abductionBeats.filter((n) => n.carry).map((n) => n.carry);
  const down = carriers[0];
  const right = carriers.at(-1);
  assert.deepEqual(down.offset, [57, 243]);
  assert.deepEqual(right.offset, [267, 45]);
  assert.ok(Math.hypot(down.offset[0], down.offset[1] - headOffset) / scale < 60);
  assert.ok(Math.hypot(right.offset[0] - headOffset, right.offset[1]) / scale < 60);
});

test('the plaza corner preserves the captive world position as Baron turns', () => {
  const carrier = { id: 'baron_chase', x: 1078, y: 213, w: 24, h: 16, facing: 'down' };
  const passenger = { id: 'yongjun_captive', x: 1135, y: 456, w: 24, h: 16 };
  const statue = { id: 'statue2', x: 1600, y: 448, w: 32, h: 32 };
  const game = { entities: [carrier, passenger, statue] };
  const corner = abductionBeats.findIndex((n) => n.rel === 'recall');
  abductionBeats[corner + 1].action(game);
  makeWaiter(game, abductionBeats[corner + 2]);
  assert.deepEqual([passenger.x, passenger.y], [1135, 456]);
  assert.deepEqual([carrier.x, carrier.y, carrier.facing], [868, 411, 'right']);
  assert.equal(passenger.facing, 'up');
});

test('test_abduction_pickup_and_map_respawns_preserve_head_attachment', () => {
  const carrier = { id: 'baron_chase', x: 756, y: 400, w: 24, h: 16 };
  const passenger = { id: 'yongjun_captive', x: 756, y: 985, w: 24, h: 16 };
  const game = { entities: [carrier, passenger] };
  const contact = abductionBeats.find(n => n.move === 'baron_chase' && n.rel === passenger.id);
  const move = makeWaiter(game, contact);
  let complete = false;
  for (let frame = 0; frame < 120 && !complete; frame++) complete = move.update(1 / 60);
  assert.ok(complete, 'Baron must reach Yongjun before capture');
  const firstCarry = abductionBeats.find(n => n.carry);
  makeWaiter(game, firstCarry);
  assert.deepEqual([passenger.x, passenger.y], [756, 985]);
  for (const [index, node] of abductionBeats.entries()) {
    if (node.spawn?.sprite !== 'baron_chase') continue;
    const captive = abductionBeats[index + 1].spawn;
    assert.deepEqual([captive.x - node.spawn.x, captive.y - node.spawn.y], firstCarry.carry.offset);
  }
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
