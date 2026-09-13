import { makeCanvas } from '../core/gfx.js';

const TAU = Math.PI * 2;
const RINGS = 24;
const SIDES = 48;
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
  const rows = [126, 132, 141, 154, 174, 203, 244, 302, 360];
  for (let row = 0; row < rows.length - 1; row++) {
    const top = rows[row], bottom = rows[row + 1];
    const far = (top - 105) / 100, near = (bottom - 105) / 100;
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
        const scale = (y - 105) / 100;
        ctx.beginPath();
        ctx.moveTo(Math.round(240 + (left + 9 + line * 4) * scale), Math.round(y));
        ctx.lineTo(Math.round(240 + (right - 9 - ((plank + line + 21) % 3) * 8) * scale), Math.round(y));
        ctx.stroke();
      }
    }
  }
  return canvas;
}

/** Perspective projection of a twisting funnel; z recedes into the screen. */
export function mankatsukiVortexPoint(depth, angle, time) {
  const radius = 235 * (1 - depth) + 18;
  const turn = angle + time * 0.38 + depth * 5.4;
  const x = Math.cos(turn) * radius;
  const y = Math.sin(turn) * radius * 0.61;
  const z = 80 + depth * 650 + Math.sin(turn) * radius * 0.28;
  const yaw = Math.sin(time * 0.19) * 0.1;
  const scale = 300 / (300 + z);
  return {
    x: 240 + (x + Math.sin(depth * Math.PI) * 24 + yaw * z) * scale,
    y: 83 + (y + depth * 28) * scale,
    z,
  };
}

/** Dark wooden stage and an animated 3D funnel, drawn below actors and the soul box. */
export function drawMankatsukiBackground(ctx, battle) {
  floorCache ??= buildFloor();
  const time = battle.game.time;
  ctx.save();
  ctx.drawImage(floorCache, 0, 0);
  const rings = Array.from({ length: RINGS + 1 }, (_, ring) =>
    Array.from({ length: SIDES + 1 }, (_, side) => mankatsukiVortexPoint(ring / RINGS, side / SIDES * TAU, time)));
  for (let ring = RINGS - 1; ring >= 0; ring--) {
    const depth = ring / RINGS;
    for (let side = 0; side < SIDES; side++) {
      const bright = Math.floor(side / 6) % 2;
      const shade = (1 - depth) * (bright ? 18 : 8);
      ctx.fillStyle = `rgb(${Math.round(25 + shade * 1.1)},${Math.round(9 + shade * 0.5)},${Math.round(45 + shade * 2.2)})`;
      polygon(ctx, [rings[ring][side], rings[ring][side + 1], rings[ring + 1][side + 1], rings[ring + 1][side]]);
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  if (battle.state === 'dodge') {
    ctx.fillStyle = 'rgba(4,2,9,0.3)';
    ctx.fillRect(0, 0, 480, 246);
  }
  ctx.restore();
}
