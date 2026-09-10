// ─────────────────────────────────────────────────────────────
// 타이틀 화면: 검은 배경 + 블록 로고 "subtArune" (A 안에 하트) + "C를 눌러 시작"
// 로고 글자는 6x8 블록 그리드. 글자 추가/수정은 GLYPHS 에서.
// ─────────────────────────────────────────────────────────────
import { FONT } from './font.js';
import { drawHeart, makeCanvas } from '../core/gfx.js';
import { SCREEN_W, SCREEN_H } from '../world/world.js';
import { BUILD } from '../main.js';
import L from '../data/locale/ko.js';
import { QA_POINTS } from '../core/story.js';

const GLYPHS = {
  s: [
    '......',
    '......',
    '......',
    '.#####',
    '##....',
    '.####.',
    '....##',
    '#####.',
  ],
  u: [
    '......',
    '......',
    '......',
    '##..##',
    '##..##',
    '##..##',
    '##..##',
    '.#####',
  ],
  b: [
    '##....',
    '##....',
    '##....',
    '#####.',
    '##..##',
    '##..##',
    '##..##',
    '#####.',
  ],
  t: [
    '.##...',
    '.##...',
    '.##...',
    '######',
    '.##...',
    '.##...',
    '.##...',
    '..####',
  ],
  // A: 꽉 찬 블록. 가운데를 파내고 하트를 넣는다 (drawLogo 에서 특수 처리)
  A: [
    '......',
    '......',
    '......',
    '######',
    '######',
    '######',
    '######',
    '##.###',
  ],
  r: [
    '......',
    '......',
    '......',
    '##.###',
    '###...',
    '##....',
    '##....',
    '##....',
  ],
  n: [
    '......',
    '......',
    '......',
    '#####.',
    '##..##',
    '##..##',
    '##..##',
    '##..##',
  ],
  e: [
    '......',
    '......',
    '......',
    '.####.',
    '##..##',
    '######',
    '##....',
    '.#####',
  ],
};

const BLOCK = 6;      // 블록 1칸 = 6px (9글자 = 372px / 화면 480)
const GAP = 1;        // 글자 사이 블록 수

/** 로고를 오프스크린 캔버스로 굽는다 (한 번만) */
export function bakeLogo(word = 'subtArune') {
  const cols = word.length * (6 + GAP) - GAP;
  const c = makeCanvas(cols * BLOCK, 8 * BLOCK);
  const ctx = c.getContext('2d');
  let ox = 0;
  for (const ch of word) {
    const g = GLYPHS[ch];
    if (!g) { console.warn('[title] 글리프 없음', ch); ox += (6 + GAP) * BLOCK; continue; }
    ctx.fillStyle = '#fff';
    for (let r = 0; r < 8; r++) for (let col = 0; col < 6; col++) if (g[r][col] === '#') ctx.fillRect(ox + col * BLOCK, r * BLOCK, BLOCK, BLOCK);
    if (ch === 'A') {
      // 가운데 파내기 (rows 3.5~6.5, cols 1~5) 후 하트
      ctx.fillStyle = '#000';
      const hx = ox + 1 * BLOCK, hy = 3 * BLOCK + Math.floor(BLOCK / 2), hw = 4 * BLOCK, hh = 3 * BLOCK + Math.floor(BLOCK / 2);
      ctx.fillRect(hx, hy, hw, hh);
      const heart = makeCanvas(7, 6);
      drawHeart(heart.getContext('2d'), 0, 0, '#ff3b3b');
      const scale = Math.floor(Math.min((hw - 2) / 7, (hh - 2) / 6));
      ctx.drawImage(heart, hx + Math.round((hw - 7 * scale) / 2), hy + Math.round((hh - 6 * scale) / 2), 7 * scale, 6 * scale);
    }
    ox += (6 + GAP) * BLOCK;
  }
  return c;
}

const PRE_DELAY = 0.8;       // 아무 키 → (띠링, 검은 화면) → 이 시간 뒤 곡+확대 시작
const ZOOM_DURATION = 2.4;   // 확대 시작 후 로고가 박히는 시각(초) = intro.mp3 의 최대 히트(2.4s). 곡 바꾸면 여기만
const PROMPT_DELAY = 3.0;    // 박힌 뒤 'C 를 눌러 시작' 이 뜨기까지

export class TitleScreen {
  constructor(game) {
    this.game = game;
    this.logo = bakeLogo();
    this.phase = 'wait';        // wait(아무 키) → zoom(확대+흔들림) → locked(C로 시작)
    this.time = 0;
    this.flash = 0;
    this.leaving = false;
    this.shakeAmp = 0;
  }

