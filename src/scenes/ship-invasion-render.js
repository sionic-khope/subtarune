import { SCREEN_W, SCREEN_H } from '../world/world.js';
import { FX } from '../data/fx.js';

const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { const k = clamp(n); return k * k * (3 - 2 * k); };
const rect = (x, bottom, width, image, fallbackRatio) => {
  const height = width * (image ? image.height / image.width : fallbackRatio);
  return { x: x - width / 2, y: bottom - height, width, height };
};

/** One projection drives drawing, deck contact, hull separation and the QA observation surface. */
export function invasionGeometry(scene) {
  const { world: w, timing: t, teleport: tp } = scene.config;
  const { elapsed, beat, images } = scene;
  const drop = ['castle-drop', 'aftermath', 'teleport'].includes(beat);
  const contact = drop && (beat !== 'castle-drop' || elapsed >= t.fall);
  const age = scene.impactTime === null ? 0 : Math.max(0, scene.time - scene.impactTime);
  const pan = beat === 'castle-look' ? smooth(elapsed / t.pan) : 0;
  const pullback = drop ? (beat === 'castle-drop' ? smooth(age / t.pullback) : 1) : pan;
  const scale = w.closeWidth / w.warshipWidth * (1 - pullback) + w.wideCastleWidth / w.castleWidth * pullback;
  const waterline = w.waterline;
  const fleetX = drop ? 240 : 258 - pan * 210;
  const bob = contact ? 0 : Math.sin(scene.time * 1.9) * 1.4;
  const warship = rect(fleetX, waterline + bob, w.warshipWidth * scale, images.warship, 0.5);
  const maillard = rect(fleetX - 268 * scale - (contact ? 40 * smooth(age / 2.5) : 0), waterline + 7 + bob, w.maillardWidth * scale, images.maillard, 496 / 768);
  const castleX = drop ? fleetX : 1200 + (286 - 1200) * pan;
  const deckY = waterline - warship.height * 0.36;
  const fallK = clamp(elapsed / t.fall);
  const bottom = drop ? (contact ? deckY + 12 * smooth(age) : -42 + (deckY + 42) * fallK * fallK) : waterline - 5;
  const castle = rect(castleX, bottom, w.castleWidth * scale, images.castle, 1);
  const split = contact ? smooth(age / 1.3) : 0;
  const halves = [-1, 1].map(side => ({ side, x: fleetX + side * (warship.width * 0.25 + split * 44), y: warship.y + warship.height / 2 + split * 14, rotation: side * split * 0.22 }));
  const teleports = Array.from({ length: tp.count }, (_, i) => {
    const source = { x: fleetX + (i - 2) * 16, y: waterline + 23 + Math.abs(i - 2) * 2 };
    const target = { x: castleX + (i - 2) * 7, y: bottom - 9 };
    const progress = clamp((elapsed - tp.charge - i * tp.stagger) / tp.flight);
    return { source, target, progress, x: source.x + (target.x - source.x) * progress, y: source.y + (target.y - source.y) * progress, charge: clamp(elapsed / tp.charge) };
  });
  return { castle, warship, maillard, halves, teleports, contact, impactAge: age, split, scale, waterline, pan, pullback };
}

function drawOcean(ctx, scene) {
  const horizon = scene.config.world.horizon;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#4f9fdc'); sky.addColorStop(1, '#a6d9f3');
  ctx.fillStyle = sky; ctx.fillRect(-16, -16, SCREEN_W + 32, horizon + 16);
  ctx.fillStyle = '#e8f7fc';
  for (let i = 0; i < 6; i++) {
    const x = ((i * 127 - scene.time * 2) % 560 + 560) % 560 - 60;
    ctx.fillRect(Math.round(x), 18 + i % 3 * 15, 54 + i % 2 * 22, 3);
  }
  ctx.fillStyle = '#146a9a'; ctx.fillRect(-16, horizon, SCREEN_W + 32, SCREEN_H - horizon + 16);
  ctx.fillStyle = '#a3e0df'; ctx.fillRect(0, horizon, SCREEN_W, 2);
  for (let i = 0; i < 44; i++) {
    const speed = 0.45 + (i % 5) * 0.2;
    const x = ((i * 97 - scene.time * 68 * speed) % 560 + 560) % 560 - 40;
    const y = horizon + 5 + (i * 71) % (SCREEN_H - horizon);
    ctx.fillStyle = i % 3 === 0 ? '#278eb2' : '#197aa6';
    ctx.fillRect(Math.round(x), y, 24 + i % 4 * 13, 3);
    ctx.fillStyle = '#409fba'; ctx.fillRect(Math.round(x + 4), y - 2, 10 + i % 3 * 7, 2);
  }
}

function drawWake(ctx, scene, r) {
  ctx.save(); ctx.fillStyle = '#a3e0df';
  for (let i = 0; i < 7; i++) {
    const k = (scene.time * 0.7 + i / 7) % 1;
    ctx.globalAlpha = (1 - k) * 0.65;
    ctx.fillRect(Math.round(r.x - k * 36), Math.round(r.y + r.height * 0.92 + i % 3 * 2), Math.round(12 + k * 16), 1);
  }
  ctx.restore();
}

function drawShip(ctx, image, r, flip = false) {
  if (!image) return;
  ctx.save();
  if (flip) { ctx.translate(Math.round(r.x + r.width), Math.round(r.y)); ctx.scale(-1, 1); ctx.drawImage(image, 0, 0, Math.round(r.width), Math.round(r.height)); }
  else ctx.drawImage(image, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height));
  ctx.restore();
}

