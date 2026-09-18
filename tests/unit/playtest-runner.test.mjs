import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyResult, selectScenarios, validateBaseUrl, validateScenarioUrls, harnessResultErrors, DEFAULT_BASE_URL } from '../playtest/lib/runner-utils.mjs';

test('test_runner_nonzero_exit_cannot_pass_with_zero_marker', () => {
  const result = classifyResult('PASS assertion\nfails=0\n', 2);
  assert.equal(result.passed, false);
  assert.deepEqual(result.reasons, ['child exit 2']);
});

test('test_runner_missing_marker_fails_closed', () => {
  const result = classifyResult('PASS assertion\n', 0);
  assert.equal(result.passed, false);
  assert.equal(result.reportedFails, null);
});

test('test_runner_harness_requires_completed_result_and_valid_checks', () => {
  for (const detail of [null, { status: 'running', fails: 0 }, { status: 'failed', fails: 1 }, { status: 'passed', fails: 0, checks: [] }, { status: 'passed', fails: 0, checks: [{ passed: false }] }]) {
    assert.ok(harnessResultErrors(detail).length);
  }
  assert.deepEqual(harnessResultErrors({ status: 'passed', fails: 0, checks: [{ passed: true }] }), []);
});

test('test_runner_failure_or_crash_cannot_be_hidden_by_later_marker', () => {
  for (const output of ['fails=3\nfails=0', 'FAIL assertion\nfails=0', 'CRASH exception\nfails=0']) {
    assert.equal(classifyResult(output, 0).passed, false, output);
  }
  assert.equal(classifyResult('fails=0', null, 'SIGKILL').passed, false);
  assert.equal(classifyResult('PASS assertion\nfails=0', 0).passed, true);
});

test('test_runner_selection_requires_explicit_known_names_or_all', () => {
  const names = ['battle_lose', 'battle_bgm'];
  for (const input of [[], ['../battle_lose'], ['battle_lose.mjs'], ['unknown'], ['--all', 'battle_lose']]) {
    assert.throws(() => selectScenarios(input, names));
  }
  assert.deepEqual(selectScenarios(['--all'], names).names, names);
  assert.deepEqual(selectScenarios(['battle_bgm', 'battle_bgm'], names).names, ['battle_bgm']);
  assert.equal(selectScenarios(['--help'], names).mode, '--help');
  assert.equal(selectScenarios(['--list'], names).mode, '--list');
});

test('test_runner_base_url_retains_worktree_directory', () => {
  const base = validateBaseUrl('http://127.0.0.1:8879/subtarune');
  assert.equal(base, 'http://127.0.0.1:8879/subtarune/');
  assert.equal(new URL('index.html', base).href, 'http://127.0.0.1:8879/subtarune/index.html');
  assert.equal(validateBaseUrl(), DEFAULT_BASE_URL);
  for (const input of ['relative', 'file:///tmp/', 'http://user:pass@localhost/', 'http://localhost/?qa=teal6', 'http://localhost/#fragment', 'http://localhost/index.html']) {
    assert.throws(() => validateBaseUrl(input), input);
  }
});

test('test_runner_legacy_cannot_target_a_different_server', () => {
  assert.doesNotThrow(() => validateScenarioUrls(['battle_lose', 'battle_bgm'], validateBaseUrl('http://127.0.0.1:8879')));
  assert.doesNotThrow(() => validateScenarioUrls(['battle'], DEFAULT_BASE_URL));
  assert.throws(() => validateScenarioUrls(['battle'], validateBaseUrl('http://127.0.0.1:8879')), /legacy/);
  assert.throws(() => validateScenarioUrls(['battle'], validateBaseUrl('http://127.0.0.1:8000')), /legacy/);
});
