// 가구/벽 소품 상호작용 도달성 검증: 각 소품 앞(바닥)에 서서 C → 기대 키워드가 든 대사가 뜨는지.
// 벽에 붙은 소품(포스터·창문·시계·달력·액자)은 히트박스가 벽 밑단(y 86~96)에 있어야 닿는다.
// 실행: CHROME_EXE=... node tests/playtest/furniture.mjs   (서버 8000)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const __ready = async () => { const t0 = Date.now(); while (Date.now() - t0 < 20000) { if (await page.evaluate(() => !!(window.game && game.entities && game.player)).catch(() => false)) return; await page.waitForTimeout(100); } };   // 페이지가 준비될 때까지(느린 머신에서 고정 대기는 부족)
const logs = []; let fails = 0;
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') if (!/404/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const finishDialogue = async (max = 20) => {
  const texts = [];
  for (let i = 0; i < max; i++) {
    await page.waitForTimeout(220);
    const s = await page.evaluate(() => ({ running: game.dialogue.running, box: game.textbox.state, text: game.textbox.node?.text || '' }));
    if (!s.running) break;
    if (s.box === 'waiting' && !texts.includes(s.text)) texts.push(s.text);
    await page.keyboard.press('KeyC');
  }
  return texts;
};
const CASES = {
  room: [
    ['poster', 336, 96, 'up', '포스터'], ['window', 244, 96, 'up', '반밖에'],
  ],
  corridor: [
    ['frame', 300, 224, 'up', '사진'], ['shovel', 404, 224, 'up', '삽'],
  ],
  living: [
    ['window', 430, 96, 'up', '반밖에'], ['clock', 306, 96, 'up', '시계'], ['calendar', 534, 96, 'up', '달력'],
    ['sofa', 150, 252, 'up', '소파'], ['plant', 48, 132, 'up', '화분'], ['cabinet', 260, 120, 'up', '장식장'],
    ['sink', 600, 124, 'up', '싱크대'], ['stove', 690, 124, 'up', '곰탕'], ['tv', 146, 122, 'up', '코드'], ['fridge', 750, 124, 'up', '냉장고'],
  ],
};
for (const [map, cases] of Object.entries(CASES)) {
  const spawn = map === 'room' ? 'door' : map === 'corridor' ? 'from_room' : 'from_hall';
  await page.goto(`http://127.0.0.1:8000/index.html?map=${map}&spawn=${spawn}`); await __ready(); await page.waitForTimeout(1000);
  await finishDialogue();   // 진입 컷신이 있으면 넘김
  for (const [name, x, y, facing, kw] of cases) {
    await page.evaluate(([x, y, f]) => { game.player.x = x; game.player.y = y; game.player.facing = f; game.camera.snap(); }, [x, y, facing]);
    await page.waitForTimeout(120);
    await page.keyboard.press('KeyC'); await page.waitForTimeout(350);
    if (name === 'sofa' || name === 'poster' || name === 'shovel') await page.screenshot({ path: `${S}/furn_${map}_${name}.png` });
    const texts = await finishDialogue();
    check(`${map}/${name}`, texts.length >= 1 && texts.some((t) => t.includes(kw)), texts.join(' | ') || '(대사 없음)');
    if (name === 'tv') {   // 티비는 3D 서랍 씬으로 이어진다 → 취소하고 다음 소품으로
      const t0 = Date.now(); while (Date.now() - t0 < 10000 && (await page.evaluate(() => window.__drawer3d?.phase)) !== 'play') await page.waitForTimeout(150);
      await page.keyboard.press('KeyX'); await page.waitForTimeout(1800); await finishDialogue();
      const t1 = Date.now(); while (Date.now() - t1 < 6000 && await page.evaluate(() => game.dialogue.running || game.zoom.s !== 1 || game.scene3d)) await page.waitForTimeout(150);   // 줌아웃·대사 완전히 끝날 때까지
    }
  }
}
// 방: 러그가 없어야 한다
await page.goto('http://127.0.0.1:8000/index.html?map=room&spawn=door'); await __ready(); await page.waitForTimeout(800);
check('room has no rug', await page.evaluate(() => !game.entities.some((e) => (e.def.image || '').includes('rug'))));
await page.screenshot({ path: `${S}/furn_room.png` });
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
