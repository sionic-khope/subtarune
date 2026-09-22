import test from 'node:test';
import assert from 'node:assert/strict';
import { Board, Soul } from '../../src/battle/bullets.js';
import { Battle } from '../../src/battle/battle.js';
import { CHOIMIS_PINK_ROUNDS, createChoimisPinkScenario } from '../../src/battle/choimis-pink-rounds.js';
import { createChoimisPinkRound, createPinkBossContact } from '../../src/battle/modes/choimis-pink-round.js';
import { registerPinkTargetHit } from '../../src/battle/modes/choimis-pink-shooter.js';
import { ENEMIES } from '../../src/data/enemies.js';
import L from '../../src/data/locale/ko.js';

const BOX = Object.freeze({ x: 85, y: 84, w: 310, h: 150 });
const none = { down: () => false };

function scenarioFixture(name) {
  const soul = { x: 110, y: 159, oldX: 110, oldY: 159, r: 6 };
  const sounds = [], speech = [], damage = [], hits = [], bossContacts = [];
  const images = { boss: { id: 'boss' }, choso: { id: 'choso' }, dao: { id: 'dao' }, bazzi: { id: 'bazzi' } };
  const scenario = createChoimisPinkScenario(name, {
    box: BOX, soul, images, rnd: () => 0.5,
    sfx: (sound, options) => sounds.push({ sound, options }), say: text => speech.push(text),
    hurt: () => { damage.push(15); return true; }, hit: (x, y) => hits.push({ x, y }),
    bossContact: (shot) => { if (!registerPinkTargetHit(shot, 'choimis-boss')) return false; bossContacts.push(shot); return true; },
    bossAlive: () => true, hitTarget: registerPinkTargetHit,
  });
  return { scenario, soul, sounds, speech, damage, hits, bossContacts, images };
}

const crossingShot = (target, charged = false) => ({
  oldX: target.x - 28, oldY: target.y, x: target.x + 28, y: target.y, r: charged ? 5 : 3, charged, dead: false,
});

test('test_pink_round_tuning_keeps_choso_unchanged_and_strengthens_only_warned_kart_prism', () => {
  assert.deepEqual(CHOIMIS_PINK_ROUNDS.choso, { targetHits: 6, beamWarn: 0.55, beamHit: 0.38, beamEvery: 1.15 });
  assert.ok(CHOIMIS_PINK_ROUNDS.kart_block.warn >= 0.3 && CHOIMIS_PINK_ROUNDS.kart_block.speed > 118);
  assert.ok(CHOIMIS_PINK_ROUNDS.pink_prism.boltWarn >= 0.3 && CHOIMIS_PINK_ROUNDS.pink_prism.boltSpeed > 150);
});

test('test_choimis_pink_choso_needs_six_actual_hits_while_target_moves_and_warned_beams_lock', () => {
  const run = scenarioFixture('choso'), initialY = run.scenario.snapshot.target.y;
  for (let index = 0; index < 10; index++) run.scenario.update(0.1, []);
  assert.ok(Math.abs(run.scenario.snapshot.target.y - initialY) >= 35, 'visible target moves enough to require aiming');
  assert.deepEqual(run.speech, ['천혈!']);
  const beam = run.scenario.snapshot.beams[0], locked = { ...beam.locked };
  run.soul.y = BOX.y + 12; run.scenario.update(0.1, []);
  assert.deepEqual(run.scenario.snapshot.beams[0].locked, locked, 'beam path stays fixed after telegraph');
  for (let elapsed = 0; elapsed < 8; elapsed += 0.1) run.scenario.update(0.1, []);
  assert.equal(run.scenario.done, false, 'timer alone never ends the shooting objective');
  for (let hit = 0; hit < CHOIMIS_PINK_ROUNDS.choso.targetHits; hit++) {
    const target = run.scenario.snapshot.target;
    run.scenario.update(0.01, [crossingShot(target)]);
  }
  assert.equal(run.scenario.done, true);
  assert.equal(run.scenario.snapshot.hits, 6);
  assert.deepEqual(run.scenario.snapshot.beams, [], 'sixth projectile impact immediately stops blood beams');
});

