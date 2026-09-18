import {
  SHIP_MEMORY,
  SHIP_MEMORY_PANEL_BEAT_DURATION,
} from '../ship-memory.js';
import { SHIP_CASTLE } from '../ship-castle.js';

const N = text => ({ voice: 'narrator', speed: 0.58, text: `* ${text}` });
const Y = text => ({ speaker: '요플래', portrait: 'hyungsub', voice: 'hyungsub', speed: 0.58, text: `* ${text}` });
const beat = name => ({ shipMemoryBeat: name, action: game => game.shipMemory?.setBeat(name) });
const close = { action: game => game.textbox.close() };

export const ship_sinking = Object.assign([
  { if: flags => flags.ship_sinking_done, goto: 'end' },
  { action: game => game.startShipMemory() },
  { fade: 'in', duration: SHIP_CASTLE.timing.sinkFadeIn },
  { wait: SHIP_MEMORY.timing.preTextDelay },
  N('...'),
  N('... ... ... 가재맨'),
  N('어쩌다가 우린'),
  N('이렇게 된걸까'),
  N('분명 행복한 삶이지 않았는가.'),
  close,
  ...SHIP_MEMORY.panels.flatMap(panel => [
    beat(panel.id),
    { wait: SHIP_MEMORY_PANEL_BEAT_DURATION },
  ]),
  beat('underwater_return'),
  { wait: SHIP_MEMORY.timing.returnTransition },
  Y('... 그럼에도'),
  Y('난 ... 포기할수...'),
  close,
  beat('shore_transition'),
  { wait: SHIP_MEMORY.timing.shoreTransition },
  { fade: 'white', duration: 0 },
  { curtain: 'white' },
  { action: game => game.finishShipMemory(false) },
  { action: game => {
    game.party = [];
    game.spawnParty();
  } },
  { map: 'jjajang_shore', spawn: 'washed_up', enter: true },
  { label: 'end' },
  { end: true },
], { silent: true });

export const shipSinkingScripts = { ship_sinking };
