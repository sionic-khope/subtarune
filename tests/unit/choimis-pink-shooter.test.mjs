import test from 'node:test';
import assert from 'node:assert/strict';
import { Board, Soul } from '../../src/battle/bullets.js';
import { CHOIMIS_PINK_SHOOTER, createChoimisPinkShooter, heartPixels, sweptCirclesHit } from '../../src/battle/modes/choimis-pink-shooter.js';

const input = (...held) => ({ down: key => held.includes(key), held: key => held.includes(key), just: key => held.includes(key) });
const none = input();

function fixture({ random = 0.5 } = {}) {
  const board = new Board(), soul = new Soul();
  board.x = 20; board.y = 246; board.w = 440; board.h = 72; board.target = { w: 440, h: 72, cx: 240, cy: 282 };
  soul.x = 211; soul.y = 277; soul.invuln = 0.35;
  const original = { board: { ...board.rect, target: { ...board.target } }, soul: { x: soul.x, y: soul.y, invuln: soul.invuln } };
  const sounds = [], damage = [], shakes = [];
  const battle = {
    board, soul, game: { set shake(value) { shakes.push(value); } }, rnd: () => random,
    sfx: (name, options) => sounds.push({ name, options }),
    hurtParty(value) { damage.push(value); soul.invuln = CHOIMIS_PINK_SHOOTER.invulnerability; soul.hits++; sounds.push({ name: 'hurt' }); }, drawTextBox() {},
  };
  const enemy = { def: { damage: 15 } };
  return { battle, board, soul, sounds, damage, shakes, original, mode: createChoimisPinkShooter(battle, { enemy }) };
}

function advance(mode, seconds, controls = none, step = 1 / 120) {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += step) mode.update(Math.min(step, seconds - elapsed), controls);
}

function enterCombat(f) {
  advance(f.mode, CHOIMIS_PINK_SHOOTER.openSeconds); assert.equal(f.mode.snapshot.phase, 'fill');
  advance(f.mode, CHOIMIS_PINK_SHOOTER.fillSeconds); assert.equal(f.mode.snapshot.phase, 'drain');
  advance(f.mode, CHOIMIS_PINK_SHOOTER.drainSeconds); assert.equal(f.mode.snapshot.phase, 'launch');
  advance(f.mode, CHOIMIS_PINK_SHOOTER.launchSeconds); assert.equal(f.mode.snapshot.phase, 'combat');
}

test('test_choimis_shooter_fills_then_drains_and_transforms_centered_red_heart_to_pink_right_point', () => {
  const f = fixture();
  assert.equal(f.mode.snapshot.phase, 'open'); assert.deepEqual(f.mode.snapshot.board, { x: 20, y: 246, w: 440, h: 72 });
  assert.deepEqual(f.mode.snapshot.heart, { x: 240, y: 156, color: 'red', facing: 'down' });
  advance(f.mode, CHOIMIS_PINK_SHOOTER.openSeconds / 2); assert.ok(f.mode.snapshot.board.y < 246 && f.mode.snapshot.board.y > 90);
  advance(f.mode, CHOIMIS_PINK_SHOOTER.openSeconds / 2); assert.equal(f.mode.snapshot.phase, 'fill'); assert.deepEqual(f.mode.snapshot.board, CHOIMIS_PINK_SHOOTER.compactBoard);
  advance(f.mode, CHOIMIS_PINK_SHOOTER.fillSeconds / 2);
  assert.ok(f.mode.snapshot.water > 0.49 && f.mode.snapshot.water < 0.51); assert.equal(f.mode.snapshot.phase, 'fill');
  advance(f.mode, CHOIMIS_PINK_SHOOTER.fillSeconds / 2);
  assert.equal(f.mode.snapshot.phase, 'drain'); assert.equal(f.mode.snapshot.water, 1);
  assert.deepEqual(f.mode.snapshot.heart, { x: 240, y: 156, color: 'pink', facing: 'right' });
  advance(f.mode, CHOIMIS_PINK_SHOOTER.drainSeconds);
  assert.equal(f.mode.snapshot.phase, 'launch'); assert.equal(f.mode.snapshot.water, 0); assert.equal(f.mode.snapshot.heart.x, 240);
  advance(f.mode, CHOIMIS_PINK_SHOOTER.launchSeconds / 2); assert.ok(f.mode.snapshot.heart.x < 240 && f.mode.snapshot.heart.x > CHOIMIS_PINK_SHOOTER.heartX);
  advance(f.mode, CHOIMIS_PINK_SHOOTER.launchSeconds / 2); assert.equal(f.mode.snapshot.phase, 'combat');
  assert.equal(f.mode.snapshot.heart.x, CHOIMIS_PINK_SHOOTER.heartX); assert.deepEqual(f.mode.snapshot.board, CHOIMIS_PINK_SHOOTER.wideBoard);
});

test('test_choimis_shooter_actual_heart_pixels_keep_lobes_and_move_single_tip_from_bottom_to_right', () => {
  const down = heartPixels('down'), right = heartPixels('right');
  assert.ok(down.length > 80); assert.equal(right.length, down.length);
  const bottom = Math.max(...down.map(pixel => pixel.y)), rightmost = Math.max(...right.map(pixel => pixel.x));
  assert.equal(down.filter(pixel => pixel.y === bottom).length, 1); assert.equal(right.filter(pixel => pixel.x === rightmost).length, 1);
  assert.ok(right.filter(pixel => pixel.x < 0).length > 20); assert.ok(right.some(pixel => pixel.x === rightmost && pixel.y === 0));
});

