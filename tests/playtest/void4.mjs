// 보라맵4 검증: ?qa=void4 → 긴 뗏목(~18s, 억빠맨을 지나침) → 도착 트리거 컷신(카메라 억빠맨 클로즈업 → 대사 → 레버 클로즈업 → 복귀 → "오케이")
//               → 계단 올라가 레버 C → 다리 낙하(rumble·thud·흔들림) → 타일 교체 → 억빠맨까지 걸어가 "안녕하세요형" → 잠긴 문 → 플래그로 재로드 시 다리 유지.
// 실행: CHROME_EXE=... node tests/playtest/void4.mjs   (서버 8000)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0;
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const st = () => page.evaluate(() => ({ map: game.mapId, ride: !!game.ride, p: [Math.round(game.player.x), Math.round(game.player.y)], running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: game.textbox.node?.text || '', zoom: +game.zoom.s.toFixed(2), cam: [Math.round(game.camera.x), Math.round(game.camera.y)], locked: game.camera.locked, flags: { ...game.flags }, sfx: window.__sfx || [], row5: game.map.rows[7].slice(38, 42), bridgeFall: !!game.entities.find((e) => e.id === 'bridge_fall' && !e.dead), leverOn: !!game.entities.find((e) => e.id === 'lever_on' && !e.dead && e.visible) }));
const hookSfx = () => page.evaluate(() => { window.__sfx = []; const s = game.sound; if (!s.__orig) { s.__orig = s.sfx.bind(s); s.sfx = (n, opt) => { window.__sfx.push(n); return s.__orig(n, opt); }; } });
const stand = (x, y, f) => page.evaluate(([x, y, f]) => { game.player.x = x; game.player.y = y; game.player.facing = f; game.camera.snap(); }, [x, y, f]);
const finish = async (max = 20) => { for (let i = 0; i < max; i++) { await page.waitForTimeout(220); const s = await page.evaluate(() => ({ running: game.dialogue.running, box: game.textbox.state })); if (!s.running) break; if (s.box === 'waiting' || s.box === 'choice') await page.keyboard.press('KeyC'); } };

