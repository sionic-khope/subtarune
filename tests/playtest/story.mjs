// 상태 시스템 검증: 개발용 바로가기의 단계 backfill, 코드 획득 뒤 컴퓨터/문/티비 대사, 자동 저장·이어하기·처음부터.
// 실행: CHROME_EXE=... node tests/playtest/story.mjs   (서버 8000)
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0;
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const st = () => page.evaluate(() => ({ map: game.mapId, stage: game.story.stage, flags: { ...game.flags }, running: game.dialogue.running, text: game.textbox.node?.text || '', state: game.state, inv: [...game.inventory], p: [Math.round(game.player?.x), Math.round(game.player?.y)] }));
const finishDialogue = async (max = 20) => { for (let i = 0; i < max; i++) { await page.waitForTimeout(220); const s = await page.evaluate(() => ({ running: game.dialogue.running, box: game.textbox.state })); if (!s.running) break; if (s.box !== 'closed') await page.keyboard.press('KeyC'); } };
const firstLine = async (x, y, facing = 'up') => { await page.evaluate(([x, y, f]) => { game.player.x = x; game.player.y = y; game.player.facing = f; game.camera.snap(); }, [x, y, facing]); await page.waitForTimeout(120); await page.keyboard.press('KeyC'); await page.waitForTimeout(300); const t = await page.evaluate(() => game.textbox.node?.text || ''); await finishDialogue(); return t; };
const goMap = async (map, spawn) => { await page.evaluate(([m, s]) => game.changeMap(m, s, true), [map, spawn]); await page.waitForTimeout(200); await finishDialogue(); };

// 1) ?map=living 바로가기 → pc_checked 가 backfill → 방 컴퓨터는 초기 대사("어 뭐야")가 아니라 "코드가 없다"
await page.goto('http://127.0.0.1:8000/index.html?map=living&spawn=from_hall'); await page.waitForTimeout(1000); await finishDialogue();
let s = await st(); check('?map=living backfills pc_checked', s.flags.pc_checked === true && s.stage === 'living_entered', JSON.stringify({ stage: s.stage }));
await goMap('room', 'door');
let t = await firstLine(70, 132); check('computer after shortcut: not initial line', t.includes('코드가 없다') && !t.includes('어 뭐야'), t);

// 2) ?stage=cord_found → 컴퓨터 "(코드는 챙겼다.)", 방문 열림(잠김 대사 없음), 티비 "코드는 챙겼다"
await page.goto('http://127.0.0.1:8000/index.html?stage=cord_found'); await page.waitForTimeout(1000); await finishDialogue();
s = await st(); check('?stage=cord_found lands in living with all earlier flags', s.map === 'living' && s.flags.pc_checked && s.flags.living_entered && s.flags.cord_found, JSON.stringify(s.flags));
t = await firstLine(146, 122); check('tv after cord_found', t.includes('챙겼다'), t);
await goMap('room', 'door'); await page.waitForTimeout(700);   // 문 스폰 직후 0.6s 쿨다운 지나서
await page.evaluate(() => { game.player.x = 140; game.player.y = 130; game.player.facing = 'up'; });
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(350); await page.keyboard.up('ArrowUp'); await page.waitForTimeout(900);
s = await st(); check('door not locked after cord_found → corridor', s.map === 'corridor', s.map);
// 컴퓨터: 코드를 챙긴 뒤엔 초기 대사가 아니라 방송 컷신("철컥..")이 시작되고 void 로 끝난다
await goMap('room', 'door');
await page.evaluate(() => { game.player.x = 70; game.player.y = 132; game.player.facing = 'up'; game.camera.snap(); }); await page.waitForTimeout(120);
await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
t = await page.evaluate(() => game.textbox.node?.text || ''); check('computer after cord_found starts stream cutscene', t.includes('철컥') && !t.includes('어 뭐야'), t);
{ const t0 = Date.now(); while (Date.now() - t0 < 120000) { const q = await page.evaluate(() => ({ running: game.dialogue.running, box: game.textbox.state, map: game.mapId })); if (!q.running && q.map === 'void') break; if (q.box === 'waiting' || q.box === 'choice') await page.keyboard.press('KeyC'); await page.waitForTimeout(160); } }
s = await st(); check('stream cutscene ends in void, stage void_fallen', s.map === 'void' && s.stage === 'void_fallen', JSON.stringify({ map: s.map, stage: s.stage }));

// 3) 자동 저장 → 새로고침 → 타이틀 "C 이어하기" → 상태 복원
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('subtarune.save.v1') || 'null'));
check('autosave written', !!saved && saved.story?.stage === 'void_fallen' && saved.map === 'void', JSON.stringify(saved && { stage: saved.story?.stage, map: saved.map }));
await page.goto('http://127.0.0.1:8000/index.html'); await page.waitForTimeout(1200);
await page.keyboard.press('KeyX'); await page.waitForTimeout(3600);
for (let j = 0; j < 12; j++) { await page.keyboard.press('KeyC'); await page.waitForTimeout(500); if ((await page.evaluate(() => game.state)) !== 'title') break; }
await page.waitForTimeout(900); s = await st();
check('continue restores stage/map/flags', s.state === 'field' && s.map === 'void' && s.stage === 'void_fallen' && s.flags.pc_checked === true && !s.running, JSON.stringify({ state: s.state, map: s.map, stage: s.stage, running: s.running }));
t = await firstLine(904, 168, 'right'); check('gameplay works after continue (big door line)', t.includes('검은 문'), t);

// 4) 타이틀에서 X 두 번 → 처음부터: 세이브 삭제, 오프닝 시작, 플래그 초기화
await page.goto('http://127.0.0.1:8000/index.html'); await page.waitForTimeout(1200);
await page.keyboard.press('KeyX'); await page.waitForTimeout(3600);
for (let j = 0; j < 8; j++) { await page.waitForTimeout(500); if ((await page.evaluate(() => game.title.time > 3.0)) === true) break; }
await page.keyboard.press('KeyX'); await page.waitForTimeout(300);
check('first X asks confirmation', await page.evaluate(() => game.title.confirmNew > 0 && game.state === 'title'));
await page.keyboard.press('KeyX'); await page.waitForTimeout(1200);
s = await st(); check('new game: opening running, flags reset, save cleared', s.state === 'field' && s.running && !s.flags.cord_found && (await page.evaluate(() => localStorage.getItem('subtarune.save.v1'))) === null, JSON.stringify({ state: s.state, running: s.running, flags: s.flags }));
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
