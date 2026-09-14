import test from 'node:test';
import assert from 'node:assert/strict';
import { PARK_RAZMA as C } from '../../src/data/park-razma.js';
import { createParkRazma } from '../../src/battle/modes/park-razma.js';
import { razmaLaserGeometry, razmaLaserHits, drawRazmaArt } from '../../src/battle/modes/park-razma-art.js';
import { Board, Soul } from '../../src/battle/bullets.js';

const none = { down: () => false, just: () => false };
async function fixture({ loaded = true, fail = false, audioFail = false, audioPending = false } = {}) {
  const previous = globalThis.Image;
  let resource;
  globalThis.Image = class {
    constructor() { resource = this; this.naturalWidth = 256; this.naturalHeight = 256; }
    set src(value) { this.url = value; if (fail) this.onerror(); else if (loaded) this.onload(); }
  };
  const handles = [];
  const sounds = [], b = {
    cfg: {}, board: new Board(), soul: new Soul(), damage: [],
    game: { sound: { blip() {},
      loadCue(src) { return audioPending ? new Promise(() => {}) : audioFail ? Promise.reject(new Error('cue failed')) : Promise.resolve({ duration: src === C.audio.scream ? 1.05 : 2.56 }); },
      playCue(buffer) { const handle = { elapsed: 0, stopped: 0, stop() { this.stopped++; }, duration: buffer.duration }; handles.push(handle); return handle; },
    } }, sfx: key => sounds.push(key), drawHpStrip() {},
    hurtParty(damage) { this.damage.push(damage); this.soul.invuln = 0.75; this.soul.hits++; },
  };
  const mode = createParkRazma(b, { enemy: { def: { damage: 16 } } });
  globalThis.Image = previous;
  await new Promise(resolve => setImmediate(resolve));
  return { b, mode, sounds, resource, handles };
}
function enterActive(mode) {
  for (let i = 0; i < 900 && mode.snapshot.phase !== 'active'; i++) mode.update(1 / 120, none);
  assert.equal(mode.snapshot.phase, 'active');
  assert.equal(mode.snapshot.activeElapsed, 0);
}

test('test_razma_actual_twelve_seconds_excludes_expansion_dialogue_and_summon', async () => {
  const { b, mode, sounds } = await fixture();
  mode.update(6, none);
  assert.equal(mode.snapshot.phase, 'effect'); assert.equal(mode.snapshot.activeElapsed, 0); assert.equal(b.damage.length, 0);
  enterActive(mode);
  mode.update(11.99, none); assert.equal(mode.snapshot.phase, 'active');
  mode.update(0.02, none); assert.equal(mode.snapshot.phase, 'leave'); assert.equal(mode.snapshot.activeElapsed, 12);
  assert.equal(mode.update(1, none), true);
  assert.equal(sounds.filter(s => s === C.sfx.summon).length, 1);
  assert.equal(sounds.filter(s => s === C.sfx.fire).length, C.shots.count);
  mode.dispose(); assert.deepEqual(b.board.rect, C.panel);
});

test('test_razma_slow_or_failed_asset_never_runs_invisible_attack', async () => {
  for (const fail of [false, true]) {
    const { b, mode, resource } = await fixture({ loaded: false, fail });
    mode.update(30, none); assert.equal(mode.snapshot.phase, 'expand'); assert.equal(mode.snapshot.activeElapsed, 0);
    assert.equal(mode.snapshot.assetsReady, false); assert.equal(b.damage.length, 0);
    assert.equal(Boolean(mode.snapshot.error), fail);
    if (!fail) { resource.onload(); enterActive(mode); }
    mode.dispose(); assert.equal(resource.onload, null); assert.equal(resource.onerror, null);
  }
});

