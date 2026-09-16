// 용광로 복도 + 용암 수로(BUILD190): QA youngcle13(배경·브금) → QA lava_raft: 뗏목 옆에서 C → 컷신(형섭 걸어서 탑승, 왼쪽 시선, 빠맨·경섭 걸어가 용암에, 출발)
//   → 자동 점프(한 덩어리 한 번, 두 개 쌓임 2단)로 오른쪽 끝 도착 → 두 번째 뗏목 C(걸어서 탑승) → 세로 수로 완주 → 세 번째 뗏목 C → 다시 오른쪽 완주 → 열린 끝(BUILD192: 철문·안내판 없음, 입구·출구는 가장자리까지 열린 통로). 실행: tests/playtest/run.sh lava-raft
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
const st = () => page.evaluate(() => { const g = window.game; const ent = id => g.entities.find(e => e.id === id && !e.dead); const r = ent('raft14a'), b = ent('raft14b'), c = ent('raft14c');
  return { map: g.mapId, dialogue: g.dialogue.running, text: g.textbox.node?.text?.slice(0, 30), ride: g.ride ? g.ride.id : null, px: Math.round(g.player.x), py: Math.round(g.player.y),
    raftA: r ? { x: Math.round(r.x), y: Math.round(r.y), riding: r.riding, moving: r.moving, swimmers: r.swimmers.filter(s => !s.dead).map(s => s.id), sweeps: r.sweeps, hits: r.hits } : null,
    raftB: b ? { x: Math.round(b.x), y: Math.round(b.y), riding: b.riding, sweeps: b.sweeps } : null, raftC: c ? { x: Math.round(c.x), y: Math.round(c.y), riding: c.riding, moving: c.moving, sweeps: c.sweeps } : null,
    tile: g.map?.rows?.[Math.floor(g.player.y / 32)]?.[Math.floor(g.player.x / 32)], dj: !!g.flags.double_jump, fa: g.flags.raft_raft14a, fb: g.flags.raft_raft14b, fc: g.flags.raft_raft14c }; });
// 뗏목 옆에 세워 두고 C(keydown/keyup) → 걸어서 올라타는 동안의 좌표열(순간이동이면 값이 두어 개뿐)
const walkOnAt = (id, dx, dy, facing, axis) => page.evaluate(([id, dx, dy, facing, axis]) => new Promise(resolve => { const g = window.game; const r = g.entities.find(e => e.id === id && !e.dead); g.player.x = r.x + dx; g.player.y = r.y + dy; g.player.facing = facing;
  setTimeout(() => { const fire = (type) => { const ev = new KeyboardEvent(type, { key: 'c', code: 'KeyC', bubbles: true }); window.dispatchEvent(ev); document.dispatchEvent(ev); }; fire('keydown'); setTimeout(() => fire('keyup'), 60);
    const vs = []; const t0 = performance.now(); const tick = () => { vs.push(Math.round(axis === 'x' ? g.player.x : g.player.y)); if (g.ride || performance.now() - t0 > 3000) resolve(vs); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); }, 200); }), [id, dx, dy, facing, axis]);
