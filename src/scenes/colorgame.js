// 색깔 기억 게임 1인칭 씬(BUILD198) — 사용자 2026-09-16 브리핑(파피 플레이타임 2 뮤지컬 메모리 느낌, 참고 https://www.youtube.com/watch?v=-FfZmCpW0PE 9:40~11:00).
// 컷신 노드 { scene3d: 'colorgame', flag } 로 실행(용광로 광장 조작 패널 C → 검게 → 여기서 페이드인). 규칙은 colorgame-core.js(순수), 여기는 진행·그리기·소리·마우스·대사.
//   화면(480×360): 위 282px 는 1인칭으로 본 용광로 — 뒷벽(용광로 배경) 앞에 용암 웅덩이가 원근으로 펼쳐지고 앞엔 짧은 철 울타리, 오른쪽엔 쥰희·용준이 든 밧줄 철창(좌우 데롱데롱),
//   영클 TV 가 모니터암을 타고 천천히 가운데로 내려온다(여기서 색을 보여준다). 아래 78px 는 조작 콘솔: 왼쪽 아래 김형섭 얼굴(스타크래프트 초상 칸), 빨·주·노·초·파·남·보 버튼 7개(마우스로 누른다),
//   오른쪽 아래 카메라 모니터(마지막 판에만 페이드인 — 사용자 지정 영상 12:58~13:02 얼빡 구간을 소리 없이 정사각형으로 반복).
//   흐름: (브금 꺼진 채) 페이드인 — 쥰희 철창만 데롱데롱 → TV 드르르륵 내려옴 → 켜지며 영클 먼저(튜토리얼 대사 원문: ㅎㅇ / 튜토리얼 따위는 필요없고 / 부르는 색깔 그대로 / 제한시간안에 그를 살려라 / 준비~~ / 시작~~~!)
//   → 2초 뒤 화면 꺼짐 → 1판부터: TV 가 색을 로봇 음성과 함께 1초에 하나씩 보여줌(화면은 그 색, 가운데 글자) → 입력 차례(제한 시간 = 철창이 천천히 내려감) → 순서대로 누르면 철창이 드르륵 올라가고 다음 판
//   → 8판(광기): 이상한 말(하트·nasdf·pi·레전드·응아잇어)을 빠르게 섞어 계속 말하고 오른쪽 아래 카메라가 나온다 → 3초 뒤 느낌표 버튼이 좌우로 역동적으로 움직인다 → 누르면 딸깍.. 삐요오오오옹
//   → 주변 폭발(꾸와아앙 = 델타룬 `furnace_blast`, 사용자가 고르는 중 — assets/source/furnace198/audio/README.md) → TV 켜지며 영클 “오 ㅅㅂ 이게 머노 / 정지 정지 장비를 정지 / 안대잔아 씨바”(폭발 계속) → 쥰희 “하하 꼴좋다 쓰레기색기” → 큰 폭발, 철창이 삐요옹 위로 날아감 → 페이드아웃 → 맵(뒤는 furnace_panel 컷신).
//   틀리거나 시간 초과면 실패 → C 로 1판부터 다시. Esc 로 나감(브금 복귀). 마우스: 형섭 손이 커서를 따라다니고 클릭하면 검지가 눌린다(사용자 “형섭 손 같은 게 눌러지는 것”).
import { Input } from '../core/input.js';
import { FONT, F } from '../ui/font.js';
import { SCREEN_W, SCREEN_H } from '../world/world.js';
import { COLORS, STAGES, RULES, makeRound, stepRound, pressRound, passRound, passReady, answerProgress, wordOf } from './colorgame-core.js';
import { YOUNGCLE_TV } from '../data/youngcle-tv.js';

const ASSETS = {
  backdrop: 'assets/backdrops/youngcle_furnace.png', lava: 'assets/tiles/lava.png', fence: 'assets/props/iron_fence_short.png',
  cage: 'assets/props/lava_cage.png', junhee: 'assets/sprites/junhee.png', yongjun: 'assets/sprites/yongjun.png',
  tv: 'assets/props/youngcle_tv_frame.png', arm: 'assets/props/tv_arm.png', blast: 'assets/fx/explosion.png',
  handPoint: 'assets/props/hand_point.png', handPress: 'assets/props/hand_press.png', portrait: 'assets/portraits/hyungsub.png',
};
const FACE_KEYS = ['smirk', 'laugh', 'shock', 'yes', 'taunt', 'greet', 'oh'];
const SPEAKERS = { youngcle: { label: '영클', color: '#ffe066', voice: 'youngcle' }, junhee: { label: '쥰희', color: '#ff9ad5', voice: 'junhee' } };
// 대사 원문(사용자 2026-09-16). face = 그 줄 동안 TV 에 뜨는 영클 그림
const TALK_INTRO = [
  { who: 'youngcle', face: 'greet', text: 'ㅎㅇ' },
  { who: 'youngcle', face: 'smirk', text: '자 그러면 튜토리얼 따위는 필요없고' },
  { who: 'youngcle', face: 'smirk', text: '내가 부르는 색깔 그대로 누르면 됨 ㅇㅇ' },
  { who: 'youngcle', face: 'taunt', text: '제한시간안에, 그를 살려라' },
  { who: 'youngcle', face: 'laugh', text: '준비~~' },
  { who: 'youngcle', face: 'yes', text: '시작 ~~~!' },
];
const TALK_BLOWUP = [
  { who: 'youngcle', face: 'shock', text: '오 ㅅㅂ 이게 머노' },
  { who: 'youngcle', face: 'oh', text: '정지 정지 장비를 정지' },
  { who: 'youngcle', face: 'shock', text: '안대잔아 씨바' },
  { who: 'junhee', text: '하하 꼴좋다 쓰레기색기' },
];
// 레이아웃: 위 282px 용광로 / 아래 78px 콘솔(초상 68 · 버튼 7 × 36 · 카메라 92)
const SCENE_H = 282;
const CONSOLE = { y: 282, h: 78 };
const BTN = { x0: 86, y: 296, w: 36, h: 34, gap: 6 };
const PORTRAIT = { x: 8, y: 286, w: 68, h: 70 };
const CAM = { x: 382, y: 262, w: 92, h: 92, fade: 1.8 };
const TV = { scale: 0.75, cx: 240, restY: 26, startY: -230, dropDur: 3.4, inset: YOUNGCLE_TV.inset };   // 프레임 288×176 → 216×132, 화면 inset [15,29,258,119]
const POOL = { farY: 168, nearY: 262, farX0: 118, farX1: 362 };
const FENCE = { y: 246, scale: 1.5 };
const CAGE = { x: 356, y0: -70, scale: 0.8, drop: 44, sway: 6, period: 2.6 };   // 136×360 → 109×288, 철창 밑 y0+288=218 → 제한 시간이 다 되면 용암(262)에 닿는다
const HAND = { tipX: 18, tipY: 2, press: 0.2 };
const BANG = { r: 24, cx: 240, y: 118, swing: 150, speed: 2.9 };   // 느낌표 버튼: 좌우로 역동적으로
const BLAST = { cols: 31, fw: 85, fh: 128, fps: 20, every: 0.3 };
const TALKBOX = { x: 16, y: 260, w: 448, h: 92 };
const CLEAR_HOLD = 1.15, POWER_ON = 0.8, COUNTDOWN = 2.0, FLICKER = 0.09, CHAR_DELAY = 0.035;
const MIX = { voice: 0.95, click: 0.55, tone: 0.22, blast: 0.5, bigBlast: 0.95 };

