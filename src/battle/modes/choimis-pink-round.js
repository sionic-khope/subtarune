import { createChoimisPinkScenario } from '../choimis-pink-rounds.js';
import { whiteSprite } from '../youngcle-patterns.js';
import { sayBubble, tickBubble } from '../support/youngcle-tvform.js';
import L from '../../data/locale/ko.js';
import { FONT } from '../../ui/font.js';
import {
  CHOIMIS_PINK_SHOOTER,
  createPinkFireControl,
  createPinkShot,
  createPinkShotAudio,
  drawPinkPellet,
  drawPinkScroll,
  heartPixels,
  pinkChargeAura,
  registerPinkTargetHit,
  sweptCirclesHit,
} from './choimis-pink-shooter.js';

const BOARD = CHOIMIS_PINK_SHOOTER.wideBoard;
const HEART_X = CHOIMIS_PINK_SHOOTER.heartX;
const PINK = '#ff5ca8';
const CHOSO_TRANSFORM_SECONDS = 0.55;
export const CHOIMIS_PINK_ROUND_SECONDS = 18;
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

/** Charged boss contacts deal one HP immediately; three normal contacts deal one HP. */
export function createPinkBossContact(battle, enemy, onContact, onDamage) {
  return (shot, boss) => {
    if (!enemy || enemy.dead || enemy.dying > 0 || enemy.hp <= 0 || shot?.dead) return false;
    if (!sweptCirclesHit({ x: shot.oldX, y: shot.oldY }, shot, shot.r, { x: boss.oldX ?? boss.x, y: boss.oldY ?? boss.y }, boss, boss.r)) return false;
    if (!registerPinkTargetHit(shot, boss.id || 'choimis-boss')) return false;
    onContact?.(boss.x, boss.y);
    battle.sfx('pop', { volume: 0.384, rate: 0.8 });
    const previousHp = enemy.hp;
    if (shot.charged) battle.hitEnemy(enemy, null, 1, { source: 'pink-shot', sound: false });
    else {
      enemy.pinkShotHits = (enemy.pinkShotHits || 0) + 1;
      if (enemy.pinkShotHits >= 3) {
        enemy.pinkShotHits -= 3;
        battle.hitEnemy(enemy, null, 1, { source: 'pink-shot', sound: false });
      }
    }
    if (enemy.hp < previousHp) onDamage?.(boss, previousHp - enemy.hp);
    return true;
  };
}

