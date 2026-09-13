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

test('test_youngcle2_route_has_one_bend_and_connected_factory_doors', () => {
  const map2 = readMap('youngcle2'), map3 = readMap('youngcle3'), map4 = readMap('youngcle4');
  assert.deepEqual([map2.rows[0].length * 32, map2.rows.length * 32], [576, 960]);
  assert.deepEqual(map2.meta.route, [[3, 24], [10, 24], [10, 3]]);
  assert.deepEqual(map2.entities.find(entity => entity.id === 'youngcle2_left'), {
    type: 'door', id: 'youngcle2_left', x: 32, y: 716, w: 16, h: 136,
    to: 'youngcle1', spawn: 'right', sfx: false, interact: false,
  });
  assert.equal(map2.entities.find(entity => entity.id === 'youngcle2_top').to, 'youngcle3');
  assert.equal(map3.entities.find(entity => entity.id === 'youngcle3_right').to, 'youngcle4');
  assert.equal(map4.entities.some(entity => entity.type === 'door' && entity.to !== 'youngcle3'), false);
  assert.ok(map2.rows.join('').includes('!'));
  assert.ok(map3.rows.join('').includes('!'));
  assert.ok(map4.rows.join('').includes('!'));
  for (const data of [map2, map3, map4]) {
    assert.ok(data.entities.some(entity => entity.type === 'factory_rail'));
    assert.ok(data.entities.filter(entity => entity.type === 'door').every(entity => entity.sfx === false && entity.interact === false));
  }
  for (const data of [map2, map3, map4]) {
    assert.equal(data.bgm, 'youngcle_factory');
    assert.equal(data.backdrop, 'youngcle_factory');
    assert.ok(data.preload.includes('assets/backdrops/youngcle_factory.png'));
  }
});

test('test_crate_three_directional_pushes_open_gate_and_persist_solution', () => {
  const data = readMap('youngcle3');
  const { game, sounds } = makeGame(data);
  const crate = game.entities.find(entity => entity.id === 'youngcle3_crate');
  const gate = game.entities.find(entity => entity.id === 'youngcle3_gate');
  const right = { down: name => name === 'right' };
  const idle = { down: () => false };
  for (let push = 0; push < 3; push++) {
    game.player.x = crate.x - game.player.w;
    game.player.y = crate.y + 6;
    crate.update(1 / 60, right);
    assert.ok(crate.slide);
    crate.update(0.14, right);
    crate.update(0.08, idle);
  }
  gate.update();
  assert.equal(game.flags.youngcle3_crate_solved, true);
  assert.equal(gate.solid, false);
  assert.equal(sounds.filter(name => name === 'scrape').length, 3);
  assert.equal(game.saved, 1);

  const restored = makeGame(data, { youngcle3_crate_solved: true }).game;
  const restoredCrate = restored.entities.find(entity => entity.id === 'youngcle3_crate');
  assert.deepEqual([restoredCrate.x, restoredCrate.y], [290, 242]);
  assert.equal(restored.entities.find(entity => entity.id === 'youngcle3_gate').solid, false);
});

test('test_crate_console_resets_only_unfinished_room_state', () => {
  const data = readMap('youngcle3');
  const { game, scripts } = makeGame(data);
  const crate = game.entities.find(entity => entity.id === 'youngcle3_crate');
  const consoleEntity = game.entities.find(entity => entity.id === 'youngcle3_console');
  game.player.x = crate.x - game.player.w;
  game.player.y = crate.y + 6;
  crate.update(1 / 60, { down: name => name === 'right' });
  crate.update(0.14, { down: () => false });
  assert.equal(crate.x, 224);
  game.player.x = 194;
  game.player.y = 244;
  consoleEntity.interact();
  assert.deepEqual([crate.x, crate.y], [192, 242]);
  assert.equal(crate.overlaps(game.player.rect), false);
  assert.deepEqual(scripts, ['youngcle_crate_controls']);
  assert.equal(game.flags.youngcle3_crate_solved, undefined);
});

test('test_two_circuit_rotations_light_path_and_deactivate_plasma_gate', () => {
  const data = readMap('youngcle4');
  const { game, sounds } = makeGame(data);
  const first = game.entities.find(entity => entity.id === 'youngcle4_circuit_a');
  const second = game.entities.find(entity => entity.id === 'youngcle4_circuit_b');
  const gate = game.entities.find(entity => entity.id === 'youngcle4_gate');
  const sourceWire = game.entities.find(entity => entity.id === 'youngcle4_wire_source');
  const middleWire = game.entities.find(entity => entity.id === 'youngcle4_wire_middle');
  const breakerWire = game.entities.find(entity => entity.id === 'youngcle4_wire_breaker');
  assert.equal(sourceWire.isLit(), true);
  assert.equal(middleWire.isLit(), false);
  assert.equal(breakerWire.isLit(), false);
  first.interact();
  assert.equal(first.orientation, 0);
  assert.equal(game.flags.youngcle4_circuit_solved, undefined);
  assert.equal(second.powered(), true);
  assert.equal(middleWire.isLit(), true);
  assert.equal(breakerWire.isLit(), false);
  second.interact();
  gate.update();
  assert.equal(game.flags.youngcle4_circuit_solved, true);
  assert.equal(gate.solid, false);
  assert.equal(breakerWire.isLit(), true);
  assert.deepEqual(sounds, ['click', 'click', 'chime']);
  assert.equal(game.saved, 1);

  const restored = makeGame(data, { youngcle4_circuit_solved: true }).game;
  assert.ok(restored.entities.filter(entity => entity.def.type === 'factory_circuit')
    .every(entity => entity.orientation === entity.solution));
  assert.equal(restored.entities.find(entity => entity.id === 'youngcle4_gate').solid, false);
});

test('test_factory_qa_checkpoints_preserve_derived_inventory_money_and_buffs', () => {
  const base = QA_POINTS.find(point => point.id === 'youngcle1');
  for (const id of ['youngcle2', 'youngcle3', 'youngcle4']) {
    const point = QA_POINTS.find(candidate => candidate.id === id);
    assert.ok(point);
    assert.deepEqual(point.party, base.party);
    assert.deepEqual(stateFromFlags(point.flags), stateFromFlags({
      ...base.flags,
      youngcle_intro_done: true,
      ...(id === 'youngcle4' ? { youngcle3_crate_solved: true } : {}),
    }));
  }
});
