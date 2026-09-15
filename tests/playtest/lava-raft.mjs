// 용광로 복도 + 용암 수로(BUILD190): QA youngcle13(배경·브금) → QA lava_raft: 뗏목 옆에서 C → 컷신(형섭 걸어서 탑승, 왼쪽 시선, 빠맨·경섭 걸어가 용암에, 출발)
//   → 자동 점프(하늘색 한 번, 붉은 2단)로 한 줄 수로 오른쪽 끝 도착. 실행: tests/playtest/run.sh lava-raft
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'lava_' + n + '.png') }); };
const pressC = async () => { await page.keyboard.press('KeyC'); await page.waitForTimeout(240); };
const key = () => page.evaluate(() => `${window.game.dialogue.i}:${window.game.textbox.node?.text ?? ''}`);
const advance = async () => { const before = await key(); for (let i = 0; i < 4; i++) { await pressC(); const now = await key(); const running = await page.evaluate(() => window.game.dialogue.running); if (now !== before || !running) return; } };
const st = () => page.evaluate(() => { const g = window.game; const ent = id => g.entities.find(e => e.id === id && !e.dead); const r = ent('raft14a'), b = ent('raft14b');
  return { map: g.mapId, dialogue: g.dialogue.running, text: g.textbox.node?.text?.slice(0, 30), ride: g.ride ? g.ride.id : null, px: Math.round(g.player.x), py: Math.round(g.player.y),
    raftA: r ? { x: Math.round(r.x), y: Math.round(r.y), riding: r.riding, moving: r.moving, swimmers: r.swimmers.filter(s => !s.dead).map(s => s.id), sweeps: r.sweeps, hits: r.hits } : null,
    raftB: b ? { x: Math.round(b.x), y: Math.round(b.y), riding: b.riding, sweeps: b.sweeps } : null, dj: !!g.flags.double_jump, fa: g.flags.raft_raft14a, fb: g.flags.raft_raft14b }; });
