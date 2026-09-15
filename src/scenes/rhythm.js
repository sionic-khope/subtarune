// 무대 리듬 게임 오버레이 씬(BUILD180 개편) — 2026-09-15 사용자 브리핑(델타룬 3장 테나 리듬 게임 참고 https://www.youtube.com/watch?v=103D6O-Wr_g).
// 컷신 노드 { scene3d: 'rhythm', flag } 로 실행. 규칙은 rhythm-core.js(순수), 여기는 진행·그리기·소리·입력·영상.
//   화면: 생성 배경 `rhythm_backdrop.png`(위 가운데 매달린 꺼진 대형 스크린, 좌우 스포트라이트·스피커 스택, 바닥 조명 웅덩이) 위에
//   반투명 리듬 칸 셋(경섭 드럼 | 형섭 ←/→ 두 칸 | 빠맨 보컬)이 스크린을 타고 내려온다. 밴드는 절반 크기로 무대 뒤쪽에 서고 관객(생성 띠, 2프레임)이 맨 아래.
//   흐름: 페이드인 → 셋이 왼쪽부터 떨어져 자리 → 대사 → 사운드 체크(작은별, 음정별 일렉 샘플) → 룰 대사(‘죽습니다’) → ‘관객 여러분들 즐길 준비되셨나요?’ → 함성·박수·꽃 →
//   노래방식 제목 + 앰프 피드백 → 스크린 켜지며 영상·플레이 → 대사 → 두 번째 곡 → 결과.
//   소리(전부 샘플): GREAT 는 고게인 파워코드(E/A 번갈아), 홀드는 누르는 동안 sustain 이 쭈욱, 노트 없는 데 누르면 긁기, MISS 는 팜뮤트 척, 콤보 10 박수·20 환호·50 함성.
import { Input } from '../core/input.js';
import { FONT, F } from '../ui/font.js';
import { SCREEN_W, SCREEN_H } from '../world/world.js';
import { makePlay, stepPlay, finished, sideHits, visibleNotes, grade, RHYTHM, TWINKLE } from './rhythm-core.js';

const BAND = [
  { id: 'gyeongsub', label: '경섭', color: '#ff6fa8', sheet: 'assets/sprites/band_gyeongsub.png', x: 150, voice: 'gyeongsub' },
  { id: 'hyungsub', label: '형섭', color: '#4fd8ff', sheet: 'assets/sprites/band_hyungsub.png', x: 240, voice: 'hyungsub' },
  { id: 'ppaman', label: '빠맨', color: '#7dff5a', sheet: 'assets/sprites/band_ppaman.png', x: 330, voice: 'ppaman' },
];
const BACKDROP = 'assets/props/rhythm_backdrop.png', AUDIENCE = 'assets/props/rhythm_audience.png';
const CELL = 128, DRAW = 64, FEET = 122, STAND_Y = 284;
// 생성 배경 속 스크린(측정값): 영상은 여기에
const TV = { x: 106, y: 34, w: 264, h: 148 };
const LANE_TOP = 42, RECEPTOR_Y = 200;
const LANE_BOX = { drums: { x: 116, w: 50 }, L: { x: 194, w: 44 }, R: { x: 242, w: 44 }, vocal: { x: 314, w: 50 } };
const SONGS = ['assets/rhythm/noamtori.json', 'assets/rhythm/bojipam.json'];
const CHAR_DELAY = 0.032;
const SPEAKERS = { gyeongsub: { label: '경섭', color: '#ff6fa8' }, ppaman: { label: '억빠맨', color: '#c9a3ff' }, ttuulla: { label: '뚜울라알라', color: '#ffd166' } };
const TALK1 = [
  { who: 'gyeongsub', text: '오 드럼이네' },
  { who: 'ppaman', text: '제.. 제가 노래해요?' },
  { who: 'gyeongsub', text: 'ㅋㅋㅋㅋ 노래실력 본다 형이 또 노래랑 일가견이 있는데 카인노래방이..' },
  { who: 'ttuulla', text: '자 형님들  준비 되셨습니까? 일단 뭐 사운드 체크 해보십시요' },
];
const TALK2 = [
  { who: 'ttuulla', text: '자 룰을 알려드리겠습니다 여러분들이 최고의 무대를 만들어주셔야합니다' },
  { who: 'ttuulla', text: '만약 만족스럽지 못한곡 연주를 하신다면.' },
  { who: 'ttuulla', text: '{r}죽습니다{/}', shake: true },
  { who: 'ttuulla', text: '관객 여러분들 즐길 준비되셨나요?' },
];
const TALK2B = [{ who: 'ttuulla', text: '자 그럼 시작해봅시다. 처음곡은 {y}방가방가 노앰토리{/}~' }];
const TALK3 = [
  { who: 'ttuulla', text: '정말 감동적인곡이군요... 하지만 이게 끝이 아닙니다.' },
  { who: 'ttuulla', text: '두번째곡... 바로 가볼까요?' },
  { who: 'ttuulla', text: '바로 {y}보X팜{/} 입니다~~' },
];
const HUM = 2.2, TITLE_IN = 1.0, HYPE = 3.2;
const PITCH_SFX = { 261.63: 'guitar_c4', 392: 'guitar_g4', 440: 'guitar_a4' };
const FLOWER_COLORS = ['#ff7bd1', '#ffd166', '#ff5c5c', '#c9a3ff', '#7dff5a'];

