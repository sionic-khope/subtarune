import { CHAR_SCALE, SCREEN_H, SCREEN_W } from '../world/world.js';

const drawRays = (ctx, scene, alpha) => {
  const { rayBlur, rayCount, surfaceY } = scene.config.underwater;
  const colors = scene.config.colors;
  const sourceDrift = Math.sin(scene.time * 0.16) * 10;
  const sourceX = SCREEN_W / 2 + sourceDrift;
  const glow = ctx.createRadialGradient(sourceX, surfaceY - 18, 4, sourceX, surfaceY - 8, 190);
  glow.addColorStop(0, colors.glowCore);
  glow.addColorStop(0.42, colors.glowMid);
  glow.addColorStop(1, colors.glowClear);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.restore();

  const fade = ctx.createLinearGradient(0, surfaceY, 0, SCREEN_H);
  fade.addColorStop(0, colors.ray);
  fade.addColorStop(0.55, colors.rayFaint);
  fade.addColorStop(1, colors.rayClear);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = 'screen';
  ctx.filter = `blur(${rayBlur}px)`;
  ctx.fillStyle = fade;
  for (let index = 0; index < rayCount; index++) {
    const offset = index - (rayCount - 1) / 2;
    const sway = Math.sin(scene.time * 0.2 + index * 0.9) * 5;
    const topX = sourceX + offset * 31 + sway;
    const width = 10 + index % 3 * 5;
    const spread = 22 + Math.abs(offset) * 5;
    ctx.globalAlpha = alpha * (0.26 + index % 2 * 0.06);
    ctx.beginPath();
    ctx.moveTo(Math.round(topX - width / 2), surfaceY - 2);
    ctx.lineTo(Math.round(topX + width / 2), surfaceY - 2);
    ctx.lineTo(Math.round(topX + spread + sway), SCREEN_H);
    ctx.lineTo(Math.round(topX - spread + sway), SCREEN_H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

const drawBubbles = (ctx, scene, alpha) => {
  ctx.save();
  ctx.fillStyle = scene.config.colors.bubble;
  for (const bubble of scene.bubbles) {
    const x = Math.round(bubble.x + Math.sin(scene.time * 0.75 + bubble.phase) * 4);
    const y = Math.round(bubble.y);
    ctx.globalAlpha = alpha * (0.28 + bubble.size * 0.12);
    ctx.fillRect(x, y, bubble.size, bubble.size);
    if (bubble.size > 1) ctx.fillRect(x + 1, y - 1, 1, 1);
  }
  ctx.restore();
};

const drawYoplait = (ctx, scene, alpha) => {
  const sprite = scene.yoplait;
  const image = sprite.down?.[0];
  if (!image) return;
  const water = scene.config.underwater;
  const width = Math.round(sprite.fw / sprite.px * CHAR_SCALE * water.actorScale);
  const height = Math.round(sprite.fh / sprite.px * CHAR_SCALE * water.actorScale);
  const x = Math.round(SCREEN_W / 2 + Math.sin(scene.time * water.driftRate) * water.driftX);
  const y = Math.round(water.yoplaitStartY + scene.sinkDepth + Math.sin(scene.time * 0.19) * water.actorBob);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(water.actorTilt + Math.sin(scene.time * water.actorRockRate) * water.actorRock);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, -Math.round(width / 2), -Math.round(height / 2), width, height);
  ctx.restore();
};

/** Draw the continuous underwater field, softened sunlight, bubbles, and sinking actor. */
export const drawShipMemoryUnderwater = (ctx, scene, alpha = 1) => {
  const colors = scene.config.colors;
  const surfaceY = scene.config.underwater.surfaceY;
  const depth = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
  depth.addColorStop(0, colors.surface);
  depth.addColorStop(0.16, colors.upper);
  depth.addColorStop(0.46, colors.middle);
  depth.addColorStop(0.76, colors.deep);
  depth.addColorStop(1, colors.abyss);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = depth;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.fillStyle = colors.foam;
  ctx.globalAlpha *= 0.72;
  ctx.fillRect(0, surfaceY - 3, SCREEN_W, 3);
  for (let x = -12; x < SCREEN_W + 12; x += 24) {
    const lift = Math.round(Math.sin(scene.time * 0.7 + x * 0.07) * 2);
    ctx.fillRect(x, surfaceY + lift, 13, 1);
  }
  ctx.restore();
  drawRays(ctx, scene, alpha);
  drawBubbles(ctx, scene, alpha);
  drawYoplait(ctx, scene, alpha);
};
