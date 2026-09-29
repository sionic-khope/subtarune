import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SFX_FILES } from '../../src/data/sfx-files.js';

// BUILD426: 효과음 폴더의 모든 파일이 미리 받기 목록에 있어야 한다(빠진 것은 배포 사이트 첫 재생이 조용했다)
test('every sfx file is in the preload list and every listed name has a file', () => {
  const files = [...new Set(fs.readdirSync('assets/audio/sfx').filter(f => /\.(mp3|ogg)$/.test(f)).map(f => f.replace(/\.(mp3|ogg)$/, '')))]
    .filter(n => !n.startsWith('water_walk_')).sort();
  assert.deepEqual([...SFX_FILES].sort(), files);
});
