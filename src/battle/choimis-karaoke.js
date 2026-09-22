import { CHOIMIS_LYRICS } from '../data/choimis-lyrics.js';
import { FONT } from '../ui/font.js';

const KARAOKE_SIZE = 17;
const SAFE_WIDTH = 456;
const TEXT_TOP = 10;
const fontAt = size => FONT.replace(/^\d+(?:\.\d+)?px/, `${size}px`);
const clamp = value => Math.min(1, Math.max(0, value));

function revealProgress(cue, index, time) {
  const current = cue.chars[index];
  const start = Number.isFinite(current.at) ? current.at : cue.start;
  let end = Number.isFinite(current.end) && current.end > start ? current.end : null;
  if (end === null) {
    for (let next = index + 1; next < cue.chars.length; next++) {
      if (Number.isFinite(cue.chars[next].at) && cue.chars[next].at > start) { end = cue.chars[next].at; break; }
    }
  }
  if (!(end > start)) end = cue.end > start ? cue.end : start + 1 / 60;
  return clamp((time - start) / (end - start));
}

/** Return the cue active at an HTMLAudioElement currentTime, or null between lyric phrases. */
export function choimisLyricAt(time) {
  if (!Number.isFinite(time)) return null;
  return CHOIMIS_LYRICS.find(cue => time >= cue.start && time < cue.end) || null;
}

/** Draw audio-clocked Choimis lyrics without retaining state across seeks, loops, or retries. */
export function drawChoimisKaraoke(ctx, battle) {
  if (battle.cfg.bgm !== 'choimis_battle' || battle.game.sound.bgmName !== 'choimis_battle') return;
  if (['win', 'lose', 'retry', 'ending'].includes(battle.state)) return;
  const time = battle.game.sound.bgm?.currentTime;
  const cue = choimisLyricAt(time);
  if (!cue) return;

  ctx.save();
  const dim = ['enemy-mode', 'enemy-prep', 'bullets', 'board-close'].includes(battle.state) ? 0.68 : 1;
  const fade = Math.min(1, Math.max(0, (time - cue.start) / 0.28));
  ctx.globalAlpha = dim * fade;
  let fontSize = KARAOKE_SIZE;
  ctx.font = fontAt(fontSize);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
  let widths = cue.chars.map(({ char }) => ctx.measureText(char).width);
  let totalWidth = widths.reduce((sum, width) => sum + width, 0);
  if (totalWidth > SAFE_WIDTH) {
    fontSize *= SAFE_WIDTH / totalWidth;
    ctx.font = fontAt(fontSize);
    widths = cue.chars.map(({ char }) => ctx.measureText(char).width);
    totalWidth = widths.reduce((sum, width) => sum + width, 0);
  }
  let x = 240 - totalWidth / 2;
  for (let i = 0; i < cue.chars.length; i++) {
    const char = cue.chars[i];
    ctx.strokeStyle = 'rgba(4,8,20,0.9)'; ctx.lineWidth = 4; ctx.strokeText(char.char, x, TEXT_TOP);
    ctx.strokeStyle = '#ececf5'; ctx.lineWidth = 1; ctx.strokeText(char.char, x, TEXT_TOP);
    const progress = revealProgress(cue, i, time);
    if (progress > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, TEXT_TOP - 4, widths[i] * progress, fontSize + 8);
      ctx.clip();
      const age = time - char.at;
      if (age < 0.26 && char.char.trim()) {
        const echo = (1 - age / 0.26) * 0.42;
        ctx.fillStyle = '#ff9dca'; ctx.globalAlpha = dim * fade * echo;
        ctx.fillText(char.char, x - 2 - age * 8, TEXT_TOP); ctx.fillText(char.char, x + 2 + age * 8, TEXT_TOP);
      }
      ctx.globalAlpha = dim * fade; ctx.fillStyle = '#ff78b8'; ctx.fillText(char.char, x, TEXT_TOP);
      ctx.restore();
      ctx.globalAlpha = dim * fade;
    }
    x += widths[i];
  }
  ctx.restore();
}
