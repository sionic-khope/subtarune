import { CHOIMIS_LYRICS } from '../data/choimis-lyrics.js';
import { FONT } from '../ui/font.js';

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
  ctx.font = FONT.replace(/^\d+px/, '14px');
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
  const widths = cue.chars.map(({ char }) => ctx.measureText(char).width);
  let x = 240 - widths.reduce((sum, width) => sum + width, 0) / 2;
  for (let i = 0; i < cue.chars.length; i++) {
    const char = cue.chars[i];
    ctx.strokeStyle = 'rgba(4,8,20,0.9)'; ctx.lineWidth = 4; ctx.strokeText(char.char, x, 10);
    ctx.strokeStyle = '#ececf5'; ctx.lineWidth = 1; ctx.strokeText(char.char, x, 10);
    if (time >= char.at) {
      const age = time - char.at;
      if (age < 0.26 && char.char.trim()) {
        const echo = (1 - age / 0.26) * 0.42;
        ctx.fillStyle = '#ff9dca'; ctx.globalAlpha = dim * fade * echo;
        ctx.fillText(char.char, x - 2 - age * 8, 10); ctx.fillText(char.char, x + 2 + age * 8, 10);
      }
      ctx.globalAlpha = dim * fade; ctx.fillStyle = '#ff78b8'; ctx.fillText(char.char, x, 10);
    }
    x += widths[i];
  }
  ctx.restore();
}
