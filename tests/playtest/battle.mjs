// 전투 검증: ?qa=teal3 → 공구상자 컷신 → 전투 시작(징글·가운데 줌·흰 섬광) → 전투 화면: 왼쪽 형섭·경섭·빠맨(위→아래, HP 100/120/90), 오른쪽 CS 2마리(HP 6)
//   → 멤버마다 [공격하기]→적 선택→C → 셋이 순서대로 빠르게 달려가 한 대씩(적 HP −1) → 적 턴: 상자·소울·탄막, 맞으면 멤버 HP 감소 → 반복 → 승리 → 컷신 이어짐(플래그·CS 제거·HP 유지).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
process.on('uncaughtException', (e) => { console.log(logs.join('\n')); console.log('CRASH', e.message); process.exit(2); });
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
for (const f of fs.readdirSync(S)) if (f.startsWith('battle_')) fs.unlinkSync(`${S}/${f}`);   // 옛 스크린샷이 남아 새 상태를 가리지 않게
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0;
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const ready = async () => { const t0 = Date.now(); while (Date.now() - t0 < 15000) { if (await page.evaluate(() => !!(window.game && game.entities && game.player))) return; await page.waitForTimeout(100); } };
const st = () => page.evaluate(() => ({ vortex: game.vortex.active, fadeColor: game.fade.color, running: game.dialogue.running, box: game.textbox.state, text: (game.textbox.node?.text || '').replace(/\{[^}]*\}/g, ''), battle: !!game.battle, zoom: +(game.zoom?.s ?? 1).toFixed(2), bgm: game.sound.bgmName || null, flags: { ...game.flags }, partyHp: { ...game.partyHp }, cs: game.entities.filter((e) => e.id === 'cs1' || e.id === 'cs2').filter((e) => !e.dead).length, f: game.entities.filter((e) => e.def?.type === 'follower').length }));
const bt = () => page.evaluate(() => { const b = game.battle; if (!b) return null; return { state: b.state, memberIdx: b.memberIdx, menuIdx: b.menuIdx, targetIdx: b.targetIdx, members: b.members.map((m) => ({ id: m.id, name: m.name, hp: m.hp, max: m.maxHp, home: m.home, down: m.down, mode: m.action?.mode || 'idle', px: Math.round(m.action?.position?.[0] ?? m.home[0]), loaded: !!m.frames })), enemies: b.enemies.map((e) => ({ id: e.id, hp: e.hp, max: e.maxHp, x: e.x, y: e.y, dead: e.dead, loaded: !!e.img })), bullets: b.bullets.length, soul: { x: Math.round(b.soul.x), y: Math.round(b.soul.y), hits: b.soul.hits }, board: { w: Math.round(b.board.w), h: Math.round(b.board.h) }, text: b.text, plans: b.plans.length }; });
const stand = (x, y, f) => page.evaluate(([x, y, f]) => { game.player.x = x; game.player.y = y; game.player.facing = f; game.player.trail = []; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); game.camera.snap(); }, [x, y, f]);
const until = async (fn, ms, step = 60) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await page.waitForTimeout(step); } return null; };

