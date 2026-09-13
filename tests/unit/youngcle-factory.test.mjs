import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createEntity, Entity, TileMap } from '../../src/world/world.js';
import { QA_POINTS, stateFromFlags } from '../../src/core/story.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

const makeGame = (data, flags = {}) => {
  const sounds = [], scripts = [];
  const game = {
    flags, map: new TileMap(data), entities: [], player: null,
    has(key) { return !!this.flags[key]; },
    setFlag(key, value = true) { this.flags[key] = value; },
    sound: { sfx: name => sounds.push(name) },
    runScript: name => scripts.push(name),
    autosave() { this.saved = (this.saved || 0) + 1; },
  };
  game.entities = data.entities.map(def => createEntity({ ...def }, game)).filter(Boolean);
  game.player = new Entity({ x: 0, y: 0, w: 24, h: 16 }, game);
  game.entities.push(game.player);
  return { game, sounds, scripts };
};

const push = (game, crate, direction) => {
  const positions = {
    left: [crate.x + crate.w, crate.y + 6],
    right: [crate.x - game.player.w, crate.y + 6],
    up: [crate.x + 2, crate.y + crate.h],
    down: [crate.x + 2, crate.y - game.player.h],
  };
  [game.player.x, game.player.y] = positions[direction];
  crate.update(1 / 60, { down: name => name === direction });
  assert.ok(crate.slide, `${crate.id} should move ${direction}`);
  crate.update(0.14, { down: () => false });
  crate.update(0.08, { down: () => false });
};

const minimumPushes = (data) => {
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const blocked = new Set();
  for (let row = 0; row < data.rows.length; row += 1) {
    for (let col = 0; col < data.rows[row].length; col += 1) {
      if (data.rows[row][col] !== 'I') blocked.add(`${col},${row}`);
    }
  }
  for (const entity of data.entities.filter(({ type }) => ['factory_bulkhead', 'factory_console', 'factory_sign', 'factory_gate'].includes(type))) {
    for (let row = 0; row < data.rows.length; row += 1) {
      for (let col = 0; col < data.rows[row].length; col += 1) {
        const [cx, cy] = [col * 32 + 16, row * 32 + 16];
        if (cx >= entity.x && cx < entity.x + entity.w && cy >= entity.y && cy < entity.y + entity.h) blocked.add(`${col},${row}`);
      }
    }
  }
  const crates = data.entities.filter(({ type }) => type === 'factory_crate')
    .map(({ x, y }) => [Math.floor((x + 14) / 32), Math.floor((y + 14) / 32)]);
  const targets = new Set(data.entities.filter(({ type }) => type === 'factory_plate')
    .map(({ x, y }) => `${Math.floor((x + 16) / 32)},${Math.floor((y + 16) / 32)}`));
  const moveArea = data.entities.find(({ type }) => type === 'factory_move_area');
  const crateCanOccupy = (x, y) => {
    const [left, top] = [x * 32 + 2, y * 32 + 2];
    return !moveArea || (left >= moveArea.x && top >= moveArea.y
      && left + 28 <= moveArea.x + moveArea.w && top + 28 <= moveArea.y + moveArea.h);
  };
  const spawn = data.spawns.left;
  const start = [Math.floor((spawn.x + 12) / 32), Math.floor((spawn.y + 8) / 32)];
  const states = [{ player: start, crates, pushes: 0 }];
  const seen = new Set();
  while (states.length) {
    const state = states.shift();
    const crateKeys = new Set(state.crates.map(([x, y]) => `${x},${y}`));
    const stateKey = `${state.player.join(',')}|${[...crateKeys].sort().join(';')}`;
    if (seen.has(stateKey)) continue;
    seen.add(stateKey);
    if ([...targets].every(target => crateKeys.has(target))) return state.pushes;
    const reachable = new Set([state.player.join(',')]);
    const walk = [state.player];
    while (walk.length) {
      const [x, y] = walk.shift();
      for (const [dx, dy] of directions) {
        const next = `${x + dx},${y + dy}`;
        if (blocked.has(next) || crateKeys.has(next) || reachable.has(next)) continue;
        reachable.add(next);
        walk.push([x + dx, y + dy]);
      }
    }
    for (let index = 0; index < state.crates.length; index += 1) {
      const [x, y] = state.crates[index];
      for (const [dx, dy] of directions) {
        const stand = `${x - dx},${y - dy}`;
        const destination = `${x + dx},${y + dy}`;
        if (!reachable.has(stand) || blocked.has(destination) || crateKeys.has(destination)
          || !crateCanOccupy(x + dx, y + dy)) continue;
        const nextCrates = state.crates.map((crate, crateIndex) => crateIndex === index ? [x + dx, y + dy] : crate);
        states.push({ player: [x, y], crates: nextCrates, pushes: state.pushes + 1 });
      }
    }
  }
  return null;
};

