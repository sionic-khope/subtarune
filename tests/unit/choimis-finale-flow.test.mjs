import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../../src/battle/battle.js';
import { Board, Soul } from '../../src/battle/bullets.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { getBattleMode } from '../../src/battle/modes.js';
import { createChoimisPinkRound } from '../../src/battle/modes/choimis-pink-round.js';
import { createChoimisEatingRace, CHOIMIS_EATING_RACE } from '../../src/battle/modes/choimis-eating-race.js';
import { stateFromFlags } from '../../src/core/story.js';

const input = { just: () => false, down: () => false };

test('test_choimis_finale_is_registered_with_preloaded_raise_and_normal_body', () => {
  assert.equal(typeof getBattleMode('enemy', 'choimis_finale'), 'function');
  assert.deepEqual(ENEMIES.choimis_flower.actions.raise, {
    src: 'assets/enemies/choimis-flower-raise.png', cols: 2, rows: 2, count: 4,
    fps: 4.5, px: 1, pivot: [72, 152],
  });
  assert.equal(ENEMIES.choimis_flower.projectiles.normal, 'assets/sprites/choimis.png');
});

function fixture(id = 'choimis_flower') {
  const events = [];
  const enemy = { id, def: ENEMIES[id], hp: 3, maxHp: ENEMIES[id].hp,
    dead: false, dying: 0, defenseBoosted: true, x: 396, y: 176 };
  const member = { id: 'hyungsub', name: 'hero', hp: 100, maxHp: 100, home: [84, 190], down: false };
  const battle = Object.assign(Object.create(Battle.prototype), {
    enemies: [enemy], members: [member], cfg: { seamlessIntro: true }, support: null,
    state: 'act', t: 0, text: '', shown: 0, textT: 0, fx: [], bullets: [], patterns: [],
    board: new Board(), soul: new Soul(), rnd: () => 0.5, modes: { attack: 'rush', enemy: 'bullets' },
    game: { attack: 20, money: 0, time: 0, fadeTo() {}, sound: { sfx() {}, blip() {}, stopBgm() {}, preloadBgm() {} } },
    startEnemyMode(name, actor) { events.push(name); this.activeEnemyMode = name; this.state = 'enemy-mode'; this.finaleActor = actor; },
  });
  return { battle, enemy, member, events };
}

for (const [source, boosted, hp, requested, loss] of [
  ['ordinary', true, 3, 20, 2], ['pink-shot', true, 1, 8, 0],
  ['choimis-eating-race', true, 7, 10, 6], ['ordinary', false, 9, 20, 8],
]) test(`test_choimis_lethal_${source}_${boosted}_returns_actual_loss_and_holds_one_hp`, () => {
  const { battle, enemy, events } = fixture();
  enemy.hp = hp; enemy.defenseBoosted = boosted;
  const observed = [];
  battle.support = { onHit: (_enemy, damage) => observed.push(damage) };
  const damage = battle.hitEnemy(enemy, null, requested, { source });
  assert.equal(damage, loss);
  assert.equal(enemy.hp, 1);
  assert.equal(enemy.dying, 0);
  assert.equal(enemy.dead, false);
  assert.equal(enemy.finalePending, true);
  assert.equal(observed[0], loss);
  assert.deepEqual(events, []);
  assert.equal(battle.hitEnemy(enemy, null, 999), 0);
  assert.equal(enemy.hp, 1);
  assert.equal(observed.length, 1);
});

