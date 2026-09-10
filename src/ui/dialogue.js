// ─────────────────────────────────────────────────────────────
// 대사 시스템
//  - 태그:  {s=2}속도x2  {s=0.5}느리게 {/s}속도 복귀  {w=0.4}0.4초 멈춤  {c=red}색{/c}
//           {shake}흔들림{/shake}  {wave}물결{/wave}  {n} 줄바꿈
//  - 한 글자 나올 때마다 화자 음색으로 0.1초 블립
//  - C: 타이핑 중이면 전부 표시 / 끝났으면 다음   X: 즉시 전부 표시
// ─────────────────────────────────────────────────────────────
import { drawBox, drawHeart } from '../core/gfx.js';
import { makeWaiter } from './cutscene.js';
import { SCREEN_W, SCREEN_H } from '../world/world.js';

import { FONT, F } from './font.js';
export { FONT };
const LINE_H = F.lineH;
const MAX_LINES = 4;

const COLORS = {
  red: '#ff4a5a', yellow: '#ffe066', blue: '#69a9ff', green: '#7ee29a',
  gray: '#8a8aa0', pink: '#ff8ad0', purple: '#b48cff', orange: '#ffa04a',
};

/** 문자열 → 토큰 배열 */
export function parseText(text) {
  const tokens = [];
  let speed = 1, color = null, shake = false, wave = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '{') {
      const end = text.indexOf('}', i);
      if (end !== -1) {
        const tag = text.slice(i + 1, end).trim();
        i = end + 1;
        const [name, val] = tag.split('=');
        switch (name) {
          case 's': speed = parseFloat(val) || 1; break;
          case '/s': speed = 1; break;
          case 'w': tokens.push({ ch: '', wait: parseFloat(val) || 0.3 }); break;
          case 'c': color = COLORS[val] || val; break;
          case '/c': color = null; break;
          case 'shake': shake = true; break;
          case '/shake': shake = false; break;
          case 'wave': wave = true; break;
          case '/wave': wave = false; break;
          case 'n': tokens.push({ ch: '\n' }); break;
          default: console.warn('[dialogue] 모르는 태그', tag);
        }
        continue;
      }
    }
    // 서로게이트 쌍(이모지) 처리
    const cp = text.codePointAt(i);
    const chStr = String.fromCodePoint(cp);
    i += chStr.length;
    tokens.push({ ch: chStr, speed, color, shake, wave });
  }
  return tokens;
}

/** 토큰을 줄바꿈해서 페이지(줄 배열)로 나눈다. 단어 단위(한글 포함), 한 단어가 한 줄보다 길 때만 글자 단위. 어느 줄도 maxWidth 를 넘지 않는다 */
export function layout(ctx, tokens, maxWidth) {
  ctx.font = FONT;
  const lines = [];
  let line = [], width = 0;
  const push = () => { lines.push(line); line = []; width = 0; };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.ch === '\n') { push(); continue; }
    if (t.ch === '') { line.push(t); continue; }
    let w = ctx.measureText(t.ch).width;
    // 단어 단위 줄바꿈(한글 포함): 공백 뒤 단어 폭을 미리 재서 안 들어가면 줄을 바꾼다. 한 단어가 한 줄보다 길 때만 글자 단위로 끊긴다 (2026-09-10 '대사 깨짐')
    if (t.ch === ' ' && line.length) {
      let j = i + 1, ww = 0;
      while (j < tokens.length && tokens[j].ch && tokens[j].ch !== ' ' && tokens[j].ch !== '\n') {
        ww += ctx.measureText(tokens[j].ch).width; j++;
      }
      if (width + w + ww > maxWidth) { push(); continue; }
    }
    if (width + w > maxWidth && line.length) {
      push();
      if (t.ch === ' ') continue;
    }
    t.w = w;
    line.push(t);
    width += w;
  }
  if (line.length) lines.push(line);

  const pages = [];
  for (let i = 0; i < lines.length; i += MAX_LINES) pages.push(lines.slice(i, i + MAX_LINES));
  return pages.length ? pages : [[[]]];
}

