import { sweptCirclesHit } from './modes/choimis-pink-shooter.js';

const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const segmentDistance = (point, from, to) => {
  const dx = to.x - from.x, dy = to.y - from.y;
  const u = clamp(((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(point.x - from.x - dx * u, point.y - from.y - dy * u);
};

export const CHOIMIS_PINK_ROUNDS = Object.freeze({
  choso: Object.freeze({ targetHits: 6, beamWarn: 0.55, beamHit: 0.38, beamEvery: 1.15 }),
  kart_block: Object.freeze({ targetHits: 4, warn: 0.4, every: 0.78, speed: 145 }),
  pink_prism: Object.freeze({ shields: 3, coreHits: 3, boltWarn: 0.4, boltEvery: 0.72, boltSpeed: 170 }),
});

function hitShotCircle(shot, target, radius) {
  const oldTarget = { x: target.oldX ?? target.x, y: target.oldY ?? target.y };
  return sweptCirclesHit({ x: shot.oldX, y: shot.oldY }, shot, shot.r, oldTarget, target, radius);
}

function makeBoss(api) {
  const x = api.box.x + api.box.w - 32, y = api.box.y + api.box.h / 2;
  return { id: 'choimis-boss', x, y, oldX: x, oldY: y, r: 20 };
}

function drawSheetFrame(ctx, image, frame, x, y, cell, width, height) {
  if (!image) return;
  ctx.drawImage(image, frame % 2 * cell, Math.floor(frame / 2) * cell, cell, cell,
    Math.round(x - width / 2), Math.round(y - height / 2), width, height);
}

function drawBoss(ctx, api, boss, elapsed, costume = false) {
  drawSheetFrame(ctx, costume ? api.images.choso : api.images.boss, Math.floor(elapsed * (costume ? 5.5 : 3.6)) % 4,
    boss.x, boss.y, 160, costume ? 62 : 58, costume ? 62 : 58);
}

function contactBossShots(api, shots, boss) {
  for (const shot of shots) if (!shot.dead && hitShotCircle(shot, boss, boss.r)) api.bossContact(shot, boss);
}

function createChoso(api) {
  const C = CHOIMIS_PINK_ROUNDS.choso, boss = makeBoss(api), centerY = boss.y;
  let elapsed = 0, hits = 0, nextBeam = 0.4, volley = 0, beams = [], announced = false, done = false;
  return {
    get done() { return done; }, get boss() { return boss; },
    get snapshot() { return { kind: 'choso', hits, required: C.targetHits, target: { ...boss }, boss: { ...boss }, beams: beams.map(beam => ({ ...beam })) }; },
    update(dt, shots) {
      if (done || !api.bossAlive()) return;
      elapsed += dt; boss.oldX = boss.x; boss.oldY = boss.y; boss.y = centerY + Math.sin(elapsed * TAU / 4) * 38;
      if (hits < C.targetHits && elapsed >= nextBeam) {
        nextBeam += C.beamEvery;
        if (!announced) { announced = true; api.say('천혈!'); }
        const offsets = volley++ % 3 === 2 ? [-22, 22] : [0];
        for (const offset of offsets) {
          const from = { x: boss.x - 16, y: boss.y - 10 }, lockedY = clamp(api.soul.y + offset, api.box.y + 10, api.box.y + api.box.h - 10);
          beams.push({ age: 0, from, to: { x: api.box.x - 20, y: lockedY }, locked: { x: api.soul.x, y: lockedY }, warned: C.beamWarn, life: C.beamWarn + C.beamHit, hit: false });
        }
      }
      for (const beam of beams) {
        beam.age += dt;
        if (beam.age >= beam.warned && beam.age < beam.life && !beam.hit && segmentDistance(api.soul, beam.from, beam.to) <= api.soul.r + 4) beam.hit = api.hurt();
      }
      beams = beams.filter(beam => beam.age < beam.life);
      for (const shot of shots) {
        if (shot.dead || !hitShotCircle(shot, boss, boss.r) || !api.bossContact(shot, boss)) continue;
        hits++;
        if (hits >= C.targetHits) { beams = []; done = true; break; }
      }
    },
    draw(ctx) {
      for (const beam of beams) {
        ctx.save(); ctx.strokeStyle = beam.age < beam.warned ? '#ff87bf' : '#c41455'; ctx.lineWidth = beam.age < beam.warned ? 1 : 8;
        if (beam.age < beam.warned) ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(beam.from.x, beam.from.y); ctx.lineTo(beam.to.x, beam.to.y); ctx.stroke();
        if (beam.age >= beam.warned) { ctx.strokeStyle = '#ffd2e8'; ctx.lineWidth = 2; ctx.stroke(); }
        ctx.restore();
      }
      drawBoss(ctx, api, boss, elapsed, true);
      ctx.fillStyle = '#ff9ccd'; ctx.fillRect(boss.x - 24, boss.y + 34, 48, 4); ctx.fillStyle = '#fff'; ctx.fillRect(boss.x - 24, boss.y + 34, 48 * hits / C.targetHits, 4);
    },
    dispose() { beams = []; done = true; },
  };
}

function createKartBlock(api) {
  const C = CHOIMIS_PINK_ROUNDS.kart_block, boss = makeBoss(api);
  const lanes = [api.box.y + 28, api.box.y + api.box.h / 2, api.box.y + api.box.h - 28];
  let elapsed = 0, cleared = 0, spawned = 0, wave = 0, next = 0.25, blockers = [], done = false;
  return {
    get done() { return done; }, get boss() { return boss; },
    get snapshot() { return { kind: 'kart_block', cleared, required: C.targetHits, spawned, boss: { ...boss }, blockers: blockers.map(blocker => ({ ...blocker })) }; },
    update(dt, shots) {
      if (done || !api.bossAlive()) return;
      elapsed += dt; boss.oldX = boss.x; boss.oldY = boss.y;
      if (cleared < C.targetHits && elapsed >= next && blockers.length === 0) {
        next = elapsed + C.every; const safeLane = (wave++ * 2 + 1) % lanes.length;
        for (let lane = 0; lane < lanes.length; lane++) if (lane !== safeLane) {
          blockers.push({ id: `kart-${spawned}`, x: boss.x - 18, oldX: boss.x - 18, y: lanes[lane], oldY: lanes[lane], age: 0, lane, kind: spawned++ % 2 ? 'bazzi' : 'dao', r: 15 });
        }
      }
      for (const blocker of blockers) {
        blocker.age += dt; blocker.oldX = blocker.x; blocker.oldY = blocker.y;
        if (blocker.age >= C.warn) blocker.x -= C.speed * dt;
        const oldSoul = { x: api.soul.oldX ?? api.soul.x, y: api.soul.oldY ?? api.soul.y };
        if (blocker.age >= C.warn && !blocker.dead && sweptCirclesHit({ x: blocker.oldX, y: blocker.oldY }, blocker, blocker.r, oldSoul, api.soul, api.soul.r)) { blocker.dead = true; api.hurt(); }
      }
      for (const shot of shots) for (const blocker of blockers) {
        if (shot.dead || blocker.dead || blocker.age < C.warn || !hitShotCircle(shot, blocker, blocker.r) || !api.hitTarget(shot, blocker.id)) continue;
        blocker.dead = true; cleared++; api.hit(blocker.x, blocker.y); api.sfx('kart_booster', { volume: 0.45 });
        if (shot.dead) break;
      }
      blockers = blockers.filter(blocker => !blocker.dead && blocker.x > api.box.x - 24);
      contactBossShots(api, shots, boss);
      if (cleared >= C.targetHits && !blockers.length) done = true;
    },
    draw(ctx) {
      for (const blocker of blockers) {
        if (blocker.age < C.warn) { ctx.strokeStyle = '#ff87bf'; ctx.setLineDash([4, 5]); ctx.strokeRect(api.box.x + 3, blocker.y - 20, api.box.w - 6, 40); ctx.setLineDash([]); }
        const image = api.images[blocker.kind]; if (image) ctx.drawImage(image, Math.round(blocker.x - 17), Math.round(blocker.y - 20), 34, 40);
      }
      drawBoss(ctx, api, boss, elapsed);
    },
    dispose() { blockers = []; done = true; },
  };
}

function createPinkPrism(api) {
  const C = CHOIMIS_PINK_ROUNDS.pink_prism, boss = makeBoss(api);
  const core = { id: 'prism-core', x: boss.x - 48, y: boss.y, oldX: boss.x - 48, oldY: boss.y, r: 15 };
  let elapsed = 0, coreHits = 0, nextBolt = 0.45, nextBoltId = 0, bolts = [], done = false;
  let shields = Array.from({ length: C.shields }, (_, index) => ({ id: `prism-shield-${index}`, offset: index * TAU / C.shields }));
  const shieldAt = (shield, at = elapsed) => ({ id: shield.id, x: core.x + Math.cos(at * 1.4 + shield.offset) * 37, y: core.y + Math.sin(at * 1.4 + shield.offset) * 37, r: 10 });
  return {
    get done() { return done; }, get boss() { return boss; },
    get snapshot() { return { kind: 'pink_prism', shields: shields.length, shieldPositions: shields.map(shield => shieldAt(shield)), coreHits, required: C.coreHits,
      core: { ...core }, boss: { ...boss }, bolts: bolts.map(bolt => ({ ...bolt })) }; },
    update(dt, shots) {
      if (done || !api.bossAlive()) return;
      const previousElapsed = elapsed; elapsed += dt; boss.oldX = boss.x; boss.oldY = boss.y;
      if (elapsed >= nextBolt) {
        nextBolt += C.boltEvery; const safeLane = nextBoltId++ % 3;
        for (let lane = 0; lane < 3; lane++) if (lane !== safeLane) {
          const y = api.box.y + 28 + lane * (api.box.h - 56) / 2;
          bolts.push({ id: `prism-bolt-${nextBoltId}-${lane}`, x: boss.x - 14, oldX: boss.x - 14, y, age: 0, warn: C.boltWarn, r: 5, hit: false });
        }
      }
      for (const bolt of bolts) {
        bolt.age += dt; bolt.oldX = bolt.x; if (bolt.age >= bolt.warn) bolt.x -= C.boltSpeed * dt;
        if (bolt.age >= bolt.warn && !bolt.hit && Math.hypot(api.soul.x - bolt.x, api.soul.y - bolt.y) <= api.soul.r + bolt.r) bolt.hit = api.hurt();
      }
      bolts = bolts.filter(bolt => !bolt.hit && bolt.x > api.box.x - 12);
      for (const shot of shots) {
        if (shot.dead) continue;
        for (let index = shields.length - 1; index >= 0; index--) {
          const shield = shieldAt(shields[index]), oldShield = shieldAt(shields[index], previousElapsed); shield.oldX = oldShield.x; shield.oldY = oldShield.y;
          if (!hitShotCircle(shot, shield, shield.r) || !api.hitTarget(shot, shield.id)) continue;
          if (shot.charged) { shields.splice(index, 1); api.hit(shield.x, shield.y); api.sfx('great_shine', { volume: 0.5 }); }
          if (shot.dead) break;
        }
        if (shot.dead || shields.length || !hitShotCircle(shot, core, core.r) || !api.hitTarget(shot, core.id)) continue;
        coreHits++; api.hit(core.x, core.y); if (coreHits >= C.coreHits) done = true;
      }
      contactBossShots(api, shots, boss);
      if (done) bolts = [];
    },
    draw(ctx) {
      for (const bolt of bolts) {
        if (bolt.age < bolt.warn) { ctx.strokeStyle = '#ff87bf'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(api.box.x + 4, bolt.y); ctx.lineTo(boss.x - 14, bolt.y); ctx.stroke(); ctx.setLineDash([]); }
        else { ctx.fillStyle = '#ff9ccd'; ctx.beginPath(); ctx.arc(bolt.x, bolt.y, bolt.r, 0, TAU); ctx.fill(); }
      }
      ctx.save(); ctx.translate(core.x, core.y); ctx.rotate(elapsed); ctx.fillStyle = '#ff5ca8'; ctx.fillRect(-11, -11, 22, 22); ctx.fillStyle = '#ffd2e8'; ctx.fillRect(-5, -5, 10, 10); ctx.restore();
      for (const item of shields) { const shield = shieldAt(item); ctx.save(); ctx.translate(shield.x, shield.y); ctx.rotate(elapsed * 2); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(-7, -7, 14, 14); ctx.restore(); }
      drawBoss(ctx, api, boss, elapsed);
    },
    dispose() { bolts = []; shields = []; done = true; },
  };
}

/** Creates one target-local pink shooting scenario without mutating battle state. */
export function createChoimisPinkScenario(name, api) {
  if (name === 'choso') return createChoso(api);
  if (name === 'kart_block') return createKartBlock(api);
  if (name === 'pink_prism') return createPinkPrism(api);
  throw new Error(`[choimis-pink-round] unknown scenario '${name}'`);
}
