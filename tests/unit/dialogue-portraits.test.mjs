import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { TextBox } from '../../src/ui/dialogue.js';
import { shipLoungeScripts } from '../../src/data/cutscenes/ship_lounge.js';
import { CHARACTERS } from '../../src/data/characters.js';

const source = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const drawCalls = [];
const Game = runInNewContext(source.slice(source.indexOf('class Game {'), source.indexOf('// ── 부트')) + '\nGame;', {
  CHARACTERS: { park_guardian: {}, park_guardian_costume: CHARACTERS.park_guardian_costume, hyungsub: {}, hidden: { portrait: false } },
  PALETTES: { hero: {} }, YOUNGCLE_TV_PORTRAITS: ['youngcle_tv_greet'],
  makeCanvas: () => ({ width: 48, height: 48, getContext: () => ({ drawImage: (...args) => drawCalls.push(args) }) }),
  artToCanvas: () => ({ generic: true }), TORSO: { down: Array(16).fill('................') },
  monoPortrait: canvas => canvas,
});
const ctx = { measureText: text => ({ width: text.length * 10 }) };

test('test_lounge_guardian_dialogue_uses_the_present_costume_face', () => {
  const map = JSON.parse(readFileSync(new URL('../../assets/maps/ship_lounge.json', import.meta.url), 'utf8'));
  const actor = map.entities.find(entity => entity.id === 'lounge_park_guardian');
  const lines = shipLoungeScripts.ship_lounge_park_guardian.filter(node => node.text);
  assert.equal(lines.length, 3);
  for (const node of lines) {
    assert.equal(node.portrait, actor.sprite);
    assert.equal(node.voice, 'park_guardian_costume');
  }
});

test('test_missing_portrait_never_fabricates_a_generic_character_face', () => {
  const portraits = Game.prototype.makePortraits.call({ spriteOverrides: {} });
  assert.deepEqual(Object.keys(portraits), []);
});

test('test_loaded_real_sheet_face_remains_available_without_a_portrait_png', () => {
  drawCalls.length = 0;
  const png = readFileSync(new URL(`../../${CHARACTERS.park_guardian_costume.sheet}`, import.meta.url));
  const sheet = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
  const portraits = Game.prototype.makePortraits.call({ spriteOverrides: { park_guardian_costume: sheet, hidden: sheet } });
  assert.deepEqual(Object.keys(portraits), ['park_guardian_costume']);
  assert.equal(drawCalls.length, 1);
  assert.equal(drawCalls[0][0], sheet);
});

test('test_rebuilding_portraits_preserves_a_loaded_portrait_file', () => {
  const face = { approved: true };
  const portraits = Game.prototype.makePortraits.call({
    spriteOverrides: { hyungsub: { width: 256, height: 256 } },
    portraits: { hyungsub: face }, portraitFiles: new Set(['hyungsub']),
  });
  assert.equal(portraits.hyungsub, face);
});

test('test_unknown_or_null_portrait_reclaims_space_preserving_speaker_voice_and_pages', () => {
  const face = { approved: true };
  const box = new TextBox({}, { hyungsub: face });
  const node = { speaker: '파크가디언', voice: 'park_guardian', text: '안녕하세요 '.repeat(45) };
  box.show({ ...node, portrait: 'hyungsub' }, ctx);
  const faceWidth = box.textWidth();
  assert.equal(box.portrait, face);
  for (const portrait of ['unknown', null]) {
    box.show({ ...node, portrait }, ctx);
    assert.equal(box.portrait, null);
    assert.equal(box.textWidth(), faceWidth + 56);
    assert.equal(box.speaker, node.speaker);
    assert.equal(box.voice, node.voice);
    assert.ok(box.pages.length > 1);
    for (const line of box.pages.flat()) assert.ok(line.reduce((width, token) => width + token.w, 0) <= box.textWidth());
  }
});