await page.goto('http://127.0.0.1:8000/index.html?qa=void4'); await page.waitForTimeout(1000); await hookSfx();
let s = await st(); check('qa=void4 at entrance', s.map === 'void4' && s.p[0] === 60, JSON.stringify(s.p));
check('backdrop enabled', await page.evaluate(() => game.constructor && !!game.drawBackdrop && (Object.values(game).length > 0)));
await page.screenshot({ path: `${S}/void4_01_start.png` });
// 뗏목 타기 (길게)
await stand(132, 274, 'right'); await page.waitForTimeout(120);
const t0 = Date.now(); await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
s = await st(); check('boards long raft', s.ride);
check('rider drawn above raft (standing on it)', await page.evaluate(() => { const onProp = (e) => false; const key = (e) => (e.def?.sortY ?? (e.y + e.h)) + (e.pose === 'lying' || (game.ride && e === game.player) ? 10000 : 0); const r = game.entities.find((e) => e.id === 'raft4'); return key(game.player) > key(r) && game.player.y + game.player.h <= r.y + r.h; }));
await page.waitForTimeout(5500); await page.screenshot({ path: `${S}/void4_02_mid.png` });
s = await st(); check('mid-ride still riding, ppaman passed or near', s.ride, JSON.stringify(s.p));
while (Date.now() - t0 < 30000 && (await st()).ride) await page.waitForTimeout(150);
const rideSec = (Date.now() - t0) / 1000;
check('ride ~12s (6s shorter, halves)', rideSec > 9.5 && rideSec < 15, rideSec.toFixed(1) + 's');
// 도착 컷신
await page.waitForTimeout(600); s = await st();
check('arrival cutscene started (flag once)', s.running && s.flags.void4_arrived === true);
// 카메라가 억빠맨 쪽으로 이동 + 줌
await page.waitForTimeout(1700); s = await st();
check('camera panned to ppaman & zoomed', s.locked && s.cam[0] < 1400 && s.zoom > 1.5, JSON.stringify({ cam: s.cam, zoom: s.zoom }));
await page.screenshot({ path: `${S}/void4_03_ppaman_closeup.png` });
const seen = [];
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(220); s = await st();
  if (!s.running) break;
  if (s.box === 'waiting') { seen.push((s.speaker || '') + '|' + s.text); if (s.text.includes('레버가')) { await page.waitForTimeout(100); } await page.keyboard.press('KeyC'); if (s.text.includes('레버가')) { await page.waitForTimeout(2700); await page.screenshot({ path: `${S}/void4_04_lever_closeup.png` }); const z = await st(); check('camera at lever & zoomed', z.cam[0] > 1700 && z.zoom > 1.5, JSON.stringify({ cam: z.cam, zoom: z.zoom })); } }
  else if (s.box === 'typing') await page.keyboard.press('KeyC');
}
check('ppaman lines with 억빠맨 name/portrait', seen.filter((x) => x.startsWith('억빠맨|')).length === 3 && seen.some((x) => x.includes('갇혔어요')), seen.join(' / '));
check('no 오케이 line', !seen.some((x) => x.includes('오케이')), seen.join(' / '));
s = await st(); check('camera back to player, zoom 1', !s.locked && s.zoom === 1);
// 잠긴 문
await stand(2370, 300, 'right'); await page.waitForTimeout(120); await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
s = await st(); check('door locked line', s.text.includes('자물쇠'), s.text); await finish();
// 계단 → 레버
await stand(2276, 300, 'up'); await page.keyboard.down('ArrowUp'); await page.waitForTimeout(2000); await page.keyboard.up('ArrowUp'); await page.waitForTimeout(100);
s = await st(); check('climbed stairs to upper platform', s.p[1] < 96, JSON.stringify(s.p));
await stand(2212, 66, 'up'); await page.waitForTimeout(120); await hookSfx();
await page.keyboard.press('KeyC'); await page.waitForTimeout(2000);
s = await st(); check('lever: bridge falling (prop spawned, rumble)', s.bridgeFall && s.sfx.includes('rumble') && s.leverOn, JSON.stringify({ fall: s.bridgeFall, sfx: s.sfx, leverOn: s.leverOn }));
await page.screenshot({ path: `${S}/void4_05_bridge_falling.png` });
{ const t1 = Date.now(); while (Date.now() - t1 < 8000 && (await st()).running) await page.waitForTimeout(150); }
s = await st();
check('bridge landed: thud, tiles swapped, flag', s.sfx.includes('thud') && s.row5 === 'bbbb' && s.flags.bridge_down === true && !s.bridgeFall, JSON.stringify({ row5: s.row5, sfx: s.sfx.filter((n) => n !== 'splash'), flag: s.flags.bridge_down }));
await page.screenshot({ path: `${S}/void4_06_bridge_down.png` });
await page.keyboard.press('KeyC'); await page.waitForTimeout(300); s = await st(); check('lever again: 이미 내렸다', s.text.includes('이미'), s.text); await finish();
// 다리 위를 걸어 억빠맨에게 (길게 → 텔레포트로 단축 후 마지막 구간 걷기)
await stand(2230, 232, 'left'); await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(1500); await page.keyboard.up('ArrowLeft');
s = await st(); check('can walk on bridge tiles', s.p[0] < 1950 && s.p[1] >= 224 && s.p[1] < 256, JSON.stringify(s.p));
await stand(1300, 232, 'left'); await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(900); await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(120);
s = await st(); check('stopped next to pillar', s.p[0] >= 1216 && s.p[0] <= 1224, JSON.stringify(s.p));
await page.keyboard.press('KeyC'); await page.waitForTimeout(400);
s = await st(); check('talk to ppaman: 안녕하세요 형', s.speaker === '억빠맨' && s.text.includes('안녕하세요 형'), JSON.stringify({ sp: s.speaker, t: s.text }));
await page.screenshot({ path: `${S}/void4_07_ppaman_talk.png` }); await page.keyboard.press('KeyC'); await page.waitForTimeout(300); await page.keyboard.press('KeyC'); await page.waitForTimeout(300); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('KeyX'); await page.waitForTimeout(300); await finish();   // 선택지에서 X(=물어볼건 없다) 로 빠져나감
// 재로드: 플래그로 다리 유지
await page.evaluate(() => game.changeMap('void4', 'landing', true)); await page.waitForTimeout(300);
s = await st(); check('bridge persists via flag on reload', s.row5 === 'bbbb' && s.leverOn, JSON.stringify({ row5: s.row5, leverOn: s.leverOn }));
// QA void4_end
await page.goto('http://127.0.0.1:8000/index.html?qa=void4_end'); await page.waitForTimeout(900);
s = await st(); check('qa=void4_end lands at landing with arrived flag, no cutscene', s.map === 'void4' && s.flags.void4_arrived === true && !s.running, JSON.stringify({ p: s.p, running: s.running }));
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
