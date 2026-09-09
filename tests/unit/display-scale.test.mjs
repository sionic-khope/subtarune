import test from 'node:test';
import assert from 'node:assert/strict';
import { pixelDisplayScale } from '../../src/core/gfx.js';

test('display scale maps canvas pixels to integer device pixels when they fit', () => {
  for (const dpr of [1, 1.25, 1.5, 2, 3]) {
    for (const [w, h] of [[375, 812], [768, 960], [1280, 960], [1920, 1080]]) {
      const scale = pixelDisplayScale(960, 720, w, h, dpr);
      assert.ok(960 * scale <= w && 720 * scale <= h);
      if (w * dpr >= 960 && h * dpr >= 720) {
        assert.ok(Math.abs(scale * dpr - Math.round(scale * dpr)) < 1e-10);
        assert.ok(960 * (scale + 1 / dpr) > w || 720 * (scale + 1 / dpr) > h);
      }
    }
  }
});

test('small screens fit the whole game instead of clipping its sides', () => {
  assert.equal(pixelDisplayScale(960, 720, 375, 812, 1), 375 / 960);
  assert.equal(pixelDisplayScale(960, 720, 812, 375, 1), 375 / 720);
});
