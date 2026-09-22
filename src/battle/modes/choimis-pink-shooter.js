import L from '../../data/locale/ko.js';
import { FONT } from '../../ui/font.js';

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const COMPACT_BOARD = Object.freeze({ x: 135, y: 90, w: 210, h: 132 });
const WIDE_BOARD = Object.freeze({ x: 25, y: 84, w: 430, h: 150 });
const CENTER = Object.freeze({ x: 240, y: 156 });
const PINK = '#ff5ca8';
const HEART_ROWS = ['..XXX...XXX..', '.XXXXX.XXXXX.', 'XXXXXXXXXXXXX', 'XXXXXXXXXXXXX', 'XXXXXXXXXXXXX', '.XXXXXXXXXXX.', '..XXXXXXXXX..', '...XXXXXXX...', '....XXXXX....', '.....XXX.....', '......X......'];
const BOWL_ASSET = 'assets/props/dark_jjajang.png';

/** Opening shooter tuning. Combat time intentionally excludes formation and launch. */
export const CHOIMIS_PINK_SHOOTER = Object.freeze({
  openSeconds: 0.5,
  fillSeconds: 1.8,
  drainSeconds: 2.4,
  launchSeconds: 0.7,
  combatSeconds: 20,
  fireCooldown: 0.3,
  chargeSeconds: 0.9,
  chargeCueAt: 0.18,
  shotSpeed: 410,
  heartSpeed: 126,
  heartX: 64,
  invulnerability: 0.75,
  noodleWarning: 0.55,
  noodleSpeed: 155,
  spawnFirst: 0.45,
  spawnEvery: 0.92,
  compactBoard: COMPACT_BOARD,
  wideBoard: WIDE_BOARD,
});

/** Continuous collision for two moving circles over one update. */
export function sweptCirclesHit(a0, a1, ar, b0, b1, br) {
  const rx = a0.x - b0.x, ry = a0.y - b0.y;
  const vx = (a1.x - a0.x) - (b1.x - b0.x), vy = (a1.y - a0.y) - (b1.y - b0.y);
  const amount = clamp(-(rx * vx + ry * vy) / (vx * vx + vy * vy || 1), 0, 1);
  const dx = rx + vx * amount, dy = ry + vy * amount, radius = ar + br;
  return dx * dx + dy * dy <= radius * radius;
}

/** Pixel geometry shared by rendering and orientation tests. */
export function heartPixels(facing = 'down') {
  const pixels = [];
  for (let row = 0; row < HEART_ROWS.length; row++) for (let column = 0; column < HEART_ROWS[row].length; column++) {
    if (HEART_ROWS[row][column] !== 'X') continue;
    pixels.push(facing === 'right' ? { x: row - 5, y: column - 6 } : { x: column - 6, y: row - 5 });
  }
  return pixels;
}

const held = (input, key) => input.down?.(key) ?? input.held?.(key) ?? input.held?.[key] ?? false;

/** Shared pink-shooter C edge state: tap fires normally; only a full bounded hold charges. */
export function createPinkFireControl(config = CHOIMIS_PINK_SHOOTER) {
  let armed = false, wasDown = false, active = false, elapsed = 0, cooldown = 0, cuePlayed = false, disposed = false;
  const snapshot = () => ({ active, elapsed: Math.round(elapsed * 100) / 100, ready: active && elapsed >= config.chargeSeconds, progress: active ? clamp(elapsed / config.chargeSeconds, 0, 1) : 0 });
  return {
    get snapshot() { return snapshot(); },
    update(dt, input) {
      if (disposed) return [];
      const events = [], down = held(input, 'confirm'), canStart = cooldown <= 0;
      cooldown = Math.max(0, cooldown - dt);
      if (!armed) { if (!down) armed = true; wasDown = down; return events; }
      if (down && !active && canStart) { active = true; elapsed = 0; cuePlayed = false; }
      if (active && down) {
        elapsed = Math.min(config.chargeSeconds, elapsed + dt);
        if (!cuePlayed && elapsed >= config.chargeCueAt) { cuePlayed = true; events.push({ type: 'charge' }); }
      }
      if (active && !down && wasDown) {
        events.push({ type: 'fire', charged: elapsed + 1e-9 >= config.chargeSeconds });
        active = false; elapsed = 0; cuePlayed = false; cooldown = config.fireCooldown;
      }
      wasDown = down;
      return events;
    },
    dispose() { disposed = true; armed = false; wasDown = false; active = false; elapsed = 0; cooldown = 0; cuePlayed = false; },
  };
}

