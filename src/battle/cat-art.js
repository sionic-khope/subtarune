const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function segmentDistance(soul, from, to) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const u = clamp(((soul.x - from.x) * dx + (soul.y - from.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(soul.x - from.x - dx * u, soul.y - from.y - dy * u);
}

/** Cat attacks share their visible centerline with collision; warnings are always harmless. */
export function hitCat(b, soul) {
  if (b.age < b.warn) return false;
  const points = b.points(b), radius = Math.max(0, soul.r - 2);
  if (b.shape === 'cat_paw' || b.shape === 'cat_fish') return Math.hypot(soul.x - b.x, soul.y - b.y) <= b.r + radius;
  if (b.shape === 'cat_yarn' && Math.hypot(soul.x - b.x, soul.y - b.y) <= b.r + radius) return true;
  if (b.shape === 'cat_forepaw' && Math.hypot(soul.x - points.at(-1).x, soul.y - points.at(-1).y) <= b.r + radius) return true;
  return points.some((point, i) => i > 0 && segmentDistance(soul, points[i - 1], point) <= b.thick / 2 + radius);
}

function path(ctx, points) {
  ctx.beginPath();
  points.forEach((point, i) => i ? ctx.lineTo(Math.round(point.x), Math.round(point.y)) : ctx.moveTo(Math.round(point.x), Math.round(point.y)));
}

function paw(ctx, x, y, r, warning) {
  const scale = r / 20;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(scale, scale);
  ctx.fillStyle = warning ? '#a55563' : '#fff0d4';
  ctx.strokeStyle = '#402d38'; ctx.lineWidth = 1 / scale;
  for (const [px, py, size] of [[-12, -10, 5], [-4, -15, 5], [5, -15, 5], [13, -9, 5], [0, 5, 12]]) {
    ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = warning ? '#ff9da8' : '#e5a79e'; ctx.fillRect(-5, 2, 10, 7);
  ctx.restore();
}

/** Pixel-sized cat silhouettes, clipped to the same board used by the battle engine. */
export function drawCat(ctx, b) {
  const warning = b.age < b.warn, points = b.points(b);
  ctx.save(); ctx.beginPath(); ctx.rect(b.box.x + 3, b.box.y + 3, b.box.w - 6, b.box.h - 6); ctx.clip();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (warning) {
    ctx.globalAlpha = 0.65 + Math.sin(b.age * 22) * 0.2;
    ctx.strokeStyle = '#ff8a99'; ctx.lineWidth = Math.max(1, b.thick); ctx.setLineDash([3, 4]);
    path(ctx, b.guide ? b.guide(b) : points); ctx.stroke(); ctx.setLineDash([]);
  } else if (points.length > 1) {
    ctx.strokeStyle = '#342c42'; ctx.lineWidth = b.thick + 2; path(ctx, points); ctx.stroke();
    ctx.strokeStyle = b.shape === 'cat_tail' ? '#ddd1f1' : b.shape === 'cat_yarn' ? '#e8a7d6' : '#fff0d4';
    ctx.lineWidth = b.thick; path(ctx, points); ctx.stroke();
  }
  if (b.shape === 'cat_paw') {
    if (warning) {
      ctx.strokeStyle = '#ff8a99'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(Math.round(b.x), Math.round(b.y), b.r, 0, Math.PI * 2); ctx.stroke();
    }
    paw(ctx, b.x, b.y, b.r, warning);
  }
  if (b.shape === 'cat_forepaw') paw(ctx, points.at(-1).x, points.at(-1).y, b.r, warning);
  if (b.shape === 'cat_yarn') {
    ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(b.rot);
    ctx.fillStyle = warning ? '#945278' : '#e8a7d6'; ctx.strokeStyle = '#462b50'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#fff0fb';
    for (const offset of [-4, 0, 4]) { ctx.beginPath(); ctx.moveTo(-6, offset - 3); ctx.lineTo(6, offset + 3); ctx.stroke(); }
  }
  if (b.shape === 'cat_fish') {
    ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(b.rot);
    ctx.fillStyle = warning ? '#648da0' : '#b9e8ed'; ctx.strokeStyle = '#294152'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-5, -6); ctx.lineTo(6, -5); ctx.lineTo(11, -9);
    ctx.lineTo(11, 9); ctx.lineTo(6, 5); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#294152'; ctx.fillRect(-6, -2, 2, 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(-2, -4, 5, 2);
  }
  ctx.restore();
}
