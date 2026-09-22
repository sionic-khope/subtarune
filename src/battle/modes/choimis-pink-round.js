import { createChoimisPinkScenario } from '../choimis-pink-rounds.js';
import { whiteSprite } from '../youngcle-patterns.js';
import { sayBubble, tickBubble } from '../support/youngcle-tvform.js';
import L from '../../data/locale/ko.js';
import { FONT } from '../../ui/font.js';
import {
  CHOIMIS_PINK_SHOOTER,
  createPinkFireControl,
  createPinkShot,
  drawPinkPellet,
  heartPixels,
  pinkChargeAura,
} from './choimis-pink-shooter.js';

const BOARD = Object.freeze({ x: 85, y: 84, w: 310, h: 150 });
const HEART_X = 110;
const PINK = '#ff5ca8';
const HINT_KEYS = Object.freeze({
  choso: 'battle_choimis_pink_choso',
  kart_block: 'battle_choimis_pink_kart',
  pink_prism: 'battle_choimis_pink_prism',
});
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function drawHeart(ctx, soul, invulnerability, time) {
  if (invulnerability > 0 && Math.floor(time * 16) % 2) return;
  ctx.fillStyle = PINK;
  for (const pixel of heartPixels('right')) ctx.fillRect(Math.round(soul.x + pixel.x), Math.round(soul.y + pixel.y), 1, 1);
}

function drawCharge(ctx, soul, control, time) {
  const state = control.snapshot;
  if (!state.active) return;
  ctx.fillStyle = state.ready ? '#fff' : '#ff9ccd';
  for (const streak of pinkChargeAura(soul.x, soul.y, state.progress, time)) {
    ctx.save(); ctx.translate(Math.round(streak.x), Math.round(streak.y)); ctx.rotate(streak.angle); ctx.fillRect(-3, -1, 6, 3); ctx.restore();
  }
}

