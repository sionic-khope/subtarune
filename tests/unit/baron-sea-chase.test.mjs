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
  assert.equal(C.hitsToClear, 280);
  assert.equal(C.fireCooldown, 0.18);
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
    const fills = [], stack = [];
    const ctx = {
      fillStyle: '', tx: 0, ty: 0, sx: 1, sy: 1,
      save() { stack.push([this.tx, this.ty, this.sx, this.sy, this.fillStyle]); },
      restore() { [this.tx, this.ty, this.sx, this.sy, this.fillStyle] = stack.pop(); },
      translate(x, y) { this.tx += x * this.sx; this.ty += y * this.sy; },
      scale(x, y) { this.sx *= x; this.sy *= y; },
      fillRect(x, y, w, h) {
        const left = this.tx + x * this.sx, top = this.ty + y * this.sy;
        assert.ok(Number.isInteger(left) && Number.isInteger(top));
        fills.push([left, top, w * this.sx, h * this.sy]);
        for (let py = top; py < top + h * this.sy; py++) {
          for (let px = left; px < left + w * this.sx; px++) pixels.set(`${px},${py}`, this.fillStyle);
        }
      },
    };
    BaronSeaChase.prototype.drawPlayerHeart.call({ model: m }, ctx);
    const color = invulnerable > 0 && Math.floor(invulnerable * 14) % 2 ? '#ffffff' : '#ff2b4a';
    const colored = new Set();
    for (const [x, y, w, h] of fills.slice(-27)) {
      assert.equal(w, 2); assert.equal(h, 2);
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) { colored.add(`${px},${py}`); assert.equal(pixels.get(`${px},${py}`), color); }
      }
    }
    assert.equal(colored.size, 108);
    assert.ok([...pixels.entries()].some(([key, value]) => !colored.has(key) && value === '#ffffff'));
    assert.ok([...pixels.values()].includes('#101527'));
    assert.equal(stack.length, 0);
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
  const m = fight(); m.hits = 194; const before = m.attackInterval();
  assert.equal(impact(m).includes('enrage'), false); assert.equal(m.hits, 195);
  assert.ok(impact(m).includes('enrage')); assert.equal(m.enraged, true);
  assert.equal(m.hits, 196);
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
  const m = fight();
  for (let hit = 1; hit < 280; hit++) {
    assert.equal(impact(m).includes('clear'), false);
    assert.equal(m.hits, hit); assert.equal(m.phase, 'fight');
  }
  assert.ok(impact(m).includes('clear')); assert.equal(m.outcome, 'cleared');
  assert.equal(m.hits, 280);
  const position = [m.raftY, m.bossX, m.bossY]; m.update(20, input(['up', 'confirm']));
  assert.deepEqual([m.raftY, m.bossX, m.bossY], position); assert.equal(m.attacks.length, 0);
  const retry = new SeaChaseModel();
  assert.equal(retry.playerHits, 0); assert.equal(retry.hits, 0);
  assert.equal(retry.config.hitsToClear, 280);
  assert.equal(retry.enraged, false); assert.equal(retry.outcome, null);
  assert.equal(new SeaChaseModel({ cleared: true }).phase, 'cleared');
  assert.equal(new SeaChaseModel({ cleared: true }).hits, 280);
});

test('test_sea_chase_boss_health_bar_uses_reduced_maximum_at_start_and_half_health', () => {
  const m = fight(), fills = [];
  const ctx = { save() {}, restore() {}, fillText() {}, fillRect: (...rect) => fills.push(rect) };
  const scene = { model: m, particles: [], game: { textbox: { draw() {} } },
    drawOcean() {}, drawBoss() {}, drawAttacks() {}, drawRaft() {}, drawPlayerHeart() {} };
  for (const [hits, width] of [[0, 160], [140, 80], [279, 1]]) {
    m.hits = hits; fills.length = 0;
    BaronSeaChase.prototype.draw.call(scene, ctx);
    assert.deepEqual(fills.filter(rect => rect[0] === 304 && rect[1] === 14).at(-1), [304, 14, width, 5]);
  }
});

test('test_sea_chase_tutorial_and_repeated_fight_shots_and_hits_use_twenty_percent_lower_volume', () => {
  const m = new SeaChaseModel(), sounds = [];
  const scene = { model: m, particles: [], burst() {},
    game: { sound: { sfx: (...args) => sounds.push(args), playBgm() {} }, textbox: { update() {} } } };
  const update = (dt, controls = input()) => BaronSeaChase.prototype.update.call(scene, dt, controls);
  m.setPhase('tutorial');
  update(1 / 60, input(['confirm']));
  for (let i = 0; i < 240 && m.phase !== 'fight'; i++) update(1 / 60);
  assert.equal(m.phase, 'fight');
  assert.deepEqual(sounds.slice(0, 2), [
    ['cannon_puff', { volume: 0.4, rate: 1.45 }],
    ['pop', { volume: 0.384, rate: 0.8 }],
  ]);
  sounds.length = 0;
  for (let shot = 0; shot < 3; shot++) {
    m.cooldown = 0; update(0.001, input(['confirm']));
    m.projectiles = [{ x: m.bossX + C.boss.width * 0.5, y: m.bossY + C.boss.height * 0.5 }];
    update(0.001);
  }
  assert.deepEqual(sounds, Array.from({ length: 3 }, () => [
    ['cannon_puff', { volume: 0.4, rate: 1.45 }],
    ['pop', { volume: 0.384, rate: 0.8 }],
  ]).flat());
});

test('test_sea_chase_roars_breath_player_hurt_splash_and_music_keep_their_original_volume', () => {
  const calls = [];
  const scene = { particles: [], burst() {}, model: { phase: 'fight', playerHeart: () => ({ x: 0, y: 0 }),
    update: () => ['roar', 'enrage', 'breath', 'player-hit', 'sinking', 'fight'] },
    game: { sound: { sfx: (...args) => calls.push(args), playBgm: (...args) => calls.push(args) }, textbox: { show() {} } } };
  BaronSeaChase.prototype.update.call(scene, 0.001, input());
  assert.deepEqual(calls, [
    ['baron_roar', { volume: 0.9 }], ['baron_roar', { volume: 0.9 }],
    ['cannon_guard_breath', { volume: 0.72 }], ['hurt', { volume: 0.7 }],
    ['splash', { volume: 0.8 }], ['baron_sea_battle', { volume: 0.6 }],
  ]);
});
