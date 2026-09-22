import test from 'node:test';
import assert from 'node:assert/strict';
import { Board, Soul } from '../../src/battle/bullets.js';
import { Battle } from '../../src/battle/battle.js';
import { CHOIMIS_PINK_ROUNDS, createChoimisPinkScenario } from '../../src/battle/choimis-pink-rounds.js';
import { CHOIMIS_PINK_ROUND_SECONDS, createChoimisPinkRound, createPinkBossContact } from '../../src/battle/modes/choimis-pink-round.js';
import { registerPinkTargetHit } from '../../src/battle/modes/choimis-pink-shooter.js';
import { ENEMIES } from '../../src/data/enemies.js';
import L from '../../src/data/locale/ko.js';

const BOX = Object.freeze({ x: 25, y: 84, w: 430, h: 150 });
const none = { down: () => false };

function scenarioFixture(name) {
  const soul = { x: 64, y: 159, oldX: 64, oldY: 159, r: 6 };
  const sounds = [], speech = [], damage = [], hits = [], bossContacts = [];
  const images = { boss: { id: 'boss' }, choso: { id: 'choso' }, dao: { id: 'dao' }, bazzi: { id: 'bazzi' } };
  const scenario = createChoimisPinkScenario(name, {
    box: BOX, soul, images, rnd: () => 0.5,
    sfx: (sound, options) => sounds.push({ sound, options }), say: text => speech.push(text),
    hurt: () => { damage.push(15); return true; }, hit: (x, y) => hits.push({ x, y }),
    bossContact: (shot) => { if (!registerPinkTargetHit(shot, 'choimis-boss')) return false; bossContacts.push(shot); return true; },
    bossAlive: () => true, hitTarget: registerPinkTargetHit, transformed: () => true,
  });
  return { scenario, soul, sounds, speech, damage, hits, bossContacts, images };
}

const crossingShot = (target, charged = false) => ({
  oldX: target.x - 28, oldY: target.y, x: target.x + 28, y: target.y, r: charged ? 5 : 3, charged, dead: false,
});

test('test_pink_round_tuning_keeps_choso_difficulty_and_uses_fixed_eighteen_seconds', () => {
  assert.equal(CHOIMIS_PINK_ROUND_SECONDS, 18);
  assert.deepEqual(CHOIMIS_PINK_ROUNDS.choso, { beamWarn: 0.55, beamHit: 0.38, beamEvery: 1.15 });
  assert.ok(CHOIMIS_PINK_ROUNDS.kart_block.warn >= 0.3 && CHOIMIS_PINK_ROUNDS.kart_block.speed > 118);
  assert.ok(CHOIMIS_PINK_ROUNDS.pink_prism.boltWarn >= 0.3 && CHOIMIS_PINK_ROUNDS.pink_prism.boltSpeed > 150);
});

