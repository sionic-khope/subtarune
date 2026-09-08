// ─────────────────────────────────────────────────────────────
// 타이틀 화면: 검은 배경 + 블록 로고 "subtArune" (A 안에 하트) + "C를 눌러 시작"
// 로고 글자는 6x8 블록 그리드. 글자 추가/수정은 GLYPHS 에서.
// ─────────────────────────────────────────────────────────────
import { FONT } from './font.js';
import { drawHeart, makeCanvas } from '../core/gfx.js';
import { SCREEN_W, SCREEN_H } from '../world/world.js';

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

const ZOOM_DURATION = 2.1;   // 로고가 박히는 시각(초) = assets/audio/intro.mp3 의 첫 '쾅'(2.1s). 곡 바꾸면 여기만

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

  enter() { this.phase = 'wait'; this.time = 0; this.flash = 0; this.leaving = false; }

  _startIntro() {
    this.phase = 'zoom';
    this.time = 0;
    this.game.sound.sfx('chime');            // 띠링
    this.game.sound.playIntro(ZOOM_DURATION); // 확대와 동시에 시작 → 2.1초에 쾅
  }

  _lock() {
    this.phase = 'locked';
    this.time = 0;
    this.flash = 0.18;
    this.shakeAmp = 4;
    this.game.sound.thud();
    // 인트로 곡은 그대로 이어지다가 타이틀 루프로 넘어간다
    setTimeout(() => { this.game.sound.stopIntro(1.5); this.game.sound.playBgm('title', { volume: 0.5, fadeIn: 1.5 }); }, 2500);
  }

  update(dt, input) {
    this.time += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.shakeAmp > 0) this.shakeAmp = Math.max(0, this.shakeAmp - dt * 14);

    if (this.phase === 'wait') {
      if (Object.keys(input.pressed).length) this._startIntro();
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
      this.game.flags.opening_seen = true;
      this.game.fadeTo(1, 0.3, () => { this.game.changeMap('test', 'start', true); this.game.state = 'field'; this.game.fadeTo(0, 0.3); });
      return;
    }
    if (this.time > 0.5 && input.just('confirm')) {
      this.leaving = true;
      this.flash = 0.12;
      this.game.sound.sfx('confirm');
      this.game.sound.stopIntro(0.5);
      this.game.sound.stopBgm(0.6);
      this.game.fadeTo(1, 0.6, () => this.game.startGame());
    }
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

    if (this.phase === 'wait') {
      if ((this.time % 1.2) < 0.8) this._drawText(ctx, '아무 키나 누르세요', SCREEN_H * 0.5 - 6, '#8a8aa0');
      return;
    }

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

    if (this.phase === 'locked' && this.time > 0.6) {
      const period = this.leaving ? 0.08 : 0.9;
      const on = this.leaving ? Math.floor(this.time / period) % 2 === 0 : (this.time % period) < period * 0.6;
      if (on) this._drawText(ctx, 'C 를 눌러 시작', SCREEN_H * 0.7);
      this._drawText(ctx, 'T: 테스트룸', SCREEN_H - 20, '#55556b');
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, this.flash) / 0.18 * 0.6})`;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
  }
}