/** Enemy-mode adapter for three fixed-duration post-tutorial pink-heart rounds. */
export function createChoimisPinkRound(battle, { enemy, config }) {
  const board = battle.board, soul = battle.soul, scenarioName = config?.scenario;
  const oldBoard = { ...board.rect, target: board.target && { ...board.target } };
  const oldSoul = { x: soul.x, y: soul.y, invuln: soul.invuln };
  const oldPose = enemy.patternPose;
  const fireControl = createPinkFireControl(CHOIMIS_PINK_SHOOTER), shotAudio = createPinkShotAudio(battle);
  let phase = 'prep', phaseTime = 0, combatElapsed = 0, scroll = 0;
  let preambleElapsed = 0, speechHandle = null;
  let shots = [], effects = [], damageIndicators = [], nextShotId = 0, disposed = false, terminating = false;
  board.setTarget(BOARD.w, BOARD.h, BOARD.x + BOARD.w / 2, BOARD.y + BOARD.h / 2);
  soul.x = HEART_X; soul.y = BOARD.y + BOARD.h / 2; soul.invuln = 0;
  enemy.patternPose = { hidden: true };
  const firstLine = config?.speak || (scenarioName === 'choso' ? L.battle_choimis_pink_choso_preamble : '');
  if (firstLine) sayBubble(battle, enemy, firstLine);
  if (firstLine && config?.speakSfx) {
    battle.bubble.voice = 'none';
    speechHandle = battle.game?.sound?.sfx?.(config.speakSfx, { volume: 0.9 }) || null;
  }
  const stopSpeech = () => {
    if (!speechHandle) return;
    speechHandle.pause?.(); speechHandle.removeAttribute?.('src'); speechHandle.load?.(); speechHandle = null;
  };
  const images = {
    boss: whiteSprite(enemy.img), choso: whiteSprite(enemy.actionImages?.choso),
    dao: whiteSprite(enemy.projectiles?.daoKart), bazzi: whiteSprite(enemy.projectiles?.bazziKart),
  };
  const hit = (x, y) => {
    for (let index = 0; index < 7; index++) effects.push({ x, y, vx: (index - 3) * 24, vy: -35 + Math.abs(index - 3) * 8, life: 0.32 });
  };
  const hurt = () => {
    if (soul.invuln > 0) return false;
    battle.hurtParty(enemy.def.damage ?? 15); if (!disposed) soul.invuln = CHOIMIS_PINK_SHOOTER.invulnerability; return true;
  };
  const bossContact = createPinkBossContact(battle, enemy, hit, (target, damage) => {
    damageIndicators.push({ target, text: `-${damage}`, life: 0.55 });
  });
  const indicatorAt = indicator => ({ text: indicator.text, life: indicator.life,
    x: Math.round(indicator.target.x - 33), y: Math.round(clamp(indicator.target.y - 24 - (0.55 - indicator.life) * 16, BOARD.y + 14, BOARD.y + BOARD.h - 10)) });
  const transformed = () => scenarioName !== 'choso' || phase === 'announce' || phase === 'combat' || phase === 'done';
  const scenario = createChoimisPinkScenario(scenarioName, {
    box: BOARD, soul, images, hit, hurt, bossContact, transformed,
    bossAlive: () => !enemy.dead && enemy.dying <= 0 && enemy.hp > 0,
    hitTarget: registerPinkTargetHit,
    rnd: battle.rnd, sfx: (name, options) => battle.sfx(name, options),
  });
  const restore = () => {
    board.x = oldBoard.x; board.y = oldBoard.y; board.w = oldBoard.w; board.h = oldBoard.h;
    board.target = oldBoard.target && { ...oldBoard.target };
    soul.x = oldSoul.x; soul.y = oldSoul.y; soul.invuln = oldSoul.invuln;
    enemy.patternPose = oldPose || null; battle.bubble = null;
  };
  const stopRound = nextPhase => {
    if (phase === 'done') return;
    phase = nextPhase; shots = []; effects = []; damageIndicators = []; fireControl.dispose(); shotAudio.stop(); stopSpeech(); scenario.dispose?.(); battle.bubble = null;
  };
  const terminate = () => { if (terminating) return; terminating = true; stopRound('terminating'); };
  const startCombat = () => { battle.bubble = null; phase = 'combat'; phaseTime = 0; };
  return {
    get snapshot() {
      return { phase, phaseTime: Math.round(phaseTime * 100) / 100, combatElapsed: Math.round(combatElapsed * 100) / 100,
        duration: CHOIMIS_PINK_ROUND_SECONDS, scroll: Math.round(scroll * 100) / 100, board: { ...BOARD }, scenario: scenario.snapshot,
        heart: { x: soul.x, y: soul.y }, shots: shots.map(shot => ({ ...shot })), charge: fireControl.snapshot,
        bossHits: enemy.pinkShotHits || 0, damageIndicators: damageIndicators.map(indicatorAt), preambleElapsed, transformed: transformed(), terminating, disposed };
    },
    update(dt, input) {
      if (disposed || phase === 'done') return true;
      if (enemy.hp <= 0 || enemy.dying > 0 || enemy.dead) { terminate(); return !!enemy.dead; }
      const delta = Math.max(0, dt);
      soul.invuln = Math.max(0, soul.invuln - delta);
      if (phase === 'prep') {
        scenario.prepare?.(delta); scroll += delta * 92; preambleElapsed += delta;
        let textReady;
        if (config?.speakSfx && battle.bubble) {
          const bubble = battle.bubble; bubble.t += delta; bubble.shown = Math.min(bubble.text.length, Math.floor(bubble.t / 0.03));
          textReady = bubble.shown === bubble.text.length;
        } else textReady = tickBubble(battle, delta);
        if (textReady) phaseTime += delta;
        const speechPlaying = speechHandle?.ended === false && speechHandle?.paused === false;
        if (phaseTime >= 0.55 && preambleElapsed + 1e-9 >= (config?.speakDuration || 0) && !speechPlaying) {
          stopSpeech();
          phaseTime = 0;
          if (scenarioName === 'choso') { battle.bubble = null; phase = 'transform'; }
          else startCombat();
        }
        return false;
      }
      if (phase === 'transform') {
        scenario.prepare?.(delta); scroll += delta * 92; phaseTime = Math.min(CHOSO_TRANSFORM_SECONDS, phaseTime + delta);
        if (phaseTime + 1e-9 >= CHOSO_TRANSFORM_SECONDS) { sayBubble(battle, enemy, L.battle_choimis_pink_choso_attack); phase = 'announce'; phaseTime = 0; }
        return false;
      }
      if (phase === 'announce') {
        scenario.prepare?.(delta); scroll += delta * 92;
        if (tickBubble(battle, delta)) phaseTime += delta;
        if (phaseTime >= 0.35) startCombat();
        return false;
      }
      const combatDelta = Math.min(delta, CHOIMIS_PINK_ROUND_SECONDS - combatElapsed);
      combatElapsed += combatDelta; phaseTime += combatDelta; scroll += combatDelta * 92;
      if (battle.bubble) tickBubble(battle, combatDelta);
      soul.oldX = soul.x; soul.oldY = soul.y;
      const direction = Number(input.down?.('down')) - Number(input.down?.('up'));
      soul.y = clamp(soul.y + direction * CHOIMIS_PINK_SHOOTER.heartSpeed * combatDelta, BOARD.y + 14, BOARD.y + BOARD.h - 14);
      for (const event of fireControl.update(combatDelta, input)) {
        if (event.type === 'charge') shotAudio.charge();
        if (event.type === 'fire') { const shot = createPinkShot(soul.x + 11, soul.y, event.charged); shot.id = `round-shot-${nextShotId++}`; shots.push(shot); shotAudio.fire(event.charged); }
      }
      for (const shot of shots) { shot.oldX = shot.x; shot.oldY = shot.y; shot.x += CHOIMIS_PINK_SHOOTER.shotSpeed * combatDelta; }
      scenario.update(combatDelta, shots);
      if (disposed) return true;
      if (enemy.hp <= 0 || enemy.dying > 0 || enemy.dead) { terminate(); return !!enemy.dead; }
      for (const effect of effects) { effect.x += effect.vx * combatDelta; effect.y += effect.vy * combatDelta; effect.life -= combatDelta; }
      for (const indicator of damageIndicators) indicator.life -= combatDelta;
      damageIndicators = damageIndicators.filter(indicator => indicator.life > 0);
      shots = shots.filter(shot => !shot.dead && shot.x <= BOARD.x + BOARD.w + 14);
      effects = effects.filter(effect => effect.life > 0);
      if (combatElapsed + 1e-9 >= CHOIMIS_PINK_ROUND_SECONDS) { stopRound('done'); return true; }
      return false;
    },
    draw(ctx) {
      board.draw(ctx);
      const arenaReady = Math.abs(board.x - BOARD.x) < 2 && Math.abs(board.y - BOARD.y) < 2
        && Math.abs(board.w - BOARD.w) < 2 && Math.abs(board.h - BOARD.h) < 2;
      if (arenaReady) {
        ctx.save(); ctx.beginPath(); ctx.rect(BOARD.x + 3, BOARD.y + 3, BOARD.w - 6, BOARD.h - 6); ctx.clip();
        drawPinkScroll(ctx, BOARD, scroll); scenario.draw(ctx);
        for (const shot of shots) drawPinkPellet(ctx, shot);
        for (const effect of effects) { ctx.globalAlpha = clamp(effect.life / 0.25, 0, 1); ctx.fillStyle = '#fff'; ctx.fillRect(effect.x - 2, effect.y - 2, 4, 4); }
        ctx.font = FONT.replace(/^\d+px/, '11px'); ctx.textAlign = 'right';
        for (const indicator of damageIndicators) {
          const { text, x, y } = indicatorAt(indicator);
          ctx.globalAlpha = Math.min(1, indicator.life / 0.18);
          ctx.fillStyle = '#351323'; ctx.fillText(text, x + 1, y + 1);
          ctx.fillStyle = '#ffd2e8'; ctx.fillText(text, x, y);
        }
        ctx.globalAlpha = 1; drawCharge(ctx, soul, fireControl, combatElapsed); drawHeart(ctx, soul, soul.invuln, combatElapsed); ctx.restore();
      }
      ctx.fillStyle = '#000'; ctx.fillRect(20, 246, 440, 72); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(21.5, 247.5, 437, 69);
      ctx.font = FONT.replace(/^\d+px/, '12px'); ctx.fillStyle = '#ffb4d7'; ctx.textAlign = 'left'; ctx.fillText(L.battle_choimis_pink_round_controls, 34, 272);
    },
    dispose() {
      if (disposed) return;
      disposed = true; shots = []; effects = []; damageIndicators = []; fireControl.dispose(); shotAudio.dispose(); stopSpeech(); scenario.dispose?.(); restore();
    },
  };
}
