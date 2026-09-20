import test from 'node:test';
import assert from 'node:assert/strict';
import { MapAssetCache } from '../../src/core/map-assets.js';
import { ASSET_VERSION } from '../../src/core/gfx.js';
import { BUILD } from '../../src/data/build.js';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('title boot does not wait for an unrelated map or asset', async () => {
  const slow = deferred();
  const calls = [];
  const cache = new MapAssetCache({
    maps: { room: { image: 'room.png', entities: [], spawns: { start: {} } }, distant: { entities: [] } },
    loadMap: async id => { calls.push(`map:${id}`); if (id === 'distant') await slow.promise; return null; },
    loadImage: async src => { calls.push(src); return { src }; },
    loadTiles: async () => {},
  });
  const distant = cache.prepare('distant');
  await cache.prepare('room');
  assert.equal(cache.ready('room'), true);
  assert.equal(cache.ready('distant'), false);
  assert.deepEqual(calls, ['map:distant', 'map:room', 'room.png']);
  slow.resolve();
  await distant;
});

test('cold map preparations deduplicate and do not publish partial images', async () => {
  const slow = deferred(); let imageLoads = 0;
  const maps = { room: { image: 'room.png', entities: [{ image: 'prop.png' }], preload: ['prop.png'], spawns: { start: {} } } };
  const cache = new MapAssetCache({
    maps,
    loadMap: async () => null,
    loadImage: async src => { imageLoads++; if (src === 'prop.png') await slow.promise; return { src }; },
    loadTiles: async () => {},
  });
  const first = cache.prepare('room');
  const second = cache.prepare('room');
  assert.equal(first, second);
  assert.equal(cache.ready('room'), false);
  assert.equal(cache.images['prop.png'], undefined);
  slow.resolve();
  await first;
  assert.equal(imageLoads, 2);
  assert.equal(cache.ready('room'), true);
  assert.equal(cache.images['prop.png'].src, 'prop.png');
});

test('asset cache key follows the release rather than page reload time', () => {
  assert.equal(ASSET_VERSION, BUILD);
  assert.match(ASSET_VERSION, /^2026-\d\d-\d\d\.\d+$/);   // 빌드 번호는 매 빌드 오르므로 형식만 본다(253 고정값은 254 에서 깨졌다)
});
