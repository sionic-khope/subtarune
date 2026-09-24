import test from 'node:test';
import assert from 'node:assert/strict';
import { Character } from '../../src/world/world.js';
import { CastleDarkPath, CASTLE_DARK_PATH as C, darkPathWalkableRects,
  darkPathPulseColor } from '../../src/scenes/castle-dark-path.js';

function fixture() {
  const rows = ['#######', '#..####', '#....##', '###..##', '###..##', '#######'];
  let tileReads = 0;
  const map = { rows, h: rows.length, w: rows[0].length,
    tileAt(x, y) { tileReads++; return { solid: rows[y]?.[x] !== '.' }; } };
  const game = { map, state: 'field', dialogue: { running: false }, transitioning: false,
    player: { x: 42, y: 42, w: 24, h: 16, frame: 0, moving: false } };
  const path = new CastleDarkPath(game); game.castleDarkPath = path;
  return { game, path, map, reads: () => tileReads };
}
function step(game, path, distance = 30, dt = 0.1) {
  game.player.y += distance; game.player.frame = game.player.frame === 1 ? 3 : 1;
  game.player.moving = true; path.update(dt);
}

test('test_dark_path_clip_union_matches_collision_tiles_and_only_builds_once', () => {
  const { map, game, path, reads } = fixture();
  assert.deepEqual(darkPathWalkableRects(map), [[32, 32, 64, 32], [32, 64, 128, 32], [96, 96, 64, 64]]);
  for (let y = 0; y < map.h * 32; y++) for (let x = 0; x < map.w * 32; x++) {
    const visible = path.rectangles.some(([rx, ry, w, h]) => x >= rx && x < rx + w && y >= ry && y < ry + h);
    assert.equal(visible, map.rows[Math.floor(y / 32)][Math.floor(x / 32)] === '.');
  }
  const before = reads();
  for (let i = 0; i < 20; i++) step(game, path);
  assert.equal(reads(), before);
});

test('test_dark_path_requires_actual_motion_and_foot_contact_not_idle_or_wall_push', () => {
  const { game, path } = fixture();
  path.update(1); assert.equal(path.pulses.length, 0);
  game.player.moving = true; game.player.frame = 1;
  path.update(0.1); assert.equal(path.pulses.length, 0);
  game.player.y += 9; game.player.frame = 3;
  path.update(0.1); assert.equal(path.pulses.length, 1);
  game.player.y += 12; game.player.frame = 1;
  path.update(0.1); assert.equal(path.pulses.length, 1);
  game.player.y += 13; game.player.frame = 3;
  path.update(0.1); assert.equal(path.pulses.length, 1);
  game.player.y += 55; game.player.frame = 1;
  path.update(0.1); assert.equal(path.pulses.length, 2);
  game.player.moving = false;
  path.update(C.lifetime); assert.equal(path.pulses.length, 0);
});

test('test_dark_path_short_taps_reveal_guidance_even_when_walk_frame_resets', () => {
  const { game, path } = fixture();
  const player = game.player;
  player.animPhase = 0;
  for (let tap = 0; tap < 9; tap++) {
    player.y += 4; player.moving = true;
    Character.prototype.animate.call(player, 1 / 60, 12);
    assert.equal(player.frame, 0);
    path.update(1 / 60);
    player.moving = false;
    Character.prototype.animate.call(player, 1 / 60, 12);
    path.update(1 / 60);
    if (tap < 8) assert.equal(path.pulses.length, 0);
  }
  assert.equal(path.pulses.length, 1, '36px of genuine tapped movement must reveal the path without a contact frame');
  path.update(C.lifetime);
  for (let frame = 0; frame < 120; frame++) {
    player.moving = true; player.frame = frame % 4;
    path.update(1 / 60);
  }
  assert.equal(path.pulses.length, 0, 'stationary wall pressure must not create new guidance');
});

