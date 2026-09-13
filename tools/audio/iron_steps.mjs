import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Original short sole-on-steel impacts; no sampled recording or outside voice.
const sampleRate = 44100;
const duration = 0.38;
const modes = [
  [223, 0.13, 17], [359, 0.1, 20], [587, 0.055, 28],
  [941, 0.023, 40], [1399, 0.006, 68],
];
for (let variant = 1; variant <= 2; variant++) {
  let seed = 1370 + variant;
  let lowNoise = 0;
  let soleNoise = 0;
  let bassNoise = 0;
  let peak = 0;
  const pcm = Buffer.alloc(Math.round(sampleRate * duration) * 4);
  for (let i = 0; i < pcm.length / 4; i++) {
    const t = i / sampleRate;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    lowNoise += (noise - lowNoise) * 0.12;
    soleNoise += (lowNoise - soleNoise) * 0.18;
    bassNoise += (soleNoise - bassNoise) * 0.014;
    const attack = Math.min(1, t / 0.0018);
    const release = Math.min(1, (duration - t) / 0.06);
    const pitch = variant === 1 ? 1 : 0.953;
    const plate = modes.reduce((sum, [hz, gain, decay], n) => {
      const phase = 2 * Math.PI * hz * pitch * t;
      const split = 2 * Math.PI * (7 + n * 2) * t;
      return sum + (Math.sin(phase) * 0.8 + Math.sin(phase + split) * 0.2)
        * Math.exp(-decay * t) * gain;
    }, 0);
    const heel = Math.exp(-43 * t) * 1.25;
    const soleTime = Math.max(0, t - (variant === 1 ? 0.024 : 0.029));
    const sole = (1 - Math.exp(-180 * soleTime)) * Math.exp(-48 * soleTime) * 0.8;
    const contact = (soleNoise - bassNoise) * (heel + sole)
      + (noise - lowNoise) * Math.exp(-210 * t) * 0.012;
    const sample = (plate + contact) * attack * release;
    peak = Math.max(peak, Math.abs(sample));
    pcm.writeFloatLE(sample, i * 4);
  }
  for (let i = 0; i < pcm.length / 4; i++) pcm.writeFloatLE(pcm.readFloatLE(i * 4) * 0.78 / peak, i * 4);
  const output = fileURLToPath(new URL(`../../assets/audio/sfx/iron_step_${variant}.mp3`, import.meta.url));
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'f32le', '-ar', String(sampleRate), '-ac', '1', '-i', 'pipe:0',
    '-map_metadata', '-1', '-c:a', 'libmp3lame', '-q:a', '2', output], { input: pcm });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.toString());
  console.log(`iron_step_${variant}: ${duration}s original boot-on-steel impact, PCM peak 0.78`);
}
