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

/** The pair climbs on its own; the camera then pushes the WHOLE ocean frame in around them.
    Their sprite scale barely changes — everything else swells and drifts down past the frame. */
export const shipCastleAscent = scene => {
  const { timing, ocean, sky } = scene.config;
  const rising = scene.beat === 'ocean_rise';
  const progress = rising ? smooth(clamp(scene.elapsed / timing.oceanRise)) : 1;
  const zoom = rising ? Math.pow(clamp((scene.pushTime || 0) / timing.oceanPush), 1.9) : 1;
  if (!rising) {
    return {
      progress, zoom,
      x: 242,
      bottom: ocean.skyBottom,
      scale: sky.actorScale,
      horizon: ocean.nearHorizon + 440,
      camera: 1,
      focusY: ocean.skyBottom - ocean.focusLift,
    };
  }
  const [riseX, riseY] = ocean.riseFrom;
  const bottom = riseY - progress * (riseY - ocean.riseTop);
  return {
    progress, zoom,
    x: riseX,
    bottom,
    scale: ocean.dotScale + progress * ocean.dotGrow,
    horizon: ocean.nearHorizon,
    camera: 1 + zoom * (ocean.cameraZoom - 1),
    focusY: bottom - ocean.focusLift,
  };
};

/** Camera transform applied to a whole full-frame beat: scale everything about one point. */
export const shipCastleCamera = scene => {
  if (scene.beat === 'yoplait_fall') {
    const { fallZoom: peak, flyTo } = scene.config.ocean;
    return {
      z: 1 + smooth(clamp(scene.elapsed / scene.config.timing.fall / 0.34)) * (peak - 1),
      x: flyTo[0] + 6,
      y: flyTo[1] + 56,
    };
  }
  if (scene.beat === 'ocean_rise') {
    const ascent = shipCastleAscent(scene);
    const { ocean, sky } = scene.config;
    return {
      z: ascent.camera,
      x: ascent.x,
      y: ascent.focusY,
      panX: (242 - ascent.x) * ascent.zoom,
      panY: (ocean.skyBottom - 5 - ascent.bottom) * ascent.zoom,
      ink: ascent.scale / sky.actorScale,
    };
  }
  return null;
};

/** Gather to a point, grow out of it slowly, swell and burst, then drop onto the water. */
export const castlePhase = (ocean, reveal) => {
  const { castleSeed, castleShrink, castleGrow, castleGatherAt, castleEmergeAt, castleDropAt, castleLandAt, castleHover } = ocean;
  if (reveal <= castleGatherAt) {
    return { gather: clamp(reveal / castleGatherAt), scale: castleSeed, lift: castleHover, drop: 0, landed: false };
  }
  if (reveal <= castleEmergeAt) {
    const grow = smooth((reveal - castleGatherAt) / (castleEmergeAt - castleGatherAt));
    return { gather: 1, scale: castleSeed + grow * (castleShrink - castleSeed), lift: castleHover, drop: 0, landed: false };
  }
  if (reveal <= castleDropAt) {
    return { gather: 1, scale: castleShrink, lift: castleHover, drop: 0, landed: false };
  }
  if (reveal <= castleLandAt) {
    const drop = clamp((reveal - castleDropAt) / (castleLandAt - castleDropAt));
    return { gather: 1, scale: castleShrink + (1 - castleShrink) * drop, lift: castleHover * (1 - drop * drop), drop, landed: false };
  }
  const settle = clamp((reveal - castleLandAt) / (1 - castleLandAt));
  return { gather: 1, scale: 1 + Math.sin(settle * Math.PI) * (castleGrow - 1), lift: 0, drop: 1, landed: true };
};

