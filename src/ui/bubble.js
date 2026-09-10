// ─────────────────────────────────────────────────────────────
// 머리 위 말풍선 "..." 연출 (재사용). 언더테일식: 흰 바탕·검은 1px 테두리·아래 꼬리, 점이 하나씩 짧은 간격으로 찍힌다.
//   컷신 노드: { bubble:'player'|id, dots?:3, gap?:0.4, hold?:0.6 }  → 점이 다 찍히고 hold 만큼 머문 뒤 사라지며 다음 노드로
//   game.bubble = new DotBubble();  main.js 가 update/draw 한다 (월드 좌표, 캐릭터 머리 위, 카메라 따라감).
// 비율: 풍선 34×18(점 3개 기준, 점 6px·간격 4px), 꼬리 6px. 점은 풍선 정중앙 줄에 가운데 정렬.
// ─────────────────────────────────────────────────────────────
export class DotBubble {
  constructor() { this.target = null; this.dots = 3; this.shown = 0; this.gap = 0.4; this.hold = 0.6; this.timer = 0; this.done = true; this.fadeT = 0; }
  /** 시작. 끝나면 done=true (waiter 가 본다) */
  start(target, { dots = 3, gap = 0.4, hold = 0.6 } = {}) {
    this.target = target; this.dots = dots; this.gap = gap; this.hold = hold;
    this.shown = 0; this.timer = 0.12; this.done = false; this.fadeT = 0; this.phase = 'dots';
  }
  update(dt) {
    if (this.done || !this.target) return;
    this.timer -= dt;
    if (this.phase === 'dots') {
      if (this.timer <= 0) { this.shown++; this.timer = this.gap; if (this.shown >= this.dots) { this.phase = 'hold'; this.timer = this.hold; } }
    } else if (this.phase === 'hold') {
      if (this.timer <= 0) { this.phase = 'out'; this.fadeT = 0.12; }
    } else { this.fadeT -= dt; if (this.fadeT <= 0) { this.done = true; this.target = null; } }
  }
  draw(ctx, cam) {
    if (this.done || !this.target) return;
    const t = this.target;
    const DOT = 6, GAP = 4, PAD = 8, H = 18, TAIL = 6, R = 4;
    const w = PAD * 2 + this.dots * DOT + (this.dots - 1) * GAP;
    // 스프라이트 머리 위: 히트박스 중심 x, 스프라이트 상단(발 기준 높이) 위 6px
    const spriteH = t.sprite ? Math.round(t.sprite.fh / t.sprite.px * 1.43) : 48;
    const cx = Math.round(t.x + t.w / 2 - cam.x), top = Math.round(t.y + t.h - spriteH - cam.y) - TAIL - H - 4;
    const x = cx - Math.round(w / 2), y = top;
    ctx.save();
    if (this.phase === 'out') ctx.globalAlpha = Math.max(0, this.fadeT / 0.12);
    // 풍선 본체 (둥근 모서리 R, 검은 테두리 1px + 흰 채움)
    const rr = (px, py, pw, ph, r) => { ctx.beginPath(); ctx.moveTo(px + r, py); ctx.lineTo(px + pw - r, py); ctx.quadraticCurveTo(px + pw, py, px + pw, py + r); ctx.lineTo(px + pw, py + ph - r); ctx.quadraticCurveTo(px + pw, py + ph, px + pw - r, py + ph); ctx.lineTo(px + r, py + ph); ctx.quadraticCurveTo(px, py + ph, px, py + ph - r); ctx.lineTo(px, py + r); ctx.quadraticCurveTo(px, py, px + r, py); ctx.closePath(); };
    ctx.fillStyle = '#000'; rr(x - 1, y - 1, w + 2, H + 2, R + 1); ctx.fill();
    ctx.fillStyle = '#fff'; rr(x, y, w, H, R); ctx.fill();
    // 꼬리 (가운데 아래, 검은 테두리 → 흰 삼각)
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(cx - 5, y + H - 1); ctx.lineTo(cx + 5, y + H - 1); ctx.lineTo(cx, y + H + TAIL + 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx - 3, y + H - 2); ctx.lineTo(cx + 3, y + H - 2); ctx.lineTo(cx, y + H + TAIL - 1); ctx.closePath(); ctx.fill();
    // 점: 정중앙 줄, 가운데 정렬, 하나씩
    ctx.fillStyle = '#000';
    const dy = y + Math.round((H - DOT) / 2);
    for (let i = 0; i < this.shown; i++) ctx.fillRect(x + PAD + i * (DOT + GAP), dy, DOT, DOT);
    ctx.restore();
  }
}