  static QA_ROWS = 8;      // 한 번에 보이는 줄 수 (22px × 8 = 176px, 상자 안)
  /** QA 목록: 커서가 창 밖으로 나가면 창(top)을 민다 — 목록이 길어져도 상자 밖으로 안 나간다 (2026-09-10 '밑이 뚫린다') */
  _qaScroll() {
    const q = this.qa, n = QA_POINTS.length, R = TitleScreen.QA_ROWS;
    if (q.i < q.top) q.top = q.i;
    if (q.i >= q.top + R) q.top = q.i - R + 1;
    q.top = Math.max(0, Math.min(q.top, Math.max(0, n - R)));
  }
  _drawQa(ctx) {
    const q = this.qa, n = QA_POINTS.length, R = TitleScreen.QA_ROWS, ROW = 22;
    const bx = 40, by = 40, bw = SCREEN_W - 80, bh = SCREEN_H - 80, listY = 82;
    ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
    ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillStyle = '#ffe066'; ctx.fillText('QA 바로가기', bx + 20, 52);
    ctx.textAlign = 'right'; ctx.fillStyle = '#8a8aa0'; ctx.fillText(`${q.i + 1} / ${n}`, bx + bw - 20, 52); ctx.textAlign = 'left';
    ctx.fillStyle = '#55556b'; ctx.fillRect(bx + 16, 72, bw - 32, 1);                    // 제목 아래 구분선
    ctx.save(); ctx.beginPath(); ctx.rect(bx + 2, listY - 4, bw - 4, R * ROW + 4); ctx.clip();   // 목록은 창 안에서만
    for (let k = 0; k < R; k++) {
      const i = q.top + k; if (i >= n) break;
      const pt = QA_POINTS[i], y = listY + k * ROW, on = i === q.i;
      ctx.fillStyle = on ? '#ffe066' : '#fff'; ctx.fillText(`${pt.id}  —  ${pt.desc}`, bx + 40, y);
      if (on) drawHeart(ctx, bx + 24, y + 5);
    }
    ctx.restore();
    const tri = (x, y, up) => { ctx.beginPath(); if (up) { ctx.moveTo(x - 4, y + 4); ctx.lineTo(x + 4, y + 4); ctx.lineTo(x, y - 1); } else { ctx.moveTo(x - 4, y - 1); ctx.lineTo(x + 4, y - 1); ctx.lineTo(x, y + 4); } ctx.closePath(); ctx.fill(); };
    ctx.fillStyle = '#fff';
    if (q.top > 0) tri(bx + bw - 24, listY - 8, true);                                     // 위에 더 있음
    if (q.top + R < n) tri(bx + bw - 24, listY + R * ROW + 4, false);                      // 아래에 더 있음
    ctx.fillStyle = '#55556b'; ctx.fillRect(bx + 16, by + bh - 30, bw - 32, 1);              // 안내 위 구분선
    ctx.fillStyle = '#8a8aa0'; ctx.fillText('위아래: 고르기   C: 이동   X: 닫기', bx + 20, by + bh - 24);
  }
  enter() { this.phase = 'wait'; this.time = 0; this.flash = 0; this.leaving = false; this.confirmNew = 0; this.qa = null; }

  _leave(go) {
    this.leaving = true; this.flash = 0.12;
    this.game.sound.sfx('confirm'); this.game.sound.stopIntro(0.5); this.game.sound.stopBgm(0.6);
    this.game.fadeTo(1, 0.6, go);
  }

  _startIntro() {
    this.phase = 'pre';
    this.time = 0;
    this.game.sound.sfx('chime');            // 띠링
  }
  _startZoom() {
    this.phase = 'zoom';
    this.time = 0;
    this.game.sound.playIntro(ZOOM_DURATION); // 확대와 동시에 곡 시작 → ZOOM_DURATION 에 쾅
  }

  _lock() {
    this.phase = 'locked';
    this.time = 0;
    this.flash = 0.18;
    this.shakeAmp = 4;
    this.game.sound.thud();
    // 인트로 곡은 그대로 이어지다가 타이틀 루프로 넘어간다
    setTimeout(() => { this.game.sound.stopIntro(1.5); this.game.sound.playBgm('title', { volume: 0.25, fadeIn: 1.5 }); }, 2500);   // 시작브금
  }

  update(dt, input) {
    this.time += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.shakeAmp > 0) this.shakeAmp = Math.max(0, this.shakeAmp - dt * 14);

