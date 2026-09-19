// 문코리타 탄막(BUILD247 사용자 브리핑 2026-09-19: “공격패턴은 덩굴채찍이랑 흐워어어어 소리지르는 패턴두개로”)
//   덩굴 채찍(munkorita_vine): 목에 건 녹색 구슬에서 덩굴이 뻗어 상자를 가로지르는 S자 곡선을 그린다 — 그 곡선이 흰 점선으로 0.5초 깜빡이고(예고, 무해)
//     그 뒤 덩굴 머리가 0.34초에 곡선을 따라 쓸고 지나간다(snd_whip_crack_only). 회피 = 예고 곡선에서 비켜나 있기. 가로·세로가 번갈아 온다.
//   소리지르기(munkorita_shout): 상자 위 가장자리에 웃는 얼굴(흰 2톤 도트)이 떠올라 입을 벌리고(예고 0.55초, 깜빡이는 부채꼴) “흐워어어어” 음파 고리 셋이 차례로 퍼져 내려온다(snd_howl).
//     고리마다 틈이 하나 있고 고리마다 틈 자리가 달라, 틈을 따라 좌우로 움직여 빠져나간다. 고리는 느려서(118px/s) 보고 피할 수 있다.
import { whiteSprite } from './youngcle-patterns.js';

export const VINE = Object.freeze({ warn: 0.5, sweep: 0.34, every: 1.15, first: 0.5, r: 8, amp: [22, 40], waves: [1.1, 2.1], tail: 4, seg: 0.035, segs: 10 });
export const SHOUT = Object.freeze({ warn: 0.55, every: 1.9, first: 0.7, rings: 3, ringEvery: 0.3, speed: 118, thick: 8, gapWidth: 0.7, gapStep: 0.5, face: 30, inset: 16 });

/** 곡선 위의 점(t 0~1): 기준선 위에 사인파를 얹은 S자 — 예고·판정·그리기가 같은 식을 쓴다 */
export function vinePoint(line, t) {
  const dx = line.bx - line.ax, dy = line.by - line.ay, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, off = Math.sin(line.phase + t * Math.PI * 2 * line.waves) * line.amp;
  return [line.ax + dx * t + nx * off, line.ay + dy * t + ny * off];
}
/** 상자를 가로지르는 덩굴 곡선 하나. kind 'h' 가로(왼→오), 'v' 세로(위→아래). 진폭만큼 안쪽으로 물려 상자 밖으로 안 나간다 */
export function vineLine(b, kind, rnd) {
  const m = 12, amp = VINE.amp[0] + rnd() * (VINE.amp[1] - VINE.amp[0]);
  const waves = VINE.waves[0] + rnd() * (VINE.waves[1] - VINE.waves[0]), phase = rnd() * 6.28;
  if (kind === 'h') {
    const lo = b.y + m + amp, hi = b.y + b.h - m - amp;
    const y = hi > lo ? lo + rnd() * (hi - lo) : b.y + b.h / 2;
    return { ax: b.x - 6, ay: y, bx: b.x + b.w + 6, by: y, amp, waves, phase };
  }
  const lo = b.x + m + amp, hi = b.x + b.w - m - amp;
  const x = hi > lo ? lo + rnd() * (hi - lo) : b.x + b.w / 2;
  return { ax: x, ay: b.y - 6, bx: x, by: b.y + b.h + 6, amp, waves, phase };
}
/** 채찍 머리에서 꼬리까지의 마디 자리 */
function vineBody(line, headT) {
  const pts = [];
  for (let i = 0; i <= VINE.segs; i++) pts.push(vinePoint(line, Math.max(0, headT - i * VINE.seg)));
  return pts;
}
/** 웃는 얼굴(대기 시트 2×2 의 한 프레임)을 흰 2톤 도트로 */
function drawFace(ctx, api, x, y, size, frame) {
  const img = whiteSprite(api.images?.face, 0.5);
  if (!img) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), size / 3, 0, Math.PI * 2); ctx.fill(); return; }
  const fw = img.width / 2, fh = img.height / 2;
  ctx.drawImage(img, (frame % 2) * fw, Math.floor(frame / 2) * fh, fw, fh, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
}