/** 선택지 커서 이동(그리기와 같은 격자: 옵션 ≤2 면 한 줄, 아니면 2열). ←→ 줄 안 순환, ↑↓ 줄 사이 순환(열 유지, 짧은 줄이면 마지막 칸). 한 줄뿐이면 ↑↓ 는 ←→ 처럼 */
export function choiceMove(i, n, dir) {
  if (n <= 1) return 0;
  const cols = n <= 2 ? n : 2, rows = Math.ceil(n / cols);
  let row = Math.floor(i / cols), col = i % cols;
  const rowLen = (r) => Math.min(cols, n - r * cols);
  if (rows === 1 && (dir === 'up' || dir === 'down')) dir = dir === 'up' ? 'left' : 'right';
  if (dir === 'left') col = (col + rowLen(row) - 1) % rowLen(row);
  else if (dir === 'right') col = (col + 1) % rowLen(row);
  else if (dir === 'up') { row = (row + rows - 1) % rows; col = Math.min(col, rowLen(row) - 1); }
  else if (dir === 'down') { row = (row + 1) % rows; col = Math.min(col, rowLen(row) - 1); }
  return row * cols + col;
}

/** 선택지 확정 잠금(초): 선택지가 다 뜬 뒤 이 시간 동안 C/X 가 안 먹는다 — 모든 선택지 공통 (2026-09-10 사용자 요청) */
export const CHOICE_LOCK = 0.1;   // 선택지 확정 잠금(초) — 0.4 → 0.1 (사용자 2026-09-11: 너무 답답함)

export class TextBox {
  constructor(sound, portraits) {
    this.sound = sound;
    this.portraits = portraits;     // name → canvas
    this.state = 'closed';          // closed | typing | waiting | choice
    this.charDelay = 0.045;         // 글자 간 기본 간격(초)
    this.time = 0;
    this.shakeTimer = 0;
    this.node = null;
    this.onDone = null;
  }

  get isOpen() { return this.state !== 'closed'; }

  /** 대사 노드 하나를 표시 */
  show(node, ctx, onDone) {
    this.node = node;
    this.onDone = onDone;
    this.voice = node.voice || 'default';
    this.speaker = node.speaker || null;
    this.portrait = node.portrait ? this.portraits[node.portrait] : null;
    this.choice = node.choice || null;
    this.choiceIndex = 0;
    this.choiceShown = 0;                      // 지금까지 드러난 선택지 개수 (stagger 연출)
    this.staggerTimer = 0;
    this.choiceAutoTimer = null;               // choice.auto: 다 드러난 뒤 n초 후 고르지 않고 자동 진행
    this.style = node.style || 'box';          // 'box' | 'narration'(검은 화면 중앙 텍스트)
    this.autoDelay = node.speed ? this.charDelay / node.speed : null;
    this.auto = node.auto ?? null;             // 초: 다 나온 뒤 자동으로 넘어감
    this.autoTimer = 0;

    const text = node.text ?? '';
    this.tokens = parseText(text);
    const textW = this.textWidth();
    this.pages = layout(ctx, this.tokens, textW);
    this.page = 0;
    this.revealed = 0;
    this.timer = 0;
    this.pendingWait = 0;
    this.state = 'typing';
    this.charCount = 0;
    if (!this.tokens.length) this._finishPage();
  }

  close() {
    this.state = 'closed';
    this.node = null;
  }

  get fullscreen() { return this.isOpen && this.style === 'narration'; }

  layoutRect() {
    if (this.style === 'narration') return { x: 40, y: 60, w: SCREEN_W - 80, h: 120 };
    return { x: 12, y: SCREEN_H - 112, w: SCREEN_W - 24, h: 104 };
  }
  /** 글이 들어갈 폭 = 상자 폭 − 글 시작 오프셋(18 / 초상화 74) − 오른쪽 여백 18. 테두리에 글자가 걸리면 안 된다 */
  textWidth() {
    const r = this.layoutRect();
    if (this.style === 'narration') return r.w - 36;
    return r.w - (this.portrait ? 74 : 18) - 18;
  }

  _pageTokens() { return this.pages[this.page].flat(); }

  _finishPage() {
    this.revealed = this._pageTokens().length;
    if (this.page === this.pages.length - 1 && this.choice) {
      this.state = 'choice';
      this.choiceTimer = this.choice.delay ?? 0;     // 선택지가 뜨기까지 지연
      if (!this.choiceTimer) this._openChoice();
    } else {
      this.state = 'waiting';
    }
  }

