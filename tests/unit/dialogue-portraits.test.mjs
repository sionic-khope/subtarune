import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { TextBox } from '../../src/ui/dialogue.js';
import { shipLoungeScripts } from '../../src/data/cutscenes/ship_lounge.js';
import { CHARACTERS } from '../../src/data/characters.js';
import { resolvePortraitKey } from '../../src/data/portraits.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { YOUNGCLE_TV_PORTRAITS } from '../../src/data/youngcle-tv.js';

const source = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const drawCalls = [];
const Game = runInNewContext(source.slice(source.indexOf('class Game {'), source.indexOf('// ── 부트')) + '\nGame;', {
  CHARACTERS: { park_guardian: {}, park_guardian_costume: CHARACTERS.park_guardian_costume, hyungsub: {}, hidden: { portrait: false } },
  PALETTES: { hero: {} }, YOUNGCLE_TV_PORTRAITS: ['youngcle_tv_greet'],
  makeCanvas: () => ({ width: 48, height: 48, getContext: () => ({ drawImage: (...args) => drawCalls.push(args) }) }),
  artToCanvas: () => ({ generic: true }), TORSO: { down: Array(16).fill('................') },
  monoPortrait: canvas => canvas,
  resolvePortraitKey,
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

test('test_youngcle_alias_uses_existing_canonical_expression_without_a_generic_face', () => {
  const face = { approved: true }, stale = { croppedBody: true };
  const box = new TextBox({}, { youngcle_tv_smirk: face, youngcle: stale });
  box.show({ speaker: '영클', voice: 'youngcle', portrait: 'youngcle', text: '* ㅇㅇ' }, ctx);
  assert.equal(box.portrait, face);
  assert.equal(box.speaker, '영클'); assert.equal(box.voice, 'youngcle');
  const absent = new TextBox({}, { youngcle: stale });
  absent.show({ portrait: 'youngcle', text: '* ㅇㅇ' }, ctx);
  assert.equal(absent.portrait, null);
});

test('test_current_castle_and_lounge_speakers_prepare_real_faces_from_a_cold_cache', async () => {
  const portraitKeys = new Set();
  const visit = node => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== 'object') return;
    if (node.portrait) portraitKeys.add(node.portrait);
    for (const value of Object.values(node)) if (value && typeof value === 'object') visit(value);
  };
  for (const [name, nodes] of Object.entries(SCRIPTS)) if (/castle|ship_lounge|youngcle_lounge|choimis_rescue/.test(name)) visit(nodes);
  const requests = [], images = new Map();
  const RuntimeGame = runInNewContext(source.slice(source.indexOf('class Game {'), source.indexOf('// ── 부트')) + '\nGame;', {
    CHARACTERS, PALETTES: {}, YOUNGCLE_TV_PORTRAITS, resolvePortraitKey, CHARACTER_MOTIONS: {}, MAP_RUNTIME_ASSETS: {},
    storyBgm: () => undefined, Battle: { preload: async () => {} },
    mapScriptAssets: () => ({ portraits: portraitKeys, sprites: [], playerMotions: new Set(), sfx: new Set(), entrySfx: new Set() }),
    makeCanvas: () => ({ width: 48, height: 48, source: null, getContext() { return { drawImage: image => { this.source = image; } }; } }),
    monoPortrait: canvas => canvas,
  });
  const game = Object.assign(Object.create(RuntimeGame.prototype), {
    flags: {}, spriteOverrides: {}, portraits: {}, mapImages: {}, sound: {},
    mapAssets: { images: {}, definition: async () => ({ entities: [], preload: [] }), prepare: async () => {},
      image: async asset => {
        requests.push(asset);
        const file = new URL(`../../${asset}`, import.meta.url);
        if (!existsSync(file)) return null;
        const png = readFileSync(file), image = { asset, width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
        images.set(asset, image); return image;
      } },
  });
  await game._prepareMap('portrait-fixture', []);
  assert.ok(portraitKeys.has('youngcle') && portraitKeys.has('warm_bidet') && portraitKeys.has('ttuulla') && portraitKeys.has('park_guardian_costume'));
  assert.ok(!requests.includes('assets/portraits/youngcle.png'));
  assert.equal(game.portraits.youngcle_tv_smirk, images.get('assets/portraits/youngcle_tv_smirk.png'));
  for (const name of portraitKeys) {
    const key = resolvePortraitKey(name), face = game.portraits[key];
    assert.ok(face, `${name} has a real prepared face without prior map visits`);
    assert.ok(face.asset?.startsWith('assets/portraits/') || face.source?.asset?.startsWith('assets/sprites/'), `${name} face comes from an existing asset`);
    const box = new TextBox({}, game.portraits); box.show({ portrait: name, text: '* 확인' }, ctx);
    assert.equal(box.portrait, face);
  }
});