test('test_choimis_pink_choso_large_step_cannot_apply_an_expired_beam_late', () => {
  const run = scenarioFixture('choso');
  run.scenario.update(0.4, []);
  const beam = run.scenario.snapshot.beams[0]; run.soul.y = beam.locked.y;
  run.scenario.update(CHOIMIS_PINK_ROUNDS.choso.beamWarn + CHOIMIS_PINK_ROUNDS.choso.beamHit + 0.1, []);
  assert.deepEqual(run.damage, []);
  assert.deepEqual(run.scenario.snapshot.beams, []);
});

test('test_kart_and_prism_attacks_spawn_at_far_right_boss_with_readable_lane_gaps', () => {
  const kart = scenarioFixture('kart_block'); kart.scenario.update(0.25, []);
  const kartSnap = kart.scenario.snapshot;
  assert.equal(kartSnap.blockers.length, 2); assert.deepEqual(kartSnap.blockers.map(item => item.lane).sort(), [0, 2]);
  assert.ok(kartSnap.blockers.every(item => Math.abs(item.x - (kartSnap.boss.x - 18)) < 0.01));
  const prism = scenarioFixture('pink_prism'); prism.scenario.update(0.45, []);
  const prismSnap = prism.scenario.snapshot;
  assert.equal(prismSnap.bolts.length, 2); assert.equal(new Set(prismSnap.bolts.map(item => item.y)).size, 2);
  assert.ok(prismSnap.bolts.every(item => Math.abs(item.oldX - (prismSnap.boss.x - 14)) < 0.01));
});

test('test_choimis_pink_kart_uses_real_character_images_and_lane_dodging_avoids_damage', () => {
  const run = scenarioFixture('kart_block');
  run.soul.y = BOX.y + BOX.h / 2; run.soul.oldY = run.soul.y;
  run.scenario.update(0.2, []); run.scenario.update(0.5, []); run.scenario.update(3, []);
  assert.deepEqual(run.damage, [], 'kart crossing another lane is harmless');
  const calls = [], ctx = new Proxy({}, { get(target, key) { return target[key] ?? ((...args) => calls.push([key, ...args])); }, set(target, key, value) { target[key] = value; return true; } });
  run.scenario.update(0.9, []); run.scenario.draw(ctx);
  assert.ok(calls.some(call => call[0] === 'drawImage' && [run.images.dao, run.images.bazzi].includes(call[1])));
  assert.equal(calls.some(call => call[0] === 'fillRect'), false, 'no code-drawn fake KartRider character');
});

test('test_choimis_pink_kart_finishes_only_after_four_shot_blockers', () => {
  const run = scenarioFixture('kart_block');
  for (let step = 0; step < 300 && !run.scenario.done; step++) {
    const shots = run.scenario.snapshot.blockers.filter(blocker => blocker.age >= CHOIMIS_PINK_ROUNDS.kart_block.warn)
      .map(blocker => crossingShot(blocker));
    run.scenario.update(0.05, shots);
  }
  assert.equal(run.scenario.done, true);
  assert.equal(run.scenario.snapshot.cleared, CHOIMIS_PINK_ROUNDS.kart_block.targetHits);
  assert.ok(run.scenario.snapshot.spawned >= CHOIMIS_PINK_ROUNDS.kart_block.targetHits);
});

test('test_choimis_pink_prism_requires_charged_shield_breaks_then_three_core_hits', () => {
  const run = scenarioFixture('pink_prism'); run.scenario.update(0.1, []);
  let shield = run.scenario.snapshot.shieldPositions[0];
  run.scenario.update(0.01, [crossingShot(shield, false)]);
  assert.equal(run.scenario.snapshot.shields, CHOIMIS_PINK_ROUNDS.pink_prism.shields, 'tap cannot silently break a shield');
  while (run.scenario.snapshot.shields) {
    shield = run.scenario.snapshot.shieldPositions[0]; run.scenario.update(0.01, [crossingShot(shield, true)]);
  }
  assert.equal(run.scenario.snapshot.shields, 0);
  for (let hit = 0; hit < CHOIMIS_PINK_ROUNDS.pink_prism.coreHits; hit++) {
    run.scenario.update(0.01, [crossingShot(run.scenario.snapshot.core)]);
  }
  assert.equal(run.scenario.done, true);
  assert.equal(run.scenario.snapshot.coreHits, CHOIMIS_PINK_ROUNDS.pink_prism.coreHits);
  assert.deepEqual(run.scenario.snapshot.bolts, []);
});

