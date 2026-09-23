import { CHOIMIS_LYRICS } from '../data/choimis-lyrics.js';
import { FONT } from '../ui/font.js';

const KARAOKE_SIZE = 17;
const SAFE_WIDTH = 456;
const TEXT_TOP = 10;
const ECHO_LIFETIME = 0.5;
const ECHO_LAYERS = 5;
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
  const startX = 240 - totalWidth / 2;
  let x = startX;
  ctx.save();
  ctx.beginPath(); ctx.rect(12, TEXT_TOP - 4, SAFE_WIDTH, fontSize + 8); ctx.clip();
  ctx.strokeStyle = '#ff9dca'; ctx.fillStyle = '#ff9dca'; ctx.lineWidth = 1;
  for (let i = 0; i < cue.chars.length; i++) {
    const char = cue.chars[i], age = time - char.at;
    if (age > 0 && age < ECHO_LIFETIME && char.char.trim()) {
      const remaining = 1 - age / ECHO_LIFETIME;
      for (let layer = ECHO_LAYERS; layer >= 1; layer--) {
        const offset = layer * (3 + age / ECHO_LIFETIME);
        const alpha = dim * fade * remaining * 0.58 * (1 - layer / (ECHO_LAYERS + 1));
        for (const direction of [-1, 1]) {
          const echoX = x + direction * offset;
          ctx.globalAlpha = alpha; ctx.strokeText(char.char, echoX, TEXT_TOP);
          ctx.globalAlpha = alpha * 0.24; ctx.fillText(char.char, echoX, TEXT_TOP);
        }
      }
    }
    x += widths[i];
  }
  ctx.restore();
  ctx.globalAlpha = dim * fade;
  x = startX;
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
      ctx.globalAlpha = dim * fade; ctx.fillStyle = '#ff78b8'; ctx.fillText(char.char, x, TEXT_TOP);
      ctx.restore();
      ctx.globalAlpha = dim * fade;
    }
    x += widths[i];
  }
  ctx.restore();
}
