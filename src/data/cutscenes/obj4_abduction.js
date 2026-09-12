import { freeSpot } from '../../world/world.js';

const P = (text) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text });
const G = (text) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text });
const close = { action: (g) => g.textbox.close() };
const DOWN = { id: 'yongjun_captive', offset: [35, 150], facing: 'down' };
const RIGHT = { id: 'yongjun_captive', offset: [165, 28], facing: 'down' };
const chase = (x, y) => ({ type: 'npc', id: 'baron_chase', sprite: 'baron_chase', x, y, facing: 'down', visualScale: 1.05, wander: 0, solid: false });
const captive = (x, y) => ({ type: 'npc', id: 'yongjun_captive', sprite: 'yongjun', x, y, facing: 'down', wander: 0, solid: false });
const hideParty = [{ hide: 'player' }, { hide: 'gyeongsub' }, { hide: 'ppaman' }];
const run = (target, carry = DOWN) => ({ move: 'baron_chase', dash: true, speed: 190, carry, track: true, shake: 3, ...target });

export const abductionBeats = [
  close,
  { bgm: null, fadeOut: 0.1 },
  { action: (g) => { g.sound.preloadBgm('baron_intro'); } },
  { map: 'obj4', spawn: 'after' },
  { action: (g) => { g.entities = g.entities.filter((e) => !['baron', 'baron_after', 'yongjun', 'voidgrub', 'cannon_up'].includes(e.id)); } },
  { spawn: { ...chase(756, 630), sprite: 'baron_intro', visualScale: 1.4 } },
  { spawn: captive(756, 985) },
  { spawn: { type: 'prop', id: 'cannon_abduction', image: 'assets/props/wooden_cannon_up.png', scale: 0.8, x: 816, y: 962, w: 100, h: 12, ix: 790, iy: 824, solid: false } },
  { parallel: [
    { move: 'player', rel: 'baron_chase', by: [0, 132], speed: 600 },
    { move: 'gyeongsub', rel: 'baron_chase', by: [-100, 132], speed: 600 },
    { move: 'ppaman', rel: 'baron_chase', by: [100, 132], speed: 600 },
  ] },
  { face: 'player', dir: 'up' }, { face: 'gyeongsub', dir: 'up' }, { face: 'ppaman', dir: 'up' },
  { zoom: 0.5, duration: 0 }, { camera: [23.5, 21], duration: 0.01 },
  { fade: 'in', duration: 0.45 },
  { parallel: [{ motion: 'baron_chase', name: 'roar', sfx: 'baron_roar' }, { shake: 1.75, amp: 5 }] },
  { wait: 0.3 },
  { parallel: [{ motion: 'baron_chase', name: 'roar', sfx: 'baron_roar' }, { shake: 1.75, amp: 7 }] },
  P('* 어 어라?'),
  close,
  { bgm: 'baron_intro', volume: 0.55 },
  { action: (g) => { const b = g.entities.find((e) => e.id === 'baron_chase'); b.setSprite('baron_chase'); b.def.visualScale = 1.05; [b.x, b.y] = freeSpot(g, b, b.x, b.y - 150); } },
  { parallel: [
    { move: 'baron_chase', rel: 'cannon_abduction', at: 'left', by: [-60, -160], dash: true, speed: 310 },
    { hop: 'player', by: [-65, 0], height: 22, duration: 0.3, sfx: false },
    { hop: 'gyeongsub', by: [-25, 0], height: 18, duration: 0.3, sfx: false },
    { hop: 'ppaman', by: [25, 0], height: 18, duration: 0.3, sfx: false },
  ] },
  { sfx: 'baron_slam' },
  { async: [{ fling: 'cannon_abduction', vx: 730, vup: 620, gravity: 620, spin: 10, duration: 1.2 }] },
  { async: [{ shake: 0.5, amp: 9 }] },
  { move: 'baron_chase', rel: 'yongjun_captive', by: [-35, -150], dash: true, speed: 310 },
  { emote: 'yongjun_captive', kind: '!', duration: 0.7, hold: 0.12 },
  { zoom: 0.7, duration: 0.2 },
  run({ px: [756, 1830] }),
  { fade: 'out', duration: 0.18 },
  { map: 'obj3', spawn: 'from_top' },
  ...hideParty,
  { spawn: chase(276, -120) }, { spawn: captive(311, 30) },
  { camera: 'baron_chase' },
  { fade: 'in', duration: 0.18 },
  run({ rel: 'south_exit', at: 'top', by: [0, -300] }),
  { camera: 'yongjun_captive' },
  { wait: 0.4 },
  { speaker: '박용준', portrait: 'yongjun', voice: 'yongjun', text: '* 으 으악 사 살려줘' },
  close,
  run({ px: [276, 690] }),
  { fade: 'out', duration: 0.18 },
  { map: 'obj2', spawn: 'from_top' },
  ...hideParty,
  { spawn: chase(1100, -120) }, { spawn: captive(1135, 30) },
  { camera: 'baron_chase' },
  { fade: 'in', duration: 0.18 },
  run({ rel: 'recall', at: 'bottom', by: [-21, -70] }),
  { action: (g) => {
    const b = g.entities.find((e) => e.id === 'baron_chase');
    b.x += DOWN.offset[0] - RIGHT.offset[0]; b.y += DOWN.offset[1] - RIGHT.offset[1];
    b.facing = 'right';
  } },
  run({ rel: 'statue2', at: 'left', by: [-155, -28] }, RIGHT),
  { sfx: 'baron_slam' },
  { async: [{ shake: 0.7, amp: 10 }] },
  { async: [{ fling: 'statue1', vx: 470, vup: 740, spin: 12, duration: 1.25 }] },
  { async: [{ fling: 'statue2', vx: 680, vup: 450, spin: -14, duration: 1.25 }] },
  { async: [{ fling: 'statue3', vx: 380, vup: 250, gravity: 550, spin: 10, duration: 1.25 }] },
  run({ px: [2650, 428], speed: 250 }, RIGHT),
  { set: { obj2_statues_cleared: true } },
  { fade: 'out', duration: 0.25 },
  { map: 'obj4', spawn: 'after' },
  { zoom: 1, duration: 0 }, { camera: 'player' },
  { parallel: [
    { move: 'gyeongsub', rel: 'player', at: 'bottom', by: [-90, 0], speed: 600 },
    { move: 'ppaman', rel: 'player', at: 'bottom', by: [90, 0], speed: 600 },
  ] },
  { face: 'player', dir: 'down' }, { face: 'gyeongsub', dir: 'down' }, { face: 'ppaman', dir: 'down' },
  { fade: 'in', duration: 0.4 },
  P('* 어 일단 쫒 쫒아가죠 형'),
  G('* 허허.. 빨리 가자'),
  close,
  { regroup: true },
  { action: (g) => g.resumeMapBgm() },
  { set: { obj4_abduction_done: true } },
];

export const obj4_baron_abduction = Object.assign([
  { if: (f) => !f.obj4_baron_won || f.obj4_abduction_done, goto: 'abduction_end' },
  ...abductionBeats,
  { label: 'abduction_end' },
], { silent: true });
