import { drawCat, hitCat } from './cat-art.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const point = (x, y) => ({ x, y });

function waves(o, count, every, action) {
  let next = 0;
  const duration = o.duration ?? 4.8;
  return { duration, update(t, dt, api) {
    while (next < count && t >= 0.2 + next * every && t < duration) action(api, next++);
  } };
}

function emit(api, options) {
  api.emit({ r: 6, thick: 2, points: b => [point(b.x, b.y)], box: { ...api.box },
    drawShape: drawCat, hitShape: hitCat, ...options });
}

/** Six normal-enemy attacks, designed from the cats' paws, whiskers, toys and tail. */
export const CAT_PATTERNS = {
  // Alternating kneading → paw pads → a fixed footprint → step outside before the press.
  cat_knead: (o = {}) => waves(o, o.waves ?? 5, o.every ?? 0.82, (api, i) => {
    const box = api.box, r = o.r ?? 22, warn = Math.max(0.3, o.warn ?? 0.6);
    emit(api, { shape: 'cat_paw', x: clamp(api.soul.x + (i % 2 ? 8 : -8), box.x + r + 3, box.x + box.w - r - 3),
      y: clamp(api.soul.y, box.y + r + 3, box.y + box.h - r - 3), r, warn, life: warn + (o.hit ?? 0.24) });
  }),
  // Reaching from the side → long foreleg and paw → full reach guide → leave that row.
  cat_reach: (o = {}) => waves(o, o.waves ?? 3, o.every ?? 1.35, (api, i) => {
    const box = api.box, dir = i % 2 ? -1 : 1, x = dir > 0 ? box.x + 4 : box.x + box.w - 4;
    const y = clamp(api.soul.y, box.y + 18, box.y + box.h - 18), reach = box.w * (o.reach ?? 0.72);
    const warn = Math.max(0.3, o.warn ?? 0.6), extend = o.extend ?? 0.5, hold = o.hold ?? 0.12, retract = o.retract ?? 0.4;
    emit(api, { shape: 'cat_forepaw', x, y, r: 13, thick: 12, warn, life: warn + extend + hold + retract,
      guide: () => [point(x, y), point(x + dir * reach, y)],
      points(b) {
        const age = Math.max(0, b.age - warn);
        const amount = age < extend ? age / extend : age < extend + hold ? 1 : Math.max(0, 1 - (age - extend - hold) / retract);
        return [point(x, y), point(x + dir * reach * amount, y)];
      } });
  }),
  // Twitching whiskers → curved hair strands → edge curl → weave between separate drifting threads.
  cat_whiskers: (o = {}) => waves(o, o.waves ?? 2, o.every ?? 2, (api, wave) => {
    const box = api.box, dir = wave % 2 ? -1 : 1, start = dir > 0 ? box.x + 7 : box.x + box.w - 7;
    const warn = Math.max(0.3, o.warn ?? 0.45), speed = o.speed ?? 76;
    for (let lane = 0; lane < 3; lane++) {
      const baseY = box.y + box.h * (lane + 0.5) / 3;
      emit(api, { shape: 'cat_whisker', x: start, y: baseY, r: 0, thick: 2, warn, life: warn + (box.w + 20) / speed,
        steer(b) {
          const age = Math.max(0, b.age - warn);
          b.x = start + dir * age * speed; b.y = baseY + Math.sin(age * 2.5 + lane * 1.4) * 11;
        },
        points(b) {
          return Array.from({ length: 9 }, (_, k) => {
            const u = k / 8;
            return point(b.x - dir * u * 23, b.y + Math.sin(u * Math.PI * 1.4 + b.age * 2) * 6);
          });
        } });
    }
  }),
  // Rolling and unspooling → striped yarn ball plus trailing thread → route preview → pass behind the shrinking trail.
  cat_yarn: (o = {}) => waves(o, o.waves ?? 2, o.every ?? 2.05, (api, i) => {
    const box = api.box, dir = i % 2 ? -1 : 1, start = dir > 0 ? box.x + 12 : box.x + box.w - 12;
    const warn = Math.max(0.3, o.warn ?? 0.55), speed = o.speed ?? 78, trail = o.trail ?? 0.62;
    const route = age => point(start + dir * age * speed, box.y + box.h * (i % 2 ? 0.66 : 0.34) + Math.sin(age * 3) * 20);
    emit(api, { shape: 'cat_yarn', ...route(0), r: 10, thick: 2, warn, life: warn + (box.w - 10) / speed,
      guide: () => Array.from({ length: 17 }, (_, k) => route(k / 16 * (box.w - 24) / speed)),
      steer(b) {
        const age = Math.max(0, b.age - warn), p = route(age); b.x = p.x; b.y = p.y; b.rot = dir * age * speed / b.r;
      },
      points(b) {
        const age = Math.max(0, b.age - warn);
        return Array.from({ length: 10 }, (_, k) => route(Math.max(0, age - k / 9 * trail)));
      } });
  }),
  // Dangling toy released → fish on a cord → swinging path plus drop line → leave the release column.
  cat_fish: (o = {}) => waves(o, o.waves ?? 3, o.every ?? 1.4, (api, i) => {
    const box = api.box, x = box.x + box.w * [0.3, 0.7, 0.5][i % 3], top = box.y + 4;
    const warn = Math.max(0.3, o.warn ?? 0.7), rope = o.rope ?? 34, speed = o.speed ?? 112;
    const swing = age => point(x + Math.sin(age / warn * Math.PI * 2) * 25, top + rope - Math.cos(age / warn * Math.PI * 2) * 8);
    emit(api, { shape: 'cat_fish', ...swing(0), r: 8, thick: 1, warn, life: warn + box.h / speed,
      guide: () => [...Array.from({ length: 17 }, (_, k) => swing(k / 16 * warn)), point(x, box.y + box.h - 4)],
      steer(b) {
        const age = b.age - warn, p = age < 0 ? swing(b.age) : point(x, top + rope - 8 + speed * age);
        b.x = p.x; b.y = p.y; b.rot = age < 0 ? Math.sin(b.age / warn * Math.PI * 2) * 0.5 : Math.PI / 2;
      } });
  }),
  // Tail swish → thick crescent → the swept crescent band → move inside or outside its radius.
  cat_tail: (o = {}) => waves(o, o.waves ?? 2, o.every ?? 2.1, (api, i) => {
    const box = api.box, x = box.x + box.w * (i % 2 ? 0.75 : 0.25), y = box.y + box.h * (i % 2 ? 0.28 : 0.72);
    const warn = Math.max(0.3, o.warn ?? 0.7), sweep = o.sweep ?? 1.2, radius = o.radius ?? 49;
    const arc = angle => Array.from({ length: 15 }, (_, k) => point(x + Math.cos(angle + k / 14 * 1.35) * radius, y + Math.sin(angle + k / 14 * 1.35) * radius));
    const start = i % 2 ? 0 : Math.PI;
    emit(api, { shape: 'cat_tail', x, y, r: 0, thick: 11, warn, life: warn + sweep,
      guide: () => Array.from({ length: 30 }, (_, k) => point(x + Math.cos(start + k / 29 * 3.45) * radius, y + Math.sin(start + k / 29 * 3.45) * radius)),
      points: b => arc(start + clamp((b.age - warn) / sweep, 0, 1) * 2.1) });
  }),
};