test('test_razma_aim_locks_at_warning_and_warning_is_harmless', async () => {
  const { b, mode } = await fixture(); enterActive(mode);
  mode.update(C.shots.first + 0.01, none);
  const target = mode.snapshot.targets[0].target;
  mode.update(0.4, { down: k => k === 'left', just: () => false });
  assert.deepEqual(mode.snapshot.targets[0].target, target); assert.ok(b.soul.x < target.x - 40);
  assert.equal(b.damage.length, 0);
  mode.update(0.4, none); assert.equal(b.damage.length, 0);
});

test('test_razma_geometry_matches_warning_fire_extent_width_and_oriented_edges', async () => {
  const shot = { at: 0, target: { x: C.origin.x + 100, y: C.origin.y }, glitch: false };
  const warning = razmaLaserGeometry(shot, C.shots.warning - 0.001);
  assert.equal(razmaLaserHits(warning, { ...shot.target, r: 6 }), false);
  const g = razmaLaserGeometry(shot, C.shots.warning + 0.2);
  assert.ok(Math.abs(g.length - 0.2 * C.shots.speed) < 1e-9);
  assert.equal(razmaLaserHits(g, { ...shot.target, r: 6 }), true);
  assert.equal(razmaLaserHits(g, { x: C.origin.x + g.length + 5, y: C.origin.y, r: 6 }), false);
  assert.equal(razmaLaserHits(g, { x: shot.target.x, y: C.origin.y + g.width / 2 + 5, r: 6 }), false);
  assert.equal(razmaLaserGeometry(shot, C.shots.warning + C.shots.fire), null);
  const diagonal = razmaLaserGeometry({ ...shot, target: { x: C.origin.x - 100, y: C.origin.y + 100 }, glitch: true }, C.shots.warning + 0.5);
  assert.equal(diagonal.width, C.shots.glitchWidth);
  assert.equal(razmaLaserHits(diagonal, { x: C.origin.x + Math.cos(diagonal.angle) * 100, y: C.origin.y + Math.sin(diagonal.angle) * 100, r: 6 }), true);
});

test('test_razma_hitch_preserves_events_timing_and_shared_soul_invulnerability', async () => {
  const a = await fixture(), b = await fixture(); enterActive(a.mode); enterActive(b.mode);
  for (let i = 0; i < 720; i++) a.mode.update(1 / 60, none);
  b.mode.update(12, none);
  assert.equal(a.mode.snapshot.activeElapsed, b.mode.snapshot.activeElapsed);
  assert.deepEqual(a.sounds, b.sounds); assert.deepEqual(a.b.damage, b.b.damage);
  assert.ok(a.b.damage.length > 0 && a.b.damage.length <= 12 / 0.75);
  a.mode.dispose(); const hits = a.b.damage.length;
  assert.equal(a.mode.update(10, none), true); assert.equal(a.b.damage.length, hits);
  assert.ok(a.mode.snapshot.targets.every(s => s.target === null));
});

test('test_razma_every_legal_corner_is_targeted_not_a_permanent_safe_spot', async () => {
  for (const [x, y] of [[30, 86], [450, 86], [30, 304], [450, 304], [240, 195]]) {
    const { b, mode } = await fixture(); enterActive(mode); b.soul.x = x; b.soul.y = y;
    mode.update(2, none); assert.ok(b.damage.length > 0, `${x},${y} was never threatened`);
  }
});

test('test_razma_render_uses_same_strip_and_generated_image_cell', async () => {
  const rectangles = [], images = [];
  const ctx = new Proxy({ measureText: text => ({ width: text.length * 16 }), fillRect: (...r) => rectangles.push(r), drawImage: (...args) => images.push(args) }, { get: (o, key) => key in o ? o[key] : () => {} });
  const shot = { at: 0, target: { x: 400, y: 138 }, glitch: true };
  const time = C.shots.warning + 0.25, g = razmaLaserGeometry(shot, time), image = {};
  drawRazmaArt(ctx, image, { phase: 'active', phaseTime: time, activeElapsed: time, shots: [shot] });
  assert.ok(rectangles.some(r => r[0] === 0 && r[1] === -g.width / 2 && r[2] === g.length && r[3] === g.width));
  assert.equal(images.length, 1); assert.deepEqual(images[0].slice(3, 5), [128, 128]);
});

