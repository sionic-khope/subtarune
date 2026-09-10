// 티비 서랍 3D 씬 검증: 2D 줌인 → 3D 오버레이 → (1) X 취소 → (2) 물건 드래그로 치우고 보라색 코드 클릭 → 획득 → 2D 복귀.
// 실행: CHROME_EXE=... node tests/playtest/drawer3d.mjs   (서버 8000, WebGL 은 SwiftShader)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0;
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404|GPU stall|SwiftShader/i.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const st = () => page.evaluate(() => ({ running: game.dialogue.running, box: game.textbox.state, text: game.textbox.node?.text || '', flags: { ...game.flags }, zoom: +game.zoom.s.toFixed(2), scene3d: game.scene3d, inv: [...game.inventory] }));
const finishDialogue = async (max = 20) => {
  for (let i = 0; i < max; i++) {
    await page.waitForTimeout(250);
    const s = await page.evaluate(() => ({ running: game.dialogue.running, box: game.textbox.state }));
    if (!s.running) break;
    if (s.box !== 'closed') await page.keyboard.press('KeyC');
  }
};
const waitPhase = async (want, ms = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const p = await page.evaluate(() => window.__drawer3d?.phase || null); if (p === want) return true; await page.waitForTimeout(100); }
  return false;
};
const startTv = async () => {
  await page.evaluate(() => { game.player.x = 146; game.player.y = 122; game.player.facing = 'up'; game.camera.snap(); });
  await page.waitForTimeout(150); await page.keyboard.press('KeyC'); await page.waitForTimeout(300); await page.keyboard.press('KeyC');   // 대사 즉시 표시
  await page.waitForTimeout(250); await page.keyboard.press('KeyC');   // 넘김 → 줌인 시작
};

await page.goto('http://127.0.0.1:8000/index.html?map=living&spawn=from_hall'); await page.waitForTimeout(1200);
await finishDialogue();   // 진입 컷신
check('webgl available', await page.evaluate(() => { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }));

// ── (1) 취소 경로 ──
await startTv();
let s; { const tz = Date.now(); do { await page.waitForTimeout(120); s = await st(); } while (Date.now() - tz < 4000 && s.zoom < 1.2); } check('zooming in', s.zoom > 1.2, 'zoom=' + s.zoom);
await page.screenshot({ path: `${S}/d3_01_zoom.png` });
check('scene intro', await waitPhase('intro', 6000));
await page.waitForTimeout(600); await page.screenshot({ path: `${S}/d3_02_tv.png` });
check('drawer opens', await waitPhase('open', 4000));
await page.waitForTimeout(700); await page.screenshot({ path: `${S}/d3_03_opening.png` });
check('play phase', await waitPhase('play', 6000));
await page.waitForTimeout(400); await page.screenshot({ path: `${S}/d3_04_play.png` });
await page.keyboard.press('KeyX'); await page.waitForTimeout(1700);
s = await st(); check('cancel → back to 2D, not found', !s.scene3d && !s.flags.cord_found && s.text.includes('나중에'), JSON.stringify({ text: s.text, f: s.flags.cord_found, z: s.zoom }));
await finishDialogue(); await page.waitForTimeout(300); s = await st(); check('zoom restored', s.zoom === 1, 'zoom=' + s.zoom);

// ── (2) 찾기 경로 ──
await startTv();
check('play phase (2nd)', await waitPhase('play', 10000));
await page.waitForTimeout(300);
// 물건을 전부 서랍 가장자리로 드래그
const n = await page.evaluate(() => window.__drawer3d.items.length);
for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
  const p = await page.evaluate((i) => { const it = window.__drawer3d.items[i]; return Math.abs(it.position.x) > 0.17 ? null : window.__drawer3d.project(it); }, i);
  if (!p) continue;
  const tx = i % 2 ? p.x + 300 : p.x - 300, ty = p.y + (i % 3 - 1) * 50;
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move((p.x + tx) / 2, (p.y + ty) / 2, { steps: 4 }); await page.mouse.move(tx, ty, { steps: 4 }); await page.mouse.up();
  await page.waitForTimeout(50);
}
await page.waitForTimeout(300); await page.screenshot({ path: `${S}/d3_05_cleared.png` });
const moved = await page.evaluate(() => window.__drawer3d.items.filter((it) => Math.abs(it.position.x) > 0.15).length);
check('items dragged aside', moved >= n * 0.5, `${moved}/${n}`);
// 코드 튜브 위의 점들을 화면에 투영해 클릭 (코드가 작고 위치가 무작위라 표본 80개 + 주변 2px 재시도 — 2026-09-10 불안정 수정)
const bbox = await page.evaluate(() => {   // 코드(튜브+플러그) 모든 꼭짓점을 투영한 화면 바운딩 박스 — 코드가 작고 위치가 무작위라 점 표본 대신 상자를 촘촘히 훑는다
  const d = window.__drawer3d; const rect = document.getElementById('scene3d').getBoundingClientRect(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; let V = null;
  d.cord.traverse((o) => { if (!o.isMesh || !o.geometry?.attributes?.position) return; const pos = o.geometry.attributes.position; V = V || o.position.constructor;
    for (let i = 0; i < pos.count; i += Math.max(1, Math.floor(pos.count / 200))) { const v = new V(pos.getX(i), pos.getY(i), pos.getZ(i)); o.localToWorld(v); v.project(d.camera); const x = rect.left + (v.x + 1) / 2 * rect.width, y = rect.top + (1 - v.y) / 2 * rect.height; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } });
  return { x0, y0, x1, y1 };
});
let clicked = false;
outer: for (let y = bbox.y0; y <= bbox.y1 + 1; y += 3) for (let x = bbox.x0; x <= bbox.x1 + 1; x += 3) {
  if (x < 2 || y < 2 || x > 998 || y > 778) continue;
  await page.mouse.click(x, y); await page.waitForTimeout(40);
  if ((await page.evaluate(() => window.__drawer3d?.phase)) === 'acquire') { clicked = true; break outer; }
}
check('cord clicked → acquire', clicked);
await page.waitForTimeout(700); await page.screenshot({ path: `${S}/d3_06_acquire.png` });
const t0 = Date.now(); while (Date.now() - t0 < 6000 && await page.evaluate(() => !!game.scene3d)) await page.waitForTimeout(150);
{ const t1 = Date.now(); while (Date.now() - t1 < 4000 && !(await page.evaluate(() => (game.textbox.node?.text || '').includes('획득했다')))) await page.waitForTimeout(150); }   // 줌아웃(0.7s)+페이드 뒤 대사
s = await st();
check('back to 2D with cord_found', !s.scene3d && s.flags.cord_found === true, JSON.stringify({ f: s.flags.cord_found, z: s.zoom }));
check('획득 dialogue', s.text.includes('획득했다'), s.text);
await page.screenshot({ path: `${S}/d3_07_after.png` });
await finishDialogue(); s = await st();
check('inventory has cord', s.inv.includes('보라색 코드 ?'), JSON.stringify(s.inv));
check('zoom restored (2)', s.zoom === 1, 'zoom=' + s.zoom);
// 다시 TV → "코드는 챙겼다"
await page.keyboard.press('KeyC'); await page.waitForTimeout(400); s = await st(); check('tv after found', s.text.includes('챙겼다'), s.text);
await finishDialogue();
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
