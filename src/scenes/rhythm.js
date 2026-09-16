// 무대 리듬 게임 오버레이 씬(BUILD181 델타룬 UI 정렬) — 2026-09-15 사용자 브리핑(델타룬 3장 테나 리듬 게임 참고 https://www.youtube.com/watch?v=103D6O-Wr_g).
// 컷신 노드 { scene3d: 'rhythm', flag } 로 실행. 규칙은 rhythm-core.js(순수), 여기는 진행·그리기·소리·입력·영상.
//   화면(델타룬 참고 이미지 기준): 생성 배경 `rhythm_backdrop.png`(매달린 스크린, 좌우 스포트라이트·스피커) 위에 가운데 리듬 기둥 하나(왼쪽 반 ←, 오른쪽 반 →),
//   청록 노트 막대와 흰 박자선이 같이 내려오고 콤보 숫자는 기둥 안에 크게. 밴드는 델타룬 비율(드럼 세트 크게·사람 작게, 셋이 무대 폭에 넓게)로 서고
//   발밑에 바닥 스포트라이트 원이 위아래로 떠다닌다. 관객(생성 띠, 2프레임)은 맨 아래.
//   흐름: 페이드인 → 셋이 왼쪽부터 떨어져 자리 → 대사 → 사운드 체크(작은별) → 룰 대사(‘죽습니다’) → ‘관객 여러분들 즐길 준비되셨나요?’ → 함성·박수·꽃·불꽃 →
//   노래방식 제목 + 앰프 피드백 → 스크린 켜지며 영상·플레이 → 기립 환호 → 대사 → 둘째 곡(악질 시청자) → 대사 → 셋째 곡(보X팜) → 결과.
//   하이라이트(코러스, chart.highlights — 보X팜 마지막 ‘보x 존나 팔고~’ 등): 들어가는 순간 함성·꽃·양옆 불꽃, 구간 내내 색색 컬러 빔·박자 스트로브·색종이·
//   바닥 원 펄스·관객 점프, 마디마다 불꽃, 16박마다 환호, 끝나면 박수.
//   양옆 패드(경섭 드럼 | 빠맨 보컬)도 가운데와 같은 두 칸짜리 기둥이고 알아서 친다(사용자 확정): 자동 노트가 판정선에 닿으면 반짝 + 드럼·노래 애니.
//   소리(BUILD183 사용자 최종 확정 “소리 없애고 리듬으로만”): 곡 중 GREAT·홀드는 소리 없음(반짝만). 노트 없는 데 누르면 긁기 0.22, MISS 는 데드 노트(툭) 0.3, 영상 1.0(+WebAudio 게인 1.1), 관객 소리는 곡 중 0.6배.
//   관객 소리(BUILD187, 사용자 “휘파람 전자음 같다·진짜 박수·환호 자연스럽게”): 전부 실제 녹음(assets/source/crowd187) — 종류별 변형 2개 번갈아, 쿨다운, 속도 ±4%, 앞 환호 페이드, 곡 중엔 흥(excite)에 따라 커지는 바닥 루프(crowd_bed).
//   사운드 체크(작은별)만 음정 일렉(c4/g4/a4). 노앰토리는 영상은 처음부터 틀고 노트만 18.2초 ‘만원 주면~’부터(chart.notesFrom, 사용자 정정).
//   홀드는 꾹 누르다 떼면 성공(중간에 떼도 MISS 아님, 사용자 확정).
//   피해(BUILD190 사용자 “5번 틀리면 실패가 아니라 틀릴 때마다 형섭·경섭·빠맨 체력 10씩, 전투 맞는 피해처럼 퍽 소리”): MISS 마다 파티 HP(game.partyHp, 전투와 같은 값) 10 씩,
//   퍽(hit+damage) 소리·붉은 −10 팝업·흔들림, 아래 가운데 HP 띠 셋. 누구 하나 0 이 되면 “무대가 엉망이 됐다” → C 재도전(HP 는 곡 시작 값으로 복구).
//   신호 품질(BUILD183 사용자 “리듬을 잘 맞춰야 노래가 나오고 못 맞추면 지직거리며 덜 나온다”): state.signal 0~1. GREAT +0.15, MISS −0.3(+‘지직’ 버스트·화면 찢김).
//   노래 볼륨 = 0.25 + 0.75×signal, 잡음 루프 볼륨 = (1−signal)×0.35, 스크린엔 (1−signal) 만큼 노이즈 점·어둡게. 곡 시작·재도전 때 1.
import { Input } from '../core/input.js';
import { FONT, F } from '../ui/font.js';
import { SCREEN_W, SCREEN_H } from '../world/world.js';
import { makePlay, stepPlay, finished, sideHits, sideTime, visibleNotes, grade, beatAt, highlightAt, RHYTHM, TWINKLE } from './rhythm-core.js';

