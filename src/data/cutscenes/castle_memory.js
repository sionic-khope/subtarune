const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });

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
