import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getTile } from '../../src/world/tiles.js';
import { TileMap } from '../../src/world/world.js';
import { MapAssetCache } from '../../src/core/map-assets.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

test('test_castle319_actual_map_preparation_loads_the_pursuer_before_the_chase_is_ready', async () => {
  const loaded = [];
  const cache = new MapAssetCache({ maps: {}, loadMap: async id => readMap(id),
    loadImage: async src => { loaded.push(src); return { width: 192, height: 192 }; },
    loadTiles: async () => {} });
  await cache.prepare('gajaeman_castle_dark_arrival');
  assert.ok(loaded.includes('assets/enemies/castle-dark-pursuer.png'));
  assert.ok(cache.images['assets/enemies/castle-dark-pursuer.png']);
  assert.equal(readMap('gajaeman_castle_dark_refuge').bgmVolume, 0.2);
});

test('test_castle318_gate_changes_from_sealed_to_interactable_open_without_an_automatic_exit', () => {
  const map = readMap('gajaeman_castle_lobby');
  const sealed = map.entities.find(entity => entity.id === 'castle_lobby_sealed_door');
  const opened = map.entities.find(entity => entity.id === 'castle_lobby_open_door');
  assert.equal(sealed.unless, 'castle_gate_open');
  assert.equal(opened.requires, 'castle_gate_open');
  assert.equal(opened.script, 'castle_gate_enter');
  assert.equal(opened.solid, true);
  assert.deepEqual([opened.x, opened.y, opened.w, opened.h], [sealed.x, sealed.y, sealed.w, sealed.h]);
  assert.equal(map.entities.some(entity => entity.type === 'door' && entity.to === 'gajaeman_castle_dark_path'), false);
});

test('test_castle318_gate_allies_reuse_their_boulder_identities_and_visible_scales', () => {
  const lobby = readMap('gajaeman_castle_lobby'), bridge = readMap('gajaeman_castle_boulder');
  for (const name of ['youngcle', 'junhee', 'bidet', 'mario', 'ttuulla', 'park']) {
    const actor = lobby.entities.find(entity => entity.id === `gate_${name}`);
    const previous = bridge.entities.find(entity => entity.id === `boulder_${name}`);
    assert.equal(actor.sprite, previous.sprite);
    assert.equal(actor.visualScale ?? 1, previous.visualScale ?? 1);
    assert.equal(actor.requires, 'castle_left_seal_active');
    assert.equal(actor.unless, 'castle_gate_reunion_done');
    assert.equal(actor.hidden, true);
  }
});

test('test_castle318_hidden_path_has_three_fair_connected_legs_and_black_presentation_metadata', () => {
  const map = readMap('gajaeman_castle_dark_path'), world = new TileMap(map);
  assert.equal(map.meta.darkPath, true);
  assert.equal(map.backdrop, undefined);
  assert.equal(map.bgm, null);
  assert.equal(map.enter.script, 'castle_dark_path_intro');
  const route = map.meta.route;
  assert.equal(route.length, 4);
  assert.ok(route[0][1] > route[1][1] && route[0][0] === route[1][0]);
  assert.ok(route[2][0] > route[1][0] && route[2][1] === route[1][1]);
  assert.ok(route[2][1] > route[3][1] && route[2][0] === route[3][0]);
  let distance = 0;
  for (let i = 1; i < route.length; i++) {
    const [ax, ay] = route[i - 1], [bx, by] = route[i];
    const length = Math.abs(bx - ax) + Math.abs(by - ay);
    distance += length;
    for (let step = 0; step <= length; step += 8) {
      assert.equal(world.solidRect(ax + Math.sign(bx - ax) * step, ay + Math.sign(by - ay) * step, 24, 16), false);
    }
  }
  assert.ok(distance / 218.4 >= 25 && distance / 218.4 <= 40);
  assert.equal(map.meta.corridorWidth, 96);
  for (const row of map.rows) for (const tile of row) assert.ok(tile === ' ' || (tile === '♤' && !getTile(tile).solid));
  for (const spawn of Object.values(map.spawns)) assert.equal(world.solidRect(spawn.x, spawn.y, 24, 16), false);
  assert.equal(world.solidRect(route[1][0], route[1][1] - 96, 24, 16), true);
});

