import test from 'node:test';
import assert from 'node:assert/strict';
import { obj4_baron_intro } from '../../src/data/cutscenes/obj4_baron.js';
import { makeWaiter } from '../../src/ui/cutscene.js';
import { QA_POINTS } from '../../src/core/story.js';
import { CHARACTER_MOTIONS } from '../../src/data/character-motions.js';
import { CHARACTERS } from '../../src/data/characters.js';

const flatten = (nodes) => nodes.flatMap((node) => [node, ...flatten(node.parallel || []), ...flatten(Array.isArray(node.async) ? node.async : [])]);

test('test_baron_intro_stops_after_challenge_without_starting_battle', () => {
  const nodes = flatten(obj4_baron_intro);
  assert.equal(nodes.some((node) => node.battle || node.map), false);
  assert.equal(nodes.filter((node) => node.motion === 'baron' && node.sfx === 'baron_roar').length, 3);
  assert.equal(nodes.filter((node) => node.puff).length, 1);
  assert.ok(nodes.some((node) => node.hop === 'voidgrub' && node.sfx === false));
  assert.equal(nodes.filter((node) => node.text).at(-1).text, '* 바론 버스트다 씨발새끼 들어와');
  assert.ok(nodes.find((node) => node.set?.obj4_baron_done));
  assert.deepEqual(QA_POINTS.find((point) => point.id === 'obj4').party, ['gyeongsub', 'ppaman']);
  assert.ok(QA_POINTS.find((point) => point.id === 'obj4_after').flags.obj4_baron_done);
});

test('test_baron_transparent_motion_has_explicit_nonmatching_chroma_contract', () => {
  const motion = CHARACTER_MOTIONS.baron_intro.roar;
  assert.ok(motion.colorKey);
  assert.equal(motion.colorKey.rMin, 256);
  assert.equal(motion.frames.length, 4);
  assert.ok(motion.frames.every((frame) => frame.rect[2] === 256 && frame.rect[3] === 256));
  assert.deepEqual(CHARACTERS.baron_intro.stillPivot, [128, 240]);
  assert.ok(motion.frames.every((frame) => frame.pivot.join() === CHARACTERS.baron_intro.stillPivot.join()));
});

test('test_baron_emerge_reveals_from_floor_and_cleans_temporary_state', () => {
  const entity = { id: 'baron', visible: false };
  const waiter = makeWaiter({ entities: [entity] }, { emerge: 'baron', depth: 370, duration: 2 });
  assert.equal(entity.visible, true);
  assert.deepEqual(entity.emerge, { depth: 370, progress: 0 });
  assert.equal(waiter.update(1), false);
  assert.equal(entity.emerge.progress, 0.5);
  assert.equal(waiter.update(1), true);
  assert.equal(entity.emerge, null);
});

test('test_baron_burst_emergence_is_mostly_exposed_by_half_of_a_short_pop', () => {
  const entity = { id: 'baron', visible: false };
  const waiter = makeWaiter({ entities: [entity] }, { emerge: 'baron', depth: 430, duration: 0.28, ease: 'out' });
  assert.equal(waiter.update(0.14), false);
  assert.equal(entity.emerge.progress, 0.875);
  assert.equal(waiter.update(0.14), true);
  assert.equal(entity.emerge, null);
});

test('test_cannon_puff_is_one_small_short_cloud_and_cleans_up', () => {
  const entity = { id: 'cannon', x: 100, y: 200, w: 80, h: 100 };
  const game = { entities: [entity] };
  const waiter = makeWaiter(game, { puff: 'cannon', duration: 0.7 });
  assert.equal(game.sparks.length, 3);
  const before = game.sparks.map((p) => p.y);
  assert.equal(waiter.update(0.35), false);
  assert.ok(game.sparks.every((p, i) => p.y < before[i] && p.a === 0.5));
  assert.equal(waiter.update(0.35), true);
  assert.equal(game.sparks, null);
});
