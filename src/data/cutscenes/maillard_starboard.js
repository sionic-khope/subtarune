export const maillard_starboard_gate = Object.assign([
  { if: flags => !flags.captain_attack_done || flags.maillard_starboard_open, goto: 'end' },
  { camera: [20, 7.5], duration: 0.35 },
  { face: 'starboard_junhee', dir: 'right' },
  { parallel: [
    { move: 'player', rel: 'saloon_to_starboard', at: 'left', by: [-184, 20], run: true },
    { move: 'ppaman', rel: 'saloon_to_starboard', at: 'left', by: [-248, 20], run: true },
    { move: 'gyeongsub', rel: 'saloon_to_starboard', at: 'left', by: [-312, 20], run: true },
  ] },
  ...['player', 'ppaman', 'gyeongsub'].map(id => ({ face: id, dir: 'right' })),
  ...Array.from({ length: 4 }, () => [
    { parallel: [
      { nod: 'starboard_junhee', duration: 0.24, times: 1, depth: 5 },
      { sfx: 'knock' },
    ] },
    { wait: 0.12 },
  ]).flat(),
  { tiles: 'maillard_starboard_open' },
  { action: game => {
    const definition = game.map.def.entities.find(entity => entity.id === 'starboard_door_image');
    game.spawn({ ...definition });
  } },
  { sfx: 'thud' },
  { set: { maillard_starboard_open: true } },
  { wait: 0.3 },
  { move: 'starboard_junhee', rel: 'saloon_to_starboard', at: 'left', by: [-4, 0], dash: true },
  { parallel: [
    { move: 'starboard_junhee', px: [904, 264], dash: true },
    { move: 'starboard_yongjun', rel: 'saloon_to_starboard', at: 'left', by: [-4, 0], dash: true },
  ] },
  { remove: 'starboard_junhee' },
  { move: 'starboard_yongjun', px: [904, 264], dash: true },
  { remove: 'starboard_yongjun' },
  { face: 'player', dir: 'right' },
  { regroup: true },
  { camera: 'player' },
  { label: 'end' },
  { end: true },
], { silent: true });
