import { makeCanvas } from '../core/gfx.js';

const TAU = Math.PI * 2;
const SIDES = 12;
const HEIGHTS = [0, 0.3, 0.35, 0.5, 0.65, 0.7, 1];
const INK = {
  void: '#08050f',
  wood: ['#281b24', '#302029', '#251a23', '#32212a'],
  seam: '#100c13',
  grain: '#49303b',
  purple: ['#240d48', '#492775'],
  aura: ['#08050f', '#171025', '#241a3a'],
};
let floorCache;

function polygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(Math.round(points[0].x), Math.round(points[0].y));
  for (let i = 1; i < points.length; i++) ctx.lineTo(Math.round(points[i].x), Math.round(points[i].y));
  ctx.closePath();
  ctx.fill();
}

function buildFloor() {
  const canvas = makeCanvas(480, 360), ctx = canvas.getContext('2d');
  ctx.fillStyle = INK.void;
  ctx.fillRect(0, 0, 480, 360);
  const rows = [88, 95, 105, 119, 139, 167, 205, 257, 318, 360];
  for (let row = 0; row < rows.length - 1; row++) {
    const top = rows[row], bottom = rows[row + 1];
    const far = (top - 68) / 100, near = (bottom - 68) / 100;
    for (let plank = -18; plank <= 18; plank++) {
      const left = (plank + (row % 2) * 0.5) * 90;
      const right = left + 90;
      ctx.fillStyle = INK.wood[((plank + 20) * 3 + row) % INK.wood.length];
      polygon(ctx, [
        { x: 240 + left * far, y: top }, { x: 240 + right * far, y: top },
        { x: 240 + right * near, y: bottom }, { x: 240 + left * near, y: bottom },
      ]);
      ctx.strokeStyle = INK.seam;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = INK.grain;
      for (let line = 1; line <= 3; line++) {
        const y = top + (bottom - top) * line / 4;
        const scale = (y - 68) / 100;
        ctx.beginPath();
        ctx.moveTo(Math.round(240 + (left + 9 + line * 4) * scale), Math.round(y));
        ctx.lineTo(Math.round(240 + (right - 9 - ((plank + line + 21) % 3) * 8) * scale), Math.round(y));
        ctx.stroke();
      }
    }
  }
  return canvas;
}

function project(x, y, z) {
  const scale = 720 / (720 + z);
  return {
    x: 240 + x * scale,
    y: 110 + (y - z * 0.13) * scale,
    z,
  };
}

/** Height runs top-to-bottom through the hourglass; rotation is about its vertical axis. */
export function mankatsukiVortexPoint(height, angle, time) {
  const level = height * 2 - 1;
  const distance = Math.abs(level);
  const radius = distance <= 0.3 ? 7 + distance * 44 : 20.2 + Math.pow((distance - 0.3) / 0.7, 0.55) * 527;
  const turn = angle + time * 0.48 + level * 0.2;
  return project(Math.cos(turn) * radius, level * 170, Math.sin(turn) * radius);
}

/** The surrounding ribbon rotates independently, with its far and near arcs depth sorted. */
export function mankatsukiAuraPoint(height, angle, time) {
  const turn = angle - time * 0.22;
  const radius = 470 + Math.sin(angle * 3) * 10;
  return project(Math.cos(turn) * radius, 20 + height * 52 + Math.sin(angle * 2) * 7, Math.sin(turn) * radius);
}

/** Projected purple hourglass and surrounding dark ribbon, below actors and the soul box. */
export function drawMankatsukiBackground(ctx, battle) {
  floorCache ??= buildFloor();
  const time = battle.game.time;
  ctx.save();
  ctx.drawImage(floorCache, 0, 0);
  const faces = [];
  const addFace = (points, color, alpha) => faces.push({ points, color, alpha, z: points.reduce((sum, point) => sum + point.z, 0) / points.length });
  const rings = HEIGHTS.map(height => Array.from({ length: SIDES + 1 }, (_, side) => mankatsukiVortexPoint(height, side / SIDES * TAU, time)));
  for (let ring = 0; ring < HEIGHTS.length - 1; ring++) {
    for (let side = 0; side < SIDES; side++) {
      addFace([rings[ring][side], rings[ring][side + 1], rings[ring + 1][side + 1], rings[ring + 1][side]], INK.purple[side % 2], ring < 3 ? 1 : 0.64);
    }
  }
  for (let side = 0; side < 96; side++) {
    const angle = side / 96 * TAU, next = (side + 1) / 96 * TAU;
    for (let stripe = 0; stripe < 16; stripe++) {
      const top = stripe / 16 - 0.5, bottom = (stripe + 1) / 16 - 0.5;
      const pigment = (side * 17 + stripe * 7) % 13;
      addFace([
        mankatsukiAuraPoint(top, angle, time), mankatsukiAuraPoint(top, next, time),
        mankatsukiAuraPoint(bottom, next, time), mankatsukiAuraPoint(bottom, angle, time),
      ], INK.aura[pigment < 8 ? 0 : pigment < 12 ? 1 : 2], 0.94);
    }
  }
  faces.sort((a, b) => b.z - a.z);
  for (const face of faces) {
    ctx.globalAlpha = face.alpha;
    ctx.fillStyle = face.color;
    polygon(ctx, face.points);
  }
  ctx.globalAlpha = 1;
  if (battle.state === 'dodge') {
    ctx.fillStyle = 'rgba(4,2,9,0.3)';
    ctx.fillRect(0, 0, 480, 246);
  }
  ctx.restore();
}
