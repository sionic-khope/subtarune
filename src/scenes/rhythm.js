// 무대 리듬 게임 오버레이 씬(BUILD178) — 2026-09-15 사용자 브리핑(델타룬 3장 테나 리듬 게임 참고 https://www.youtube.com/watch?v=103D6O-Wr_g).
// 컷신 노드 { scene3d: 'rhythm', flag } 로 실행. 규칙은 rhythm-core.js(순수), 여기는 진행·그리기·소리·입력·영상.
//   화면: 꺼진 거대 TV 위에 반투명 리듬 칸 셋(경섭 드럼 | 형섭 두 칸(←/→) | 빠맨 보컬). 양옆은 자동 연출, 유저는 가운데 두 칸만.
//   흐름: 페이드인 → 셋이 왼쪽부터 차례로 떨어져 자리 → 대사 → 사운드 체크(작은별 첫마디, 일렉 기타 음이 음에 맞춰) → 룰 대사(‘죽습니다’ 강조: 5연속 MISS 게임오버, 재도전)
//   → 노래방식 제목(‘방가방가 노앰토리 - 무언가가큰징징이’) + 지이이잉 2초 → TV 켜지며 유튜브 영상(assets/video, 소리 포함)과 리듬 플레이 → 뚜울라 대사 → 두 번째 곡(보X팜) → 결과.
//   소리: GREAT 는 일렉 스트로크(합성), 노트 없는 데 누르면 툭툭 긋는 소리, MISS 는 낮은 버즈, 콤보 10마다 관객 박수(maillard_applause).
import { Input } from '../core/input.js';
import { FONT, F } from '../ui/font.js';
import { SCREEN_W, SCREEN_H } from '../world/world.js';
import { makePlay, stepPlay, finished, sideHits, visibleNotes, grade, RHYTHM, TWINKLE, LANES } from './rhythm-core.js';

