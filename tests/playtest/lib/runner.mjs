import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { BASE_URL_SCENARIOS, selectScenarios, validateBaseUrl, validateScenarioUrls, classifyResult, harnessResultErrors } from './runner-utils.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const testDir = path.join(root, 'tests/playtest');
const usage = `Usage: tests/playtest/run.sh <name> [name ...] | --all | --list | --help
No arguments never launches the full suite. Names omit .mjs.
QA_BASE_URL      HTTP(S) serving directory (default http://localhost:8000/)
QA_ARTIFACT_DIR  Output parent (fallback SHOT_DIR, then tests/playtest/shots)
PW_DIR          Existing playwright-core cache (default ~/.cache/subtarune-pw)
CHROME_EXE      Chromium executable (otherwise discover the Playwright cache)
QA_TIMEOUT_MS   Per-scenario deadline (default 300000)
Each run gets a unique directory with summary.json and per-scenario logs/results/screenshots.
Only URL-aware scenarios listed by --list support an alternate QA_BASE_URL.
No dependency installation, server startup, or visible browser window is performed.`;

function git(...args) {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
}

function findChrome() {
  if (process.env.CHROME_EXE) return path.resolve(process.env.CHROME_EXE);
  const caches = [process.env.PLAYWRIGHT_BROWSERS_PATH, path.join(os.homedir(), 'Library/Caches/ms-playwright'), path.join(os.homedir(), '.cache/ms-playwright')].filter(Boolean);
  for (const cache of caches) {
    if (!fs.existsSync(cache)) continue;
    for (const version of fs.readdirSync(cache).filter(name => /^chromium(?:_headless_shell)?-\d+$/.test(name)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))) {
      for (const relative of ['chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', 'chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-headless-shell-mac-arm64/headless_shell', 'chrome-headless-shell-linux64/headless_shell']) {
        const candidate = path.join(cache, version, relative);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }
  throw new Error('CHROME_EXE not found. Set it to an existing Chromium executable. Nothing was installed.');
}

async function runChild(file, cwd, env, log, timeout) {
  const fd = fs.openSync(log, 'w');
  try {
    return await new Promise(resolve => {
      const grouped = process.platform !== 'win32';
      const child = spawn(process.execPath, [file], { cwd, env, stdio: ['ignore', fd, fd], detached: grouped });
      let error = null;
      let interrupted = false;
      let timedOut = false;
      let forceTimer;
      const kill = signal => {
        if (!child.pid) return;
        try { if (grouped) process.kill(-child.pid, signal); else child.kill(signal); }
        catch (failure) { if (failure.code !== 'ESRCH') error = failure.message; }
      };
      const terminate = () => {
        kill('SIGTERM');
        forceTimer ??= setTimeout(() => kill('SIGKILL'), 2000);
      };
      const stop = () => { interrupted = true; terminate(); };
      const timer = setTimeout(() => { timedOut = true; terminate(); }, timeout);
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
      child.once('error', value => { error = value.message; });
      child.once('close', (exitCode, signal) => {
        clearTimeout(timer);
        clearTimeout(forceTimer);
        if (grouped) kill('SIGKILL');
        process.removeListener('SIGINT', stop);
        process.removeListener('SIGTERM', stop);
        resolve({ exitCode, signal, error, interrupted, timedOut });
      });
    });
  } finally { fs.closeSync(fd); }
}

async function main() {
  const available = fs.readdirSync(testDir).filter(name => name.endsWith('.mjs')).map(name => name.slice(0, -4)).sort();
  const selection = selectScenarios(process.argv.slice(2), available);
  if (selection.mode === '--help') { console.log(usage); return; }
  if (selection.mode === '--list') {
    console.log(available.map(name => `${name}\t${BASE_URL_SCENARIOS.has(name) ? 'QA_BASE_URL' : 'legacy URL: inspect source'}`).join('\n'));
    return;
  }
  const baseUrl = validateBaseUrl(process.env.QA_BASE_URL);
  validateScenarioUrls(selection.names, baseUrl);
  const timeout = Number(process.env.QA_TIMEOUT_MS ?? 300000);
  if (!Number.isSafeInteger(timeout) || timeout <= 0 || timeout > 3600000) throw new Error('QA_TIMEOUT_MS must be a positive integer no greater than 3600000.');
  const pwDir = path.resolve(process.env.PW_DIR || path.join(os.homedir(), '.cache/subtarune-pw'));
  if (!fs.existsSync(path.join(pwDir, 'node_modules/playwright-core/package.json'))) {
    throw new Error(`Existing playwright-core cache unavailable: ${pwDir}. Set PW_DIR to an existing cache; nothing was installed.`);
  }
  const chrome = findChrome();
  fs.accessSync(chrome, fs.constants.X_OK);
  const hasHarness = selection.names.some(name => BASE_URL_SCENARIOS.has(name));
  if (hasHarness) {
    const probeUrl = new URL('index.html', baseUrl).href;
    const probe = await fetch(probeUrl, { signal: AbortSignal.timeout(10000) });
    if (!probe.ok) throw new Error(`Server preflight ${probe.status}: ${probeUrl}`);
    await probe.body?.cancel();
  }

  const artifactParent = path.resolve(process.env.QA_ARTIFACT_DIR || process.env.SHOT_DIR || path.join(testDir, 'shots'));
  fs.mkdirSync(artifactParent, { recursive: true });
  const artifactDir = fs.mkdtempSync(path.join(artifactParent, 'run-'));
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'subtarune-qa-'));
  const summary = { startedAt: new Date().toISOString(), cwd: root, invocationCwd: process.cwd(), sourceSha: git('rev-parse', 'HEAD'), sourceStatus: git('status', '--short'), requestedBaseUrl: baseUrl, preflight: hasHarness ? 'requested harness URL reachable' : 'not performed: legacy navigation URLs unknown', serverSource: 'not verified: HTTP reachability does not prove the server serves this cwd/SHA', artifactDir, tests: [] };
  const save = () => fs.writeFileSync(path.join(artifactDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  save();
  console.log(`Artifacts: ${artifactDir}`);
  try {
    fs.symlinkSync(path.join(pwDir, 'node_modules'), path.join(staging, 'node_modules'), 'dir');
    fs.cpSync(path.join(testDir, 'lib'), path.join(staging, 'lib'), { recursive: true });
    for (const name of selection.names) fs.copyFileSync(path.join(testDir, `${name}.mjs`), path.join(staging, `${name}.mjs`));
    for (const name of selection.names) {
      if (!BASE_URL_SCENARIOS.has(name)) console.log(`WARN ${name}: legacy navigation URL not verified; inspect source and log. QA_BASE_URL does not control this scenario.`);
      const outDir = path.join(artifactDir, name);
      const screenshots = path.join(outDir, 'screenshots');
      fs.mkdirSync(screenshots, { recursive: true });
      const log = path.join(outDir, 'output.log');
      const resultFile = path.join(outDir, 'result.json');
      const started = Date.now();
      const child = await runChild(`${name}.mjs`, staging, { ...process.env, CHROME_EXE: chrome, QA_BASE_URL: baseUrl, SHOT_DIR: screenshots, QA_RESULT_FILE: resultFile }, log, timeout);
      const result = classifyResult(fs.readFileSync(log, 'utf8'), child.exitCode, child.signal);
      if (child.interrupted) result.reasons.push('run interrupted');
      if (child.timedOut) result.reasons.push(`scenario timed out after ${timeout}ms`);
      if (child.error) result.reasons.push(child.error);
      let detail = null;
      if (fs.existsSync(resultFile)) {
        try { detail = JSON.parse(fs.readFileSync(resultFile, 'utf8')); }
        catch { result.passed = false; result.reasons.push('invalid scenario result.json'); }
      }
      if (BASE_URL_SCENARIOS.has(name)) result.reasons.push(...harnessResultErrors(detail));
      result.passed = result.reasons.length === 0;
      const record = { name, ...result, ...child, elapsedMs: Date.now() - started, log, screenshots, resultFile: detail ? resultFile : null, navigationDisclosure: BASE_URL_SCENARIOS.has(name) ? 'harness requested URLs recorded; server source not verified' : 'legacy actual navigation URLs unknown; inspect source and full log', fixtureDisclosure: detail ? 'recorded by harness' : 'legacy: not instrumented; inspect source and full log', fixtures: detail?.fixtures ?? null, urls: detail?.urls ?? null };
      summary.tests.push(record);
      save();
      console.log(`${record.passed ? 'PASS' : 'FAIL'} ${name}${record.reasons.length ? ': ' + record.reasons.join('; ') : ''} (${record.elapsedMs}ms) — ${log}`);
      if (child.interrupted) break;
    }
  } finally {
    summary.finishedAt = new Date().toISOString();
    summary.passed = summary.tests.length === selection.names.length && summary.tests.every(test => test.passed);
    save();
    fs.rmSync(staging, { recursive: true, force: true });
  }
  console.log(`=== total fails=${selection.names.length - summary.tests.filter(test => test.passed).length}`);
  process.exitCode = summary.passed ? 0 : 1;
}

main().catch(error => { console.error(`QA runner: ${error.message}`); process.exitCode = 2; });
