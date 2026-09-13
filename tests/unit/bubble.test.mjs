import test from 'node:test';
import assert from 'node:assert/strict';
import { DotBubble } from '../../src/ui/bubble.js';
import { makeWaiter } from '../../src/ui/cutscene.js';

const actors = [
  { id: 'junhee', x: 100, y: 200, w: 24, h: 16 },
  { id: 'gyeongsub', x: 200, y: 230, w: 24, h: 16 },
];
function drawing(bubble) {
  const marks = [];
  const ctx = { globalAlpha: 1, save() {}, restore() {}, beginPath() {}, closePath() {},
    moveTo(...args) { marks.push(['move', ...args]); },
    lineTo(...args) { marks.push(['line', ...args]); },
    quadraticCurveTo(...args) { marks.push(['curve', ...args]); },
    fill() { marks.push(['fill', this.fillStyle, this.globalAlpha]); },
    fillRect(...args) { marks.push(['rect', this.fillStyle, this.globalAlpha, ...args]); },
  };
  bubble.draw(ctx, { x: 40, y: 30 });
  return marks;
}

test('test_parallel_native_bubbles_match_two_single_bubbles_at_every_shared_dot_and_fade', () => {
  const group = new DotBubble(), first = new DotBubble(), second = new DotBubble();
  const timing = { dots: 3, gap: 0.2, hold: 0.6 };
  group.start(actors, timing); first.start(actors[0], timing); second.start(actors[1], timing);
  const progress = new Set();
  for (let tick = 0; tick < 90; tick++) {
    for (const bubble of [group, first, second]) bubble.update(1 / 60);
    progress.add(group.shown);
    assert.deepEqual(drawing(group), [...drawing(first), ...drawing(second)]);
    assert.deepEqual([group.shown, group.phase, group.done], [first.shown, first.phase, first.done]);
  }
  assert.deepEqual([...progress], [0, 1, 2, 3]);
  assert.equal(group.done, true); assert.equal(group.target, null);
});

test('test_bubble_DSL_resolves_two_targets_once_and_waits_for_the_shared_native_clock', () => {
  const bubble = new DotBubble();
  const game = { entities: actors, bubble, textbox: { close() {} } };
  const waiter = makeWaiter(game, { bubble: ['junhee', 'gyeongsub'], dots: 3, gap: 0.2, hold: 0.6 });
  assert.deepEqual(bubble.target, actors);
  assert.equal(waiter.update(), false);
  for (let tick = 0; tick < 90; tick++) bubble.update(1 / 60);
  assert.equal(waiter.update(), true);
  const single = makeWaiter(game, { bubble: 'junhee' });
  assert.equal(bubble.target, actors[0]);
  assert.equal(bubble.gap, 0.4); assert.equal(bubble.hold, 0.6);
  assert.equal(single.update(), false);
});