test('test_factory_route_connects_three_crate_rooms_and_keeps_factory_surface', () => {
  // Arrange
  const map2 = readMap('youngcle2');
  const rooms = ['youngcle3', 'youngcle4', 'youngcle5'].map(readMap);

  // Act
  const exits = rooms.map(data => data.entities.find(entity => entity.id === `${data.id}_right`)?.to ?? null);

  // Assert
  assert.deepEqual([map2.rows[0].length * 32, map2.rows.length * 32], [576, 960]);
  assert.deepEqual(map2.meta.route, [[3, 24], [10, 24], [10, 3]]);
  assert.equal(map2.entities.find(entity => entity.id === 'youngcle2_top').to, 'youngcle3');
  assert.deepEqual(exits, ['youngcle4', 'youngcle5', null]);
  for (const data of rooms) {
    assert.equal(data.bgm, 'youngcle_factory');
    assert.equal(data.backdrop, 'youngcle_factory');
    assert.equal(data.meta.puzzle, 'crate');
    assert.equal(data.entities.filter(entity => entity.type === 'factory_sign').length, 1);
    assert.equal(data.entities.filter(entity => entity.type === 'factory_console').length, 1);
    assert.deepEqual(data.meta.moveArea, [4, 5, 9, 7]);
    assert.equal(data.preload.includes('assets/props/factory_crate145.png'), true);
    assert.equal(fs.existsSync('assets/props/factory_crate145.png'), true);
    assert.equal(data.entities.filter(entity => entity.type === 'factory_move_area').length, 1);
    assert.ok(data.entities.some(entity => entity.type === 'factory_bulkhead'));
    assert.ok(data.entities.filter(entity => entity.type === 'door').every(entity => entity.sfx === false && entity.interact === false));
  }
});

test('test_reusable_circuit_entities_still_complete_when_every_plate_is_aligned', () => {
  // Arrange
  const data = {
    id: 'circuit_fixture', rows: Array.from({ length: 8 }, () => 'IIIIIIII'),
    entities: [
      { type: 'factory_circuit', id: 'circuit_a', puzzle: 'fixture', flag: 'fixture_solved', x: 64, y: 64, orientation: 1, solution: 0 },
      { type: 'factory_circuit', id: 'circuit_b', puzzle: 'fixture', flag: 'fixture_solved', x: 128, y: 64, orientation: 1, solution: 0, poweredBy: ['circuit_a'] },
      { type: 'factory_wire', id: 'fixture_wire', puzzle: 'fixture', flag: 'fixture_solved', poweredBy: ['circuit_a', 'circuit_b'], points: [[32, 80], [192, 80]] },
      { type: 'factory_gate', id: 'fixture_gate', flag: 'fixture_solved', x: 192, y: 32, w: 24, h: 160 },
    ],
  };
  const { game, sounds } = makeGame(data);
  const first = game.entities.find(entity => entity.id === 'circuit_a');
  const second = game.entities.find(entity => entity.id === 'circuit_b');
  const wire = game.entities.find(entity => entity.id === 'fixture_wire');
  const gate = game.entities.find(entity => entity.id === 'fixture_gate');

  // Act
  first.interact();
  second.interact();
  gate.update();

  // Assert
  assert.equal(game.flags.fixture_solved, true);
  assert.equal(wire.isLit(), true);
  assert.equal(gate.solid, false);
  assert.deepEqual(sounds, ['click', 'click', 'chime']);
});

test('test_factory_solutions_include_player_walkaround_and_match_difficulty_push_counts', () => {
  // Arrange
  const expected = { youngcle3: 3, youngcle4: 6, youngcle5: 16 };

  // Act
  const pushes = Object.fromEntries(Object.keys(expected).map(id => [id, minimumPushes(readMap(id))]));

  // Assert
  assert.deepEqual(pushes, expected);
});

