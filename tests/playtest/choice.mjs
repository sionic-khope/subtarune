// 선택지 연출 검증: stagger(하나씩 천천히) / locked+auto(고를 수 없고 대사가 끊고 들어옴).
// 실행: CHROME_EXE=... node tests/playtest/choice.mjs   (서버 8000)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0;
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const st = () => page.evaluate(() => ({ running: game.dialogue.running, box: game.textbox.state, shown: game.textbox.choiceShown, text: game.textbox.node?.text || '' }));
await page.goto('http://127.0.0.1:8000/index.html?map=test&spawn=start'); await page.waitForTimeout(1000);

// ── 1) stagger: 항목이 1 → 2 → 3 으로 늘어나고, 다 뜬 뒤에야 고를 수 있다 ──
await page.evaluate(() => game.runScript('test_choice_slow'));
await page.waitForTimeout(200); await page.keyboard.press('KeyC');   // 타이핑 즉시 표시 → choice(delay 0.6)
await page.waitForTimeout(300); let s = await st(); check('slow: delay 동안 항목 0개', s.box === 'choice' && s.shown === 0, JSON.stringify(s));
await page.waitForTimeout(500); s = await st(); check('slow: 첫 항목만', s.shown === 1, 'shown=' + s.shown);
await page.keyboard.press('KeyC'); await page.waitForTimeout(150); s = await st(); check('slow: 다 뜨기 전 C 무시', s.box === 'choice', s.box);
await page.waitForTimeout(600); s = await st(); check('slow: 둘째 항목', s.shown === 2, 'shown=' + s.shown);
await page.waitForTimeout(700); s = await st(); check('slow: 셋째 항목', s.shown === 3, 'shown=' + s.shown);
await page.screenshot({ path: `${S}/choice_slow.png` });
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100); await page.keyboard.press('KeyC'); await page.waitForTimeout(300);   // 2열 격자: 둘째는 오른쪽
s = await st(); check('slow: 둘 선택 → 둘을 골랐다', s.text.includes('둘을 골랐다'), s.text);
// 격자 이동: 셋째(아랫줄)는 ↓, 거기서 ↑ 는 첫째, → 는 제자리
await page.keyboard.press('KeyC'); await page.waitForTimeout(400); await page.keyboard.press('KeyC'); await page.waitForTimeout(400);

// ── 2) locked+auto: 선택지가 다 뜨지만 C/X 로 못 고르고, 1.2초 뒤 대사가 끊고 들어온다 ──
await page.evaluate(() => game.runScript('test_choice_locked'));
await page.waitForTimeout(200); await page.keyboard.press('KeyC');
await page.waitForTimeout(1700);   // delay 0.5 + stagger 0.5×2 = 1.5 → 다 뜸
s = await st(); check('locked: 3개 다 뜸', s.box === 'choice' && s.shown === 3, JSON.stringify(s));
await page.screenshot({ path: `${S}/choice_locked.png` });
for (let i = 0; i < 4; i++) { await page.keyboard.press('KeyC'); await page.keyboard.press('KeyX'); await page.waitForTimeout(80); }
s = await st(); check('locked: C/X 눌러도 못 고름', s.box === 'choice' && s.text.includes('뭘 먹을까'), JSON.stringify(s));
await page.waitForTimeout(1200);
s = await st(); check('locked: auto 로 "아니야" 대사가 끊고 들어옴', s.running && s.text.includes('아니야'), s.text);
await page.screenshot({ path: `${S}/choice_locked_after.png` });
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
