import { PARK_CLEANING as C } from '../../data/park-cleaning.js';
import { hitParkGuardian } from '../park-guardian-patterns.js';

const clamp = value => Math.max(0, Math.min(1, value));

/** One geometry source positions both the generated sprite and its contact polygons. */
export function cleaningGeometry(b) {
  const progress = clamp((b.age - b.warn) / b.travel);
  const x = b.from.x + (b.to.x - b.from.x) * progress;
  const y = b.from.y + (b.to.y - b.from.y) * progress;
  const [w, h] = C.sizes[b.cleaningKind];
  const [sourceW, sourceH] = C.sourceSizes[b.cleaningKind];
  return { x, y, w, h, polygons: C.contactPixels[b.cleaningKind].map(points => points.map(([px, py]) => ({
    x: x + (px / sourceW - 0.5) * w, y: y + (py / sourceH - 0.5) * h,
  }))) };
}

/** Draw only generated art; the dashed travel guide is a harmless attack warning. */
export function drawCleaning(ctx, b) {
  const g = cleaningGeometry(b), warning = b.age < b.warn;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.beginPath(); ctx.rect(b.box.x + 3, b.box.y + 3, b.box.w - 6, b.box.h - 6); ctx.clip();
  if (warning) {
    ctx.strokeStyle = '#ffe099'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(Math.round(b.from.x), Math.round(b.from.y));
    ctx.lineTo(Math.round(b.to.x), Math.round(b.to.y)); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 0.45 + Math.sin(b.age * 16) * 0.1;
  }
  ctx.drawImage(b.image, Math.round(g.x - g.w / 2), Math.round(g.y - g.h / 2), g.w, g.h);
  ctx.restore();
}

function launch(api, kind, from, to) {
  const travel = C[`${kind}Seconds`], image = api.images[C.assets[kind]];
  api.emit({ x: api.box.x + api.box.w / 2, y: api.box.y + api.box.h / 2, r: 0,
    shape: 'park_cleaning', cleaningKind: kind, image, from, to, travel,
    box: { ...api.box }, warn: C.warn, life: C.warn + travel,
    polygons: b => cleaningGeometry(b).polygons, drawShape: drawCleaning, hitShape: hitParkGuardian });
}

/** Existing ordinary-pattern API, with preloaded generated projectile images. */
export const PARK_CLEANING_PATTERNS = {
  park_cleaning: () => {
    let event = 0, spoke = false;
    const events = C.waves.flatMap(wave => [
      { at: wave.at, run(api) {
        api.present?.({ sheet: 'attack', frame: 0 });
        const b = api.box;
        if (wave.kind === 'bag') for (const lane of wave.lanes) {
          const x = b.x + C.bagEdgeInset + (b.w - C.bagEdgeInset * 2) * lane / 4;
          launch(api, 'bag', { x, y: b.y - 16 }, { x, y: b.y + b.h + 16 });
        }
        if (wave.kind === 'broom') launch(api, 'broom',
          { x: b.x - 16, y: b.y + b.h - 59 }, { x: b.x + b.w + 16, y: b.y + b.h - 59 });
        if (wave.kind === 'dustpan') launch(api, 'dustpan',
          { x: b.x + b.w / 2, y: b.y + b.h + 24 }, { x: b.x + b.w / 2, y: b.y - 24 });
      } },
      { at: wave.at + C.warn, run(api) { api.present?.({ sheet: 'attack', frame: 2 }); api.sfx?.(wave.kind === 'bag' ? 'thud' : 'whoosh'); } },
      { at: wave.at + C.warn + 0.3, run: api => api.present?.(null) },
    ]).sort((a, b) => a.at - b.at);
    return { duration: C.duration, update(t, dt, api) {
      if (!spoke) {
        if (Object.values(C.assets).some(key => !api.images?.[key])) throw new Error('Park cleaning projectile images are not loaded');
        api.say?.(C.line, 2); spoke = true;
      }
      while (event < events.length && events[event].at <= t) events[event++].run(api);
    } };
  },
};
