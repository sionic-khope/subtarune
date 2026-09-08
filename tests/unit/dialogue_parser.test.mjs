import test from 'node:test';
import assert from 'node:assert/strict';
import { parseText } from '../../src/ui/dialogue.js';

test('plain Korean text → one token per char', () => {
  const t = parseText('안녕');
  assert.equal(t.length, 2);
  assert.deepEqual(t.map((x) => x.ch), ['안', '녕']);
});

test('speed / reset / wait tags', () => {
  const t = parseText('a{s=2}b{/s}c{w=0.5}d');
  assert.equal(t[0].speed, 1);
  assert.equal(t[1].speed, 2);
  assert.equal(t[2].speed, 1);
  assert.equal(t[3].wait, 0.5);
  assert.equal(t[3].ch, '');
  assert.equal(t[4].ch, 'd');
});

test('color / shake / wave scoping', () => {
  const t = parseText('{c=red}x{/c}y{shake}z{/shake}{wave}w{/wave}');
  assert.equal(t[0].color, '#ff4a5a');
  assert.equal(t[1].color, null);
  assert.equal(t[2].shake, true);
  assert.equal(t[3].shake, false);
  assert.equal(t[3].wave, true);
});

test('newline tag and emoji surrogate pairs', () => {
  const t = parseText('a{n}😀');
  assert.equal(t[1].ch, '\n');
  assert.equal(t[2].ch, '😀');
  assert.equal(t.length, 3);
});
