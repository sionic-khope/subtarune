import { BaronSeaChase } from './baron-sea-chase.js';
import { MaillardArrival } from './maillard-arrival.js';
import { SCREEN_W, SCREEN_H, CHAR_SCALE } from '../world/world.js';
import { FONT } from '../ui/font.js';

const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const k = clamp(value); return k * k * (3 - 2 * k); };
const ratio = image => image ? image.height / image.width : 0.64;
const rectAt = (cx, cy, width, image) => ({
  x: Math.round(cx - width / 2),
  y: Math.round(cy - width * ratio(image) / 2),
  width: Math.round(width),
  height: Math.round(width * ratio(image)),
});

/** Project castle and connected ships through one scale for rendering and QA. */
export const shipCastleGeometry = scene => {
  const { config, beat, elapsed, images } = scene;
  const wide = ['castle_reveal', 'castle_attack', 'retreat', 'final_hold'].includes(beat);
  const hopPhase = ['castle_attack', 'retreat'].includes(beat) ? (elapsed % 0.86) / 0.86 : 1;
  const hop = hopPhase >= 0.46
    ? Math.round(Math.sin((hopPhase - 0.46) / 0.54 * Math.PI) * 12)
    : 0;
  if (!wide) {
    const maillard = rectAt(94, 232, config.ocean.maillardWidth, images.maillard);
    const warship = rectAt(325, 122, config.ocean.warshipWidth, images.warship);
    return { wide, scale: 1, castle: null, maillard, warship, hop, retreat: 0 };
  }
  const scale = config.ocean.castleProjectionWidth / config.ocean.castleWidth;
  const reveal = beat === 'castle_reveal' ? smooth(elapsed / config.timing.castleReveal) : 1;
  const scaleIn = scale * (1.45 - reveal * 0.45);
  const retreat = beat === 'retreat'
    ? smooth(elapsed / config.timing.retreat) * 58
    : beat === 'final_hold' ? 58 : 0;
  const centerX = 242;
  const castleWidth = config.ocean.castleWidth * scaleIn;
  const castle = rectAt(centerX + 8, 190, castleWidth, images.castle);
  const warship = rectAt(centerX - 700 * scaleIn - retreat, 88 - hop, config.ocean.warshipWidth * scaleIn, images.warship);
  const maillard = rectAt(centerX - 1120 * scaleIn - retreat, 124 - hop, config.ocean.maillardWidth * scaleIn, images.maillard);
  return { wide, scale: scaleIn, castle, maillard, warship, hop, retreat };
};

const bridge = geometry => {
  const start = [geometry.warship.x + geometry.warship.width * 0.24, geometry.warship.y + geometry.warship.height * 0.82];
  const end = [geometry.maillard.x + geometry.maillard.width * 0.9, geometry.maillard.y + geometry.maillard.height * 0.62];
  return { start, end };
};

const drawBridge = (ctx, geometry, width) => {
  const { start, end } = bridge(geometry);
  const dx = end[0] - start[0], dy = end[1] - start[1], length = Math.hypot(dx, dy);
  ctx.save();
  ctx.translate(Math.round(start[0]), Math.round(start[1]));
  ctx.rotate(Math.atan2(dy, dx));
  ctx.fillStyle = '#202b37'; ctx.fillRect(0, -width / 2, Math.round(length), width);
  ctx.fillStyle = '#96a1aa'; ctx.fillRect(0, -width / 2 + 2, Math.round(length), Math.max(1, width - 4));
  ctx.fillStyle = '#d2bd80';
  for (let x = 0; x < length; x += Math.max(3, width / 2)) ctx.fillRect(Math.round(x), -width / 2 + 1, 1, Math.max(1, width - 2));
  ctx.restore();
};

const drawShip = (ctx, scene, image, rect, flip = false) => {
  MaillardArrival.prototype.drawWake.call(scene, ctx, rect);
  if (image) {
    ctx.save();
    if (flip) { ctx.translate(rect.x + rect.width, rect.y); ctx.scale(-1, 1); ctx.drawImage(image, 0, 0, rect.width, rect.height); }
    else ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  }
  MaillardArrival.prototype.drawWaterline.call(scene, ctx, rect);
};