function loadImage(src) {
  const img = new Image();
  const done = new Promise((resolve) => { img.onload = () => resolve(img); img.onerror = () => resolve(null); });
  img.src = src;
  return { img, done };
}
function makeOverlay(game) {
  const root = document.createElement('div');
  root.id = 'rhythm';
  Object.assign(root.style, { position: 'fixed', left: '0', top: '0', width: '0', height: '0', opacity: '0', transition: 'opacity 1.4s ease', zIndex: '10', overflow: 'hidden', background: '#000' });
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_W; canvas.height = SCREEN_H;
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' });
  root.appendChild(canvas);
  document.body.appendChild(root);
  const fit = () => { const r = game.canvas.getBoundingClientRect(); Object.assign(root.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }); };
  return { root, canvas, fit };
}
class Typewriter {
  constructor(sound) { this.sound = sound; this.text = ''; this.shown = 0; this.timer = 0; this.voice = 'narrator'; this.doneT = 0; }
  start(text, voice = 'narrator') { this.text = text; this.shown = 0; this.timer = 0; this.voice = voice; this.doneT = 0; }
  get done() { return this.shown >= this.text.length; }
  skip() { this.shown = this.text.length; }
  update(dt) {
    if (this.done) { this.doneT += dt; return; }
    this.timer += dt;
    while (this.timer >= CHAR_DELAY && !this.done) { this.timer -= CHAR_DELAY; this.shown += 1; const ch = this.text[this.shown - 1]; if (ch !== ' ' && ch !== '{' && ch !== '}') this.sound.blip(this.voice); }
  }
  get visible() { return this.text.slice(0, this.shown); }
}
function segments(str) {
  const out = []; let color = null, buf = '';
  for (let i = 0; i < str.length; i++) {
    if (str.startsWith('{y}', i)) { if (buf) out.push({ text: buf, color }); buf = ''; color = '#ffe066'; i += 2; continue; }
    if (str.startsWith('{r}', i)) { if (buf) out.push({ text: buf, color }); buf = ''; color = '#ff4a4a'; i += 2; continue; }
    if (str.startsWith('{/}', i)) { if (buf) out.push({ text: buf, color }); buf = ''; color = null; i += 2; continue; }
    buf += str[i];
  }
  if (buf) out.push({ text: buf, color });
  return out;
}