/** Enemy-mode adapter for target-local Choimis shooting rounds. */
export function createChoimisPinkRound(battle, { enemy, config }) {
  const board = battle.board, soul = battle.soul, scenarioName = config?.scenario;
  const oldBoard = { ...board.rect, target: board.target && { ...board.target } };
  const oldSoul = { x: soul.x, y: soul.y, invuln: soul.invuln };
  const oldPose = enemy.patternPose;
  const fireControl = createPinkFireControl(CHOIMIS_PINK_SHOOTER);
  let phase = 'prep', prepHold = 0, elapsed = 0, shots = [], effects = [], disposed = false;
  board.setTarget(BOARD.w, BOARD.h, BOARD.x + BOARD.w / 2, BOARD.y + BOARD.h / 2);
  soul.x = HEART_X; soul.y = BOARD.y + BOARD.h / 2; soul.invuln = 0;
  enemy.patternPose = { hidden: true };
  sayBubble(battle, enemy, config?.speak || L[HINT_KEYS[scenarioName]]);
  const images = {
    choso: whiteSprite(enemy.actionImages?.choso),
    dao: whiteSprite(enemy.projectiles?.dao),
    bazzi: whiteSprite(enemy.projectiles?.bazzi),
  };
  const hit = (x, y) => {
    for (let index = 0; index < 7; index++) effects.push({ x, y, vx: (index - 3) * 24, vy: -35 + Math.abs(index - 3) * 8, life: 0.32 });
  };
  const hurt = () => {
    if (soul.invuln > 0) return false;
    battle.hurtParty(enemy.def.damage ?? 15); soul.invuln = CHOIMIS_PINK_SHOOTER.invulnerability; return true;
  };
  const scenario = createChoimisPinkScenario(scenarioName, {
    box: BOARD, soul, images, hit, hurt,
    rnd: battle.rnd, sfx: (name, options) => battle.sfx(name, options),
    say: text => sayBubble(battle, enemy, text),
  });
  const restore = () => {
    board.x = oldBoard.x; board.y = oldBoard.y; board.w = oldBoard.w; board.h = oldBoard.h;
    board.target = oldBoard.target && { ...oldBoard.target };
    soul.x = oldSoul.x; soul.y = oldSoul.y; soul.invuln = oldSoul.invuln;
    enemy.patternPose = oldPose || null; battle.bubble = null;
  };
  return {
    get snapshot() {
      return { phase, elapsed: Math.round(elapsed * 100) / 100, scenario: scenario.snapshot,
        heart: { x: soul.x, y: soul.y }, shots: shots.map(shot => ({ ...shot })), charge: fireControl.snapshot, disposed };
    },
    update(dt, input) {
      if (disposed || scenario.done) return true;
      elapsed += dt; soul.invuln = Math.max(0, soul.invuln - dt);
      const events = fireControl.update(dt, input);
      if (phase === 'prep') {
        if (tickBubble(battle, dt)) prepHold += dt;
        if (prepHold >= 0.55) { battle.bubble = null; phase = 'combat'; }
        return false;
      }
      if (battle.bubble) tickBubble(battle, dt);
      soul.oldX = soul.x; soul.oldY = soul.y;
      const direction = Number(input.down?.('down')) - Number(input.down?.('up'));
      soul.y = clamp(soul.y + direction * CHOIMIS_PINK_SHOOTER.heartSpeed * dt, BOARD.y + 14, BOARD.y + BOARD.h - 14);
      for (const event of events) {
        if (event.type === 'charge') battle.sfx('power', { volume: 0.45 });
        if (event.type === 'fire') { shots.push(createPinkShot(soul.x + 11, soul.y, event.charged)); battle.sfx('cannon_puff', { volume: 0.4, rate: event.charged ? 0.82 : 1.45 }); }
      }
      for (const shot of shots) { shot.oldX = shot.x; shot.oldY = shot.y; shot.x += CHOIMIS_PINK_SHOOTER.shotSpeed * dt; }
      scenario.update(dt, shots);
      for (const effect of effects) { effect.x += effect.vx * dt; effect.y += effect.vy * dt; effect.life -= dt; }
      shots = shots.filter(shot => !shot.dead && shot.x <= BOARD.x + BOARD.w + 14);
      effects = effects.filter(effect => effect.life > 0);
      return scenario.done;
    },
    draw(ctx) {
      board.draw(ctx);
      const arenaReady = Math.abs(board.x - BOARD.x) < 2 && Math.abs(board.y - BOARD.y) < 2
        && Math.abs(board.w - BOARD.w) < 2 && Math.abs(board.h - BOARD.h) < 2;
      if (arenaReady) {
        ctx.save(); ctx.beginPath(); ctx.rect(BOARD.x + 3, BOARD.y + 3, BOARD.w - 6, BOARD.h - 6); ctx.clip();
        ctx.fillStyle = '#160918'; ctx.fillRect(BOARD.x + 3, BOARD.y + 3, BOARD.w - 6, BOARD.h - 6);
        scenario.draw(ctx);
        for (const shot of shots) drawPinkPellet(ctx, shot);
        for (const effect of effects) { ctx.globalAlpha = clamp(effect.life / 0.25, 0, 1); ctx.fillStyle = '#fff'; ctx.fillRect(effect.x - 2, effect.y - 2, 4, 4); }
        ctx.globalAlpha = 1; drawCharge(ctx, soul, fireControl, elapsed); drawHeart(ctx, soul, soul.invuln, elapsed); ctx.restore();
      }
      ctx.fillStyle = '#000'; ctx.fillRect(20, 246, 440, 72); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(21.5, 247.5, 437, 69);
      ctx.font = FONT; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(L[HINT_KEYS[scenarioName]], 34, 254);
      ctx.fillStyle = '#ffb4d7'; ctx.fillText(L.battle_choimis_pink_controls, 34, 280);
    },
    dispose() { if (disposed) return; disposed = true; shots = []; effects = []; fireControl.dispose(); restore(); },
  };
}