function loadImage(src) {
  const img = new Image();
  const done = new Promise((resolve) => { img.onload = () => resolve(img); img.onerror = () => resolve(null); });
  img.src = src;
  return { img, done };
}
const ready = (h) => h && h.img && h.img.complete && h.img.naturalWidth > 0;
function makeOverlay(game) {
  const root = document.createElement('div');
  root.id = 'colorgame';
  Object.assign(root.style, { position: 'fixed', left: '0', top: '0', width: '0', height: '0', opacity: '0', transition: 'opacity 1.2s ease', zIndex: '10', overflow: 'hidden', background: '#000', cursor: 'none' });
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_W; canvas.height = SCREEN_H;
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' });
  root.appendChild(canvas);
  document.body.appendChild(root);
  const fit = () => { const r = game.canvas.getBoundingClientRect(); Object.assign(root.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }); };
  return { root, canvas, fit };
}
class Typewriter {
  constructor(sound) { this.sound = sound; this.text = ''; this.shown = 0; this.timer = 0; this.voice = 'narrator'; }
  start(text, voice) { this.text = text; this.shown = 0; this.timer = 0; this.voice = voice; }
  get done() { return this.shown >= this.text.length; }
  skip() { this.shown = this.text.length; }
  update(dt) {
    if (this.done) return;
    this.timer += dt;
    while (this.timer >= CHAR_DELAY && !this.done) { this.timer -= CHAR_DELAY; this.shown += 1; if (this.text[this.shown - 1] !== ' ') this.sound.blip(this.voice); }
  }
  get visible() { return this.text.slice(0, this.shown); }
}
const easeOut = k => 1 - Math.pow(1 - k, 3);
const buttonRect = (i) => ({ x: BTN.x0 + i * (BTN.w + BTN.gap), y: BTN.y, w: BTN.w, h: BTN.h });
const hitButton = (x, y) => { for (let i = 0; i < COLORS.length; i++) { const r = buttonRect(i); if (x >= r.x - 2 && x < r.x + r.w + 2 && y >= r.y - 2 && y < r.y + r.h + 2) return i; } return -1; };
const bangPos = (t) => ({ x: BANG.cx + Math.sin(t * BANG.speed) * BANG.swing, y: BANG.y + Math.sin(t * BANG.speed * 2.3) * 10 });

