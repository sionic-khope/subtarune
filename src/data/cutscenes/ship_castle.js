import { SHIP_CASTLE } from '../ship-castle.js';

const PLAYER = 'player';
const GYEONGSUB = 'gyeongsub';
const PPAMAN = 'ppaman';
const YOUNGCLE = 'lounge_youngcle';
const JUNHEE = 'lounge_junhee';
const YONGJUN = 'lounge_yongjun';
const GAJAEMAN = 'ship_castle_gajaeman';
const REACTORS = [JUNHEE, YONGJUN, YOUNGCLE, PPAMAN, GYEONGSUB];
const T = SHIP_CASTLE.timing;

const V = text => ({ speaker: '영클', portrait: 'youngcle', voice: 'youngcle', text: `* ${text}` });
const J = text => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: `* ${text}` });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const GJ = text => ({ speaker: '가재맨', voice: 'gajaeman_shadow', text: `* ${text}` });
const N = text => ({ voice: 'narrator', text: `* ${text}` });
const beat = name => ({ shipCastleBeat: name, action: game => game.shipCastle?.setBeat(name) });
const close = { action: game => game.textbox.close() };
const face = (ids, dir) => ids.map(id => ({ face: id, dir }));

const queueUnderwater = { action: game => {
  const previous = game.dialogue.onEnd;
  game.dialogue.onEnd = () => {
    previous?.();
    game.runScript('ship_sinking');
  };
} };

export const ship_castle = Object.assign([
  { if: flags => flags.ship_castle_done, goto: 'end' },
  { action: game => game.startShipCastle() },
  { bgm: null, fadeOut: 0.45 },
  { parallel: [
    { move: PLAYER, px: [372, 382], exact: true, speed: 72 },
    { move: GYEONGSUB, px: [314, 406], exact: true, speed: 72 },
    { move: PPAMAN, px: [430, 406], exact: true, speed: 72 },
  ] },
  ...face([PLAYER, GYEONGSUB, PPAMAN, YOUNGCLE, JUNHEE, YONGJUN], 'up'),
  { camera: [12, 8.7], duration: 1.2 },
  { wait: 0.5 },
  V('여기임'),
  J('생각보다 ㅈㄴ 크네'),
  V('ㅇㅇ'),
  P('그럼 여기에 그 코드를 꼽으면 될까요?'),
  V('ㅇㅇ'),
  P('그럼 부탁드립니다.'),
  close,
  { face: PLAYER, dir: 'down' },
  beat('field_float'),
  { sfx: 'bell' },
  { wait: T.floatHold },
  { face: PLAYER, dir: 'up' },
  beat('field_walk'),
  ...face([YOUNGCLE, JUNHEE, YONGJUN], 'down'),
  { parallel: [
    { move: PLAYER, rel: 'ship_lounge_grand_door', at: 'bottom', by: [0, 40], exact: true, speed: 24 },
    [{ wait: 0.65 }, { parallel: [
      { slide: YOUNGCLE, by: [-66, -22], duration: 1.65 },
      { slide: JUNHEE, by: [90, -34], duration: 1.65 },
      { slide: YONGJUN, by: [66, -22], duration: 1.65 },
    ] }],
  ] },
  { wait: 0.8 },
  N('긴 여정의 끝을 얘기하는 문이다.'),
  N('나는 {c=yellow}보라색 코드{/c}를 꺼내 문에 갖다대기 시작했다.'),
  close,
  { wait: T.doorHold },
  { spawn: { type: 'npc', id: GAJAEMAN, sprite: 'gajaeman_shadow', x: -116, y: 216,
    facing: 'right', hidden: false, solid: false, wander: 0, visualScale: 1.89 } },
  beat('field_rush'),
  { move: GAJAEMAN, px: game => [game.player.x - 18, game.player.y], exact: true, speed: 420 },
  { parallel: [
    ...REACTORS.map(id => ({ emote: id, kind: '!', duration: 1.1, hold: 0.45 })),
    ...face(REACTORS, 'right'),
  ] },
  { move: GAJAEMAN, px: [622, 150], exact: true, speed: 330, track: true,
    carry: { id: PLAYER, offset: [18, 0], facing: 'right' } },
  beat('field_window'),
  { move: GAJAEMAN, px: [900, 150], exact: true, speed: 380, track: true,
    carry: { id: PLAYER, offset: [18, 0], facing: 'right' } },
  { wait: T.windowAftermath },
  beat('ocean_rise'),
  { wait: T.oceanEstablish },
  V('오 이게 뭐노'),
  J('요플래!!!'),
  close,
  { action: game => game.shipCastle?.beginAscent() },
  { wait: T.oceanPush },
  beat('sky_tug'),
  { wait: 0.65 },
  GJ('후후후 마음데로 될줄알았나.'),
  { wait: T.skyTug },
  beat('sky_opposite_aura'),
  { sfx: 'power' },
  { wait: T.oppositeAura },
  GJ('ㅋㅋ이제 제대로 하는건가.'),
  close,
  beat('vortex_gather'),
  { sfx: 'rumble' },
  { wait: T.vortexGather },
  beat('vortex_burst'),
  { parallel: [{ sfx: 'wing' }, { shake: 0.65, amp: 8 }] },
  { action: game => {
    game.inventory = game.inventory.filter(item => item !== '보라색 코드 ?');
    game.setFlag('ship_castle_cord_stolen');
  } },
  { wait: T.vortexBurst },
  beat('castle_reveal'),
  { wait: T.castleReveal },
  { wait: T.castleHold },
  V('저 저게뭐노'),
  J('씨발 저게 뭐야!!!'),
  P('요 요플래!!!!'),
  close,
  beat('yoplait_fall'),
  { wait: T.fall },
  beat('castle_attack'),
  { wait: T.attack },
  V('일 일단 후퇴다 다시 돌아오자.\n저건 이길수없음'),
  J('큭 꼭 살아만 있어라 요플래'),
  close,
  beat('retreat'),
  { wait: T.retreat },
  beat('final_hold'),
  { wait: T.finalHold },
  { action: game => game.finishShipCastle(false) },
  { set: { ship_castle_done: true } },
  queueUnderwater,
  { label: 'end' },
  { end: true },
], { silent: true });
