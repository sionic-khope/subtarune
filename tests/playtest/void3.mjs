// 보라맵3 뗏목 퍼즐 검증: ?qa=void3 → 표지판 → 뗏목1(A→B) → 아래(막다른길 D, 표지판) → 되돌아 B → 오른쪽(막다른길 G) → 되돌아 → 위(C) → 오른쪽(F) → 아래(E) → 문.
// 첨벙 소리 횟수, 뗏목 속도(+50%), 보라맵 문 무음, void2 표지판.
// 실행: CHROME_EXE=... node tests/playtest/void3.mjs   (서버 8000)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0;
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const st = () => page.evaluate(() => ({ map: game.mapId, ride: !!game.ride, p: [Math.round(game.player.x), Math.round(game.player.y)], facing: game.player.facing, running: game.dialogue.running, text: game.textbox.node?.text || '', sfx: window.__sfx || [] }));
const finish = async () => { for (let i = 0; i < 12; i++) { await page.waitForTimeout(200); const s = await page.evaluate(() => ({ running: game.dialogue.running, box: game.textbox.state })); if (!s.running) break; if (s.box !== 'closed') await page.keyboard.press('KeyC'); } };
const hookSfx = () => page.evaluate(() => { window.__sfx = []; const s = game.sound; const o = s.sfx.bind(s); s.sfx = (n, opt) => { window.__sfx.push(n); return o(n, opt); }; });
const stand = (x, y, f) => page.evaluate(([x, y, f]) => { game.player.x = x; game.player.y = y; game.player.facing = f; game.camera.snap(); }, [x, y, f]);
const readSign = async (x, y, f) => { await stand(x, y, f); await page.waitForTimeout(120); await page.keyboard.press('KeyC'); await page.waitForTimeout(300); const t = (await st()).text; await finish(); return t; };
const ride = async (x, y, f, label) => {
  await stand(x, y, f); await page.waitForTimeout(120);
  const before = (await st()).sfx.length;
  const t0 = Date.now(); await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
  let s = await st(); check(`${label}: boards`, s.ride, JSON.stringify(s.p));
  while (Date.now() - t0 < 12000 && (await st()).ride) await page.waitForTimeout(80);
  s = await st(); const dur = (Date.now() - t0) / 1000; const splashes = s.sfx.slice(before).filter((n) => n === 'splash').length;
  return { s, dur, splashes };
};

// void2 표지판 + 문 무음 + 속도
await page.goto('http://127.0.0.1:8000/index.html?qa=raft'); await page.waitForTimeout(1000); await hookSfx();
await page.evaluate(() => { game.fade.color = '255,255,255'; });   // 직전 컷신이 흰 페이드를 남긴 상황 재현
let t = await readSign(48, 136, 'up'); check('void2 sign text', t.includes('앞으로만 가는 땟목'), t);
let r = await ride(100, 112, 'right', 'void2 raft');
check('void2 ride ~2.7s (+50%)', r.dur > 2.0 && r.dur < 3.6, r.dur.toFixed(2) + 's');
check('splash while moving (board + periodic + arrive)', r.splashes >= 3, String(r.splashes));   // 1.1s 간격: 탈 때 + 2회 + 내릴 때
check('no door sfx on raft', !r.s.sfx.includes('door'));
await stand(700, 140, 'right'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(600); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(900);
check('door transition fades black (not white)', await page.evaluate(() => game.fade.color === '0,0,0'), await page.evaluate(() => game.fade.color));
let s = await st(); check('void2 right door → void3, silent', s.map === 'void3' && !s.sfx.includes('door'), JSON.stringify({ map: s.map, sfx: s.sfx.filter((n) => n === 'door').length }));
await page.screenshot({ path: `${S}/void3_01_enter.png` });

// void3 퍼즐
await hookSfx();
t = await readSign(108, 420, 'up'); check('sign A', t.includes('갈리는'), t);
r = await ride(132, 430, 'right', 'raft1 A→B'); check('arrive B', r.s.p[0] >= 384 && r.s.p[0] < 512, JSON.stringify(r.s.p));
r = await ride(440, 520, 'down', 'raft3 B→D'); check('arrive D (dead end)', r.s.p[1] >= 672, JSON.stringify(r.s.p));
t = await readSign(470, 700, 'up'); check('sign D', t.includes('막다른'), t);
await page.screenshot({ path: `${S}/void3_02_deadend.png` });
r = await ride(440, 660, 'up', 'raft3 D→B (back)'); check('back on B', r.s.p[1] < 548 && r.s.p[1] > 320, JSON.stringify(r.s.p));
r = await ride(484, 430, 'right', 'raft6 B→G'); check('arrive G', r.s.p[0] >= 768, JSON.stringify(r.s.p));
t = await readSign(844, 452, 'up'); check('sign G', t.includes('찾았노'), t);
// G 오른쪽 끝 = 화면 끝까지 이어진 땅 → 문 없이 void4 로
await stand(1000, 440, 'right'); await page.screenshot({ path: `${S}/void3_04_exit.png` });
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1200); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(900);
s = await st(); check('G right edge → void4 (no door)', s.map === 'void4', JSON.stringify({ map: s.map, p: s.p }));
await page.evaluate(() => game.changeMap('void3', 'door_back', true)); await page.waitForTimeout(300);
s = await st(); check('back from void4 lands on G', s.map === 'void3' && s.p[0] === 1060 && s.p[1] === 440, JSON.stringify(s.p));
// 위 경로는 막다른길: G→B→C→F→E(표지판)
r = await ride(770, 430, 'left', 'raft6 G→B (back)'); check('back on B (2)', r.s.p[0] < 512 && r.s.p[0] >= 384, JSON.stringify(r.s.p));
r = await ride(440, 330, 'up', 'raft2 B→C'); check('arrive C', r.s.p[1] < 128, JSON.stringify(r.s.p));
await page.screenshot({ path: `${S}/void3_03_top.png` });
r = await ride(484, 60, 'right', 'raft4 C→F'); check('arrive F', r.s.p[0] >= 896, JSON.stringify(r.s.p));
r = await ride(940, 144, 'down', 'raft5 F→E'); check('arrive E (dead end)', r.s.p[1] >= 320 && r.s.p[1] < 384, JSON.stringify(r.s.p));
t = await readSign(1048, 352, 'up'); check('sign E dead end', t.includes('막다른'), t);
await page.evaluate(() => game.changeMap('void3', 'from_void2', true)); await page.waitForTimeout(300);
// 뒤로: void3 왼쪽 문 → void2 오른쪽 착지 (핑퐁 없음)
await stand(76, 430, 'left'); await page.waitForTimeout(700); await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(600); await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(900);
s = await st(); check('void3 left door → void2 dock_back', s.map === 'void2' && s.p[0] > 600, JSON.stringify({ map: s.map, p: s.p }));
await page.waitForTimeout(800); check('no ping-pong', (await st()).map === 'void2');
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