// 자동 연주: 앞(진행 방향) 켜진 장애물이 가까우면 점프(높은 것 가로 125/세로 95, 낮은 것 100/76), clear ≥ 72 면 0.38초 뒤 한 번 더(2단). 도착(riding=false)하거나 40초면 끝
//   쓸려 돌아가는 동안(sweeping)엔 안 뛴다(자동 재출발). 낮은 돌에 쿵 하고 멈춘 상태(blocked, sweep 아님)는 점프로 다시 출발
//   흔들리는(oscillate) 2층 빔: 2단 점프가 80px 이상인 구간은 뗏목 앞 ~110~194px 창. 빔이 다가오는 중(80ms 창으로 잰 v < -10)이면 사람이 하듯 더 일찍(+32px) 뛴다.
//   쓸려 돌아간 뒤 자동 재출발은 시각이 고정이라 빔 위상에 잠길 수 있어(주기 2.2s ≈ 재시도 주기) 시도마다 점프 거리를 8px 씩 바꾼다
const autoRide = (id) => page.evaluate((id) => new Promise(resolve => {
  const g = window.game; const r = g.entities.find(e => e.id === id && !e.dead); const t0 = performance.now(); let last = 0, frames = 0, pending = null; const seen = new Map();
  const tick = () => {
    frames += 1;
    if (!r || !r.riding || performance.now() - t0 > 40000) return resolve({ riding: !!r?.riding, sweeps: r?.sweeps, hits: r?.hits, fps: Math.round(frames / ((performance.now() - t0) / 1000)) });
    // 2단 점프의 두 번째 C 는 벽시계가 아니라 뗏목의 점프 시각(게임 시간)으로 — 프레임이 느려도 같은 높이에서 뛴다
    if (pending && r.jumping && !r.doubled && r.jumpT >= 0.36) { pending = null; r.jump(true); }
    if (pending && !r.jumping) pending = null;
    const ax = r.axis, sgn = r.dirSign, pos = ax === 'x' ? r.x : r.y, now = performance.now();
    const near = (e, v) => ((e.def.clear || 0) >= 72 ? (ax === 'y' ? 95 : 118 + ((r.sweeps || 0) % 4) * 8 + (e.def.oscillate && v < -10 ? 32 : 0)) : (ax === 'y' ? 76 : 100));
    const infos = g.entities.filter(e => e.def?.obstacle && !e.dead).map(e => { const p = ax === 'x' ? e.x : e.y; const rec = seen.get(e) || { v: 0, lp: p, lt: now }; if (now - rec.lt >= 80) { rec.v = sgn * (p - rec.lp) / ((now - rec.lt) / 1000); rec.lp = p; rec.lt = now; } seen.set(e, rec); return { e, d: sgn * (p - pos), v: rec.v }; });
    const ahead = infos.filter(o => o.e.pulseOn !== false && o.d > 0 && o.d < near(o.e, o.v)).sort((a, b) => a.d - b.d)[0];
    const stopped = r.blocked && !r.blocked.def.sweep && !r.moving;
    if (!r.sweeping && !r.jumping && (ahead || stopped) && now - last > 600) { last = now; const w = ahead ? ahead.e : r.blocked; r.jump(true); pending = (w.def.clear || 0) >= 72 ? w : null; }
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
  // 입구·출구가 벽 타일로 막혀 보이지 않는다(BUILD192): 통로 타일이 맵 가장자리까지 이어진다
  await page.evaluate(() => { const g = window.game; g.player.x = 1040; g.player.y = 120; g.player.facing = 'right'; }); await page.waitForTimeout(700); await cap('corridor_exit');
  const c13 = await page.evaluate(() => { const r = window.game.map.rows; return { left: r[8][0], right: r[3][35], W: r[0].length }; });
  check(c13.left === 'H' && c13.right === 'H', '복도 양끝(무대 홀 입구·용암 수로 출구)이 벽이 아니라 바닥 그림의 출입구 칸(H) ' + JSON.stringify(c13));
  // ② 용암 수로: 오른쪽으로 걸어가 뗏목 옆에서 C → 컷신(형섭이 걸어서 올라탐)
  await page.goto('http://localhost:8000/?qa=lava_raft');
  await page.waitForFunction(() => window.game && window.game.mapId === 'youngcle14' && !window.game.dialogue.running, null, { timeout: 25000 });
  await page.waitForTimeout(800); await cap('entrance');
  const c14 = await page.evaluate(() => { const g = window.game; const r = g.map.rows; return { entrance: r[21][0], end: r[3][107], W: r[0].length, extras: g.entities.filter(e => e.id === 'lava14_end_door' || e.id === 'lava14_hint').length }; });
  check(c14.entrance === 'H' && c14.end === 'H' && c14.W === 108 && c14.extras === 0, '수로 입구·끝이 벽이 아니라 바닥 그림의 출입구 칸(H), 철문·안내판 없음 ' + JSON.stringify(c14));
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
  // ④ 위로 가는 두 번째 뗏목: 아래에 서서 C → 걸어서 타고(즉석 walkOn) 동료도 걸어가 뛰어든다 → 세로 수로 완주 → 위 착지
  await page.evaluate(() => { const g = window.game; const b = g.entities.find(e => e.id === 'raft14b'); g.player.x = b.x + 16; g.player.y = b.y + b.h + 2; g.player.facing = 'up'; });
  await page.waitForTimeout(200);
  const walkedB = await page.evaluate(() => new Promise(resolve => { const g = window.game; const fire = (type) => { const ev = new KeyboardEvent(type, { key: 'c', code: 'KeyC', bubbles: true }); window.dispatchEvent(ev); document.dispatchEvent(ev); }; fire('keydown'); setTimeout(() => fire('keyup'), 60); const ys = []; const t0 = performance.now(); const tick = () => { ys.push(Math.round(g.player.y)); if (g.ride || performance.now() - t0 > 3000) resolve(ys); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); }));
  check(new Set(walkedB).size >= 4, '두 번째 뗏목도 걸어서 올라탄다 ' + JSON.stringify([walkedB.slice(0, 2), walkedB.slice(-2), new Set(walkedB).size]));
  await page.waitForFunction(() => { const r = window.game.entities.find(e => e.id === 'raft14b'); return r && r.moving; }, null, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(300); await cap('up'); s = await st();
  check(s.ride === 'raft14b' && s.raftB && s.raftB.riding && s.dj, '두 번째 뗏목 출발(위로), 동료 헤엄 ' + JSON.stringify([s.ride, s.raftB]));
  const swimB = await page.evaluate(() => window.game.entities.find(e => e.id === 'raft14b').swimmers.filter(x => !x.dead).map(x => x.id));
  check(swimB.length === 2, '경섭·빠맨이 걸어가 뛰어들어 뗏목 아래에서 헤엄 ' + JSON.stringify(swimB));
  const rideB = await autoRide('raft14b'); await page.waitForTimeout(600); await cap('top'); s = await st();
  check(!rideB.riding && s.fb === 1 && s.py < 176 && s.tile === 'F', '세로 수로 완주(낮은 돌 → 2층 빔) → 위 착지 바닥 ' + JSON.stringify([rideB, s.fb, s.px, s.py, s.tile]));
  // ⑤ 위 착지에서 다시 오른쪽(BUILD192, 사용자 “위로 가는 용암 퍼즐 후에 오른쪽으로 가는 용암길도”): 세 번째 뗏목 옆에서 C → 걸어서 타고 → 두 단 돌·흔들리는 2층 빔·낮은 돌·낮은 빔 → 오른쪽 끝 착지(열린 통로)
  const walkedC = await walkOnAt('raft14c', -40, 30, 'right', 'x');
  check(new Set(walkedC).size >= 4, '세 번째 뗏목도 걸어서 올라탄다 ' + JSON.stringify([walkedC.slice(0, 2), walkedC.slice(-2), new Set(walkedC).size]));
  await page.waitForFunction(() => { const r = window.game.entities.find(e => e.id === 'raft14c'); return r && r.moving; }, null, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(300); await cap('right2'); s = await st();
  const swimC = await page.evaluate(() => window.game.entities.find(e => e.id === 'raft14c').swimmers.filter(x => !x.dead).map(x => x.id));
  check(s.ride === 'raft14c' && s.raftC && s.raftC.riding && s.raftC.moving && swimC.length === 2, '세 번째 뗏목 출발(오른쪽), 경섭·빠맨 헤엄 ' + JSON.stringify([s.ride, s.raftC, swimC]));
  const rideC = await autoRide('raft14c'); await page.waitForTimeout(600); await cap('top_end'); s = await st();
  check(!rideC.riding && s.fc === 1 && s.px > 3060 && s.tile === 'F', '구간 ③ 완주(두 단 돌 → 흔들리는 2층 빔 → 낮은 돌 → 낮은 빔) → 오른쪽 끝 착지 ' + JSON.stringify([rideC, s.fc, s.px, s.py, s.tile]));
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
