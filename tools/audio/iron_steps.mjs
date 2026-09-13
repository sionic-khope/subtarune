import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Original short sole-on-steel impacts; no sampled recording or outside voice.
const sampleRate = 44100;
const duration = 0.23;
for (let variant = 1; variant <= 2; variant++) {
  let seed = 1360 + variant;
  let lowNoise = 0;
  const pcm = Buffer.alloc(Math.round(sampleRate * duration) * 4);
  for (let i = 0; i < pcm.length / 4; i++) {
    const t = i / sampleRate;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    lowNoise += (noise - lowNoise) * 0.12;
    const attack = Math.min(1, t / 0.0015);
    const release = Math.min(1, (duration - t) / 0.03);
    const pitch = variant === 1 ? 1 : 0.92;
    const thump = Math.sin(2 * Math.PI * (135 * pitch * t - 100 * t * t)) * Math.exp(-45 * t) * 0.44;
    const plate = [460, 713, 1127, 1631].reduce((sum, hz, n) =>
      sum + Math.sin(2 * Math.PI * hz * pitch * t) * Math.exp(-(20 + n * 8) * t) * 0.075 / (n + 1), 0);
    const contact = (noise - lowNoise) * Math.exp(-170 * t) * 0.17 + lowNoise * Math.exp(-55 * t) * 0.3;
    pcm.writeFloatLE((thump + plate + contact) * attack * release, i * 4);
  }
  const output = fileURLToPath(new URL(`../../assets/audio/sfx/iron_step_${variant}.mp3`, import.meta.url));
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'f32le', '-ar', String(sampleRate), '-ac', '1', '-i', 'pipe:0',
    '-map_metadata', '-1', '-c:a', 'libmp3lame', '-q:a', '2', output], { input: pcm });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.toString());
  console.log(`iron_step_${variant}: ${duration}s original steel footstep`);
}