/** Three bounded streak heads orbit outside the heart and converge at full charge. */
export function pinkChargeAura(x, y, progress, time) {
  const p = clamp(progress, 0, 1), radius = lerp(24, 2, p * p);
  return Array.from({ length: 3 }, (_, index) => {
    const angle = time * 8 + index * Math.PI * 2 / 3;
    return { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius, angle, radius };
  });
}

/** Shared fixed-tier projectile; charge duration never scales its power. */
export const createPinkShot = (x, y, charged = false) => ({ x, y, oldX: x, oldY: y, r: charged ? 5 : 3, charged });

/** A projectile can contact each stable target once; only tap shots stop on contact. */
export function registerPinkTargetHit(shot, targetId) {
  if (!shot || shot.dead) return false;
  if (!shot.hitTargets) Object.defineProperty(shot, 'hitTargets', { value: new Set(), configurable: true });
  if (shot.hitTargets.has(targetId)) return false;
  shot.hitTargets.add(targetId);
  if (!shot.charged) shot.dead = true;
  return true;
}

/** Official yellow-heart cues plus the one cancellable charge handle. */
export function createPinkShotAudio(battle) {
  let chargeHandle = null;
  const stopCharge = () => {
    if (!chargeHandle) return;
    try { chargeHandle.pause?.(); chargeHandle.removeAttribute?.('src'); if (!chargeHandle.removeAttribute) chargeHandle.src = ''; chargeHandle.load?.(); } catch { /* disposed audio is already silent */ }
    chargeHandle = null;
  };
  return {
    charge() { stopCharge(); chargeHandle = battle.game?.sound?.sfx?.('yellowheart_charge', { volume: 0.3, rate: 1 }) || null; },
    fire(charged) { stopCharge(); battle.sfx(charged ? 'yellowheart_shot_big' : 'yellowheart_shot', { volume: 0.9, rate: 1 }); },
    stop: stopCharge,
    dispose: stopCharge,
  };
}
const boardAt = board => ({ x: board.x, y: board.y, w: board.w, h: board.h });
const snapshotObject = value => ({ ...value, x: Math.round(value.x * 100) / 100, y: Math.round(value.y * 100) / 100 });

