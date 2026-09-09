// ─────────────────────────────────────────────────────────────
// 소용돌이 이펙트 (월드 좌표, 컴퓨터에서 터져 나와 화면을 삼킨다).
//   game.vortex.start({x,y,size,grow}) / grow({size,grow}) / stop()
//   컷신 노드: { vortex:{ at:'pc'|[x,y], size, grow } } { vortex:null }   (기다리지 않음 — 대사와 동시에 커진다)
// ─────────────────────────────────────────────────────────────
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export class Vortex {
  constructor() { this.active = false; this.x = 0; this.y = 0; this.r = 0; this.from = 0; this.to = 0; this.growT = 0; this.growDur = 1; this.t = 0; this.parts = []; }
  start({ x, y, size = 40, grow = 1 }) {
    this.active = true; this.x = x; this.y = y; this.r = 2; this.t = 0;
    this.parts = Array.from({ length: 70 }, () => ({ a: Math.random() * Math.PI * 2, f: 0.15 + Math.random() * 0.9, s: 1 + Math.random() * 2, sp: 1.5 + Math.random() * 2.5 }));
    this.grow({ size, grow });
  }
  grow({ size, grow = 1 }) { this.from = this.r; this.to = size; this.growT = 0; this.growDur = Math.max(0.01, grow); }
  stop() { this.active = false; }
  update(dt) {
    if (!this.active) return;
    this.t += dt;
    if (this.growT < this.growDur) { this.growT = Math.min(this.growDur, this.growT + dt); this.r = this.from + (this.to - this.from) * easeInOut(this.growT / this.growDur); }
    for (const p of this.parts) p.a += dt * p.sp / Math.max(0.15, p.f);
  }
  draw(ctx, cam) {
    if (!this.active || this.r < 1) return;
    const cx = this.x - cam.x, cy = this.y - cam.y, r = this.r, t = this.t;
    ctx.save();
    // 어두운 원판 + 보라 글로우
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(5,0,12,1)'); g.addColorStop(0.45, 'rgba(40,12,80,0.96)'); g.addColorStop(0.8, 'rgba(90,40,150,0.7)'); g.addColorStop(1, 'rgba(120,70,190,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // 나선 팔 3개
    for (let arm = 0; arm < 3; arm++) {
      ctx.beginPath();
      const off = arm * Math.PI * 2 / 3 + t * 3.2;
      for (let i = 0; i <= 60; i++) {
        const k = i / 60, th = k * Math.PI * 5 + off, rad = r * Math.pow(k, 0.85);
        const x = cx + Math.cos(th) * rad, y = cy + Math.sin(th) * rad * 0.9;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = arm === 0 ? 'rgba(200,160,255,0.85)' : 'rgba(150,90,235,0.75)'; ctx.lineWidth = Math.max(1.5, r * 0.02); ctx.stroke();
    }
    // 빨려 들어가는 입자
    ctx.fillStyle = '#e2ccff';
    for (const p of this.parts) { const rad = r * p.f; const x = cx + Math.cos(p.a) * rad, y = cy + Math.sin(p.a) * rad * 0.9; ctx.fillRect(Math.round(x), Math.round(y), p.s, p.s); }
    // 바깥 링
    ctx.strokeStyle = `rgba(180,140,255,${0.35 + 0.15 * Math.sin(t * 9)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r * (0.98 + 0.02 * Math.sin(t * 7)), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}