  update(dt, input) {
    if (this.state === 'closed') return;
    this.time += dt;

    if (this.state === 'typing') {
      // X = 즉시 전부 표시 / C = 즉시 전부 표시
      if (input.just('cancel') || input.just('confirm')) {
        this._finishPage();
        return;
      }
      const toks = this._pageTokens();
      this.timer -= dt;
      while (this.timer <= 0 && this.revealed < toks.length) {
        const t = toks[this.revealed++];
        if (t.wait) { this.timer += t.wait; continue; }
        const isSilent = t.ch === ' ' || t.ch === '' || /[.,!?…·]/.test(t.ch);
        if (!isSilent && this.voice !== 'none') this.sound.blip(this.voice);
        this.timer += (this.autoDelay ?? this.charDelay) / (t.speed || 1);
      }
      if (this.revealed >= toks.length) this._finishPage();
      return;
    }

    if (this.state === 'waiting') {
      if (this.auto !== null) this.autoTimer += dt;
      if (input.just('confirm') || (this.auto !== null && this.autoTimer >= this.auto)) {
        this.autoTimer = 0;
        if (this.page < this.pages.length - 1) {
          this.page++;
          this.revealed = 0;
          this.timer = 0;
          this.state = 'typing';
        } else {
          this._done(null);
        }
      }
      return;
    }

    if (this.state === 'choice') {
      if (this.choiceTimer > 0) { this.choiceTimer -= dt; if (this.choiceTimer <= 0) this._openChoice(); return; }
      const n = this.choice.options.length;
      if (this.choiceShown < n) {                    // stagger: 하나씩 천천히 드러남 (다 뜰 때까지 입력 없음)
        this.staggerTimer -= dt;
        if (this.staggerTimer <= 0) {
          this.choiceShown++; this.staggerTimer = this.choice.stagger; this.sound.sfx('menu');
          if (this.choiceShown >= n) { this.choiceLock = CHOICE_LOCK; if (this.choice.auto !== undefined) this.choiceAutoTimer = this.choice.auto; }
        }
        return;
      }
      if (this.choiceAutoTimer !== null) {            // auto: 고르지 못한 채 다음 노드로 (대사가 끊고 들어오는 연출)
        this.choiceAutoTimer -= dt;
        if (this.choiceAutoTimer <= 0) { this._done(null); return; }
      }
      if (this.choice.cursor !== false) {                                    // 격자 이동(2열): ←→ 는 같은 줄 안에서, ↑↓ 는 줄 사이. 한 줄뿐이면 ↑↓ 도 옆으로 (2026-09-10 '한쪽으로만 간다' 지적)
        const dir = input.just('left') ? 'left' : input.just('right') ? 'right' : input.just('up') ? 'up' : input.just('down') ? 'down' : null;
        if (dir) { const next = choiceMove(this.choiceIndex, n, dir); if (next !== this.choiceIndex) { this.choiceIndex = next; this.sound.sfx('menu'); } }
      }
      if (this.choice.locked) return;                // locked: 커서는 움직여도 확정/취소 불가
      if (this.choiceLock > 0) { this.choiceLock -= dt; return; }   // 확정 잠금: 대사 넘기던 연타가 첫 항목을 찍지 않게 (커서는 움직임)
      if (input.just('confirm')) { this.sound.sfx('confirm'); this._done(this.choiceIndex); }
      else if (input.just('cancel') && this.choice.cancel !== undefined) { this.sound.sfx('cancel'); this._done(this.choice.cancel); }
    }
  }

  /** 선택지 창이 열리는 순간: stagger 면 첫 항목만, 아니면 전부 */
  _openChoice() {
    const n = this.choice.options.length;
    this.choiceShown = this.choice.stagger ? 1 : n;
    this.staggerTimer = this.choice.stagger ?? 0;
    this.choiceLock = this.choiceShown >= n ? CHOICE_LOCK : 0;   // 공통 규칙: 다 뜬 뒤 잠깐은 확정 불가 (2026-09-10 '연타로 바로 넘겨버림')
    this.choiceAutoTimer = this.choiceShown >= n && this.choice.auto !== undefined ? this.choice.auto : null;
    this.sound.sfx('menu');
  }

