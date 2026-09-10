// 청록숲5 물길 검증: ?qa=teal5 → 선착장에서 C(승선) → 컷신1(경섭 "타도 될까" 선택지가 뜨자마자 억빠맨이 끊음 → 억빠맨·경섭 둘 다 뗏목 아래에서 헤엄) → 1단 폭포 C 점프
//   → 이단폭포 150px 앞 정지 컷신2(경섭 느낌표·"믿어볼수있겠.." 끊김·협동 점프 튜토리얼: 1124 정지 → C → 정점 공중 정지 → "한번 더 눌러" → 2단 점프 획득 → C → 넘음)
//   → 2번째 이단폭포는 일부러 안 뛰어 체크포인트(1400)로 쓸려 내려감 → 2단 점프로 2·3번째 → 착지(동료 둘 뒤에) → 오른쪽 길 → teal6.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
process.on('uncaughtException', (e) => { try { console.log(logs.join('\n')); } catch {} console.log('CRASH', e.stack || e.message); process.exit(2); });
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
for (const f of fs.readdirSync(S)) if (f.startsWith('teal5_')) fs.unlinkSync(`${S}/${f}`);
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0;
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const ready = async () => { const t0 = Date.now(); while (Date.now() - t0 < 15000) { if (await page.evaluate(() => !!(window.game && game.entities && game.player))) return; await page.waitForTimeout(100); } };
const st = () => page.evaluate(() => { const r = game.ride || game.entities.find((e) => e.def?.type === 'raft'); const p = game.player;
  const sw = game.entities.filter((e) => e.def?.type === 'swimmer' && !e.dead).map((s) => ({ id: s.id, x: Math.round(s.x), y: Math.round(s.y) }));
  const walls = game.entities.filter((e) => e.def?.obstacle && !e.dead).map((e) => ({ x: e.x, w: e.w, clear: e.def.clear || 0 })).sort((a, b) => a.x - b.x);
  const fol = game.entities.filter((e) => e.def?.type === 'follower').map((f) => ({ id: f.id, vis: f.visible !== false, x: Math.round(f.x) }));
  return { map: game.mapId, running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: (game.textbox.node?.text || '').replace(/\{[^}]*\}/g, ''),
    riding: !!game.ride, rx: Math.round(r?.x ?? 0), ry: Math.round(r?.y ?? 0), jumping: !!r?.jumping, jumpY: Math.round(r?.jumpY || 0), hold: !!r?.hold, doubled: !!r?.doubled, moving: !!r?.moving, blocked: !!r?.blocked, sweeping: !!r?.sweeping, sweeps: r?.sweeps || 0,
    sw, walls, fol, p: [Math.round(p.x), Math.round(p.y)], party: [...game.party], flags: { dj: !!game.flags.double_jump, wall: !!game.flags.teal5_wall_seen, boarded: !!game.flags.raft5_boarded } }; });
const key = (s) => (s.speaker || '') + '|' + s.text;

await page.goto('http://localhost:8000/index.html?qa=teal5'); await ready(); await page.keyboard.press('KeyX'); await page.waitForTimeout(400);
let q = await st();
check('?qa=teal5: map teal5, party [gyeongsub, ppaman] both followers visible, raft at 328 with 4 waterfalls', q.map === 'teal5' && q.party.join() === 'gyeongsub,ppaman' && q.fol.length === 2 && q.rx === 328 && q.walls.length === 4, JSON.stringify({ party: q.party, fol: q.fol, rx: q.rx, walls: q.walls }));
const meta = await page.evaluate(async () => (await import('/src/data/maps.js')).MAPS.teal5.meta);

// 선착장으로 걸어가 C (뗏목 10px 앞)
await page.evaluate(async () => { const d = (await import('/src/data/maps.js')).MAPS.teal5.spawns.dock; game.player.x = d.x; game.player.y = d.y; game.player.facing = 'right'; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); game.camera.snap(); });
await page.waitForTimeout(200); await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
q = await st(); check('C at the dock → boarded, onBoard cutscene running', q.riding && q.running && q.flags.boarded, JSON.stringify({ riding: q.riding, running: q.running }));

