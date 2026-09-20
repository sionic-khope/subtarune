// 떨어지는 꽃잎(벚꽃 숲 jjajang_sakura, BUILD261 사용자 “분홍색 벚꽃이 조금씩 날리는 맵 … 분홍 꽃잎이 맵 전체에 아주많이 깔리면서 … 그뒤에도 작은 벚꽃들은 계속 떨어지지만”)
//   화면 좌표(480×360)에서 위에서 아래로 살랑살랑 내려오는 2~3px 분홍 점. rate(초당 개수)는 맵 meta.petals 가 정한다: light(처음) → burst(한꺼번에 n 개 + burstRate 로 burstSeconds 동안) → after(그 뒤 계속).
//   순수 로직(캔버스는 draw 에서만) — tests/unit/jjajang-sakura.test.mjs 가 rng 를 주입해 잰다.
export const PETAL_COLORS = ['#ff8ad0', '#ffc2e0', '#f06ab8', '#ffdff0'];

export function createPetals({ rate = 3, colors = PETAL_COLORS, wind = 9, sway = 16, fall = [26, 52], rng = Math.random } = {}) {
  const list = []; let acc = 0, t = 0;
  const spawn = (x, y) => list.push({
    x, y, s: rng() < 0.3 ? 3 : 2, color: colors[Math.floor(rng() * colors.length)],
    vy: fall[0] + rng() * (fall[1] - fall[0]), vx: wind * (0.4 + rng() * 0.8), f: 0.8 + rng() * 1.6, ph: rng() * Math.PI * 2, spin: rng() * Math.PI * 2,
  });
  return {
    rate,
    get count() { return list.length; },
    /** 한꺼번에 n 개를 화면 곳곳(위쪽 밖 포함)에 뿌린다 — 벚꽃이 번지는 순간 */
    burst(n, w, h) { for (let i = 0; i < n; i++) spawn(-30 + rng() * (w + 60), -h * 0.4 + rng() * (h * 1.3)); },
    update(dt, w, h) {
      t += dt; acc += this.rate * dt;
      while (acc >= 1) { acc -= 1; spawn(-20 + rng() * (w + 40), -6 - rng() * 12); }
      for (const p of list) { p.x += (p.vx + Math.sin(t * p.f + p.ph) * sway) * dt; p.y += p.vy * dt; }
      for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; if (p.y > h + 8 || p.x < -70 || p.x > w + 70) list.splice(i, 1); }
    },
    draw(ctx) {
      for (const p of list) { ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
    },
  };
}
