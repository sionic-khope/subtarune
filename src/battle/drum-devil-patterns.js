import { DRUM_DEVIL as C } from '../data/drum-devil.js';
import { whiteSprite } from './youngcle-patterns.js';

const TAU = Math.PI * 2;
const PURPLE = new WeakMap();
function barrelImage(api, purple) {
  const img = whiteSprite(api.images?.drum);
  if (!img || !purple) return img;
  if (!PURPLE.has(img)) {
    const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      if (pixels.data[i] > 128) { pixels.data[i] = 192; pixels.data[i + 1] = 92; pixels.data[i + 2] = 255; }
    }
    ctx.putImageData(pixels, 0, 0); PURPLE.set(img, canvas);
  }
  return PURPLE.get(img);
}
function drawBarrel(ctx, api, bullet) {
  const img = barrelImage(api, bullet.purple); if (!img) return;
  const h = bullet.size, w = Math.round(img.width * h / img.height);
  ctx.save(); ctx.translate(Math.round(bullet.x), Math.round(bullet.y)); ctx.rotate(bullet.rot);
  ctx.drawImage(img, -Math.round(w / 2), -Math.round(h / 2), w, h); ctx.restore();
}
function mark(api, x, y, life, radius, purple = false) {
  return api.emit({ x, y, r: radius, life, harmless: true, shape: 'drum_mark', drawShape(ctx, self) {
    ctx.save(); ctx.strokeStyle = purple ? '#c05cff' : '#fff'; ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(self.age * 10));
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.stroke(); ctx.restore();
  } });
}
function lob(api, target, flight, purple = false) {
  const actor = api.actor, from = { x: actor.x + C.hand[0] * actor.scale, y: actor.y + C.hand[1] * actor.scale };
  api.sfx?.('drum_throw');
  return api.emit({ ...from, r: 0, life: flight, harmless: true, purple, size: purple ? C.finisherSize : C.barrelSize,
    shape: purple ? 'drum_purple' : 'drum_lob', spin: 3,
    out() { return this.age >= this.life; },
    steer(self) { const k = Math.min(1, self.age / flight); self.x = from.x + (target.x - from.x) * k; self.y = from.y + (target.y - from.y) * k - Math.sin(Math.PI * k) * C.arcHeight; },
    drawShape(ctx, self) { drawBarrel(ctx, api, self); },
  });
}
function blast(api, p, fragments = true, radius = C.blastRadius) {
  api.sfx?.('drum_impact');
  api.emit({ ...p, r: radius, life: C.blastHold, shape: 'drum_blast',
    drawShape(ctx, self) { ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(self.x, self.y, self.r - 2, 0, TAU); ctx.stroke(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore(); },
  });
  if (fragments) for (let i = 0; i < 8; i++) {
    const angle = i * TAU / 8;
    api.emit({ ...p, r: 3, life: C.fragmentLife, vx: Math.cos(angle) * C.fragmentSpeed, vy: Math.sin(angle) * C.fragmentSpeed, kind: 'white' });
  }
}

function createPattern(kind) {
  let nextWave = 0, finishStarted = false, poseAt = -Infinity;
  let normalEndsAt = 0, duration = C.duration;
  let purpleBarrel = null, purpleMark = null;
  const soundTimes = new Map();
  const queue = [];
  const schedule = (at, run) => { queue.push({ at, run }); queue.sort((a, b) => a.at - b.at); };
  return { get duration() { return duration; }, update(t, dt, api) {
    const voicedApi = { ...api, sfx(name) {
      const cooldown = C.soundCooldown[name] ?? 0;
      if (t - (soundTimes.get(name) ?? -Infinity) < cooldown) return;
      soundTimes.set(name, t); api.sfx?.(name, { volume: C.soundVolume[name] });
    } };
    const normalApi = { ...voicedApi, emit(options) {
      normalEndsAt = Math.max(normalEndsAt, t + options.life);
      return api.emit(options);
    } };
    const b = api.box, center = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    while (nextWave < C.waves && t >= nextWave * C.every) {
      const wave = nextWave++, at = t; poseAt = at;
      if (kind === 'cross') {
        for (let side = 0; side < 2; side++) {
          const start = { x: b.x + (side ? b.w - 14 : 14), y: b.y + (wave % 2 ? b.h - 14 : 14) };
          const end = { x: b.x + (side ? 14 : b.w - 14), y: b.y + (wave % 2 ? 14 : b.h - 14) };
          api.emit({ ...start, r: 0, harmless: true, life: C.warn + C.flight, shape: 'drum_cross_warning', drawShape(ctx) {
            ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.setLineDash([3, 6]);
            ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke(); ctx.restore();
          } });
          schedule(at + C.warn, a => lob(a, start, C.flight));
          schedule(at + C.warn + C.flight, a => a.emit({ ...start, r: C.barrelRadius, size: C.barrelSize,
            vx: (end.x - start.x) / C.crossFlight, vy: (end.y - start.y) / C.crossFlight,
            life: C.crossFlight, spin: side ? -7 : 7, shape: 'drum_cross', drawShape(ctx, self) { drawBarrel(ctx, a, self); } }));
          schedule(at + C.warn + C.flight + C.crossFlight, a => blast(a, end, false));
        }
      } else if (kind === 'ring') {
        const gap = wave * 2, targets = [];
        for (let i = 0; i < C.ringCount; i++) {
          if (i === gap || i === (gap + 1) % C.ringCount) continue;
          const angle = i * TAU / C.ringCount;
          targets.push({ x: center.x + Math.cos(angle) * (b.w / 2 - 20), y: center.y + Math.sin(angle) * (b.h / 2 - 20) });
        }
        targets.forEach((p, i) => {
          const fuse = C.ringFuse + i * C.ringStagger;
          mark(api, p.x, p.y, C.warn + C.flight + fuse, C.ringBlastRadius);
          schedule(at + C.warn, a => lob(a, p, C.flight));
          schedule(at + C.warn + C.flight, a => a.emit({ ...p, r: 0, harmless: true, size: C.barrelSize,
            life: fuse, shape: 'drum_ring_fuse', drawShape(ctx, self) { drawBarrel(ctx, a, self); } }));
          schedule(at + C.warn + C.flight + fuse, a => {
            blast(a, p, false, C.ringBlastRadius);
            const angle = Math.atan2(center.y - p.y, center.x - p.x);
            for (const offset of [-0.25, 0, 0.25]) a.emit({ ...p, r: 3, life: C.fragmentLife,
              vx: Math.cos(angle + offset) * C.fragmentSpeed, vy: Math.sin(angle + offset) * C.fragmentSpeed, kind: 'white' });
          });
        });
      } else if (kind === 'roll') {
        const left = wave % 2 === 0, gap = [1, 3, 0, 2][wave];
        for (let row = 0; row < 4; row++) {
          if (row === gap) continue;
          const p = { x: left ? b.x + 12 : b.x + b.w - 12, y: b.y + (row + 0.5) * b.h / 4 };
          let rolling = null;
          mark(api, p.x, p.y, C.warn + C.flight, 12);
          schedule(at + C.warn, a => lob(a, p, C.flight));
          schedule(at + C.warn + C.flight, a => {
            a.sfx?.('drum_impact');
            rolling = a.emit({ ...p, r: C.barrelRadius, size: C.barrelSize, life: C.rollLife, vx: (left ? 1 : -1) * C.rollSpeed, spin: left ? 7 : -7, shape: 'drum_roll', drawShape(ctx, self) { drawBarrel(ctx, a, self); } });
          });
          schedule(at + C.warn + C.flight + 1.1, a => {
            if (rolling && typeof rolling === 'object') { rolling.taken = true; rolling.harmless = true; }
            blast(a, { x: p.x + (left ? 1 : -1) * C.rollSpeed * 1.1, y: p.y }, false);
          });
        }
      } else {
        const targets = kind === 'bombard' ? [{ x: api.soul.x, y: api.soul.y }, { x: b.x + b.w - (api.soul.x - b.x), y: b.y + b.h - (api.soul.y - b.y) }]
          : Array.from({ length: 6 }, (_, i) => ({ x: b.x + (i % 3 + 0.5) * b.w / 3, y: b.y + (Math.floor(i / 3) + 0.5) * b.h / 2 })).filter((_, i) => (i + wave) % 2 === 0);
        for (const p of targets) {
          mark(api, p.x, p.y, C.warn + C.flight, C.blastRadius);
          schedule(at + C.warn, a => lob(a, p, C.flight));
          schedule(at + C.warn + C.flight, a => blast(a, p));
        }
      }
    }
    if (!finishStarted && nextWave === C.waves && queue.length === 0 && t >= Math.max(C.finisherAt, normalEndsAt + C.finisherQuiet)) {
      finishStarted = true; poseAt = t;
      duration = t + C.warn + C.finisherFlight + C.finisherFuse + C.finisherHold;
      purpleMark = mark(api, center.x, center.y, C.warn + C.finisherFlight + C.finisherFuse, C.blastRadius, true);
      schedule(t + C.warn, a => { purpleBarrel = lob(a, center, C.finisherFlight, true); a.trackProjectile?.(purpleBarrel); });
      schedule(t + C.warn + C.finisherFlight, a => {
        if (purpleBarrel?.intercepted) return;
        a.emit({ ...center, r: 0, harmless: true, purple: true, size: C.finisherSize, life: C.finisherFuse, shape: 'drum_fuse', drawShape(ctx, self) { drawBarrel(ctx, a, self); } });
      });
      schedule(t + C.warn + C.finisherFlight + C.finisherFuse, a => {
        if (purpleBarrel?.intercepted) return;
        a.penalty(C.finisherDamage); a.sfx?.('drum_burst'); a.shake?.(0.3, 5); a.flash?.(C.finisherHold);
        a.emit({ ...center, r: 0, harmless: true, life: C.finisherHold, shape: 'drum_arena_blast', drawShape(ctx, self) {
          ctx.save(); ctx.fillStyle = '#c05cff'; ctx.globalAlpha = 0.8 * (1 - self.age / self.life); ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6); ctx.restore();
        } });
      });
    }
    if (purpleBarrel?.intercepted) {
      queue.length = 0;
      if (purpleMark && typeof purpleMark === 'object') purpleMark.taken = true;
      if (api.interceptionActive?.()) duration = Math.max(duration, t + 0.2);
      else duration = Math.min(duration, t + 0.05);
    }
    const frame = C.attackFrameEnds.findIndex(end => t - poseAt < end);
    api.present?.(frame >= 0 ? { sheet: 'attack', frame } : null);
    while (queue.length && t >= queue[0].at) queue.shift().run(finishStarted ? voicedApi : normalApi);
  } };
}
export const DRUM_DEVIL_PATTERNS = {
  drum_bombard: () => createPattern('bombard'),
  drum_roll: () => createPattern('roll'),
  drum_chain: () => createPattern('chain'),
  drum_cross: () => createPattern('cross'),
  drum_ring: () => createPattern('ring'),
};