const BAND = [
  { id: 'gyeongsub', label: '경섭', color: '#ff6fa8', sheet: 'assets/sprites/band_gyeongsub.png', x: 100, voice: 'gyeongsub' },
  { id: 'hyungsub', label: '형섭', color: '#4fd8ff', sheet: 'assets/sprites/band_hyungsub.png', x: 240, voice: 'hyungsub' },
  { id: 'ppaman', label: '빠맨', color: '#7dff5a', sheet: 'assets/sprites/band_ppaman.png', x: 380, voice: 'ppaman' },
];
const CELL = 128, FEET = 122, STAND_Y = 348;
const TV = { x: 40, y: 24, w: 400, h: 225 };
const LANE_TOP = 40, RECEPTOR_Y = 258;
// 칸: 경섭(왼쪽 60) | 형섭 L·R(가운데 44+44) | 빠맨(오른쪽 60)
const LANE_BOX = { drums: { x: 84, w: 60 }, L: { x: 196, w: 42 }, R: { x: 242, w: 42 }, vocal: { x: 336, w: 60 } };
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
  { who: 'ttuulla', text: '자 그럼 시작해봅시다. 처음곡은 {y}방가방가 노앰토리{/}~' },
];
const TALK3 = [
  { who: 'ttuulla', text: '정말 감동적인곡이군요... 하지만 이게 끝이 아닙니다.' },
  { who: 'ttuulla', text: '두번째곡... 바로 가볼까요?' },
  { who: 'ttuulla', text: '바로 {y}보X팜{/} 입니다~~' },
];
const HUM = 2.0, TITLE_IN = 1.0;

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
/** 색 마크업 {y}노랑{/} {r}빨강{/} 을 분절로 */
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
    const typer = new Typewriter(game.sound);
    const sound = game.sound;
    const sfx = (name, volume = 0.7, len = 0, rate = 1) => sound.sfx(name, { volume, len, rate });
    const tone = (opts) => sound.tone(opts);
    const state = {
      t: 0, phase: 'drop', phaseT: 0, exiting: false, paused: false,
      band: BAND.map((b, i) => ({ ...b, y: -160, landed: false, delay: 0.3 + i * 0.75, frame: 0, animT: 0 })),
      talk: null, chart: null, play: null, song: 0, video: null, videos: [], clock: null, fromClock: false,
      judge: null, judgeT: 0, empties: [], cheer: 0, lastCombo10: 0, sideT: 0, tvOn: 0, title: null, hum: 0, over: false, result: null, retryT: 0,
      stats: { score: 0, maxCombo: 0, songs: [] }, shake: 0, fx: [],
    };
    const escapesAtStart = game.escapes || 0;
    // 곡 차트·영상 미리 준비(영상은 소리 포함 — 유튜브 원본을 받은 mp4)
    const charts = SONGS.map(src => fetch(src).then(r => r.json()).catch(() => null));
    const makeVideo = (src) => { const v = document.createElement('video'); v.src = src; v.preload = 'auto'; v.playsInline = true; v.volume = 0.85; v.style.display = 'none'; document.body.appendChild(v); return v; };
    Promise.all(charts).then(list => { state.charts = list; state.videos = list.map(c => c && c.video ? makeVideo(c.video) : null); });

    const prev = Object.create(null);
    const edge = (action) => { const down = Input.down(action) || !!Input.pressed[action]; const just = down && !prev[action]; prev[action] = down; return just; };
    const held = (action) => Input.down(action);
    const finish = (found) => {
      if (state.exiting) return; state.exiting = true;
      for (const v of state.videos) if (v) { try { v.pause(); } catch (e) { /* 이미 정지 */ } v.remove(); }
      ov.root.style.transition = 'opacity 0.6s ease'; ov.root.style.opacity = '0';
      setTimeout(() => { cancelAnimationFrame(raf); removeEventListener('resize', ov.fit); ov.root.remove(); delete window.__rhythm; resolve({ found }); }, 620);
    };
    const bandOf = (id) => state.band.find(b => b.id === id);
    const strum = (kind = 'tap') => { const h = bandOf('hyungsub'); h.frame = kind === 'hold' ? 3 : (h.frame === 1 ? 2 : 1); h.animT = 0.22; };
    const drumHit = () => { const d = bandOf('gyeongsub'); d.frame = 1 + Math.floor(Math.random() * 3); d.animT = 0.18; };
    const sing = () => { const v = bandOf('ppaman'); v.frame = 1 + Math.floor(Math.random() * 3); v.animT = 0.3; };
    // 소리: 일렉 스트로크(합성 톱니파), 툭툭 긋기, 미스 버즈, 앰프 지이잉
    const guitar = (freq = 196, dur = 0.28, gain = 0.09) => { tone({ freq, wave: 'sawtooth', dur, gain, cutoff: 2600 }); tone({ freq: freq * 2.01, wave: 'square', dur: dur * 0.5, gain: gain * 0.25, cutoff: 3200 }); };
    const scratch = () => tone({ freq: 95, wave: 'square', dur: 0.07, gain: 0.07, cutoff: 800, jitter: 20 });
    const buzz = () => tone({ freq: 62, wave: 'sawtooth', dur: 0.16, gain: 0.07, cutoff: 500 });
    const hum = () => { tone({ freq: 110, wave: 'sawtooth', dur: HUM, gain: 0.05, cutoff: 700, glide: 12 }); tone({ freq: 1500, wave: 'sine', dur: HUM * 0.9, gain: 0.02, glide: 260 }); };

    const startTalk = (lines, next) => { state.phase = 'talk'; state.talk = { lines, i: 0, next }; const l = lines[0]; typer.start(l.text, l.who); if (l.shake) state.shake = 0.5; };
    const advanceTalk = () => {
      const tk = state.talk; tk.i += 1;
      if (tk.i >= tk.lines.length) { state.talk = null; tk.next(); return; }
      const l = tk.lines[tk.i]; typer.start(l.text, l.who); if (l.shake) state.shake = 0.5;
    };
    const startSoundcheck = () => { state.phase = 'soundcheck'; state.phaseT = 0; state.chart = TWINKLE; state.play = makePlay(TWINKLE); state.clock = 0; state.judge = null; };
    const startTitle = (index) => {
      const chart = state.charts?.[index];
      if (!chart) { finish(true); return; }
      state.song = index; state.chart = chart; state.play = makePlay(chart); state.phase = 'title'; state.phaseT = 0; state.title = { k: 0 }; state.hum = 0; state.tvOn = 0; state.over = false; state.judge = null; state.lastCombo10 = 0;
    };
    const startSong = () => {
      const v = state.videos?.[state.song];
      state.phase = 'play'; state.phaseT = 0; state.sideT = 0; state.clock = 0; state.fromClock = !v; state.video = v;
      if (v) {
        v.currentTime = 0;
        v.play().catch(() => { v.muted = true; v.play().catch(() => { state.fromClock = true; }); });
      }
    };
    const retry = () => {
      state.play = makePlay(state.chart); state.over = false; state.judge = null; state.clock = 0; state.sideT = 0; state.lastCombo10 = 0;
      const v = state.video; if (v) { v.currentTime = 0; v.play().catch(() => {}); }
      sfx('confirm', 0.7);
    };
    const songTime = () => (state.video && !state.fromClock) ? state.video.currentTime : state.clock;
    const endSong = () => {
      const p = state.play; state.stats.songs.push({ title: state.chart.title, score: p.score, maxCombo: p.maxCombo, grade: grade(p) });
      state.stats.score += p.score; state.stats.maxCombo = Math.max(state.stats.maxCombo, p.maxCombo);
      if (state.video) { try { state.video.pause(); } catch (e) { /* */ } }
      if (state.song === 0) startTalk(TALK3, () => startTitle(1));
      else { state.phase = 'result'; state.phaseT = 0; sfx('won', 0.8); }
    };

    const update = (dt) => {
      state.t += dt; state.phaseT += dt;
      state.shake = Math.max(0, state.shake - dt);
      if (state.judge) { state.judgeT += dt; if (state.judgeT > 0.5) state.judge = null; }
      state.cheer = Math.max(0, state.cheer - dt);
      for (const b of state.band) { if (b.animT > 0) { b.animT -= dt; if (b.animT <= 0) b.frame = 0; } }
      state.fx = state.fx.filter(f => (f.t += dt) < f.dur);
      const confirm = edge('confirm');
      if (edge('title')) { finish(false); return; }
      if (state.phase === 'drop') {
        // 왼쪽부터 경섭·형섭·빠맨이 차례로 떨어져 자리를 잡는다(쿵)
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
      if (state.phase === 'talk') {
        typer.update(dt);
        if (confirm) { if (!typer.done) typer.skip(); else advanceTalk(); }
        return;
      }
      if (state.phase === 'title') {
        // 노래방 시작처럼: 제목·가수가 부드럽게 떠오르고(1초) 지이이잉 2초 → TV 켜지며 곡 시작
        state.title.k = Math.min(1, state.phaseT / TITLE_IN);
        if (state.phaseT >= TITLE_IN && !state.hum) { state.hum = 1; hum(); }
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
          if (e.type === 'great') { state.judge = { text: 'GREAT!', color: '#7dffb0' }; state.judgeT = 0; strum(e.note.dur ? 'hold' : 'tap'); guitar(e.note.pitch || (e.lane === 'L' ? 196 : 247), e.note.pitch ? 0.5 : 0.26); state.fx.push({ kind: 'ring', lane: e.lane, t: 0, dur: 0.35 }); }
          if (e.type === 'holdEnd') { state.fx.push({ kind: 'ring', lane: e.lane, t: 0, dur: 0.3 }); }
          if (e.type === 'miss') { state.judge = { text: 'MISS', color: '#ff6a6a' }; state.judgeT = 0; buzz(); }
          if (e.type === 'empty') { scratch(); strum('tap'); }
          if (e.type === 'over') { state.over = true; if (state.video) { try { state.video.pause(); } catch (err) { /* */ } } sfx('damage', 0.8); state.shake = 0.5; }
        }
        // 콤보 10마다 관객 박수·환호
        const c10 = Math.floor(state.play.combo / 10);
        if (c10 > state.lastCombo10 && state.play.combo > 0) { state.lastCombo10 = c10; state.cheer = 1.6; sfx('maillard_applause', 0.3, 1.4); }
        if (state.play.combo === 0) state.lastCombo10 = 0;
        // 자동 사이드 레인: 드럼·보컬 노트가 판정선을 지날 때 연주 애니
        const side = sideHits(state.chart, state.sideT, time); state.sideT = time;
        if (side.drums.length) drumHit();
        if (side.vocal.length) sing();
        if (finished(state.play, time)) {
          if (state.phase === 'soundcheck') { state.phase = 'talk'; startTalk(TALK2, () => startTitle(0)); }
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
    const drawTv = () => {
      // 무대 배경(어두운 보라 커튼 느낌) + 꺼진 거대 TV(두꺼운 검은 테두리, 아래 받침)
      const bg = ctx.createLinearGradient(0, 0, 0, SCREEN_H); bg.addColorStop(0, '#1a0f2a'); bg.addColorStop(1, '#0a0612');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#2a1546' : '#22113a'; ctx.fillRect(i * 40, 0, 40, 30); }
      ctx.fillStyle = '#15151c'; ctx.fillRect(TV.x - 14, TV.y - 12, TV.w + 28, TV.h + 30);
      ctx.fillStyle = '#2a2a34'; ctx.fillRect(TV.x - 10, TV.y - 8, TV.w + 20, TV.h + 22);
      ctx.fillStyle = '#050508'; ctx.fillRect(TV.x - 4, TV.y - 4, TV.w + 8, TV.h + 8);
      ctx.fillStyle = '#3a3a44'; ctx.fillRect(TV.x + TV.w / 2 - 40, TV.y + TV.h + 18, 80, 6);
      const v = state.video;
      if (state.phase === 'play' && v && v.readyState >= 2 && state.tvOn > 0) {
        // TV 켜짐: 가로선이 넓어지며 영상이 나타난다
        const k = state.tvOn, h = Math.max(2, Math.round(TV.h * k));
        ctx.save(); ctx.beginPath(); ctx.rect(TV.x, TV.y + (TV.h - h) / 2, TV.w, h); ctx.clip();
        try { ctx.drawImage(v, TV.x, TV.y, TV.w, TV.h); } catch (e) { ctx.fillStyle = '#123'; ctx.fillRect(TV.x, TV.y, TV.w, TV.h); }
        ctx.restore();
        if (k < 1) { ctx.fillStyle = `rgba(255,255,255,${(1 - k) * 0.8})`; ctx.fillRect(TV.x, TV.y + TV.h / 2 - 1, TV.w, 2); }
      } else {
        ctx.fillStyle = '#0b0b10'; ctx.fillRect(TV.x, TV.y, TV.w, TV.h);
        const g = ctx.createLinearGradient(TV.x, TV.y, TV.x + TV.w, TV.y + TV.h); g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.04)');
        ctx.fillStyle = g; ctx.fillRect(TV.x, TV.y, TV.w, TV.h);
        if (state.phase === 'title' || state.phase === 'play') {
          const k = state.title?.k ?? 1;
          text(state.chart.title, SCREEN_W / 2, TV.y + 70, { align: 'center', size: 28, color: '#ffe066', alpha: k });
          text(`- ${state.chart.artist} -`, SCREEN_W / 2, TV.y + 116, { align: 'center', size: 16, color: '#ffffff', alpha: k });
        }
      }
    };
    const laneColor = { drums: '255,111,168', L: '79,216,255', R: '79,216,255', vocal: '125,255,90' };
    const drawLanes = () => {
      if (!(state.phase === 'soundcheck' || state.phase === 'play' || state.phase === 'title')) return;
      const inPlay = state.phase !== 'title';
      const alpha = state.phase === 'title' ? state.title.k * 0.6 : 1;
      ctx.globalAlpha = alpha;
      for (const [key, box] of Object.entries(LANE_BOX)) {
        ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(box.x, LANE_TOP, box.w, RECEPTOR_Y - LANE_TOP + 18);
        ctx.strokeStyle = `rgba(${laneColor[key]},0.9)`; ctx.lineWidth = 2; ctx.strokeRect(box.x + 1, LANE_TOP + 1, box.w - 2, RECEPTOR_Y - LANE_TOP + 16);
        // 판정선
        ctx.fillStyle = `rgba(${laneColor[key]},0.9)`; ctx.fillRect(box.x + 4, RECEPTOR_Y - 1, box.w - 8, 3);
        ctx.fillStyle = `rgba(${laneColor[key]},0.25)`; ctx.fillRect(box.x + 4, RECEPTOR_Y - 10, box.w - 8, 20);
      }
      // 이름
      text('경섭', LANE_BOX.drums.x + LANE_BOX.drums.w / 2, 26, { align: 'center', color: '#ff6fa8', size: 14 });
      text('형섭', (LANE_BOX.L.x + LANE_BOX.R.x + LANE_BOX.R.w) / 2, 26, { align: 'center', color: '#4fd8ff', size: 14 });
      text('빠맨', LANE_BOX.vocal.x + LANE_BOX.vocal.w / 2, 26, { align: 'center', color: '#7dff5a', size: 14 });
      text('◀', LANE_BOX.L.x + LANE_BOX.L.w / 2, RECEPTOR_Y + 4, { align: 'center', color: '#9fe8ff', size: 11, shadow: false });
      text('▶', LANE_BOX.R.x + LANE_BOX.R.w / 2, RECEPTOR_Y + 4, { align: 'center', color: '#9fe8ff', size: 11, shadow: false });
      ctx.globalAlpha = 1;
      if (!inPlay) return;
      const time = songTime();
      // 자동 사이드 노트(드럼·보컬): 지나간 것은 안 그린다
      for (const [key, list] of [['drums', state.chart.side?.drums || []], ['vocal', state.chart.side?.vocal || []]]) {
        const box = LANE_BOX[key];
        for (const t of list) { const k = (t - time) / RHYTHM.approach; if (k < 0 || k > 1.05) continue; const y = RECEPTOR_Y - k * (RECEPTOR_Y - LANE_TOP); ctx.fillStyle = `rgba(${laneColor[key]},${(0.55 + 0.4 * (1 - k)).toFixed(2)})`; ctx.fillRect(box.x + 10, Math.round(y) - 4, box.w - 20, 8); }
      }
      // 가운데 노트(탭·홀드)
      for (const { note, k, kEnd } of visibleNotes(state.play, time)) {
        const box = LANE_BOX[note.lane];
        const y = RECEPTOR_Y - k * (RECEPTOR_Y - LANE_TOP), yEnd = RECEPTOR_Y - kEnd * (RECEPTOR_Y - LANE_TOP);
        const dead = note.status === 'miss';
        const col = dead ? '110,110,120' : laneColor[note.lane];
        if (note.dur) {
          const top = Math.max(LANE_TOP, yEnd), bottom = Math.min(RECEPTOR_Y, note.status === 'holding' ? RECEPTOR_Y : y);
          ctx.fillStyle = `rgba(${col},${note.status === 'holding' ? 0.6 : 0.35})`; ctx.fillRect(box.x + 12, Math.round(top), box.w - 24, Math.max(0, Math.round(bottom - top)));
          ctx.fillStyle = `rgba(${col},0.95)`; ctx.fillRect(box.x + 8, Math.round(yEnd) - 3, box.w - 16, 6);
        }
        if (note.status === 'wait' || note.status === 'miss') {
          ctx.fillStyle = `rgba(${col},0.95)`; ctx.fillRect(box.x + 6, Math.round(y) - 5, box.w - 12, 10);
          ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(box.x + 8, Math.round(y) - 3, box.w - 16, 2);
        }
      }
      // 판정 링·판정 글자·콤보
      for (const f of state.fx) if (f.kind === 'ring') { const box = LANE_BOX[f.lane], k = f.t / f.dur; ctx.strokeStyle = `rgba(255,255,255,${(1 - k).toFixed(2)})`; ctx.lineWidth = 2; ctx.strokeRect(box.x + 2 - k * 6, RECEPTOR_Y - 8 - k * 6, box.w - 4 + k * 12, 16 + k * 12); }
      if (state.judge) { const k = state.judgeT / 0.5; text(state.judge.text, SCREEN_W / 2, 150 - k * 14, { align: 'center', size: 18, color: state.judge.color, alpha: 1 - k * 0.6 }); }
      if (state.play.combo >= 2) text(`${state.play.combo} COMBO`, SCREEN_W / 2, 178, { align: 'center', size: 13, color: '#ffffff' });
    };
    const drawMeters = () => {
      if (!(state.phase === 'soundcheck' || state.phase === 'play' || state.phase === 'title')) return;
      const pop = state.play?.pop ?? RHYTHM.popStart;
      for (const [x, label] of [[8, 'POPU'], [SCREEN_W - 36, 'LARITY']]) {
        text(label, x + (label === 'POPU' ? 0 : 28), 40, { color: '#6fb3ff', size: 12, align: label === 'POPU' ? 'left' : 'right' });
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + 8, 60, 12, 180); ctx.strokeStyle = '#6fb3ff'; ctx.lineWidth = 1; ctx.strokeRect(x + 8.5, 60.5, 11, 179);
        const h = Math.round(176 * pop); ctx.fillStyle = pop > 0.66 ? '#7dff5a' : pop > 0.33 ? '#ffe066' : '#ff6a6a'; ctx.fillRect(x + 10, 60 + 178 - h, 8, h);
      }
      text(`${String(state.stats.score + (state.play?.score || 0)).padStart(6, '0')}`, 8, SCREEN_H - 22, { color: '#7dff5a', size: 16 });
      text('SCORE', 92, SCREEN_H - 18, { color: '#7dff5a', size: 11 });
      text('MAX COMBO', SCREEN_W - 96, SCREEN_H - 18, { color: '#7dff5a', size: 11, align: 'right' });
      text(`${String(Math.max(state.stats.maxCombo, state.play?.maxCombo || 0)).padStart(6, '0')}`, SCREEN_W - 8, SCREEN_H - 22, { color: '#7dff5a', size: 16, align: 'right' });
    };
    const drawBand = () => {
      // 무대 바닥
      ctx.fillStyle = '#3a2f4a'; ctx.fillRect(0, STAND_Y - 6, SCREEN_W, 14);
      ctx.fillStyle = '#4a3d5e'; ctx.fillRect(0, STAND_Y - 6, SCREEN_W, 3);
      for (const b of state.band) {
        const img = sheets[b.id].img, feet = Math.round(b.y);
        // 조명 원
        ctx.fillStyle = 'rgba(255,240,180,0.10)'; ctx.beginPath(); ctx.ellipse(b.x, STAND_Y - 2, 46, 10, 0, 0, Math.PI * 2); ctx.fill();
        if (img && img.complete && img.naturalWidth) {
          const idx = b.frame, sx = (idx % 2) * CELL, sy = Math.floor(idx / 2) * CELL;
          ctx.drawImage(img, sx, sy, CELL, CELL, Math.round(b.x - CELL / 2), feet - FEET, CELL, CELL);
        } else {
          ctx.fillStyle = b.color; ctx.fillRect(b.x - 18, feet - 64, 36, 64);
          text(b.label, b.x, feet - 80, { align: 'center', color: b.color, size: 12 });
        }
      }
      for (const f of state.fx) if (f.kind === 'dust') { const k = f.t / f.dur; ctx.fillStyle = `rgba(200,190,170,${(1 - k) * 0.7})`; for (let i = -3; i <= 3; i++) ctx.fillRect(f.x + i * 12 * (0.4 + k), f.y - 4 - k * 18, 4, 3); }
    };
    const drawAudience = () => {
      // 무대 아래 관객: 머리·어깨 실루엣 두 줄, 박수(cheer) 땐 위아래로 뛰며 팔을 든다
      const rows = [{ y: SCREEN_H - 10, n: 13, off: 0 }, { y: SCREEN_H + 6, n: 14, off: 18 }];
      for (const [ri, row] of rows.entries()) {
        for (let i = 0; i < row.n; i++) {
          const x = row.off + i * 36 + 8, phase = i * 0.7 + ri;
          const bob = state.cheer > 0 ? Math.abs(Math.sin(state.t * 10 + phase)) * 8 : Math.sin(state.t * 2 + phase) * 1.5;
          const y = row.y - bob;
          ctx.fillStyle = ri ? '#0d0a14' : '#171225';
          ctx.beginPath(); ctx.arc(x, y - 22, 9, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(x - 14, y - 14, 28, 20);
          if (state.cheer > 0) { ctx.fillStyle = ri ? '#0d0a14' : '#171225'; ctx.fillRect(x - 17, y - 34 + Math.sin(state.t * 12 + phase) * 3, 4, 16); ctx.fillRect(x + 13, y - 34 - Math.sin(state.t * 12 + phase) * 3, 4, 16); }
        }
      }
    };
    const drawBox = (speaker, body, color = '#fff') => {
      // 대사 상자는 TV 가운데(무대 아래 밴드를 가리지 않게)
      const bx = 14, by = 150, bw = SCREEN_W - 28, bh = 80;
      const dx = state.shake > 0 ? Math.round((Math.random() - 0.5) * 6) : 0;
      ctx.fillStyle = '#000'; ctx.fillRect(bx + dx, by, bw, bh);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx + 1 + dx, by + 1, bw - 2, bh - 2);
      ctx.font = FONT; const lw = Math.max(64, Math.ceil(ctx.measureText(speaker).width) + 18);
      ctx.fillStyle = '#000'; ctx.fillRect(bx + 8 + dx, by - 20, lw, 22); ctx.strokeRect(bx + 9 + dx, by - 19, lw - 2, 20); text(speaker, bx + 8 + lw / 2 + dx, by - 17, { align: 'center', shadow: false, color });
      // 색 분절 + 줄바꿈(폭 기준)
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
      drawTv(); drawLanes(); drawBand(); drawAudience(); drawMeters();
      if (state.phase === 'soundcheck' && state.phaseT < 3) text('← →  사운드 체크: 떨어지는 칸에 맞춰 누르세요', SCREEN_W / 2, 200, { align: 'center', size: 12, color: '#ffe066' });
      drawTalk(); drawOver(); drawResult();
      ctx.restore();
    };

    let last = performance.now(), raf = 0;
    const frame = (now) => { const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; if (!state.exiting) update(dt); draw(); raf = requestAnimationFrame(frame); };
    ov.fit(); addEventListener('resize', ov.fit);
    requestAnimationFrame(() => { ov.root.style.opacity = '1'; });
    raf = requestAnimationFrame(frame);
    window.__rhythm = { state, finish, startTitle, startSong, retry, get play() { return state.play; }, songTime,
      skipTo(phase) { if (phase === 'soundcheck') { for (const b of state.band) { b.y = STAND_Y; b.landed = true; } state.talk = null; startSoundcheck(); } else if (phase === 'song') { for (const b of state.band) { b.y = STAND_Y; b.landed = true; } state.talk = null; startTitle(0); } } };
  });
}
