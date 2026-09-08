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

/** 토큰을 줄바꿈해서 페이지(줄 배열)로 나눈다 */
function layout(ctx, tokens, maxWidth) {
  ctx.font = FONT;
  const lines = [];
  let line = [], width = 0;
  const push = () => { lines.push(line); line = []; width = 0; };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.ch === '\n') { push(); continue; }
    if (t.ch === '') { line.push(t); continue; }
    let w = ctx.measureText(t.ch).width;
    // 영단어는 단어 단위로 유지: 공백 뒤 단어 폭을 미리 재본다
    if (t.ch === ' ' && line.length) {
      let j = i + 1, ww = 0;
      while (j < tokens.length && tokens[j].ch && tokens[j].ch !== ' ' && tokens[j].ch !== '\n' && /[A-Za-z0-9]/.test(tokens[j].ch)) {
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
  textWidth() {
    const r = this.layoutRect();
    if (this.style === 'narration') return r.w;
    return r.w - 16 - (this.portrait ? 56 : 0);
  }

  _pageTokens() { return this.pages[this.page].flat(); }

  _finishPage() {
    this.revealed = this._pageTokens().length;
    if (this.page === this.pages.length - 1 && this.choice) {
      this.state = 'choice';
      this.choiceTimer = this.choice.delay ?? 0;     // 선택지가 뜨기까지 지연
      if (!this.choiceTimer) this.sound.sfx('menu');
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
      if (this.choiceTimer > 0) { this.choiceTimer -= dt; if (this.choiceTimer <= 0) this.sound.sfx('menu'); return; }
      const n = this.choice.options.length;
      if (input.just('up') || input.just('left')) { this.choiceIndex = (this.choiceIndex + n - 1) % n; this.sound.sfx('menu'); }
      if (input.just('down') || input.just('right')) { this.choiceIndex = (this.choiceIndex + 1) % n; this.sound.sfx('menu'); }
      if (input.just('confirm')) { this.sound.sfx('confirm'); this._done(this.choiceIndex); }
      else if (input.just('cancel') && this.choice.cancel !== undefined) { this.sound.sfx('cancel'); this._done(this.choice.cancel); }
    }
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
    let tx = r.x + 10;
    if (this.portrait) {
      ctx.drawImage(this.portrait, r.x + 8, r.y + 12, 48, 48);
      tx = r.x + 64;
    }

    // 본문
    ctx.font = FONT;
    ctx.textBaseline = 'top';
    const lines = this.pages[this.page];
    let idx = 0;
    outer:
    for (let li = 0; li < lines.length; li++) {
      let x = tx;
      const y = r.y + 8 + li * LINE_H;
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
      const opts = this.choice.options;
      const usedLines = lines.length;
      const startY = r.y + 8 + usedLines * LINE_H;
      const cols = opts.length <= 2 ? opts.length : 2;
      const colW = Math.floor((r.w - (tx - r.x) - 10) / cols);
      opts.forEach((o, i) => {
        const cx = tx + 12 + (i % cols) * colW;
        const cy = startY + Math.floor(i / cols) * LINE_H;
        ctx.fillStyle = i === this.choiceIndex ? '#ffe066' : '#fff';
        ctx.fillText(o.label, cx, cy);
        if (i === this.choiceIndex) drawHeart(ctx, cx - 11, cy + 3);
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
    const opts = this.choice.options;
    opts.forEach((o, i) => {
      const w = ctx.measureText(o.label).width;
      const x = Math.round((SCREEN_W - w) / 2), y = y0 + totalH + LH + i * LH;
      ctx.fillStyle = i === this.choiceIndex ? '#ffe066' : '#fff';
      ctx.fillText(o.label, x, y);
      if (i === this.choiceIndex) drawHeart(ctx, x - 14, y + Math.round(LH / 2) - 4);
    });
  }
};

/**
 * 스크립트 러너. 노드 배열을 순서대로 재생한다.
 *  { text, speaker, portrait, voice }
 *  { text, choice:{ options:[{label, goto}], cancel } }
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
    if (!script.silent) this.game.sound.sfx('open');
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
    if (!silent) this.game.sound.sfx('close');
    if (this.onEnd) this.onEnd();
  }

  _step() {
    while (this.script) {
      if (this.i >= this.script.length) { this._finish(); return; }
      const node = this.script[this.i++];
      if (node.label) continue;
      if (node.end) { this._finish(); return; }
      if (node.set) { Object.assign(this.game.flags, node.set); continue; }
      if (node.action) { node.action(this.game); continue; }
      if (node.if) { if (node.if(this.game.flags)) { this._jump(node.goto); return; } continue; }
      if (node.goto) { this._jump(node.goto); return; }
      if (node.text !== undefined) {
        this.box.show(node, this.game.ctx, (choice) => {
          if (choice !== null && node.choice) {
            const opt = node.choice.options[choice];
            if (opt && opt.set) Object.assign(this.game.flags, opt.set);
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
