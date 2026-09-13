import { FONT } from '../ui/font.js';
import { makeCanvas } from '../core/gfx.js';

export const VIEWER_NAMES = ['행복맨', '이고역', 'ONEP', '문금통', '쥰희', '정아문', '착하고겸손하게살기', '샬케제발우승', '왕코형님', 'bluemevius', '고능아진재승', '최미스', '박용준', '억측맨', '최건위', '뜨또'];
const TAU = Math.PI * 2;
const HEATED = new WeakMap();
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function timeline(duration, events) {
  events.sort((a, b) => a.at - b.at);
  let index = 0;
  return { duration, update(t, dt, api) {
    while (index < events.length && events[index].at <= t) events[index++].run(api);
  } };
}

function hitRect(b, soul) {
  if (b.age < b.warn || b.harmless) return false;
  const dx = soul.x - clamp(soul.x, b.x - b.w / 2, b.x + b.w / 2);
  const dy = soul.y - clamp(soul.y, b.y - b.h / 2, b.y + b.h / 2);
  return dx * dx + dy * dy <= (soul.r - 2) ** 2;
}

function drawLetter(ctx, b) {
  ctx.save(); ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(b.rot);
  ctx.font = FONT.replace(/^\d+px/, `${b.fontSize}px`); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = b.age < b.warn ? '#898989' : '#fff'; ctx.fillText(b.text, 0, 0); ctx.restore();
}

function letter(api, text, x, y, size, extra = {}) {
  api.emit({ shape: 'viewer_letter', text, x, y, fontSize: size, w: size * text.length * 0.83, h: size * 0.83,
    r: size * 0.42, life: 5, drawShape: drawLetter, hitShape: hitRect, ...extra });
}

function marker(api, x, y, width, height, duration) {
  api.emit({ shape: 'viewer_warning', x, y, w: width, h: height, r: 0, harmless: true, life: duration,
    drawShape(ctx, b) {
      ctx.save(); ctx.strokeStyle = Math.floor(b.age * 10) % 2 ? '#999' : '#fff'; ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]); ctx.strokeRect(Math.round(b.x - b.w / 2), Math.round(b.y - b.h / 2), b.w, b.h); ctx.restore();
    } });
}

function drawIcon(ctx, b) {
  if (!b.image) return;
  ctx.save(); ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(b.rot);
  ctx.globalAlpha = b.age < b.warn ? 0.45 : 1;
  let image = b.image;
  if (b.heat) {
    if (!HEATED.has(image)) HEATED.set(image, []);
    const frames = HEATED.get(image), level = Math.min(15, Math.floor(b.heat * 16));
    if (!frames[level]) {
      const frame = makeCanvas(image.width, image.height), paint = frame.getContext('2d');
      paint.drawImage(image, 0, 0); paint.globalCompositeOperation = 'source-atop';
      paint.fillStyle = `rgba(255,25,35,${level / 15 * 0.88})`; paint.fillRect(0, 0, frame.width, frame.height); frames[level] = frame;
    }
    image = frames[level];
  }
  ctx.drawImage(image, -b.w / 2, -b.h / 2, b.w, b.h); ctx.restore();
}

function icon(api, name, x, y, size, extra = {}) {
  api.emit({ shape: `viewer_${name}`, image: api.images?.[name], x, y, w: size, h: size,
    r: size * 0.32, life: 5, drawShape: drawIcon, ...extra });
}

