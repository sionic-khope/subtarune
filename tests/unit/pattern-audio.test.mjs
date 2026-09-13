import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../../src/battle/battle.js';
import { Board, Soul } from '../../src/battle/bullets.js';
import { ENEMIES } from '../../src/data/enemies.js';

function fixture(definitions) {
  const sounds = [];
  const enemies = definitions.map(def => ({ x: 360, y: 210, hp: 100, def }));
  const battle = Object.assign(Object.create(Battle.prototype), {
    enemies, board: new Board(), soul: new Soul(), bullets: [], t: 0, rnd: () => 0.5,
    game: { attack: 1, sound: {
      sfx(name, { volume = 0.9 } = {}) { sounds.push({ name, volume }); },
    } },
  });
  return { battle, sounds };
}

test('test_mankatsuki_pattern_audio_is_half_previous_gain_and_other_enemies_keep_default', () => {
  const { battle, sounds } = fixture([ENEMIES.mankatsuki_junhee, { scale: 1 }]);
  battle.patterns = battle.enemies.map((enemy, index) => ({ enemy, dmg: 11, t: 0,
    p: { duration: 1, update(t, dt, api) { api.sfx(`pattern_${index}`); } } }));
  battle.updateBullets(0.1, { down: () => false });
  assert.deepEqual(sounds, [{ name: 'pattern_0', volume: 0.36 }, { name: 'pattern_1', volume: 0.9 }]);
  assert.equal(sounds[0].volume / 0.72, 0.5);
});

test('test_delayed_pattern_audio_retains_its_own_enemy_gain_after_other_patterns_run', () => {
  const delayed = [];
  const { battle, sounds } = fixture([{ ...ENEMIES.mankatsuki_junhee }, { scale: 1, attackSfxVolume: 0.45 }, { scale: 1 }]);
  battle.patterns = battle.enemies.map((enemy, index) => ({ enemy, dmg: 11, t: 0,
    p: { duration: 1, update(t, dt, api) { delayed.push(() => api.sfx(`delayed_${index}`)); } } }));
  battle.updateBullets(0.1, { down: () => false });
  battle.enemies[0].def.attackSfxVolume = 0.1;
  for (const callback of delayed.reverse()) callback();
  assert.deepEqual(sounds, [{ name: 'delayed_2', volume: 0.9 }, { name: 'delayed_1', volume: 0.45 }, { name: 'delayed_0', volume: 0.36 }]);
});

test('test_party_attack_and_mankatsuki_reactive_hit_keep_normal_volume', () => {
  const { battle, sounds } = fixture([ENEMIES.mankatsuki_junhee]);
  battle.hitEnemy(battle.enemies[0], null, 1);
  assert.deepEqual(sounds, [
    { name: 'hit', volume: 0.9 }, { name: 'damage', volume: 0.9 }, { name: 'mankatsuki_hurt', volume: 0.9 },
  ]);
  assert.equal(battle.enemies[0].hp, 99);
});

test('test_party_hurt_and_pattern_speech_keep_their_existing_audio_channels', () => {
  const { battle, sounds } = fixture([ENEMIES.mankatsuki_junhee]);
  const voices = [];
  battle.game.sound.blip = voice => voices.push(voice);
  battle.members = [{ hp: 100, down: false }];
  battle.patterns = [{ enemy: battle.enemies[0], dmg: 11, t: 0,
    p: { duration: 1, update(t, dt, api) { api.sfx('hit'); api.say('삼전'); } } }];
  battle.updateBullets(0.1, { down: () => false });
  battle.hurtParty(11);
  assert.deepEqual(sounds, [{ name: 'hit', volume: 0.36 }, { name: 'hurt', volume: 0.9 }]);
  assert.deepEqual(voices, ['junhee', 'junhee']);
});

test('test_every_normal_and_enraged_mankatsuki_pattern_uses_the_halved_audio_boundary', () => {
  const def = ENEMIES.mankatsuki_junhee;
  for (const config of [...def.patterns, ...def.enragedPatterns]) {
    const { battle, sounds } = fixture([{ ...def, patterns: [config], enragedPatterns: [] }]);
    battle.game.sound.blip = () => {};
    Object.assign(battle.enemies[0], { maxHp: 100, patternIdx: 0 });
    battle.beginBullets();
    battle.soul.invuln = 1000;
    for (let i = 0; i < 240 && battle.state === 'bullets'; i++) {
      battle.t += 0.05;
      battle.updateBullets(0.05, { down: () => false });
    }
    assert.ok(sounds.length > 0, `${config.type} emits attack sounds`);
    assert.ok(sounds.every(sound => sound.volume === 0.36), `${config.type} uses the attack gain`);
    assert.equal(battle.state, 'board-close', `${config.type} completes its delayed projectiles`);
  }
});