  _done(choiceIndex) {
    const cb = this.onDone;
    this.state = 'closed';
    if (cb) cb(choiceIndex);
  }

  draw(ctx) {
    if (this.state === 'closed') return;
    if (this.style === 'narration') return this.drawNarration(ctx);
    const r = this.layoutRect();
    drawBox(ctx, r.x, r.y, r.w, r.h);

    // 이름표
    if (this.speaker) {
      ctx.font = FONT;
      const nw = Math.ceil(ctx.measureText(this.speaker).width) + 12;
      drawBox(ctx, r.x + 6, r.y - (F.size + 8), nw, F.size + 10);
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'top';
      ctx.fillText(this.speaker, r.x + 12, r.y - (F.size + 4));
    }

    // 초상화
    let tx = r.x + 18;
    if (this.portrait) {
      ctx.drawImage(this.portrait, r.x + 14, r.y + 22, 48, 48);
      tx = r.x + 74;
    }

    // 본문
    ctx.font = FONT;
    ctx.textBaseline = 'top';
    const lines = this.pages[this.page];
    let idx = 0;
    outer:
    for (let li = 0; li < lines.length; li++) {
      let x = tx;
      const y = r.y + 18 + li * LINE_H;
      for (const t of lines[li]) {
        if (idx >= this.revealed) break outer;
        idx++;
        if (!t.ch) continue;
        let dx = 0, dy = 0;
        if (t.shake) { dx = Math.round(Math.random() * 2 - 1); dy = Math.round(Math.random() * 2 - 1); }
        if (t.wave) { dy = Math.round(Math.sin(this.time * 8 + x * 0.25) * 2); }
        ctx.fillStyle = t.color || '#ffffff';
        ctx.fillText(t.ch, x + dx, y + dy);
        x += t.w;
      }
    }

    // 계속 화살표 (깜빡임)
    if (this.state === 'waiting' && Math.floor(this.time * 3) % 2 === 0) {
      const ax = r.x + r.w - 14, ay = r.y + r.h - 10;
      ctx.fillStyle = '#fff';
      ctx.fillRect(ax, ay, 5, 1); ctx.fillRect(ax + 1, ay + 1, 3, 1); ctx.fillRect(ax + 2, ay + 2, 1, 1);
    }

    // 선택지
    if (this.state === 'choice' && this.choiceTimer <= 0) {
      const opts = this.choice.options.slice(0, this.choiceShown);
      const cursor = this.choice.cursor !== false;
      const usedLines = lines.length;
      const startY = r.y + 18 + usedLines * LINE_H;
      const cols = opts.length <= 2 ? opts.length : 2;
      const colW = Math.floor((r.w - (tx - r.x) - 10) / cols);
      opts.forEach((o, i) => {
        const cx = tx + 12 + (i % cols) * colW;
        const cy = startY + Math.floor(i / cols) * LINE_H;
        ctx.fillStyle = cursor && i === this.choiceIndex ? '#ffe066' : '#fff';
        ctx.fillText(o.label, cx, cy);
        if (cursor && i === this.choiceIndex) drawHeart(ctx, cx - 11, cy + 3);
      });
    }
  }
}

