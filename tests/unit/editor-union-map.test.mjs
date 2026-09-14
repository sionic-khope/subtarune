import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { QA_POINTS, stateFromFlags } from '../../src/core/story.js';
import { Entity, NPC, Player } from '../../src/world/world.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + 24 > b.x && a.y < b.y + b.h && a.y + 16 > b.y;

test('test_stage_battle_ready_spawn_reaches_waiting_park_with_the_actual_C_probe', () => {
  const map = readMap('youngcle7');
  const game = { entities: [] };
  const target = Object.assign(Object.create(NPC.prototype), new Entity(map.entities.find(entity => entity.id === 'park_guardian_ready'), game));
  const player = Object.assign(Object.create(Player.prototype), new Entity(map.spawns.battle_ready, game));
  game.entities = [target];
  assert.equal(player.overlaps(target.rect), false, 'spawn keeps the player collision box outside the NPC');
  assert.equal(player.probe(), target, 'C at the dedicated QA spawn must reach Park without another movement');
});

test('test_stage_entry_is_silent_and_center_trigger_is_separate_from_spawn', () => {
  const map = readMap('youngcle7');
  const trigger = map.entities.find(entity => entity.script === 'editor_union_stage');
  assert.equal(map.bgm, null);
  assert.equal(map.enter, undefined);
  assert.ok(map.dim >= 0.6);
  assert.ok([...map.rows.join('')].every(tile => 'IJ'.includes(tile)));
  assert.equal(trigger.unless, 'editor_union_stage_done');
  assert.equal(trigger.flag, undefined);
  for (const spawn of Object.values(map.spawns)) assert.equal(overlaps(spawn, trigger), false);
  assert.ok(trigger.x - map.spawns.start.x >= 320);
});

test('test_stage_closed_lounge_door_and_open_return_follow_visual_input_rules', () => {
  const lounge = readMap('youngcle6');
  const stage = readMap('youngcle7');
  const entry = lounge.entities.find(entity => entity.to === stage.id);
  const exit = stage.entities.find(entity => entity.to === lounge.id);
  assert.equal(entry.interact, true);
  assert.equal(entry.sfx, 'plug');
  assert.equal(entry.requires, 'youngcle_lounge_plan_b_done');
  assert.equal(exit.interact, false);
  assert.equal(exit.sfx, false);
  assert.ok(stage.spawns[entry.spawn]);
  assert.ok(lounge.spawns[exit.spawn]);
  assert.equal(overlaps(stage.spawns[entry.spawn], exit), false);
  assert.equal(overlaps(lounge.spawns[exit.spawn], entry), false);
});

test('test_stage_cast_is_hidden_before_entrances_and_only_park_remains_after', () => {
  const map = readMap('youngcle7');
  const cast = map.entities.filter(entity => entity.type === 'npc');
  const intro = cast.filter(entity => entity.unless === 'editor_union_stage_done');
  assert.deepEqual(intro.map(entity => entity.id), ['park_guardian_costume', 'warm_bidet', 'ttuulla', 'mini_mario']);
  assert.ok(intro.every(entity => entity.hidden && entity.solid === false));
  const after = cast.filter(entity => entity.requires === 'editor_union_stage_done');
  assert.equal(after.length, 1);
  assert.equal(after[0].sprite, 'park_guardian_costume');
  assert.equal(after[0].hidden, undefined);
  assert.equal(after[0].script, 'editor_union_stage_wait');
  assert.equal(after[0].unless, 'park_guardian_won');
  const defeated = cast.find(entity => entity.requires === 'park_guardian_won');
  assert.equal(defeated.sprite, 'park_guardian');
  assert.equal(defeated.script, undefined);
  assert.equal(map.entities.some(entity => entity.type === 'enemy'), false);
  assert.equal(map.entities.filter(entity => entity.type === 'door').length, 1);
  const audience = map.entities.find(entity => entity.id === 'stage_audience');
  assert.equal(audience.hidden, undefined, 'seated crowd exists before the introduction');
  assert.equal(audience.unless, undefined, 'completion never removes the seated crowd');
  assert.equal(audience.requires, undefined);
  assert.equal(map.entities.filter(entity => entity.image === audience.image).length, 1);
});

test('test_stage_qa_inherits_plan_b_party_and_permanent_upgrades_before_battle', () => {
  const prior = QA_POINTS.find(point => point.id === 'youngcle6_after_plan_b');
  const before = QA_POINTS.find(point => point.id === 'youngcle7');
  const after = QA_POINTS.find(point => point.id === 'youngcle7_after_intro');
  assert.ok(before && after);
  for (const point of [before, after]) {
    for (const [flag, value] of Object.entries(prior.flags)) assert.equal(point.flags[flag], value);
    assert.deepEqual(point.party, ['gyeongsub', 'ppaman']);
    assert.equal(stateFromFlags(point.flags).attack, 3);
    assert.equal(stateFromFlags(point.flags).hpBonus, 40);
    assert.equal(point.map, 'youngcle7');
  }
  assert.equal(before.flags.editor_union_stage_done, undefined);
  assert.equal(after.flags.editor_union_stage_done, true);
  const battle = QA_POINTS.find(point => point.id === 'park_guardian_battle');
  assert.deepEqual(battle.flags, after.flags);
  assert.equal(battle.spawn, 'battle_ready');
  assert.deepEqual(battle.party, ['gyeongsub', 'ppaman']);
});

test('test_stage_editors_have_visible_iron_passages_without_crossing_audience_or_walls', () => {
  const map = readMap('youngcle7');
  const tile = (x, y) => map.rows[Math.floor(y / 32)]?.[Math.floor(x / 32)];
  for (let x = 976; x <= 1144; x += 8) {
    assert.equal(tile(x, 480), 'I');
    assert.equal(tile(x + 23, 495), 'I');
  }
  for (let y = 40; y <= 448; y += 8) {
    assert.equal(tile(964, y), 'I');
    assert.equal(tile(987, y + 15), 'I');
  }
  const audience = map.entities.find(entity => entity.id === 'stage_audience');
  assert.ok(audience.x + audience.w <= 928);
  for (const entity of map.entities.filter(entity => entity.sprite === 'park_guardian_costume'))
    assert.equal(entity.visualScale, 2.66);
});

test('test_stage_perimeter_equipment_leaves_actors_and_both_exit_passages_clear', () => {
  const map = readMap('youngcle7');
  const props = map.entities.filter(entity => entity.id?.startsWith('stage_decor_'));
  assert.ok(props.length >= 8);
  for (const prop of props) {
    assert.equal(prop.type, 'prop');
    assert.equal(prop.solid, false);
    assert.equal(prop.script, undefined);
    assert.ok(prop.x >= 0 && prop.y >= 0);
    assert.ok(prop.x + prop.w <= map.rows[0].length * 32 && prop.y + prop.h <= map.rows.length * 32);
    for (let row = Math.floor(prop.y / 32); row <= Math.floor((prop.y + prop.h - 1) / 32); row++) {
      for (let col = Math.floor(prop.x / 32); col <= Math.floor((prop.x + prop.w - 1) / 32); col++)
        assert.equal(map.rows[row][col], 'J', `${prop.id} covers walkable floor`);
    }
  }
});
