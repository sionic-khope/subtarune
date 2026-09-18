// 아짐키야 4인조 탄막(BUILD227 사용자 브리핑 2026-09-18): “가재맨애미뒤짐 텍스트를 원시부족들이 간소화한 도트로 피하는 곳 아래에 네 명이 춤추면서 그 텍스트를 아래에서 뿜어서 피하는 패턴과
//   가재맨애미뒤짐 텍스트가 비처럼 내리는 거 그리고 쟤네들이 춤추는 거 역동적으로 춰서 그거 피하는 패턴”.
//   글자 탄 = 글자 하나가 탄 하나(원 반지름 6). 춤추는 몸은 흰/검 2톤(whiteSprite) 작은 도트.
import { FONT } from '../ui/font.js';
import { whiteSprite } from './youngcle-patterns.js';

export const AJIMKIYA_TEXT = '가재맨애미뒤짐';
const DANCERS = ['d1', 'd2', 'd3', 'd4'];

/** 글자 탄 — 흰 글자 한 자, rot 만큼 기울어 날아간다 */
const glyph = (ch) => ({
  r: 6, kind: 'white',
  drawShape(ctx, b) {
    ctx.save(); ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(b.rot);
    ctx.font = FONT; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, 0, 0);
    ctx.restore();
  },
});
/** 춤 시트(2×2 128 셀)의 프레임 하나를 흰 2톤으로 */
const drawDancer = (ctx, img, frame, x, y, size) => {
  if (!img) return;
  const fw = img.width / 2, fh = img.height / 2;
  ctx.drawImage(img, (frame % 2) * fw, Math.floor(frame / 2) * fh, fw, fh, Math.round(x - size / 2), Math.round(y - size), size, size);
};

export const AJIMKIYA_PATTERNS = {
  // 상자 아래에 네 명(작은 흰 도트)이 춤추며 글자를 위로 뿜는다
  ajimkiya_spew: (o = {}) => {
    const every = o.every ?? 0.2, speed = o.speed ?? 165, duration = o.duration ?? 5.2, size = o.size ?? 34; let next = 0.5, n = 0, stage = false;
    return { duration, update(t, dt, api) {
      const b = api.box;
      if (!stage) {
        stage = true;
        api.emit({ x: b.x, y: b.y + b.h, r: 1, harmless: true, life: duration + 0.8, drawShape(ctx, self) {
          DANCERS.forEach((key, i) => {
            const img = whiteSprite(api.images?.[key], 0.45); const frame = (Math.floor(self.age * 5) + i) % 4;
            const cx = b.x + b.w * (i + 0.5) / 4, bob = Math.abs(Math.sin(self.age * 6 + i * 1.3)) * 4;
            drawDancer(ctx, img, frame, cx, b.y + b.h + 6 + size - bob, size);
          });
        } });
      }
      if (t < next) return; next += every;
      const i = n % 4, ch = AJIMKIYA_TEXT[n % AJIMKIYA_TEXT.length]; n++;
      const sx = b.x + b.w * (i + 0.5) / 4 + (api.rnd() - 0.5) * 18;
      api.emit({ ...glyph(ch), x: sx, y: b.y + b.h + 4, vx: (api.rnd() - 0.5) * 70, vy: -speed * (0.8 + api.rnd() * 0.45), ay: 110, spin: (api.rnd() - 0.5) * 5 });
    } };
  },
  // 글자가 비처럼 내린다
  ajimkiya_rain: (o = {}) => {
    const rate = o.rate ?? 0.15, speed = o.speed ?? 110, duration = o.duration ?? 5; let acc = 0, n = 0;
    return { duration, update(t, dt, api) {
      acc += dt;
      while (acc >= rate) {
        acc -= rate; const b = api.box, ch = AJIMKIYA_TEXT[n++ % AJIMKIYA_TEXT.length];
        api.emit({ ...glyph(ch), x: b.x + 10 + api.rnd() * (b.w - 20), y: b.y - 12, vy: speed * (0.8 + api.rnd() * 0.5), spin: (api.rnd() - 0.5) * 3 });
      }
    } };
  },
  // 네 명이 상자 안을 좌우로 역동적으로 가로지르며 춤춘다(위아래로 출렁) — 몸에 닿으면 피해
  ajimkiya_dance: (o = {}) => {
    const duration = o.duration ?? 5.4, every = o.every ?? 0.85, speed = o.speed ?? 115, size = o.size ?? 34; let next = 0.3, n = 0;
    return { duration, update(t, dt, api) {
      if (t < next) return; next += every;
      const b = api.box, i = n % 4, dir = n % 2 ? -1 : 1, key = DANCERS[i]; n++;
      const y0 = b.y + 18 + api.rnd() * (b.h - 36), amp = 16 + api.rnd() * 14, freq = 3.5 + api.rnd() * 2, half = size / 2;
      api.emit({ x: dir > 0 ? b.x - 22 : b.x + b.w + 22, y: y0, vx: dir * speed * (0.85 + api.rnd() * 0.3), r: 11, kind: 'white',
        steer(self) { self.y = y0 + Math.sin(self.age * freq) * amp; },
        drawShape(ctx, self) { drawDancer(ctx, whiteSprite(api.images?.[key], 0.45), Math.floor(self.age * 8) % 4, self.x, self.y + half - 2, size); },
        hitShape(self, soul) { const dx = Math.abs(self.x - soul.x), dy = Math.abs(self.y - soul.y); return dx < half * 0.5 + soul.r - 2 && dy < half * 0.8 + soul.r - 2; } });
    } };
  },
};
