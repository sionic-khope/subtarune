import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TileMap, Entity, Door } from '../../src/world/world.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

test('walking across the open bridge entrance enters silently without confirm or return bounce', () => {
  const data = readMap('youngcle_bridge');
  const changes = [], sounds = [];
  const game = { mapId: 'youngcle_bridge', flags: { captain_attack_done: true },
    dialogue: { running: false }, sound: { sfx: id => sounds.push(id) },
    changeMap: (...args) => changes.push(args) };
  const definition = data.entities.find(entity => entity.id === 'youngcle_entrance');
  const door = new Door(definition, game);
  game.player = new Entity({ ...data.spawns.from_inside, w: 24, h: 16 }, game);
  for (let tick = 0; tick < 60; tick++) door.update(1 / 60);
  assert.deepEqual(changes, [], 'returning to the bridge must not bounce into the ship');
  game.player.x = definition.x - game.player.w;
  game.player.facing = 'right';
  door.update(1 / 60);
  assert.deepEqual(changes, [], 'touching the threshold from outside must not trigger early');
  game.player.x += 1;
  assert.equal(new TileMap(data).solidRect(game.player.x, game.player.y, 24, 16), false);
  door.update(1 / 60);
  assert.deepEqual(changes, [['youngcle1', 'from_bridge']], 'walking in must transition without any confirm input');
  for (let tick = 0; tick < 60; tick++) door.update(1 / 60);
  assert.equal(changes.length, 1, 'remaining over the threshold must not repeat the transition');
  assert.deepEqual(sounds, [], 'an already open entrance must not play the closed door sound');
  assert.equal(door.canInteract(), false);
});

test('youngcle1 is a wide enclosed steel room with a central TV and two upper doors', () => {
  const data = readMap('youngcle1');
  const map = new TileMap(data);
  assert.deepEqual([map.pxW, map.pxH], [1344, 576]);
  assert.equal(data.backdrop, undefined);
  assert.equal(data.bgm, null);
  assert.deepEqual(data.enter, { script: 'youngcle_intro', early: true });
  assert.equal(new Set(data.rows.join('')).size, 2);
  const tv = data.entities.find(entity => entity.id === 'youngcle_tv');
  assert.equal(tv.x + tv.w / 2, map.pxW / 2);
  assert.deepEqual([tv.w, tv.h], [288, 176]);
  for (const pose of ['read', 'shock', 'hide']) {
    assert.ok(data.preload.includes(`assets/illustrations/youngcle-tv-${pose}.png`));
  }
  const door = data.entities.find(entity => entity.id === 'youngcle_right_door');
  assert.ok(door.x > map.pxW * 0.8 && door.y < map.pxH / 2);
  assert.deepEqual([door.type, door.to, door.spawn, door.interact, door.sfx],
    ['door', 'youngcle2', 'left', true, 'plug']);
  const locked = data.entities.find(entity => entity.id === 'youngcle_left_door');
  assert.ok(locked.x < map.pxW * 0.2 && locked.y < map.pxH / 2);
  assert.deepEqual([locked.type, locked.to, locked.spawn, locked.requires, locked.lockedScript, locked.interact],
    ['door', 'youngcle1', 'left', 'youngcle_left_door_open', 'youngcle_left_door_locked', true]);
  const leftImage = data.entities.find(entity => entity.id === 'youngcle_left_door_image');
  const rightImage = data.entities.find(entity => entity.id === 'youngcle_right_door_image');
  assert.deepEqual([leftImage.image, leftImage.x, leftImage.y, leftImage.w, leftImage.h, leftImage.scale],
    ['assets/props/youngcle_angel_door145.png', 48, 48, 144, 144, 1.5]);
  assert.equal(rightImage.image, 'assets/props/maillard_storage_door.png');
  assert.equal(data.preload.includes(leftImage.image), true);
  assert.equal(fs.existsSync(leftImage.image), true);
  assert.deepEqual(data.spawns.left, { x: 108, y: 228, facing: 'down' });
  assert.deepEqual(data.spawns.right, { x: 1212, y: 228, facing: 'down' });
  assert.ok(data.entities.filter(entity => entity.type === 'npc').every(entity => entity.unless === 'youngcle_intro_done'));
});

test('ship entry and return keep all three party members on floor outside transition zones', () => {
  for (const [id, spawnId, facing] of [['youngcle1', 'from_bridge', 'up'], ['youngcle_bridge', 'from_inside', 'left']]) {
    const data = readMap(id);
    const map = new TileMap(data);
    const spawn = data.spawns[spawnId];
    assert.equal(spawn.facing, facing);
    for (const gap of [0, 48, 96]) {
      const x = spawn.x + (facing === 'left' ? gap : 0);
      const y = spawn.y + (facing === 'up' ? gap : 0);
      assert.equal(map.solidRect(x, y, 24, 16), false);
      for (const entity of data.entities.filter(entity => entity.type === 'door' || entity.solid === true)) {
        assert.equal(new Entity(entity, {}).overlaps({ x, y, w: 24, h: 16 }), false);
      }
    }
  }
  const back = readMap('youngcle1').entities.find(entity => entity.id === 'youngcle_to_bridge');
  assert.deepEqual([back.to, back.spawn, back.interact], ['youngcle_bridge', 'from_inside', true]);
});

test('TV and both upper door interaction anchors are reachable from the steel floor', () => {
  const data = readMap('youngcle1');
  const map = new TileMap(data);
  for (const id of ['youngcle_tv_screen', 'youngcle_left_door', 'youngcle_right_door']) {
    const anchor = data.entities.find(entity => entity.id === id);
    const stand = { x: anchor.x + anchor.w / 2 - 12, y: anchor.y + anchor.h + 8, w: 24, h: 16 };
    assert.equal(map.solidRect(stand.x, stand.y, stand.w, stand.h), false);
    assert.equal(new Entity(anchor, {}).overlaps({ ...stand, y: stand.y - 19.2 }), true);
  }
});

test('test_youngcle1_upper_doors_require_C_then_route_right_or_report_left_locked', () => {
  const data = readMap('youngcle1');
  const scripts = [], changes = [], sounds = [];
  const game = { mapId: 'youngcle1', flags: { youngcle_intro_done: true }, transitioning: false,
    dialogue: { running: false }, has(key) { return !!this.flags[key]; },
    runScript(key, done) { scripts.push(key); done?.(); },
    changeMap(...args) { changes.push(args); }, sound: { sfx(name) { sounds.push(name); } } };
  const left = new Door(data.entities.find(entity => entity.id === 'youngcle_left_door'), game);
  const right = new Door(data.entities.find(entity => entity.id === 'youngcle_right_door'), game);
  assert.equal(left.canInteract(), true);
  assert.equal(right.canInteract(), true);
  left.update(1 / 60); right.update(1 / 60);
  assert.deepEqual([scripts, changes, sounds], [[], [], []]);
  left.interact(); right.interact();
  assert.deepEqual(scripts, ['youngcle_left_door_locked']);
  assert.deepEqual(changes, [['youngcle2', 'left']]);
  assert.deepEqual(sounds, ['plug']);
});
