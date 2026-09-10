// 시스템 문자열 감사: src 가 쓰는 L.<key> 가 전부 src/data/locale/ko.js 에 있어야 한다 (없으면 화면에 'undefined').
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import L from '../../src/data/locale/ko.js';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '../..');
const walk = (dir, out = []) => { for (const f of fs.readdirSync(path.join(ROOT, dir))) { const p = path.join(dir, f); if (fs.statSync(path.join(ROOT, p)).isDirectory()) walk(p, out); else if (f.endsWith('.js')) out.push(p); } return out; };
test('test_locale_every_L_key_used_in_src_exists', () => {
  const missing = [];
  for (const p of walk('src')) {
    const s = fs.readFileSync(path.join(ROOT, p), 'utf8');
    if (!/locale\/ko\.js'/.test(s)) continue;                                   // L 을 import 한 파일만
    for (const m of s.matchAll(/\bL\.([A-Za-z_][A-Za-z0-9_]*)/g)) if (!(m[1] in L)) missing.push(`${p}: L.${m[1]}`);   // locale L 을 가리는 지역 변수는 두지 않는다(main.js 배경 레이어는 ly)
  }
  assert.deepEqual([...new Set(missing)], [], missing.join('\n'));
});
