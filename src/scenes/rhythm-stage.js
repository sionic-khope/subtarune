// 뚜울라 무대 리듬 게임 화면 조각(BUILD217) — scenes/rhythm.js 의 그 화면을 전투 특별 패턴(battle/modes/tvform-rhythm.js)에서도
//   똑같이 띄우기 위한 순수 그리기 모듈. 함수는 ctx 와 작은 상태 객체만 받는다(입력·소리·DOM 없음).
//   좌표·크기·색은 rhythm.js 와 같은 값: 기둥 LANE_TOP 20 / RECEPTOR_Y 198 / x190 w100, 양옆 패드 x100·x300 w80, 밴드 STAND_Y 290, 관객 띠 아래.
//   rhythm.js 자체는 건드리지 않았다 — 씬 동작과 플레이테스트를 그대로 두려고 같은 그림을 여기에 옮겨 적었다(중복은 의도).
import { FONT, F } from '../ui/font.js';
import { visibleNotes, sideTime, beatAt, RHYTHM } from './rhythm-core.js';

export const SCREEN_W = 480, SCREEN_H = 360;
export const CELL = 128, FEET = 122, STAND_Y = 290;
export const TV = { x: 106, y: 34, w: 264, h: 148 };
export const LANE_TOP = 20, RECEPTOR_Y = 198, LANE = { x: 190, w: 100 };
export const HALF = { L: { x: LANE.x, w: LANE.w / 2 }, R: { x: LANE.x + LANE.w / 2, w: LANE.w / 2 } };
export const SIDE = { drums: { x: 100, w: 80, rgb: '255,111,168', label: '경섭' }, vocal: { x: 300, w: 80, rgb: '125,255,90', label: '빠맨' } };
export const sideHalf = (sd, lane) => ({ x: lane === 'R' ? sd.x + sd.w / 2 : sd.x, w: sd.w / 2 });
export const NOTE_RGB = '92,226,208', LINE_RGB = '86,204,222';
export const BEAM = { dur: 0.28, rise: 90, rgb: '255,224,102', core: '255,244,180' };
export const HI_COLORS = ['255,110,190', '110,220,255', '255,225,110', '150,255,140'];
export const BREATH_PX = 1;
export const FLOWER_COLORS = ['#ff7bd1', '#ffd166', '#ff5c5c', '#c9a3ff', '#7dff5a'];
export const BACKDROP = 'assets/props/rhythm_backdrop.png', AUDIENCE = 'assets/props/rhythm_audience.png';
// 델타룬 비율(드럼 세트 크게·사람 작게, 셋이 무대 폭 15/46/78%) — rhythm.js BAND 와 같은 값
export const BAND = [
  { id: 'gyeongsub', label: '경섭', color: '#ff6fa8', sheet: 'assets/sprites/band_gyeongsub.png', x: 112, draw: 87 },
  { id: 'hyungsub', label: '형섭', color: '#4fd8ff', sheet: 'assets/sprites/band_hyungsub.png', x: 240, draw: 74 },
  { id: 'ppaman', label: '빠맨', color: '#7dff5a', sheet: 'assets/sprites/band_ppaman.png', x: 372, draw: 76 },
];

/** 무대 이미지(배경·관객·밴드 시트)를 비동기로 담아 두는 그릇. 없으면 null 로 남고 그리기는 폴백을 쓴다 */
export function loadStageImages() {
  const out = { backdrop: null, audience: null, sheets: {} };
  if (typeof Image === 'undefined') return out;
  const grab = (src, set) => { const im = new Image(); im.onload = () => set(im); im.onerror = () => {}; im.src = src; };
  grab(BACKDROP, (i) => { out.backdrop = i; });
  grab(AUDIENCE, (i) => { out.audience = i; });
  for (const b of BAND) grab(b.sheet, (i) => { out.sheets[b.id] = i; });
  return out;
}

const ready = (img) => !!(img && img.complete && img.naturalWidth);

