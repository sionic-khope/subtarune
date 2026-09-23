import test from 'node:test';
import assert from 'node:assert/strict';
import { CASTLE_ORB as C, activateCastleOrb, finishCastleOrb, updateCastleOrb,
  drawCastleOrbWorld, drawCastleOrbGround, drawCastleOrbCutaway } from '../../src/scenes/castle-orb.js';

const GATE = Object.freeze({ type: 'prop', id: C.gate, image: 'gate.png', ix: 520, iy: 64, scale: 0.75 });
const LOBBY = Object.freeze({ rows: ['   ', '   '], entities: [GATE] });
function setup() {
  const cues = [], handles = [];
  const game = { mapId: C.map, flags: {}, time: 0, dialogue: { script: [] },
    map: Object.freeze({ def: { entities: [] } }), player: Object.freeze({ x: 228, y: 228 }),
    party: Object.freeze([]), camera: Object.freeze({ x: 0, y: 12, locked: true }),
    textbox: { close() { this.closed = true; } }, propImages: {},
    mapAssets: { images: {}, prepare: async () => LOBBY },
    setFlag(key) { this.flags[key] = true; },
    sound: { bgmName: 'castle_orb', bgm: Object.freeze({ currentTime: 12 }),
      loadSfxFiles: async () => {}, sfx(key) { cues.push(key); const handle = { pause() { this.paused = true; } }; handles.push(handle); return handle; } },
  };
  return { game, cues, handles };
}
const ready = async () => { await Promise.resolve(); await Promise.resolve(); };
function advanceTo(game, beat) {
  for (let i = 0; i < C.beats.length + 1 && game.castleOrb?.beat !== beat; i++) {
    const scene = game.castleOrb; assert.ok(scene); updateCastleOrb(game, scene.duration);
  }
  assert.equal(game.castleOrb.beat, beat);
}

test('test_castle_orb_activation_preserves_live_map_party_camera_position_and_music', async () => {
  const { game, cues, handles } = setup();
  const before = { map: game.map, player: game.player, party: game.party, camera: game.camera, bgm: game.sound.bgm };
  const finished = activateCastleOrb(game); await ready();
  assert.equal(game.textbox.closed, true);
  assert.equal(game.castleOrb.beat, 'charge');
  advanceTo(game, 'crackle'); assert.equal(game.flags[C.flag], undefined);
  advanceTo(game, 'ignite'); updateCastleOrb(game, 0.11); assert.equal(game.flags[C.flag], undefined);
  updateCastleOrb(game, 0.02); assert.equal(game.flags[C.flag], true);
  advanceTo(game, 'returnIn'); updateCastleOrb(game, game.castleOrb.duration); await finished;
  assert.equal(game.castleOrb, null);
  for (const key of ['map', 'player', 'party', 'camera']) assert.equal(game[key], before[key]);
  assert.equal(game.sound.bgm, before.bgm); assert.equal(game.mapId, C.map);
  assert.deepEqual(game.flags, { [C.flag]: true });
  assert.deepEqual(cues, C.sounds); assert.ok(handles.every(handle => handle.paused));
});

test('test_castle_orb_repeated_interaction_does_not_duplicate_scene_or_completed_activation', async () => {
  const { game, cues } = setup();
  const first = activateCastleOrb(game), second = activateCastleOrb(game);
  assert.equal(first, second); await ready();
  advanceTo(game, 'returnIn'); updateCastleOrb(game, game.castleOrb.duration); await first;
  const count = cues.length; await activateCastleOrb(game);
  assert.equal(cues.length, count); assert.equal(game.castleOrb, null);
});

test('test_castle_orb_abort_after_visible_ignition_rolls_back_uncommitted_seal', async () => {
  const { game } = setup(); const promise = activateCastleOrb(game); await ready();
  advanceTo(game, 'ignite'); updateCastleOrb(game, 0.2); assert.equal(game.flags[C.flag], true);
  finishCastleOrb(game); await promise;
  assert.equal(game.flags[C.flag], undefined); assert.equal(game.castleOrb, null);
});

