import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { clearEditorUnionStage } from '../../src/scenes/editor-union-effects.js';
import { clearChoimisFlowerEffects } from '../../src/data/cutscenes/choimis_flower.js';
import { clearChoimisSky } from '../../src/scenes/choimis-sky-intro.js';
import { clearLoungeBriefing } from '../../src/data/cutscenes/ship_lounge_briefing.js';
import { finishChoimisRescue } from '../../src/scenes/choimis-rescue.js';
import { finishShipInvasion } from '../../src/scenes/ship-invasion.js';
import { finishCastleLobby } from '../../src/scenes/castle-lobby.js';
import { updateCastleOrb, finishCastleOrb } from '../../src/scenes/castle-orb.js';
import { cancelCastlePipe } from '../../src/scenes/castle-pipe.js';
import { finishCastleBoulder, restoreCastleBoulder } from '../../src/scenes/castle-boulder.js';
import { updateCastleBoulderPush, clearCastleBoulderPush } from '../../src/scenes/castle-boulder-push.js';
import { updateCastleGate, finishCastleGate } from '../../src/scenes/castle-gate.js';
import { clearShipDeckPoses } from '../../src/scenes/ship-deck-poses.js';
import { darkSmokeWaiter } from '../../src/ui/dark-smoke.js';
import { CAPTAIN_AURA_COLORS, CAPTAIN_REVEAL_VEIL } from '../../src/data/cutscenes/captain_reveal.js';

// Execute the actual Game methods without starting the browser bootstrap.
const source = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const room = JSON.parse(readFileSync(new URL('../../assets/maps/maillard_captain.json', import.meta.url), 'utf8'));
const Game = runInNewContext(source.slice(source.indexOf('class Game {'), source.indexOf('// ── 부트')) + '\nGame;', {
  Input: { poll() {}, just: () => false }, TEXT_SPEEDS: [{ delay: 0.03 }],
  MAPS: { maillard_captain: room, other: { entities: [], spawns: { start: {} } } },
  MAILLARD_CART: {}, darkSmokeWaiter, CAPTAIN_AURA_COLORS, CAPTAIN_REVEAL_VEIL, clearEditorUnionStage, clearChoimisFlowerEffects, clearChoimisSky,
  clearLoungeBriefing, finishChoimisRescue, finishShipInvasion, finishCastleLobby, clearShipDeckPoses,
  updateCastleOrb, finishCastleOrb, cancelCastlePipe,
  finishCastleBoulder, restoreCastleBoulder, updateCastleBoulderPush, clearCastleBoulderPush,
  updateCastleGate, finishCastleGate, finishCastleCathedral: () => {},
  TileMap: class { constructor(def) { this.def = def; } bake() {} },
  createEntity: definition => ({ ...definition, def: definition }),
});

function fixture(flags = {}) {
  return Object.assign(Object.create(Game.prototype), {
    time: 0, flags, party: [], state: 'field', settings: { textSpeed: 0, sound: true },
    propImages: { sheet: { width: 120, height: 80 } }, booms: [],
    textbox: {}, sound: { muted: false }, sunrise: { update() {}, dispose() {} },
    fade: {}, zoom: {}, chat: { update() {} }, sysdialog: { update() {} },
    vortex: { update() {} }, bubble: { update() {} }, balloon: { update() {} }, entities: [], fx: [], ripples: [],
    flames: [], flameEmitters: [], background: [], dialogue: { running: false },
    maillardArrival: { update() {}, dispose() {} },
    preparedMaps: new Set(['maillard_captain', 'other']), preparedCharacters: new Set(['hyungsub']),
    camera: { snap() {} }, spawnParty() {}, has(key) { return !!this.flags[key]; },
  });
}

function draw(game) {
  const draws = [];
  game.drawBooms({ drawImage: (...args) => draws.push(args) }, { x: 10, y: 20 });
  return draws[0];
}

const definition = { src: 'sheet', x: 100, y: 120, cols: 3, rows: 2, count: 5, fps: 2, scale: 1 };