test('test_pink_boss_three_unique_projectiles_deal_one_common_damage_and_same_shot_never_multihits', () => {
  const enemy = { id: 'choimis_flower', hp: 2, maxHp: 2, dead: false, dying: 0, def: {} };
  const calls = [], sounds = [], battle = {
    sfx(name, options) { sounds.push({ name, options }); },
    hitEnemy(target, member, damage, options) { calls.push({ target, member, damage, options }); target.hp -= damage; if (target.hp <= 0) target.dying = 0.5; return damage; },
  };
  const contact = createPinkBossContact(battle, enemy, () => {}), boss = { x: 350, y: 159, oldX: 350, oldY: 159, r: 20 };
  const first = crossingShot(boss, true);
  assert.equal(contact(first, boss), true); assert.equal(contact(first, boss), false);
  assert.deepEqual(sounds, [{ name: 'hit', options: { volume: 0.55 } }], 'one impact cue per accepted contact, never per overlapping frame');
  assert.equal(enemy.pinkShotHits, 1); assert.equal(calls.length, 0);
  assert.equal(contact(crossingShot(boss, true), boss), true);
  assert.equal(contact(crossingShot(boss, true), boss), true);
  assert.equal(enemy.pinkShotHits, 0); assert.equal(enemy.hp, 1); assert.equal(sounds.length, 3);
  assert.deepEqual(calls[0], { target: enemy, member: null, damage: 1, options: { source: 'pink-shot', sound: false } });
  contact(crossingShot(boss, true), boss); contact(crossingShot(boss, true), boss); contact(crossingShot(boss, true), boss);
  assert.equal(enemy.hp, 0); assert.equal(enemy.dying, 0.5); assert.equal(calls.length, 2);
  assert.equal(contact(crossingShot(boss, true), boss), false, 'dead or dying boss accepts no postmortem hits');
  const retryEnemy = { id: 'choimis_flower', hp: 2, maxHp: 2, dead: false, dying: 0, def: {} };
  assert.equal(retryEnemy.pinkShotHits, undefined, 'fresh retry enemy has no carried remainder');
});

function modeFixture(config) {
  const board = new Board(), soul = new Soul();
  board.x = 20; board.y = 246; board.w = 440; board.h = 72; board.target = { w: 440, h: 72, cx: 240, cy: 282 };
  soul.x = 211; soul.y = 277; soul.invuln = 0.3;
  const old = { board: { ...board.rect, target: { ...board.target } }, soul: { x: soul.x, y: soul.y, invuln: soul.invuln } };
  const enemy = { id: 'choimis_flower', x: 396, y: 176, hp: 4, maxHp: 4, dead: false, dying: 0, patternPose: null, img: { width: 320, height: 320 }, def: { damage: 15, voice: 'choimis_flower' },
    actionImages: { choso: { width: 320, height: 320 } }, projectiles: { dao: { width: 111, height: 120 }, bazzi: { width: 94, height: 120 } } };
  const soundHandles = [], sounds = [];
  const battle = { board, soul, bubble: null, rnd: () => 0.5, game: { sound: { blip() {}, sfx(name) { const handle = { name, pause() {}, removeAttribute() {}, load() {} }; soundHandles.push(handle); return handle; } } }, sfx(name, options) { sounds.push({ name, options }); }, hurtParty() {}, hitEnemy(target, member, damage) { target.hp -= damage; return damage; }, drawTextBox() {} };
  return { board, soul, enemy, old, battle, soundHandles, sounds, mode: createChoimisPinkRound(battle, { enemy, config }) };
}

