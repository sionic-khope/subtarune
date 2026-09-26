import { makeCanvas } from '../core/gfx.js';

/** Shared field/battle runner sword aura; created lazily for headless simulation. */
let auraCanvas;
// 날(BUILD244 사용자 “검기가 ) 모양이라 날카로움이 없다”): 호를 따라 폭이 가운데서 가장 넓고 양끝은 0 으로 모이는 초승달 — 앞끝(진행 방향)이 더 가늘어 베는 느낌. 각도는 a0 → a1 로 보간(부호가 방향)
export function drawRunnerAura(ctx, cx, cy, r, a0, a1, alpha) {
  // 반지름 44 호는 두께까지 48칸을 넘어 캔버스 가장자리에서 네모로 잘렸다(BUILD378 “점프 베기 잔상이 사각형에 잘림”) → 80칸, 가운데 40
  const S = 80, AURA = auraCanvas ||= makeCanvas(S, S);
  const ac = AURA.getContext('2d'); ac.clearRect(0, 0, S, S);
  const hr = r / 2, c = S / 2, n = 20, wmax = Math.max(4, hr * 0.46), span = a1 - a0;
  const pt = (i, off) => { const u = i / n, a = a0 + span * u, w = wmax * Math.pow(Math.sin(Math.PI * u), 0.6) * (1 - 0.3 * u), rr = hr + off * w / 2; return [c + Math.cos(a) * rr, c + Math.sin(a) * rr]; };
  ac.globalAlpha = alpha * 0.62; ac.fillStyle = '#fff'; ac.beginPath();
  for (let i = 0; i <= n; i++) { const [x, y] = pt(i, 1); if (i === 0) ac.moveTo(x, y); else ac.lineTo(x, y); }
  for (let i = n; i >= 0; i--) { const [x, y] = pt(i, -1); ac.lineTo(x, y); }
  ac.closePath(); ac.fill();
  ac.globalAlpha = alpha * 0.95; ac.lineWidth = 1.2; ac.strokeStyle = '#fff'; ac.beginPath();
  for (let i = 1; i < n; i++) { const [x, y] = pt(i, 0.7); if (i === 1) ac.moveTo(x, y); else ac.lineTo(x, y); }
  ac.stroke();
  ac.globalAlpha = 1;
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(AURA, 0, 0, S, S, Math.round(cx) - S, Math.round(cy) - S, S * 2, S * 2); ctx.restore();
}

/** Draw the same runner frame and pivot in field and fullscreen battles. */
export function drawRunnerFrame(ctx, img, frame, scale, ax, ay, angle, dir = 1) {
    const dw = Math.round(frame.image.width * scale), dh = Math.round(frame.image.height * scale);
    const dx = Math.round(ax - frame.pivot[0] * scale), dy = Math.round(ay - frame.pivot[1] * scale);
    const mirror = dir < 0;   // 시트는 오른쪽을 본다 → 왼쪽으로 달릴 땐 앵커 기준 좌우 반전(기울기도 반대)
    ctx.save();
    if (mirror) { ctx.translate(Math.round(ax) * 2, 0); ctx.scale(-1, 1); }
    if (angle) {
      const cx = Math.round(ax), cy = Math.round(ay - dh * 0.5);
      ctx.translate(cx, cy); ctx.rotate(angle); ctx.drawImage(img, dx - cx, dy - cy, dw, dh);
    } else ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }
