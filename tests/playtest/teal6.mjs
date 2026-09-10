// 청록숲6 정글 검증: ?qa=teal6 → 나무 많은 구불구불 맵(64×26), 캠프 3(칼날부리·늑대·두꺼비) → 캠프마다 가까이 가서 조우 → 자동 승리 → 40/50/60원·영구 제거·맵 브금 복귀 → 오른쪽 문 → teal7.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
process.on('uncaughtException', (e) => { try { console.log(logs.join('\n')); } catch {} console.log('CRASH', e.stack || e.message); process.exit(2); });
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
for (const f of fs.readdirSync(S)) if (f.startsWith('teal6_')) fs.unlinkSync(`${S}/${f}`);
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0; const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) errs.push(`[${m.type()}] ${m.text().slice(0, 160)}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await page.evaluate(fn); if (v) return v; await page.waitForTimeout(60); } return null; };
const st = () => page.evaluate(() => ({ map: game.mapId, running: game.dialogue.running, box: game.textbox.state, battle: !!game.battle, money: game.money, p: [Math.round(game.player.x), Math.round(game.player.y)], bgm: game.sound.bgmName,
  enemies: game.entities.filter((e) => e.def?.type === 'enemy' && !e.dead).map((e) => ({ id: e.id, x: Math.round(e.x), y: Math.round(e.y), sprite: e.def.sprite, img: !!(e.sprite && e.sprite.down) })),
  trees: game.entities.filter((e) => e.id?.startsWith('jt') && !e.dead).length, flags: Object.keys(game.flags).filter((k) => k.startsWith('teal6_')) }));
const stand = async (x, y, f) => { await page.evaluate(({ x, y, f }) => { game.player.x = x; game.player.y = y; game.player.facing = f; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); game.camera.snap(); }, { x, y, f }); await page.waitForTimeout(150); };

await page.goto('http://localhost:8000/index.html?qa=teal6'); await until(() => !!(window.game && game.entities && game.player), 15000); await page.keyboard.press('KeyX'); await page.waitForTimeout(400);
let s = await st();
const meta = await page.evaluate(async () => (await import('/src/data/maps.js')).MAPS.teal6.meta);
check('qa=teal6: jungle map with 3 camp monsters (칼날부리·늑대·두꺼비) and lots of trees', s.map === 'teal6' && s.enemies.length === 3 && ['razorbeak', 'wolf', 'toad'].every((k) => s.enemies.some((e) => e.sprite === k)) && s.trees >= 40 && s.enemies.every((e) => e.img), JSON.stringify({ enemies: s.enemies, trees: s.trees }));
await page.screenshot({ path: `${S}/teal6_01_start.png` });
const rows = await page.evaluate(async () => (await import('/src/data/maps.js')).MAPS.teal6.rows);
check('map is long both ways (64×26) and the road bends (steps down then up)', rows.length === 26 && rows[0].length === 64 && /[tuwn]/.test(rows[5][3]) && /[tuwn]/.test(rows[7][15]) && /[tuwn]/.test(rows[15][25]) && /[tuwn]/.test(rows[17][35]) && /[tuwn]/.test(rows[9][45]) && /[tuwn]/.test(rows[7][58]), '');
// 캠프마다: 몹 옆에 서서 조우 → 전투 자동 승리(적 HP 1) → 돈·제거·브금
const camps = [['bird', 40], ['wolf', 50], ['toad', 60]]; let money = s.money;
for (const [id, gain] of camps) {
  const e = (await st()).enemies.find((x) => x.id === id); if (!e) { check(`${id} present`, false, ''); continue; }
  await stand(e.x - 44, e.y, 'right');
  const started = await (async () => { const t0 = Date.now(); while (Date.now() - t0 < 9000) { const q = await st(); if (q.battle) return q; await page.keyboard.down('ArrowRight'); await page.waitForTimeout(100); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(40); } return null; })();
  check(`${id}: touching it → standard encounter`, !!started, '');
  if (!started) continue;
  await until(() => game.battle && game.battle.state === 'intro' ? true : null, 10000);
  if (id === 'wolf') { await page.waitForTimeout(500); await page.screenshot({ path: `${S}/teal6_02_battle_${id}.png` }); }
  await page.evaluate(() => { const b = game.battle; b.shown = b.text.length; for (const en of b.enemies) en.hp = 1; }); await page.waitForTimeout(700); await page.keyboard.press('KeyC');
  await until(() => game.battle?.state === 'menu' ? true : null, 6000);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('KeyC'); await page.waitForTimeout(160); const q = await page.evaluate(() => game.battle?.state); if (q === 'target') { await page.keyboard.press('KeyC'); await page.waitForTimeout(160); } }
  const won = await until(() => game.battle?.state === 'win' ? true : null, 12000); const wt = await page.evaluate(() => game.battle?.text || '');
  check(`${id}: win text mentions ${gain}원`, !!won && wt.includes(`${gain}원`), wt);
  await page.evaluate(() => { game.battle.shown = game.battle.text.length; }); await page.waitForTimeout(800); await page.keyboard.press('KeyC');
  const after = await (async () => { const t0 = Date.now(); while (Date.now() - t0 < 10000) { const q = await st(); if (!q.battle && !q.running) return q; if (q.box === 'waiting' || q.box === 'typing') await page.keyboard.press('KeyC'); await page.waitForTimeout(120); } return null; })();
  check(`${id}: money +${gain}, removed and flagged, map BGM back`, !!after && after.money === money + gain && !after.enemies.some((x) => x.id === id) && after.flags.includes(`teal6_${id}_defeated`) && after.bgm === 'hopes', JSON.stringify(after && { money: after.money, want: money + gain, enemies: after.enemies.map((x) => x.id), flags: after.flags, bgm: after.bgm }));
  money = after ? after.money : money;
}
await page.screenshot({ path: `${S}/teal6_03_cleared.png` });
// 출구
const L = await page.evaluate(async () => (await import('/src/data/maps.js')).MAPS.teal6.spawns.landing);
await stand(L.x, L.y, 'right'); await page.keyboard.down('ArrowRight');
const t1 = Date.now(); let mapNow = 'teal6'; while (Date.now() - t1 < 8000) { mapNow = await page.evaluate(() => game.mapId); if (mapNow === 'teal7') break; await page.waitForTimeout(100); }
await page.keyboard.up('ArrowRight');
check('right door → teal7', mapNow === 'teal7', mapNow);
check('no page/console errors', errs.length === 0, JSON.stringify(errs.slice(0, 4)));
console.log(logs.join('\n')); console.log(`fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
