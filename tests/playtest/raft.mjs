// 보라맵2 뗏목 기믹 + QA 바로가기 검증: ?qa=raft → C 로 타기 → 4초 일직선 → 오른쪽 착지 → 문 대사 → 되돌아 타기 → 상태(flags.raft_raft1) → ?qa=pc_stream(컴퓨터 앞) → 타이틀 Q 메뉴.
// 실행: CHROME_EXE=... node tests/playtest/raft.mjs   (서버 8000)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0;
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const st = () => page.evaluate(() => { const r = game.entities.find((e) => e.id === 'raft1'); return { map: game.mapId, stage: game.story.stage, ride: !!game.ride, p: [Math.round(game.player.x), Math.round(game.player.y)], facing: game.player.facing, raft: r ? [Math.round(r.x), Math.round(r.y), r.at] : null, flag: game.flags.raft_raft1, running: game.dialogue.running, text: game.textbox.node?.text || '' }; });
const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };

// 1) QA: 뗏목 앞
await page.goto('http://127.0.0.1:8000/index.html?qa=raft'); await page.waitForTimeout(1000);
let s = await st();
check('qa=raft lands at dock facing right, stage backfilled', s.map === 'void2' && s.stage === 'void_fallen' && s.facing === 'right' && s.p[0] === 100, JSON.stringify(s));
await page.screenshot({ path: `${S}/raft_01_dock.png` });
await page.keyboard.press('KeyC'); await page.waitForTimeout(400);
s = await st(); check('C boards the raft (ride starts)', s.ride && s.p[0] > 120, JSON.stringify(s));
await page.waitForTimeout(1800); await page.screenshot({ path: `${S}/raft_02_riding.png` });
s = await st(); check('mid-ride: player carried on raft', s.ride && Math.abs(s.p[0] - (s.raft[0] + 16)) < 6, JSON.stringify({ p: s.p, raft: s.raft }));
const t0 = Date.now(); while (Date.now() - t0 < 8000 && (await st()).ride) await page.waitForTimeout(100);
const rideMs = Date.now() - t0 + 2200;
s = await st();
check('ride ends ~4s, raft at route end, flag saved', !s.ride && s.raft[0] === 584 && s.raft[2] === 1 && s.flag === 1, JSON.stringify({ raft: s.raft, flag: s.flag, ms: rideMs }));
check('player disembarked onto right landing', s.p[0] >= 640, JSON.stringify(s.p));
await page.screenshot({ path: `${S}/raft_03_arrived.png` });
// 문까지 걸어가서 C
await hold('ArrowRight', 1500); await page.waitForTimeout(200);
await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
s = await st(); check('door at the end reachable (placeholder line)', s.text.includes('검은 문'), JSON.stringify({ p: s.p, text: s.text }));
await page.keyboard.press('KeyC'); await page.waitForTimeout(300); await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
await page.screenshot({ path: `${S}/raft_04_door.png` });
// 되돌아 타기: 착지 왼쪽 끝에서 왼쪽 보고 C
await page.evaluate(() => { game.player.x = 644; game.player.y = 120; game.player.facing = 'left'; game.camera.snap(); }); await page.waitForTimeout(150);
await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
s = await st(); check('ride back starts', s.ride, JSON.stringify(s));
{ const t1 = Date.now(); while (Date.now() - t1 < 8000 && (await st()).ride) await page.waitForTimeout(100); }
s = await st(); check('ride back ends at start, flag 0, player on left landing', !s.ride && s.raft[0] === 128 && s.flag === 0 && s.p[0] < 128, JSON.stringify({ raft: s.raft, flag: s.flag, p: s.p }));
// 상태 유지: 오른쪽 끝에 두고 맵을 나갔다 와도 그 자리
await page.evaluate(() => { game.flags.raft_raft1 = 1; game.changeMap('void', 'door_back', true); }); await page.waitForTimeout(200);
await page.evaluate(() => game.changeMap('void2', 'from_void', true)); await page.waitForTimeout(200);
s = await st(); check('raft position persists via flag across map reload', s.raft[0] === 584 && s.raft[2] === 1, JSON.stringify(s.raft));
// 보라맵1 대문 → 보라맵2 → 왼쪽 문 → 보라맵1 (핑퐁 없음)
await page.evaluate(() => game.changeMap('void', 'door_back', true)); await page.waitForTimeout(700);
await hold('ArrowRight', 700); await page.waitForTimeout(900);
s = await st(); check('void big door → void2', s.map === 'void2', s.map);
await page.waitForTimeout(700); await hold('ArrowLeft', 700); await page.waitForTimeout(900);
s = await st(); check('void2 left door → void (no ping-pong)', s.map === 'void', s.map);
await page.waitForTimeout(800); check('still in void after arrival', (await st()).map === 'void');

// 2) QA: 코드 획득 직후 컴퓨터 앞 → C 로 방송 컷신 시작
await page.goto('http://127.0.0.1:8000/index.html?qa=pc_stream'); await page.waitForTimeout(1000);
s = await st(); check('qa=pc_stream: room, facing up, cord_found', s.map === 'room' && s.facing === 'up' && s.stage === 'cord_found', JSON.stringify({ map: s.map, facing: s.facing, stage: s.stage }));
await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
s = await st(); check('C starts stream cutscene immediately', s.running && s.text.includes('철컥'), s.text);

// 3) 타이틀 Q 메뉴
await page.goto('http://127.0.0.1:8000/index.html'); await page.waitForTimeout(1200);
await page.keyboard.press('KeyX'); await page.waitForTimeout(3400);
await page.keyboard.press('KeyQ'); await page.waitForTimeout(300);
check('title Q opens QA list', await page.evaluate(() => !!game.title.qa));
await page.screenshot({ path: `${S}/raft_05_qa_menu.png` });
for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(100); }   // pc_stream
await page.keyboard.press('KeyC'); await page.waitForTimeout(1500);
s = await st(); check('QA menu jump works', s.map === 'room' && s.stage === 'cord_found' && s.facing === 'up', JSON.stringify({ map: s.map, stage: s.stage }));
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
