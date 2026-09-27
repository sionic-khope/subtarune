// 이어하기·QA 회귀(BUILD194): ① 이전 빌드에서 수로 끝 벽에 서 있던 세이브(지금은 문 자리) → 타이틀 C(이어하기) → 그 자리에서 문이 바로 넘긴다(youngcle15)
//   ② 타이틀 Q 목록에서 youngcle16 을 골라 C → youngcle16 이 뜬다. 타이틀 순서: 아무 키(인트로) → C(확대 건너뛰기, locked) → 3초 뒤 C. 실행: tests/playtest/run.sh continue-save
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const QA_BASE = (process.env.QA_BASE_URL || 'http://localhost:8000/').replace(/\/?$/, '/');
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'continue_' + n + '.png') }); };
const phase = () => page.evaluate(() => window.game.title?.phase);
const openTitle = async () => {
  await page.goto(`${QA_BASE}`);
  // 부팅 로딩 중엔 타이틀이 키를 안 받는다
  await page.waitForFunction(() => window.game && window.game.state === 'title' && !window.game.bootLoad?.active, null, { timeout: 25000 });
  await page.keyboard.press('KeyZ'); await page.waitForTimeout(300);
  for (let i = 0; i < 40 && (await phase()) !== 'locked'; i++) { await page.keyboard.press('KeyC'); await page.waitForTimeout(250); }
  await page.waitForTimeout(3300);
};
try {
  // ① 세이브를 문 자리(수로 끝, 이전 빌드의 벽 앞)로 옮겨 이어하기
  await page.goto(`${QA_BASE}?qa=lava_raft_top`);
  await page.waitForFunction(() => window.game && window.game.mapId === 'youngcle14' && !window.game.dialogue.running, null, { timeout: 25000 });
  await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('subtarune.save.v1')); d.x = 3428; d.y = 112; d.facing = 'right'; localStorage.setItem('subtarune.save.v1', JSON.stringify(d)); });
  await openTitle();
  const t = await page.evaluate(() => ({ state: window.game.state, hasSave: window.game.hasSave(), phase: window.game.title?.phase }));
  check(t.state === 'title' && t.hasSave && t.phase === 'locked', '타이틀(세이브 있음) ' + JSON.stringify(t));
  await page.keyboard.press('KeyC');
  await page.waitForFunction(() => window.game.state === 'field' && (window.game.mapId === 'youngcle15' || window.game.mapId === 'youngcle14'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForFunction(() => window.game.mapId === 'youngcle15' && !window.game.transitioning, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600); await cap('door_from_save');
  let s = await page.evaluate(() => ({ map: window.game.mapId, px: Math.round(window.game.player.x), state: window.game.state }));
  check(s.state === 'field' && s.map === 'youngcle15' && s.px < 120, '문 자리에서 이어하기 → 페이드가 끝나자마자 검사실 1 로 넘어간다 ' + JSON.stringify(s));
  // ② Q 목록 → youngcle16
  await openTitle();
  // QA 목록은 Shift+Q 만(사용자 2026-09-25, input.js)
  await page.keyboard.press('Shift+KeyQ'); await page.waitForTimeout(300);
  // 목록은 숨김을 뺀 QA_POINTS(title.js QA_MENU)
  const want = await page.evaluate(async () => { const m = await import('/src/core/story.js'); const menu = m.QA_POINTS.filter(p => !p.hidden); return { i: menu.findIndex(p => p.id === 'youngcle16'), n: menu.length, cur: window.game.title.qa?.i }; });
  check(want.cur != null && want.i >= 0, 'Shift+Q 로 QA 목록이 열린다 ' + JSON.stringify(want));
  { const key = want.i >= want.cur ? 'ArrowDown' : 'ArrowUp'; for (let i = 0; i < Math.abs(want.i - want.cur); i++) { await page.keyboard.press(key); await page.waitForTimeout(30); } }
  const sel = await page.evaluate(async () => { const m = await import('/src/core/story.js'); return m.QA_POINTS.filter(p => !p.hidden)[window.game.title.qa.i].id; });
  await cap('qa_list');
  await page.keyboard.press('KeyC');
  await page.waitForFunction(() => window.game.state === 'field' && window.game.mapId === 'youngcle16', null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800); await cap('qa_room2');
  s = await page.evaluate(() => ({ map: window.game.mapId, px: Math.round(window.game.player.x), state: window.game.state, dialogue: window.game.dialogue.running }));
  check(sel === 'youngcle16' && s.map === 'youngcle16' && s.state === 'field', 'Q 목록에서 youngcle16 → 검사실 2 ' + JSON.stringify([sel, s]));
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
