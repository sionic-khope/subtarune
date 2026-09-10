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

test('test_v3_side_walks_reuse_authored_leg_poses_under_fixed_upper_bodies', () => {
  // Given: Each v3 character's neutral side frame and two authored lower-leg poses.
  const restoreDocument = installCanvasRecorder();
  try {
    for (const [id, image] of Object.entries({ hyungsub: { width: 240, height: 416 }, gyeongsub: { width: 256, height: 408 }, ppaman: { width: 272, height: 408 } })) {
      const { legY, legFrames } = CHARACTERS[id].sideWalk;
      const fw = image.width / 4;
      const fh = image.height / 4;
      // When: the PNG override is cached into directional animation frames.
      const sprite = characterSprite(id, image);

      // Then: side frames are neutral, source-leg A, the same neutral, and source-leg B.
      for (const row of [2, 3]) {
        const [neutral, stepA, , stepB] = sprite[row === 2 ? 'left' : 'right'];
        assert.equal(neutral, sprite[row === 2 ? 'left' : 'right'][2]);
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
    }
  } finally {
    restoreDocument();
  }
});

test('test_junhee_side_walk_keeps_configured_split_stride_composition', () => {
  // Given: Junhee's unchanged split-feet side-walk setting.
  const restoreDocument = installCanvasRecorder();
  const image = { width: 368, height: 360 };
  const { feetY, splitX, stride } = CHARACTERS.junhee.sideWalk;
  const fw = image.width / 4;
  const fh = image.height / 4;
  try {
    // When: the PNG override is baked into Junhee's side animation frames.
    const sprite = characterSprite('junhee', image);

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
