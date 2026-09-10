// ─────────────────────────────────────────────────────────────
// 탄막 상자·소울·패턴 (언더테일/델타룬식). 화면 좌표(480x360).
//   Board: 흰 테두리 검은 상자 — 대사 상자 자리에서 커졌다 줄어든다
//   Soul: 빨간 하트, 방향키로 이동(X 누르면 느리게), 상자 안에 갇힘, 맞으면 무적 0.7초·깜빡임
//   PATTERNS[type](opts) → { duration, update(t, dt, api) }  api = { emit, box, soul, rnd }
//     rain  : 위에서 떨어지는 알갱이   aimed : 가장자리에서 소울을 겨눠 쏨   sweep : 줄지어 옆으로 지나가는 알갱이(사이로 피함)   bounce : 상자 안에서 튕기는 큰 알갱이
//     hammer_arc : 아래에서 던져 올라갔다 떨어지는 회전 망치(블루 CS)   shield_wall : 방패 줄이 한 칸 비우고 밀려온다(레드 CS)   hammer_slam : 소울 위에 점선 예고 뒤 망치가 내리꽂힌다
//   알갱이 모양(shape): circle(기본) | hammer | shield | vline(예고선, harmless). 모든 패턴은 o.shape / o.kind 로 모양·색을 바꿀 수 있다.
//   설계 지침(델타룬 참고, 사용자 2026-09-11 "상대 캐릭터의 특징을 살린 공격"): 적의 소지품·성격이 탄이 된다(망치·방패), 빠른 탄은 반드시 예고(vline/깜빡임), 한 패턴 = 한 가지 피하는 법, 4~5초, docs/battle/adding-enemies.md
//   새 패턴 = 여기 함수 하나 추가 → src/data/enemies.js 의 patterns 에서 type 으로 쓴다. tests/unit/enemies.test.mjs 가 이름을 검사한다.
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
  constructor() { this.x = 240; this.y = 225; this.r = 6; this.speed = 110; this.invuln = 0; this.hits = 0; }   // 델타룬 소울 크기(약 16px@640 → 12px@480)
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
    // 델타룬식 하트 14x12
    const rows = ['..XXX...XXX..', '.XXXXX.XXXXX.', 'XXXXXXXXXXXXX', 'XXXXXXXXXXXXX', 'XXXXXXXXXXXXX', '.XXXXXXXXXXX.', '..XXXXXXXXX..', '...XXXXXXX...', '....XXXXX....', '.....XXX.....', '......X......'];
    rows.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) if (row[rx] === 'X') ctx.fillRect(x - 6 + rx, y - 5 + ry, 1, 1); });
  }

}

