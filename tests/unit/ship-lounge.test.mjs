import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { shipLoungeScripts } from '../../src/data/cutscenes/ship_lounge.js';

const mapPath = 'assets/maps/ship_lounge.json';
test('ship lounge provides a tall room after the control-room ending', () => {
  assert.ok(fs.existsSync(mapPath), 'the lounge map must exist');
  const m = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  assert.equal(m.id, 'ship_lounge');
  assert.equal(m.stage, 'ship_ending_done');
  assert.equal(m.bgm, 'ship_lounge');
  assert.ok(m.rows.length > m.rows[0].length);
  assert.ok(m.rows[0].length >= 20 && m.rows[0].length <= 28);
});

test('test_ship_lounge_npcs_respond_without_repositioning', () => {
  const m = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  for (const npc of m.entities.filter(entity => entity.type === 'npc')) {
    const script = shipLoungeScripts[npc.script];
    assert.ok(script[0].text || script[0].hop, `${npc.id} responds immediately`);
    assert.ok(script.every(node => !node.move && !node.parallel && !node.wait && !node.action && !node.regroup), npc.id);
  }
  const mario = shipLoungeScripts.ship_lounge_mini_mario;
  const hops = mario.filter(node => node.hop === 'lounge_mini_mario');
  assert.equal(hops.length, 1, 'C answers with exactly one hop and nothing else');
  assert.ok(mario.every(node => !node.text && !node.chat && !node.move && !node.remove), 'no dialogue and no walking');
  const [dx, dy] = hops[0].by || [0, 0];
  assert.equal(Math.abs(dx) + Math.abs(dy), 0, 'the hop lands where it started');
  assert.ok((hops[0].height ?? 0) > 0, 'the hop rises far enough to see');
});

test('test_ship_lounge_reuses_approved_scale_and_seating_without_cactus', () => {
  const m = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const prior = JSON.parse(fs.readFileSync('assets/maps/youngcle6.json', 'utf8'));
  const park = m.entities.find(entity => entity.id === 'lounge_park_guardian');
  assert.equal(park.visualScale, prior.entities.find(entity => entity.sprite === 'park_guardian_costume').visualScale);
  assert.ok(m.entities.every(entity => entity.image !== 'assets/props/plant.png'));
  assert.equal(m.entities.filter(entity => entity.image === 'assets/props/backstage_couch.png').length, 4);
  const backstage = JSON.parse(fs.readFileSync('assets/maps/youngcle12.json', 'utf8'));
  assert.equal(m.entities.find(entity => entity.id === 'lounge_ttuulla').visualScale,
    backstage.entities.find(entity => entity.id === 'ttuulla_back').visualScale);
});

test('test_ship_lounge_main_aisle_stays_clear_until_staged_castle_approach', () => {
  const m = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const blockers = m.entities.filter(e => e.solid !== false && ['prop', 'npc'].includes(e.type));
  for (let y = 432; y <= m.spawns.from_control.y; y += 16) {
    assert.ok('/:;'.includes(m.rows[Math.floor(y / 32)][11]));
    assert.ok(!blockers.some(e => 352 < e.x + (e.w || 24) && 416 > e.x && y < e.y + (e.h || 16) && y + 16 > e.y), `aisle obstructed at ${y}`);
  }
  const door = m.entities.find(e => e.id === 'ship_lounge_grand_door');
  assert.equal(door.x + door.w / 2, m.rows[0].length * 16);
  assert.ok(door.y < 224);
  assert.equal(door.script, 'ship_lounge_door');
  assert.equal(m.entities.filter(e => e.type === 'door').length, 0, 'both entrance and locked door require deliberate C interaction');
  const trio = ['lounge_youngcle', 'lounge_junhee', 'lounge_yongjun'].map(id => m.entities.find(entity => entity.id === id));
  assert.ok(trio.every(entity => entity.y < 300));
  assert.ok(trio.some(entity => entity.x >= 352 && entity.x < 416));
});

test('test_ship_lounge_back_wall_is_mirrored_and_never_blocks_the_top_row', () => {
  const m = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const wall = m.entities.filter(e => e.type === 'prop' && e.iy < 200 && e.iy + 24 < e.y + e.h);
  const centres = wall.map(e => e.ix + { 'ship_lounge_grand_door': 80, 'ship_lounge_window_0': 48, 'ship_lounge_window_1': 48, 'lounge_conduit_0': 49, 'lounge_conduit_1': 49 }[e.id]).sort((a, b) => a - b);
  assert.equal(centres.length, 5, 'door, two windows and two plasma conduits decorate the back wall');
  centres.forEach((c, i) => assert.equal(c + centres[centres.length - 1 - i], m.rows[0].length * 32, `wall prop ${i} is mirrored`));
  for (const id of ['ship_lounge_window_0', 'ship_lounge_window_1']) {
    const w = m.entities.find(e => e.id === id);
    assert.equal(w.solid, false, `${id} must not block the walkable row under the wall`);
    assert.ok(w.y + w.h <= 192, `${id} stays inside the wall band`);
  }
});

test('ship lounge reuses current approved NPC identities and a healing spring', () => {
  const m = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const npc = id => m.entities.find(e => e.id === id);
  assert.equal(npc('lounge_naram').sprite, 'naram_giant');
  assert.equal(npc('lounge_obangsun').sprite, 'obangsun');
  assert.equal(npc('lounge_youngcle').sprite, 'youngcle');
  for (const id of ['lounge_junhee', 'lounge_yongjun', 'lounge_youngcle']) assert.equal(npc(id).requires, 'ship_ending_done');
  assert.equal(npc('ship_lounge_spring').script, 'ship_lounge_spring');
  assert.equal(npc('ship_lounge_ladder').script, 'ship_lounge_return');
  assert.ok(m.entities.filter(e => e.type === 'npc' && e.script).length >= 8);
});

test('ship lounge spring restores each current party member without spending inventory', () => {
  const game = { party: ['gyeongsub', 'ppaman'], partyHp: { hyungsub: 1, gyeongsub: 0, ppaman: 23 },
    maxHpOf: id => ({ hyungsub: 100, gyeongsub: 120, ppaman: 90 })[id], inventory: ['key'] };
  for (const node of shipLoungeScripts.ship_lounge_spring) node.action?.(game);
  assert.deepEqual(game.partyHp, { hyungsub: 100, gyeongsub: 120, ppaman: 90 });
  assert.deepEqual(game.inventory, ['key']);
});

test('ship lounge return requires yes and cancellation has no transition', () => {
  const script = shipLoungeScripts.ship_lounge_return;
  const choice = script.find(n => n.choice).choice;
  const no = script.findIndex(n => n.label === choice.options[choice.cancel].goto);
  assert.equal(choice.cancel, 1);
  assert.ok(script.slice(no).every(n => !n.map && !n.action));
  assert.equal(script.find(n => n.map)?.map, 'youngcle20');
  assert.equal(script.find(n => n.map)?.spawn, 'from_lounge');
  assert.ok(!shipLoungeScripts.ship_lounge_door.some(n => n.action || n.map || n.set));
});
