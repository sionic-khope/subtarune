import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { validateBaseUrl } from './runner-utils.mjs';

export async function runScenario({ name, launchOptions = {} }, scenario) {
  const baseUrl = validateBaseUrl(process.env.QA_BASE_URL);
  const shotDir = process.env.SHOT_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'subtarune-shots-'));
  fs.mkdirSync(shotDir, { recursive: true });
  const resultFile = process.env.QA_RESULT_FILE || path.join(shotDir, 'result.json');
  const report = { name, baseUrl, startedAt: new Date().toISOString(), checks: [], pageErrors: [], fixtures: [], urls: [], screenshots: [], status: 'running' };
  const persist = () => fs.writeFileSync(resultFile, JSON.stringify(report, null, 2) + '\n');
  const check = (label, ok, extra = '') => {
    report.checks.push({ name: label, passed: Boolean(ok), extra });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label} ${extra}`);
  };
  let browser;
  let page;
  persist();
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, ...launchOptions, headless: true });
    page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
    page.on('pageerror', error => report.pageErrors.push(error.message));
    page.setDefaultTimeout(15000);
    await scenario({
      page,
      check,
      until: async (predicate, timeout = 5000) => {
        if (!Number.isFinite(timeout) || timeout <= 0) throw new Error('until requires a positive timeout in milliseconds');
        try {
          const handle = await page.waitForFunction(predicate, undefined, { timeout, polling: 80 });
          try { return await handle.jsonValue(); } finally { await handle.dispose(); }
        } catch (error) { if (error.name === 'TimeoutError') return null; throw error; }
      },
      press: (key, options) => page.keyboard.press(key, options),
      shot: async name => {
        if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name)) throw new Error('Screenshot name must be a simple filename without extension');
        const file = path.join(shotDir, `${name}.png`);
        await page.screenshot({ path: file });
        report.screenshots.push(file);
        return file;
      },
      open: async ({ qa, params = {} } = {}) => {
        const url = new URL('index.html', baseUrl);
        for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
        if (qa) {
          url.searchParams.set('qa', qa);
          report.fixtures.push({ name: `qa:${qa}`, description: 'QA shortcut prepares game state; this is not natural story progression.', status: 'requested' });
        }
        report.urls.push(url.href);
        persist();
        return page.goto(url.href);
      },
      fixture: async (name, description, prepare, arg) => {
        if (!name || !description || typeof prepare !== 'function') throw new Error('fixture requires a name, description, and browser preparation function');
        const entry = { name, description, status: 'started' };
        report.fixtures.push(entry);
        console.log(`FIXTURE ${name}: ${description}`);
        persist();
        const value = await page.evaluate(prepare, arg);
        entry.status = 'applied';
        persist();
        return value;
      },
    });
    if (!report.checks.length) check('scenario has at least one assertion', false);
  } catch (error) {
    console.error('CRASH', error.stack || error.message);
    check('scenario completed without exception', false, error.message);
  } finally {
    if (browser) {
      try { await browser.close(); }
      catch (error) { check('browser cleanup', false, error.message); }
    }
    check('no page errors', report.pageErrors.length === 0, JSON.stringify(report.pageErrors.slice(0, 3)));
    report.fails = report.checks.filter(result => !result.passed).length;
    report.status = report.fails ? 'failed' : 'passed';
    report.finishedAt = new Date().toISOString();
    persist();
    console.log(`fails=${report.fails}`);
    if (report.fails) process.exitCode = 1;
  }
  return report;
}
