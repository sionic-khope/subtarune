import test from 'node:test';
import assert from 'node:assert/strict';
import { drawMankatsukiBackground, mankatsukiVortexPoint, mankatsukiWallRow } from '../../src/battle/mankatsuki-background.js';
import { BATTLE_BGS } from '../../src/battle/backgrounds.js';
import { darkSmokeWaiter, drawDarkSmoke } from '../../src/ui/dark-smoke.js';

test('test_mankatsuki_background_has_vertical_hourglass_and_bounded_perspective', () => {
  assert.equal(typeof BATTLE_BGS.mankatsuki_vortex, 'function');
  const top = mankatsukiVortexPoint(0, 0, 0);
  const waist = mankatsukiVortexPoint(0.5, 0, 0);
  const bottom = mankatsukiVortexPoint(1, 0, 0);
  assert.ok(top.y < waist.y && waist.y < bottom.y);
  assert.ok(Math.abs(top.x - 240) > Math.abs(waist.x - 240) * 10);
  assert.ok(Math.abs(bottom.x - 240) > Math.abs(waist.x - 240) * 10);
  const turning = mankatsukiVortexPoint(0.28, 0, 0.5);
  assert.ok(turning.z > mankatsukiVortexPoint(0.28, 0, 0).z);
  const front = mankatsukiVortexPoint(0.72, -Math.PI / 2, 0);
  const back = mankatsukiVortexPoint(0.72, Math.PI / 2, 0);
  assert.ok(front.y - 110 > back.y - 110, 'near lower face must foreshorten differently from far face');
  for (const time of [0, 4, 100000]) {
    for (const height of [0, 0.5, 1]) {
      const point = mankatsukiVortexPoint(height, Math.PI, time);
      assert.ok(Object.values(point).every(Number.isFinite));
      assert.ok(point.z > -720);
    }
  }
});

test('test_mankatsuki_rotation_is_twenty_percent_slower_with_same_waist_and_perspective', () => {
  let previousTurn = 0;
  for (let time = 0.25; time <= 10; time += 0.25) {
    const point = mankatsukiVortexPoint(0.5, 0, time);
    const focal = 720 + Math.sin(time * 0.39) * 18;
    const x = (point.x - 240) * (focal + point.z) / focal;
    const turn = Math.atan2(point.z, x);
    const advance = (turn - previousTurn + Math.PI * 2) % (Math.PI * 2);
    assert.ok(Math.abs(advance / 0.25 - 3.84 * 0.8) < 1e-10, 'waist rotates at exactly 80 percent of the prior speed without a phase reset');
    previousTurn = turn;
  }
  for (let time = 0; time <= 60; time += 0.25) {
    const waist = mankatsukiVortexPoint(0.5, 0, time);
    assert.ok(Math.abs(waist.x - 240) < 8);
    assert.ok(Math.abs(waist.y - 110) < 2);
    for (const height of [0, 0.3, 0.7, 1]) {
      const point = mankatsukiVortexPoint(height, -Math.PI / 2, time);
      assert.ok(Object.values(point).every(Number.isFinite));
      assert.ok(point.z > -600, 'breathing stays well in front of the nearest projection limit');
    }
  }
});

test('test_smoke_room_purple_tint_ramps_with_veil_and_survives_mode_change', () => {
  const game = { time: 0, player: { x: 0, y: 0, w: 24, h: 16 }, entities: [] };
  const paints = [];
  const ctx = { save() {}, restore() {}, fillRect() {
    paints.push({ color: this.fillStyle, alpha: this.globalAlpha, blend: this.globalCompositeOperation });
  } };
  const waiter = darkSmokeWaiter(game, { mode: 'veil', duration: 2, veil: 0.4 });
  waiter.update(1);
  drawDarkSmoke(ctx, game, { x: 0, y: 0 });
  const mid = paints.find(paint => paint.blend === 'color');
  assert.equal(mid.color, '#66349a');
  assert.ok(mid.alpha > 0 && mid.alpha < 0.85);
  waiter.update(1);
  darkSmokeWaiter(game, { mode: 'gather', from: 'player', duration: 3 });
  assert.equal(game.darkSmoke.veil, 0.4);
  paints.length = 0;
  drawDarkSmoke(ctx, game, { x: 0, y: 0 });
  assert.equal(paints.find(paint => paint.blend === 'color').alpha, 0.85);
  darkSmokeWaiter(game, null);
  paints.length = 0;
  drawDarkSmoke(ctx, game, { x: 0, y: 0 });
  assert.equal(paints.length, 0);
});

test('test_mankatsuki_wall_samples_remain_in_cached_texture_and_keep_fixed_room_bounds', () => {
  for (const time of [0, 1, 4, 11, 100000]) {
    for (let y = 0; y < 246; y += 2) {
      const row = mankatsukiWallRow(y, time);
      assert.ok(Object.values(row).every(Number.isInteger));
      assert.ok(row.x >= 0 && row.x < 256);
      assert.ok(row.y >= 0 && row.y < 128);
      assert.ok(row.sideWidth >= 24 && row.sideWidth <= 60);
      assert.equal(row.sideWidth, mankatsukiWallRow(y, 0).sideWidth);
    }
  }
  assert.notDeepEqual(mankatsukiWallRow(100, 0), mankatsukiWallRow(100, 1));
  for (let time = 0; time < 5; time += 1 / 60) {
    const before = mankatsukiWallRow(100, time), after = mankatsukiWallRow(100, time + 1 / 60);
    const drift = Math.min(Math.abs(after.x - before.x), 256 - Math.abs(after.x - before.x));
    assert.ok(drift <= 2, 'wall projection drifts smoothly instead of jumping between frames');
  }
});

