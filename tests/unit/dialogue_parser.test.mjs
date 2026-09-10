import test from 'node:test';
import assert from 'node:assert/strict';
import { parseText, layout, choiceMove } from '../../src/ui/dialogue.js';

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

// 줄바꿈: 어느 줄도 폭을 넘지 않고, 한글도 단어 단위로 끊긴다 (2026-09-10 '대사 깨짐' 회귀 검사). 가짜 ctx: 글자마다 폭 10
const fakeCtx = { font: '', measureText: (ch) => ({ width: ch === ' ' ? 5 : 10 }) };
test('layout never exceeds maxWidth and wraps Korean at spaces', () => {
  const tokens = parseText('* 네? 수영할 수 있었으면 처음부터 제가 나오면 되지 않았냐구요?');
  const pages = layout(fakeCtx, tokens, 200);
  for (const page of pages) for (const line of page) {
    const w = line.reduce((a, t) => a + (t.w || 0), 0);
    assert.ok(w <= 200, `line too wide: ${w}`);
    const text = line.map((t) => t.ch).join('');
    assert.ok(!text.endsWith(' '), 'no trailing space');
  }
  const lines = pages.flat().map((l) => l.map((t) => t.ch).join(''));
  assert.ok(lines.every((l) => !/되$/.test(l)), `word split across lines: ${JSON.stringify(lines)}`);
});
test('layout splits an over-long single word by character (fallback)', () => {
  const pages = layout(fakeCtx, parseText('가나다라마바사아자차카타파하'), 50);
  for (const line of pages.flat()) assert.ok(line.reduce((a, t) => a + (t.w || 0), 0) <= 50);
  assert.ok(pages.flat().length >= 3);
});
// 선택지 격자 이동: 3개(2열 + 1) — ←→ 는 줄 안, ↑↓ 는 줄 사이, 한 줄이면 ↑↓ 도 옆으로
test('choiceMove navigates a 2-column grid in every direction', () => {
  assert.equal(choiceMove(0, 3, 'right'), 1);
  assert.equal(choiceMove(1, 3, 'right'), 0);
  assert.equal(choiceMove(0, 3, 'down'), 2);
  assert.equal(choiceMove(1, 3, 'down'), 2);
  assert.equal(choiceMove(2, 3, 'up'), 0);
  assert.equal(choiceMove(2, 3, 'right'), 2);
  assert.equal(choiceMove(2, 3, 'down'), 0);
  assert.equal(choiceMove(0, 2, 'down'), 1);
  assert.equal(choiceMove(1, 2, 'up'), 0);
  assert.equal(choiceMove(3, 4, 'up'), 1);
  assert.equal(choiceMove(0, 4, 'up'), 2);
});