function drawFleet(ctx, scene, g) {
  drawWake(ctx, scene, g.maillard);
  drawShip(ctx, scene.images.maillard, g.maillard, true);
  if (!g.contact) {
    drawWake(ctx, scene, g.warship);
    drawShip(ctx, scene.images.warship, g.warship);
    const left = g.maillard.x + g.maillard.width * 0.84;
    const right = g.warship.x + g.warship.width * 0.08;
    ctx.strokeStyle = '#96a1aa'; ctx.lineWidth = Math.max(2, 8 * g.scale);
    ctx.beginPath(); ctx.moveTo(left, g.maillard.y + g.maillard.height * 0.72); ctx.lineTo(right, g.warship.y + g.warship.height * 0.78); ctx.stroke();
    return;
  }
  const image = scene.images.warship;
  if (!image) return;
  for (const half of g.halves) {
    ctx.save(); ctx.translate(Math.round(half.x), Math.round(half.y)); ctx.rotate(half.rotation);
    ctx.drawImage(image, half.side < 0 ? 0 : image.width / 2, 0, image.width / 2, image.height,
      -g.warship.width / 4, -g.warship.height / 2, g.warship.width / 2, g.warship.height);
    ctx.restore();
  }
}

function drawImpact(ctx, scene, g) {
  if (!g.contact) return;
  const age = g.impactAge;
  const k = clamp(age / 3);
  const cx = g.castle.x + g.castle.width / 2, y = g.waterline;
  if (age < 3) {
    ctx.save(); ctx.globalAlpha = 1 - k;
    for (let side = -1; side <= 1; side += 2) for (let ring = 0; ring < 4; ring++) {
      const local = Math.max(0, k - ring * 0.09);
      const x = cx + side * local * 290;
      const height = (30 - ring * 5) * Math.sin(local * Math.PI);
      ctx.fillStyle = '#b2e4ee'; ctx.fillRect(Math.round(x - 34), Math.round(y - height + ring * 4), 68, Math.round(height + 3));
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x - 27), Math.round(y - height + ring * 4), 54, 2);
    }
    for (let i = 0; i < 54; i++) {
      const side = i % 2 ? 1 : -1;
      const x = cx + side * (18 + i % 9 * 12) * k * 2.2;
      const lift = Math.sin(k * Math.PI) * (38 + i % 7 * 12) - k * k * 24;
      ctx.fillStyle = i % 3 ? '#dff6ff' : '#647d91';
      ctx.fillRect(Math.round(x), Math.round(y - lift), i % 3 ? 2 : 4, i % 3 ? 4 : 3);
    }
    ctx.restore();
  }
  const image = scene.images.explosion, f = FX.explosion;
  const index = Math.floor(age * f.fps);
  if (image && index < f.count) {
    const fw = image.width / f.cols, fh = image.height / f.rows;
    for (const offset of [-44, 0, 44]) ctx.drawImage(image, index * fw, 0, fw, fh, cx + offset - 36, y - 92, 72, 108);
  }
  if (age < 0.24) {
    ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - age / 0.24)})`;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }
}

function drawTeleport(ctx, scene, g) {
  ctx.save();
  for (const ray of g.teleports) {
    if (ray.progress >= 1) continue;
    const glow = ctx.createRadialGradient(ray.x, ray.y, 1, ray.x, ray.y, 12 * ray.charge + 1);
    glow.addColorStop(0, '#ffffff'); glow.addColorStop(0.3, '#a3e0df'); glow.addColorStop(1, 'rgba(163,224,223,0)');
    ctx.fillStyle = glow; ctx.fillRect(ray.x - 14, ray.y - 14, 28, 28);
    if (ray.progress > 0) {
      ctx.strokeStyle = '#dff6ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ray.source.x, ray.source.y); ctx.lineTo(ray.x, ray.y); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCastleWaterline(ctx, scene, g) {
  if (!g.contact || g.impactAge < 0.3) return;
  const bottom = g.castle.y + g.castle.height;
  ctx.save(); ctx.globalAlpha = 0.6;
  for (let i = 0; i < 15; i++) {
    const phase = (scene.time * 0.42 + i / 15) % 1;
    const x = g.castle.x + g.castle.width * (i / 15);
    ctx.fillStyle = i % 3 ? '#409fba' : '#b2e4ee';
    ctx.fillRect(Math.round(x), Math.round(bottom - 2 + (i % 3) * 2 + Math.sin(phase * Math.PI * 2)), Math.max(2, Math.round(g.castle.width / 22)), 1);
  }
  ctx.restore();
}

/** Room shadow stays below dialogue; ocean shots retain the same upper-screen picture budget. */
export function drawShipInvasion(ctx, scene) {
  if (scene.beat === 'hidden') return;
  if (scene.beat === 'room-shadow') {
    ctx.fillStyle = `rgba(7,3,13,${smooth(scene.elapsed / scene.config.timing.shadow) * 0.78})`;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    return;
  }
  const g = invasionGeometry(scene);
  ctx.save(); drawOcean(ctx, scene);
  if (scene.beat !== 'sail') drawShip(ctx, scene.images.castle, g.castle);
  drawFleet(ctx, scene, g);
  drawImpact(ctx, scene, g);
  drawCastleWaterline(ctx, scene, g);
  if (scene.beat === 'teleport') drawTeleport(ctx, scene, g);
  ctx.restore();
}