export const MUNKORITA_PATTERNS = {
  munkorita_vine: (o = {}) => {
    const every = o.every ?? VINE.every, warn = o.warn ?? VINE.warn, sweep = o.sweep ?? VINE.sweep, duration = o.duration ?? 4.8;
    const kinds = o.kinds || ['h', 'v', 'h', 'v'];
    let next = o.first ?? VINE.first, n = 0; const queue = [];
    return { duration, update(t, dt, api) {
      if (t >= next && t + warn + sweep < duration + 0.3) {
        next += every;
        const line = vineLine(api.box, kinds[n % kinds.length], api.rnd); n += 1;
        api.emit({ x: line.ax, y: line.ay, r: 0, harmless: true, life: warn, shape: 'vine_warn', vineWarn: true,
          drawShape(ctx, self) {
            if (Math.floor(self.age * 8) % 2) return;
            ctx.fillStyle = '#fff';
            for (let i = 0; i <= 28; i++) { const [x, y] = vinePoint(line, i / 28); ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); }
          } });
        queue.push({ at: t + warn, line });
      }
      while (queue.length && t >= queue[0].at) {
        const q = queue.shift(); api.sfx?.('vine_whip');
        api.emit({ x: q.line.ax, y: q.line.ay, r: VINE.r, kind: 'white', shape: 'vine', vine: true, headT: 0, life: sweep + 0.14,
          steer(self) { self.headT = Math.min(1, self.age / sweep); const [x, y] = vinePoint(q.line, self.headT); self.x = x; self.y = y; },
          hitShape(self, soul) {
            for (let i = 0; i <= VINE.tail; i++) {
              const [x, y] = vinePoint(q.line, Math.max(0, self.headT - i * VINE.seg));
              const dx = x - soul.x, dy = y - soul.y, rr = VINE.r + soul.r - 2;
              if (dx * dx + dy * dy <= rr * rr) return true;
            }
            return false;
          },
          drawShape(ctx, self) {
            const pts = vineBody(q.line, self.headT), fade = self.age > sweep ? Math.max(0, 1 - (self.age - sweep) / 0.14) : 1;
            ctx.save(); ctx.globalAlpha = fade; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.strokeStyle = '#2f6b2a'; ctx.lineWidth = 7; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
            ctx.strokeStyle = '#7fd36a'; ctx.lineWidth = 3; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
            ctx.fillStyle = '#9ae66a';
            for (let i = 2; i < pts.length; i += 3) { const [x, y] = pts[i]; ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(i); ctx.fillRect(-4, -2, 8, 4); ctx.restore(); }
            ctx.fillStyle = '#d8ffb0'; const [hx, hy] = pts[0]; ctx.fillRect(Math.round(hx) - 3, Math.round(hy) - 3, 6, 6);
            ctx.restore();
          } });
      }
    } };
  },
  munkorita_shout: (o = {}) => {
    const every = o.every ?? SHOUT.every, warn = o.warn ?? SHOUT.warn, duration = o.duration ?? 5.0;
    const rings = o.rings ?? SHOUT.rings;
    let next = o.first ?? SHOUT.first; const queue = [];
    return { duration, update(t, dt, api) {
      const b = api.box;
      if (t >= next && t + warn + 0.6 < duration + 0.4) {
        next += every;
        const cx = b.x + b.w * (0.25 + api.rnd() * 0.5), cy = b.y + SHOUT.inset, gap = 0.6 + api.rnd() * (Math.PI - 1.2);   // 입은 상자 안쪽 위 — 여기서 음파가 아래로 퍼진다(상자 밖이면 고리가 안 보인다)
        api.emit({ x: cx, y: cy, r: 0, harmless: true, life: warn, shape: 'mouth', shoutWarn: true,
          drawShape(ctx, self) {
            const k = Math.min(1, self.age / warn);
            drawFace(ctx, api, self.x, self.y, SHOUT.face, 2);
            if (Math.floor(self.age * 8) % 2) return;
            ctx.save(); ctx.globalAlpha = 0.85; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(self.x, self.y, 18 + k * 10, gap - SHOUT.gapWidth * 2, gap + SHOUT.gapWidth * 2); ctx.stroke();
            ctx.restore();
          } });
        for (let i = 0; i < rings; i++) queue.push({ at: t + warn + i * SHOUT.ringEvery, cx, cy, gap: gap + (i - (rings - 1) / 2) * SHOUT.gapStep, first: i === 0 });
      }
      while (queue.length && t >= queue[0].at) {
        const q = queue.shift();
        if (q.first) api.sfx?.('howl');
        api.emit({ x: q.cx, y: q.cy, r: 0, kind: 'white', shape: 'wave', wave: true, ringR: 0, life: (b.h + b.w) / SHOUT.speed + 0.4,
          steer(self) { self.ringR = self.age * SHOUT.speed; },
          hitShape(self, soul) {
            const dx = soul.x - q.cx, dy = soul.y - q.cy, d = Math.hypot(dx, dy);
            if (Math.abs(d - self.ringR) > SHOUT.thick / 2 + soul.r - 2) return false;
            const a = Math.atan2(dy, dx);
            if (a < 0) return false;
            let diff = Math.abs(a - q.gap); if (diff > Math.PI) diff = Math.PI * 2 - diff;
            return diff > SHOUT.gapWidth / 2;
          },
          drawShape(ctx, self) {
            if (self.ringR < 6) return;
            // 판정과 같은 아래 반원(0~π)만, 틈은 비워 둔다
            const g0 = Math.max(0, q.gap - SHOUT.gapWidth / 2), g1 = Math.min(Math.PI, q.gap + SHOUT.gapWidth / 2);
            const arcs = [[0, g0], [g1, Math.PI]].filter(([a, b2]) => b2 - a > 0.02);
            ctx.save(); ctx.lineCap = 'butt';
            for (const [lw, col] of [[SHOUT.thick, 'rgba(255,255,255,0.35)'], [2, '#ffffff']]) {
              ctx.strokeStyle = col; ctx.lineWidth = lw;
              for (const [a, b2] of arcs) { ctx.beginPath(); ctx.arc(q.cx, q.cy, self.ringR, a, b2); ctx.stroke(); }
            }
            ctx.restore();
          } });
      }
    } };
  },
};
