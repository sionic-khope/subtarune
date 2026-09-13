import { battleEntry } from './helpers.js';
import { FX } from '../fx.js';

export const captain_mankatsuki = Object.assign([
  { if: flags => !!flags.captain_mankatsuki_defeated, goto: 'end' },
  { camera: [13, 7], duration: 1 },
  { parallel: ['ppaman', 'player', 'gyeongsub'].map((id, index) => ({
    move: id, rel: 'captain_mankatsuki', at: 'bottom', by: [(index - 1) * 64, 90], run: true,
  })) },
  ...['ppaman', 'player', 'gyeongsub'].map(id => ({ face: id, dir: 'up' })),
  { face: 'captain_mankatsuki', dir: 'down' },
  { wait: 0.8 },
  { parallel: [
    { boom: { ...FX.mankatsuki_vortex, at: 'captain_mankatsuki', offset: [0, -44], scale: 0.16,
      endScale: 1.12, grow: 5.8, duration: 8, sfx: 'whoosh' } },
    { async: [
      { shake: 2.4, amp: 1.5 },
      { sfx: 'rumble' },
      { shake: 2.4, amp: 3 },
      { sfx: 'whoosh' },
      { shake: 3.2, amp: 5 },
    ] },
  ] },
  { wait: 0.7 },
  ...battleEntry(['mankatsuki_junhee'], 'mankatsuki_battle'),
  { darkSmoke: null },
  { battle: { enemies: ['mankatsuki_junhee'], bgm: 'mankatsuki_battle', bg: 'mankatsuki_vortex', flag: 'captain_mankatsuki_defeated' } },
  { remove: 'captain_mankatsuki' },
  { bgm: 'maillard_lounge' },
  { zoom: 1, duration: 0 },
  { camera: 'player' },
  { fade: 'in', duration: 0.3 },
  { label: 'end' },
  { end: true },
], { silent: true });