test('test_tutorial_crate_requires_three_push_l_route_before_gate_opens', () => {
  // Arrange
  const data = readMap('youngcle3');
  const { game, sounds } = makeGame(data);
  const crate = game.entities.find(entity => entity.id === 'youngcle3_crate');
  const gate = game.entities.find(entity => entity.id === 'youngcle3_gate');

  // Act
  for (const direction of ['right', 'right', 'up']) push(game, crate, direction);
  gate.update();

  // Assert
  assert.deepEqual([crate.x, crate.y], [258, 258]);
  assert.equal(game.flags.youngcle3_crate_solved, true);
  assert.equal(gate.solid, false);
  assert.equal(sounds.filter(name => name === 'scrape').length, 3);
  assert.equal(game.saved, 1);
});

test('test_medium_crate_requires_six_push_route_around_bulkhead', () => {
  // Arrange
  const data = readMap('youngcle4');
  const { game } = makeGame(data);
  const crate = game.entities.find(entity => entity.id === 'youngcle4_crate');
  const gate = game.entities.find(entity => entity.id === 'youngcle4_gate');

  // Act
  for (const direction of ['right', 'right', 'up', 'up', 'right', 'right']) push(game, crate, direction);
  gate.update();

  // Assert
  assert.deepEqual([crate.x, crate.y], [322, 226]);
  assert.equal(game.flags.youngcle4_circuit_solved, true);
  assert.equal(gate.solid, false);
});

test('test_hard_room_requires_both_crates_on_distinct_targets', () => {
  // Arrange
  const data = readMap('youngcle5');
  const { game } = makeGame(data);
  const crateA = game.entities.find(entity => entity.id === 'youngcle5_crate_a');
  const crateB = game.entities.find(entity => entity.id === 'youngcle5_crate_b');
  const gate = game.entities.find(entity => entity.id === 'youngcle5_gate');

  // Act: park A below the shared lane, send B through, then route A through the lower opening.
  push(game, crateA, 'right');
  push(game, crateA, 'down');
  for (let count = 0; count < 5; count += 1) push(game, crateB, 'right');
  assert.equal(game.flags.youngcle5_crate_solved, undefined);
  push(game, crateA, 'down');
  for (let count = 0; count < 6; count += 1) push(game, crateA, 'right');
  for (let count = 0; count < 2; count += 1) push(game, crateB, 'up');
  gate.update();

  // Assert
  assert.deepEqual([crateA.x, crateA.y], [386, 322]);
  assert.deepEqual([crateB.x, crateB.y], [386, 194]);
  assert.equal(game.flags.youngcle5_crate_solved, true);
  assert.equal(gate.solid, false);
  assert.equal(game.saved, 1);
});

test('test_factory_one_direction_press_starts_only_one_adjacent_crate', () => {
  // Arrange: the player's 24px width overlaps both 28px crates across their 4px gap.
  const { game } = makeGame(readMap('youngcle5'));
  const [crateA, crateB] = game.entities.filter(entity => entity.def.type === 'factory_crate');
  [crateA.x, crateA.y] = [194, 258];
  [crateB.x, crateB.y] = [226, 258];
  [game.player.x, game.player.y] = [216, 286];
  const heldUp = { down: direction => direction === 'up' };

  // Act: both entities observe the same physical key press in the same update frame.
  crateA.update(1 / 60, heldUp);
  crateB.update(1 / 60, heldUp);

  // Assert
  assert.equal([crateA, crateB].filter(crate => crate.slide).length, 1,
    'one direction press must select exactly one overlapping crate');
});

test('test_factory_held_direction_waits_for_release_before_another_push', () => {
  // Arrange
  const { game } = makeGame(readMap('youngcle3'));
  const crate = game.entities.find(entity => entity.id === 'youngcle3_crate');
  [game.player.x, game.player.y] = [crate.x - game.player.w, crate.y + 6];
  const heldRight = { down: direction => direction === 'right' };

  // Act: finish the first slide and enough cooldown while the same press remains held.
  crate.update(1 / 60, heldRight);
  crate.update(0.14, heldRight);
  game.player.x = crate.x - game.player.w;
  crate.update(0.24, heldRight);

  // Assert
  assert.deepEqual([crate.x, crate.y], [226, 290],
    'holding one press must move the crate only one tile');
  assert.equal(crate.slide, null);
});

