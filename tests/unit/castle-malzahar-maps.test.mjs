import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Camera, Entity, TileMap } from '../../src/world/world.js';
import { makeWaiter } from '../../src/ui/cutscene.js';
import { castle_malzahar_intro, restoreCastleDefenders, separateCastleParty } from '../../src/data/cutscenes/gajaeman_malzahar.js';

const read = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

test('memory north exit reaches the fork without changing prior encounters or tombstones', () => {
  const memory = read('gajaeman_memory2');
  const exit = memory.entities.find(entity => entity.id === 'memory2_next');
  assert.equal(exit?.to, 'gajaeman_castle_fork');
  assert.equal(memory.entities.filter(entity => entity.type === 'enemy').length, 2);
  assert.equal(memory.entities.filter(entity => entity.id.startsWith('castle_memory_stele')).length, 3);
  assert.equal(new TileMap(memory).solidRect(1284, 0, 24, 16), false);
});

test('fork keeps the torii corridor traversable and gives the encounter a full three second lead-in', () => {
  const fork = read('gajaeman_castle_fork'), map = new TileMap(fork);
  const run = fork.meta.runs.a;
  assert.equal(fork.enter.script, 'castle_malzahar_intro');
  assert.equal(run.dir, 1);
  assert.equal(run.water, false);
  assert.equal(run.obstacles, false);
  assert.ok(run.endX - run.startX >= run.speed * 5);
  for (let x = 740; x < run.endX; x += 24) assert.equal(map.solidRect(x, run.groundY, 24, 16), false, `road ${x}`);
  for (const point of Object.values(fork.meta.stage)) assert.equal(map.solidRect(...point, 24, 16), false, String(point));
  for (const id of ['castle_warm_bidet', 'castle_dot_mario']) assert.equal(fork.entities.find(entity => entity.id === id).hidden, undefined);
});

test('arrival has a reachable north door and restores castle field music', () => {
  const end = read('gajaeman_torii_end'), map = new TileMap(end);
  const door = end.entities.find(entity => entity.id === 'castle_torii_end_door');
  assert.equal(end.bgm, 'castle_right');
  assert.equal(door.script, 'castle_malzahar_end_door');
  assert.ok(door.y < end.spawns.start.y);
  assert.equal(map.solidRect(door.x + 36, door.y + door.h, 24, 16), false);
  assert.equal(end.entities.some(entity => entity.type === 'door'), false);
  const camera = new Camera();
  camera.map = map; camera.target = new Entity(end.spawns.start, { map }); camera.snap();
  assert.ok(door.iy >= camera.y && door.y + door.h <= camera.y + 230);
});

test('party approach and right-then-north departure stay on stone through every movement tick', () => {
  const def = read('gajaeman_castle_fork');
  const game = { map: new TileMap(def), entities: [], camera: new Camera() };
  game.player = new Entity({ id: 'player', ...def.spawns.start }, game);
  game.entities = def.entities.map(entity => new Entity(entity, game));
  game.entities.push(new Entity({ id: 'gyeongsub', x: 388, y: 1000, solid: false }, game),
    new Entity({ id: 'ppaman', x: 388, y: 1048, solid: false }, game));
  for (const node of castle_malzahar_intro) {
    if (node.action === separateCastleParty) node.action(game);
    if (node.leave) game.entities = game.entities.filter(entity => entity.id !== node.leave);
    if (!(node.move || node.parallel)) continue;
    if (node.parallel?.some(child => child.emote)) continue;
    const waiter = makeWaiter(game, node);
    let finished = false;
    for (let tick = 0; tick < 1800 && !finished; tick++) {
      finished = waiter.update(1 / 60);
      for (const actor of [game.player, ...game.entities.filter(entity => entity.def.type === 'npc' && entity.visible)]) {
        assert.equal(game.map.solidRect(actor.x, actor.y, actor.w, actor.h), false, `${actor.id}: ${actor.x}, ${actor.y}`);
      }
    }
    assert.equal(finished, true);
  }
  assert.equal(game.entities.some(entity => entity.id === 'gyeongsub' || entity.id === 'ppaman'), false);
  assert.deepEqual([game.player.x, game.player.y], def.meta.stage.fork_player_wait);
  restoreCastleDefenders(game);
  for (const [id, key] of [['castle_warm_bidet', 'bidet'], ['castle_dot_mario', 'mario'],
    ['castle_guard_gyeongsub', 'gyeongsub'], ['castle_guard_ppaman', 'ppaman']]) {
    const actor = game.entities.find(entity => entity.id === id);
    assert.deepEqual([actor.x, actor.y], def.meta.stage[`fork_${key}_guard`]);
    assert.equal(actor.visible, true);
    assert.equal(actor.facing, 'up');
  }
});
