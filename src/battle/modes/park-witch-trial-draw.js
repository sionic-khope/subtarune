import { PARK_WITCH_TRIAL as C } from '../../data/park-witch-trial.js';
import { FONT } from '../../ui/font.js';
import { menuTextLines } from '../../ui/menu-layout.js';
import { BATTLE_BGS } from '../backgrounds.js';

const clamp = n => Math.max(0, Math.min(1, n));
const ease = n => 1 - (1 - clamp(n)) ** 3;
const SMALL = FONT.replace(/^\d+px/, '14px');

function text(ctx, value, x, y, width, highlight = '') {
  for (const [index, row] of menuTextLines(ctx, value, width, 20).entries()) {
    const dy = y + index * 18, mark = highlight ? row.indexOf(highlight) : -1;
    ctx.fillStyle = '#ffffff';
    if (mark < 0) { ctx.fillText(row, x, dy); continue; }
    const before = row.slice(0, mark), through = row.slice(0, mark + highlight.length);
    ctx.fillText(before, x, dy);
    ctx.fillStyle = '#ffe066'; ctx.fillText(highlight, x + ctx.measureText(before).width, dy);
    ctx.fillStyle = '#ffffff'; ctx.fillText(row.slice(mark + highlight.length), x + ctx.measureText(through).width, dy);
  }
}

function judge(ctx, art, phase, time) {
  if (!art.judge.image) return;
  const hammer = phase === 'declare-effect' || phase === 'verdict';
  const frame = hammer ? Math.min(3, Math.floor(time * 6)) : 0;
  ctx.drawImage(art.judge.image, frame % 2 * 128, Math.floor(frame / 2) * 128, 128, 128, 176, 6, 128, 128);
}

function objection(ctx, state) {
  const { art, phase, phaseTime } = state;
  const progress = phase === 'objection' ? ease(phaseTime / 0.42) : 1;
  const offset = -520 * (1 - progress);
  if (art.glass.image) {
    ctx.save(); ctx.translate(240 + offset, 192); ctx.rotate(-0.16);
    if (phase !== 'shatter') ctx.drawImage(art.glass.image, -256, -80, 512, 160);
    else {
      const k = clamp(phaseTime / C.timing.shatter);
      ctx.globalAlpha = 1 - k;
      for (let i = 0; i < 32; i++) {
        const tile = Math.floor(i / 2), sx = tile % 8 * 64, sy = Math.floor(tile / 8) * 80;
        const side = i % 2 ? 1 : -1;
        ctx.save(); ctx.translate(sx - 224 + (sx - 224) * k * 1.4 + side * k * 22, sy - 40 + (sy ? 1 : -1) * 145 * k);
        ctx.rotate(side * k * (1.2 + tile % 3 * 0.4));
        ctx.beginPath(); ctx.moveTo(-32, -40); ctx.lineTo(32, 40);
        ctx.lineTo(side > 0 ? 32 : -32, side > 0 ? -40 : 40); ctx.closePath(); ctx.clip();
        ctx.drawImage(art.glass.image, sx, sy, 64, 80, -32, -40, 64, 80); ctx.restore();
      }
    }
    ctx.restore();
  }
  if (art.objection.image) {
    const fade = phase === 'shatter' ? 1 - clamp(phaseTime / C.timing.shatter) : 1;
    ctx.save(); ctx.globalAlpha = fade;
    ctx.drawImage(art.objection.image, 48 + offset, 25, 384, 320); ctx.restore();
  }
}