/** 악질맨 전용 일곱 패턴. 문자는 충돌 크기와 같은 글꼴 크기로, 그림은 생성 PNG로 그린다. */
export const VIEWER_PATTERNS = {
  viewer_eom: (o = {}) => {
    const events = [], warn = o.warn ?? 0.6, every = o.every ?? 0.95, size = o.size ?? 52;
    const order = [0, 2, 1, 2, 0, 1];
    order.forEach((lane, i) => {
      const at = 0.2 + i * every;
      events.push({ at, run(api) { const b = api.box; marker(api, b.x + b.w * (lane + 0.5) / 3, b.y + b.h / 2, size, b.h - 6, warn); } });
      events.push({ at: at + warn, run(api) { const b = api.box; letter(api, '엄준식'[i % 3], b.x + b.w * (lane + 0.5) / 3, b.y - size / 2 + 4, size, { vy: o.speed ?? 164 }); } });
    });
    return timeline(o.duration ?? 7.5, events);
  },
  viewer_names: (o = {}) => {
    const events = [], warn = o.warn ?? 0.55, speed = o.speed ?? 148, spacing = o.letterTime ?? 0.14;
    let start = 0;
    events.push({ at: 0, run(api) { start = Math.floor(api.rnd() * VIEWER_NAMES.length); } });
    for (let wave = 0; wave < 3; wave++) {
      const at = 0.25 + wave * 3.2, safe = [1, 2, 0][wave];
      for (let lane = 0; lane < 3; lane++) {
        if (lane === safe) continue;
        const stream = lane > safe ? lane - 1 : lane;
        const dir = (stream + wave) % 2 ? -1 : 1;
        events.push({ at, run(api) { const b = api.box; marker(api, b.x + b.w / 2, b.y + (lane + 0.5) * b.h / 3, b.w - 8, 22, warn); } });
        for (let k = 0; k < 12; k++) events.push({ at: at + warn + k * spacing, run(api) {
          const name = VIEWER_NAMES[(start + wave * 2 + (lane > safe ? lane - 1 : lane)) % VIEWER_NAMES.length];
          if (k >= name.length) return;
          const b = api.box;
          letter(api, name[dir > 0 ? name.length - 1 - k : k], dir > 0 ? b.x - 9 : b.x + b.w + 9, b.y + (lane + 0.5) * b.h / 3, 18, { vx: dir * speed, life: 2.3 });
        } });
      }
    }
    return timeline(o.duration ?? 10.7, events);
  },
  viewer_rock: (o = {}) => {
    const events = [], flight = o.flight ?? 0.7, fuse = o.fuse ?? 3;
    let landing;
    events.push({ at: 0.2, run(api) {
      const b = api.box; landing = { x: clamp(api.soul.x, b.x + 40, b.x + b.w - 40), y: b.y + b.h * 0.62 };
      marker(api, landing.x, landing.y, 48, 48, flight);
      icon(api, 'rock', b.x + b.w - 12, b.y - 22, 34, { harmless: true, life: flight, steer(bullet) {
        const u = clamp(bullet.age / flight, 0, 1);
        bullet.x = b.x + b.w - 12 + (landing.x - b.x - b.w + 12) * u;
        bullet.y = b.y - 22 + (landing.y - b.y + 22) * u - Math.sin(u * Math.PI) * 28;
      } });
    } });
    events.push({ at: 0.2 + flight, run(api) {
      api.say?.('어 이건 무슨바위지?', 2.2);
      icon(api, 'rock', landing.x, landing.y, 34, { harmless: true, life: fuse, heat: 0.01, steer(bullet) {
        bullet.heat = bullet.age / fuse; bullet.x = landing.x + Math.round(Math.sin(bullet.age * 44) * bullet.heat * 2);
      } });
    } });
    events.push({ at: 0.2 + flight + fuse, run(api) {
      api.sfx?.('boom');
      for (let ring = 0; ring < 2; ring++) for (let n = 0; n < 10; n++) {
        const a = n * TAU / 10 + ring * 0.18;
        icon(api, 'shard', landing.x, landing.y, 14, { vx: Math.cos(a) * (80 + ring * 48), vy: Math.sin(a) * (80 + ring * 48), spin: (n % 2 ? -1 : 1) * 4, life: 2.5 });
      }
    } });
    return timeline(o.duration ?? 6.6, events);
  },
  viewer_explain: (o = {}) => {
    const events = [], text = '패드립한거해명해주세요', warn = o.warn ?? 0.4;
    for (let wave = 0; wave < 6; wave++) {
      const at = 0.15 + wave * 0.83, gap = [1, 4, 2, 5, 0, 3][wave];
      events.push({ at, run(api) { const b = api.box; for (let col = 0; col < 6; col++) if (col !== gap) marker(api, b.x + (col + 0.5) * b.w / 6, b.y + 5, 14, 8, warn); } });
      for (let col = 0; col < 6; col++) {
        if (col === gap) continue;
        events.push({ at: at + warn + col * 0.035, run(api) { const b = api.box; letter(api, text[(wave * 6 + col) % text.length], b.x + (col + 0.5) * b.w / 6, b.y - 9, 16, { vy: o.speed ?? 108, vx: wave % 2 ? 8 : -8 }); } });
      }
    }
    return timeline(o.duration ?? 6.8, events);
  },
  viewer_chicken: (o = {}) => {
    const events = [], warn = o.warn ?? 0.55;
    for (let wave = 0; wave < 5; wave++) {
      const at = 0.2 + wave * 1.1;
      let aim;
      events.push({ at, run(api) { aim = { x: api.soul.x, y: api.soul.y }; marker(api, aim.x, aim.y, 30, 30, warn); } });
      events.push({ at: at + warn, run(api) {
        const b = api.box, x = wave % 2 ? b.x + 8 : b.x + b.w - 8, y = b.y + 8;
        const angle = Math.atan2(aim.y - y, aim.x - x);
        for (let n = -1; n <= 1; n++) { const a = angle + n * 0.4; icon(api, 'chicken', x, y, 26, { vx: Math.cos(a) * (o.speed ?? 115), vy: Math.sin(a) * (o.speed ?? 115), spin: n * 2.1 }); }
      } });
    }
    return timeline(o.duration ?? 6.8, events);
  },
  viewer_breath: (o = {}) => {
    const events = [], warn = o.warn ?? 0.55;
    for (let burst = 0; burst < 3; burst++) {
      const at = 0.2 + burst * 2, fromTop = burst % 2 === 0;
      events.push({ at, run(api) { const b = api.box; marker(api, b.x + b.w - 14, b.y + b.h * (fromTop ? 0.2 : 0.8), 22, 30, warn); } });
      for (let k = 0; k < 7; k++) events.push({ at: at + warn + k * 0.13, run(api) {
        const b = api.box, x = b.x + b.w - 9, y = b.y + b.h * (fromTop ? 0.2 : 0.8);
        const sweep = (k / 6 - 0.5) * 0.85;
        const angle = Math.PI + sweep + (fromTop ? -0.16 : 0.16);
        letter(api, '2기', x, y, 18, { vx: Math.cos(angle) * (o.speed ?? 132), vy: Math.sin(angle) * (o.speed ?? 132), life: 2.5 });
      } });
    }
    return timeline(o.duration ?? 7.5, events);
  },
  viewer_timeout: (o = {}) => {
    const events = [], warn = o.warn ?? 0.65, speed = o.speed ?? 86, life = o.life ?? 3.4;
    events.push({ at: 0.1, run(api) { api.say?.('벤하지말아주세요ㅠㅠ', 2); } });
    for (let i = 0; i < 3; i++) {
      const at = 0.35 + i * 1.65;
      events.push({ at, run(api) {
        const box = api.box, x = box.x + (i % 2 ? 16 : box.w - 16), y = box.y + 16;
        icon(api, 'timeout', x, y, 28, { warn, life: warn + life, heading: Math.PI / 2, hitShape(b, soul) {
          if (b.age < b.warn || b.age > b.life - 0.35) return false;
          return Math.hypot(b.x - soul.x, b.y - soul.y) < b.r + soul.r - 2;
        }, steer(b, dt) {
          if (b.age < warn) return;
          const desired = Math.atan2(api.soul.y - b.y, api.soul.x - b.x);
          const delta = Math.atan2(Math.sin(desired - b.heading), Math.cos(desired - b.heading));
          b.heading += clamp(delta, -(o.turn ?? 2.2) * dt, (o.turn ?? 2.2) * dt);
          b.vx = Math.cos(b.heading) * speed; b.vy = Math.sin(b.heading) * speed;
          b.harmless = b.age > b.life - 0.35;
        } });
      } });
    }
    return timeline(o.duration ?? 7.8, events);
  },
};
