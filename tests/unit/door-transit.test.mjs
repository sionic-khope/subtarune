import test from 'node:test';
import assert from 'node:assert/strict';
import { Character, Prop } from '../../src/world/world.js';
import { makeWaiter } from '../../src/ui/cutscene.js';
import { drawDoorOpening } from '../../src/world/door-transit.js';

function fixture() {
  const sounds = [];
  const actor = { id: 'junhee', x: 1212, y: 196, w: 24, h: 16, visible: true, animPhase: 0,
    animate: Character.prototype.animate };
  const door = { id: 'door', x: 1152, y: 48, scale: 1.5, def: {}, image: { width: 96, height: 96 } };
  const game = { entities: [actor, door], sound: { sfx: name => sounds.push({ name, offset: actor.doorTransit.offsetY }) } };
  return { actor, door, sounds, game };
}
const entry = closeAfter => ({ doorTransit: { actor: 'junhee', door: 'door', inset: [33, 18, 31, 65], closeAfter } });

test('door_entry_walks_up_visually_with_safe_collision_and_one_threshold_clunk_then_full_occlusion', () => {
  const { game, actor, door, sounds } = fixture();
  const waiter = makeWaiter(game, entry(false));
  assert.equal(waiter.update(0.18), false);
  assert.equal(door.doorOpening.progress, 1);
  assert.equal(Math.abs(actor.doorTransit.offsetY), 0);
  assert.equal(sounds.length, 0);
  waiter.update(0.2);
  assert.equal(actor.facing, 'up'); assert.equal(actor.moving, true);
  assert.ok(actor.frame > 0); assert.equal(actor.visible, true);
  assert.deepEqual([actor.x, actor.y], [1212, 196]);
  assert.equal(sounds.length, 0);
  waiter.update(0.1);
  assert.equal(sounds.length, 1); assert.equal(sounds[0].name, 'door');
  assert.ok(actor.y + actor.h + sounds[0].offset <= 172.5);
  waiter.update(0.54);
  assert.equal(actor.visible, true);
  assert.ok(actor.y + actor.h + actor.doorTransit.offsetY > 73);
  assert.equal(waiter.update(0.02), true);
  assert.equal(actor.visible, false); assert.equal(actor.doorTransit, null);
  assert.equal(sounds.length, 1); assert.equal(door.doorOpening.progress, 1);
  actor.visible = true;
  const follower = makeWaiter(game, entry(true));
  assert.equal(follower.update(0.4), false);
  assert.ok(actor.doorTransit.offsetY < -60);
  assert.equal(follower.update(0.46), false);
  assert.equal(actor.visible, false);
  assert.ok(door.doorOpening.progress > 0 && door.doorOpening.progress < 1);
  assert.equal(follower.update(0.18), true);
  assert.equal(door.doorOpening, null); assert.equal(sounds.length, 2);
});

function context() {
  return { calls: [], stack: [], activeClip: null, offsetY: 0,
    save() { this.stack.push([this.activeClip, this.offsetY]); },
    restore() { [this.activeClip, this.offsetY] = this.stack.pop(); },
    beginPath() {}, rect(...rect) { this.pendingClip = rect; }, clip() { this.activeClip = this.pendingClip; },
    translate(x, y) { this.offsetY += y; }, fillRect() {},
    drawImage(...args) { this.calls.push({ args, clip: this.activeClip, offsetY: this.offsetY }); },
  };
}

test('arched castle aperture preserves its pointed stone frame at map scale', () => {
  const ctx = context(), path = [];
  ctx.moveTo = (...point) => path.push(['move', ...point]);
  ctx.lineTo = (...point) => path.push(['line', ...point]);
  ctx.quadraticCurveTo = (...point) => path.push(['curve', ...point]);
  ctx.closePath = () => path.push(['close']);
  const door = { x: 640, y: 224, drawX: 640, drawY: 60, scale: 0.5625, def: {}, image: {},
    doorOpening: { inset: [68, 104, 120, 196], archRise: 64, progress: 1 } };
  drawDoorOpening(ctx, door, { x: 464, y: 28 });
  assert.deepEqual(path, [
    ['move', 214, 201.25], ['line', 214, 127],
    ['curve', 214, 109, 247.75, 91], ['curve', 281.5, 109, 281.5, 127],
    ['line', 281.5, 201.25], ['close'],
  ]);
  assert.equal(ctx.activeClip, null);
  assert.equal(ctx.stack.length, 0);
});

test('door_and_character_renderers_use_bounded_clips_and_restore_caller_state', () => {
  const { door, actor } = fixture();
  const ctx = context(), cam = { x: 800, y: 20 };
  door.doorOpening = { inset: [33, 18, 31, 65], progress: 1 };
  drawDoorOpening(ctx, door, cam);
  assert.deepEqual(ctx.calls[0].clip, [402, 55, 46.5, 97.5]);
  assert.deepEqual(ctx.calls[0].args.slice(1, 5), [33, 18, 31, 65]);
  assert.equal(ctx.activeClip, null); assert.equal(ctx.stack.length, 0);
  actor.game = {}; actor.def = {};
  actor.doorTransit = { offsetY: -80, clip: [1201.5, 75, 46.5, 139] };
  actor.drawSprite = (c) => c.drawImage('actor');
  Character.prototype.draw.call(actor, ctx, cam);
  assert.deepEqual(ctx.calls[1].clip, [402, 55, 46.5, 139]);
  assert.equal(ctx.calls[1].offsetY, -80);
  assert.deepEqual([ctx.activeClip, ctx.offsetY, ctx.stack.length], [null, 0, 0]);
  Object.assign(door, { visible: true, iw: 144, ih: 144, drawX: 1152, drawY: 48 });
  Prop.prototype.draw.call(door, ctx, cam);
  assert.equal(ctx.calls.at(-1).args[0], door.image);
  assert.deepEqual(ctx.calls.at(-1).clip, [402, 55, 46.5, 97.5]);
});
