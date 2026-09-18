/** Schedule a keyed phrase on the audible BGM timeline, including late hits and loops. */
export function melodySchedule(note, songTime, clock) {
  if (!Number.isFinite(note.soundDur) || note.soundDur <= 0) return null;
  const wait = Math.max(0, (note.t - songTime) / clock.rate - clock.latency);
  const audibleTime = songTime + (wait + clock.latency) * clock.rate;
  const duration = (note.t + note.soundDur - audibleTime) / clock.rate;
  if (duration <= 0) return null;
  return {
    when: clock.currentTime + wait,
    offset: ((audibleTime % clock.duration) + clock.duration) % clock.duration,
    duration, targetTime: note.t, songTime,
  };
}

/** Key the original song's harmonic layer; never guess pitches from its polyphonic mix. */
export function createMelodyLayer(sound, config) {
  let buffer = null, disposed = false, error = null, last = null, played = 0;
  const voices = new Set();
  if (sound.ctx && sound.loadCue) {
    sound.loadCue(config.src).then(decoded => {
      if (!disposed) buffer = decoded;
    }).catch(reason => {
      if (!disposed) { error = String(reason); console.warn('[rhythm] Melody layer unavailable', reason); }
    });
  }
  const stop = () => {
    for (const voice of voices) {
      voice.source.stop();
      voice.source.disconnect(); voice.gain.disconnect(); voice.color.disconnect();
    }
    voices.clear();
  };
  return {
    get snapshot() { return { ready: !!buffer, active: voices.size, played, last, error }; },
    play(note, songTime) {
      const ctx = sound.ctx, bgm = sound.bgm;
      if (disposed || !buffer || sound.muted || !ctx || ctx.state !== 'running' || bgm?.paused) return;
      const rate = bgm?.playbackRate || 1;
      const cue = melodySchedule(note, songTime, {
        currentTime: ctx.currentTime, duration: Number.isFinite(bgm?.duration) ? bgm.duration : buffer.duration, rate,
        latency: (ctx.baseLatency || 0) + (ctx.outputLatency || 0),
      });
      if (!cue || cue.offset >= buffer.duration) return;
      cue.duration = Math.min(cue.duration, (buffer.duration - cue.offset) / rate);
      const source = ctx.createBufferSource(), gain = ctx.createGain(), color = ctx.createWaveShaper();
      source.buffer = buffer; source.playbackRate.value = rate;
      const curve = new Float32Array(1024), drive = config.drive;
      for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((2 * i / (curve.length - 1) - 1) * drive) / Math.tanh(drive);
      color.curve = curve; color.oversample = '2x';
      const attack = Math.min(config.attack, cue.duration / 4), release = Math.min(config.release, cue.duration / 3);
      gain.gain.setValueAtTime(0, cue.when);
      gain.gain.linearRampToValueAtTime(config.gain, cue.when + attack);
      gain.gain.setValueAtTime(config.gain, cue.when + cue.duration - release);
      gain.gain.linearRampToValueAtTime(0, cue.when + cue.duration);
      source.connect(color); color.connect(gain); gain.connect(sound.master);
      const voice = { source, gain, color };
      source.onended = () => { source.disconnect(); color.disconnect(); gain.disconnect(); voices.delete(voice); };
      voices.add(voice);
      source.start(cue.when, cue.offset); source.stop(cue.when + cue.duration);
      last = cue; played += 1;
    },
    update() { if (sound.muted || sound.bgm?.paused || sound.ctx?.state === 'suspended') stop(); },
    dispose() { disposed = true; stop(); buffer = null; },
  };
}