test('test_choimis_pink_choso_hits_never_stop_fixed_warning_beams_or_timed_phase', () => {
  const run = scenarioFixture('choso'), initialY = run.scenario.snapshot.target.y;
  run.scenario.prepare(0.5);
  for (let index = 0; index < 10; index++) run.scenario.update(0.1, []);
  assert.ok(Math.abs(run.scenario.snapshot.target.y - initialY) >= 35, 'visible boss moves enough to require aiming');
  const beam = run.scenario.snapshot.beams[0], locked = { ...beam.locked };
  assert.ok(run.scenario.snapshot.spray.length > 0, 'active blood beam exposes harmless spray decoration');
  assert.equal(beam.from.x, run.scenario.snapshot.boss.x - 16); assert.equal(beam.from.y, run.scenario.snapshot.boss.y - 10);
  run.soul.y = BOX.y + 12; run.scenario.update(0.1, []);
  assert.deepEqual(run.scenario.snapshot.beams[0].locked, locked, 'beam target stays fixed after warning');
  for (let hit = 0; hit < 6; hit++) {
    const target = run.scenario.snapshot.target;
    run.scenario.update(0.01, [crossingShot(target)]);
  }
  assert.equal(run.scenario.done, false, 'six hits do not end the fixed-duration phase');
  assert.equal(run.scenario.snapshot.hits, 6);
  let emittedAfterThreshold = false;
  for (let elapsed = 0; elapsed < 2; elapsed += 0.05) { run.scenario.update(0.05, []); emittedAfterThreshold ||= run.scenario.snapshot.beams.length > 0; }
  assert.equal(emittedAfterThreshold, true, 'blood charge and beams keep emitting after the old threshold');
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

test('test_choimis_pink_kart_keeps_spawning_after_four_clears_until_mode_timer', () => {
  const run = scenarioFixture('kart_block');
  for (let step = 0; step < 300 && run.scenario.snapshot.cleared < 4; step++) {
    const shots = run.scenario.snapshot.blockers.filter(blocker => blocker.age >= CHOIMIS_PINK_ROUNDS.kart_block.warn)
      .map(blocker => crossingShot(blocker));
    run.scenario.update(0.05, shots);
  }
  assert.ok(run.scenario.snapshot.cleared >= 4); assert.equal(run.scenario.done, false);
  const spawnedAtOldThreshold = run.scenario.snapshot.spawned;
  for (let elapsed = 0; elapsed < 2; elapsed += 0.05) run.scenario.update(0.05, []);
  assert.ok(run.scenario.snapshot.spawned > spawnedAtOldThreshold, 'kart waves continue after the former four-clear threshold');
});

test('test_choimis_pink_prism_clears_obstacles_but_keeps_bolts_after_former_core_threshold', () => {
  const run = scenarioFixture('pink_prism'); run.scenario.update(0.1, []);
  let shield = run.scenario.snapshot.shieldPositions[0];
  run.scenario.update(0.01, [crossingShot(shield, false)]);
  assert.equal(run.scenario.snapshot.shields, CHOIMIS_PINK_ROUNDS.pink_prism.shields, 'tap cannot silently break a shield');
  while (run.scenario.snapshot.shields) {
    shield = run.scenario.snapshot.shieldPositions[0]; run.scenario.update(0.01, [crossingShot(shield, true)]);
  }
  for (let hit = 0; hit < 3; hit++) run.scenario.update(0.01, [crossingShot(run.scenario.snapshot.core)]);
  assert.equal(run.scenario.snapshot.coreHits, 3); assert.equal(run.scenario.done, false);
  for (let elapsed = 0; elapsed < 1; elapsed += 0.05) run.scenario.update(0.05, []);
  assert.ok(run.scenario.snapshot.bolts.length > 0, 'bolts continue after shields and the former three-core threshold');
});

test('test_pink_boss_charged_projectile_deals_one_immediately_while_three_normal_contacts_share_remainder', () => {
  const enemy = { id: 'choimis_flower', hp: 5, maxHp: 5, dead: false, dying: 0, def: {} };
  const calls = [], sounds = [], battle = {
    sfx(name, options) { sounds.push({ name, options }); },
    hitEnemy(target, member, damage, options) { calls.push({ target, member, damage, options }); target.hp -= damage; return damage; },
  };
  const contact = createPinkBossContact(battle, enemy, () => {}), boss = { id: 'choimis-boss', x: 350, y: 159, oldX: 350, oldY: 159, r: 20 };
  for (let index = 0; index < 2; index++) contact(crossingShot(boss), boss);
  assert.equal(enemy.hp, 5); assert.equal(enemy.pinkShotHits, 2);
  const charged = crossingShot(boss, true);
  assert.equal(contact(charged, boss), true); assert.equal(contact(charged, boss), false, 'same charged projectile cannot damage the boss twice');
  assert.equal(enemy.hp, 4); assert.equal(enemy.pinkShotHits, 2, 'charged damage preserves the normal-shot remainder'); assert.equal(calls.length, 1);
  contact(crossingShot(boss), boss);
  assert.equal(enemy.hp, 3); assert.equal(enemy.pinkShotHits, 0); assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.member === null && call.damage === 1 && call.options.source === 'pink-shot' && call.options.sound === false));
  assert.equal(sounds.length, 4, 'each accepted projectile gets one impact cue');
  enemy.dying = 0.5; assert.equal(contact(crossingShot(boss, true), boss), false, 'dying boss rejects postmortem charged hits');
});

