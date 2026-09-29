// 트레일러 직접 그리는 구간을 30fps PNG 로 뽑는다(BUILD408). node tools/trailer/render.mjs <out_dir> <from> <to>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.join(process.env.PW_DIR || `${process.env.HOME}/.cache/subtarune-pw`, 'node_modules/'));
const { chromium } = require('playwright-core');
const [out, from, to] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4])];
const FPS = 30;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto(new URL('tools/trailer/index.html', process.env.QA_BASE_URL || 'http://localhost:8000/').href);
await page.waitForFunction(() => window.trailerReady, null, { timeout: 60000 });
const n0 = Math.round(from * FPS), n1 = Math.round(to * FPS);
for (let n = n0; n < n1; n++) {
  const b64 = await page.evaluate(t => { window.renderAt(t); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, n / FPS);
  fs.writeFileSync(path.join(out, `${String(n - n0).padStart(5, '0')}.png`), Buffer.from(b64, 'base64'));
}
console.log(`frames ${n1 - n0} → ${out}`);
await browser.close();
