const OPEN_SHIFT = 112;

export function shipHatchWaiter(game, hatch, actor, duration = 1.2) {
  let time = 0;
  if (actor) {
    actor.facing = 'down';
    actor.doorTransit = { offsetY: 0, clip: [hatch.x + 12, hatch.y - 192, 104, 282] };
    game.sound.sfx('iron_step_1');
  } else {
    hatch.hatchProgress = 0;
    game.sound.sfx('scrape', { volume: 0.6 });
  }
  return { update(dt) {
    time = Math.min(duration, time + dt);
    const progress = time / duration;
    if (actor) {
      actor.driven = true;
      actor.moving = true;
      actor.animate?.(dt, 5);
      actor.doorTransit.offsetY = 112 * progress;
    } else hatch.hatchProgress = progress * progress * (3 - 2 * progress);
    if (progress < 1) return false;
    if (actor) {
      actor.visible = false; actor.moving = false; actor.frame = 0;
      actor.doorTransit = null;
    } else {
      game.setFlag(hatch.def.shipHatch);
      game.sound.sfx('locker');
    }
    return true;
  } };
}

export function drawShipHatch(ctx, hatch, cam) {
  const progress = hatch.hatchProgress ?? (hatch.game.flags[hatch.def.shipHatch] ? 1 : 0);
  const x = Math.round(hatch.drawX - cam.x), y = Math.round(hatch.drawY - cam.y);
  if (progress > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + 38, y + 6); ctx.lineTo(x + 90, y + 6);
    ctx.lineTo(x + 122, y + 38); ctx.lineTo(x + 122, y + 90);
    ctx.lineTo(x + 90, y + 122); ctx.lineTo(x + 38, y + 122);
    ctx.lineTo(x + 6, y + 90); ctx.lineTo(x + 6, y + 38); ctx.closePath();
    ctx.fillStyle = '#708498'; ctx.fill(); ctx.clip();
    ctx.fillStyle = '#172330'; ctx.fillRect(x + 12, y + 12, 104, 104);
    ctx.fillStyle = '#05080d'; ctx.fillRect(x + 18, y + 18, 92, 88);
    ctx.fillStyle = '#53677a';
    for (let rung = 0; rung < 4; rung++) ctx.fillRect(x + 50, y + 70 + rung * 10, 28, 3);
    ctx.restore();
    const shift = Math.round(OPEN_SHIFT * progress);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 18, y - shift + 106, 92, 10);
  }
  ctx.drawImage(hatch.image, x, y - Math.round(OPEN_SHIFT * progress), 128, 128);
}
