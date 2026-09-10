// 보라맵8 점프 뗏목 검증: ?qa=raft8 → C 탑승(출발 안 함) → 억빠맨 "..." / "수영해서 갈게요" → 동료 숨고 Swimmer(얼굴만) → ~4초 뒤 벽1에 쿵(thud)
//   → "어라" / "어떻게든" → 안내 창(C 로만) → C → 점프(jump sfx, jumpY>0) → 벽1 넘음 → 컷신 끝(정상 조작) → 벽2 안 누르고 쿵 → C 점프로 넘음 → 벽3~5 타이밍 점프
//   → 도착: Swimmer 제거, 억빠맨 뭍에서 마주 봄, 물 털기(jitter+물방울) → 대사 3줄 → void8_done. 기존 뗏목(void2)은 C 눌러도 점프 안 됨.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
process.on('uncaughtException', (e) => { console.log(logs.join('\n')); console.log('CRASH', e.message); process.exit(2); });
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0;
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const ready = async () => { const t0 = Date.now(); while (Date.now() - t0 < 15000) { if (await page.evaluate(() => !!(window.game && game.entities && game.player))) return; await page.waitForTimeout(100); } };
const st = () => page.evaluate(() => { const r = game.entities.find((e) => e.id === 'raft8'); const f = game.entities.find((e) => e.def?.type === 'follower'); const sw = game.entities.find((e) => e.def?.type === 'swimmer' && !e.dead); return { map: game.mapId, running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: game.textbox.node?.text || '', prompt: game.prompt?.text || null, ride: !!game.ride, p: [Math.round(game.player.x), Math.round(game.player.y)], pf: game.player.facing, f: f ? { x: Math.round(f.x), y: Math.round(f.y), vis: f.visible, facing: f.facing, jitter: !!f.jitter } : null, sw: sw ? { x: Math.round(sw.x), y: Math.round(sw.y), lift: Math.round(sw.lift) } : null, raft: r ? { x: Math.round(r.x), moving: r.moving, blocked: r.blocked?.id || null, jumping: r.jumping, jumpY: Math.round(r.jumpY), hits: r.hits, canJump: r.canJump() } : null, fx: game.fx.length, flags: { ...game.flags }, sfx: (window.__sfx || []).slice() }; });
const hookSfx = () => page.evaluate(() => { window.__sfx = []; const o = game.sound.sfx.bind(game.sound); game.sound.sfx = (n, opt) => { window.__sfx.push(n); return o(n, opt); }; });
const advance = async (max, stopWhen) => {   // 대사 넘기며 (speaker|text) 수집. stopWhen(s) 가 true 면 멈춤
  const out = []; for (let i = 0; i < max; i++) { await page.waitForTimeout(120); const s = await st(); if (stopWhen && stopWhen(s)) return { out, s }; if (s.box === 'waiting') { const k = (s.speaker || '') + '|' + s.text.replace(/\{[^}]*\}/g, ''); if (!out.includes(k)) out.push(k); await page.keyboard.press('KeyC'); } else if (s.box === 'typing') await page.keyboard.press('KeyC'); }
  return { out, s: await st() };
};
const walls = [908, 1420, 1932, 2444, 2956]; const END = 3136;

// ── 0) 기존 뗏목(void2): C 눌러도 점프 안 됨 ──
await page.goto('http://127.0.0.1:8000/index.html?qa=raft'); await ready(); await page.waitForTimeout(400);
await page.keyboard.press('KeyC'); await page.waitForTimeout(600);
{ let jumped = false; for (let i = 0; i < 5; i++) { await page.keyboard.press('KeyC'); await page.waitForTimeout(120); const q = await page.evaluate(() => ({ ride: !!game.ride, jy: game.ride ? game.ride.jumpY : -1, j: game.ride ? game.ride.jumping : false })); if (q.jy > 0 || q.j) jumped = true; }
  check('void2 raft: C during ride does NOT jump (no swimmer)', !jumped); }