test('test_choimis_lethal_ordinary_waits_for_current_action_return_and_discards_queue', () => {
  const { battle, enemy, member, events } = fixture();
  battle.plans = [member, member].map(actor => ({ type: 'fight', member: actor, target: enemy }));
  battle.beginAct();
  for (let i = 0; i < 300 && !enemy.finalePending; i++) battle.update(1 / 60, input);
  assert.equal(enemy.finalePending, true);
  assert.equal(battle.state, 'act');
  assert.notEqual(member.action.mode, 'idle');
  assert.deepEqual(events, []);
  for (let i = 0; i < 300 && !events.length; i++) battle.update(1 / 60, input);
  assert.equal(member.action.mode, 'idle');
  assert.deepEqual(events, ['choimis_finale']);
  assert.equal(battle.finaleActor, enemy);
  assert.deepEqual(battle.plans, []);
  assert.equal(enemy.finaleStarted, true);
  assert.equal(battle.hitEnemy(enemy, null, 999), 0);
  assert.equal(battle.startPendingFinale(), false);
  assert.deepEqual(events, ['choimis_finale']);
});

for (const mode of ['choimis_pink_round', 'choimis_eating_race', 'choimis_pink_shooter']) {
  test(`test_choimis_lethal_${mode}_waits_for_cleanup_before_finale`, () => {
    const { battle, enemy, events } = fixture();
    let complete = false;
    enemy.defenseBoosted = mode !== 'choimis_pink_shooter';
    battle.state = 'enemy-mode'; battle.activeEnemyMode = mode;
    battle.actorFocus = mode.includes('pink') ? { phase: 'hidden', t: 0, duration: 0.22 } : null;
    battle.gimmick = { update: () => complete, dispose: () => events.push('cleanup') };
    battle.hitEnemy(enemy, null, 10, { source: 'choimis-eating-race' });
    battle.update(1 / 60, input);
    assert.equal(battle.activeEnemyMode, mode);
    assert.deepEqual(events, []);
    complete = true;
    battle.update(1 / 60, input);
    if (mode.includes('pink')) {
      assert.equal(battle.state, 'enemy-mode-restore');
      assert.deepEqual(events, ['cleanup']);
      battle.update(0.22, input);
    }
    assert.deepEqual(events, ['cleanup', 'choimis_finale']);
    assert.equal(battle.interlude, undefined);
    assert.equal(battle.pendingPostOpening, null);
    assert.equal(enemy.defenseBoosted, mode !== 'choimis_pink_shooter');
  });
}

test('test_choimis_retry_resets_pending_started_complete_and_rearms_opening', () => {
  const { battle, enemy } = fixture();
  Object.assign(enemy, { finalePending: true, finaleStarted: true, finaleComplete: true });
  battle.openingShown = true;
  battle.beginRetry();
  assert.equal(enemy.hp, enemy.maxHp);
  for (const field of ['finalePending', 'finaleStarted', 'finaleComplete']) assert.equal(enemy[field], false);
  assert.equal(battle.takeOpeningMode(), 'choimis_pink_shooter');
  assert.equal(battle.game.money, 0);
});

test('test_lethal_hit_inside_real_pink_round_keeps_full_eighteen_seconds_and_restores_pose', () => {
  const { battle, enemy, events } = fixture();
  enemy.hp = 1;
  const mode = createChoimisPinkRound(battle, { enemy, config: { scenario: 'pink_prism' } });
  battle.gimmick = mode; battle.state = 'enemy-mode'; battle.activeEnemyMode = 'choimis_pink_round';
  battle.actorFocus = { phase: 'hidden', t: 0, duration: 0.22 };
  battle.soul.invuln = 100;
  for (let i = 0; i < 600 && mode.snapshot.phase !== 'combat'; i++) battle.update(1 / 60, input);
  assert.equal(mode.snapshot.phase, 'combat');
  battle.hitEnemy(enemy, null, 1, { source: 'pink-shot' });
  battle.update(1, input);
  assert.equal(enemy.hp, 1);
  assert.equal(mode.snapshot.phase, 'combat');
  assert.deepEqual(events, []);
  for (let i = 0; i < 1500 && !events.length; i++) battle.update(1 / 60, input);
  assert.equal(mode.snapshot.combatElapsed, 18);
  assert.equal(mode.snapshot.disposed, true);
  assert.equal(enemy.patternPose, null);
  assert.deepEqual(events, ['choimis_finale']);
});