export function run(game, node = {}) {
  return new Promise((resolve) => {
    const ov = makeOverlay(game);
    const ctx = ov.canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const img = Object.fromEntries(Object.entries(ASSETS).map(([k, src]) => [k, loadImage(src)]));
    const faces = Object.fromEntries(FACE_KEYS.map(k => [k, loadImage(YOUNGCLE_TV.expressions[k])]));
    const sound = game.sound;
    const sfx = (name, volume = 0.7, rate = 1) => sound.sfx(name, { volume, rate });
    const voiceNames = STAGES.flat().filter((id, i, a) => a.indexOf(id) === i).map(id => `color_${id}`);
    sound.loadSfxFiles([...voiceNames, 'furnace_blast']).catch(() => {});
    const typer = new Typewriter(sound);
    // 카메라 영상(마지막 판): 소리 없이 반복
    const cam = document.createElement('video');
    cam.src = RULES.camVideo; cam.loop = true; cam.muted = true; cam.playsInline = true; cam.preload = 'auto'; cam.style.display = 'none';
    document.body.appendChild(cam);

    const state = {
      t: 0, phase: 'enter', phaseT: 0, exiting: false,
      tvY: TV.startY, tvOn: 0, screen: { kind: 'off' }, screenT: 0, face: 'smirk', talk: null, clickTalk: false,
      stage: 0, round: null, over: null, wins: 0,
      buttons: COLORS.map(() => ({ lit: 0, down: 0 })),
      mouse: { x: -100, y: -100, inside: false }, hand: { press: 0 },
      cage: { drop: 0, target: 0, jolt: 0, fly: 0, flyV: 0 }, portrait: { kind: 'idle', t: 0 }, flash: 0, shake: 0,
      camAlpha: 0, camOn: false, embers: [], bubbles: [], lavaT: 0, glitch: 0,
      bang: null, blasts: [], blasting: false, blastT: 0, blowup: null,
    };
    const prev = Object.create(null);
    const edge = (action) => { const down = Input.down(action) || !!Input.pressed[action]; const just = down && !prev[action]; prev[action] = down; return just; };

    const finish = (found) => {
      if (state.exiting) return; state.exiting = true;
      try { cam.pause(); } catch (e) { /* */ } cam.remove();
      // 통과(폭발)로 나가면 뒤 컷신이 브금을 잡는다. Esc 로 나가면 맵 브금 복귀
      if (!found) sound.resumeBgm(0.6);
      ov.root.style.transition = 'opacity 0.6s ease'; ov.root.style.opacity = '0';
      setTimeout(() => { cancelAnimationFrame(raf); removeEventListener('resize', ov.fit); ov.root.remove(); delete window.__colorgame; resolve({ found }); }, 620);
    };
    const setScreen = (kind, extra = {}) => { state.screen = { kind, ...extra }; state.screenT = 0; };
    const camShow = (on) => {
      state.camOn = on;
      if (on) { try { cam.currentTime = 0; } catch (e) { /* */ } cam.play().catch(() => {}); sfx('static_burst', 0.4); }
    };
    // 대사(영클/쥰희): C 나 클릭으로 넘긴다. face 가 있으면 TV 에 그 그림
    const talkLine = (l) => { typer.start(l.text, SPEAKERS[l.who].voice); if (l.face) { state.face = l.face; setScreen('face'); } };
    const startTalk = (lines, next) => { state.phase = 'talk'; state.phaseT = 0; state.talk = { lines, i: 0, next }; talkLine(lines[0]); };
    const advanceTalk = () => { const tk = state.talk; tk.i += 1; if (tk.i >= tk.lines.length) { state.talk = null; tk.next(); return; } talkLine(tk.lines[tk.i]); };
    // 판 시작: TV 가 색을 부르기 시작한다. 마지막 판이면 카메라
    const startStage = (stage) => {
      state.stage = stage; state.round = makeRound(stage); state.over = null; state.phase = 'round'; state.phaseT = 0; state.bang = null;
      setScreen('dark'); state.portrait = { kind: 'idle', t: 0 };
      if (state.round.chaos && !state.camOn) camShow(true);
    };
    const retry = () => { sfx('confirm', 0.6); state.camOn = false; state.camAlpha = 0; state.cage.drop = 0; state.cage.target = 0; startStage(0); };
    const fail = (why) => {
      state.over = why; state.phase = 'fail'; state.phaseT = 0; state.face = 'laugh'; setScreen('face');
      sfx('error', 0.8); state.flash = 0.5; state.shake = 0.45; state.portrait = { kind: 'bad', t: 0 };
      if (why === 'timeout') { state.cage.jolt = 0.5; sfx('chain_extend', 0.6); }
    };
    // 판 통과: 철창이 드르륵 위로 되돌아간다(사용자 “한 라운드 클리어마다 다시 위로”)
    const clearStage = () => {
      sfx('great_shine', 0.55); state.face = 'yes'; setScreen('face'); state.phase = 'clear'; state.phaseT = 0; state.cage.target = 0;
      if (state.cage.drop > 0.08) sfx('chain_extend', 0.45);
    };
    const press = (i) => {
      const c = COLORS[i]; if (!c) return null;
      const b = state.buttons[i]; b.down = 0.14; state.hand.press = HAND.press;
      sfx('click', MIX.click);
      if (!state.round || state.phase !== 'round') return { type: 'ignored' };
      const r = pressRound(state.round, c.id);
      if (r.type === 'ok' || r.type === 'clear') {
        b.lit = 0.4; sound.tone({ freq: c.tone, wave: 'square', dur: 0.16, gain: MIX.tone, cutoff: 2600 }); state.portrait = { kind: 'ok', t: 0 };
        if (r.type === 'clear') clearStage();
      } else if (r.type === 'wrong') fail('wrong');
      return r;
    };
    // 광기 판 느낌표 버튼: 딸깍.. 삐요오오오오옹 → 폭발 → TV 켜지며 영클 대사 → 쥰희 → 큰 폭발·철창 날아감 → 페이드아웃
    const passNow = () => {
      const r = passRound(state.round); if (r.type !== 'pass') return r;
      state.bang = null; state.phase = 'blowup'; state.phaseT = 0; state.blowup = { whistle: false, blast: false, tv: false };
      setScreen('dark'); sfx('click', 0.8); state.hand.press = HAND.press;
      return r;
    };
    const whistle = (dur, from, to, gain = 0.2) => { sound.tone({ freq: from, wave: 'sawtooth', dur, gain, glide: to - from, cutoff: 5200 }); sound.tone({ freq: from * 2, wave: 'sine', dur, gain: gain * 0.5, glide: (to - from) * 2 }); };
    const blast = (x, y, scale = 1, volume = MIX.blast) => { state.blasts.push({ x, y, t: 0, scale }); sfx('furnace_blast', volume, 0.92 + Math.random() * 0.16); state.shake = Math.max(state.shake, 0.3); state.flash = Math.max(state.flash, 0.25); };
    const boomCage = () => { state.phase = 'boomcage'; state.phaseT = 0; };
    const clickAt = (x, y) => {
      if (state.phase === 'talk') { state.clickTalk = true; state.hand.press = HAND.press; return { type: 'talk' }; }
      if (state.bang) { const p = bangPos(state.bang.t); if (Math.hypot(x - p.x, y - p.y) <= BANG.r + 4) return passNow(); }
      const i = hitButton(x, y); if (i >= 0) return press(i);
      state.hand.press = HAND.press; return null;
    };
    // 마우스(1인칭): 오버레이 좌표 → 480×360. 커서는 숨기고 형섭 손을 그린다
    const toLocal = (e) => { const r = ov.root.getBoundingClientRect(); return { x: (e.clientX - r.left) * SCREEN_W / Math.max(1, r.width), y: (e.clientY - r.top) * SCREEN_H / Math.max(1, r.height) }; };
    ov.root.addEventListener('mousemove', (e) => { Object.assign(state.mouse, toLocal(e)); state.mouse.inside = true; });
    ov.root.addEventListener('mouseleave', () => { state.mouse.inside = false; });
    ov.root.addEventListener('mousedown', (e) => { if (e.button !== 0) return; e.preventDefault(); Object.assign(state.mouse, toLocal(e)); state.mouse.inside = true; clickAt(state.mouse.x, state.mouse.y); });
    ov.root.addEventListener('contextmenu', (e) => e.preventDefault());

    // ── 진행 ──
    const update = (dt) => {
      state.t += dt; state.phaseT += dt; state.screenT += dt; state.lavaT += dt;
      state.flash = Math.max(0, state.flash - dt * 1.6); state.shake = Math.max(0, state.shake - dt); state.glitch = Math.max(0, state.glitch - dt);
      state.hand.press = Math.max(0, state.hand.press - dt);
      for (const b of state.buttons) { b.lit = Math.max(0, b.lit - dt); b.down = Math.max(0, b.down - dt); }
      state.portrait.t += dt; state.cage.jolt = Math.max(0, state.cage.jolt - dt);
      state.camAlpha = Math.max(0, Math.min(1, state.camAlpha + (state.camOn ? dt / CAM.fade : -dt * 2)));
      // 철창: 입력 차례엔 제한 시간만큼 천천히 내려가고, 통과하면 위로 되돌아간다
      state.cage.drop += (state.cage.target - state.cage.drop) * Math.min(1, dt * (state.cage.target > state.cage.drop ? 6 : 3));
      if (state.cage.flyV) { state.cage.flyV += 900 * dt; state.cage.fly -= state.cage.flyV * dt; }
      // 용암 불티·거품
      if (Math.random() < dt * 6) state.embers.push({ x: POOL.farX0 + Math.random() * (POOL.farX1 - POOL.farX0), y: POOL.nearY - Math.random() * 60, vy: -(18 + Math.random() * 22), t: 0, dur: 1.4 + Math.random() * 1.2 });
      for (const e of state.embers) { e.t += dt; e.y += e.vy * dt; e.x += Math.sin(e.t * 4) * 6 * dt; }
      state.embers = state.embers.filter(e => e.t < e.dur);
      if (Math.random() < dt * 2.2) state.bubbles.push({ x: 40 + Math.random() * 400, y: POOL.farY + 30 + Math.random() * 60, r: 3 + Math.random() * 5, t: 0, dur: 0.9 });
      for (const b of state.bubbles) b.t += dt;
      state.bubbles = state.bubbles.filter(b => b.t < b.dur);
      for (const b of state.blasts) b.t += dt;
      state.blasts = state.blasts.filter(b => b.t < BLAST.cols / BLAST.fps);
      if (state.blasting) { state.blastT += dt; if (state.blastT >= BLAST.every) { state.blastT = 0; blast(40 + Math.random() * 400, 30 + Math.random() * 200, 0.8 + Math.random() * 0.6); } }
      if (state.bang) state.bang.t += dt;
      if (edge('title')) { finish(false); return; }
      const confirm = edge('confirm') || state.clickTalk; state.clickTalk = false;
      if (state.phase === 'enter') {
        if (state.phaseT >= 0.8) { state.phase = 'drop'; state.phaseT = 0; sfx('rumble', 0.7); }
        return;
      }
      if (state.phase === 'drop') {
        const k = Math.min(1, state.phaseT / TV.dropDur);
        state.tvY = TV.startY + (TV.restY - TV.startY) * easeOut(k);
        if (k >= 1) { state.phase = 'poweron'; state.phaseT = 0; sfx('youngcle_tv_on', 0.8); }
        return;
      }
      if (state.phase === 'poweron') {
        state.tvOn = Math.min(1, state.phaseT / POWER_ON);
        if (state.tvOn >= 1) startTalk(TALK_INTRO, () => { state.phase = 'countdown'; state.phaseT = 0; });
        return;
      }
      if (state.phase === 'talk') { typer.update(dt); if (confirm) { if (!typer.done) typer.skip(); else advanceTalk(); } return; }
      // ‘시작~~~!’ 뒤 2초 있다가 영클 화면이 꺼지고 색 호출
      if (state.phase === 'countdown') {
        if (state.phaseT >= COUNTDOWN && state.screen.kind !== 'dark') { setScreen('dark'); sfx('click', 0.5); }
        if (state.phaseT >= COUNTDOWN + 0.6) startStage(0);
        return;
      }
      if (state.phase === 'round') {
        const round = state.round;
        for (const e of stepRound(round, dt)) {
          if (e.type === 'call') {
            const w = wordOf(e.id);
            setScreen(w.kind === 'color' ? 'color' : 'noise', { id: e.id, hold: Math.min(RULES.callHold, round.gap - 0.12) });
            sfx(`color_${e.id}`, MIX.voice);
            if (w.kind === 'noise') state.glitch = 0.3;
          }
          if (e.type === 'answer') { setScreen('answer'); sfx('confirm', 0.35); }
          if (e.type === 'timeout') fail('timeout');
        }
        // 호출 색은 hold 만큼 켜졌다가 잠깐 꺼진다(같은 색 연속 구분)
        if ((state.screen.kind === 'color' || state.screen.kind === 'noise') && state.screenT >= state.screen.hold) setScreen('dark');
        state.cage.target = answerProgress(round);
        if (passReady(round) && !state.bang) { state.bang = { t: 0 }; sfx('pop', 0.6); }
        return;
      }
      if (state.phase === 'clear') { if (state.phaseT >= CLEAR_HOLD) startStage(state.stage + 1); return; }
      if (state.phase === 'fail') { if (confirm && state.phaseT > 0.5) retry(); return; }
      if (state.phase === 'blowup') {
        const b = state.blowup, t = state.phaseT;
        if (t >= 0.45 && !b.whistle) { b.whistle = true; whistle(1.5, 320, 1500); }
        if (t >= 2.0 && !b.blast) { b.blast = true; state.blasting = true; state.blastT = BLAST.every; }
        if (t >= 2.6 && !b.tv) { b.tv = true; sfx('youngcle_tv_on', 0.8); state.face = 'shock'; setScreen('face'); startTalk(TALK_BLOWUP, boomCage); }
        return;
      }
      if (state.phase === 'boomcage') {
        const t = state.phaseT, b = state.blowup;
        if (!b.big) { b.big = true; const cx = CAGE.x + 55, cy = CAGE.y0 + 250; blast(cx, cy, 1.6, MIX.bigBlast); blast(cx - 40, cy - 40, 1.2); blast(cx + 30, cy + 20, 1.1); state.shake = 0.8; state.flash = 0.6; }
        if (t >= 0.35 && !b.fly) { b.fly = true; state.cage.flyV = 120; whistle(0.7, 520, 1700, 0.18); }
        if (t >= 1.5 && !b.out) { b.out = true; ov.root.style.transition = 'opacity 0.8s ease'; ov.root.style.opacity = '0'; }
        if (t >= 2.4) finish(true);
      }
    };

    // ── 그리기 ──
    const text = (str, x, y, { color = '#fff', align = 'left', size = F.size, shadow = true, alpha = 1 } = {}) => {
      ctx.font = size === F.size ? FONT : FONT.replace(`${F.size}px`, `${size}px`);
      const ga = ctx.globalAlpha; ctx.textBaseline = 'top'; ctx.textAlign = align; ctx.globalAlpha = ga * alpha;
      if (shadow) { ctx.fillStyle = '#000'; ctx.fillText(str, Math.round(x) + 1, Math.round(y) + 1); }
      ctx.fillStyle = color; ctx.fillText(str, Math.round(x), Math.round(y)); ctx.globalAlpha = ga;
    };
    const drawWall = () => {
      if (ready(img.backdrop)) ctx.drawImage(img.backdrop.img, 0, 140, SCREEN_W, SCENE_H, 0, 0, SCREEN_W, SCENE_H);
      else { ctx.fillStyle = '#1a1620'; ctx.fillRect(0, 0, SCREEN_W, SCENE_H); }
      ctx.fillStyle = 'rgba(4,6,12,0.42)'; ctx.fillRect(0, 0, SCREEN_W, SCENE_H);
      const g = ctx.createLinearGradient(0, POOL.farY - 70, 0, POOL.farY);
      g.addColorStop(0, 'rgba(255,110,30,0)'); g.addColorStop(1, `rgba(255,120,30,${0.28 + Math.sin(state.t * 3) * 0.05})`);
      ctx.fillStyle = g; ctx.fillRect(0, POOL.farY - 70, SCREEN_W, 70);
    };
    const poolPath = () => { ctx.beginPath(); ctx.moveTo(POOL.farX0, POOL.farY); ctx.lineTo(POOL.farX1, POOL.farY); ctx.lineTo(SCREEN_W + 40, POOL.nearY); ctx.lineTo(-40, POOL.nearY); ctx.closePath(); };
    const drawPool = () => {
      ctx.save(); poolPath(); ctx.clip();
      if (ready(img.lava)) {
        const pat = ctx.createPattern(img.lava.img, 'repeat');
        const bands = [[POOL.farY, 24, 0.55], [POOL.farY + 24, 28, 0.75], [POOL.farY + 52, 30, 1.0], [POOL.farY + 82, 40, 1.35]];
        for (const [y, h, sc] of bands) {
          ctx.save(); ctx.translate(-((state.lavaT * 10 * sc) % (32 * sc)), y); ctx.scale(sc, sc);
          ctx.fillStyle = pat; ctx.fillRect(0, 0, (SCREEN_W + 80) / sc, h / sc + 1); ctx.restore();
        }
      } else { ctx.fillStyle = '#ff6a1a'; ctx.fillRect(0, POOL.farY, SCREEN_W, POOL.nearY - POOL.farY); }
      const g = ctx.createLinearGradient(0, POOL.farY, 0, POOL.nearY);
      g.addColorStop(0, 'rgba(40,10,0,0.55)'); g.addColorStop(1, 'rgba(255,200,80,0.08)');
      ctx.fillStyle = g; ctx.fillRect(0, POOL.farY, SCREEN_W, POOL.nearY - POOL.farY);
      for (const b of state.bubbles) {
        const k = b.t / b.dur, r = b.r * (0.6 + k * 0.6);
        ctx.strokeStyle = `rgba(255,240,170,${0.8 * (1 - k)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      for (const e of state.embers) { ctx.globalAlpha = Math.max(0, 1 - e.t / e.dur); ctx.fillStyle = e.t % 0.3 < 0.15 ? '#ffd27a' : '#ff8a2a'; ctx.fillRect(Math.round(e.x), Math.round(e.y), 2, 2); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,190,90,0.5)'; ctx.fillRect(POOL.farX0, POOL.farY - 1, POOL.farX1 - POOL.farX0, 2);
    };
    const drawFence = () => {
      if (!ready(img.fence)) { ctx.fillStyle = '#3a4556'; ctx.fillRect(0, FENCE.y, SCREEN_W, 30); return; }
      const w = 32 * FENCE.scale, h = 22 * FENCE.scale;
      for (let x = 0; x < SCREEN_W; x += w) ctx.drawImage(img.fence.img, Math.round(x), FENCE.y, w, h);
      ctx.fillStyle = '#1d2330'; ctx.fillRect(0, FENCE.y + h, SCREEN_W, SCENE_H - FENCE.y - h);
      ctx.fillStyle = '#2b3446'; ctx.fillRect(0, FENCE.y + h, SCREEN_W, 2);
    };
    const cageRect = () => {
      const sway = Math.sin(state.t * Math.PI * 2 / CAGE.period) * CAGE.sway;
      const jolt = state.cage.jolt > 0 ? Math.round(Math.sin(state.cage.jolt * 40) * 3) : 0;
      return { x: Math.round(CAGE.x + sway), y: Math.round(CAGE.y0 + state.cage.drop * CAGE.drop + jolt + state.cage.fly), w: Math.round(136 * CAGE.scale), h: Math.round(360 * CAGE.scale) };
    };
    const drawCage = () => {
      const r = cageRect(), s = CAGE.scale, floorY = r.y + r.h - 13;
      if (r.y + r.h < -20) return;
      // 안의 둘(정면 정지 프레임) → 철창 그림이 앞에 덮인다
      const who = [[img.junhee, 92, 90, r.x + 4], [img.yongjun, 68, 88, r.x + 54]];
      for (const [h, fw, fh, sx] of who) if (ready(h)) ctx.drawImage(h.img, 0, 0, fw, fh, Math.round(sx), Math.round(floorY - fh * s), Math.round(fw * s), Math.round(fh * s));
      if (ready(img.cage)) ctx.drawImage(img.cage.img, r.x, r.y, r.w, r.h);
      else { ctx.strokeStyle = '#60f4e0'; ctx.strokeRect(r.x, r.y + 160, r.w, 128); }
    };
    const tvRect = () => { const w = Math.round(288 * TV.scale), h = Math.round(176 * TV.scale); return { x: Math.round(TV.cx - w / 2), y: Math.round(state.tvY), w, h }; };
    const screenRect = () => { const r = tvRect(), [ix, iy, iw, ih] = TV.inset; return { x: r.x + Math.round(ix * TV.scale), y: r.y + Math.round(iy * TV.scale), w: Math.round(iw * TV.scale), h: Math.round(ih * TV.scale) }; };
    const drawFace = (r, key) => { const f = faces[key]; if (ready(f)) ctx.drawImage(f.img, r.x, r.y, r.w, r.h); };
    const drawScreen = () => {
      const r = screenRect(), s = state.screen;
      ctx.fillStyle = '#05070c'; ctx.fillRect(r.x, r.y, r.w, r.h);
      if (state.tvOn <= 0) return;
      ctx.save();
      if (state.tvOn < 1) { const h = Math.max(2, Math.round(r.h * state.tvOn)); ctx.beginPath(); ctx.rect(r.x, r.y + (r.h - h) / 2, r.w, h); ctx.clip(); ctx.fillStyle = '#e8f6ff'; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.restore(); return; }
      ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      if (s.kind === 'face') drawFace(r, state.face);
      else if (s.kind === 'color') {
        // 화면은 그 색, 가운데엔 색 이름(사용자 “화면엔 색깔과 가운데에는 텍스트”)
        const c = wordOf(s.id);
        ctx.fillStyle = c.hex; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(r.x, r.y, r.w, Math.round(r.h * 0.35));
        text(c.en, r.x + r.w / 2, r.y + r.h / 2 - 16, { align: 'center', size: 32, color: '#fff' });
      } else if (s.kind === 'noise') {
        const flick = Math.floor(state.screenT / FLICKER) % COLORS.length;
        ctx.fillStyle = COLORS[(flick * 3 + s.id.length) % COLORS.length].dark; ctx.fillRect(r.x, r.y, r.w, r.h);
        for (let i = 0; i < 6; i++) { const y = r.y + ((state.t * 260 + i * 17) % r.h); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(r.x, Math.round(y), r.w, 2); }
        text(wordOf(s.id).label, r.x + r.w / 2 + Math.round((Math.random() - 0.5) * 4), r.y + r.h / 2 - 16, { align: 'center', size: 32, color: '#fff' });
      } else if (s.kind === 'answer' || s.kind === 'dark') {
        ctx.fillStyle = '#0a0f16'; ctx.fillRect(r.x, r.y, r.w, r.h);
        if (state.round && s.kind === 'answer') {
          const n = state.round.expected.length, gap = Math.min(22, Math.floor((r.w - 16) / n)), x0 = r.x + r.w / 2 - (n - 1) * gap / 2;
          for (let i = 0; i < n; i++) {
            const done = i < state.round.i, cx = Math.round(x0 + i * gap), cy = r.y + r.h / 2 + 12;
            ctx.fillStyle = done ? wordOf(state.round.expected[i]).hex : '#2b3446'; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#8fa0b6'; ctx.lineWidth = 1; ctx.stroke();
          }
          text(`${state.round.i} / ${n}`, r.x + r.w / 2, r.y + 10, { align: 'center', size: 24, color: '#ffe066' });
          const k = 1 - answerProgress(state.round);
          ctx.fillStyle = '#1f2a3a'; ctx.fillRect(r.x + 8, r.y + r.h - 9, r.w - 16, 4);
          ctx.fillStyle = k < 0.3 ? '#ff4a4a' : '#60f4e0'; ctx.fillRect(r.x + 8, r.y + r.h - 9, Math.round((r.w - 16) * k), 4);
        } else if (state.round && state.phase === 'round' && Math.floor(state.screenT * 4) % 2 === 0) text('. . .', r.x + r.w / 2, r.y + r.h / 2 - 12, { align: 'center', size: 24, color: '#4a5568', shadow: false });
      }
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = r.y; y < r.y + r.h; y += 3) ctx.fillRect(r.x, y, r.w, 1);
      ctx.restore();
    };
    // 프레임 그림의 화면부가 불투명이라 프레임을 먼저 그리고 화면 내용을 그 위(inset 안)에 그린다(tv-broadcast.js 와 같은 순서)
    const drawTv = () => {
      const r = tvRect();
      if (ready(img.arm)) ctx.drawImage(img.arm.img, TV.cx - 6, r.y - 320 + 22, 12, 320);
      if (ready(img.tv)) ctx.drawImage(img.tv.img, r.x, r.y, r.w, r.h);
      else { ctx.strokeStyle = '#8fa0b6'; ctx.lineWidth = 4; ctx.strokeRect(r.x, r.y, r.w, r.h); }
      drawScreen();
    };
    const drawBlasts = () => {
      for (const b of state.blasts) {
        const f = Math.min(BLAST.cols - 1, Math.floor(b.t * BLAST.fps)), w = Math.round(BLAST.fw * b.scale), h = Math.round(BLAST.fh * b.scale);
        ctx.fillStyle = `rgba(255,140,40,${0.25 * (1 - b.t / (BLAST.cols / BLAST.fps))})`; ctx.beginPath(); ctx.arc(b.x, b.y, 30 * b.scale, 0, Math.PI * 2); ctx.fill();
        if (ready(img.blast)) ctx.drawImage(img.blast.img, f * BLAST.fw, 0, BLAST.fw, BLAST.fh, Math.round(b.x - w / 2), Math.round(b.y - h * 0.6), w, h);
      }
    };
    // 느낌표 버튼(광기 판): 빨간 동그라미가 좌우로 휙휙 — 누르면 통과
    const drawBang = () => {
      const bg = state.bang; if (!bg) return;
      const p = bangPos(bg.t), pulse = 1 + Math.sin(bg.t * 9) * 0.06, r = BANG.r * pulse, k = Math.min(1, bg.t / 0.25);
      ctx.save(); ctx.globalAlpha = k;
      ctx.strokeStyle = `rgba(255,224,102,${0.4 + Math.sin(bg.t * 12) * 0.3})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, r + 8, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#5a0c0c'; ctx.beginPath(); ctx.arc(p.x + 2, p.y + 4, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff2b2b'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(p.x - r * 0.3, p.y - r * 0.35, r * 0.4, 0, Math.PI * 2); ctx.fill();
      text('!', p.x, p.y - 17, { align: 'center', size: 32, color: '#fff' });
      ctx.restore();
    };
    const drawConsole = () => {
      ctx.fillStyle = '#20262f'; ctx.fillRect(0, CONSOLE.y, SCREEN_W, CONSOLE.h);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, CONSOLE.y, SCREEN_W, 2); ctx.fillStyle = '#ffe27a'; ctx.fillRect(0, CONSOLE.y + 2, SCREEN_W, 1);
      ctx.fillStyle = '#151a22'; ctx.fillRect(0, SCREEN_H - 4, SCREEN_W, 4);
      for (const x of [BTN.x0 - 8, BTN.x0 + 7 * (BTN.w + BTN.gap) + 2]) { ctx.fillStyle = '#4a5568'; ctx.fillRect(x, CONSOLE.y + 10, 3, 3); ctx.fillRect(x, SCREEN_H - 14, 3, 3); }
      COLORS.forEach((c, i) => {
        const b = state.buttons[i], r = buttonRect(i), down = b.down > 0 ? 3 : 0;
        ctx.fillStyle = '#0f131a'; ctx.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
        ctx.fillStyle = c.dark; ctx.fillRect(r.x, r.y + 3, r.w, r.h - 3);
        ctx.fillStyle = c.hex; ctx.fillRect(r.x, r.y + down, r.w, r.h - 4 - down);
        ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(r.x + 3, r.y + 2 + down, r.w - 6, 4);
        if (b.lit > 0) { ctx.globalAlpha = Math.min(1, b.lit / 0.4) * 0.6; ctx.fillStyle = '#fff'; ctx.fillRect(r.x, r.y + down, r.w, r.h - 4 - down); ctx.globalAlpha = Math.min(1, b.lit / 0.4) * 0.35; ctx.fillStyle = c.hex; ctx.fillRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12); ctx.globalAlpha = 1; }
        text(c.ko, r.x + r.w / 2, r.y + r.h + 4, { align: 'center', color: '#cfd8e6' });
      });
      const p = PORTRAIT, pr = state.portrait;
      const shake = pr.kind === 'bad' && pr.t < 0.5 ? Math.round(Math.sin(pr.t * 60) * 2) : 0, bounce = pr.kind === 'ok' && pr.t < 0.18 ? -2 : 0;
      ctx.fillStyle = '#0f131a'; ctx.fillRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
      ctx.fillStyle = '#39465a'; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.fillStyle = '#0b1420'; ctx.fillRect(p.x + 3, p.y + 3, p.w - 6, 52);
      if (ready(img.portrait)) ctx.drawImage(img.portrait.img, p.x + 10 + shake, p.y + 5 + bounce, 48, 48);
      if (pr.kind === 'bad' && pr.t < 0.6) { ctx.fillStyle = 'rgba(255,40,40,0.35)'; ctx.fillRect(p.x + 3, p.y + 3, p.w - 6, 52); }
      ctx.fillStyle = '#1b2230'; ctx.fillRect(p.x + 3, p.y + 55, p.w - 6, 12);
      text('김형섭', p.x + p.w / 2, p.y + 53, { align: 'center', color: '#ffe066', shadow: false });
      if (state.camAlpha > 0) {
        const c = CAM; ctx.globalAlpha = state.camAlpha;
        ctx.fillStyle = '#0f131a'; ctx.fillRect(c.x - 2, c.y - 2, c.w + 4, c.h + 4); ctx.fillStyle = '#2a3140'; ctx.fillRect(c.x, c.y, c.w, c.h);
        const vx = c.x + 4, vy = c.y + 4, vw = c.w - 8, vh = c.h - 8;
        ctx.fillStyle = '#000'; ctx.fillRect(vx, vy, vw, vh);
        if (cam.readyState >= 2) { try { ctx.drawImage(cam, vx, vy, vw, vh); } catch (e) { /* */ } }
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = vy; y < vy + vh; y += 3) ctx.fillRect(vx, y, vw, 1);
        if (Math.floor(state.t * 2) % 2 === 0) { ctx.fillStyle = '#ff2b2b'; ctx.fillRect(vx + 5, vy + 5, 5, 5); }
        ctx.globalAlpha = 1;
      }
    };
    const drawTalk = () => {
      const tk = state.talk; if (!tk) return;
      const l = tk.lines[tk.i], who = SPEAKERS[l.who], b = TALKBOX;
      ctx.fillStyle = '#000'; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      text(who.label, b.x + 14, b.y + 10, { color: who.color });
      text(typer.visible, b.x + 14, b.y + 36, { color: '#fff' });
      if (typer.done && Math.floor(state.t * 2.5) % 2 === 0) text('C', b.x + b.w - 26, b.y + b.h - 24, { color: '#ffe066' });
    };
    const drawHud = () => {
      if (state.round && state.phase === 'round') text(`ROUND ${state.stage + 1} / ${STAGES.length}`, 8, 6, { color: '#ffe066' });
      if (state.phase === 'fail') {
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 96, SCREEN_W, 78);
        text(state.over === 'timeout' ? 'TIME OVER' : 'WRONG', SCREEN_W / 2, 104, { align: 'center', size: 32, color: '#ff4a4a' });
        if (Math.floor(state.t * 2) % 2 === 0) text('C  다시', SCREEN_W / 2, 146, { align: 'center', color: '#cfd8e6' });
      }
      if (state.flash > 0) { ctx.fillStyle = `rgba(255,${state.blasting ? 160 : 40},40,${Math.min(0.5, state.flash)})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
    };
    const drawHand = () => {
      const m = state.mouse; if (!m.inside) return;
      const pressed = state.hand.press > 0, h = pressed ? img.handPress : img.handPoint;
      const x = Math.round(m.x - HAND.tipX), y = Math.round(m.y - HAND.tipY + (pressed ? 3 : 0));
      if (ready(h)) ctx.drawImage(h.img, x, y);
      else { ctx.fillStyle = '#f2cfa8'; ctx.fillRect(x + 13, y, 11, 30); }
    };
    const draw = () => {
      ctx.save();
      if (state.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 8), Math.round((Math.random() - 0.5) * 6));
      drawWall(); drawPool(); drawCage(); drawFence(); drawTv(); drawBlasts(); drawBang();
      if (state.glitch > 0) { ctx.fillStyle = `rgba(255,255,255,${state.glitch * 0.12})`; for (let i = 0; i < 4; i++) ctx.fillRect(0, Math.round(Math.random() * SCENE_H), SCREEN_W, 2); }
      drawConsole(); drawTalk(); drawHud(); drawHand();
      ctx.restore();
    };

    let last = performance.now(), raf = 0;
    const frame = (now) => { const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; if (!state.exiting) update(dt); draw(); raf = requestAnimationFrame(frame); };
    ov.fit(); addEventListener('resize', ov.fit);
    sound.pauseBgm(0.6);
    requestAnimationFrame(() => { ov.root.style.opacity = '1'; });
    raf = requestAnimationFrame(frame);
    // QA 훅: 상태 읽기·버튼 누르기(색 id)·판 건너뛰기·호출 생략·느낌표 위치·통과
    window.__colorgame = {
      state, finish, retry, press: (id) => press(COLORS.findIndex(c => c.id === id)), clickAt, buttonRect, hitButton, camRect: () => ({ ...CAM }), tvRect, screenRect, cageRect,
      bangPos: () => (state.bang ? bangPos(state.bang.t) : null), passNow, talkbox: { ...TALKBOX },
      get round() { return state.round; }, get cam() { return cam; }, get typer() { return typer; },
      skipTo(stage) { state.talk = null; state.tvY = TV.restY; state.tvOn = 1; startStage(stage); },
      // 호출 단계를 건너뛰고 바로 입력 차례로(정답 확인용) / 느낌표를 바로 띄움
      answerNow() { const r = state.round; if (!r || r.status !== 'calling' || r.chaos) return; r.next = r.calls.length; r.t = r.answerAt; },
      bangNow() { const r = state.round; if (r && r.chaos) r.t = Math.max(r.t, RULES.chaosPassAt); },
    };
  });
}
