import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { measurements, sampleRate } from './lounge148_voices.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourceDir = path.join(root, 'assets/source/obangsun149/audio');
const source = path.join(sourceDir, 'obangsun-yuna-hueee.aiff');
const output = path.join(root, 'assets/audio/voices/obangsun.mp3');
const baseFilter = 'asetrate=16317,aresample=44100,atempo=0.94,highpass=f=65,lowpass=f=3800,bass=g=2:f=250:w=0.6,acompressor=threshold=0.025:ratio=3:attack=3:release=50';
const duration = 0.25;
const targetPeak = 0.28;
const runtime = { rate: 1, level: 0.85, cut: false, minGap: 0.27 };

function run(command, args, input) {
  const result = spawnSync(command, args, { input });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.toString());
  return result.stdout;
}

function ffmpeg(args, input) {
  return run('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], input);
}

function normalize(bytes) {
  const samples = Float32Array.from({ length: bytes.length / 4 }, (_, i) => bytes.readFloatLE(i * 4));
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  if (!peak) throw new Error('TTS source contains no audible samples');
  samples[0] = 0;
  samples[samples.length - 1] = 0;
  return samples.map(value => value * targetPeak / peak);
}

function encode(samples, target, codec) {
  const bytes = Buffer.alloc(samples.length * 4);
  samples.forEach((value, i) => bytes.writeFloatLE(value, i * 4));
  ffmpeg(['-y', '-f', 'f32le', '-ar', String(sampleRate), '-ac', '1', '-i', 'pipe:0',
    '-map_metadata', '-1', ...codec, target], bytes);
}

fs.mkdirSync(sourceDir, { recursive: true });
if (!fs.existsSync(source)) run('say', ['-v', 'Yuna', '-r', '145', '-o', source, '흐에에에']);
const fullRaw = ffmpeg(['-i', source, '-af', baseFilter, '-f', 'f32le', '-ac', '1', 'pipe:1']);
const fullDuration = fullRaw.length / 4 / sampleRate;
const fullFilter = `${baseFilter},afade=t=in:d=0.008,afade=t=out:st=${fullDuration - 0.04}:d=0.04`;
const blipFilter = `${baseFilter},atrim=start=0.025:duration=${duration},asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st=0.215:d=0.035`;
const full = normalize(ffmpeg(['-i', source, '-af', fullFilter, '-f', 'f32le', '-ac', '1', 'pipe:1']));
const blip = normalize(ffmpeg(['-i', source, '-af', blipFilter, '-f', 'f32le', '-ac', '1', 'pipe:1']));
encode(full, path.join(sourceDir, 'obangsun-full.wav'), ['-c:a', 'pcm_s16le']);
encode(blip, path.join(sourceDir, 'obangsun-source.wav'), ['-c:a', 'pcm_s16le']);
encode(blip, output, ['-c:a', 'libmp3lame', '-q:a', '2']);
const decoded = ffmpeg(['-i', output, '-f', 'f32le', '-ar', String(sampleRate), '-ac', '1', 'pipe:1']);
const stats = measurements(decoded);
const interval = Math.round(sampleRate * runtime.minGap);
const preview = new Float32Array(interval * 8 + Math.round(sampleRate * 0.4));
for (let repeat = 0; repeat < 8; repeat++) {
  for (let i = 0; i < stats.decodedSamples; i++) preview[repeat * interval + i] = decoded.readFloatLE(i * 4) * runtime.level;
}
encode(preview, path.join(sourceDir, 'obangsun-preview.wav'), ['-c:a', 'pcm_s16le']);
const manifest = {
  id: 'obangsun', origin: 'macOS built-in Yuna Korean TTS. Original character voice direction; no recorded-person voice clone.',
  text: '흐에에에', sayArgs: ['-v', 'Yuna', '-r', '145'], sourceSampleRate: 22050,
  pitchRatio: 0.74, pitchSemitones: 12 * Math.log2(0.74), tempoAfterPitch: 0.94,
  baseFilter, fullFilter, blipFilter, sampleRate, channels: 1,
  targetPeak, requestedDuration: duration, fullDuration, runtime, ...stats,
  preview: 'Eight decoded MP3 blips, gain 0.85, onsets 270 ms apart; no autoplay.',
  sourceSha256: createHash('sha256').update(fs.readFileSync(source)).digest('hex'),
  sha256: createHash('sha256').update(fs.readFileSync(output)).digest('hex'),
};
fs.writeFileSync(path.join(sourceDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
