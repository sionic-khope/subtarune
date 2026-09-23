import { CHOIMIS_FINALE as C } from '../../data/choimis-finale.js';
import { createTalk } from '../support/talk.js';
import { createChoimisFinalAssault } from '../choimis-final-assault.js';
import { createChoimisFinaleRenderer } from '../choimis-finale-render.js';

/** Enemy-mode finale: common victory receives control only after the normal body falls away. */
export function createChoimisFinale(battle, { enemy }) {
  const board = battle.board, soul = battle.soul, oldBoard = { ...board.rect, target: board.target && { ...board.target } };
  const oldSoul = { x: soul.x, y: soul.y, invuln: soul.invuln, oldX: soul.oldX, oldY: soul.oldY }, oldPose = enemy.patternPose;
  const renderer = createChoimisFinaleRenderer(battle, enemy), sounds = new Set();
  let phase = 'intro-talk', phaseTime = 0, elapsed = 0, disposed = false, assault = null, finalAssault = null;
  let talk = createTalk(battle, C.intro), burstCount = 0, fallStartY = enemy.y;
  let boss = { x: enemy.x, y: enemy.y }, heart = { x: C.finisher.soulX, y: C.finisher.soulY };
  enemy.patternPose = { hidden: true };
  battle.bubble = null;
  const stop = handle => { if (!handle) return; handle.pause?.(); handle.removeAttribute?.('src'); handle.load?.(); sounds.delete(handle); };
  const cue = (name, volume = 0.85, options = {}) => {
    const handle = battle.game.sound.sfx(name, { volume, ...options });
    if (handle) sounds.add(handle);
    return handle;
  };
  let chargeHandle = null, impactHandle = null;
  const change = next => { phase = next; phaseTime = 0; };
  const stopAssault = () => {
    if (!assault) return;
    finalAssault = assault.snapshot;
    heart = { ...finalAssault.heart };
    const pivot = enemy.def.pivot || [80, 152], scale = enemy.def.scale ?? 1;
    boss = { x: finalAssault.boss.x + (pivot[0] - 80) * scale,
      y: finalAssault.boss.y + (pivot[1] - 80) * scale * (enemy.def.scaleY ?? 1) };
    assault.dispose(); assault = null;
  };
  const enter = next => {
    change(next);
    if (next === 'raise') { battle.setText(''); cue('power', 0.72); }
    if (next === 'assault') {
      board.setTarget(C.box.w, C.box.h, C.box.x + C.box.w / 2, C.box.y + C.box.h / 2);
      assault = createChoimisFinalAssault(battle, enemy, { box: C.box });
    }
    if (next === 'bursts') { stopAssault(); cue('break1'); burstCount = 1; }
    if (next === 'death-talk') {
      battle.cancelPendingBgm(); battle.game.sound.stopBgm(1);
      talk = createTalk(battle, C.defeated);
    }
    if (next === 'autocharge') {
      battle.setText(''); chargeHandle = cue('yellowheart_charge', C.chargeAudio.startVolume);
      if (chargeHandle) chargeHandle.loop = true;
    }
    if (next === 'shot') { stop(chargeHandle); chargeHandle = null; cue('yellowheart_shot_big', 0.95); }
    if (next === 'impact') impactHandle = cue('furnace_blast', 0.8, { rate: 0.8, pitch: true });
    if (next === 'smoke') renderer.beginSmoke(boss);
    if (next === 'revert') { stop(impactHandle); impactHandle = null; }
    if (next === 'fall') { fallStartY = boss.y; cue('wing', 0.75); }
  };
  const transitions = { raise: 'gather', gather: 'assault', bursts: 'death-talk', autocharge: 'shot', shot: 'impact', impact: 'flash', flash: 'smoke', smoke: 'revert', revert: 'fall' };
  const snapshot = () => ({ phase, phaseTime, elapsed, disposed, boss: { ...boss }, heart: { ...heart },
    impactPoint: { x: (finalAssault?.boss.x ?? boss.x) - 24, y: finalAssault?.boss.y ?? boss.y - 38 },
    impactTime: phase === 'impact' ? Math.max(0, phaseTime - C.impact.hitstop) * C.impact.timeScale : 0,
    impactFlash: phase === 'impact' && phaseTime < C.impact.flashSeconds,
    normal: ['revert', 'fall', 'done'].includes(phase), assault: assault?.snapshot || finalAssault, burstCount,
    chargeProgress: phase === 'autocharge' ? Math.min(1, phaseTime / C.seconds.autocharge) : 0 });
  const dispose = () => {
    if (disposed) return;
    disposed = true; assault?.dispose(); assault = null;
    for (const handle of sounds) stop(handle);
    renderer.dispose();
    Object.assign(board, oldBoard); Object.assign(soul, oldSoul);
    for (const key of ['oldX', 'oldY']) if (oldSoul[key] === undefined) delete soul[key];
    enemy.patternPose = oldPose || null; battle.bubble = null; battle.setText('');
  };
  return {
    fullscreen: true, hpStrip: true,
    get snapshot() { return snapshot(); },
    update(dt, input) {
      if (disposed) return false;
      if (battle.state !== 'enemy-mode') { dispose(); return false; }
      if (phase === 'done') return true;
      const delta = Math.max(0, dt); elapsed += delta; phaseTime += delta;
      if (phase === 'intro-talk' || phase === 'death-talk') {
        if (talk.update(delta, input)) enter(phase === 'intro-talk' ? 'raise' : 'autocharge');
        return false;
      }
      if (phase === 'assault') {
        const ended = assault.update(delta, input);
        if (disposed || battle.state !== 'enemy-mode') { dispose(); return false; }
        if (ended) enter('bursts');
        return false;
      }
      if (phase === 'bursts') {
        const count = Math.min(4, 1 + Math.floor(phaseTime / 0.25));
        while (burstCount < count) { burstCount++; cue('break1', 0.75); }
      }
      if (phase === 'smoke') renderer.updateSmoke(delta);
      if (phase === 'autocharge' && chargeHandle) {
        const progress = Math.min(1, phaseTime / C.seconds.autocharge);
        chargeHandle.volume = battle.game.sound.muted ? 0 : C.chargeAudio.startVolume + (C.chargeAudio.endVolume - C.chargeAudio.startVolume) * progress;
      }
      if (phase === 'fall') {
        const progress = Math.min(1, phaseTime / C.seconds.fall);
        boss.y = fallStartY + C.finisher.fallDistance * progress * progress;
        if (progress >= 1) {
          enemy.hp = 0; enemy.dead = true; enemy.dying = 0; enemy.finaleComplete = true;
          change('done'); return true;
        }
      }
      if (phaseTime + 1e-9 >= C.seconds[phase] && transitions[phase]) enter(transitions[phase]);
      return false;
    },
    draw(ctx) { renderer.draw(ctx, snapshot(), assault); },
    dispose,
  };
}
