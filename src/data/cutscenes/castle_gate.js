import { prepareCastleGate, openCastleGate, walkIntoCastleGate, finishCastleGate } from '../../scenes/castle-gate.js';

const V = text => ({ speaker: '영클', portrait: 'youngcle_tv_smirk', voice: 'youngcle', text: `* ${text}` });
const J = text => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: `* ${text}` });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
export const GATE_ALLIES = ['gate_youngcle', 'gate_junhee', 'gate_bidet', 'gate_mario', 'gate_ttuulla', 'gate_park'];
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const ALL = [...PARTY, ...GATE_ALLIES];
const OFFSETS = [[0, 60], [-80, 60], [85, 60], [-112, -120], [0, -130], [96, -100], [112, -20], [0, -20], [-100, -20]];
const close = { action: game => game.textbox.close() };
const point = (game, name, by) => game.map.def.meta.gate[name].map((value, i) => value + by[i]);
const at = (id, name, by = [0, 0], extra = {}) => ({ move: id, px: game => point(game, name, by), exact: true, ...extra });
const camera = (x, y, duration = 1.4) => ({ camera: [(x - 16) / 32, (y - 16) / 32], duration });
const face = (ids, dir) => ids.map(id => ({ face: id, dir }));

export function placeCastleGateParty(game) {
  ALL.forEach((id, i) => {
    const actor = id === 'player' ? game.player : game.entities.find(entity => entity.id === id && !entity.dead);
    const [x, y] = point(game, 'entrance', OFFSETS[i]);
    Object.assign(actor, { x, y, visible: true, moving: false, facing: 'up', flyX: 0, flyY: 0, spin: 0 });
  });
  game.player.trail = [];
}

export const castle_gate_reunion = Object.assign([
  { if: flags => !flags.castle_right_seal_active || !flags.castle_left_seal_active || flags.castle_gate_reunion_done, goto: 'gate-reunion-end' },
  close, { bgm: null }, { fade: 'out', duration: 0.45 }, { join: 'gyeongsub' }, { join: 'ppaman' },
  { action: placeCastleGateParty }, { action: prepareCastleGate },
  camera(640, 830, 0), { zoom: 0.8, duration: 0 }, { fade: 'in', duration: 0.8 }, { wait: 0.5 },
  { parallel: [camera(640, 580, 2.1), ...ALL.map((id, i) => at(id, 'assembly', OFFSETS[i], { speed: 76 }))] },
  ...face(ALL, 'up'), { wait: 0.7 },
  V('흠..'), V('이제 들어가면 되는거같음'), J('저기 뒤엔 뭐가있을까'), J('열어볼게.'), close,
  { parallel: [camera(640, 245, 1.6), { zoom: 1, duration: 1.2 }, at('gate_junhee', 'approach', [0, 0], { speed: 68 })] },
  { action: openCastleGate },
  { emote: 'gate_junhee', kind: '!', duration: 0.65, hold: 0.1, sfx: 'chime' },
  { parallel: [at('gate_junhee', 'retreat', [0, -80], { dash: true, facing: 'up' }), camera(640, 580, 1.2), { zoom: 0.8, duration: 1.2 }] },
  { wait: 0.8 }, J('오 시발.'), V('ㅈㄴ소름끼치게 생김'), K('오...'),
  { ...V('일단 편집노조들 같이 ㄱㄱ'), mosaic: { text: '노', block: 2 } },
  J('나도 같이가'), V('ㅇㅇ'), close,
  { parallel: [camera(640, 300, 1.6),
    ...GATE_ALLIES.map((id, i) => [{ wait: i * 0.38 },
      { move: id, rel: 'castle_lobby_open_door', at: 'bottom', axis: 'x', exact: true, run: true },
      at(id, 'approach', [-12, 16], { run: true }),
      { action: game => walkIntoCastleGate(game, id) }, { remove: id }]) ] },
  { wait: 0.7 }, camera(640, 660, 1.6),
  ...face(PARTY, 'up'), P('...'), P('쓰으으으으으으읍 미스'),
  { face: 'gyeongsub', dir: 'toward:ppaman' }, K('뭐해 빠맨아?'),
  { face: 'ppaman', dir: 'toward:gyeongsub' }, P('긴장풀기요'), K('ㅋㅋㅋ..'), P('가요 형.'), close,
  ...face(PARTY, 'up'), { stage: 'castle_gate_reunion_done' },
  { action: game => finishCastleGate(game) }, { zoom: 1, duration: 0.65 }, { camera: 'player' }, { regroup: true },
  { label: 'gate-reunion-end' }, { end: true },
], { silent: true });

export const castle_gate_enter = Object.assign([
  { if: flags => !flags.castle_gate_open || !flags.castle_gate_reunion_done, goto: 'gate-entry-end' },
  close, { face: 'player', dir: 'up' }, { fade: 'out', duration: 0.7 },
  { map: 'gajaeman_castle_dark_path', spawn: 'start', enter: true },
  { fade: 'in', duration: 0.85 },
  { label: 'gate-entry-end' }, { end: true },
], { silent: true });

export const castle_dark_path_intro = Object.assign([
  { if: flags => flags.castle_dark_path_seen, goto: 'dark-path-end' },
  close, { join: 'gyeongsub' }, { join: 'ppaman' }, { camera: 'player' }, { regroup: true }, { wait: 1.5 },
  { bgm: 'castle_dark_path', volume: 0.5, fadeIn: 1.2 },
  P('...'), P('아무것도 안보여요'), K('다른애들은 어디로간거지?'), P('일단 앞으로 가봐요..'), close,
  { stage: 'castle_dark_path_seen' }, { camera: 'player' }, { regroup: true },
  { label: 'dark-path-end' }, { end: true },
], { silent: true });
