import { sweptCirclesHit } from './modes/choimis-pink-shooter.js';

const TAU = Math.PI * 2;
const PINK = '#ff5ca8';
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const segmentDistance = (point, from, to) => {
  const dx = to.x - from.x, dy = to.y - from.y;
  const u = clamp(((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(point.x - from.x - dx * u, point.y - from.y - dy * u);
};

export const CHOIMIS_PINK_ROUNDS = Object.freeze({
  choso: Object.freeze({ targetHits: 6, beamWarn: 0.55, beamHit: 0.38, beamEvery: 1.15 }),
  kart_block: Object.freeze({ targetHits: 4, warn: 0.5, every: 0.9, speed: 112 }),
  pink_prism: Object.freeze({ shields: 3, coreHits: 3, boltWarn: 0.5, boltEvery: 0.85, boltSpeed: 150 }),
});

function hitShotCircle(shot, target, radius) {
  const oldTarget = { x: target.oldX ?? target.x, y: target.oldY ?? target.y };
  return sweptCirclesHit({ x: shot.oldX, y: shot.oldY }, shot, shot.r, oldTarget, target, radius);
}

function drawSheetFrame(ctx, image, frame, x, y, cell, width, height) {
  if (!image) return;
  ctx.drawImage(image, frame % 2 * cell, Math.floor(frame / 2) * cell, cell, cell,
    Math.round(x - width / 2), Math.round(y - height / 2), width, height);
}

function createChoso(api) {
  const C = CHOIMIS_PINK_ROUNDS.choso, target = { x: api.box.x + api.box.w - 34, y: api.box.y + api.box.h / 2, r: 21 };
  const centerY = target.y;
  let elapsed = 0, hits = 0, nextBeam = 0.4, volley = 0, beams = [], announced = false, done = false;
  return {
    get done() { return done; },
    get snapshot() { return { kind: 'choso', hits, required: C.targetHits, target: { ...target }, beams: beams.map(beam => ({ ...beam })) }; },
    update(dt, shots) {
      elapsed += dt; target.oldX = target.x; target.oldY = target.y; target.y = centerY + Math.sin(elapsed * TAU / 4) * 38;
      if (hits < C.targetHits && elapsed >= nextBeam) {
        nextBeam += C.beamEvery;
        if (!announced) { announced = true; api.say('천혈!'); }
        const offsets = volley++ % 3 === 2 ? [-22, 22] : [0];
        for (const offset of offsets) {
          const from = { x: target.x - 16, y: target.y - 10 }, locked = { x: api.soul.x, y: clamp(api.soul.y + offset, api.box.y + 10, api.box.y + api.box.h - 10) };
          beams.push({ age: 0, from, to: { x: api.box.x - 20, y: locked.y }, locked, warned: C.beamWarn, life: C.beamWarn + C.beamHit, hit: false });
        }
      }
      for (const beam of beams) {
        beam.age += dt;
        if (beam.age >= beam.warned && beam.age < beam.life && !beam.hit && segmentDistance(api.soul, beam.from, beam.to) <= api.soul.r + 4) { beam.hit = api.hurt(); }
      }
      beams = beams.filter(beam => beam.age < beam.life);
      for (const shot of shots) {
        if (shot.dead || !hitShotCircle(shot, target, target.r)) continue;
        shot.dead = true; hits++; api.hit(target.x, target.y); api.sfx('hit', { volume: 0.55 });
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
      drawSheetFrame(ctx, api.images.choso, Math.floor(elapsed * 5.5) % 4, target.x, target.y, 160, 62, 62);
      ctx.fillStyle = '#ff9ccd'; ctx.fillRect(target.x - 24, target.y + 34, 48, 4); ctx.fillStyle = '#fff'; ctx.fillRect(target.x - 24, target.y + 34, 48 * hits / C.targetHits, 4);
    },
  };
}

function createKartBlock(api) {
  const C = CHOIMIS_PINK_ROUNDS.kart_block, lanes = [api.box.y + 28, api.box.y + api.box.h / 2, api.box.y + api.box.h - 28];
  let elapsed = 0, cleared = 0, spawned = 0, next = 0.2, blockers = [], done = false;
  return {
    get done() { return done; },
    get snapshot() { return { kind: 'kart_block', cleared, required: C.targetHits, spawned, blockers: blockers.map(blocker => ({ ...blocker, image: undefined })) }; },
    update(dt, shots) {
      elapsed += dt;
      if (cleared < C.targetHits && elapsed >= next && blockers.length < 2) {
        next += C.every; const lane = spawned % lanes.length;
        blockers.push({ x: api.box.x + api.box.w + 18, oldX: api.box.x + api.box.w + 18, y: lanes[lane], age: 0, lane, kind: spawned++ % 2 ? 'bazzi' : 'dao', r: 15 });
      }
      for (const blocker of blockers) {
        blocker.age += dt; blocker.oldX = blocker.x; blocker.oldY = blocker.y;
        if (blocker.age >= C.warn) blocker.x -= C.speed * dt;
        const oldSoul = { x: api.soul.oldX ?? api.soul.x, y: api.soul.oldY ?? api.soul.y };
        if (blocker.age >= C.warn && !blocker.dead
          && sweptCirclesHit({ x: blocker.oldX, y: blocker.oldY }, blocker, blocker.r, oldSoul, api.soul, api.soul.r)) { blocker.dead = true; api.hurt(); }
      }
      for (const shot of shots) for (const blocker of blockers) {
        if (shot.dead || blocker.dead || blocker.age < C.warn || !hitShotCircle(shot, blocker, blocker.r)) continue;
        shot.dead = true; blocker.dead = true; cleared++; api.hit(blocker.x, blocker.y); api.sfx('kart_booster', { volume: 0.45 }); break;
      }
      blockers = blockers.filter(blocker => !blocker.dead && blocker.x > api.box.x - 24);
      if (cleared >= C.targetHits && !blockers.length) done = true;
    },
    draw(ctx) {
      for (const blocker of blockers) {
        if (blocker.age < C.warn) { ctx.strokeStyle = '#ff87bf'; ctx.setLineDash([4, 5]); ctx.strokeRect(api.box.x + 3, blocker.y - 20, api.box.w - 6, 40); ctx.setLineDash([]); }
        const image = api.images[blocker.kind];
        if (image) ctx.drawImage(image, Math.round(blocker.x - 17), Math.round(blocker.y - 20), 34, 40);
      }
    },
  };
}

function createPinkPrism(api) {
  const C = CHOIMIS_PINK_ROUNDS.pink_prism, core = { x: api.box.x + api.box.w - 42, y: api.box.y + api.box.h / 2, r: 15 };
  let elapsed = 0, shields = C.shields, coreHits = 0, nextBolt = 0.45, bolts = [], done = false;
  const shieldAt = (index, at = elapsed) => { const angle = at * 1.4 + index * TAU / Math.max(1, shields); return { x: core.x + Math.cos(angle) * 37, y: core.y + Math.sin(angle) * 37, r: 10 }; };
  return {
    get done() { return done; },
    get snapshot() { return { kind: 'pink_prism', shields, shieldPositions: Array.from({ length: shields }, (_, index) => shieldAt(index)),
      coreHits, required: C.coreHits, core: { ...core }, bolts: bolts.map(bolt => ({ ...bolt })) }; },
    update(dt, shots) {
      const previousElapsed = elapsed; elapsed += dt;
      if (elapsed >= nextBolt && !done) {
        nextBolt += C.boltEvery; const lane = Math.floor(elapsed / C.boltEvery) % 3, y = api.box.y + 28 + lane * (api.box.h - 56) / 2;
        bolts.push({ x: api.box.x + api.box.w - 8, oldX: api.box.x + api.box.w - 8, y, age: 0, warn: C.boltWarn, r: 5, hit: false });
      }
      for (const bolt of bolts) { bolt.age += dt; bolt.oldX = bolt.x; if (bolt.age >= bolt.warn) bolt.x -= C.boltSpeed * dt;
        if (bolt.age >= bolt.warn && !bolt.hit && Math.hypot(api.soul.x - bolt.x, api.soul.y - bolt.y) <= api.soul.r + bolt.r) { bolt.hit = api.hurt(); } }
      bolts = bolts.filter(bolt => !bolt.hit && bolt.x > api.box.x - 12);
      for (const shot of shots) {
        if (shot.dead) continue;
        let blocked = false;
        for (let index = 0; index < shields; index++) {
          const shield = shieldAt(index), oldShield = shieldAt(index, previousElapsed); shield.oldX = oldShield.x; shield.oldY = oldShield.y;
          if (!hitShotCircle(shot, shield, shield.r)) continue;
          shot.dead = true; blocked = true;
          if (shot.charged) { shields--; api.hit(shield.x, shield.y); api.sfx('great_shine', { volume: 0.5 }); }
          break;
        }
        if (blocked || shields || !hitShotCircle(shot, core, core.r)) continue;
        shot.dead = true; coreHits++; api.hit(core.x, core.y); api.sfx('hit', { volume: 0.55 });
        if (coreHits >= C.coreHits) { bolts = []; done = true; }
      }
    },
    draw(ctx) {
      for (const bolt of bolts) {
        if (bolt.age < bolt.warn) { ctx.strokeStyle = '#ff87bf'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(api.box.x + 4, bolt.y); ctx.lineTo(api.box.x + api.box.w - 4, bolt.y); ctx.stroke(); ctx.setLineDash([]); }
        else { ctx.fillStyle = '#ff9ccd'; ctx.beginPath(); ctx.arc(bolt.x, bolt.y, bolt.r, 0, TAU); ctx.fill(); }
      }
      ctx.save(); ctx.translate(core.x, core.y); ctx.rotate(elapsed); ctx.fillStyle = '#ff5ca8'; ctx.fillRect(-11, -11, 22, 22); ctx.fillStyle = '#ffd2e8'; ctx.fillRect(-5, -5, 10, 10); ctx.restore();
      for (let index = 0; index < shields; index++) { const shield = shieldAt(index); ctx.save(); ctx.translate(shield.x, shield.y); ctx.rotate(elapsed * 2); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(-7, -7, 14, 14); ctx.restore(); }
    },
  };
}

/** Creates one target-local pink shooting scenario without touching boss HP. */
export function createChoimisPinkScenario(name, api) {
  if (name === 'choso') return createChoso(api);
  if (name === 'kart_block') return createKartBlock(api);
  if (name === 'pink_prism') return createPinkPrism(api);
  throw new Error(`[choimis-pink-round] unknown scenario '${name}'`);
}
