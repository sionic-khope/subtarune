// 벚꽃 숲(jjajang_sakura, BUILD261): 맵 구조·타일 교체표·나무 그림 쌍·트리거·스크립트·QA 지점 + 꽃잎·번짐 모듈 순수 로직
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { jjajang_sakura_bloom, SAKURA_BLOOM_FLAG } from '../../src/data/cutscenes/jjajang_sakura.js';
import { QA_POINTS } from '../../src/core/story.js';
import { createPetals } from '../../src/world/petals.js';
import { createTileSpread } from '../../src/world/tile-spread.js';

const load = id => JSON.parse(readFileSync(new URL(`../../assets/maps/${id}.json`, import.meta.url), 'utf8'));
const pngSize = path => { const b = readFileSync(new URL(`../../${path}`, import.meta.url)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const mulberry = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

test('test_sakura_map_dark_meadow_path_wide_meadow_and_right_turn_with_no_footstep_tiles', () => {
  const m = load('jjajang_sakura'), S = m.meta.sakura;
  assert.deepEqual([m.bgm, m.dim, m.stage], ['sakura', 0, 'ship_sinking_done']);
  const [c0, c1] = S.pathCols, [r0, r1] = S.entryRows;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) assert.equal(m.rows[r][c], '(', `아래 길 ${c},${r}`);
  assert.ok(r1 - r0 + 1 >= 52, `아래 길이 몇 초(달리기 ≈ 8초, ≥52행 — BUILD263 “2초만 더”) — 브금 하이라이트 전에 닿는다: ${r1 - r0 + 1}`);
  const [[mc0, mc1], [mr0, mr1]] = S.meadow;
  for (let r = mr0; r <= mr1; r++) for (let c = mc0; c <= mc1; c++) assert.equal(m.rows[r][c], '(', `넓은 풀숲 ${c},${r}`);
  assert.ok(mc1 - mc0 + 1 >= 16 && mr1 - mr0 + 1 >= 12, '풀숲은 길보다 훨씬 넓다');
  const [[t0, t1], endCol] = S.turn;
  for (let r = t0; r <= t1; r++) for (let c = c0; c <= endCol; c++) assert.equal(m.rows[r][c], '(', `오른쪽 길 ${c},${r}`);
  assert.ok(m.rows[t0].endsWith('(') && m.entities.some(e => e.id === 'sakura_east_door'), '오른쪽 끝은 문(벚꽃 숲 2, BUILD264)');
  assert.ok(m.rows.every(row => !row.includes('U') && !row.includes('$')), '옛 지역 길 타일을 쓰지 않는다');
  const tiles = readFileSync(new URL('../../src/world/tiles.js', import.meta.url), 'utf8');
  for (const ch of ['(', ')']) { const line = tiles.split('\n').find(l => l.includes(`registerTile('${ch}'`)); assert.ok(line && !/step\s*:/.test(line), `${ch} 타일은 발소리(step) 없음`); }
});

test('test_sakura_bloom_swaps_every_dark_meadow_row_and_trees_have_same_size_blossom_art', () => {
  const m = load('jjajang_sakura'), sw = m.tileSwaps.sakura_bloom.rows;
  m.rows.forEach((row, r) => {
    if (!row.includes('(')) { assert.equal(sw[r], undefined); return; }
    assert.equal(sw[r], row.replaceAll('(', ')'), `행 ${r} 은 '(' 만 ')' 로`);
  });
  const trees = m.entities.filter(e => e.type === 'prop');
  assert.ok(trees.length >= 30, `나무가 넉넉히 깔려 있다 ${trees.length}`);
  for (const t of trees) {
    assert.match(t.image, /jjajang_pine_dark_[1-4]\.png$/); assert.match(t.bloom, /jjajang_sakura_[1-4]\.png$/);
    assert.equal(t.bloom.slice(-5), t.image.slice(-5), '같은 번호의 벚꽃 판');
    assert.ok(existsSync(new URL(`../../${t.bloom}`, import.meta.url)) && existsSync(new URL(`../../${t.image}`, import.meta.url)));
    assert.deepEqual(pngSize(t.bloom), pngSize(t.image), `${t.bloom} 크기가 소나무와 같다(그림만 바꿔도 밑동 그대로)`);
    assert.ok(m.preload.includes(t.bloom), '벚꽃 판은 preload 로 미리 적재');
  }
  assert.deepEqual(m.meta.bloom, { flag: 'sakura_bloom', tiles: 'sakura_bloom', speed: 8, atBgm: 11.0, sweep: { duration: 2.5, image: 'assets/props/sakura_blossom_big.png', petal: 'assets/props/sakura_petal_big.png', trail: 7 } });
  for (const src of [m.meta.bloom.sweep.image, m.meta.bloom.sweep.petal]) { assert.ok(existsSync(new URL(`../../${src}`, import.meta.url)), `${src} 있음`); assert.ok(m.preload.includes(src), `${src} preload`); }
  const rowsPerSecondRunning = 220 / 32, entryRows = m.meta.sakura.entryRows[1] - m.meta.sakura.entryRows[0] + 1;
  assert.ok(entryRows / rowsPerSecondRunning + 0.8 < m.meta.bloom.atBgm, `달리면 하이라이트(${m.meta.bloom.atBgm}초) 전에 풀숲 초입에 닿는다(${(entryRows / rowsPerSecondRunning).toFixed(1)}초)`);
  const p = m.meta.petals; assert.ok(p.rate < p.after && p.after < p.burstRate && p.burst > 100, `꽃잎 밀도 조금 → 폭발 → 계속 ${JSON.stringify(p)}`);
});

test('test_sakura_trigger_script_and_doors', () => {
  const m = load('jjajang_sakura'), g = load('jjajang_glade');
  const trig = m.entities.find(e => e.id === 'sakura_bloom_trigger');
  assert.deepEqual([trig.once, trig.flag, trig.unless, trig.script], [true, 'sakura_bloom_started', SAKURA_BLOOM_FLAG, 'jjajang_sakura_bloom']);
  const [tr0, tr1] = m.meta.sakura.trigger, [[, [mr0, mr1]]] = [m.meta.sakura.meadow];
  assert.ok(tr0 >= mr0 && tr1 <= mr1 && tr1 >= mr1 - 2, '트리거는 넓은 풀숲 초입');
  assert.equal(SCRIPTS.jjajang_sakura_bloom, jjajang_sakura_bloom);
  assert.deepEqual(jjajang_sakura_bloom[0], { set: { sakura_bloom: true } });
  let bloomed = 0; jjajang_sakura_bloom[1].action({ bloom: () => bloomed++ }); assert.equal(bloomed, 1);
  assert.deepEqual(jjajang_sakura_bloom.at(-1), { end: true }, '대사·정지 없이 끝난다');
  const north = g.entities.find(e => e.id === 'glade_sakura_door'), south = m.entities.find(e => e.id === 'sakura_glade_door');
  assert.deepEqual([north.to, north.spawn, south.to, south.spawn], ['jjajang_sakura', 'from_south', 'jjajang_glade', 'from_north']);
  assert.ok(g.spawns.from_north && m.spawns.from_south && m.spawns.before_bloom && m.spawns.meadow && m.spawns.east_end);
  for (let r = 1; r <= 5; r++) assert.equal(g.rows[r].slice(17, 19), 'UU', `공터 위 길 ${r}행`);
  assert.equal(g.rows[0].slice(17, 19), '^^');
  const qa = id => QA_POINTS.find(p => p.id === id);
  assert.deepEqual([qa('jjajang_sakura').spawn, qa('jjajang_sakura_bloom').spawn, qa('jjajang_sakura_bloomed').spawn], ['from_south', 'before_bloom', 'meadow']);
  assert.ok(qa('jjajang_sakura').flags.glade_done && !qa('jjajang_sakura').flags.sakura_bloom && qa('jjajang_sakura_bloomed').flags.sakura_bloom);
  assert.deepEqual(qa('jjajang_sakura').party, ['gyeongsub', 'ppaman']);
});

test('test_petals_spawn_by_rate_burst_and_leave_the_screen', () => {
  const petals = createPetals({ rate: 4, rng: mulberry(7) });
  assert.equal(petals.count, 0);
  petals.update(1, 480, 360); assert.equal(petals.count, 4, '초당 rate 개');
  petals.burst(50, 480, 360); assert.equal(petals.count, 54);
  for (let i = 0; i < 100; i++) petals.update(0.1, 480, 360);
  assert.ok(petals.count > 30 && petals.count < 120, `떨어져 나간 만큼 빠지고 새로 생긴다 ${petals.count}`);
  petals.rate = 0; for (let i = 0; i < 300; i++) petals.update(0.1, 480, 360);
  assert.equal(petals.count, 0, '화면 아래로 다 나가면 없어진다');
  const fills = []; const ctx = { set fillStyle(v) { this._c = v; }, get fillStyle() { return this._c; }, fillRect: (...a) => fills.push(a) };
  petals.burst(5, 480, 360); petals.draw(ctx); assert.equal(fills.length, 5); assert.ok(fills.every(([, , w, h]) => (w === 2 || w === 3) && w === h), '2~3px 네모');
});

test('test_tile_spread_reaches_rows_outward_from_origin_once', () => {
  const spread = createTileSpread({ origin: 34, speed: 10, rows: ['20', '21', '30', '33', '34', '35', '36', '40', '63'] });
  assert.deepEqual(spread.update(0.05), [34], '처음엔 시작 행만');
  assert.ok(spread.covers(34) && !spread.covers(36));
  assert.deepEqual(spread.update(0.1).sort(), [33, 35], '반지름 1.5 → 양옆');
  assert.deepEqual(spread.update(0.5).sort(), [30, 36, 40], '반지름 6.5');
  assert.equal(spread.done, false);
  assert.deepEqual(spread.update(2).sort(), [20, 21], '반지름 26.5: 63행(29 떨어짐)은 아직');
  assert.equal(spread.done, false);
  assert.deepEqual(spread.update(1), [63]); assert.equal(spread.done, true);
  assert.deepEqual(spread.update(1), [], '한 번 닿은 행은 다시 안 준다');
});
