// 사운드는 전부 WebAudio로 합성한다 (오디오 파일 0개).
// 대사 한 글자마다 0.1초짜리 블립이 울린다 — 화자마다 음색이 다르다.

export const VOICES = {
  // freq: 기본 음높이, dur: 한 글자 사운드 길이(초), wave: 파형
  default: { freq: 520, wave: 'square',   dur: 0.10, jitter: 24, gain: 0.16, cutoff: 2600 },
  hero:    { freq: 620, wave: 'square',   dur: 0.10, jitter: 30, gain: 0.15, cutoff: 3000 },
  low:     { freq: 210, wave: 'sawtooth', dur: 0.10, jitter: 14, gain: 0.13, cutoff: 1200, glide: -60 },
  cat:     { freq: 880, wave: 'triangle', dur: 0.10, jitter: 90, gain: 0.16, cutoff: 4000 },
  robot:   { freq: 300, wave: 'square',   dur: 0.10, jitter: 0,  gain: 0.14, cutoff: 900 },
  narrator:{ freq: 440, wave: 'sine',     dur: 0.10, jitter: 10, gain: 0.13, cutoff: 2000, rate: 1.0 },   // 이름 없는 '* ~가 있다' 대사
  // ── 캐릭터별 ──
  hyungsub: { freq: 560, wave: 'square',   dur: 0.10, jitter: 40, gain: 0.15, cutoff: 2800 },              // 밝고 또렷
  gyeongsub:{ freq: 330, wave: 'triangle', dur: 0.10, jitter: 12, gain: 0.17, cutoff: 1600, glide: -20, rate: 0.88 },  // 낮고 차분 (파일이면 톤다운)
  ppaman:   { freq: 990, wave: 'sine',     dur: 0.10, jitter: 15, gain: 0.18, cutoff: 3600, glide: 60, bell: true, rate: 0.9 }, // '띠링'을 톤다운한 종소리
  junhee:   { freq: 240, wave: 'sawtooth', dur: 0.10, jitter: 60, gain: 0.14, cutoff: 900,  glide: 90 },   // 돼지: 콧소리 꿀꿀
};

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.files = {};          // sfx 이름 → HTMLAudioElement (assets/audio/sfx/<name>.mp3|ogg)
    this.voiceRaw = {};       // voice 이름 → ArrayBuffer (assets/audio/voices/<name>.mp3|ogg)
    this.voiceBuf = {};       // voice 이름 → AudioBuffer (unlock 후 디코드)
  }

  /** assets/audio/voices/<voice>.(mp3|ogg) 가 있으면 글자 블립을 그 샘플로 낸다 (한 샘플만 있으면 됨) */
  async loadVoiceFiles(names) {
    const grab = async (src) => { try { const r = await fetch(src); return r.ok ? await r.arrayBuffer() : null; } catch { return null; } };
    await Promise.all(names.map(async (n) => {
      const buf = (await grab(`assets/audio/voices/${n}.mp3`)) || (await grab(`assets/audio/voices/${n}.ogg`));
      if (buf) this.voiceRaw[n] = buf;
    }));
  }
  async _decodeVoices() {
    for (const [n, raw] of Object.entries(this.voiceRaw)) {
      if (this.voiceBuf[n]) continue;
      try { this.voiceBuf[n] = await this.ctx.decodeAudioData(raw.slice(0)); } catch (e) { console.warn('[audio] 음성 디코드 실패', n, e); }
    }
  }

  /** assets/audio/sfx/<name>.(mp3|ogg) 가 있으면 등록. 없는 건 조용히 합성 유지 */
  async loadSfxFiles(names) {
    const probe = (src) => new Promise((resolve) => {
      const a = new Audio(); a.preload = 'auto';
      a.oncanplaythrough = () => resolve(a);
      a.onerror = () => resolve(null);
      a.src = src;
    });
    await Promise.all(names.map(async (n) => {
      const a = (await probe(`assets/audio/sfx/${n}.mp3`)) || (await probe(`assets/audio/sfx/${n}.ogg`));
      if (a) this.files[n] = a;
    }));
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    this._decodeVoices();
  }

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

  // 대사 한 글자 사운드 — 파일(assets/audio/voices/<voice>.mp3)이 있으면 샘플, 없으면 합성
  blip(voiceName) {
    const v = VOICES[voiceName] || VOICES.default;
    const buf = this.voiceBuf[voiceName];
    if (buf && this.ctx && !this.muted) {
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = (v.rate ?? 1) * (1 + (Math.random() * 2 - 1) * 0.03);   // 톤다운 + 미세 변화
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.setValueAtTime(0.5, t + Math.min(buf.duration, v.dur ?? 0.1) - 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(buf.duration, v.dur ?? 0.1) + 0.02);   // 0.1초로 자름
      src.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + Math.min(buf.duration, (v.dur ?? 0.1) + 0.05));
      return;
    }
    this.tone(v);
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
  stopIntro() { if (this.introAudio) { this.introAudio.pause(); this.introAudio = null; } }

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
    this.tone({ freq: 90, wave: 'square', dur: 0.35, gain: 0.35, cutoff: 500, glide: -50 });
    this.tone({ freq: 55, wave: 'sine', dur: 0.6, gain: 0.4, cutoff: 300 });
    this.tone({ freq: 1760, wave: 'triangle', dur: 0.5, gain: 0.12, delay: 0.05 });
    this.tone({ freq: 2637, wave: 'triangle', dur: 0.7, gain: 0.10, delay: 0.12 });
  }

  sfx(name) {
    if (this.muted) return;
    const f = this.files[name];
    if (f) { const a = f.cloneNode(); a.volume = 0.7; a.play().catch(() => {}); return; }
    switch (name) {
      case 'menu':    this.tone({ freq: 760, wave: 'square', dur: 0.06, gain: 0.14 }); break;
      case 'chime':   // 띠링 ♪
                      this.tone({ freq: 1318, wave: 'triangle', dur: 0.10, gain: 0.20 });
                      this.tone({ freq: 1760, wave: 'triangle', dur: 0.10, gain: 0.20, delay: 0.07 });
                      this.tone({ freq: 2637, wave: 'triangle', dur: 0.45, gain: 0.22, delay: 0.14 }); break;
      case 'confirm': this.tone({ freq: 660, wave: 'square', dur: 0.06, gain: 0.16 });
                      this.tone({ freq: 990, wave: 'square', dur: 0.09, gain: 0.14, delay: 0.05 }); break;
      case 'cancel':  this.tone({ freq: 340, wave: 'square', dur: 0.09, gain: 0.15, glide: -120 }); break;
      case 'open':    this.tone({ freq: 240, wave: 'square', dur: 0.07, gain: 0.13, glide: 220 }); break;
      case 'close':   this.tone({ freq: 460, wave: 'square', dur: 0.07, gain: 0.12, glide: -220 }); break;
      case 'item':    this.tone({ freq: 523, wave: 'triangle', dur: 0.10, gain: 0.18 });
                      this.tone({ freq: 784, wave: 'triangle', dur: 0.10, gain: 0.18, delay: 0.08 });
                      this.tone({ freq: 1046, wave: 'triangle', dur: 0.20, gain: 0.18, delay: 0.16 }); break;
      case 'door':    this.tone({ freq: 180, wave: 'sawtooth', dur: 0.18, gain: 0.12, cutoff: 700 }); break;
    }
  }
}
