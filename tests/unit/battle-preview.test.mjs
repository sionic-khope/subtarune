import test from 'node:test';
import assert from 'node:assert/strict';

import { clearExteriorChroma, playbackFrameAt } from '../../src/ui/battle-preview.js';

const FRAMES = [
  { duration: 0.1 },
  { duration: 0.2 },
  { duration: 0.3 },
  { duration: 0.4 },
];

test('test_battle_preview_idle_timing_loops_on_frame_durations', () => {
  assert.deepEqual(playbackFrameAt(FRAMES, 0, true), { index: 0, ended: false });
  assert.deepEqual(playbackFrameAt(FRAMES, 0.1, true), { index: 1, ended: false });
  assert.deepEqual(playbackFrameAt(FRAMES, 0.299, true), { index: 1, ended: false });
  assert.deepEqual(playbackFrameAt(FRAMES, 1.0, true), { index: 0, ended: false });
  assert.deepEqual(playbackFrameAt(FRAMES, 2.2, true), { index: 1, ended: false });
});

test('test_battle_preview_attack_timing_ends_after_one_sequence', () => {
  assert.deepEqual(playbackFrameAt(FRAMES, 0.3, false), { index: 2, ended: false });
  assert.deepEqual(playbackFrameAt(FRAMES, 0.999, false), { index: 3, ended: false });
  assert.deepEqual(playbackFrameAt(FRAMES, 1.0, false), { index: 3, ended: true });
  assert.deepEqual(playbackFrameAt(FRAMES, 8, false), { index: 3, ended: true });
});

test('test_battle_preview_timing_rejects_invalid_frame_data', () => {
  assert.throws(() => playbackFrameAt([], 0, true), /frame/);
  assert.throws(() => playbackFrameAt([{ duration: 0 }], 0, true), /duration/);
  assert.throws(() => playbackFrameAt([{ duration: Number.NaN }], 0, true), /duration/);
});

test('test_battle_preview_chroma_clears_connected_fringe_without_eroding_contours_or_inner_pink', () => {
  const width = 7;
  const height = 7;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const set = (x, y, [r, g, b, a = 255]) => pixels.set([r, g, b, a], (y * width + x) * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) set(x, y, [255, 0, 255]);
  set(1, 3, [180, 8, 194]);
  for (const [x, y] of [[2, 2], [3, 2], [4, 2], [2, 3], [4, 3], [2, 4], [3, 4], [4, 4]]) set(x, y, [12, 12, 16]);
  set(3, 3, [242, 104, 226]);

  clearExteriorChroma(pixels, width, height, { rMin: 220, gMax: 40, bMin: 220 });

  assert.equal(pixels[(3 * width + 1) * 4 + 3], 0, 'exterior anti-aliased magenta fringe must be transparent');
  assert.equal(pixels[(3 * width + 2) * 4 + 3], 255, 'black silhouette contour must remain opaque');
  assert.equal(pixels[(3 * width + 3) * 4 + 3], 255, 'enclosed pink character detail must remain opaque');
});
