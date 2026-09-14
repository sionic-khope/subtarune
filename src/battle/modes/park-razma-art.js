import { PARK_RAZMA as C } from '../../data/park-razma.js';
import { FONT } from '../../ui/font.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** One shared local rectangle drives both text-ribbon drawing and collision. */
export function razmaLaserGeometry(shot, time) {
  const age = time - shot.at, fired = age >= C.shots.warning;
  if (!shot.target || age < 0 || age >= C.shots.warning + C.shots.fire) return null;
  const dx = shot.target.x - C.origin.x, dy = shot.target.y - C.origin.y;
  const angle = Math.atan2(dy || (dx ? 0 : 1), dx);
  const length = fired ? Math.min(C.shots.length, (age - C.shots.warning) * C.shots.speed) : C.shots.length;
  return { x: C.origin.x, y: C.origin.y, angle, length, width: shot.glitch ? C.shots.glitchWidth : C.shots.width, fired, age };
}

/** Circle against the exact visible beam strip, never against a warning or sprite. */
export function razmaLaserHits(geometry, soul) {
  if (!geometry?.fired) return false;
  const dx = soul.x - geometry.x, dy = soul.y - geometry.y;
  const x = dx * Math.cos(geometry.angle) + dy * Math.sin(geometry.angle);
  const y = -dx * Math.sin(geometry.angle) + dy * Math.cos(geometry.angle);
  const ex = x - clamp(x, 0, geometry.length), ey = y - clamp(y, -geometry.width / 2, geometry.width / 2);
  return ex * ex + ey * ey <= Math.max(0, soul.r - 2) ** 2;
}

/** Draw the expanded arena's summoned upper body and localized laser typography. */
export function drawRazmaArt(ctx, image, state) {
  const { phase, phaseTime, activeElapsed, shots } = state;
  const visible = ['summon', 'effect', 'active', 'leave'].includes(phase);
  if (visible && image) {
    const k = phase === 'summon' ? clamp(phaseTime / C.seconds.summon, 0, 1) : 1;
    const exit = phase === 'leave' ? 1 - clamp(phaseTime / C.seconds.leave, 0, 1) : 1;
    const frame = phase === 'active' ? Math.floor(activeElapsed * C.fps) % C.frames : Math.min(3, Math.floor(k * 4));
    const x = C.actor.x - C.pivot[0], y = C.actor.y - C.pivot[1];
    ctx.save(); ctx.globalAlpha = k * exit;
    ctx.beginPath(); ctx.rect(x, y + C.cell * (1 - k), C.cell, C.cell * k); ctx.clip();
    ctx.drawImage(image, frame % C.cols * C.cell, Math.floor(frame / C.cols) * C.cell, C.cell, C.cell, x, y, C.cell, C.cell);
    ctx.restore();
    if (phase === 'summon' || phase === 'effect') {
      const age = phase === 'summon' ? k : 1 + phaseTime / C.seconds.effect;
      ctx.save(); ctx.globalAlpha = phase === 'effect' ? 1 - phaseTime / C.seconds.effect : k;
      ctx.strokeStyle = '#ff82b0'; ctx.lineWidth = 2;
      const radius = 20 + age * 35;
      ctx.beginPath(); ctx.ellipse(C.actor.x, C.actor.y - 3, radius, radius * 0.2, 0, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6 + age;
        ctx.fillStyle = i % 2 ? '#ffffff' : '#ff82b0';
        ctx.fillRect(Math.round(C.actor.x + Math.cos(a) * radius), Math.round(C.actor.y - 20 - Math.sin(a) * radius - age * 18), 2, 4);
      }
      ctx.restore();
    }
  }
  if (phase !== 'active') return;
  ctx.save(); ctx.beginPath(); ctx.rect(C.board.x + 3, C.board.y + 3, C.board.w - 6, C.board.h - 6); ctx.clip();
  for (const shot of shots) {
    const g = razmaLaserGeometry(shot, activeElapsed);
    if (!g) continue;
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.angle);
    if (!g.fired) {
      ctx.strokeStyle = shot.glitch ? '#ff82b0' : '#d0a7ce'; ctx.lineWidth = 1;
      ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(g.length, 0); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeRect(0, -g.width / 2, Math.min(32, g.length), g.width);
    } else {
      ctx.fillStyle = shot.glitch ? '#672d4a' : '#493343';
      ctx.fillRect(0, -g.width / 2, g.length, g.width);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -1, g.length, 2);
      ctx.beginPath(); ctx.rect(0, -g.width / 2, g.length, g.width); ctx.clip();
      const text = shot.glitch ? C.text.glitch : C.text.scream;
      ctx.font = FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const pitch = ctx.measureText(text).width + 24;
      const scroll = (g.age - C.shots.warning) * 240 % pitch;
      for (let x = scroll - pitch; x < g.length; x += pitch) {
        if (shot.glitch) {
          const j = Math.floor(activeElapsed * 18) % 3 - 1;
          ctx.fillStyle = '#ff326a'; ctx.fillText(text, Math.round(x + j * 4), -3);
          ctx.fillStyle = '#71eafa'; ctx.fillText(text, Math.round(x - j * 4), 3);
        }
        ctx.fillStyle = '#fff'; ctx.fillText(text, Math.round(x), 0);
      }
    }
    ctx.restore();
  }
  ctx.restore();
}
