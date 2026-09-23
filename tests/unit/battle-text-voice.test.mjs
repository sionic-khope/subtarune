import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../../src/battle/battle.js';
import { Sound, VOICES } from '../../src/core/audio.js';
import { CHOIMIS_FINALE } from '../../src/data/choimis-finale.js';

function fixture() {
  const tones = [], sound = new Sound();
  sound.tone = voice => tones.push(voice);
  const battle = Object.assign(Object.create(Battle.prototype), { game: { sound } });
  return { battle, sound, tones };
}

test('test_battle_finale_lend_power_types_complete_text_without_default_voice_synthesis', () => {
  const { battle, sound, tones } = fixture();
  const line = CHOIMIS_FINALE.intro.at(-1);
  battle.showLine(line);
  battle.typeText(0.022);
  assert.equal(battle.shown, 1, 'silent dialogue still reveals its first character normally');
  battle.typeText(10);
  assert.equal(battle.text, '* 마지막 모두의 힘을 합쳐.');
  assert.equal(battle.typed, true);
  assert.equal(battle.shown, line.text.length);
  assert.deepEqual(tones, [], 'voice:none must not fall through Sound.blip to the default synth');
  assert.equal(sound._lastVoice, undefined, 'silent dialogue must never call Sound.blip');
});

test('test_battle_narration_still_blips_each_visible_character_and_skips_whitespace', () => {
  const { battle, tones } = fixture();
  battle.showLine('* 가 나\n다');
  battle.typeText(10);
  assert.equal(battle.typed, true);
  assert.deepEqual(tones, Array(4).fill(VOICES.narrator));
  battle.typeText(10);
  assert.equal(tones.length, 4, 'completed text must not replay blips');
});

test('test_battle_character_voice_resumes_after_silent_finale_line', () => {
  const { battle, tones } = fixture();
  battle.showLine(CHOIMIS_FINALE.intro.at(-1));
  battle.typeText(10);
  tones.length = 0;
  battle.showLine(CHOIMIS_FINALE.announcement[0]);
  battle.typeText(0.022);
  assert.equal(battle.voice, 'choimis_flower');
  assert.deepEqual(tones, [VOICES.choimis_flower]);
});