function modeFixture(config) {
  const board = new Board(), soul = new Soul();
  board.x = 20; board.y = 246; board.w = 440; board.h = 72; board.target = { w: 440, h: 72, cx: 240, cy: 282 };
  soul.x = 211; soul.y = 277; soul.invuln = 0.3;
  const old = { board: { ...board.rect, target: { ...board.target } }, soul: { x: soul.x, y: soul.y, invuln: soul.invuln } };
  const enemy = { id: 'choimis_flower', x: 396, y: 176, hp: 4, maxHp: 4, dead: false, dying: 0, patternPose: null, img: { width: 320, height: 320 }, def: { damage: 15, voice: 'choimis_flower' },
    actionImages: { choso: { width: 320, height: 320 } }, projectiles: { dao: { width: 111, height: 120 }, bazzi: { width: 94, height: 120 } } };
  const soundHandles = [], sounds = [];
  const battle = { board, soul, bubble: null, rnd: () => 0.5, game: { sound: { blip() {}, sfx(name) { const handle = { name, paused: false, src: name, pause() { this.paused = true; }, removeAttribute() { this.src = ''; }, load() {} }; soundHandles.push(handle); return handle; } } }, sfx(name, options) { sounds.push({ name, options }); }, hurtParty() {}, hitEnemy(target, member, damage) { target.hp -= damage; return damage; }, drawTextBox() {} };
  return { board, soul, enemy, old, battle, soundHandles, sounds, mode: createChoimisPinkRound(battle, { enemy, config }) };
}

function enterRound(run) {
  run.board.snap();
  for (let time = 0; time < 3 && run.mode.snapshot.phase !== 'combat'; time += 0.05) run.mode.update(0.05, none);
  assert.equal(run.mode.snapshot.phase, 'combat');
}

test('test_choimis_pink_round_opens_without_popping_and_restores_owned_state', () => {
  const run = modeFixture({ scenario: 'kart_block', speak: '막자할게' });
  assert.deepEqual(run.board.rect, { x: 20, y: 246, w: 440, h: 72 }, 'constructor leaves fade-out frame geometry intact');
  assert.ok(run.mode.snapshot.scenario.boss.x > BOX.x + BOX.w, 'boss begins outside the far end instead of popping in');
  assert.equal(run.enemy.patternPose.hidden, true); assert.equal(run.battle.bubble.text, '막자할게');
  for (let time = 0; time < 1.2; time += 0.05) { run.board.update(0.05); run.mode.update(0.05, none); }
  assert.equal(run.mode.snapshot.phase, 'combat');
  for (const key of ['x', 'y', 'w', 'h']) assert.ok(Math.abs(run.board.rect[key] - BOX[key]) < 0.01, `wide board ${key} reaches the 430px contract`);
  assert.equal(run.mode.snapshot.heart.x, 64); assert.equal(run.mode.snapshot.scenario.boss.x, BOX.x + BOX.w - 32);
  run.mode.dispose();
  assert.deepEqual(run.board.rect, { x: run.old.board.x, y: run.old.board.y, w: run.old.board.w, h: run.old.board.h });
  assert.deepEqual({ x: run.soul.x, y: run.soul.y, invuln: run.soul.invuln }, run.old.soul);
  assert.equal(run.enemy.patternPose, null); assert.equal(run.battle.bubble, null);
});

test('test_choimis_pink_round_uses_official_charge_then_full_shot_audio_and_cancels_handle', () => {
  const run = modeFixture({ scenario: 'kart_block', speak: '준비' });
  enterRound(run);
  run.mode.update(0.01, none); run.mode.update(1, { down: key => key === 'confirm' });
  assert.deepEqual(run.soundHandles.map(handle => handle.name), ['yellowheart_charge']);
  run.mode.update(0.01, none);
  assert.equal(run.sounds.at(-1).name, 'yellowheart_shot_big');
  run.mode.dispose();
});

test('test_choimis_pink_round_stops_hazards_on_boss_death_and_completes_only_when_enemy_is_dead', () => {
  const run = modeFixture({ scenario: 'pink_prism', speak: '준비' });
  enterRound(run);
  run.mode.update(0.01, none); run.mode.update(0.25, { down: key => key === 'confirm' });
  assert.equal(run.soundHandles.length, 1, 'active charge handle exists before death cleanup');
  run.enemy.hp = 0; run.enemy.dying = 0.5;
  assert.equal(run.mode.update(0.1, none), false);
  assert.equal(run.mode.snapshot.terminating, true); assert.deepEqual(run.mode.snapshot.shots, []);
  assert.ok(run.soundHandles[0].paused && run.soundHandles[0].src === '', 'dying cleanup stops the charge handle');
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
    enterRound(run);
    const snap = run.mode.snapshot;
    assert.deepEqual(run.board.rect, BOX); assert.deepEqual(snap.board, BOX); assert.equal(snap.heart.x, 64);
    assert.ok(snap.scenario.boss.x > BOX.x + BOX.w * 0.75 && snap.scenario.boss.x < BOX.x + BOX.w, `${name} boss is far-right inside arena`);
    const calls = [], ctx = new Proxy({}, { get(target, key) { return target[key] ?? ((...args) => calls.push([key, ...args])); }, set(target, key, value) { target[key] = value; return true; } });
    run.mode.draw(ctx);
    assert.ok(calls.some(call => call[0] === 'drawImage'), `${name} draws approved whiteSprite boss`);
    assert.deepEqual(calls.filter(call => call[0] === 'fillText').map(call => call[1]), [L.battle_choimis_pink_round_controls]);
    if (name === 'choso') assert.ok(snap.scenario.beams.every(beam => Math.abs(beam.from.x - snap.scenario.boss.x) < 30));
    if (name === 'pink_prism') assert.ok(snap.scenario.bolts.every(bolt => bolt.oldX > BOX.x + BOX.w * 0.75));
    run.mode.dispose();
  }
});