// ── 1) 탑승 컷신 ──
await page.goto('http://127.0.0.1:8000/index.html?qa=raft8'); await ready(); await page.waitForTimeout(400); await hookSfx();
let s = await st(); check('qa=raft8: void8 dock with party, raft at start', s.map === 'void8' && s.f && s.raft && s.raft.x === 224 && !s.flags.void8_intro, JSON.stringify({ p: s.p, f: s.f, raft: s.raft }));
await page.keyboard.press('KeyC'); await page.waitForTimeout(500); s = await st();
check('C boards: player on raft, raft NOT moving, cutscene running, follower still on the dock (visible)', s.ride && s.raft && !s.raft.moving && s.running && s.f?.vis && s.p[0] > 220, JSON.stringify({ ride: s.ride, raft: s.raft, f: s.f, p: s.p }));
let r1 = await advance(40, (q) => q.raft?.moving);
check('lines: ... / 그냥 전 수영해서 갈게요', r1.out.some((l) => l === '억빠맨|* ...') && r1.out.some((l) => l.includes('수영해서 갈게요')), JSON.stringify(r1.out));
await page.waitForTimeout(400); s = await st();
check('after depart: follower hidden, swimmer behind raft (face only, left of raft)', s.raft.moving && s.f && !s.f.vis && s.sw && s.sw.x < s.raft.x && s.sw.lift === 0, JSON.stringify({ f: s.f, sw: s.sw, raft: s.raft }));
await page.waitForTimeout(1500); await page.screenshot({ path: `${S}/void8_01_swim.png` });
// ── 2) 벽1 쿵 ──
{ const t0 = Date.now(); while (Date.now() - t0 < 8000) { s = await st(); if (s.raft.blocked) break; await page.waitForTimeout(60); } }
const tBump = Date.now();
check('~4s later: bumps wall1, stops just before it, thud', s.raft.blocked === 'wall1' && !s.raft.moving && Math.abs(s.raft.x - (walls[0] - 58)) <= 3 && s.sfx.includes('thud'), JSON.stringify({ raft: s.raft, sfx: s.sfx.filter((n) => n === 'thud').length }));
await page.screenshot({ path: `${S}/void8_02_bump.png` });
let r2 = await advance(40, (q) => !!q.prompt);
check('lines: 어라 / 어떻게든 해볼게요 c를 눌러서', r2.out.some((l) => l.includes('어라')) && r2.out.some((l) => l.includes('c를 눌러서')), JSON.stringify(r2.out));
s = await st(); check('prompt window "C를 눌러보자" shown, textbox closed', s.prompt === 'C를 눌러보자' && s.box === 'closed', JSON.stringify({ prompt: s.prompt, box: s.box }));
await page.screenshot({ path: `${S}/void8_03_prompt.png` });
await page.keyboard.press('KeyX'); await page.waitForTimeout(300); s = await st(); check('prompt ignores X', s.prompt === 'C를 눌러보자');
// ── 3) C → 점프 ──
await page.keyboard.press('KeyC'); let maxJy = 0, swLift = 0, jumpShot = false, maxFxJump = 0;
{ const t0 = Date.now(); while (Date.now() - t0 < 2500) { s = await st(); maxJy = Math.max(maxJy, s.raft.jumpY); maxFxJump = Math.max(maxFxJump, s.fx); if (s.sw) swLift = Math.max(swLift, s.sw.lift); if (s.raft.jumpY > 40 && !jumpShot) { jumpShot = true; await page.screenshot({ path: `${S}/void8_04_jump.png` }); } if (!s.raft.jumping && s.raft.x > walls[0] + 30) break; await page.waitForTimeout(30); } }
check('C: jump sfx, raft rises ~2 blocks, swimmer lifts too, clears wall1 and keeps going', s.sfx.includes('jump') && maxJy >= 56 && swLift >= 40 && s.raft.x > walls[0] + 28 && s.raft.moving && !s.raft.blocked, JSON.stringify({ maxJy, swLift, raft: s.raft, jump: s.sfx.includes('jump') }));
check('jump splashes droplets (takeoff), no extra sound', maxFxJump > 0 && !s.sfx.slice(s.sfx.indexOf('jump')).includes('splash'), JSON.stringify({ maxFxJump }));
check('cutscene over → normal control', !s.running && s.raft.canJump);
// ── 4) 벽2: 안 누르면 쿵 → 멈춘 채 C 로 넘음 ──
{ const t0 = Date.now(); while (Date.now() - t0 < 5500) { s = await st(); if (s.raft.blocked) break; await page.waitForTimeout(40); } }
check('wall2 without jumping: bump and stop (thud again)', s.raft.blocked === 'wall2' && s.raft.hits === 2, JSON.stringify(s.raft));
await page.keyboard.press('KeyC'); { const t0 = Date.now(); while (Date.now() - t0 < 2500) { s = await st(); if (!s.raft.jumping && s.raft.x > walls[1] + 30) break; await page.waitForTimeout(30); } }
check('C from standstill clears wall2', s.raft.x > walls[1] + 28 && s.raft.moving && !s.raft.blocked, JSON.stringify(s.raft));
// ── 5) 벽3~5: 타이밍 점프 ──
for (const wx of walls.slice(2)) {
  { const t0 = Date.now(); while (Date.now() - t0 < 5500) { s = await st(); if (s.raft.x >= wx - 112 || s.raft.blocked) break; await page.waitForTimeout(15); } }
  await page.keyboard.press('KeyC');
  { const t0 = Date.now(); while (Date.now() - t0 < 2500) { s = await st(); if ((!s.raft.jumping && s.raft.x > wx + 30) || s.raft.blocked || !s.ride) break; await page.waitForTimeout(20); } }
  check(`timed jump clears wall at ${wx}`, !s.raft.blocked && (s.raft.x > wx + 28 || !s.ride), JSON.stringify(s.raft));
}
// ── 6) 도착 직전 점프(버그 재현: 공중에서 도착) → 뭍에 제대로 내려야 함 ──
{ const t0 = Date.now(); while (Date.now() - t0 < 4000) { s = await st(); if (s.raft.x >= END - 130 || !s.ride) break; await page.waitForTimeout(15); } }
await page.keyboard.press('KeyC');
{ const t0 = Date.now(); while (Date.now() - t0 < 4000) { s = await st(); if (!s.ride) break; await page.waitForTimeout(40); } }
await page.waitForTimeout(300); s = await st();
{ const onLand = await page.evaluate(() => !game.map.solidRect(game.player.x, game.player.y, game.player.w, game.player.h) && game.player.y >= 160 && game.player.y < 288);
  check('jumping right at arrival still lands on the shore (not in the void band)', onLand && s.p[0] > END + 56, JSON.stringify({ p: s.p, onLand })); }