/** Choimis's one-shot pre-menu pink-heart shooter. */
export function createChoimisPinkShooter(battle, { enemy }) {
  const C = CHOIMIS_PINK_SHOOTER, board = battle.board, soul = battle.soul;
  const oldBoard = { ...board.rect, target: board.target && { ...board.target } };
  const oldSoul = { x: soul.x, y: soul.y, invuln: soul.invuln };
  let phase = 'open', phaseTime = 0, combatElapsed = 0, water = 0, scroll = 0;
  const fireControl = createPinkFireControl(C), shotAudio = createPinkShotAudio(battle);
  let shots = [], noodles = [], effects = [], nextSpawn = C.spawnFirst, nextShotId = 0;
  let spawned = 0, destroyed = 0, missed = 0, disposed = false;
  if (enemy) enemy.pinkShotHits = 0;
  const bowl = { image: null };
  if (typeof Image !== 'undefined') {
    const image = new Image();
    image.onload = () => { bowl.image = image; }; image.onerror = () => {};
    image.src = BOWL_ASSET;
  }
  soul.x = CENTER.x; soul.y = CENTER.y; soul.invuln = 0;
  board.setTarget(COMPACT_BOARD.w, COMPACT_BOARD.h, CENTER.x, CENTER.y);

  const restore = () => {
    board.x = oldBoard.x; board.y = oldBoard.y; board.w = oldBoard.w; board.h = oldBoard.h;
    board.target = oldBoard.target && { ...oldBoard.target };
    soul.x = oldSoul.x; soul.y = oldSoul.y; soul.invuln = oldSoul.invuln;
  };
  const change = next => { phase = next; phaseTime = 0; };
  const tweenBoard = (from, to, amount) => {
    board.x = lerp(from.x, to.x, amount); board.y = lerp(from.y, to.y, amount);
    board.w = lerp(from.w, to.w, amount); board.h = lerp(from.h, to.h, amount);
  };
  const spawnNoodle = () => {
    const margin = 18, height = WIDE_BOARD.h - margin * 2;
    const y = WIDE_BOARD.y + margin + battle.rnd() * height;
    noodles.push({ id: `noodle-${spawned++}`, x: WIDE_BOARD.x + WIDE_BOARD.w - 5, y, oldX: WIDE_BOARD.x + WIDE_BOARD.w - 5, oldY: y, r: 8, age: 0, telegraph: true });
  };
  const fire = charged => {
    const shot = createPinkShot(soul.x + 11, soul.y, charged); shot.id = `opening-shot-${nextShotId++}`; shots.push(shot); shotAudio.fire(charged);
  };
  const burst = (x, y, color, kind = 'hit') => {
    for (let i = 0; i < 9; i++) effects.push({ kind, x, y, vx: 38 + (i % 3) * 18, vy: (i - 4) * 17, life: 0.32, color });
  };
  const updateCombat = (dt, input) => {
    combatElapsed = Math.min(C.combatSeconds, combatElapsed + dt); phaseTime += dt; scroll += dt * 92;
    soul.invuln = Math.max(0, soul.invuln - dt);
    const direction = Number(held(input, 'down')) - Number(held(input, 'up'));
    soul.y = clamp(soul.y + direction * C.heartSpeed * dt, WIDE_BOARD.y + 13, WIDE_BOARD.y + WIDE_BOARD.h - 13);
    for (const event of fireControl.update(dt, input)) {
      if (event.type === 'charge') shotAudio.charge();
      else fire(event.charged);
    }
    while (combatElapsed >= nextSpawn && nextSpawn < C.combatSeconds - 0.8) { spawnNoodle(); nextSpawn += C.spawnEvery; }
    for (const shot of shots) { shot.oldX = shot.x; shot.oldY = shot.y; shot.x += C.shotSpeed * dt; }
    for (const noodle of noodles) {
      noodle.oldX = noodle.x; noodle.oldY = noodle.y; noodle.age += dt;
      if (noodle.telegraph && noodle.age >= C.noodleWarning) noodle.telegraph = false;
      if (!noodle.telegraph) noodle.x -= C.noodleSpeed * dt;
    }
    for (const shot of shots) {
      if (shot.dead) continue;
      for (const noodle of noodles) {
        if (noodle.dead || noodle.telegraph) continue;
        if (!sweptCirclesHit({ x: shot.oldX, y: shot.oldY }, shot, shot.r, { x: noodle.oldX, y: noodle.oldY }, noodle, noodle.r)) continue;
        if (!registerPinkTargetHit(shot, noodle.id)) continue;
        noodle.dead = true; destroyed++; burst(noodle.x, noodle.y, '#ff9ccd'); battle.sfx('pop', { volume: 0.384, rate: 0.8 });
        if (shot.dead) break;
      }
    }
    for (const noodle of noodles) {
      if (noodle.dead || noodle.telegraph || soul.invuln > 0) continue;
      if (!sweptCirclesHit({ x: noodle.oldX, y: noodle.oldY }, noodle, noodle.r, soul, soul, soul.r - 1)) continue;
      noodle.dead = true; burst(soul.x, soul.y, '#ffffff', 'hurt');
      battle.hurtParty(enemy?.def?.damage ?? 15);
      soul.invuln = Math.max(soul.invuln, C.invulnerability);
      if (disposed) return;
    }
    for (const effect of effects) { effect.x += effect.vx * dt; effect.y += effect.vy * dt; effect.vx *= Math.max(0, 1 - dt * 6); effect.life -= dt; }
    for (const shot of shots) if (!shot.dead && shot.x > WIDE_BOARD.x + WIDE_BOARD.w + 12) { shot.dead = true; missed++; }
    shots = shots.filter(shot => !shot.dead);
    noodles = noodles.filter(noodle => !noodle.dead && noodle.x > WIDE_BOARD.x - 24);
    effects = effects.filter(effect => effect.life > 0);
    if (combatElapsed + 1e-9 >= C.combatSeconds) { shotAudio.stop(); change('done'); }
  };

  return {
    get snapshot() {
      return {
        phase, phaseTime: Math.round(phaseTime * 100) / 100, combatElapsed: Math.round(combatElapsed * 100) / 100,
        water: Math.round(water * 100) / 100, board: boardAt(board),
        heart: { x: Math.round(soul.x), y: Math.round(soul.y), color: phase === 'open' || phase === 'fill' ? 'red' : 'pink', facing: phase === 'open' || phase === 'fill' ? 'down' : 'right' },
        shots: shots.map(snapshotObject), noodles: noodles.map(noodle => ({ ...snapshotObject(noodle), telegraph: noodle.telegraph })),
        effects: effects.map(snapshotObject), spawned, destroyed, missed, disposed,
        charge: { ...fireControl.snapshot, aura: fireControl.snapshot.active ? pinkChargeAura(soul.x, soul.y, fireControl.snapshot.progress, combatElapsed) : [] },
      };
    },
    update(dt, input) {
      if (disposed || phase === 'done') return true;
      const delta = Math.max(0, dt);
      if (phase === 'open') {
        phaseTime = Math.min(C.openSeconds, phaseTime + delta);
        const amount = 1 - (1 - phaseTime / C.openSeconds) ** 3;
        tweenBoard(oldBoard, COMPACT_BOARD, amount);
        if (phaseTime + 1e-9 >= C.openSeconds) { tweenBoard(COMPACT_BOARD, COMPACT_BOARD, 1); battle.sfx('great_shine', { volume: 0.55 }); change('fill'); }
      } else if (phase === 'fill') {
        phaseTime = Math.min(C.fillSeconds, phaseTime + delta); water = phaseTime / C.fillSeconds;
        if (phaseTime + 1e-9 >= C.fillSeconds) { battle.sfx('color_heart', { volume: 0.72 }); change('drain'); }
      } else if (phase === 'drain') {
        phaseTime = Math.min(C.drainSeconds, phaseTime + delta); water = 1 - phaseTime / C.drainSeconds;
        if (phaseTime + 1e-9 >= C.drainSeconds) change('launch');
      } else if (phase === 'launch') {
        phaseTime = Math.min(C.launchSeconds, phaseTime + delta);
        const amount = 1 - (1 - phaseTime / C.launchSeconds) ** 3;
        tweenBoard(COMPACT_BOARD, WIDE_BOARD, amount); soul.x = lerp(CENTER.x, C.heartX, amount);
        if (phaseTime + 1e-9 >= C.launchSeconds) { soul.x = C.heartX; soul.y = WIDE_BOARD.y + WIDE_BOARD.h / 2; board.setTarget(WIDE_BOARD.w, WIDE_BOARD.h, 240, WIDE_BOARD.y + WIDE_BOARD.h / 2); board.snap(); change('combat'); }
      } else updateCombat(Math.min(delta, C.combatSeconds - combatElapsed), input);
      return phase === 'done';
    },
    draw(ctx) {
      board.draw(ctx); const b = board.rect;
      ctx.save(); ctx.beginPath(); ctx.rect(Math.round(b.x + 3), Math.round(b.y + 3), Math.round(b.w - 6), Math.round(b.h - 6)); ctx.clip();
      if (phase === 'launch' || phase === 'combat') drawScroll(ctx, b, scroll);
      if (water > 0) drawPinkWater(ctx, b, water, phaseTime);
      for (const noodle of noodles) drawNoodle(ctx, noodle, bowl.image);
      if (fireControl.snapshot.active) drawPinkChargeAura(ctx, pinkChargeAura(soul.x, soul.y, fireControl.snapshot.progress, combatElapsed), fireControl.snapshot.ready);
      for (const shot of shots) drawPinkPellet(ctx, shot);
      for (const effect of effects) { ctx.globalAlpha = clamp(effect.life / 0.22, 0, 1); ctx.fillStyle = effect.color; ctx.fillRect(Math.round(effect.x) - 2, Math.round(effect.y) - 2, 4, 4); }
      const forming = phase === 'open' || phase === 'fill';
      ctx.globalAlpha = 1; drawHeartShape(ctx, soul.x, soul.y, forming ? '#ff203a' : PINK, forming ? 'down' : 'right', soul.invuln, combatElapsed);
      ctx.restore(); battle.drawTextBox(ctx);
      ctx.save(); ctx.font = FONT.replace(/^\d+px/, '12px'); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(L.battle_choimis_pink_controls, 240, 272); ctx.restore();
    },
    dispose() {
      if (disposed) return;
      disposed = true; shots = []; noodles = []; effects = []; fireControl.dispose(); shotAudio.dispose();
      if (bowl.image) { bowl.image.onload = null; bowl.image.onerror = null; }
      restore();
    },
  };
}

