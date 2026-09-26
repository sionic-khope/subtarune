// ─────────────────────────────────────────────────────────────
// 엔딩 쿠키(BUILD373, 사용자 2026-09-26): 김형섭의 컴퓨터 화면 — 사진 뷰어 가운데 단체 사진, 아래에 사진 그리드.
// 딸깍 뒤 천천히 떠오르고 곡(good_night, UNDERTALE “Good Night”)이 천천히 들어온다. 8초 동안 아주 미세하게 확대되다 멈춘다.
// C 를 누르거나 곡이 끝나면 검게 사라지며 메인 메뉴로.
// ─────────────────────────────────────────────────────────────
import { Input } from '../core/input.js';
import { SCREEN_W as W, SCREEN_H as H } from '../world/world.js';
import { CREDITS } from '../data/credits.js';

export const COOKIE_PHOTO = Object.freeze({
  bgm: 'good_night', volume: 0.6, bgmFade: 3.0,
  // BUILD378(사용자): 사진은 약 3초 동안 천천히(부드러운 곡선) 떠오르고, 끝날 땐 5초 동안 천천히 사라진다
  fadeIn: 3.2, zoom: 1.06, zoomTime: 8.0, leave: 5.0,
  photo: 'assets/credits/group_photo.png',
  // 모니터 베젤 · 화면 · 뷰어 창 · 큰 사진 칸 · 아래 그리드(칸 크기·간격)
  bezel: [14, 12, 452, 316], screen: [26, 24, 428, 286], window: [40, 36, 400, 260],
  view: [52, 62, 376, 172], thumb: { y: 246, size: 26, gap: 4 },
});

/** 화면 좌표(480×360)로 HUD 위에 그리는 사진 뷰어. game.cookiePhoto = new CookiePhoto(game) 로 시작. */
export class CookiePhoto {
  constructor(game) {
    this.game = game; this.t = 0; this.leaving = 0; this.done = false;
    this.images = {};
    for (const src of [COOKIE_PHOTO.photo, ...CREDITS.photos]) {
      const img = new Image(); img.src = src; this.images[src] = img;
    }
    game.sound.playBgm(COOKIE_PHOTO.bgm, { volume: COOKIE_PHOTO.volume, fadeIn: COOKIE_PHOTO.bgmFade, loop: false });
  }
  img(src) { const i = this.images[src]; return i && i.complete && i.naturalWidth ? i : null; }
  update(dt) {
    const C = COOKIE_PHOTO, g = this.game;
    // 사진이 다 불러와진 뒤부터 시계를 돌린다(늦게 불러와 갑자기 튀어나오지 않게)
    if (this.img(C.photo) || this.waited > 2) this.t += dt; else this.waited = (this.waited || 0) + dt;
    if (!this.leaving) {
      const s = g.sound, ended = this.t > C.fadeIn + 1 && (s.bgmName !== C.bgm || !s.bgm || s.bgm.ended);
      if ((this.t >= C.fadeIn && Input.just('confirm')) || ended) { this.leaving = 1e-6; s.stopBgm(C.leave); }
      return;
    }
    this.leaving += dt;
    if (this.leaving >= C.leave && !this.done) { this.done = true; g.cookiePhoto = null; g.toTitle(); }
  }
  /** 사진을 칸에 꽉 채워 가운데를 잘라 그린다(cover) */
  cover(ctx, img, x, y, w, h) {
    const k = Math.max(w / img.width, h / img.height), sw = w / k, sh = h / k;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  }
  draw(ctx) {
    const C = COOKIE_PHOTO, t = this.t;
    ctx.save();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const f = Math.min(1, t / C.fadeIn); ctx.globalAlpha = f * f * (3 - 2 * f);
    // 8초 동안 아주 미세하게 확대되다 멈춘다
    const k = Math.min(1, t / C.zoomTime), z = 1 + (C.zoom - 1) * (1 - (1 - k) ** 2);
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
    // 모니터
    const [bx, by, bw, bh] = C.bezel, [sx, sy, sw, sh] = C.screen, [wx, wy, ww, wh] = C.window;
    ctx.fillStyle = '#2a2a30'; ctx.fillRect(bx + 170, by + bh, bw - 340, 18); ctx.fillRect(bx + 130, by + bh + 16, bw - 260, 6);
    ctx.fillStyle = '#1b1b20'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#26262d'; ctx.fillRect(bx + 2, by + 2, bw - 4, 2);
    ctx.fillStyle = '#008080'; ctx.fillRect(sx, sy, sw, sh);
    // 사진 뷰어 창
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(wx + 4, wy + 4, ww, wh);
    ctx.fillStyle = '#c0c0c0'; ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(wx, wy, ww, 1); ctx.fillRect(wx, wy, 1, wh);
    ctx.fillStyle = '#404040'; ctx.fillRect(wx, wy + wh - 1, ww, 1); ctx.fillRect(wx + ww - 1, wy, 1, wh);
    const bar = ctx.createLinearGradient(wx, 0, wx + ww, 0); bar.addColorStop(0, '#000080'); bar.addColorStop(1, '#1084d0');
    ctx.fillStyle = bar; ctx.fillRect(wx + 3, wy + 3, ww - 6, 16);
    ctx.fillStyle = '#c0c0c0'; ctx.fillRect(wx + ww - 19, wy + 5, 12, 12);
    ctx.fillStyle = '#18181c'; ctx.fillRect(wx + 4, wy + 22, ww - 8, wh - 26);
    // 가운데 큰 단체 사진
    const [vx, vy, vw, vh] = C.view, photo = this.img(C.photo);
    if (photo) {
      const f = Math.min(vw / photo.width, vh / photo.height), pw = Math.round(photo.width * f), ph = Math.round(photo.height * f);
      const px = Math.round(vx + (vw - pw) / 2), py = Math.round(vy + (vh - ph) / 2);
      ctx.fillStyle = '#f4ecdc'; ctx.fillRect(px - 2, py - 2, pw + 4, ph + 4);
      ctx.drawImage(photo, px, py, pw, ph);
    } else { ctx.fillStyle = '#3a3a44'; ctx.fillRect(vx + 60, vy, vw - 120, vh); }
    // 아래 사진 그리드: 크레딧 사진들 + 지금 보는 단체 사진(노란 테두리)
    const list = [...CREDITS.photos, C.photo], T = C.thumb, rowW = list.length * (T.size + T.gap) - T.gap;
    let x = Math.round(W / 2 - rowW / 2);
    for (const src of list) {
      const im = this.img(src), sel = src === C.photo;
      ctx.fillStyle = sel ? '#ffe066' : '#50505a'; ctx.fillRect(x - 1, T.y - 1, T.size + 2, T.size + 2);
      if (im) this.cover(ctx, im, x, T.y, T.size, T.size); else { ctx.fillStyle = '#2a2a32'; ctx.fillRect(x, T.y, T.size, T.size); }
      x += T.size + T.gap;
    }
    ctx.restore();
    if (this.leaving) { const k = Math.min(1, this.leaving / C.leave); ctx.fillStyle = `rgba(0,0,0,${(k * k * (3 - 2 * k)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  }
}
