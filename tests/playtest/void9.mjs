// 보라맵9 뱀길 검증: ?qa=void9 → 뗏목 5개(→ ↓ ← ↓ →)를 자동 점프로 통과(벽 앞 30~110px 에서 C), 움직이는 벽이 실제로 움직임, 세로 뗏목에서 헤엄 동료는 뗏목 위(뒤)에,
//   체크포인트마다 이벤트: B 버튼(누른다 → 바위 떨어짐) / C 퀴즈(3지선다 격자) / D 웅덩이(억빠맨 {hop} 점프 → 첨벙) / E 상자(먼지) → F 오른쪽 출구 → void10.
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
const st = () => page.evaluate(() => { const f = game.entities.find((e) => e.def?.type === 'follower'); const sw = game.entities.find((e) => e.def?.type === 'swimmer' && !e.dead); const r = game.ride; return { map: game.mapId, running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: game.textbox.node?.text || '', ride: !!r, rideId: r?.id || null, raft: r ? { x: Math.round(r.x), y: Math.round(r.y), dir: r.dirFacing, moving: r.moving, blocked: r.blocked?.id || null, jumping: r.jumping, jumpY: Math.round(r.jumpY), hits: r.hits } : null, p: [Math.round(game.player.x), Math.round(game.player.y)], pf: game.player.facing, f: f ? { x: Math.round(f.x), y: Math.round(f.y), vis: f.visible, hopY: Math.round(f.hopY || 0) } : null, sw: sw ? { x: Math.round(sw.x), y: Math.round(sw.y) } : null, flags: { ...game.flags }, inv: [...game.inventory], fx: game.fx.length, walls: game.entities.filter((e) => e.def?.obstacle).map((e) => ({ id: e.id, x: Math.round(e.x), y: Math.round(e.y) })) }; });
const stand = (x, y, f) => page.evaluate(([x, y, f]) => { game.player.x = x; game.player.y = y; game.player.facing = f; game.player.trail = []; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); game.camera.snap(); }, [x, y, f]);
const talk = async (x, y, f, picks = []) => {
  await stand(x, y, f); await page.waitForTimeout(300); await page.keyboard.press('KeyC');
  const out = []; let idle = 0, pi = 0;
  for (let i = 0; i < 150; i++) {
    await page.waitForTimeout(150); const s = await st();
    if (!s.running) { if (++idle > 3) break; continue; } idle = 0;
    if (s.box === 'choice') { const k = (s.speaker || '') + '|' + s.text.replace(/\{[^}]*\}/g, ''); if (!out.includes(k)) out.push(k); const n = picks[pi++] ?? 0; for (let j = 0; j < Math.floor(n / 2); j++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80); } for (let j = 0; j < n % 2; j++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80); } await page.keyboard.press('KeyC'); await page.waitForTimeout(200); }
    else if (s.box === 'waiting') { const k = (s.speaker || '') + '|' + s.text.replace(/\{[^}]*\}/g, ''); if (!out.includes(k)) out.push(k); await page.keyboard.press('KeyC'); }
    else if (s.box === 'typing') await page.keyboard.press('KeyC');
  }
  return out;
};
// 뗏목 자동 주행: 진행 방향 앞 30~110px 안에 벽이 있으면 C(점프). 도착까지.
const autoRide = async (label, maxMs = 20000) => {
  let jumps = 0, maxSwimBehind = null; const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const q = await page.evaluate(() => { const r = game.ride; if (!r) return null; const d = r.dirFacing; const walls = game.entities.filter((e) => e.def?.obstacle && !e.dead); let gap = null;
      for (const w of walls) { let g2 = null; if (d === 'right') { if (w.y < r.y + r.h && w.y + w.h > r.y) g2 = w.x - (r.x + r.w); } else if (d === 'left') { if (w.y < r.y + r.h && w.y + w.h > r.y) g2 = r.x - (w.x + w.w); } else if (d === 'down') { if (w.x < r.x + r.w && w.x + w.w > r.x) g2 = w.y - (r.y + r.h); } else { if (w.x < r.x + r.w && w.x + w.w > r.x) g2 = r.y - (w.y + w.h); } if (g2 !== null && g2 >= -4 && (gap === null || g2 < gap)) gap = g2; }
      const sw = game.entities.find((e) => e.def?.type === 'swimmer' && !e.dead); return { gap, jumping: r.jumping, moving: r.moving, blocked: !!r.blocked, dir: d, rx: r.x, ry: r.y, swx: sw?.x, swy: sw?.y }; });
    if (!q) break;
    if (q.dir === 'down' && q.swy !== undefined) maxSwimBehind = Math.max(maxSwimBehind ?? -1e9, q.ry - q.swy);
    if (!q.jumping && (q.blocked || (q.gap !== null && q.gap >= 30 && q.gap <= 110))) { await page.keyboard.press('KeyC'); jumps++; await page.waitForTimeout(120); }
    await page.waitForTimeout(25);
  }
  const s = await st(); logs.push(`[info] ${label}: jumps=${jumps} hits=${s.raft?.hits ?? 'n/a'} ended ride=${s.ride}`);
  return { s, jumps, maxSwimBehind };
};
const board = async (x, y, f) => { await stand(x, y, f); await page.waitForTimeout(300); await page.keyboard.press('KeyC'); await page.waitForTimeout(400); return st(); };

