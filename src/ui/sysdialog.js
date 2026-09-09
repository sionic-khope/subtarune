// ─────────────────────────────────────────────────────────────
// 시스템 오류창 (윈도우 98 느낌). 컴퓨터 화면에 뜬 것처럼 게임 화면 가운데 위에 그린다.
//   game.sysdialog.show({title,text,button}) / press() / hide()
//   컷신 노드: { dialog:{title,text,button} } { dialog:'press' } { dialog:null }
// ─────────────────────────────────────────────────────────────
import { FONT, F } from './font.js';
import { SCREEN_W } from '../world/world.js';

export class SysDialog {
  constructor() { this.visible = false; this.title = ''; this.text = ''; this.button = ''; this.pressed = 0; this.time = 0; }
  show({ title = '오류', text = '', button = '확인' } = {}) { Object.assign(this, { title, text, button, visible: true, pressed: 0, time: 0 }); }
  press() { this.pressed = 0.35; }
  hide() { this.visible = false; }
  update(dt) { if (!this.visible) return; this.time += dt; if (this.pressed > 0) this.pressed -= dt; }
  draw(ctx) {
    if (!this.visible) return;
    const w = 300, h = 112, x = Math.round((SCREEN_W - w) / 2), y = 54;
    const k = Math.min(1, this.time / 0.12);               // 뜨는 순간 살짝 커짐
    ctx.save();
    if (k < 1) { ctx.translate(x + w / 2, y + h / 2); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k); ctx.translate(-(x + w / 2), -(y + h / 2)); }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 4, y + 4, w, h);   // 그림자
    ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x, y, w, h);
    bevel(ctx, x, y, w, h, '#ffffff', '#404040');
    // 타이틀바
    const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#000080'); g.addColorStop(1, '#1084d0');
    ctx.fillStyle = g; ctx.fillRect(x + 3, y + 3, w - 6, 18);
    ctx.font = FONT; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff'; ctx.fillText(this.title, x + 8, y + 4);
    // 닫기 버튼(장식)
    ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x + w - 21, y + 5, 14, 14); bevel(ctx, x + w - 21, y + 5, 14, 14, '#ffffff', '#404040');
    ctx.fillStyle = '#000'; ctx.fillRect(x + w - 17, y + 8, 2, 2); ctx.fillRect(x + w - 15, y + 10, 2, 2); ctx.fillRect(x + w - 13, y + 12, 2, 2); ctx.fillRect(x + w - 13, y + 8, 2, 2); ctx.fillRect(x + w - 17, y + 12, 2, 2);
    // 오류 아이콘 (빨간 원 + 흰 X)
    const ix = x + 24, iy = y + 44;
    ctx.fillStyle = '#d22'; ctx.beginPath(); ctx.arc(ix, iy, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ix - 5, iy - 5); ctx.lineTo(ix + 5, iy + 5); ctx.moveTo(ix + 5, iy - 5); ctx.lineTo(ix - 5, iy + 5); ctx.stroke();
    // 본문 (글자 단위 줄바꿈)
    ctx.fillStyle = '#000'; const maxW = w - 60; let line = '', ly = y + 32;
    for (const ch of this.text) { if (ctx.measureText(line + ch).width > maxW) { ctx.fillText(line, x + 46, ly); line = ch; ly += F.lineH; } else line += ch; }
    ctx.fillText(line, x + 46, ly);
    // 버튼
    const bw = 96, bh = 24, bx = x + Math.round((w - bw) / 2), by = y + h - bh - 10, down = this.pressed > 0;
    ctx.fillStyle = '#c0c0c0'; ctx.fillRect(bx, by, bw, bh);
    if (down) bevel(ctx, bx, by, bw, bh, '#404040', '#ffffff'); else bevel(ctx, bx, by, bw, bh, '#ffffff', '#404040');
    ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.fillText(this.button, bx + bw / 2 + (down ? 1 : 0), by + 4 + (down ? 1 : 0)); ctx.textAlign = 'left';
    // 포커스 점선
    if (!down) { ctx.strokeStyle = '#000'; ctx.setLineDash([1, 1]); ctx.strokeRect(bx + 3.5, by + 3.5, bw - 7, bh - 7); ctx.setLineDash([]); }
    ctx.restore();
  }
}
function bevel(ctx, x, y, w, h, light, dark) {
  ctx.fillStyle = light; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, h);
  ctx.fillStyle = dark; ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x + w - 1, y, 1, h);
}
