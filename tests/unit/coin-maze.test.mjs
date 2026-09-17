// 변신 영클 코인벌기(BUILD214): 미로는 항상 풀리고(입구→출구 경로), 같은 시드는 같은 미로, 코인 순환 6종은 전부 등록돼 있다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMaze, solveMaze, seededRandom } from '../../src/battle/modes/coin-maze.js';
import { COIN_PATTERNS } from '../../src/battle/coin-patterns.js';
import { TVFORM_BATTLE } from '../../src/data/youngcle-tvform-battle.js';

test('test_coin_maze_generate_always_solvable_and_long', () => {
  const K = TVFORM_BATTLE.maze;
  for (const base of [K.seedA, K.seedB]) for (let i = 0; i < 6; i++) {
    const m = generateMaze(K.cols, K.rows, base + i * 7919);
    const path = solveMaze(m);
    assert.ok(path > 0, `seed ${base + i * 7919}: 출구까지 길이 있어야 한다`);
    assert.ok(path >= 15, `seed ${base + i * 7919}: 최단 경로가 너무 짧다(${path}칸) — 15~20초짜리 미로여야 한다`);
  }
});

test('test_coin_maze_same_seed_same_maze', () => {
  const a = generateMaze(12, 10, 42), b = generateMaze(12, 10, 42);
  assert.deepEqual(a.right, b.right); assert.deepEqual(a.down, b.down);
  const r = seededRandom(7); const x = r(); assert.ok(x >= 0 && x < 1);
});

test('test_coin_order_patterns_registered', () => {
  for (const name of TVFORM_BATTLE.coinOrder) {
    if (name.startsWith('coin_maze')) continue;
    assert.equal(typeof COIN_PATTERNS[name], 'function', `${name} 탄막이 등록돼야 한다`);
    const p = COIN_PATTERNS[name]({ coin: true });
    assert.ok(p.duration >= 10 && p.duration <= 13, `${name} 길이 10~13초`);
  }
});

test('test_coin_patterns_emit_exactly_one_coin_in_second_half', () => {
  const box = { x: 120, y: 100, w: 240, h: 160 };
  for (const name of TVFORM_BATTLE.coinOrder) {
    if (name.startsWith('coin_maze')) continue;
    const p = COIN_PATTERNS[name]({ coin: true }); const made = []; let t = 0; const step = 1 / 60;
    const api = { box, soul: { x: 240, y: 180, r: 6 }, rnd: seededRandom(3), sfx: () => {}, images: {}, emit: (o) => { const b = { age: 0, ...o }; made.push({ b, at: t }); return b; } };
    while (t < p.duration) { for (const m of made) m.b.age += step; p.update(t, step, api); t += step; }
    const coins = made.filter(m => m.b.pickup);
    assert.equal(coins.length, 1, `${name}: 진짜 코인은 한 번`);
    assert.ok(coins[0].at >= p.duration * 0.5, `${name}: 코인은 후반(${coins[0].at.toFixed(1)}s / ${p.duration}s)`);
  }
});
