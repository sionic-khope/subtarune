import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createEntity, Entity, Player, TileMap } from '../../src/world/world.js';
import { QA_POINTS, stateFromFlags } from '../../src/core/story.js';
import { SCRIPTS } from '../../src/data/scripts.js';

const readMap = () => JSON.parse(fs.readFileSync('assets/maps/youngcle_cats.json', 'utf8'));
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
before(() => {
  globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() {} }) }) };
});
after(() => {
  if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
  else delete globalThis.document;
});

test('test_cats_corridor_reuses_factory_materials_with_two_separate_encounters', () => {
  const map = readMap();
  const enemies = map.entities.filter(entity => entity.type === 'enemy');
  assert.deepEqual(enemies.map(({ id, sprite, enemies, unless }) => ({ id, sprite, enemies, unless })), [
    { id: 'seopnyang', sprite: 'seopnyang', enemies: ['seopnyang'], unless: 'youngcle_cats_seopnyang_defeated' },
    { id: 'gyeongnyang', sprite: 'gyeongnyang', enemies: ['gyeongnyang'], unless: 'youngcle_cats_gyeongnyang_defeated' },
  ]);
  assert.ok(enemies[0].x < enemies[1].x);
  assert.equal(map.bgm, 'youngcle_factory');
  assert.equal(map.backdrop, 'youngcle_factory');
  assert.ok([...map.rows.join('')].every(tile => ['I', 'J', '!'].includes(tile)));
  assert.ok(map.rows[0].length * 32 >= 960 && map.rows[0].length * 32 <= 1152);
  assert.equal(map.entities.some(entity => entity.type === 'trigger'), false);
});

test('test_cats_entry_and_return_stay_outside_enemy_patrol_detection', () => {
  const map = readMap();
  const enemies = map.entities.filter(entity => entity.type === 'enemy');
  for (const spawn of Object.values(map.spawns)) {
    for (const enemy of enemies) {
      const dx = Math.max(0, Math.abs(enemy.x - spawn.x) - enemy.wander * 2);
      const dy = Math.max(0, Math.abs(enemy.y - spawn.y) - enemy.wander * 2);
      assert.ok(Math.hypot(dx, dy) > enemy.chase);
    }
  }
});

test('test_cats_spring_is_reachable_and_repeats_immediate_party_healing', () => {
  const map = readMap();
  const springs = map.entities.filter(entity => entity.script === 'maillard_spring');
  assert.equal(springs.length, 1);
  const spring = springs[0];
  assert.equal(spring.image, 'assets/props/blue_buff.png');
  assert.deepEqual(spring.anim, { cols: 3, fps: 4 });
  const game = { map: new TileMap(map), entities: [], propImages: {}, party: ['gyeongsub', 'ppaman'],
    partyHp: {}, maxHpOf: id => id === 'ppaman' ? 180 : 140 };
  game.entities = [createEntity(spring, game)];
  const player = new Entity({ x: spring.x + 4, y: spring.y + spring.h + 4, facing: 'up' }, game);
  assert.equal(Player.prototype.probe.call(player)?.id, spring.id);
  for (let attempt = 0; attempt < 2; attempt++) {
    game.partyHp = { hyungsub: 1, gyeongsub: 0, ppaman: 3 };
    for (const node of SCRIPTS[spring.script]) {
      if (node.text) break;
      node.action?.(game);
    }
    assert.deepEqual(game.partyHp, { hyungsub: 140, gyeongsub: 140, ppaman: 180 });
  }
});

test('test_cats_use_real_enemy_chase_and_contact_and_pause_during_transition', () => {
  const map = readMap();
  for (const definition of map.entities.filter(entity => entity.type === 'enemy')) {
    const encounters = [];
    const game = { map: new TileMap(map), entities: [], dialogue: { running: false },
      spriteOverrides: { [definition.sprite]: { width: 64, height: 64 } },
      transitioning: false, startEncounter: enemy => encounters.push(enemy.id) };
    const enemy = createEntity(definition, game);
    game.entities.push(enemy);
    game.player = new Entity({ x: enemy.x + 70, y: enemy.y + 35, w: 24, h: 16 }, game);
    const initialX = enemy.x;
    game.transitioning = true;
    enemy.update(0.1);
    assert.equal(enemy.x, initialX);
    assert.deepEqual(encounters, []);
    game.transitioning = false;
    enemy.update(0.1);
    assert.ok(enemy.x > initialX);
    assert.deepEqual(encounters, []);
    for (let frame = 0; frame < 60 && encounters.length === 0; frame++) enemy.update(1 / 60);
    assert.deepEqual(encounters, [definition.id]);
  }
});

test('test_cats_qa_inherits_puzzles_party_and_permanent_shop_bonuses', () => {
  const prior = QA_POINTS.find(point => point.id === 'youngcle5');
  const points = QA_POINTS.filter(point => point.map === 'youngcle_cats');
  assert.equal(points.length, 1);
  const point = points[0];
  for (const [flag, value] of Object.entries(prior.flags)) assert.equal(point.flags[flag], value);
  assert.equal(point.flags.youngcle5_crate_solved, true);
  assert.deepEqual(point.party, ['gyeongsub', 'ppaman']);
  assert.equal(stateFromFlags(point.flags).attack, 3);
  assert.equal(stateFromFlags(point.flags).hpBonus, 40);
  assert.equal(point.flags.youngcle_cats_seopnyang_defeated, undefined);
  assert.equal(point.flags.youngcle_cats_gyeongnyang_defeated, undefined);
  const lounge = QA_POINTS.find(point => point.id === 'youngcle6');
  for (const [flag, value] of Object.entries(point.flags)) assert.equal(lounge.flags[flag], value);
});
