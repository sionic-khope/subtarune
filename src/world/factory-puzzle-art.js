import { FONT } from '../ui/font.js';

export const FACTORY_ART_COLORS = Object.freeze({
  outline: '#182535',
  shadow: '#1a2635',
  recess: '#1b2938',
  deep: '#25364a',
  side: '#26384d',
  faceDark: '#27394e',
  wireOff: '#263c52',
  body: '#43566e',
  panel: '#536a82',
  edge: '#71849b',
  lip: '#8da0b7',
  highlight: '#a8bad0',
  pale: '#d8edf4',
  amber: '#d9a840',
  amberBright: '#f0be45',
  green: '#65f2d0',
  greenBright: '#b4fff4',
  plasma: '#e958ff',
});

const C = FACTORY_ART_COLORS;

function screenRect(cam, entity) {
  return {
    x: Math.round(entity.x - cam.x),
    y: Math.round(entity.y - cam.y),
    w: Math.round(entity.w),
    h: Math.round(entity.h),
  };
}

function drawRivet(ctx, x, y) {
  ctx.fillStyle = C.outline;
  ctx.fillRect(x, y, 3, 3);
  ctx.fillStyle = C.highlight;
  ctx.fillRect(x, y, 2, 1);
  ctx.fillRect(x, y, 1, 2);
}

function drawSteppedBrace(ctx, x1, y1, x2, y2) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  ctx.fillStyle = C.lip;
  for (let step = 0; step <= steps; step += 2) {
    const x = Math.round(x1 + ((x2 - x1) * step) / steps);
    const y = Math.round(y1 + ((y2 - y1) * step) / steps);
    ctx.fillRect(x, y, 3, 2);
  }
}

export function drawFactoryCrate(ctx, cam, entity) {
  const { x, y, w, h } = screenRect(cam, entity);
  const frontW = w - 4;

  ctx.fillStyle = C.shadow;
  ctx.fillRect(x + 3, y + h - 2, w, 5);

  ctx.fillStyle = C.outline;
  ctx.fillRect(x, y - 6, w, h + 6);
  ctx.fillStyle = C.side;
  ctx.fillRect(x + frontW, y - 3, 4, h + 3);
  ctx.fillStyle = C.edge;
  ctx.fillRect(x + 2, y - 4, frontW - 2, 5);
  ctx.fillStyle = C.highlight;
  ctx.fillRect(x + 4, y - 4, frontW - 6, 2);
  ctx.fillStyle = C.body;
  ctx.fillRect(x + 2, y + 1, frontW - 2, h - 3);
  ctx.fillStyle = C.faceDark;
  ctx.fillRect(x + 5, y + 4, frontW - 8, h - 9);

  drawSteppedBrace(ctx, x + 6, y + 5, x + frontW - 6, y + h - 6);
  drawSteppedBrace(ctx, x + frontW - 7, y + 5, x + 5, y + h - 6);
  for (const [rx, ry] of [[3, 2], [frontW - 4, 2], [3, h - 5], [frontW - 4, h - 5]]) {
    drawRivet(ctx, x + rx, y + ry);
  }
}

export function drawFactoryPressurePlate(ctx, cam, entity, pressed) {
  const { x, y, w, h } = screenRect(cam, entity);
  const state = pressed ? C.green : C.amber;
  const stateBright = pressed ? C.greenBright : C.amberBright;

  ctx.fillStyle = C.shadow;
  ctx.fillRect(x + 2, y + h - 1, w - 2, 3);
  ctx.fillStyle = C.outline;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = state;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = C.recess;
  ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
  ctx.fillStyle = pressed ? C.deep : C.body;
  ctx.fillRect(x + 8, y + 8, w - 16, h - 16);

  const centerX = x + Math.floor(w / 2);
  const centerY = y + Math.floor(h / 2);
  ctx.fillStyle = stateBright;
  ctx.fillRect(centerX - 2, centerY - 8, 4, 2);
  ctx.fillRect(centerX - 5, centerY - 6, 10, 2);
  ctx.fillRect(centerX - 8, centerY - 4, 4, 8);
  ctx.fillRect(centerX + 4, centerY - 4, 4, 8);
  ctx.fillRect(centerX - 5, centerY + 4, 10, 2);
  ctx.fillRect(centerX - 2, centerY + 6, 4, 2);
  for (const [cx, cy] of [[2, 2], [w - 5, 2], [2, h - 5], [w - 5, h - 5]]) {
    ctx.fillRect(x + cx, y + cy, 3, 3);
  }
}

