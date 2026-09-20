// 벚꽃 숲 5 QA 직행 두 지점(BUILD275): 전투 직행 → 이긴 뒤 검은 화면 없이 승리 뒤 연출 / 승리 직후 QA → 바로 연출. 실행: tests/playtest/run.sh jjajang-sakura5-qa
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0; const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const st = () => page.evaluate(() => { const g = window.game; return { text: g.textbox.node?.text || null, speaker: g.textbox.node?.speaker || null, fade: g.fade?.alpha, bgm: g.sound.bgmName, battle: !!g.battle, px: Math.round(g.player.x), py: Math.round(g.player.y), dx: Math.round(g.entities.find(e => e.id === 'domijorim')?.x ?? -1), hx: Math.round(g.entities.find(e => e.id === 'dohyun')?.x ?? -1) }; });
const next = async () => { await until(() => window.game.textbox.state === 'waiting', 8000); await press('KeyC'); };
const advanceTo = async (needle, ms = 40000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await st(); if (s.text && s.text.includes(needle)) return s; if (s.text) await next(); await page.waitForTimeout(100); } return null; };
try {
  // ① 승리 직후 QA
  await page.goto('http://localhost:8000/?qa=jjajang_sakura5_after_battle');
  check(await until(() => window.game?.mapId === 'jjajang_sakura5' && !window.game.transitioning, 30000), '승리 직후 QA 진입');
  check(await until(() => window.game.dialogue.running, 8000), '연출이 바로 시작');
  let s = await st(); check(s.dx < s.px && s.hx > s.px, `둘이 일행 양옆 자리 ${JSON.stringify(s)}`);
  s = await advanceTo('나대 씨바'); check(!!s && s.speaker === '억빠맨', '억빠맨: 나대 씨바'); check((await st()).fade < 0.05, '검은 화면 아님');
  s = await advanceTo('허허 그럴까'); check(!!s, '끝까지 진행'); await next();
  check(await until(() => !window.game.dialogue.running && window.game.flags.sakura5_girls_left, 12000), '연출 끝·플래그');
  // ② 전투 직행 QA → 이기면 승리 뒤 연출로
  await page.goto('http://localhost:8000/?qa=jjajang_sakura5_battle');
  check(await until(() => window.game?.mapId === 'jjajang_sakura5' && !window.game.transitioning, 30000), '전투 직행 QA 진입');
  check(await until(() => !!window.game.battle && window.game.battle.enemies.length === 2, 15000), '전투 시작(진입 연출 뒤)');
  await until(() => window.game.battle?.enemies.every(e => e.img), 8000); await page.evaluate(() => { window.game.battle.shown = window.game.battle.text.length; }); await page.waitForTimeout(500); await press('KeyC');
  check(await until(() => window.game.battle?.state === 'menu', 8000), '메뉴');
  await page.evaluate(() => { for (const e of window.game.battle.enemies) e.hp = 1; });
  for (let i = 0; i < 3; i++) { await press('KeyC'); await page.waitForTimeout(160); const bs = await page.evaluate(() => window.game.battle?.state); if (bs === 'target') { await press('KeyC'); await page.waitForTimeout(160); } }
  check(await until(() => window.game.battle?.state === 'win', 15000), '이김');
  const wonSfx = await page.evaluate(() => window.game.sound._lastSfx || null);
  await page.evaluate(() => { window.game.battle.shown = window.game.battle.text.length; }); await page.waitForTimeout(800); await press('KeyC');
  let closed = await until(() => !window.game.battle, 8000); if (!closed) { await press('KeyC'); closed = await until(() => !window.game.battle, 8000); }
  check(closed, '전투 닫힘');
  check(await until(() => (window.game.fade?.alpha ?? 1) < 0.05 && window.game.dialogue.running, 8000), '검은 화면 없이 승리 뒤 연출로 이어짐');
  s = await advanceTo('나대 씨바'); check(!!s && s.speaker === '억빠맨', '전투 직행에서도 억빠맨: 나대 씨바');
  void wonSfx;
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
check(errors.length === 0, `페이지 오류 없음 ${errors.slice(0, 3).join(' | ')}`);
await browser.close(); console.log('fails=' + fails); process.exit(fails ? 1 : 0);