/** Project castle and connected ships through one scale for rendering and QA. */
export const shipCastleGeometry = scene => {
  const { config, beat, elapsed, images } = scene;
  const wide = ['castle_reveal', 'yoplait_fall', 'castle_attack', 'retreat', 'final_hold'].includes(beat);
  const recoil = scene.beamClock - config.ocean.beamCharge;
  const hop = ['castle_attack', 'retreat'].includes(beat) && recoil > 0 && recoil < 0.8
    ? Math.sin(recoil / 0.8 * Math.PI) * 5 : 0;
  if (!wide) {
    const ascent = shipCastleAscent(scene);
    const scale = config.ocean.nearScale;
    const maillard = rectAt(config.ocean.nearMaillard[0], config.ocean.nearMaillard[1], config.ocean.maillardWidth * scale, images.maillard);
    const warship = rectAt(config.ocean.nearWarship[0], config.ocean.nearWarship[1], config.ocean.warshipWidth * scale, images.warship);
    const projectY = value => ascent.focusY + (value - ascent.focusY) * ascent.camera;
    const screen = {
      zoom: ascent.camera,
      horizon: projectY(ascent.horizon),
      warshipBottom: projectY(warship.y + warship.height),
      maillardBottom: projectY(maillard.y + maillard.height),
      pairScale: ascent.scale * ascent.camera,
    };
    return { wide, scale, castle: null, maillard, warship, hop, retreat: 0, ascent, screen };
  }
  const scale = config.ocean.castleProjectionWidth / config.ocean.castleWidth;
  const reveal = beat === 'castle_reveal' ? clamp(elapsed / config.timing.castleReveal) : 1;
  const phase = castlePhase(config.ocean, reveal);
  const landedAt = config.timing.castleReveal * config.ocean.castleLandAt;
  const wave = beat === 'castle_reveal' ? clamp((elapsed - landedAt) / config.ocean.castleWaveSpan) : 1;
  const swell = wave > 0 && wave < 1 ? Math.sin(wave * Math.PI * 3.4) * 7 * (1 - wave) : 0;
  const retreat = beat === 'retreat'
    ? Math.pow(clamp(elapsed / config.timing.retreat), 1.7) * config.ocean.retreatDistance
    : beat === 'final_hold' ? config.ocean.retreatDistance : 0;
  const centerX = 240;
  const castleWidth = config.ocean.castleWidth * scale * phase.scale;
  const seedY = config.ocean.waterline - config.ocean.castleHover - config.ocean.castleSeedLift;
  const settledY = config.ocean.waterline - phase.lift - castleWidth * ratio(images.castle) / 2;
  const anchor = beat === 'castle_reveal' && reveal <= config.ocean.castleEmergeAt
    ? smooth(clamp((reveal - config.ocean.castleGatherAt) / (config.ocean.castleEmergeAt - config.ocean.castleGatherAt)))
    : 1;
  const castle = rectAt(centerX, seedY + (settledY - seedY) * anchor, castleWidth, images.castle);
  const warship = rectAt(centerX + 290 * scale - retreat, 212 - hop + swell, config.ocean.warshipWidth * scale, images.warship);
  const maillard = rectAt(centerX - 150 * scale - retreat, 220 - hop - swell, config.ocean.maillardWidth * scale, images.maillard);
  return { wide, scale, castle, maillard, warship, hop, retreat, pulse: phase.scale, phase, wave, reveal };
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
  ctx.fillStyle = '#b2e4ee';
  for (let i = 0; i < 7; i++) {
    const age = (scene.sailTime * 0.4 + i / 7) % 1;
    ctx.globalAlpha = (1 - age) * 0.55;
    ctx.fillRect(Math.round(rect.x + rect.width * (0.85 + age * 0.55)), Math.round(rect.y + rect.height * 0.91 + i % 2 * 3), Math.max(2, rect.width * 0.1), 1);
  }
  ctx.globalAlpha = 1;
  if (image) {
    ctx.save();
    if (flip) { ctx.translate(rect.x + rect.width, rect.y); ctx.scale(-1, 1); ctx.drawImage(image, 0, 0, rect.width, rect.height); }
    else ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  }
  ctx.fillStyle = '#a4dfe9';
  ctx.fillRect(Math.round(rect.x + rect.width * 0.2), Math.round(rect.y + rect.height * 0.92), Math.round(rect.width * 0.58), 1);
};

/** Hard wake and funnel smoke while the linked pair runs from the beams. */
const drawFleeWake = (ctx, scene, rect, strength) => {
  if (strength <= 0) return;
  ctx.save();
  for (let i = 0; i < 9; i++) {
    const age = (scene.sailTime * 1.5 + i / 9) % 1;
    ctx.globalAlpha = (1 - age) * 0.8 * strength;
    ctx.fillStyle = i % 3 ? '#ffffff' : '#bfe9f5';
    ctx.fillRect(Math.round(rect.x + rect.width + age * 64), Math.round(rect.y + rect.height * (0.62 + i % 4 * 0.12)), Math.round(12 + age * 26), 2);
  }
  for (let i = 0; i < 7; i++) {
    const age = (scene.sailTime * 0.9 + i / 7) % 1;
    ctx.globalAlpha = (1 - age) * 0.5 * strength;
    ctx.fillStyle = i % 2 ? '#5b6672' : '#8d98a4';
    const size = Math.max(1, Math.round(5 - age * 3));
    ctx.fillRect(Math.round(rect.x + rect.width * 0.62 + age * 30), Math.round(rect.y - 4 - age * 22), size, size);
  }
  ctx.restore();
};

