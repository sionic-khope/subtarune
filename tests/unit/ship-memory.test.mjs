import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SHIP_MEMORY,
  SHIP_MEMORY_BEATS,
  SHIP_MEMORY_PANEL_BEAT_DURATION,
} from '../../src/data/ship-memory.js';
import { ShipMemory } from '../../src/scenes/ship-memory.js';

function makeGame({ withImages = true } = {}) {
  const events = [];
  const frame = { id: 'yoplait-frame' };
  const images = withImages
    ? Object.fromEntries(SHIP_MEMORY.panels.map(panel => [panel.src, { id: panel.id, width: 384, height: 216 }]))
    : {};
  return {
    events,
    game: {
      player: { sprite: { down: [frame], fw: 64, fh: 96, px: 2 } },
      playerSprite: 'hyungsub',
      spriteOverrides: {},
      propImages: images,
      shake: null,
      sound: {
        bgmName: null,
        preloadBgm(id) { events.push(['preload', id]); },
        playBgm(id, options) { this.bgmName = id; events.push(['play', id, options]); },
        stopBgm(fade) { this.bgmName = null; events.push(['stop', fade]); },
        sfx(id, options) { events.push(['sfx', id, options]); },
      },
    },
  };
}

function drawingContext() {
  const draws = [];
  const fills = [];
  const gradients = [];
  const paths = [];
  const rotations = [];
  const translations = [];
  const stack = [];
  const gradient = (kind, args) => {
    const value = { kind, args, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } };
    gradients.push(value);
    return value;
  };
  const context = {
    draws,
    fills,
    gradients,
    paths,
    rotations,
    translations,
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    fillStyle: '#000',
    filter: 'none',
    globalCompositeOperation: 'source-over',
    save() { stack.push([this.globalAlpha, this.imageSmoothingEnabled, this.fillStyle, this.filter, this.globalCompositeOperation]); },
    restore() { [this.globalAlpha, this.imageSmoothingEnabled, this.fillStyle, this.filter, this.globalCompositeOperation] = stack.pop(); },
    translate(x, y) { translations.push([x, y]); },
    rotate(angle) { rotations.push(angle); },
    createLinearGradient(...args) { return gradient('linear', args); },
    createRadialGradient(...args) { return gradient('radial', args); },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() { paths.push({ color: this.fillStyle, alpha: this.globalAlpha, filter: this.filter, composite: this.globalCompositeOperation }); },
    arc() {},
    fillRect(...args) { fills.push({ args, color: this.fillStyle, alpha: this.globalAlpha }); },
    drawImage(image, ...args) { draws.push({ image, args, alpha: this.globalAlpha, smoothing: this.imageSmoothingEnabled }); },
  };
  return context;
}

test('test_ship_memory_config_has_five_distinct_caption_free_panels_and_readable_timing', () => {
  assert.deepEqual(SHIP_MEMORY_BEATS, [
    'underwater_enter',
    'memory_1', 'memory_2', 'memory_3', 'memory_4', 'memory_5',
    'underwater_return', 'shore_transition',
  ]);
  assert.deepEqual(SHIP_MEMORY.panels.map(panel => panel.src), [1, 2, 3, 4, 5]
    .map(number => `assets/illustrations/gajaeman-memory-${number}.png`));
  assert.equal(new Set(SHIP_MEMORY.panels.map(panel => panel.src)).size, 5);
  assert.equal(SHIP_MEMORY.timing.preTextDelay, 5);
  assert.equal(SHIP_MEMORY_PANEL_BEAT_DURATION,
    SHIP_MEMORY.timing.fadeOut + SHIP_MEMORY.timing.blackHold
      + SHIP_MEMORY.timing.fadeIn + SHIP_MEMORY.timing.panelDwell);
  assert.ok(SHIP_MEMORY.timing.panelDwell >= 5);
  assert.ok(SHIP_MEMORY.timing.returnTransition >= 4);
  assert.ok(SHIP_MEMORY.timing.shoreTransition >= 4);
});

test('test_ship_memory_underwater_continues_sinking_and_particles_while_dialogue_waits', () => {
  const { game, events } = makeGame();
  const scene = new ShipMemory(game);
  assert.equal(scene.fullFrame, true);
  assert.equal(scene.beat, 'underwater_enter');
  assert.deepEqual(events.slice(0, 3).map(event => event.slice(0, 2)), [
    ['preload', 'ship_sinking'], ['play', 'ship_sinking'], ['sfx', 'maillard_splash'],
  ]);
  const before = scene.snapshot();
  scene.update(2.5);
  const after = scene.snapshot();
  assert.ok(after.sinkY > before.sinkY);
  assert.notDeepEqual(after.bubbles, before.bubbles);
  assert.equal(after.elapsed, 2.5);
  assert.equal(after.panel, null);
});

test('test_ship_memory_underwater_uses_soft_continuous_depth_and_gentle_pose', () => {
  const { game } = makeGame();
  const scene = new ShipMemory(game);
  scene.update(3);
  const ctx = drawingContext();
  scene.draw(ctx);
  const depth = ctx.gradients.find(value => value.kind === 'linear' && value.args.join(',') === '0,0,0,360');
  assert.ok(depth);
  assert.ok(depth.stops.length >= 5);
  assert.ok(ctx.fills.some(fill => fill.color === depth && fill.args.join(',') === '0,0,480,360'));
  assert.equal(ctx.fills.some(fill => fill.args.join(',') === '0,0,480,222'), false);
  assert.ok(ctx.paths.some(path => path.filter.includes('blur') && path.composite === 'screen'));
  assert.ok(ctx.rotations.some(angle => angle < -1.18 && angle > -1.26));
  assert.ok(ctx.translations.some(([x]) => Math.abs(x - 240) <= SHIP_MEMORY.underwater.driftX));
});

