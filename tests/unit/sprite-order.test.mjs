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

test('test_hyungsub_side_walk_reuses_source_leg_poses_under_a_fixed_upper_body', () => {
  // Given: Hyungsub's neutral side frame and its two authored lower-leg poses.
  const restoreDocument = installCanvasRecorder();
  const image = { width: 208, height: 352 };
  const { legY, legFrames } = CHARACTERS.hyungsub.sideWalk;
  const fw = image.width / 4;
  const fh = image.height / 4;
  try {
    // When: the PNG override is cached into directional animation frames.
    const sprite = characterSprite('hyungsub', image);

    // Then: side frames are neutral, source-leg A, the same neutral, and source-leg B.
    assert.equal(sprite.left[0], sprite.left[2]);
    for (const row of [2, 3]) {
      const [neutral, stepA, , stepB] = sprite[row === 2 ? 'left' : 'right'];
      assert.deepEqual(neutral.draws, [[image, 0, row * fh, fw, fh, 0, 0, fw, fh]]);
      assert.deepEqual(stepA.draws, [
        [image, 0, row * fh, fw, legY, 0, 0, fw, legY],
        [image, legFrames[0] * fw, row * fh + legY, fw, fh - legY, 0, legY, fw, fh - legY],
      ]);
      assert.deepEqual(stepB.draws, [
        [image, 0, row * fh, fw, legY, 0, 0, fw, legY],
        [image, legFrames[1] * fw, row * fh + legY, fw, fh - legY, 0, legY, fw, fh - legY],
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

test('test_other_png_side_walks_keep_their_configured_split_stride_composition', () => {
  // Given: Gyeongsub's existing split-feet side-walk setting.
  const restoreDocument = installCanvasRecorder();
  const image = { width: 208, height: 352 };
  const { feetY, splitX, stride } = CHARACTERS.gyeongsub.sideWalk;
  const fw = image.width / 4;
  const fh = image.height / 4;
  try {
    // When: the PNG override is baked into Gyeongsub's side animation frames.
    const sprite = characterSprite('gyeongsub', image);

    // Then: each step still moves the two configured lower-foot slices in opposite directions.
    for (const row of [2, 3]) {
      const [, stepA, , stepB] = sprite[row === 2 ? 'left' : 'right'];
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
  } finally {
    restoreDocument();
  }
});
