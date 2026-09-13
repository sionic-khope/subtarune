const B = (text) => ({ speaker: '야꿀벌', voice: 'yakulbeol', text });
const M = (text) => ({ speaker: '마뱀이', voice: 'mabaem', text });
const Y = (text) => ({ speaker: '예림', voice: 'yerim', text });
const W = (text) => ({ speaker: '박원숭', voice: 'parkwonsung', text });
const P = (text) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text });
const G = (text) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text });

export const maillard_yakulbeol = Object.assign([
  B('* 야꿀벌이에요.'),
], { silent: true });

export const maillard_mabaem = Object.assign([
  { if: (f) => f.maillard_mabaem_seen, goto: 'again' },
  M('* 어 안녕하세여'),
  P('* 뭐해요?'),
  M('* 아 저 로블록스 하고있어요'),
  P('* 오 저도 같이해요'),
  G('* 우리 할일이 남아있어'),
  P('* 알아서할게요씨발'),
  { voice: 'narrator', text: '* ... 갈길 가야된다' },
  { set: { maillard_mabaem_seen: true } },
  { end: true },
  { label: 'again' },
  M('* 어 안녕하세여'),
], { silent: true });

export const maillard_yerim_pair = Object.assign([
  { if: (f) => f.maillard_yerim_pair_seen, goto: 'again' },
  { camera: [27, 12.625], duration: 0.35 },
  { parallel: [
    { move: 'player', rel: 'yerim', at: 'bottom', by: [56, 72], run: true },
    { move: 'gyeongsub', rel: 'yerim', at: 'bottom', by: [-8, 72], run: true },
    { move: 'ppaman', rel: 'yerim', at: 'bottom', by: [120, 72], run: true },
  ] },
  { face: 'player', dir: 'up' },
  { face: 'gyeongsub', dir: 'up' },
  { face: 'ppaman', dir: 'up' },
  { face: 'yerim', dir: 'down' },
  { face: 'parkwonsung', dir: 'left' },
  P('* 어 예림님 안녕하세요'),
  Y('* 어 안녕하세요'),
  P('* 옆에 애는 뭐지?'),
  W('* 우끽!'),
  { hop: 'parkwonsung', height: 18, duration: 0.3 },
  { move: 'parkwonsung', rel: 'yerim', at: 'right', by: [8, 0], dash: true },
  { face: 'parkwonsung', dir: 'left' },
  W('* 킁킁 킁킁 킁킁 킁킁'),
  Y('* 아 씨밯 이거 뭐야'),
  { action: (g) => g.entities.find(e => e.id === 'yerim').setSprite('yerim_kick') },
  { sfx: 'thud' },
  { async: [{ fling: 'parkwonsung', vx: 700, vup: 400, gravity: 600, spin: 30, duration: 1.3, sfx: 'whoosh' }] },
  { ...W('* 우끼이익'), cut: 1.35 },
  { action: (g) => g.entities.find(e => e.id === 'yerim').setSprite('yerim') },
  { wait: 0.3 },
  Y('* 제가 이러고 삽니다.'),
  P('* 와 진짜미쳣네 이년'),
  Y('* 네?'),
  P('* 아 아니에요'),
  { camera: 'player' },
  { set: { maillard_yerim_pair_seen: true } },
  { end: true },
  { label: 'again' },
  Y('* 어 안녕하세요'),
], { silent: true });