test('test_real_eating_win_waits_for_result_hold_and_media_cleanup_before_finale', async () => {
  const { battle, enemy, events } = fixture();
  enemy.hp = 7;
  const media = { ready: Promise.resolve(true), stops: 0, sync() {}, stop() { this.stops++; } };
  const mode = createChoimisEatingRace(battle, { enemy, media });
  battle.gimmick = mode; battle.state = 'enemy-mode'; battle.activeEnemyMode = 'choimis_eating_race';
  await Promise.resolve();
  for (let i = 0; i < 1800 && mode.snapshot.phase !== 'race'; i++) battle.update(1 / 60, input);
  assert.equal(mode.snapshot.phase, 'race');
  const press = { just: () => true, down: key => key === 'confirm' };
  for (let bite = 0; bite < 54; bite++) {
    battle.update(1 / 12, press);
    battle.update(1 / 12, input);
  }
  assert.equal(mode.snapshot.winner, 'party');
  assert.equal(enemy.hp, 7);
  assert.equal(enemy.finalePending, undefined);
  for (let i = 0; i < 300 && mode.snapshot.phase !== 'impact'; i++) battle.update(1 / 120, input);
  assert.equal(mode.snapshot.phase, 'impact');
  assert.equal(enemy.hp, 1);
  assert.equal(enemy.finalePending, true);
  assert.deepEqual(events, []);
  battle.update(CHOIMIS_EATING_RACE.impactSeconds, input);
  assert.deepEqual(events, []);
  battle.update(CHOIMIS_EATING_RACE.resultSeconds - 0.2, input);
  assert.deepEqual(events, []);
  battle.update(0.2, input);
  assert.equal(mode.snapshot.disposed, true);
  assert.ok(media.stops >= 2);
  assert.deepEqual(events, ['choimis_finale']);
});

test('test_other_boss_keeps_ordinary_lethal_death_path', () => {
  const { battle, enemy, events } = fixture('drum_devil');
  assert.equal(battle.hitEnemy(enemy, null, 20), 3);
  assert.equal(enemy.hp, 0);
  assert.equal(enemy.dying, 0.5);
  assert.equal(enemy.finalePending, undefined);
  assert.deepEqual(events, []);
});

test('test_finale_mode_completion_reaches_common_win_once_after_cinematic', () => {
  const { battle, enemy } = fixture();
  let complete = false, disposed = 0, wins = 0;
  enemy.hp = 1; enemy.finaleStarted = true;
  battle.state = 'enemy-mode'; battle.activeEnemyMode = 'choimis_finale';
  battle.game.money = 75;
  battle.beginWin = function () { wins++; Battle.prototype.beginWin.call(this); };
  battle.gimmick = {
    update() {
      if (!complete) return false;
      Object.assign(enemy, { hp: 0, dead: true, dying: 0, finaleComplete: true });
      return true;
    },
    dispose() { disposed++; },
  };
  battle.update(1 / 60, input);
  assert.equal(wins, 0);
  assert.equal(battle.game.money, 75);
  complete = true;
  battle.update(1 / 60, input);
  battle.update(1 / 60, input);
  assert.equal(wins, 1);
  assert.equal(disposed, 1);
  assert.equal(enemy.finaleComplete, true);
  assert.equal(battle.game.money, 15000075);
  for (let step = 0; step < 60; step++) battle.update(1 / 60, input);
  assert.equal(battle.game.money, 15000075);
});

test('test_choimis_won_checkpoint_derives_reward_once_across_rescue_flags', () => {
  const options = { enemyMoney: id => ENEMIES[id]?.money ?? 0 };
  assert.equal(stateFromFlags({}, options).money, 0);
  assert.equal(stateFromFlags({ choimis_flower_won: true }, options).money, 15000000);
  assert.equal(stateFromFlags({ choimis_flower_won: true, choimis_rescued: true, ship_lounge_briefed: true }, options).money, 15000000);
});
