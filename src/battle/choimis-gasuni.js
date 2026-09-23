import { CHOIMIS_GASUNI as C } from '../data/choimis-gasuni.js';
import { sweptCirclesHit } from './modes/choimis-pink-shooter.js';

const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const prior = body => ({ x: body.oldX ?? body.x, y: body.oldY ?? body.y });
const touches = (a, b) => sweptCirclesHit(prior(a), a, a.r, prior(b), b, b.r);

function drawSpirit(ctx, image, pose, alpha = 1) {
  if (!image) return;
  const cellW = image.width / 4, cellH = image.height / 4;
  ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(pose.x), Math.round(pose.y)); ctx.rotate(pose.angle || 0);
  ctx.drawImage(image, 0, 0, cellW, cellH, -Math.round(pose.size / 2), -Math.round(pose.size * C.spriteCenterY), Math.round(pose.size), Math.round(pose.size));
  ctx.restore();
}

/** Pink-round scenario using the shared shooting/hurt API; only the adapter ends the timed round. */
export function createChoimisGasuniScenario(api) {
  const centerY = api.box.y + api.box.h / 2, targetX = api.box.x + api.box.w - C.bossInset;
  const boss = { id: 'choimis-boss', x: api.box.x + api.box.w + 34, y: centerY,
    oldX: api.box.x + api.box.w + 34, oldY: centerY, targetX, r: C.bossRadius };
  let elapsed = 0, nextThrow = 0, targets = [], giantSpawned = false, giantOutcome = null;
  let destroyed = 0, contacted = 0, escaped = 0, expired = 0, absorbed = 0, powered = false, disposed = false;
  let stopped = false, phase = 'gather';
  const spiritAt = (index, time) => {
    const progress = (time - index * C.gatherStagger) / C.gatherTime;
    if (progress < 0 || progress >= 1) return null;
    const angle = progress * C.gatherTurns * TAU + index * TAU / C.spirits.length;
    const distance = (1 - progress) ** 0.8;
    return { x: boss.x - (C.gatherRadius + Math.cos(angle) * C.gatherRadius * 0.62) * distance,
      y: boss.y + Math.sin(angle) * C.gatherHeight * distance,
      angle: angle - index * TAU / C.spirits.length, size: C.gatherSize * (1 - progress) + 8 * progress };
  };
  const spirits = () => C.spirits.flatMap((kind, index) => {
    const pose = spiritAt(index, elapsed);
    if (!pose || stopped || disposed) return [];
    const trail = Array.from({ length: C.trailCount }, (_, offset) => spiritAt(index, elapsed - (C.trailCount - offset) * C.trailGap)).filter(Boolean);
    return [{ kind, ...pose, trail }];
  });
  const finishTarget = (target, outcome) => {
    target.outcome = outcome;
    if (target.kind === 'jeomnye') giantOutcome = outcome;
    if (outcome === 'destroyed') destroyed++;
    if (outcome === 'contact') contacted++;
    if (outcome === 'escaped') escaped++;
    if (outcome === 'expired') expired++;
  };
  const clearTargets = outcome => {
    for (const target of targets) if (!target.outcome) finishTarget(target, outcome);
    targets = [];
  };
  const spawnTarget = (kind, born, index) => {
    const giant = kind === 'jeomnye';
    const x = targetX - C.launchInset;
    const y = giant ? clamp(api.soul.y, centerY - 12, centerY + 12) : centerY + Math.sin(index * 2.3) * 26;
    const aim = { x: api.soul.x, y: giant ? y : api.soul.y };
    const angle = Math.atan2(aim.y - y, aim.x - x), speed = giant ? C.giantSpeed : C.throwSpeed;
    return { id: giant ? 'gasuni-jeomnye' : `gasuni-throw-${index}`, kind, born, x, y, oldX: x, oldY: y,
      startX: x, startY: y, aim, vx: Math.cos(angle) * speed, vy: giant ? 0 : Math.sin(angle) * speed,
      hp: giant ? C.giantHp : 1, maxHp: giant ? C.giantHp : 1, r: giant ? C.giantRadius : C.throwRadius,
      size: giant ? C.giantSize : C.throwSize, warn: giant ? C.giantWarn : C.throwWarn,
      expiresAt: giant ? C.duration : Math.min(C.giantAt, born + C.throwLife), age: 0, launched: false, flash: 0, outcome: null };
  };
  return {
    get done() { return disposed; },
    get boss() { return boss; },
    get snapshot() {
      return { kind: 'gasuni', phase, elapsed, boss: { ...boss }, spirits: spirits(), absorbed, powered,
        targets: targets.map(target => ({ ...target, aim: { ...target.aim } })), giantOutcome,
        destroyed, contacted, escaped, expired, disposed, stopped };
    },
    prepare(dt) {
      if (disposed || stopped) return;
      boss.oldX = boss.x; boss.oldY = boss.y;
      boss.x = Math.max(targetX, boss.x - C.bossEntrySpeed * Math.max(0, dt));
    },
    update(dt, shots) {
      if (disposed || stopped) return;
      if (!api.bossAlive()) { stopped = true; phase = 'stopped'; clearTargets('cancelled'); return; }
      elapsed += Math.max(0, dt);
      boss.oldX = boss.x; boss.oldY = boss.y; boss.x = targetX;
      if (elapsed >= C.duration) { clearTargets('expired'); phase = 'expired'; stopped = true; return; }
      phase = elapsed < C.throwAt ? 'gather' : elapsed < C.giantAt ? 'throw' : 'giant';
      const gathered = C.spirits.filter((_, index) => elapsed >= index * C.gatherStagger + C.gatherTime).length;
      if (gathered > absorbed) { absorbed = gathered; api.sfx('wing', { volume: 0.32 }); }
      if (!powered && absorbed === C.spirits.length) { powered = true; api.sfx('power', { volume: 0.55 }); }
      if (elapsed < C.giantAt) {
        while (nextThrow < C.throwCount && elapsed >= C.throwAt + nextThrow * C.throwEvery) {
          const index = nextThrow++, born = C.throwAt + index * C.throwEvery;
          if (elapsed < born + C.throwLife) targets.push(spawnTarget(C.spirits[index % C.spirits.length], born, index));
        }
      } else if (!giantSpawned) {
        clearTargets('expired'); giantSpawned = true;
        targets.push(spawnTarget('jeomnye', C.giantAt, 0));
        api.sfx('great_shine', { volume: 0.45 });
      }
      for (const target of targets) {
        if (elapsed >= target.expiresAt) { finishTarget(target, 'expired'); continue; }
        target.oldX = target.x; target.oldY = target.y; target.age = elapsed - target.born;
        target.flash = Math.max(0, target.flash - dt);
        const flight = Math.max(0, target.age - target.warn);
        target.x = target.startX + target.vx * flight; target.y = target.startY + target.vy * flight;
        if (!target.launched && target.age >= target.warn) {
          target.launched = true; api.sfx(target.kind === 'jeomnye' ? 'heavyswing' : 'wing', { volume: 0.42 });
        }
        for (const shot of shots) {
          if (shot.dead || target.outcome || !touches(shot, target) || !api.hitTarget(shot, target.id)) continue;
          target.hp = Math.max(0, target.hp - (shot.charged ? C.chargedDamage : 1)); target.flash = 0.12;
          api.hit(target.x, target.y); api.sfx('pop', { volume: 0.384, rate: 0.8 });
          if (target.hp === 0) finishTarget(target, 'destroyed');
        }
        if (target.outcome) continue;
        if (target.launched && touches(target, api.soul)) {
          finishTarget(target, 'contact'); api.hurt();
          if (disposed || stopped) return;
        } else if (target.x + target.r < api.box.x || target.y + target.r < api.box.y || target.y - target.r > api.box.y + api.box.h) finishTarget(target, 'escaped');
      }
      targets = targets.filter(target => !target.outcome);
      for (const shot of shots) {
        if (shot.dead || !touches(shot, boss)) continue;
        api.bossContact(shot, boss);
        if (!api.bossAlive()) { stopped = true; phase = 'stopped'; clearTargets('cancelled'); return; }
      }
    },
    draw(ctx) {
      if (disposed || stopped) return;
      for (const target of targets) {
        if (!target.launched) {
          ctx.save(); ctx.strokeStyle = '#ff87bf'; ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
          ctx.beginPath(); ctx.moveTo(target.x, target.y); ctx.lineTo(target.aim.x, target.aim.y); ctx.stroke(); ctx.restore();
        }
        const appear = clamp(target.age / target.warn, 0, 1);
        drawSpirit(ctx, api.images[target.kind], { x: target.x, y: target.y,
          size: target.size * (0.25 + 0.75 * appear), angle: target.kind === 'jeomnye' ? 0 : Math.max(0, target.age - target.warn) * 7 },
        target.flash > 0 ? 0.55 : 1);
        if (target.kind === 'jeomnye') {
          ctx.fillStyle = '#3d2030'; ctx.fillRect(Math.round(target.x - 25), Math.round(target.y + 44), 50, 4);
          ctx.fillStyle = target.flash > 0 ? '#fff' : '#ff9ccd';
          ctx.fillRect(Math.round(target.x - 25), Math.round(target.y + 44), Math.round(50 * target.hp / target.maxHp), 4);
        }
      }
      if (api.images.boss) {
        const frame = Math.floor(elapsed * 3.6) % 4;
        ctx.drawImage(api.images.boss, frame % 2 * 160, Math.floor(frame / 2) * 160, 160, 160,
          Math.round(boss.x - C.bossSize / 2), Math.round(boss.y - C.bossSize / 2), C.bossSize, C.bossSize);
      }
      for (const spirit of spirits()) {
        spirit.trail.forEach((pose, index) => drawSpirit(ctx, api.images[spirit.kind], pose, 0.08 + index / C.trailCount * 0.25));
        drawSpirit(ctx, api.images[spirit.kind], spirit, 0.9);
      }
      if (powered && elapsed < C.throwAt) {
        const progress = clamp((elapsed - (C.spirits.length - 1) * C.gatherStagger - C.gatherTime) / 0.55, 0, 1);
        ctx.save(); ctx.globalAlpha = 1 - progress; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(boss.x, boss.y, 14 + progress * 37, 12 + progress * 28, 0, 0, TAU); ctx.stroke(); ctx.restore();
      }
    },
    dispose() { if (disposed) return; clearTargets('cancelled'); disposed = true; phase = 'disposed'; },
  };
}