    if (this.phase === 'wait') {
      if (Object.keys(input.pressed).length) this._startIntro();
      return;
    }
    if (this.phase === 'pre') {
      if (this.time >= PRE_DELAY) this._startZoom();
      return;
    }
    if (this.phase === 'zoom') {
      if (this.time >= ZOOM_DURATION || input.just('confirm')) this._lock();
      return;
    }
    // locked
    if (this.leaving) return;
    if (input.just('test')) {                 // T: 테스트룸 바로 가기
      this.leaving = true;
      this.game.sound.stopIntro(0.3); this.game.sound.stopBgm(0.3);
      this.game.fadeTo(1, 0.3, () => { this.game.devJump({ map: 'test', spawn: 'start' }); this.game.fadeTo(0, 0.3); });
      return;
    }
    if (this.qa) {                                                 // QA 바로가기 목록
      if (input.just('up')) { this.qa.i = (this.qa.i + QA_POINTS.length - 1) % QA_POINTS.length; this._qaScroll(); this.game.sound.sfx('menu'); }
      if (input.just('down')) { this.qa.i = (this.qa.i + 1) % QA_POINTS.length; this._qaScroll(); this.game.sound.sfx('menu'); }
      if (input.just('cancel') || input.just('qa')) { this.qa = null; this.game.sound.sfx('cancel'); return; }
      if (input.just('confirm')) { const pt = QA_POINTS[this.qa.i]; this._leave(() => { this.game.devJump(pt); this.game.fadeTo(0, 0.3); }); }
      return;
    }
    if (input.just('qa')) { this.qa = { i: 0, top: 0 }; this.game.sound.sfx('menu'); return; }
    if (this.time <= PROMPT_DELAY) return;
    const hasSave = this.game.hasSave();
    if (input.just('confirm')) {                                   // C: 세이브 있으면 이어하기, 없으면 새 게임
      this._leave(() => (hasSave ? this.game.continueGame() : this.game.startGame()));
    } else if (hasSave && input.just('cancel')) {                  // X: 처음부터 (두 번 눌러 확인)
      if (this.confirmNew > 0) this._leave(() => this.game.startGame());
      else { this.confirmNew = 3.0; this.game.sound.sfx('menu'); }
    }
    if (this.confirmNew > 0) this.confirmNew -= dt;
  }

  _drawText(ctx, text, y, color = '#fff') {
    ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(text, SCREEN_W / 2, y);
    ctx.textAlign = 'left';
  }

  draw(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    ctx.font = FONT; ctx.textBaseline = 'top'; ctx.fillStyle = '#33334a'; ctx.fillText('build ' + BUILD, 6, SCREEN_H - 20);
    if (this.phase === 'wait') {
      if ((this.time % 1.2) < 0.8) this._drawText(ctx, '아무 키나 누르세요', SCREEN_H * 0.5 - 6, '#8a8aa0');
      return;
    }
    if (this.phase === 'pre') return;        // 검은 화면

    // 로고: 확대(ease-out) + 흔들림(진폭은 시간에 따라 커졌다가 박히며 감쇠)
    let scale = 1, shake = 0, alpha = 1;
    if (this.phase === 'zoom') {
      const k = Math.min(1, this.time / ZOOM_DURATION);
      const ease = 1 - Math.pow(1 - k, 3);
      scale = 0.15 + 0.85 * ease;
      shake = 1 + k * 3;
      alpha = Math.min(1, this.time / 0.4);
    } else {
      shake = this.shakeAmp;
    }
    const w = Math.round(this.logo.width * scale), h = Math.round(this.logo.height * scale);
    const jx = shake ? Math.round((Math.random() * 2 - 1) * shake) : 0;
    const jy = shake ? Math.round((Math.random() * 2 - 1) * shake) : 0;
    const lx = Math.round((SCREEN_W - w) / 2) + jx;
    const ly = Math.round(SCREEN_H * 0.4 - h / 2) + jy;
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.logo, lx, ly, w, h);
    ctx.globalAlpha = 1;

    if (this.phase === 'locked' && this.time > PROMPT_DELAY) {
      const period = this.leaving ? 0.08 : 0.9;
      const on = this.leaving ? Math.floor(this.time / period) % 2 === 0 : (this.time % period) < period * 0.6;
      const hasSave = this.game.hasSave();
      if (on) this._drawText(ctx, hasSave ? (this.confirmNew > 0 ? L.title_confirm_new : L.title_continue) : L.title_start, SCREEN_H * 0.7);
      if (hasSave && this.confirmNew <= 0) this._drawText(ctx, L.title_new, SCREEN_H * 0.7 + 22, '#8a8aa0');
      this._drawText(ctx, 'T: 테스트룸   Q: QA 지점', SCREEN_H - 20, '#55556b');
    }
    if (this.qa) this._drawQa(ctx);                                 // QA 목록 오버레이 (상자 안 스크롤 창)
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, this.flash) / 0.18 * 0.6})`;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
  }
}
