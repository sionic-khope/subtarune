import { TvBroadcast } from '../../world/tv-broadcast.js';
import { YOUNGCLE_TV as TV } from '../youngcle-tv.js';

const JID = 'youngcle_junhee', YID = 'youngcle_yongjun';
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
const partyAt = y => ({ parallel: PARTY.map((id, index) => ({ move: id, rel: 'youngcle_tv_screen',
  at: 'bottom', by: [[0, -64, 64][index], y - 192], run: true })) });

export const youngcle_intro = Object.assign([
  { if: flags => flags.youngcle_intro_done, goto: 'end' },
  { action: game => {
    game.finishTvBroadcast();
    game.tvBroadcast = new TvBroadcast(game, TV);
    for (const id of PARTY) {
      const actor = id === 'player' ? game.player : game.entities.find(entity => entity.id === id);
      actor.visible = false; actor.solid = false;
    }
    game.sound.preloadBgm(TV.bgm);
  } },
  { parallel: [{ camera: [21, 7.25], duration: 0.01 }, { zoom: 0.72, duration: 0.01 }] },
  { face: JID, dir: `toward:${YID}` }, { face: YID, dir: `toward:${JID}` },
  { fade: 'out', duration: 0 },
  { fade: 'in', duration: 1.25 },
  J('어딨어 이자식들'),
  Y('혀엉 형 일단 진 진정해요'),
  close,
  { action: game => {
    for (const id of PARTY) (id === 'player' ? game.player : game.entities.find(entity => entity.id === id)).visible = true;
  } },
  partyAt(264),
  { face: 'player', dir: 'up' }, { face: 'gyeongsub', dir: 'right' }, { face: 'ppaman', dir: 'left' },
  P('와 여기가 훨빠 좋네 씨바 ㅋㅋ\n저 좆같은 배 버리자.'),
  close,
  { bubble: [JID, 'gyeongsub'], dots: 3, gap: 0.2, hold: 0.6 },
  G('어 빠맨아 일단 방금말은 사과해야할거같아'),
  P('미..'), J('... 미?'), P('니애미'),
  Y('형들 어쨋든 일단 이 배 주인이 누군지 알아야될거 같..'),
  { speaker: '???', voice: 'youngcle', text: '* 후후후' },
  close,
  { parallel: ALL.map(id => ({ emote: id, kind: '!', duration: 1.1, hold: 0.45 })) },
  { parallel: [
    { camera: [21, 7], duration: 0.45 }, partyAt(284),
    { move: JID, rel: 'youngcle_tv_screen', at: 'bottom', by: [-128, 56], speed: 45 },
    { move: YID, rel: 'youngcle_tv_screen', at: 'bottom', by: [128, 56], speed: 45 },
  ] },
  ...ALL.map(id => ({ face: id, dir: 'up' })),
  { action: game => game.tvBroadcast.power(true) },
  { wait: TV.powerTime },
  { bgm: TV.bgm },
  ...V('반갑노 게이들아'),
  P('어 영.. 영클형?'),
  ...V('뭐냐 그 촌스러운 전함은? ㅋㅋ', 'laugh'),
  J('ㅁ 뭐 시발롬아'),
  ...V('긁혔나보노 ㅋㅋ', 'taunt'),
  J('아니야 시발아'),
  // 배 이름 개그(2026-09-14 사용자 원문): 엄청 대박인 배 = 엄마가 청소년인 사람 대가리를 박살낼 (인?) 배
  ...V('어쨋든 여러분들 환영합니다.', 'greet'),
  ...V('여기로 말할 것 같으면....'),
  ...V('크크 엄청 대박인 배다!', 'laugh'),
  J('센스 구린데'),
  ...V('엄마가 청소년인 사람 대가리를 박살낼 배!!!', 'taunt'),
  close,
  { bubble: ALL, gap: 0.24, hold: 0.65 },
  J('그럼 인은 뭔데'),
  ...V('음 인면견?', 'question'),
  ...V('오', 'oh'), G('?'),
  ...V('경섭이형도 계셨네요 ㅎㅇㅎㅇ', 'greet'), G('어 반갑다.'),
  J('그래서 왜 내 전함을 공격한거야?'),
  ...V('어 그건..', 'shrug'),
  ...V('그냥 ㅈㄴ부시고싶게 생겨서?', 'taunt'), J('...'),
  ...V('잔말말고 그냥 얼굴보고 예기하시죠 여기 편집자애들이랑 좀 모여있어요.'),
  P('네 글로 가면 될까요?'), ...V('ㅇㅇ', 'yes'), P('네 그럼 이따 봬요'), ...V('ㅂㅇ', 'bye'),
  close,
  { action: game => game.tvBroadcast.power(false) },
  { wait: TV.shutdownTime },
  J('쟨 내가 죽인다.'),
  close,
  { camera: [31, 7.25], duration: 0.65 },
  { move: JID, rel: 'youngcle_right_door', at: 'bottom', by: [0, 24], run: true },
  { move: JID, rel: 'youngcle_right_door', at: 'bottom', run: true },
  { doorTransit: { actor: JID, door: 'youngcle_right_door_image', inset: [33, 18, 31, 65] } },
  { remove: JID },
  { wait: 0.3 },
  { move: YID, rel: 'youngcle_right_door', at: 'bottom', by: [0, 24], run: true },
  { move: YID, rel: 'youngcle_right_door', at: 'bottom', run: true },
  { doorTransit: { actor: YID, door: 'youngcle_right_door_image', inset: [33, 18, 31, 65], closeAfter: true } },
  { remove: YID },
  { camera: [21, 7.25], duration: 0.55 },
  P('저희도 가죠.'),
  { action: game => {
    game.player.solid = true;
    game.finishTvBroadcast();
  } },
  { set: { youngcle_intro_done: true } },
  { parallel: [{ zoom: 1, duration: 0.4 }, { camera: 'player' }] },
  { regroup: true },
  { label: 'end' }, { end: true },
], { silent: true });

export const youngcle_tv_off = Object.assign([
  { if: flags => flags.youngcle_tv_gag_done, goto: 'repeat' },
  { action: game => {
    game.finishTvBroadcast();
    game.tvBroadcast = new TvBroadcast(game, TV);
  } },
  { parallel: [{ camera: [21, 7], duration: 0.25 },
    { zoom: 0.72, duration: 0.25 }] },
  { action: game => game.tvBroadcast.setExpression('read') },
  { action: game => game.tvBroadcast.power(true) },
  { wait: TV.powerTime },
  { parallel: PARTY.map(id => ({ emote: id, kind: '!', duration: 1.1, hold: 0.45 })) },
  partyAt(284),
  ...PARTY.map(id => ({ face: id, dir: 'up' })),
  ...V('..오..', 'read'),
  { action: game => game.tvBroadcast.setExpression('shock') },
  { speaker: '영클', portrait: 'youngcle_tv_shock', voice: 'youngcle', text: '* 뭐 뭐노?!' },
  close,
  { action: game => game.tvBroadcast.setExpression('hide') },
  { wait: 0.3 },
  { action: game => game.tvBroadcast.power(false) },
  { wait: TV.shutdownTime },
  { action: game => game.finishTvBroadcast() },
  { set: { youngcle_tv_gag_done: true } },
  { parallel: [{ zoom: 1, duration: 0.25 }, { camera: 'player' }] },
  { regroup: true },
  { end: true },
  { label: 'repeat' },
  { voice: 'narrator', text: '* TV는 꺼져 있다.' },
], { silent: true });

export const youngcle_left_door_locked = [{ voice: 'narrator', text: '* 문은 잠겨 있다.' }];
