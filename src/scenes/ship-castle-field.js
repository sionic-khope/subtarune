import { CHAR_SCALE } from '../world/world.js';

const actorPoint = (game, match, fallback) => {
  const actor = game.entities.find(entity => match(entity.id || ''));
  if (!actor) return fallback;
  const drawX = actor.drawX ?? actor.x;
  const drawY = actor.drawY ?? actor.y;
  const width = actor.iw ?? actor.w;
  const height = actor.ih ?? actor.h;
  return {
    x: Math.round(drawX + width / 2 - game.camera.x),
    y: Math.round(drawY - game.camera.y),
    bottom: Math.round(drawY + height - game.camera.y),
  };
};

const drawAura = (ctx, x, y, radius, time) => {
  ctx.save();
  for (let ring = 3; ring >= 0; ring--) {
    const pulse = Math.round(Math.sin(time * 7 + ring) * 2);
    ctx.globalAlpha = 0.09 + ring * 0.035;
    ctx.strokeStyle = ring % 2 ? '#fff27a' : '#ffd43b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius - ring * 6 + pulse, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
};

const drawSmoke = (ctx, x, y, time) => {
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const age = (time * 0.7 + i / 18) % 1;
    const angle = i * 2.399;
    const radius = 8 + age * 31;
    const size = Math.max(2, Math.round(8 * (1 - age)));
    ctx.globalAlpha = 0.72 * (1 - age);
    ctx.fillStyle = i % 3 ? '#080510' : '#3b174c';
    ctx.fillRect(Math.round(x + Math.cos(angle) * radius), Math.round(y + Math.sin(angle) * radius - age * 18), size, size);
  }
  ctx.restore();
};

const drawWindowLight = (ctx, point) => {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#c9dcff';
  ctx.beginPath();
  ctx.moveTo(point.x - 3, point.y + 8);
  ctx.lineTo(point.x - 145, point.bottom + 72);
  ctx.lineTo(point.x - 58, point.bottom + 72);
  ctx.lineTo(point.x + 3, point.bottom - 4);
  ctx.fill();
  ctx.restore();
};

const drawBrokenWindow = (ctx, point) => {
  ctx.fillStyle = '#050812';
  ctx.fillRect(Math.round(point.x - 27), Math.round(point.y + 2), 54, 138);
  ctx.fillStyle = '#51647d';
  ctx.fillRect(Math.round(point.x - 29), Math.round(point.y), 2, 142);
  ctx.fillRect(Math.round(point.x + 27), Math.round(point.y), 2, 142);
  ctx.fillStyle = '#a9bfd4';
  for (const offset of [-19, -7, 8, 21]) ctx.fillRect(Math.round(point.x + offset), Math.round(point.y + (offset * offset) % 17), 3, 2);
};

/** Draw the field-only light, cord, smoke and glass layer beneath normal dialogue. */
export const drawShipCastleField = (ctx, scene) => {
  const { game, config, beat, time, shards } = scene;
  const playerHeight = game.player?.sprite
    ? game.player.sprite.fh / game.player.sprite.px * CHAR_SCALE * (game.player.def?.visualScale || 1)
    : game.player?.h || 0;
  const player = game.player ? {
    x: Math.round(game.player.x + game.player.w / 2 - game.camera.x),
    y: Math.round(game.player.y + game.player.h - playerHeight - game.camera.y),
    bottom: Math.round(game.player.y + game.player.h - game.camera.y),
  } : { x: 240, y: 150, bottom: 205 };
  const window = actorPoint(game, id => id.includes('window'), { x: 452, y: 70, bottom: 204 });
  if (beat === 'field_window') drawBrokenWindow(ctx, window);
  else drawWindowLight(ctx, window);

  if (beat === 'field_float' || beat === 'field_walk') {
    const lift = beat === 'field_float' ? 6 + Math.round(Math.sin(time * 4) * 2) : 4;
    drawAura(ctx, player.x, player.y - lift + 12, config.field.auraRadius, time);
    const cord = scene.images.cord;
    if (cord) {
      const width = config.field.cordWidth;
      const height = Math.round(width * cord.height / cord.width);
      ctx.drawImage(cord, Math.round(player.x - width / 2), Math.round(player.y - lift - height - 5), width, height);
    }
  }

  if (beat === 'field_rush' || beat === 'field_window') {
    const gajaeman = actorPoint(game, id => id.includes('gajaeman'), { x: beat === 'field_rush' ? 24 : window.x, y: window.y, bottom: window.bottom });
    drawSmoke(ctx, gajaeman.x, Math.round((gajaeman.y + gajaeman.bottom) / 2), time);
  }

  if (beat === 'field_window') {
    for (const shard of shards) {
      ctx.save();
      ctx.translate(Math.round(window.x + shard.x), Math.round(window.y + shard.y));
      ctx.rotate(shard.spin);
      ctx.fillStyle = shard.tint;
      ctx.fillRect(-shard.size, -1, shard.size * 2, 2);
      ctx.restore();
    }
  }
};