// 컷신 펌프: typing → C, waiting → 기록 + C, choice → 손대지 않음(auto 로 억빠맨이 끊는다)
const lines = []; let choiceSeen = false, choicePicked = false;
const pump = async (untilFn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await st(); if (untilFn(s)) return s;
  if (s.box === 'choice') { choiceSeen = true; await page.waitForTimeout(80); }
  else if (s.box === 'waiting') { const k = key(s); if (lines[lines.length - 1] !== k) lines.push(k); await page.keyboard.press('KeyC'); await page.waitForTimeout(60); }
  else if (s.box === 'typing') { const k = key(s); if (lines[lines.length - 1] !== k) lines.push(k); await page.keyboard.press('KeyC'); await page.waitForTimeout(40); }
  else await page.waitForTimeout(40); } return null; };
let shot1 = false;
q = await pump((s) => { if (!shot1 && s.sw.length === 1) { shot1 = true; page.screenshot({ path: `${S}/teal5_01_swim.png` }).catch(() => {}); } return !s.running; }, 30000);
const want1 = ['경섭|* 어 .. ... ... 형섭아 내가 타도 될까', '억빠맨|* 아니요 형', '억빠맨|* 옆에서 같이 수영하시죠', '경섭|* ?', '억빠맨|* 형 무게면 땟목 뒤져요', '경섭|* ... 어 알았다.'];
const inOrder = (want, got) => { let i = 0; for (const g of got) if (g === want[i]) i++; return i === want.length; };
check('boarding scene: 6 lines in briefing order, choice appeared and was cut by 억빠맨 (auto)', inOrder(want1, lines) && choiceSeen, JSON.stringify({ lines, choiceSeen }));
q = await st();
check('after scene: raft moving, ppaman_swim + gyeongsub_swim both BELOW the raft (y > raft y + 40), side by side', !!q && q.moving && q.sw.length === 2 && q.sw.every((s) => s.y > q.ry + 40) && Math.abs(q.sw[0].y - q.sw[1].y) < 4 && Math.abs(q.sw[0].x - q.sw[1].x) >= 24, JSON.stringify({ ry: q.ry, sw: q.sw, moving: q.moving }));
await page.screenshot({ path: `${S}/teal5_02_ride.png` });