// 자동 연주: 앞(진행 방향) 120px 안의 켜진 장애물을 보면 점프, clear ≥ 72 면 0.38초 뒤 한 번 더(2단). 도착(riding=false)하거나 40초면 끝
const autoRide = (id) => page.evaluate((id) => new Promise(resolve => {
  const g = window.game; const r = g.entities.find(e => e.id === id && !e.dead); const t0 = performance.now(); let last = 0;
  const tick = () => {
    if (!r || !r.riding || performance.now() - t0 > 40000) return resolve({ riding: !!r?.riding, sweeps: r?.sweeps, hits: r?.hits });
    const ax = r.axis, sgn = r.dirSign, pos = ax === 'x' ? r.x : r.y;
    // 점프 거리: 높은 것(clear ≥ 72, 2단)은 일찍(가로 125 / 세로 115), 낮은 것은 정점이 벽 가운데를 지나게(가로 100 / 세로 76)
    const near = (e) => ((e.def.clear || 0) >= 72 ? (ax === 'y' ? 115 : 125) : (ax === 'y' ? 76 : 100));
    const ahead = g.entities.filter(e => e.def?.obstacle && !e.dead && e.pulseOn !== false).map(e => ({ e, d: sgn * ((ax === 'x' ? e.x : e.y) - pos) })).filter(o => o.d > 0 && o.d < near(o.e)).sort((a, b) => a.d - b.d)[0];
    if ((ahead || r.blocked) && !r.jumping && performance.now() - last > 600) { last = performance.now(); const w = ahead ? ahead.e : r.blocked; r.jump(true); if ((w.def.clear || 0) >= 72) setTimeout(() => r.jump(true), 380); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), id);
try {
  // ① 용광로 복도
  await page.goto('http://localhost:8000/?qa=youngcle13');
  await page.waitForFunction(() => window.game && window.game.mapId === 'youngcle13' && !window.game.dialogue.running, null, { timeout: 25000 });
  await page.waitForTimeout(1200); await cap('corridor');
  const cor = await page.evaluate(() => { const g = window.game; const s = g.sound; const names = JSON.stringify([s.bgmName, s.currentBgm, s.bgmId, s.bgm && (s.bgm.name || s.bgm.src), s.current]); return { map: g.mapId, tile: g.map?.rows?.[8]?.[2], bgm: names.includes('pandora_palace') }; });
  check(cor.map === 'youngcle13' && cor.tile === 'F', '용광로 복도(차콜·파랑 철 바닥 F) ' + JSON.stringify(cor));
  console.log('bgm check', JSON.stringify(cor));
  // ② 용암 수로: 오른쪽으로 걸어가 뗏목 옆에서 C → 컷신(형섭이 걸어서 올라탐)
  await page.goto('http://localhost:8000/?qa=lava_raft');
  await page.waitForFunction(() => window.game && window.game.mapId === 'youngcle14' && !window.game.dialogue.running, null, { timeout: 25000 });
  await page.waitForTimeout(800); await cap('entrance');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.game.player.x >= 340, null, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(700); await page.keyboard.up('ArrowRight');
  let s = await st(); check(!s.dialogue && !s.ride && s.px >= 340, '뗏목 옆까지 걸어와도 저절로 이벤트가 시작되지 않는다(C 로 시작) ' + JSON.stringify([s.dialogue, s.ride, s.px]));
  const p0 = await page.evaluate(() => [Math.round(window.game.player.x), Math.round(window.game.player.y)]);
  await pressC();
  await page.waitForFunction(() => window.game.dialogue.running, null, { timeout: 6000 }).catch(() => {});
  // 형섭이 걸어서 올라타는 중간 프레임(순간이동 아님): 대사 첫 줄이 뜨기 전 위치가 부두와 뗏목 사이
  const walked = await page.evaluate(() => new Promise(resolve => { const g = window.game; const xs = []; const t0 = performance.now(); const tick = () => { xs.push(Math.round(g.player.x)); if (g.ride || performance.now() - t0 > 3000) resolve(xs); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); }));
  const steps = new Set(walked).size;
  check(steps >= 4, '형섭이 뗏목까지 걸어서 올라탄다(x 가 여러 단계로 변함) ' + JSON.stringify([p0, walked.slice(0, 3), walked.slice(-2), steps]));
  await page.waitForTimeout(400); await cap('intro'); s = await st();
  check(s.dialogue && s.ride === 'raft14a' && s.raftA && s.raftA.riding && !s.raftA.moving, '탑승 뒤 대사(출발 전) ' + JSON.stringify([s.dialogue, s.ride, s.raftA]));
  // ‘경섭이형 이거 저희 들어가야겠죠’ ~ ‘너가 먼저 들어가’ 동안 요플래는 왼쪽(둘)을 본다
  let leftOk = null;
  for (let i = 0; i < 30; i++) { s = await st(); if (!s.dialogue) break; if ((s.text || '').includes('너가 먼저 들어가') && !(s.text || '').includes('라니까')) { leftOk = await page.evaluate(() => window.game.player.facing); await cap('look_left'); break; } await advance(); }
  check(leftOk === 'left', '“너가 먼저 들어가”까지 요플래가 왼쪽을 본다 ' + JSON.stringify(leftOk));
  // 빠맨이 걸어가서 뛰어드는지: 헤엄 시작 전 빠맨 동료의 x 가 부두 가장자리(≥ 330)까지 갔는지
  let ppX = null;
  for (let i = 0; i < 30; i++) { s = await st(); if (!s.dialogue) break; if (s.raftA.swimmers.includes('ppaman_swim')) break; ppX = await page.evaluate(() => { const e = window.game.entities.find(e => e.id === 'ppaman' && e.def?.type === 'follower' && !e.dead); return e ? Math.round(e.x) : null; }); await advance(); }
  await cap('ppaman_in'); s = await st();
  check(s.raftA.swimmers.includes('ppaman_swim') && !s.raftA.swimmers.includes('gyeongsub_swim') && ppX !== null && ppX >= 330, '억빠맨이 부두 가장자리까지 걸어가 먼저 용암에(경섭은 아직) ' + JSON.stringify([s.raftA.swimmers, ppX]));
  for (let i = 0; i < 30; i++) { s = await st(); if (!s.dialogue) break; await advance(); }
  await page.waitForFunction(() => { const r = window.game.entities.find(e => e.id === 'raft14a'); return r && r.moving; }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500); await cap('depart'); s = await st();
  check(!s.dialogue && s.raftA.moving && s.raftA.swimmers.length === 2 && s.dj, '대사 끝 → 둘 다 용암에서 헤엄, 2단 점프 켜짐, 출발 ' + JSON.stringify([s.raftA.moving, s.raftA.swimmers, s.dj]));
  // ③ 한 줄 수로 자동 점프(하늘색 = 한 번, 붉은 = 2단)
  const ride = await autoRide('raft14a'); await page.waitForTimeout(600); await cap('landing'); s = await st();
  check(!ride.riding && s.fa === 1 && !s.ride && s.px > 1560, '오른쪽 끝 착지(빔·돌을 점프로) ' + JSON.stringify([ride, s.fa, s.px, s.py]));
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
