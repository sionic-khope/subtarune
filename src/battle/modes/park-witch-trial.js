import { PARK_WITCH_TRIAL as C } from '../../data/park-witch-trial.js';
import { drawParkTrial } from './park-witch-trial-draw.js';

/** Court enemy turn: heart-position confirmation, single penalty, owned audio cleanup. */
export function createParkWitchTrial(battle) {
  const sound = battle.game.sound, art = {};
  const oldBoard = { ...battle.board.rect, target: battle.board.target && { ...battle.board.target } };
  let phase = 'enter', phaseTime = 0, elapsed = 0, choice = null, remaining = C.seconds;
  let damageApplied = false, disposed = false, resumed = false, confirmHeld = true, shown = 0;
  let verdict = 0, cue = null, cueBuffer = null, cueReady = typeof Image === 'undefined', assetError = null;
  const restoreBoard = () => { Object.assign(battle.board, oldBoard); };
  const ready = () => cueReady && Object.values(art).every(item => item.ready);
  for (const [key, src] of Object.entries(C.assets)) {
    const item = art[key] = { image: null, ready: typeof Image === 'undefined' };
    if (typeof Image !== 'undefined') {
      const image = new Image();
      image.onload = () => { item.image = image; item.ready = true; };
      image.onerror = () => { assetError = src; };
      image.src = src;
    }
  }
  if (typeof Image !== 'undefined') sound.loadCue(C.objectionAudio).then(buffer => {
    cueBuffer = buffer; cueReady = true;
  }).catch(error => { assetError = String(error); });
  sound.pauseBgm(0);
  const ownedPause = sound.paused;
  battle.setText('');
  const change = next => { phase = next; phaseTime = 0; shown = 0; };
  const line = () => ['opening', 'declaration', 'defeated'].includes(phase) ? C.text[phase] : null;
  const finish = () => {
    if (battle.alive().length && !disposed) { sound.resumeBgm(0.25); resumed = true; }
    change('done'); restoreBoard();
  };
  const select = index => {
    choice = index;
    if (index === 3) {
      change('objection'); battle.sfx('whoosh', { volume: 0.65 });
      if (cueBuffer) cue = sound.playCue(cueBuffer, { volume: 0.9 });
    } else { change('verdict'); battle.sfx('thud'); }
  };
  return {
    fullscreen: true,
    get snapshot() { return { phase, phaseTime, elapsed, choice, remaining, damageApplied, disposed, resumed, shown, verdict, assetsReady: ready(), assetError, objectionAudio: cue ? { elapsed: cue.elapsed } : null, heart: { x: battle.soul.x, y: battle.soul.y } }; },
    update(dt, input) {
      if (disposed || phase === 'done') return true;
      const delta = Math.max(0, dt);
      elapsed += delta; phaseTime += delta;
      const pressed = input.just('confirm') && !confirmHeld;
      confirmHeld = input.down('confirm');
      if (phase === 'enter') {
        battle.board.setTarget(C.board.w, C.board.h, 240, 180);
        if (!ready()) phaseTime = Math.min(phaseTime, C.timing.enter);
        else if (phaseTime >= C.timing.enter) change('opening');
      } else if (line()) {
        const previous = Math.floor(shown);
        shown = Math.min(line().length, shown + delta / C.timing.character);
        if (Math.floor(shown) > previous) sound.blip('park_guardian_costume');
        if (pressed) {
          if (shown < line().length) shown = line().length;
          else if (phase === 'opening') change('declaration');
          else if (phase === 'declaration') { change('declare-effect'); battle.sfx('thud', { volume: 0.8 }); }
          else change('leave');
        }
      } else if (phase === 'declare-effect' && phaseTime >= C.timing.declaration) {
        change('question'); Object.assign(battle.soul, C.start); battle.soul.invuln = 0;
      } else if (phase === 'question') {
        battle.soul.update(delta, input, C.board);
        remaining = Math.max(0, remaining - delta);
        if (!remaining) select(0);
        else if (pressed) {
          const index = C.choices.findIndex(zone => battle.soul.x >= zone.x && battle.soul.x <= zone.x + zone.w && battle.soul.y >= zone.y && battle.soul.y <= zone.y + zone.h);
          if (index >= 0) select(index + 1);
        }
      } else if (phase === 'verdict' && phaseTime >= C.timing.verdict) {
        if (++verdict < C.text.verdicts.length) { phaseTime = 0; battle.sfx('thud'); }
        else { change('sword'); battle.sfx('whoosh'); }
      } else if (phase === 'sword' && phaseTime >= C.timing.sword) {
        change('impact'); damageApplied = true;
        battle.sfx('hit'); battle.hurtAllParty(C.damage);
      } else if (phase === 'impact' && phaseTime >= C.timing.impact) finish();
      else if (phase === 'objection' && phaseTime >= C.timing.objection && (!cue || cue.elapsed >= cueBuffer.duration)) { change('shatter'); battle.sfx('park_trial_shatter'); }
      else if (phase === 'shatter' && phaseTime >= C.timing.shatter) change('defeated');
      else if (phase === 'leave' && phaseTime >= C.timing.leave) finish();
      return phase === 'done';
    },
    draw(ctx) { drawParkTrial(ctx, { phase, phaseTime, elapsed, shown, remaining, verdict, choice, art, soul: battle.soul, board: battle.board }); },
    dispose() {
      if (disposed) return;
      disposed = true; cue?.stop(); cue = null; restoreBoard();
      if (ownedPause && sound.paused === ownedPause) { ownedPause.a.pause(); ownedPause.a.src = ''; sound.paused = null; }
    },
  };
}
