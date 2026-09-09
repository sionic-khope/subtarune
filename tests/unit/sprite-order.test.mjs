import test from 'node:test';
import assert from 'node:assert/strict';
import { characterSprite } from '../../src/world/world.js';

test('test_hyungsub_side_walk_alternates_neutral_and_step_without_reordering_other_directions', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  globalThis.document = {
    createElement() {
      const canvas = { sourceX: null, sourceY: null };
      canvas.getContext = () => ({ drawImage: (_image, x, y) => { canvas.sourceX = x; canvas.sourceY = y; } });
      return canvas;
    },
  };
  try {
    const image = { width: 160, height: 320 };
    const sprite = characterSprite('hyungsub', image);
    assert.deepEqual(sprite.left.map((frame) => frame.sourceX), [0, 40, 120, 80]);
    assert.deepEqual(sprite.right.map((frame) => frame.sourceX), [0, 40, 120, 80]);
    assert.deepEqual(sprite.down.map((frame) => frame.sourceX), [0, 40, 80, 120]);
    assert.deepEqual(sprite.up.map((frame) => frame.sourceX), [0, 40, 80, 120]);
    assert.deepEqual(sprite.left.map((frame) => frame.sourceY), [160, 160, 160, 160]);
    const other = characterSprite('walk_order_default_test', image);
    assert.deepEqual(other.left.map((frame) => frame.sourceX), [0, 40, 80, 120]);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  }
});
