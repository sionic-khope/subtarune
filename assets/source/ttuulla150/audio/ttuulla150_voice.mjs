import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] || path.join(sourceDir, '../../../..'));
const source = path.join(sourceDir, 'ttuulla-eddy-hihi.aiff');
const output = path.join(root, 'assets/audio/voices/ttuulla.mp3');
const sampleRate = 44100;
const duration = 0.18;
const pitchRatio = 1.42;
const targetPeak = 0.28;
const runtime = { rate: 1, level: 0.85, cut: false, minGap: 0.2 };
const sayArgs = ['-v', 'Eddy (한국어(한국))', '-r', '175'];
const baseFilter = 'asetrate=31311,aresample=44100,atempo=0.94,highpass=f=100,lowpass=f=4200,acompressor=threshold=0.03:ratio=2:attack=4:release=40,silenceremove=start_periods=1:start_duration=0.004:start_threshold=-50dB';

function run(command, args, input) {
  const result = spawnSync(command, args, { input, maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.toString());
  return result.stdout;
}

function ffmpeg(args, input) {
  return run('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], input);
}

function stats(bytes) {
  let peak = 0;
  let energy = 0;
  let clippedSamples = 0;
  for (let offset = 0; offset < bytes.length; offset += 4) {
    const value = bytes.readFloatLE(offset);
    if (!Number.isFinite(value)) throw new Error('Nonfinite audio sample');
    peak = Math.max(peak, Math.abs(value));
    energy += value * value;
    if (Math.abs(value) >= 1) clippedSamples++;
  }
  const decodedSamples = bytes.length / 4;
  return { decodedSamples, duration: decodedSamples / sampleRate, peak,
    peakDb: 20 * Math.log10(peak), rmsDb: 10 * Math.log10(energy / decodedSamples),
    firstSample: bytes.readFloatLE(0), lastSample: bytes.readFloatLE(bytes.length - 4), clippedSamples };
}

function normalize(bytes) {
  const peak = stats(bytes).peak;
  if (!peak) throw new Error('TTS source is silent');
  const samples = Float32Array.from({ length: bytes.length / 4 }, (_, i) => bytes.readFloatLE(i * 4) * targetPeak / peak);
  samples[0] = 0;
  samples[samples.length - 1] = 0;
  return samples;
}

function encode(samples, target, codec) {
  const bytes = Buffer.alloc(samples.length * 4);
  samples.forEach((value, i) => bytes.writeFloatLE(value, i * 4));
  ffmpeg(['-y', '-f', 'f32le', '-ar', String(sampleRate), '-ac', '1', '-i', 'pipe:0',
    '-map_metadata', '-1', ...codec, target], bytes);
}

if (!fs.existsSync(source)) run('say', [...sayArgs, '-o', source, '히히']);
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', source]));
if (Number(probe.streams[0].sample_rate) !== 22050) throw new Error('Expected 22050 Hz TTS source');
const fullRaw = ffmpeg(['-i', source, '-af', baseFilter, '-f', 'f32le', '-ac', '1', 'pipe:1']);
const fullDuration = fullRaw.length / 4 / sampleRate;
const fullFilter = `${baseFilter},afade=t=in:d=0.008,afade=t=out:st=${fullDuration - 0.035}:d=0.035`;
const blipFilter = `${baseFilter},atrim=duration=${duration},asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st=0.15:d=0.03`;
const full = normalize(ffmpeg(['-i', source, '-af', fullFilter, '-f', 'f32le', '-ac', '1', 'pipe:1']));
const blip = normalize(ffmpeg(['-i', source, '-af', blipFilter, '-f', 'f32le', '-ac', '1', 'pipe:1']));
encode(full, path.join(sourceDir, 'ttuulla-full.wav'), ['-c:a', 'pcm_s16le']);
encode(blip, path.join(sourceDir, 'ttuulla-source.wav'), ['-c:a', 'pcm_s16le']);
encode(blip, output, ['-c:a', 'libmp3lame', '-q:a', '2']);
const decoded = ffmpeg(['-i', output, '-f', 'f32le', '-ar', String(sampleRate), '-ac', '1', 'pipe:1']);
const measured = stats(decoded);
if (measured.clippedSamples || measured.duration > runtime.minGap) throw new Error('Blip clips or overlaps the recommended interval');
const interval = Math.round(sampleRate * runtime.minGap);
const preview = new Float32Array(interval * 8 + Math.round(sampleRate * 0.4));
for (let repeat = 0; repeat < 8; repeat++) {
  for (let i = 0; i < measured.decodedSamples; i++) preview[repeat * interval + i] = decoded.readFloatLE(i * 4) * runtime.level;
}
encode(preview, path.join(sourceDir, 'ttuulla-preview.wav'), ['-c:a', 'pcm_s16le']);
fs.copyFileSync(output, path.join(sourceDir, 'ttuulla.mp3'));
const manifest = {
  id: 'ttuulla', origin: 'macOS built-in Eddy Korean TTS; original mischievous cartoon-mouse character direction. No Jerry actor recording or voice clone.',
  direction: 'Short playful high 히히, preserving speech texture. No oscillator or bitcrusher.',
  text: '히히', sayArgs, sourceSampleRate: 22050, pitchRatio,
  pitchSemitones: 12 * Math.log2(pitchRatio), tempoAfterPitch: 0.94,
  baseFilter, fullFilter, blipFilter, sampleRate, channels: 1, targetPeak,
  requestedDuration: duration, fullDuration, attackSeconds: 0.008, releaseSeconds: 0.03,
  runtime, integration: 'Asset prepared only; voice key, NPC, dialogue and events are not registered.',
  ...measured, preview: 'Eight decoded MP3 blips at gain 0.85, onsets 200 ms apart, 2.0-second WAV; no autoplay.',
  listeningStatus: 'Objective decode/waveform QC only; subjective timbre awaits user listening.',
  sourceSha256: createHash('sha256').update(fs.readFileSync(source)).digest('hex'),
  sha256: createHash('sha256').update(fs.readFileSync(output)).digest('hex'),
};
fs.writeFileSync(path.join(sourceDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
