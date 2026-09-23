import { sweptCirclesHit } from './modes/choimis-pink-shooter.js';

const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const segmentDistance = (point, from, to) => {
  const dx = to.x - from.x, dy = to.y - from.y;
  const u = clamp(((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(point.x - from.x - dx * u, point.y - from.y - dy * u);
};

export const CHOIMIS_PINK_ROUNDS = Object.freeze({
  choso: Object.freeze({ beamWarn: 0.55, beamHit: 0.38, beamEvery: 1.15 }),
  kart_block: Object.freeze({ warn: 0.45, every: 1.2, speed: 170, boostAfter: 0.65, boostStagger: 0.16, boostSpeed: 255, radius: 18 }),
  pink_prism: Object.freeze({ shields: 3, boltWarn: 0.4, boltEvery: 0.72, boltSpeed: 170 }),
});

function hitShotCircle(shot, target, radius) {
  const oldTarget = { x: target.oldX ?? target.x, y: target.oldY ?? target.y };
  return sweptCirclesHit({ x: shot.oldX, y: shot.oldY }, shot, shot.r, oldTarget, target, radius);
}

function makeBoss(api) {
  const targetX = api.box.x + api.box.w - 32, y = api.box.y + api.box.h / 2;
  return { id: 'choimis-boss', x: api.box.x + api.box.w + 34, y, oldX: api.box.x + api.box.w + 34, oldY: y, targetX, r: 20 };
}

function prepareBoss(boss, dt) {
  boss.oldX = boss.x; boss.oldY = boss.y;
  boss.x = Math.max(boss.targetX, boss.x - 180 * dt);
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
  let elapsed = 0, hits = 0, nextBeam = 0.4, volley = 0, beams = [], disposed = false;
  return {
    get done() { return disposed; }, get boss() { return boss; },
    get snapshot() {
      return { kind: 'choso', hits, target: { ...boss }, boss: { ...boss },
        charge: beams.filter(beam => beam.age < beam.warned).map(beam => ({ from: { ...beam.from }, locked: { ...beam.locked }, progress: beam.age / beam.warned })),
        spray: beams.filter(beam => beam.age >= beam.warned).map(beam => ({ from: { ...beam.from }, to: { ...beam.to }, age: beam.age - beam.warned })),
        beams: beams.map(beam => ({ ...beam, from: { ...beam.from }, to: { ...beam.to }, locked: { ...beam.locked } })) };
    },
    prepare(dt) { if (!disposed) prepareBoss(boss, dt); },
    update(dt, shots) {
      if (disposed || !api.bossAlive()) return;
      elapsed += dt; boss.oldX = boss.x; boss.oldY = boss.y; boss.x = boss.targetX; boss.y = centerY + Math.sin(elapsed * TAU / 4) * 38;
      if (elapsed >= nextBeam) {
        nextBeam += C.beamEvery;
        const offsets = volley++ % 3 === 2 ? [-22, 22] : [0];
        for (const offset of offsets) {
          const lockedY = clamp(api.soul.y + offset, api.box.y + 10, api.box.y + api.box.h - 10);
          beams.push({ age: 0, from: { x: boss.x - 16, y: boss.y - 10 }, to: { x: api.box.x - 20, y: lockedY },
            locked: { x: api.soul.x, y: lockedY }, warned: C.beamWarn, life: C.beamWarn + C.beamHit, hit: false });
        }
      }
      for (const beam of beams) {
        beam.age += dt; beam.from.x = boss.x - 16; beam.from.y = boss.y - 10;
        if (beam.age >= beam.warned && beam.age < beam.life && !beam.hit && segmentDistance(api.soul, beam.from, beam.to) <= api.soul.r + 4) beam.hit = api.hurt();
      }
      beams = beams.filter(beam => beam.age < beam.life);
      for (const shot of shots) {
        if (shot.dead || !hitShotCircle(shot, boss, boss.r) || !api.bossContact(shot, boss)) continue;
        hits++;
      }
    },
    draw(ctx) {
      for (const beam of beams) {
        ctx.save();
        if (beam.age < beam.warned) {
          ctx.strokeStyle = '#ff87bf'; ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
          const charge = clamp(beam.age / beam.warned, 0, 1);
          ctx.fillStyle = '#ffb4d7';
          for (let index = 0; index < 6; index++) {
            const angle = elapsed * 8 + index * TAU / 6, radius = 24 * (1 - charge);
            ctx.fillRect(Math.round(beam.from.x + Math.cos(angle) * radius) - 1, Math.round(beam.from.y + Math.sin(angle) * radius) - 1, 3, 3);
          }
        } else ctx.strokeStyle = '#c41455';
        ctx.lineWidth = beam.age < beam.warned ? 1 : 8;
        ctx.beginPath(); ctx.moveTo(beam.from.x, beam.from.y); ctx.lineTo(beam.to.x, beam.to.y); ctx.stroke();
        if (beam.age >= beam.warned) {
          ctx.strokeStyle = '#ffd2e8'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#f45a83';
          for (let index = 0; index < 7; index++) {
            const amount = ((index * 0.17 + beam.age * 1.7) % 1), x = beam.from.x + (beam.to.x - beam.from.x) * amount;
            const y = beam.from.y + (beam.to.y - beam.from.y) * amount + Math.sin(index * 2.3) * 7;
            ctx.fillRect(Math.round(x) - 2, Math.round(y) - 1, 4, 3);
          }
        }
        ctx.restore();
      }
      drawBoss(ctx, api, boss, elapsed, !!api.transformed?.());
    },
    dispose() { beams = []; disposed = true; },
  };
}

function createKartBlock(api) {
  const C = CHOIMIS_PINK_ROUNDS.kart_block, boss = makeBoss(api);
  const lanes = [api.box.y + 28, api.box.y + api.box.h / 2, api.box.y + api.box.h - 28];
  const safeLanes = [1, 0, 1, 2];
  const startX = boss.targetX - 18;
  const distanceAt = blocker => {
    const driving = Math.max(0, blocker.age - C.warn);
    return Math.min(driving, blocker.boostAt) * C.speed + Math.max(0, driving - blocker.boostAt) * C.boostSpeed;
  };
  let elapsed = 0, cleared = 0, spawned = 0, wave = 0, next = 0.25, blockers = [], disposed = false;
  return {
    get done() { return disposed; }, get boss() { return boss; },
    get snapshot() { return { kind: 'kart_block', cleared, spawned, boss: { ...boss }, blockers: blockers.map(blocker => ({ ...blocker })) }; },
    prepare(dt) { if (!disposed) prepareBoss(boss, dt); },
    update(dt, shots) {
      if (disposed || !api.bossAlive()) return;
      elapsed += dt; boss.oldX = boss.x; boss.oldY = boss.y; boss.x = boss.targetX;
      while (elapsed >= next) {
        const born = next, waveId = wave++, safeLane = safeLanes[waveId % safeLanes.length]; next += C.every;
        let position = 0;
        for (let lane = 0; lane < lanes.length; lane++) if (lane !== safeLane) {
          blockers.push({ id: `kart-${spawned}`, wave: waveId, safeLane, born, x: startX, oldX: startX, y: lanes[lane], oldY: lanes[lane], age: 0,
            boostAt: C.boostAfter + position++ * C.boostStagger, launched: false, boosted: false, lane, kind: spawned++ % 2 ? 'bazzi' : 'dao', r: C.radius });
        }
      }
      let launched = false, boosted = false;
      for (const blocker of blockers) {
        blocker.age = elapsed - blocker.born; blocker.oldX = blocker.x; blocker.oldY = blocker.y;
        blocker.x = startX - distanceAt(blocker);
        if (!blocker.launched && blocker.age >= C.warn) { blocker.launched = true; launched = true; }
        if (!blocker.boosted && blocker.age >= C.warn + blocker.boostAt) { blocker.boosted = true; boosted = true; }
        const oldSoul = { x: api.soul.oldX ?? api.soul.x, y: api.soul.oldY ?? api.soul.y };
        if (blocker.age >= C.warn && !blocker.dead && sweptCirclesHit({ x: blocker.oldX, y: blocker.oldY }, blocker, blocker.r, oldSoul, api.soul, api.soul.r)) { blocker.dead = true; api.hurt(); }
      }
      if (launched || boosted) api.sfx('kart_booster', { volume: boosted ? 0.24 : 0.18, len: 0.28 });
      for (const shot of shots) for (const blocker of blockers) {
        if (shot.dead || blocker.dead || blocker.age < C.warn || !hitShotCircle(shot, blocker, blocker.r) || !api.hitTarget(shot, blocker.id)) continue;
        blocker.dead = true; cleared++; api.hit(blocker.x, blocker.y); api.sfx('pop', { volume: 0.384, rate: 0.8 });
        if (shot.dead) break;
      }
      blockers = blockers.filter(blocker => !blocker.dead && blocker.x > api.box.x - 24);
      contactBossShots(api, shots, boss);
    },
    draw(ctx) {
      for (const blocker of blockers) {
        if (blocker.age < C.warn) { ctx.strokeStyle = '#ff87bf'; ctx.setLineDash([4, 5]); ctx.strokeRect(api.box.x + 3, blocker.y - 20, api.box.w - 6, 40); ctx.setLineDash([]); }
        const image = api.images[blocker.kind];
        if (image) {
          const width = 50, height = Math.round(width * image.height / image.width);
          ctx.drawImage(image, Math.round(blocker.x - width / 2), Math.round(blocker.y - height / 2), width, height);
        }
      }
      drawBoss(ctx, api, boss, elapsed);
    },
    dispose() { blockers = []; disposed = true; },
  };
}

function createPinkPrism(api) {
  const C = CHOIMIS_PINK_ROUNDS.pink_prism, boss = makeBoss(api);
  const core = { id: 'prism-core', x: boss.targetX - 48, y: boss.y, oldX: boss.targetX - 48, oldY: boss.y, r: 15 };
  let elapsed = 0, coreHits = 0, nextBolt = 0.45, nextBoltId = 0, bolts = [], disposed = false;
  let shields = Array.from({ length: C.shields }, (_, index) => ({ id: `prism-shield-${index}`, offset: index * TAU / C.shields }));
  const shieldAt = (shield, at = elapsed) => ({ id: shield.id, x: core.x + Math.cos(at * 1.4 + shield.offset) * 37, y: core.y + Math.sin(at * 1.4 + shield.offset) * 37, r: 10 });
  return {
    get done() { return disposed; }, get boss() { return boss; },
    get snapshot() { return { kind: 'pink_prism', shields: shields.length, shieldPositions: shields.map(shield => shieldAt(shield)), coreHits,
      core: { ...core }, boss: { ...boss }, bolts: bolts.map(bolt => ({ ...bolt })) }; },
    prepare(dt) { if (!disposed) prepareBoss(boss, dt); },
    update(dt, shots) {
      if (disposed || !api.bossAlive()) return;
      const previousElapsed = elapsed; elapsed += dt; boss.oldX = boss.x; boss.oldY = boss.y; boss.x = boss.targetX;
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
          api.hit(shield.x, shield.y); api.sfx('pop', { volume: 0.384, rate: 0.8 });
          if (shot.charged) shields.splice(index, 1);
          if (shot.dead) break;
        }
        if (shot.dead || shields.length || !hitShotCircle(shot, core, core.r) || !api.hitTarget(shot, core.id)) continue;
        coreHits++; api.hit(core.x, core.y); api.sfx('pop', { volume: 0.384, rate: 0.8 });
      }
      contactBossShots(api, shots, boss);
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
    dispose() { bolts = []; shields = []; disposed = true; },
  };
}

/** Creates one fixed-duration pink shooting scenario without mutating battle state. */
export function createChoimisPinkScenario(name, api) {
  if (name === 'choso') return createChoso(api);
  if (name === 'kart_block') return createKartBlock(api);
  if (name === 'pink_prism') return createPinkPrism(api);
  throw new Error(`[choimis-pink-round] unknown scenario '${name}'`);
}
