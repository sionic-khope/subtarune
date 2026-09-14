import { PARK_WITCH_TRIAL as C } from '../../data/park-witch-trial.js';
import { drawParkTrial } from './park-witch-trial-draw.js';

export function createParkWitchTrial(battle, { trialIndex = Math.max(0, (battle.support?.trialCount ?? 1) - 1) } = {}) {
  const sound = battle.game.sound, art = {};
  const trial = C.cases[trialIndex];
  const copy = { ...C.text, ...trial };
  const choices = C.choices.map((zone, i) => ({ ...zone, text: trial.choices?.[i] ?? zone.text }));
  const choiceTextLengths = choices.map((zone, i) => `${i + 1}. ${zone.text}`.length);
  const choiceShown = choices.map(() => 0);
  let currentChoice = 0, choiceHold = 0;
  const chargeLines = [...trial.chargeLines, C.text.instruction];
  let dialogueIndex = 0;
  const oldBoard = { ...battle.board.rect, target: battle.board.target && { ...battle.board.target } };
  let phase = 'enter', phaseTime = 0, elapsed = 0, choice = null, remaining = C.seconds;
  let damageApplied = false, disposed = false, confirmHeld = true, shown = 0, visibleChoices = 0, readHold = 0;
  let verdict = 0, executionBeats = 0, cue = null, cueBuffer = null, cueReady = typeof Image === 'undefined', assetError = null;
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
  battle.setText('');
  const speak = text => battle.showLine({ speaker: C.text.speaker, portrait: 'park_guardian_costume', voice: 'park_guardian_costume', text });
  const showCharge = () => speak(chargeLines[dialogueIndex]);
  const dialogue = () => ['opening', 'declaration', 'defeated', 'read-question'].includes(phase);
  const change = next => { phase = next; phaseTime = 0; shown = 0; readHold = 0; if (next === 'read-question') showCharge(); else if (dialogue()) speak(copy[next]); else battle.setText(''); };
  const line = () => phase === 'verdict' ? C.text.verdicts[verdict] : ['opening', 'declaration', 'defeated'].includes(phase) ? copy[phase] : null;
  const finish = () => { change('done'); restoreBoard(); };
  const select = index => {
    choice = index;
    if (index === 3) {
      change('objection'); battle.sfx('whoosh', { volume: 0.65 });
      if (cueBuffer) cue = sound.playCue(cueBuffer, { volume: 0.9 });
    } else { change('verdict'); battle.sfx('thud'); }
  };
  return {
    fullscreen: true,
    get snapshot() { return { phase, phaseTime, elapsed, choice, remaining, trialIndex, dialogueIndex, chargeLines, currentSpeech: dialogue() ? battle.text : line(), damageApplied, disposed, shown: dialogue() ? battle.shown : shown, visibleChoices, choiceShown: choiceShown.map(Math.floor), choiceTextLengths, currentChoice, readHold, textLength: dialogue() ? battle.text.length : line()?.length ?? 0, verdict, executionBeats, assetsReady: ready(), assetError, objectionAudio: cue ? { elapsed: cue.elapsed } : null, heart: { x: battle.soul.x, y: battle.soul.y } }; },
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
        const value = line();
        const wasComplete = shown >= value.length;
        shown = dialogue() ? battle.shown : value.length;
        if (wasComplete) readHold += delta;
        if (phase === 'verdict') {
          if (phaseTime >= C.timing.verdict) {
            if (++verdict < C.text.verdicts.length) { change('verdict'); battle.sfx('thud'); }
            else { verdict = C.text.verdicts.length - 1; change('execution-roll'); }
          }
        } else if (pressed) {
          if (shown < value.length) battle.shown = value.length;
          else if (phase === 'opening') change('declaration');
          else if (phase === 'declaration') { change('declare-effect'); battle.sfx('thud', { volume: 0.8 }); }
          else change('leave');
        }
      } else if (phase === 'declare-effect' && phaseTime >= C.timing.declaration) {
        change('read-question'); Object.assign(battle.soul, C.start); battle.soul.invuln = 0;
      } else if (phase === 'read-question' && pressed) {
        if (!battle.typed) battle.shown = battle.text.length;
        else if (++dialogueIndex < chargeLines.length) showCharge();
        else { battle.setText(''); change('choices'); }
      } else if (phase === 'choices') {
        visibleChoices = currentChoice + 1;
        const length = choiceTextLengths[currentChoice], previous = Math.floor(choiceShown[currentChoice]);
        if (choiceShown[currentChoice] < length) {
          choiceShown[currentChoice] = Math.min(length, choiceShown[currentChoice] + delta / C.timing.character);
          if (Math.floor(choiceShown[currentChoice]) > previous) sound.blip('park_guardian_costume');
        } else {
          choiceHold += delta;
          const last = currentChoice === choices.length - 1;
          if (choiceHold >= (last ? C.timing.choiceReadyHold : C.timing.choiceStagger)) {
            if (last) change('question');
            else { currentChoice++; choiceHold = 0; }
          }
        }
      } else if (phase === 'question') {
        battle.soul.update(delta, input, C.board);
        remaining = Math.max(0, remaining - delta);
        if (remaining <= 1e-9) { remaining = 0; select(0); }
        else if (pressed) {
          const index = choices.findIndex(zone => battle.soul.x >= zone.x && battle.soul.x <= zone.x + zone.w && battle.soul.y >= zone.y && battle.soul.y <= zone.y + zone.h);
          if (index >= 0) select(index + 1);
        }
      } else if (phase === 'execution-roll') {
        const beats = Math.min(C.timing.executionBeats, Math.floor(phaseTime / C.timing.executionBeat) + 1);
        if (beats > executionBeats) { executionBeats = beats; battle.sfx('thud', { volume: 0.6 }); }
        if (phaseTime >= C.timing.executionBeats * C.timing.executionBeat) { change('sword'); battle.sfx('whoosh', { volume: 0.5 }); }
      } else if (phase === 'sword' && phaseTime >= C.timing.sword) {
        change('impact'); damageApplied = true;
        battle.sfx('hit'); battle.hurtAllParty(C.damage);
      } else if (phase === 'impact' && phaseTime >= C.timing.impact) change('leave');
      else if (phase === 'objection' && phaseTime >= C.timing.objection && (!cue || cue.elapsed >= cueBuffer.duration)) { change('shatter'); battle.sfx('park_trial_shatter'); }
      else if (phase === 'shatter' && phaseTime >= C.timing.shatter) change('defeated');
      else if (phase === 'leave' && phaseTime >= C.timing.leave) finish();
      return phase === 'done';
    },
    draw(ctx) { drawParkTrial(ctx, { phase, phaseTime, elapsed, shown, visibleChoices, choiceShown, remaining, verdict, choice, art, copy, choices, soul: battle.soul, board: battle.board, battle }); },
    dispose() {
      if (disposed) return;
      disposed = true; cue?.stop(); cue = null; restoreBoard();
    },
  };
}
