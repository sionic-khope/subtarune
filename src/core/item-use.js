import { ITEMS } from '../data/items.js';
import { fullParty } from './party.js';
import L from '../data/locale/ko.js';

export function useFieldItem(game, name, target) {
  const def = ITEMS[name], index = game.inventory.indexOf(name);
  const members = fullParty(game.party, game.playerSprite || 'hyungsub');
  if (!def?.heal || index < 0 || !members.includes(target)) return false;
  game.inventory.splice(index, 1);
  for (const id of def.target === 'party' ? members : [target]) {
    game.partyHp[id] = Math.max(1, Math.min(game.maxHpOf(id), game.hpOf(id) + def.heal));
  }
  game.sound.sfx(def.heal < 0 ? 'hurt' : 'heal');
  game.autosave();
  return true;
}

export function useBattleItem(battle, { name, target, member: actor = target }) {
  const def = ITEMS[name], index = battle.game.inventory.indexOf(name);
  if (!def?.heal || index < 0 || !battle.members.includes(target)) return false;
  battle.game.inventory.splice(index, 1);
  for (const member of def.target === 'party' ? battle.members : [target]) {
    const before = member.hp;
    member.hp = Math.max(def.heal < 0 ? Math.min(1, before) : 0, Math.min(member.maxHp, before + def.heal));
    if (member.down && member.hp > 0) member.down = false;
    const change = member.hp - before;
    member.popup = { t: 0, text: (change >= 0 ? '+' : '') + change, heal: change >= 0 };
  }
  battle.sfx(def.heal < 0 ? 'hurt' : 'heal');
  battle.setText(L.battle_item_used.replace('{actor}', actor.name).replace('{target}', def.target === 'party' ? L.battle_item_party : target.name).replace('{item}', name));
  return true;
}