const BAND = [
  // draw = 화면 크기(px, 128 셀 기준). 델타룬 비율(사람 키 ≈ 화면 높이 15%, 드럼 ≈ 19%)에서 사용자 요청으로 15% 키움(BUILD185), 셋이 무대 폭 15/46/78% 자리
  { id: 'gyeongsub', label: '경섭', color: '#ff6fa8', sheet: 'assets/sprites/band_gyeongsub.png', x: 112, draw: 87, voice: 'gyeongsub' },
  { id: 'hyungsub', label: '형섭', color: '#4fd8ff', sheet: 'assets/sprites/band_hyungsub.png', x: 240, draw: 74, voice: 'hyungsub' },
  { id: 'ppaman', label: '빠맨', color: '#7dff5a', sheet: 'assets/sprites/band_ppaman.png', x: 372, draw: 76, voice: 'ppaman' },
];
const BACKDROP = 'assets/props/rhythm_backdrop.png', AUDIENCE = 'assets/props/rhythm_audience.png';
// 신호가 나쁠 때 최상위에 뜨는 ‘● 연결 안 됨’ 배지(사용자 참고 이미지 느낌: 연분홍 알약 + 소용돌이 아이콘 + 빨간 점, 글자는 폰트로)
const BADGE = 'assets/props/ui_badge_disconnected.png', BADGE_SHOW = 0.6;
const CELL = 128, FEET = 122, STAND_Y = 290;
// 생성 배경 속 스크린(측정값): 영상은 여기에
const TV = { x: 106, y: 34, w: 264, h: 148 };
// 델타룬식 리듬 기둥: 가운데 하나, 왼쪽 반 = ←, 오른쪽 반 = →. 흰 박자선이 노트와 함께 내려오고 콤보는 기둥 안에 크게
const LANE_TOP = 20, RECEPTOR_Y = 198, LANE = { x: 190, w: 100 };
const HALF = { L: { x: LANE.x, w: LANE.w / 2 }, R: { x: LANE.x + LANE.w / 2, w: LANE.w / 2 } };
const NOTE_RGB = '92,226,208', LINE_RGB = '86,204,222';
// GREAT 빔(BUILD195, 사용자 “타이밍 맞게 누르면 패드가 꺼지는 게 아니라 노랗게 세로로 빔이 삐용 쏴지는 이펙트” → “지금 너무 길잖아”): 판정 칸이 노랗게 켜지고 그 위로 짧은 빔(rise px)이 튀었다 사라진다. 기둥 끝까지 가는 긴 빔은 뺐다
const BEAM = { dur: 0.28, rise: 90, rgb: '255,224,102', core: '255,244,180' };   // 사용자 “적당히 길게”: 기둥 절반쯤(판정선 위 90px)
// 양옆 자동 패드(경섭 드럼·빠맨 보컬): 가운데와 같은 두 칸짜리 기둥(각 40px 반칸)
const SIDE = { drums: { x: 100, w: 80, rgb: '255,111,168', label: '경섭' }, vocal: { x: 300, w: 80, rgb: '125,255,90', label: '빠맨' } };
const sideHalf = (sd, lane) => ({ x: lane === 'R' ? sd.x + sd.w / 2 : sd.x, w: sd.w / 2 });
// 믹스: 노래가 주인공. 곡 중 기타 소리는 없다(리듬으로만)
// song: 요소 볼륨(최대 1) — 사용자 “노래 10% 더” 는 WebAudio 게인(songGain)으로 1.1배. bed: 곡 중 깔리는 관객 웅성·박수 바닥 소리의 최대치
const MIX = { song: 1.0, songGain: 1.1, scratch: 0.22, miss: 0.3, crowdInSong: 0.6, songFloor: 0.25, staticMax: 0.35, bed: 0.22 };
// 환호를 자연스럽게(사용자): 같은 소리 재발동 최소 간격, 변형 샘플을 번갈아, 재생 속도 ±4%, 새 환호가 시작되면 앞 환호는 서서히 줄인다
const CROWD_VARIANTS = { applause: ['applause', 'applause_2'], cheer: ['crowd_cheer', 'crowd_cheer_2'], roar: ['crowd_roar', 'crowd_roar_2'] };
const CROWD_COOLDOWN = { applause: 1.2, cheer: 2.5, roar: 4.0 };
const SIGNAL = { great: 0.15, miss: 0.3, glitch: 0.35 };
// MISS 피해: 파티 셋 HP −10(전투 HP 와 같은 값). HP 띠 색은 characters.js 의 hpColor 와 같다
// 아래 HUD 띠(28px): 왼쪽 SCORE · 가운데 파티 HP(이름 32 + 숫자 24 = 56 ≤ hpW) · 오른쪽 MAX COMBO. 글자는 전부 기본 16px
const HUD = { h: 28, hpW: 58, hpGap: 8 };
const MISS_DAMAGE = 10, HP_COLORS = { hyungsub: '#7fd0ff', gyeongsub: '#ff5c5c', ppaman: '#c9a3ff' };
const PITCH_SFX = { 261.63: 'guitar_c4', 392: 'guitar_g4', 440: 'guitar_a4' };
const HI_COLORS = ['255,110,190', '110,220,255', '255,225,110', '150,255,140'];
// 세 곡(사용자 확정 순서): 방가방가 노앰토리 → 악질 시청자(-쥰희- 버전, oQ0P4mRV_wA) → 보X팜
const SONGS = ['assets/rhythm/noamtori.json', 'assets/rhythm/akjil.json', 'assets/rhythm/bojipam.json'];
const CHAR_DELAY = 0.032;
const SPEAKERS = { gyeongsub: { label: '경섭', color: '#ff6fa8' }, ppaman: { label: '억빠맨', color: '#c9a3ff' }, ttuulla: { label: '뚜울라알라', color: '#ffd166' } };
const TALK1 = [
  { who: 'gyeongsub', text: '오 드럼이네' },
  { who: 'ppaman', text: '제.. 제가 노래해요?' },
  { who: 'gyeongsub', text: 'ㅋㅋㅋㅋ 노래실력 본다 형이 또 노래랑 일가견이 있는데 카인노래방이..' },
  { who: 'ttuulla', text: '자 형님들  준비 되셨습니까? 일단 뭐 사운드 체크 해보십시요' },
  // 조작 안내(사용자 2026-09-16): 사운드 체크 직전 한 줄, 화살표는 노란색. 두 화살표 사이는 nbsp — 줄이 넘어갈 때 둘이 같이 넘어간다
  { who: 'ttuulla', text: '키보드 왼쪽 오른쪽 두개로 리듬을 맞출수있습니다 {y}←\u00a0→{/}' },
];
const TALK2 = [
  { who: 'ttuulla', text: '자 룰을 알려드리겠습니다 여러분들이 최고의 무대를 만들어주셔야합니다' },
  { who: 'ttuulla', text: '만약 만족스럽지 못한곡 연주를 하신다면.' },
  { who: 'ttuulla', text: '{r}죽습니다{/}', shake: true },
  { who: 'ttuulla', text: '관객 여러분들 즐길 준비되셨나요?' },
];
// cheer: 노래 제목을 공개하는 줄엔 관객 박수·환호(사용자: “노래 제목 공개할 때마다 박수도”)
const TALK2B = [{ who: 'ttuulla', text: '자 그럼 시작해봅시다. 처음곡은 {y}방가방가 노앰토리{/}~', cheer: 2 }];
// 곡 사이 대사(사용자 원문): 첫 곡 뒤 → 악질 시청자, 둘째 곡 뒤 → 보X팜. 제목 줄은 노란색 + 박수
const TALK3 = [
  { who: 'ttuulla', text: '너무 감동적인 곡이군요...' },
  { who: 'ttuulla', text: '환상적인 연주네요~' },
  { who: 'ttuulla', text: '이제 이게 끝이 아닙니다.' },
  { who: 'ttuulla', text: '이어서 다음곡 가보겠습니다' },
  { who: 'ttuulla', text: '아 이 노래가 나오나요?' },
  { who: 'ttuulla', text: '전설의 {y}악질 시청자{/}', cheer: 2 },
];
const TALK4 = [
  { who: 'ttuulla', text: '캬 완벽한 곡이긴하네요 다시들어도,' },
  { who: 'ttuulla', text: '저의 최애곡이기도합니다' },
  { who: 'ttuulla', text: '어쨌든 여러분들 아쉽겠지만 이제 마지막 곡입니다' },
  { who: 'ttuulla', text: '노라니의 {y}보x팜{/}!!', cheer: 3 },
];
const TALK_AFTER = [TALK3, TALK4];
const HUM = 2.2, TITLE_IN = 1.0, HYPE = 3.2, OVATION = 3.0;
// 둥가둥가(사용자 최종: “숨 쉬듯이” — 프레임을 바꾸면 역동적으로 보여서 groove 프레임(셀 4~7)은 안 쓴다): 기본 자세 그대로 두 박에 한 번 1px 내려앉았다 올라온다
const BREATH_PX = 1;
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
    const backdrop = loadImage(BACKDROP), audienceImg = loadImage(AUDIENCE), badgeImg = loadImage(BADGE);
    const typer = new Typewriter(game.sound);
    const sound = game.sound;
    const sfx = (name, volume = 0.7, len = 0, rate = 1, pitch = false) => sound.sfx(name, { volume, len, rate, pitch });
    const state = {
      t: 0, phase: 'drop', phaseT: 0, exiting: false,
      band: BAND.map((b, i) => ({ ...b, y: -160, landed: false, delay: 0.3 + i * 0.75, frame: 0, animT: 0 })),
      talk: null, chart: null, play: null, song: 0, video: null, videos: [], clock: 0, fromClock: false,
      judge: null, judgeT: 0, cheer: 0, cheerBig: false, lastCombo10: 0, sideT: 0, tvOn: 0, title: null, hum: 0, over: false, flash: 0,
      stats: { score: 0, maxCombo: 0, songs: [] }, shake: 0, fx: [], flowers: [], holds: {}, chord: 0, beam: 0,
      hi: false, hiT: 0, lastBeat: -1, strobe: 0, confetti: [], sparks: [],
      signal: 1, glitch: 0, noise: null, coins: [], after: null, badge: 0,
      hpAtStart: {}, hurt: {},
      crowdLast: { applause: -9, cheer: -9, roar: -9 }, crowdPick: { applause: 0, cheer: 0, roar: 0 }, crowdActive: [], bed: null, excite: 0,
      result: null, paused: false,
    };
    const charts = SONGS.map(src => fetch(src).then(r => r.json()).catch(() => null));
    const makeVideo = (src) => {
      const v = document.createElement('video'); v.src = src; v.preload = 'auto'; v.playsInline = true; v.volume = MIX.song; v.style.display = 'none'; document.body.appendChild(v);
      // 노래를 WebAudio 게인(1.1)으로 — 요소 볼륨은 1 이 상한이라(사용자 “노래 10% 더”). 컨텍스트가 아직 없으면(잠금 해제 전) 요소 볼륨만
      try { const ac = sound.ctx; if (ac) { const src = ac.createMediaElementSource(v); const g = ac.createGain(); g.gain.value = MIX.songGain; src.connect(g); g.connect(ac.destination); } } catch (e) { /* 이미 연결됐거나 지원 안 함 */ }
      return v;
    };
    Promise.all(charts).then(list => { state.charts = list; state.videos = list.map(c => c && c.video ? makeVideo(c.video) : null); });

    const prev = Object.create(null);
    const edge = (action) => { const down = Input.down(action) || !!Input.pressed[action]; const just = down && !prev[action]; prev[action] = down; return just; };
    const held = (action) => Input.down(action);
    const stopHold = (lane, quick = true) => { const h = state.holds[lane]; if (!h) return; state.holds[lane] = null; let v = h.volume; const step = () => { v -= quick ? 0.25 : 0.08; if (v <= 0.02) { try { h.pause(); h.src = ''; } catch (e) { /* */ } } else { h.volume = Math.max(0, v); setTimeout(step, 30); } }; step(); };
    // 방송 잡음 루프: 곡 동안 돌며 볼륨만 신호 품질로 조절. 곡이 끝나거나 게임오버·씬 종료면 끊는다
    const startNoise = () => { stopNoise(); const a = sfx('static_loop', 0); if (a && typeof a === 'object') { a.loop = true; state.noise = a; } };
    const stopNoise = () => { const a = state.noise; if (!a) return; state.noise = null; try { a.pause(); a.src = ''; } catch (e) { /* */ } };
    const applySignal = () => {
      const v = state.video; if (v) v.volume = MIX.song * (MIX.songFloor + (1 - MIX.songFloor) * state.signal);
      if (state.noise) state.noise.volume = Math.min(1, (1 - state.signal) * MIX.staticMax);
    };
    const finish = (found) => {
      if (state.exiting) return; state.exiting = true;
      stopNoise(); stopBed(); for (const c of state.crowdActive) { try { c.a.pause(); c.a.src = ''; } catch (e) { /* */ } }
      for (const lane of ['L', 'R']) stopHold(lane);
      for (const v of state.videos) if (v) { try { v.pause(); } catch (e) { /* */ } v.remove(); }
      ov.root.style.transition = 'opacity 0.6s ease'; ov.root.style.opacity = '0';
      setTimeout(() => { cancelAnimationFrame(raf); removeEventListener('resize', ov.fit); ov.root.remove(); delete window.__rhythm; resolve({ found }); }, 620);
    };
    const bandOf = (id) => state.band.find(b => b.id === id);
    const strum = (kind = 'tap') => { const h = bandOf('hyungsub'); h.frame = kind === 'hold' ? 3 : (h.frame === 1 ? 2 : 1); h.animT = kind === 'hold' ? 0.6 : 0.22; };
    const drumHit = () => { const d = bandOf('gyeongsub'); d.frame = 1 + Math.floor(Math.random() * 3); d.animT = 0.18; };
    const sing = () => { const v = bandOf('ppaman'); v.frame = 1 + Math.floor(Math.random() * 3); v.animT = 0.3; };
    // 관객 소리 한 번: 종류별 쿨다운·변형 번갈아·속도 ±4%·앞 환호는 서서히 줄임. 길이 len(초) 뒤 자연 종료
    const crowdSfx = (kind, volume, force = false) => {
      const now = state.t;
      if (!force && now - state.crowdLast[kind] < CROWD_COOLDOWN[kind]) return null;
      state.crowdLast[kind] = now;
      const names = CROWD_VARIANTS[kind], name = names[state.crowdPick[kind] % names.length]; state.crowdPick[kind] += 1;
      const rate = 0.96 + Math.random() * 0.08;
      const a = sfx(name, Math.min(1, volume), 0, rate) || sfx(names[0], Math.min(1, volume), 0, rate);
      if (a && typeof a === 'object') {
        // 같은 종류의 앞 소리는 0.6초에 걸쳐 줄인다(겹쳐 쿵 하지 않게)
        for (const c of state.crowdActive) if (c.kind === kind && c.a !== a) c.fade = 0.6;
        state.crowdActive.push({ kind, a, fade: 0, t: 0 });
      }
      return a;
    };
    const cheer = (level) => {
      state.cheer = level >= 4 ? 7 : level >= 3 ? 3.4 : level >= 2 ? 2.4 : 1.6; state.cheerBig = level >= 2;
      state.excite = Math.min(1, state.excite + (level >= 3 ? 0.5 : level >= 2 ? 0.3 : 0.15));
      const m = state.phase === 'play' && level < 4 ? MIX.crowdInSong : 1;
      // 4 = 곡이 끝났을 때의 기립 환호(사용자: “더 크게 오래”): 함성이 겹치며 이어지고 박수가 길게 남는다
      if (level >= 4) { crowdSfx('roar', 0.95, true); crowdSfx('applause', 0.75, true); state.flash = 0.6; setTimeout(() => { if (!state.exiting) { crowdSfx('roar', 0.8, true); crowdSfx('cheer', 0.6, true); } }, 1400); setTimeout(() => { if (!state.exiting) crowdSfx('applause', 0.7, true); }, 3200); }
      else if (level >= 3) { crowdSfx('roar', 0.75 * m); crowdSfx('applause', 0.55 * m); state.flash = 0.4; }
      else if (level >= 2) { crowdSfx('cheer', 0.65 * m); crowdSfx('applause', 0.45 * m); }
      else crowdSfx('applause', 0.55 * m);
    };
    // 곡 중 바닥 소리(관객 웅성·산발 박수 루프): 흥(excite)이 오를수록 커지고 천천히 가라앉는다 — 환호가 뚝뚝 끊기지 않게 잇는 층
    const startBed = () => { stopBed(); const a = sfx('crowd_bed', 0); if (a && typeof a === 'object') { a.loop = true; state.bed = a; } };
    const stopBed = () => { const a = state.bed; if (!a) return; state.bed = null; let v = a.volume; const step = () => { v -= 0.03; if (v <= 0.01) { try { a.pause(); a.src = ''; } catch (e) { /* */ } } else { a.volume = Math.max(0, v); setTimeout(step, 60); } }; step(); };
    // 무대 양옆 불꽃(파이로) + 위에서 떨어지는 색종이 — 하이라이트·환호 연출
    const pyro = (n = 12) => { for (const sx of [64, 416]) for (let i = 0; i < n; i++) state.sparks.push({ x: sx + (Math.random() - 0.5) * 10, y: 270, vx: (Math.random() - 0.5) * 90, vy: -(170 + Math.random() * 150), t: 0, dur: 0.55 + Math.random() * 0.35 }); };
    const confetti = (n) => { for (let i = 0; i < n; i++) state.confetti.push({ x: Math.random() * SCREEN_W, y: -6 - Math.random() * 30, vy: 55 + Math.random() * 70, t: Math.random() * 6, color: i % 5 === 4 ? '#ffffff' : FLOWER_COLORS[i % FLOWER_COLORS.length], seed: Math.random() * 7 }); };
    // 동전 던지기(사용자): 관객석에서 무대로 포물선, 무대 바닥에 한 번 튀며 ‘팅’
    const throwCoins = (n = 16) => { for (let i = 0; i < n; i++) { const x0 = 40 + Math.random() * 400; state.coins.push({ x: x0, y: 356, vx: (Math.random() - 0.5) * 50 + (240 - x0) * 0.4, vy: -(260 + Math.random() * 130), t: -Math.random() * 1.2, floor: STAND_Y - 14 + Math.random() * 12, bounced: 0, spin: Math.random() * 6 }); } };
    const throwFlowers = (n = 14) => { for (let i = 0; i < n; i++) state.flowers.push({ x: 40 + Math.random() * 400, y: 356, vx: (Math.random() - 0.5) * 60 + (240 - (40 + Math.random() * 400)) * 0.35, vy: -(230 + Math.random() * 120), t: -Math.random() * 0.8, color: FLOWER_COLORS[i % FLOWER_COLORS.length], spin: Math.random() * 6 }); };

    const talkLine = (l) => { typer.start(l.text, l.who); if (l.shake) state.shake = 0.5; if (l.cheer) { cheer(l.cheer); throwFlowers(l.cheer >= 3 ? 14 : 8); if (l.cheer >= 3) pyro(12); } };
    const startTalk = (lines, next) => { state.phase = 'talk'; state.talk = { lines, i: 0, next }; talkLine(lines[0]); };
    const advanceTalk = () => {
      const tk = state.talk; tk.i += 1;
      if (tk.i >= tk.lines.length) { state.talk = null; tk.next(); return; }
      talkLine(tk.lines[tk.i]);
    };
    const startSoundcheck = () => { state.phase = 'soundcheck'; state.phaseT = 0; state.chart = TWINKLE; state.play = makePlay(TWINKLE); state.clock = 0; state.judge = null; };
    const startHype = () => { state.phase = 'hype'; state.phaseT = 0; cheer(3); throwFlowers(18); pyro(24); confetti(40); };
    const startTitle = (index) => {
      const chart = state.charts?.[index];
      if (!chart) { finish(true); return; }
      state.song = index; state.chart = chart; state.play = makePlay(chart); state.phase = 'title'; state.phaseT = 0; state.title = { k: 0 }; state.hum = 0; state.tvOn = 0; state.over = false; state.judge = null; state.lastCombo10 = 0;
      state.hi = false; state.lastBeat = -1; state.confetti = []; state.sparks = [];
      // 두 번째 곡부터는 제목 카드가 뜰 때 관객 환호(사용자: 보X팜 시작할 때 환호)
      if (index >= 1) { cheer(3); throwFlowers(14); pyro(16); }
    };
    const startSong = () => {
      const v = state.videos?.[state.song];
      state.phase = 'play'; state.phaseT = 0; state.sideT = 0; state.clock = 0; state.fromClock = !v; state.video = v; state.signal = 1; state.glitch = 0;
      startNoise(); applySignal(); startBed(); saveHp();
      if (v) { v.currentTime = 0; v.play().catch(() => { v.muted = true; v.play().catch(() => { state.fromClock = true; }); }); }
    };
    const retry = () => {
      for (const lane of ['L', 'R']) stopHold(lane);
      state.play = makePlay(state.chart); state.over = false; state.judge = null; state.clock = 0; state.sideT = 0; state.lastCombo10 = 0; state.hi = false; state.lastBeat = -1; state.signal = 1; state.glitch = 0;
      startNoise(); applySignal(); startBed(); restoreHp(); saveHp();
      const v = state.video; if (v) { v.currentTime = 0; v.play().catch(() => {}); }
      sfx('confirm', 0.7);
    };
    const songTime = () => (state.video && !state.fromClock) ? state.video.currentTime : state.clock;
    // 일시정지: 영상(=차트 시계)·잡음 루프·관객 바닥 루프를 멈추고 홀드를 놓는다. 다시 C 로 이어서
    const setPaused = (on) => {
      state.paused = on;
      const v = state.video && !state.fromClock ? state.video : null, loops = [state.noise, state.bed].filter(Boolean);
      if (on) { for (const lane of ['L', 'R']) stopHold(lane); if (v) { try { v.pause(); } catch (e) { /* */ } } for (const a of loops) { try { a.pause(); } catch (e) { /* */ } } }
      else { if (v) v.play().catch(() => {}); for (const a of loops) { try { a.play().catch(() => {}); } catch (e) { /* */ } } }
      sfx('confirm', 0.5);
    };
    // 파티(형섭 + 동료) — 리듬 게임 피해는 전투 HP(game.partyHp) 를 그대로 깎는다
    const partyIds = () => ['hyungsub', ...(game.party || [])].filter(id => BAND.some(b => b.id === id));
    const hpOf = id => game.hpOf(id), maxHpOf = id => game.maxHpOf(id);
    const saveHp = () => { state.hpAtStart = Object.fromEntries(partyIds().map(id => [id, hpOf(id)])); };
    const restoreHp = () => { for (const [id, hp] of Object.entries(state.hpAtStart)) game.partyHp[id] = hp; };
    // MISS 피해: 셋 다 −10, 맞는 소리(damage)만 살짝 작게 — 검 소리(hit)는 겹쳐서 뺐다(사용자 2026-09-16), 붉은 −10 팝업, 잠깐 흔들림. 누구 하나 0 이면 무대 실패
    const damageParty = () => {
      let down = false;
      for (const id of partyIds()) {
        const hp = Math.max(0, hpOf(id) - MISS_DAMAGE); game.partyHp[id] = hp; if (hp <= 0) down = true;
        const b = bandOf(id); if (b) { state.hurt[id] = 0.35; state.fx.push({ kind: 'dmg', x: b.x, y: STAND_Y - Math.round(b.draw * 0.95), t: 0, dur: 0.8, text: `-${MISS_DAMAGE}` }); }
      }
      sfx('damage', 0.4);
      return down;
    };
    // 결과창(사용자: “한 글자씩 주루루룩”): 줄마다 글자가 0.035초 간격으로 찍히며 틱 소리, 줄 사이 0.35초 쉼, 다 찍히면 C
    const startResult = () => {
      const lines = [{ text: '무대 끝!', x: SCREEN_W / 2, y: 56, size: 32, color: '#ffe066', align: 'center' }];
      state.stats.songs.forEach((sg, i) => {
        lines.push({ text: sg.title, x: 70, y: 112 + i * 44, size: F.size, color: '#ffe066', align: 'left' });
        lines.push({ text: `SCORE ${sg.score}   MAX COMBO ${sg.maxCombo}   ${sg.grade}`, x: 70, y: 132 + i * 44, size: F.size, color: '#fff', align: 'left' });
      });
      lines.push({ text: `총점 ${state.stats.score}`, x: SCREEN_W / 2, y: 262, size: 24, color: '#7dff5a', align: 'center' });
      state.phase = 'result'; state.phaseT = 0; state.result = { lines, line: 0, shown: 0, timer: 0, gap: 0, done: false };
      sfx('won', 0.8);
    };
    const updateResult = (dt) => {
      const r = state.result; if (!r || r.done) return;
      if (r.gap > 0) { r.gap -= dt; return; }
      r.timer += dt;
      while (r.timer >= 0.035 && !r.done) {
        r.timer -= 0.035; r.shown += 1; sound.blip('narrator');
        if (r.shown >= r.lines[r.line].text.length) { r.line += 1; r.shown = 0; r.gap = 0.35; if (r.line >= r.lines.length) { r.done = true; sfx('great_shine', 0.5); } break; }
      }
    };
    const endSong = () => {
      for (const lane of ['L', 'R']) stopHold(lane, false);
      const p = state.play; state.stats.songs.push({ title: state.chart.title, score: p.score, maxCombo: p.maxCombo, grade: grade(p) });
      state.stats.score += p.score; state.stats.maxCombo = Math.max(state.stats.maxCombo, p.maxCombo);
      if (state.video) { try { state.video.pause(); } catch (e) { /* */ } }
      stopNoise(); state.signal = 1; state.hi = false; setTimeout(stopBed, 2500);
      // 기립 환호(크게·오래) + 꽃·동전·불꽃·색종이 → 잠시 즐긴 뒤 대사/결과
      state.phase = 'ovation'; state.phaseT = 0;
      cheer(4); throwFlowers(36); throwCoins(28); pyro(30); confetti(80);
      const idx = state.song;
      state.after = idx < SONGS.length - 1 ? () => startTalk(TALK_AFTER[idx], () => startTitle(idx + 1)) : startResult;
    };

    const update = (dt) => {
      state.t += dt; state.phaseT += dt;
      state.shake = Math.max(0, state.shake - dt); state.flash = Math.max(0, state.flash - dt * 1.6);
      if (state.judge) { state.judgeT += dt; if (state.judgeT > 0.5) state.judge = null; }
      state.cheer = Math.max(0, state.cheer - dt);
      state.beam += dt;
      for (const b of state.band) { if (b.animT > 0) { b.animT -= dt; if (b.animT <= 0) b.frame = 0; } if (state.hurt[b.id] > 0) state.hurt[b.id] -= dt; }
      state.fx = state.fx.filter(f => (f.t += dt) < f.dur);
      for (const fl of state.flowers) { fl.t += dt; if (fl.t < 0) continue; fl.x += fl.vx * dt; fl.vy += 520 * dt; fl.y += fl.vy * dt; }
      state.flowers = state.flowers.filter(fl => fl.y < 380 && fl.t < 4);
      for (const c of state.coins) {
        c.t += dt; if (c.t < 0) continue;
        c.x += c.vx * dt; c.vy += 560 * dt; c.y += c.vy * dt;
        if (c.y >= c.floor && c.vy > 0 && c.bounced < 2) { c.y = c.floor; c.vy = -c.vy * 0.38; c.vx *= 0.6; c.bounced += 1; if (c.bounced === 1) sound.tone({ freq: 1900 + Math.random() * 900, wave: 'triangle', dur: 0.07, gain: 0.1 }); }
      }
      state.coins = state.coins.filter(c => c.t < 5 && c.y < 380);
      for (const c of state.confetti) { c.t += dt; c.y += c.vy * dt; c.x += Math.sin(c.t * 3 + c.seed) * 22 * dt; }
      state.confetti = state.confetti.filter(c => c.y < SCREEN_H + 4);
      for (const sp of state.sparks) { sp.t += dt; sp.vy += 420 * dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; }
      state.sparks = state.sparks.filter(sp => sp.t < sp.dur);
      state.strobe = Math.max(0, state.strobe - dt * 2.2); state.glitch = Math.max(0, state.glitch - dt);
      // 관객 소리 층: 줄이기로 표시된 앞 환호를 서서히 줄이고, 흥은 천천히 식으며 바닥 루프 볼륨을 따라간다
      for (const c of state.crowdActive) { c.t += dt; if (c.fade > 0) { c.a.volume = Math.max(0, c.a.volume - dt / c.fade); if (c.a.volume <= 0.01) { try { c.a.pause(); c.a.src = ''; } catch (e) { /* */ } c.done = true; } } if (c.a.ended || c.a.paused && c.t > 0.5) c.done = true; }
      state.crowdActive = state.crowdActive.filter(c => !c.done);
      state.excite = Math.max(0, state.excite - dt * (state.hi ? 0.02 : 0.08));
      if (state.bed) state.bed.volume = Math.min(1, MIX.bed * (0.25 + 0.75 * state.excite) * (state.phase === 'play' ? 1 : 0.6));
      // 배지: 곡 중 신호가 나쁘면 스르륵 나타나고 회복하면 사라진다
      const wantBadge = state.phase === 'play' && !state.over && state.signal < BADGE_SHOW;
      state.badge = Math.max(0, Math.min(1, state.badge + (wantBadge ? dt * 4 : -dt * 3)));
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
      if (state.phase === 'ovation') { if (state.phaseT >= OVATION && state.after) { const f = state.after; state.after = null; f(); } return; }
      if (state.phase === 'title') {
        state.title.k = Math.min(1, state.phaseT / TITLE_IN);
        if (state.phaseT >= TITLE_IN && !state.hum) { state.hum = 1; sfx('guitar_feedback', 0.7); }
        if (state.phaseT >= TITLE_IN + HUM) { state.tvOn = 0.001; startSong(); }
        return;
      }
      if (state.phase === 'soundcheck' || state.phase === 'play') {
        if (state.phase === 'play' && state.tvOn > 0 && state.tvOn < 1) state.tvOn = Math.min(1, state.tvOn + dt / 0.5);
        if (state.over) { if (confirm) retry(); return; }
        if (state.paused) { if (confirm) setPaused(false); return; }
        if (confirm) { setPaused(true); return; }
        if (state.fromClock || state.phase === 'soundcheck') state.clock += dt;
        const time = songTime();
        const input = { press: { L: edge('left'), R: edge('right') }, held: { L: held('left'), R: held('right') } };
        const events = stepPlay(state.play, time, input);
        for (const e of events) {
          if (e.type === 'great') {
            state.judge = { text: 'GREAT!', color: '#7dffb0' }; state.judgeT = 0; state.fx.push({ kind: 'ring', lane: e.lane, t: 0, dur: 0.35 }, { kind: 'beam', lane: e.lane, t: 0, dur: BEAM.dur });
            state.signal = Math.min(1, state.signal + SIGNAL.great);
            // 곡 중엔 소리 없음(리듬으로만). 사운드 체크(작은별)만 음정 일렉 — 홀드는 그 음을 길게
            if (e.note.dur) { strum('hold'); stopHold(e.lane); if (e.note.pitch) { const h = sfx(PITCH_SFX[e.note.pitch], 0.7); if (h && typeof h === 'object') state.holds[e.lane] = h; } }
            else { strum('tap'); if (e.note.pitch) sfx(PITCH_SFX[e.note.pitch], 0.7); }
          }
          if (e.type === 'holdEnd') { state.fx.push({ kind: 'ring', lane: e.lane, t: 0, dur: 0.3 }, { kind: 'beam', lane: e.lane, t: 0, dur: BEAM.dur }); stopHold(e.lane, false); state.signal = Math.min(1, state.signal + SIGNAL.great * 0.5); }
          if (e.type === 'miss') {
            state.judge = { text: 'MISS', color: '#ff6a6a' }; state.judgeT = 0; sfx('guitar_dead', MIX.miss); if (e.why === 'release') stopHold(e.lane);
            if (state.phase === 'play') {
              state.signal = Math.max(0, state.signal - SIGNAL.miss); state.glitch = SIGNAL.glitch; sfx('static_burst', 0.55);
              // 틀릴 때마다 파티 HP −10(퍽). 누구 하나 0 → 게임오버(재도전)
              if (damageParty() && !state.over) events.push({ type: 'over' });
            }
          }
          if (e.type === 'empty') { sfx('guitar_scratch', MIX.scratch); strum('tap'); }
          if (e.type === 'over') { state.over = true; for (const lane of ['L', 'R']) stopHold(lane); if (state.video) { try { state.video.pause(); } catch (err) { /* */ } } stopNoise(); stopBed(); sfx('damage', 0.8); state.shake = 0.5; }
        }
        // 하이라이트(코러스): 들어가는 순간 함성·꽃·불꽃·색종이, 구간 내내 관객 점프·색종이·마디 첫 박 스트로브+불꽃, 16박마다 환호, 나오면 박수
        const hiIdx = state.phase === 'play' ? highlightAt(state.chart, time) : -1;
        if (hiIdx >= 0 && !state.hi) { state.hiT = 0; state.lastBeat = -1; cheer(3); throwFlowers(16); pyro(22); confetti(60); }
        else if (hiIdx < 0 && state.hi) cheer(1);
        state.hi = hiIdx >= 0;
        if (state.hi) {
          state.hiT += dt; state.cheer = Math.max(state.cheer, 0.6);
          if (state.confetti.length < 120) confetti(2);
          const bi = Math.floor(beatAt(state.chart, time).beat);
          if (bi !== state.lastBeat) {
            state.lastBeat = bi;
            const bar = ((bi % 4) + 4) % 4 === 0;
            state.strobe = bar ? 0.45 : Math.max(state.strobe, 0.18);
            if (bar) pyro(8);
            if (((bi % 16) + 16) % 16 === 8) crowdSfx('cheer', 0.45 * MIX.crowdInSong);
          }
        }
        if (state.phase === 'play') applySignal();
        const c10 = Math.floor(state.play.combo / 10);
        if (c10 > state.lastCombo10 && state.play.combo > 0) { state.lastCombo10 = c10; cheer(c10 >= 5 ? 3 : c10 >= 2 ? 2 : 1); if (c10 >= 3) throwFlowers(6); }
        if (state.play.combo === 0) state.lastCombo10 = 0;
        const side = sideHits(state.chart, state.sideT, time); state.sideT = time;
        if (side.drums.length) { drumHit(); for (const it of side.drums) state.fx.push({ kind: 'sidering', lane: 'drums', half: it.lane || 'L', t: 0, dur: 0.25 }); }
        if (side.vocal.length) { sing(); for (const it of side.vocal) state.fx.push({ kind: 'sidering', lane: 'vocal', half: it.lane || 'L', t: 0, dur: 0.3 }); }
        if (finished(state.play, time)) {
          if (state.phase === 'soundcheck') { for (const lane of ['L', 'R']) stopHold(lane, false); startTalk(TALK2, startHype); }
          else endSong();
        }
        return;
      }
      if (state.phase === 'result') { updateResult(dt); const r = state.result; if (confirm) { if (r && !r.done) { r.line = r.lines.length; r.done = true; } else if (state.phaseT > 0.8) finish(true); } }
    };

    // ── 그리기 ──
    const text = (str, x, y, { color = '#fff', align = 'left', size = F.size, shadow = true, alpha = 1 } = {}) => {
      ctx.font = size === F.size ? FONT : FONT.replace(`${F.size}px`, `${size}px`);
      const ga = ctx.globalAlpha; ctx.textBaseline = 'top'; ctx.textAlign = align; ctx.globalAlpha = ga * alpha;
      if (shadow) { ctx.fillStyle = '#000'; ctx.fillText(str, Math.round(x) + 1, Math.round(y) + 1); }
      ctx.fillStyle = color; ctx.fillText(str, Math.round(x), Math.round(y)); ctx.globalAlpha = ga;
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
        const jx = state.glitch > 0 ? Math.round((Math.random() - 0.5) * 10 * state.glitch / SIGNAL.glitch) : 0;
        // 영상 비율 유지: 세로 영상(악질 시청자 -쥰희- 버전 240×358)은 가운데 필러박스
        const vw = v.videoWidth || TV.w, vh = v.videoHeight || TV.h, fit = Math.min(TV.w / vw, TV.h / vh), dw = Math.round(vw * fit), dh = Math.round(vh * fit), dx = TV.x + Math.round((TV.w - dw) / 2), dy = TV.y + Math.round((TV.h - dh) / 2);
        ctx.fillStyle = '#050508'; ctx.fillRect(TV.x, TV.y, TV.w, TV.h);
        try { ctx.drawImage(v, dx + jx, dy, dw, dh); } catch (e) { ctx.fillStyle = '#123'; ctx.fillRect(TV.x, TV.y, TV.w, TV.h); }
        // 신호가 나쁠수록 화면이 어두워지고 노이즈 점·가로 찢김이 낀다(MISS 직후 진하게)
        const bad = 1 - state.signal;
        if (bad > 0.001 || state.glitch > 0) {
          ctx.fillStyle = `rgba(0,0,0,${(bad * 0.35).toFixed(3)})`; ctx.fillRect(TV.x, TV.y, TV.w, TV.h);
          const dots = Math.round(bad * 260 + (state.glitch > 0 ? 120 : 0));
          for (let i = 0; i < dots; i++) { const g = 120 + Math.floor(Math.random() * 135); ctx.fillStyle = `rgba(${g},${g},${g},0.7)`; ctx.fillRect(TV.x + Math.floor(Math.random() * TV.w), TV.y + Math.floor(Math.random() * TV.h), 1 + Math.floor(Math.random() * 3), 1); }
          const tears = Math.round(bad * 4 + (state.glitch > 0 ? 3 : 0));
          for (let i = 0; i < tears; i++) { const ty = dy + Math.floor(Math.random() * dh), th = 2 + Math.floor(Math.random() * 4), sx = Math.round((Math.random() - 0.5) * 24); try { ctx.drawImage(v, 0, (ty - dy) / dh * vh, vw, th / dh * vh, dx + sx, ty, dw, th); } catch (e) { /* */ } ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(TV.x, ty, TV.w, 1); }
        }
        ctx.restore();
        if (k < 1) { ctx.fillStyle = `rgba(255,255,255,${(1 - k) * 0.8})`; ctx.fillRect(TV.x, TV.y + TV.h / 2 - 1, TV.w, 2); }
      } else if (state.phase === 'title' || state.phase === 'play') {
        const k = state.title?.k ?? 1;
        ctx.fillStyle = '#050508'; ctx.fillRect(TV.x, TV.y, TV.w, TV.h);
        text(state.chart.title, SCREEN_W / 2, TV.y + 44, { align: 'center', size: 24, color: '#ffe066', alpha: k });
        text(`- ${state.chart.artist} -`, SCREEN_W / 2, TV.y + 84, { align: 'center', color: '#ffffff', alpha: k });
      }
      // 스포트라이트 빔이 천천히 흔들린다(플레이·환호 때 밝게, 하이라이트 땐 색색으로 크게 빠르게)
      const live = state.phase === 'play' || state.cheer > 0 || state.phase === 'hype', hi = state.hi;
      const a = hi ? 0.28 : live ? 0.16 : 0.05;
      const bar = hi && state.chart ? beatAt(state.chart, songTime()).bar : 0;
      for (const [ox, dir, j] of [[40, 1, 0], [440, -1, 1]]) {
        const sway = Math.sin(state.beam * (hi ? 2.8 : live ? 1.6 : 0.5) + dir) * (hi ? 70 : 40);
        const rgb = hi ? HI_COLORS[(((bar + j) % HI_COLORS.length) + HI_COLORS.length) % HI_COLORS.length] : '255,220,150';
        const g = ctx.createLinearGradient(ox, 40, 240 + sway, 300); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox - 6, 44); ctx.lineTo(ox + 6, 44); ctx.lineTo(240 + sway + dir * 90, 300); ctx.lineTo(240 + sway - dir * 30, 300); ctx.closePath(); ctx.fill();
      }
      // 마디 첫 박마다 위 트러스 조명이 번쩍(하이라이트)
      if (state.strobe > 0) { ctx.fillStyle = `rgba(255,255,255,${(state.strobe * 0.22).toFixed(3)})`; ctx.fillRect(0, 0, SCREEN_W, 130); }
      if (state.flash > 0) { ctx.fillStyle = `rgba(255,240,200,${(state.flash * 0.35).toFixed(3)})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
    };
    // 바닥 스포트라이트 원(델타룬 참고 이미지): 연주자 발밑 밝은 타원이 위아래로 천천히 떠다니고, 하이라이트 땐 박자에 맞춰 색색으로 펄스
    const drawPools = () => {
      const bt = state.hi && state.chart ? beatAt(state.chart, songTime()) : null;
      state.band.forEach((b, i) => {
        const bob = Math.sin(state.t * 1.15 + i * 2.1) * 6, pulse = bt ? 1 + 0.22 * (1 - bt.phase) : 1;
        const rgb = bt ? HI_COLORS[(((bt.bar + i) % HI_COLORS.length) + HI_COLORS.length) % HI_COLORS.length] : '175,195,255';
        const cx = b.x, cy = STAND_Y - 5 + bob, rx = b.draw * 0.6 * pulse, ry = 12 * pulse;
        ctx.fillStyle = `rgba(${rgb},${bt ? 0.12 : 0.07})`; ctx.beginPath(); ctx.ellipse(cx, cy, rx * 1.5, ry * 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${rgb},${bt ? 0.3 : 0.18})`; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      });
    };
    const drawLanes = () => {
      if (!(state.phase === 'soundcheck' || state.phase === 'play' || state.phase === 'title')) return;
      const inPlay = state.phase !== 'title', h = RECEPTOR_Y - LANE_TOP + 16, span = RECEPTOR_Y - LANE_TOP, cx = LANE.x + LANE.w / 2;
      ctx.globalAlpha = state.phase === 'title' ? state.title.k * 0.7 : 1;
      const time = inPlay ? songTime() : 0;
      const bt = inPlay ? beatAt(state.chart, time) : null;
      const beatLines = (x, w) => {
        if (!bt) return;
        for (let b = Math.floor(bt.beat); ; b++) {
          const k = ((state.chart.offset || 0) + b * bt.len - time) / RHYTHM.approach;
          if (k > 1) break;
          if (k < 0) continue;
          const bar = ((b % 4) + 4) % 4 === 0, y = Math.round(RECEPTOR_Y - k * span);
          ctx.fillStyle = `rgba(255,255,255,${bar ? 0.7 : 0.32})`; ctx.fillRect(x + 2, y, w - 4, bar ? 2 : 1);
        }
      };
      // 노트·박자선은 기둥 사각형 안에서만(위로 미리 올라오거나 판정선 아래로 지나간 조각이 밖에 보이지 않게)
      const clipTo = (x, w) => { ctx.save(); ctx.beginPath(); ctx.rect(x, LANE_TOP, w, h); ctx.clip(); };
      // 양옆 자동 패드(경섭 드럼 | 빠맨 보컬): 좁은 기둥, 같은 박자선, 자동 노트가 판정선에서 반짝
      for (const [key, sd] of Object.entries(SIDE)) {
        ctx.fillStyle = 'rgba(0,0,0,0.84)'; ctx.fillRect(sd.x, LANE_TOP, sd.w, h);
        beatLines(sd.x, sd.w);
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(sd.x + sd.w / 2, LANE_TOP, 1, h);
        ctx.fillStyle = `rgba(${sd.rgb},0.9)`; ctx.fillRect(sd.x, LANE_TOP, 2, h); ctx.fillRect(sd.x + sd.w - 2, LANE_TOP, 2, h); ctx.fillRect(sd.x, RECEPTOR_Y + 8, sd.w, 3);
        for (const lane of ['L', 'R']) { const hf = sideHalf(sd, lane); ctx.strokeStyle = `rgba(${sd.rgb},0.4)`; ctx.lineWidth = 1; ctx.strokeRect(hf.x + 5.5, RECEPTOR_Y - 4.5, hf.w - 11, 9); }
        text(sd.label, sd.x + sd.w / 2, LANE_TOP - 18, { align: 'center', color: `rgb(${sd.rgb})` });
        if (!inPlay) continue;
        clipTo(sd.x, sd.w);
        for (const it of state.chart.side?.[key] || []) {
          const t = sideTime(it), k = (t - time) / RHYTHM.approach; if (k < -0.05 || k > 1.05) continue;
          const hf = sideHalf(sd, it.lane || 'L'), y = Math.round(RECEPTOR_Y - k * span);
          ctx.fillStyle = `rgba(${sd.rgb},${(0.6 + 0.38 * (1 - Math.max(0, k))).toFixed(2)})`; ctx.fillRect(hf.x + 5, y - 4, hf.w - 10, 8);
          ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(hf.x + 5, y - 4, hf.w - 10, 2);
        }
        for (const f of state.fx) if (f.kind === 'sidering' && f.lane === key) { const hf = sideHalf(sd, f.half), k = f.t / f.dur; ctx.strokeStyle = `rgba(255,255,255,${(1 - k).toFixed(2)})`; ctx.lineWidth = 2; ctx.strokeRect(hf.x + 5 - k * 5, RECEPTOR_Y - 4 - k * 5, hf.w - 10 + k * 10, 8 + k * 10); }
        ctx.restore();
      }
      text('형섭', cx, LANE_TOP - 18, { align: 'center', color: '#4fd8ff' });
      // 기둥(검정) — 델타룬처럼 가운데 하나
      ctx.fillStyle = 'rgba(0,0,0,0.84)'; ctx.fillRect(LANE.x, LANE_TOP, LANE.w, h);
      if (inPlay) {
        // 콤보: 기둥 안 큰 회색 숫자 + COMBO(노트 뒤), GREAT 마다 살짝 튄다
        if (state.play.combo >= 2) {
          const bump = state.judge && state.judge.text !== 'MISS' ? Math.max(0, 1 - state.judgeT * 4) * 4 : 0;
          text(String(state.play.combo), cx, RECEPTOR_Y - 104 - bump, { align: 'center', size: 40, color: 'rgba(255,255,255,0.2)', shadow: false });
          text('COMBO', cx, RECEPTOR_Y - 58, { align: 'center', color: 'rgba(255,255,255,0.2)', shadow: false });
        }
        // 흰 박자선이 노트와 같이 내려온다(마디 첫 박은 굵게)
        beatLines(LANE.x, LANE.w);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(cx, LANE_TOP, 1, h);
      const glow = state.hi ? 0.7 + 0.3 * Math.abs(Math.sin(state.t * 6)) : 0.95;
      ctx.fillStyle = `rgba(${LINE_RGB},${glow})`; ctx.fillRect(LANE.x, LANE_TOP, 2, h); ctx.fillRect(LANE.x + LANE.w - 2, LANE_TOP, 2, h);
      // 판정선: 가로 굵은 선 + 반칸마다 빈 노트 자리(누르는 동안 밝게)
      ctx.fillStyle = `rgba(${LINE_RGB},0.95)`; ctx.fillRect(LANE.x, RECEPTOR_Y + 8, LANE.w, 3);
      for (const lane of ['L', 'R']) {
        const hf = HALF[lane], on = inPlay && held(lane === 'L' ? 'left' : 'right');
        ctx.strokeStyle = `rgba(${NOTE_RGB},${on ? 0.95 : 0.4})`; ctx.lineWidth = on ? 2 : 1; ctx.strokeRect(hf.x + 5.5, RECEPTOR_Y - 5.5, hf.w - 11, 11);
      }
      text('◀', HALF.L.x + HALF.L.w / 2, RECEPTOR_Y + 13, { align: 'center', color: '#9fe8ff', shadow: false });
      text('▶', HALF.R.x + HALF.R.w / 2, RECEPTOR_Y + 13, { align: 'center', color: '#9fe8ff', shadow: false });
      ctx.globalAlpha = 1;
      if (!inPlay) return;
      clipTo(LANE.x, LANE.w);
      for (const { note, k, kEnd } of visibleNotes(state.play, time)) {
        const hf = HALF[note.lane], nx = hf.x + 5, nw = hf.w - 10;
        const y = RECEPTOR_Y - k * span, yEnd = RECEPTOR_Y - kEnd * span;
        const dead = note.status === 'miss', col = dead ? '110,110,120' : NOTE_RGB, holding = note.status === 'holding';
        if (note.dur) {
          // 홀드: 머리에서 위로 뻗은 굵은 꼬리(누르는 중엔 밝게·흰 테두리) + 끝 막대
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
      // GREAT 빔: 판정 칸이 노랗게 켜지고(1-k 로 꺼짐), 칸 위로 짧은 노란 빔이 rise 만큼 튀어 올랐다 사라진다 — 칸 안에서만 짧게
      for (const f of state.fx) if (f.kind === 'beam') {
        const hf = HALF[f.lane], k = f.t / f.dur, a = 1 - k, mid = hf.x + hf.w / 2;
        ctx.fillStyle = `rgba(${BEAM.rgb},${(0.9 * a).toFixed(2)})`; ctx.fillRect(hf.x + 5, RECEPTOR_Y - 5, hf.w - 10, 10);
        const headY = RECEPTOR_Y - 5 - k * BEAM.rise, tailY = RECEPTOR_Y - 5 - k * BEAM.rise * 0.45, h = Math.max(2, Math.round(tailY - headY) + 4);
        const w = Math.max(4, Math.round((hf.w - 14) * (1 - k * 0.5)));
        ctx.fillStyle = `rgba(${BEAM.rgb},${(0.45 * a).toFixed(2)})`; ctx.fillRect(Math.round(mid - w / 2), Math.round(headY), w, h);
        ctx.fillStyle = `rgba(${BEAM.core},${(0.9 * a).toFixed(2)})`; ctx.fillRect(Math.round(mid - w / 4), Math.round(headY), Math.round(w / 2), h);
        ctx.fillStyle = `rgba(255,255,255,${(0.9 * a).toFixed(2)})`; ctx.fillRect(Math.round(mid) - 1, Math.round(headY), 3, Math.min(6, h));
      }
      ctx.restore();
      for (const f of state.fx) if (f.kind === 'ring') { const hf = HALF[f.lane], k = f.t / f.dur; ctx.strokeStyle = `rgba(255,255,255,${(1 - k).toFixed(2)})`; ctx.lineWidth = 2; ctx.strokeRect(hf.x + 5 - k * 6, RECEPTOR_Y - 5 - k * 6, hf.w - 10 + k * 12, 10 + k * 12); }
      if (state.judge) { const k = state.judgeT / 0.5; text(state.judge.text, cx, RECEPTOR_Y - 34 - k * 10, { align: 'center', size: 16, color: state.judge.color, alpha: 1 - k * 0.6 }); }
    };
    const drawMeters = () => {
      if (!(state.phase === 'soundcheck' || state.phase === 'play' || state.phase === 'title' || state.phase === 'hype' || state.phase === 'ovation')) return;
      const pop = state.play?.pop ?? RHYTHM.popStart;
      for (const [x, label] of [[74, 'POPU'], [390, 'LARITY']]) {
        text(label, label === 'POPU' ? x + 12 : x + 4, LANE_TOP - 18, { color: '#6fb3ff', align: label === 'POPU' ? 'right' : 'left' });
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, LANE_TOP, 12, 160); ctx.strokeStyle = '#6fb3ff'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, LANE_TOP + 0.5, 11, 159);
        const h = Math.round(156 * pop); ctx.fillStyle = pop > 0.66 ? '#7dff5a' : pop > 0.33 ? '#ffe066' : '#ff6a6a'; ctx.fillRect(x + 2, LANE_TOP + 158 - h, 8, h);
      }
      // 아래 HUD 띠 한 줄(28px): 왼쪽 SCORE · 가운데 파티 HP(전투 HP 그대로, MISS 마다 줄어든다) · 오른쪽 MAX COMBO. 글자는 전부 기본 16px(작게 쓰면 뭉개진다)
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, SCREEN_H - HUD.h, SCREEN_W, HUD.h);
      if (state.phase === 'play' || state.phase === 'title') {
        const ids = partyIds(), bw = HUD.hpW, gap = HUD.hpGap, total = ids.length * bw + (ids.length - 1) * gap, x0 = Math.round(SCREEN_W / 2 - total / 2);
        ids.forEach((id, i) => {
          const x = x0 + i * (bw + gap), hp = hpOf(id), max = maxHpOf(id), b = BAND.find(q => q.id === id);
          text(b ? b.label : id, x, SCREEN_H - HUD.h + 1, { color: HP_COLORS[id] || '#fff', shadow: false });
          text(String(hp), x + bw, SCREEN_H - HUD.h + 1, { color: state.hurt[id] > 0 ? '#ff4a4a' : '#fff', shadow: false, align: 'right' });
          ctx.fillStyle = '#3a1a1a'; ctx.fillRect(x, SCREEN_H - 9, bw, 5);
          ctx.fillStyle = state.hurt[id] > 0 ? '#ff4a4a' : (HP_COLORS[id] || '#fff'); ctx.fillRect(x, SCREEN_H - 9, Math.round(bw * hp / max), 5);
        });
      }
      text(`${String(state.stats.score + (state.play?.score || 0)).padStart(6, '0')}`, 8, SCREEN_H - 22, { color: '#7dff5a' });
      text('SCORE', 64, SCREEN_H - 22, { color: '#7dff5a' });
      text('MAX COMBO', SCREEN_W - 64, SCREEN_H - 22, { color: '#7dff5a', align: 'right' });
      text(`${String(Math.max(state.stats.maxCombo, state.play?.maxCombo || 0)).padStart(6, '0')}`, SCREEN_W - 8, SCREEN_H - 22, { color: '#7dff5a', align: 'right' });
    };
    // 지금 박(곡 중엔 차트 박자, 아니면 126bpm 느낌으로 흐르는 박)
    const beatNow = () => (state.chart && state.phase === 'play' ? beatAt(state.chart, songTime()).beat : state.t * 2.1);
    const drawBand = () => {
      const beat = beatNow();
      for (const b of state.band) {
        const img = sheets[b.id].img, feet = Math.round(b.y), D = b.draw;
        if (img && img.complete && img.naturalWidth) {
          // 동작 프레임이 없을 땐 숨 쉬듯: 기본 자세에서 두 박 주기로 1px 만 오르내린다(사용자: 프레임이 바뀌는 건 너무 역동적)
          const idx = b.frame, dy = idx === 0 && b.landed ? Math.round(Math.sin(beat * Math.PI) * BREATH_PX) : 0;
          const sx = (idx % 2) * CELL, sy = Math.floor(idx / 2) * CELL, hx = state.hurt[b.id] > 0 ? Math.round((Math.random() - 0.5) * 5) : 0;
          ctx.drawImage(img, sx, sy, CELL, CELL, Math.round(b.x - D / 2) + hx, feet - Math.round(FEET * D / CELL) + dy, D, D);
        } else { ctx.fillStyle = b.color; ctx.fillRect(b.x - 9, feet - 32, 18, 32); }
      }
      for (const f of state.fx) if (f.kind === 'dust') { const k = f.t / f.dur; ctx.fillStyle = `rgba(200,190,170,${(1 - k) * 0.7})`; for (let i = -3; i <= 3; i++) ctx.fillRect(f.x + i * 8 * (0.4 + k), f.y - 3 - k * 14, 3, 2); }
      for (const f of state.fx) if (f.kind === 'dmg') { const k = f.t / f.dur; text(f.text, f.x, f.y - k * 22, { align: 'center', color: '#ff4a4a', alpha: 1 - k * k }); }
    };
    const drawParticles = () => {
      for (const c of state.confetti) { const flat = Math.floor(c.t * 6 + c.seed) % 2; ctx.fillStyle = c.color; ctx.fillRect(Math.round(c.x), Math.round(c.y), flat ? 3 : 2, flat ? 2 : 3); }
      for (const sp of state.sparks) { const k = sp.t / sp.dur; ctx.fillStyle = k < 0.35 ? '#fff6c8' : k < 0.7 ? '#ffc04a' : '#ff7a3c'; ctx.fillRect(Math.round(sp.x), Math.round(sp.y), 2, 2); if (k < 0.5) ctx.fillRect(Math.round(sp.x), Math.round(sp.y) + 2, 1, 2); }
      for (const c of state.coins) {
        if (c.t < 0) continue;
        const x = Math.round(c.x), y = Math.round(c.y), thin = Math.floor(c.t * 10 + c.spin) % 3 === 0;
        ctx.fillStyle = '#b8860b'; ctx.fillRect(x - 2, y - 2, thin ? 2 : 5, 5);
        ctx.fillStyle = '#ffd84a'; ctx.fillRect(x - 1, y - 1, thin ? 1 : 3, 3);
        ctx.fillStyle = '#fff7c0'; ctx.fillRect(x - 1, y - 1, 1, 1);
      }
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
        // 세로 조각(32px)마다 어긋난 위상으로 1px 만 천천히 숨 쉬듯(가만히 있을 때). 환호 땐 다 같이 점프
        const fh = img.naturalHeight / 2, sy = cheering ? fh : 0, slices = 15, sw = img.naturalWidth / slices, dw = SCREEN_W / slices, beat = beatNow();
        for (let i = 0; i < slices; i++) {
          const idle = Math.sin(beat * Math.PI * 0.5 + i * 0.85) > 0 ? 1 : 0;
          ctx.drawImage(img, i * sw, sy, sw, fh, Math.round(i * dw), SCREEN_H - 84 - (cheering ? bob : idle), Math.ceil(dw), 90);
        }
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
          text(word + ' ', x, y, { color: seg.color || '#fff', shadow: false, size: seg.color === '#ff4a4a' ? 24 : F.size }); x += w;
        }
      }
    };
    const drawTalk = () => { const tk = state.talk; if (!tk) return; const l = tk.lines[tk.i]; const who = SPEAKERS[l.who]; drawBox(who.label, typer.visible, who.color); };
    const drawOver = () => {
      if (!state.over) return;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      text('무대가 엉망이 됐다...', SCREEN_W / 2, 120, { align: 'center', size: 24, color: '#ff8a8a' });
      const cx = SCREEN_W / 2, by = 160;
      ctx.fillStyle = '#000'; ctx.fillRect(cx - 72, by, 144, 34); ctx.strokeStyle = Math.floor(state.t * 2.5) % 2 === 0 ? '#ffe066' : '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(cx - 71, by + 1, 142, 32);
      text('재도전', cx - 16, by + 9, { align: 'center' }); ctx.fillStyle = '#000'; ctx.fillRect(cx + 26, by + 8, 18, 18); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(cx + 26.5, by + 8.5, 17, 17); text('C', cx + 35, by + 10, { align: 'center', color: '#ffe066', shadow: false });
    };
    const drawPause = () => {
      if (!state.paused) return;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      text('일시 정지', SCREEN_W / 2, 132, { align: 'center', size: 24, color: '#ffe066' });
      if (Math.floor(state.t * 2) % 2 === 0) text('C  계속', SCREEN_W / 2, 172, { align: 'center', color: '#8f8fa6' });
    };
    const drawResult = () => {
      if (state.phase !== 'result') return;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      const r = state.result; if (!r) return;
      r.lines.forEach((l, i) => {
        const shown = i < r.line || r.done ? l.text.length : i === r.line ? r.shown : 0;
        if (shown > 0) text(l.text.slice(0, shown), l.x, l.y, { align: l.align, size: l.size, color: l.color });
      });
      if (r.done && Math.floor(state.t * 2) % 2 === 0) text('C  계속', SCREEN_W / 2, SCREEN_H - 40, { align: 'center', color: '#8f8fa6' });
    };
    // 최상위 레이어: ‘● 연결 안 됨’ 배지(왼쪽 아래 관객석 위·SCORE 바 바로 위 — 기둥·스크린과 안 겹치게, 사용자 “옮겨”), 빨간 점 깜빡임
    const drawBadge = () => {
      if (state.badge <= 0) return;
      const img = badgeImg.img, x = 8, y = SCREEN_H - HUD.h - 30 + Math.round((1 - state.badge) * 6);
      ctx.globalAlpha = state.badge;
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, x, y);
      else { ctx.fillStyle = '#fbe4e2'; ctx.fillRect(x, y, 108, 24); }
      if (Math.floor(state.t * 2) % 2 === 0) { ctx.fillStyle = '#fbe4e2'; ctx.fillRect(x + 23, y + 10, 5, 5); ctx.fillStyle = '#f0a9a3'; ctx.fillRect(x + 24, y + 11, 3, 3); }
      text('연결 안 됨', x + 30, y + 4, { color: '#b3261e', shadow: false });
      ctx.globalAlpha = 1;
    };
    const draw = () => {
      ctx.save();
      if (state.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 6), Math.round((Math.random() - 0.5) * 4));
      drawBackdrop(); drawPools(); drawLanes(); drawBand(); drawAudience(); drawParticles(); drawMeters();
      drawPause(); drawTalk(); drawOver(); drawResult(); drawBadge();
      ctx.restore();
    };

    let last = performance.now(), raf = 0;
    const frame = (now) => { const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; if (!state.exiting) update(dt); draw(); raf = requestAnimationFrame(frame); };
    ov.fit(); addEventListener('resize', ov.fit);
    requestAnimationFrame(() => { ov.root.style.opacity = '1'; });
    raf = requestAnimationFrame(frame);
    // QA: 곡 안 특정 시각으로 건너뛰기(앞 노트는 판정 없이 지나간 것으로) — 하이라이트 확인용
    // Range 를 지원하지 않는 서버(python http.server)에선 영상 seek 이 안 되므로 그땐 시계 모드로 넘어가 시각만 맞춘다
    const seek = (t) => { const v = state.video; if (v && v.seekable && v.seekable.length && v.seekable.end(0) >= t) { try { v.currentTime = t; } catch (e) { /* */ } } else { state.fromClock = true; if (v) { try { v.pause(); } catch (e) { /* */ } } } state.clock = t; state.sideT = t; for (const n of state.play?.notes || []) if (n.status === 'wait' && n.t < t - 0.2) n.status = 'hit'; };
    window.__rhythm = { state, finish, startTitle, startSong, retry, cheer, pyro, confetti, throwCoins, seek, applySignal, endSong, damageParty, hpOf, setPaused, get play() { return state.play; }, songTime,
      skipTo(phase) { for (const b of state.band) { b.y = STAND_Y; b.landed = true; } state.talk = null; if (phase === 'soundcheck') startSoundcheck(); else if (phase === 'hype') startHype(); else if (phase === 'song') startTitle(0); } };
  });
}