/** 무대 글자(그림자 + 정렬 + 크기) — rhythm.js 의 text() 와 같다 */
export function text(ctx, str, x, y, { color = '#fff', align = 'left', size = F.size, shadow = true, alpha = 1 } = {}) {
  ctx.font = size === F.size ? FONT : FONT.replace(`${F.size}px`, `${size}px`);
  const ga = ctx.globalAlpha; ctx.textBaseline = 'top'; ctx.textAlign = align; ctx.globalAlpha = ga * alpha;
  if (shadow) { ctx.fillStyle = '#000'; ctx.fillText(str, Math.round(x) + 1, Math.round(y) + 1); }
  ctx.fillStyle = color; ctx.fillText(str, Math.round(x), Math.round(y)); ctx.globalAlpha = ga;
}

/**
 * 배경(매달린 스크린·좌우 스피커) + 스크린 내용 + 스포트라이트 빔 + 스트로브·플래시.
 * s: { img, t, live, hi, bar, strobe, flash, screen: { title, artist, noise } }
 *   screen.noise 0~1 = 지지직 양(영상이 없는 곡은 지지직 + 제목 카드)
 */
export function drawBackdrop(ctx, s) {
  const img = s.img;
  if (ready(img)) ctx.drawImage(img, 0, 0, SCREEN_W, SCREEN_H);
  else { ctx.fillStyle = '#0d0818'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); ctx.fillStyle = '#050508'; ctx.fillRect(TV.x, TV.y, TV.w, TV.h); }
  const sc = s.screen;
  if (sc) {
    ctx.fillStyle = '#050508'; ctx.fillRect(TV.x, TV.y, TV.w, TV.h);
    // 매달린 스크린에 비치는 것: 시트 한 칸(영클 TV 얼굴 등) 또는 제목 카드
    if (ready(sc.img) && sc.frame) {
      const f = sc.frame, fit = Math.min(TV.w / f.w, TV.h / f.h), dw = Math.round(f.w * fit), dh = Math.round(f.h * fit);
      const dx = TV.x + Math.round((TV.w - dw) / 2), dy = TV.y + Math.round((TV.h - dh) / 2);
      ctx.drawImage(sc.img, f.x, f.y, f.w, f.h, dx, dy, dw, dh);
      if (sc.glow > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = sc.glow; ctx.drawImage(sc.img, f.x, f.y, f.w, f.h, dx, dy, dw, dh); ctx.restore(); }
    }
    const dots = Math.round((sc.noise ?? 0.35) * 260);
    for (let i = 0; i < dots; i++) { const g = 110 + Math.floor(Math.random() * 140); ctx.fillStyle = `rgba(${g},${g},${g},0.55)`; ctx.fillRect(TV.x + Math.floor(Math.random() * TV.w), TV.y + Math.floor(Math.random() * TV.h), 1 + Math.floor(Math.random() * 3), 1); }
    for (let y = TV.y; y < TV.y + TV.h; y += 3) if ((y * 7 + Math.floor((s.t || 0) * 60)) % 11 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(TV.x, y, TV.w, 1); }
    if (sc.tint > 0) { ctx.fillStyle = `rgba(255,74,74,${Math.min(0.6, sc.tint).toFixed(3)})`; ctx.fillRect(TV.x, TV.y, TV.w, TV.h); }
    if (sc.title) text(ctx, sc.title, SCREEN_W / 2, TV.y + 44, { align: 'center', size: 24, color: '#ffe066' });
    if (sc.artist) text(ctx, `- ${sc.artist} -`, SCREEN_W / 2, TV.y + 84, { align: 'center', color: '#ffffff' });
  }
  // 스포트라이트 빔이 천천히 흔들린다(연주 중엔 밝게, 하이라이트 땐 색색으로 크게 빠르게)
  const live = !!s.live, hi = !!s.hi, a = hi ? 0.28 : live ? 0.16 : 0.05, bar = s.bar || 0, t = s.t || 0;
  for (const [ox, dir, j] of [[40, 1, 0], [440, -1, 1]]) {
    const sway = Math.sin(t * (hi ? 2.8 : live ? 1.6 : 0.5) + dir) * (hi ? 70 : 40);
    const rgb = hi ? HI_COLORS[(((bar + j) % HI_COLORS.length) + HI_COLORS.length) % HI_COLORS.length] : '255,220,150';
    const g = ctx.createLinearGradient(ox, 40, 240 + sway, 300); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox - 6, 44); ctx.lineTo(ox + 6, 44); ctx.lineTo(240 + sway + dir * 90, 300); ctx.lineTo(240 + sway - dir * 30, 300); ctx.closePath(); ctx.fill();
  }
  if (s.strobe > 0) { ctx.fillStyle = `rgba(255,255,255,${(s.strobe * 0.22).toFixed(3)})`; ctx.fillRect(0, 0, SCREEN_W, 130); }
  if (s.flash > 0) { ctx.fillStyle = `rgba(255,240,200,${(s.flash * 0.35).toFixed(3)})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
}

/** 연주자 발밑 바닥 스포트라이트 원(위아래로 떠다니고, 하이라이트 땐 박자에 맞춰 색색으로 펄스). s: { band, t, beat } */
export function drawPools(ctx, s) {
  const bt = s.beat || null;
  (s.band || BAND).forEach((b, i) => {
    const bob = Math.sin((s.t || 0) * 1.15 + i * 2.1) * 6, pulse = bt ? 1 + 0.22 * (1 - bt.phase) : 1;
    const rgb = bt ? HI_COLORS[(((bt.bar + i) % HI_COLORS.length) + HI_COLORS.length) % HI_COLORS.length] : '175,195,255';
    const cx = b.x, cy = STAND_Y - 5 + bob, rx = b.draw * 0.6 * pulse, ry = 12 * pulse;
    ctx.fillStyle = `rgba(${rgb},${bt ? 0.12 : 0.07})`; ctx.beginPath(); ctx.ellipse(cx, cy, rx * 1.5, ry * 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(${rgb},${bt ? 0.3 : 0.18})`; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  });
}

