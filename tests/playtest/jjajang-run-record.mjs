// 파란 토리이 러너 기믹 녹화(BUILD230): 토리이 직전에서 오른쪽으로 → 준비·대시·달리기·점프·베기·회전 → 끝까지를 영상(webm)으로 남긴다.
//   결과: $SHOT_DIR/video/*.webm  실행: tests/playtest/run.sh jjajang-run-record
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 960, height: 720 }, recordVideo: { dir: path.join(shots, 'video'), size: { width: 960, height: 720 } } });
const page = await context.newPage();
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
try {
  await page.goto('http://localhost:8000/?qa=jjajang_run_torii');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_run' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.evaluate(() => { const c = document.querySelector('canvas'); c.style.width = '960px'; c.style.height = '720px'; c.style.position = 'fixed'; c.style.left = '0'; c.style.top = '0'; document.body.style.margin = '0'; });
  await page.waitForTimeout(800);
  await page.keyboard.down('ArrowRight');
  check(await until(() => !!window.game.runner, 12000), '러너 시작');
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(1500);
  // 달리는 동안: 점프 → 공중 회전 베기 → 땅 베기 를 되풀이
  for (let i = 0; i < 6 && await page.evaluate(() => !!window.game.runner); i++) {
    await press('KeyX'); await page.waitForTimeout(230); await press('KeyC'); await page.waitForTimeout(900);
    await press('KeyC'); await page.waitForTimeout(700);
  }
  check(await until(() => !window.game.runner, 16000), '끝까지 달렸다');
  await page.waitForTimeout(1200);
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
await context.close(); await browser.close();
const videos = fs.existsSync(path.join(shots, 'video')) ? fs.readdirSync(path.join(shots, 'video')) : [];
check(videos.length > 0, '영상 파일 ' + JSON.stringify(videos));
console.log('fails=' + fails); process.exit(fails ? 1 : 0);