test('test_choimis_pink_round_opens_without_popping_and_restores_owned_state', () => {
  const run = modeFixture({ scenario: 'kart_block', speak: '막자할게' });
  assert.deepEqual(run.board.rect, { x: 20, y: 246, w: 440, h: 72 }, 'constructor leaves fade-out frame geometry intact');
  assert.equal(run.enemy.patternPose.hidden, true); assert.equal(run.battle.bubble.text, '막자할게');
  for (let time = 0; time < 1.2; time += 0.05) { run.board.update(0.05); run.mode.update(0.05, none); }
  assert.equal(run.mode.snapshot.phase, 'combat'); assert.ok(run.board.w < 440 && run.board.y < 246);
  run.mode.dispose();
  assert.deepEqual(run.board.rect, { x: run.old.board.x, y: run.old.board.y, w: run.old.board.w, h: run.old.board.h });
  assert.deepEqual({ x: run.soul.x, y: run.soul.y, invuln: run.soul.invuln }, run.old.soul);
  assert.equal(run.enemy.patternPose, null); assert.equal(run.battle.bubble, null);
});

test('test_choimis_pink_round_uses_official_charge_then_full_shot_audio_and_cancels_handle', () => {
  const run = modeFixture({ scenario: 'kart_block', speak: '준비' });
  run.board.snap(); for (let time = 0; time < 1.2; time += 0.05) run.mode.update(0.05, none);
  run.mode.update(0.01, none); run.mode.update(1, { down: key => key === 'confirm' });
  assert.deepEqual(run.soundHandles.map(handle => handle.name), ['yellowheart_charge']);
  run.mode.update(0.01, none);
  assert.equal(run.sounds.at(-1).name, 'yellowheart_shot_big');
  run.mode.dispose();
});

test('test_choimis_pink_round_stops_hazards_on_boss_death_and_completes_only_when_enemy_is_dead', () => {
  const run = modeFixture({ scenario: 'pink_prism', speak: '준비' });
  run.board.snap(); for (let time = 0; time < 1.2; time += 0.05) run.mode.update(0.05, none);
  run.enemy.hp = 0; run.enemy.dying = 0.5;
  assert.equal(run.mode.update(0.1, none), false);
  assert.equal(run.mode.snapshot.terminating, true); assert.deepEqual(run.mode.snapshot.shots, []);
  run.enemy.dying = 0; run.enemy.dead = true;
  assert.equal(run.mode.update(0.1, none), true, 'engine may now dispose and route through common victory');
  run.mode.dispose(); assert.equal(run.mode.snapshot.disposed, true);
});

test('test_choimis_pink_round_waits_for_board_tween_before_drawing_arena_targets', () => {
  const run = modeFixture({ scenario: 'choso', speak: '내 추구미는 쵸소우야' });
  const calls = [], ctx = new Proxy({}, {
    get(target, key) { return target[key] ?? ((...args) => calls.push([key, ...args])); },
    set(target, key, value) { target[key] = value; return true; },
  });

  run.mode.draw(ctx);
  assert.equal(calls.some(call => call[0] === 'drawImage'), false, 'target stays hidden while the old lower board is fading');

  run.board.snap(); run.mode.draw(ctx);
  assert.equal(calls.some(call => call[0] === 'drawImage'), true, 'target appears only after the wide arena reaches its target');
});

