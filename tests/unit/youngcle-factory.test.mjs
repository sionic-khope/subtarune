import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createEntity, Entity, Player, TileMap } from '../../src/world/world.js';
import { QA_POINTS, stateFromFlags } from '../../src/core/story.js';
import * as factoryCutscenes from '../../src/data/cutscenes/factory_puzzles.js';
import { SCRIPTS } from '../../src/data/scripts.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

const makeGame = (data, flags = {}) => {
  const sounds = [], scripts = [];
  const game = {
    flags, map: new TileMap(data), entities: [], player: null, dialogue: { running: false },
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
  game.player.facing = direction;
  const handled = crate.interact(game.player);
  assert.equal(handled, true);
  assert.ok(crate.slide, `${crate.id} should move ${direction}`);
  crate.update(0.14);
  crate.update(0.08);
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
  assert.deepEqual(exits, ['youngcle4', 'youngcle5', 'youngcle_cats']);
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
  const expected = { youngcle3: 3, youngcle4: 8, youngcle5: 16 };

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

test('test_medium_crate_requires_eight_push_route_through_the_bulkhead_gap', () => {
  // Arrange
  const data = readMap('youngcle4');
  const { game } = makeGame(data);
  const crate = game.entities.find(entity => entity.id === 'youngcle4_crate');
  const gate = game.entities.find(entity => entity.id === 'youngcle4_gate');

  // Act
  // 2026-09-15: 위·아래 격벽 사이 row3 틈으로 통과한 뒤 오른쪽 위 발판까지 — 방향 전환 3회
  for (const direction of ['right', 'right', 'up', 'right', 'right', 'right', 'up', 'up']) push(game, crate, direction);
  gate.update();

  // Assert
  assert.deepEqual([crate.x, crate.y], [354, 194]);
  assert.equal(game.flags.youngcle4_circuit_solved, true);
  assert.equal(gate.solid, false);
});

test('test_hard_room_requires_both_crates_on_distinct_targets', () => {
  // Arrange
  const data = readMap('youngcle5');
  const { game, scripts } = makeGame(data);
  const crateA = game.entities.find(entity => entity.id === 'youngcle5_crate_a');
  const crateB = game.entities.find(entity => entity.id === 'youngcle5_crate_b');
  const gate = game.entities.find(entity => entity.id === 'youngcle5_gate');

  // Act: park A below the shared lane, lift B at col 6 (the cell under the top plate is walled since 2026-09-15), slide it right, then route A through the lower opening.
  push(game, crateA, 'right');
  push(game, crateA, 'down');
  for (let count = 0; count < 3; count += 1) push(game, crateB, 'right');
  for (let count = 0; count < 2; count += 1) push(game, crateB, 'up');
  for (let count = 0; count < 2; count += 1) push(game, crateB, 'right');
  assert.equal(game.flags.youngcle5_crate_solved, undefined);
  assert.deepEqual(scripts, []);
  push(game, crateA, 'down');
  for (let count = 0; count < 6; count += 1) push(game, crateA, 'right');
  gate.update();

  // Assert
  assert.deepEqual([crateA.x, crateA.y], [386, 322]);
  assert.deepEqual([crateB.x, crateB.y], [386, 194]);
  assert.equal(game.flags.youngcle5_crate_solved, true);
  assert.equal(gate.solid, false);
  assert.equal(game.saved, 1);
  assert.deepEqual(scripts, ['youngcle5_crate_complete']);
});

test('test_hard_room_blocks_lifting_crate_b_from_directly_under_the_top_plate', () => {
  // Arrange: the obvious route (slide B all the way right, then lift) must stop at the new bulkhead so the player has to read the gap
  const data = readMap('youngcle5');
  const { game } = makeGame(data);
  const crateB = game.entities.find(entity => entity.id === 'youngcle5_crate_b');

  // Act
  for (let count = 0; count < 5; count += 1) push(game, crateB, 'right');
  const parked = [crateB.x, crateB.y];
  // 막힌 밀기는 helper 대신 직접 시도: 아래에서 위를 보고 C
  [game.player.x, game.player.y] = [crateB.x + 2, crateB.y + crateB.h];
  game.player.facing = 'up';
  crateB.interact(game.player);
  crateB.update(0.14); crateB.update(0.08);

  // Assert
  assert.deepEqual(parked, [386, 258]);
  assert.equal(crateB.slide, null, 'bulkhead under the top plate stops the lift');
  assert.deepEqual([crateB.x, crateB.y], parked);
  assert.equal(game.flags.youngcle5_crate_solved, undefined);
});

test('test_factory_final_completion_dialogue_uses_exact_lines_without_reward_nodes', () => {
  // Arrange / Act
  const { youngcle5_crate_complete } = factoryCutscenes;
  const dialogue = youngcle5_crate_complete.map(({ speaker, voice, text }) => ({ speaker, voice, text }));

  // Assert
  assert.deepEqual(dialogue, [
    { speaker: '억빠맨', voice: 'ppaman', text: '* ...' },
    { speaker: '경섭', voice: 'gyeongsub', text: '* 빠맨아 왜?' },
    { speaker: '억빠맨', voice: 'ppaman', text: '* 제작자가 김형섭 맞춤 퍼즐난이도 조정 ㅈㄴ 잘한거같아서 감탄중이에요' },
    { speaker: '경섭', voice: 'gyeongsub', text: '* 개추 ㅋㅋㅋ' },
    { speaker: undefined, voice: 'narrator', text: '* ㅅㅂ년들이' },
  ]);
  assert.equal(youngcle5_crate_complete.some(node => node.set || node.stage || node.action), false);
  assert.equal(SCRIPTS.youngcle5_crate_complete, youngcle5_crate_complete);
});

test('test_factory_tutorial_and_signs_explain_one_cell_confirm_pushes', () => {
  // Arrange
  const guides = [factoryCutscenes.youngcle3_crate_intro, factoryCutscenes.youngcle3_crate_sign,
    factoryCutscenes.youngcle4_crate_sign, factoryCutscenes.youngcle5_crate_sign];

  // Act
  const texts = guides.map(nodes => nodes.map(node => node.text || '').join('\n'));

  // Assert
  assert.ok(texts.every(text => text.includes('C')));
  assert.ok(texts.every(text => text.includes('한 칸')));
  assert.ok(texts.every(text => !text.includes('방향키')));
});

test('test_factory_completion_waits_for_running_dialogue_then_plays_once', () => {
  // Arrange: put one crate on the top plate and the other one push below the bottom plate.
  const { game, scripts } = makeGame(readMap('youngcle5'));
  const [crateA, crateB] = game.entities.filter(entity => entity.def.type === 'factory_crate');
  [crateA.x, crateA.y] = [386, 194];
  [crateB.x, crateB.y] = [386, 354];
  [game.player.x, game.player.y] = [crateB.x + 2, crateB.y + crateB.h];
  game.player.facing = 'up';
  game.dialogue.running = true;

  // Act
  crateB.interact(game.player);
  crateB.update(0.14, { down: () => false });
  crateB.update(1 / 60, { down: () => false });
  game.dialogue.running = false;
  crateB.update(1 / 60, { down: () => false });
  crateB.update(1 / 60, { down: () => false });

  // Assert
  assert.equal(game.flags.youngcle5_crate_solved, true);
  assert.deepEqual(scripts, ['youngcle5_crate_complete']);
});

test('test_factory_confirm_interaction_starts_only_one_faced_crate', () => {
  // Arrange: the player's 24px width overlaps both 28px crates across their 4px gap.
  const { game } = makeGame(readMap('youngcle5'));
  const [crateA, crateB] = game.entities.filter(entity => entity.def.type === 'factory_crate');
  [crateA.x, crateA.y] = [194, 258];
  [crateB.x, crateB.y] = [226, 258];
  [game.player.x, game.player.y] = [216, 286];
  game.player.facing = 'up';

  // Act
  const handled = crateA.interact(game.player);

  // Assert
  assert.equal(handled, true);
  assert.equal([crateA, crateB].filter(crate => crate.slide).length, 1,
    'one confirm interaction must select exactly one faced crate');
});

test('test_factory_direction_input_does_not_push_without_confirm', () => {
  // Arrange
  const { game } = makeGame(readMap('youngcle3'));
  const crate = game.entities.find(entity => entity.id === 'youngcle3_crate');
  [game.player.x, game.player.y] = [crate.x - game.player.w, crate.y + 6];

  // Act
  crate.update(0.5, { down: direction => direction === 'right' });

  // Assert
  assert.deepEqual([crate.x, crate.y], [194, 290]);
  assert.equal(crate.slide, null);
});

test('test_factory_one_confirm_press_moves_one_faced_tile', () => {
  // Arrange
  const { game } = makeGame(readMap('youngcle3'));
  const crate = game.entities.find(entity => entity.id === 'youngcle3_crate');
  [game.player.x, game.player.y] = [crate.x - game.player.w, crate.y + 6];
  game.player.facing = 'right';

  // Act
  const handled = crate.interact(game.player);
  crate.update(0.14, { down: () => false });
  crate.update(0.5, { down: () => false });

  // Assert
  assert.equal(handled, true);
  assert.deepEqual([crate.x, crate.y], [226, 290]);
  assert.equal(crate.slide, null);
});

test('test_factory_confirm_push_matches_the_real_player_probe_edge', () => {
  // Arrange: use the real Player.probe implementation at 18px and just outside it at 20px.
  const atGap = gap => {
    const { game } = makeGame(readMap('youngcle3'));
    const crate = game.entities.find(entity => entity.id === 'youngcle3_crate');
    [game.player.x, game.player.y] = [crate.x - game.player.w - gap, crate.y + 6];
    game.player.facing = 'right';
    game.player.probe = Player.prototype.probe;
    return { game, crate };
  };
  const near = atGap(18);
  const far = atGap(20);

  // Act
  const nearTarget = near.game.player.probe();
  const farTarget = far.game.player.probe();
  nearTarget?.interact(near.game.player);

  // Assert
  assert.equal(nearTarget, near.crate);
  assert.ok(near.crate.slide, 'C must push from anywhere the real interaction probe selects the crate');
  assert.equal(farTarget, undefined);
  assert.equal(far.crate.slide, null);
});

test('test_factory_crate_cannot_leave_the_marked_move_area', () => {
  // Arrange: put the crate at the marked area's left edge with the player on its right.
  const { game } = makeGame(readMap('youngcle3'));
  const crate = game.entities.find(entity => entity.id === 'youngcle3_crate');
  [crate.x, crate.y] = [130, 290];
  [game.player.x, game.player.y] = [crate.x + crate.w, crate.y + 6];
  game.player.facing = 'left';

  // Act
  crate.interact(game.player);

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
    ['youngcle5', 'youngcle5_crate_solved'],
  ];

  for (const [id, flag] of cases) {
    // Act
    const { game, scripts } = makeGame(readMap(id), { [flag]: true });
    const crates = game.entities.filter(entity => entity.def.type === 'factory_crate');
    const plates = game.entities.filter(entity => entity.def.type === 'factory_plate');

    // Assert
    assert.ok(plates.every(plate => crates.some(crate => plate.contains(crate))), id);
    assert.equal(game.entities.find(entity => entity.id === `${id}_gate`).solid, false);
    assert.deepEqual(scripts, []);
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
