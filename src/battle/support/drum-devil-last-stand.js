import { makeCanvas } from '../../core/gfx.js';
import { BATTLE_BGS } from '../backgrounds.js';
import { DRUM_DEVIL as C } from '../../data/drum-devil.js';

export function createDrumDevilLastStand(battle, { createRescue, assets, onComplete }) {
  let time = 0, ripped = false, hit = false, rescue = null, scene = null;
  battle.sfx('baron_slam', { volume: 0.35 });
  battle.setText('');
  return {
    fullscreen: true,
    get snapshot() { return rescue ? { phase: 'rescue', inner: rescue.snapshot }
      : { phase: time < C.tearRamp ? 'red-ramp' : time < C.tearRamp + C.tearRip ? 'screen-rip' : 'hold', time, hit }; },
    update(dt, input) {
      if (rescue) return rescue.update(dt, input);
      time += dt;
      if (!ripped && time >= C.tearRamp) {
        ripped = true; battle.sfx('wallclaw', { volume: 0.5 }); battle.game.shake = { time: C.tearRip, amp: 7 };
      }
      if (!hit && time >= C.tearRamp + C.tearRip) {
        hit = true;
        for (const member of battle.alive()) battle.applyPartyDamage([member], Math.max(0, member.hp - C.playerHpFloor));
      }
      if (time >= C.tearRamp + C.tearRip + C.tearHold) rescue = createRescue(battle, { assets, onComplete });
      return false;
    },
    draw(ctx) {
      if (rescue) { rescue.draw(ctx); return; }
      if (!scene) {
        scene = makeCanvas(480, 360); const g = scene.getContext('2d'); g.imageSmoothingEnabled = false;
        g.fillStyle = '#000'; g.fillRect(0, 0, 480, 360);
        BATTLE_BGS[battle.cfg.bg]?.(g, battle);
        for (const enemy of battle.enemies) battle.drawEnemy(g, enemy);
        for (const member of battle.members) battle.drawMember(g, member);
      }
      const ramp = Math.min(1, time / C.tearRamp), rip = Math.max(0, Math.min(1, (time - C.tearRamp) / C.tearRip));
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 480, 360);
      const height = 360 / C.tearBands;
      for (let band = 0; band < C.tearBands; band++) {
        const y = band * height, split = Math.round(180 + band * 14 + (band % 2 ? 9 : -9));
        const shift = Math.round(C.tearShift * rip * (0.65 + (band % 3) * 0.175));
        ctx.drawImage(scene, 0, y, split, height, -shift, y, split, height);
        ctx.drawImage(scene, split, y, 480 - split, height, split + shift, y, 480 - split, height);
      }
      ctx.fillStyle = `rgba(230,0,15,${ramp * (0.9 - rip * 0.5)})`; ctx.fillRect(0, 0, 480, 360);
      if (rip > 0) {
        ctx.strokeStyle = '#000'; ctx.lineWidth = 4 + 28 * rip; ctx.beginPath();
        for (let i = 0; i <= C.tearBands; i++) {
          const x = 180 + i * 14 + (i % 2 ? 9 : -9), y = i * height;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      }
    },
    dispose() { rescue?.dispose?.(); scene = null; },
  };
}
