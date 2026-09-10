// 전투 패배 → "다시 일어난다" → 같은 전투 재시작(HP·적 복구). 승리만 검증하던 공백 보강 (2026-09-11).
import { chromium } from 'playwright-core';
process.on('uncaughtException', (e) => { try { console.log(logs.join('\n')); } catch {} console.log('CRASH', e.stack || e.message); process.exit(2); });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0; const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await page.evaluate(fn); if (v) return v; await page.waitForTimeout(80); } return null; };
const bt = () => page.evaluate(() => { const b = game.battle; return b && { state: b.state, text: b.text, members: b.members.map((m) => ({ id: m.id, hp: m.hp, max: m.maxHp, down: m.down })), enemies: b.enemies.map((e) => ({ id: e.id, hp: e.hp, max: e.maxHp, dead: e.dead })) }; });

await page.goto('http://localhost:8000/index.html?qa=teal4');
await until(() => !!(window.game && game.entities && game.player), 15000); await page.keyboard.press('KeyX'); await page.waitForTimeout(300);
await page.evaluate(() => { const w = game.entities.find((e) => e.id === 'walker1'); game.startEncounter(w); });
let b = await until(() => { const b = game.battle; return b && b.state === 'intro' ? true : null; }, 15000);
check('encounter → battle intro', !!b, '');
await page.evaluate(() => { const b = game.battle; b.shown = b.text.length; }); await page.waitForTimeout(700); await page.keyboard.press('KeyC');
b = await until(() => game.battle?.state === 'menu' ? true : null, 5000); check('intro → menu', !!b, '');
await page.evaluate(() => { const b = game.battle; for (let i = 0; i < 6; i++) b.hurtParty(999); });   // 전원 HP 0 → 패배
b = await bt();
check('all members down → lose state with the lose text', !!b && b.state === 'lose' && b.members.every((m) => m.down && m.hp === 0) && b.text.length > 0, JSON.stringify(b));
await page.waitForTimeout(1000); await page.keyboard.press('KeyC');                            // 다시 일어난다
b = await until(() => game.battle?.state === 'intro' ? true : null, 5000); const r = await bt();
check('C after lose → retry: back to intro, party HP restored, enemies restored', !!r && r.state === 'intro' && r.members.every((m) => !m.down && m.hp === m.max) && r.enemies.every((e) => !e.dead && e.hp === e.max), JSON.stringify(r));
check('no page errors', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
console.log(logs.join('\n')); console.log(`fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