test('test_ship_memory_continues_descending_after_camera_has_settled', () => {
  const { game } = makeGame();
  const scene = new ShipMemory(game);
  scene.update(40);
  const before = scene.snapshot();
  scene.update(10);
  const after = scene.snapshot();
  assert.equal(after.sinkY - before.sinkY, 80);
  assert.ok(after.cameraDepth > before.cameraDepth + 79);
  assert.ok(Math.abs(after.actor.y - before.actor.y) <= 3);
  assert.ok(after.actor.width < 60 && after.actor.height < 85);
});

test('test_ship_memory_panels_keep_native_pixels_and_approved_illustration_anchor', () => {
  assert.deepEqual(SHIP_MEMORY.panelRect, { x: 48, y: 14, w: 384, h: 216 });
  assert.equal(SHIP_MEMORY.timing.fadeOut, 1.4);
  assert.equal(SHIP_MEMORY.timing.fadeIn, 2);
});

test('test_ship_memory_panels_fade_through_black_and_never_form_a_collage', () => {
  const { game } = makeGame();
  const scene = new ShipMemory(game);
  scene.setBeat('memory_1');
  scene.update(SHIP_MEMORY.timing.fadeOut + SHIP_MEMORY.timing.blackHold + SHIP_MEMORY.timing.fadeIn);
  const first = drawingContext();
  scene.draw(first);
  assert.deepEqual(first.draws.filter(draw => draw.image.id?.startsWith('memory_')).map(draw => draw.image.id), ['memory_1']);
  assert.deepEqual(first.draws.find(draw => draw.image.id === 'memory_1').args,
    [SHIP_MEMORY.panelRect.x, SHIP_MEMORY.panelRect.y, SHIP_MEMORY.panelRect.w, SHIP_MEMORY.panelRect.h]);
  scene.setBeat('memory_2');
  scene.update(SHIP_MEMORY.timing.fadeOut / 2);
  const leaving = drawingContext();
  scene.draw(leaving);
  assert.deepEqual(leaving.draws.filter(draw => draw.image.id?.startsWith('memory_')).map(draw => draw.image.id), ['memory_1']);
  scene.update(SHIP_MEMORY.timing.fadeOut / 2 + SHIP_MEMORY.timing.blackHold / 2);
  const black = drawingContext();
  scene.draw(black);
  assert.equal(black.draws.filter(draw => draw.image.id?.startsWith('memory_')).length, 0);
  scene.update(SHIP_MEMORY.timing.blackHold / 2 + SHIP_MEMORY.timing.fadeIn / 2);
  const incoming = drawingContext();
  scene.draw(incoming);
  const panelDraws = incoming.draws.filter(draw => draw.image.id?.startsWith('memory_'));
  assert.deepEqual(panelDraws.map(draw => draw.image.id), ['memory_2']);
  assert.ok(Math.abs(panelDraws[0].alpha - 0.5) < 0.00001);
  assert.equal(panelDraws[0].smoothing, false);
});

test('test_ship_memory_returns_underwater_then_reaches_pale_shore_transition', () => {
  const { game, events } = makeGame();
  const scene = new ShipMemory(game);
  scene.setBeat('memory_5');
  scene.update(SHIP_MEMORY_PANEL_BEAT_DURATION);
  scene.setBeat('underwater_return');
  scene.update(SHIP_MEMORY.timing.returnTransition);
  const returned = scene.snapshot();
  assert.equal(returned.transition.phase, 'underwater');
  assert.ok(Math.abs(returned.transition.alpha - 1) < 0.00001);
  scene.setBeat('shore_transition');
  assert.ok(events.some(event => event[0] === 'sfx' && event[1] === SHIP_MEMORY.sfx.recovery));
  scene.update(SHIP_MEMORY.timing.shoreTransition);
  const recovered = scene.snapshot();
  assert.equal(recovered.recoveryAlpha, 1);
  const ctx = drawingContext();
  scene.draw(ctx);
  assert.ok(ctx.fills.some(fill => fill.color === SHIP_MEMORY.colors.recovery && fill.alpha === 1));
});

test('test_ship_memory_rejects_unknown_beats_and_dispose_stops_owned_bgm_once', () => {
  const { game, events } = makeGame();
  const scene = new ShipMemory(game);
  assert.throws(() => scene.setBeat('not-a-beat'), /Unknown ship memory beat/);
  scene.dispose();
  scene.dispose();
  scene.update(3);
  assert.equal(scene.snapshot().disposed, true);
  assert.equal(events.filter(event => event[0] === 'stop').length, 1);
  assert.equal(game.shake, null);
});

test('test_ship_memory_dispose_preserves_matching_bgm_owned_by_the_caller', () => {
  const { game, events } = makeGame();
  game.sound.bgmName = SHIP_MEMORY.bgm;
  const scene = new ShipMemory(game);
  scene.dispose();
  assert.equal(events.some(event => event[0] === 'play'), false);
  assert.equal(events.some(event => event[0] === 'stop'), false);
  assert.equal(game.sound.bgmName, SHIP_MEMORY.bgm);
});

test('test_ship_memory_late_image_load_cannot_mutate_a_disposed_scene', async () => {
  const { game } = makeGame({ withImages: false });
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const scene = new ShipMemory(game, { imageLoader: () => pending });
  scene.dispose();
  release({ id: 'late', width: 384, height: 216 });
  await scene.assetsReady;
  assert.equal(scene.snapshot().imagesReady, 0);
});
