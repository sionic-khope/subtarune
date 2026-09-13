const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => value * value * (3 - 2 * value);

function anchor(game, id) {
  const entity = id === 'player' ? game.player : game.entities.find(item => item.id === id);
  return { x: entity.x + entity.w / 2, y: entity.y + entity.h - 30 };
}

function cloudLobe(ctx, x, y, radius) {
  const r = Math.max(4, Math.round(radius / 2) * 2);
  for (let row = -r; row < r; row += 2) {
    const latitude = (row + 1) / r;
    const halfWidth = Math.max(2, Math.round(Math.sqrt(1 - latitude * latitude) * r / 2) * 2);
    ctx.fillRect(Math.round((x - halfWidth) / 2) * 2, Math.round((y + row) / 2) * 2, halfWidth * 2, 2);
  }
}

/** Pixel-cloud waiter; optional aura:{at,colors} stays attached across modes until explicitly cleared. */
export function darkSmokeWaiter(game, definition) {
  if (!definition) { game.darkSmoke = null; return { update: () => true }; }
  const source = definition.from ? anchor(game, definition.from) : { x: 0, y: 0 };
  const target = definition.to ? anchor(game, definition.to) : source;
  const aura = definition.aura === null ? null : definition.aura ? {
    ...definition.aura,
    actor: definition.aura.at === 'player' ? game.player : game.entities.find(entity => entity.id === definition.aura.at),
    started: game.time,
  } : game.darkSmoke?.aura;
  const smoke = {
    ...definition, source, target, aura, elapsed: 0, started: game.time,
    duration: definition.duration ?? 2, previousVeil: game.darkSmoke?.veil ?? 0,
    veil: game.darkSmoke?.veil ?? 0,
    clouds: Array.from({ length: definition.mode === 'veil' ? 0 : 64 }, (_, index) => ({
      angle: index * 2.399963, phase: (index * 0.618034) % 1,
      radius: 0.25 + ((index * 37) % 61) / 80,
      size: 10 + (index * 7) % 19,
    })),
  };
  game.darkSmoke = smoke;
  return { update(dt) {
    if (game.darkSmoke !== smoke) return true;
    smoke.elapsed = Math.min(smoke.duration, smoke.elapsed + dt);
    const progress = smooth(clamp(smoke.elapsed / smoke.duration));
    smoke.veil = smoke.previousVeil + ((definition.veil ?? smoke.previousVeil) - smoke.previousVeil) * progress;
    return smoke.elapsed >= smoke.duration;
  } };
}

/** Draw above world actors, beneath dialogue. Time comes from the game's existing clock. */
export function drawDarkSmoke(ctx, game, cam) {
  const smoke = game.darkSmoke;
  if (!smoke) return;
  const progress = smooth(clamp(smoke.elapsed / smoke.duration));
  const age = game.time - smoke.started;
  ctx.save();
  ctx.fillStyle = '#030207';
  ctx.globalAlpha = smoke.veil;
  ctx.fillRect(-960, -720, 2400, 1800);
  // Color blending preserves the planks' luminance and grain while the veil darkens the room.
  ctx.globalCompositeOperation = 'color';
  ctx.globalAlpha = clamp(smoke.veil / 0.4) * 0.85;
  ctx.fillStyle = '#66349a';
  ctx.fillRect(-960, -720, 2400, 1800);
  ctx.globalCompositeOperation = 'source-over';
  for (const cloud of smoke.clouds) {
    const angle = cloud.angle + age * 0.5;
    let x, y, size = cloud.size, alpha = 0.65;
    switch (smoke.mode) {
      case 'swell': {
        const radius = (25 + progress * 370) * cloud.radius;
        x = smoke.source.x + Math.cos(angle) * radius;
        y = smoke.source.y + Math.sin(angle) * radius * 0.72 - progress * 24;
        size *= 0.4 + progress * 1.1;
        alpha *= clamp(progress * 3);
        break;
      }
      case 'gather': {
        const radius = (1 - progress) * 340 * cloud.radius + 12;
        x = smoke.target.x + Math.cos(angle + progress * 3) * radius;
        y = smoke.target.y + Math.sin(angle + progress * 3) * radius * 0.7;
        size *= 0.7 + progress * 0.45;
        break;
      }
      case 'transfer': {
        const travel = smooth(clamp((progress - cloud.phase * 0.28) / 0.72));
        const orbit = Math.sin(travel * Math.PI) * (14 + cloud.radius * 36);
        x = smoke.source.x + (smoke.target.x - smoke.source.x) * travel + Math.cos(angle * 2) * orbit;
        y = smoke.source.y + (smoke.target.y - smoke.source.y) * travel - Math.sin(travel * Math.PI) * 55 + Math.sin(angle * 2) * orbit * 0.5;
        size *= 0.45 + Math.sin(Math.PI * travel) * 0.6;
        alpha *= 0.7 + Math.sin(Math.PI * travel) * 0.3;
        break;
      }
      case 'cloak': {
        const radius = (10 + cloud.radius * 25) * (0.3 + progress * 0.7);
        x = smoke.source.x + Math.cos(angle * 1.6) * radius;
        y = smoke.source.y + Math.sin(angle * 1.6) * radius * 1.3;
        size *= 0.35 + progress * 0.8;
        alpha *= progress;
        break;
      }
      default: continue;
    }
    const px = Math.round((x - cam.x) / 2) * 2;
    const py = Math.round((y - cam.y) / 2) * 2;
    const radius = Math.max(5, size * 0.44);
    const drift = angle + Math.sin(age * 0.65 + cloud.phase * 7) * 0.7;
    ctx.globalAlpha = alpha * 0.48;
    ctx.fillStyle = '#211c28';
    for (let tail = 4; tail > 0; tail--) {
      const turn = drift - tail * 0.45;
      cloudLobe(ctx, px - Math.cos(turn) * radius * tail * 0.65, py - Math.sin(turn) * radius * tail * 0.5, Math.max(3, radius * (0.65 - tail * 0.1)));
    }
    ctx.globalAlpha = alpha * 0.72;
    ctx.fillStyle = cloud.phase > 0.72 ? '#15121a' : '#09070d';
    cloudLobe(ctx, px - radius * 0.65, py + Math.sin(drift) * radius * 0.4, radius * 0.78);
    cloudLobe(ctx, px + radius * 0.55, py - radius * 0.5, radius * 0.9);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#000';
    cloudLobe(ctx, px, py + radius * 0.15, radius);
  }
  if (smoke.aura?.actor && !smoke.aura.actor.dead) {
    const { actor, colors, started } = smoke.aura;
    const auraAge = game.time - started;
    const strength = smooth(clamp(auraAge / 2.4));
    const scale = Math.sqrt(actor.def?.visualScale || 1);
    const cx = actor.x + actor.w / 2 - cam.x;
    const cy = actor.y + actor.h - 28 * scale - cam.y;
    for (let index = 0; index < 28; index++) {
      const phase = (index / 28 + auraAge * 0.12) % 1;
      const angle = phase * Math.PI * 2;
      const radius = (30 + Math.sin(auraAge * 2 + index) * 4) * scale;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius * 1.25;
      ctx.globalAlpha = strength * (0.35 + (index % 3) * 0.16);
      ctx.fillStyle = colors[index % colors.length];
      cloudLobe(ctx, x, y, 5 + (index % 3) * 2);
    }
  }
  ctx.restore();
}
