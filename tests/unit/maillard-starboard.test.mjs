import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TileMap, Door, Camera, Entity } from '../../src/world/world.js';
import { maillard_starboard_gate } from '../../src/data/cutscenes/maillard_starboard.js';
import { makeWaiter } from '../../src/ui/cutscene.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const loadedMap = (data, flags) => new TileMap({ ...data, rows: data.rows.map((row, index) =>
  Object.entries(data.tileSwaps || {}).reduce((value, [flag, swap]) => flags[flag] ? (swap.rows[index] ?? value) : value, row)) });

test('saloon gate dispatch remains available until the visible construction completes', () => {
  const data = readMap('maillard_saloon');
  assert.equal(data.enter?.script, 'maillard_starboard_gate');
  assert.equal(data.enter.flag, undefined);
  const door = data.entities.find(entity => entity.id === 'saloon_to_starboard');
  assert.equal(door.requires, 'maillard_starboard_open');
  assert.equal(door.interact, false);
});

test('right doorway is blocked before construction and reachable facing right after reload', () => {
  const data = readMap('maillard_saloon');
  const door = data.entities.find(entity => entity.id === 'saloon_to_starboard');
  const before = loadedMap(data, {});
  const after = loadedMap(data, { maillard_starboard_open: true });
  assert.equal(before.solidRect(800, 264, 24, 16), true);
  assert.equal(after.solidRect(800, 264, 24, 16), false);
  const stand = { x: 808, y: 264, w: 24, h: 16 };
  assert.equal(after.solidRect(stand.x, stand.y, 24, 16), false);
  assert.equal(overlaps({ ...stand, x: stand.x + 19.2 }, door), true);
  const image = data.entities.find(entity => entity.id === 'starboard_door_image');
  assert.equal(image.requires, 'maillard_starboard_open');
  assert.match(image.image, /doorway_right\.png$/);
});

test('starboard portal allows transition only after its completion flag', () => {
  const definition = readMap('maillard_saloon').entities.find(entity => entity.id === 'saloon_to_starboard');
  assert.ok(definition);
  const transitions = [];
  const flags = {};
  const game = { mapId: 'maillard_saloon', flags, has: flag => !!flags[flag],
    dialogue: { running: false }, sound: { sfx() {} },
    runScript: (_key, done) => done(), changeMap: (...args) => transitions.push(args) };
  game.player = new Entity({ x: 808, y: 264 }, game);
  const door = new Door(definition, game);
  assert.equal(door.canInteract(), false);
  door.update(1 / 60);
  assert.deepEqual(transitions, []);
  game.player.x = 760;
  door.update(0.5);
  flags.maillard_starboard_open = true;
  game.player.x = 808;
  door.update(1 / 60);
  assert.deepEqual(transitions, [['maillard_starboard', 'from_saloon']]);
});

test('construction is guarded on repeat entry and never moves the party to another map', () => {
  const gate = maillard_starboard_gate;
  assert.equal(gate[0].if({}), true);
  assert.equal(gate[0].if({ captain_attack_done: true }), undefined);
  assert.equal(gate[0].if({ captain_attack_done: true, maillard_starboard_open: true }), true);
  assert.equal(gate.some(node => node.map || node.text), false);
  const openAt = gate.findIndex(node => node.set?.maillard_starboard_open);
  const tilesAt = gate.findIndex(node => node.tiles === 'maillard_starboard_open');
  assert.ok(openAt > tilesAt);
  assert.ok(gate.slice(0, tilesAt).filter(node => node.parallel?.some(child => child.sfx === 'knock')).length >= 4);
  assert.ok(gate.slice(openAt).some(node => node.move === 'starboard_yongjun' && node.px?.[0] > 864));
  assert.equal(gate.at(-3).camera, 'player');
});

