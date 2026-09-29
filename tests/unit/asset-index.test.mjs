import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PORTRAIT_FILES, BACKDROP_FILES, SPRITE_FILES, TILE_FILES, AUDIO_FILES } from '../../src/data/asset-index.js';

const pngs = dir => new Set(fs.readdirSync(dir).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)));

// BUILD433: 없는 초상화·배경·시트는 요청하지 않는다(404 + 재시도 두 번으로 맵 첫 진입이 1.2초쯤 늦었다).
// 그림을 넣거나 빼면 python3 tools/dev/asset_index.py 로 목록을 다시 만든다.
test('the asset index lists exactly the portrait, backdrop and sprite files on disk', () => {
  assert.deepEqual([...PORTRAIT_FILES].sort(), [...pngs('assets/portraits')].sort());
  assert.deepEqual([...BACKDROP_FILES].sort(), [...pngs('assets/backdrops')].sort());
  assert.deepEqual([...SPRITE_FILES].sort(), [...pngs('assets/sprites')].sort());
  assert.deepEqual([...TILE_FILES].sort(), [...pngs('assets/tiles')].sort());
  const audio = ['sfx', 'voices'].flatMap(d => fs.readdirSync(`assets/audio/${d}`).filter(f => /\.(mp3|ogg)$/.test(f)).map(f => `${d}/${f}`));
  assert.deepEqual([...AUDIO_FILES].sort(), audio.sort());
});

test('every map backdrop is either a file in the index or one of the code-drawn backdrops', () => {
  const drawn = new Set(['purple_fire', 'teal_bush', 'obj_forest', 'maillard_sunrise', 'castle_sunset_sky']);
  for (const f of fs.readdirSync('assets/maps').filter(f => f.endsWith('.json') && f !== 'index.json')) {
    const b = JSON.parse(fs.readFileSync(`assets/maps/${f}`, 'utf8')).backdrop;
    if (b) assert.ok(BACKDROP_FILES.has(b) || drawn.has(b), `${f}: ${b}`);
  }
});
