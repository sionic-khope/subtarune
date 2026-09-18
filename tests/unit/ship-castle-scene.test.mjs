import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { SHIP_CASTLE, SHIP_CASTLE_BEATS } from '../../src/data/ship-castle.js';
import { ShipCastle } from '../../src/scenes/ship-castle.js';

const context = {
  imageSmoothingEnabled: false,
  drawImage() {},
  fillRect() {},
  translate() {},
  scale() {},
};

globalThis.document ??= {
  createElement() {
    return { width: 0, height: 0, getContext: () => context };
  },
};

const sprite = {
  down: [{}], up: [{}], left: [{}], right: [{}], fw: 32, fh: 48, px: 2,
};

const pngSize = path => {
  const png = readFileSync(new URL(`../../${path}`, import.meta.url));
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
};

const makeGame = (propImages = {}) => {
  const calls = [];
  return {
    calls,
    propImages,
    spriteOverrides: {},
    playerSprite: 'hyungsub',
    player: { sprite },
    entities: [],
    camera: { x: 0, y: 0 },
    sound: {
      bgmName: null,
      preloadBgm(name) { calls.push(['preload', name]); },
      playBgm(name, options) { this.bgmName = name; calls.push(['bgm', name, options]); },
      stopBgm(fade) { calls.push(['stop', fade]); this.bgmName = null; },
      sfx(name, options) { calls.push(['sfx', name, options]); },
    },
    shake: null,
  };
};

test('test_ship_castle_scene_named_beats_are_idempotent_and_switch_full_frame_surface', () => {
  const game = makeGame();
  const scene = new ShipCastle(game);
  assert.equal(scene.beat, 'field_idle');
  assert.equal(scene.fullFrame, false);
  scene.setBeat('field_float');
  scene.update(0.75);
  scene.setBeat('field_float');
  assert.equal(scene.elapsed, 0.75);
  for (const beat of SHIP_CASTLE_BEATS.slice(1)) scene.setBeat(beat);
  assert.equal(game.player.hopY, undefined);
  assert.equal(scene.beat, 'final_hold');
  assert.equal(scene.fullFrame, true);
  assert.throws(() => scene.setBeat('invented_end'), /Unknown ship castle beat/);
});

test('test_ship_castle_reveal_projects_whole_castle_at_six_times_warship_width', () => {
  const propImages = Object.fromEntries(Object.values(SHIP_CASTLE.images).map(path => [path, pngSize(path)]));
  const scene = new ShipCastle(makeGame(propImages));
  scene.setBeat('castle_reveal');
  scene.update(SHIP_CASTLE.timing.castleReveal);
  const snapshot = scene.snapshot();
  const { castle, warship } = snapshot.geometry;
  assert.equal(snapshot.castleToWarship, 6);
  assert.ok(castle.width / warship.width >= 5.95);
  assert.ok(castle.x >= 0 && castle.x + castle.width <= 480);
  assert.ok(castle.y >= 0 && castle.y + castle.height <= 360);
  assert.ok(SHIP_CASTLE.timing.castleHold >= 0.8);
  assert.equal(snapshot.skyScaleRatio, 1.89);
  assert.deepEqual(snapshot.skyGrips, {
    gajaeman: [-20, -46],
    yoplait: [14, -36],
  });
});

test('test_ship_castle_retreat_keeps_connected_ships_together_and_abort_releases_audio', () => {
  const game = makeGame();
  const scene = new ShipCastle(game);
  scene.setBeat('ocean_rise');
  scene.setBeat('castle_attack');
  scene.update(0.86);
  const attackBeams = scene.beamIndex;
  const before = scene.snapshot().geometry;
  scene.setBeat('retreat');
  for (let elapsed = 0; elapsed < SHIP_CASTLE.timing.retreat; elapsed += 0.1) scene.update(0.1);
  const after = scene.snapshot().geometry;
  assert.equal(before.warship.x - before.maillard.x, after.warship.x - after.maillard.x);
  assert.equal(scene.beamIndex - attackBeams, SHIP_CASTLE.ocean.beamCount);
  scene.dispose();
  assert.equal(scene.disposed, true);
  assert.equal(game.sound.bgmName, null);
  assert.ok(game.calls.some(call => call[0] === 'stop'));
});