const drawOceanShips = (ctx, scene, geometry) => {
  const fleeing = ['retreat', 'final_hold'].includes(scene.beat)
    ? (scene.beat === 'final_hold' ? 1 : clamp(scene.elapsed / scene.config.timing.retreat * 2)) : 0;
  drawFleeWake(ctx, scene, geometry.warship, fleeing);
  drawFleeWake(ctx, scene, geometry.maillard, fleeing);
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

const drawCord = (ctx, scene, from, to, unit = 1) => {
  const image = scene.images.cord;
  const dx = to[0] - from[0], dy = to[1] - from[1], length = Math.hypot(dx, dy);
  const thickness = Math.max(1, 12 * unit);
  ctx.save();
  ctx.translate(from[0], from[1]); ctx.rotate(Math.atan2(dy, dx));
  if (image) ctx.drawImage(image, 0, -thickness / 2, length, thickness);
  else { ctx.strokeStyle = '#bd62ff'; ctx.lineWidth = Math.max(1, 5 * unit); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(length, 0); ctx.stroke(); }
  ctx.restore();
};

const SKY_BEATS = ['sky_tug', 'sky_opposite_aura', 'vortex_gather', 'vortex_burst'];

/** Foreground clouds that sweep down past the camera while it climbs, bridging into the close-up. */
const drawRiseClouds = (ctx, scene, strength) => {
  if (strength <= 0) return;
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const y = ((i * 97 + scene.airTime * (96 + i % 3 * 42)) % 500) - 84;
    const x = (i * 179) % 580 - 82;
    ctx.globalAlpha = 0.66 * strength;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, Math.round(y), 88 + i % 3 * 34, 14);
    ctx.fillRect(x + 22, Math.round(y - 12), 46 + i % 3 * 20, 15);
  }
  ctx.fillStyle = '#eaf7ff';
  for (let i = 0; i < 12; i++) {
    const y = ((i * 61 + scene.airTime * 214) % 450) - 48;
    ctx.globalAlpha = 0.34 * strength;
    ctx.fillRect((i * 149) % 470, Math.round(y), 1, 12 + i % 3 * 7);
  }
  ctx.restore();
};

const drawSky = (ctx, scene) => {
  const sky = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
  sky.addColorStop(0, '#4f9fdc');
  sky.addColorStop(0.55, '#73bceb');
  sky.addColorStop(1, '#a6d9f3');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  for (let i = 0; i < 9; i++) {
    const y = ((i * 89 + scene.airTime * (20 + i % 3 * 13)) % 460) - 65;
    const x = (i * 137) % 550 - 60;
    ctx.fillStyle = i % 2 ? '#e8f7fc' : '#d3eef9';
    ctx.fillRect(x, Math.round(y), 62 + i % 3 * 22, 8);
    ctx.fillRect(x + 12, Math.round(y - 8), 31 + i % 3 * 13, 10);
  }
  if (!SKY_BEATS.includes(scene.beat)) return;
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const y = ((i * 71 + scene.airTime * (64 + i % 4 * 23)) % 480) - 72;
    const x = (i * 197) % 560 - 74;
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, Math.round(y), 76 + i % 3 * 28, 12);
    ctx.fillRect(x + 20, Math.round(y - 10), 40 + i % 3 * 17, 13);
  }
  ctx.fillStyle = '#eaf7ff';
  for (let i = 0; i < 16; i++) {
    const y = ((i * 53 + scene.airTime * 168) % 440) - 44;
    ctx.globalAlpha = 0.3;
    ctx.fillRect((i * 131) % 468, Math.round(y), 1, 9 + i % 3 * 6);
  }
  ctx.restore();
};

const drawSea = (ctx, scene, horizon) => {
  const top = Math.round(horizon);
  if (top >= SCREEN_H) return;
  ctx.save(); ctx.beginPath(); ctx.rect(0, top, SCREEN_W, SCREEN_H - top); ctx.clip();
  ctx.fillStyle = '#287ea6'; ctx.fillRect(0, top, SCREEN_W, SCREEN_H - top);
  ctx.fillStyle = '#b8e4ee'; ctx.fillRect(0, top, SCREEN_W, 3);
  for (let i = 0; i < 25; i++) {
    const y = top + 13 + i * 19;
    const x = ((i * 83 - scene.scroll * (0.12 + i % 4 * 0.05)) % 550 + 550) % 550 - 45;
    ctx.fillStyle = i % 3 ? '#368fae' : '#67bbcb';
    ctx.fillRect(Math.round(x), y, 22 + i % 5 * 9, 2);
  }
  ctx.restore();
};

const drawAura = (ctx, x, y, colors, time, radius = 38, unit = 1) => {
  ctx.save();
  for (let i = 0; i < 20; i++) {
    const angle = i * 2.4 + time * (i % 2 ? 1 : -1);
    const length = radius * (0.5 + ((i * 17) % 10) / 10);
    ctx.globalAlpha = 0.45 + i % 3 * 0.12;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(Math.round(x + Math.cos(angle) * length), Math.round(y + Math.sin(angle) * length),
      Math.max(1, Math.round((3 + i % 3) * unit)), Math.max(1, Math.round((3 + i % 2) * unit)));
  }
  ctx.restore();
};

