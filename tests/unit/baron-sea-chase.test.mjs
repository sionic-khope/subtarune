import test from 'node:test';
import assert from 'node:assert/strict';
import { SeaChaseModel, BaronSeaChase } from '../../src/scenes/baron-sea-chase.js';
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
  const collide = () => { const heart = m.playerHeart(); m.attacks.push({ x: heart.x, y: heart.y, vx: 0, vy: 0, radius: 12, life: 1 }); return m.update(0.01, input()); };
  collide(); collide(); assert.equal(m.playerHits, 1);
  for (let i = 0; i < 4; i++) { m.invulnerable = 0; collide(); }
  assert.equal(m.playerHits, 5); assert.equal(m.phase, 'sinking'); assert.equal(m.completed, false);
  m.update(C.driftDuration + 0.1, input());
  assert.equal(m.outcome, 'failed'); assert.equal(m.completed, true);
});
test('only the face heart takes damage, not the old torso or the raft', () => {
  const m = fight(), heart = m.playerHeart();
  m.attacks.push({ x: C.raft.x, y: m.raftY - 12, vx: 0, vy: 0, radius: 10, life: 1 });
  m.updateAttacks(0, []); assert.equal(m.playerHits, 0);
  m.attacks = [{ x: heart.x, y: heart.y, vx: 0, vy: 0, radius: 1, life: 1 }];
  const events = []; m.updateAttacks(0, events);
  assert.equal(m.playerHits, 1); assert.deepEqual(events, ['player-hit']);
});
test('heart grazes exclude the outline and old broad radius', () => {
  for (const [offset, hits] of [[2.5, 0], [2.4, 1], [-2.5, 0], [-2.4, 1]]) {
    const m = fight(), heart = m.playerHeart();
    m.attacks = [{ x: heart.x + offset, y: heart.y, vx: 0, vy: 0, radius: 1, life: 1 }];
    m.updateAttacks(0, []); assert.equal(m.playerHits, hits);
  }
});
test('visible heart and damage center follow the same bob, movement and shot recoil', () => {
  const m = fight();
  for (const [time, raftY, recoil, invulnerable] of [[0, 140, 0, 0], [0.3, 100.4, 0.15, 0.5], [0.9, 264.2, 0.06, 0.6]]) {
    Object.assign(m, { time, raftY, recoil, invulnerable });
    const pose = m.raftPose(), heart = m.playerHeart(), pixels = new Map();
    assert.deepEqual(heart, { x: pose.x + C.heart.x, y: pose.y + C.heart.y, radius: 1.5 });
    const ctx = { fillStyle: '', fillRect(x, y) { assert.ok(Number.isInteger(x) && Number.isInteger(y)); pixels.set(`${x},${y}`, this.fillStyle); } };
    BaronSeaChase.prototype.drawPlayerHeart.call({ model: m }, ctx);
    const color = invulnerable > 0 && Math.floor(invulnerable * 14) % 2 ? '#ffffff' : '#ff2b4a';
    assert.equal([...pixels.values()].filter(value => value === color).length, 27);
    for (let dx = -2; dx <= 2; dx += 0.25) {
      for (let dy = -2; dy <= 2; dy += 0.25) {
        if (Math.hypot(dx, dy) >= heart.radius) continue;
        assert.equal(pixels.get(`${Math.floor(heart.x + dx)},${Math.floor(heart.y + dy)}`), color);
      }
    }
  }
});
test('aimed warning and breath share the captured heart target', () => {
  const m = fight(); m.time = 0.3; m.recoil = 0.15; m.attackClock = 0;
  const heart = m.playerHeart(); m.updateAttacks(0, []);
  assert.equal(m.warning.targetX, heart.x); assert.equal(m.warning.targetY, heart.y);
  m.raftY += 40;
  m.updateAttacks(C.attacks.telegraph + 0.01, []);
  const middle = m.attacks[1], timeToTarget = (heart.x - middle.x) / middle.vx;
  assert.ok(Math.abs(middle.y + middle.vy * timeToTarget - heart.y) < 0.001);
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
