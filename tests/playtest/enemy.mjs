// 새 적 범용 검증 (2026-09-11 /enemy 스킬): node enemy.mjs <적id> [--attack=timing] [--enemy=bullets] [--pattern=N]  (N: 적 턴에 patterns[N] 을 강제 — 템플릿 하나씩 스크린샷 enemy_<id>_pN_03_bullets.png)
//   전투를 직접 열어(startBattle) 한 라운드를 돈다: 인트로 → 메뉴(잡담 문구) → 세 멤버 공격 → 적 턴 준비(말풍선 speak) → 탄막(모양이 있는 탄이 실제로 나오는지) → 회피 → 메뉴
//   → 적 HP 를 1 로 만들고 이겨서 승리 문구·돈 → 전투 종료. 페이지 에러 0. 스크린샷 enemy_<id>_*.png
import { chromium } from 'playwright-core';
import fs from 'node:fs';
process.on('uncaughtException', (e) => { try { console.log(logs.join('\n')); } catch {} console.log('CRASH', e.stack || e.message); process.exit(2); });
const id = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'cs_red';
const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0; const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) errs.push(`[${m.type()}] ${m.text().slice(0, 160)}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await page.evaluate(fn); if (v) return v; await page.waitForTimeout(60); } return null; };
const bt = () => page.evaluate(() => { const b = game.battle; if (!b) return null; return { state: b.state, text: b.text, bubble: b.bubble?.text || null, bullets: b.bullets.map((x) => x.shape), members: b.members.map((m) => ({ id: m.id, hp: m.hp })), enemies: b.enemies.map((e) => ({ id: e.id, hp: e.hp, max: e.maxHp, dead: e.dead, img: !!e.img })), gimmick: !!b.gimmick, money: game.money }; });

await page.goto('http://localhost:8000/index.html?qa=teal4'); await until(() => !!(window.game && game.entities && game.player), 15000); await page.keyboard.press('KeyX'); await page.waitForTimeout(300);
const known = await page.evaluate(async (id) => !!(await import('/src/data/enemies.js')).ENEMIES[id], id);
check(`enemy '${id}' exists in src/data/enemies.js`, known, ''); if (!known) { console.log(logs.join('\n')); console.log('fails=1'); process.exit(1); }
await page.evaluate(({ id, attack, enemy }) => { game.startBattle({ enemies: [id], bgm: 'rude_buster', bg: 'teal', modes: { attack, enemy } }); }, { id, attack: opt.attack || 'rush', enemy: opt.enemy || 'bullets' });
let b = await until(() => game.battle && game.battle.state === 'intro' && game.battle.enemies.every((e) => e.img) ? true : null, 15000); check('battle opens: intro with the enemy image loaded', !!b, JSON.stringify(await bt()));
await page.screenshot({ path: `${S}/enemy_${id}_01_intro.png` });
await page.evaluate(() => { game.battle.shown = game.battle.text.length; }); await page.waitForTimeout(700); await page.keyboard.press('KeyC');
b = await until(() => game.battle?.state === 'menu' ? true : null, 6000); const q0 = await bt();
check('menu: idle flavor line shows with the buttons (starts with "* ")', !!b && typeof q0.text === 'string' && q0.text.startsWith('* '), JSON.stringify({ text: q0?.text }));
// 세 멤버: 공격하기 → 첫 적 → C
for (let i = 0; i < 3; i++) { await page.keyboard.press('KeyC'); await page.waitForTimeout(160); const s = await bt(); if (s.state === 'target') { await page.keyboard.press('KeyC'); await page.waitForTimeout(160); } }
b = await until(() => game.battle?.state === 'act' ? true : null, 4000); check('three plans → act', !!b, (await bt())?.state);
const tag = opt.pattern !== undefined ? `${id}_p${opt.pattern}` : id;
if (opt.pattern !== undefined) await page.evaluate((n) => { for (const e of game.battle.enemies) e.patternIdx = n; }, Number(opt.pattern));
if ((opt.attack || 'rush') === 'timing') {                                                    // 타이밍 모드: 마커가 가운데 근처일 때 C (0.37s 주기)
  let hits = 0; for (let k = 0; k < 3; k++) { const ok = await until(() => game.battle?.gimmick ? true : null, 4000); if (!ok) break; await page.waitForTimeout(340); await page.keyboard.press('KeyC'); hits++; await page.waitForTimeout(700); }
  check('timing attack mode ran for each member', hits === 3, String(hits));
}
const prep = await until(() => game.battle?.state === 'enemy-prep' || game.battle?.state === 'enemy-mode' ? true : null, 12000); const qp = await bt();
check('enemy turn: prep (bubble with a speak line) or a custom enemy mode', !!prep && (qp.state === 'enemy-mode' || (typeof qp.bubble === 'string' && qp.bubble.length > 0)), JSON.stringify({ state: qp?.state, bubble: qp?.bubble }));
await page.waitForTimeout(600); await page.screenshot({ path: `${S}/enemy_${id}_02_prep.png` });
const shapes = new Set(); let maxBullets = 0; let dodgeDir = 'ArrowLeft'; const t0 = Date.now(); let shot = false;
while (Date.now() - t0 < 12000) { const s = await bt(); if (!s) break; if (s.state === 'bullets') { maxBullets = Math.max(maxBullets, s.bullets.length); s.bullets.forEach((x) => shapes.add(x)); if (!shot && s.bullets.length >= 1) { shot = true; await page.waitForTimeout(450); await page.screenshot({ path: `${S}/enemy_${tag}_03_bullets.png` }); } await page.keyboard.down(dodgeDir); await page.waitForTimeout(120); await page.keyboard.up(dodgeDir); dodgeDir = dodgeDir === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft'; }
  else if (s.state === 'menu' || s.state === 'win' || s.state === 'lose') break; else await page.waitForTimeout(80); }
const q1 = await bt();
check('bullets were emitted during the enemy turn and the round came back to the menu', maxBullets > 0 && q1?.state === 'menu', JSON.stringify({ maxBullets, shapes: [...shapes], state: q1?.state }));
check('bullets use motif shapes (not only circles) — enemy character shows in its attack', [...shapes].some((s) => s && s !== 'circle'), JSON.stringify([...shapes]));
// 이기기: 적 HP 1 → 공격
await page.evaluate(() => { for (const e of game.battle.enemies) e.hp = 1; });
for (let i = 0; i < 3; i++) { await page.keyboard.press('KeyC'); await page.waitForTimeout(160); const s = await bt(); if (s.state === 'target') { await page.keyboard.press('KeyC'); await page.waitForTimeout(160); } }
if ((opt.attack || 'rush') === 'timing') { for (let k = 0; k < 3; k++) { const ok = await until(() => game.battle?.gimmick ? true : null, 4000); if (!ok) break; await page.waitForTimeout(340); await page.keyboard.press('KeyC'); await page.waitForTimeout(700); } }
const won = await until(() => game.battle?.state === 'win' ? true : null, 12000); const qw = await bt();
check('enemy defeated → win text with money', !!won && /승리/.test(qw.text) && /원/.test(qw.text), JSON.stringify({ state: qw?.state, text: qw?.text }));
await page.screenshot({ path: `${S}/enemy_${id}_04_win.png` });
await page.evaluate(() => { game.battle.shown = game.battle.text.length; }); await page.waitForTimeout(800); await page.keyboard.press('KeyC');
const ended = await until(() => !game.battle ? true : null, 8000); check('C after win → battle closes', !!ended, '');
check('no page errors / console errors', errs.length === 0, JSON.stringify(errs.slice(0, 4)));
console.log(logs.join('\n')); console.log(`fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
