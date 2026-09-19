import test from 'node:test';
import assert from 'node:assert/strict';
import { characterMotionWaiter, loadCharacterMotions } from '../../src/world/character-motion.js';
import { makeWaiter } from '../../src/ui/cutscene.js';
import { CHARACTER_MOTIONS } from '../../src/data/character-motions.js';
import { SCRIPTS } from '../../src/data/scripts.js';

const definition = CHARACTER_MOTIONS.junhee.laugh;
const makeEntity = () => ({ id: 'junhee', def: { sprite: 'junhee' }, x: 42, y: 64, facing: 'left', frame: 2, animPhase: 2.5, moving: true });

test('test_character_motion_four_frames_restore_standing_without_drift', () => {
  const entity = makeEntity();
  const waiter = characterMotionWaiter(entity, definition);
  assert.equal(entity.motion.index, 0);
  assert.equal(entity.moving, false);
  for (let i = 0; i < 3; i++) {
    assert.equal(waiter.update(definition.frames[i].duration), false);
    assert.equal(entity.motion.index, i + 1);
  }
  assert.equal(waiter.update(definition.frames[3].duration), true);
  assert.equal(entity.motion, null);
  assert.deepEqual([entity.x, entity.y, entity.facing, entity.frame, entity.animPhase], [42, 64, 'left', 0, 0]);
  assert.equal(characterMotionWaiter(entity, definition).update(0), false);
  assert.equal(entity.motion.index, 0);
});

test('test_character_motion_node_starts_laugh_sound_and_registered_frames_together', () => {
  const entity = makeEntity();
  const sounds = [];
  const game = { entities: [entity], characterMotions: { junhee: { laugh: definition } }, sound: { sfx: (id) => sounds.push(id) } };
  const node = SCRIPTS.test_junhee.find((node) => node.motion);
  const waiter = makeWaiter(game, node);
  assert.deepEqual(sounds, ['laugh_junhee']);
  assert.equal(entity.motion.index, 0);
  assert.equal(waiter.update(10), true);
  assert.equal(entity.motion, null);
});

test('test_character_motion_missing_optional_atlas_allows_dialogue_completion', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const motions = await loadCharacterMotions(async () => null);
  const entity = makeEntity();
  const game = { entities: [entity], characterMotions: motions, sound: { sfx() {} } };
  assert.equal(makeWaiter(game, { motion: 'junhee', name: 'laugh' }).update(0), true);
  assert.equal(entity.motion, undefined);
});

test('test_character_motion_cancellation_preserves_replacement', () => {
  const entity = makeEntity();
  const old = characterMotionWaiter(entity, definition);
  const next = characterMotionWaiter(entity, definition);
  assert.equal(old.update(10), true);
  assert.equal(entity.motion.index, 0);
  entity.motion = null;
  assert.equal(next.update(0), true);
});

test('test_janitor_laugh_is_a_right_facing_side_sheet_sized_like_the_walk_frame', () => {
  // BUILD229 사용자 “옆모습으로 웃는 느낌”: 오른쪽을 보는 옆모습 시트 → world.js 가 왼쪽을 볼 땐 반전. 발 pivot 은 프레임마다 밑변
  const laugh = CHARACTER_MOTIONS.janitor.laugh;
  assert.equal(laugh.faces, 'right');
  assert.equal(laugh.frames.length, 4);
  for (const f of laugh.frames) { assert.ok(f.pivot[1] * laugh.scale >= 50 && f.pivot[1] * laugh.scale <= 56, '밑변 pivot'); assert.ok(f.duration > 0); }
  assert.ok(Math.abs(393 * laugh.scale - 46) < 1.5, '걷기 옆 프레임(46px)과 같은 키');
});
