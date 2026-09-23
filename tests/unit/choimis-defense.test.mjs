import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../../src/battle/battle.js';
import { createChoimisDefenseCinematic } from '../../src/battle/choimis-defense-cinematic.js';
import { Board, Soul } from '../../src/battle/bullets.js';
import { getBattleMode, registerBattleMode } from '../../src/battle/modes.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { createPinkBossContact } from '../../src/battle/modes/choimis-pink-round.js';

function dialogueBattle() {
  const sounds = [];
  const battle = {
    text: '', shown: 0, speaker: null, portrait: null, voice: null,
    setText(text) { this.text = text; this.shown = 0; this.speaker = null; },
    showLine(line) {
      this.setText(typeof line === 'string' ? line : line.text);
      if (typeof line !== 'string') { this.speaker = line.speaker; this.portrait = line.portrait; this.voice = line.voice; }
    },
    get typed() { return this.shown >= this.text.length; },
    sfx(name, options) { sounds.push({ name, options }); },
    drawTextBox() {},
  };
  return { battle, sounds };
}

const input = pressed => ({ just: key => pressed && key === 'confirm' });

test('test_choimis_defense_cinematic_activates_only_after_both_exact_lines_and_charge', () => {
  const { battle, sounds } = dialogueBattle();
  const enemy = { id: 'choimis_flower', x: 396, y: 176, defenseBoosted: false };
  const cinematic = createChoimisDefenseCinematic(battle, enemy);

  assert.equal(battle.text, '* 분홍의 힘이 나를 감싼다.');
  assert.equal(battle.speaker, '최미스');
  cinematic.update(0.2, input(true));
  assert.equal(enemy.defenseBoosted, false);
  cinematic.update(0.2, input(true));
  assert.deepEqual(sounds, [{ name: 'power', options: { volume: 0.82 } }]);
  assert.equal(cinematic.snapshot.phase, 'charge');
  assert.equal(cinematic.snapshot.flowers, 32);

  const fills = [];
  cinematic.draw({ globalAlpha: 1, fillStyle: '', fillRect: (...args) => fills.push(args) });
  assert.ok(fills.length >= 32 * 5, 'abundant flower petals render during the charge');
  cinematic.update(2.8, input(false));
  assert.equal(battle.text, '* 최미스의 방어력이 강화되었다.');
  assert.equal(enemy.defenseBoosted, false);
  cinematic.update(0.2, input(true));
  assert.equal(enemy.defenseBoosted, false);
  assert.equal(cinematic.update(0.2, input(true)), true);
  assert.equal(enemy.defenseBoosted, true);
});

test('test_choimis_boosted_defense_clamps_normal_hits_without_affecting_other_enemies', () => {
  const battle = Object.assign(Object.create(Battle.prototype), {
    game: { attack: 12 }, support: null,
    sfx() {}, setText() {},
  });
  const choimis = { id: 'choimis_flower', hp: 200, maxHp: 200, dead: false, dying: 0, def: ENEMIES.choimis_flower };
  assert.equal(battle.hitEnemy(choimis, null, 12), 12);
  choimis.hp = 188; choimis.defenseBoosted = true;
  assert.equal(battle.hitEnemy(choimis, null, 99, { source: 'cannon', sound: false }), 3);
  assert.equal(choimis.hp, 185);
  assert.equal(battle.hitEnemy(choimis, null, 12), 3);
  assert.equal(choimis.hp, 182);

  const other = { id: 'cs_red', hp: 30, maxHp: 30, dead: false, dying: 0, defenseBoosted: true, def: { reactive: null, lines: {} } };
  assert.equal(battle.hitEnemy(other, null, 12), 12);
  assert.equal(other.hp, 18);
});

test('test_choimis_boosted_defense_preserves_real_pink_contact_damage_and_remainder', () => {
  const battle = Object.assign(Object.create(Battle.prototype), {
    game: { attack: 12 }, support: null, sfx() {}, setText() {},
  });
  const enemy = { id: 'choimis_flower', hp: 20, dead: false, dying: 0, defenseBoosted: true, def: ENEMIES.choimis_flower };
  const boss = { id: 'choimis-boss', x: 350, y: 150, r: 20 };
  const shot = charged => ({ oldX: 322, oldY: 150, x: 378, y: 150, r: charged ? 5 : 3, charged });
  const contact = createPinkBossContact(battle, enemy, () => {});
  contact(shot(false), boss); contact(shot(false), boss);
  assert.equal(enemy.hp, 20);
  assert.equal(enemy.pinkShotHits, 2);
  const charged = shot(true);
  assert.equal(contact(charged, boss), true);
  assert.equal(contact(charged, boss), false);
  assert.equal(enemy.hp, 19);
  assert.equal(enemy.pinkShotHits, 2);
  contact(shot(false), boss);
  assert.equal(enemy.hp, 18);
  assert.equal(enemy.pinkShotHits, 0);
});

