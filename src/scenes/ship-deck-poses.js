import { loadCharacterMotions } from '../world/character-motion.js';
import { makeCanvas } from '../core/gfx.js';
import { playbackFrameAt } from '../ui/battle-preview.js';

const NAMES = ['hyungsub', 'gyeongsub', 'ppaman'];

/** Preload approved fist poses under the fade and bind all motion updates to this exact deck script. */
export async function prepareShipDeckPoses(game) {
  clearShipDeckPoses(game);
  const owner = { script: game.dialogue.script, motions: new Map() };
  game.shipDeckPoses = owner;
  game.background.push({ update(dt) {
    if (game.shipDeckPoses !== owner) return true;
    if (game.dialogue.script !== owner.script || game.mapId !== 'ship_night_deck') {
      clearShipDeckPoses(game); return true;
    }
    for (const [actor, motion] of owner.motions) {
      if (actor.motion !== motion || actor.dead) { owner.motions.delete(actor); continue; }
      motion.elapsed += dt;
      motion.index = playbackFrameAt(motion.frames, motion.elapsed, false).index;
    }
    return false;
  } });
  const missing = NAMES.filter(name => !game.characterMotions[name]?.deck_fist);
  if (!missing.length) return;
  const loaded = await loadCharacterMotions(src => game.mapAssets.image(src), makeCanvas, missing,
    Object.fromEntries(missing.map(name => [name, ['deck_fist']])));
  if (game.shipDeckPoses !== owner || game.dialogue.script !== owner.script || game.mapId !== 'ship_night_deck') return;
  for (const name of missing) Object.assign(game.characterMotions[name] ||= {}, loaded[name]);
}

/** Raise a fist once, holding its final frame until the scene fades rather than snapping back to idle. */
export function setShipDeckFist(game, id) {
  const owner = game.shipDeckPoses;
  if (!owner || owner.script !== game.dialogue.script || game.mapId !== 'ship_night_deck') return;
  const actor = id === 'player' ? game.player : game.entities.find(entity => entity.id === id && !entity.dead);
  const name = id === 'player' ? 'hyungsub' : id;
  const definition = game.characterMotions[name]?.deck_fist;
  if (!actor || !definition) return;
  const motion = { ...definition, elapsed: 0, index: 0, loop: false };
  actor.motion = motion; actor.moving = false;
  owner.motions.set(actor, motion);
}

/** Remove only poses owned here; a later animation or another scene's motion remains untouched. */
export function clearShipDeckPoses(game) {
  const owner = game.shipDeckPoses;
  if (!owner) return;
  for (const [actor, motion] of owner.motions) if (actor.motion === motion) actor.motion = null;
  game.shipDeckPoses = null;
}
