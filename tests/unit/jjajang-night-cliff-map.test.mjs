import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TileMap } from '../../src/world/world.js';

test('night cliff keeps actors grounded and blocks walking into the sea', () => {
  const def = JSON.parse(fs.readFileSync('assets/maps/jjajang_night_cliff.json', 'utf8'));
  const map = new TileMap(def);
  const actors = def.entities.filter((e) => e.type === 'npc');
  assert.equal(actors.length, 3);
  assert.equal(actors.find((actor) => actor.id === 'choimis_sky_boss').hidden, true);
  for (const actor of actors) assert.equal(map.solidRect(actor.x, actor.y, 24, 16), false);
  for (const x of [96, 320, 560, 644]) assert.equal(map.solidRect(x, 199, 24, 16), false);
  assert.equal(map.solidRect(672, 199, 24, 16), true);
  assert.equal(map.solidRect(644, 224, 24, 16), true);
  assert.equal(map.solidRect(644, 176, 24, 16), true);
});

test('night coast connects the unlocked right fork to the cliff with safe return spawns', () => {
  const fork = JSON.parse(fs.readFileSync('assets/maps/jjajang_sakura8.json', 'utf8'));
  const cliff = JSON.parse(fs.readFileSync('assets/maps/jjajang_night_cliff.json', 'utf8'));
  const first = JSON.parse(fs.readFileSync('assets/maps/jjajang_night_coast1.json', 'utf8'));
  const third = JSON.parse(fs.readFileSync('assets/maps/jjajang_night_coast3.json', 'utf8'));
  const door = fork.entities.find((e) => e.to === first.id);
  assert.equal(door.requires, 'choimis_flower_done');
  assert.equal(door.x + door.w, fork.rows[0].length * 32);
  assert.ok(first.spawns[door.spawn].x > 10 + 24);
  assert.ok(cliff.spawns[third.entities.find((e) => e.to === cliff.id).spawn].x > 10 + 24);
  assert.equal(cliff.entities.find((e) => e.type === 'door').to, third.id);
  assert.equal(cliff.entities.find((e) => e.type === 'door').spawn, 'from_east');
  assert.equal(cliff.backdrop, 'jjajang_night_sea');
  assert.ok(cliff.preload.includes('assets/backdrops/jjajang_night_sea.png'));
});

test('the opened right fork keeps Ppaman present without blocking the straight walking lane', () => {
  const map = JSON.parse(fs.readFileSync('assets/maps/jjajang_sakura8.json', 'utf8'));
  const visible = flags => map.entities.filter(e => (!e.requires || flags[e.requires]) && (!e.unless || !flags[e.unless]));
  const before = visible({ sakura8_split_done: true });
  const after = visible({ sakura8_split_done: true, sakura8_right_open: true });
  const blocksLane = e => e.solid && e.x < 1240 && e.x + (e.w ?? 24) > 740 && e.y < 502 && e.y + (e.h ?? 16) > 486;
  assert.ok(before.some(blocksLane));
  assert.equal(after.some(blocksLane), false);
  const ppaman = after.filter(e => e.sprite === 'ppaman');
  assert.equal(ppaman.length, 1);
  assert.equal(new TileMap(map).solidRect(ppaman[0].x, ppaman[0].y, 24, 16), false);
});