export function drawFactoryConsole(ctx, cam, entity) {
  const { x, y, w, h } = screenRect(cam, entity);

  ctx.fillStyle = C.shadow;
  ctx.fillRect(x + 3, y + h - 2, w, 5);
  ctx.fillStyle = C.outline;
  ctx.fillRect(x, y - 10, w, h + 10);
  ctx.fillStyle = C.side;
  ctx.fillRect(x + w - 4, y - 6, 4, h + 6);
  ctx.fillStyle = C.edge;
  ctx.fillRect(x + 2, y - 8, w - 6, 10);
  ctx.fillStyle = C.highlight;
  ctx.fillRect(x + 4, y - 7, w - 10, 2);
  ctx.fillStyle = C.body;
  ctx.fillRect(x + 2, y + 2, w - 6, h - 4);
  ctx.fillStyle = C.faceDark;
  ctx.fillRect(x + 6, y + 7, w - 14, h - 11);

  ctx.fillStyle = C.amberBright;
  ctx.fillRect(x + 7, y - 5, 10, 2);
  ctx.fillRect(x + 5, y - 3, 3, 5);
  ctx.fillRect(x + 7, y, 8, 2);
  ctx.fillRect(x + 14, y - 1, 3, 3);
  ctx.fillRect(x + 15, y - 3, 5, 2);
  ctx.fillRect(x + 18, y - 5, 2, 4);
}

function drawClosedBulkheadFrame(ctx, { x, y, w, h }) {
  const post = Math.min(8, Math.max(5, Math.floor(w / 3)));
  ctx.fillStyle = C.shadow;
  ctx.fillRect(x - 5, y + 3, w + 10, h);
  ctx.fillStyle = C.outline;
  ctx.fillRect(x - 6, y - 4, post + 6, h + 8);
  ctx.fillRect(x + w - post, y - 4, post + 6, h + 8);
  ctx.fillRect(x - 4, y - 6, w + 8, 8);
  ctx.fillStyle = C.panel;
  ctx.fillRect(x - 3, y - 2, post, h + 4);
  ctx.fillRect(x + w - post, y - 2, post, h + 4);
  ctx.fillStyle = C.lip;
  ctx.fillRect(x - 3, y - 2, 2, h + 2);
  ctx.fillRect(x + w - post, y - 2, 2, h + 2);
  ctx.fillRect(x - 2, y - 4, w + 4, 2);
  ctx.fillStyle = C.amberBright;
  ctx.fillRect(x - 1, y + 5, 3, 7);
  ctx.fillRect(x + w - 2, y + 5, 3, 7);
}