test('test_dark_path_wide_ripples_do_not_stack_into_many_repeated_circles', () => {
  const { game, path } = fixture();
  step(game, path, 10);
  for (let i = 0; i < 7; i++) step(game, path, 10, 0.02);
  assert.equal(path.pulses.length, 1, 'less than 80px after the first step should not create another circle');
  step(game, path, 10, 0.02);
  assert.equal(path.pulses.length, 2);
  for (let i = 0; i < 24; i++) step(game, path, 10, 0.02);
  assert.ok(path.pulses.length <= 2, 'only two broad ripples may overlap');
  const radii = [], ctx = { save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
    createRadialGradient(...args) { radii.push(args[5]); return { addColorStop() {} }; },
    fillRect() {}, arc() {}, stroke() {} };
  game.player.moving = false; path.update(0.7); path.drawGround(ctx, { x: 0, y: 0 });
  assert.ok(radii.some(radius => radius > 160), 'the broad wave should spread well beyond the old 110px radius');
});

test('test_dark_path_intro_menu_transition_and_teleport_do_not_emit_pulses', () => {
  const { game, path } = fixture();
  game.dialogue.running = true; step(game, path);
  game.dialogue.running = false; game.state = 'menu'; step(game, path);
  game.state = 'field'; game.transitioning = true; step(game, path);
  game.transitioning = false; step(game, path, 500);
  assert.equal(path.pulses.length, 0);
  step(game, path, 10);
  assert.equal(path.pulses.length, 1);
});

test('test_dark_path_pulses_expand_change_white_violet_pink_and_clip_before_drawing', () => {
  const { game, path } = fixture();
  const events = [], radii = [], colors = [];
  const ctx = { save() { events.push('save'); }, restore() { events.push('restore'); },
    beginPath() {}, rect(...rect) { events.push(rect); }, clip() { events.push('clip'); },
    createRadialGradient(...args) { radii.push(args[5]); return { addColorStop(t, color) { colors.push(color); } }; },
    fillRect() { events.push('fill'); }, arc() { events.push('arc'); }, stroke() { events.push('stroke'); } };
  path.drawGround(ctx, { x: 0, y: 0 }); assert.equal(events.length, 0);
  step(game, path, 10);
  path.drawGround(ctx, { x: 16, y: 8 });
  assert.deepEqual(events.slice(1, 4), path.rectangles.map(([x, y, w, h]) => [x - 16, y - 8, w, h]));
  assert.ok(events.indexOf('clip') < events.indexOf('fill'));
  assert.equal(events.at(-1), 'restore');
  game.player.moving = false; path.update(0.7); path.drawGround(ctx, { x: 16, y: 8 });
  assert.ok(radii[1] > radii[0] && radii[1] <= C.radius);
  assert.ok(colors.some(color => color.startsWith('rgba(255,255,255,')));
  assert.equal(darkPathPulseColor(0), '255,255,255');
  assert.equal(darkPathPulseColor(0.5), '181,105,255');
  assert.equal(darkPathPulseColor(1), '255,84,188');
});

test('test_dark_path_party_is_dim_readable_without_mutating_other_draws', () => {
  const { game, path } = fixture();
  const alpha = [], stack = [], ctx = { globalAlpha: 1,
    save() { stack.push(this.globalAlpha); }, restore() { this.globalAlpha = stack.pop(); } };
  game.player.draw = context => alpha.push(context.globalAlpha);
  const follower = { def: { type: 'follower' }, draw: context => alpha.push(context.globalAlpha) };
  const prop = { def: { type: 'prop' }, draw: context => alpha.push(context.globalAlpha) };
  for (const actor of [game.player, follower, prop]) path.drawEntity(ctx, actor, { x: 0, y: 0 });
  assert.deepEqual(alpha, [0.48, 0.48, 1]); assert.equal(ctx.globalAlpha, 1);
});

test('test_dark_path_pulses_are_bounded_and_map_title_dispose_clear_owned_state', () => {
  for (const stop of ['map', 'title', 'dispose']) {
    const { game, path } = fixture();
    for (let i = 0; i < 100; i++) step(game, path, 30, 0.001);
    assert.equal(path.pulses.length, C.maxPulses);
    if (stop === 'map') { game.map = {}; path.update(0.1); }
    if (stop === 'title') { game.state = 'title'; path.update(0.1); }
    if (stop === 'dispose') path.dispose();
    assert.equal(game.castleDarkPath, null); assert.equal(path.pulses.length, 0);
    assert.equal(path.rectangles.length, 0); assert.equal(path.disposed, true);
    path.update(1); path.dispose(); assert.equal(path.pulses.length, 0);
  }
});
