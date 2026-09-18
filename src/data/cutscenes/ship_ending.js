import { CAPTAIN_REVEAL_VEIL, CAPTAIN_AURA_COLORS } from './captain_reveal.js';

const YC = 'ship_youngcle', J = 'ship_junhee', Y = 'ship_yongjun', HATCH = 'ship_logo';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const EVERYONE = [...PARTY, J, YC];
const close = { action: game => game.textbox.close() };
const say = (speaker, portrait, text) => ({ speaker, portrait, voice: portrait, text: '* ' + text });
const V = text => ({ ...say('영클', 'youngcle', text), portrait: 'youngcle_tv_smirk' });
const P = text => say('억빠맨', 'ppaman', text);
const JUNE = text => say('쥰희', 'junhee', text);
const YONG = text => say('박용준', 'yongjun', text);
const entity = (game, id) => id === 'player' ? game.player : game.entities.find(e => e.id === id && !e.dead);
const beside = (id, by, extra = {}) => ({ move: id, rel: HATCH, at: 'bottom', by, ...extra });

export function restoreShipEnding(game) {
  game.setFlag('ship_manhole_open');
  for (const id of [YC, J, Y, 'ship_youngcle_down', 'ship_obangsun', 'ship_naram', 'ship_gajaeman', 'ship_cannon', 'ship_cage', 'ship_cage_open']) {
    const actor = entity(game, id);
    if (actor) { actor.visible = false; actor.dead = true; actor.doorTransit = null; }
  }
  game.darkSmoke = null;
}

function prepareEnding(game) {
  const hatch = entity(game, HATCH);
  const places = [[PARTY[0], -28, 56], [PARTY[1], -80, 32], [PARTY[2], -80, 88], [J, -126, 64], [YC, 140, 88]];
  for (const [id, dx, dy] of places) {
    const actor = entity(game, id);
    actor.x = hatch.x + dx; actor.y = hatch.y + dy;
    actor.visible = true; actor.pose = null; actor.facing = id === YC ? 'left' : 'right';
  }
  const yc = entity(game, YC);
  yc.setSprite('youngcle_tvform'); yc.def.visualScale = 0.85;
  yc.motion = null; yc.moving = false; yc.frame = 0;
  for (const id of [Y, 'ship_youngcle_down', 'ship_obangsun', 'ship_naram', 'ship_gajaeman', 'ship_cannon', 'ship_cage', 'ship_cage_open']) {
    const actor = entity(game, id); if (actor) actor.visible = false;
  }
}

const descend = id => [
  ...(id === J ? [beside(id, [-108, 30], { axis: 'x', speed: 44 })] : []),
  beside(id, [0, 30], { axis: 'y', speed: 44 }),
  beside(id, [0, 30], { axis: 'x', speed: 44 }),
  beside(id, [0, -62], { axis: 'y', speed: 36 }),
  { face: id, dir: 'down' }, { wait: 0.25 },
  { shipHatch: { hatch: HATCH, actor: id, duration: 1.25 } },
  { remove: id }, { wait: 0.4 },
];

