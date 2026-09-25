import { SCREEN_W, SCREEN_H } from '../core/layout.js';

/**
 * BUILD342 꼭대기 끝길 너머의 검은 연기(월드 좌표). 필드 대치(CastleSummit)와 청소년 전투(teen-boss)가 같은 인스턴스를 이어 쓴다.
 * back : 허공에 둥둥 떠다니는 큰 연기(청소년 뒤, 사용자 “배경에 연기 같은거 둥둥둥”)
 * front: 청소년 아래를 덮는 짙은 연기(거대해서 상체만 보이게, 사용자 “연기도 가려져있어야”)
 */
export const SMOKE = Object.freeze({
  x: [1740, 2304],
  back: { count: 26, y: [60, 700], r: [40, 90], vx: [-6, 6], vy: [-5, -1], life: [7, 12] },
  front: { count: 34, y: [470, 700], r: [34, 70], vx: [-10, 10], vy: [-9, -3], life: [3.5, 6] },
});

const lerp = (a, b, k) => a + (b - a) * k;

export class SummitSmoke {
  constructor({ rnd = Math.random } = {}) {
    this.rnd = rnd; this.puffs = [];
    for (const layer of ['back', 'front']) for (let i = 0; i < SMOKE[layer].count; i++) this.spawn(layer, true);
  }
  spawn(layer, anywhere = false) {
    const L = SMOKE[layer], r = this.rnd;
    const life = lerp(L.life[0], L.life[1], r());
    this.puffs.push({ layer, x: lerp(SMOKE.x[0], SMOKE.x[1], r()), y: lerp(L.y[0], L.y[1], r()), r: lerp(L.r[0], L.r[1], r()),
      vx: lerp(L.vx[0], L.vx[1], r()), vy: lerp(L.vy[0], L.vy[1], r()), age: anywhere ? r() * life : 0, life, tint: r() < 0.4 });
  }
  update(dt) {
    const s = Math.max(0, dt);
    for (const p of this.puffs) { p.age += s; p.x += p.vx * s; p.y += p.vy * s; p.r += 2 * s; }
    this.puffs = this.puffs.filter(p => p.age < p.life);
    for (const layer of ['back', 'front']) while (this.puffs.filter(p => p.layer === layer).length < SMOKE[layer].count) this.spawn(layer);
  }
  /** Draw one layer; `extra` thickens every puff, `mul` scales the whole layer (reveal veil). */
  draw(ctx, cam, layer, extra = 0, mul = 1) {
    ctx.save();
    for (const p of this.puffs) {
      if (p.layer !== layer) continue;
      const fade = Math.min(1, p.age / 1.2, (p.life - p.age) / 1.5), r = Math.round(p.r), cx = p.x - cam.x, cy = p.y - cam.y;
      if (cx < -r * 1.4 - SCREEN_W || cx > SCREEN_W * 2 + r * 1.4 || cy < -r - SCREEN_H || cy > SCREEN_H * 2 + r) continue;
      const base = layer === 'front' ? 0.92 : 0.5;
      ctx.globalAlpha = Math.max(0, Math.min(1, fade * (base + extra))) * mul;
      ctx.fillStyle = layer === 'front' ? (p.tint ? '#0b0712' : '#030205') : (p.tint ? '#1d1330' : '#0e0a18');
      for (let row = -r; row < r; row += 3) {
        const half = Math.round(Math.sqrt(Math.max(0, 1 - ((row + 1) / r) ** 2)) * r * 1.35);
        ctx.fillRect(Math.round(cx - half), Math.round(cy + row), half * 2, 3);
      }
    }
    ctx.restore();
  }
}
