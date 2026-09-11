// 오디오 참조 감사 (이름에 숫자가 붙은 변형도 본다 — water_step2 같은 걸음 소리 변형, 2026-09-12): 코드·맵·컷신이 부르는 sfx/bgm/voice 이름이 실제 파일(assets/audio/*) 또는 합성 폴백(audio.js case)에 있어야 한다.
//   없는 이름은 조용히 무음이 되어 "효과음이 안 난다"로만 보인다 (2026-09-11 검증 보강).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '../..');
const files = (dir) => new Set(fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.mp3')).map((f) => f.replace(/\.mp3$/, '')));
const SFX = files('assets/audio/sfx'), BGM = files('assets/audio/bgm'), VOICE = files('assets/audio/voices');
const audioSrc = fs.readFileSync(path.join(ROOT, 'src/core/audio.js'), 'utf8');
const SYNTH = new Set([...audioSrc.matchAll(/case '([a-z_0-9]+)':/g)].map((m) => m[1]));
const VOICE_PRESETS = new Set([...(audioSrc.match(/VOICES\s*=\s*\{([\s\S]*?)\n\};/)?.[1] || '').matchAll(/^\s*([a-z_0-9]+)\s*:/gm)].map((m) => m[1]));
const walk = (dir, out = []) => { for (const f of fs.readdirSync(path.join(ROOT, dir))) { const p = path.join(dir, f); if (fs.statSync(path.join(ROOT, p)).isDirectory()) walk(p, out); else if (/\.(js|json)$/.test(f)) out.push(p); } return out; };
const sources = [...walk('src'), ...walk('assets/maps').filter((p) => p.endsWith('.json'))];
const refs = { sfx: new Map(), bgm: new Map(), voice: new Map() };
const add = (kind, name, where) => { if (!refs[kind].has(name)) refs[kind].set(name, where); };
for (const p of sources) {
  const s = fs.readFileSync(path.join(ROOT, p), 'utf8');
  for (const m of s.matchAll(/\bsfx\s*:\s*'([a-z_0-9]+)'|\.sfx\(\s*'([a-z_0-9]+)'|sfx\(\s*'([a-z_0-9]+)'/g)) add('sfx', m[1] || m[2] || m[3], p);
  for (const m of s.matchAll(/\bbgm\s*:\s*'([a-z_0-9]+)'|"bgm"\s*:\s*"([a-z_0-9]+)"|playBgm\(\s*'([a-z_0-9]+)'|preloadBgm\(\s*'([a-z_0-9]+)'/g)) add('bgm', m[1] || m[2] || m[3] || m[4], p);
  for (const m of s.matchAll(/\bvoice\s*:\s*'([a-z_0-9]+)'|blip\(\s*'([a-z_0-9]+)'/g)) add('voice', m[1] || m[2], p);
}
test('test_audio_every_referenced_sfx_exists_as_file_or_synth', () => {
  const missing = [...refs.sfx].filter(([n]) => !SFX.has(n) && !SYNTH.has(n)).map(([n, w]) => `${n} (${w})`);
  assert.deepEqual(missing, [], '없는 효과음: ' + missing.join(', '));
});
test('test_audio_every_referenced_bgm_exists', () => {
  const missing = [...refs.bgm].filter(([n]) => !BGM.has(n)).map(([n, w]) => `${n} (${w})`);
  assert.deepEqual(missing, [], '없는 브금: ' + missing.join(', '));
});
test('test_audio_every_referenced_voice_exists_as_file_or_preset', () => {
  const missing = [...refs.voice].filter(([n]) => n !== 'none' && !VOICE.has(n) && !VOICE_PRESETS.has(n)).map(([n, w]) => `${n} (${w})`);   // 'none' = 블립 없음
  assert.deepEqual(missing, [], '없는 목소리: ' + missing.join(', '));
});
test('test_audio_loadSfxFiles_list_matches_files', () => {
  const main = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');
  const list = [...(main.match(/loadSfxFiles\(\[([^\]]*)\]/)?.[1] || '').matchAll(/'([a-z_0-9]+)'/g)].map((m) => m[1]);
  assert.ok(list.length > 10, 'loadSfxFiles 목록을 찾지 못함');
  const missing = list.filter((n) => !SFX.has(n) && !SYNTH.has(n)); assert.deepEqual(missing, [], '목록에 있지만 파일도 합성도 없음: ' + missing.join(', '));   // open/close/chime 은 합성 폴백
  const unused = [...SFX].filter((n) => !list.includes(n) && !/_(yt|prev|dr)$/.test(n) && !['battle_end', 'cancel', 'click', 'error', 'plug', 'rumble', 'white', 'whoosh', 'laugh_junhee'].includes(n));
  assert.deepEqual(unused, [], '파일은 있는데 로드 목록에 없음(무음이 됨): ' + unused.join(', '));
});
