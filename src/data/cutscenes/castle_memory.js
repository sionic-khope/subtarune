const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const N = text => ({ voice: 'narrator', text: `* ${text}` });

export const castle_memory_stele1 = [N('나도 사실은 이런대우가 싫었어. 나도 올라가고싶었어.')];
export const castle_memory_stele2 = [N('이렇게 하면 사람들이 좋아해주니까 그런거였어')];
export const castle_memory_stele3 = [N('왜 나에게 창녀라고 하는거야?')];
export const castle_memory_stele4 = [N('자꾸 높이있는녀석들과 비교하지마, 나를 봐달란말이야')];
export const castle_memory_stele5 = [N('하지마, 난 그런사람이 아니라고, 오해하지 말아줘')];
export const castle_memory_stele6 = [N('사실은 말이야, 나도 양지에 가고싶었어.')];

export const castle_memory_sign = [
  P('음.. 기억의 방이라고 적혀있어요'),
  K('무슨뜻일까'),
  P('일단 들어가보시죠'),
  { end: true },
];

export const castle_memory_enter = Object.assign([
  { action: game => game.textbox.close() },
  { sfx: 'locker' }, { fade: 'out', duration: 0.55 },
  { map: 'gajaeman_memory1', spawn: 'start' },
  { fade: 'in', duration: 0.6 }, { end: true },
], { silent: true });
