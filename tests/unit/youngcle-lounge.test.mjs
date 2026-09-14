import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { QA_POINTS, stateFromFlags } from '../../src/core/story.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

test('test_lounge_is_reached_through_cat_corridor_and_returns_outside_portal', () => {
  // Given the final puzzle's original gate and landing.
  const puzzle = readMap('youngcle5');
  const gate = puzzle.entities.find(entity => entity.type === 'factory_gate');
  // When the player walks to the end of that landing.
  const exit = puzzle.entities.find(entity => entity.id === 'youngcle5_right');
  // Then the open passage leads to the lounge without bypassing the gate.
  assert.equal(exit?.to, 'youngcle_cats');
  assert.ok(exit.x > gate.x + gate.w);
  assert.equal(exit.interact, false);
  assert.equal(exit.sfx, false);
  const corridor = readMap(exit.to);
  const back = corridor.entities.find(entity => entity.to === 'youngcle5');
  assert.deepEqual([back.to, back.spawn, back.interact, back.sfx], ['youngcle5', 'landing', false, false]);
  const returned = puzzle.spawns[back.spawn];
  assert.ok(returned.x + 24 <= exit.x);
  const arrived = corridor.spawns[exit.spawn];
  assert.ok(arrived.x >= back.x + back.w + 24);
  const loungeExit = corridor.entities.find(entity => entity.to === 'youngcle6');
  const lounge = readMap(loungeExit.to);
  const loungeBack = lounge.entities.find(entity => entity.type === 'door');
  assert.deepEqual([loungeBack.to, loungeBack.spawn, loungeBack.interact, loungeBack.sfx],
    ['youngcle_cats', 'right', false, false]);
  assert.ok(corridor.spawns.right.x + 24 <= loungeExit.x);
  assert.ok(lounge.spawns[loungeExit.spawn].x >= loungeBack.x + loungeBack.w + 24);
});

test('test_lounge_qa_inherits_all_completed_puzzles_and_previous_party_upgrades', () => {
  // Given the last puzzle QA checkpoint.
  const prior = QA_POINTS.find(point => point.id === 'youngcle5');
  // When selecting the lounge checkpoint immediately before Plan B.
  const points = QA_POINTS.filter(point => point.id === 'youngcle6');
  // Then prior story, inventory derivation and completed puzzle flags survive.
  assert.equal(points.length, 1);
  const lounge = points[0];
  for (const [flag, value] of Object.entries(prior.flags)) assert.equal(lounge.flags[flag], value, flag);
  for (const flag of ['youngcle3_crate_solved', 'youngcle4_circuit_solved', 'youngcle5_crate_solved']) {
    assert.equal(lounge.flags[flag], true, flag);
  }
  assert.deepEqual(lounge.party, ['gyeongsub', 'ppaman']);
  const state = stateFromFlags(lounge.flags);
  assert.equal(state.attack, 3);
  assert.equal(state.hpBonus, 40);
});

test('test_lounge_keeps_compact_iron_room_center_tv_and_hides_idle_npcs_for_plan_b', () => {
  // Given the registered lounge map.
  const registered = JSON.parse(fs.readFileSync('assets/maps/index.json', 'utf8')).maps;
  assert.ok(registered.includes('youngcle6'));
  const room = readMap('youngcle6');
  // When reading its visible room composition.
  const tv = room.entities.find(entity => entity.id === 'youngcle_tv');
  const gallery = room.entities.filter(entity => ['warm_bidet', 'mini_mario', 'lucky_guy', 'park_guardian_costume'].includes(entity.id));
  // Then it uses the current ship materials and leaves the center stage clear.
  assert.deepEqual([room.rows[0].length * 32, room.rows.length * 32], [640, 448]);
  assert.ok(room.rows.every(row => [...row].every(tile => ['I', 'J'].includes(tile))));
  assert.equal(room.bgm, 'youngcle_factory');
  assert.equal(tv.image, 'assets/props/youngcle_tv_frame.png');
  assert.equal(tv.x + tv.w / 2, 320);
  assert.deepEqual(gallery.map(npc => npc.sprite).sort(), ['warm_bidet', 'mini_mario', 'lucky_guy', 'park_guardian_costume'].sort());
  assert.ok(gallery.every(npc => npc.hidden && !npc.solid && !npc.script && npc.wander === 0));
  assert.deepEqual(room.enter, { script: 'youngcle_lounge_plan_b', early: true });
  assert.ok(room.entities.every(entity => !['trigger', 'enemy'].includes(entity.type)));
  const stage = Object.values(room.meta.stage);
  assert.equal(stage.length, 5);
  for (const [x, y] of stage) {
    assert.ok(gallery.every(npc => Math.hypot(npc.x - x, npc.y - y) >= 64));
  }
});
