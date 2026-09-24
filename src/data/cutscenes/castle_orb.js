import { activateCastleOrb } from '../../scenes/castle-orb.js';
import { castle_pipe_emerge } from './castle_pipe.js';

const N = text => ({ voice: 'narrator', text: `* ${text}` });
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
  { map: 'gajaeman_castle_boulder', spawn: 'from_orb' },
  { bgm: null }, { fade: 'in', duration: 0.7 },
], { silent: true });
