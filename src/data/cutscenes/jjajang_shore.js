const N = text => ({ voice: 'narrator', speed: 0.58, text: `* ${text}` });

export const jjajang_shore_arrival = Object.assign([
  { if: flags => flags.ship_sinking_done, goto: 'end' },
  { action: game => {
    game.party = [];
    game.spawnParty();
  } },
  { curtain: 'white' },
  { pose: 'player', to: 'lying' },
  { camera: 'player' },
  { wait: 0.8 },
  { bgm: 'jjajang_shore', volume: 0.42, fadeIn: 1.8 },
  { curtain: null },
  { fade: 'in', duration: 3 },
  { wait: 0.8 },
  N('... ...'),
  N('여긴 어디지.'),
  { action: game => game.textbox.close() },
  { wait: 0.8 },
  { pose: 'player', to: 'stand' },
  { face: 'player', dir: 'up' },
  { stage: 'ship_sinking_done' },
  { camera: 'player' },
  { label: 'end' },
  { end: true },
], { silent: true });

export const jjajangShoreScripts = { jjajang_shore_arrival };
