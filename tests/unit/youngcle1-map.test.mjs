import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TileMap, Entity, Door, Player, Sign } from '../../src/world/world.js';
import { probeOverlaps } from '../../src/world/interaction.js';

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

for (const [position, x, y, reachable] of [
  ['left_edge', 516, 216, true],
  ['center', 660, 216, true],
  ['right_edge', 804, 216, true],
  ['wall_stop_left', 528, 192, true],
  ['wall_stop_center', 660, 192, true],
  ['wall_stop_right', 792, 192, true],
  ['forward_limit', 660, 227, true],
  ['outside_left', 504, 216, false],
  ['outside_right', 816, 216, false],
  ['beyond_forward_limit', 660, 228, false],
]) {
  test(`test_youngcle1_TV_C_probe_${position}_${reachable ? 'reaches' : 'misses'}_screen`, () => {
    const data = readMap('youngcle1');
    const map = new TileMap(data);
    const scripts = [];
    const game = { entities: [], runScript: id => scripts.push(id) };
    const screen = new Sign(data.entities.find(entity => entity.id === 'youngcle_tv_screen'), game);
    game.entities.push(screen);
    const player = new Entity({ x, y, facing: 'up' }, game);
    assert.equal(map.solidRect(x, y, player.w, player.h), false);

    const target = Player.prototype.probe.call(player);
    target?.interact();

    assert.equal(target === screen, reachable);
    assert.deepEqual(scripts, reachable ? ['youngcle_tv_off'] : []);
  });
}

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

test('test_youngcle1_inspect_rect_covers_full_TV_art_without_moving_collision_or_staging', () => {
  const data = readMap('youngcle1');
  const art = data.entities.find(e => e.id === 'youngcle_tv');
  const screen = new Sign(data.entities.find(e => e.id === 'youngcle_tv_screen'), {});
  for (const [x, y] of [[art.x, art.y], [art.x + art.w - 1, art.y],
    [art.x, art.y + art.h - 1], [art.x + art.w - 1, art.y + art.h - 1]]) {
    assert.equal(probeOverlaps(screen, { x, y, w: 1, h: 1 }), true);
  }
  assert.deepEqual(screen.rect, { x: 528, y: 196, w: 288, h: 12 });
  assert.equal(screen.overlaps({ x: 600, y: 50, w: 1, h: 1 }), false);
  assert.equal(screen.solid, false);
});

test('test_inspect_rect_follows_entity_motion_and_default_entities_keep_their_original_overlap', () => {
  const entity = new Entity({ x: 100, y: 100, w: 20, h: 10,
    inspectRect: { x: -10, y: -40, w: 40, h: 50 } }, {});
  const point = { x: 91, y: 61, w: 1, h: 1 };
  assert.equal(probeOverlaps(entity, point), true);
  entity.x += 80;
  assert.equal(probeOverlaps(entity, point), false);
  assert.equal(probeOverlaps(entity, { ...point, x: point.x + 80 }), true);
  const ordinary = new Entity({ x: 100, y: 100, w: 20, h: 10 }, {});
  assert.equal(probeOverlaps(ordinary, point), false);
  assert.equal(probeOverlaps(ordinary, ordinary.rect), true);
});