test('test_razma_party_defeat_disposal_stops_remaining_hitch_hits_and_events', async () => {
  const { b, mode, sounds } = await fixture(); enterActive(mode);
  b.hurtParty = function(damage) { this.damage.push(damage); mode.dispose(); };
  mode.update(12, none);
  assert.equal(b.damage.length, 1); assert.equal(mode.snapshot.disposed, true);
  assert.equal(sounds.filter(s => s === C.sfx.fire).length, 1);
  assert.deepEqual(b.board.rect, C.panel);
});

test('test_razma_audio_load_failure_or_pending_holds_intro_without_attacks', async () => {
  for (const audioFail of [false, true]) {
    const { mode, sounds } = await fixture({ audioFail, audioPending: !audioFail });
    mode.update(30, none);
    assert.equal(mode.snapshot.imageReady, true);
    assert.equal(mode.snapshot.audioReady, false);
    assert.equal(mode.snapshot.phase, 'expand');
    assert.equal(Boolean(mode.snapshot.error), audioFail);
    assert.deepEqual(sounds, []);
    mode.dispose();
  }
});

test('test_razma_voice_reserves_regional_phrase_and_never_overlaps_or_restarts', async () => {
  const { mode, handles } = await fixture(); enterActive(mode);
  for (let i = 0; i < 1440; i++) {
    for (const handle of handles) handle.elapsed = Math.min(handle.duration, handle.elapsed + 1 / 120);
    mode.update(1 / 120, none);
  }
  const cues = mode.snapshot.cues;
  assert.deepEqual(cues.map(c => c.key), ['scream', 'glitch', 'scream', 'glitch']);
  for (let i = 1; i < cues.length; i++) assert.ok(cues[i].at >= cues[i - 1].at + cues[i - 1].duration - 1e-8);
  assert.ok(cues.every(c => c.at + c.duration <= 12));
  assert.ok(handles.every(h => h.stopped === 0));
});

test('test_razma_audio_clock_not_simulation_clock_prevents_overlap_and_disposes_once', async () => {
  const { mode, handles } = await fixture(); enterActive(mode);
  mode.update(8, none);
  assert.equal(handles.length, 1);
  mode.dispose(); mode.dispose();
  assert.equal(handles[0].stopped, 1);
  assert.equal(mode.snapshot.cues[0].stopped, true);
});

test('test_razma_natural_end_cancels_audio_if_game_clock_overtakes_real_playback', async () => {
  const { mode, handles } = await fixture(); enterActive(mode);
  mode.update(12.1, none);
  assert.equal(mode.snapshot.phase, 'leave');
  assert.equal(handles[0].stopped, 1);
  mode.dispose(); assert.equal(handles[0].stopped, 1);
});

test('test_razma_regional_beam_uses_live_angle_for_full_three_and_half_seconds', () => {
  for (const angle of [-1, 1]) {
    const shot = { at: 0, target: { x: 400, y: C.origin.y }, glitch: true, angle };
    const warning = razmaLaserGeometry(shot, C.shots.warning - 0.001);
    assert.equal(warning.angle, angle);
    assert.equal(razmaLaserHits(warning, { ...shot.target, r: 6 }), false);
    for (const elapsed of [0, 0.25, 1.75, 3.499]) {
      const g = razmaLaserGeometry(shot, C.shots.warning + elapsed);
      assert.equal(g.angle, angle);
      assert.equal(g.length, C.shots.length);
      const on = { x: g.x + Math.cos(g.angle) * 150, y: g.y + Math.sin(g.angle) * 150, r: 6 };
      assert.equal(razmaLaserHits(g, on), true);
      const off = { x: on.x - Math.sin(g.angle) * 20, y: on.y + Math.cos(g.angle) * 20, r: 6 };
      assert.equal(razmaLaserHits(g, off), false);
    }
    assert.equal(razmaLaserGeometry(shot, C.shots.warning + 3.5), null);
  }
});

