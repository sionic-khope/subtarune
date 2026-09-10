// 상태 관리 검증 (2026-09-10 "qa 로 건너뛰었다가 이어하기 누르면 형섭 하나만 나오는 버그"):
//   ?qa=teal3 → 동료 2 + 바로 세이브 → 타이틀 '이어하기' → 같은 맵·동료 2 가 주인공 옆에 → Esc → 타이틀 Q 로 'void'(동료 없음) → 동료 0·플래그 초기화·세이브 갱신
//   → ?qa=key(억빠맨만) → 이어하기 → 동료 1 이 주인공 옆에. 세이브에 spawn 이 있고, 컷신 중엔 세이브가 안 바뀐다.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
process.on('uncaughtException', (e) => { try { console.log(logs.join('\n')); } catch {} console.log('CRASH', e.stack || e.message); process.exit(2); });
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0;
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const ready = async () => { const t0 = Date.now(); while (Date.now() - t0 < 15000) { if (await page.evaluate(() => !!(window.game && game.entities && game.player))) return; await page.waitForTimeout(100); } };
const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await page.waitForTimeout(100); } return null; };
const st = () => page.evaluate(() => { const p = game.player; const fol = game.entities.filter((e) => e.def?.type === 'follower' && !e.dead); let save = null; try { save = JSON.parse(localStorage.getItem('subtarune.save.v1')); } catch {}
  return { state: game.state, map: game.mapId, running: game.dialogue.running, party: [...game.party], inventory: [...game.inventory], flags: { ppaman: !!game.flags.ppaman_joined, gs: !!game.flags.void11_done }, stage: game.story.stage,
    followers: fol.map((f) => ({ id: f.id, d: Math.round(Math.hypot(f.x - p.x, f.y - p.y)) })), p: [Math.round(p.x), Math.round(p.y)], save: save && { map: save.map, spawn: save.spawn, party: save.party, x: save.x, y: save.y, flags: Object.keys(save.flags || {}).length } }; });
const BASE = 'http://localhost:8000/index.html';
const unlock = async () => { await page.mouse.click(500, 390); await page.waitForTimeout(150); };
// 타이틀: wait(아무 키) → pre → zoom(C 로 건너뜀) → locked(3초 뒤 C 로 시작)
const titleLocked = async () => {
  await until(async () => (await page.evaluate(() => game.state)) === 'title', 5000);
  await page.waitForTimeout(300); await page.keyboard.press('Space');
  await until(async () => (await page.evaluate(() => game.title.phase)) === 'zoom', 6000); await page.keyboard.press('KeyC');
  await until(async () => (await page.evaluate(() => game.title.phase)) === 'locked', 6000); await page.waitForTimeout(3300);
};

// 1) QA 청록숲3: 동료 둘 + 즉시 세이브
await page.goto(`${BASE}?qa=teal3`); await ready(); await unlock(); await page.waitForTimeout(400);
let q = await st();
check('?qa=teal3: party [gyeongsub, ppaman] (walk order), two followers near the player', q.map === 'teal3' && q.party.join() === 'gyeongsub,ppaman' && q.followers.length === 2 && q.followers.every((f) => f.d <= 96), JSON.stringify({ map: q.map, party: q.party, fol: q.followers }));
check('QA jump saved immediately (map teal3, party 2, spawn from_bottom)', !!q.save && q.save.map === 'teal3' && (q.save.party || []).length === 2 && q.save.spawn === 'from_bottom', JSON.stringify(q.save));

// 2) 타이틀 → 이어하기
await page.goto(BASE); await ready(); await unlock();
await titleLocked();
await page.keyboard.press('KeyC');
q = await until(async () => { const s = await st(); return s.state === 'field' && s.map === 'teal3' && !s.running ? s : null; }, 8000);
check('continue → teal3 with both followers standing next to the player (not left at the map spawn)', !!q && q.party.join() === 'gyeongsub,ppaman' && q.followers.length === 2 && q.followers.every((f) => f.d <= 96) && q.flags.ppaman && q.flags.gs && q.stage === 'void_fallen', JSON.stringify(q && { party: q.party, fol: q.followers, flags: q.flags, stage: q.stage }));
await page.screenshot({ path: `${S}/continue_01_teal3.png` });

// 3) 같은 세션에서 Esc → 타이틀 Q → 'void'(동료 없음): 상태가 섞이지 않는다
await page.keyboard.press('Escape');
await titleLocked();
await page.keyboard.press('KeyQ'); await page.waitForTimeout(200);
const idx = await page.evaluate(async () => (await import('/src/core/story.js')).QA_POINTS.findIndex((x) => x.id === 'void'));
for (let i = 0; i < idx; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(60); }
await page.keyboard.press('KeyC');
q = await until(async () => { const s = await st(); return s.state === 'field' && s.map === 'void' ? s : null; }, 8000);
check('title Q → void: party [], no followers, join flags cleared, inventory [] (no leftovers from teal3)', !!q && q.party.length === 0 && q.followers.length === 0 && !q.flags.ppaman && !q.flags.gs && q.inventory.length === 0, JSON.stringify(q && { party: q.party, fol: q.followers, flags: q.flags, inv: q.inventory }));
check('save now points at void with no party', !!q?.save && q.save.map === 'void' && (q.save.party || []).length === 0, JSON.stringify(q?.save));

// 4) ?qa=key (억빠맨만) → 이어하기 → 동료 1 이 옆에
await page.goto(`${BASE}?qa=key`); await ready(); await unlock(); await page.waitForTimeout(400);
q = await st(); check('?qa=key: party [ppaman] derived/explicit, one follower', q.party.join() === 'ppaman' && q.followers.length === 1, JSON.stringify({ party: q.party, fol: q.followers }));
await page.goto(BASE); await ready(); await unlock();
await titleLocked();
await page.keyboard.press('KeyC');
q = await until(async () => { const s = await st(); return s.state === 'field' && s.map === 'void4' ? s : null; }, 8000);
check('continue → void4 with 억빠맨 next to the player', !!q && q.party.join() === 'ppaman' && q.followers.length === 1 && q.followers[0].d <= 96, JSON.stringify(q && { party: q.party, fol: q.followers, p: q.p }));

// 5) 컷신 중엔 세이브가 안 바뀐다: void11 도착 컷신(맵 넘어가자마자 대사) 도중 세이브는 QA 직후 것 그대로
await page.goto(`${BASE}?qa=void11`); await ready(); await unlock();
q = await until(async () => { const s = await st(); return s.running ? s : null; }, 6000);
check('void11 arrival cutscene running; save is the pre-cutscene one (map void11, party [ppaman], spawn start)', !!q && q.save?.map === 'void11' && (q.save.party || []).join() === 'ppaman' && q.save.spawn === 'start', JSON.stringify(q?.save));

console.log(logs.join('\n')); console.log(`fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
