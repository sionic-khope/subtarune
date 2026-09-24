import { CASTLE_DARK_CHASE } from '../../scenes/castle-dark-chase.js';

const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const PARTY = ['player', 'gyeongsub', 'ppaman'];

export const castle_dark_chase_intro = Object.assign([
  { if: flags => flags.castle_dark_chase_done, goto: 'dark-chase-end' },
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
  { action: game => game.castleDarkChase?.start() }, { label: 'dark-chase-end' }, { end: true },
], { silent: true });

export const castle_dark_refuge_locked = Object.assign([
  { voice: 'narrator', text: '* 잠긴 것 같다.' },
], { silent: true });

export const castle_dark_chase_finish = Object.assign([
  { if: flags => flags.castle_dark_refuge_dialogue_done, goto: 'dark-refuge-end' },
  close, { stage: 'castle_dark_chase_done' }, { bgm: 'castle_dark_path', volume: 0.2, fadeIn: 1 },
  { camera: 'player' }, { zoom: 1.05, at: 'player', offset: [0, -40], duration: 1.2 },
  { wait: 0.5 }, P('와 겨우 나왔네요 ㅈ될뻔'), close,
  { zoom: 0.6, duration: 0.5 },
  { parallel: [
    ...PARTY.map((id, index) => ({ move: id, rel: 'castle_final_gate', at: 'bottom',
      by: [0, 112 + index * 48], speed: 90, facing: 'up' })),
  ] },
  { parallel: [
    ...PARTY.map((id, index) => ({ move: id, rel: 'castle_final_gate', at: 'bottom',
      by: [index === 0 ? 0 : index === 1 ? -68 : 68, 112], speed: 90, facing: 'up' })),
    { camera: [11.5, 11], duration: 1.2 },
  ] },
  { wait: 0.5 }, K('후.. 저 앞에 문이 있네'), P('얼른 가보죠'), close,
  { camera: 'player' }, { zoom: 1, duration: 0.5 },
  { set: { castle_dark_refuge_dialogue_done: true } },
  { label: 'dark-refuge-end' }, { end: true },
], { silent: true });
