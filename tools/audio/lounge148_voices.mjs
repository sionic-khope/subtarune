import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const sampleRate = 44100;
export const voices = [
  { id: 'warm_bidet', duration: 0.17, startHz: 88, endHz: 80, wobble: 1.8, vibratoHz: 18,
    formants: [[270, 130], [650, 200]], fundamental: 0.85, rolloff: 1.45, roughness: 0.16, peak: 0.27 },
  { id: 'lucky_guy', duration: 0.19, peak: 0.28, source: 'lucky_guy-eddy-he.aiff',
    origin: 'macOS built-in Korean Eddy TTS, nonverbal 헤; no recorded-person voice clone',
    sayArgs: ['-v', 'Eddy (한국어(한국))', '-r', '190'], phoneme: '헤',
    filter: 'asetrate=23814,aresample=44100,atrim=duration=0.19,acompressor=threshold=0.02:ratio=4:attack=0.3:release=40,afade=t=in:d=0.005,afade=t=out:st=0.165:d=0.025' },
  { id: 'park_guardian_costume', duration: 0.16, startHz: 410, endHz: 450, wobble: 5, vibratoHz: 7,
    formants: [[850, 250], [2250, 400]], fundamental: 0.5, rolloff: 1.6, roughness: 0, peak: 0.28 },
  { id: 'park_guardian', duration: 0.175, startHz: 104, endHz: 96, wobble: 1.8, vibratoHz: 15,
    formants: [[290, 120], [680, 180]], fundamental: 0.75, rolloff: 1.3, roughness: 0.21, peak: 0.3 },
];

// Nonverbal original vowels: harmonic source, two vocal resonances, no recorded voice.
export function synthesize(voice) {
  const samples = new Float32Array(Math.round(sampleRate * voice.duration));
  let phase = 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    const progress = i / (samples.length - 1);
    const frequency = voice.startHz + (voice.endHz - voice.startHz) * progress
      + voice.wobble * Math.sin(2 * Math.PI * voice.vibratoHz * t);
    phase += 2 * Math.PI * frequency / sampleRate;
    let value = voice.fundamental * Math.sin(phase);
    for (let harmonic = 2; harmonic <= 20; harmonic++) {
      const hz = frequency * harmonic;
      const resonances = voice.formants.reduce((sum, [center, width]) =>
        sum + Math.exp(-0.5 * ((hz - center) / width) ** 2), 0);
      value += Math.sin(harmonic * phase) * (0.025 + 2 * resonances) / harmonic ** voice.rolloff;
    }
    const attack = Math.sin(Math.min(1, t / 0.005) * Math.PI / 2);
    const release = Math.sin(Math.min(1, (samples.length - 1 - i) / sampleRate / 0.025) * Math.PI / 2);
    const grain = 1 + voice.roughness * Math.sin(2 * Math.PI * 43 * t);
    samples[i] = value * grain * attack * release * Math.exp(-2 * t);
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  return samples.map(value => value * voice.peak / peak);
}

function pcm(samples) {
  const bytes = Buffer.alloc(samples.length * 4);
  samples.forEach((value, i) => bytes.writeFloatLE(value, i * 4));
  return bytes;
}

function ffmpeg(args, input) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], { input });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.toString());
  return result.stdout;
}

function writeAudio(samples, target, codec) {
  ffmpeg(['-y', '-f', 'f32le', '-ar', String(sampleRate), '-ac', '1', '-i', 'pipe:0',
    '-map_metadata', '-1', ...codec, target], pcm(samples));
}

function ttsSamples(voice, sourceDir) {
  const original = path.join(sourceDir, voice.source);
  if (!fs.existsSync(original)) {
    const result = spawnSync('say', [...voice.sayArgs, '-o', original, voice.phoneme]);
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr.toString());
  }
  const raw = ffmpeg(['-i', original, '-af', voice.filter, '-f', 'f32le', '-ar', String(sampleRate), '-ac', '1', 'pipe:1']);
  const samples = Float32Array.from({ length: raw.length / 4 }, (_, i) => raw.readFloatLE(i * 4));
  samples[0] = 0;
  samples[samples.length - 1] = 0;
  const peak = Math.max(...samples.map(Math.abs));
  if (!peak) throw new Error('TTS source contains no audible samples');
  return samples.map(value => value * voice.peak / peak);
}

export function measurements(bytes) {
  let peak = 0;
  let energy = 0;
  for (let offset = 0; offset < bytes.length; offset += 4) {
    const value = bytes.readFloatLE(offset);
    peak = Math.max(peak, Math.abs(value));
    energy += value * value;
  }
  const count = bytes.length / 4;
  return { decodedSamples: count, duration: count / sampleRate, peak,
    peakDb: 20 * Math.log10(peak), rmsDb: 10 * Math.log10(energy / count) };
}

function generate() {
  const sourceDir = path.join(root, 'assets/source/lounge148/audio');
  fs.mkdirSync(sourceDir, { recursive: true });
  const all = [];
  const manifest = { origin: 'Original harmonic vowels; lucky_guy uses built-in macOS Eddy Korean TTS. No recorded-person clone.',
    sampleRate, channels: 1, attackSeconds: 0.005, releaseSeconds: 0.025,
    encoder: 'ffmpeg -f f32le -ar 44100 -ac 1 -i pipe:0 -map_metadata -1 -c:a libmp3lame -q:a 2',
    preview: '8 decoded blips, runtime level 0.85; sample duration + 20 ms between onsets', voices: [] };
  for (const voice of voices) {
    const samples = voice.source ? ttsSamples(voice, sourceDir) : synthesize(voice);
    const output = path.join(root, 'assets/audio/voices', `${voice.id}.mp3`);
    writeAudio(samples, path.join(sourceDir, `${voice.id}-source.wav`), ['-c:a', 'pcm_s16le']);
    writeAudio(samples, output, ['-c:a', 'libmp3lame', '-q:a', '2']);
    const decoded = ffmpeg(['-i', output, '-f', 'f32le', '-ar', String(sampleRate), '-ac', '1', 'pipe:1']);
    const stats = measurements(decoded);
    const interval = Math.round(sampleRate * (voice.duration + 0.02));
    const preview = new Float32Array(interval * 8 + Math.round(sampleRate * 0.4));
    for (let repeat = 0; repeat < 8; repeat++) {
      for (let i = 0; i < stats.decodedSamples; i++) preview[repeat * interval + i] = decoded.readFloatLE(i * 4) * 0.85;
    }
    writeAudio(preview, path.join(sourceDir, `${voice.id}-preview.wav`), ['-c:a', 'pcm_s16le']);
    all.push(...preview, ...new Float32Array(Math.round(sampleRate * 0.45)));
    const record = { ...voice, targetPeak: voice.peak, requestedDuration: voice.duration, ...stats,
      ...(voice.source ? { sourceSha256: createHash('sha256').update(fs.readFileSync(path.join(sourceDir, voice.source))).digest('hex') } : {}),
      sha256: createHash('sha256').update(fs.readFileSync(output)).digest('hex') };
    manifest.voices.push(record);
    console.log(JSON.stringify(record));
  }
  writeAudio(Float32Array.from(all), path.join(sourceDir, 'all-voices-preview.wav'), ['-c:a', 'pcm_s16le']);
  fs.writeFileSync(path.join(sourceDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) generate();