/** Gajaeman side: heavy black gas plumes, a dark haze and purple sparks curling around him. */
const drawDarkAura = (ctx, x, y, scene, power, unit) => {
  if (power <= 0) return;
  const u = Math.max(0.12, unit);
  const time = scene.time;
  ctx.save();
  const haze = ctx.createRadialGradient(x, y, 3 * u, x, y, 74 * u);
  haze.addColorStop(0, `rgba(10,2,18,${0.62 * power})`);
  haze.addColorStop(0.55, `rgba(28,8,44,${0.34 * power})`);
  haze.addColorStop(1, 'rgba(28,8,44,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(x - 80 * u, y - 80 * u, 160 * u, 160 * u);
  for (let i = 0; i < 22; i++) {
    const age = (time * 0.55 + i / 22) % 1;
    const angle = i * 2.399 + time * 0.6;
    const reach = (13 + age * 64) * u;
    const size = Math.max(1, Math.round((16 - age * 9) * u * (0.7 + power * 0.5)));
    const px = Math.round(x + Math.cos(angle) * reach);
    const py = Math.round(y + Math.sin(angle) * reach * 0.82 - age * 20 * u);
    ctx.globalAlpha = (0.78 - age * 0.6) * power;
    ctx.fillStyle = i % 3 ? '#07030d' : '#241036';
    ctx.fillRect(px, py, size, size);
    ctx.fillStyle = i % 2 ? '#3d1458' : '#150720';
    ctx.fillRect(px + Math.round(size * 0.4), py - Math.round(size * 0.35), Math.max(1, Math.round(size * 0.6)), Math.max(1, Math.round(size * 0.6)));
  }
  for (let i = 0; i < 18; i++) {
    const angle = i * 1.7 - time * 2.1;
    const reach = (18 + (i % 5) * 11) * u;
    ctx.globalAlpha = (0.5 + i % 3 * 0.16) * power;
    ctx.fillStyle = i % 4 ? '#b558ff' : '#e9b6ff';
    ctx.fillRect(Math.round(x + Math.cos(angle) * reach), Math.round(y + Math.sin(angle) * reach * 0.86),
      Math.max(1, Math.round(3 * u)), Math.max(1, Math.round(3 * u)));
  }
  ctx.restore();
};

/** Yoplait side: white-gold core glow, radiating shafts, rising sparks and a pulsing ring. */
const drawLightAura = (ctx, x, y, scene, power, unit) => {
  if (power <= 0) return;
  const u = Math.max(0.12, unit);
  const time = scene.time;
  const pulse = 0.72 + Math.abs(Math.sin(time * 3.2)) * 0.28;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(x, y, 2 * u, x, y, 88 * u * pulse);
  glow.addColorStop(0, `rgba(255,255,255,${0.9 * power})`);
  glow.addColorStop(0.35, `rgba(255,232,150,${0.5 * power})`);
  glow.addColorStop(1, 'rgba(255,232,150,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 98 * u, y - 98 * u, 196 * u, 196 * u);
  ctx.restore();
  ctx.save();
  for (let i = 0; i < 16; i++) {
    const angle = i * (Math.PI * 2 / 16) + time * 0.9;
    const inner = 12 * u;
    const outer = (48 + ((i * 13) % 9) * 8) * u * pulse;
    ctx.globalAlpha = (0.32 + i % 3 * 0.2) * power;
    ctx.strokeStyle = i % 3 ? '#fff6cf' : '#ffffff';
    ctx.lineWidth = Math.max(1, (i % 2 ? 3 : 2) * u);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
    ctx.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.66 * power;
  ctx.strokeStyle = '#ffeaa0';
  ctx.lineWidth = Math.max(1, 2 * u);
  ctx.beginPath();
  ctx.arc(x, y, (30 + pulse * 20) * u, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 20; i++) {
    const age = (time * 0.85 + i / 20) % 1;
    const sway = Math.sin(time * 2 + i) * 7 * u;
    ctx.globalAlpha = (1 - age) * power;
    ctx.fillStyle = i % 3 ? '#ffffff' : '#ffe06a';
    ctx.fillRect(Math.round(x + Math.cos(i * 2.1) * (10 + i % 6 * 8) * u + sway),
      Math.round(y + (26 - age * 74) * u),
      Math.max(1, Math.round(2 * u)), Math.max(1, Math.round((3 + i % 2 * 2) * u)));
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

const flyPoint = (scene, progress, bob = 0) => {
  const [fx, fy] = scene.config.ocean.flyFrom;
  const [tx, ty] = scene.config.ocean.flyTo;
  const k = clamp(progress);
  return [fx + (tx - fx) * k, fy + (ty - fy) * k * k + bob];
};

/** Tumbling speck of Yoplait crossing the same wide shot that holds the castle. */
const drawFlyAcross = (ctx, scene, progress, scale) => {
  const bob = progress >= 1 ? Math.sin(scene.time * 2.1) * 4 : 0;
  const spin = scene.time * 5.5;
  ctx.save();
  for (let i = 4; i >= 1; i--) {
    const [gx, gy] = flyPoint(scene, progress - i * 0.04, bob);
    ctx.globalAlpha = 0.3 - i * 0.055;
    drawCharacter(ctx, scene.actors.yoplait, gx, gy, 'down', scale, spin - i * 0.6);
  }
  ctx.restore();
  const [x, y] = flyPoint(scene, progress, bob);
  drawCharacter(ctx, scene.actors.yoplait, x, y, 'down', scale, spin);
};

const drawSkyActors = (ctx, scene) => {
  const rising = scene.beat === 'ocean_rise';
  const ascent = shipCastleAscent(scene);
  const ink = ascent.scale / scene.config.sky.actorScale;
  const clash = ['sky_opposite_aura', 'vortex_gather', 'vortex_burst'].includes(scene.beat);
  const power = scene.beat === 'sky_opposite_aura'
    ? smooth(scene.elapsed / scene.config.timing.oppositeAura)
    : clash ? 1 : 0;
  const flare = 0.74 + Math.abs(Math.sin(scene.time * 3.2)) * 0.26;
  if (clash) {
    ctx.save();
    ctx.globalAlpha = 0.34 * power;
    ctx.fillStyle = '#0a1226';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.restore();
  }
  const burst = scene.beat === 'vortex_burst' ? smooth(scene.elapsed / scene.config.timing.vortexBurst) : 0;
  const tug = burst || rising ? 0 : Math.sin(scene.time * 3.2) * 4;
  const spread = 53 * ascent.scale / scene.config.sky.actorScale;
  const gx = ascent.x - spread + tug, gy = ascent.bottom;
  const hurl = burst ? 1 - Math.pow(1 - burst, 2.6) : 0;
  const hurlX = offset => ascent.x + spread + offset * 190;
  const hurlY = offset => ascent.bottom - Math.sin(offset * Math.PI * 0.6) * 34 + offset * offset * 300;
  const yx = hurl ? hurlX(hurl) : ascent.x + spread - tug;
  const yy = hurl ? hurlY(hurl) : ascent.bottom;
  const actorScale = ascent.scale;
  const gajaemanScale = actorScale * scene.config.sky.gajaemanCanonicalScale;
  const [gajaemanGripX, gajaemanGripY] = scene.config.sky.gajaemanGrip;
  const [yoplaitGripX, yoplaitGripY] = scene.config.sky.yoplaitGrip;
  const gripScale = actorScale / 1.75;
  const gajaemanGrip = [gx + gajaemanGripX * gripScale, gy + gajaemanGripY * gripScale];
  const yoplaitGrip = [yx + yoplaitGripX * gripScale, yy + yoplaitGripY * gripScale];
  drawDarkAura(ctx, gx, gy - 26 * actorScale, scene, rising ? 0.55 : power * flare, ink * (rising ? 1.5 : flare));
  drawVortex(ctx, scene, gx, gy - 25);
  if (!rising) {
    drawAura(ctx, gx, gy - 25 * actorScale, ['#1b071f', '#6f258d', '#d677ff'], scene.time,
      scene.beat === 'vortex_gather' ? 40 + smooth(scene.elapsed / scene.config.timing.vortexGather) * 48 : 32, ink);
  }
  if (clash && hurl <= 0) drawLightAura(ctx, yx, yy - 26 * actorScale, scene, power * flare, ink * flare);
  drawCharacter(ctx, scene.actors.gajaeman, gx, gy, 'right', gajaemanScale, burst ? 0 : tug * 0.006);
  if (hurl > 0) {
    ctx.save();
    for (let i = 5; i >= 1; i--) {
      const ghost = Math.max(0, hurl - i * 0.06);
      ctx.globalAlpha = 0.34 - i * 0.055;
      drawCharacter(ctx, scene.actors.yoplait, hurlX(ghost), hurlY(ghost), 'left', actorScale, ghost * Math.PI * 7);
    }
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 9; i++) {
      const ghost = Math.max(0, hurl - 0.05 - i * 0.02);
      ctx.fillRect(Math.round(hurlX(ghost) - 30 - i * 4), Math.round(hurlY(ghost) - 34 - i * 5), 15 + i % 3 * 8, 1);
    }
    ctx.restore();
  }
  drawCharacter(ctx, scene.actors.yoplait, yx, yy, 'left', actorScale, hurl * Math.PI * 7 - (burst ? 0 : tug * 0.006));
  if (!rising || ascent.zoom > 0.45) drawCord(ctx, scene, gajaemanGrip, burst ? [gajaemanGrip[0] + 34 * ink, gajaemanGrip[1] + 3] : yoplaitGrip, ink);
};

/** Power streaming inward to one bright point before anything of the castle exists. */
const drawGatherPoint = (ctx, scene, x, y, gather, fade = 1) => {
  if (gather <= 0 || fade <= 0) return;
  const pull = Math.max(0, 1 - gather);
  ctx.save();
  const glow = ctx.createRadialGradient(x, y, 1, x, y, 12 + gather * 48);
  glow.addColorStop(0, `rgba(255,238,255,${(0.45 + gather * 0.55) * fade})`);
  glow.addColorStop(0.4, `rgba(190,80,255,${0.44 * gather * fade})`);
  glow.addColorStop(1, 'rgba(120,30,190,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 80, y - 80, 160, 160);
  for (let index = 0; index < 44; index++) {
    const angle = index * 2.399 + scene.time * 0.8;
    const span = (16 + index % 9 * 15) * (0.22 + pull * 1.3);
    const streak = Math.max(1, Math.round(3 + pull * 8));
    ctx.globalAlpha = (0.34 + gather * 0.5) * fade;
    ctx.fillStyle = index % 3 ? '#c46cff' : '#f3d8ff';
    ctx.fillRect(Math.round(x + Math.cos(angle) * span), Math.round(y + Math.sin(angle) * span * 0.82), streak, 2);
  }
  ctx.globalAlpha = fade;
  ctx.fillStyle = '#ffffff';
  const core = Math.max(2, Math.round(2 + gather * 7));
  ctx.fillRect(Math.round(x - core / 2), Math.round(y - core / 2), core, core);
  ctx.restore();
};

/** Landing shock: crests rolling out both ways along the waterline plus a spray curtain. */
const drawLandingWaves = (ctx, scene, geometry) => {
  const age = geometry.wave;
  if (age <= 0 || age >= 1) return;
  const { waterline } = scene.config.ocean;
  const baseX = geometry.castle.x + geometry.castle.width / 2;
  const foot = geometry.castle.width * 0.34;
  ctx.save();
  for (let side = -1; side <= 1; side += 2) {
    for (let ring = 0; ring < 4; ring++) {
      const local = age - ring * 0.11;
      if (local <= 0) continue;
      const x = baseX + side * (foot + local * 330);
      const height = Math.max(1, Math.round((17 - ring * 3) * (1 - local)));
      ctx.globalAlpha = (1 - local) * 0.85;
      ctx.fillStyle = ring % 2 ? '#dff6ff' : '#9fd8e8';
      ctx.fillRect(Math.round(x - 27), Math.round(waterline + 3 + ring * 4 - height), 54, height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(x - 15), Math.round(waterline + 1 + ring * 4 - height), 30, 2);
    }
  }
  for (let index = 0; index < 36; index++) {
    const side = index % 2 ? 1 : -1;
    const reach = (16 + index % 8 * 17) * age * 2.4;
    const lift = Math.sin(age * Math.PI) * (44 + index % 6 * 19) - age * age * 44;
    ctx.globalAlpha = 1 - age;
    ctx.fillStyle = index % 3 ? '#ffffff' : '#cdefff';
    ctx.fillRect(Math.round(baseX + side * (foot * 0.9 + reach)), Math.round(waterline - lift), 2, 4);
  }
  ctx.restore();
};

const drawCastle = (ctx, scene, geometry) => {
  const rect = geometry.castle;
  const reveal = geometry.reveal;
  const phase = geometry.phase;
  const pointX = rect.x + rect.width * 0.5;
  const pointY = rect.y + rect.height * 0.5;
  const seedY = scene.config.ocean.waterline - scene.config.ocean.castleHover - scene.config.ocean.castleSeedLift;
  if (scene.beat === 'castle_reveal' && phase.gather < 1) {
    drawGatherPoint(ctx, scene, 240, seedY, phase.gather);
    return;
  }
  if (scene.beat === 'castle_reveal') {
    const { castleGatherAt, castleEmergeAt } = scene.config.ocean;
    const glowFade = clamp((castleEmergeAt - reveal) / (castleEmergeAt - castleGatherAt));
    drawGatherPoint(ctx, scene, 240, seedY, 0.98, glowFade);
    drawAura(ctx, pointX, pointY, ['#06020a', '#57136f', '#d278ff'], scene.time, rect.width * 0.45 + 12);
  }
  ctx.save();
  ctx.globalAlpha = scene.beat === 'castle_reveal'
    ? clamp((reveal - scene.config.ocean.castleGatherAt) / 0.12) : 1;
  if (scene.images.castle) ctx.drawImage(scene.images.castle, rect.x, rect.y, rect.width, rect.height);
  else {
    ctx.fillStyle = '#12051e'; ctx.fillRect(rect.x + rect.width * 0.18, rect.y + rect.height * 0.16, rect.width * 0.64, rect.height * 0.84);
    ctx.fillStyle = '#2d0b48'; ctx.fillRect(rect.x + rect.width * 0.08, rect.y + rect.height * 0.43, rect.width * 0.84, rect.height * 0.57);
  }
  ctx.restore();
  if (scene.beat === 'castle_reveal') {
    drawCastlePop(ctx, scene, rect, reveal);
    drawLandingWaves(ctx, scene, geometry);
  }
};

/** One white flash, two shockwave rings and scattering bricks when the castle finishes forming. */
const drawCastlePop = (ctx, scene, rect, reveal) => {
  const age = clamp((reveal - scene.config.ocean.castlePopAt) / 0.08);
  if (age <= 0 || age >= 1) return;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height * 0.52;
  ctx.save();
  if (age < 0.3) {
    ctx.globalAlpha = (1 - age / 0.3) * 0.42;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }
  ctx.globalAlpha = 1 - age;
  ctx.strokeStyle = '#f6e2ff';
  ctx.lineWidth = Math.max(1, Math.round(6 * (1 - age)));
  ctx.beginPath(); ctx.arc(cx, cy, 20 + age * 132, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#b74aff';
  ctx.lineWidth = Math.max(1, Math.round(3 * (1 - age)));
  ctx.beginPath(); ctx.arc(cx, cy, 8 + age * 96, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 44; i++) {
    const angle = i * 2.4;
    const reach = (44 + i % 7 * 24) * age;
    const size = Math.max(1, 4 - i % 3);
    ctx.fillStyle = i % 3 ? '#e3b3ff' : '#ffffff';
    ctx.fillRect(Math.round(cx + Math.cos(angle) * reach), Math.round(cy + Math.sin(angle) * reach * 0.82), size, size);
  }
  ctx.restore();
};

const drawBeams = (ctx, scene, geometry) => {
  const { beamCharge, beamDuration } = scene.config.ocean;
  const phase = scene.beamClock;
  if (phase < 0 || phase > beamCharge + beamDuration + 0.5) return;
  const origin = [geometry.castle.x + geometry.castle.width * 0.42, geometry.castle.y + geometry.castle.height * 0.28];
  const target = [geometry.warship.x + geometry.warship.width * 0.38, geometry.warship.y + geometry.warship.height + 13 + scene.beamIndex % 2 * 8];
  ctx.save();
  const firing = phase >= beamCharge && phase <= beamCharge + beamDuration;
  ctx.globalAlpha = firing ? 1 - (phase - beamCharge) / beamDuration : phase < beamCharge ? phase / beamCharge : 0;
  if (firing) {
    ctx.strokeStyle = '#bf63ff'; ctx.lineWidth = scene.beat === 'retreat' ? 3 : 5;
    ctx.beginPath(); ctx.moveTo(origin[0], origin[1]); ctx.lineTo(target[0], target[1]); ctx.stroke();
    ctx.strokeStyle = '#f4dfff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(origin[0], origin[1]); ctx.lineTo(target[0], target[1]); ctx.stroke();
  }
  ctx.fillStyle = '#f2d5ff'; ctx.beginPath(); ctx.arc(origin[0], origin[1], 2 + Math.min(phase, beamCharge) / beamCharge * 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (phase > beamCharge) drawSplash(ctx, target[0], target[1], clamp((phase - beamCharge) / 0.85), 0.65);
  if (scene.beat === 'castle_attack' && phase >= beamCharge && phase <= beamCharge + 0.8) {
    ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffe55e';
    ctx.fillText('!', geometry.maillard.x + geometry.maillard.width / 2, geometry.maillard.y - 10);
    ctx.fillText('!', geometry.warship.x + geometry.warship.width / 2, geometry.warship.y - 10);
    ctx.textAlign = 'left';
  }
};

const drawSplash = (ctx, x, y, age, scale = 1) => {
  if (age > 0 && age < 1) {
    ctx.save(); ctx.globalAlpha = 1 - age;
    for (let i = 0; i < 28; i++) {
      const px = x + Math.cos(i * 2.3) * age * (24 + i % 6 * 7) * scale;
      const py = y - Math.sin(age * Math.PI) * (15 + i % 5 * 9) * scale;
      ctx.fillStyle = i % 2 ? '#d4ffff' : '#79cee4'; ctx.fillRect(Math.round(px), Math.round(py), 2, 3);
    }
    ctx.restore();
  }
};

/** Loud white column, ring and droplets so the sea entry reads as a splash, not a ripple. */
const drawWaterImpact = (ctx, x, y, age, unit) => {
  if (age <= 0 || age >= 1) return;
  const rise = Math.sin(Math.min(1, age * 1.35) * Math.PI);
  const px = size => Math.max(1, Math.round(size * unit));
  ctx.save();
  ctx.globalAlpha = 1 - age * 0.7;
  ctx.fillStyle = '#ffffff';
  const column = px(64 * rise);
  ctx.fillRect(Math.round(x) - px(3), Math.round(y) - column, px(6), column);
  ctx.fillRect(Math.round(x) - px(7), Math.round(y) - Math.round(column * 0.72), px(14), Math.max(1, Math.round(column * 0.3)));
  for (let row = 0; row < 4; row++) {
    const spread = px((20 - row * 4) * rise);
    ctx.fillRect(Math.round(x) - spread, Math.round(y) - px(6 + row * 9) , spread * 2, px(4));
  }
  ctx.fillStyle = '#eaffff';
  for (let i = 0; i < 26; i++) {
    const angle = i / 26 * Math.PI * 2;
    const rx = (16 + age * 58) * unit, ry = (4 + age * 14) * unit;
    ctx.fillRect(Math.round(x + Math.cos(angle) * rx), Math.round(y + unit * 2 + Math.sin(angle) * ry), px(3), px(2));
  }
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 34; i++) {
    const reach = (12 + i % 7 * 8) * age * 2.6 * (i % 2 ? 1 : -1) * unit;
    const lift = (Math.sin(age * Math.PI) * (34 + i % 5 * 15) - age * age * 34) * unit;
    ctx.fillStyle = i % 3 ? '#ffffff' : '#c8f4ff';
    ctx.fillRect(Math.round(x + reach), Math.round(y - lift), px(2), px(3));
  }
  ctx.restore();
};

const drawFall = (ctx, scene) => {
  const { waterline } = scene.config.ocean;
  const [sx, sy] = scene.config.ocean.flyTo;
  const progress = clamp(scene.elapsed / scene.config.timing.fall);
  const k = clamp(progress / 0.72);
  const fallX = offset => sx + offset * 9;
  const fallY = offset => sy + (waterline + 40 - sy) * offset * offset;
  if (progress < 0.72) {
    ctx.save();
    ctx.fillStyle = '#eaf6ff';
    for (let i = 0; i < 7; i++) {
      ctx.globalAlpha = 0.36 - i * 0.045;
      ctx.fillRect(Math.round(fallX(k) + (i % 2 ? 5 : -6)), Math.round(fallY(k) - 20 - i * 9), 1, 6 + i % 3 * 4);
    }
    for (let i = 4; i >= 1; i--) {
      const ghost = Math.max(0, k - i * 0.05);
      ctx.globalAlpha = 0.3 - i * 0.06;
      drawCharacter(ctx, scene.actors.yoplait, fallX(ghost), fallY(ghost), 'down', 0.34, ghost * Math.PI * 9);
    }
    ctx.restore();
    drawCharacter(ctx, scene.actors.yoplait, fallX(k), fallY(k), 'down', 0.34, k * Math.PI * 9);
  }
  drawWaterImpact(ctx, sx + 9, waterline + 40, clamp((progress - 0.72) / 0.28), 1 / shipCastleCamera(scene).z);
};

/** Short black veil: closes the finished camera push, opens the close-up struggle.
    Music, clouds and scene clocks keep running underneath, so nothing restarts across it. */
export const shipCastleVeil = scene => {
  const { veilOut, veilIn, oceanPush, fallVeilOut, fallVeilIn } = scene.config.timing;
  if (scene.beat === 'ocean_rise') return clamp(((scene.pushTime || 0) - (oceanPush - veilOut)) / veilOut);
  if (scene.beat === 'sky_tug') return 1 - clamp(scene.elapsed / veilIn);
  if (scene.beat === 'castle_reveal' && scene.veilClosing) return clamp((scene.veilClock || 0) / fallVeilOut);
  if (scene.beat === 'yoplait_fall') return 1 - clamp(scene.elapsed / fallVeilIn);
  return 0;
};

const drawOceanFrame = (ctx, scene) => {
  const zoom = shipCastleCamera(scene);
  ctx.save();
  if (zoom) {
    if (zoom.panX || zoom.panY) ctx.translate(zoom.panX, zoom.panY);
    ctx.translate(zoom.x, zoom.y);
    ctx.scale(zoom.z, zoom.z);
    ctx.translate(-zoom.x, -zoom.y);
  }
  drawSky(ctx, scene);
  if (SKY_BEATS.includes(scene.beat)) {
    drawSkyActors(ctx, scene);
    ctx.restore();
    return;
  }
  const geometry = shipCastleGeometry(scene);
  drawSea(ctx, scene, geometry.ascent ? geometry.ascent.horizon : scene.config.ocean.waterline);
  if (geometry.castle) drawCastle(ctx, scene, geometry);
  drawOceanShips(ctx, scene, geometry);
  if (scene.beat === 'ocean_rise') {
    drawSkyActors(ctx, scene);
  }
  if (scene.beat === 'castle_reveal') {
    drawFlyAcross(ctx, scene, clamp(scene.elapsed / (scene.config.timing.castleReveal + scene.config.timing.castleHold)), 0.34);
  }
  if (scene.beat === 'yoplait_fall') drawFall(ctx, scene);
  if (scene.beat === 'castle_attack' || scene.beat === 'retreat') drawBeams(ctx, scene, geometry);
  ctx.restore();
};

/** Draw the current full-frame ocean or sky beat without owning narrative timing. */
export const drawShipCastleOcean = (ctx, scene) => {
  drawOceanFrame(ctx, scene);
  if (scene.beat === 'ocean_rise') {
    const ascent = shipCastleAscent(scene);
    drawRiseClouds(ctx, scene, clamp((ascent.zoom - 0.12) / 0.45));
  }
  const veil = shipCastleVeil(scene);
  if (veil <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, veil);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.restore();
};