function drawPinkWater(ctx, board, level, time) {
  const height = Math.round((board.h - 6) * level), y = Math.round(board.y + board.h - 3 - height);
  ctx.fillStyle = '#d52d86'; ctx.fillRect(Math.round(board.x + 3), y, Math.round(board.w - 6), height);
  ctx.fillStyle = PINK;
  for (let x = board.x + 3 - (time * 24) % 12; x < board.x + board.w; x += 12) ctx.fillRect(Math.round(x), y - 2 + Math.round(Math.sin(x * 0.13 + time * 8) * 2), 8, 3);
}

function drawScroll(ctx, board, scroll) {
  ctx.fillStyle = '#160918'; ctx.fillRect(board.x + 3, board.y + 3, board.w - 6, board.h - 6);
  for (let x = board.x - (scroll % 48); x < board.x + board.w; x += 48) {
    ctx.fillStyle = '#40132f'; ctx.fillRect(Math.round(x), board.y + 4, 2, board.h - 8);
    ctx.fillStyle = '#8b245f'; ctx.fillRect(Math.round(x + 18), board.y + 25, 4, 4); ctx.fillRect(Math.round(x + 32), board.y + board.h - 35, 3, 3);
  }
}

export function drawPinkPellet(ctx, shot) {
  const x = Math.round(shot.x), y = Math.round(shot.y), charged = !!shot.charged;
  ctx.fillStyle = '#8c1e59'; ctx.fillRect(x - (charged ? 7 : 5), y - (charged ? 4 : 3), charged ? 14 : 9, charged ? 9 : 7);
  ctx.fillStyle = PINK; ctx.fillRect(x - (charged ? 6 : 4), y - (charged ? 3 : 2), charged ? 14 : 9, charged ? 7 : 5);
  ctx.fillStyle = '#ffd2e8'; ctx.fillRect(x + (charged ? 1 : 2), y - 1, charged ? 5 : 3, charged ? 3 : 2);
}