const drawOceanShips = (ctx, scene, geometry) => {
  drawShip(ctx, scene, scene.images.warship, geometry.warship, true);
  drawShip(ctx, scene, scene.images.maillard, geometry.maillard);
  drawBridge(ctx, geometry, Math.max(2, Math.round(scene.config.ocean.bridgeWidth * geometry.scale)));
};

const drawCharacter = (ctx, sprite, x, bottom, direction, scale, rotation = 0) => {
  const image = sprite[direction]?.[0] || sprite.down[0];
  const width = Math.round(sprite.fw / sprite.px * CHAR_SCALE * scale);
  const height = Math.round(sprite.fh / sprite.px * CHAR_SCALE * scale);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(bottom - height / 2));
  ctx.rotate(rotation);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
};

const drawCord = (ctx, scene, from, to) => {
  const image = scene.images.cord;
  const dx = to[0] - from[0], dy = to[1] - from[1], length = Math.hypot(dx, dy);
  ctx.save();
  ctx.translate(from[0], from[1]); ctx.rotate(Math.atan2(dy, dx));
  if (image) ctx.drawImage(image, 0, -6, length, 12);
  else { ctx.strokeStyle = '#bd62ff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(length, 0); ctx.stroke(); }
  ctx.restore();
};

const drawSky = (ctx, scene) => {
  ctx.fillStyle = '#15102c'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  for (let i = 0; i < 34; i++) {
    const y = ((i * 47 + scene.scroll * (0.4 + i % 4 * 0.2)) % 430) - 35;
    ctx.fillStyle = i % 3 ? '#352460' : '#6f4f91';
    ctx.fillRect((i * 83) % 520 - 20, Math.round(y), 26 + i % 5 * 9, 3);
  }
};

const drawAura = (ctx, x, y, colors, time, radius = 38) => {
  ctx.save();
  for (let i = 0; i < 20; i++) {
    const angle = i * 2.4 + time * (i % 2 ? 1 : -1);
    const length = radius * (0.5 + ((i * 17) % 10) / 10);
    ctx.globalAlpha = 0.45 + i % 3 * 0.12;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(Math.round(x + Math.cos(angle) * length), Math.round(y + Math.sin(angle) * length), 3 + i % 3, 3 + i % 2);
  }
  ctx.restore();
};

const drawVortex = (ctx, scene, x, y) => {
  const gather = scene.beat === 'vortex_gather'
    ? smooth(scene.elapsed / scene.config.timing.vortexGather)
    : scene.beat === 'vortex_burst' ? 1 : 0;
  if (!gather) return;
  const burst = scene.beat === 'vortex_burst'
    ? smooth(scene.elapsed / scene.config.timing.vortexBurst) : 0;
  ctx.save();
  for (let arm = 0; arm < 5; arm++) {
    for (let step = 0; step < 34; step++) {
      const progress = step / 33;
      const angle = scene.time * (2.8 + gather * 3.4) + arm * Math.PI * 0.4 + progress * Math.PI * 4.5;
      const radius = progress * (42 + gather * 108 + burst * 90);
      const width = Math.max(2, Math.round((1 - progress * 0.55) * (3 + gather * 5)));
      ctx.globalAlpha = (0.18 + gather * 0.66) * (1 - progress * 0.52) * (1 - burst * 0.45);
      ctx.fillStyle = step % 4 ? '#8d32bd' : '#e0a1ff';
      ctx.fillRect(Math.round(x + Math.cos(angle) * radius), Math.round(y + Math.sin(angle) * radius * 0.72), width, width);
    }
  }
  if (burst > 0) {
    for (let index = 0; index < 34; index++) {
      const angle = index * Math.PI * 2 / 34;
      const inner = 30 + burst * 35, outer = 45 + burst * 190;
      ctx.globalAlpha = 1 - burst * 0.72;
      ctx.strokeStyle = index % 2 ? '#c657ff' : '#f3d3ff';
      ctx.lineWidth = 2 + index % 3;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
      ctx.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
      ctx.stroke();
    }
  }
  ctx.restore();
};

const drawSkyActors = (ctx, scene) => {
  const burst = scene.beat === 'vortex_burst' ? smooth(scene.elapsed / scene.config.timing.vortexBurst) : 0;
  const tug = burst ? 0 : Math.sin(scene.time * 5.4) * 9;
  const gx = 195 + tug, gy = 213 + Math.abs(tug) * 0.08;
  const yx = 302 - tug + burst * 210, yy = 215 + Math.abs(tug) * 0.08 - Math.sin(burst * Math.PI) * 115;
  const actorScale = scene.config.sky.actorScale;
  const gajaemanScale = actorScale * scene.config.sky.gajaemanCanonicalScale;
  const [gajaemanGripX, gajaemanGripY] = scene.config.sky.gajaemanGrip;
  const [yoplaitGripX, yoplaitGripY] = scene.config.sky.yoplaitGrip;
  const gajaemanGrip = [gx + gajaemanGripX, gy + gajaemanGripY];
  const yoplaitGrip = [yx + yoplaitGripX, yy + yoplaitGripY];
  drawVortex(ctx, scene, gx, gy - 25);
  drawAura(ctx, gx, gy - 25, ['#1b071f', '#6f258d', '#d677ff'], scene.time, scene.beat === 'vortex_gather' ? 48 + smooth(scene.elapsed / scene.config.timing.vortexGather) * 72 : 42);
  if (['sky_opposite_aura', 'vortex_gather', 'vortex_burst'].includes(scene.beat)) drawAura(ctx, yx, yy - 25, ['#ffe35d', '#63e8ff', '#ffffff'], -scene.time, 45);
  drawCharacter(ctx, scene.actors.gajaeman, gx, gy, 'right', gajaemanScale, burst ? 0 : tug * 0.006);
  drawCharacter(ctx, scene.actors.yoplait, yx, yy, 'left', actorScale, burst * Math.PI * 4 - (burst ? 0 : tug * 0.006));
  drawCord(ctx, scene, gajaemanGrip, burst ? [gajaemanGrip[0] + 34, gajaemanGrip[1] + 3] : yoplaitGrip);
};

const drawCastle = (ctx, scene, geometry) => {
  const rect = geometry.castle;
  const reveal = scene.beat === 'castle_reveal'
    ? smooth(scene.elapsed / scene.config.timing.castleReveal) : 1;
  ctx.fillStyle = `rgba(5,1,13,${0.12 + reveal * 0.58})`;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.save();
  ctx.globalAlpha = scene.beat === 'castle_reveal' ? clamp((reveal - 0.08) / 0.72) : 1;
  if (scene.images.castle) ctx.drawImage(scene.images.castle, rect.x, rect.y, rect.width, rect.height);
  else {
    ctx.fillStyle = '#12051e'; ctx.fillRect(rect.x + rect.width * 0.18, rect.y + rect.height * 0.16, rect.width * 0.64, rect.height * 0.84);
    ctx.fillStyle = '#2d0b48'; ctx.fillRect(rect.x + rect.width * 0.08, rect.y + rect.height * 0.43, rect.width * 0.84, rect.height * 0.57);
  }
  ctx.restore();
  if (scene.beat === 'castle_reveal') {
    const pointX = rect.x + rect.width * 0.5;
    const pointY = Math.max(22, rect.y + rect.height * 0.06);
    drawAura(ctx, pointX, pointY, ['#06020a', '#57136f', '#d278ff'], scene.time, 16 + reveal * 82);
    ctx.fillStyle = '#020104'; ctx.fillRect(Math.round(pointX - 2), Math.round(pointY - 4), 5, 8);
    ctx.save();
    ctx.globalAlpha = 1 - reveal;
    ctx.fillStyle = '#b84aff';
    for (let index = 0; index < 28; index++) {
      const spread = 18 + reveal * 190 + index % 5 * 8;
      const angle = index * 2.21 + scene.time * 2;
      ctx.fillRect(Math.round(pointX + Math.cos(angle) * spread), Math.round(pointY + Math.sin(angle) * spread * 0.65), 3, 9);
    }
    ctx.restore();
  }
};

const drawBeams = (ctx, scene, geometry) => {
  const phase = (scene.elapsed % 0.86) / 0.86;
  const origin = [geometry.castle.x + geometry.castle.width * 0.42, geometry.castle.y + geometry.castle.height * 0.28];
  const target = [geometry.warship.x + geometry.warship.width * 0.38, geometry.warship.y + geometry.warship.height + 13 + scene.beamIndex % 2 * 8];
  ctx.save();
  const firing = phase >= 0.36 && phase <= 0.58;
  ctx.globalAlpha = firing ? 1 - (phase - 0.36) / 0.22 : 0.25 + Math.min(1, phase / 0.36) * 0.75;
  if (firing) {
    ctx.strokeStyle = '#bf63ff'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(origin[0], origin[1]); ctx.lineTo(target[0], target[1]); ctx.stroke();
  }
  ctx.fillStyle = '#f2d5ff'; ctx.beginPath(); ctx.arc(origin[0], origin[1], 5 + Math.min(phase, 0.36) / 0.36 * 9, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (scene.beat === 'castle_attack' && phase >= 0.42 && phase <= 0.82 && scene.elapsed < 1.15) {
    ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffe55e';
    ctx.fillText('!', geometry.maillard.x + geometry.maillard.width / 2, geometry.maillard.y - 10);
    ctx.fillText('!', geometry.warship.x + geometry.warship.width / 2, geometry.warship.y - 10);
    ctx.textAlign = 'left';
  }
};

const drawFall = (ctx, scene) => {
  const k = smooth(scene.elapsed / scene.config.timing.fall);
  const y = -25 + k * 347;
  drawCharacter(ctx, scene.actors.yoplait, 240, y, 'down', 2.5, k * Math.PI * 8);
  if (k > 0.72) {
    for (let i = 0; i < 28; i++) {
      const age = clamp((k - 0.72) / 0.28);
      const x = 240 + Math.cos(i * 2.3) * age * (24 + i % 6 * 7);
      const py = 324 - Math.sin(age * Math.PI) * (15 + i % 5 * 9);
      ctx.fillStyle = i % 2 ? '#d4ffff' : '#79cee4'; ctx.fillRect(Math.round(x), Math.round(py), 3, 6);
    }
  }
};

/** Draw the current full-frame ocean or sky beat without owning narrative timing. */
export const drawShipCastleOcean = (ctx, scene) => {
  if (['sky_tug', 'sky_opposite_aura', 'vortex_gather', 'vortex_burst'].includes(scene.beat)) {
    drawSky(ctx, scene); drawSkyActors(ctx, scene); return;
  }
  BaronSeaChase.prototype.drawOcean.call(scene, ctx);
  if (scene.beat === 'yoplait_fall') { drawFall(ctx, scene); return; }
  const geometry = shipCastleGeometry(scene);
  if (geometry.castle) drawCastle(ctx, scene, geometry);
  drawOceanShips(ctx, scene, geometry);
  if (scene.beat === 'ocean_rise') {
    const k = smooth(scene.elapsed / scene.config.timing.oceanRise);
    const { start, end } = bridge(geometry);
    const x = (start[0] + end[0]) / 2, y = (start[1] + end[1]) / 2 - k * 190;
    drawAura(ctx, x, y, ['#05030a', '#34123f'], scene.time, 8 + k * 14);
    ctx.fillStyle = '#030207'; ctx.fillRect(Math.round(x - 2), Math.round(y - 3), 5, 7);
  }
  if (scene.beat === 'castle_attack' || scene.beat === 'retreat') drawBeams(ctx, scene, geometry);
};
