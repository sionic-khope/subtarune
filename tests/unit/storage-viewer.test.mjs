import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { maillard_storage_enter } from '../../src/data/cutscenes/maillard_rooms.js';
import { storage_viewer } from '../../src/data/cutscenes/storage_viewer.js';
import { loopCharacterMotion, updateLoopCharacterMotion } from '../../src/world/character-motion.js';
import { makeWaiter } from '../../src/ui/cutscene.js';

test('storage consent appears only after all warning pages and rejects with X', () => {
  const choiceIndex = maillard_storage_enter.findIndex(n => n.choice);
  assert.ok(choiceIndex >= 3);
  const choice = maillard_storage_enter[choiceIndex].choice;
  assert.deepEqual(choice.options.map(o => o.label), ['네', '아니오']);
  assert.equal(choice.cancel, 1);
  assert.equal(choice.options[1].goto, 'end');
});

test('completed intro jumps to real battle while victory is a separate flag', () => {
  const branch = storage_viewer[1];
  assert.equal(branch.if({ storage_viewer_intro_seen: true }), true);
  assert.equal(branch.if({}), undefined);
  const destination = storage_viewer.findIndex(n => n.label === branch.goto);
  assert.equal(storage_viewer[destination - 1].set.storage_viewer_intro_seen, true);
  assert.equal(storage_viewer.filter(n => n.battle).length, 1);
  assert.equal(storage_viewer.find(n => n.battle).battle.flag, 'storage_viewer_defeated');
  assert.deepEqual(storage_viewer.filter(n => n.set).map(n => n.set), [{ storage_viewer_intro_seen: true }]);
});

test('looping visual motion advances repeatedly without changing actor position', () => {
  const actor = { x: 4, y: 5 };
  loopCharacterMotion(actor, { frames: [{ duration: 0.1 }, { duration: 0.1 }] }, { flipEvery: 0.2, pop: 4 });
  updateLoopCharacterMotion(actor, 0.15);
  assert.equal(actor.motion.index, 1);
  updateLoopCharacterMotion(actor, 0.1);
  assert.equal(actor.motion.index, 0);
  assert.deepEqual([actor.x, actor.y], [4, 5]);
});

test('unavailable optional loop image leaves static sprite usable', () => {
  const actor = { motion: { frames: [] } };
  loopCharacterMotion(actor, undefined);
  assert.equal(actor.motion, null);
});

test('defeated viewer does not start another encounter', () => {
  const branch = storage_viewer[0];
  assert.equal(branch.if({ storage_viewer_defeated: true }), true);
  assert.equal(branch.goto, 'end');
});

test('red kick stamp is a timed world emote rather than a dialogue line', () => {
  const actor = { id: 'expelled_viewer' }, sounds = [];
  const node = storage_viewer.flatMap(n => n.parallel || []).find(n => n.kind === 'stamp');
  const waiter = makeWaiter({ entities: [actor], sound: { sfx: id => sounds.push(id) } }, node);
  assert.equal(node.text, undefined);
  assert.equal(actor.emote.text, '강퇴!');
  assert.equal(actor.emote.color, '#ff2929');
  assert.deepEqual(sounds, ['thud']);
  assert.equal(waiter.update(1.2), true);
});

test('storage NPC starts crouched away from the player without forced facing', () => {
  const map = JSON.parse(fs.readFileSync('assets/maps/maillard_storage.json', 'utf8'));
  const actor = map.entities.find(e => e.id === 'expelled_viewer');
  assert.ok(actor);
  assert.equal(actor.facing, 'up');
  assert.equal(actor.faceOnInteract, false);
  assert.equal(actor.idleMotion, 'crouch');
  assert.equal(actor.script, 'storage_viewer');
});
