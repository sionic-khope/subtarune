// 컷신 헤드리스 재생: node tests/playtest/cutscene.mjs <script명>   (서버 8765, CHROME_EXE 필요)
// 대사가 나올 때마다 C 로 넘기며 0.5초 간격 스크린샷을 tests/playtest/shots/cs_<name>_NN.png 로 남긴다.
import { chromium } from 'playwright-core';
const QA_BASE = (process.env.QA_BASE_URL || 'http://localhost:8000/').replace(/\/?$/, '/');
import fs from 'node:fs';
const name = process.argv[2] || 'opening';
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
const logs = [];
page.on('console', (m) => { if (!/404/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(`${QA_BASE}index.html`);
// 부팅 완료(타이틀 입력 가능)까지 실제 상태로 기다린다 — 맵은 지연 적재라 고정 대기로는 부족
await page.waitForFunction(() => window.game?.state === 'title' && !game.bootLoad?.active, undefined, { timeout: 30000, polling: 100 });
// 타이틀 건너뛰고 필드에서 바로 실행. 타이틀엔 더 이상 맵이 없으므로 새 게임과 같은 방(room/bed)을 먼저 준비한다
await page.evaluate(async (n) => { await game.waitForMap('room', ['hyungsub']); game.resetState(); game.changeMap('room', 'bed', true, { bgm: false }); game.state = 'field'; game.title.phase = 'locked'; game.fade.alpha = 1; game.runScript(n); }, name);
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
console.log('fails=' + logs.filter((l) => /^\[(pageerror|error)\]|FAIL/.test(l)).length);