export const ship_tvform_ending = Object.assign([
  { if: f => !f.ship_tvform_won, goto: 'ending_skip' },
  { if: f => f.ship_ending_done, goto: 'ending_restored' },
  { bgm: null, fadeOut: 0.6 },
  { wait: 0.65 }, { zoom: 1, duration: 0.01 },
  { action: prepareEnding },
  { camera: [14.5, 8.0], duration: 0.01 },
  { darkSmoke: { mode: 'veil', duration: 0.01, veil: CAPTAIN_REVEAL_VEIL, aura: { at: YC, colors: CAPTAIN_AURA_COLORS } } },
  { fade: 'in', duration: 0.65 },
  { ...V('으윽...'), portrait: 'youngcle_tv_glare' }, close,
  { tremble: YC, duration: 1.1, amp: 2 }, { wait: 1.1 },
  { wait: 0.5 },
  { sfx: 'white' }, { fade: 'white', duration: 0.6 },
  { action: game => {
    const yc = entity(game, YC); yc.motion = null; yc.setSprite('youngcle'); yc.def.visualScale = 2; yc.facing = 'left';
  } },
  { darkSmoke: { mode: 'veil', duration: 0.01, veil: CAPTAIN_REVEAL_VEIL, aura: null } },
  { wait: 0.45 }, { fade: 'in', duration: 0.85 },
  V('...'), close,
  { darkSmoke: { mode: 'dissipate', from: YC, duration: 1.6, veil: 0, aura: null } },
  { darkSmoke: null }, { wait: 0.5 },
  V('내가 속은거였다니.'),
  P('네 사실 가재맨이 씨발색끼고 여기잇는 요플래가 착한애에요'),
  V('그렇군..'),
  JUNE('어쨋든 우리한테 열쇠도있고 문도 있으니까 일단 나갈 수 있는거 아닌가?'),
  V('ㅇㅇ 맞음'),
  JUNE('그래 그럼 어서 라운지로 가자고'),
  P('라운지는 어딨어요?'),
  V('비켜보샘'), close,
  { camera: [14.5, 8.8], duration: 1.2 },
  beside(YC, [76, -22], { axis: 'y', speed: 42 }),
  beside(YC, [76, -22], { axis: 'x', speed: 42 }),
  { face: YC, dir: 'left' },
  { nod: YC, duration: 0.45, times: 1, depth: 5 },
  { sfx: 'click' },
  { if: f => f.ship_manhole_open, goto: 'ending_hatch_open' },
  { shipHatch: { hatch: HATCH, duration: 1.35 } },
  { label: 'ending_hatch_open' }, { wait: 0.8 },
  V('사실 여기가 통로임 ㅇㅇ'), close,
  { bubble: [...PARTY, J], hold: 0.8 },
  YONG('으어어..'), close,
  { parallel: EVERYONE.map(id => ({ emote: id, kind: '!', duration: 1.1, hold: 0.7, sfx: 'chime' })) },
  ...EVERYONE.map(id => ({ face: id, dir: 'right' })),
  { action: game => {
    const y = entity(game, Y), hatch = entity(game, HATCH);
    y.x = game.camera.x + 480 + 32; y.y = hatch.y + 68; y.pose = null; y.visible = true; y.facing = 'left';
  } },
  beside(Y, [168, -44], { axis: 'x', speed: 44 }),
  { wait: 0.55 },
  YONG('아오 형님들 무슨일 잇었나요 아 몸아프다.'),
  V('ㄴㄴ없었음'),
  YONG('어 영클형? 어 분명 적..'),
  V('닥치샘 설명 또하기 귀찮음 처 내려가샘'),
  JUNE('내려가자 용준아'),
  YONG('네 형'), close,
  { camera: [14.5, 8.8], duration: 1.2 },
  ...descend(Y), ...descend(J), ...descend(YC),
  { stage: 'ship_ending_done' },
  { set: { ship_manhole_open: true } },
  { regroup: true }, { camera: 'player' },
  { end: true },
  { label: 'ending_restored' }, { action: restoreShipEnding }, { camera: 'player' },
  { label: 'ending_skip' }, { end: true },
], { silent: true });

export const ship_manhole = Object.assign([
  { if: f => !f.ship_ending_done, goto: 'hatch_end' },
  { text: '* 내려갈까?', voice: 'narrator', choice: { options: [{ label: '예', goto: 'hatch_down' }, { label: '아니오', goto: 'hatch_end' }], cancel: 1 } },
  { label: 'hatch_down' }, close,
  { action: game => game.sound.preloadBgm('ship_lounge') },
  // 라운지로 내려갈 때 페이드아웃 0.5 → 1.0초(2026-09-18 사용자 “라운지 들어올 때 페이드아웃도 살짝만 0.5초 더”)
  { sfx: 'iron_step_1' }, { fade: 'out', duration: 1.0 },
  { map: 'ship_lounge', spawn: 'from_control', enter: true },
  { camera: 'player' }, { fade: 'in', duration: 0.7 },
  { wait: 1.5 }, { bgm: 'ship_lounge', fadeIn: 1.2 },
  { label: 'hatch_end' }, { end: true },
], { silent: true });
