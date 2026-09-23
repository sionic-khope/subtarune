// 오디오 참조 감사 (이름에 숫자가 붙은 변형도 본다 — water_step2 같은 걸음 소리 변형, 2026-09-12): 코드·맵·컷신이 부르는 sfx/bgm/voice 이름이 실제 파일(assets/audio/*) 또는 합성 폴백(audio.js case)에 있어야 한다.
//   없는 이름은 조용히 무음이 되어 "효과음이 안 난다"로만 보인다 (2026-09-11 검증 보강).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { WATER_WALK } from '../../src/data/footsteps.js';
import { STORAGE_DANCE } from '../../src/data/storage-dance.js';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '../..');
const files = (dir) => new Set(fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.mp3')).map((f) => f.replace(/\.mp3$/, '')));
const SFX = files('assets/audio/sfx'), BGM = files('assets/audio/bgm'), VOICE = files('assets/audio/voices');
const audioSrc = fs.readFileSync(path.join(ROOT, 'src/core/audio.js'), 'utf8');
const SYNTH = new Set([...audioSrc.matchAll(/case '([a-z_0-9]+)':/g)].map((m) => m[1]));
const VOICE_PRESETS = new Set([...(audioSrc.match(/VOICES\s*=\s*\{([\s\S]*?)\n\};/)?.[1] || '').matchAll(/^\s*([a-z_0-9]+)\s*:/gm)].map((m) => m[1]));
const walk = (dir, out = []) => { for (const f of fs.readdirSync(path.join(ROOT, dir))) { const p = path.join(dir, f); if (fs.statSync(path.join(ROOT, p)).isDirectory()) walk(p, out); else if (/\.(js|json)$/.test(f)) out.push(p); } return out; };
const sources = [...walk('src'), ...walk('assets/maps').filter((p) => p.endsWith('.json'))];
const refs = { sfx: new Map(), bgm: new Map(), voice: new Map() };
const literalSfxLoads = source => [...source.matchAll(/\b(?:scheduleSfxPreload|loadSfxFiles)(?:\?\.)?\s*\(\s*\[([^\]]*)\]/g)]
  .flatMap(call => [...call[1].matchAll(/['"]([a-z_0-9]+)['"]/g)].map(name => name[1]));
const ARCHIVED_SFX = new Set(['naem_jet_engine', 'naem_jet_depart']);
const auditSfxLoads = (list, available, synth, archived = new Set()) => ({
  missing: [...list].filter(name => !available.has(name) && !synth.has(name)),
  unused: [...available].filter(name => !list.has(name) && !archived.has(name) && !/_(yt|prev|dr)$/.test(name)
    && !['battle_end', 'cancel', 'click', 'error', 'plug', 'rumble', 'white', 'whoosh', 'laugh_junhee'].includes(name)),
});
const sfxLoads = new Set();
const add = (kind, name, where) => { if (!refs[kind].has(name)) refs[kind].set(name, where); };
for (const p of sources) {
  const s = fs.readFileSync(path.join(ROOT, p), 'utf8');
  if (p.endsWith('.js')) for (const name of literalSfxLoads(s)) sfxLoads.add(name);
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
  assert.ok(sfxLoads.size > 10, 'loadSfxFiles 목록을 찾지 못함');
  const { missing, unused } = auditSfxLoads(sfxLoads, SFX, SYNTH, ARCHIVED_SFX);
  assert.deepEqual(missing, [], '목록에 있지만 파일도 합성도 없음: ' + missing.join(', '));
  assert.deepEqual(unused, [], '파일은 있는데 로드 목록에 없음(무음이 됨): ' + unused.join(', '));
});
test('test_audio_archived_jet_clips_are_preserved_documented_and_not_runtime_loaded', () => {
  const catalog = fs.readFileSync(path.join(ROOT, 'design/audio/references.md'), 'utf8');
  for (const name of ARCHIVED_SFX) {
    assert.ok(SFX.has(name), `보관 효과음이 없어짐: ${name}`);
    assert.ok(catalog.includes(name), `보관 효과음의 출처 기록 없음: ${name}`);
    assert.ok(!sfxLoads.has(name) && !refs.sfx.has(name), `폐기된 제트기 큐가 다시 등록됨: ${name}`);
  }
  assert.deepEqual(auditSfxLoads(new Set(['missing']), new Set(['archived', 'orphan']), new Set(), new Set(['archived'])), {
    missing: ['missing'], unused: ['orphan'],
  });
});
test('test_audio_scoped_load_lists_keep_missing_and_unused_asset_detection', () => {
  const list = new Set(literalSfxLoads(`
    game.scheduleSfxPreload(['boot']);
    game.sound.loadSfxFiles?.(['scoped', "missing"]);
    sound.loadSfxFiles([...dynamicNames, 'synth']);
    const unrelated = ['orphan'];
  `));
  assert.deepEqual([...list], ['boot', 'scoped', 'missing', 'synth']);
  assert.deepEqual(auditSfxLoads(list, new Set(['boot', 'scoped', 'orphan']), new Set(['synth'])), {
    missing: ['missing'], unused: ['orphan'],
  });
});
// 물걸음 루프(src/data/footsteps.js WATER_WALK): 루프·꼬리 wav 가 있고, 루프 구간이 파일 안에 있고, 걸음 시각표가 루프 구간 안에서 오름차순
const wavSeconds = (p) => { const b = fs.readFileSync(path.join(ROOT, p)); const rate = b.readUInt32LE(24), ch = b.readUInt16LE(22), bps = b.readUInt16LE(34); let i = 12; while (i < b.length - 8) { const id = b.toString('ascii', i, i + 4), n = b.readUInt32LE(i + 4); if (id === 'data') return n / (rate * ch * bps / 8); i += 8 + n + (n % 2); } return 0; };
test('test_audio_storage_dance_uses_the_exact_complete_seven_second_wav', () => {
  assert.equal(wavSeconds(STORAGE_DANCE.src), STORAGE_DANCE.duration);
  assert.equal(STORAGE_DANCE.duration, 7);
  assert.ok(STORAGE_DANCE.beats.every((beat, i) => beat > 0 && beat + STORAGE_DANCE.beatRelease < STORAGE_DANCE.duration && (!i || beat > STORAGE_DANCE.beats[i - 1])));
});
test('test_audio_water_walk_loop_assets_and_cut_table_are_consistent', () => {
  const d = WATER_WALK; const loopSec = wavSeconds(d.loop), tailSec = wavSeconds(d.tail);
  assert.ok(loopSec > 4 && tailSec > 0.5, '루프/꼬리 wav 길이: ' + [loopSec, tailSec]);
  assert.ok(d.loopStart >= 0 && d.loopStart < d.loopEnd && d.loopEnd <= loopSec + 1e-3, '루프 구간이 파일 밖: ' + [d.loopStart, d.loopEnd, loopSec]);
  assert.ok(d.onsets.length >= 20 && d.onsets.every((o, i) => o >= d.loopStart && o < d.loopEnd && (i === 0 || o - d.onsets[i - 1] > 0.05)), '시각표가 루프 밖이거나 겹침');
  assert.ok(d.cutBefore > 0 && d.cutBefore < 0.03 && d.volume > 0 && d.volume <= 1);
  const w = fs.readFileSync(path.join(ROOT, 'src/world/world.js'), 'utf8'); assert.ok(/sound\?\.walk\?\.\(/.test(w), 'Player 가 매 프레임 sound.walk 를 불러야 한다');
});
