import { activateCastleOrb } from '../../scenes/castle-orb.js';
import { castle_pipe_emerge } from './castle_pipe.js';

const N = text => ({ voice: 'narrator', text: `* ${text}` });
const V = text => ({ speaker: '영클', portrait: 'youngcle_tv_smirk', voice: 'youngcle', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const close = { action: game => game.textbox.close() };

const touchOrb = flag => Object.assign([
  { if: flags => !!flags[flag], goto: 'active' },
  N('...'), N('알수없는 힘으로 가득한 구체다.'), N('나는 그것에 손을 가져다댔다.'),
  close, { action: activateCastleOrb }, { end: true },
  { label: 'active' }, N('구체가 보라색으로 빛나고 있다.'), { end: true },
], { silent: true });

export const castle_orb_touch = touchOrb('castle_right_seal_active');
export const castle_left_orb_touch = touchOrb('castle_left_seal_active');

export const castle_orb_return = Object.assign([
  close, { fade: 'out', duration: 0.55 },
  { map: 'gajaeman_torii_end', spawn: 'from_orb' },
  { bgm: 'castle_right', volume: 0.5, fadeIn: 0.7 },
  { fade: 'in', duration: 0.7 }, ...castle_pipe_emerge,
], { silent: true });

export const castle_left_orb_return = Object.assign([
  close, { fade: 'out', duration: 0.55 },
  { if: flags => !!flags.castle_gate_reunion_done, goto: 'left-return-completed' },
  { map: 'gajaeman_castle_boulder', spawn: 'from_orb' },
  { bgm: null }, { fade: 'in', duration: 0.7 },
  { if: flags => !flags.castle_left_seal_active || !flags.castle_right_seal_active || flags.castle_gate_reunion_done, goto: 'left-return-end' },
  { move: 'player', rel: 'boulder_youngcle', at: 'right', by: [44, 48], speed: 70 },
  { camera: [89, 20], duration: 1.3 }, { wait: 0.6 },
  { face: 'boulder_youngcle', dir: 'toward:player' }, V('다 됐노?'),
  K('이제 빨리 다시 가운데 맵으로 가볼까'), V('ㅇㅋ요'), close,
  { fade: 'out', duration: 0.7 }, { join: 'gyeongsub' }, { join: 'ppaman' },
  { map: 'gajaeman_castle_lobby', spawn: 'gate_reunion', enter: true, bgm: false },
  { camera: [19.5, 24.1875], duration: 0 }, { zoom: 0.8, duration: 0 }, { fade: 'in', duration: 0.8 },
  { label: 'left-return-end' }, { end: true },
  { label: 'left-return-completed' },
  { join: 'gyeongsub' }, { join: 'ppaman' },
  { map: 'gajaeman_castle_lobby', spawn: 'from_dark', bgm: false },
  { bgm: null }, { zoom: 1, duration: 0 }, { camera: 'player' }, { regroup: true },
  { fade: 'in', duration: 0.7 }, { end: true },
], { silent: true });
