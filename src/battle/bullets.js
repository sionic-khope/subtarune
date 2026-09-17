// ─────────────────────────────────────────────────────────────
// 탄막 상자·소울·패턴 (언더테일/델타룬식). 화면 좌표(480x360).
//   Board: 흰 테두리 검은 상자 — 대사 상자 자리에서 커졌다 줄어든다
//   Soul: 빨간 하트, 방향키로 이동(X 누르면 느리게), 상자 안에 갇힘, 맞으면 무적 0.7초·깜빡임
//   PATTERNS[type](opts) → { duration, update(t, dt, api) }  api = { emit, box, soul, rnd }
//     rain  : 위에서 떨어지는 알갱이   aimed : 가장자리에서 소울을 겨눠 쏨   sweep : 줄지어 옆으로 지나가는 알갱이(사이로 피함)   bounce : 상자 안에서 튕기는 큰 알갱이
//     hammer_arc : 아래에서 던져 올라갔다 떨어지는 회전 망치(블루 CS)   shield_wall : 방패 줄이 한 칸 비우고 밀려온다(레드 CS)   hammer_slam : 소울 위에 점선 예고 뒤 망치가 내리꽂힌다
//     slam(from top|bottom|left|right|sides|updown, warn 예고 뒤 그 줄로) · combo(parts 동시 — 난이도)
//   영역·대형 템플릿(사용자 2026-09-11 "주황 선 + 날아다니는 것 말고도"): zone(칸을 빨갛게 예고 → 덮침, safe 로 '한 칸만 안전') · beam(선 예고 → 굵은 빔) · giant(띠 예고 → 거대 탄 하나)
//     · burst(한 점에서 방사형) · homing(소울을 따라오는 탄) · bomb(착지 고리 예고 → 파편). 카탈로그·피하는 법은 docs/battle/adding-enemies.md §3
//   알갱이 모양(shape): circle(기본) | hammer | shield | vline(예고선, harmless). 모든 패턴은 o.shape / o.kind 로 모양·색을 바꿀 수 있다.
//   설계 지침(델타룬 참고, 사용자 2026-09-11 "상대 캐릭터의 특징을 살린 공격"): 적의 소지품·성격이 탄이 된다(망치·방패), 빠른 탄은 반드시 예고(vline/깜빡임), 한 패턴 = 한 가지 피하는 법, 4~5초, docs/battle/adding-enemies.md
//   새 패턴 = 여기 함수 하나 추가 → src/data/enemies.js 의 patterns 에서 type 으로 쓴다. tests/unit/enemies.test.mjs 가 이름을 검사한다.
// ─────────────────────────────────────────────────────────────
import { BARON_PATTERNS } from './baron-patterns.js';
import { VIEWER_PATTERNS } from './viewer-patterns.js';
import { MANKATSUKI_PATTERNS } from './mankatsuki-patterns.js';
import { CAT_PATTERNS } from './cat-patterns.js';
import { PARK_GUARDIAN_PATTERNS } from './park-guardian-patterns.js';
import { PARK_CLEANING_PATTERNS } from './patterns/park-cleaning.js';
import { YOUNGCLE_PATTERNS } from './youngcle-patterns.js';
import { COIN_PATTERNS } from './coin-patterns.js';

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
  constructor(o) { Object.assign(this, { r: 4, vx: 0, vy: 0, ax: 0, ay: 0, kind: 'white', shape: 'circle', rot: 0, spin: 0, harmless: false, life: 0, len: 0, age: 0, dmg: null, bounce: false, zone: false, w: 0, h: 0, warn: 0, steer: null }); for (const k in o) if (o[k] !== undefined) this[k] = o[k]; }   // undefined 옵션(shape: o.shape 등)이 기본값을 지우지 않게   // zone: 사각 영역(x,y 좌상단, w,h) — warn 동안 예고, 그 뒤 life 까지 덮침 / steer(b, dt): 매 틱 방향을 꺾는 콜백(homing)
  update(dt, board) {
    this.age += dt; if (this.steer) this.steer(this, dt); this.rot += this.spin * dt; this.vx += this.ax * dt; this.vy += this.ay * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.bounce) {
      if (this.x - this.r < board.x + 3 && this.vx < 0) { this.x = board.x + 3 + this.r; this.vx = -this.vx; }
      if (this.x + this.r > board.x + board.w - 3 && this.vx > 0) { this.x = board.x + board.w - 3 - this.r; this.vx = -this.vx; }
      if (this.y - this.r < board.y + 3 && this.vy < 0) { this.y = board.y + 3 + this.r; this.vy = -this.vy; }
      if (this.y + this.r > board.y + board.h - 3 && this.vy > 0) { this.y = board.y + board.h - 3 - this.r; this.vy = -this.vy; }
    }
  }
  out(board) { if (this.life && this.age >= this.life) return true; const m = 40; return this.x < board.x - m || this.x > board.x + board.w + m || this.y < board.y - m || this.y > board.y + board.h + m; }
  hits(soul) {
    if (this.harmless) return false;
    if (this.hitShape) return this.hitShape(this, soul);
    if (this.zone) {                                                                // 영역: 예고(warn) 동안은 안 맞고, 그 뒤 사각형 안(소울 원과 겹침)이면 맞는다
      if (this.age < this.warn) return false;
      const cx = Math.max(this.x, Math.min(soul.x, this.x + this.w)), cy = Math.max(this.y, Math.min(soul.y, this.y + this.h)); const dx = soul.x - cx, dy = soul.y - cy, rr = Math.max(0, soul.r - 2); return dx * dx + dy * dy <= rr * rr;
    }
    const dx = this.x - soul.x, dy = this.y - soul.y; const rr = this.r + soul.r - 2; return dx * dx + dy * dy <= rr * rr;
  }
  color() { return this.kind === 'blue' ? '#3b8cff' : this.kind === 'orange' ? '#ff9a3b' : this.kind === 'red' ? '#d13b3b' : '#fff'; }
  draw(ctx) {
    if (this.drawShape) { this.drawShape(ctx, this); return; }
    const x = Math.round(this.x), y = Math.round(this.y);
    if (this.zone) {                                                                 // 경고 영역(zone/beam/giant 띠): warn 동안 빨간 반투명 + 깜빡이는 테두리(beam 은 가운데 점선) → 그 뒤 hit 동안 밝게 덮친다
      const zx = x, zy = y, zw = Math.round(this.w), zh = Math.round(this.h);
      if (this.age < this.warn || this.harmless) { const k = Math.min(1, this.age / Math.max(0.01, this.warn)); ctx.fillStyle = `rgba(255,50,50,${0.16 + 0.24 * k})`; ctx.fillRect(zx, zy, zw, zh);
        if (Math.floor(this.age * 10) % 2 === 0) { ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 2; ctx.strokeRect(zx + 1, zy + 1, zw - 2, zh - 2); }
        if (this.shape === 'beam') { ctx.fillStyle = '#ff9a9a'; if (zw > zh) for (let k2 = 0; k2 < zw; k2 += 8) ctx.fillRect(zx + k2, zy + Math.round(zh / 2) - 1, 4, 2); else for (let k2 = 0; k2 < zh; k2 += 8) ctx.fillRect(zx + Math.round(zw / 2) - 1, zy + k2, 2, 4); }
        return; }
      ctx.fillStyle = this.kind === 'blue' ? 'rgba(90,160,255,0.85)' : this.kind === 'orange' ? 'rgba(255,170,60,0.9)' : 'rgba(255,120,90,0.9)'; ctx.fillRect(zx, zy, zw, zh);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(zx + 1, zy + 1, zw - 2, zh - 2); return;
    }
    if (this.shape === 'mark') {                                                     // 착지 예고 고리(harmless): 빨간 원 + 십자, 깜빡임 — bomb
      if (Math.floor(this.age * 10) % 2) return; ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, this.r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ff4d4d'; ctx.fillRect(x - 5, y - 1, 10, 2); ctx.fillRect(x - 1, y - 5, 2, 10); return;
    }
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
    if (this.shape === 'rock') {                                                    // 바위: 회색 각진 덩어리(회전) + 밝은 면 — 돌거북
      ctx.save(); ctx.translate(x, y); ctx.rotate(this.rot); const r = this.r;
      ctx.fillStyle = '#2b2f36'; ctx.beginPath(); ctx.moveTo(-r, -r * 0.4); ctx.lineTo(-r * 0.4, -r); ctx.lineTo(r * 0.6, -r * 0.9); ctx.lineTo(r, 0); ctx.lineTo(r * 0.5, r); ctx.lineTo(-r * 0.6, r * 0.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7d8592'; ctx.beginPath(); ctx.moveTo(-r + 2, -r * 0.4 + 1); ctx.lineTo(-r * 0.4 + 1, -r + 2); ctx.lineTo(r * 0.6 - 1, -r * 0.9 + 2); ctx.lineTo(r - 2, 0); ctx.lineTo(r * 0.5 - 1, r - 2); ctx.lineTo(-r * 0.6 + 1, r * 0.8 - 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b3bac6'; ctx.fillRect(-r * 0.4, -r * 0.6, r * 0.7, 2); ctx.restore(); return;
    }
    if (this.shape === 'pincer') {                                                  // 집게: 벌어진 청록 집게 두 갈래(진행 방향) — 바위게
      ctx.save(); ctx.translate(x, y); ctx.rotate(this.rot + Math.atan2(this.vy, this.vx || 1e-6));
      ctx.fillStyle = '#12332c'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(2, -7); ctx.lineTo(10, -3); ctx.lineTo(3, -1); ctx.lineTo(3, 1); ctx.lineTo(10, 3); ctx.lineTo(2, 7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4fae95'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(2, -5); ctx.lineTo(7, -3); ctx.lineTo(2, -1); ctx.lineTo(2, 1); ctx.lineTo(7, 3); ctx.lineTo(2, 5); ctx.closePath(); ctx.fill(); ctx.restore(); return;
    }
    if (this.shape === 'cannonball') {                                              // 포탄: 크고 검은 공 + 하이라이트 + 불붙은 심지 — 대포미니언
      ctx.fillStyle = '#0d1014'; ctx.beginPath(); ctx.arc(x, y, this.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a4048'; ctx.beginPath(); ctx.arc(x, y, this.r - 2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#9aa3ad'; ctx.fillRect(x - this.r / 2, y - this.r / 2, 3, 3);
      ctx.fillStyle = Math.floor(this.age * 16) % 2 ? '#ffb347' : '#ff5c2b'; ctx.fillRect(x + this.r - 3, y - this.r - 1, 3, 3); return;
    }
    if (this.shape === 'fang') {                                                    // 송곳니 도약: 흰 삼각 둘
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(this.vy, this.vx || 1e-6)); ctx.fillStyle = '#f4f6f8';
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-2, 0); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.restore(); return;
    }
    ctx.fillStyle = this.color(); ctx.beginPath(); ctx.arc(x, y, this.r, 0, Math.PI * 2); ctx.fill();
    if (this.r >= 20) { ctx.strokeStyle = '#20232a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, this.r - 1.5, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(Math.round(x - this.r * 0.45), Math.round(y - this.r * 0.55), Math.round(this.r * 0.35), Math.round(this.r * 0.2)); }   // 거대 탄(giant): 외곽선 + 하이라이트
  }
}

/** 패턴 라이브러리. 각 패턴은 { duration, update(t, dt, api) } 를 돌려준다. */
export const PATTERNS = {
  ...BARON_PATTERNS,
  ...VIEWER_PATTERNS,
  ...MANKATSUKI_PATTERNS,
  ...CAT_PATTERNS,
  ...PARK_GUARDIAN_PATTERNS,
  ...PARK_CLEANING_PATTERNS,
  ...YOUNGCLE_PATTERNS,
  ...COIN_PATTERNS,   // 변신 영클 코인벌기(BUILD214)
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
  // 여러 패턴을 한 턴에 동시에(난이도 올리기): { type:'combo', parts:[{type,...},{type,...}] } — 각 부분은 자기 duration 까지, 전체는 가장 긴 것
  combo: (o = {}) => { const parts = (o.parts || []).map((c) => PATTERNS[c.type](c)); return { duration: o.duration ?? Math.max(1, ...parts.map((p) => p.duration)), update(t, dt, api) { for (const p of parts) if (t < p.duration) p.update(t, dt, api); } }; },
  // 범용 '예고 뒤 덮침': from top|bottom 은 소울의 x 열에 세로 예고선, left|right 는 소울의 y 행에 가로 예고선 → warn 초 뒤 그 줄로 빠르게. 늑대 도약(fang)·두꺼비 혀(tongue)·망치(hammer)
  slam: (o = {}) => { const every = o.every ?? 1.1, warn = o.warn ?? 0.55, speed = o.speed ?? 250, from0 = o.from || 'top'; let next = 0.5, n = 0; const queue = [];
    return { duration: o.duration ?? 4.4, update(t, dt, api) { const b = api.box; const from = from0 === 'sides' ? (n % 2 ? 'right' : 'left') : from0 === 'updown' ? (n % 2 ? 'bottom' : 'top') : from0;   // sides/updown = 번갈아
      if (t >= next) { next += every; n++; const x = Math.round(api.soul.x), y = Math.round(api.soul.y);
        if (from === 'top' || from === 'bottom') api.emit({ x, y: b.y + 4, shape: 'vline', len: b.h - 8, harmless: true, life: warn, r: 1 });
        else api.emit({ x: b.x + 4, y, shape: 'hline', len: b.w - 8, harmless: true, life: warn, r: 1 });
        queue.push({ at: t + warn, x, y, from }); }
      while (queue.length && t >= queue[0].at) { const q = queue.shift(); const from = q.from; const base = { r: o.r ?? 7, shape: o.shape || 'hammer', rot: o.rot || 0, spin: o.spin || 0, kind: o.kind || 'blue' };
        if (from === 'top') api.emit({ ...base, x: q.x, y: b.y - 6, vy: speed }); else if (from === 'bottom') api.emit({ ...base, x: q.x, y: b.y + b.h + 6, vy: -speed });
        else if (from === 'left') api.emit({ ...base, x: b.x - 6, y: q.y, vx: speed }); else api.emit({ ...base, x: b.x + b.w + 6, y: q.y, vx: -speed }); } } }; },
  // ── 영역·대형 템플릿 (사용자 2026-09-11: "큰 거 하나가 영역을 크게 덮는다거나, 경고 영역을 빨갛게 칠해서 빈 곳으로 이동한 뒤 그 영역에 딜") ──
  // zone: 상자를 cols×rows 칸으로 나눠 wave 마다 count 칸(또는 safe 칸만 빼고 전부)을 warn 동안 빨갛게 → hit 동안 덮친다. 피하는 법 = 빨간 칸 밖(safe 면 '한 칸만 안전')
  zone: (o = {}) => { const cols = o.cols ?? 3, rows = o.rows ?? 2, every = o.every ?? 1.6, warn = o.warn ?? 0.9, hit = o.hit ?? 0.3, dur = o.duration ?? 4.8; let next = 0.3;
    return { duration: dur, update(t, dt, api) { if (t < next || t + warn > dur + 0.4) return; next += every; const b = api.box, cw = b.w / cols, ch = b.h / rows, all = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) all.push([c, r]);
      for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(api.rnd() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
      const danger = o.safe !== undefined ? all.slice(0, Math.max(0, all.length - o.safe)) : all.slice(0, o.count ?? 2);
      for (const [c, r] of danger) api.emit({ zone: true, shape: 'zone', x: b.x + c * cw + 2, y: b.y + r * ch + 2, w: cw - 4, h: ch - 4, warn, life: warn + hit, r: 0, kind: o.kind || 'red' }); } }; },
  // beam: 가로(h)/세로(v) 빔 count 줄 — 가는 예고선 warn 뒤 두께 thick 의 빔이 hit 동안. dir 'alt' 는 가로·세로 번갈아, 'both' 는 십자. 피하는 법 = 빔 사이·옆으로
  beam: (o = {}) => { const every = o.every ?? 1.4, warn = o.warn ?? 0.7, hit = o.hit ?? 0.25, thick = o.thick ?? 26, count = o.count ?? 2, dur = o.duration ?? 4.8; let next = 0.3, n = 0;
    return { duration: dur, update(t, dt, api) { if (t < next || t + warn > dur + 0.4) return; next += every; const b = api.box, mode = o.dir || 'alt', dirs = mode === 'both' ? ['h', 'v'] : [mode === 'alt' ? (n++ % 2 ? 'v' : 'h') : mode];
      for (const d of dirs) for (let i = 0; i < count; i++) {
        if (d === 'h') { const y = b.y + 6 + api.rnd() * Math.max(1, b.h - 12 - thick); api.emit({ zone: true, shape: 'beam', x: b.x + 2, y, w: b.w - 4, h: thick, warn, life: warn + hit, r: 0, kind: o.kind || 'red' }); }
        else { const x = b.x + 6 + api.rnd() * Math.max(1, b.w - 12 - thick); api.emit({ zone: true, shape: 'beam', x, y: b.y + 2, w: thick, h: b.h - 4, warn, life: warn + hit, r: 0, kind: o.kind || 'red' }); } } } }; },
  // giant: 거대한 탄 하나(r 30+)가 한쪽(from left|right|top|bottom|sides|updown|any)에서 굴러와 넓게 덮는다 — 지나갈 띠를 warn 동안 빨갛게 예고. 피하는 법 = 띠 밖으로
  giant: (o = {}) => { const every = o.every ?? 2.2, warn = o.warn ?? 0.8, speed = o.speed ?? 140, R = o.r ?? 34, from0 = o.from || 'sides', dur = o.duration ?? 5.0; let next = 0.4, n = 0; const queue = [];
    return { duration: dur, update(t, dt, api) { const b = api.box;
      if (t >= next && t + warn < dur + 0.4) { next += every; const from = from0 === 'sides' ? (n % 2 ? 'right' : 'left') : from0 === 'updown' ? (n % 2 ? 'bottom' : 'top') : from0 === 'any' ? ['left', 'right', 'top', 'bottom'][Math.floor(api.rnd() * 4)] : from0; n++;
        const horiz = from === 'left' || from === 'right'; const c = horiz ? b.y + R + api.rnd() * Math.max(1, b.h - 2 * R) : b.x + R + api.rnd() * Math.max(1, b.w - 2 * R);
        if (horiz) api.emit({ zone: true, shape: 'zone', harmless: true, x: b.x + 2, y: c - R, w: b.w - 4, h: 2 * R, warn, life: warn, r: 0 }); else api.emit({ zone: true, shape: 'zone', harmless: true, x: c - R, y: b.y + 2, w: 2 * R, h: b.h - 4, warn, life: warn, r: 0 });
        queue.push({ at: t + warn, from, c }); }
      while (queue.length && t >= queue[0].at) { const q = queue.shift(); const base = { r: R, shape: o.shape || 'circle', kind: o.kind || 'white', spin: o.spin || 0 };
        if (q.from === 'left') api.emit({ ...base, x: b.x - R - 2, y: q.c, vx: speed }); else if (q.from === 'right') api.emit({ ...base, x: b.x + b.w + R + 2, y: q.c, vx: -speed });
        else if (q.from === 'top') api.emit({ ...base, x: q.c, y: b.y - R - 2, vy: speed }); else api.emit({ ...base, x: q.c, y: b.y + b.h + R + 2, vy: -speed }); } } }; },
  // burst: 한 점(at center|top|random)에서 n 개가 방사형으로 퍼진다(wave 마다 각도가 어긋난다). 피하는 법 = 탄 사이 틈으로
  burst: (o = {}) => { const every = o.every ?? 1.0, n = o.n ?? 12, speed = o.speed ?? 110, dur = o.duration ?? 4.6; let next = 0.3, k = 0;
    return { duration: dur, update(t, dt, api) { if (t < next) return; next += every; const b = api.box, at = o.at || 'center';
      const cx = at === 'random' ? b.x + 20 + api.rnd() * (b.w - 40) : b.x + b.w / 2, cy = at === 'top' ? b.y + 10 : at === 'random' ? b.y + 20 + api.rnd() * (b.h - 40) : b.y + b.h / 2;
      const off = (k++ % 2) * Math.PI / n; for (let i = 0; i < n; i++) { const a = off + i * Math.PI * 2 / n; api.emit({ x: cx, y: cy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: o.r ?? 4, shape: o.shape, kind: o.kind || 'orange', spin: o.spin }); } } }; },
  // homing: 소울을 따라오는 탄 count 개 — turn(rad/s)만큼만 꺾이고 life 뒤 사라진다(끝 0.3s 는 무해). 피하는 법 = 계속 움직여 따돌리기
  homing: (o = {}) => { const every = o.every ?? 1.6, count = o.count ?? 2, speed = o.speed ?? 90, turn = o.turn ?? 2.2, life = o.life ?? 2.6, dur = o.duration ?? 4.8; let next = 0.4;
    return { duration: dur, update(t, dt, api) { if (t < next || t + 0.5 > dur) return; next += every; const b = api.box;
      for (let i = 0; i < count; i++) { const side = (i + Math.floor(t)) % 2, sx = side ? b.x + b.w + 10 : b.x - 10, sy = b.y + 20 + api.rnd() * (b.h - 40); const dx = api.soul.x - sx, dy = api.soul.y - sy, d = Math.hypot(dx, dy) || 1;
        api.emit({ x: sx, y: sy, vx: dx / d * speed, vy: dy / d * speed, r: o.r ?? 5, shape: o.shape, kind: o.kind || 'blue', spin: o.spin, life,
          steer: (bl, dt2) => { const ang = Math.atan2(bl.vy, bl.vx), want = Math.atan2(api.soul.y - bl.y, api.soul.x - bl.x); let da = want - ang; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
            const na = ang + Math.max(-turn * dt2, Math.min(turn * dt2, da)); bl.vx = Math.cos(na) * speed; bl.vy = Math.sin(na) * speed; if (bl.age > life - 0.3) bl.harmless = true; } }); } } }; },
  // bomb: 포탄이 상자 안 한 점에 떨어진다(착지점 빨간 고리 예고, 떨어지는 동안은 무해) → 착지하면 frags 개 파편이 방사형으로. 피하는 법 = 고리에서 멀리
  bomb: (o = {}) => { const every = o.every ?? 1.4, warn = o.warn ?? 0.7, frags = o.frags ?? 8, fs = o.fragSpeed ?? 120, dur = o.duration ?? 5.0; let next = 0.3; const queue = [];
    return { duration: dur, update(t, dt, api) { const b = api.box;
      if (t >= next && t + warn < dur + 0.4) { next += every; const x = b.x + 24 + api.rnd() * (b.w - 48), y = b.y + 24 + api.rnd() * (b.h - 48);
        api.emit({ x, y, shape: 'mark', harmless: true, life: warn, r: o.markR ?? 22 });
        api.emit({ x, y: b.y - 40, vy: (y - b.y + 40) / warn, r: o.r ?? 9, shape: o.shape || 'cannonball', kind: o.kind || 'white', harmless: true, life: warn });
        queue.push({ at: t + warn, x, y }); }
      while (queue.length && t >= queue[0].at) { const q = queue.shift(); for (let i = 0; i < frags; i++) { const a = i * Math.PI * 2 / frags; api.emit({ x: q.x, y: q.y, vx: Math.cos(a) * fs, vy: Math.sin(a) * fs, r: o.fragR ?? 4, shape: o.fragShape || 'circle', kind: o.fragKind || 'orange' }); } } } }; },
};