await page.goto('http://127.0.0.1:8000/index.html?qa=teal3'); await ready(); await page.waitForTimeout(400);
const meta = await page.evaluate(async () => (await import('/src/data/maps.js')).MAPS.teal3.meta);
await stand(meta.box[0] + 4, meta.box[1] + 24, 'up'); await page.waitForTimeout(250); await page.keyboard.press('KeyC');
// 컷신 진행 → 전투 시작까지 (대사 넘기기)
let maxZoom = 1, sawVortex = false;
const started = await until(async () => { const s = await st(); maxZoom = Math.max(maxZoom, s.zoom); if (s.vortex) sawVortex = true; if (!s.battle && (s.box === 'waiting' || s.box === 'typing')) await page.keyboard.press('KeyC'); return s.battle ? s : null; }, 60000, 70);
check('toolbox scene leads into a battle (game.battle set)', !!started, '');
check('battle entry: close-up zoom at screen center (zoom > 1.5)', maxZoom > 1.5, 'maxZoom=' + maxZoom);
check('battle entry: sucked into a black vortex (vortex seen, fade color black) — no white flash', sawVortex && started && started.fadeColor === '0,0,0', JSON.stringify({ sawVortex, color: started?.fadeColor }));
check('battle bgm starts immediately when the battle object appears (no load delay)', started && started.bgm === 'rude_buster', started?.bgm);
await page.evaluate(() => { game.battle.rnd = () => 0.5; });   // 결정적: 탄막이 소울(가운데)을 정확히 노린다
let b = await until(async () => { const q = await bt(); return q && q.state === 'intro' && q.members.every((m) => m.loaded) && q.enemies.every((e) => e.loaded) ? q : null; }, 15000);
check('battle loaded: party hyungsub/gyeongsub/ppaman top→bottom on the left (HP 100/120/90), 2 CS on the right (HP 6 each)', !!b && b.members.map((m) => m.id).join() === 'hyungsub,gyeongsub,ppaman' && b.members.map((m) => m.max).join() === '100,120,90' && b.members.every((m, i) => i === 0 || m.home[1] > b.members[i - 1].home[1]) && b.members.every((m) => m.home[0] < 160) && b.enemies.length === 2 && b.enemies.every((e) => e.hp === 6 && e.x > 320), JSON.stringify({ m: b?.members.map((m) => [m.id, m.max, m.home]), e: b?.enemies.map((e) => [e.hp, e.x, e.y]) }));
let s = await st(); check('battle bgm Rude Buster', s.bgm === 'rude_buster', s.bgm);
{ const lay = await page.evaluate(() => ({ ys: game.battle.members.map((m) => m.home[1]), poses: game.battle.members.map((m) => m.pose), soulR: game.battle.soul.r }));
  check('party fits above the panel (feet y ≤ 240, spacing ~78px) and does the attack pose at intro', lay.ys.every((y) => y <= 240 && y >= 80) && lay.ys[1] - lay.ys[0] <= 80 && lay.poses.some((p) => p !== null && p !== undefined), JSON.stringify(lay));
  check('soul heart is Deltarune-sized (r ≥ 6)', lay.soulR >= 6, 'r=' + lay.soulR); }
{ const en = await page.evaluate(() => game.battle.enemies.map((e) => ({ id: e.id, name: e.name, img: e.img?.src?.split('/').slice(-2).join('/'), w: e.img?.width, h: e.img?.height })));
  check('enemies are red/blue CS drawn from PR #7 battle-left PNGs (64×64, image not sheet)', en.length === 2 && en[0].id === 'cs_red' && en[1].id === 'cs_blue' && en.every((e) => /cs-(red|blue)-battle-left\.png$/.test(e.img || '') && e.w === 64 && e.h === 64), JSON.stringify(en)); }
await page.screenshot({ path: `${S}/battle_01_intro.png` });
await page.waitForTimeout(700); await page.keyboard.press('KeyC');
b = await until(async () => { const q = await bt(); return q && q.state === 'menu' ? q : null; }, 4000);
check('after intro: menu for member 0 (형섭) with [공격하기][아이템]', !!b && b.memberIdx === 0 && b.menuIdx === 0, JSON.stringify({ state: b?.state, m: b?.memberIdx }));
await page.screenshot({ path: `${S}/battle_02_menu.png` });
{ const px = await page.evaluate(() => { const c = document.querySelector('canvas'); const ctx = c.getContext('2d'); const d = ctx.getImageData(0, 0, c.width, c.height).data; let white = 0, dark = 0, mid = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 97) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; n++; if (l > 245) white++; else if (l < 12) dark++; else mid++; } return { white: white / n, dark: dark / n, mid: mid / n, fade: game.fade.alpha }; });
  check('battle screen is actually visible (not covered by the white flash): fade 0, mostly dark with colored pixels', px.fade === 0 && px.white < 0.5 && px.mid > 0.02, JSON.stringify(px)); }