test('test_all_pink_rounds_keep_heart_x_fixed_scroll_and_end_only_after_eighteen_combat_seconds', () => {
  for (const scenario of ['choso', 'kart_block', 'pink_prism']) {
    const run = modeFixture({ scenario, speak: scenario === 'choso' ? '내 추구미는 쵸소우야' : '준비' }); enterRound(run);
    const x = run.mode.snapshot.heart.x, beforeScroll = run.mode.snapshot.scroll;
    for (let elapsed = 0; elapsed < CHOIMIS_PINK_ROUND_SECONDS - 0.01; elapsed += 0.1) {
      assert.equal(run.mode.update(Math.min(0.1, CHOIMIS_PINK_ROUND_SECONDS - 0.01 - elapsed), none), false);
    }
    assert.equal(run.mode.snapshot.phase, 'combat'); assert.equal(run.mode.snapshot.heart.x, x); assert.ok(run.mode.snapshot.scroll > beforeScroll);
    assert.equal(run.mode.update(0.02, none), true); assert.equal(run.mode.snapshot.phase, 'done'); assert.equal(run.mode.snapshot.combatElapsed, CHOIMIS_PINK_ROUND_SECONDS);
    run.mode.dispose();
  }
});

test('test_choso_preamble_transform_then_attack_line_precedes_eighteen_second_combat', () => {
  const run = modeFixture({ scenario: 'choso', speak: '내 추구미는 쵸소우야' }); run.board.snap();
  assert.equal(run.battle.bubble.text, '내 추구미는 쵸소우야'); assert.equal(run.mode.snapshot.transformed, false);
  for (let time = 0; time < 1.2 && run.mode.snapshot.phase === 'prep'; time += 0.05) run.mode.update(0.05, none);
  assert.equal(run.mode.snapshot.phase, 'transform'); assert.equal(run.mode.snapshot.transformed, false);
  for (let time = 0; time < 0.7 && run.mode.snapshot.phase === 'transform'; time += 0.05) run.mode.update(0.05, none);
  assert.equal(run.mode.snapshot.phase, 'announce'); assert.equal(run.mode.snapshot.transformed, true); assert.equal(run.battle.bubble.text, '천혈!');
  enterRound(run); assert.equal(run.mode.snapshot.combatElapsed, 0);
});

test('test_pink_round_panel_keeps_plain_controls_without_hit_count_objectives', () => {
  assert.equal(L.battle_choimis_pink_round_controls, '↑↓ 이동 · C 탭 발사 / 길게 눌러 충전');
  assert.doesNotMatch(L.battle_choimis_pink_round_controls, /3발|6번|4명|코어|피해/);
  assert.equal(L.battle_choimis_pink_choso_preamble, '내 추구미는 쵸소우야');
  assert.equal(L.battle_choimis_pink_choso_attack, '천혈!');
});

test('test_pink_round_dispose_clears_shots_charge_and_boss_contact_remainder_persists_only_on_enemy', () => {
  const run = modeFixture({ scenario: 'kart_block', speak: '준비' });
  run.enemy.pinkShotHits = 2; enterRound(run);
  run.mode.update(0.01, none); run.mode.update(0.25, { down: key => key === 'confirm' });
  run.mode.dispose();
  assert.equal(run.mode.snapshot.disposed, true); assert.deepEqual(run.mode.snapshot.shots, []);
  assert.equal(run.mode.snapshot.charge.active, false); assert.equal(run.enemy.pinkShotHits, 2, 'round cleanup preserves fight-local remainder');
  assert.ok(run.soundHandles[0].paused && run.soundHandles[0].src === '', 'dispose cancels active charge audio');
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
