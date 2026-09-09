// 사운드는 전부 WebAudio로 합성한다 (오디오 파일 0개).
// 대사 한 글자마다 0.1초짜리 블립이 울린다 — 화자마다 음색이 다르다.

export const VOICES = {
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
  junhee:   { freq: 240, wave: 'sawtooth', dur: 0.10, jitter: 60, gain: 0.224, cutoff: 900,  glide: 90 },   // 돼지: 콧소리 꿀꿀
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
  playBgm(name, { loop = true, volume = 0.35, fadeIn = 0.5 } = {}) {
    volume = Math.min(volume, 0.4);
    if (this.bgm && this.bgmName === name) return;
    this.stopBgm(0.4);
    if (!name) return;
    const a = new Audio(`assets/audio/bgm/${name}.mp3`);
    a.loop = loop; a.volume = 0;
    a.play().catch(() => {});
    this.bgm = a; this.bgmName = name; this.bgmVolume = volume;
    this._ramp(a, this.muted ? 0 : volume, fadeIn);
  }
  stopBgm(fade = 0.8) {
    const a = this.bgm; if (!a) return;
    this.bgm = null; this.bgmName = null;
    this._ramp(a, 0, fade, () => { a.pause(); a.src = ''; });
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

  sfx(name, { volume = 0.9, rate = 1 } = {}) {
    if (this.muted || !name) return;
    const f = this.files[name];
    if (f) { const a = f.cloneNode(); a.volume = Math.min(1, volume); a.playbackRate = rate; a.play().catch(() => {}); return; }
    switch (name) {
      case 'menu':    this.tone({ freq: 760, wave: 'square', dur: 0.06, gain: 0.224 }); break;
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
