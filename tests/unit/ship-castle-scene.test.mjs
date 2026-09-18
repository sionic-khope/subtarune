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
  const { castle, warship, maillard } = snapshot.geometry;
  assert.ok(snapshot.castleToWarship >= 6);
  assert.ok(castle.width / warship.width >= 5.95);
  assert.ok(castle.x >= 0 && castle.x + castle.width <= 480);
  assert.ok(castle.y >= 0 && castle.y + castle.height <= 360);
  assert.ok(castle.y < warship.y && castle.y < maillard.y, 'the castle towers over the fleet');
  assert.ok(Math.abs((castle.y + castle.height - SHIP_CASTLE.ocean.waterline) / castle.height - SHIP_CASTLE.ocean.castleSubmerge) < 0.02,
    'only about a tenth of the castle rests under the waterline');
  assert.ok(castle.y + castle.height <= 230);
  assert.ok(warship.y + warship.height <= 230 && maillard.y + maillard.height <= 230);
  assert.ok(SHIP_CASTLE.timing.castleHold >= 0.8);
  assert.equal(snapshot.skyScaleRatio, 1.89);
  assert.deepEqual(snapshot.skyGrips, {
    gajaeman: [-20, -46],
    yoplait: [14, -36],
  });
});

test('test_ship_castle_reveal_gathers_long_then_bursts_out_then_drops_onto_the_water', () => {
  const propImages = Object.fromEntries(Object.values(SHIP_CASTLE.images).map(path => [path, pngSize(path)]));
  const { ocean, timing } = SHIP_CASTLE;
  const game = makeGame(propImages);
  const scene = new ShipCastle(game);
  scene.setBeat('castle_reveal');
  const steps = 70;
  const samples = [];
  for (let step = 0; step < steps; step++) {
    scene.update(timing.castleReveal / steps);
    const geometry = scene.snapshot().geometry;
    samples.push({
      reveal: geometry.reveal,
      width: geometry.castle.width,
      lift: geometry.phase.lift,
      bottom: geometry.castle.y + geometry.castle.height,
      shipX: geometry.warship.x,
    });
    assert.ok(geometry.castle.y >= 0, `castle left the frame at step ${step}`);
  }
  const seeded = [...samples].reverse().find(sample => sample.reveal < ocean.castleGatherAt);
  const emerged = samples.find(sample => sample.reveal >= ocean.castleEmergeAt);
  const last = samples[samples.length - 1];
  assert.ok(timing.castleReveal * ocean.castleGatherAt >= 4, 'the gathering must take its time before anything appears');
  assert.ok(timing.castleReveal * (ocean.castleEmergeAt - ocean.castleGatherAt) <= 2.2, 'the castle must burst out, not creep out');
  assert.ok(seeded.width <= Math.round(ocean.castleSeed * ocean.castleProjectionWidth) + 1, 'gather phase shows only a point');
  assert.ok(emerged.width > seeded.width * 8, 'the castle bursts out of that point');
  assert.ok(Math.max(...samples.map(sample => sample.width)) > last.width, 'it swells past its settled size');
  assert.equal(samples.find(sample => sample.reveal >= ocean.castleEmergeAt).lift, 0, 'it lands the moment it finishes bursting out, never hovers');
  assert.equal(last.lift, 0);
  assert.ok(Math.abs((last.bottom - ocean.waterline) / last.width - ocean.castleSubmerge) < 0.02, 'it rests a tenth under the water');
  assert.equal(new Set(samples.map(sample => sample.shipX)).size, 1);
  assert.equal(game.calls.filter(call => call[0] === 'sfx' && call[1] === 'boom').length, 1);
  assert.equal(game.calls.filter(call => call[0] === 'sfx' && call[1] === 'furnace_blast').length, 1);
  assert.equal(scene.snapshot().castlePopped, true);
  assert.equal(scene.snapshot().castleLanded, true);
});

test('test_ship_castle_ocean_rise_holds_the_wide_fleet_until_the_reaction_lines_release_it', () => {
  const scene = new ShipCastle(makeGame());
  scene.setBeat('ocean_rise');
  for (let step = 0; step < 20; step++) scene.update(0.1);
  const held = scene.snapshot().ascent;
  const heldScreen = scene.snapshot().geometry.screen;
  assert.equal(scene.snapshot().ascentHeld, true);
  assert.equal(held.zoom, 0);
  assert.ok(held.scale < 0.15 && held.bottom < 253);
  scene.beginAscent();
  for (let step = 0; step < 20; step++) scene.update(0.1);
  const pushed = scene.snapshot().ascent;
  const pushedScreen = scene.snapshot().geometry.screen;
  assert.equal(scene.snapshot().ascentHeld, false);
  assert.ok(pushed.zoom > 0.3 && pushed.camera > held.camera * 2);
  assert.ok(pushed.scale < 0.2, 'the pair itself must stay a dot while the camera moves');
  assert.ok(pushedScreen.horizon > heldScreen.horizon && pushedScreen.warshipBottom > heldScreen.warshipBottom);
  assert.ok(pushedScreen.pairScale > heldScreen.pairScale && pushedScreen.pairScale < SHIP_CASTLE.sky.actorScale);
  assert.equal(scene.snapshot().veil, 0);
  for (let step = 0; step < 15; step++) scene.update(0.1);
  assert.equal(scene.snapshot().veil, 1);
  scene.setBeat('sky_tug');
  assert.equal(scene.snapshot().veil, 1);
  scene.update(SHIP_CASTLE.timing.veilIn / 2);
  const opening = scene.snapshot().veil;
  assert.ok(opening > 0 && opening < 1);
  scene.update(SHIP_CASTLE.timing.veilIn);
  assert.equal(scene.snapshot().veil, 0);
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
  assert.ok(Math.abs((before.warship.x - before.maillard.x) - (after.warship.x - after.maillard.x)) <= 1, 'the gangway keeps the pair locked together while they flee');
  assert.ok(before.warship.x - after.warship.x >= SHIP_CASTLE.ocean.retreatDistance - 1, 'they must actually run the full distance');
  assert.equal(scene.beamIndex - attackBeams, SHIP_CASTLE.ocean.beamSchedule.retreat.length);
  assert.equal(SHIP_CASTLE.ocean.beamCount, SHIP_CASTLE.ocean.beamSchedule.castle_attack.length + SHIP_CASTLE.ocean.beamSchedule.retreat.length);
  scene.dispose();
  assert.equal(scene.disposed, true);
  assert.equal(game.sound.bgmName, null);
  assert.ok(game.calls.some(call => call[0] === 'stop'));
});
