import { createTalk } from './support/talk.js';

const BOSS_LINE = Object.freeze({
  speaker: '최미스', portrait: 'choimis_flower', voice: 'choimis_flower',
  text: '* 분홍의 힘이 나를 감싼다.',
});
const RESULT_LINE = '* 최미스의 방어력이 강화되었다.';
const FLOWERS = 32;
const CHARGE_SECONDS = 2.8;

function drawFlower(ctx, x, y, size, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ff8fc7';
  ctx.fillRect(Math.round(x - size), Math.round(y - size / 2), size, size);
  ctx.fillRect(Math.round(x + 1), Math.round(y - size / 2), size, size);
  ctx.fillRect(Math.round(x - size / 2), Math.round(y - size), size, size);
  ctx.fillRect(Math.round(x - size / 2), Math.round(y + 1), size, size);
  ctx.fillStyle = '#fff0a8'; ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
}

/** Finite post-opening sequence that activates Choimis's one-damage defense only after its final line. */
export function createChoimisDefenseCinematic(battle, enemy) {
  let phase = 'boss-line', phaseTime = 0, disposed = false;
  let talk = createTalk(battle, [BOSS_LINE]);
  const beginCharge = () => {
    phase = 'charge'; phaseTime = 0; battle.setText('');
    battle.sfx('power', { volume: 0.82 });
  };
  const beginResult = () => {
    phase = 'result'; phaseTime = 0; talk = createTalk(battle, [RESULT_LINE]);
  };
  return {
    get snapshot() { return { phase, phaseTime, defenseBoosted: !!enemy.defenseBoosted, flowers: phase === 'charge' ? FLOWERS : 0 }; },
    update(dt, input) {
      if (disposed) return true;
      phaseTime += Math.max(0, dt);
      if (phase === 'boss-line') { if (talk.update(dt, input)) beginCharge(); return false; }
      if (phase === 'charge') { if (phaseTime >= CHARGE_SECONDS) beginResult(); return false; }
      if (!talk.update(dt, input)) return false;
      enemy.defenseBoosted = true;
      battle.setText('');
      return true;
    },
    draw(ctx) {
      if (phase === 'charge') {
        const progress = Math.min(1, phaseTime / CHARGE_SECONDS);
        for (let i = 0; i < FLOWERS; i++) {
          const angle = i * 2.399 + phaseTime * (1.8 + i % 4 * 0.12);
          const radius = 122 * (1 - progress) + 20 + (i % 5) * 3;
          const x = enemy.x + Math.cos(angle) * radius;
          const y = enemy.y - 34 + Math.sin(angle) * radius * 0.55;
          const alpha = 0.42 + progress * 0.5;
          drawFlower(ctx, x, y, i % 6 === 0 ? 5 : 3, alpha);
          if (i % 3 === 0) drawFlower(ctx, x - Math.cos(angle) * 10, y - Math.sin(angle) * 6, 2, alpha * 0.45);
        }
        ctx.globalAlpha = 1;
      }
      battle.drawTextBox(ctx);
    },
    dispose() {
      disposed = true;
      battle.setText('');
    },
  };
}
