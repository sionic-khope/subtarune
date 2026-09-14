import { makeCanvas } from '../core/gfx.js';
import { getTile, tileCanvas } from '../world/tiles.js';

const TRUSS = 'assets/props/editor-union-truss.png';
const WALL = 'assets/props/editor-union-wall-panel.png';
const LIGHTS = [{ x: 100, phase: 0 }, { x: 380, phase: Math.PI * 0.7 }];
let floorCache;
let beamCache;

/** Two mounted lights sweep the iron stage continuously, independent of attack state. */
export function parkStageLight(index, time) {
  const mount = LIGHTS[index];
  const targetX = 240 + Math.sin(time * 0.56 + mount.phase) * 143;
  return { x: mount.x, y: 42, targetX, targetY: 228,
    angle: Math.atan2(mount.x - targetX, 186), length: Math.hypot(targetX - mount.x, 186) };
}

function buildFloor() {
  const canvas = makeCanvas(480, 360), ctx = canvas.getContext('2d');
  ctx.fillStyle = '#09121c';
  ctx.fillRect(0, 0, 480, 360);
  ctx.fillStyle = ctx.createPattern(tileCanvas(getTile('I')), 'repeat');
  ctx.fillRect(0, 78, 480, 282);
  ctx.fillStyle = 'rgba(4,9,16,0.53)';
  ctx.fillRect(0, 78, 480, 282);
  ctx.fillStyle = '#233849';
  ctx.fillRect(0, 77, 480, 2);
  return canvas;
}

function buildBeam() {
  const canvas = makeCanvas(192, 256), ctx = canvas.getContext('2d');
  for (let y = 0; y < 256; y++) {
    const halfWidth = 4 + y * 0.34;
    const alpha = 0.18 * Math.sin(Math.PI * (y + 1) / 257) ** 0.65;
    const edge = ctx.createLinearGradient(96 - halfWidth, 0, 96 + halfWidth, 0);
    edge.addColorStop(0, 'rgba(255,208,100,0)');
    edge.addColorStop(0.32, `rgba(255,208,100,${alpha})`);
    edge.addColorStop(0.68, `rgba(255,208,100,${alpha})`);
    edge.addColorStop(1, 'rgba(255,208,100,0)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, y, 192, 1);
  }
  return canvas;
}

/** Same ship floor and stage equipment; warm beams stay beneath actors, bullets and HUD. */
export function drawParkGuardianBackground(ctx, battle) {
  floorCache ??= buildFloor();
  beamCache ??= buildBeam();
  const images = battle.game.propImages;
  const defending = ['enemy-prep', 'bullets', 'board-close'].includes(battle.state);
  ctx.save();
  ctx.drawImage(floorCache, 0, 0);
  if (images[WALL]) {
    ctx.globalAlpha = 0.4;
    for (const x of [0, 128, 256, 384]) ctx.drawImage(images[WALL], x, 0, 128, 76);
    ctx.globalAlpha = 1;
  }
  if (images[TRUSS]) ctx.drawImage(images[TRUSS], 0, 0, 218, 39, 0, 2, 480, 28);
  for (let index = 0; index < LIGHTS.length; index++) {
    const light = parkStageLight(index, battle.game.time);
    ctx.save();
    ctx.globalAlpha = defending ? 0.55 : 1;
    ctx.translate(light.x, light.y);
    ctx.rotate(light.angle);
    ctx.drawImage(beamCache, -96, 0, 192, light.length);
    ctx.restore();
    if (images[TRUSS]) ctx.drawImage(images[TRUSS], 0, 39, 48, 73, light.x - 14, 19, 28, 43);
  }
  ctx.restore();
}