/** Render only; gameplay owns phase, selection, timer and all HP changes. */
export function drawParkTrial(ctx, state) {
  const { phase, phaseTime, shown, visibleChoices, choiceShown, remaining, verdict, art, soul, board, battle, copy, choices } = state;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  const transition = phase === 'enter' || phase === 'leave';
  const opacity = phase === 'enter' ? ease(phaseTime / C.timing.enter) : phase === 'leave' ? 1 - ease(phaseTime / C.timing.leave) : 1;
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 480, 360);
  if (transition && battle?.cfg) {
    BATTLE_BGS[battle.cfg.bg]?.(ctx, battle);
    battle.support?.draw?.(ctx);
    for (const enemy of battle.enemies) battle.drawEnemy(ctx, enemy);
    for (const member of battle.members) battle.drawMember(ctx, member);
    battle.drawHpStrip(ctx);
  }
  ctx.globalAlpha = opacity;
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 480, 360);
  ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  const rect = phase === 'enter' ? board : C.board;
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
  ctx.strokeRect(Math.round(rect.x) + 1, Math.round(rect.y) + 1, Math.round(rect.w) - 2, Math.round(rect.h) - 2);
  judge(ctx, art, phase, phaseTime);
  if (['opening', 'declaration', 'defeated'].includes(phase)) {
    battle.drawTextBox(ctx);
  }
  if (phase === 'declare-effect') {
    const kick = Math.round(Math.sin(phaseTime * 55) * (1 - phaseTime / C.timing.declaration) * 3);
    text(ctx, C.text.declaration, 32 + kick, 180, 416);
  }
  if (['read-question', 'choices', 'question'].includes(phase)) {
    if (phase === 'question') {
    ctx.fillStyle = remaining <= 5 ? '#ff657b' : '#ffffff';
    ctx.fillText(`${Math.ceil(remaining)}`, 425, 18);
    }
    ctx.fillStyle = '#ffe066'; ctx.fillText(C.text.speaker, 24, 132);
    ctx.font = SMALL;
    text(ctx, copy.summary, 24, 154, 432, copy.highlight);
    if (phase === 'read-question') battle.drawTextBox(ctx);
    choices.slice(0, visibleChoices).forEach((zone, i) => {
      const active = phase === 'question' && soul.x >= zone.x && soul.x <= zone.x + zone.w && soul.y >= zone.y && soul.y <= zone.y + zone.h;
      ctx.strokeStyle = active ? '#ffe066' : '#595366'; ctx.lineWidth = active ? 3 : 2;
      ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
      text(ctx, `${i + 1}. ${zone.text}`.slice(0, Math.floor(choiceShown[i])), zone.x + 9, zone.y + 8, zone.w - 18);
    });
    if (phase !== 'read-question') soul.draw(ctx);
  }
  if (phase === 'verdict' || phase === 'execution-roll') {
    ctx.fillStyle = '#ff657b'; ctx.textAlign = 'center'; ctx.font = FONT.replace(/^\d+px/, '28px');
    const beatTime = phase === 'execution-roll' ? phaseTime % C.timing.executionBeat : phaseTime;
    const stamp = 1 + 0.16 * (1 - clamp(beatTime / 0.12));
    ctx.save(); ctx.translate(240, 179); ctx.scale(stamp, stamp);
    ctx.fillText(C.text.verdicts[verdict], 0, 0); ctx.restore();
    soul.draw(ctx);
  }
  if (phase === 'sword' || phase === 'impact') {
    soul.draw(ctx);
    const k = phase === 'impact' ? 1 : clamp(phaseTime / C.timing.sword);
    const tipY = -20 + (soul.y + 20) * k * k;
    if (art.sword.image) ctx.drawImage(art.sword.image, soul.x - 48, tipY - 256, 96, 256);
    if (phase === 'impact') {
      ctx.strokeStyle = '#fff0bb'; ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4, radius = 12 + phaseTime * 62;
        ctx.beginPath(); ctx.moveTo(soul.x + Math.cos(angle) * radius, soul.y + Math.sin(angle) * radius);
        ctx.lineTo(soul.x + Math.cos(angle) * (radius + 18), soul.y + Math.sin(angle) * (radius + 18)); ctx.stroke();
      }
      ctx.fillStyle = '#ff657b'; ctx.textAlign = 'center'; ctx.fillText(`-${C.damage}`, soul.x, soul.y - 22);
    }
  }
  if (phase === 'objection' || phase === 'shatter') objection(ctx, state);
  ctx.restore();
}
