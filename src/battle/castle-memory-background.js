/** BUILD308: low-contrast rotating aura remains behind actors and the attack board. */
export function drawCastleMemoryBackground(ctx, battle) {
  const t = battle.game?.time ?? battle.t ?? 0;
  ctx.save(); ctx.fillStyle = '#08090d'; ctx.fillRect(0, 0, 480, 360);
  ctx.beginPath(); ctx.rect(0, 0, 480, 246); ctx.clip();
  ctx.translate(300, 132); ctx.scale(1.4, 0.7); ctx.rotate(t * 0.12);
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = i % 2 ? '#352044' : '#1b1027'; ctx.globalAlpha = 0.28;
    ctx.lineWidth = 6 + i % 3; ctx.beginPath();
    ctx.arc(0, 0, 40 + i * 15, i * 0.7, i * 0.7 + Math.PI * 1.15); ctx.stroke();
  }
  ctx.restore();
}
