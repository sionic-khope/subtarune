// 옵젝영역0 검증: ?qa=obj0 → 얕은 물 일직선 길(60×14, a/A/j 타일, 나무 초록·보라 섞임, 배경 obj_forest, 브금 wind) → 걸으면 80px 마다 물걸음 소리(water_step 4종 중 하나, 음높이 살짝 랜덤) + 물결 고리, 멈추면 조용 → 마나샘(억빠맨이 발밑 물 먼저 → 흙맛 → 마나샘 → 전원 회복, 두 번째는 짧게) → 오른쪽 문 → obj1 → 왼쪽 문 → obj0 landing.
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
await page.evaluate(() => { window.__steps = []; const orig = game.sound.sfx.bind(game.sound); game.sound.sfx = (n, o) => { if (/^water_step/.test(n)) window.__steps.push({ t: performance.now(), name: n, rate: o?.rate, volume: o?.volume }); return orig(n, o); }; });
let s = await st();
const def = await page.evaluate(async () => { const M = (await import('/src/data/maps.js')).MAPS.obj0; return { name: M.name, bgm: M.bgm, backdrop: M.backdrop, rows: M.rows, meta: M.meta }; });
const road = def.rows.slice(6, 9).map((r) => r.slice(1, -1)).join('');
check('qa=obj0: 옵젝영역, straight shallow-water road (60×14, rows 6–8 all a/A/j), wind bgm, obj_forest backdrop, party of 3', s.map === 'obj0' && def.name === '옵젝영역' && def.bgm === 'wind' && s.bgm === 'wind' && def.backdrop === 'obj_forest' && def.rows.length === 14 && def.rows[0].length === 60 && /^[aAj]+$/.test(road) && road.includes('j') && s.party.length === 2, JSON.stringify({ map: s.map, name: def.name, bgm: [def.bgm, s.bgm], backdrop: def.backdrop, size: [def.rows.length, def.rows[0].length], party: s.party }));
const derived = await page.evaluate(() => ({ attack: game.attack, hpBonus: game.hpBonus, maxHp: game.maxHpOf('hyungsub'), inv: game.inventory, money: game.money }));
check('qa=obj0 state is derived from flags like real play: attack 2, HP bonus +20 (max 120), 2 bananas + 열쇠? + 보라색 코드 ?, money from CS/문지기 battles', derived.attack === 2 && derived.hpBonus === 20 && derived.maxHp === 120 && derived.inv.filter((n) => n === '바나나').length === 2 && derived.inv.includes('열쇠?') && derived.money >= 360, JSON.stringify(derived));
check('trees: dense (≥ 60), green and purple mixed, no trunk on the road', s.trees.length >= 60 && s.trees.some((i) => /tree_obj\.png/.test(i)) && s.trees.some((i) => /tree_obj_purple/.test(i)) && def.meta.trees === s.trees.length, JSON.stringify({ n: s.trees.length, purple: s.trees.filter((i) => /purple/.test(i)).length }));
await page.screenshot({ path: `${S}/obj0_01_start.png` });
// 발소리: 1.5초 달리면 water_step 이 80px 마다(발 딛는 프레임에) 2~4번(물방울 '짤랑' 긴 울림이 겹치지 않게), 음높이가 제각각, 물결 고리가 생긴다
await page.evaluate(() => { window.__steps = []; });
await page.keyboard.down('ArrowRight'); let maxRipples = 0; let shot = false; for (let i = 0; i < 15; i++) { await page.waitForTimeout(100); const q = await page.evaluate(() => game.ripples.length); maxRipples = Math.max(maxRipples, q); if (!shot && q > 0) { shot = true; await page.screenshot({ path: `${S}/obj0_02_walk.png` }); } } await page.keyboard.up('ArrowRight'); await page.waitForTimeout(100); const mid = { ripples: maxRipples };
s = await st(); const rates = new Set(s.steps.map((k) => k.rate)); const gaps = s.steps.slice(1).map((k, i) => k.t - s.steps[i].t);
check('running 1.5s on shallow water → a water step sound 2~4 times (≥ 0.4s apart), picked from the 4 recorded variants, slightly varied pitch, ripples appeared', s.steps.length >= 2 && s.steps.length <= 4 && s.steps.every((k) => ['water_step', 'water_step2', 'water_step3', 'water_step4'].includes(k.name) && k.rate >= 0.94 && k.rate <= 1.06 && k.volume === 0.6) && gaps.every((g) => g >= 400) && mid.ripples > 0, JSON.stringify({ n: s.steps.length, names: s.steps.map((k) => k.name), rates: [...rates].map((r) => +r.toFixed(3)), gaps: gaps.map(Math.round), ripples: mid.ripples }));
const n0 = s.steps.length; await page.waitForTimeout(700); s = await st();
check('standing still 0.7s → no more footsteps, ripples faded out', s.steps.length === n0 && s.ripples === 0, JSON.stringify({ n0, n: s.steps.length, ripples: s.ripples }));
// 천천히(X 누른 채) 걸으면 125px/s → 80px 마다 ≈ 초당 1.3번
await page.evaluate(() => { window.__steps = []; }); await page.keyboard.down('KeyX'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1500); await page.keyboard.up('ArrowRight'); await page.keyboard.up('KeyX'); await page.waitForTimeout(100);
s = await st();
check('walking slowly 1.5s → 1~3 footsteps (fewer than running)', s.steps.length >= 1 && s.steps.length <= 3, JSON.stringify({ n: s.steps.length }));
await stand(30 * 32, 7 * 32 + 8, 'right'); await page.waitForTimeout(300); await page.screenshot({ path: `${S}/obj0_03_middle.png` });
// 마나샘: 억빠맨이 발밑 물을 먼저 떠 마심(첨벙, 흙맛) → 마나샘 → 셋이 마심 → 전원 HP 회복. 두 번째는 "졸졸" + 회복만
const lines = []; const sfxSeen = [];
await page.evaluate(() => { const orig = game.sound.sfx.bind(game.sound); const prev = game.sound.sfx; game.sound.sfx = (n, o) => { (window.__sfx ||= []).push(n); return prev(n, o); }; });
const pump = async (ms) => { await until(() => game.dialogue.running ? true : null, 2500); const t0 = Date.now(); while (Date.now() - t0 < ms) { const q = await page.evaluate(() => ({ running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: (game.textbox.node?.text || '').replace(/\{[^}]*\}/g, '') })); if (!q.running) return; const k = (q.speaker || '') + '|' + q.text; if ((q.box === 'waiting' || q.box === 'typing') && lines[lines.length - 1] !== k) lines.push(k); if (q.box === 'waiting' || q.box === 'typing') await page.keyboard.press('KeyC'); await page.waitForTimeout(70); } };
const blue = await page.evaluate(() => { const b = game.entities.find((e) => e.id === 'blue'); return b ? { x: b.x, y: b.y, cols: b.anim?.cols } : null; });
check('mana spring prop (blue_buff, 3-frame strip) sits on the top forest edge touching the road', !!blue && blue.cols === 3 && blue.y === 6 * 32 - 12, JSON.stringify(blue));
await page.evaluate(() => { game.partyHp.hyungsub = 30; game.partyHp.gyeongsub = 40; game.partyHp.ppaman = 20; });
await stand(blue.x + 4, blue.y + 12 + 2, 'up'); await page.keyboard.press('KeyC'); await page.waitForTimeout(300); await pump(30000);
const hp1 = await page.evaluate(() => [game.hpOf('hyungsub'), game.hpOf('gyeongsub'), game.hpOf('ppaman')]); const maxHp = await page.evaluate(() => [game.maxHpOf('hyungsub'), game.maxHpOf('gyeongsub'), game.maxHpOf('ppaman')]); const sfx1 = await page.evaluate(() => window.__sfx || []);
check('mana spring: "물 위에 서 있잖아요" → 억빠맨 drinks the floor water (splash) → "퉤 흙맛" → drinks the spring → "시원하네" → all three drink → healed to max (120/140/110 with the 레드·블루 buff) → "발밑 물은 마시지 마세요" / "너만 마셨어"', ['여기도 있네', '물 위에 서 있잖아요', '뭐가 달라요', '파란색이잖아', '발밑의 물을 한 모금', '흙맛', '그걸 왜 마셔', '비교해 보려고요', '이번엔 마나샘 물을', '시원하네', '한 모금씩 마셨다', '회복되었다', '마시지 마세요', '너만 마셨어'].every((k) => lines.some((l) => l.includes(k))) && sfx1.includes('splash') && sfx1.includes('heal') && hp1.join() === maxHp.join() && maxHp.join() === '120,140,110', JSON.stringify({ lines, hp1, maxHp }));
await page.screenshot({ path: `${S}/obj0_04_spring.png` });
await page.evaluate(() => { game.partyHp.hyungsub = 10; }); lines.length = 0; await page.waitForTimeout(600); await stand(blue.x + 4, blue.y + 14, 'up'); await page.waitForTimeout(400); await page.keyboard.press('KeyC'); await page.waitForTimeout(300); await pump(15000);
const hp2 = await page.evaluate(() => game.hpOf('hyungsub'));
check('mana spring again: short line ("졸졸 흐른다") + heal only (rest point), no floor-water gag', lines.some((l) => l.includes('졸졸 흐른다')) && !lines.some((l) => l.includes('흙맛')) && hp2 === maxHp[0], JSON.stringify({ lines, hp2 }));
// 출구 → obj1 → 되돌아오기
const L = def.rows && (await page.evaluate(async () => (await import('/src/data/maps.js')).MAPS.obj0.spawns.landing));
await page.evaluate(() => { game.flags.obj1_meet_seen = true; });   // obj1 도착 연출(대포 밀기)은 obj1.mjs 가 검사 — 여기선 문 왕복만
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
