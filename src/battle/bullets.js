// ─────────────────────────────────────────────────────────────
// 탄막 상자·소울·패턴 (언더테일/델타룬식). 화면 좌표(480x360).
//   Board: 흰 테두리 검은 상자 — 대사 상자 자리에서 커졌다 줄어든다
//   Soul: 빨간 하트, 방향키로 이동(X 누르면 느리게), 상자 안에 갇힘, 맞으면 무적 0.7초·깜빡임
//   PATTERNS[type](opts) → { duration, update(t, dt, api) }  api = { emit, box, soul, rnd }
//     rain  : 위에서 떨어지는 알갱이   aimed : 가장자리에서 소울을 겨눠 쏨   sweep : 줄지어 옆으로 지나가는 알갱이(사이로 피함)   bounce : 상자 안에서 튕기는 큰 알갱이
//   새 패턴 = 여기 함수 하나 추가 → src/data/enemies.js 의 patterns 에서 type 으로 쓴다.
// ─────────────────────────────────────────────────────────────
export class Board {
  constructor() { this.x = 140; this.y = 150; this.w = 200; this.h = 150; this.target = null; this.open = 0; }
  /** 목표 크기로 부드럽게 (0.25초) */
  setTarget(w, h, cx = 240, cy = 225) { this.target = { w, h, cx, cy }; }
  update(dt) {
    if (!this.target) return;
    const k = Math.min(1, dt / 0.12);
    this.w += (this.target.w - this.w) * k; this.h += (this.target.h - this.h) * k;
    this.x += (this.target.cx - this.w / 2 - this.x) * k; this.y += (this.target.cy - this.h / 2 - this.y) * k;
  }
  snap() { if (this.target) { this.w = this.target.w; this.h = this.target.h; this.x = this.target.cx - this.w / 2; this.y = this.target.cy - this.h / 2; } }
  get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  draw(ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(Math.round(this.x), Math.round(this.y), Math.round(this.w), Math.round(this.h));
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(Math.round(this.x) + 1.5, Math.round(this.y) + 1.5, Math.round(this.w) - 3, Math.round(this.h) - 3);
  }
}

export class Soul {
  constructor() { this.x = 240; this.y = 225; this.r = 5; this.speed = 110; this.invuln = 0; this.hits = 0; }
  center(board) { this.x = board.x + board.w / 2; this.y = board.y + board.h / 2; }
  update(dt, input, board) {
    let vx = 0, vy = 0;
    if (input.down('left')) vx -= 1; if (input.down('right')) vx += 1; if (input.down('up')) vy -= 1; if (input.down('down')) vy += 1;
    if (vx && vy) { vx *= 0.7071; vy *= 0.7071; }
    const sp = this.speed * (input.down('cancel') ? 0.5 : 1);
    this.x += vx * sp * dt; this.y += vy * sp * dt;
    const m = 4 + this.r;
    this.x = Math.max(board.x + m, Math.min(board.x + board.w - m, this.x)); this.y = Math.max(board.y + m, Math.min(board.y + board.h - m, this.y));
    if (this.invuln > 0) this.invuln -= dt;
  }
  draw(ctx) {
    if (this.invuln > 0 && Math.floor(this.invuln * 16) % 2) return;   // 무적 깜빡임
    const x = Math.round(this.x), y = Math.round(this.y);
    ctx.fillStyle = '#ff0000';
    // 8px 하트
    ctx.fillRect(x - 4, y - 3, 3, 2); ctx.fillRect(x + 1, y - 3, 3, 2);
    ctx.fillRect(x - 5, y - 1, 10, 2); ctx.fillRect(x - 4, y + 1, 8, 1); ctx.fillRect(x - 3, y + 2, 6, 1); ctx.fillRect(x - 2, y + 3, 4, 1); ctx.fillRect(x - 1, y + 4, 2, 1);
  }
}