// 아이템: 지금은 없음
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(120); await page.keyboard.press('KeyC'); await page.waitForTimeout(150);
b = await bt(); check('[아이템] with nothing usable → "쓸 수 있는 아이템이 없다" text, back to menu', !!b && b.state === 'text' && b.text.includes('아이템이 없다'), JSON.stringify({ state: b?.state, text: b?.text }));
await page.waitForTimeout(600); await page.keyboard.press('KeyC'); await page.waitForTimeout(200);
b = await bt(); check('back in menu', !!b && b.state === 'menu', b?.state);
await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(100);
// X 뒤로가기: 적 선택 중 X → 메뉴, 다음 멤버 메뉴에서 X → 앞 멤버 선택 취소
await page.keyboard.press('KeyC'); await page.waitForTimeout(150); b = await bt(); check('[공격하기] → target picker inside the panel (no popup state)', !!b && b.state === 'target', b?.state);
await page.keyboard.press('KeyX'); await page.waitForTimeout(150); b = await bt(); check('X in target picker → back to the same member menu', !!b && b.state === 'menu' && b.memberIdx === 0, JSON.stringify({ s: b?.state, m: b?.memberIdx }));
await page.keyboard.press('KeyC'); await page.waitForTimeout(150); await page.keyboard.press('KeyC'); await page.waitForTimeout(150); b = await bt(); check('member 0 planned → member 1 menu', !!b && b.state === 'menu' && b.memberIdx === 1 && b.plans === 1, JSON.stringify({ s: b?.state, m: b?.memberIdx, plans: b?.plans }));
await page.keyboard.press('KeyX'); await page.waitForTimeout(150); b = await bt(); check('X in member 1 menu → back to member 0 with the plan undone', !!b && b.memberIdx === 0 && b.plans === 0, JSON.stringify({ m: b?.memberIdx, plans: b?.plans }));
// 한 라운드: 셋 다 공격하기 → 첫 적
const pickAll = async () => { for (let i = 0; i < 3; i++) { await page.keyboard.press('KeyC'); await page.waitForTimeout(150); const q = await bt(); if (q.state !== 'target') break; await page.keyboard.press('KeyC'); await page.waitForTimeout(150); } };
await pickAll();
b = await bt(); check('three plans made → act phase begins', !!b && (b.state === 'act' || b.plans === 3), JSON.stringify({ state: b?.state, plans: b?.plans }));
// 행동 관찰: 각 멤버가 빠르게 다가가 때리고 돌아온다
const seen = { approach: new Set(), attack: new Set(), far: new Set() }; let t0 = Date.now(); let hpStart = b.enemies[0].hp;
let stateAfter = null;
while (Date.now() - t0 < 12000) { const q = await bt(); if (!q) break; for (const m of q.members) { if (m.mode === 'approach') seen.approach.add(m.id); if (m.mode === 'attack') { seen.attack.add(m.id); if (!fs.existsSync(`${S}/battle_03_attack.png`)) await page.screenshot({ path: `${S}/battle_03_attack.png` }).catch(() => {}); } if (m.px > m.home[0] + 150) seen.far.add(m.id); } if (q.state === 'enemy-text' || q.state === 'bullets') { stateAfter = q; break; } await page.waitForTimeout(25); }
check('each member approached, attacked, and got far right (fast run)', seen.attack.size === 3 && seen.far.size === 3, JSON.stringify({ approach: [...seen.approach], attack: [...seen.attack], far: [...seen.far] }));
check('act phase took < 6s for 3 attacks (fast pacing)', stateAfter && (Date.now() - t0) < 6000, `${Date.now() - t0}ms`);
check('first enemy took 3 damage (1 per hit)', stateAfter && stateAfter.enemies[0].hp === hpStart - 3, JSON.stringify(stateAfter?.enemies));
// 적 턴: 상자·소울·탄막, 가만히 있으면 맞는다
b = await until(async () => { const q = await bt(); return q && q.state === 'bullets' ? q : null; }, 5000);
check('enemy turn: bullet board opens with the soul inside', !!b && b.board.w >= 150 && b.soul.x > 100 && b.soul.x < 380, JSON.stringify({ board: b?.board, soul: b?.soul }));
let maxBullets = 0, hpBefore = b ? b.members.map((m) => m.hp) : []; t0 = Date.now(); let hitObs = null;
while (Date.now() - t0 < 9000) { const q = await bt(); if (!q) break; maxBullets = Math.max(maxBullets, q.bullets); if (q.bullets > 3 && !fs.existsSync(`${S}/battle_04_bullets.png`)) await page.screenshot({ path: `${S}/battle_04_bullets.png` }).catch(() => {}); if (q.soul.hits > 0 && !hitObs) hitObs = q; if (q.state !== 'bullets') break; await page.waitForTimeout(40); }
b = await bt();
check('bullets were emitted (≥ 5) and standing still got hit at least once → a member lost HP (enemy damage 8)', maxBullets >= 5 && !!hitObs && b.members.some((m, i) => m.hp < hpBefore[i]) && b.members.every((m, i) => (hpBefore[i] - m.hp) % 8 === 0), JSON.stringify({ maxBullets, hits: b?.soul.hits, hp: b?.members.map((m) => m.hp) }));
b = await until(async () => { const q = await bt(); return q && q.state === 'menu' ? q : null; }, 8000);
check('board closes and the menu comes back for round 2', !!b && b.memberIdx === 0, b?.state);
// 이길 때까지 라운드 반복 (방향키로 피하기: 위아래 왔다갔다)
let rounds = 1; let won = null;
while (rounds < 8) {
  await pickAll(); rounds++;
  const r = await until(async () => { const q = await bt(); if (!q) return 'gone'; if (q.state === 'win') return q; if (q.state === 'bullets') { await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(120); await page.keyboard.up('ArrowLeft'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(120); await page.keyboard.up('ArrowRight'); } if (q.state === 'lose') { await page.waitForTimeout(900); await page.keyboard.press('KeyC'); } return null; }, 20000, 80);
  if (r === 'gone') break;
  const q = await until(async () => { const q = await bt(); return q && (q.state === 'menu' || q.state === 'win') ? q : null; }, 12000);
  if (q && q.state === 'win') { won = q; break; }
}
check('all enemies defeated → win state within a few rounds', !!won && won.enemies.every((e) => e.dead || e.hp === 0), JSON.stringify({ rounds, enemies: won?.enemies }));
await page.screenshot({ path: `${S}/battle_05_win.png` });
await page.waitForTimeout(800); await page.keyboard.press('KeyC');
const ended = await until(async () => { const s = await st(); if (s.box === 'waiting' || s.box === 'typing') await page.keyboard.press('KeyC'); return !s.battle && !s.running ? s : null; }, 20000, 100);
check('battle ends → cutscene continues to the end: flags teal3_cs_won + teal3_battle_pending, CS removed, bgm off, party regrouped', !!ended && ended.flags.teal3_cs_won === true && ended.flags.teal3_battle_pending === true && ended.cs === 0 && ended.bgm === null && ended.f === 2, JSON.stringify({ flags: ended?.flags?.teal3_cs_won, cs: ended?.cs, bgm: ended?.bgm, f: ended?.f }));
check('party HP carried out of battle (game.partyHp set for all three)', !!ended && ['hyungsub', 'gyeongsub', 'ppaman'].every((id) => Number.isFinite(ended.partyHp[id])), JSON.stringify(ended?.partyHp));
await page.screenshot({ path: `${S}/battle_06_after.png` });
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