test('new deck keeps the risen Maillard sea backdrop and three-screen straight walk', () => {
  assert.ok(fs.existsSync('assets/maps/maillard_starboard.json'));
  const data = readMap('maillard_starboard');
  const map = new TileMap(data);
  assert.deepEqual([map.pxW, map.pxH], [1536, 512]);
  assert.equal(data.backdrop, 'maillard_sunrise');
  assert.equal(data.sunrise.animated, false);
  assert.equal(data.followScreenY, 285);
  assert.equal(data.enter, undefined);
  assert.equal(data.entities.filter(entity => ['npc', 'enemy', 'trigger'].includes(entity.type)).length, 0);
  assert.equal(data.entities.filter(entity => entity.type === 'door').length, 2);
  for (let x = 32; x <= 1480; x += 8) assert.equal(map.solidRect(x, 384, 24, 16), false);
  for (const [x, y] of [[0, 384], [1504, 384], [768, 336], [768, 448]]) assert.equal(map.solidRect(x, y, 24, 16), true);
  const camera = new Camera();
  camera.map = map;
  camera.target = { x: 768, y: 384, w: 24, h: 16 };
  camera.snap();
  assert.equal(392 - camera.y, 285);
});

test('both return spawns preserve party ground and face the travel direction', () => {
  for (const [id, spawnId, facing] of [['maillard_starboard', 'from_saloon', 'right'], ['maillard_saloon', 'from_starboard', 'left']]) {
    const data = readMap(id);
    const spawn = data.spawns[spawnId];
    assert.ok(spawn);
    assert.equal(spawn.facing, facing);
    const map = loadedMap(data, { maillard_starboard_open: true });
    for (const gap of [0, 48, 96]) {
      const x = spawn.x + (facing === 'right' ? -gap : gap);
      assert.equal(map.solidRect(x, spawn.y, 24, 16), false);
    }
    for (const door of data.entities.filter(entity => entity.type === 'door')) {
      assert.equal(overlaps({ ...spawn, w: 24, h: 16 }, door), false);
    }
  }
});

test('construction movement leaves the party on safe floor while both NPCs leave to the right', t => {
  const warnings = t.mock.method(console, 'warn', () => {});
  const data = readMap('maillard_saloon');
  const game = { flags: { captain_attack_done: true }, map: loadedMap(data, {}),
    camera: new Camera(), entities: [], sound: { sfx() {} },
    spawn(definition) { const entity = new Entity(definition, this); this.entities.push(entity); return entity; },
    applyTiles(flag) { this.map = loadedMap(data, { [flag]: true }); } };
  for (const definition of data.entities.filter(entity => !(entity.unless && game.flags[entity.unless])
    && !(entity.requires && entity.type !== 'door' && !game.flags[entity.requires]))) game.spawn(definition);
  game.player = game.spawn({ type: 'player', id: 'player', ...data.spawns.from_captain, solid: false });
  for (const [id, x] of [['ppaman', 564], ['gyeongsub', 500]]) game.spawn({ type: 'npc', id, x, y: 288, solid: false });
  game.camera.map = game.map; game.camera.target = game.player; game.camera.snap();
  for (const node of maillard_starboard_gate) {
    if (node.if || node.label || node.end) continue;
    if (node.action) { node.action(game); continue; }
    if (node.set) { Object.assign(game.flags, node.set); continue; }
    const waiter = makeWaiter(game, node);
    assert.ok(waiter);
    let ticks = 0;
    while (!waiter.update(1 / 60)) assert.ok(++ticks < 600, 'bounded gate node');
    for (const movement of [node, ...(node.parallel || [])].filter(child => child.rel === 'saloon_to_starboard')) {
      const actor = game.entities.find(entity => entity.id === movement.move);
      const expected = { player: [616, 284], ppaman: [552, 284], gyeongsub: [488, 284],
        starboard_junhee: [796, 264], starboard_yongjun: [796, 264] };
      assert.deepEqual([actor.x, actor.y], expected[movement.move], `${movement.move} reached the doorway-relative position`);
    }
  }
  assert.equal(game.flags.maillard_starboard_open, true);
  for (const id of ['starboard_junhee', 'starboard_yongjun']) {
    const actor = game.entities.find(entity => entity.id === id);
    assert.equal(actor.dead, true);
    assert.equal(actor.x, 904);
    assert.equal(actor.y, 264);
  }
  for (const id of ['player', 'ppaman', 'gyeongsub']) {
    const actor = game.entities.find(entity => entity.id === id);
    assert.equal(game.map.solidRect(actor.x, actor.y, actor.w, actor.h), false);
    assert.equal(actor.facing, 'right');
  }
  assert.equal(game.camera.target, game.player);
  assert.ok(game.entities.some(entity => entity.id === 'starboard_door_image' && entity.visible));
  assert.equal(warnings.mock.callCount(), 0);
});
