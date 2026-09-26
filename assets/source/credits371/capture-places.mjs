// Capture in-game place screenshots for the credit illustration refs (read-only; dev server on :8000).
import { chromium } from 'playwright-core';
const exe = process.env.CHROME_EXE;
const base = process.env.BASE_URL || 'http://localhost:8000';
const out = process.env.OUT_DIR;
const targets = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: exe, headless: true });
for (const t of targets) {
  const [name, query] = t.split('=');
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  try {
    await page.goto(`${base}/index.html?${decodeURIComponent(query)}`);
    await page.waitForFunction(() => window.game?.player && game.entities, { timeout: 20000 });
    await page.waitForTimeout(3500);
    await (await page.$('canvas')).screenshot({ path: `${out}/${name}.png` });
    console.log('ok', name);
  } catch (e) { console.log('fail', name, e.message.split('\n')[0]); }
  await page.close();
}
await browser.close();