function drawPinkChargeAura(ctx, aura, ready) {
  ctx.fillStyle = ready ? '#fff' : '#ff9ccd';
  for (const streak of aura) for (let trail = 0; trail < 3; trail++) {
    const angle = streak.angle - trail * 0.18, radius = streak.radius + trail * 4;
    ctx.globalAlpha = 1 - trail * 0.28; ctx.fillRect(Math.round(streak.x + Math.cos(angle) * (radius - streak.radius)) - 2, Math.round(streak.y + Math.sin(angle) * (radius - streak.radius)) - 1, 5 - trail, 3 - Math.floor(trail / 2));
  }
  ctx.globalAlpha = 1;
}

function drawNoodle(ctx, noodle, bowl) {
  const x = Math.round(noodle.x), y = Math.round(noodle.y);
  if (noodle.telegraph) {
    if (Math.floor(noodle.age * 12) % 2) return;
    ctx.fillStyle = PINK; for (let offset = -18; offset <= 18; offset += 8) ctx.fillRect(WIDE_BOARD.x + WIDE_BOARD.w - 5, y + offset, 4, 3);
    return;
  }
  ctx.strokeStyle = '#311425'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x - 12, y - 5); ctx.quadraticCurveTo(x - 4, y + 8, x + 5, y - 3); ctx.quadraticCurveTo(x + 10, y - 8, x + 14, y + 4); ctx.stroke();
  ctx.strokeStyle = '#ffe3a6'; ctx.lineWidth = 3; ctx.stroke();
  if (bowl) ctx.drawImage(bowl, x - 9, y - 9, 18, 18);
  else { ctx.fillStyle = '#33222a'; ctx.fillRect(x - 7, y - 6, 14, 10); ctx.fillStyle = '#6c3b24'; ctx.fillRect(x - 6, y - 5, 12, 7); }
}

function drawHeartShape(ctx, x, y, color, facing, invulnerability, time) {
  if (invulnerability > 0 && Math.floor(time * 16) % 2) return;
  ctx.fillStyle = color;
  for (const pixel of heartPixels(facing)) ctx.fillRect(Math.round(x + pixel.x), Math.round(y + pixel.y), 1, 1);
}
