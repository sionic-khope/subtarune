const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const N = text => ({ voice: 'narrator', text: `* ${text}` });

export const castle_regret_stele1 = [N('나도 너희들이 하라고해서 한거야,\n진정으로 내가 돌리고싶어서 돌린게 아니야.')];
export const castle_regret_stele2 = [N('너희들도 웃어줬잖아,\n내가 이긴판에서 좋아한게 뭐가 문제야?')];
export const castle_regret_stele3 = [N('그래. 어린애를 그렇게 몰아친 내가 쓰레기지 위선자들.')];
export const castle_regret_stele4 = [N('자격지심 아니야. 아니라고, 아니라면 아닌줄알아')];
export const castle_regret_stele5 = [N('패드립하지마,, 더러운말을 하면 안됐었어... 난... 이런 시선을 받으려고... 살아온게..')];
export const castle_regret_stele6 = [N('세상이 나를 억까하고 있어,\n난 더 성공할 수 있는 사람이였어.')];

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