export function run(game, node = {}) {
  return new Promise((resolve) => {
    const ov = makeOverlay(game);
    const ctx = ov.canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const sheets = Object.fromEntries(BAND.map(b => [b.id, loadImage(b.sheet)]));
    const backdrop = loadImage(BACKDROP), audienceImg = loadImage(AUDIENCE);
    const typer = new Typewriter(game.sound);
    const sound = game.sound;
    const sfx = (name, volume = 0.7, len = 0, rate = 1) => sound.sfx(name, { volume, len, rate });
    const state = {
      t: 0, phase: 'drop', phaseT: 0, exiting: false,
      band: BAND.map((b, i) => ({ ...b, y: -160, landed: false, delay: 0.3 + i * 0.75, frame: 0, animT: 0 })),
      talk: null, chart: null, play: null, song: 0, video: null, videos: [], clock: 0, fromClock: false,
      judge: null, judgeT: 0, cheer: 0, cheerBig: false, lastCombo10: 0, sideT: 0, tvOn: 0, title: null, hum: 0, over: false, flash: 0,
      stats: { score: 0, maxCombo: 0, songs: [] }, shake: 0, fx: [], flowers: [], holds: {}, chord: 0, beam: 0,
    };
    const charts = SONGS.map(src => fetch(src).then(r => r.json()).catch(() => null));
    const makeVideo = (src) => { const v = document.createElement('video'); v.src = src; v.preload = 'auto'; v.playsInline = true; v.volume = 0.85; v.style.display = 'none'; document.body.appendChild(v); return v; };
    Promise.all(charts).then(list => { state.charts = list; state.videos = list.map(c => c && c.video ? makeVideo(c.video) : null); });

    const prev = Object.create(null);
    const edge = (action) => { const down = Input.down(action) || !!Input.pressed[action]; const just = down && !prev[action]; prev[action] = down; return just; };
    const held = (action) => Input.down(action);
    const stopHold = (lane, quick = true) => { const h = state.holds[lane]; if (!h) return; state.holds[lane] = null; let v = h.volume; const step = () => { v -= quick ? 0.25 : 0.08; if (v <= 0.02) { try { h.pause(); h.src = ''; } catch (e) { /* */ } } else { h.volume = Math.max(0, v); setTimeout(step, 30); } }; step(); };
    const finish = (found) => {
      if (state.exiting) return; state.exiting = true;
      for (const lane of ['L', 'R']) stopHold(lane);
      for (const v of state.videos) if (v) { try { v.pause(); } catch (e) { /* */ } v.remove(); }
      ov.root.style.transition = 'opacity 0.6s ease'; ov.root.style.opacity = '0';
      setTimeout(() => { cancelAnimationFrame(raf); removeEventListener('resize', ov.fit); ov.root.remove(); delete window.__rhythm; resolve({ found }); }, 620);
    };
    const bandOf = (id) => state.band.find(b => b.id === id);
    const strum = (kind = 'tap') => { const h = bandOf('hyungsub'); h.frame = kind === 'hold' ? 3 : (h.frame === 1 ? 2 : 1); h.animT = kind === 'hold' ? 0.6 : 0.22; };
    const drumHit = () => { const d = bandOf('gyeongsub'); d.frame = 1 + Math.floor(Math.random() * 3); d.animT = 0.18; };
    const sing = () => { const v = bandOf('ppaman'); v.frame = 1 + Math.floor(Math.random() * 3); v.animT = 0.3; };
    const chord = () => { state.chord ^= 1; sfx(state.chord ? 'guitar_pc_e' : 'guitar_pc_a', 0.85); };
    const cheer = (level) => {
      state.cheer = level >= 3 ? 3.4 : level >= 2 ? 2.4 : 1.6; state.cheerBig = level >= 2;
      if (level >= 3) { sfx('crowd_roar', 0.75); sfx('applause', 0.6); state.flash = 0.4; }
      else if (level >= 2) { sfx('crowd_cheer', 0.7); sfx('applause', 0.5); }
      else sfx('applause', 0.6);
    };
    const throwFlowers = (n = 14) => { for (let i = 0; i < n; i++) state.flowers.push({ x: 40 + Math.random() * 400, y: 356, vx: (Math.random() - 0.5) * 60 + (240 - (40 + Math.random() * 400)) * 0.35, vy: -(230 + Math.random() * 120), t: -Math.random() * 0.8, color: FLOWER_COLORS[i % FLOWER_COLORS.length], spin: Math.random() * 6 }); };

    const startTalk = (lines, next) => { state.phase = 'talk'; state.talk = { lines, i: 0, next }; const l = lines[0]; typer.start(l.text, l.who); if (l.shake) state.shake = 0.5; };
    const advanceTalk = () => {
      const tk = state.talk; tk.i += 1;
      if (tk.i >= tk.lines.length) { state.talk = null; tk.next(); return; }
      const l = tk.lines[tk.i]; typer.start(l.text, l.who); if (l.shake) state.shake = 0.5;
    };
    const startSoundcheck = () => { state.phase = 'soundcheck'; state.phaseT = 0; state.chart = TWINKLE; state.play = makePlay(TWINKLE); state.clock = 0; state.judge = null; };
    const startHype = () => { state.phase = 'hype'; state.phaseT = 0; cheer(3); throwFlowers(18); };
    const startTitle = (index) => {
      const chart = state.charts?.[index];
      if (!chart) { finish(true); return; }
      state.song = index; state.chart = chart; state.play = makePlay(chart); state.phase = 'title'; state.phaseT = 0; state.title = { k: 0 }; state.hum = 0; state.tvOn = 0; state.over = false; state.judge = null; state.lastCombo10 = 0;
    };
    const startSong = () => {
      const v = state.videos?.[state.song];
      state.phase = 'play'; state.phaseT = 0; state.sideT = 0; state.clock = 0; state.fromClock = !v; state.video = v;
      if (v) { v.currentTime = 0; v.play().catch(() => { v.muted = true; v.play().catch(() => { state.fromClock = true; }); }); }
    };
    const retry = () => {
      for (const lane of ['L', 'R']) stopHold(lane);
      state.play = makePlay(state.chart); state.over = false; state.judge = null; state.clock = 0; state.sideT = 0; state.lastCombo10 = 0;
      const v = state.video; if (v) { v.currentTime = 0; v.play().catch(() => {}); }
      sfx('confirm', 0.7);
    };
    const songTime = () => (state.video && !state.fromClock) ? state.video.currentTime : state.clock;
    const endSong = () => {
      for (const lane of ['L', 'R']) stopHold(lane, false);
      const p = state.play; state.stats.songs.push({ title: state.chart.title, score: p.score, maxCombo: p.maxCombo, grade: grade(p) });
      state.stats.score += p.score; state.stats.maxCombo = Math.max(state.stats.maxCombo, p.maxCombo);
      if (state.video) { try { state.video.pause(); } catch (e) { /* */ } }
      cheer(3); throwFlowers(20);
      if (state.song === 0) startTalk(TALK3, () => startTitle(1));
      else { state.phase = 'result'; state.phaseT = 0; sfx('won', 0.8); }
    };

    const update = (dt) => {
      state.t += dt; state.phaseT += dt;
      state.shake = Math.max(0, state.shake - dt); state.flash = Math.max(0, state.flash - dt * 1.6);
      if (state.judge) { state.judgeT += dt; if (state.judgeT > 0.5) state.judge = null; }
      state.cheer = Math.max(0, state.cheer - dt);
      state.beam += dt;
      for (const b of state.band) { if (b.animT > 0) { b.animT -= dt; if (b.animT <= 0) b.frame = 0; } }
      state.fx = state.fx.filter(f => (f.t += dt) < f.dur);
      for (const fl of state.flowers) { fl.t += dt; if (fl.t < 0) continue; fl.x += fl.vx * dt; fl.vy += 520 * dt; fl.y += fl.vy * dt; }
      state.flowers = state.flowers.filter(fl => fl.y < 380 && fl.t < 4);
      const confirm = edge('confirm');
      if (edge('title')) { finish(false); return; }
      if (state.phase === 'drop') {
        let all = true;
        for (const b of state.band) {
          if (b.landed) continue; all = false;
          if (state.phaseT < b.delay) continue;
          const k = Math.min(1, (state.phaseT - b.delay) / 0.55);
          b.y = -160 + (STAND_Y + 160) * k * k;
          if (k >= 1) { b.y = STAND_Y; b.landed = true; sfx('thud', 0.8); state.shake = 0.25; state.fx.push({ kind: 'dust', x: b.x, y: STAND_Y, t: 0, dur: 0.5 }); }
        }
        if (all && state.phaseT > 0.8) startTalk(TALK1, startSoundcheck);
        return;
      }
      if (state.phase === 'talk') { typer.update(dt); if (confirm) { if (!typer.done) typer.skip(); else advanceTalk(); } return; }
      if (state.phase === 'hype') { if (state.phaseT >= HYPE) startTalk(TALK2B, () => startTitle(0)); return; }
      if (state.phase === 'title') {
        state.title.k = Math.min(1, state.phaseT / TITLE_IN);
        if (state.phaseT >= TITLE_IN && !state.hum) { state.hum = 1; sfx('guitar_feedback', 0.7); }
        if (state.phaseT >= TITLE_IN + HUM) { state.tvOn = 0.001; startSong(); }
        return;
      }
      if (state.phase === 'soundcheck' || state.phase === 'play') {
        if (state.phase === 'play' && state.tvOn > 0 && state.tvOn < 1) state.tvOn = Math.min(1, state.tvOn + dt / 0.5);
        if (state.over) { if (confirm) retry(); return; }
        if (state.fromClock || state.phase === 'soundcheck') state.clock += dt;
        const time = songTime();
        const input = { press: { L: edge('left'), R: edge('right') }, held: { L: held('left'), R: held('right') } };
        const events = stepPlay(state.play, time, input);
        for (const e of events) {
          if (e.type === 'great') {
            state.judge = { text: 'GREAT!', color: '#7dffb0' }; state.judgeT = 0; state.fx.push({ kind: 'ring', lane: e.lane, t: 0, dur: 0.35 });
            if (e.note.dur) { strum('hold'); stopHold(e.lane); const h = sfx(e.note.pitch ? PITCH_SFX[e.note.pitch] || 'guitar_sustain' : 'guitar_sustain', 0.85); if (h && typeof h === 'object') state.holds[e.lane] = h; }
            else { strum('tap'); if (e.note.pitch) sfx(PITCH_SFX[e.note.pitch] || 'guitar_pc_e', 0.85); else chord(); }
          }
          if (e.type === 'holdEnd') { state.fx.push({ kind: 'ring', lane: e.lane, t: 0, dur: 0.3 }); stopHold(e.lane, false); }
          if (e.type === 'miss') { state.judge = { text: 'MISS', color: '#ff6a6a' }; state.judgeT = 0; sfx('guitar_mute', 0.7); if (e.why === 'release') stopHold(e.lane); }
          if (e.type === 'empty') { sfx('guitar_scratch', 0.6); strum('tap'); }
          if (e.type === 'over') { state.over = true; for (const lane of ['L', 'R']) stopHold(lane); if (state.video) { try { state.video.pause(); } catch (err) { /* */ } } sfx('damage', 0.8); state.shake = 0.5; }
        }
        const c10 = Math.floor(state.play.combo / 10);
        if (c10 > state.lastCombo10 && state.play.combo > 0) { state.lastCombo10 = c10; cheer(c10 >= 5 ? 3 : c10 >= 2 ? 2 : 1); if (c10 >= 3) throwFlowers(6); }
        if (state.play.combo === 0) state.lastCombo10 = 0;
        const side = sideHits(state.chart, state.sideT, time); state.sideT = time;
        if (side.drums.length) drumHit();
        if (side.vocal.length) sing();
        if (finished(state.play, time)) {
          if (state.phase === 'soundcheck') { for (const lane of ['L', 'R']) stopHold(lane, false); startTalk(TALK2, startHype); }
          else endSong();
        }
        return;
      }
      if (state.phase === 'result') { if (confirm && state.phaseT > 0.8) finish(true); }
    };

    // ── 그리기 ──
    const text = (str, x, y, { color = '#fff', align = 'left', size = F.size, shadow = true, alpha = 1 } = {}) => {
      ctx.font = size === F.size ? FONT : FONT.replace(`${F.size}px`, `${size}px`);
      ctx.textBaseline = 'top'; ctx.textAlign = align; ctx.globalAlpha = alpha;
      if (shadow) { ctx.fillStyle = '#000'; ctx.fillText(str, Math.round(x) + 1, Math.round(y) + 1); }
      ctx.fillStyle = color; ctx.fillText(str, Math.round(x), Math.round(y)); ctx.globalAlpha = 1;
    };
    const drawBackdrop = () => {
      const img = backdrop.img;
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, SCREEN_W, SCREEN_H);
      else { ctx.fillStyle = '#0d0818'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); ctx.fillStyle = '#050508'; ctx.fillRect(TV.x, TV.y, TV.w, TV.h); }
      // 스크린: 영상 / 꺼짐(제목 카드)
      const v = state.video;
      if (state.phase === 'play' && v && v.readyState >= 2 && state.tvOn > 0) {
        const k = state.tvOn, h = Math.max(2, Math.round(TV.h * k));
        ctx.save(); ctx.beginPath(); ctx.rect(TV.x, TV.y + (TV.h - h) / 2, TV.w, h); ctx.clip();
        try { ctx.drawImage(v, TV.x, TV.y, TV.w, TV.h); } catch (e) { ctx.fillStyle = '#123'; ctx.fillRect(TV.x, TV.y, TV.w, TV.h); }
        ctx.restore();
        if (k < 1) { ctx.fillStyle = `rgba(255,255,255,${(1 - k) * 0.8})`; ctx.fillRect(TV.x, TV.y + TV.h / 2 - 1, TV.w, 2); }
      } else if (state.phase === 'title' || state.phase === 'play') {
        const k = state.title?.k ?? 1;
        ctx.fillStyle = '#050508'; ctx.fillRect(TV.x, TV.y, TV.w, TV.h);
        text(state.chart.title, SCREEN_W / 2, TV.y + 44, { align: 'center', size: 24, color: '#ffe066', alpha: k });
        text(`- ${state.chart.artist} -`, SCREEN_W / 2, TV.y + 84, { align: 'center', size: 14, color: '#ffffff', alpha: k });
      }
      // 스포트라이트 빔이 천천히 흔들린다(플레이·환호 때 밝게)
      const live = state.phase === 'play' || state.cheer > 0 || state.phase === 'hype';
      const a = live ? 0.16 : 0.05;
      for (const [ox, dir] of [[40, 1], [440, -1]]) {
        const sway = Math.sin(state.beam * (live ? 1.6 : 0.5) + dir) * 40;
        const g = ctx.createLinearGradient(ox, 40, 240 + sway, 300); g.addColorStop(0, `rgba(255,220,150,${a})`); g.addColorStop(1, 'rgba(255,220,150,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox - 6, 44); ctx.lineTo(ox + 6, 44); ctx.lineTo(240 + sway + dir * 90, 300); ctx.lineTo(240 + sway - dir * 30, 300); ctx.closePath(); ctx.fill();
      }
      if (state.flash > 0) { ctx.fillStyle = `rgba(255,240,200,${(state.flash * 0.35).toFixed(3)})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
    };
    const laneColor = { drums: '255,111,168', L: '79,216,255', R: '79,216,255', vocal: '125,255,90' };
    const drawLanes = () => {
      if (!(state.phase === 'soundcheck' || state.phase === 'play' || state.phase === 'title')) return;
      const inPlay = state.phase !== 'title';
      ctx.globalAlpha = state.phase === 'title' ? state.title.k * 0.7 : 1;
      for (const [key, box] of Object.entries(LANE_BOX)) {
        ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(box.x, LANE_TOP, box.w, RECEPTOR_Y - LANE_TOP + 18);
        ctx.strokeStyle = `rgba(${laneColor[key]},0.9)`; ctx.lineWidth = 2; ctx.strokeRect(box.x + 1, LANE_TOP + 1, box.w - 2, RECEPTOR_Y - LANE_TOP + 16);
        ctx.fillStyle = `rgba(${laneColor[key]},0.95)`; ctx.fillRect(box.x + 4, RECEPTOR_Y - 1, box.w - 8, 3);
        ctx.fillStyle = `rgba(${laneColor[key]},0.22)`; ctx.fillRect(box.x + 4, RECEPTOR_Y - 10, box.w - 8, 20);
      }
      text('경섭', LANE_BOX.drums.x + LANE_BOX.drums.w / 2, LANE_TOP - 16, { align: 'center', color: '#ff6fa8', size: 13 });
      text('형섭', (LANE_BOX.L.x + LANE_BOX.R.x + LANE_BOX.R.w) / 2, LANE_TOP - 16, { align: 'center', color: '#4fd8ff', size: 13 });
      text('빠맨', LANE_BOX.vocal.x + LANE_BOX.vocal.w / 2, LANE_TOP - 16, { align: 'center', color: '#7dff5a', size: 13 });
      text('◀', LANE_BOX.L.x + LANE_BOX.L.w / 2, RECEPTOR_Y + 4, { align: 'center', color: '#9fe8ff', size: 11, shadow: false });
      text('▶', LANE_BOX.R.x + LANE_BOX.R.w / 2, RECEPTOR_Y + 4, { align: 'center', color: '#9fe8ff', size: 11, shadow: false });
      ctx.globalAlpha = 1;
      if (!inPlay) return;
      const time = songTime(), span = RECEPTOR_Y - LANE_TOP;
      for (const [key, list] of [['drums', state.chart.side?.drums || []], ['vocal', state.chart.side?.vocal || []]]) {
        const box = LANE_BOX[key];
        for (const t of list) { const k = (t - time) / RHYTHM.approach; if (k < 0 || k > 1.05) continue; const y = RECEPTOR_Y - k * span; ctx.fillStyle = `rgba(${laneColor[key]},${(0.55 + 0.4 * (1 - k)).toFixed(2)})`; ctx.fillRect(box.x + 8, Math.round(y) - 4, box.w - 16, 8); }
      }
      for (const { note, k, kEnd } of visibleNotes(state.play, time)) {
        const box = LANE_BOX[note.lane];
        const y = RECEPTOR_Y - k * span, yEnd = RECEPTOR_Y - kEnd * span;
        const dead = note.status === 'miss', col = dead ? '110,110,120' : laneColor[note.lane];
        if (note.dur) {
          // 홀드: 굵은 꼬리(테두리 + 눈금) + 머리·꼬리 바. 누르는 중엔 밝게
          const top = Math.max(LANE_TOP, yEnd), bottom = Math.min(RECEPTOR_Y, note.status === 'holding' ? RECEPTOR_Y : y);
          ctx.fillStyle = `rgba(${col},${note.status === 'holding' ? 0.75 : 0.42})`; ctx.fillRect(box.x + 10, Math.round(top), box.w - 20, Math.max(0, Math.round(bottom - top)));
          ctx.strokeStyle = `rgba(255,255,255,${note.status === 'holding' ? 0.9 : 0.6})`; ctx.lineWidth = 1; ctx.strokeRect(box.x + 10.5, Math.round(top) + 0.5, box.w - 21, Math.max(0, Math.round(bottom - top)));
          for (let yy = Math.round(top) + 6; yy < bottom - 4; yy += 8) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(box.x + 14, yy, box.w - 28, 1); }
          ctx.fillStyle = `rgba(${col},0.95)`; ctx.fillRect(box.x + 6, Math.round(yEnd) - 4, box.w - 12, 8);
        }
        if (note.status === 'wait' || note.status === 'miss') {
          ctx.fillStyle = `rgba(${col},0.98)`; ctx.fillRect(box.x + 5, Math.round(y) - 6, box.w - 10, 12);
          ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(box.x + 8, Math.round(y) - 3, box.w - 16, 3);
          if (note.dur) text('HOLD', box.x + box.w / 2, Math.round(y) - 5, { align: 'center', size: 9, color: '#001a22', shadow: false });
        }
      }
      for (const f of state.fx) if (f.kind === 'ring') { const box = LANE_BOX[f.lane], k = f.t / f.dur; ctx.strokeStyle = `rgba(255,255,255,${(1 - k).toFixed(2)})`; ctx.lineWidth = 2; ctx.strokeRect(box.x + 2 - k * 6, RECEPTOR_Y - 8 - k * 6, box.w - 4 + k * 12, 16 + k * 12); }
      if (state.judge) { const k = state.judgeT / 0.5; text(state.judge.text, SCREEN_W / 2, 112 - k * 14, { align: 'center', size: 18, color: state.judge.color, alpha: 1 - k * 0.6 }); }
      if (state.play.combo >= 2) text(`${state.play.combo} COMBO`, SCREEN_W / 2, 140, { align: 'center', size: 13, color: '#ffffff' });
    };
    const drawMeters = () => {
      if (!(state.phase === 'soundcheck' || state.phase === 'play' || state.phase === 'title' || state.phase === 'hype')) return;
      const pop = state.play?.pop ?? RHYTHM.popStart;
      for (const [x, label] of [[86, 'POPU'], [376, 'LARITY']]) {
        text(label, label === 'POPU' ? x + 12 : x + 4, LANE_TOP - 16, { color: '#6fb3ff', size: 10, align: label === 'POPU' ? 'right' : 'left' });
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, LANE_TOP, 12, 160); ctx.strokeStyle = '#6fb3ff'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, LANE_TOP + 0.5, 11, 159);
        const h = Math.round(156 * pop); ctx.fillStyle = pop > 0.66 ? '#7dff5a' : pop > 0.33 ? '#ffe066' : '#ff6a6a'; ctx.fillRect(x + 2, LANE_TOP + 158 - h, 8, h);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, SCREEN_H - 24, 150, 24); ctx.fillRect(SCREEN_W - 150, SCREEN_H - 24, 150, 24);
      text(`${String(state.stats.score + (state.play?.score || 0)).padStart(6, '0')}`, 8, SCREEN_H - 20, { color: '#7dff5a', size: 15 });
      text('SCORE', 96, SCREEN_H - 17, { color: '#7dff5a', size: 10 });
      text('MAX COMBO', SCREEN_W - 96, SCREEN_H - 17, { color: '#7dff5a', size: 10, align: 'right' });
      text(`${String(Math.max(state.stats.maxCombo, state.play?.maxCombo || 0)).padStart(6, '0')}`, SCREEN_W - 8, SCREEN_H - 20, { color: '#7dff5a', size: 15, align: 'right' });
    };
    const drawBand = () => {
      for (const b of state.band) {
        const img = sheets[b.id].img, feet = Math.round(b.y);
        if (img && img.complete && img.naturalWidth) {
          const idx = b.frame, sx = (idx % 2) * CELL, sy = Math.floor(idx / 2) * CELL;
          ctx.drawImage(img, sx, sy, CELL, CELL, Math.round(b.x - DRAW / 2), feet - Math.round(FEET * DRAW / CELL), DRAW, DRAW);
        } else { ctx.fillStyle = b.color; ctx.fillRect(b.x - 9, feet - 32, 18, 32); }
      }
      for (const f of state.fx) if (f.kind === 'dust') { const k = f.t / f.dur; ctx.fillStyle = `rgba(200,190,170,${(1 - k) * 0.7})`; for (let i = -3; i <= 3; i++) ctx.fillRect(f.x + i * 8 * (0.4 + k), f.y - 3 - k * 14, 3, 2); }
    };
    const drawFlowers = () => {
      for (const fl of state.flowers) {
        if (fl.t < 0) continue;
        const x = Math.round(fl.x), y = Math.round(fl.y), r = fl.t * 8 + fl.spin;
        ctx.fillStyle = fl.color;
        for (let i = 0; i < 5; i++) { const a = r + i * Math.PI * 2 / 5; ctx.fillRect(x + Math.round(Math.cos(a) * 3), y + Math.round(Math.sin(a) * 3), 2, 2); }
        ctx.fillStyle = '#fff7b0'; ctx.fillRect(x, y, 2, 2);
      }
    };
    const drawAudience = () => {
      const img = audienceImg.img, cheering = state.cheer > 0;
      const bob = cheering ? Math.round(Math.abs(Math.sin(state.t * 9)) * 4) : 0;
      if (img && img.complete && img.naturalWidth) {
        const fh = img.naturalHeight / 2, sy = cheering ? fh : 0;
        ctx.drawImage(img, 0, sy, img.naturalWidth, fh, 0, SCREEN_H - 84 - bob, SCREEN_W, 90);
        return;
      }
      for (let i = 0; i < 20; i++) {
        const x = i * 25 + 6, phase = i * 0.7, y = SCREEN_H - 6 - (cheering ? Math.abs(Math.sin(state.t * 10 + phase)) * 8 : Math.sin(state.t * 2 + phase) * 1.5);
        ctx.fillStyle = i % 2 ? '#0d0a14' : '#161022'; ctx.beginPath(); ctx.arc(x, y - 18, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 12, y - 12, 24, 16);
        if (cheering) { ctx.fillRect(x - 15, y - 30 + Math.sin(state.t * 12 + phase) * 3, 3, 14); ctx.fillRect(x + 12, y - 30 - Math.sin(state.t * 12 + phase) * 3, 3, 14); }
      }
    };
    const drawBox = (speaker, body, color = '#fff') => {
      const bx = 14, by = 96, bw = SCREEN_W - 28, bh = 80;
      const dx = state.shake > 0 ? Math.round((Math.random() - 0.5) * 6) : 0;
      ctx.fillStyle = '#000'; ctx.fillRect(bx + dx, by, bw, bh);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx + 1 + dx, by + 1, bw - 2, bh - 2);
      ctx.font = FONT; const lw = Math.max(64, Math.ceil(ctx.measureText(speaker).width) + 18);
      ctx.fillStyle = '#000'; ctx.fillRect(bx + 8 + dx, by - 20, lw, 22); ctx.strokeRect(bx + 9 + dx, by - 19, lw - 2, 20); text(speaker, bx + 8 + lw / 2 + dx, by - 17, { align: 'center', shadow: false, color });
      const segs = segments(body); let x = bx + 16 + dx, y = by + 12; ctx.font = FONT;
      for (const seg of segs) {
        for (const word of seg.text.split(' ')) {
          const w = ctx.measureText(word + ' ').width;
          if (x + w > bx + bw - 16 && x > bx + 16 + dx) { x = bx + 16 + dx; y += 20; }
          text(word + ' ', x, y, { color: seg.color || '#fff', shadow: false, size: seg.color === '#ff4a4a' ? 18 : F.size }); x += w;
        }
      }
    };
    const drawTalk = () => { const tk = state.talk; if (!tk) return; const l = tk.lines[tk.i]; const who = SPEAKERS[l.who]; drawBox(who.label, typer.visible, who.color); };
    const drawOver = () => {
      if (!state.over) return;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      text('무대가 엉망이 됐다...', SCREEN_W / 2, 120, { align: 'center', size: 20, color: '#ff8a8a' });
      const cx = SCREEN_W / 2, by = 160;
      ctx.fillStyle = '#000'; ctx.fillRect(cx - 72, by, 144, 34); ctx.strokeStyle = Math.floor(state.t * 2.5) % 2 === 0 ? '#ffe066' : '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(cx - 71, by + 1, 142, 32);
      text('재도전', cx - 16, by + 9, { align: 'center' }); ctx.fillStyle = '#000'; ctx.fillRect(cx + 26, by + 8, 18, 18); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(cx + 26.5, by + 8.5, 17, 17); text('C', cx + 35, by + 10, { align: 'center', color: '#ffe066', shadow: false });
    };
    const drawResult = () => {
      if (state.phase !== 'result') return;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      text('무대 끝!', SCREEN_W / 2, 60, { align: 'center', size: 30, color: '#ffe066' });
      state.stats.songs.forEach((s, i) => { text(`${s.title}`, 70, 120 + i * 40, { color: '#ffe066' }); text(`SCORE ${s.score}   MAX COMBO ${s.maxCombo}   ${s.grade}`, 70, 140 + i * 40, { color: '#fff' }); });
      text(`총점 ${state.stats.score}`, SCREEN_W / 2, 240, { align: 'center', size: 18, color: '#7dff5a' });
      if (state.phaseT > 0.8 && Math.floor(state.t * 2) % 2 === 0) text('C  계속', SCREEN_W / 2, SCREEN_H - 40, { align: 'center', color: '#8f8fa6', size: 12 });
    };
    const draw = () => {
      ctx.save();
      if (state.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 6), Math.round((Math.random() - 0.5) * 4));
      drawBackdrop(); drawLanes(); drawBand(); drawAudience(); drawFlowers(); drawMeters();
      if (state.phase === 'soundcheck' && state.phaseT < 3) text('← →  사운드 체크: 떨어지는 칸에 맞춰 누르세요', SCREEN_W / 2, 236, { align: 'center', size: 12, color: '#ffe066' });
      drawTalk(); drawOver(); drawResult();
      ctx.restore();
    };

    let last = performance.now(), raf = 0;
    const frame = (now) => { const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; if (!state.exiting) update(dt); draw(); raf = requestAnimationFrame(frame); };
    ov.fit(); addEventListener('resize', ov.fit);
    requestAnimationFrame(() => { ov.root.style.opacity = '1'; });
    raf = requestAnimationFrame(frame);
    window.__rhythm = { state, finish, startTitle, startSong, retry, cheer, get play() { return state.play; }, songTime,
      skipTo(phase) { for (const b of state.band) { b.y = STAND_Y; b.landed = true; } state.talk = null; if (phase === 'soundcheck') startSoundcheck(); else if (phase === 'hype') startHype(); else if (phase === 'song') startTitle(0); } };
  });
}