test('test_all_pink_rounds_draw_approved_white_boss_at_far_right_and_emit_attacks_from_it', () => {
  for (const name of ['choso', 'kart_block', 'pink_prism']) {
    const run = modeFixture({ scenario: name, speak: '준비' });
    run.board.snap();
    for (let time = 0; time < 1.4; time += 0.05) run.mode.update(0.05, none);
    const snap = run.mode.snapshot;
    assert.ok(snap.scenario.boss.x > BOX.x + BOX.w * 0.75 && snap.scenario.boss.x < BOX.x + BOX.w, `${name} boss is far-right inside arena`);
    const calls = [], ctx = new Proxy({}, { get(target, key) { return target[key] ?? ((...args) => calls.push([key, ...args])); }, set(target, key, value) { target[key] = value; return true; } });
    run.mode.draw(ctx);
    assert.ok(calls.some(call => call[0] === 'drawImage'), `${name} draws approved whiteSprite boss`);
    assert.ok(calls.some(call => call[0] === 'fillText' && call[1] === L.battle_choimis_pink_round_controls));
    if (name === 'choso') assert.ok(snap.scenario.beams.every(beam => Math.abs(beam.from.x - snap.scenario.boss.x) < 30));
    if (name === 'pink_prism') assert.ok(snap.scenario.bolts.every(bolt => bolt.oldX > BOX.x + BOX.w * 0.75));
    run.mode.dispose();
  }
});

test('test_pink_round_dispose_clears_shots_charge_and_boss_contact_remainder_persists_only_on_enemy', () => {
  const run = modeFixture({ scenario: 'kart_block', speak: '준비' });
  run.enemy.pinkShotHits = 2; run.board.snap();
  for (let time = 0; time < 1.2; time += 0.05) run.mode.update(0.05, none);
  run.mode.update(0.01, { down: key => key === 'confirm' });
  run.mode.dispose();
  assert.equal(run.mode.snapshot.disposed, true); assert.deepEqual(run.mode.snapshot.shots, []);
  assert.equal(run.mode.snapshot.charge.active, false); assert.equal(run.enemy.pinkShotHits, 2, 'round cleanup preserves fight-local remainder');
});

test('test_actual_battle_retry_resets_pink_boss_projectile_remainder_on_reused_enemy', () => {
  const enemy = { hp: 3, maxHp: 4, dead: true, dying: 0.2, patternIdx: 5, enraged: true, defenseBoosted: true,
    animationTime: 1, popup: {}, shake: 1, blink: 1, speechBag: ['x'], lastSpeech: 'x', pinkShotHits: 2 };
  const member = { hp: 1, maxHp: 10, down: true, downTurns: 2, action: {}, popup: {}, pose: {} };
  const battle = Object.assign(Object.create(Battle.prototype), {
    enemies: [enemy], members: [member], support: { reset() {} }, interlude: null, cur: null, bubble: null, fx: [], bullets: [], plans: [],
    cfg: { bgm: 'choimis_battle', seamlessIntro: true }, game: { fadeTo() {}, shake: null, sound: { preloadBgm() {} } },
    cancelPendingBgm() {}, disposeGimmick() {}, sfx() {},
  });
  battle.beginRetry();
  assert.equal(enemy.pinkShotHits, 0); assert.equal(enemy.hp, enemy.maxHp); assert.equal(enemy.dead, false);
});

test('test_choimis_pink_round_production_configs_route_all_three_scenarios_through_battle', () => {
  const def = ENEMIES.choimis_flower;
  const expected = ['choso', 'kart_block', 'pink_prism'];

  for (const scenario of expected) {
    const patternIdx = def.patterns.findIndex(config => config.scenario === scenario);
    const enemy = { id: 'choimis_flower', name: def.name, def, hp: def.hp, maxHp: def.hp, dead: false, patternIdx,
      actionImages: { choso: { width: 320, height: 320 } }, projectiles: { dao: { width: 111, height: 120 }, bazzi: { width: 94, height: 120 } } };
    const battle = Object.assign(Object.create(Battle.prototype), {
      enemies: [enemy], members: [], modes: { enemy: 'bullets' }, support: null, board: new Board(), soul: new Soul(),
      rnd: () => 0, t: 0, bubble: null, state: 'menu', game: { sound: { blip() {} } },
      setText() {}, sfx() {}, hurtParty() {}, living() { return [enemy]; },
    });

    battle.beginEnemyTurn();

    assert.equal(battle.activeEnemyMode, 'choimis_pink_round');
    assert.equal(battle.gimmick.snapshot.scenario.kind, scenario);
    assert.equal(enemy.patternIdx, patternIdx + 1);
    battle.disposeGimmick();
  }
});
