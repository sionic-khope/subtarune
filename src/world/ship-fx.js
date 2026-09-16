// 조종실 플라즈마 배선(BUILD209 사용자 “더 웅장한 배선이랑 플라즈마들 움직이는 그런 맵”): 맵 엔티티 `ship_plasma` — 굵은 검은 케이블(폴리라인) 위로 빛나는 플라즈마 구슬이 흘러간다.
//   def.points [[x,y],…] 맵 좌표, def.speed(px/s, 기본 90), def.count(구슬 수, 기본 3), def.color('cyan'|'purple'). 막지 않고(solid false) 바닥 뒤(sortY 낮음)에 그린다.
//   플라즈마 배관 유닛·케이블 트렁크 그림(assets/props/ship_conduit.png / ship_cable_trunk.png, gpt-image-2.5-sunburst ship-conduit-v1)은 일반 prop(anim 3프레임 — 플라즈마 픽셀만 굴린 프레임).
const PALETTE = { cyan: ['#60f4e0', '#bffff6', 'rgba(96,244,224,0.35)'], purple: ['#c9a6ff', '#ffffff', 'rgba(201,166,255,0.35)'] };

export function registerShipFxEntities({ Entity, registerEntity }) {
  class ShipPlasma extends Entity {
    constructor(def, game) {
      super({ solid: false, w: 2, h: 2, ...def, sortY: def.sortY ?? -300 }, game);
      const pts = this.def.points || []; this.segs = []; this.total = 0;
      for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i]; const len = Math.hypot(bx - ax, by - ay); this.segs.push({ ax, ay, bx, by, len, at: this.total }); this.total += len; }
    }
    at(d) { d = ((d % this.total) + this.total) % this.total; for (const s of this.segs) { if (d <= s.at + s.len) { const k = s.len ? (d - s.at) / s.len : 0; return [s.ax + (s.bx - s.ax) * k, s.ay + (s.by - s.ay) * k]; } } const l = this.segs.at(-1); return l ? [l.bx, l.by] : [0, 0]; }
    draw(ctx, cam) {
      const pts = this.def.points || []; if (pts.length < 2 || !this.total) return;
      const [core, hi, halo] = PALETTE[this.def.color] || PALETTE.cyan, t = performance.now() / 1000, speed = this.def.speed ?? 90, n = this.def.count ?? 3;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const path = () => { ctx.beginPath(); pts.forEach(([px, py], i) => i ? ctx.lineTo(Math.round(px - cam.x), Math.round(py - cam.y)) : ctx.moveTo(Math.round(px - cam.x), Math.round(py - cam.y))); };
      path(); ctx.strokeStyle = '#0d1219'; ctx.lineWidth = 8; ctx.stroke();                           // 케이블 몸통
      path(); ctx.strokeStyle = '#2a3442'; ctx.lineWidth = 4; ctx.stroke();
      path(); ctx.strokeStyle = halo; ctx.lineWidth = 2; ctx.stroke();                                // 희미한 빛 줄
      for (let i = 0; i < n; i++) {                                                                   // 흘러가는 플라즈마 구슬(꼬리 3개)
        const d = t * speed + i * (this.total / n);
        for (let k = 3; k >= 0; k--) { const [px, py] = this.at(d - k * 7); const x = Math.round(px - cam.x), y = Math.round(py - cam.y);
          ctx.fillStyle = k ? halo : core; ctx.fillRect(x - 3 + Math.min(k, 1), y - 3 + Math.min(k, 1), 6 - Math.min(k, 1) * 2, 6 - Math.min(k, 1) * 2);
          if (!k) { ctx.fillStyle = hi; ctx.fillRect(x - 1, y - 1, 2, 2); } }
      }
      for (const [px, py] of [pts[0], pts.at(-1)]) { ctx.fillStyle = '#5c6a7e'; ctx.fillRect(Math.round(px - cam.x - 4), Math.round(py - cam.y - 4), 8, 8); ctx.fillStyle = '#ffd23f'; ctx.fillRect(Math.round(px - cam.x - 2), Math.round(py - cam.y - 2), 4, 4); }   // 양끝 커넥터
      ctx.restore();
    }
  }
  registerEntity('ship_plasma', ShipPlasma);
}
