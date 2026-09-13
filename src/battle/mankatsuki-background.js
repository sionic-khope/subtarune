import { makeCanvas } from '../core/gfx.js';

const TAU = Math.PI * 2;
const SIDES = 12;
const HEIGHTS = [0, 0.3, 0.35, 0.5, 0.65, 0.7, 1];
const RIBBON_SIDES = 48;
const RIBBONS = [
  { radius: 470, speed: -0.308, tilt: 0.16, phase: 0, lift: 12, width: 50 },
  { radius: 410, speed: 0.24, tilt: -0.29, phase: 1.8, lift: -34, width: 34 },
  { radius: 520, speed: -0.19, tilt: 0.31, phase: 3.7, lift: 42, width: 42 },
];
const INK = {
  void: '#08050f',
  wood: ['#281b24', '#302029', '#251a23', '#32212a'],
  seam: '#100c13',
  grain: '#49303b',
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

function project(x, y, z, focal = 720) {
  const scale = focal / (focal + z);
  return {
    x: 240 + x * scale,
    y: 110 + (y - z * 0.13) * scale,
    z,
  };
}

/** Height runs top-to-bottom through a bent hourglass whose narrow waist stays anchored. */
export function mankatsukiVortexPoint(height, angle, time) {
  const level = height * 2 - 1;
  const distance = Math.abs(level);
  const profile = distance <= 0.3 ? 7 + distance * 44 : 20.2 + Math.pow((distance - 0.3) / 0.7, 0.55) * 527;
  const radius = profile * (1 + Math.sin(time * 0.67 + level * 2.8) * 0.03 + Math.sin(angle * 3 + level * 4 - time * 0.43) * distance * 0.025);
  const turn = angle + time * 0.768 + level * (0.65 + Math.sin(time * 0.61) * 0.6) + Math.sin(level * Math.PI) * Math.sin(time * 0.87) * 0.35;
  const bend = level * 34 * Math.sin(time * 0.53 + level * 1.9) + distance * distance * 24 * Math.sin(time * 0.37);
  return project(
    bend + Math.cos(turn) * radius,
    level * 170 + distance * Math.sin(angle * 2 + time * 0.47) * 20,
    Math.sin(turn) * radius + level * 8 * Math.sin(time * 0.41),
    720 + Math.sin(time * 0.39) * 18,
  );
}

/** Broken ribbons orbit on separate tilted planes; the default retains the outer counter-rotation. */
export function mankatsukiAuraPoint(height, angle, time, ribbon = 0) {
  const band = RIBBONS[ribbon];
  const turn = angle + time * band.speed + band.phase;
  const radius = band.radius + Math.sin(angle * 3 + time * 0.31) * 16;
  const x = Math.cos(turn) * radius;
  const z = Math.sin(turn) * radius;
  const tilt = band.tilt + Math.sin(time * 0.27 + band.phase) * 0.065;
  return project(x, band.lift + height * band.width + x * tilt + Math.sin(angle * 2 - time * 0.49) * 18, z);
}

/** Projected purple hourglass and surrounding dark ribbon, below actors and the soul box. */
export function drawMankatsukiBackground(ctx, battle) {
  floorCache ??= buildFloor();
  const time = battle.game.time;
  const defending = ['enemy-prep', 'bullets', 'board-close'].includes(battle.state);
  const breath = (Math.sin(time * 0.32) + 1) / 2;
  const hue = 267 + breath * 28;
  const purple = [
    `hsl(${hue}, 62%, ${16 + breath * 3}%)`,
    `hsl(${hue + 7}, 49%, ${27 + breath * 3}%)`,
    `hsl(${hue - 8}, 52%, ${21 + breath * 2}%)`,
  ];
  const aura = [INK.void, `hsl(${hue}, 38%, 11%)`, `hsl(${hue + 12}, 42%, ${17 + breath * 2}%)`];
  ctx.save();
  ctx.drawImage(floorCache, 0, 0);
  const faces = [];
  const addFace = (points, color, alpha) => faces.push({ points, color, alpha, z: points.reduce((sum, point) => sum + point.z, 0) / points.length });
  const rings = HEIGHTS.map(height => Array.from({ length: SIDES + 1 }, (_, side) => mankatsukiVortexPoint(height, side / SIDES * TAU, time)));
  for (let ring = 0; ring < HEIGHTS.length - 1; ring++) {
    for (let side = 0; side < SIDES; side++) {
      addFace([rings[ring][side], rings[ring][side + 1], rings[ring + 1][side + 1], rings[ring + 1][side]], purple[(side + ring) % purple.length], ring < 3 ? 1 : 0.6);
    }
  }
  for (let ribbon = 0; ribbon < RIBBONS.length; ribbon++) {
    const rows = Array.from({ length: 4 }, (_, stripe) => Array.from({ length: RIBBON_SIDES + 1 }, (_, side) => mankatsukiAuraPoint(stripe / 3 - 0.5, side / RIBBON_SIDES * TAU, time, ribbon)));
    for (let side = 0; side < RIBBON_SIDES; side++) {
      if ((side + ribbon * 3) % 13 < 3) continue;
      for (let stripe = 0; stripe < 3; stripe++) {
        const pigment = (side * 5 + stripe + ribbon) % 9;
        addFace([
          rows[stripe][side], rows[stripe][side + 1],
          rows[stripe + 1][side + 1], rows[stripe + 1][side],
        ], aura[pigment < 4 ? 0 : pigment < 7 ? 1 : 2], ribbon === 0 ? 0.88 : 0.76);
      }
    }
  }
  faces.sort((a, b) => b.z - a.z);
  for (const face of faces) {
    ctx.globalAlpha = face.alpha * (defending ? 0.62 : 1);
    ctx.fillStyle = face.color;
    polygon(ctx, face.points);
  }
  ctx.globalAlpha = 1;
  if (defending) {
    ctx.fillStyle = 'rgba(4,2,9,0.38)';
    ctx.fillRect(0, 0, 480, 360);
  }
  ctx.restore();
}
