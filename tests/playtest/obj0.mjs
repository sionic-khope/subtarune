// 옵젝영역0 검증: ?qa=obj0 → 얕은 물 일직선 길(60×14, a/A/j 타일, 나무 초록·보라 섞임, 배경 obj_forest, 브금 wind) → 걸으면 발 딛는 프레임마다 water_step 효과음(음높이 살짝 랜덤) + 물결 고리, 멈추면 조용 → 오른쪽 문 → obj1 → 왼쪽 문 → obj0 landing.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
process.on('uncaughtException', (e) => { try { console.log(logs.join('\n')); } catch {} console.log('CRASH', e.stack || e.message); process.exit(2); });
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
for (const f of fs.readdirSync(S)) if (f.startsWith('obj0_')) fs.unlinkSync(`${S}/${f}`);
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0; const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) errs.push(`[${m.type()}] ${m.text().slice(0, 160)}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await page.evaluate(fn); if (v) return v; await page.waitForTimeout(60); } return null; };
const st = () => page.evaluate(() => ({ map: game.mapId, bgm: game.sound.bgmName, p: [Math.round(game.player.x), Math.round(game.player.y)], party: game.entities.filter((e) => e.def?.type === 'follower').map((e) => e.def.sprite),
  trees: game.entities.filter((e) => e.id?.startsWith('ot') && !e.dead).map((e) => e.def.image), steps: window.__steps || [], ripples: game.ripples.length }));
const stand = async (x, y, f) => { await page.evaluate(({ x, y, f }) => { game.player.x = x; game.player.y = y; game.player.facing = f; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); game.camera.snap(); }, { x, y, f }); await page.waitForTimeout(150); };

await page.goto('http://localhost:8000/index.html?qa=obj0'); await until(() => !!(window.game && game.entities && game.player), 15000); await page.keyboard.press('KeyX'); await page.waitForTimeout(500);
await page.evaluate(() => { window.__steps = []; const orig = game.sound.sfx.bind(game.sound); game.sound.sfx = (n, o) => { if (n === 'water_step') window.__steps.push({ t: performance.now(), rate: o?.rate, volume: o?.volume }); return orig(n, o); }; });
let s = await st();
const def = await page.evaluate(async () => { const M = (await import('/src/data/maps.js')).MAPS.obj0; return { name: M.name, bgm: M.bgm, backdrop: M.backdrop, rows: M.rows, meta: M.meta }; });
const road = def.rows.slice(6, 9).map((r) => r.slice(1, -1)).join('');
check('qa=obj0: 옵젝영역, straight shallow-water road (60×14, rows 6–8 all a/A/j), wind bgm, obj_forest backdrop, party of 3', s.map === 'obj0' && def.name === '옵젝영역' && def.bgm === 'wind' && s.bgm === 'wind' && def.backdrop === 'obj_forest' && def.rows.length === 14 && def.rows[0].length === 60 && /^[aAj]+$/.test(road) && road.includes('j') && s.party.length === 2, JSON.stringify({ map: s.map, name: def.name, bgm: [def.bgm, s.bgm], backdrop: def.backdrop, size: [def.rows.length, def.rows[0].length], party: s.party }));
check('trees: dense (≥ 60), green and purple mixed, no trunk on the road', s.trees.length >= 60 && s.trees.some((i) => /tree_obj\.png/.test(i)) && s.trees.some((i) => /tree_obj_purple/.test(i)) && def.meta.trees === s.trees.length, JSON.stringify({ n: s.trees.length, purple: s.trees.filter((i) => /purple/.test(i)).length }));
await page.screenshot({ path: `${S}/obj0_01_start.png` });
// 발소리: 1.5초 달리면(12fps 걷기 → 초당 6걸음) water_step 이 6~14번, 음높이가 제각각, 물결 고리가 생긴다
await page.evaluate(() => { window.__steps = []; });
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(700); const mid = await st(); await page.screenshot({ path: `${S}/obj0_02_walk.png` }); await page.waitForTimeout(800); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(100);
s = await st(); const rates = new Set(s.steps.map((k) => k.rate)); const gaps = s.steps.slice(1).map((k, i) => k.t - s.steps[i].t);
check('running 1.5s on shallow water → water_step 6~14 times, varied pitch (rate 0.92~1.08), volume 0.5, steps spaced ≥ 100ms, ripples appeared', s.steps.length >= 6 && s.steps.length <= 14 && rates.size >= 3 && s.steps.every((k) => k.rate >= 0.92 && k.rate <= 1.08 && k.volume === 0.5) && gaps.every((g) => g >= 100) && mid.ripples > 0, JSON.stringify({ n: s.steps.length, rates: [...rates].map((r) => +r.toFixed(3)), gaps: gaps.map(Math.round), ripples: mid.ripples }));
const n0 = s.steps.length; await page.waitForTimeout(700); s = await st();
check('standing still → no more footsteps, ripples fade out', s.steps.length === n0 && s.ripples === 0, JSON.stringify({ n0, n: s.steps.length, ripples: s.ripples }));
// 천천히(X 누른 채) 걸으면 8fps → 초당 4걸음
await page.evaluate(() => { window.__steps = []; }); await page.keyboard.down('KeyX'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1500); await page.keyboard.up('ArrowRight'); await page.keyboard.up('KeyX'); await page.waitForTimeout(100);
s = await st();
check('walking slowly 1.5s → fewer footsteps (3~9)', s.steps.length >= 3 && s.steps.length <= 9, JSON.stringify({ n: s.steps.length }));
await stand(30 * 32, 7 * 32 + 8, 'right'); await page.waitForTimeout(300); await page.screenshot({ path: `${S}/obj0_03_middle.png` });
// 출구 → obj1 → 되돌아오기
const L = def.rows && (await page.evaluate(async () => (await import('/src/data/maps.js')).MAPS.obj0.spawns.landing));
await stand(L.x, L.y, 'right'); await page.waitForTimeout(300); await page.keyboard.down('ArrowRight');
let mapNow = 'obj0'; const t1 = Date.now(); while (Date.now() - t1 < 8000) { mapNow = await page.evaluate(() => game.mapId); if (mapNow === 'obj1') break; await page.waitForTimeout(100); }
await page.keyboard.up('ArrowRight');
check('right edge → obj1 (placeholder)', mapNow === 'obj1', mapNow);
await page.waitForTimeout(900); await page.keyboard.down('ArrowLeft');
const t2 = Date.now(); while (Date.now() - t2 < 8000) { mapNow = await page.evaluate(() => game.mapId); if (mapNow === 'obj0') break; await page.waitForTimeout(100); }
await page.keyboard.up('ArrowLeft'); s = await st();
check('obj1 left edge → back to obj0 landing (right end)', mapNow === 'obj0' && s.p[0] > 50 * 32, JSON.stringify({ mapNow, p: s.p }));
check('no page/console errors', errs.length === 0, JSON.stringify(errs.slice(0, 4)));
console.log(logs.join('\n')); console.log(`fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
