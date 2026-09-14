import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, '../../../audio/sfx/park_trial_shatter.mp3');
const rate = 44100;
const duration = 0.74;
const samples = new Float64Array(Math.round(rate * duration));
let seed = 156031;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}

// Brittle attack plus separate, inharmonic shard contacts; no kick or voice.
let previousNoise = 0;
for (let i = 0; i < samples.length; i++) {
  const t = i / rate;
  const noise = random() * 2 - 1;
  const brightNoise = (noise - previousNoise) * 0.5;
  previousNoise = noise;
  samples[i] = brightNoise * (0.7 * Math.exp(-t / 0.023) + 0.2 * Math.exp(-t / 0.11));
}
for (let shard = 0; shard < 27; shard++) {
  const onset = shard === 0 ? 0 : 0.025 + 0.47 * random() ** 1.6;
  const fundamental = 1450 + random() * 3600;
  const amplitude = shard === 0 ? 0.55 : 0.075 + random() * 0.13;
  const decay = 0.023 + random() * 0.068;
  const phase = random() * Math.PI * 2;
  for (let i = Math.ceil(onset * rate); i < samples.length; i++) {
    const t = i / rate - onset;
    const envelope = Math.min(1, t / 0.0007) * Math.exp(-t / decay);
    const ring = Math.sin(2 * Math.PI * fundamental * t + phase)
      + 0.48 * Math.sin(2 * Math.PI * fundamental * 1.417 * t)
      + 0.23 * Math.sin(2 * Math.PI * fundamental * 2.073 * t);
    samples[i] += amplitude * envelope * ring;
  }
}
const peak = samples.reduce((maximum, sample) => Math.max(maximum, Math.abs(sample)), 0);
const pcm = Buffer.alloc(samples.length * 4);
for (let i = 0; i < samples.length; i++) {
  const edge = Math.min(1, i / (rate * 0.0005), (samples.length - 1 - i) / (rate * 0.04));
  pcm.writeFloatLE(samples[i] * 0.65 / peak * edge, i * 4);
}
const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'f32le', '-ar', String(rate), '-ac', '1', '-i', 'pipe:0',
  '-af', 'highpass=f=1000', '-map_metadata', '-1', '-c:a', 'libmp3lame', '-q:a', '2', output], { input: pcm });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(result.stderr.toString());
console.log(JSON.stringify({ output, duration, rate, channels: 1,
  sha256: createHash('sha256').update(fs.readFileSync(output)).digest('hex') }));
