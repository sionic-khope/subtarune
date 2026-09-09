import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS } from '../../src/data/characters.js';
import { characterSprite } from '../../src/world/world.js';

function installCanvasRecorder() {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  globalThis.document = {
    createElement() {
      const canvas = { draws: [] };
      canvas.getContext = () => ({
        drawImage: (...args) => canvas.draws.push(args),
      });
      return canvas;
    },
  };
  return () => {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else delete globalThis.document;
  };
}

test('test_png_side_walk_composes_three_poses_while_preserving_other_rows', () => {
  // Given: Hyungsub's configured first side frame and four untouched source columns.
  const restoreDocument = installCanvasRecorder();
  const image = { width: 208, height: 352 };
  const { feetY, splitX, stride } = CHARACTERS.hyungsub.sideWalk;
  const fw = image.width / 4;
  const fh = image.height / 4;
  try {
    // When: the PNG override is cached into directional animation frames.
    const sprite = characterSprite('hyungsub', image);

    // Then: side frames are neutral, shifted feet, the same neutral, and opposite shifted feet.
    assert.equal(sprite.left[0], sprite.left[2]);
    for (const row of [2, 3]) {
      const [neutral, stepA, , stepB] = sprite[row === 2 ? 'left' : 'right'];
      assert.deepEqual(neutral.draws, [[image, 0, row * fh, fw, fh, 0, 0, fw, fh]]);
      assert.deepEqual(stepA.draws, [
        [image, 0, row * fh, fw, feetY, 0, 0, fw, feetY],
        [image, 0, row * fh + feetY, splitX, fh - feetY, -stride, feetY, splitX, fh - feetY],
        [image, splitX, row * fh + feetY, fw - splitX, fh - feetY, splitX + stride, feetY, fw - splitX, fh - feetY],
      ]);
      assert.deepEqual(stepB.draws, [
        [image, 0, row * fh, fw, feetY, 0, 0, fw, feetY],
        [image, 0, row * fh + feetY, splitX, fh - feetY, stride, feetY, splitX, fh - feetY],
        [image, splitX, row * fh + feetY, fw - splitX, fh - feetY, splitX - stride, feetY, fw - splitX, fh - feetY],
      ]);
    }
    for (const [dir, row] of [['down', 0], ['up', 1]]) {
      assert.deepEqual(sprite[dir].map((frame) => frame.draws), [0, 1, 2, 3].map((column) => [
        [image, column * fw, row * fh, fw, fh, 0, 0, fw, fh],
      ]));
    }
  } finally {
    restoreDocument();
  }
});
