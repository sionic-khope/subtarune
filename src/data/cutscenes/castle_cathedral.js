import { CATHEDRAL } from '../../scenes/castle-cathedral.js';
import { CATHEDRAL2 } from '../../scenes/castle-cathedral2.js';

// BUILD323 사용자 원문(2026-09-24). 띄어쓰기·표기(용캐)는 원문 그대로.
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const A = text => ({ speaker: '가재맨', voice: 'gajaeman_shadow', text: `* ${text}` });
const J = text => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: `* ${text}` });
const Y = text => ({ speaker: '영클', portrait: 'youngcle_tv_smirk', voice: 'youngcle', text: `* ${text}` });
const G = CATHEDRAL.actor;
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const close = { action: game => game.textbox.close() };
const beat = name => ({ action: game => game.castleCathedral?.setBeat(name) });
const waitBeat = { action: game => {
  const scene = game.castleCathedral;
  if (!scene) return undefined;
  return new Promise(resolve => game.background.push({ update() {
    if (!scene.done && game.castleCathedral === scene) return false;
    resolve(); return true;
  } }));
} };
const all = kind => ({ parallel: PARTY.map(id => ({ emote: id, kind, duration: 0.8, hold: 0.4 })) });
const stand = (id, extra = {}) => [
  { move: id, rel: `cath_stand_${id}`, at: 'bottom', by: [0, 0], axis: 'y', facing: 'up', ...extra },
  { move: id, rel: `cath_stand_${id}`, at: 'bottom', by: [0, 0], axis: 'x', facing: 'up', ...extra },
];

export const castle_cathedral_intro = Object.assign([
  { if: flags => !!flags[CATHEDRAL.stage], goto: 'end' },
  close, { bgm: null, fadeOut: 0.4 },
  { action: game => { game.sound.preloadBgm(CATHEDRAL.introBgm); game.sound.preloadBgm(CATHEDRAL.climbBgm); } },
  { wait: 0.4 },
  { parallel: [stand('player'), [{ wait: 0.3 }, ...stand('gyeongsub')], [{ wait: 0.6 }, ...stand('ppaman')]] },
  ...PARTY.map(id => ({ face: id, dir: 'up' })), { wait: 0.6 },
  P('여긴 어딜까요'),
  { ...K('그러게 뭔가 성당같..{w=0.25}'), auto: 0.1 },
  A('후후후'), close,
  all('!'), ...PARTY.map(id => ({ face: id, dir: 'up' })),
  { parallel: [{ zoom: 0.8, duration: 1.2 }, { camera: [11.5, 239.5], duration: 1.4 }] }, { wait: 0.3 },
  beat('descend'),
  { parallel: [
    { darkSmoke: { mode: 'cloak', from: G, duration: CATHEDRAL.duration.descend,
      veil: 0, behindActors: true, aura: { at: G, colors: ['#090711', '#3e245a'] } } },
    { bgm: CATHEDRAL.introBgm, volume: 0.5, fadeIn: 1.2 },
  ] }, waitBeat, beat('idle'), { wait: 0.6 },
  A('용캐 여기까지 지나왔구나.'),
  P('씨발년'),
  A('그래 너희들의 능력은 인정해주지'),
  A('한번 붙어보자고'),
  A('물론'),
  A('날 잡는다면 말이지'), close,
  beat('rise'), waitBeat, { darkSmoke: null }, beat('idle'),
  all('!'),
  { parallel: [{ zoom: 1, duration: 0.4 }, { camera: 'player' }] },
  { parallel: PARTY.map(id => ({ move: id, by: [0, -160], run: true, facing: 'up' })) },
  { action: game => game.castleCathedral?.setWind(1) },
  all('!'),
  { parallel: PARTY.map(id => ({ move: id, by: [0, 22], speed: 26, facing: 'up' })) },
  { wait: 0.5 },
  P('으윽..'),
  K('어떻게든 뚫고가야해'), close,
  { camera: [11.5, 9], duration: 1.6 },
  beat('arrive'),
  { parallel: [waitBeat, { darkSmoke: { mode: 'cloak', from: G, duration: CATHEDRAL.duration.arrive,
    veil: 0, behindActors: true, aura: { at: G, colors: ['#090711', '#3e245a'] } } }] },
  { wait: 0.5 }, beat('forge'), waitBeat, beat('idle'), { wait: 0.9 }, { darkSmoke: null },
  { action: game => game.castleCathedral?.panToPlayer(1.1) },
  { action: game => { game.castleCathedral?.setWind(0.75); game.castleCathedral?.start(); } },
  { stage: CATHEDRAL.stage },
  { label: 'end' }, { end: true },
], { silent: true });

// 카메라 타일 좌표(중심) — 둘째 회랑 중간 지점 기준
const midCam = dy => [11.5, (CATHEDRAL2.midY + dy - 16) / 32];
const stand2 = id => [
  { move: id, rel: `cath2_mid_${id}`, at: 'bottom', by: [0, 0], axis: 'x', facing: 'up', speed: 70 },
  { move: id, rel: `cath2_mid_${id}`, at: 'bottom', by: [0, 0], axis: 'y', facing: 'up', speed: 70 },
];

// BUILD325 사용자 원문(2026-09-24): 둘째 회랑 중간의 검 아홉 자루 대치와 영클·쥰희 지원.
export const castle_cathedral_rescue = Object.assign([
  { if: flags => !!flags.castle_cathedral_rescue_done, goto: 'end' },
  close,
  { parallel: [stand2('player'), [{ wait: 0.2 }, ...stand2('gyeongsub')], [{ wait: 0.35 }, ...stand2('ppaman')]] },
  ...PARTY.map(id => ({ face: id, dir: 'up' })),
  { camera: midCam(-216), duration: 1.0 },
  beat('swarm'), waitBeat, { wait: 0.8 },
  { camera: midCam(-24), duration: 1.0 }, { wait: 0.4 },
  P('으...윽 이런..!'), K('아 안돼..'), close,
  { camera: midCam(-152), duration: 0.8 },
  beat('gather'), waitBeat,
  beat('rescue'), waitBeat,
  { camera: midCam(-40), duration: 0.9 },
  all('!'),
  J('어서 가자!!'), Y('후후후 내 레이저로 지원해드리겠..슴 ;;'), close,
  { set: { castle_cathedral_rescue_done: true } },
  { action: game => game.castleCathedral?.finishRescue() },
  { label: 'end' }, { end: true },
], { silent: true });
