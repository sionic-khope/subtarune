function openingRect(door, inset) {
  const scale = door.scale ?? door.def.scale ?? 1;
  return [(door.drawX ?? door.x) + inset[0] * scale, (door.drawY ?? door.y) + inset[1] * scale,
    inset[2] * scale, inset[3] * scale];
}

// Upward cinematic entry only: the collision box stays on the safe approach tile.
export function doorTransitWaiter(game, actor, door, options) {
  if (!actor || !door) return { update: () => true };
  const { inset, duration = 0.85, openDuration = 0.18, closeAfter = false } = options;
  const [x, y, w, h] = openingRect(door, inset);
  const opening = door.doorOpening ||= { inset, progress: 0 };
  const openTime = (1 - opening.progress) * openDuration;
  const distance = actor.y + actor.h - y + 2;
  let elapsed = 0, sounded = false;
  actor.facing = 'up';
  actor.doorTransit = { offsetY: 0, clip: [x, y, w, distance] };
  return { update(dt) {
    elapsed += dt;
    opening.progress = Math.min(1, opening.progress + dt / openDuration);
    const progress = Math.max(0, Math.min(1, (elapsed - openTime) / duration));
    actor.driven = true;
    actor.moving = progress > 0 && progress < 1;
    actor.animate?.(dt, 8);
    if (actor.doorTransit) actor.doorTransit.offsetY = -distance * progress;
    if (!sounded && actor.y + actor.h - distance * progress <= y + h) {
      sounded = true; game.sound.sfx('door');
    }
    if (progress < 1) return false;
    actor.visible = false; actor.moving = false; actor.frame = 0; actor.doorTransit = null;
    if (closeAfter) {
      opening.progress = Math.max(0, 1 - (elapsed - openTime - duration) / openDuration);
      if (opening.progress > 0) return false;
      door.doorOpening = null;
    }
    return true;
  } };
}

export function drawDoorOpening(ctx, door, cam) {
  if (!door.doorOpening || !door.image) return;
  const { inset, progress } = door.doorOpening;
  const [x, y, w, h] = openingRect(door, inset);
  const dx = Math.round(x - cam.x), dy = Math.round(y - cam.y);
  ctx.save();
  ctx.beginPath(); ctx.rect(dx, dy, w, h); ctx.clip();
  ctx.fillStyle = '#000'; ctx.fillRect(dx, dy, w, h);
  ctx.drawImage(door.image, ...inset, dx - Math.round(w * progress), dy, w, h);
  ctx.restore();
}