/** 밴드 셋(기본은 숨 쉬듯 1px, 동작 프레임이 있으면 그 칸). s: { sheets, band:[{id,x,draw,frame,y}], beat, hurt } */
export function drawBand(ctx, s) {
  const beat = s.beat || 0, hurt = s.hurt || {};
  for (const b of s.band || BAND) {
    const img = s.sheets?.[b.id], feet = Math.round(b.y ?? STAND_Y), D = b.draw;
    if (ready(img)) {
      const idx = b.frame || 0, dy = idx === 0 ? Math.round(Math.sin(beat * Math.PI) * BREATH_PX) : 0;
      const sx = (idx % 2) * CELL, sy = Math.floor(idx / 2) * CELL, hx = hurt[b.id] > 0 ? Math.round((Math.random() - 0.5) * 5) : 0;
      ctx.drawImage(img, sx, sy, CELL, CELL, Math.round(b.x - D / 2) + hx, feet - Math.round(FEET * D / CELL) + dy, D, D);
    } else { ctx.fillStyle = b.color; ctx.fillRect(b.x - 9, feet - 32, 18, 32); }
  }
}

/** 관객 띠(2프레임, 세로 조각마다 어긋난 숨 / 환호 때 다 같이 점프). s: { img, t, cheering, beat } */
export function drawAudience(ctx, s) {
  const img = s.img, cheering = !!s.cheering, t = s.t || 0;
  const bob = cheering ? Math.round(Math.abs(Math.sin(t * 9)) * 4) : 0;
  if (ready(img)) {
    const fh = img.naturalHeight / 2, sy = cheering ? fh : 0, slices = 15, sw = img.naturalWidth / slices, dw = SCREEN_W / slices, beat = s.beat || 0;
    for (let i = 0; i < slices; i++) {
      const idle = Math.sin(beat * Math.PI * 0.5 + i * 0.85) > 0 ? 1 : 0;
      ctx.drawImage(img, i * sw, sy, sw, fh, Math.round(i * dw), SCREEN_H - 84 - (cheering ? bob : idle), Math.ceil(dw), 90);
    }
    return;
  }
  for (let i = 0; i < 20; i++) {
    const x = i * 25 + 6, phase = i * 0.7, y = SCREEN_H - 6 - (cheering ? Math.abs(Math.sin(t * 10 + phase)) * 8 : Math.sin(t * 2 + phase) * 1.5);
    ctx.fillStyle = i % 2 ? '#0d0a14' : '#161022'; ctx.beginPath(); ctx.arc(x, y - 18, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 12, y - 12, 24, 16);
    if (cheering) { ctx.fillRect(x - 15, y - 30 + Math.sin(t * 12 + phase) * 3, 3, 14); ctx.fillRect(x + 12, y - 30 - Math.sin(t * 12 + phase) * 3, 3, 14); }
  }
}

