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

test('test_mankatsuki_pattern_audio_is_twenty_percent_lower_and_other_enemies_keep_default', () => {
  const { battle, sounds } = fixture([ENEMIES.mankatsuki_junhee, { scale: 1 }]);
  battle.patterns = battle.enemies.map((enemy, index) => ({ enemy, dmg: 11, t: 0,
    p: { duration: 1, update(t, dt, api) { api.sfx(`pattern_${index}`); } } }));
  battle.updateBullets(0.1, { down: () => false });
  assert.deepEqual(sounds, [{ name: 'pattern_0', volume: 0.72 }, { name: 'pattern_1', volume: 0.9 }]);
  assert.ok(Math.abs(sounds[0].volume / sounds[1].volume - 0.8) < 1e-12);
});

test('test_delayed_pattern_audio_retains_its_own_enemy_gain_after_other_patterns_run', () => {
  const delayed = [];
  const { battle, sounds } = fixture([{ ...ENEMIES.mankatsuki_junhee }, { scale: 1, attackSfxVolume: 0.45 }, { scale: 1 }]);
  battle.patterns = battle.enemies.map((enemy, index) => ({ enemy, dmg: 11, t: 0,
    p: { duration: 1, update(t, dt, api) { delayed.push(() => api.sfx(`delayed_${index}`)); } } }));
  battle.updateBullets(0.1, { down: () => false });
  battle.enemies[0].def.attackSfxVolume = 0.1;
  for (const callback of delayed.reverse()) callback();
  assert.deepEqual(sounds, [{ name: 'delayed_2', volume: 0.9 }, { name: 'delayed_1', volume: 0.45 }, { name: 'delayed_0', volume: 0.72 }]);
});

test('test_party_attack_and_mankatsuki_reactive_hit_keep_normal_volume', () => {
  const { battle, sounds } = fixture([ENEMIES.mankatsuki_junhee]);
  battle.hitEnemy(battle.enemies[0], null, 1);
  assert.deepEqual(sounds, [
    { name: 'hit', volume: 0.9 }, { name: 'damage', volume: 0.9 }, { name: 'mankatsuki_hurt', volume: 0.9 },
  ]);
  assert.equal(battle.enemies[0].hp, 99);
});