await page.waitForTimeout(300); s = await st();
check('arrive: raft at end, player inland on the right shore, swimmer gone, follower on the water side facing the player (player faces left)', !s.ride && s.raft.x === END && !s.sw && s.f?.vis && s.f.x < s.p[0] && s.f.facing === 'right' && s.pf === 'left', JSON.stringify({ raft: s.raft, p: s.p, pf: s.pf, f: s.f, sw: s.sw }));
check('hits total = 2 (wall1 scripted + wall2 test)', s.raft.hits === 2, `hits=${s.raft.hits}`);
let sawJitter = false, maxFx = 0; { const t0 = Date.now(); while (Date.now() - t0 < 3000) { s = await st(); if (s.f?.jitter) sawJitter = true; maxFx = Math.max(maxFx, s.fx); if (sawJitter && maxFx > 0 && !fs.existsSync(`${S}/void8_05_shake.png`)) await page.screenshot({ path: `${S}/void8_05_shake.png` }); if (s.box === 'waiting' || s.box === 'typing') break; await page.waitForTimeout(40); } }
check('arrive cutscene: shake-off (jitter) + blue droplets', sawJitter && maxFx > 0, JSON.stringify({ sawJitter, maxFx }));
let r3 = await advance(40, (q) => !q.running && q.flags.void8_done);
check('lines: 네? 수영할 수 있었으면 / ... ... ... / 아 맞넹 ㅋㅋ', r3.out.some((l) => l.includes('수영할 수 있었으면')) && r3.out.some((l) => l.includes('... ... ...')) && r3.out.some((l) => l.includes('아 맞넹')), JSON.stringify(r3.out));
s = await st(); check('void8_done, cutscene over, flags intro/arrived', s.flags.void8_done && !s.running && s.flags.void8_intro && s.flags.void8_arrived, JSON.stringify(s.flags));
await page.screenshot({ path: `${S}/void8_06_end.png` });
// ── 7) Tab 비상탈출: 창 → 탈출 → 이 맵 입구(dock 스폰)로, 동료 뒤에, 뗏목은 끝에 그대로 ──
await page.keyboard.press('Tab'); await page.waitForTimeout(250);
check('Tab opens the escape window', await page.evaluate(() => game.state === 'escape'));
await page.screenshot({ path: `${S}/void8_07_escape.png` });
await page.keyboard.press('KeyX'); await page.waitForTimeout(200); check('X closes it', await page.evaluate(() => game.state === 'field'));
await page.keyboard.press('Tab'); await page.waitForTimeout(250); await page.keyboard.press('KeyC'); await page.waitForTimeout(1500); s = await st();
check('escape → back at the map entrance with party, no swimmer, and the raft is pulled back to the entry side (story flags kept)', s.map === 'void8' && Math.abs(s.p[0] - 190) < 8 && s.f?.vis && !s.sw && !s.ride && s.raft.x === 224 && s.flags.void8_done && s.flags.void8_intro, JSON.stringify({ p: s.p, f: s.f, raft: s.raft }));
await page.keyboard.press('KeyC'); await page.waitForTimeout(700); s = await st();
check('after escape the raft is rideable again from the entrance (no intro replay, swimmer auto)', s.ride && s.raft.moving && !s.running && !!s.sw, JSON.stringify({ ride: s.ride, raft: s.raft, sw: s.sw, running: s.running }));
await page.keyboard.press('Tab'); await page.waitForTimeout(250); await page.keyboard.press('KeyC'); await page.waitForTimeout(1500); s = await st();
check('escape mid-ride: back at entrance, raft back at start, follower visible', !s.ride && Math.abs(s.p[0] - 190) < 8 && s.raft.x === 224 && s.f?.vis && !s.sw, JSON.stringify({ p: s.p, raft: s.raft, f: s.f }));
// 재로드: 뗏목은 끝에, 동료는 뒤에, 컷신 안 반복
await page.goto('http://127.0.0.1:8000/index.html'); await ready(); for (let j = 0; j < 12; j++) { await page.keyboard.press('KeyC'); await page.waitForTimeout(400); if ((await page.evaluate(() => game.state)) !== 'title') break; } await page.waitForTimeout(500); s = await st();   // 타이틀 → 이어하기(자동저장)
check('continue (autosave): void8 with follower, no cutscene, raft at the entry side', s.map === 'void8' && s.raft?.x === 224 && s.f?.vis && !s.running && !s.sw, JSON.stringify({ raft: s.raft, f: s.f, running: s.running }));
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
