// 방송 컷신(pc_stream) 검증: cord_found 상태로 컴퓨터 C → 채팅창(100명, 모드 전환) → 오류창 → 딸깍 → 정적 → 소용돌이 → 흰색 → void 맵(누움 → 일어남), stage void_fallen.
// 실행: CHROME_EXE=... node tests/playtest/stream.mjs   (서버 8000)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0;
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const snap = () => page.evaluate(() => ({ map: game.mapId, stage: game.story.stage, running: game.dialogue.running, box: game.textbox.state, text: (game.textbox.node?.text || '').slice(0, 30), chat: game.chat.open, mode: game.chat.mode, msgs: game.chat.msgs.length, posted: game.chat.posted, dialog: game.sysdialog.visible, pressed: game.sysdialog.pressed > 0, vortex: game.vortex.active, vr: Math.round(game.vortex.r), curtain: game.curtain, fade: +game.fade.alpha.toFixed(2), pose: game.player?.pose, bgm: game.sound.bgmName }));

await page.goto('http://127.0.0.1:8000/index.html?stage=cord_found'); await page.waitForTimeout(1000);
for (let i = 0; i < 12; i++) { const s = await snap(); if (!s.running) break; if (s.box !== 'closed') await page.keyboard.press('KeyC'); await page.waitForTimeout(220); }
await page.evaluate(() => game.changeMap('room', 'door', true)); await page.waitForTimeout(300);
await page.evaluate(() => { game.player.x = 70; game.player.y = 132; game.player.facing = 'up'; game.camera.snap(); }); await page.waitForTimeout(120);
await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
check('nick list has required names', await page.evaluate(() => { const need = ['야코혁', 'oneq123', '억빠맨', '축복맨', '다이아캣', '나쁘고오만하게살기', '장아문', '쥰희', '박용준', '따뜻한비데', '영상클립']; return need.every((n) => game.chat.nicks.includes(n)) && game.chat.nicks.length === 100; }));

// 대사를 넘기며 이벤트 기록
const seen = { chatLate: 0, chatSpam: 0, chatQuestion: 0, chatSilence: 0, chatPanic: 0, dialog: false, pressed: false, bgmOff: false, vortexMax: 0, curtainWhite: false, shots: new Set() };
const shot = async (n) => { if (!seen.shots.has(n)) { seen.shots.add(n); await page.screenshot({ path: `${S}/stream_${n}.png` }); } };
let s; const t0 = Date.now();
while (Date.now() - t0 < 120000) {
  s = await snap();
  if (s.chat && s.mode === 'late' && s.msgs > 5) { seen.chatLate = Math.max(seen.chatLate, s.msgs); await shot('01_chat_late'); }
  if (s.mode === 'spam' && s.msgs > 10) { seen.chatSpam = s.posted; await shot('02_chat_spam'); }
  if (s.mode === 'question') seen.chatQuestion = s.posted;
  if (s.dialog) { seen.dialog = true; await shot('03_error_dialog'); }
  if (s.pressed) seen.pressed = true;
  if (s.mode === 'silence') { seen.chatSilence = s.posted; if (!s.bgm) seen.bgmOff = true; }
  if (s.mode === 'panic') { seen.chatPanic = s.posted; }
  if (s.vortex) { seen.vortexMax = Math.max(seen.vortexMax, s.vr); if (s.vr > 60 && s.vr < 200) await shot('04_vortex_small'); if (s.vr > 300) await shot('05_vortex_big'); }
  if (s.curtain === 'white') seen.curtainWhite = true;
  if (s.map === 'void' && s.pose === 'lying' && s.fade < 0.5) await shot('06_void_lying');
  if (!s.running && s.map === 'void') break;
  if (s.box === 'waiting' || s.box === 'choice') await page.keyboard.press('KeyC');
  await page.waitForTimeout(160);
}
s = await snap();
check('chat late mode streamed', seen.chatLate > 5, String(seen.chatLate));
check('chat spam mode', seen.chatSpam > 0);
check('chat question mode', seen.chatQuestion > 0);
check('error dialog shown', seen.dialog);
check('button pressed', seen.pressed);
check('silence: bgm off + ? spam', seen.chatSilence > 0 && seen.bgmOff, JSON.stringify({ silence: seen.chatSilence, bgmOff: seen.bgmOff }));
check('panic mode', seen.chatPanic > 0);
check('vortex grew large', seen.vortexMax >= 300, String(seen.vortexMax));
check('white curtain transition', seen.curtainWhite);
check('ends in void map, stage void_fallen', s.map === 'void' && s.stage === 'void_fallen' && !s.running, JSON.stringify({ map: s.map, stage: s.stage, running: s.running }));
check('chat/dialog/vortex cleaned up', !s.chat && !s.dialog && !s.vortex);
await page.screenshot({ path: `${S}/stream_07_void_end.png` });
// 오른쪽으로 걸어가 거대한 문까지
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(3600); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(300);
s = await page.evaluate(() => ({ x: Math.round(game.player.x), y: Math.round(game.player.y) }));
check('walked right toward the door', s.x > 700, JSON.stringify(s));
await page.screenshot({ path: `${S}/stream_08_door.png` });
await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
check('big door line', (await page.evaluate(() => game.textbox.node?.text || '')).includes('검은 문'));
// 저장 확인: void 단계
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('subtarune.save.v1') || 'null'));
check('autosaved at void', saved?.story?.stage === 'void_fallen' && saved.map === 'void', JSON.stringify(saved && { stage: saved.story?.stage, map: saved.map }));
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
