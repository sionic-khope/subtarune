// 사운드는 전부 WebAudio로 합성한다 (오디오 파일 0개).
// 대사 한 글자마다 0.1초짜리 블립이 울린다 — 화자마다 음색이 다르다.

export const VOICES = {
  gajaeman_shadow: { freq: 520, wave: 'square', dur: 0.14, jitter: 40, gain: 0.24, cutoff: 2800, rate: 0.86, level: 0.72, cut: true, minGap: 0.07 },
  // freq: 기본 음높이, dur: 한 글자 사운드 길이(초), wave: 파형
  default: { freq: 520, wave: 'square',   dur: 0.10, jitter: 24, gain: 0.256, cutoff: 2600 },
  hero:    { freq: 620, wave: 'square',   dur: 0.10, jitter: 30, gain: 0.24, cutoff: 3000 },
  low:     { freq: 210, wave: 'sawtooth', dur: 0.10, jitter: 14, gain: 0.208, cutoff: 1200, glide: -60 },
  cat:     { freq: 880, wave: 'triangle', dur: 0.10, jitter: 90, gain: 0.256, cutoff: 4000 },
  robot:   { freq: 300, wave: 'square',   dur: 0.10, jitter: 0,  gain: 0.224, cutoff: 900 },
  narrator:{ freq: 440, wave: 'sine',     dur: 0.12, jitter: 10, gain: 0.208, cutoff: 2000, rate: 1.0, level: 0.9, minGap: 0, poly: true },   // 파일: 언더테일 원본 snd_txt1. 언더테일처럼 글자마다(33ms) 울리고 앞 소리를 끊지 않는다(poly) — 2026-09-09 '목소리 바뀌었다' 피드백으로 복구
  mystery: { freq: 300, wave: 'sine',     dur: 0.14, jitter: 6,  gain: 0.2,   cutoff: 1500, rate: 0.8, level: 1.2, cut: true, minGap: 0.07 },   // 파일: 언더테일 snd_txt2 앞 0.32s(원본은 뒤가 무음) 톤다운 — 검은 화면의 정체불명 목소리. 긴 클립이라 mono cut
  // ── 캐릭터별 ──
  hyungsub: { freq: 560, wave: 'square',   dur: 0.14, jitter: 40, gain: 0.24, cutoff: 2800, rate: 0.92, level: 0.72, cut: true, minGap: 0.07 },   // 2026-09-10 살짝 톤다운(0.92)·소리 살짝 줄임(0.9→0.72)   // 파일: 가재맨 '넌 나가라'(gKmv51EG5co) 11.36s 의 '넌' 0.26s — 어택 0.14s 만 (mono cut). 인트로 맵 형섭 대사
  gyeongsub:{ freq: 330, wave: 'triangle', dur: 0.12, jitter: 12, gain: 0.272, cutoff: 1600, glide: -20, rate: 0.9, cut: true, minGap: 0.07, level: 1.0 },   // 파일: 영상 첫 소리의 어택(앞 무음 62ms 잘라냄) 0.15s, 빠맨과 같은 톤다운(0.9)
  ppaman:   { freq: 990, wave: 'sine',     dur: 0.10, jitter: 15, gain: 0.288, cutoff: 3600, glide: 60, bell: true, rate: 0.9, cut: true, minGap: 0.08 }, // '띠링'을 톤다운한 종소리
  junhee:   { freq: 240, wave: 'sawtooth', dur: 0.10, jitter: 60, gain: 0.224, cutoff: 900,  glide: 90, rate: 0.92, level: 0.85, cut: true, minGap: 0.07 },   // 파일: 델타룬 수지 목소리(library snd_txtsus) 살짝 톤다운 — 2026-09-10 사용자 '귀아파' 로 합성 콧소리(voices/junhee_snort.mp3 보관, 피크 0dB)에서 교체
  yongjun:   { freq: 240, wave: 'sawtooth', dur: 0.10, jitter: 60, gain: 0.224, cutoff: 900,  glide: 90, rate: 0.92, level: 0.85, cut: true, minGap: 0.07 },
  yakulbeol: { freq: 425, wave: 'triangle', dur: 0.12, jitter: 15, gain: 0.18, cutoff: 2800, glide: 40, rate: 1, level: 0.85, cut: true, minGap: 0.08 },
  mabaem:    { freq: 175, wave: 'triangle', dur: 0.12, jitter: 12, gain: 0.18, cutoff: 1500, glide: -15, rate: 1, level: 0.85, cut: true, minGap: 0.08 },
  eunbyeol: { freq: 620, wave: 'triangle', dur: 0.17, jitter: 45, gain: 0.18, cutoff: 2500, glide: 90, rate: 1, level: 0.85, cut: false, minGap: 0.12 },
  parkwonsung:{ freq: 310, wave: 'triangle', dur: 0.12, jitter: 30, gain: 0.18, cutoff: 2600, glide: 150, rate: 1, level: 0.85, cut: true, minGap: 0.09 },
  yerim:     { freq: 330, wave: 'triangle', dur: 0.13, jitter: 12, gain: 0.18, cutoff: 2200, rate: 1, level: 0.75, cut: false, minGap: 0.14 },
  youngcle:  { freq: 575, wave: 'triangle', dur: 0.16, jitter: 0, gain: 0.18, cutoff: 2200, rate: 0.96, level: 1, cut: false, minGap: 0.12 },
  expelled_viewer: { freq: 180, wave: 'sawtooth', dur: 0.135, jitter: 8, gain: 0.18, cutoff: 2800, rate: 1, level: 0.8, cut: false, minGap: 0.15 },
  warm_bidet: { freq: 84, wave: 'triangle', dur: 0.17, jitter: 2, gain: 0.18, cutoff: 1100, rate: 1, level: 0.85, cut: false, minGap: 0.19 },
  ttuulla: { freq: 520, wave: 'triangle', dur: 0.18, jitter: 8, gain: 0.18, cutoff: 4200, rate: 1, level: 0.85, cut: false, minGap: 0.20 },
  // 오방순(BUILD202 조종실 첫 대사): voices/obangsun.mp3 = macOS Yuna 를 -5 반음 낮춘 ‘흐에에에’ 0.25초(사용자 “목소리 굵은 여자가 흐어어 하는 보이스폰트”, assets/source/obangsun149/audio/manifest.json 의 runtime 값)
  //   BUILD206 사용자 “보이스폰트니까 그냥 흐 하나로, 더 짧게 끊어서 여러 번”: 클립 0.13초(‘흐’ 한 음절), 글자마다 짧게 반복(minGap 0.09, cut)
  obangsun: { freq: 300, wave: 'triangle', dur: 0.12, jitter: 8, gain: 0.18, cutoff: 3800, rate: 1, level: 0.9, cut: true, minGap: 0.09 },
  lucky_guy: { freq: 190, wave: 'triangle', dur: 0.19, jitter: 8, gain: 0.18, cutoff: 2400, glide: 20, rate: 1, level: 0.85, cut: false, minGap: 0.21 },
  // 나람이 임시 합성 음색(사용자 지정 원음 오면 파일로 교체): 럭키가이보다 조금 높고 둥근 중저음
  // 나람(BUILD203 사용자 “뚱뚱한 목소리를 가진 쥰희 느낌, 같은 목소리는 쓰지 말고 비슷하게 새로”): voices/naram.mp3 = 쥰희 클립(snd_txtsus)을 -3반음 낮추고 굵게(lowpass·bass) 만든 변형. 합성음이던 예전 값은 파일 없을 때 폴백
  naram: { freq: 200, wave: 'sawtooth', dur: 0.11, jitter: 50, gain: 0.2, cutoff: 900, glide: 80, rate: 1, level: 0.9, cut: true, minGap: 0.08 },
  // 청소부(BUILD226 사용자 “목소리는 형섭 목소리에서 할아버지 느낌으로, 거슨 목소리 델타룬 참고”): voices/janitor.mp3 = hyungsub.mp3('넌' 0.26s)를 ffmpeg 로 -5반음(asetrate 0.75)·저역(lowpass 2400·bass +4dB)·떨림(tremolo 34Hz) 처리한 0.35s 변형. 거슨처럼 낮고 갈라진 느낌으로 조금 느리게(rate 0.9), 글자마다 짧게(cut)
  janitor: { freq: 400, wave: 'square', dur: 0.16, jitter: 40, gain: 0.24, cutoff: 2200, rate: 0.9, level: 0.75, cut: true, minGap: 0.09 },
  park_guardian_costume: { freq: 430, wave: 'triangle', dur: 0.16, jitter: 8, gain: 0.18, cutoff: 2600, glide: 20, rate: 1, level: 0.85, cut: false, minGap: 0.18, drive: 2.1, driveLevel: 0.64 },
  park_guardian: { freq: 100, wave: 'triangle', dur: 0.175, jitter: 2, gain: 0.18, cutoff: 1100, rate: 1, level: 0.85, cut: false, minGap: 0.195 },
  red:       { freq: 150, wave: 'sine',     dur: 0.12, jitter: 3,  gain: 0.2,   cutoff: 900,  rate: 0.62, level: 1.2, cut: true, minGap: 0.10 },   // 레드(청록숲9 문지기) — 파일: 언더테일 snd_txt2(voices/red.mp3 = mystery 와 같은 클립)를 0.62 배로 깊게, 드문드문. 합성 사각파(2026-09-11 1차)는 '마음에 안 듦'
  blue:      { freq: 118, wave: 'sine',     dur: 0.13, jitter: 2,  gain: 0.2,   cutoff: 800,  rate: 0.52, level: 1.25, cut: true, minGap: 0.13 },   // 블루 — 같은 클립을 더 깊게(0.52), 더 드문   // 박용준 — 파일 assets/audio/voices/yongjun.mp3(유튜브 쇼츠 LWx1CyyfvvI 시작 직후 0.34s '어?'), 없으면 이 합성
};