export function drawFactoryGate(ctx, cam, entity, open) {
  const { x, y, w, h } = screenRect(cam, entity);
  if (open) {
    ctx.fillStyle = C.shadow;
    ctx.fillRect(x - 5, y - 3, w + 10, 13);
    ctx.fillRect(x - 5, y + h - 7, w + 10, 13);
    ctx.fillStyle = C.outline;
    ctx.fillRect(x - 6, y - 6, w + 12, 14);
    ctx.fillRect(x - 6, y + h - 8, w + 12, 14);
    ctx.fillStyle = C.panel;
    ctx.fillRect(x - 3, y - 3, w + 6, 8);
    ctx.fillRect(x - 3, y + h - 5, w + 6, 8);
    ctx.fillStyle = C.lip;
    ctx.fillRect(x - 3, y - 3, w + 6, 2);
    ctx.fillRect(x - 3, y + h - 5, w + 6, 2);
    ctx.fillStyle = C.greenBright;
    ctx.fillRect(x + Math.floor(w / 2) - 4, y, 8, 3);
    ctx.fillRect(x + Math.floor(w / 2) - 4, y + h - 3, 8, 3);
    return;
  }
  drawClosedBulkheadFrame(ctx, { x, y, w, h });

  if (entity.def.style === 'plasma') {
    ctx.fillStyle = C.deep;
    ctx.fillRect(x + 6, y + 2, w - 12, h - 4);
    ctx.fillStyle = C.plasma;
    for (let line = 7; line < w - 6; line += 5) ctx.fillRect(x + line, y + 2, 2, h - 4);
    ctx.fillStyle = C.pale;
    for (let spark = 10; spark < h - 4; spark += 20) ctx.fillRect(x + 7, y + spark, w - 14, 2);
    return;
  }

  ctx.fillStyle = C.outline;
  ctx.fillRect(x + 5, y, w - 10, h);
  ctx.fillStyle = C.body;
  ctx.fillRect(x + 7, y + 2, w - 14, h - 4);
  for (let seam = 12; seam < h; seam += 16) {
    ctx.fillStyle = C.faceDark;
    ctx.fillRect(x + 7, y + seam, w - 14, 4);
    ctx.fillStyle = C.edge;
    ctx.fillRect(x + 8, y + seam, w - 16, 1);
  }
  ctx.fillStyle = C.side;
  ctx.fillRect(x + w - 9, y + 2, 2, h - 4);
}

export function drawFactoryBulkhead(ctx, cam, entity) {
  const { x, y, w, h } = screenRect(cam, entity);
  ctx.fillStyle = C.shadow;
  ctx.fillRect(x + 3, y + 3, w, h);
  ctx.fillStyle = C.outline;
  ctx.fillRect(x, y - 4, w, h + 4);
  ctx.fillStyle = C.body;
  ctx.fillRect(x + 2, y, w - 4, h - 2);
  ctx.fillStyle = C.edge;
  ctx.fillRect(x + 2, y - 2, w - 6, 4);
  ctx.fillStyle = C.highlight;
  ctx.fillRect(x + 4, y - 2, w - 10, 1);
  ctx.fillStyle = C.side;
  ctx.fillRect(x + w - 5, y, 3, h - 2);
  for (let seam = 12; seam < h - 3; seam += 16) {
    ctx.fillStyle = C.faceDark;
    ctx.fillRect(x + 3, y + seam, w - 8, 3);
  }
  drawRivet(ctx, x + 4, y + 4);
  drawRivet(ctx, x + w - 8, y + 4);
}

export function drawFactorySign(ctx, cam, entity) {
  const { x, y, w, h } = screenRect(cam, entity);
  const boardW = Math.max(54, w + 22);
  const boardX = x + Math.round((w - boardW) / 2);
  const boardY = y - 22;

  ctx.fillStyle = C.shadow;
  ctx.fillRect(x + Math.round(w / 2) - 3, y - 1, 9, h + 4);
  ctx.fillStyle = C.outline;
  ctx.fillRect(x + Math.round(w / 2) - 3, boardY + 22, 6, h);
  ctx.fillStyle = C.edge;
  ctx.fillRect(x + Math.round(w / 2) - 1, boardY + 22, 2, h);
  ctx.fillStyle = C.outline;
  ctx.fillRect(boardX, boardY, boardW, 24);
  ctx.fillStyle = C.side;
  ctx.fillRect(boardX + boardW - 5, boardY + 3, 3, 19);
  ctx.fillStyle = C.panel;
  ctx.fillRect(boardX + 3, boardY + 3, boardW - 9, 17);
  ctx.fillStyle = C.lip;
  ctx.fillRect(boardX + 3, boardY + 2, boardW - 7, 2);
  drawRivet(ctx, boardX + 4, boardY + 5);
  drawRivet(ctx, boardX + boardW - 9, boardY + 5);

  ctx.save();
  ctx.font = FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = C.amberBright;
  ctx.fillText(entity.def.icon ?? '?', boardX + 13, boardY + 3);
  ctx.fillStyle = C.pale;
  ctx.fillText(entity.def.label ?? '안내', boardX + 34, boardY + 3);
  ctx.restore();
}