await page.goto('http://127.0.0.1:8000/index.html?qa=void9'); await ready(); await page.waitForTimeout(400);
let s = await st(); check('qa=void9: dock A with party', s.map === 'void9' && s.f?.vis && s.flags.void8_done, JSON.stringify({ p: s.p, f: s.f }));
// 움직이는 벽
{ const a = s.walls; await page.waitForTimeout(900); const b = (await st()).walls; const moved = a.filter((w, i) => w.x !== b[i].x || w.y !== b[i].y).map((w) => w.id); check('moving walls oscillate (w2,w4,w5,w7,w8,w10), static ones do not', ['w2', 'w4', 'w5', 'w7', 'w8', 'w10'].every((id) => moved.includes(id)) && !['w1', 'w3', 'w6', 'w9'].some((id) => moved.includes(id)), moved.join(',')); }
// ── 1) H1 → ──
s = await board(190, 120, 'right'); check('board raft9a: no intro cutscene, swimmer appears, moving right', s.ride && s.rideId === 'raft9a' && !s.running && !!s.sw && s.raft.moving, JSON.stringify({ ride: s.rideId, running: s.running, sw: s.sw }));
await page.waitForTimeout(600); await page.screenshot({ path: `${S}/void9_01_h1.png` });
let r = await autoRide('H1'); s = r.s; check('H1: arrived at landing B (player on land, right of raft end)', !s.ride && s.p[0] > 1300 && s.p[1] < 230, JSON.stringify(s.p));
{ const q = await page.evaluate(() => { const p = game.player; const inSolid = game.map.solidRect(p.x, p.y, p.w, p.h) || game.entities.some((o) => o !== p && o.solid && !o.dead && o.def?.type !== 'follower' && o.overlaps(p.rect)); return { inSolid, p: [p.x, p.y] }; });
  check('B arrival: player not inside any solid prop (button) and can walk', !q.inSolid, JSON.stringify(q));
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(250); await page.keyboard.up('ArrowDown'); const q2 = await st(); check('B arrival: player can move after landing', q2.p[1] > q.p[1] + 10, JSON.stringify({ before: q.p, after: q2.p })); }
// B 버튼
let L = await talk(1352, 134, 'up', [0]);
check('B button: 수상한 버튼 → [누른다] → 꾹 → 아무 일도 → 바위 → 다신 안 누를게요', ['수상한 버튼', '꾹', '아무 일도 일어나지', '다신 안 누를게요'].every((k) => L.some((l) => l.includes(k))) && (await st()).flags.button_pressed, JSON.stringify(L));
L = await talk(1352, 134, 'up'); check('B button again: 저 이제 안 눌러요', L.some((l) => l.includes('안 눌러요')), JSON.stringify(L));
// ── 2) V1 ↓ ──
s = await board(1396, 196, 'down'); check('board raft9b (down)', s.ride && s.rideId === 'raft9b' && s.raft.dir === 'down' && !!s.sw, JSON.stringify({ ride: s.rideId, dir: s.raft?.dir, sw: s.sw, raft: s.raft }));
await page.waitForTimeout(500); await page.screenshot({ path: `${S}/void9_02_v1.png` });
r = await autoRide('V1'); s = r.s;
check('V1: swimmer stays behind = above the raft while going down', r.maxSwimBehind !== null && r.maxSwimBehind > 0, `behind=${r.maxSwimBehind}`);
check('V1: arrived at landing C (below)', !s.ride && s.p[1] > 850 && s.p[0] > 1300, JSON.stringify(s.p));
// C 퀴즈 (3지선다 격자: 셋째 = ↓)
L = await talk(1428, 896, 'right', [2]);
check('C quiz: 억빠맨의 특징은? → [억빠] → 그건 제 이름이잖아요 → 정답 처리', ['억빠맨의 특징은', '제 이름이잖아요', '정답 처리'].every((k) => L.some((l) => l.includes(k))), JSON.stringify(L));
L = await talk(1428, 896, 'right', [0]); check('C quiz: [바보] → 형 저 여기 있는데요 → 정답이었다', L.some((l) => l.includes('여기 있는데요')) && L.some((l) => l.includes('정답이었다')), JSON.stringify(L));
await page.screenshot({ path: `${S}/void9_03_quiz.png` });
// ── 3) H2 ← ──
s = await board(1316, 890, 'left'); check('board raft9c (left)', s.ride && s.rideId === 'raft9c' && s.raft.dir === 'left' && s.sw && s.sw.x > s.raft.x, JSON.stringify({ ride: s.rideId, dir: s.raft?.dir, sw: s.sw, raft: s.raft }));
r = await autoRide('H2'); s = r.s; check('H2: arrived at landing D (left)', !s.ride && s.p[0] < 224 && s.p[1] > 850 && s.p[1] < 1000, JSON.stringify(s.p));
// D 웅덩이 (hop)
{ await stand(184, 946, 'left'); await page.waitForTimeout(300); await page.keyboard.press('KeyC'); let sawHop = false, minDist = null; const t0 = Date.now(); const out = [];   // 오른쪽에서 눌러도 웅덩이 기준으로 선다
  while (Date.now() - t0 < 12000) { await page.waitForTimeout(60); const q = await st(); if (!q.running) break; if (q.f && q.f.hopY > 8) { sawHop = true; const d = Math.hypot(q.p[0] - q.f.x, q.p[1] - q.f.y); minDist = minDist === null ? d : Math.min(minDist, d); if (!fs.existsSync(`${S}/void9_04_hop.png`)) await page.screenshot({ path: `${S}/void9_04_hop.png` }); } if (q.box === 'waiting') { const k = (q.speaker || '') + '|' + q.text.replace(/\{[^}]*\}/g, ''); if (!out.includes(k)) out.push(k); await page.keyboard.press('KeyC'); } else if (q.box === 'typing') await page.keyboard.press('KeyC'); }
  check('D puddle: player and ppaman not overlapping at the hop (staged relative to the puddle)', minDist === null || minDist >= 36, `minDist=${minDist}`);
  check('D puddle: 물웅덩이다 → 건너뛰어 볼게요 → hop arc (hopY>8) → 한가운데 착지 → 젖었어요', sawHop && ['물웅덩이다', '건너뛰어', '한가운데 착지', '젖었어요'].every((k) => out.some((l) => l.includes(k))), JSON.stringify({ sawHop, out }));
  const q = await st(); check('D puddle: ppaman regroups; flag', q.flags.puddle_jumped && q.f && Math.hypot(q.p[0] - q.f.x, q.p[1] - q.f.y) < 70, JSON.stringify({ p: q.p, f: q.f })); }
