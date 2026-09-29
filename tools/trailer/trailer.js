// 트레일러 렌더러(BUILD408, 사용자 2026-09-29 “트레일러 영상 — 델타룬 챕터 3&4 트레일러(nvcDm63PjsI) 음원 기반”).
// window.renderAt(t) 가 t초의 한 프레임을 1280×720 에 그린다(결정적 — 같은 t 는 같은 그림). tools/trailer/render.mjs 가 30fps 로 받아 간다.
// 구간: 인트로(0–16) 섭냥이 3D + “출 시 임 박.” / 만남(16–31.4) 요플래·억빠맨·김경섭·쥰희·용준 / 로고(50.9–끝) 타이틀처럼 떨리며 + “개발완료.”
// 몽타주(31.4–50.9)는 게임 녹화라 여기서 그리지 않는다(검은 프레임).
import { bakeLogo } from '../../src/ui/title.js';
import { characterSprite } from '../../src/world/world.js';

const W = 1280, H = 720;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const SRC = '../../assets/source/trailer408/';
const FONT = '"NeoDunggeunmo", "Galmuri11", monospace';

// 음원 박자(ref 분석): 출·시·임·박 = 8.37 / 8.83 / 9.29 / 9.75
export const T = {
  cardEnd: 1.5, dogIn: 2.5, closeAt: 7.35, beats: [8.37, 8.83, 9.29, 9.75], rowAt: 10.4, logoAt: 11.0, lieAt: 13.3, introEnd: 15.6,
  heroIn: 17.4, heroColor: 18.8, heroWalk: 19.5,
  meets: [
    { ids: ['ppaman'], color: '#ff6ec7', in: 21.0, meet: 22.3 },
    { ids: ['gyeongsub'], color: '#5dff7a', in: 23.6, meet: 24.9 },
    { ids: ['junhee', 'yongjun'], color: '#ffd23f', in: 25.8, meet: 27.1 },
  ],
  mapIn: 27.4, bigLogo: 28.5, white: 29.52, whiteEnd: 31.4,
  montage: [31.4, 50.9], outro: 50.9, logoZoom: 2.4, doneAt: 55.4, end: 61.13,
};

const img = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
const A = {};
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = k => 1 - Math.pow(1 - clamp(k), 3);
const smooth = k => { k = clamp(k); return k * k * (3 - 2 * k); };
// 결정적 흔들림(타이틀의 Math.random 대신 t 기반 해시)
const jitter = (t, s) => { const x = Math.sin(t * 91.7 + s * 12.9) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };

