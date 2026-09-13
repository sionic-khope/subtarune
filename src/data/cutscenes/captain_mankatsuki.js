import { battleEntry } from './helpers.js';

export const captain_mankatsuki = Object.assign([
  { if: flags => !!flags.captain_mankatsuki_defeated, goto: 'end' },
  { camera: [13, 10], duration: 0.4 },
  { parallel: ['ppaman', 'player', 'gyeongsub'].map((id, index) => ({
    move: id, rel: 'captain_mankatsuki', at: 'bottom', by: [(index - 1) * 64, 90], run: true,
  })) },
  ...['ppaman', 'player', 'gyeongsub'].map(id => ({ face: id, dir: 'up' })),
  { face: 'captain_mankatsuki', dir: 'down' },
  { sfx: 'whoosh' },
  { vortex: { at: 'captain_mankatsuki', size: 200, grow: 0.75 } },
  { async: [{ wait: 0.75 }, { shake: 0.45, amp: 4 }] },
  { wait: 2 },
  { vortex: null },
  ...battleEntry(['mankatsuki_junhee'], 'mankatsuki_battle'),
  { battle: { enemies: ['mankatsuki_junhee'], bgm: 'mankatsuki_battle', bg: 'mankatsuki_vortex', flag: 'captain_mankatsuki_defeated' } },
  { remove: 'captain_mankatsuki' },
  { bgm: 'maillard_lounge' },
  { zoom: 1, duration: 0 },
  { camera: 'player' },
  { fade: 'in', duration: 0.3 },
  { label: 'end' },
  { end: true },
], { silent: true });
