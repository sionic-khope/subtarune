import { freeSpot } from '../../world/world.js';
import { roamerTalkStage } from './helpers.js';

const B = (text) => ({ speaker: '야꿀벌', voice: 'yakulbeol', text });
const M = (text) => ({ speaker: '마뱀이', voice: 'mabaem', text });
const Y = (text) => ({ speaker: '예림', voice: 'yerim', text });
const W = (text) => ({ speaker: '박원숭', voice: 'parkwonsung', text });
const P = (text) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text });
const G = (text) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text });

export const maillard_yakulbeol = Object.assign([
  ...roamerTalkStage('yakulbeol'),
  B('* 야꿀벌이에요.'),
], { silent: true });

export const maillard_mabaem = Object.assign([
  ...roamerTalkStage('mabaem'),
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
  { camera: [17, 9], duration: 0.35 },
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
  { async: [{ fling: 'parkwonsung', vx: 200, vup: 250, gravity: 658, spin: 16, duration: 0.76, keep: true, sfx: 'whoosh' }] },
  { ...W('* 우끼이익'), cut: 0.82 },
  { action: (g) => {
    const monkey = g.entities.find(e => e.id === 'parkwonsung');
    [monkey.x, monkey.y] = freeSpot(g, monkey, monkey.x + monkey.flyX, monkey.y);
    monkey.flyX = 0; monkey.flyY = 0; monkey.hopY = 0; monkey.spin = 0;
    g.entities.find(e => e.id === 'yerim').setSprite('yerim');
  } },
  { move: 'parkwonsung', rel: 'yerim', at: 'right', by: [160, 0], dash: true },
  { face: 'parkwonsung', dir: 'left' },
  { sfx: 'thud' },
  { wait: 0.3 },
  Y('* 제가 이러고 삽니다.'),
  P('* 어.. 캠 끄신거 아니죠? 당신요'),
  Y('* 네?'),
  P('* 아 아니에요'),
  { camera: 'player' },
  { set: { maillard_yerim_pair_seen: true } },
  { end: true },
  { label: 'again' },
  Y('* 어 안녕하세요'),
], { silent: true });
