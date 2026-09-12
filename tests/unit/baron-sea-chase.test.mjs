import test from 'node:test';
import assert from 'node:assert/strict';
import { SeaChaseModel } from '../../src/scenes/baron-sea-chase.js';
import { BARON_SEA_CHASE as C } from '../../src/data/baron-sea-chase.js';
const input = (held = []) => ({ down: key => held.includes(key), just: key => held.includes(key) });
const fight = () => { const m = new SeaChaseModel(); m.setPhase('fight'); return m; };
const impact = m => { m.projectiles.push({ x: m.bossX + C.boss.width * 0.5, y: m.bossY + C.boss.height * 0.5 }); return m.update(0.001, input()); };

test('tutorial travelling impact precedes red reaction, roar and fight', () => {
  const m = new SeaChaseModel(); m.setPhase('tutorial');
  assert.deepEqual(m.update(1 / 60, input(['confirm'])), ['shot']);
  const events = [];
  for (let i = 0; i < 240; i++) events.push(...m.update(1 / 60, input()));
  assert.deepEqual(events.slice(0, 3), ['tutorial-hit', 'roar', 'fight']);
  assert.equal(m.hits, 0);
});
test('boss collisions use frame alpha and exclude submerged pixels', () => {
  const m = fight();
  m.opaqueAt = (x, y) => x > 0.45 && x < 0.6 && y > 0.4;
  m.projectiles.push({ x: m.bossX + 5, y: m.bossY + 30 });
  m.update(0.01, input()); assert.equal(m.hits, 0);
  assert.ok(impact(m).includes('hit'));
  m.projectiles.push({ x: m.bossX + C.boss.width / 2, y: m.waterline() + 1 });
  m.update(0.01, input()); assert.equal(m.hits, 1);
});
test('held fire is rapid while vertical movement stays in the playfield', () => {
  const m = fight(), events = [];
  for (let i = 0; i < 120; i++) events.push(...m.update(1 / 60, input(['confirm', 'down'])));
  assert.ok(events.filter(e => e === 'shot').length >= 10);
  assert.equal(m.raftY, C.raft.maxY);
  assert.equal(C.hitsToClear, 400);
  assert.ok(C.hitsToClear * C.fireCooldown >= 70);
});
test('invulnerability prevents stacked hits; fifth hit starts drift then failure', () => {
  const m = fight();
  const collide = () => { m.attacks.push({ x: C.raft.x, y: m.raftY - 12, vx: 0, vy: 0, radius: 12, life: 1 }); return m.update(0.01, input()); };
  collide(); collide(); assert.equal(m.playerHits, 1);
  for (let i = 0; i < 4; i++) { m.invulnerable = 0; collide(); }
  assert.equal(m.playerHits, 5); assert.equal(m.phase, 'sinking'); assert.equal(m.completed, false);
  m.update(C.driftDuration + 0.1, input());
  assert.equal(m.outcome, 'failed'); assert.equal(m.completed, true);
});
test('thirty percent remaining causes one roar and faster movement and attacks', () => {
  const m = fight(); m.hits = 279; const before = m.attackInterval();
  assert.ok(impact(m).includes('enrage')); assert.equal(m.enraged, true);
  assert.ok(m.attackInterval() < before); assert.ok(C.enrage.moveMultiplier > 1);
  assert.equal(impact(m).includes('enrage'), false);
});
test('breath warns at mouth before launching into open space', () => {
  const m = fight(); m.update(C.attacks.firstDelay, input());
  assert.ok(m.warning); assert.ok(m.warning.remaining >= 0.3); assert.equal(m.attacks.length, 0);
  const events = m.update(C.attacks.telegraph + 0.01, input());
  assert.ok(events.includes('breath')); assert.ok(m.attacks.length > 0);
  assert.ok(m.attacks.every(a => a.x > C.raft.x + 100));
});
test('victory holds alive standoff and retry creates clean state', () => {
  const m = fight(); m.hits = C.hitsToClear - 1;
  assert.ok(impact(m).includes('clear')); assert.equal(m.outcome, 'cleared');
  const position = [m.raftY, m.bossX, m.bossY]; m.update(20, input(['up', 'confirm']));
  assert.deepEqual([m.raftY, m.bossX, m.bossY], position); assert.equal(m.attacks.length, 0);
  const retry = new SeaChaseModel();
  assert.equal(retry.playerHits, 0); assert.equal(retry.hits, 0);
  assert.equal(retry.enraged, false); assert.equal(retry.outcome, null);
  assert.equal(new SeaChaseModel({ cleared: true }).phase, 'cleared');
});
