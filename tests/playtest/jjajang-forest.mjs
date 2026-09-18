// 짜장숲(BUILD225 사용자 “초록숲0 맵 브금을 쓰며 짜장맵 타일이 가운데로 이어져서 세로로 살짝 긴 맵”): 해안 위 그림자 입구를 걸어 올라가면 짜장숲으로 넘어가고(브금 wind),
//   숲 아래 가장자리로 내려오면 해안 위(forest_top)로 돌아온다. 실행: tests/playtest/run.sh jjajang-forest
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'forest_' + n + '.png') }); };
const st = () => page.evaluate(() => { const g = window.game; return { map: g.mapId, px: Math.round(g.player.x), py: Math.round(g.player.y), bgm: g.sound.bgmName, dialogue: g.dialogue.running, party: g.party?.length ?? -1 }; });
const walk = async (key, until, ms) => { await page.keyboard.down(key); const ok = await page.waitForFunction(until, null, { timeout: ms }).then(() => true).catch(() => false); await page.keyboard.up(key); return ok; };
try {
  await page.goto('http://localhost:8000/?qa=jjajang_shore');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_shore' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const g = window.game; g.player.x = 312; g.player.y = 12 * 32; g.player.facing = 'up'; });
  await page.waitForTimeout(300); await cap('01_shore_path');
  const crossed = await walk('ArrowUp', () => window.game.mapId === 'jjajang_forest', 12000);
  await page.waitForTimeout(900); let s = await st(); await cap('02_forest_arrive');
  check(crossed && s.map === 'jjajang_forest' && s.party === 0, '해안 위 그림자 입구를 올라가면 짜장숲으로(단독) ' + JSON.stringify(s));
  check(s.bgm === 'wind', '짜장숲 브금은 초록숲0(옵젝영역0)의 wind ' + JSON.stringify(s.bgm));
  const up = await walk('ArrowUp', () => window.game.player.y < 3 * 32, 20000);
  s = await st(); await cap('03_forest_top');
  check(up && s.map === 'jjajang_forest', '길을 따라 위 가장자리까지 걸어 올라갈 수 있다(다음 맵 없음) ' + JSON.stringify([s.px, s.py]));
  const back = await walk('ArrowDown', () => window.game.mapId === 'jjajang_shore', 30000);
  await page.waitForTimeout(700); s = await st(); await cap('04_back_to_shore');
  check(back && s.map === 'jjajang_shore' && s.py >= 216 && s.py < 11 * 32, '아래 가장자리로 내려가면 해안 그림자 아래(forest_top)로 돌아온다 ' + JSON.stringify(s));
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
