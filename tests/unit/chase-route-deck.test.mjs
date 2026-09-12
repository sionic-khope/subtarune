import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as story from '../../src/core/story.js';
import { Door } from '../../src/world/world.js';

test('pursuit only permits forward object-region exits while Yongjun is abducted', () => {
  const flags = { obj4_abduction_done: true };
  assert.equal(typeof story.storyExitScript, 'function');
  for (const [from, to] of [['obj4', 'obj3'], ['obj3', 'obj2'], ['obj2', 'obj5']]) {
    assert.equal(story.storyExitScript(from, to, flags), undefined);
  }
  for (const [from, to] of [['obj3', 'obj4'], ['obj2', 'obj3'], ['obj2', 'obj1'], ['obj5', 'obj2']]) {
    assert.equal(story.storyExitScript(from, to, flags), 'chase_route_block');
  }
  assert.equal(story.storyExitScript('obj2', 'obj1', {}), undefined);
  assert.equal(story.storyExitScript('obj2', 'obj1', { ...flags, obj5_maillard_done: true }), undefined);
  assert.equal(story.storyExitScript('teal2', 'teal1', flags), undefined);
});

test('blocked pursuit door speaks once per entry without changing map or music', () => {
  const calls = [];
  const game = {
    mapId: 'obj2', flags: { obj4_abduction_done: true }, transitioning: false,
    player: { overlaps: () => true }, dialogue: { running: false },
    has(flag) { return this.flags[flag]; },
    sound: { sfx: () => calls.push('sound') },
    changeMap: () => calls.push('map'),
    runScript: (name, done) => { calls.push(name); done(); },
  };
  const door = new Door({ x: 0, y: 0, to: 'obj1', sfx: false }, game);
  door.update(.016);
  for (let frame = 0; frame < 120; frame++) door.update(.016);
  assert.deepEqual(calls, ['chase_route_block']);
  game.player.overlaps = () => false;
  door.update(.4);
  game.player.overlaps = () => true;
  door.update(.016);
  assert.deepEqual(calls, ['chase_route_block', 'chase_route_block']);
});

test('Maillard deck checkpoint preserves the sea victory inventory and party', () => {
  const before = story.QA_POINTS.find(point => point.id === 'obj5_after');
  const after = story.QA_POINTS.find(point => point.id === 'maillard_deck');
  assert.ok(after);
  assert.equal(after.flags.obj5_maillard_done, true);
  assert.equal(before.flags.obj5_maillard_done, undefined);
  assert.deepEqual(story.stateFromFlags(after.flags), story.stateFromFlags(before.flags));
  assert.deepEqual(after.party, before.party);
  const map = JSON.parse(fs.readFileSync('assets/maps/maillard_deck.json', 'utf8'));
  assert.equal(map.backdrop, undefined);
  assert.equal(map.bgm, 'wind');
  assert.equal(map.enter.flag, 'maillard_hold_done');
  assert.ok(map.spawns[after.spawn]);
  assert.ok(map.entities.some(entity => entity.id === 'hold_stairs'));
});
