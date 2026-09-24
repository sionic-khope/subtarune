const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });

export const castle_lobby_left_enter = Object.assign([
  { if: flags => !flags.castle_pipe_returned, goto: 'end' },
  { action: game => game.textbox.close() },
  { sfx: 'locker' }, { fade: 'out', duration: 0.55 },
  { map: 'gajaeman_castle_left1', spawn: 'start' },
  { fade: 'in', duration: 0.6 },
  { label: 'end' }, { end: true },
], { silent: true });

export const castle_regret_sign = [
  P('후회의방 이라고 적혀있어요'),
  K('후회? 뭘까..'),
  { end: true },
];

export const castle_regret_enter = Object.assign([
  { action: game => game.textbox.close() },
  { sfx: 'locker' }, { fade: 'out', duration: 0.55 },
  { map: 'gajaeman_regret1', spawn: 'start' },
  { fade: 'in', duration: 0.6 }, { end: true },
], { silent: true });
