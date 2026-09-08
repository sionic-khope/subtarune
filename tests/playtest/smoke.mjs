// 헤드리스 스모크: 부팅→인트로→상인 대화/선택지→메뉴→집→상자. 스크린샷을 tests/playtest/shots/ 에 남긴다.
// 실행: npm i -D playwright-core && (python3 -m http.server 8765 &) && CHROME_EXE=... node tests/playtest/smoke.mjs
import { chromium } from 'playwright-core';

import fs from 'node:fs';
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
const exe = process.env.CHROME_EXE; // 예: ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto('http://127.0.0.1:8765/index.html?map=test');
await page.waitForTimeout(1500);
const shot = async (n) => page.screenshot({ path: `${S}/${n}.png` });
await shot('01_boot');
await page.keyboard.press('KeyX');           // 아무 키 → 인트로
await page.waitForTimeout(3200);             // 로고 박힘 대기
await page.evaluate(() => { game.flags.opening_seen = true; });  // 스모크는 오프닝 컷신 생략
await page.keyboard.press('KeyC');           // 시작 (페이드 1.1s)
await page.waitForTimeout(1500);
await shot('02_field');
// 위로 한 칸: 인트로 트리거
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(260); await page.keyboard.up('ArrowUp');
await page.waitForTimeout(900);
await shot('03_intro_typing');
await page.keyboard.press('KeyX');            // 전부 표시
await page.waitForTimeout(200);
await shot('04_intro_full');
for (let i = 0; i < 3; i++) { await page.keyboard.press('KeyC'); await page.waitForTimeout(150); await page.keyboard.press('KeyX'); await page.waitForTimeout(150); }
await page.keyboard.press('KeyC');
await page.waitForTimeout(300);
await shot('05_after_intro');
// 상인에게 이동: 상인 (14,7) 근처. 플레이어 (11,8)쯤. 오른쪽으로 이동
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.up('ArrowRight');
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(150); await page.keyboard.up('ArrowUp');
await page.waitForTimeout(200);
const st = await page.evaluate(() => ({ p: [game.player.x, game.player.y], m: game.entities.find(e=>e.id==='merchant') && [game.entities.find(e=>e.id==='merchant').x, game.entities.find(e=>e.id==='merchant').y], probe: !!game.player.probe() }));
logs.push('state ' + JSON.stringify(st));
await shot('06_near_merchant');
// 상인 말 걸기 (프로브 안 되면 evaluate로 직접)
await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
if (!(await page.evaluate(() => game.dialogue.running))) { await page.evaluate(() => game.runScript('merchant')); await page.waitForTimeout(300); }
await page.keyboard.press('KeyX'); await page.waitForTimeout(150); await shot('07_merchant_portrait');
await page.keyboard.press('KeyC'); await page.waitForTimeout(150); await page.keyboard.press('KeyX'); await page.waitForTimeout(150);
await page.keyboard.press('KeyC'); await page.waitForTimeout(150); await page.keyboard.press('KeyX'); await page.waitForTimeout(300);
await shot('08_choice');
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150); await shot('09_choice_moved');
await page.keyboard.press('KeyC'); await page.waitForTimeout(150); await page.keyboard.press('KeyX'); await page.waitForTimeout(200);
await shot('10_choice_result');
await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
// 메뉴
await page.keyboard.press('KeyV'); await page.waitForTimeout(200); await shot('11_menu');
await page.keyboard.press('ArrowDown'); await page.keyboard.press('KeyC'); await page.waitForTimeout(200); await shot('12_settings');
await page.keyboard.press('KeyX'); await page.keyboard.press('KeyX'); await page.waitForTimeout(200);
// 집으로 워프 (evaluate) → 상자 → 유령
await page.evaluate(() => game.changeMap('house', 'entrance'));
await page.waitForTimeout(900);
await shot('13_house');
await page.evaluate(() => { const c = game.entities.find(e => e.def.type === 'chest'); if (c) c.interact(game.player); });
await page.waitForTimeout(300); await page.keyboard.press('KeyX'); await page.waitForTimeout(200); await shot('14_chest');
await page.keyboard.press('KeyC'); await page.waitForTimeout(150); await page.keyboard.press('KeyX'); await page.waitForTimeout(150); await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
await page.keyboard.press('F1'); await page.waitForTimeout(100); await shot('15_debug');
logs.push('flags ' + JSON.stringify(await page.evaluate(() => ({ flags: game.flags, inv: game.inventory, map: game.mapId }))));
fs.writeFileSync(`${S}/console.txt`, logs.join('\n'));
await browser.close();
console.log(logs.join('\n'));
