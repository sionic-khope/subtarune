import { FX } from '../fx.js';
import { CAPTAIN_AURA_COLORS } from './captain_reveal.js';
import { CHOIMIS_FLOWER } from './choimis_flower.js';

export const RUNAWAY = {
  done: 'choimis_runaway_done', flower: 'choimis_flower_done', tree: 'choimis_tree_crashed', eaten: 'choimis_jjajang_eaten',
  choimis: 'choimis_runaway', gyeongsub: 'gyeongsub_scene', ppaman: 'ppaman_scene', domi: 'domijorim_scene', bowl: 'runaway_bowl',
  firstView: [54.1875, 12.375], groupView: [57, 12.375], leftView: [49.5, 12.375],
  chaseBgm: 'baron_intro', auraBgm: 'captain_reveal',
};
const { choimis: C_ID, gyeongsub: K_ID, ppaman: P_ID, domi: D_ID, bowl: B_ID } = RUNAWAY;
const C = text => ({ speaker: '최미스', portrait: 'choimis', voice: 'choimis', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const D = text => ({ speaker: '도미조림', portrait: 'domijorim', voice: 'domijorim', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const actor = (game, id) => id === 'player' ? game.player : game.entities.find(e => e.id === id && !e.dead);
const spawnAt = (id, sprite, rel, extra = {}) => ({ spawn: { type: 'npc', id, sprite }, rel, action: game => {
  const anchor = actor(game, rel);
  game.spawn({ type: 'npc', id, sprite, x: anchor.x, y: anchor.y, solid: false, wander: 0, ...extra });
} });
const placeAt = (id, rel, extra = {}) => ({ rel, action: game => {
  const e = actor(game, id), anchor = actor(game, rel);
  e.x = anchor.x; e.y = anchor.y; Object.assign(e, extra);
} });
const animate = (game, duration, frame) => new Promise(resolve => {
  let elapsed = 0;
  game.background.push({ update(dt) {
    elapsed = Math.min(duration, elapsed + dt);
    frame(elapsed / duration);
    if (elapsed < duration) return false;
    resolve(); return true;
  } });
});
const rotate = (id, to, duration) => ({ action: game => {
  const e = actor(game, id), from = e.spin || 0;
  return animate(game, duration, k => { e.spin = from + (to - from) * k * k * (3 - 2 * k); });
} });
const awaitArrival = (id, rel) => ({ rel, action: game => new Promise(resolve => {
  const e = actor(game, id), target = actor(game, rel);
  game.background.push({ update() {
    const arrived = !e.moving && Math.abs(e.x - target.x) < 0.5 && Math.abs(e.y - target.y) < 0.5;
    if (arrived) resolve();
    return arrived;
  } });
}) });
const prepareRemote = { action: game => {
  game.player.visible = false;
  for (const e of game.entities) if (e.id?.startsWith('ppaman_') || e.id?.startsWith('gyeongsub_')) e.visible = false;
} };

export const CHASE_SEGMENTS = [
  { map: 'jjajang_sakura8', cry: '흐어어어 난 몰라 ㅠㅠㅠ' },
  { map: 'jjajang_sakura7', cry: '으어어어 도망가야 해 ㅠㅠㅠ' },
  { map: 'jjajang_sakura6', cry: '난 몰라아아 ㅠㅠㅠ' },
];
const montage = CHASE_SEGMENTS.flatMap(({ map, cry }, i) => [
  { map, spawn: 'chase' }, prepareRemote,
  spawnAt(C_ID, 'choimis', 'chase_start', { facing: 'left' }),
  { camera: C_ID }, { action: game => game.camera.snap() },
  ...(i ? [] : [{ bgm: RUNAWAY.chaseBgm, fadeIn: 0.4 }]),
  { fade: 'in', duration: 0.25 },
  { async: [{ move: C_ID, rel: 'chase_end', at: 'bottom', dash: true, track: true, exact: true }] },
  { ...C(cry), auto: 0.8, speed: 1.3 }, close,
  awaitArrival(C_ID, 'chase_end'),
  { fade: 'out', duration: 0.25 },
]);

const bowlSpawn = { spawn: { type: 'prop', id: B_ID, image: 'assets/props/dark_jjajang.png' }, rel: 'crash_bowl', action: game => {
  const target = actor(game, 'crash_bowl');
  game.spawn({ type: 'prop', id: B_ID, image: 'assets/props/dark_jjajang.png', x: target.x - 80, y: target.y - 16, solid: false, hidden: true,
    aura: { rgb: '180,140,255', radius: 20, alpha: 0.3, pulse: 2.2 } });
} };
const knockOntoBowl = { action: game => {
  const c = actor(game, C_ID), bowl = actor(game, B_ID), x = c.x, y = c.y;
  const targetX = bowl.drawX + 48, targetY = bowl.drawY + 3;
  c.facing = 'up'; c.motion = null; c.frame = 0;
  return animate(game, 0.42, k => {
    c.x = x + (targetX - x) * k; c.y = y + (targetY - y) * k;
    c.hopY = Math.sin(k * Math.PI) * 22;
    c.spin = -Math.PI / 2 * k;
    if (k === 1) c.hopY = 0;
  });
} };
export const consumeRunawayBowl = game => {
  const bowl = actor(game, B_ID);
  if (!bowl || bowl.visible === false) throw new Error('Choimis must land on the visible bowl before it is consumed');
  bowl.dead = true;
  const index = game.inventory.indexOf('어둠의 짜장면');
  if (index >= 0) game.inventory.splice(index, 1);
};

export const CHOIMIS_AURA = [
  { face: 'player', dir: 'toward:choimis_runaway' },
  { face: K_ID, dir: 'toward:choimis_runaway' },
  { face: P_ID, dir: 'toward:choimis_runaway' },
  { bgm: RUNAWAY.auraBgm, fadeIn: 1.2 },
  { sfx: 'captain_thunder' },
  { tremble: C_ID, duration: 120, amp: 1 },
  { parallel: [rotate(C_ID, 0, 1.6), { darkSmoke: { mode: 'cloak', from: C_ID, duration: 2.4, veil: 0.24,
    aura: { at: C_ID, colors: CAPTAIN_AURA_COLORS } } }] },
  { face: C_ID, dir: 'down' },
  P('진짜 ㅈ된거같은데요'),
  K('어 어떡하지..'),
  P('뭘 어떻게해요 족쳐야죠.'),
  close,
  { tremble: C_ID, duration: 120, amp: 3 },
  { darkSmoke: { mode: 'swell', from: C_ID, duration: 2.2, veil: 0.4 } },
  { darkSmoke: { mode: 'cloak', from: C_ID, duration: 1.2, veil: 0.4 } },
  C('...'),
  C('흐흐흐 이 힘은..'),
  C('뭐야 . 이짜장면 대박이잖아..'),
  C('난 알파메일이 되는거야!!!'),
  P('아 ㅈ된거같다.'),
  K('알파메일..?'),
  P('제가 느낀건데 앰뒤력이 강할수록 가재맨의 힘을 받는애들이 훨 강해지더라구요'),
  K('그러면 과연..'),
  C('헤헤 헤헤 스으으으으으으으으읍'),
  close,
  { sfx: 'captain_transform' },
  { fade: 'white', duration: 0.65 },
  { wait: 1.0 },
  { action: game => { actor(game, C_ID).jitter = null; } },
  { set: { [RUNAWAY.done]: true } },
  ...CHOIMIS_FLOWER,
];

export const CHOIMIS_CRASH = [
  { map: 'jjajang_sakura5', spawn: 'chase_crash' }, { hide: 'player' },
  spawnAt(C_ID, 'choimis', 'crash_start', { facing: 'left' }),
  placeAt('player', 'crash_player', { spin: Math.PI / 2, facing: 'down', moving: false }),
  bowlSpawn,
  { camera: RUNAWAY.firstView, duration: 0.01 },
  { fade: 'in', duration: 0.35 },
  { move: C_ID, rel: 'crash_impact', at: 'bottom', dash: true, exact: true },
  { set: { [RUNAWAY.tree]: true } },
  { parallel: [
    { fling: 'sakura5_giant_tree', vx: -900, vup: 1050, gravity: 950, spin: -2, duration: 1.4, sfx: 'wing' },
    { boom: { ...FX.explosion, at: C_ID, scale: 1.3 } },
    { shake: 0.5, amp: 7 },
    { hop: C_ID, by: [16, 56], height: 24, duration: 0.45, sfx: false, keep: true },
    [{ wait: 0.14 }, { drop: 'player', height: 420, duration: 0.9, sfx: false, land: 'thud', quake: 3 }],
    [{ wait: 0.3 }, { drop: B_ID, height: 350, duration: 0.75, sfx: false, land: false },
      { hop: B_ID, by: [80, 16], height: 18, duration: 0.55, spin: 1, sfx: 'pop', keep: true },
      { action: game => { const bowl = actor(game, B_ID); bowl.spin = 0; } }],
  ] },
  { remove: 'sakura5_giant_tree' },
  { face: C_ID, dir: 'toward:player' },
  { wait: 0.8 },
  spawnAt(K_ID, 'gyeongsub', 'crash_k_entry', { facing: 'left' }),
  spawnAt(P_ID, 'ppaman', 'crash_p_entry', { facing: 'left' }),
  { parallel: [
    { camera: RUNAWAY.groupView, duration: 1.4 },
    [{ move: K_ID, rel: 'crash_k_pass', at: 'bottom', run: true, exact: true }, { move: K_ID, rel: 'crash_k_talk', at: 'bottom', run: true, exact: true }],
    [{ wait: 0.15 }, { move: P_ID, rel: 'crash_p_talk', at: 'bottom', run: true, exact: true }],
    rotate('player', 0, 1.6),
  ] },
  { face: 'player', dir: 'right' },
  { face: P_ID, dir: 'toward:player' }, { face: K_ID, dir: 'toward:player' },
  P('어 괜 괜찮아요?'),
  K('어 미스야 너 여기까지 튀어온거야?'),
  C('아니 기껏 도망쳤더니 이게 뭐람'),
  C('크으윽...'),
  K('미스야 일단 진정하고'),
  { face: C_ID, dir: 'down' },
  C('어라 저건 뭐지'), close,
  { zoom: 1.8, at: B_ID, duration: 1.2 },
  C('짜..장면?'),
  K('저걸 먹으면 안돼!'), close,
  { zoom: 1, duration: 1.2 },
  { camera: RUNAWAY.groupView, duration: 0.01 },
  C('네 안먹어요'), close,
  { bgm: null, fadeOut: 0.65 },
  { bubble: ['player', C_ID, P_ID, K_ID], gap: 0.35, hold: 0.9 },
  P('...?'), K('? 아 그러니'), C('네 저 다이어트하려구요.'), P('오'), K('그래 뭐.. 잘됐네'),
  close,
  spawnAt(D_ID, 'domijorim', C_ID, { facing: 'down', hidden: true }),
  { sfx: 'domijorim_heumi' },
  { wait: 0.65 },
  { drop: D_ID, height: 520, duration: 0.85, sfx: 'jump', land: false },
  { parallel: [knockOntoBowl, { shake: 0.3, amp: 4 }, { sfx: 'punch' }] },
  { sfx: 'ralsei_splat' },
  { action: consumeRunawayBowl },
  { set: { [RUNAWAY.eaten]: true } },
  { hop: D_ID, by: [-156, -64], height: 24, duration: 0.42, sfx: false },
  D('아.'), P('아.'), D('내 짜장면 ㅠㅠㅠ 흐미~~'), close,
  { move: D_ID, by: [192, 0], dash: true, exact: true },
  { move: D_ID, rel: 'crash_domi_exit', at: 'bottom', dash: true, exact: true },
  { move: D_ID, by: [56, 0], dash: true, exact: true },
  { remove: D_ID },
  K('...'), C('우걱우걱 우적우적 쓰읍..'), close,
  ...CHOIMIS_AURA,
];

export const choimis_runaway = Object.assign([
  { fade: 'out', duration: 0.5 },
  { set: { night_cliff_scene_done: true, sakura8_right_open: true, choimis_runaway_started: true } },
  ...montage, ...CHOIMIS_CRASH,
], { silent: true });

export const choimis_runaway_crash = Object.assign([
  { fade: 'out', duration: 0 }, { bgm: RUNAWAY.chaseBgm }, ...CHOIMIS_CRASH,
], { silent: true });

export const choimis_runaway_aura = Object.assign([
  { hide: 'player' }, placeAt('player', 'crash_player', { spin: 0, facing: 'right' }), { show: 'player' },
  spawnAt(C_ID, 'choimis', 'crash_bowl', { facing: 'up' }),
  { action: game => { const c = actor(game, C_ID); c.x += 48; c.y += 3; c.spin = -Math.PI / 2; } },
  spawnAt(K_ID, 'gyeongsub', 'crash_k_talk', { facing: 'left' }),
  spawnAt(P_ID, 'ppaman', 'crash_p_talk', { facing: 'left' }),
  { camera: RUNAWAY.groupView, duration: 0.01 }, ...CHOIMIS_AURA,
], { silent: true });

export const choimis_runaway_restore = Object.assign([
  { if: flags => !flags[RUNAWAY.done] || !!flags[RUNAWAY.flower], goto: 'end' },
  { fade: 'white', duration: 0.5 },
  placeAt('player', 'crash_player', { spin: 0, facing: 'right', visible: true }),
  { camera: RUNAWAY.groupView, duration: 0.01 },
  ...CHOIMIS_FLOWER,
  { label: 'end' }, { end: true },
], { silent: true });
