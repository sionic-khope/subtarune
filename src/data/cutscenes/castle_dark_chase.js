import { CASTLE_DARK_CHASE } from '../../scenes/castle-dark-chase.js';

const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const PARTY = ['player', 'gyeongsub', 'ppaman'];

export const castle_dark_chase_intro = Object.assign([
  { if: flags => flags.castle_dark_chase_seen, goto: 'dark-chase-start' },
  close, { action: game => game.sound.preloadBgm('baron_intro') },
  P('형들,,'), K('왜 빠맨아?'), P('아까부터느낀건데,,,'), P('뒤에서 뭔가가 따라오는 기분이..'), close,
  { bgm: 'baron_intro', volume: 0.4 }, { sfx: 'baron_roar', action: game => game.castleDarkChase?.playRoar() },
  ...PARTY.map(id => ({ face: id, dir: 'down' })),
  { parallel: PARTY.map(id => ({ emote: id, kind: '!', duration: 0.7, sfx: 'chime' })) },
  { zoom: 0.6, duration: 0.5 }, { action: game => game.castleDarkChase?.reveal() },
  { wait: CASTLE_DARK_CHASE.revealSeconds }, P('오 씨발 도망가요 빨리'), close,
  { stage: 'castle_dark_chase_seen' },
  { label: 'dark-chase-start' }, { camera: 'player' }, { zoom: 1, duration: 0.5 },
  { action: game => game.castleDarkChase?.start() }, { end: true },
], { silent: true });

export const castle_dark_chase_finish = Object.assign([
  close, { stage: 'castle_dark_chase_done' }, { bgm: 'castle_dark_path', volume: 0.2, fadeIn: 1 },
  { camera: 'player' }, { end: true },
], { silent: true });