test('test_castle319_north_exit_reaches_the_winding_chase_with_the_original_safe_entry', () => {
  const path = readMap('gajaeman_castle_dark_path');
  const exit = path.entities.find(entity => entity.id === 'castle_dark_exit');
  assert.equal(exit.y, 0);
  assert.equal(exit.to, 'gajaeman_castle_dark_arrival');
  const arrival = readMap(exit.to);
  assert.equal(arrival.meta.darkPath, true);
  assert.equal(arrival.enter.script, 'castle_dark_chase_intro');
  assert.equal(arrival.enter.flag, undefined);
  assert.deepEqual(arrival.meta.darkChase.entry, [228, 240]);
  assert.deepEqual(arrival.meta.darkChase.monsterSpawn, [228, 540]);
  assert.ok(arrival.spawns[exit.spawn]);
  const world = new TileMap(arrival), route = arrival.meta.darkChase.route;
  let distance = 0;
  assert.ok(route.length >= 6);
  for (let i = 1; i < route.length; i++) {
    const [ax, ay] = route[i - 1], [bx, by] = route[i];
    const length = Math.abs(bx - ax) + Math.abs(by - ay);
    distance += length;
    for (let step = 0; step <= length; step += 8) {
      assert.equal(world.solidRect(ax + Math.sign(bx - ax) * step, ay + Math.sign(by - ay) * step, 24, 16), false);
    }
  }
  assert.ok(distance / 218.4 >= 25 && distance / 218.4 <= 40);
  assert.equal(arrival.meta.corridorWidth, 96);
  for (let y = 64; y < 160; y += 8) assert.equal(world.solidRect(640, y, 1, 1), false);
  assert.equal(world.solidRect(640, 63, 1, 1), true);
  assert.equal(world.solidRect(640, 160, 1, 1), true);
  assert.equal(world.solidRect(228, 288, 24, 16), false);
  assert.equal(world.solidRect(228, 336, 24, 16), false);
  assert.equal(arrival.entities.some(entity => entity.to === path.id), false);
  assert.equal(arrival.entities.find(entity => entity.type === 'door').y, 0);
});

test('test_castle319_chase_reaches_a_castle_refuge_with_healing_and_a_closed_final_gate', () => {
  const chase = readMap('gajaeman_castle_dark_arrival');
  const exit = chase.entities.find(entity => entity.type === 'door');
  const refuge = readMap(exit.to), world = new TileMap(refuge);
  assert.equal(refuge.id, 'gajaeman_castle_dark_refuge');
  assert.equal(refuge.meta.darkPath, undefined);
  assert.equal(refuge.backdrop, 'castle-regret-depth');
  assert.ok(refuge.dim > 0 && refuge.dim < 0.4);
  assert.equal(refuge.enter.script, 'castle_dark_chase_finish');
  const spring = refuge.entities.find(entity => entity.script === 'maillard_spring');
  assert.equal(spring.image, 'assets/props/blue_buff.png');
  assert.equal(spring.anim.cols, 3);
  const gate = refuge.entities.find(entity => entity.id === 'castle_final_gate');
  assert.equal(gate.image, 'assets/props/castle307_sealed_gate.png');
  assert.equal(gate.solid, true);
  assert.equal(refuge.entities.some(entity => entity.type === 'door' && entity.y === 0), false);
  for (const spawn of Object.values(refuge.spawns)) {
    assert.equal(world.solidRect(spawn.x, spawn.y, 24, 16), false);
    assert.equal(refuge.entities.some(entity => entity.solid && spawn.x < entity.x + entity.w && spawn.x + 24 > entity.x && spawn.y < entity.y + entity.h && spawn.y + 16 > entity.y), false);
  }
});
