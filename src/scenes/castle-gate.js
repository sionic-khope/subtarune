export const CASTLE_GATE = Object.freeze({
  map: 'gajaeman_castle_lobby', closed: 'castle_lobby_sealed_door', open: 'castle_lobby_open_door',
  image: 'assets/props/castle318_open_gate.png', flag: 'castle_gate_open', duration: 1.7,
  aperture: [90, 145, 140, 220],
});
const find = (game, id) => game.entities.find(entity => entity.id === id && !entity.dead);
const clamp = value => Math.max(0, Math.min(1, value));

function applyOpen(game) {
  game.setFlag(CASTLE_GATE.flag);
  const closed = find(game, CASTLE_GATE.closed);
  if (closed) { closed.dead = true; closed.visible = false; }
  if (!find(game, CASTLE_GATE.open)) game.spawn(game.map.def.entities.find(def => def.id === CASTLE_GATE.open));
  game.applyTiles(CASTLE_GATE.flag);
}

export async function prepareCastleGate(game) {
  finishCastleGate(game, true);
  const scene = { map: game.map, script: game.dialogue.script, wasOpen: !!game.flags[CASTLE_GATE.flag],
    progress: game.flags[CASTLE_GATE.flag] ? 1 : 0, time: 0, opening: null, passengers: [], handles: [],
    rows: [...game.map.rows] };
  game.castleGate = scene;
  await Promise.all([game.requestPropImage(CASTLE_GATE.image), game.sound.loadSfxFiles(['locker', 'rumble', 'chime'])]);
}

export function openCastleGate(game) {
  const scene = game.castleGate;
  if (!scene || scene.wasOpen) return Promise.resolve();
  find(game, CASTLE_GATE.closed).visible = false;
  scene.handles.push(game.sound.sfx('locker'), game.sound.sfx('rumble', { volume: 0.3 }));
  game.shake = { time: 1.3, amp: 1.5 };
  return new Promise(resolve => { scene.opening = { elapsed: 0, resolve }; });
}

export function walkIntoCastleGate(game, id) {
  const scene = game.castleGate, actor = find(game, id), door = find(game, CASTLE_GATE.open);
  if (!scene || !actor || !door) return Promise.resolve();
  const scale = door.scale ?? door.def.scale;
  const [ix, iy, iw] = CASTLE_GATE.aperture;
  const x = (door.drawX ?? door.def.ix) + ix * scale, y = (door.drawY ?? door.def.iy) + iy * scale;
  const distance = actor.y + actor.h - y + 8;
  actor.facing = 'up'; actor.driven = true;
  actor.doorTransit = { offsetY: 0, clip: [x, y, iw * scale, distance] };
  return new Promise(resolve => scene.passengers.push({ actor, distance, elapsed: 0, resolve }));
}

export function updateCastleGate(game, dt) {
  const scene = game.castleGate;
  if (!scene) return;
  if (game.map !== scene.map || game.dialogue.script !== scene.script) { finishCastleGate(game, true); return; }
  scene.time += dt;
  if (scene.opening) {
    scene.opening.elapsed += dt;
    scene.progress = clamp(scene.opening.elapsed / CASTLE_GATE.duration);
    if (scene.progress >= 1) {
      applyOpen(game);
      const { resolve } = scene.opening; scene.opening = null; resolve();
    }
  }
  for (const passenger of scene.passengers) {
    passenger.elapsed += dt;
    const { actor } = passenger, progress = clamp(passenger.elapsed / 1.05);
    actor.moving = true; actor.animate?.(dt, 8);
    actor.doorTransit.offsetY = -passenger.distance * progress;
    if (progress >= 1) {
      actor.visible = false; actor.moving = false; actor.driven = false; actor.doorTransit = null;
      passenger.resolve(); passenger.done = true;
    }
  }
  scene.passengers = scene.passengers.filter(passenger => !passenger.done);
}

export function drawCastleGate(ctx, game, cam) {
  const scene = game.castleGate;
  if (!scene || scene.progress <= 0 && !scene.opening) return;
  const door = find(game, CASTLE_GATE.open) || find(game, CASTLE_GATE.closed);
  if (!door) return;
  if (scene.opening) {
    const open = game.propImages[CASTLE_GATE.image], closed = door.image;
    const scale = door.scale ?? door.def.scale;
    const left = (door.drawX ?? door.def.ix) - cam.x, top = (door.drawY ?? door.def.iy) - cam.y;
    ctx.save(); ctx.translate(left, top); ctx.scale(scale, scale);
    if (open) ctx.drawImage(open, 0, 0);
    ctx.beginPath(); ctx.moveTo(72, 376); ctx.lineTo(72, 180);
    ctx.quadraticCurveTo(72, 136, 160, 94); ctx.quadraticCurveTo(248, 136, 248, 180);
    ctx.lineTo(248, 376); ctx.closePath(); ctx.clip();
    const shift = 88 * scene.progress;
    if (closed) {
      ctx.drawImage(closed, 72, 94, 88, 282, 72 - shift, 94, 88, 282);
      ctx.drawImage(closed, 160, 94, 88, 282, 160 + shift, 94, 88, 282);
    }
    ctx.restore();
  }
  const x = door.x + door.w / 2 - cam.x, y = door.y + door.h - cam.y;
  ctx.save();
  const light = ctx.createRadialGradient(x, y, 4, x, y + 30, 145);
  light.addColorStop(0, '#7d45b766'); light.addColorStop(1, '#31143f00');
  ctx.globalAlpha = scene.progress * (0.7 + Math.sin(scene.time * 1.4) * 0.08);
  ctx.fillStyle = light; ctx.fillRect(x - 145, y - 115, 290, 290);
  ctx.restore();
}

export function finishCastleGate(game, abort = false) {
  const scene = game.castleGate;
  if (!scene) return;
  game.castleGate = null;
  scene.opening?.resolve();
  for (const { actor, resolve } of scene.passengers) {
    actor.doorTransit = null; actor.driven = false; actor.moving = false; actor.visible = true; resolve();
  }
  for (const handle of scene.handles) handle?.pause?.();
  const closed = find(game, CASTLE_GATE.closed);
  if (closed) closed.doorOpening = null;
  if (abort && !scene.wasOpen && !game.flags.castle_gate_reunion_done) {
    game.setFlag(CASTLE_GATE.flag, false);
    if (game.map === scene.map) {
      const open = find(game, CASTLE_GATE.open);
      if (open) open.dead = true;
      if (closed) { closed.visible = true; closed.dead = false; }
      else game.spawn(game.map.def.entities.find(def => def.id === CASTLE_GATE.closed));
      game.map.rows = scene.rows; game.map.bake();
    }
  }
}