test('test_razma_schedule_allows_full_beams_and_recovery_without_simultaneous_fire', () => {
  assert.equal(C.schedule.filter(shot => shot.glitch).length, 2);
  for (let i = 0; i < C.schedule.length; i++) {
    const shot = C.schedule[i];
    const end = shot.at + C.shots.warning + (shot.glitch ? C.shots.sweepFire : C.shots.fire);
    assert.ok(end <= 12);
    if (i + 1 < C.schedule.length) assert.ok(end < C.schedule[i + 1].at);
  }
});

test('test_razma_render_rotation_matches_collision_at_sweep_midpoint', () => {
  const angles = [];
  const ctx = new Proxy({ measureText: () => ({ width: 160 }), rotate: angle => angles.push(angle) }, { get: (o, key) => key in o ? o[key] : () => {} });
  const shot = { at: 0, target: { x: 400, y: 138 }, glitch: true, angle: -Math.PI / 3 };
  const time = C.shots.warning + 1.75;
  drawRazmaArt(ctx, null, { phase: 'active', phaseTime: time, activeElapsed: time, shots: [shot] });
  assert.deepEqual(angles, [razmaLaserGeometry(shot, time).angle]);
  assert.ok(Math.abs(angles[0] + Math.PI / 3) < 1e-9);
});

test('test_razma_continuous_movement_escapes_tracking_at_normal_soul_speed', async () => {
  const { mode, b } = await fixture(); enterActive(mode);
  const points = [[100, 286], [100, 100], [380, 100], [380, 286], [100, 286]];
  let waypoint = 0;
  for (let i = 0; i < 1440; i++) {
    const [x, y] = points[waypoint % points.length];
    if (Math.hypot(b.soul.x - x, b.soul.y - y) < 2) waypoint++;
    const direction = Math.abs(b.soul.x - x) > 1 ? b.soul.x > x ? 'left' : 'right' : b.soul.y > y ? 'up' : 'down';
    mode.update(1 / 120, { down: key => key === direction, just: () => false });
  }
  assert.ok(Math.abs(mode.snapshot.activeElapsed - 12) < 1e-8);
  assert.equal(b.damage.length, 0);
});

test('test_razma_tracking_turns_toward_current_heart_and_reverses_without_jumping', async () => {
  const { mode, b } = await fixture(); enterActive(mode);
  mode.update(2.45, none);
  const before = mode.snapshot.targets[1].angle;
  b.soul.x = 380;
  mode.update(0.2, none);
  const right = mode.snapshot.targets[1].angle;
  assert.ok(right < before);
  assert.ok(Math.abs(before - right - C.shots.turnSpeed * 0.2) < 1e-8);
  b.soul.x = 100;
  mode.update(0.2, none);
  const left = mode.snapshot.targets[1].angle;
  assert.ok(left > right);
  assert.ok(Math.abs(left - right - C.shots.turnSpeed * 0.2) < 1e-8);
});

test('test_razma_tracking_crosses_pi_by_short_arc_and_is_frame_rate_independent', async () => {
  const a = await fixture(), b = await fixture();
  for (const f of [a, b]) {
    enterActive(f.mode);
    f.b.soul.x = 100; f.b.soul.y = C.origin.y + 2;
    f.mode.update(2.45, none);
    f.b.soul.y = C.origin.y - 2;
  }
  const initial = a.mode.snapshot.targets[1].angle;
  for (let i = 0; i < 12; i++) a.mode.update(1 / 60, none);
  b.mode.update(0.2, none);
  const final = a.mode.snapshot.targets[1].angle;
  assert.ok(final > Math.PI);
  assert.ok(final - initial < 0.04);
  assert.ok(Math.abs(final - b.mode.snapshot.targets[1].angle) < 1e-9);
});
