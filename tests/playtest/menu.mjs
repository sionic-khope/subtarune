// 필드 메뉴 아이템 사용(먼지 HP+1 → 형섭) + 맵 중간 위치 세이브 → 이어하기 복원 (QA 스폰이 아닌 임의 위치, 동료 옆에). 2026-09-11 검증 보강.
import { chromium } from 'playwright-core';
process.on('uncaughtException', (e) => { try { console.log(logs.join('\n')); } catch {} console.log('CRASH', e.stack || e.message); process.exit(2); });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0; const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await page.evaluate(fn); if (v) return v; await page.waitForTimeout(80); } return null; };
const BASE = 'http://localhost:8000/index.html';
const titleLocked = async () => { await until(() => game.state === 'title', 5000); await page.waitForTimeout(300); await page.keyboard.press('Space'); await until(() => game.title.phase === 'zoom', 6000); await page.keyboard.press('KeyC'); await until(() => game.title.phase === 'locked', 6000); await page.waitForTimeout(3300); };

await page.goto(`${BASE}?qa=teal4`); await until(() => !!(window.game && game.entities && game.player), 15000); await page.keyboard.press('KeyX'); await page.waitForTimeout(300);
// 1) 메뉴에서 먼지 사용: 형섭 HP 50 → 51, 먼지 소모
await page.evaluate(() => { game.partyHp.hyungsub = 50; game.inventory.push('먼지', '바나나'); });
await page.keyboard.press('KeyV'); await page.waitForTimeout(200);
let m = await page.evaluate(() => ({ state: game.state, menu: game.menu }));
check('V opens the menu', m.state === 'menu' && !!m.menu, JSON.stringify(m));
await page.keyboard.press('KeyC'); await page.waitForTimeout(150);                 // 아이템 패널
await page.keyboard.press('KeyC'); await page.waitForTimeout(150);                 // 먼지 고름 → 누구에게
m = await page.evaluate(() => ({ sub: game.menu?.sub, pick: game.menu?.pick }));
check('items → pick 먼지 → target picker', m.sub === 0 && m.pick === 0, JSON.stringify(m));
await page.keyboard.press('KeyC'); await page.waitForTimeout(200);                 // 형섭에게
const after = await page.evaluate(() => ({ hp: game.hpOf('hyungsub'), inv: [...game.inventory] }));
check('먼지 used on 형섭: HP 50 → 51 and 먼지 removed from inventory', after.hp === 51 && !after.inv.includes('먼지') && after.inv.includes('바나나'), JSON.stringify(after));
for (let i = 0; i < 4; i++) { if ((await page.evaluate(() => game.state)) === 'field') break; await page.keyboard.press('KeyX'); await page.waitForTimeout(200); }   // 아이템 패널 → 메뉴 → 필드 (X 두 번)
check('X closes the menu back to field', (await page.evaluate(() => game.state)) === 'field', '');
// 2) 맵 중간 위치에서 세이브 → 이어하기: 그 자리 + 동료 옆에 + HP/인벤 유지
await page.evaluate(() => { game.player.x += 320; game.player.y += 0; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); game.autosave(); });
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('subtarune.save.v1')));
await page.goto(BASE); await until(() => !!(window.game && game.title), 15000); await page.keyboard.press('KeyX');
await titleLocked(); await page.keyboard.press('KeyC');
const q = await until(() => { if (game.state !== 'field' || game.mapId !== 'teal_east') return null; const p = game.player; const fol = game.entities.filter((e) => e.def?.type === 'follower').map((f) => Math.round(Math.hypot(f.x - p.x, f.y - p.y))); return { x: Math.round(p.x), y: Math.round(p.y), fol, hp: game.hpOf('hyungsub'), inv: [...game.inventory], party: [...game.party] }; }, 10000);
check('continue restores the mid-map position (not the spawn), followers next to the player, HP 51 and inventory kept', !!q && Math.abs(q.x - saved.x) <= 4 && Math.abs(q.y - saved.y) <= 4 && q.fol.length === 2 && q.fol.every((d) => d <= 96) && q.hp === 51 && q.inv.includes('바나나') && q.party.join() === 'gyeongsub,ppaman', JSON.stringify({ q, saved: { x: saved.x, y: saved.y } }));
check('no page errors', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
console.log(logs.join('\n')); console.log(`fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
