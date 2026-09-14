import { execFileSync } from 'node:child_process';

const source = process.argv[2];
if (!source) throw new Error('Usage: node measure.mjs /path/to/source.webm');
const clips = [
  { key: 'scream', start: 0.55, end: 1.6 },
  { key: 'jeolla', start: 1.94, end: 4.5 },
];
function measure(path, filter) {
  const args = ['-v', 'error', '-i', path];
  if (filter) args.push('-af', filter);
  args.push('-f', 'f32le', '-acodec', 'pcm_f32le', '-');
  const bytes = execFileSync('ffmpeg', args);
  let power = 0, peak = 0, clipped = 0;
  for (let i = 0; i < bytes.length; i += 4) {
    const value = bytes.readFloatLE(i);
    power += value * value;
    peak = Math.max(peak, Math.abs(value));
    if (Math.abs(value) >= 1) clipped++;
  }
  const samples = bytes.length / 4;
  return { samples, seconds: samples / 96000, rmsDbfs: 10 * Math.log10(power / samples), peakDbfs: 20 * Math.log10(peak), clipped };
}
for (const clip of clips) {
  console.log(JSON.stringify({ key: clip.key, source: measure(source, `atrim=start=${clip.start}:end=${clip.end}`), output: measure(`assets/audio/sfx/park_razma_${clip.key}.mp3`) }));
}
