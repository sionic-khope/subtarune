import test from 'node:test';
import assert from 'node:assert/strict';
import { editor_union_stage, editor_union_stage_wait } from '../../src/data/cutscenes/editor_union_stage.js';
import { parkStageLight } from '../../src/battle/park-guardian-background.js';
import { BATTLE_BGS } from '../../src/battle/backgrounds.js';
import { Battle } from '../../src/battle/battle.js';
import { makeWaiter } from '../../src/ui/cutscene.js';

function route(nodes, flags) {
  const visited = [];
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    visited.push(node);
    if (node.if?.(flags)) index = nodes.findIndex(next => next.label === node.goto);
    if (node.set) Object.assign(flags, node.set);
    if (node.battle || node.end) break;
  }
  return visited;
}

test('test_fresh_stage_records_intro_before_battle_without_premarking_victory', () => {
  const flags = {};
  const visited = route(editor_union_stage, flags);
  assert.equal(flags.editor_union_stage_done, true);
  assert.equal(flags.park_guardian_won, undefined);
  assert.equal(visited.at(-1).battle.flag, 'park_guardian_won');
  assert.ok(visited.some(node => node.editorUnion?.kind === 'drop'));
});

test('test_restored_intro_reaches_same_standard_encounter_without_replaying_stage', () => {
  const freshBattle = route(editor_union_stage, {}).at(-1).battle;
  for (const script of [editor_union_stage, editor_union_stage_wait]) {
    const visited = route(script, { editor_union_stage_done: true });
    assert.deepEqual(visited.at(-1).battle, freshBattle);
    assert.ok(visited.some(node => node.sfx === 'battle_start'));
    assert.ok(!visited.some(node => node.editorUnion));
  }
});

test('test_won_stage_never_replays_intro_or_battle', () => {
  for (const script of [editor_union_stage, editor_union_stage_wait]) {
    const visited = route(script, { editor_union_stage_done: true, park_guardian_won: true });
    assert.equal(visited.at(-1).end, true);
    assert.ok(!visited.some(node => node.battle || node.text || node.editorUnion));
  }
});

test('test_stage_victory_cleans_only_present_costume_variant_without_missing_actor_warning', t => {
  const warning = t.mock.method(console, 'warn', () => {});
  for (const id of ['park_guardian_costume', 'park_guardian_ready']) {
    const costume = { id, dead: false }, audience = { id: 'stage_audience', dead: false };
    const game = { entities: [costume, audience] };
    const battleIndex = editor_union_stage_wait.findIndex(node => node.battle);
    const bodyIndex = editor_union_stage_wait.findIndex(node => node.spawn);
    for (const node of editor_union_stage_wait.slice(battleIndex + 1, bodyIndex)) {
      if (node.action) node.action(game);
      if (node.remove) makeWaiter(game, node);
    }
    assert.equal(costume.dead, true);
    assert.equal(audience.dead, false);
  }
  assert.equal(warning.mock.callCount(), 0);
});

test('test_stage_retry_keeps_boss_music_background_flag_and_party_configuration', () => {
  class ReadyBattle extends Battle { load() {} }
  const cfg = route(editor_union_stage, {}).at(-1).battle;
  const preloaded = [];
  const game = { party: ['gyeongsub', 'ppaman'], partyHp: {}, inventory: [], has: () => true,
    maxHpOf: () => 140, fadeTo() {}, sound: { sfx() {}, preloadBgm: key => preloaded.push(key) } };
  const battle = new ReadyBattle(game, cfg);
  battle.enemies[0].hp = 2;
  battle.members[0].hp = 0;
  battle.members[0].down = true;
  battle.beginRetry();
  assert.deepEqual(battle.cfg, { enemies: ['park_guardian'], bgm: 'park_guardian', bg: 'editor_union_stage', flag: 'park_guardian_won' });
  assert.deepEqual(preloaded, ['park_guardian']);
  assert.equal(battle.enemies[0].hp, 57);
  assert.ok(battle.members.every(member => member.hp === 140 && !member.down));
  assert.equal(battle.support.phase, 'costume');
  assert.equal(battle.support.charge, 0);
});

test('test_stage_battle_background_has_two_offset_finite_smooth_sweeps', () => {
  assert.equal(typeof BATTLE_BGS.editor_union_stage, 'function');
  for (const time of [0, 1, 3, 6, 10, 1000]) {
    const lights = [parkStageLight(0, time), parkStageLight(1, time)];
    assert.deepEqual(lights.map(light => light.x), [100, 380]);
    for (let index = 0; index < 2; index++) {
      assert.ok(Object.values(lights[index]).every(Number.isFinite));
      assert.ok(lights[index].targetX >= 97 && lights[index].targetX <= 383);
      assert.ok(Math.abs(parkStageLight(index, time + 1 / 60).targetX - lights[index].targetX) < 1.34);
    }
  }
  assert.notEqual(parkStageLight(0, 0).targetX, parkStageLight(1, 0).targetX);
});
