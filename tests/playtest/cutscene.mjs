// 컷신 헤드리스 재생: node tests/playtest/cutscene.mjs <script명>   (서버 8765, CHROME_EXE 필요)
// 대사가 나올 때마다 C 로 넘기며 0.5초 간격 스크린샷을 tests/playtest/shots/cs_<name>_NN.png 로 남긴다.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const name = process.argv[2] || 'opening';
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
const logs = [];
page.on('console', (m) => { if (!/404/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto('http://127.0.0.1:8765/index.html');
await page.waitForTimeout(600);
// 타이틀 건너뛰고 필드에서 바로 실행
await page.evaluate((n) => { game.state = 'field'; game.title.phase = 'locked'; game.fade.alpha = 1; game.runScript(n); }, name);
let i = 0, idle = 0;
while (i < 80) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${S}/cs_${name}_${String(i).padStart(2, '0')}.png` });
  const st = await page.evaluate(() => ({ running: game.dialogue.running, box: game.textbox.state }));
  if (!st.running) { idle++; if (idle > 2) break; } else idle = 0;
  if (st.box === 'waiting' || st.box === 'choice') await page.keyboard.press('KeyC');
  i++;
}
logs.push('frames=' + i + ' flags=' + JSON.stringify(await page.evaluate(() => game.flags)) + ' map=' + await page.evaluate(() => game.mapId));
await browser.close();
console.log(logs.join('\n'));
