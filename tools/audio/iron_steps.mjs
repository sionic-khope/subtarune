import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Original short sole-on-steel impacts; no sampled recording or outside voice.
const sampleRate = 44100;
const duration = 0.62;
const modes = [
  [571, 0.15, 6], [887, 0.21, 4.5], [1321, 0.17, 5.5], [1837, 0.13, 8],
  [2473, 0.09, 12], [3299, 0.065, 16], [4217, 0.04, 21],
];
for (let variant = 1; variant <= 2; variant++) {
  let seed = 1370 + variant;
  let lowNoise = 0;
  let peak = 0;
  const pcm = Buffer.alloc(Math.round(sampleRate * duration) * 4);
  for (let i = 0; i < pcm.length / 4; i++) {
    const t = i / sampleRate;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    lowNoise += (noise - lowNoise) * 0.28;
    const attack = Math.min(1, t / 0.0007);
    const release = Math.min(1, (duration - t) / 0.09);
    const pitch = variant === 1 ? 1 : 1.023;
    const plate = modes.reduce((sum, [hz, gain, decay], n) => {
      const phase = 2 * Math.PI * hz * pitch * t;
      const split = 2 * Math.PI * (11 + n * 3) * t;
      return sum + (Math.sin(phase) * 0.72 + Math.sin(phase + split) * 0.28)
        * Math.exp(-decay * t) * gain;
    }, 0);
    const contact = (noise - lowNoise) * (Math.exp(-150 * t) * 0.46 + Math.exp(-32 * t) * 0.075);
    const sample = (plate + contact) * attack * release;
    peak = Math.max(peak, Math.abs(sample));
    pcm.writeFloatLE(sample, i * 4);
  }
  for (let i = 0; i < pcm.length / 4; i++) pcm.writeFloatLE(pcm.readFloatLE(i * 4) * 0.86 / peak, i * 4);
  const output = fileURLToPath(new URL(`../../assets/audio/sfx/iron_step_${variant}.mp3`, import.meta.url));
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'f32le', '-ar', String(sampleRate), '-ac', '1', '-i', 'pipe:0',
    '-map_metadata', '-1', '-c:a', 'libmp3lame', '-q:a', '2', output], { input: pcm });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.toString());
  console.log(`iron_step_${variant}: ${duration}s original steel clang, PCM peak 0.86`);
}
