import { PARK_RAZMA as C } from '../../data/park-razma.js';
import { Board } from '../bullets.js';
import { BATTLE_BGS } from '../backgrounds.js';
import { FONT } from '../../ui/font.js';
import L from '../../data/locale/ko.js';
import { drawRazmaArt, razmaLaserGeometry, razmaLaserHits } from './park-razma-art.js';

/** Enemy-mode implementation of docs/battle/park-guardian-gimmicks.md. */
export function createParkRazma(battle, { enemy }) {
  const board = new Board(), soul = battle.soul;
  Object.assign(board, C.panel);
  board.setTarget(C.board.w, C.board.h, C.board.x + C.board.w / 2, C.board.y + C.board.h / 2);
  const shots = Array.from({ length: C.shots.count }, (_, i) => ({ at: C.shots.first + i * C.shots.every, glitch: i % 3 === 2, target: null, fired: false }));
  let phase = 'expand', phaseTime = 0, activeElapsed = 0, disposed = false;
  let image = null, assetsReady = false, error = null, shown = 0;
  const resource = typeof Image === 'undefined' ? null : new Image();
  if (resource) {
    resource.onload = () => {
      if (disposed) return;
      if (resource.naturalWidth !== C.cell * C.cols || resource.naturalHeight !== C.cell * 2) {
        error = `Invalid Razma sheet ${resource.naturalWidth}x${resource.naturalHeight}`; return;
      }
      image = resource; assetsReady = true;
    };
    resource.onerror = () => { if (!disposed) error = `Failed to load ${C.asset}`; };
    resource.src = C.asset;
  } else error = 'Image API unavailable';
  const sound = key => battle.sfx(C.sfx[key], { volume: C.volume[key] });
  function enter(next) {
    phase = next; phaseTime = 0; shown = 0;
    if (next === 'name') sound('summon');
    if (next === 'effect') sound('appear');
    if (next === 'active') { soul.center(C.board); soul.y = C.board.y + C.board.h - 28; soul.invuln = 0; }
    if (next === 'leave') board.setTarget(C.panel.w, C.panel.h, 240, 282);
  }
  function step(dt, input) {
    board.update(dt);
    if (!assetsReady) return;
    phaseTime += dt;
    if (phase === 'active') {
      const end = Math.min(C.seconds.active, activeElapsed + dt);
      soul.update(end - activeElapsed, input, C.board);
      activeElapsed = end;
      for (const shot of shots) {
        if (!shot.target && activeElapsed >= shot.at) { shot.target = { x: soul.x, y: soul.y }; sound('warning'); }
        if (!shot.fired && activeElapsed >= shot.at + C.shots.warning) { shot.fired = true; sound('fire'); }
        if (soul.invuln <= 0 && razmaLaserHits(razmaLaserGeometry(shot, activeElapsed), soul)) {
          battle.hurtParty(enemy.def.damage);
          if (disposed) return;
        }
      }
      if (activeElapsed >= C.seconds.active) enter('leave');
    } else {
      const text = C.text[phase];
      if (text) {
        const count = Math.min(text.length, Math.floor(phaseTime / C.characterSeconds));
        for (let i = shown; i < count; i++) if (text[i] !== ' ') battle.game.sound.blip(C.voice);
        shown = count;
      }
      if (phaseTime + 1e-9 >= C.seconds[phase]) {
        const sequence = ['expand', 'call', 'name', 'summon', 'effect', 'active', 'leave', 'done'];
        enter(sequence[sequence.indexOf(phase) + 1]);
      }
    }
  }
  return {
    fullscreen: true,
    get snapshot() { return { phase, phaseTime, activeElapsed, assetsReady, error, disposed, board: board.rect, soul: { x: soul.x, y: soul.y }, targets: shots.map(s => ({ ...s, target: s.target && { ...s.target } })) }; },
    update(dt, input) {
      if (disposed || phase === 'done') return true;
      for (let remaining = Math.max(0, dt); remaining > 1e-9 && phase !== 'done' && !disposed;) {
        const slice = Math.min(C.simulationStep, remaining); step(slice, input); remaining -= slice;
      }
      return phase === 'done';
    },
    draw(ctx) {
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 480, 360);
      BATTLE_BGS[battle.cfg.bg]?.(ctx, battle);
      board.draw(ctx);
      drawRazmaArt(ctx, image, { phase, phaseTime, activeElapsed, shots });
      ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillRect(20, 8, 440, 58);
      ctx.fillStyle = '#fff';
      if (!assetsReady) ctx.fillText(error ? L.battle_park_razma_asset_error : L.battle_park_razma_loading, 240, 28);
      else if (phase === 'call' || phase === 'name') {
        ctx.fillStyle = '#d8b8d0'; ctx.fillText(C.speaker, 240, 12);
        ctx.fillStyle = '#fff'; ctx.fillText(C.text[phase].slice(0, shown), 240, 36);
      } else if (phase === 'active') {
        const current = shots.findLast(s => s.target && activeElapsed < s.at + C.shots.warning + C.shots.fire);
        if (current?.glitch) {
          const jitter = (Math.floor(activeElapsed * 18) % 3 - 1) * 4;
          ctx.save(); ctx.beginPath(); ctx.rect(36, 24, 408, 24); ctx.clip();
          ctx.fillStyle = '#ff326a'; ctx.fillText(C.text.glitch, 240 + jitter, 25);
          ctx.fillStyle = '#71eafa'; ctx.fillText(C.text.glitch, 240 - jitter, 31);
          ctx.restore();
        }
        ctx.fillStyle = current?.glitch ? '#ff82b0' : '#fff';
        ctx.fillText(current?.glitch ? C.text.glitch : C.text.scream, 240, 28);
      }
      if (phase === 'active') soul.draw(ctx);
      ctx.textAlign = 'left'; battle.drawHpStrip(ctx); ctx.restore();
    },
    dispose() {
      disposed = true; image = null;
      if (resource) { resource.onload = null; resource.onerror = null; }
      for (const shot of shots) shot.target = null;
      battle.board.setTarget(C.panel.w, C.panel.h, 240, 282); battle.board.snap();
    },
  };
}
