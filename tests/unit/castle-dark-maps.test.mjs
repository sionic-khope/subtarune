import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getTile } from '../../src/world/tiles.js';
import { TileMap } from '../../src/world/world.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

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

test('test_castle318_north_exit_reaches_a_small_black_arrival_without_invented_encounters', () => {
  const path = readMap('gajaeman_castle_dark_path');
  const exit = path.entities.find(entity => entity.id === 'castle_dark_exit');
  assert.equal(exit.y, 0);
  assert.equal(exit.to, 'gajaeman_castle_dark_arrival');
  const arrival = readMap(exit.to);
  assert.equal(arrival.meta.darkPath, true);
  assert.equal(arrival.rows.length * 32, 384);
  assert.equal(arrival.rows[0].length * 32, 480);
  assert.equal(arrival.enter, undefined);
  assert.equal(arrival.entities.length, 1);
  assert.equal(arrival.entities[0].to, path.id);
  assert.ok(arrival.spawns[exit.spawn]);
});