async function load() {
  for (const n of ['full', 'close', 'cheer', 'lie', 'hand1', 'hand2', 'hand3', 'hand4']) A[n] = await img(`${SRC}gen/${n}.png`);
  A.map = await img(`${SRC}clips/meetbg.png`);
  A.logo = bakeLogo();
  // 흰 로고(빨간 카드 위)
  const l = A.logo, c = document.createElement('canvas'); c.width = l.width; c.height = l.height;
  const x = c.getContext('2d'); x.drawImage(l, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  A.logoWhite = c;
  A.sprites = {};
  for (const id of ['hyungsub', 'ppaman', 'gyeongsub', 'junhee', 'yongjun']) {
    const sheet = await img(`../../assets/sprites/${id}.png`);
    A.sprites[id] = characterSprite(id, sheet);
  }
  await document.fonts.load(`40px "NeoDunggeunmo"`);
}

/** 3D 사진(검은 배경)을 가운데 기준으로 그린다 */
function photo(im, cx, cy, h, rot = 0, alpha = 1) {
  if (!im) return;
  const w = h * im.width / im.height;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
}

function text(s, x, y, size, color = '#fff', align = 'center', alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.font = `${size}px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(s, Math.round(x), Math.round(y)); ctx.restore();
}

function logo(im, cx, cy, scale, jx = 0, jy = 0, alpha = 1) {
  const w = Math.round(im.width * scale), h = Math.round(im.height * scale);
  ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, Math.round(cx - w / 2 + jx), Math.round(cy - h / 2 + jy), w, h); ctx.restore();
}

const WORD = ['출', '시', '임', '박.'];
/** “출 시 임 박.” — n 글자까지(마지막 글자는 pop) */
function row(t, cx, cy, size, gap) {
  WORD.forEach((ch, i) => {
    const at = T.beats[i]; if (t < at) return;
    const pop = 1 + 0.35 * (1 - ease((t - at) / 0.18));
    ctx.save(); ctx.translate(cx + (i - 1.5) * gap, cy); ctx.scale(pop, pop); text(ch, 0, 0, size); ctx.restore();
  });
}

/** 캐릭터 한 프레임(걷기 4프레임) — 실루엣 색이 있으면 그 색 단색 */
function actor(id, x, feetY, dir, frame, scale, tint = null, tintK = 1) {
  const set = A.sprites[id]; if (!set) return;
  const fr = set[dir][frame % set[dir].length] || set.down[0];
  const w = fr.width / set.px * scale, h = fr.height / set.px * scale;
  const X = Math.round(x - w / 2), Y = Math.round(feetY - h);
  ctx.imageSmoothingEnabled = false;
  if (!tint || tintK <= 0) { ctx.drawImage(fr, X, Y, w, h); return; }
  const c = actor.buf || (actor.buf = document.createElement('canvas'));
  c.width = fr.width; c.height = fr.height;
  const b = c.getContext('2d'); b.clearRect(0, 0, c.width, c.height); b.drawImage(fr, 0, 0);
  b.globalCompositeOperation = 'source-atop'; b.globalAlpha = tintK; b.fillStyle = tint; b.fillRect(0, 0, c.width, c.height);
  b.globalCompositeOperation = 'source-over'; b.globalAlpha = 1;
  ctx.drawImage(c, X, Y, w, h);
}

function intro(t) {
  if (t < T.cardEnd) {
    // 딸깍 카드(0.56s 딸깍에 한 번 튄다)
    ctx.fillStyle = '#e60012'; ctx.fillRect(0, 0, W, H);
    const pop = t < 0.56 ? 0.9 : 1 + 0.08 * (1 - ease((t - 0.56) / 0.25));
    logo(A.logoWhite, W / 2, H / 2, 1.6 * pop);
    return;
  }
  if (t < T.closeAt) {
    // 멀리서 걸어오는 섭냥이: 점 → 화면 절반
    if (t < T.dogIn) return;
    const k = (t - T.dogIn) / (T.closeAt - T.dogIn);
    const h = 720 * (0.02 + 0.6 * Math.pow(k, 2.4));
    const bob = Math.abs(Math.sin(t * Math.PI * 2.2)) * h * 0.04;
    photo(A.full, W / 2, 300 + k * 60 - bob, h, Math.sin(t * Math.PI * 2.2) * 0.05, smooth((t - T.dogIn) / 0.4));
    return;
  }
  if (t < T.rowAt) {
    // 클로즈업: 아래에서 올라와 천천히 다가온다 + 박자마다 손과 글자
    const k = (t - T.closeAt) / (T.rowAt - T.closeAt);
    const rise = 1 - ease((t - T.closeAt) / 0.35);
    const w = W * (1.05 + 0.08 * k), h = w * A.close.height / A.close.width;
    photo(A.close, W / 2, H - h / 2 + h * 0.2 + rise * 300, h);
    const hands = [[170, 580], [360, 610], [920, 610], [1110, 580]];
    T.beats.forEach((at, i) => {
      if (t < at) return;
      const p = ease((t - at) / 0.16), wig = Math.sin((t - at) * 9 + i) * 0.04;
      photo(A[`hand${i + 1}`], hands[i][0], hands[i][1] + (1 - p) * 260, 250, (i < 2 ? -0.12 : 0.12) + wig);
    });
    row(t, W / 2, 96, 78, 190);
    return;
  }
  if (t < T.introEnd) {
    // 가운데 줄 + 로고 + 작은 섭냥이(만세 → 벌러덩)
    row(t, W / 2, 420, 54, 132);
    if (t >= T.logoAt) logo(A.logo, W / 2, 300, 1.4 * (1 + 0.12 * (1 - ease((t - T.logoAt) / 0.25))));
    if (t < T.lieAt) {
      const bob = Math.abs(Math.sin((t - T.rowAt) * Math.PI * 2)) * 10;
      photo(A.cheer, W / 2, 580 - bob, 200);
    } else {
      const k = ease((t - T.lieAt) / 0.35);
      photo(A.lie, W / 2 - 20, 600 + (1 - k) * -20, 150, (1 - k) * -0.5);
    }
  }
}

function meet(t) {
  const S = 4.4, feet = 520, lead = 700 + 60 * smooth((t - T.heroWalk) / 2.5);
  const walking = t >= T.heroWalk, frame = walking ? Math.floor(t * 7) : 0;
  // 파티 줄(합류 순서대로 뒤로 70px 간격)
  const party = [], HOP = 0.5;
  T.meets.forEach(m => { if (t >= m.meet) party.push(...m.ids); });
  // 사용자 2026-09-29 “합류할 때 끊기는데 점프 한 번 하고 합류되게”: 만난 자리 → 줄 뒤 자리로 포물선
  const hopping = id => { const m = T.meets.find(x => x.ids.includes(id)); return m && t < m.meet + HOP ? m : null; };
  // 다 모이면(gather) 위로 걷는다 — 사용자 2026-09-29 “주인공들 모였을 때 걷는 거 위로”: 세로 한 줄, 배경(벚꽃 숲 3 세로 길)이 아래로 흐른다
  const gather = T.meets.at(-1).meet + HOP + 0.05;
  if (t >= gather) {
    if (A.map) {
      const h = A.map.height * W / A.map.width, off = ((t - gather) * 150) % h;
      ctx.save(); ctx.globalAlpha = 0.6 * smooth((t - gather) / 0.8); ctx.imageSmoothingEnabled = false;
      for (let y = off - h; y < H; y += h) ctx.drawImage(A.map, 0, Math.round(y), W, Math.round(h) + 1);
      ctx.restore();
    }
    const upFrame = Math.floor(t * 7), order = ['hyungsub', ...party];
    // 뒤(아래)에서부터 그려 앞사람이 위에 오게
    for (let i = order.length - 1; i >= 0; i--) actor(order[i], W / 2, 400 + i * 78, 'up', upFrame + i, S);
  } else {
    // 줄 선 동료: 뒤로
    party.slice().reverse().forEach((id, k) => {
      const i = party.length - 1 - k, slot = lead - 132 * (i + 1), m = hopping(id);
      if (!m) { actor(id, slot, feet, 'right', frame + i + 1, S); return; }
      const j = m.ids.indexOf(id), from = lead + 170 + j * 120, k2 = smooth((t - m.meet) / HOP);
      actor(id, from + (slot - from) * k2, feet - Math.sin(Math.PI * clamp((t - m.meet) / HOP)) * 110, 'left', 1, S);
    });
    // 주인공: 실루엣(하늘색) → 색
    if (t >= T.heroIn) {
      const a = smooth((t - T.heroIn) / 0.6);
      ctx.save(); ctx.globalAlpha = a;
      actor('hyungsub', lead, feet, walking ? 'right' : 'left', frame, S, '#19a8ff', 1 - smooth((t - T.heroColor) / 0.5));
      ctx.restore();
    }
  }
  // 큰 로고
  if (t >= T.bigLogo) {
    const k = ease((t - T.bigLogo) / 0.3);
    logo(A.logo, W / 2, 200, 2.1 * (1.15 - 0.15 * k), 0, 0, k);
  }
  // 흰 화면(가운데 빨간 하트)
  if (t >= T.white) {
    const k = smooth((t - T.white) / 0.45);
    ctx.fillStyle = `rgba(255,255,255,${k})`; ctx.fillRect(0, 0, W, H);
    if (t > T.white + 0.5) { ctx.fillStyle = '#e1102b'; heart(W / 2, H / 2, 14); }
  }
}

function heart(cx, cy, s) {
  const px = [[1, 0], [2, 0], [4, 0], [5, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [2, 4], [3, 4], [4, 4], [3, 5]];
  const u = s / 3;
  for (const [x, y] of px) ctx.fillRect(Math.round(cx + (x - 3.5) * u), Math.round(cy + (y - 3) * u), Math.ceil(u), Math.ceil(u));
}

function outro(t) {
  const lt = t - T.outro;
  // 타이틀과 같은 확대(ease-out 0.15→1, 2.4s) + 흔들림(1→4, 박힌 뒤 4에서 초당 14씩 감쇠)
  let scale, shake, alpha;
  if (lt < T.logoZoom) { const k = lt / T.logoZoom; scale = 0.15 + 0.85 * ease(k); shake = 1 + k * 3; alpha = clamp(lt / 0.4); }
  else { scale = 1; shake = Math.max(0, 4 - (lt - T.logoZoom) * 14); alpha = 1; }
  const S = 2.4;
  logo(A.logo, W / 2, H * 0.42, S * scale, Math.round(jitter(t, 1) * shake * S), Math.round(jitter(t, 2) * shake * S), alpha);
  // 개발완료. — 한 글자씩 천천히
  const s = '개발완료.';
  const step = 0.7;
  ctx.save(); ctx.font = `60px ${FONT}`; const full = ctx.measureText(s).width; ctx.restore();
  let x = W / 2 - full / 2;
  [...s].forEach((ch, i) => {
    ctx.save(); ctx.font = `60px ${FONT}`; const w = ctx.measureText(ch).width; ctx.restore();
    const a = smooth((t - T.doneAt - i * step) / 0.9);
    if (a > 0) text(ch, x + w / 2, H * 0.68, 60, '#fff', 'center', a);
    x += w;
  });
}

window.renderAt = t => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (t < 16.5) intro(t);
  else if (t < T.montage[0]) meet(t);
  else if (t < T.outro) { /* 몽타주: 게임 녹화 */ }
  else outro(t);
};
window.TRAILER = T;
load().then(() => { window.trailerReady = true; window.renderAt(Number(new URLSearchParams(location.search).get('t') || 9.9)); });
