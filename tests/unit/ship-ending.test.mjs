import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { storyBgm, QA_POINTS } from '../../src/core/story.js';
import { makeWaiter } from '../../src/ui/cutscene.js';
import { drawShipHatch } from '../../src/world/ship-hatch.js';

test('victory ending and persistent hatch are registered separately from first aftermath', () => {
  assert.ok(SCRIPTS.ship_tvform_ending);
  assert.ok(SCRIPTS.ship_manhole);
  const map = JSON.parse(fs.readFileSync('assets/maps/youngcle20.json', 'utf8'));
  const hatch = map.entities.find(e => e.id === 'ship_logo');
  assert.equal(hatch.image, 'assets/props/ship_floor_logo.png');
  assert.equal(hatch.script, 'ship_manhole');
  assert.equal(hatch.shipHatch, 'ship_manhole_open');
  assert.deepEqual(map.spawns.from_lounge, { x: 468, y: 384, facing: 'down' });
});

test('post-victory control room is silent instead of restoring transformed boss music', () => {
  assert.equal(storyBgm('youngcle20', { ship_aftermath_done: true }), 'captain_mankatsuki');
  assert.equal(storyBgm('youngcle20', { ship_aftermath_done: true, ship_tvform_won: true }), null);
  assert.equal(storyBgm('youngcle20', { ship_ending_done: true }), null);
  assert.ok(QA_POINTS.some(q => q.id === 'ship_ending' && q.flags.ship_tvform_won));
});

test('hatch descent keeps collision feet fixed and progressively clips visible actor', () => {
  const actor = { id: 'junhee', x: 468, y: 286, w: 24, h: 16, visible: true, animate() {} };
  const hatch = { id: 'ship_logo', x: 416, y: 236, w: 128, h: 128, def: {} };
  const sounds = [];
  const game = { entities: [actor, hatch], sound: { sfx: n => sounds.push(n) } };
  const waiter = makeWaiter(game, { shipHatch: { actor: 'junhee', hatch: 'ship_logo', duration: 1.2 } });
  assert.ok(waiter);
  assert.equal(waiter.update(0.6), false);
  assert.deepEqual([actor.x, actor.y], [468, 286]);
  assert.equal(actor.visible, true);
  assert.ok(actor.doorTransit.offsetY > 30);
  assert.equal(actor.doorTransit.clip[1] + actor.doorTransit.clip[3], 326);
  assert.equal(waiter.update(0.6), true);
  assert.equal(actor.visible, false);
  assert.equal(actor.doorTransit, null);
  assert.deepEqual(sounds, ['iron_step_1']);
});

test('hatch moves the original lid and persists open only after its completed motion', () => {
  const calls = [], flags = {}, sounds = [];
  const game = { flags, sound: { sfx: n => sounds.push(n) }, setFlag: key => { flags[key] = true; } };
  const hatch = { id: 'ship_logo', x: 416, y: 236, drawX: 416, drawY: 236, game, def: { shipHatch: 'ship_manhole_open' }, image: { id: 'originalFace' } };
  game.entities = [hatch];
  const ctx = { save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, clip() {}, fill() {}, fillRect() {}, drawImage: (...args) => calls.push(args) };
  drawShipHatch(ctx, hatch, { x: 0, y: 0 });
  assert.deepEqual(calls.at(-1), [hatch.image, 416, 236, 128, 128]);
  const waiter = makeWaiter(game, { shipHatch: { hatch: 'ship_logo', duration: 1.2 } });
  waiter.update(0.6);
  assert.equal(flags.ship_manhole_open, undefined);
  drawShipHatch(ctx, hatch, { x: 0, y: 0 });
  assert.deepEqual(calls.at(-1), [hatch.image, 416, 180, 128, 128]);
  assert.equal(waiter.update(0.6), true);
  assert.equal(flags.ship_manhole_open, true);
  delete hatch.hatchProgress;
  drawShipHatch(ctx, hatch, { x: 0, y: 0 });
  assert.deepEqual(calls.at(-1), [hatch.image, 416, 124, 128, 128]);
  assert.deepEqual(sounds, ['scrape', 'locker']);
});

test('only the won branch queues ending from natural and QA battles', () => {
  for (const name of ['ship_control_intro', 'ship_tvform_battle_qa']) {
    const script = SCRIPTS[name];
    const battleAt = script.findIndex(node => node.battle?.enemies.includes('youngcle_tvform'));
    assert.equal(script[battleAt].battle.flag, 'ship_tvform_won');
    const branch = script[battleAt + 1];
    assert.equal(branch.if({}), undefined);
    assert.equal(branch.if({ ship_tvform_won: true }), true);
    assert.equal(branch.goto, 'tvending');
  }
});
