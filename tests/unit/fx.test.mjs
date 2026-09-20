// 이펙트 애니 감사 (2026-09-12): 컷신 { boom: { sheet, cols, rows, count } } 가 가리키는 프레임 띠가 실제로 있고 칸 수가 그림과 맞는지.
//   빠지면 게임에선 소리만 나고 아무것도 안 보인다(조용히 넘어가므로 눈으로만 봐선 늦게 안다) — 여기서 잡는다.
//   프레임 띠 만들기: /usr/bin/python3 tools/art/video_to_strip.py <영상> --out assets/fx/<이름>.png
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FX, FX_SHEETS } from '../../src/data/fx.js';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '../..');
const walk = (dir, out = []) => { for (const f of fs.readdirSync(path.join(ROOT, dir))) { const p = path.join(dir, f); if (fs.statSync(path.join(ROOT, p)).isDirectory()) walk(p, out); else if (/\.(js|json)$/.test(f)) out.push(p); } return out; };
const png = (p) => { const b = fs.readFileSync(path.join(ROOT, p)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const num = (body, key) => { const m = body.match(new RegExp(`\\b${key}\\s*:\\s*(\\d+)`)); return m ? Number(m[1]) : null; };

const booms = [];
for (const p of [...walk('src/data'), ...walk('assets/maps')]) {
  const s = fs.readFileSync(path.join(ROOT, p), 'utf8');
  for (const m of s.matchAll(/boom:\s*\{([^{}]*)\}/g)) {
    const body = m[1], sheet = body.match(/sheet:\s*'([^']+)'/)?.[1];
    if (sheet) booms.push({ where: p, sheet, cols: num(body, 'cols'), rows: num(body, 'rows'), count: num(body, 'count') });
  }
}

test('test_fx_registry_sheets_and_sounds_exist_and_match_the_image', () => {
  const sfxDir = new Set(fs.readdirSync(path.join(ROOT, 'assets/audio/sfx')).map((f) => f.replace(/\.mp3$/, '')));
  const loaded = [...(fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8').match(/scheduleSfxPreload\(\[([^\]]*)\]/)?.[1] || '').matchAll(/'([a-z_0-9]+)'/g)].map((m) => m[1]);
  for (const [name, f] of Object.entries(FX)) {
    assert.ok(fs.existsSync(path.join(ROOT, f.sheet)), `FX.${name}: 띠 파일이 없다 ${f.sheet} — tools/art/video_to_strip.py 로 만든다`);
    const { w, h } = png(f.sheet);
    assert.equal(w % f.cols, 0, `FX.${name}: 가로 ${w} 가 cols ${f.cols} 로 안 나눠떨어진다`);
    assert.equal(h % (f.rows ?? 1), 0, `FX.${name}: 세로 ${h} 가 rows ${f.rows} 로 안 나눠떨어진다`);
    assert.ok(f.count <= f.cols * (f.rows ?? 1), `FX.${name}: count ${f.count} 가 칸 수보다 많다`);
    assert.ok(f.fps > 0, `FX.${name}: fps 가 없다`);
    if (f.sfx) { assert.ok(sfxDir.has(f.sfx), `FX.${name}: 소리 파일 sfx/${f.sfx}.mp3 가 없다`); assert.ok(loaded.includes(f.sfx), `FX.${name}: '${f.sfx}' 가 main.js loadSfxFiles 목록에 없다(무음이 된다)`); }
  }
  assert.deepEqual(FX_SHEETS, Object.values(FX).map((f) => f.sheet));
});
test('test_fx_every_boom_sheet_file_exists', () => {
  const missing = booms.filter((b) => !fs.existsSync(path.join(ROOT, b.sheet))).map((b) => `${b.sheet} (${b.where})`);
  assert.deepEqual(missing, [], '없는 이펙트 띠 — tools/art/video_to_strip.py 로 만든다: ' + missing.join(', '));
});
test('test_fx_boom_frame_counts_fit_the_strip', () => {
  for (const b of booms) {
    if (!fs.existsSync(path.join(ROOT, b.sheet))) continue;
    const { w, h } = png(b.sheet), cols = b.cols ?? 1, rows = b.rows ?? 1;
    assert.equal(w % cols, 0, `${b.sheet}: 가로 ${w} 가 cols ${cols} 로 나눠떨어지지 않는다 (${b.where})`);
    assert.equal(h % rows, 0, `${b.sheet}: 세로 ${h} 가 rows ${rows} 로 나눠떨어지지 않는다 (${b.where})`);
    assert.ok((b.count ?? cols * rows) <= cols * rows, `${b.sheet}: count ${b.count} 가 칸 수 ${cols * rows} 보다 많다 (${b.where})`);
  }
});