test('default boom plays one sheet and expires at its original frame boundary', () => {
  const game = fixture();
  game.playBoom(definition);
  game.update(2);
  assert.deepEqual(draw(game).slice(1), [40, 40, 40, 40, 70, 80, 40, 40]);
  game.update(0.5);
  assert.equal(game.booms.length, 0);
});

test('growing boom loops only its declared frames and smoothly grows around the same center', () => {
  const game = fixture();
  game.playBoom({ ...definition, endScale: 3, grow: 4, duration: 7 });
  assert.deepEqual(draw(game).slice(5), [70, 80, 40, 40]);
  game.update(1);
  assert.deepEqual(draw(game).slice(5), [64, 74, 53, 53]);
  game.update(1);
  assert.deepEqual(draw(game).slice(5), [50, 60, 80, 80]);
  game.update(1);
  assert.deepEqual(draw(game).slice(1, 5), [40, 0, 40, 40]);
  game.update(1);
  assert.deepEqual(draw(game).slice(5), [30, 40, 120, 120]);
  game.update(2.9);
  assert.deepEqual(draw(game).slice(5), [30, 40, 120, 120]);
  game.update(0.1);
  assert.equal(game.booms.length, 0);
});

test('growth without duration preserves one-shot expiry and zero grow reaches final size immediately', () => {
  const game = fixture();
  game.playBoom({ ...definition, endScale: 2, grow: 0 });
  assert.deepEqual(draw(game).slice(5), [50, 60, 80, 80]);
  game.update(2.5);
  assert.equal(game.booms.length, 0);
});

test('duration alone can shorten the original one-shot lifespan without changing size', () => {
  const game = fixture();
  game.playBoom({ ...definition, duration: 0.5 });
  game.update(0.25);
  assert.deepEqual(draw(game).slice(5), [70, 80, 40, 40]);
  game.update(0.25);
  assert.equal(game.booms.length, 0);
});

test('captain-room revisit restores the shared purple veil and resident aura', () => {
  const game = fixture({ captain_reveal_done: true });
  game.changeMap('maillard_captain', 'start', true, { bgm: false, enter: false });
  assert.equal(game.darkSmoke.mode, 'veil');
  assert.equal(game.darkSmoke.veil, CAPTAIN_REVEAL_VEIL);
  assert.equal(game.darkSmoke.aura.actor.id, 'captain_mankatsuki');
  assert.equal(game.darkSmoke.aura.colors, CAPTAIN_AURA_COLORS);
  game.changeMap('other', 'start', true, { bgm: false, enter: false });
  assert.equal(game.darkSmoke, null);
});

test('map transition clears an active looping boom before entering the next room', () => {
  const game = fixture();
  game.playBoom({ ...definition, duration: 8, endScale: 3, grow: 5 });
  game.update(3);
  assert.equal(game.booms.length, 1);
  game.changeMap('other', 'start', true, { bgm: false, enter: false });
  assert.equal(game.booms.length, 0);
  assert.equal(draw(game), undefined);
});

test('first captain entry and a completed aftermath never receive restored smoke', () => {
  for (const flags of [{}, { captain_reveal_done: true, captain_mankatsuki_defeated: true, captain_aftermath_done: true }]) {
    const game = fixture(flags);
    game.changeMap('maillard_captain', 'start', true, { bgm: false, enter: false });
    assert.equal(game.darkSmoke, null);
  }
});

test('victory saved before aftermath restores the transformed resident and purple smoke', () => {
  const game = fixture({ captain_reveal_done: true, captain_mankatsuki_defeated: true });
  game.changeMap('maillard_captain', 'start', true, { bgm: false, enter: false });
  assert.equal(game.darkSmoke?.mode, 'veil');
  assert.equal(game.darkSmoke?.veil, CAPTAIN_REVEAL_VEIL);
  assert.equal(game.darkSmoke?.aura.actor.id, 'captain_mankatsuki');
});