test('test_choimis_shooter_combat_budget_is_twenty_seconds_excluding_fill_and_drain', () => {
  const f = fixture(); enterCombat(f); advance(f.mode, CHOIMIS_PINK_SHOOTER.combatSeconds - 0.01);
  assert.equal(f.mode.snapshot.phase, 'combat'); assert.equal(f.mode.snapshot.combatElapsed, CHOIMIS_PINK_SHOOTER.combatSeconds - 0.01);
  assert.equal(f.mode.update(0.02, none), true); assert.equal(f.mode.snapshot.combatElapsed, CHOIMIS_PINK_SHOOTER.combatSeconds); assert.equal(f.mode.snapshot.phase, 'done');
});

test('test_choimis_shooter_up_down_only_and_held_c_respects_cooldown_with_exact_sound', () => {
  const f = fixture(); enterCombat(f); const start = f.mode.snapshot.heart;
  f.mode.update(0.2, input('up', 'left', 'confirm'));
  assert.ok(f.mode.snapshot.heart.y < start.y); assert.equal(f.mode.snapshot.heart.x, start.x); assert.equal(f.mode.snapshot.shots.length, 1);
  assert.deepEqual(f.sounds[0], { name: 'cannon_puff', options: { volume: 0.4, rate: 1.45 } });
  f.mode.update(CHOIMIS_PINK_SHOOTER.fireCooldown - 0.01, input('confirm')); assert.equal(f.mode.snapshot.shots.length, 1);
  f.mode.update(0.02, input('confirm')); assert.equal(f.mode.snapshot.shots.length, 2);
  f.mode.update(0.3, input('down', 'right')); assert.ok(f.mode.snapshot.heart.y > start.y - 1); assert.equal(f.mode.snapshot.heart.x, start.x);
});

test('test_choimis_shooter_swept_collision_catches_fast_shot_and_visible_hit_effect_while_misses_cleanup', () => {
  assert.equal(sweptCirclesHit({ x: 10, y: 10 }, { x: 300, y: 10 }, 3, { x: 190, y: 10 }, { x: 120, y: 10 }, 8), true);
  assert.equal(sweptCirclesHit({ x: 10, y: 10 }, { x: 300, y: 10 }, 3, { x: 190, y: 30 }, { x: 120, y: 30 }, 8), false);
  const f = fixture(); enterCombat(f); advance(f.mode, 1.1, input('confirm'), 0.1);
  assert.ok(f.mode.snapshot.destroyed >= 1); assert.ok(f.mode.snapshot.effects.some(effect => effect.kind === 'hit'));
  assert.ok(f.sounds.some(({ name, options }) => name === 'pop' && options.volume === 0.384 && options.rate === 0.8));
  advance(f.mode, 1.5, none, 0.1); assert.ok(f.mode.snapshot.missed >= 1);
  assert.ok(f.mode.snapshot.shots.every(shot => shot.x <= CHOIMIS_PINK_SHOOTER.wideBoard.x + CHOIMIS_PINK_SHOOTER.wideBoard.w + 12));
});

test('test_choimis_shooter_warned_noodles_hurt_once_per_invulnerability_window', () => {
  const f = fixture(); enterCombat(f); advance(f.mode, 5, none, 1 / 240);
  assert.ok(f.damage.length >= 1); assert.ok(f.damage.every(value => value === 15));
  assert.ok(f.damage.length <= Math.ceil(5 / CHOIMIS_PINK_SHOOTER.invulnerability));
  assert.ok(f.mode.snapshot.noodles.some(noodle => noodle.telegraph) || f.mode.snapshot.spawned > f.damage.length);
  assert.ok(f.sounds.some(({ name }) => name === 'hurt'));
});

test('test_choimis_shooter_dispose_restores_board_and_soul_and_clears_transients', () => {
  const f = fixture(), original = f.original;
  enterCombat(f); f.mode.update(0.4, input('confirm', 'up')); f.mode.dispose();
  assert.deepEqual(f.board.rect, { x: original.board.x, y: original.board.y, w: original.board.w, h: original.board.h }); assert.deepEqual(f.board.target, original.board.target);
  assert.deepEqual({ x: f.soul.x, y: f.soul.y, invuln: f.soul.invuln }, original.soul);
  assert.equal(f.mode.snapshot.disposed, true); assert.deepEqual(f.mode.snapshot.shots, []); assert.deepEqual(f.mode.snapshot.noodles, []);
  assert.equal(f.mode.update(30, input('confirm')), true);
});

test('test_choimis_shooter_draws_existing_dark_jjajang_bowl_with_noodle_trail', () => {
  const previous = globalThis.Image, images = [], strokes = [];
  globalThis.Image = class { set src(value) { this.url = value; this.onload(); } };
  const f = fixture(); enterCombat(f); advance(f.mode, CHOIMIS_PINK_SHOOTER.spawnFirst + CHOIMIS_PINK_SHOOTER.noodleWarning + 0.01);
  const ctx = new Proxy({ drawImage: (...args) => images.push(args), stroke: () => strokes.push(true), measureText: () => ({ width: 100 }) }, { get: (object, key) => object[key] ?? (() => {}) });
  f.mode.draw(ctx); globalThis.Image = previous;
  assert.ok(images.some(([image]) => image.url === 'assets/props/dark_jjajang.png'));
  assert.ok(strokes.length >= 2);
});
