import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Character, NPC, Player, TileMap } from '../../src/world/world.js';

const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
before(() => {
  globalThis.document = {
    createElement() { return { getContext() { return { drawImage() {} }; } }; },
  };
});
after(() => {
  if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
  else delete globalThis.document;
});

function makeCharacter(Cls = Character, { solids = [], ...def } = {}) {
  const game = {
    spriteOverrides: { animation_test: { width: 64, height: 64 } },
    map: new TileMap({ walkable: [[0, 0, 512, 512]], solids }, { width: 512, height: 512 }),
    entities: [],
    dialogue: { running: false },
  };
  const character = new Cls({ x: 64, y: 64, w: 16, h: 8, sprite: 'animation_test', ...def }, game);
  game.entities.push(character);
  return character;
}

function makeInput(x = 1, y = 0, slow = false) {
  return { axis: () => ({ x, y }), down: (action) => action === 'cancel' && slow };
}

test('test_character_speed_change_preserves_frame_and_fractional_progress', () => {
  const character = makeCharacter();
  character.moving = true;
  character.animate(0.1, 12);
  assert.equal(character.frame, 1);

  character.animate(0, 8);
  assert.equal(character.frame, 1, 'switching to walking without elapsed time must not change the pose');
  character.animate(0.1, 8);
  assert.equal(character.frame, 2, 'the remaining partial step must continue at the new rate');
  character.animate(0, 12);
  assert.equal(character.frame, 2, 'switching back to running must preserve the pose');
});

for (const fps of [8, 12]) {
  test(`test_character_${fps}fps_cycles_four_frames_and_restarts_after_stopping`, () => {
    const character = makeCharacter();
    character.moving = true;
    const frames = [];
    for (let i = 0; i < 4; i++) {
      character.animate(1 / fps, fps);
      frames.push(character.frame);
    }
    assert.deepEqual(frames, [1, 2, 3, 0]);

    character.animate(1.5 / fps, fps);
    character.moving = false;
    character.animate(0.1, fps);
    assert.equal(character.frame, 0);
    character.moving = true;
    character.animate(0.5 / fps, fps);
    assert.equal(character.frame, 0, 'restarting must not retain the previous partial step');
    character.animate(0.5 / fps, fps);
    assert.equal(character.frame, 1);
  });
}

test('test_player_input_into_wall_stops_walk_animation', () => {
  const player = makeCharacter(Player, { solids: [[80, 0, 32, 512]] });

  player.update(0.1, makeInput());

  assert.deepEqual([player.x, player.y], [64, 64]);
  assert.equal(player.facing, 'right');
  assert.equal(player.moving, false, 'movement input must not animate feet when collision prevents movement');
  assert.equal(player.frame, 0);
});

test('test_player_running_and_walking_preserve_movement_speeds', () => {
  const runner = makeCharacter(Player);
  const walker = makeCharacter(Player);

  runner.update(0.125, makeInput());
  walker.update(0.125, makeInput(1, 0, true));

  assert.ok(Math.abs(runner.x - 91.3) < 1e-9);
  assert.ok(Math.abs(walker.x - 79.6) < 1e-9);
  assert.equal(runner.moving, true);
  assert.equal(walker.moving, true);
});

test('test_player_diagonal_wall_sliding_animates_until_input_stops', () => {
  const player = makeCharacter(Player, { solids: [[80, 0, 32, 512]] });

  player.update(0.1, makeInput(1, 1));

  assert.equal(player.x, 64);
  assert.ok(player.y > 64, 'the unblocked vertical axis must still move');
  assert.equal(player.moving, true);
  assert.equal(player.frame, 1);

  player.update(0.1, makeInput(0, 0));
  assert.equal(player.moving, false);
  assert.equal(player.frame, 0);
});

test('test_npc_wandering_into_wall_stops_animation_without_changing_wander_timing', (t) => {
  t.mock.method(Math, 'random', () => 0.5);
  const npc = makeCharacter(NPC, { solids: [[80, 0, 32, 512]], wander: 64 });
  npc.dir = { x: 1, y: 0 };

  npc.update(0.25);

  assert.deepEqual([npc.x, npc.y], [64, 64]);
  assert.equal(npc.moving, false, 'a blocked NPC must stop its feet while retaining its wander decision');
  assert.equal(npc.frame, 0);
  assert.deepEqual(npc.dir, { x: 1, y: 0 });
  assert.equal(npc.wanderTimer, 1.75);
});

test('test_npc_dialogue_pauses_movement_animation_and_wander_timer', (t) => {
  t.mock.method(Math, 'random', () => 0.5);
  const npc = makeCharacter(NPC, { wander: 64 });
  npc.dir = { x: 1, y: 0 };
  npc.update(0.25);
  assert.ok(Math.abs(npc.x - 79.2) < 1e-9);
  assert.equal(npc.frame, 1);
  const position = [npc.x, npc.y];
  const timer = npc.wanderTimer;

  npc.game.dialogue.running = true;
  npc.update(0.25);

  assert.deepEqual([npc.x, npc.y], position);
  assert.equal(npc.wanderTimer, timer);
  assert.equal(npc.moving, false);
  assert.equal(npc.frame, 0);
});