TextBox.prototype.drawNarration = function (ctx) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.font = FONT; ctx.textBaseline = 'top';
  const LH = F.narrationLH;
  const lines = this.pages[this.page];
  const totalH = lines.length * LH;
  const y0 = Math.round((SCREEN_H - totalH) / 2);
  let idx = 0;
  outer:
  for (let li = 0; li < lines.length; li++) {
    const lineW = lines[li].reduce((a, t) => a + (t.w || 0), 0);
    let x = Math.round((SCREEN_W - lineW) / 2);
    const y = y0 + li * LH;
    for (const t of lines[li]) {
      if (idx >= this.revealed) break outer;
      idx++;
      if (!t.ch) continue;
      let dx = 0, dy = 0;
      if (t.shake) { dx = Math.round(Math.random() * 2 - 1); dy = Math.round(Math.random() * 2 - 1); }
      if (t.wave) dy = Math.round(Math.sin(this.time * 8 + x * 0.25) * 2);
      ctx.fillStyle = t.color || '#ffffff';
      ctx.fillText(t.ch, x + dx, y + dy);
      x += t.w;
    }
  }
  if (this.state === 'waiting' && this.auto === null && Math.floor(this.time * 3) % 2 === 0) {
    const ax = SCREEN_W / 2 - 2, ay = y0 + totalH + 10;
    ctx.fillStyle = '#fff';
    ctx.fillRect(ax, ay, 5, 1); ctx.fillRect(ax + 1, ay + 1, 3, 1); ctx.fillRect(ax + 2, ay + 2, 1, 1);
  }
  // 선택지: 텍스트 아래 가운데 정렬, 하트 커서
  if (this.state === 'choice' && this.choiceTimer <= 0) {
    const opts = this.choice.options.slice(0, this.choiceShown);
    const cursor = this.choice.cursor !== false;
    opts.forEach((o, i) => {
      const w = ctx.measureText(o.label).width;
      const x = Math.round((SCREEN_W - w) / 2), y = y0 + totalH + LH + i * LH;
      ctx.fillStyle = cursor && i === this.choiceIndex ? '#ffe066' : '#fff';
      ctx.fillText(o.label, x, y);
      if (cursor && i === this.choiceIndex) drawHeart(ctx, x - 14, y + Math.round(LH / 2) - 4);
    });
  }
};

/**
 * 스크립트 러너. 노드 배열을 순서대로 재생한다.
 *  { text, speaker, portrait, voice }
 *  { text, choice:{ options:[{label, goto}], cancel, delay, stagger, locked, auto, cursor:false } }
 *      delay: 뜨기까지 초 / stagger: 항목이 하나씩 드러나는 간격 / locked: 고를 수 없음 / auto: 다 뜬 뒤 n초 후 자동 진행(고르지 않음) / cursor:false 하트 없음
 *  { label:'name' }  { goto:'name' }  { end:true }
 *  { if:(flags)=>bool, goto:'name' }   { set:{flag:value} }
 *  { action:(game)=>void }
 */
export class ScriptRunner {
  constructor(textbox, game) {
    this.box = textbox;
    this.game = game;
    this.script = null;
    this.i = 0;
    this.onEnd = null;
    this.wait = null;          // 컷신 waiter
  }
  get running() { return this.script !== null; }

  start(script, onEnd) {
    this.script = script;
    this.i = 0;
    this.onEnd = onEnd || null;
    this.labels = {};
    this.wait = null;
    script.forEach((n, i) => { if (n.label) this.labels[n.label] = i; });
    this._step();
  }

  _jump(label) {
    if (!(label in this.labels)) { console.warn('[script] 없는 라벨', label); this._finish(); return; }
    this.i = this.labels[label];
    this._step();
  }

  _finish() {
    const silent = this.script?.silent;
    this.script = null;
    this.wait = null;
    this.box.close();
    if (this.onEnd) this.onEnd();
  }

  _step() {
    while (this.script) {
      if (this.i >= this.script.length) { this._finish(); return; }
      const node = this.script[this.i++];
      if (node.label) continue;
      if (node.end) { this._finish(); return; }
      if (node.set) { for (const [k, v] of Object.entries(node.set)) this.game.setFlag(k, v); continue; }
      if (node.stage) { this.game.setFlag(node.stage); continue; }            // 스토리 단계 도달 (앞 단계 자동 채움)
      if (node.action) { node.action(this.game); continue; }
      if (node.if) { if (node.if(this.game.flags, this.game.story)) { this._jump(node.goto); return; } continue; }
      if (node.goto) { this._jump(node.goto); return; }
      if (node.text !== undefined) {
        this.box.show(node, this.game.ctx, (choice) => {
          if (choice !== null && node.choice) {
            const opt = node.choice.options[choice];
            if (opt && opt.set) for (const [k, v] of Object.entries(opt.set)) this.game.setFlag(k, v);
            if (opt && opt.goto) { this._jump(opt.goto); return; }
          }
          this._step();
        });
        return;
      }
      const w = makeWaiter(this.game, node);
      if (w) { this.wait = w; return; }
      console.warn('[script] 이해 못한 노드', node);
    }
  }

  update(dt, input) {
    if (this.wait) {
      if (this.wait.update(dt, input)) { this.wait = null; this._step(); }
      return;
    }
    this.box.update(dt, input);
  }
}