// 자동 항해: 벽 40~90px 앞에서 C. 이단폭포는 0.3s 뒤 C 한 번 더(2단). fall_big2 는 처음엔 일부러 안 뛰어 쓸려 내려감을 본다
const lines2 = []; let skipBig2 = true, sweptAt = null, sweepShot = false, holds = 0, lastHold = false, apexShot = false, wallShot = false, jumps = 0, tutorialDone = false;
const t0 = Date.now(); let landed = null;
while (Date.now() - t0 < 90000) {
  const s = await st();
  if (!s.riding && s.flags.wall && s.rx >= meta.raftEnd - 2) { landed = s; break; }
  if (s.running) {
    if (s.box === 'choice') { await page.waitForTimeout(80); continue; }
    if (s.box === 'waiting' || s.box === 'typing') { const k = key(s); if (lines2[lines2.length - 1] !== k) lines2.push(k); if (!wallShot && s.text.includes('잠깐만요')) { wallShot = true; await page.screenshot({ path: `${S}/teal5_03_wall.png` }).catch(() => {}); } if (!apexShot && s.text.includes('한번 더')) { apexShot = true; await page.screenshot({ path: `${S}/teal5_04_apex.png` }).catch(() => {}); } await page.keyboard.press('KeyC'); await page.waitForTimeout(60); continue; }
    if (s.hold) { if (!lastHold) holds++; lastHold = true; await page.waitForTimeout(250); await page.keyboard.press('KeyC'); jumps++; await page.waitForTimeout(120); continue; }   // 튜토리얼: 정지 중 C (1차·2차)
    lastHold = false; await page.waitForTimeout(40); continue;
  }
  if (s.flags.dj) tutorialDone = true;
  if (s.sweeping && sweptAt === null) { sweptAt = s.rx; if (!sweepShot) { sweepShot = true; await page.screenshot({ path: `${S}/teal5_05_sweep.png` }).catch(() => {}); } }
  const next = s.walls.find((w) => w.x > s.rx + 56); const gap = next ? next.x - (s.rx + 56) : null;
  if (s.riding && !s.moving && s.blocked && !s.jumping && !s.sweeping) { await page.keyboard.press('KeyC'); jumps++; await page.waitForTimeout(150); continue; }   // 1단 폭포에 쿵 → 그 자리에서 C(점프 재출발)
  if (s.moving && !s.jumping && !s.sweeping && gap !== null && gap >= 30 && gap <= 80) {
    if (next.clear > 0 && next.x === 1750 && skipBig2) { await page.waitForTimeout(40); continue; }   // 일부러 안 뛴다 → 쓸려 내려감
    await page.keyboard.press('KeyC'); jumps++;
    if (next.clear > 0) { await page.waitForTimeout(300); await page.keyboard.press('KeyC'); jumps++; }   // 2단: 상승 중 한 번 더
    await page.waitForTimeout(150); continue;
  }
  if (s.sweeps >= 1) skipBig2 = false;
  await page.waitForTimeout(40);
}
const want2 = ['억빠맨|* 어 형 잠깐만요!!', '억빠맨|* 형 이건 도무지 저 혼자서 못넘을거같아요', '경섭|* 흠 ... ... ...', '억빠맨|* 아니요', '경섭|* ...', '억빠맨|* 뭔데요?', '경섭|* 너가 c를 눌러 점프할때 나랑 협동을 하면 더 높게 올라갈 수 있을거같아.', '억빠맨|* ...음.. 해볼수밖에 없겠네요', '억빠맨|* 지금 c를 눌러야해요!', '경섭|* 형섭아 지금 한번 더 눌러', '|* 2단 점프를 할 수 있게 되었다!'];   // 노란 문구는 넘고 나서
check('waterfall scene: lines in briefing order (믿어볼수있겠.. is cut instantly), tutorial held the raft twice (before C, and mid-air at the apex)', inOrder(want2, lines2) && holds >= 2, JSON.stringify({ lines2, holds }));
check('double_jump flag set during the tutorial; first big waterfall crossed without a sweep', tutorialDone && (sweptAt === null || sweptAt > 1600), JSON.stringify({ dj: tutorialDone, sweptAt }));
check('touching the 2nd big waterfall without the double jump → swept back to checkpoint 1400, then auto-resumed and crossed with C + C', sweptAt !== null && sweptAt >= 1650 && !!landed && landed.sweeps === 1, JSON.stringify({ sweptAt, sweeps: landed?.sweeps }));
check('raft climbed three steps: ended one level higher per waterfall (y 390 → 198)', !!landed && landed.ry === meta.levels[3], JSON.stringify({ ry: landed?.ry, levels: meta.levels }));
check('arrived at the far bank: player on land right of the water, both followers visible behind AND on land (not hidden behind the raft)', !!landed && landed.p[0] >= 2816 && landed.fol.length === 2 && landed.fol.every((f) => f.vis && f.x < landed.p[0] && f.x >= 2812), JSON.stringify(landed && { p: landed.p, fol: landed.fol, rx: landed.rx }));
await page.screenshot({ path: `${S}/teal5_06_land.png` });

// 오른쪽 길로 쭉 → teal6
await page.keyboard.down('KeyX'); await page.keyboard.down('ArrowRight');
const t1 = Date.now(); let mapNow = 'teal5'; while (Date.now() - t1 < 25000) { mapNow = await page.evaluate(() => game.mapId); if (mapNow === 'teal6') break; await page.waitForTimeout(100); }
await page.keyboard.up('ArrowRight'); await page.keyboard.up('KeyX');
check('right road → door → teal6', mapNow === 'teal6', mapNow);

console.log(logs.join('\n')); console.log(`fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
