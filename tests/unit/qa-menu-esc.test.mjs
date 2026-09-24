import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('test_qa_step_wraps_single_presses_and_clamps_repeat_and_page_jumps', async () => {
  const { qaStep } = await import('../../src/ui/qa-list.js');
  assert.equal(qaStep(0, 10, -1, true), 9);
  assert.equal(qaStep(9, 10, 1, true), 0);
  assert.equal(qaStep(9, 10, 1, false), 9, 'held repeat stops at the end');
  assert.equal(qaStep(3, 100, 24, false), 27, 'right = one page');
  assert.equal(qaStep(5, 100, -24, false), 0);
  assert.equal(qaStep(90, 100, 24, false), 99);
});

test('test_q_alone_does_not_open_qa_only_shift_q', () => {
  const src = fs.readFileSync('src/core/input.js', 'utf8');
  assert.match(src, /\(action === 'qa' \|\| action === 'test'\) && !e\.shiftKey\) return;/);
});

test('test_escape_opens_confirm_instead_of_title_and_strings_live_in_locale', async () => {
  const main = fs.readFileSync('src/main.js', 'utf8');
  assert.match(main, /Input\.just\('title'\)[^\n]*this\.escConfirm = \{ i: 1 \}/, 'Esc opens the confirm with 아니요 selected');
  assert.doesNotMatch(main, /Input\.just\('title'\)[^\n]*\{ this\.toTitle\(\); return; \}/);
  const { default: L } = await import('../../src/data/locale/ko.js');
  assert.equal(L.boot_loading, '섭타룬을 로딩하고있습니다.');
  assert.deepEqual([L.esc_confirm_yes, L.esc_confirm_no], ['예', '아니요']);
});
