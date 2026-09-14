import { TvBroadcast } from '../../world/tv-broadcast.js';
import { clearYoungcleLoungeEffects, setYoungcleDoorCutaway } from '../../scenes/youngcle-lounge-effects.js';
import { YOUNGCLE_TV as TV } from '../youngcle-tv.js';

const JID = 'youngcle6_junhee';
const YID = 'youngcle6_yongjun';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const ALL = [...PARTY, JID, YID];
const J = text => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: '* ' + text });
const Y = text => ({ speaker: '박용준', portrait: 'yongjun', voice: 'yongjun', text: '* ' + text });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ' + text });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* ' + text });
const V = (text, expression = 'smirk') => [
  { action: game => game.tvBroadcast.setExpression(expression) },
  { speaker: '영클', portrait: `youngcle_tv_${expression}`, voice: 'youngcle', text: '* ' + text },
];
const close = { action: game => game.textbox.close() };
const partyStage = { parallel: [
  { move: 'gyeongsub', rel: 'youngcle_tv_screen', at: 'bottom', by: [-64, 128], run: true },
  { move: 'player', rel: 'youngcle_tv_screen', at: 'bottom', by: [0, 128], run: true },
  { move: 'ppaman', rel: 'youngcle_tv_screen', at: 'bottom', by: [64, 128], run: true },
] };