/** 불꽃(GREAT 노란 불티·무대 양옆 파이로)·색종이·꽃 — rhythm.js 와 같은 색·모양. s: { sparks, confetti, flowers } */
export function drawParticles(ctx, s) {
  for (const c of s.confetti || []) { const flat = Math.floor(c.t * 6 + c.seed) % 2; ctx.fillStyle = c.color; ctx.fillRect(Math.round(c.x), Math.round(c.y), flat ? 3 : 2, flat ? 2 : 3); }
  for (const sp of s.sparks || []) { const k = sp.t / sp.dur; ctx.fillStyle = k < 0.35 ? '#fff6c8' : k < 0.7 ? '#ffc04a' : '#ff7a3c'; ctx.fillRect(Math.round(sp.x), Math.round(sp.y), 2, 2); if (k < 0.5) ctx.fillRect(Math.round(sp.x), Math.round(sp.y) + 2, 1, 2); }
  for (const fl of s.flowers || []) {
    if (fl.t < 0) continue;
    const x = Math.round(fl.x), y = Math.round(fl.y), r = fl.t * 8 + fl.spin;
    ctx.fillStyle = fl.color;
    for (let i = 0; i < 5; i++) { const a = r + i * Math.PI * 2 / 5; ctx.fillRect(x + Math.round(Math.cos(a) * 3), y + Math.round(Math.sin(a) * 3), 2, 2); }
    ctx.fillStyle = '#fff7b0'; ctx.fillRect(x, y, 2, 2);
  }
}

/** 인기(POPU/LARITY) 기둥 둘. s: { pop } */
export function drawMeters(ctx, s) {
  const pop = s.pop ?? RHYTHM.popStart;
  for (const [x, label] of [[74, 'POPU'], [390, 'LARITY']]) {
    text(ctx, label, label === 'POPU' ? x + 12 : x + 4, LANE_TOP - 18, { color: '#6fb3ff', align: label === 'POPU' ? 'right' : 'left' });
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, LANE_TOP, 12, 160); ctx.strokeStyle = '#6fb3ff'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, LANE_TOP + 0.5, 11, 159);
    const h = Math.round(156 * pop); ctx.fillStyle = pop > 0.66 ? '#7dff5a' : pop > 0.33 ? '#ffe066' : '#ff6a6a'; ctx.fillRect(x + 2, LANE_TOP + 158 - h, 8, h);
  }
}

/**
 * 기둥 셋(양옆 자동 패드 + 가운데 플레이 기둥)과 노트·박자선·콤보·판정 글자.
 * s: { chart, play, time, inPlay, held:{L,R}, fx:[{kind:'ring'|'beam'|'sidering',lane,half,t,dur}], judge:{text,color}, judgeT, t, hi, alpha }
 */