/** 알갱이: shape(circle/hammer/shield/vline) · kind(색) · spin(rad/s 회전) · harmless(안 맞음, 예고용) · life(초, 지나면 사라짐) */
export class Bullet {
  constructor(o) { Object.assign(this, { r: 4, vx: 0, vy: 0, ax: 0, ay: 0, kind: 'white', shape: 'circle', rot: 0, spin: 0, harmless: false, life: 0, len: 0, age: 0, dmg: null, bounce: false }, o); }
  update(dt, board) {
    this.age += dt; this.rot += this.spin * dt; this.vx += this.ax * dt; this.vy += this.ay * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.bounce) {
      if (this.x - this.r < board.x + 3 && this.vx < 0) { this.x = board.x + 3 + this.r; this.vx = -this.vx; }
      if (this.x + this.r > board.x + board.w - 3 && this.vx > 0) { this.x = board.x + board.w - 3 - this.r; this.vx = -this.vx; }
      if (this.y - this.r < board.y + 3 && this.vy < 0) { this.y = board.y + 3 + this.r; this.vy = -this.vy; }
      if (this.y + this.r > board.y + board.h - 3 && this.vy > 0) { this.y = board.y + board.h - 3 - this.r; this.vy = -this.vy; }
    }
  }
  out(board) { if (this.life && this.age >= this.life) return true; const m = 40; return this.x < board.x - m || this.x > board.x + board.w + m || this.y < board.y - m || this.y > board.y + board.h + m; }
  hits(soul) { if (this.harmless) return false; const dx = this.x - soul.x, dy = this.y - soul.y; const rr = this.r + soul.r - 2; return dx * dx + dy * dy <= rr * rr; }
  color() { return this.kind === 'blue' ? '#3b8cff' : this.kind === 'orange' ? '#ff9a3b' : this.kind === 'red' ? '#d13b3b' : '#fff'; }
  draw(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y);
    if (this.shape === 'vline' || this.shape === 'hline') {                        // 예고 점선(깜빡임) — 곧 이 줄로 온다
      if (Math.floor(this.age * 12) % 2) return; ctx.fillStyle = '#ffb347';
      if (this.shape === 'vline') for (let k = 0; k < this.len; k += 6) ctx.fillRect(x - 1, y + k, 2, 3); else for (let k = 0; k < this.len; k += 6) ctx.fillRect(x + k, y - 1, 3, 2); return;
    }
    if (this.shape === 'hammer') {                                                  // 망치: 회전하는 쇠머리 + 나무 자루
      ctx.save(); ctx.translate(x, y); ctx.rotate(this.rot);
      ctx.fillStyle = '#3a3f47'; ctx.fillRect(-9, -9, 18, 11); ctx.fillStyle = '#bfc4cc'; ctx.fillRect(-8, -8, 16, 9); ctx.fillStyle = '#e9ecf0'; ctx.fillRect(-8, -8, 16, 2);
      ctx.fillStyle = '#3a3f47'; ctx.fillRect(-3, 1, 6, 14); ctx.fillStyle = '#8a5a3c'; ctx.fillRect(-2, 2, 4, 12); ctx.restore(); return;
    }
    if (this.shape === 'shield') {                                                  // 방패: 색 판 + 밝은 테두리 + 문장
      ctx.save(); ctx.translate(x, y); ctx.rotate(this.rot);
      ctx.fillStyle = '#20232a'; ctx.fillRect(-8, -9, 16, 18); ctx.fillStyle = '#e8e8e8'; ctx.fillRect(-7, -8, 14, 16); ctx.fillStyle = this.color(); ctx.fillRect(-5, -6, 10, 12);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-1, -3, 2, 6); ctx.fillRect(-3, -1, 6, 2); ctx.restore(); return;
    }
    if (this.shape === 'feather') {                                                 // 깃털 칼날: 가늘고 긴 마름모(회전)
      ctx.save(); ctx.translate(x, y); ctx.rotate(this.rot + Math.atan2(this.vy, this.vx || 1e-6));
      ctx.fillStyle = '#20232a'; ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(0, -4); ctx.lineTo(11, 0); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8eef5'; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(0, -2.5); ctx.lineTo(9, 0); ctx.lineTo(0, 2.5); ctx.closePath(); ctx.fill(); ctx.restore(); return;
    }
    if (this.shape === 'claw') {                                                    // 발톱: 비스듬한 선 세 줄
      ctx.save(); ctx.translate(x, y); ctx.rotate(this.rot); ctx.fillStyle = '#e8eef5';
      for (let k = -1; k <= 1; k++) for (let i = 0; i < 6; i++) ctx.fillRect(-6 + i * 2, k * 5 - 3 + i, 2, 2); ctx.restore(); return;
    }
    if (this.shape === 'bubble') {                                                  // 방울: 파란 원 + 하이라이트 링
      ctx.fillStyle = '#3b8cff'; ctx.beginPath(); ctx.arc(x, y, this.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#bfe0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, this.r - 2, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(x - this.r / 2, y - this.r / 2, 2, 2); return;
    }
    if (this.shape === 'tongue') {                                                  // 혀: 세로 분홍 막대(위 끝 둥글게)
      ctx.fillStyle = '#7a1b3a'; ctx.fillRect(x - 6, y - 12, 12, 40); ctx.fillStyle = '#e0557f'; ctx.fillRect(x - 5, y - 11, 10, 38); ctx.beginPath(); ctx.arc(x, y - 11, 5, 0, Math.PI * 2); ctx.fill(); return;
    }
    if (this.shape === 'fang') {                                                    // 송곳니 도약: 흰 삼각 둘
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(this.vy, this.vx || 1e-6)); ctx.fillStyle = '#f4f6f8';
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-2, 0); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.restore(); return;
    }
    ctx.fillStyle = this.color(); ctx.beginPath(); ctx.arc(x, y, this.r, 0, Math.PI * 2); ctx.fill();
  }
}