test('test_factory_crate_cannot_leave_the_marked_move_area', () => {
  // Arrange: put the crate at the marked area's left edge with the player on its right.
  const { game } = makeGame(readMap('youngcle3'));
  const crate = game.entities.find(entity => entity.id === 'youngcle3_crate');
  [crate.x, crate.y] = [130, 290];
  [game.player.x, game.player.y] = [crate.x + crate.w, crate.y + 6];

  // Act
  crate.update(1 / 60, { down: direction => direction === 'left' });

  // Assert
  assert.equal(crate.slide, null);
  assert.deepEqual([crate.x, crate.y], [130, 290]);
});

test('test_reset_console_restores_every_unsolved_crate_without_trapping_party', () => {
  // Arrange
  const data = readMap('youngcle5');
  const { game, scripts } = makeGame(data);
  const crateA = game.entities.find(entity => entity.id === 'youngcle5_crate_a');
  const crateB = game.entities.find(entity => entity.id === 'youngcle5_crate_b');
  const consoleEntity = game.entities.find(entity => entity.id === 'youngcle5_console');
  push(game, crateA, 'right');
  push(game, crateA, 'down');
  push(game, crateB, 'right');
  game.player.x = crateA.start[0];
  game.player.y = crateA.start[1];

  // Act
  consoleEntity.interact();

  // Assert
  assert.deepEqual([crateA.x, crateA.y], crateA.start);
  assert.deepEqual([crateB.x, crateB.y], crateB.start);
  assert.ok([crateA, crateB].every(crate => !crate.overlaps(game.player.rect)));
  assert.deepEqual(scripts, ['youngcle_crate_reset']);
  assert.equal(game.flags.youngcle5_crate_solved, undefined);
});

test('test_old_factory_flags_restore_new_crate_layouts_as_solved', () => {
  // Arrange
  const cases = [
    ['youngcle3', 'youngcle3_crate_solved'],
    ['youngcle4', 'youngcle4_circuit_solved'],
  ];

  for (const [id, flag] of cases) {
    // Act
    const game = makeGame(readMap(id), { [flag]: true }).game;
    const crates = game.entities.filter(entity => entity.def.type === 'factory_crate');
    const plates = game.entities.filter(entity => entity.def.type === 'factory_plate');

    // Assert
    assert.ok(plates.every(plate => crates.some(crate => plate.contains(crate))), id);
    assert.equal(game.entities.find(entity => entity.id === `${id}_gate`).solid, false);
  }
});

test('test_factory_signs_open_readable_scripts', () => {
  // Arrange
  const expected = {
    youngcle3: 'youngcle3_crate_sign',
    youngcle4: 'youngcle4_crate_sign',
    youngcle5: 'youngcle5_crate_sign',
  };

  for (const [id, script] of Object.entries(expected)) {
    const { game, scripts } = makeGame(readMap(id));
    const sign = game.entities.find(entity => entity.def.type === 'factory_sign');

    // Act
    const handled = sign.interact();

    // Assert
    assert.equal(handled, true);
    assert.deepEqual(scripts, [script]);
  }
});

test('test_factory_qa_checkpoints_preserve_prior_solutions_and_derived_state', () => {
  // Arrange
  const base = QA_POINTS.find(point => point.id === 'youngcle1');
  const expectedFlags = {
    youngcle3: {},
    youngcle4: { youngcle3_crate_solved: true },
    youngcle5: { youngcle3_crate_solved: true, youngcle4_circuit_solved: true },
  };

  // Act / Assert
  for (const [id, priorFlags] of Object.entries(expectedFlags)) {
    const point = QA_POINTS.find(candidate => candidate.id === id);
    assert.ok(point);
    assert.deepEqual(point.party, base.party);
    assert.deepEqual(stateFromFlags(point.flags), stateFromFlags({
      ...base.flags,
      youngcle_intro_done: true,
      ...priorFlags,
    }));
    for (const [flag, value] of Object.entries(priorFlags)) assert.equal(point.flags[flag], value);
  }
});