// ── 4) V2 ↓ ──
s = await board(116, 964, 'down'); check('board raft9d (down)', s.ride && s.rideId === 'raft9d' && s.raft.dir === 'down', JSON.stringify({ ride: s.rideId, raft: s.raft }));
r = await autoRide('V2'); s = r.s; check('V2: arrived at landing E', !s.ride && s.p[1] > 1490 && s.p[0] < 224, JSON.stringify(s.p));
// E 상자
L = await talk(116, 1590, 'right'); s = await st();
check('E chest: 상자다 → 텅 비어 → 먼저 열어봤어요 → 먼지를 얻었다 (inventory)', ['상자다', '텅 비어', '먼저 열어봤어요', '먼지'].every((k) => L.some((l) => l.includes(k))) && s.inv.includes('먼지') && s.flags.chest9_opened, JSON.stringify({ L, inv: s.inv }));
L = await talk(116, 1590, 'right'); check('E chest again: 빈 상자다', L.some((l) => l.includes('빈 상자')), JSON.stringify(L));
// ── 5) H3 → ──
s = await board(190, 1528, 'right'); check('board raft9e (right)', s.ride && s.rideId === 'raft9e', JSON.stringify({ ride: s.rideId }));
r = await autoRide('H3'); s = r.s; check('H3: arrived at landing F', !s.ride && s.p[0] > 1300 && s.p[1] > 1490, JSON.stringify(s.p));
await page.screenshot({ path: `${S}/void9_05_f.png` });
await stand(1460, 1530, 'right'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(900); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(900); s = await st();
check('F: right edge → void10 placeholder with party', s.map === 'void10' && s.f?.vis, JSON.stringify({ map: s.map }));
// 비상탈출(메뉴): 타는 중 → 입구(dock)로, raft9a 는 시작으로
await page.goto('http://127.0.0.1:8000/index.html?qa=void9'); await ready(); await page.waitForTimeout(400);
s = await board(190, 120, 'right'); await page.waitForTimeout(1500);
await page.keyboard.press('KeyV'); await page.waitForTimeout(250); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80); await page.keyboard.press('KeyC'); await page.waitForTimeout(250); await page.keyboard.press('KeyC'); await page.waitForTimeout(1500);
s = await st(); { const ra = await page.evaluate(() => { const r = game.entities.find((e) => e.id === 'raft9a'); return Math.round(r.x); }); check('menu escape mid-ride on void9: back at dock, raft9a back at start', !s.ride && Math.abs(s.p[0] - 190) < 8 && ra === 224 && s.f?.vis, JSON.stringify({ p: s.p, ra })); }
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