export function drawLanes(ctx, s) {
  const { chart, play } = s, inPlay = !!(s.inPlay && chart && play);
  const h = RECEPTOR_Y - LANE_TOP + 16, span = RECEPTOR_Y - LANE_TOP, cx = LANE.x + LANE.w / 2;
  const time = inPlay ? s.time : 0, fx = s.fx || [], held = s.held || {}, t = s.t || 0;
  ctx.globalAlpha = s.alpha ?? 1;
  const bt = inPlay ? beatAt(chart, time) : null;
  const beatLines = (x, w) => {
    if (!bt) return;
    for (let b = Math.floor(bt.beat); ; b++) {
      const k = ((chart.offset || 0) + b * bt.len - time) / RHYTHM.approach;
      if (k > 1) break;
      if (k < 0) continue;
      const bar = ((b % 4) + 4) % 4 === 0, y = Math.round(RECEPTOR_Y - k * span);
      ctx.fillStyle = `rgba(255,255,255,${bar ? 0.7 : 0.32})`; ctx.fillRect(x + 2, y, w - 4, bar ? 2 : 1);
    }
  };
  const clipTo = (x, w) => { ctx.save(); ctx.beginPath(); ctx.rect(x, LANE_TOP, w, h); ctx.clip(); };
  // 양옆 자동 패드(경섭 드럼 | 빠맨 보컬): 좁은 기둥, 같은 박자선, 자동 노트가 판정선에서 반짝
  for (const [key, sd] of Object.entries(SIDE)) {
    ctx.fillStyle = 'rgba(0,0,0,0.84)'; ctx.fillRect(sd.x, LANE_TOP, sd.w, h);
    beatLines(sd.x, sd.w);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(sd.x + sd.w / 2, LANE_TOP, 1, h);
    ctx.fillStyle = `rgba(${sd.rgb},0.9)`; ctx.fillRect(sd.x, LANE_TOP, 2, h); ctx.fillRect(sd.x + sd.w - 2, LANE_TOP, 2, h); ctx.fillRect(sd.x, RECEPTOR_Y + 8, sd.w, 3);
    for (const lane of ['L', 'R']) { const hf = sideHalf(sd, lane); ctx.strokeStyle = `rgba(${sd.rgb},0.4)`; ctx.lineWidth = 1; ctx.strokeRect(hf.x + 5.5, RECEPTOR_Y - 4.5, hf.w - 11, 9); }
    text(ctx, sd.label, sd.x + sd.w / 2, LANE_TOP - 18, { align: 'center', color: `rgb(${sd.rgb})` });
    if (!inPlay) continue;
    clipTo(sd.x, sd.w);
    for (const it of chart.side?.[key] || []) {
      const at = sideTime(it), k = (at - time) / RHYTHM.approach; if (k < -0.05 || k > 1.05) continue;
      const hf = sideHalf(sd, it.lane || 'L'), y = Math.round(RECEPTOR_Y - k * span);
      ctx.fillStyle = `rgba(${sd.rgb},${(0.6 + 0.38 * (1 - Math.max(0, k))).toFixed(2)})`; ctx.fillRect(hf.x + 5, y - 4, hf.w - 10, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(hf.x + 5, y - 4, hf.w - 10, 2);
    }
    for (const f of fx) if (f.kind === 'sidering' && f.lane === key) { const hf = sideHalf(sd, f.half), k = f.t / f.dur; ctx.strokeStyle = `rgba(255,255,255,${(1 - k).toFixed(2)})`; ctx.lineWidth = 2; ctx.strokeRect(hf.x + 5 - k * 5, RECEPTOR_Y - 4 - k * 5, hf.w - 10 + k * 10, 8 + k * 10); }
    ctx.restore();
  }
  text(ctx, '형섭', cx, LANE_TOP - 18, { align: 'center', color: '#4fd8ff' });
  ctx.fillStyle = 'rgba(0,0,0,0.84)'; ctx.fillRect(LANE.x, LANE_TOP, LANE.w, h);
  if (inPlay) {
    if (play.combo >= 2) {
      const bump = s.judge && s.judge.text !== 'MISS' ? Math.max(0, 1 - (s.judgeT || 0) * 4) * 4 : 0;
      text(ctx, String(play.combo), cx, RECEPTOR_Y - 104 - bump, { align: 'center', size: 40, color: 'rgba(255,255,255,0.2)', shadow: false });
      text(ctx, 'COMBO', cx, RECEPTOR_Y - 58, { align: 'center', color: 'rgba(255,255,255,0.2)', shadow: false });
    }
    beatLines(LANE.x, LANE.w);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(cx, LANE_TOP, 1, h);
  const glow = s.hi ? 0.7 + 0.3 * Math.abs(Math.sin(t * 6)) : 0.95;
  ctx.fillStyle = `rgba(${LINE_RGB},${glow})`; ctx.fillRect(LANE.x, LANE_TOP, 2, h); ctx.fillRect(LANE.x + LANE.w - 2, LANE_TOP, 2, h);
  ctx.fillStyle = `rgba(${LINE_RGB},0.95)`; ctx.fillRect(LANE.x, RECEPTOR_Y + 8, LANE.w, 3);
  for (const lane of ['L', 'R']) {
    const hf = HALF[lane], on = inPlay && held[lane];
    ctx.strokeStyle = `rgba(${NOTE_RGB},${on ? 0.95 : 0.4})`; ctx.lineWidth = on ? 2 : 1; ctx.strokeRect(hf.x + 5.5, RECEPTOR_Y - 5.5, hf.w - 11, 11);
  }
  text(ctx, '◀', HALF.L.x + HALF.L.w / 2, RECEPTOR_Y + 13, { align: 'center', color: '#9fe8ff', shadow: false });
  text(ctx, '▶', HALF.R.x + HALF.R.w / 2, RECEPTOR_Y + 13, { align: 'center', color: '#9fe8ff', shadow: false });
  ctx.globalAlpha = 1;
  if (!inPlay) return;
  clipTo(LANE.x, LANE.w);
  for (const { note, k, kEnd } of visibleNotes(play, time)) {
    const hf = HALF[note.lane], nx = hf.x + 5, nw = hf.w - 10;
    const y = RECEPTOR_Y - k * span, yEnd = RECEPTOR_Y - kEnd * span;
    const dead = note.status === 'miss', col = dead ? '110,110,120' : NOTE_RGB, holding = note.status === 'holding';
    if (note.dur) {
      const top = Math.max(LANE_TOP, yEnd), bottom = Math.min(RECEPTOR_Y + 5, holding ? RECEPTOR_Y : y), th = Math.max(0, Math.round(bottom - top));
      ctx.fillStyle = `rgba(${col},${holding ? 0.8 : 0.45})`; ctx.fillRect(nx + 4, Math.round(top), nw - 8, th);
      ctx.strokeStyle = holding ? 'rgba(255,255,255,0.95)' : `rgba(${col},0.9)`; ctx.lineWidth = 1; ctx.strokeRect(nx + 4.5, Math.round(top) + 0.5, nw - 9, th);
      ctx.fillStyle = `rgba(${col},0.95)`; ctx.fillRect(nx, Math.round(yEnd) - 4, nw, 8);
    }
    if (note.status === 'wait' || note.status === 'miss') {
      ctx.fillStyle = `rgba(${col},0.98)`; ctx.fillRect(nx, Math.round(y) - 5, nw, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(nx, Math.round(y) - 5, nw, 2);
    }
  }
  // GREAT 빔: 판정 칸이 노랗게 켜지고 칸 위로 짧은 노란 빔이 튀어 올랐다 사라진다
  for (const f of fx) if (f.kind === 'beam') {
    const hf = HALF[f.lane], k = f.t / f.dur, a = 1 - k, mid = hf.x + hf.w / 2;
    ctx.fillStyle = `rgba(${BEAM.rgb},${(0.9 * a).toFixed(2)})`; ctx.fillRect(hf.x + 5, RECEPTOR_Y - 5, hf.w - 10, 10);
    const headY = RECEPTOR_Y - 5 - k * BEAM.rise, tailY = RECEPTOR_Y - 5 - k * BEAM.rise * 0.45, bh = Math.max(2, Math.round(tailY - headY) + 4);
    const w = Math.max(4, Math.round((hf.w - 14) * (1 - k * 0.5)));
    ctx.fillStyle = `rgba(${BEAM.rgb},${(0.45 * a).toFixed(2)})`; ctx.fillRect(Math.round(mid - w / 2), Math.round(headY), w, bh);
    ctx.fillStyle = `rgba(${BEAM.core},${(0.9 * a).toFixed(2)})`; ctx.fillRect(Math.round(mid - w / 4), Math.round(headY), Math.round(w / 2), bh);
    ctx.fillStyle = `rgba(255,255,255,${(0.9 * a).toFixed(2)})`; ctx.fillRect(Math.round(mid) - 1, Math.round(headY), 3, Math.min(6, bh));
  }
  ctx.restore();
  for (const f of fx) if (f.kind === 'ring') { const hf = HALF[f.lane], k = f.t / f.dur; ctx.strokeStyle = `rgba(255,255,255,${(1 - k).toFixed(2)})`; ctx.lineWidth = 2; ctx.strokeRect(hf.x + 5 - k * 6, RECEPTOR_Y - 5 - k * 6, hf.w - 10 + k * 12, 10 + k * 12); }
  if (s.judge) { const k = (s.judgeT || 0) / 0.5; text(ctx, s.judge.text, cx, RECEPTOR_Y - 34 - k * 10, { align: 'center', size: 16, color: s.judge.color, alpha: 1 - k * 0.6 }); }
}
