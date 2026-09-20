// 자산 적재 견고성(BUILD269, 사용자 GitHub Pages 에서 “영클 스프라이트 왜 이렇게 됐냐 / 나람이 얼굴도 / 청소부 스프라이트 안 나오잖아 / 로딩 다 안된건가”):
//   그림 로더는 실패해도 다시 받고, 맵 자산 캐시는 실패(null)를 기억하지 않고, 시트가 늦게 오면 캐릭터가 폴백(문자 도트)에서 시트로 갈아탄다
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MapAssetCache } from '../../src/core/map-assets.js';

test('test_map_asset_cache_retries_a_failed_image_on_the_next_request', async () => {
  let calls = 0;
  const cache = new MapAssetCache({ maps: {}, loadMap: async () => null, loadImage: async () => (++calls === 1 ? null : { width: 4, height: 4 }), loadTiles: async () => {} });
  assert.equal(await cache.image('a.png'), null, '첫 시도 실패');
  const second = await cache.image('a.png');
  assert.deepEqual(second, { width: 4, height: 4 }, '실패는 기억하지 않고 다시 받는다');
  assert.equal(calls, 2);
  assert.equal(await cache.image('a.png'), second, '성공은 캐시');
  assert.equal(calls, 2);
});

test('test_image_loader_retries_and_character_sprites_do_not_pin_the_fallback', () => {
  const gfx = readFileSync(new URL('../../src/core/gfx.js', import.meta.url), 'utf8');
  assert.ok(/loadImageOptional\(src, \{ retries = 2/.test(gfx) && /attempt <= retries/.test(gfx), '그림 로더는 실패 시 두 번 더 받는다');
  const world = readFileSync(new URL('../../src/world/world.js', import.meta.url), 'utf8');
  assert.ok(/const expectsSheet = !override && !!CHARACTERS\[paletteName\]/.test(world) && /`\$\{paletteName\}#fallback`/.test(world), '시트가 있어야 할 캐릭터의 폴백은 이름으로 캐시하지 않는다');
  assert.ok(/if \(this\.sprite\?\.fallback\)/.test(world) && /this\.game\.requestSheet\?\.\(name\)/.test(world), '폴백으로 그리는 동안 시트를 요청하고 도착하면 갈아탄다');
  const main = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
  assert.ok(/^  requestSheet\(name\)/m.test(main) && /this\.spriteOverrides\[name\] = image/.test(main), 'requestSheet 가 spriteOverrides 에 넣는다');
  assert.ok(/portraitFiles \|\|= new Set\(\)/.test(main), '초상화 파일이 있는 캐릭터는 시트 얼굴로 덮지 않는다');
});

test('test_cutscene_spawn_sprites_are_prepared_with_the_map_and_map_bgm_resumes_after_a_fight', () => {
  const main = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
  assert.ok(/if \(node\.spawn\?\.sprite\) sprites\.add\(node\.spawn\.sprite\)/.test(main) && /\.\.\.scriptAssets\.sprites,/.test(main), '컷신 spawn 배우의 시트·모션을 맵과 함께 준비(토리이 청소부 등)');
  assert.ok(/this\.bgmResume = this\.sound\.bgmName \?/.test(main) && /playBgm\(name, \{ volume: 0\.45, at \}\)/.test(main), '조우 전 브금 위치를 기억하고 전투 뒤 그 자리부터');
  const audio = readFileSync(new URL('../../src/core/audio.js', import.meta.url), 'utf8');
  assert.ok(/at = 0 \} = \{\}\)/.test(audio) && /a\.currentTime = at/.test(audio), 'playBgm at 옵션');
});
