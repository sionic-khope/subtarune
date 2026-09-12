import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS } from '../../src/data/characters.js';

test('character images remain in published runtime asset directories', () => {
  const excluded = /^assets\/(source|references|library|lib)\//;
  for (const [id, character] of Object.entries(CHARACTERS)) {
    for (const path of [character.sheet, character.still].filter(Boolean)) {
      assert.equal(excluded.test(path), false, `${id} references an image excluded from Pages: ${path}`);
    }
  }
});