test('test_castle_orb_map_or_script_abort_settles_action_without_new_seal_or_audio', async () => {
  for (const interruption of ['map', 'script', 'explicit']) {
    const { game, handles } = setup();
    const promise = activateCastleOrb(game); await ready(); advanceTo(game, 'crackle');
    if (interruption === 'map') game.mapId = 'room';
    if (interruption === 'script') game.dialogue.script = [];
    if (interruption === 'explicit') finishCastleOrb(game);
    updateCastleOrb(game, 0.1); await promise;
    assert.equal(game.castleOrb, null); assert.equal(game.flags[C.flag], undefined);
    assert.ok(handles.every(handle => handle.paused));
  }
});

test('test_castle_orb_cancelled_preload_never_revives_or_erases_new_scene', async () => {
  const { game, cues } = setup(); let release;
  game.mapAssets.prepare = () => new Promise(resolve => { release = resolve; });
  const promise = activateCastleOrb(game), old = game.castleOrb;
  finishCastleOrb(game); await promise;
  const replacement = {}; game.castleOrb = replacement;
  release(LOBBY); await ready();
  assert.equal(game.castleOrb, replacement); assert.equal(old.disposed, true);
  assert.deepEqual(cues, []); assert.equal(game.flags[C.flag], undefined);
});

function context() {
  const calls = [], ctx = new Proxy({ calls, createRadialGradient: () => ({ addColorStop() {} }) },
    { get(target, key) { if (key in target) return target[key]; return (...args) => calls.push([key, ...args]); } });
  return ctx;
}

test('test_castle_orb_persistent_lobby_overlay_targets_only_right_sphere', () => {
  const { game } = setup(), ctx = context();
  game.mapId = C.lobby; game.map = { def: LOBBY }; game.flags[C.flag] = true;
  drawCastleOrbWorld(ctx, game, { x: 400, y: 32 });
  const arcs = ctx.calls.filter(call => call[0] === 'arc');
  assert.ok(arcs.length >= 2);
  assert.ok(arcs.every(call => call[1] === 271.5 && call[2] === 203));
  game.flags[C.flag] = false; ctx.calls.length = 0;
  drawCastleOrbWorld(ctx, game, { x: 400, y: 32 }); assert.equal(ctx.calls.length, 0);
});

test('test_castle_orb_shadow_uses_sprite_mask_and_projects_away_from_point_light', () => {
  const previous = globalThis.document, created = [];
  globalThis.document = { createElement() { const ctx = context(); const canvas = { getContext: () => ctx }; created.push({ canvas, ctx }); return canvas; } };
  try {
    const { game } = setup(), ctx = context(), frame = { width: 64, height: 96 };
    game.player = { x: 288, y: 210, w: 24, h: 16, visible: true, facing: 'up', frame: 0,
      def: {}, sprite: { fw: 64, fh: 96, px: 2, up: [frame] } };
    drawCastleOrbGround(ctx, game, { x: 0, y: 12 });
    const projection = ctx.calls.find(call => call[0] === 'transform');
    assert.ok(projection[3] < 0 && projection[4] < 0);
    assert.equal(created[0].ctx.globalCompositeOperation, 'source-in');
    assert.equal(created[0].ctx.calls.find(call => call[0] === 'drawImage')[1], frame);
    drawCastleOrbGround(ctx, game, { x: 0, y: 12 }); assert.equal(created.length, 1);
  } finally { globalThis.document = previous; }
});

test('test_castle_orb_cutaway_fade_and_remote_draw_do_not_write_global_fade', async () => {
  const { game } = setup(); game.fade = Object.freeze({ alpha: 0, color: '0,0,0' });
  const promise = activateCastleOrb(game); await ready();
  const scene = game.castleOrb; scene.remote.canvas = {};
  advanceTo(game, 'out'); updateCastleOrb(game, scene.duration / 2);
  const ctx = context(); drawCastleOrbCutaway(ctx, game);
  assert.equal(ctx.fillStyle, 'rgba(0,0,0,0.5)');
  advanceTo(game, 'pan'); drawCastleOrbCutaway(ctx, game);
  assert.ok(ctx.calls.some(call => call[0] === 'drawImage'));
  assert.equal(game.fade.alpha, 0); finishCastleOrb(game); await promise;
});
