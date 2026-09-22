import test from 'node:test';
import assert from 'node:assert/strict';
import { Board, Soul } from '../../src/battle/bullets.js';
import { Battle } from '../../src/battle/battle.js';
import { CHOIMIS_PINK_ROUNDS, createChoimisPinkScenario } from '../../src/battle/choimis-pink-rounds.js';
import { createChoimisPinkRound } from '../../src/battle/modes/choimis-pink-round.js';
import { ENEMIES } from '../../src/data/enemies.js';

const BOX = Object.freeze({ x: 85, y: 84, w: 310, h: 150 });
const none = { down: () => false };

function scenarioFixture(name) {
  const soul = { x: 110, y: 159, oldX: 110, oldY: 159, r: 6 };
  const sounds = [], speech = [], damage = [], hits = [];
  const images = { choso: { id: 'choso' }, dao: { id: 'dao' }, bazzi: { id: 'bazzi' } };
  const scenario = createChoimisPinkScenario(name, {
    box: BOX, soul, images, rnd: () => 0.5,
    sfx: (sound, options) => sounds.push({ sound, options }), say: text => speech.push(text),
    hurt: () => { damage.push(15); return true; }, hit: (x, y) => hits.push({ x, y }),
  });
  return { scenario, soul, sounds, speech, damage, hits, images };
}

const crossingShot = (target, charged = false) => ({
  oldX: target.x - 28, oldY: target.y, x: target.x + 28, y: target.y, r: charged ? 5 : 3, charged, dead: false,
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

test('test_choimis_pink_kart_uses_real_character_images_and_lane_dodging_avoids_damage', () => {
  const run = scenarioFixture('kart_block');
  run.soul.y = BOX.y + BOX.h - 15; run.soul.oldY = run.soul.y;
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

function modeFixture(config) {
  const board = new Board(), soul = new Soul();
  board.x = 20; board.y = 246; board.w = 440; board.h = 72; board.target = { w: 440, h: 72, cx: 240, cy: 282 };
  soul.x = 211; soul.y = 277; soul.invuln = 0.3;
  const old = { board: { ...board.rect, target: { ...board.target } }, soul: { x: soul.x, y: soul.y, invuln: soul.invuln } };
  const enemy = { x: 396, y: 176, patternPose: null, def: { damage: 15, voice: 'choimis_flower' },
    actionImages: { choso: { width: 320, height: 320 } }, projectiles: { dao: { width: 111, height: 120 }, bazzi: { width: 94, height: 120 } } };
  const battle = { board, soul, bubble: null, rnd: () => 0.5, game: { sound: { blip() {} } }, sfx() {}, hurtParty() {}, drawTextBox() {} };
  return { board, soul, enemy, old, battle, mode: createChoimisPinkRound(battle, { enemy, config }) };
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
