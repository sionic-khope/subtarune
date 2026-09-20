import { battleEntry } from './helpers.js';
import { loopCharacterMotion } from '../../world/character-motion.js';

const N = text => ({ voice: 'narrator', text: `* ${text}` });
const closeBox = { action: g => g.textbox.close() };

const frameBarrel = { action: g => {
  const drum = g.entities.find(e => e.id === 'jjajang_nest_drum');
  g.camera.locked = true;
  g.camera.x = drum.x + drum.w / 2 - 320;
  g.camera.y = drum.y + drum.h - 222;
} };
const roar = () => [
  { parallel: [{ motion: 'drum_devil', name: 'roar', sfx: 'baron_roar' }, { shake: 1.35, amp: 5 }] },
  { wait: 0.8 },
];

export const jjajang_nest_drum = Object.assign([
  N('....'),
  N('드럼통이다.'),
  { ...N('드럼통을 두드려볼까?'), choice: {
    options: [{ label: '예', goto: 'knock' }, { label: '아니오', goto: 'done' }], cancel: 1,
  } },
  { label: 'knock' },
  closeBox,
  { action: g => { g.sound.preloadBgm('baron_intro'); } },
  { move: 'player', rel: 'jjajang_nest_drum', at: 'left', by: [-8, 0], speed: 30 },
  { face: 'player', dir: 'right' },
  { sfx: 'knock' },
  { wait: 0.8 },
  { bubble: 'player', dots: 3, gap: 0.5, hold: 0.8 },
  { sfx: 'rumble' },
  { shake: 1.6, amp: 2 },
  { emote: 'player', kind: '!', duration: 1, hold: 0.6, sfx: 'chime' },
  { move: 'player', rel: 'jjajang_nest_drum', at: 'left', by: [-156, 0], speed: 24, facing: 'right' },
  { sfx: 'static_loop' },
  { shake: 2.4, amp: 2 },
  { sfx: 'static_burst' },
  { shake: 1.8, amp: 4 },
  { speaker: '???', voice: 'mystery', text: '* 조사받.. 고 가..냐 이년아.', speed: 0.55 },
  { sfx: 'rumble' },
  { shake: 1.8, amp: 5 },
  { speaker: '???', voice: 'mystery', text: '* 니 친정엄마 ㅆ 2발년아.', speed: 0.65 },
  closeBox,
  { sfx: 'static_burst' },
  { sfx: 'rumble' },
  { parallel: [{ fade: 'white', duration: 2.8 }, { shake: 2.8, amp: 8 }] },
  frameBarrel,
  { hide: 'jjajang_nest_drum' },
  { emerge: 'drum_devil', depth: 220, duration: 1.2 },
  { bgm: 'baron_intro', volume: 0.55, fadeIn: 1.2 },
  { fade: 'in', duration: 2.2 },
  { wait: 0.8 },
  ...roar(),
  ...roar(),
  N('드럼통의 악마인 것 같다.'),
  N('압도적인 포스에 몸이 떨려온다.'),
  N('죽음의 공포가 나를 감싼다.'),
  N('그럼에도 나는 포기할 수 없다.'),
  N('쓰러트려야할 것 같다.'),
  N('나는 자세를 고쳐잡았다'),
  closeBox,
  { action: g => loopCharacterMotion(g.player, g.characterMotions.hyungsub.battle_ready) },
  ...roar(),
  { drumDevilThrow: true },
  ...battleEntry(['drum_devil'], 'drum_devil_battle'),
  { battle: { enemies: ['drum_devil'], bgm: 'drum_devil_battle', bg: 'drum_nest', modes: { attack: 'rush', enemy: 'bullets' } } },
  { label: 'done' },
], { silent: true });