test('test_mankatsuki_continuous_floor_keeps_all_party_feet_inside_wood_not_side_walls', () => {
  for (const time of [0, 1, 4, 11, 100000]) {
    for (const feetY of [104, 164, 190, 224]) {
      for (let y = feetY - 4; y <= feetY + 4; y++) {
        const row = mankatsukiWallRow(y, time);
        assert.ok(row.sideWidth < 84 - 20, `entire foot/shadow area stays beyond the wall at y=${y}`);
        assert.ok(480 - row.sideWidth > 84 + 20);
      }
    }
  }
  let previous = mankatsukiWallRow(88, 0).sideWidth;
  for (let y = 89; y < 246; y++) {
    const width = mankatsukiWallRow(y, 0).sideWidth;
    assert.ok(width <= previous && previous - width <= 1, 'one continuous receding room edge, no local floor patches');
    previous = width;
  }
});

test('test_mankatsuki_threat_states_dim_background_and_reuse_floor_with_bounded_faces', (t) => {
  let canvases = 0;
  const paints = [];
  const context = () => ({
    globalAlpha: 1, stack: [], clipRect: null,
    save() { this.stack.push({ globalAlpha: this.globalAlpha, fillStyle: this.fillStyle, clipRect: this.clipRect }); },
    restore() { Object.assign(this, this.stack.pop()); },
    drawImage(...args) { paints.push({ kind: 'image', alpha: this.globalAlpha, clip: this.clipRect, args }); },
    beginPath() { this.pathRect = null; },
    rect(...args) { this.pathRect = args; },
    clip() { this.clipRect = this.pathRect; },
    moveTo(x, y) { this.points = [{ x, y }]; },
    lineTo(x, y) { this.points.push({ x, y }); }, closePath() {}, stroke() {},
    fill() { paints.push({ kind: 'face', alpha: this.globalAlpha, clip: this.clipRect, points: this.points }); },
    fillRect() { paints.push({ kind: 'rect', color: this.fillStyle, clip: this.clipRect }); },
  });
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement() {
    canvases++;
    return { getContext: context };
  } } });
  t.after(() => {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else delete globalThis.document;
  });
  const ctx = context();
  ctx.globalAlpha = 0.3;
  const outerClip = [0, 0, 480, 360];
  ctx.clipRect = outerClip;
  drawMankatsukiBackground(ctx, { game: { time: 1 }, state: 'menu' });
  assert.equal(ctx.globalAlpha, 0.3);
  paints.length = 0;
  drawMankatsukiBackground(ctx, { game: { time: 1 }, state: 'menu' });
  assert.equal(paints[0].alpha, 1, 'cached wooden floor must draw opaque even with inherited context alpha');
  assert.equal(ctx.globalAlpha, 0.3);
  const normal = paints.filter(paint => paint.kind === 'face');
  assert.equal(normal.length, 72, 'only one central hourglass remains after removing the three ribbons');
  for (const face of normal) assert.deepEqual(face.clip, [0, 0, 480, 246]);
  assert.ok(normal.some(face => face.points.some(point => point.y > 167)), 'lower vortex continues beyond the old floor-row cutoff');
  assert.ok(normal.every(face => face.clip[3] === 246), 'only the shared action-panel boundary clips the full-size vortex');
  assert.equal(paints[0].clip, outerClip);
  assert.equal(Math.min(...normal.map(paint => paint.alpha)), 0.82);
  assert.equal(normal.filter(paint => paint.alpha === 1).length, 36);
  const walls = paints.filter(paint => paint.kind === 'image' && paint.args.length === 9);
  assert.equal(walls.length, 202, 'wall scanline work stays bounded independently of elapsed time');
  assert.ok(walls.every(paint => paint.alpha === 1));
  assert.ok(walls.every(paint => paint.clip === outerClip));
  assert.deepEqual(walls[0].args.slice(5), [0, 0, 480, 2]);
  assert.deepEqual(walls[43].args.slice(5), [0, 86, 480, 2]);
  assert.ok(walls.slice(44).every(({ args }) => args[5] === 0 || args[5] + args[7] === 480));
  assert.equal(paints.filter(paint => paint.kind === 'rect').length, 0);
  for (const state of ['enemy-prep', 'bullets', 'board-close']) {
    paints.length = 0;
    drawMankatsukiBackground(ctx, { game: { time: 1 }, state });
    assert.equal(paints[0].alpha, 1, 'defense must also start from the opaque wooden floor');
    assert.equal(ctx.globalAlpha, 0.3);
    const quiet = paints.filter(paint => paint.kind === 'face');
    assert.equal(quiet.length, normal.length);
    for (const face of quiet) assert.deepEqual(face.clip, [0, 0, 480, 246]);
    assert.ok(quiet.every((paint, i) => paint.alpha < normal[i].alpha));
    assert.ok(Math.abs(Math.min(...quiet.map(paint => paint.alpha)) - 0.656) < 1e-12);
    assert.ok(quiet.every((paint, i) => Math.abs(paint.alpha - normal[i].alpha * 0.8) < 1e-12));
    const quietWalls = paints.filter(paint => paint.kind === 'image' && paint.args.length === 9);
    assert.equal(quietWalls.length, walls.length);
    assert.ok(quietWalls.every(paint => paint.alpha === 0.62));
    assert.equal(paints.at(-1).color, 'rgba(4,2,9,0.38)');
    assert.equal(paints.at(-1).clip, outerClip, 'defensive dimming must cover the foreground too');
    assert.equal(ctx.clipRect, outerClip);
    assert.equal(ctx.stack.length, 0);
  }
  ctx.fillRect(0, 200, 480, 160);
  assert.equal(paints.at(-1).clip, outerClip, 'subsequent HUD drawing retains the caller clip');
  assert.equal(canvases, 2, 'wooden floor and purple wall texture are each baked once');
});
