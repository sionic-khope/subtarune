// 집 동선 헤드리스 검증: 방(잠긴 문) → 복도 → 거실(진입 컷신 1회) → 밥상/냉장고/티비 → 복도로 복귀 → 재진입 시 컷신 없음.
// 실행: CHROME_EXE=... node tests/playtest/house.mjs   (서버 8000)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const __ready = async () => { const t0 = Date.now(); while (Date.now() - t0 < 20000) { if (await page.evaluate(() => !!(window.game && game.entities && game.player)).catch(() => false)) return; await page.waitForTimeout(100); } };   // 페이지가 준비될 때까지(느린 머신에서 고정 대기는 부족)
const logs = []; let fails = 0;
page.on('console', (m) => { if (!/404/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const shot = (n) => page.screenshot({ path: `${S}/house_${n}.png` });
const st = () => page.evaluate(() => ({ map: game.mapId, running: game.dialogue.running, box: game.textbox.state, flags: { ...game.flags }, p: [Math.round(game.player.x), Math.round(game.player.y)], tr: game.transitioning, scene3d: game.scene3d }));
const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };
// 대사를 C 로 끝까지 넘김 (선택지는 pick 번째를 고름)
const finishDialogue = async (pick = 0, max = 30) => {
  const texts = [];
  for (let i = 0; i < max; i++) {
    await page.waitForTimeout(250);
    const s = await page.evaluate(() => ({ running: game.dialogue.running, box: game.textbox.state, text: game.textbox.node?.text || '' }));
    if (!s.running) break;
    if (s.box === 'choice') { await page.waitForTimeout(500); for (let k = 0; k < pick; k++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80); } await page.keyboard.press('KeyC'); continue; }   // 선택지 확정 잠금(0.1s) 뒤에 조작
    if (s.box === 'waiting') { if (!texts.includes(s.text)) texts.push(s.text); await page.keyboard.press('KeyC'); }
    else await page.keyboard.press('KeyC');   // 타이핑 중이면 즉시 표시
  }
  return texts;
};

// 1) 방: 컴퓨터 전엔 문이 잠김 — 서 있어도 대사 1회만
await page.goto('http://127.0.0.1:8000/index.html?map=room&spawn=door'); await __ready(); await page.waitForTimeout(1200);
await page.evaluate(() => { window.__opens = 0; const o = game.dialogue.start.bind(game.dialogue); game.dialogue.start = (...a) => { window.__opens++; return o(...a); }; });
await page.keyboard.down('ArrowUp'); { const t0 = Date.now(); while (Date.now() - t0 < 4000) { const q = await page.evaluate(() => ({ y: game.player.y, running: game.dialogue.running })); if (q.running || q.y <= 100) break; await page.waitForTimeout(40); } } await page.keyboard.up('ArrowUp'); await page.waitForTimeout(400);   // 문에 닿아 대사가 열릴 때까지(느린 GL 에서도)
for (let i = 0; i < 6; i++) { await page.keyboard.press('KeyC'); await page.waitForTimeout(200); }
let s = await st();
check('locked door: still in room', s.map === 'room');
check('locked door: dialogue opened once', (await page.evaluate(() => window.__opens)) === 1, 'opens=' + await page.evaluate(() => window.__opens));
await finishDialogue();
// 2) 컴퓨터 확인 후 문 → 복도
await page.evaluate(() => { game.flags.pc_checked = true; game.player.y = 130; }); await page.waitForTimeout(300);
await hold('ArrowUp', 400); await page.waitForTimeout(900);
s = await st(); check('door → corridor', s.map === 'corridor' && !s.tr, JSON.stringify(s.p));
await shot('01_corridor_top');
// 복도: 아래로 → 오른쪽 끝
await hold('ArrowDown', 700); await hold('ArrowRight', 1600); await page.waitForTimeout(300);
await shot('02_corridor_end');
s = await st(); check('walked to corridor end', s.map === 'corridor' && s.p[0] > 420, JSON.stringify(s.p));
await hold('ArrowRight', 400); await page.waitForTimeout(900);
s = await st(); check('corridor end → living', s.map === 'living', s.map);
// 3) 거실 진입 컷신
await page.waitForTimeout(700);
s = await st(); check('living enter cutscene running', s.running && s.flags.living_entered);
await shot('03_living_enter');
let texts = await finishDialogue();
check('enter cutscene 5 lines', texts.length === 5, String(texts.length) + ' ' + texts.join(' | '));
await shot('04_living_after_enter');
// 네 모서리 확인용
for (const [n, x, y] of [['nw', 40, 110], ['ne', 760, 130], ['sw', 40, 350], ['se', 770, 350]]) {
  await page.evaluate(([x, y]) => { game.player.x = x; game.player.y = y; game.camera.snap(); }, [x, y]); await page.waitForTimeout(150); await shot('05_corner_' + n);
}
// 4) 밥상: 아니오 → 예 → 빈 접시
await page.evaluate(() => { game.player.x = 384; game.player.y = 286; game.player.facing = 'up'; game.camera.snap(); }); await page.waitForTimeout(200);
await page.keyboard.press('KeyC'); texts = await finishDialogue(1);
check('table: 아니오 keeps tart', !(await st()).flags.tart_eaten && (await page.evaluate(() => !!game.entities.find((e) => e.id === 'tart' && !e.dead))), texts.join(' | '));
await page.keyboard.press('KeyC'); await page.waitForTimeout(300); await shot('06_table_choice_typing');
texts = await finishDialogue(0);
s = await st();
check('table: 예 eats tart', s.flags.tart_eaten && texts.some((t) => t.includes('눅눅')), texts.join(' | '));
check('tart prop removed', await page.evaluate(() => !game.entities.find((e) => e.id === 'tart' && !e.dead)));
await shot('07_table_after_eat');
await page.keyboard.press('KeyC'); texts = await finishDialogue();
check('table again: empty plate', texts.some((t) => t.includes('빈 접시')), texts.join(' | '));
// 5) 냉장고
await page.evaluate(() => { game.player.x = 750; game.player.y = 124; game.player.facing = 'up'; game.camera.snap(); }); await page.waitForTimeout(200);
await page.keyboard.press('KeyC'); await page.waitForTimeout(400); await shot('08_fridge');
texts = await finishDialogue();
check('fridge 4 lines', texts.length === 4 && texts[3].includes('기분이'), texts.join(' | '));
// 6) 티비: 첫 대사 → 2D 줌인 → 3D 서랍 씬(여기선 X 로 취소; 씬 자체는 drawer3d.mjs 가 검증)
await page.evaluate(() => { game.player.x = 146; game.player.y = 122; game.player.facing = 'up'; game.camera.snap(); }); await page.waitForTimeout(200);
await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
const tvText = await page.evaluate(() => game.textbox.node?.text || '');
check('tv line', tvText.includes('코드'), tvText);
await page.keyboard.press('KeyC'); await page.waitForTimeout(200); await page.keyboard.press('KeyC');
{ const t0 = Date.now(); while (Date.now() - t0 < 10000 && (await page.evaluate(() => window.__drawer3d?.phase)) !== 'play') await page.waitForTimeout(150); }
check('tv → 3D scene reached play', (await page.evaluate(() => window.__drawer3d?.phase)) === 'play');
await page.keyboard.press('KeyX'); await page.waitForTimeout(1800); texts = await finishDialogue();
check('tv scene cancelled → 나중에', !(await st()).scene3d && texts.some((t) => t.includes('나중에')), texts.join(' | '));
// 7) 러그/방석 위에서 밥상 상호작용 (장식 소품이 probe 를 가로채면 안 됨)
await page.evaluate(() => { game.player.x = 384; game.player.y = 296; game.player.facing = 'up'; game.camera.snap(); }); await page.waitForTimeout(200);
await page.keyboard.press('KeyC'); texts = await finishDialogue();
check('probe through cushion hits table', texts.some((t) => t.includes('접시')), texts.join(' | '));
// 8) 왼쪽 출입구 → 복도 → 다시 거실: 컷신 재생 없음
await page.evaluate(() => { game.player.x = 70; game.player.y = 220; game.player.facing = 'left'; game.camera.snap(); }); await page.waitForTimeout(200);
await hold('ArrowLeft', 500); await page.waitForTimeout(900);
s = await st(); check('living → corridor', s.map === 'corridor', s.map + ' ' + JSON.stringify(s.p));
await hold('ArrowRight', 600); await page.waitForTimeout(1000);
s = await st(); check('corridor → living again, no cutscene', s.map === 'living' && !s.running, s.map + ' running=' + s.running);
await page.evaluate(() => { game.player.x = 384; game.player.y = 286; game.camera.snap(); }); await page.waitForTimeout(150);
check('tart stays gone after re-enter', await page.evaluate(() => !game.entities.find((e) => e.id === 'tart')));
await shot('09_living_reenter');
// 9) 복도 → 방 (문 왕복)
await page.evaluate(() => { game.mapId; }); await page.goto('http://127.0.0.1:8000/index.html?map=corridor&spawn=from_room'); await __ready(); await page.waitForTimeout(1000);
await hold('ArrowUp', 400); await page.waitForTimeout(900);
s = await st(); check('corridor → room', s.map === 'room' && !s.running, s.map + ' ' + JSON.stringify(s.p));
await page.waitForTimeout(800); s = await st(); check('no ping-pong back to corridor', s.map === 'room');
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
