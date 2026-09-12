import test from 'node:test';
import assert from 'node:assert/strict';
import { SeaChaseModel } from '../../src/scenes/baron-sea-chase.js';
import { BARON_SEA_CHASE as C } from '../../src/data/baron-sea-chase.js';

const input = (held = []) => ({ down: (key) => held.includes(key), just: (key) => held.includes(key) });

test('sea chase tutorial requires a travelling shot, red hit, roar, then battle music', () => {
  const model = new SeaChaseModel();
  model.setPhase('tutorial');
  assert.deepEqual(model.update(1 / 60, input(['confirm'])), ['shot']);
  assert.equal(model.phase, 'tutorial-shot');
  assert.equal(model.hits, 0);
  const events = [];
  for (let i = 0; i < 240; i++) events.push(...model.update(1 / 60, input()));
  assert.deepEqual(events, ['tutorial-hit', 'roar', 'fight']);
  assert.equal(model.hits, 0);
});

test('sea chase only actual projectile collisions count and idle time never clears', () => {
  const model = new SeaChaseModel();
  model.setPhase('fight');
  for (let i = 0; i < 2000; i++) model.update(0.05, input());
  assert.equal(model.hits, 0);
  assert.equal(model.completed, false);
  model.raftY = C.raft.minY;
  model.bossY = C.boss.baseY + C.boss.amplitude;
  model.projectiles.push({ x: model.bossX - 2, y: -20 });
  model.update(0.05, input());
  assert.equal(model.hits, 0);
});

test('sea chase holding confirm respects cooldown and supports the Input abstraction', () => {
  const model = new SeaChaseModel();
  model.setPhase('fight');
  const events = [];
  for (let i = 0; i < 600; i++) events.push(...model.update(1 / 60, input(['confirm', 'down'])));
  assert.ok(events.filter((e) => e === 'shot').length <= 13);
  assert.equal(model.raftY, C.raft.maxY);
  assert.ok(C.hitsToClear * C.fireCooldown >= 60);
});

test('sea chase clears by hits and freezes without killing the boss or releasing Yongjun', () => {
  const model = new SeaChaseModel();
  model.setPhase('fight');
  model.hits = C.hitsToClear - 1;
  const target = model.targetRect();
  model.projectiles.push({ x: target.x - 1, y: target.y + target.h / 2 });
  assert.ok(model.update(0.01, input()).includes('clear'));
  assert.equal(model.completed, true);
  const position = [model.raftY, model.bossX, model.bossY];
  model.update(20, input(['up', 'confirm']));
  assert.deepEqual([model.raftY, model.bossX, model.bossY], position);
  assert.equal(model.projectiles.length, 0);
  assert.equal(model.hits, C.hitsToClear);
  assert.equal(new SeaChaseModel({ cleared: true }).phase, 'cleared');
});