export const youngcle_lounge_plan_b = Object.assign([
  { if: flags => flags.youngcle_lounge_plan_b_done, goto: 'finished' },
  { action: game => {
    clearYoungcleLoungeEffects(game);
    game.finishTvBroadcast();
    game.tvBroadcast = new TvBroadcast(game, TV);
    game.sound.preloadBgm(TV.bgm);
    game.sound.stopBgm(0.35);
    for (const id of PARTY) {
      const actor = id === 'player' ? game.player : game.entities.find(entity => entity.id === id);
      actor.visible = false;
      if (id === 'player') actor.solid = false;
    }
  } },
  { parallel: [{ camera: [9.5, 7.25], duration: 0.01 }, { zoom: 0.72, duration: 0.01 }] },
  { fade: 'out', duration: 0 },
  { fade: 'in', duration: 1.25 },
  { wait: 0.35 },
  { face: JID, dir: 'up' },
  { face: YID, dir: `toward:${JID}` },
  J('헉 헉 헉'),
  Y('무슨 퍼즐이 이렇게 있죠???'),
  J('이 족같은 영클 에잇'),
  close,
  { move: JID, rel: 'youngcle_tv_screen', at: 'bottom', by: [-56, 48], run: true },
  { parallel: [{ hop: JID, by: [0, -18], height: 8, duration: 0.24, sfx: 'thud' },
    { shake: 0.3, amp: 4 }] },
  { hop: JID, by: [0, 18], height: 5, duration: 0.22, sfx: false },
  Y('어 형 진 진정하세요'),
  { speaker: '영클', voice: 'youngcle', text: '* 아시발' },
  close,
  { action: game => {
    for (const id of PARTY) {
      const actor = id === 'player' ? game.player : game.entities.find(entity => entity.id === id);
      actor.x = game.camera.x - 48;
      actor.y = 328;
      actor.visible = true;
    }
  } },
  partyStage,
  { action: game => game.tvBroadcast.power(true) },
  { bgm: TV.bgm, fadeIn: 0.55 },
  { wait: TV.powerTime },
  { parallel: [
    { move: JID, rel: 'youngcle_tv_screen', at: 'bottom', by: [-64, 72], run: true },
    { move: YID, rel: 'youngcle_tv_screen', at: 'bottom', by: [64, 72], run: true },
    { move: 'gyeongsub', rel: 'youngcle_tv_screen', at: 'bottom', by: [-72, 136], run: true },
    { move: 'player', rel: 'youngcle_tv_screen', at: 'bottom', by: [0, 136], run: true },
    { move: 'ppaman', rel: 'youngcle_tv_screen', at: 'bottom', by: [72, 136], run: true },
  ] },
  ...ALL.map(id => ({ face: id, dir: 'up' })),
  ...V('뭔데 화풀이하노 ㅋㅋ', 'middle_finger'),
  J('바로 보자면서 함정이나 만들어놓고 말이야 너 !!'),
  ...V('?', 'question'),
  J('?'),
  ...V('뭔개소리노?', 'question'),
  J('시치미때지마 시발년아'),
  ...V('ㄴㄴ진짜모름', 'questions'),
  J('??? 아니 너가 보자했는데'),
  ...V('ㅇㅇ', 'yes'),
  J('함정이랑 몬스터가 우릴 막 공격했다니까'),
  { action: game => game.tvBroadcast.setExpression('facepalm') },
  { sfx: 'thud', volume: 0.58 },
  { speaker: '영클', portrait: 'youngcle_tv_facepalm', voice: 'youngcle', text: '* 아설마' },
  J('??'),
  ...V('ㅂㅅ새끼 혹시 오른쪽문 쓰셨나요?', 'question'),
  J('그런데?'),
  ...V('거기는 함정존임'),
  J('??? 아니 왜 무슨'),
  ...V('라운지맵 왼쪽에 뻔하게 편하게 오는 천사문 있는데 왜 거길로감? ㅋㅋ ㅂㅅ임', 'taunt'),
  close,
  { fade: 'out', duration: 0.65 },
  { action: game => setYoungcleDoorCutaway(game, true) },
  { fade: 'in', duration: 0.72 },
  { wait: 1.25 },
  { fade: 'out', duration: 0.72 },
  { action: game => setYoungcleDoorCutaway(game, false) },
  { fade: 'in', duration: 0.72 },
  J('...'),
  ...V('음 근데 차라리 잘됐음', 'smirk'),
  J('뭐가?'),
  ...V('... ... ...', 'smirk'),
  close,
  { youngcleCageDrop: { targets: [JID, YID], sfx: 'whoosh', impactSfx: 'plug', impactBodySfx: 'thud',
    fallDuration: 0.78, impactHold: 0.28, carryDuration: 1.05 } },
  ...V('플랜B', 'smirk'),
  G('..뭐 뭐하는거야 영클아 지금'),
  ...V('오 경섭이형 ㅎㅇㅎㅇ', 'greet'),
  G('어 반갑다'),
  P('왜 쥰희랑 용준이를 납치하신거에요?'),
  ...V('흠', 'shrug'),
  P('쥰희랑 용준이는 적이 아니에요'),
  ...V('ㅇㅇ', 'yes'),
  P('네?'),
  ...V('내 알바 아님 ㅋㅋ 알아서 잘 나와보샘', 'taunt'),
  ...V('그리고 조심해라 그 다음방은', 'smirk'),
  P('ㅇ..왜 우리는 철창으로 공격 안하시죠'),
  ...V('그야', 'shrug'),
  ...V('두개밖에 준비안했음 ㅇ', 'yes'),
  P('...'),
  ...V('원래 완벽한 플랜B는 없음', 'smirk'),
  P('네'),
  ...V('ㅇㅇ ㅂㅇ', 'bye'),
  close,
  { action: game => game.tvBroadcast.power(false) },
  { wait: TV.shutdownTime },
  P('어.. 일단 쥰희랑 용준이는 알아서하겠죠 영클형 보러 갑시다'),
  G('다음방이 걱정되는데 난..'),
  close,
  { action: game => {
    game.finishTvBroadcast();
    clearYoungcleLoungeEffects(game);
    game.player.solid = true;
  } },
  { parallel: [{ camera: 'player' }, { zoom: 1, duration: 0.35 }] },
  { regroup: true },
  { bgm: 'youngcle_factory', fadeIn: 0.65, volume: 0.45 },
  { set: { youngcle_lounge_plan_b_done: true } },
  { label: 'finished' },
  { end: true },
], { silent: true });
