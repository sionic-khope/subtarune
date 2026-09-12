import { makeCanvas } from '../../core/gfx.js';

const G = (text) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text });
const P = (text) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text });

function openGunChest(game, lift, withGun = true) {
  const chest = game.entities.find((entity) => entity.id === 'gun_chest');
  const original = game.propImages[chest.def.image];
  const gun = game.propImages['assets/props/wooden_gun.png'];
  const image = makeCanvas(original.width, original.height + lift);
  const ctx = image.getContext('2d');
  ctx.fillStyle = '#24190f';
  ctx.fillRect(2, 9, original.width - 4, lift + 2);
  ctx.drawImage(original, 0, 0, original.width, 10, 0, 0, original.width, 10);
  if (withGun && gun) ctx.drawImage(gun, 2, 10, 24, Math.round(24 * gun.height / gun.width));
  ctx.drawImage(original, 0, 10, original.width, original.height - 10, 0, 10 + lift, original.width, original.height - 10);
  chest.image = image;
  chest.ih = image.height;
  chest.def.iy = chest.y + chest.h - image.height;
}

export const obj5_chase = [
  { if: (f) => f.obj5_chase_retry_pending, goto: 'retry' },
  { if: (f) => f.obj5_chase_started || f.obj5_chase_cleared, goto: 'sea' },
  { camera: [23, 11], duration: 0.45 },
  { parallel: [
    { move: 'player', rel: 'gun_chest', at: 'bottom', by: [-44, 38], run: true },
    { move: 'ppaman', rel: 'gun_chest', at: 'bottom', by: [20, 66], run: true },
    { move: 'gyeongsub', rel: 'gun_chest', at: 'bottom', by: [-108, 66], run: true },
  ] },
  { move: 'ppaman', rel: 'gun_chest', at: 'bottom', by: [30, 38] },
  { face: 'ppaman', dir: 'up' },
  { face: 'gyeongsub', dir: 'right' },
  { wait: 0.25 },
  { action: (game) => openGunChest(game, 4) },
  { wait: 0.12 },
  { action: (game) => openGunChest(game, 8) },
  { wait: 0.3 },
  P('* 어 형 여기 총이 있어요.'),
  G('* 어서 이거 타고 쫒아가자. 그거 챙겨'),
  { action: (game) => game.textbox.close() },
  { wait: 0.3 },
  { action: (game) => {
    if (game.has('obj5_gun_taken')) return;
    game.inventory.push('나무총');
    game.setFlag('obj5_gun_taken');
  } },
  { action: (game) => openGunChest(game, 8, false) },
  { sfx: 'item' },
  { wait: 0.35 },
  { move: 'player', rel: 'obj5_raft', at: 'left', by: [-4, 0], run: true },
  { action: (game) => game.entities.find((e) => e.id === 'obj5_raft').board(game.player) },
  { move: 'ppaman', rel: 'obj5_raft', at: 'left', by: [-4, 6], run: true },
  { sfx: 'splash' }, { raft: 'obj5_raft', swim: 'ppaman' },
  { move: 'gyeongsub', rel: 'obj5_raft', at: 'left', by: [-4, 40], run: true },
  { sfx: 'splash' }, { raft: 'obj5_raft', swim: 'gyeongsub' },
  { wait: 0.3 },
  G('* 근데 우리 아직도 수영을 해야하니 저기 좀 넓어보이는데'),
  P('* 네'),
  { action: (game) => game.textbox.close() },
  { camera: 'player' },
  { raft: 'obj5_raft', go: true },
  { raft: 'obj5_raft', holdAt: 1200 },
  { set: { obj5_chase_started: true } },
  { label: 'sea' },
  { fade: 'white', duration: 0.18 },
  { wait: 0.1 },
  { parallel: [{ seaChase: true }, { fade: 'in', duration: 0.28 }] },
  { end: true },
  { label: 'retry' },
  { action: (game) => game.promptSeaRetry() },
  { end: true },
];

export const obj5_resume = [
  { if: (f) => f.obj5_chase_retry_pending, goto: 'retry_dock' },
  { if: (f) => !f.obj5_chase_started && !f.obj5_chase_cleared, goto: 'end' },
  { seaChase: true },
  { end: true },
  { label: 'retry_dock' },
  { action: (game) => {
    const raft = game.entities.find((entity) => entity.id === 'obj5_raft');
    raft.interact = () => { game.promptSeaRetry(); return true; };
  } },
  { label: 'end' },
  { end: true },
];
