import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TileMap, Camera, Entity } from '../../src/world/world.js';
import { makeWaiter } from '../../src/ui/cutscene.js';
import { maillard_boarding_intro, youngcle_entrance } from '../../src/data/cutscenes/maillard_boarding.js';
import { maillard_spring } from '../../src/data/cutscenes/maillard_lounge.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

test('starboard spring reuses instant repeatable healing without moving the party', () => {
  const spring = readMap('maillard_starboard').entities.find(entity => entity.id === 'starboard_spring');
  assert.equal(spring.script, 'maillard_spring');
  assert.ok(spring.x > 700 && spring.x < 820);
  assert.equal(spring.once, undefined);
  const game = { party: ['gyeongsub', 'ppaman'], partyHp: {}, maxHpOf: () => 140 };
  for (let repeat = 0; repeat < 2; repeat++) {
    game.partyHp = { hyungsub: 1, gyeongsub: 2, ppaman: 3 };
    maillard_spring.find(node => node.action).action(game);
    assert.deepEqual(game.partyHp, { hyungsub: 140, gyeongsub: 140, ppaman: 140 });
  }
  assert.equal(maillard_spring.some(node => node.move || node.regroup), false);
});

test('boarding keeps a square wooden deck with the same risen sea and iron exit', () => {
  const data = readMap('maillard_boarding');
  assert.equal(data.backdrop, 'maillard_sunrise');
  assert.equal(data.sunrise.animated, false);
  assert.deepEqual(data.enter, { script: 'maillard_boarding_intro' });
  for (let row = 7; row < 19; row++) assert.equal(data.rows[row].slice(6, 18), 'M'.repeat(12));
  assert.equal(data.rows[13].slice(18), 'IIIJ');
  assert.equal(data.entities.filter(entity => entity.type === 'npc').length, 2);
  assert.ok(data.entities.filter(entity => entity.type === 'npc').every(entity => entity.unless === 'maillard_boarding_departed'));
});

test('bridge walk lasts about five seconds and reaches the ship interior door', () => {
  const data = readMap('youngcle_bridge');
  const map = new TileMap(data);
  const entry = data.entities.find(entity => entity.id === 'youngcle_entrance');
  const travel = (entry.x - 24 - 19.2 - data.spawns.start.x) / (32 * 3.9 * 1.75);
  assert.ok(travel >= 4.7 && travel <= 5.2, `${travel}s normal movement`);
  for (let x = 32; x <= 1280; x += 8) assert.equal(map.solidRect(x, 416, 24, 16), false);
  assert.equal(entry.solid, false);
  assert.equal(entry.type, 'door');
  assert.equal(entry.to, 'youngcle1');
  assert.equal(entry.spawn, 'from_bridge');
  assert.equal(entry.interact, true);
  assert.deepEqual(youngcle_entrance.map(node => node.text), ['* 철 전함의 입구다.']);
  assert.deepEqual(data.entities.filter(entity => entity.to).map(entity => entity.to), ['maillard_boarding', 'youngcle1']);
  assert.equal(data.enter, undefined);
});

test('integrated ship hull keeps its gangway walkable and confines the bridge endpoint', () => {
  const data = readMap('youngcle_bridge');
  const map = new TileMap(data);
  const hull = data.entities.find(entity => entity.id === 'youngcle_entrance_image');
  assert.equal(hull.image, 'assets/props/youngcle_hull_entry.png');
  assert.deepEqual([hull.x, hull.y, hull.w, hull.h], [976, -32, 896, 717]);
  assert.ok(hull.x + hull.w > map.pxW && hull.y + hull.h > map.pxH);
  assert.equal(data.preload.includes(hull.image), true);
  assert.equal(data.preload.includes('assets/props/youngcle_entrance.png'), false);
  assert.equal(data.rows[14].slice(32), '!'.repeat(13));
  const colliders = data.entities.filter(entity => entity.solid === true).map(entity => new Entity(entity, {}));
  const blocked = (x, y) => map.solidRect(x, y, 24, 16)
    || colliders.some(entity => entity.overlaps({ x, y, w: 24, h: 16 }));
  for (let x = 1000; x <= 1352; x += 8) {
    assert.equal(blocked(x, 400), false);
    assert.equal(blocked(x, 416), false);
  }
  assert.equal(blocked(1040, 392), true);
  assert.equal(blocked(1040, 424), true);
  assert.equal(blocked(1360, 416), true);
  const entry = data.entities.find(entity => entity.id === 'youngcle_entrance');
  assert.equal(blocked(entry.x - 32, 416), false);
  assert.equal(new Entity(entry, {}).overlaps({ x: entry.x - 32 + 19.2, y: 416, w: 24, h: 16 }), true);
});

test('boarding cutscene preserves four lines, staggered dash exits and safe party control', t => {
  const warnings = t.mock.method(console, 'warn', () => {});
  const data = readMap('maillard_boarding');
  const game = { flags: {}, map: new TileMap(data), camera: new Camera(), entities: [], sound: { sfx() {} } };
  for (const definition of data.entities) game.entities.push(new Entity(definition, game));
  game.player = new Entity({ id: 'player', ...data.spawns.start, solid: false }, game);
  game.entities.push(game.player);
  for (const [id, x] of [['gyeongsub', 180], ['ppaman', 132]]) game.entities.push(new Entity({ id, x, y: 432, solid: false }, game));
  game.camera.map = game.map;
  game.camera.target = game.player;
  const dialogue = [];
  for (const node of maillard_boarding_intro) {
    if (node.if || node.label || node.end) continue;
    if (node.text) { dialogue.push(node.text); continue; }
    if (node.set) { Object.assign(game.flags, node.set); continue; }
    const waiter = makeWaiter(game, node);
    assert.ok(waiter);
    let ticks = 0;
    while (!waiter.update(1 / 60)) assert.ok(++ticks < 600, 'bounded boarding node');
    for (const move of [node, ...(node.parallel || [])].filter(child => child.rel)) {
      const actor = game.entities.find(entity => entity.id === move.move);
      const expected = { player: [356, 432], gyeongsub: [292, 432], ppaman: [228, 432],
        boarding_junhee: [628, 424], boarding_yongjun: [628, 424] };
      assert.deepEqual([actor.x, actor.y], expected[move.move], 'relative anchor is not displaced by freeSpot');
    }
  }
  assert.deepEqual(dialogue, ['* 철 철다리..?', '* 이 이건 뭐지...? 저 개자식들 내가 가서 족치겠다!',
    '* 혀 혀엉 같이가요!', '* 빨리 쫒아가자 우리도!']);
  for (const id of ['boarding_junhee', 'boarding_yongjun']) {
    const actor = game.entities.find(entity => entity.id === id);
    assert.equal(actor.dead, true);
    assert.equal(actor.x, 776);
    assert.equal(actor.y, 424);
    assert.ok(maillard_boarding_intro.filter(node => node.move === id).every(node => node.dash));
  }
  assert.ok(maillard_boarding_intro.findIndex(node => node.remove === 'boarding_junhee') <
    maillard_boarding_intro.findIndex(node => node.hop === 'boarding_yongjun'));
  assert.equal(game.flags.maillard_boarding_departed, true);
  assert.equal(maillard_boarding_intro[0].if(game.flags), true);
  assert.equal(game.camera.target, game.player);
  for (const id of ['player', 'gyeongsub', 'ppaman']) {
    const actor = game.entities.find(entity => entity.id === id);
    assert.equal(game.map.solidRect(actor.x, actor.y, actor.w, actor.h), false);
    assert.equal(actor.facing, 'right');
  }
  assert.equal(warnings.mock.callCount(), 0);
});
