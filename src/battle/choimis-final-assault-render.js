import { whiteSprite } from './youngcle-patterns.js';
import { drawPinkPellet, heartPixels, pinkChargeAura } from './modes/choimis-pink-shooter.js';
import { CHOIMIS_FINAL_ASSAULT as C } from '../data/choimis-final-assault.js';

function drawProjectile(ctx, item, image) {
  const x = Math.round(item.x), y = Math.round(item.y), radius = item.r;
  if (image) {
    const width = item.kind.endsWith('Kart') ? 47 : radius * 2 + 8;
    const height = Math.round(width * image.height / image.width);
    ctx.drawImage(image, Math.round(x - width / 2), Math.round(y - height / 2), width, height); return;
  }
  if (item.kind === 'money') {
    ctx.fillStyle = '#ddffbf'; ctx.fillRect(x - 10, y - 6, 20, 12);
    ctx.strokeStyle = '#628450'; ctx.lineWidth = 1; ctx.strokeRect(x - 8, y - 4, 16, 8);
    ctx.fillStyle = '#628450'; ctx.fillRect(x - 2, y - 3, 4, 6); return;
  }
  if (item.kind === 'noodle') {
    ctx.strokeStyle = '#ffe4b8'; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(x - 11, y - 4); ctx.quadraticCurveTo(x - 3, y + 8, x + 4, y - 2);
    ctx.quadraticCurveTo(x + 10, y - 8, x + 12, y + 4); ctx.stroke(); return;
  }
  ctx.save(); ctx.translate(x, y); ctx.rotate(item.age * 2);
  ctx.fillStyle = '#ffd3e8'; ctx.fillRect(-6, -2, 11, 5); ctx.fillRect(-3, -5, 5, 11);
  ctx.fillStyle = '#ff78b5'; ctx.fillRect(-2, -2, 4, 4); ctx.restore();
}

function drawBeam(ctx, beam, elapsed) {
  const warning = beam.age < beam.warn;
  ctx.save(); ctx.strokeStyle = warning ? '#ff87bf' : '#cf195d';
  ctx.lineWidth = warning ? 1 : beam.r * 2;
  if (warning) ctx.setLineDash([5, 6]);
  ctx.beginPath(); ctx.moveTo(beam.from.x, beam.from.y); ctx.lineTo(beam.to.x, beam.to.y); ctx.stroke();
  ctx.setLineDash([]);
  if (!warning) { ctx.strokeStyle = '#ffe4ef'; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.fillStyle = '#ffbad7';
  for (let i = 0; i < 6; i++) {
    const angle = elapsed * 9 + i * Math.PI / 3, r = warning ? 18 * (1 - beam.age / beam.warn) + 3 : 6;
    ctx.fillRect(Math.round(beam.from.x + Math.cos(angle) * r) - 1, Math.round(beam.from.y + Math.sin(angle) * r) - 1, 3, 3);
  }
  ctx.restore();
}

/** Boss coordinates denote the body center shared with projectile collision. */
export function createFinalAssaultRenderer(enemy) {
  const images = { boss: whiteSprite(enemy.img), choso: whiteSprite(enemy.actionImages?.choso),
    capeSwing: whiteSprite(enemy.actionImages?.capeSwing),
    noodle: enemy.projectiles?.jjajang, daoKart: whiteSprite(enemy.projectiles?.daoKart),
    bazziKart: whiteSprite(enemy.projectiles?.bazziKart), money: enemy.projectiles?.money };
  const scale = enemy.def.scale ?? 1, scaleY = enemy.def.scaleY ?? 1;
  return { draw(ctx, state) {
    const { box, boss, heart, elapsed, charge } = state;
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    for (const item of state.hazards) {
      if (item.kind === 'beam') { drawBeam(ctx, item, elapsed); continue; }
      if (item.age < item.warn) {
        ctx.save(); ctx.strokeStyle = '#f878b7'; ctx.lineWidth = 1; ctx.globalAlpha = 0.32 + item.age / item.warn * 0.3;
        ctx.setLineDash([3, 11]); ctx.beginPath(); ctx.moveTo(box.x + 3, item.y); ctx.lineTo(box.x + box.w - 8, item.y); ctx.stroke(); ctx.restore();
      } else drawProjectile(ctx, item, images[item.kind]);
    }
    const sheet = boss.pose?.sheet || (state.stage > 0 ? 'choso' : 'idle');
    const action = sheet === 'idle' ? null : enemy.def.actions?.[sheet];
    const image = sheet !== 'idle' && images[sheet] ? images[sheet] : images.boss;
    if (image) {
      const spec = action && images[sheet] ? action : enemy.def.sheet;
      const cols = spec?.cols ?? 2, rows = spec?.rows ?? 2;
      const cellWidth = image.width / cols, cellHeight = image.height / rows;
      const pivot = spec?.pivot ?? enemy.def.pivot ?? [72, 152];
      const frame = action && images[sheet] ? Math.min(boss.pose?.frame ?? 0, (spec.count ?? 4) - 1)
        : Math.floor(elapsed * (spec?.fps ?? 4.5)) % (spec?.count ?? 4);
      const width = Math.round(cellWidth * scale), height = Math.round(cellHeight * scale * scaleY);
      ctx.globalAlpha = boss.flash > 0 ? 0.6 : 1;
      ctx.drawImage(image, frame % cols * cellWidth, Math.floor(frame / cols) * cellHeight, cellWidth, cellHeight,
        Math.round(boss.x - pivot[0] * scale), Math.round(boss.y - (pivot[1] - C.bossBodyHeight / 2) * scale * scaleY), width, height);
      ctx.globalAlpha = 1;
    }
    for (const shot of state.shots) drawPinkPellet(ctx, shot);
    for (const effect of state.effects) {
      ctx.globalAlpha = Math.min(1, effect.life / 0.2); ctx.fillStyle = '#fff';
      ctx.fillRect(Math.round(effect.x) - 2, Math.round(effect.y) - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
    if (charge.active) {
      ctx.fillStyle = charge.ready ? '#fff' : '#ff9ccd';
      for (const streak of pinkChargeAura(heart.x, heart.y, charge.progress, elapsed)) {
        ctx.save(); ctx.translate(Math.round(streak.x), Math.round(streak.y)); ctx.rotate(streak.angle); ctx.fillRect(-3, -1, 6, 3); ctx.restore();
      }
    }
    if (heart.invuln <= 0 || Math.floor(elapsed * 16) % 2 === 0) {
      ctx.fillStyle = '#ff5ca8';
      for (const pixel of heartPixels('right')) ctx.fillRect(Math.round(heart.x + pixel.x), Math.round(heart.y + pixel.y), 1, 1);
    }
    ctx.restore();
  } };
}