/** 패턴 라이브러리. 각 패턴은 { duration, update(t, dt, api) } 를 돌려준다. */
export const PATTERNS = {
  rain: (o = {}) => { const rate = o.rate ?? 0.18, speed = o.speed ?? 90, r = o.r ?? 4; let acc = 0;
    return { duration: o.duration ?? 4, update(t, dt, api) { acc += dt; while (acc >= rate) { acc -= rate; const b = api.box; api.emit({ x: b.x + 8 + api.rnd() * (b.w - 16), y: b.y - 12, vy: speed * (0.8 + api.rnd() * 0.4), r, shape: o.shape, kind: o.kind, spin: o.spin }); } } }; },
  aimed: (o = {}) => { const every = o.every ?? 0.6, speed = o.speed ?? 120, r = o.r ?? 5; let next = 0.4;
    return { duration: o.duration ?? 4, update(t, dt, api) { if (t < next) return; next += every; const b = api.box, side = Math.floor(api.rnd() * 4);
      const sx = side === 0 ? b.x - 10 : side === 1 ? b.x + b.w + 10 : b.x + api.rnd() * b.w, sy = side === 2 ? b.y - 10 : side === 3 ? b.y + b.h + 10 : b.y + api.rnd() * b.h;
      const dx = api.soul.x - sx, dy = api.soul.y - sy, d = Math.hypot(dx, dy) || 1; api.emit({ x: sx, y: sy, vx: dx / d * speed, vy: dy / d * speed, r, kind: o.kind || 'white', shape: o.shape, spin: o.spin }); } }; },
  sweep: (o = {}) => { const rows = o.rows ?? 3, gap = o.gap ?? 34, speed = o.speed ?? 80, r = o.r ?? 4, every = o.every ?? 1.1; let next = 0.3, n = 0;
    return { duration: o.duration ?? 4.4, update(t, dt, api) { if (t < next) return; next += every; const b = api.box, dir = n++ % 2 ? -1 : 1, hole = Math.floor(api.rnd() * rows);
      for (let i = 0; i < rows; i++) { if (i === hole) continue; const y = b.y + 12 + i * ((b.h - 24) / Math.max(1, rows - 1)); for (let k = 0; k < 3; k++) api.emit({ x: dir > 0 ? b.x - 10 - k * gap : b.x + b.w + 10 + k * gap, y, vx: dir * speed, r, shape: o.shape, kind: o.kind, spin: o.spin }); } } }; },
  bounce: (o = {}) => { let done = false;
    return { duration: o.duration ?? 4.5, update(t, dt, api) { if (done) return; done = true; const b = api.box; for (let i = 0; i < (o.count ?? 2); i++) { const a = api.rnd() * Math.PI * 2, sp = o.speed ?? 100; api.emit({ x: b.x + b.w / 2 + (i ? 30 : -30), y: b.y + 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: o.r ?? 7, bounce: true, kind: o.kind || 'orange', shape: o.shape, spin: o.spin }); } } }; },
  // ── CS(기사) 전용: 망치·방패 — 적의 소지품이 탄이 된다 ──
  hammer_arc: (o = {}) => { const every = o.every ?? 0.7, speed = o.speed ?? 150; let next = 0.3, n = 0;
    return { duration: o.duration ?? 4.4, update(t, dt, api) { if (t < next) return; next += every; const b = api.box, dir = n++ % 2 ? -1 : 1;
      const sx = dir > 0 ? b.x - 14 : b.x + b.w + 14, sy = b.y + b.h - 12 - api.rnd() * (b.h * 0.45);   // 아래쪽에서 던져 포물선으로 올라갔다 떨어진다
      api.emit({ x: sx, y: sy, vx: dir * speed * (0.8 + api.rnd() * 0.3), vy: -(150 + api.rnd() * 90), ay: 380, r: 7, shape: 'hammer', spin: dir * 9, kind: o.kind || 'blue' }); } }; },
  shield_wall: (o = {}) => { const rows = o.rows ?? 3, speed = o.speed ?? 70, every = o.every ?? 1.3; let next = 0.4, n = 0;
    return { duration: o.duration ?? 4.6, update(t, dt, api) { if (t < next) return; next += every; const b = api.box, dir = n++ % 2 ? -1 : 1, hole = Math.floor(api.rnd() * rows);
      for (let i = 0; i < rows; i++) { if (i === hole) continue; const y = b.y + 14 + i * ((b.h - 28) / Math.max(1, rows - 1)); api.emit({ x: dir > 0 ? b.x - 12 : b.x + b.w + 12, y, vx: dir * speed, r: 7, shape: 'shield', kind: o.kind || 'red' }); } } }; },
  hammer_slam: (o = {}) => PATTERNS.slam({ from: 'top', shape: 'hammer', rot: Math.PI, ...o }),
  // 범용 '예고 뒤 덮침': from top|bottom 은 소울의 x 열에 세로 예고선, left|right 는 소울의 y 행에 가로 예고선 → warn 초 뒤 그 줄로 빠르게. 늑대 도약(fang)·두꺼비 혀(tongue)·망치(hammer)
  slam: (o = {}) => { const every = o.every ?? 1.1, warn = o.warn ?? 0.55, speed = o.speed ?? 250, from = o.from || 'top'; let next = 0.5; const queue = [];
    return { duration: o.duration ?? 4.4, update(t, dt, api) { const b = api.box;
      if (t >= next) { next += every; const x = Math.round(api.soul.x), y = Math.round(api.soul.y);
        if (from === 'top' || from === 'bottom') api.emit({ x, y: b.y + 4, shape: 'vline', len: b.h - 8, harmless: true, life: warn, r: 1 });
        else api.emit({ x: b.x + 4, y, shape: 'hline', len: b.w - 8, harmless: true, life: warn, r: 1 });
        queue.push({ at: t + warn, x, y }); }
      while (queue.length && t >= queue[0].at) { const q = queue.shift(); const base = { r: o.r ?? 7, shape: o.shape || 'hammer', rot: o.rot || 0, spin: o.spin || 0, kind: o.kind || 'blue' };
        if (from === 'top') api.emit({ ...base, x: q.x, y: b.y - 6, vy: speed }); else if (from === 'bottom') api.emit({ ...base, x: q.x, y: b.y + b.h + 6, vy: -speed });
        else if (from === 'left') api.emit({ ...base, x: b.x - 6, y: q.y, vx: speed }); else api.emit({ ...base, x: b.x + b.w + 6, y: q.y, vx: -speed }); } } }; },
};
