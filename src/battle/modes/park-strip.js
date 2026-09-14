import { PARK_GUARDIAN as C } from '../../data/park-guardian.js';
import L from '../../data/locale/ko.js';
import { drawParkCostume } from '../support/park-guardian.js';

/** The support owns phase changes; this mode owns both bodies' collision/flight timeline. */
export function createParkStrip(battle, { member, target }) {
  const timing = C.strip, home = [...member.home], contact = [target.x - 30, target.y + 6];
  const impactAt = timing.windup + timing.rush, launchAt = impactAt + timing.impact;
  const landAt = launchAt + timing.flight, returnAt = landAt + timing.offscreenHold;
  const endAt = returnAt + timing.return + timing.settle;
  let elapsed = 0, collided = false, phase = 'windup', shellProgress = 0, eventIndex = 0, disposed = false;
  const action = { mode: 'attack', elapsed: 0, position: [...home], rotation: 0, airborne: false, hidden: false, update() {} };
  const events = [
    { at: 0, sound: 'scrape', volume: 0.35 },
    { at: impactAt, sound: 'hit', volume: 0.8, impact: true },
    { at: launchAt, sound: 'whoosh', volume: 0.75 },
    { at: landAt, sound: 'thud', volume: 0.6 },
    ...Array.from({ length: Math.ceil(timing.return / timing.stepSeconds) }, (_, i) => ({ at: returnAt + i * timing.stepSeconds, sound: `iron_step_${i % 2 + 1}`, volume: 0.32, clearText: i === 0 })),
  ];
  member.action = action; member.pose = null;
  battle.setText(L.battle_strip_rush);
  return {
    get snapshot() { return { phase, elapsed, collided, x: action.position[0], y: action.position[1], spin: action.rotation, hidden: action.hidden, shellProgress }; },
    update(dt) {
      if (disposed) return true;
      elapsed += Math.max(0, dt); action.elapsed = elapsed;
      while (eventIndex < events.length && elapsed >= events[eventIndex].at) {
        const event = events[eventIndex++];
        if (event.impact && !collided) { collided = true; battle.support.expose(target); target.shake = 0.3; battle.game.shake = { time: 0.3, amp: 5 }; battle.setText(L.battle_strip_flung); }
        if (event.clearText) battle.setText('');
        battle.sfx(event.sound, { volume: event.volume });
      }
      action.rotation = 0; action.airborne = false; action.hidden = false;
      shellProgress = Math.min(1, Math.max(0, (elapsed - launchAt) / timing.flight));
      if (elapsed < timing.windup) {
        phase = 'windup';
        action.mode = 'attack'; action.elapsed = Math.min(elapsed, 0.1);
        action.position = [home[0] - 10 * Math.min(1, elapsed / timing.windup), home[1]];
        target.patternPose = { sheet: 'adjust', frame: Math.min(3, Math.floor(elapsed / timing.windup * 4)) };
      } else if (elapsed < impactAt) {
        phase = 'rush';
        const k = (elapsed - timing.windup) / timing.rush;
        action.mode = 'approach'; action.position = [home[0] - 10 + (contact[0] - home[0] + 10) * k, home[1] + (contact[1] - home[1]) * k];
      } else if (elapsed < launchAt) {
        phase = 'impact'; action.mode = 'attack'; action.position = [...contact]; action.elapsed = 0.14;
      } else if (elapsed < landAt) {
        phase = 'flight';
        const k = (elapsed - launchAt) / timing.flight;
        action.mode = 'attack'; action.elapsed = 0.14; action.airborne = true; action.rotation = timing.flightSpin * k;
        action.position = [contact[0] + (timing.exitX - contact[0]) * k, contact[1] + (home[1] - contact[1]) * k - 4 * timing.flightLift * k * (1 - k)];
      } else if (elapsed < returnAt) {
        phase = 'offscreen'; action.mode = 'return'; action.position = [timing.exitX, home[1]]; action.hidden = true;
      } else {
        const k = Math.min(1, (elapsed - returnAt) / timing.return);
        phase = k < 1 ? 'return' : 'settle';
        action.mode = k < 1 ? 'return' : 'idle'; action.elapsed = elapsed - returnAt;
        action.position = [timing.exitX + (home[0] - timing.exitX) * k, home[1]];
      }
      return elapsed >= endAt;
    },
    draw(ctx) {
      const image = battle.support.emptyImage;
      if (collided && image) {
        drawParkCostume(ctx, image, target, shellProgress);
      }
      battle.drawTextBox(ctx);
    },
    dispose() { disposed = true; action.rotation = 0; action.hidden = false; action.airborne = false; member.action = null; member.pose = null; target.patternPose = null; },
  };
}
