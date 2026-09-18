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

test('ship lounge keeps the main aisle clear from arrival to the grand door', () => {
  const m = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const blockers = m.entities.filter(e => e.solid !== false && ['prop', 'npc'].includes(e.type));
  for (let y = 224; y <= m.spawns.from_control.y; y += 16) {
    assert.ok('/:;'.includes(m.rows[Math.floor(y / 32)][11]));
    assert.ok(!blockers.some(e => 352 < e.x + (e.w || 24) && 416 > e.x && y < e.y + (e.h || 16) && y + 16 > e.y), `aisle obstructed at ${y}`);
  }
  const door = m.entities.find(e => e.id === 'ship_lounge_grand_door');
  assert.equal(door.x + door.w / 2, m.rows[0].length * 16);
  assert.ok(door.y < 224);
  assert.equal(door.script, 'ship_lounge_door');
  assert.equal(m.entities.filter(e => e.type === 'door').length, 0, 'both entrance and locked door require deliberate C interaction');
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