export class Sound {
  /** 블립 최소 간격(초). 33ms 글자 속도에서 0.06 이면 두 글자에 한 번 → 언더테일처럼 살짝 띄어 들린다 */
  static MIN_GAP = 0.06;
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.files = {};          // sfx 이름 → HTMLAudioElement (assets/audio/sfx/<name>.mp3|ogg)
    this.voiceRaw = {};       // voice 이름 → ArrayBuffer (assets/audio/voices/<name>.mp3|ogg)
    this.voiceBuf = {};       // voice 이름 → AudioBuffer (unlock 후 디코드)
    this.cueBuffers = new Map();
  }

  /** Predecode a complete cue; callers never seek into compressed audio. */
  loadCue(src) {
    if (!this.cueBuffers.has(src)) {
      const pending = fetch(src).then(async response => {
        if (!response.ok) throw new Error(`Audio cue unavailable: ${src}`);
        const raw = await response.arrayBuffer();
        return this.ctx.decodeAudioData(raw);
      });
      this.cueBuffers.set(src, pending);
    }
    return this.cueBuffers.get(src);
  }

  /** Play one decoded buffer and expose its AudioContext clock and cancellation. */
  playCue(buffer, { volume = 1 } = {}) {
    const ctx = this.ctx;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = this.muted ? 0 : volume;
    source.connect(gain); gain.connect(this.master);
    const startedAt = ctx.currentTime;
    let stopped = false;
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(startedAt);
    return {
      get elapsed() { return Math.min(buffer.duration, ctx.currentTime - startedAt); },
      stop() { if (!stopped) { stopped = true; source.stop(); } },
    };
  }

  /** assets/audio/voices/<voice>.(mp3|ogg) 가 있으면 글자 블립을 그 샘플로 낸다 (한 샘플만 있으면 됨) */
  async loadVoiceFiles(names) {
    const grab = async (src) => { try { const r = await fetch(src); return r.ok ? await r.arrayBuffer() : null; } catch { return null; } };
    await Promise.all(names.map(async (n) => {
      const buf = (await grab(`assets/audio/voices/${n}.mp3`)) || (await grab(`assets/audio/voices/${n}.ogg`));
      if (buf) this.voiceRaw[n] = buf;
    }));
    if (this.ctx) this._decodeVoices();   // 오버레이 클릭(unlock)이 파일보다 먼저였으면 여기서 디코드 — "목소리 유실" 재발 방지 (2026-09-10)
  }
  /** 받아 둔 음성 파일을 AudioContext 로 디코드. 몇 번을 불러도 안전(이미 된 건 건너뜀, 동시 호출은 한 번만) */
  async _decodeVoices() {
    if (!this.ctx || this._decoding) return;
    this._decoding = true;
    try {
      for (const [n, raw] of Object.entries(this.voiceRaw)) {
        if (this.voiceBuf[n]) continue;
        try {
          const buffer = await this.ctx.decodeAudioData(raw.slice(0));
          const voice = VOICES[n];
          if (voice?.drive) {
            for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
              const samples = buffer.getChannelData(channel);
              for (let i = 0; i < samples.length; i++) samples[i] = Math.tanh(samples[i] * voice.drive) * voice.driveLevel;
            }
          }
          this.voiceBuf[n] = buffer;
        } catch (e) { console.warn('[audio] 음성 디코드 실패', n, e); }
      }
    } finally { this._decoding = false; }
    const missing = Object.keys(this.voiceRaw).filter((n) => !this.voiceBuf[n]);
    if (missing.length) console.warn('[audio] 아직 디코드 안 된 음성:', missing.join(','));
  }

  /** 느린 회선에서 canplaythrough 를 기다리는 상한. 넘겨도 파일을 버리지 않고 등록만 한다 */
  static SFX_PROBE_TIMEOUT = 8000;
  /** assets/audio/sfx/<name>.(mp3|ogg) 가 있으면 등록. 없는 건 조용히 합성 유지.
   *  2026-09-10: 이벤트가 안 오는 파일 하나가 부팅 전체를 멈추지 않게 8초 상한.
   *  2026-09-15: github.io 첫 로드처럼 70여 개 mp3 가 느리게 오면 8초 안에 canplaythrough 가 안 온 파일이 통째로 버려져
   *  그 세션 내내 합성음(다른 소리)이 났고 새로고침(캐시)하면 다시 들렸다. 상한을 넘겨도 요소를 등록해 두면 도착한 뒤부터
   *  파일로 재생된다. 실제 404/디코드 실패(error)만 합성 폴백으로 남긴다. */
  async loadSfxFiles(names) {
    const probe = (src) => new Promise((resolve) => {
      const a = new Audio(); a.preload = 'auto';
      let done = false;
      const settle = (value) => { if (done) return; done = true; clearTimeout(tm); resolve(value); };
      const tm = setTimeout(() => settle(a), Sound.SFX_PROBE_TIMEOUT);
      a.oncanplaythrough = () => settle(a);
      a.onerror = () => settle(null);
      a.src = src;
    });
    await Promise.all(names.map(async (n) => {
      const a = (await probe(`assets/audio/sfx/${n}.mp3`)) || (await probe(`assets/audio/sfx/${n}.ogg`));
      if (!a) return;
      this.files[n] = a;
      // 상한 뒤에 늦게 실패한 파일은 등록을 풀어 합성으로 돌아간다
      a.onerror = () => { if (this.files[n] === a) delete this.files[n]; };
    }));
  }

  unlock() {
    if (this.bgm?.paused) this.bgm.play().catch((error) => console.warn('[audio] BGM 재생 재시도 실패', error));
    if (this.ctx) {
      if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1.0;
    this.master.connect(this.ctx.destination);
    this._decodeVoices();
    this._decodeWalk();
  }

  // ── 물 위 걷기 루프 (2026-09-12 사용자 "영상 소리랑 그대로 나오고 싶다" · "각각의 발소리가 에코가 있는데 끊긴다" · "그냥 이거처럼 새로 만들면 안 되나") ──
  //   걸음마다 파일을 따로 트는 방식은 전부 "끊긴다": 영상은 걸음이 초당 6번 겹치며 울림이 계속 깔리는 소리라 0.4~0.8초에 한 번 틀면 '한 번, 쉬고, 한 번' 이 된다.
  //   그래서 걷는 동안 영상 구간(끊김 없는 루프 wav)을 WebAudio 로 표본 단위 루프 재생하고, 멈추면 시각표의 **다음 걸음 8ms 앞**에서 끊고 울림 꼬리(wav)를 이어 붙인다.
  //   정의는 src/data/footsteps.js WATER_WALK(생성기 tools/audio/water_steps.py). 타일 step 이 그 객체면 Player 가 매 프레임 walk() 를 부른다.
  /** 걷기 루프·꼬리 wav 를 받아 둔다(unlock 뒤 디코드) */
  async loadWalkLoop(def) {
    this.walkDef = def;
    const grab = async (src) => { try { const r = await fetch(src); return r.ok ? await r.arrayBuffer() : null; } catch { return null; } };
    const [loop, tail] = await Promise.all([grab(def.loop), grab(def.tail)]);
    if (loop) this.walkRaw = { loop, tail };
    if (this.ctx) this._decodeWalk();
  }
  async _decodeWalk() {
    if (!this.ctx || !this.walkRaw || this.walkBuf || this._decodingWalk) return;
    this._decodingWalk = true;
    try {
      const loop = await this.ctx.decodeAudioData(this.walkRaw.loop.slice(0));
      const tail = this.walkRaw.tail ? await this.ctx.decodeAudioData(this.walkRaw.tail.slice(0)) : null;
      this.walkBuf = { loop, tail };
    } catch (e) { console.warn('[audio] 걷기 루프 디코드 실패', e); } finally { this._decodingWalk = false; }
  }
  /** 매 프레임(Player.update): def 면 걷는 중 → 루프를 틀거나 유지(멈추던 중이면 되살림), null 이면 멈춤 → 다음 걸음 직전에 끊고 울림 꼬리.
   *  150ms 동안 안 불리면(전투·맵 전환·메뉴) 스스로 멈춘다. 음소거면 즉시 끊는다. */
  walk(def) {
    this._walkBeat = performance.now();
    if (!def || this.muted) { if (this.w) { if (this.muted) this._walkKill(); else this._walkStop(); } return; }
    if (!this.ctx || !this.walkBuf) { if (this.ctx && this.walkRaw) this._decodeWalk(); return; }
    if (this.w) { if (this.w.stopping) this._walkResume(); return; }
    this._walkStart(def);
  }
  _walkStart(def) {
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.walkBuf.loop; src.loop = true; src.loopStart = def.loopStart; src.loopEnd = def.loopEnd;
    const g = ctx.createGain(); g.gain.value = def.volume; src.connect(g); g.connect(this.master);
    // 아무 걸음 직전에서 시작 — 첫 소리가 항상 같은 걸음이 아니게
    const o = def.onsets[Math.floor(Math.random() * def.onsets.length)] - def.cutBefore;
    src.start(t, o); this.w = { src, g, def, t0: t, o, stopping: null }; this.walkStarts = (this.walkStarts || 0) + 1;
    if (!this._walkWatch) this._walkWatch = setInterval(() => { if (this.w && !this.w.stopping && performance.now() - this._walkBeat > 150) this._walkStop(); if (!this.w) { clearInterval(this._walkWatch); this._walkWatch = null; } }, 100);
  }
  /** 루프 안 현재 위치(초) */
  _walkPos(w, t) { const d = w.def, L = d.loopEnd - d.loopStart; return d.loopStart + (((w.o - d.loopStart) + (t - w.t0)) % L); }
  _walkStop() {
    const w = this.w; if (!w || w.stopping) return;
    const ctx = this.ctx, d = w.def, t = ctx.currentTime, pos = this._walkPos(w, t), L = d.loopEnd - d.loopStart;
    let next = d.onsets.find((x) => x - d.cutBefore > pos + 0.004); if (next === undefined) next = d.onsets[0] + L;
    const cut = t + (next - d.cutBefore - pos), X = 0.008;
    w.g.gain.setValueAtTime(d.volume, cut - X); w.g.gain.linearRampToValueAtTime(0.0001, cut);
    let tail = null;
    if (this.walkBuf.tail) { tail = ctx.createBufferSource(); tail.buffer = this.walkBuf.tail; const tg = ctx.createGain(); tg.gain.value = d.volume; tail.connect(tg); tg.connect(this.master); tail.start(cut - X); }
    const timer = setTimeout(() => { try { w.src.stop(); } catch {} if (this.w === w) this.w = null; }, (cut - t) * 1000 + 40);
    w.stopping = { cut, tail, timer };
  }
  /** 멈추던 중에 다시 걸으면: 아직 안 끊었으면 그대로 잇고, 이미 끊었으면 새로 튼다(꼬리는 그대로 둔다) */
  _walkResume() {
    const w = this.w, s = w.stopping, t = this.ctx.currentTime;
    clearTimeout(s.timer);
    if (t >= s.cut - 0.008) { try { w.src.stop(); } catch {} this.w = null; this._walkStart(w.def); return; }
    w.g.gain.cancelScheduledValues(t); w.g.gain.setValueAtTime(w.def.volume, t);
    if (s.tail) { try { s.tail.stop(); } catch {} }
    w.stopping = null;
  }
  /** 즉시 끊기(음소거) */
  _walkKill() {
    const w = this.w; if (!w) return; const t = this.ctx.currentTime;
    if (w.stopping) { clearTimeout(w.stopping.timer); if (w.stopping.tail) { try { w.stopping.tail.stop(); } catch {} } }
    try { w.g.gain.cancelScheduledValues(t); w.g.gain.setValueAtTime(0.0001, t); w.src.stop(t + 0.02); } catch {}
    this.w = null;
  }
  /** 테스트용: 재생 중이면 { stopping, pos } */
  get walkState() { const w = this.w; return w ? { stopping: !!w.stopping, pos: +this._walkPos(w, this.ctx.currentTime).toFixed(3) } : null; }


  tone(opts = {}) {
    if (!this.ctx || this.muted) return;
    const {
      freq = 520, wave = 'square', dur = 0.1, jitter = 0,
      gain = 0.16, cutoff = 3000, glide = 0, delay = 0,
    } = opts;
    const t = this.ctx.currentTime + delay;
    const f = Math.max(40, freq + (Math.random() * 2 - 1) * jitter);

    const osc = this.ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(f, t);
    if (glide) osc.frequency.linearRampToValueAtTime(Math.max(40, f + glide), t + dur);

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(lp); lp.connect(env); env.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
    if (opts.bell) {   // 2.4배음 살짝 → 금속성 '띠링'
      const o2 = this.ctx.createOscillator(); o2.type = 'sine'; o2.frequency.setValueAtTime(f * 2.4, t);
      const g2 = this.ctx.createGain(); g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(gain * 0.35, t + 0.004); g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.7);
      o2.connect(g2); g2.connect(this.master); o2.start(t); o2.stop(t + dur);
    }
  }

  /** 디버그 표시용 */
  get info() { return `audio ${this.ctx ? this.ctx.state : 'no-ctx'} muted=${this.muted} voices=${Object.keys(this.voiceBuf).join('/') || '-'} sfxFiles=${Object.keys(this.files).length} bgm=${this.bgmName || '-'} lastBlip=${this._lastVoice || '-'}`; }

  // 대사 한 글자 사운드 — 파일(assets/audio/voices/<voice>.mp3)이 있으면 샘플, 없으면 합성
  blip(voiceName) {
    if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    const v = VOICES[voiceName] || VOICES.default;
    // 최소 간격(minGap): 글자가 33ms 마다 나와도 블립은 이보다 촘촘히 울리지 않는다 → 겹쳐서 웅웅거리지 않고 '톡, 톡' 이 분리됨
    const now = performance.now() / 1000;   // 벽시계 기준(AudioContext 가 suspended 여도 흐른다)
    const gap = v.minGap ?? Sound.MIN_GAP;
    const last = this._lastBlipAt?.[voiceName] ?? -1;
    if (now - last < gap) return;
    (this._lastBlipAt ||= {})[voiceName] = now;
    this._lastVoice = voiceName + '@' + now.toFixed(1);
    const buf = this.voiceBuf[voiceName];
    if (!buf && this.ctx && this.voiceRaw[voiceName]) this._decodeVoices();   // 파일은 있는데 아직 디코드 전 → 지금 디코드(다음 글자부터 진짜 목소리). 합성음으로 영구히 떨어지지 않는다
    if (buf && this.ctx && !this.muted) {
      const t = this.ctx.currentTime;
      // 단선(모노): 이전 글자 소리가 아직 울리고 있으면 끊는다 → 긴 클립(경섭·빠맨)이 웅웅거리지 않음. poly 목소리는 끊지 않는다(언더테일 원본 방식)
      const prev = this._lastBlip;
      if (!v.poly && prev && prev.voice === voiceName) { try { prev.gain.gain.cancelScheduledValues(t); prev.gain.gain.setValueAtTime(prev.gain.gain.value, t); prev.gain.gain.linearRampToValueAtTime(0.0001, t + 0.008); prev.src.stop(t + 0.01); } catch {} }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = v.rate ?? 1;                       // 원본 그대로 (톤다운은 rate)
      const g = this.ctx.createGain();
      const lvl = v.level ?? 0.9;   // 파일 블립 크기
      const len = v.cut ? Math.min(buf.duration, v.dur ?? 0.1) : buf.duration;   // cut:true 일 때만 자름
      g.gain.setValueAtTime(lvl, t);
      g.gain.setValueAtTime(lvl, t + Math.max(0.005, len - 0.015));
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      src.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + len + 0.01);
      this._lastBlip = { voice: voiceName, src, gain: g };
      return;
    }
    this.tone(v);
  }

  /** BGM: assets/audio/bgm/<name>.mp3 루프 재생. 같은 곡이면 유지 */
  /** 브금 미리 로드 — 전환(전투 진입 등) 직전에 부르면 playBgm 이 이 엘리먼트를 바로 틀어 첫 소리까지의 공백이 없다 (2026-09-10 사용자 "전투 들어갈 때 0.5초 끊기고 전환") */
  preloadBgm(name) {
    if (!name) return; this._preBgm = this._preBgm || {};
    if (this._preBgm[name]) return;
    const a = new Audio(`assets/audio/bgm/${name}.mp3`); a.preload = 'auto'; a.load(); this._preBgm[name] = a;
  }
  /**
   * loopEnd(초): 원본 꼬리가 무음·잡음이면(섭리오 SWORD 마지막 5초 물소리, 사용자 2026-09-15) 그 앞에서 loopFade 동안 줄였다가
   * 처음으로 되감아 다시 키운다 — 끊김 없이 조기 종료. timeupdate(약 4Hz)로 감시하므로 loopFade 는 0.5초 이상
   */
  playBgm(name, { loop = true, volume = 0.35, fadeIn = 0.5, loopEnd = 0, loopFade = 0.8 } = {}) {
    volume = Math.min(volume, 0.4);
    if (this.bgm && this.bgmName === name) return;
    this.stopBgm(0.4);
    if (!name) return;
    const pre = this._preBgm?.[name]; if (pre) delete this._preBgm[name];
    const a = pre || new Audio(`assets/audio/bgm/${name}.mp3`);
    a.loop = loop; a.volume = 0;
    a.play().catch((error) => console.warn('[audio] BGM 자동 재생 대기', error));
    this.bgm = a; this.bgmName = name; this.bgmVolume = volume;
    this._ramp(a, this.muted ? 0 : volume, fadeIn);
    if (loopEnd > 0) {
      a.addEventListener('timeupdate', () => {
        if (a !== this.bgm || a._looping) return;
        if (a.currentTime >= loopEnd - loopFade) {
          a._looping = true;
          this._ramp(a, 0, loopFade, () => { try { a.currentTime = 0; } catch {} a._looping = false; if (a === this.bgm) this._ramp(a, this.muted ? 0 : this.bgmVolume, loopFade); });
        }
      });
    }
  }
  stopBgm(fade = 0.8) {
    const a = this.bgm; if (!a) return;
    this.bgm = null; this.bgmName = null;
    this._ramp(a, 0, fade, () => { a.pause(); a.src = ''; });
  }
  /** 브금 잠깐 멈춤(재생 위치 유지) → resumeBgm 이 그 자리에서 이어 튼다 — 컷신 {bgmPause}/{bgmResume} (옵젝영역1 "그 소리 내면 안되는거 아니에요?" … "하이얍!!!!" 에 이어서, 2026-09-11) */
  pauseBgm(fade = 0.3) {
    const a = this.bgm; if (!a) return;
    if (this.paused) { this.paused.a.pause(); this.paused.a.src = ''; }
    this.paused = { a, name: this.bgmName, volume: this.bgmVolume };
    this.bgm = null; this.bgmName = null;
    this._ramp(a, 0, fade, () => { if (this.paused?.a === a) a.pause(); });
  }
  resumeBgm(fadeIn = 0.3) {
    const p = this.paused; if (!p) return;
    this.paused = null; this.stopBgm(0.2);
    p.a.play().catch(() => {});
    this.bgm = p.a; this.bgmName = p.name; this.bgmVolume = p.volume;
    this._ramp(p.a, this.muted ? 0 : p.volume, fadeIn);
  }
  _ramp(a, to, sec, done) {
    const from = a.volume, t0 = performance.now();
    if (sec <= 0) { a.volume = to; if (done) done(); return; }
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / (sec * 1000));
      a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) requestAnimationFrame(step); else if (done) done();
    };
    step();
  }

  /** 인트로: assets/audio/intro.(mp3|ogg) 가 있으면 재생, 없으면 합성 스웰 */
  playIntro(duration = 2.6) {
    const tryFile = (src) => new Promise((resolve) => {
      const a = new Audio(src);
      a.volume = 0.8;
      a.oncanplaythrough = () => { a.play().then(() => resolve(a)).catch(() => resolve(null)); };
      a.onerror = () => resolve(null);
    });
    return tryFile('assets/audio/intro.mp3').then((a) => a || tryFile('assets/audio/intro.ogg')).then((a) => {
      if (a) { this.introAudio = a; return true; }
      this.synthIntro(duration);
      return false;
    });
  }
  stopIntro(fade = 0) { const a = this.introAudio; if (!a) return; this.introAudio = null; if (fade) this._ramp(a, 0, fade, () => a.pause()); else a.pause(); }

  /** 합성 인트로: 저음 스웰(필터 열림) + 배음 + 마지막 쾅 */
  synthIntro(duration) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(120, t);
    lp.frequency.exponentialRampToValueAtTime(3200, t + duration);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.28, t + duration * 0.9);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.4);
    lp.connect(env); env.connect(this.master);
    // 낮은 5도 + 옥타브 (D2, A2, D3) 사각파 디튠
    for (const [f, det] of [[73.4, 0], [73.4, 7], [110, -5], [146.8, 4]]) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(lp);
      o.start(t); o.stop(t + duration + 0.5);
    }
    // 떨림(비브라토) — 흔들리는 로고와 맞춤
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 9;
    const lfoGain = this.ctx.createGain(); lfoGain.gain.value = 18;
    lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
    lfo.start(t); lfo.stop(t + duration);
  }

  /** 로고가 박힐 때 */
  thud() {
    this.tone({ freq: 90, wave: 'square', dur: 0.35, gain: 0.56, cutoff: 500, glide: -50 });
    this.tone({ freq: 55, wave: 'sine', dur: 0.6, gain: 0.6, cutoff: 300 });
    this.tone({ freq: 1760, wave: 'triangle', dur: 0.5, gain: 0.192, delay: 0.05 });
    this.tone({ freq: 2637, wave: 'triangle', dur: 0.7, gain: 0.16, delay: 0.12 });
  }

  /** 효과음. from/len(초) 을 주면 파일의 그 구간만 재생한다 — 걸음 소리처럼 한 파일에 여러 개가 이어져 있을 때 (2026-09-12) */
  sfx(name, { volume = 0.9, rate = 1, from = 0, len = 0, pitch = false } = {}) {
    if (this.muted || !name) return;
    const f = this.files[name];
    if (f) {
      const a = f.cloneNode(); a.volume = Math.min(1, volume); a.playbackRate = rate;
      // pitch: rate 로 음정까지 바꾼다(기본은 브라우저가 음정을 보존) — 리듬 기타 척을 곡 키로 이조할 때
      if (pitch) { a.preservesPitch = false; a.mozPreservesPitch = false; }
      if (from > 0) { try { a.currentTime = from; } catch {} }
      if (len > 0) setTimeout(() => { a.pause(); a.src = ''; }, (len / rate) * 1000);
      a.play().catch(() => {}); return a;   // 파일 소리는 요소를 돌려준다 — 홀드 기타처럼 도중에 멈춰야 하는 소리용(rhythm.js)
    }
    switch (name) {
      case 'menu':    this.tone({ freq: 760, wave: 'square', dur: 0.06, gain: 0.224 }); break;
      case 'hit':     this.tone({ freq: 180, wave: 'sawtooth', dur: 0.12, gain: 0.3, glide: -120, cutoff: 1800 }); this.tone({ freq: 900, wave: 'square', dur: 0.05, gain: 0.12 }); break;   // 전투 타격(파일 sfx/hit.mp3 가 있으면 그것)
      case 'hurt':    this.tone({ freq: 240, wave: 'square', dur: 0.14, gain: 0.26, glide: -160 }); break;                                                                               // 소울 피격
      case 'chime':   // 띠링 ♪
                      this.tone({ freq: 1318, wave: 'triangle', dur: 0.10, gain: 0.32 });
                      this.tone({ freq: 1760, wave: 'triangle', dur: 0.10, gain: 0.32, delay: 0.07 });
                      this.tone({ freq: 2637, wave: 'triangle', dur: 0.45, gain: 0.352, delay: 0.14 }); break;
      case 'confirm': this.tone({ freq: 660, wave: 'square', dur: 0.06, gain: 0.256 });
                      this.tone({ freq: 990, wave: 'square', dur: 0.09, gain: 0.224, delay: 0.05 }); break;
      case 'cancel':  this.tone({ freq: 340, wave: 'square', dur: 0.09, gain: 0.24, glide: -120 }); break;
      case 'open':    this.tone({ freq: 240, wave: 'square', dur: 0.07, gain: 0.208, glide: 220 }); break;
      case 'close':   this.tone({ freq: 460, wave: 'square', dur: 0.07, gain: 0.192, glide: -220 }); break;
      case 'item':    this.tone({ freq: 523, wave: 'triangle', dur: 0.10, gain: 0.288 });
                      this.tone({ freq: 784, wave: 'triangle', dur: 0.10, gain: 0.288, delay: 0.08 });
                      this.tone({ freq: 1046, wave: 'triangle', dur: 0.20, gain: 0.288, delay: 0.16 }); break;
      case 'door':    this.tone({ freq: 180, wave: 'sawtooth', dur: 0.18, gain: 0.192, cutoff: 700 }); break;
    }
  }
}
