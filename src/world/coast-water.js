const WATER = { deep: '#061b39', trough: '#082544', wave: '#16446b', light: '#76a3bc' };

function outline(ctx, points, cam) {
  ctx.beginPath();
  points.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](Math.round(x - cam.x), Math.round(y - cam.y)));
  ctx.closePath();
}

/** Draw the map's local inlets beneath its existing banks, with world-anchored wavelets. */
export function drawCoastWater(ctx, coast, cam, time) {
  for (const inlet of coast?.nearWater || []) {
    const { polygon, shore } = inlet;
    const left = Math.min(...polygon.map(p => p[0])), right = Math.max(...polygon.map(p => p[0]));
    const top = Math.min(...polygon.map(p => p[1])), bottom = Math.max(...polygon.map(p => p[1]));
    if (right < cam.x || left > cam.x + 480 || bottom < cam.y || top > cam.y + 360) continue;
    ctx.save();
    outline(ctx, polygon, cam); ctx.clip();
    const depth = ctx.createLinearGradient(0, top - cam.y, 0, bottom - cam.y);
    depth.addColorStop(0, '#061b3900');
    depth.addColorStop(32 / (bottom - top), WATER.deep);
    depth.addColorStop(1 - 48 / (bottom - top), WATER.deep);
    depth.addColorStop(1, '#061b3900');
    ctx.fillStyle = depth;
    ctx.fillRect(Math.round(left - cam.x), Math.round(top - cam.y), right - left, bottom - top);
    for (let y = Math.floor(Math.max(top, cam.y) / 12) * 12; y < Math.min(bottom, cam.y + 360); y += 12) {
      const row = Math.floor(y / 12), drift = Math.round(Math.sin(time * 1.1 + row) * 3);
      for (let x = Math.floor(Math.max(left, cam.x - 48) / 48) * 48; x < Math.min(right, cam.x + 480); x += 48) {
        const seed = Math.abs(Math.floor(x / 48) * 17 + row * 31);
        const waveX = x + seed % 25 + drift, waveY = y + seed % 5;
        ctx.globalAlpha = Math.max(0, Math.min(1, (waveY - top) / 32, (bottom - waveY) / 48));
        ctx.fillStyle = seed % 7 === 0 ? WATER.light : seed % 3 ? WATER.wave : WATER.trough;
        ctx.fillRect(Math.round(waveX - cam.x), Math.round(waveY - cam.y), 5 + seed % 13, 1);
        ctx.fillStyle = WATER.trough;
        ctx.fillRect(Math.round(waveX - cam.x + 3), Math.round(waveY - cam.y + 2), 12 + seed % 19, 1);
      }
    }
    ctx.restore();
    ctx.fillStyle = WATER.light;
    for (const x of shore) {
      for (let y = inlet.bankY + 3; y < inlet.bankY + 72; y += 13) {
        ctx.fillRect(Math.round(x - cam.x), Math.round(y - cam.y), 2, 5);
        ctx.fillRect(Math.round(x - cam.x - 3), Math.round(y - cam.y + 5), 7, 1);
      }
    }
  }
}

/** Contact ripples follow the actual raft and submerged companion positions. */
export function drawCoastWake(ctx, coast, entities, cam, time, edge) {
  if (!coast?.nearWater) return;
  if (edge) {
    for (const inlet of coast.nearWater) {
      for (const x of inlet.shore) {
        ctx.drawImage(edge, Math.round(x - 6 - cam.x), Math.round(inlet.bankY + 52 - cam.y), 12, 16);
      }
    }
  }
  ctx.fillStyle = WATER.light;
  for (const e of entities) {
    if (e.dead || !e.visible || !['raft', 'swimmer'].includes(e.def?.type)) continue;
    const y = e.y + e.h, width = e.w;
    const spread = Math.round(Math.sin(time * 3 + e.x) * 2);
    ctx.fillRect(Math.round(e.x - cam.x - 4), Math.round(y - cam.y + 1), width + 8, 1);
    ctx.fillStyle = WATER.wave;
    ctx.fillRect(Math.round(e.x - cam.x - 9 - spread), Math.round(y - cam.y + 4), width + 18 + spread * 2, 1);
    ctx.fillStyle = WATER.light;
    ctx.fillRect(Math.round(e.x - cam.x - 6), Math.round(y - cam.y - 2), 7, 1);
    ctx.fillRect(Math.round(e.x + width - cam.x), Math.round(y - cam.y - 1), 7, 1);
  }
}
