import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Original nonverbal cartoon blips: no recorded speaker, voice model, or sampled voice.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sampleRate = 44100;
const voices = [
  { id: 'yakulbeol', duration: 0.17, pitch: 425, glide: 230, wobble: 15, vibrato: 34,
    formants: [[650, 270], [1800, 440]], buzz: 0.16, peak: 0.26 },
  { id: 'mabaem', duration: 0.18, pitch: 175, glide: -80, wobble: 12, vibrato: 9,
    formants: [[470, 210], [1050, 360]], buzz: 0.015, peak: 0.28 },
  { id: 'parkwonsung', duration: 0.16, pitch: 310, glide: 1250, wobble: 32, vibrato: 19,
    formants: [[620, 210], [2300, 420]], buzz: 0.045, peak: 0.25 },
];

for (const voice of voices) {
  const count = Math.round(sampleRate * voice.duration);
  const samples = new Float32Array(count);
  let phase = 0, peak = 0;
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    const frequency = voice.pitch + voice.glide * t + voice.wobble * Math.sin(2 * Math.PI * voice.vibrato * t);
    phase += 2 * Math.PI * frequency / sampleRate;
    let value = 0;
    for (let harmonic = 1; harmonic <= 14; harmonic++) {
      const hz = frequency * harmonic;
      const formant = voice.formants.reduce((sum, [center, width]) => sum + Math.exp(-0.5 * ((hz - center) / width) ** 2), 0);
      value += Math.sin(phase * harmonic) * (0.07 + formant) / harmonic;
    }
    const buzz = 1 + voice.buzz * Math.sin(2 * Math.PI * 115 * t);
    const attack = Math.min(1, t / 0.006);
    const release = Math.min(1, (voice.duration - t) / 0.025);
    samples[i] = value * buzz * Math.sin(attack * Math.PI / 2) * Math.sin(release * Math.PI / 2) * Math.exp(-3.5 * t);
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  const pcm = Buffer.alloc(count * 4);
  for (let i = 0; i < count; i++) pcm.writeFloatLE(samples[i] * voice.peak / peak, i * 4);
  const output = path.join(root, 'assets/audio/voices', `${voice.id}.mp3`);
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', String(sampleRate), '-ac', '1', '-i', 'pipe:0', '-map_metadata', '-1', '-c:a', 'libmp3lame', '-q:a', '2', output], { input: pcm, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr);
  console.log(`${voice.id}: ${voice.duration}s original cartoon blip → ${output}`);
}