test('test_choimis_eating_race_reward_bypasses_defense_but_waits_for_finale_and_rejects_duplicate_hits', () => {
  const sounds = [];
  const battle = Object.assign(Object.create(Battle.prototype), {
    game: { attack: 12 }, support: null, sfx(name) { sounds.push(name); }, setText() {},
  });
  const enemy = { id: 'choimis_flower', hp: 25, dead: false, dying: 0, defenseBoosted: true, def: ENEMIES.choimis_flower };
  assert.equal(battle.hitEnemy(enemy, null, 10, { source: 'choimis-eating-race' }), 10);
  assert.equal(enemy.hp, 15);
  assert.equal(battle.hitEnemy(enemy, null, 10), 3);
  assert.equal(enemy.hp, 12);
  enemy.hp = 7;
  assert.equal(battle.hitEnemy(enemy, null, 10, { source: 'choimis-eating-race' }), 6);
  assert.equal(enemy.hp, 1);
  assert.equal(enemy.dying, 0);
  assert.equal(enemy.finalePending, true);
  assert.equal(sounds.filter(name => name === 'vaporized').length, 0);
  assert.equal(battle.hitEnemy(enemy, null, 10, { source: 'choimis-eating-race' }), 0);
});

test('test_choimis_post_opening_routes_once_then_retry_clears_defense', () => {
  const { battle: dialogue } = dialogueBattle();
  const enemy = { id: 'choimis_flower', hp: 200, maxHp: 200, dead: false, down: false, def: {}, defenseBoosted: false };
  const battle = Object.assign(Object.create(Battle.prototype), {
    text: dialogue.text, shown: dialogue.shown, speaker: dialogue.speaker,
    portrait: dialogue.portrait, voice: dialogue.voice,
    setText: dialogue.setText, showLine: dialogue.showLine, drawTextBox: dialogue.drawTextBox,
    pendingPostOpening: 'choimis_pink_shooter', enemies: [enemy], members: [], support: null,
    bullets: [], bubble: null, board: new Board(), soul: new Soul(), plans: [], fx: [], patterns: [],
    targets() { return [enemy]; }, alive() { return []; },
  });
  battle.afterEnemyPhase();
  assert.equal(battle.state, 'interlude');
  assert.equal(battle.pendingPostOpening, null);
  assert.equal(enemy.defenseBoosted, false);

  battle.cancelPendingBgm = () => {};
  battle.disposeGimmick = () => {};
  battle.sfx = () => {};
  battle.game = { fadeTo() {}, sound: { preloadBgm() {} }, shake: null };
  battle.cfg = { seamlessIntro: 'choimis_sky' };
  battle.beginRetry();
  assert.equal(enemy.defenseBoosted, false);
  assert.equal(battle.pendingPostOpening, null);
});

test('test_pattern_mode_seam_passes_exact_config_and_advances_once', () => {
  const modeName = 'choimis_test_config_mode';
  let received = null;
  registerBattleMode('enemy', modeName, (_battle, context) => { received = context; return { update: () => false }; });
  const config = { type: 'choimis_pink_kart', mode: modeName, scenario: 'kart_block', speak: '막자할게' };
  const enemy = { id: 'choimis_flower', hp: 200, maxHp: 200, dead: false, enraged: false, patternIdx: 0, def: { patterns: [config], lines: { speak: [] } } };
  const battle = Object.assign(Object.create(Battle.prototype), {
    enemies: [enemy], members: [], modes: { enemy: 'bullets' }, support: null,
    rnd: () => 0, t: 0, bubble: null, state: 'menu',
    setText() {}, living() { return [enemy]; },
  });
  battle.beginEnemyTurn();
  assert.equal(battle.state, 'enemy-mode');
  assert.equal(enemy.patternIdx, 1);
  assert.equal(received.enemy, enemy);
  assert.equal(received.config, config);
  assert.equal(battle.activeEnemyMode, modeName);
});

test('test_choimis_pink_round_uses_the_same_actor_focus_boundary_as_the_opening', () => {
  assert.equal(typeof getBattleMode('enemy', 'choimis_pink_round'), 'function');
  const config = { type: 'choimis_pink_kart', mode: 'choimis_pink_round', scenario: 'kart_block' };
  const enemy = { id: 'choimis_flower', hp: 200, maxHp: 200, dead: false, enraged: false, patternIdx: 0,
    actionImages: {}, projectiles: {}, def: { damage: 15, patterns: [config], lines: {} } };
  const battle = Object.assign(Object.create(Battle.prototype), {
    enemies: [enemy], members: [], modes: { enemy: 'bullets' }, support: null,
    rnd: () => 0, t: 0, bubble: null, state: 'menu', board: new Board(), soul: new Soul(),
    game: { sound: { blip() {} } },
    setText() {}, sfx() {}, hurtParty() {}, living() { return [enemy]; },
  });
  battle.beginEnemyTurn();
  assert.deepEqual(battle.actorFocus, { phase: 'out', t: 0, duration: 0.22 });
  assert.equal(battle.activeEnemyMode, 'choimis_pink_round');
});
