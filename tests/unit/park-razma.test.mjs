import test from 'node:test';
import assert from 'node:assert/strict';
import { PARK_RAZMA as C } from '../../src/data/park-razma.js';
import { createParkRazma } from '../../src/battle/modes/park-razma.js';
import { razmaLaserGeometry, razmaLaserHits, drawRazmaArt } from '../../src/battle/modes/park-razma-art.js';
import { Board, Soul } from '../../src/battle/bullets.js';

const none = { down: () => false, just: () => false };
function fixture({ loaded = true, fail = false } = {}) {
  const previous = globalThis.Image;
  let resource;
  globalThis.Image = class {
    constructor() { resource = this; this.naturalWidth = 256; this.naturalHeight = 256; }
    set src(value) { this.url = value; if (fail) this.onerror(); else if (loaded) this.onload(); }
  };
  const sounds = [], b = {
    cfg: {}, board: new Board(), soul: new Soul(), damage: [],
    game: { sound: { blip() {} } }, sfx: key => sounds.push(key), drawHpStrip() {},
    hurtParty(damage) { this.damage.push(damage); this.soul.invuln = 0.75; this.soul.hits++; },
  };
  const mode = createParkRazma(b, { enemy: { def: { damage: 16 } } });
  globalThis.Image = previous;
  return { b, mode, sounds, resource };
}
function enterActive(mode) {
  for (let i = 0; i < 900 && mode.snapshot.phase !== 'active'; i++) mode.update(1 / 120, none);
  assert.equal(mode.snapshot.phase, 'active');
  assert.equal(mode.snapshot.activeElapsed, 0);
}

test('test_razma_actual_twelve_seconds_excludes_expansion_dialogue_and_summon', () => {
  const { b, mode, sounds } = fixture();
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

test('test_razma_slow_or_failed_asset_never_runs_invisible_attack', () => {
  for (const fail of [false, true]) {
    const { b, mode, resource } = fixture({ loaded: false, fail });
    mode.update(30, none); assert.equal(mode.snapshot.phase, 'expand'); assert.equal(mode.snapshot.activeElapsed, 0);
    assert.equal(mode.snapshot.assetsReady, false); assert.equal(b.damage.length, 0);
    assert.equal(Boolean(mode.snapshot.error), fail);
    if (!fail) { resource.onload(); enterActive(mode); }
    mode.dispose(); assert.equal(resource.onload, null); assert.equal(resource.onerror, null);
  }
});

test('test_razma_aim_locks_at_warning_and_warning_is_harmless', () => {
  const { b, mode } = fixture(); enterActive(mode);
  mode.update(C.shots.first + 0.01, none);
  const target = mode.snapshot.targets[0].target;
  mode.update(0.4, { down: k => k === 'left', just: () => false });
  assert.deepEqual(mode.snapshot.targets[0].target, target); assert.ok(b.soul.x < target.x - 40);
  assert.equal(b.damage.length, 0);
  mode.update(0.4, none); assert.equal(b.damage.length, 0);
});

test('test_razma_geometry_matches_warning_fire_extent_width_and_oriented_edges', () => {
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
  assert.equal(razmaLaserHits(diagonal, { x: C.origin.x - 70, y: C.origin.y + 70, r: 6 }), true);
});

test('test_razma_hitch_preserves_events_timing_and_shared_soul_invulnerability', () => {
  const a = fixture(), b = fixture(); enterActive(a.mode); enterActive(b.mode);
  for (let i = 0; i < 720; i++) a.mode.update(1 / 60, none);
  b.mode.update(12, none);
  assert.equal(a.mode.snapshot.activeElapsed, b.mode.snapshot.activeElapsed);
  assert.deepEqual(a.sounds, b.sounds); assert.deepEqual(a.b.damage, b.b.damage);
  assert.ok(a.b.damage.length > 0 && a.b.damage.length <= C.shots.count);
  a.mode.dispose(); const hits = a.b.damage.length;
  assert.equal(a.mode.update(10, none), true); assert.equal(a.b.damage.length, hits);
  assert.ok(a.mode.snapshot.targets.every(s => s.target === null));
});

test('test_razma_every_legal_corner_is_targeted_not_a_permanent_safe_spot', () => {
  for (const [x, y] of [[30, 86], [450, 86], [30, 304], [450, 304], [240, 195]]) {
    const { b, mode } = fixture(); enterActive(mode); b.soul.x = x; b.soul.y = y;
    mode.update(2, none); assert.ok(b.damage.length > 0, `${x},${y} was never threatened`);
  }
});

test('test_razma_render_uses_same_strip_and_generated_image_cell', () => {
  const rectangles = [], images = [];
  const ctx = new Proxy({ measureText: text => ({ width: text.length * 16 }), fillRect: (...r) => rectangles.push(r), drawImage: (...args) => images.push(args) }, { get: (o, key) => key in o ? o[key] : () => {} });
  const shot = { at: 0, target: { x: 400, y: 138 }, glitch: true };
  const time = C.shots.warning + 0.25, g = razmaLaserGeometry(shot, time), image = {};
  drawRazmaArt(ctx, image, { phase: 'active', phaseTime: time, activeElapsed: time, shots: [shot] });
  assert.ok(rectangles.some(r => r[0] === 0 && r[1] === -g.width / 2 && r[2] === g.length && r[3] === g.width));
  assert.equal(images.length, 1); assert.deepEqual(images[0].slice(3, 5), [128, 128]);
});

test('test_razma_party_defeat_disposal_stops_remaining_hitch_hits_and_events', () => {
  const { b, mode, sounds } = fixture(); enterActive(mode);
  b.hurtParty = function(damage) { this.damage.push(damage); mode.dispose(); };
  mode.update(12, none);
  assert.equal(b.damage.length, 1); assert.equal(mode.snapshot.disposed, true);
  assert.equal(sounds.filter(s => s === C.sfx.fire).length, 1);
  assert.deepEqual(b.board.rect, C.panel);
});
