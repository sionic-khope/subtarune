import { makeCanvas } from '../core/gfx.js';

const TAU = Math.PI * 2;
const SIDES = 12;
const HEIGHTS = [0, 0.3, 0.35, 0.5, 0.65, 0.7, 1];
const WALL_WIDTH = 256;
const WALL_HEIGHT = 128;
const WALL_INK = ['#10091d', '#1c0e30', '#30174d', '#482268', '#613581', '#392052'];
const INK = {
  void: '#08050f',
  wood: ['#281b24', '#302029', '#251a23', '#32212a'],
  seam: '#100c13',
  grain: '#49303b',
};
let floorCache;
let wallCache;

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

function buildWall() {
  const canvas = makeCanvas(WALL_WIDTH * 2, WALL_HEIGHT), ctx = canvas.getContext('2d');
  for (let y = 0; y < WALL_HEIGHT; y += 2) {
    for (let x = 0; x < WALL_WIDTH; x += 2) {
      const u = x / WALL_WIDTH * TAU, v = y / WALL_HEIGHT * TAU;
      const wave = Math.sin(u * 4 + Math.sin(v * 2) * 2.4)
        + Math.cos(v * 3 + Math.sin(u * 2) * 1.8);
      const pigment = Math.min(WALL_INK.length - 1, Math.floor((wave + 2) * WALL_INK.length / 4));
      ctx.fillStyle = WALL_INK[pigment];
      ctx.fillRect(x, y, 2, 2);
      ctx.fillRect(x + WALL_WIDTH, y, 2, 2);
    }
  }
  return canvas;
}

/** Seamless texture coordinates drift continuously while the room's wall boundaries stay fixed. */
export function mankatsukiWallRow(y, time) {
  const wrap = (value, size) => ((value % size) + size) % size;
  return {
    x: Math.floor(wrap(time * 24 + Math.sin(y * 0.041 - time * 1.15) * 30 + Math.sin(y * 0.093 + time * 0.63) * 12, WALL_WIDTH)),
    y: Math.floor(wrap(y * 0.65 + time * 8 + Math.sin(y * 0.027 + time * 0.72) * 12, WALL_HEIGHT)),
    sideWidth: Math.round(146 - Math.max(0, y - 88) * 0.77),
  };
}

function drawWalls(ctx, time, defending) {
  ctx.globalAlpha = defending ? 0.62 : 1;
  for (let y = 0; y < 246; y += 2) {
    const row = mankatsukiWallRow(y, time);
    if (y < 88) {
      ctx.drawImage(wallCache, row.x, row.y, WALL_WIDTH, 1, 0, y, 480, 2);
    } else {
      ctx.drawImage(wallCache, row.x, row.y, WALL_WIDTH, 1, 0, y, row.sideWidth, 2);
      ctx.drawImage(wallCache, WALL_WIDTH - row.x, row.y, WALL_WIDTH, 1, 480 - row.sideWidth, y, row.sideWidth, 2);
    }
  }
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
  const turn = angle + time * 3.072 + level * (0.65 + Math.sin(time * 0.61) * 0.6) + Math.sin(level * Math.PI) * Math.sin(time * 0.87) * 0.35;
  const bend = level * 34 * Math.sin(time * 0.53 + level * 1.9) + distance * distance * 24 * Math.sin(time * 0.37);
  return project(
    bend + Math.cos(turn) * radius,
    level * 170 + distance * Math.sin(angle * 2 + time * 0.47) * 20,
    Math.sin(turn) * radius + level * 8 * Math.sin(time * 0.41),
    720 + Math.sin(time * 0.39) * 18,
  );
}

/** A rotating purple hourglass inside drifting patterned walls, below actors and the soul box. */
export function drawMankatsukiBackground(ctx, battle) {
  floorCache ??= buildFloor();
  wallCache ??= buildWall();
  const time = battle.game.time;
  const defending = ['enemy-prep', 'bullets', 'board-close'].includes(battle.state);
  const breath = (Math.sin(time * 0.32) + 1) / 2;
  const hue = 267 + breath * 28;
  const purple = [
    `hsl(${hue}, 62%, ${16 + breath * 3}%)`,
    `hsl(${hue + 7}, 49%, ${27 + breath * 3}%)`,
    `hsl(${hue - 8}, 52%, ${21 + breath * 2}%)`,
  ];
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.drawImage(floorCache, 0, 0);
  drawWalls(ctx, time, defending);
  const faces = [];
  const addFace = (points, color, alpha) => faces.push({ points, color, alpha, z: points.reduce((sum, point) => sum + point.z, 0) / points.length });
  const rings = HEIGHTS.map(height => Array.from({ length: SIDES + 1 }, (_, side) => mankatsukiVortexPoint(height, side / SIDES * TAU, time)));
  for (let ring = 0; ring < HEIGHTS.length - 1; ring++) {
    for (let side = 0; side < SIDES; side++) {
      addFace([rings[ring][side], rings[ring][side + 1], rings[ring + 1][side + 1], rings[ring + 1][side]], purple[(side + ring) % purple.length], ring < 3 ? 1 : 0.82);
    }
  }
  faces.sort((a, b) => b.z - a.z);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 480, 167);
  ctx.clip();
  for (const face of faces) {
    ctx.globalAlpha = face.alpha * (defending ? 0.8 : 1);
    ctx.fillStyle = face.color;
    polygon(ctx, face.points);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  if (defending) {
    ctx.fillStyle = 'rgba(4,2,9,0.38)';
    ctx.fillRect(0, 0, 480, 360);
  }
  ctx.restore();
}
