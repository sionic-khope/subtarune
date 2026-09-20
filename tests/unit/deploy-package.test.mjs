// 배포 패키지(tools/deploy/package-site.sh, GitHub Pages)가 런타임이 실제로 부르는 미디어 확장자를 전부 담는지(BUILD271: .mp4 가 빠져 배포판 리듬 게임 노래 영상이 404 — 사용자 “리듬게임에 뒤에 영상하고 그런거 안나옴”)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '../..');
const script = fs.readFileSync(path.join(ROOT, 'tools/deploy/package-site.sh'), 'utf8');
const walk = (dir, out = []) => { for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory()) walk(p, out); else if (/\.js$/.test(f)) out.push(p); } return out; };

test('test_deploy_package_copies_every_media_extension_the_runtime_references_under_assets', () => {
  const used = new Set();
  for (const p of walk(path.join(ROOT, 'src'))) for (const m of fs.readFileSync(p, 'utf8').matchAll(/assets\/[\w./-]+\.(png|webp|gif|jpe?g|json|mp3|ogg|wav|mp4|webm|woff2?|ttf)\b/g)) used.add(m[1]);
  const listed = new Set([...script.matchAll(/-name '\*\.(\w+)'/g)].map(m => m[1]));
  const missing = [...used].filter(ext => !listed.has(ext));
  assert.deepEqual(missing, [], '런타임이 부르는데 패키지 목록에 없는 확장자: ' + missing.join(', '));
  assert.ok(listed.has('mp4') && listed.has('webm'), '노래 영상(mp4/webm)은 배포 패키지에 들어간다');
});

test('test_deploy_package_keeps_the_rhythm_song_videos_in_the_runtime_tree', () => {
  for (const f of ['akjil', 'bojipam', 'noamtori', 'gajaeman_cam']) assert.ok(fs.existsSync(path.join(ROOT, `assets/video/${f}.mp4`)), `assets/video/${f}.mp4`);
  assert.ok(!/-path assets\/video/.test(script), 'assets/video 는 prune 하지 않는다');
});