/** 알갱이: 원. kind 로 색만 다르게 */
export class Bullet {
  constructor(o) { Object.assign(this, { r: 4, vx: 0, vy: 0, ax: 0, ay: 0, kind: 'white', age: 0, dmg: null, bounce: false }, o); }
  update(dt, board) {
    this.age += dt; this.vx += this.ax * dt; this.vy += this.ay * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.bounce) {
      if (this.x - this.r < board.x + 3 && this.vx < 0) { this.x = board.x + 3 + this.r; this.vx = -this.vx; }
      if (this.x + this.r > board.x + board.w - 3 && this.vx > 0) { this.x = board.x + board.w - 3 - this.r; this.vx = -this.vx; }
      if (this.y - this.r < board.y + 3 && this.vy < 0) { this.y = board.y + 3 + this.r; this.vy = -this.vy; }
      if (this.y + this.r > board.y + board.h - 3 && this.vy > 0) { this.y = board.y + board.h - 3 - this.r; this.vy = -this.vy; }
    }
  }
  out(board) { const m = 40; return this.x < board.x - m || this.x > board.x + board.w + m || this.y < board.y - m || this.y > board.y + board.h + m; }
  hits(soul) { const dx = this.x - soul.x, dy = this.y - soul.y; const rr = this.r + soul.r - 2; return dx * dx + dy * dy <= rr * rr; }
  draw(ctx) {
    ctx.fillStyle = this.kind === 'blue' ? '#3b8cff' : this.kind === 'orange' ? '#ff9a3b' : '#fff';
    ctx.beginPath(); ctx.arc(Math.round(this.x), Math.round(this.y), this.r, 0, Math.PI * 2); ctx.fill();
  }
}

/** 패턴 라이브러리. 각 패턴은 { duration, update(t, dt, api) } 를 돌려준다. */
export const PATTERNS = {
  rain: (o = {}) => { const rate = o.rate ?? 0.18, speed = o.speed ?? 90, r = o.r ?? 4; let acc = 0;
    return { duration: o.duration ?? 4, update(t, dt, api) { acc += dt; while (acc >= rate) { acc -= rate; const b = api.box; api.emit({ x: b.x + 8 + api.rnd() * (b.w - 16), y: b.y - 12, vy: speed * (0.8 + api.rnd() * 0.4), r }); } } }; },
  aimed: (o = {}) => { const every = o.every ?? 0.6, speed = o.speed ?? 120, r = o.r ?? 5; let next = 0.4;
    return { duration: o.duration ?? 4, update(t, dt, api) { if (t < next) return; next += every; const b = api.box, side = Math.floor(api.rnd() * 4);
      const sx = side === 0 ? b.x - 10 : side === 1 ? b.x + b.w + 10 : b.x + api.rnd() * b.w, sy = side === 2 ? b.y - 10 : side === 3 ? b.y + b.h + 10 : b.y + api.rnd() * b.h;
      const dx = api.soul.x - sx, dy = api.soul.y - sy, d = Math.hypot(dx, dy) || 1; api.emit({ x: sx, y: sy, vx: dx / d * speed, vy: dy / d * speed, r, kind: 'white' }); } }; },
  sweep: (o = {}) => { const rows = o.rows ?? 3, gap = o.gap ?? 34, speed = o.speed ?? 80, r = o.r ?? 4, every = o.every ?? 1.1; let next = 0.3, n = 0;
    return { duration: o.duration ?? 4.4, update(t, dt, api) { if (t < next) return; next += every; const b = api.box, dir = n++ % 2 ? -1 : 1, hole = Math.floor(api.rnd() * rows);
      for (let i = 0; i < rows; i++) { if (i === hole) continue; const y = b.y + 12 + i * ((b.h - 24) / Math.max(1, rows - 1)); for (let k = 0; k < 3; k++) api.emit({ x: dir > 0 ? b.x - 10 - k * gap : b.x + b.w + 10 + k * gap, y, vx: dir * speed, r }); } } }; },
  bounce: (o = {}) => { let done = false;
    return { duration: o.duration ?? 4.5, update(t, dt, api) { if (done) return; done = true; const b = api.box; for (let i = 0; i < (o.count ?? 2); i++) { const a = api.rnd() * Math.PI * 2, sp = o.speed ?? 100; api.emit({ x: b.x + b.w / 2 + (i ? 30 : -30), y: b.y + 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: o.r ?? 7, bounce: true, kind: 'orange' }); } } }; },
};
