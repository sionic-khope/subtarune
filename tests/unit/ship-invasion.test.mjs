import test from 'node:test';
import assert from 'node:assert/strict';
import { ShipInvasion, finishShipInvasion, prepareShipInvasion } from '../../src/scenes/ship-invasion.js';
import { SHIP_INVASION as C } from '../../src/data/ship-invasion.js';
import { invasionRoomDebris } from '../../src/scenes/ship-invasion-render.js';

async function setup() {
  const cues = [], handles = [];
  const game = { mapAssets: { image: async path => ({ width: 768, height: path.includes('warship') ? 384 : path.includes('maillard') ? 496 : 768 }) }, sound: {
    preloadBgm() {}, loadSfxFiles: async () => {},
    sfx(key) { cues.push(key); const audio = { pause() { this.paused = true; } }; handles.push(audio); return audio; },
    playBgm(key) { this.bgmName = key; cues.push(`bgm:${key}`); }, stopBgm() { this.bgmName = null; },
  } };
  const scene = await prepareShipInvasion(game);
  return { game, scene, cues, handles };
}

test('test_invasion_sailing_pan_keeps_castle_outside_then_holds_exact_ratio', async () => {
  const { scene } = await setup();
  scene.setBeat('sail'); scene.update(3);
  assert.equal(scene.done, true);
  assert.ok(scene.snapshot.castle.x > 480);
  scene.setBeat('castle-look'); scene.update(C.timing.pan);
  assert.equal(scene.done, false);
  assert.ok(scene.snapshot.castle.x >= 0);
  assert.ok(scene.snapshot.castle.x + scene.snapshot.castle.width <= 480);
  assert.ok(Math.abs(scene.snapshot.castle.width / scene.snapshot.warship.width - C.world.castleWidth / C.world.warshipWidth) < 1e-10);
  scene.update(C.timing.castleHold);
  assert.equal(scene.done, true);
});

test('test_invasion_drop_contact_once_precedes_split_without_restarting_music', async () => {
  const { scene, cues } = await setup();
  scene.setBeat('room-impact');
  scene.update(1.1);
  assert.deepEqual(cues, [C.sound.impact, `bgm:${C.bgm}`]);
  scene.setBeat('castle-drop');
  scene.update(C.timing.fall - 0.01);
  assert.equal(scene.snapshot.contact, false);
  assert.equal(scene.snapshot.split, 0);
  assert.equal(scene.impactCount, 0);
  scene.update(0.02);
  assert.equal(scene.snapshot.contact, true);
  assert.equal(scene.snapshot.split, 0);
  assert.equal(scene.impactCount, 1);
  assert.deepEqual(cues, [C.sound.impact, `bgm:${C.bgm}`, C.sound.impact, C.sound.splash]);
  scene.update(C.timing.pullback + C.timing.impactHold + 0.001);
  assert.equal(scene.done, true);
  assert.equal(scene.snapshot.split, 1);
  assert.equal(scene.snapshot.castle.width, C.world.wideCastleWidth);
  assert.equal(scene.snapshot.castle.x + scene.snapshot.castle.width / 2, scene.snapshot.warship.x + scene.snapshot.warship.width / 2);
  scene.setBeat('castle-drop'); scene.update(1);
  assert.equal(scene.impactCount, 1);
  assert.equal(cues.filter(key => key === C.sound.impact).length, 2);
  assert.equal(cues.filter(key => key === `bgm:${C.bgm}`).length, 1);
});

test('test_invasion_initial_room_blast_drops_visible_fragments_and_owns_music_on_abort', async () => {
  const { game, scene, cues } = await setup();
  scene.setBeat('room-impact');
  assert.equal(scene.fullFrame, false);
  assert.equal(scene.musicStarted, true);
  scene.update(0.4);
  const early = invasionRoomDebris(scene);
  assert.ok(early.filter(piece => piece.y > 0 && piece.y < 230).length >= 6);
  scene.update(0.3);
  assert.ok(invasionRoomDebris(scene)[0].y > early[0].y + 30);
  scene.setBeat('hidden'); scene.setBeat('room-impact');
  assert.equal(cues.filter(key => key === `bgm:${C.bgm}`).length, 1);
  finishShipInvasion(game, true);
  assert.equal(game.sound.bgmName, null);
  assert.equal(game.shipInvasion, null);
});

test('test_invasion_teleport_staggers_five_lights_once_and_cleans_owned_sounds', async () => {
  const { game, scene, cues, handles } = await setup();
  scene.setBeat('room-impact');
  scene.setBeat('castle-drop'); scene.update(2);
  scene.setBeat('teleport'); scene.update(0.64);
  assert.equal(scene.launchCount, 0);
  scene.update(0.02);
  assert.equal(scene.launchCount, 1);
  assert.ok(scene.snapshot.teleports[0].progress > 0);
  assert.equal(scene.snapshot.teleports[1].progress, 0);
  scene.update(3);
  assert.equal(scene.done, true);
  assert.equal(scene.launchCount, 5);
  assert.equal(cues.filter(key => key === C.sound.launch).length, 5);
  finishShipInvasion(game, true);
  assert.equal(game.shipInvasion, null);
  assert.equal(game.sound.bgmName, null);
  assert.ok(handles.every(h => h.paused));
  const before = scene.time;
  scene.update(10);
  assert.equal(scene.time, before);
});

test('test_invasion_disposal_during_prepare_cannot_restore_scene', async () => {
  const releases = [];
  const game = { mapAssets: { image: () => new Promise(resolve => { releases.push(resolve); }) }, sound: { preloadBgm() {}, loadSfxFiles: async () => {} } };
  const scene = new ShipInvasion(game);
  scene.dispose();
  for (const release of releases) release({ width: 768, height: 768 });
  await scene.ready;
  assert.equal(scene.loaded, false);
  assert.equal(scene.fullFrame, false);
});

test('test_invasion_normal_finish_preserves_story_music_and_hidden_room_view', async () => {
  const { game, scene } = await setup();
  scene.setBeat('room-impact');
  scene.setBeat('room-shadow');
  assert.equal(scene.fullFrame, false);
  scene.setBeat('hidden');
  assert.equal(scene.fullFrame, false);
  assert.throws(() => scene.setBeat('invented-beat'), RangeError);
  scene.setBeat('castle-drop'); scene.update(2);
  finishShipInvasion(game);
  assert.equal(game.sound.bgmName, C.bgm);
  assert.equal(game.shipInvasion, null);
});
