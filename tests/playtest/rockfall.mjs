// 레버 열쇠 → 철컥 문 → 낙석 맵 3개(3/6/9) → 다음 방 검증.
//   ?qa=key → 문 아래에서 위를 보고 C(밟아서는 안 열림) → 억빠맨 "어라 문이 잠겨있네요" → 억빠맨이 앞장서 레버로(플레이어 따라감) → "음음 이 레버를" → 레버 사라짐 → "뽑아버렸다" → "열쇠?를 얻었다"(인벤토리)
//   → 문에 다시 닿음 → "철컥! 문이 열렸다." → "ㅎㅎ" → void5(브금 scarlet, 자물쇠 없음) → 낙석: 빛기둥(warn) → 낙하 → 착지 시 맞으면 뒤로 밀림 → 안전 타이밍에 건너 → 아래로 → void6 → void7 → 오른쪽 끝 → void8.
// 실행: CHROME_EXE=... node tests/playtest/rockfall.mjs   (서버 8000)
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
const st = () => page.evaluate(() => { const f = game.entities.find((e) => e.def?.type === 'follower'); return { map: game.mapId, running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: game.textbox.node?.text || '', p: [Math.round(game.player.x), Math.round(game.player.y)], f: f ? [Math.round(f.x), Math.round(f.y)] : null, flags: { ...game.flags }, inv: [...game.inventory], bgm: game.sound.bgmName, leverOn: !!game.entities.find((e) => e.id === 'lever_on' && !e.dead && e.visible), padlock: !!game.entities.find((e) => e.id === 'padlock' && !e.dead), rocks: game.entities.filter((e) => e.def?.type === 'rockfall').map((r) => ({ x: r.lx, phase: r.phase, k: +r.k.toFixed(2), ry: Math.round(r.rockRect.y), rw: r.rw })), hurt: game.hurt > 0, invuln: game.invuln > 0, knock: !!game.player.knock, sfx: (window.__sfx || []).slice() }; });
const stand = (x, y, f) => page.evaluate(([x, y, f]) => { game.player.x = x; game.player.y = y; game.player.facing = f; game.player.trail = []; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); game.camera.snap(); }, [x, y, f]);
const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };
const doorC = async () => { await stand(2360, 236, 'up'); await page.waitForTimeout(500); await page.keyboard.press('KeyC'); };   // 작은 문 아래에서 위를 보고 C
const hookSfx = () => page.evaluate(() => { window.__sfx = []; const o = game.sound.sfx.bind(game.sound); game.sound.sfx = (n, opt) => { window.__sfx.push(n); return o(n, opt); }; });
const talk = async (x, y, f, picks = []) => {   // 소품 앞에 서서 C → 대사 수집(선택지는 picks 순서대로 → 로 이동 후 C)
  await stand(x, y, f); await page.waitForTimeout(300); await page.keyboard.press('KeyC');
  const out = []; let idle = 0, pi = 0;
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(150); const s = await st();
    if (!s.running) { if (++idle > 3) break; continue; } idle = 0;
    if (s.box === 'choice') { const k = (s.speaker || '') + '|' + s.text.replace(/\{[^}]*\}/g, ''); if (!out.includes(k)) out.push(k); const n = picks[pi++] ?? 0; for (let k = 0; k < n; k++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80); } await page.keyboard.press('KeyC'); await page.waitForTimeout(200); }
    else if (s.box === 'waiting') { const k = (s.speaker || '') + '|' + s.text.replace(/\{[^}]*\}/g, ''); if (!out.includes(k)) out.push(k); if (s.text.includes('킁킁')) await page.screenshot({ path: `${S}/rock_07_flowers.png` }); await page.keyboard.press('KeyC'); }
    else if (s.box === 'typing') await page.keyboard.press('KeyC');
  }
  return out;
};
const collect = async (max = 80) => {   // 대사를 넘기며 (speaker|text) 를 모은다. 컷신 이동 중엔 기다림
  const out = []; let idle = 0;
  for (let i = 0; i < max; i++) {
    await page.waitForTimeout(200); const s = await st();
    if (!s.running) { if (++idle > 3) break; continue; } idle = 0;
    if (s.box === 'waiting') { const k = (s.speaker || '') + '|' + s.text; if (!out.includes(k)) out.push(k); await page.keyboard.press('KeyC'); }
    else if (s.box === 'typing') await page.keyboard.press('KeyC');
  }
  return out;
};

// ── 0) 합류 전: 문 앞에서 C → "자물쇠로 잠겨 있다" / 밟고 지나가도 아무 일 없음 ──
await page.goto('http://127.0.0.1:8000/index.html?qa=void4_end'); await ready(); await page.waitForTimeout(400);
let s = await st(); check('qa=void4_end: before joining', s.map === 'void4' && !s.flags.ppaman_joined, JSON.stringify(s.flags));
await stand(2300, 236, 'right'); await hold('ArrowRight', 700); await page.waitForTimeout(400); s = await st();
check('walking under/into the door does nothing', s.map === 'void4' && !s.running, JSON.stringify({ map: s.map, running: s.running, p: s.p }));
await doorC(); let lines = await collect();
check('before joining: C on door → 자물쇠로 잠겨 있다', lines.some((l) => l.includes('자물쇠로 잠겨')), JSON.stringify(lines));
await stand(2340, 236, 'up'); await page.waitForTimeout(500); await page.keyboard.press('KeyC'); lines = await collect();
check('door interact area is wide (left edge of door image still works)', lines.some((l) => l.includes('자물쇠로 잠겨')), JSON.stringify(lines));
await page.screenshot({ path: `${S}/rock_00_locked.png` });

// ── 1) 잠긴 문 → 레버 열쇠 ──
await page.goto('http://127.0.0.1:8000/index.html?qa=key'); await ready(); await page.waitForTimeout(400);
s = await st(); check('qa=key: void4 landing with party', s.map === 'void4' && s.flags.ppaman_joined && !!s.f, JSON.stringify({ p: s.p, f: s.f }));
await doorC();
lines = []; let ppamanAtLever = false;
{ const t0 = Date.now(); while (Date.now() - t0 < 30000) { await page.waitForTimeout(150); s = await st(); if (!s.running && lines.length) break; if (s.f && s.f[1] < 100 && s.f[0] < 2260) ppamanAtLever = true; if (s.box === 'waiting') { const k = (s.speaker || '') + '|' + s.text; if (!lines.includes(k)) lines.push(k); if (s.text.includes('이 레버를')) await page.screenshot({ path: `${S}/rock_01_lever.png` }); await page.keyboard.press('KeyC'); } else if (s.box === 'typing') await page.keyboard.press('KeyC'); } }
check('door: 어라 문이 잠겨있네요 / 아까 레버에', lines.some((l) => l.includes('문이 잠겨있네요')) && lines.some((l) => l.includes('레버에 뭐 없으셨어요')), JSON.stringify(lines.slice(0, 2)));
check('ppaman led the way to the lever (upper platform)', ppamanAtLever);
s = await st();
check('player followed up to the platform', s.p[1] < 100 && s.p[0] > 2260, JSON.stringify(s.p));
check('음음 이 레버를 → 뽑아버렸다 → 열쇠', lines.some((l) => l.includes('이 레버를')) && lines.some((l) => l.startsWith('|') && l.includes('뽑아버렸다')) && lines.some((l) => l.includes('열쇠로 쓰면')) && lines.some((l) => l.includes('열쇠?')), JSON.stringify(lines.slice(2)));
check('lever gone, key in inventory, flag', !s.leverOn && s.inv.includes('열쇠?') && s.flags.lever_taken, JSON.stringify({ lever: s.leverOn, inv: s.inv }));
check('follower regrouped near player (1.5 tiles)', s.f && Math.hypot(s.p[0] - s.f[0], s.p[1] - s.f[1]) < 70, JSON.stringify({ p: s.p, f: s.f }));
await page.screenshot({ path: `${S}/rock_02_key.png` });
// ── 2) 문 열기 (C) ──
await doorC();
lines = await collect();
await page.waitForTimeout(800); s = await st();
check('철컥! 문이 열렸다 → ㅎㅎ', lines.some((l) => l.includes('철컥')) && lines.some((l) => l.includes('ㅎㅎ')), JSON.stringify(lines));
check('now in void5 with scarlet bgm, party along', s.map === 'void5' && s.bgm === 'scarlet' && !!s.f && s.flags.door_open, JSON.stringify({ map: s.map, bgm: s.bgm }));
await page.screenshot({ path: `${S}/rock_03_void5.png` });
// void4 로 돌아가면 자물쇠 없음 + 문이 바로 열림
await page.evaluate(() => game.changeMap('void4', 'door_back', true)); await page.waitForTimeout(300); s = await st();
check('back in void4: padlock gone', !s.padlock);
await stand(2300, 236, 'right'); await hold('ArrowRight', 700); await page.waitForTimeout(400); s = await st();
check('open door: walking past does NOT warp', s.map === 'void4');
await doorC(); await page.waitForTimeout(1200); s = await st();
check('open door: C passes straight to void5', s.map === 'void5' && !s.running, s.map);

// ── 3) 낙석 맵 ──
const crossMap = async (mapId, expectLanes, exitDir, nextMap) => {
  s = await st(); check(`${mapId}: ${expectLanes} rockfall lanes`, s.map === mapId && s.rocks.length === expectLanes, JSON.stringify({ map: s.map, n: s.rocks.length }));
  // 빛기둥 → 낙하 → 착지 순서 관찰
  await hookSfx();
  const seen = new Set(); let minRy = 9999; { const t0 = Date.now(); while (Date.now() - t0 < 3000) { const r = (await st()).rocks[0]; seen.add(r.phase); if (r.phase === 'fall') minRy = Math.min(minRy, r.ry); await page.waitForTimeout(40); } }
  check(`${mapId}: lane cycles warn→fall→rest→idle`, ['warn', 'fall', 'rest', 'idle'].every((p) => seen.has(p)), [...seen].join(','));
  check(`${mapId}: rock sweeps the whole path from above (seen above top row)`, minRy < 176, `minRy=${minRy}`);
  check(`${mapId}: rock is wide (≥40px)`, s.rocks[0].rw >= 40, `rw=${s.rocks[0].rw}`);
  check(`${mapId}: first lane is 8 tiles past the entrance`, s.rocks[0].x >= 300, `x=${s.rocks[0].x}`);
  check(`${mapId}: lanes 5 tiles apart`, s.rocks.every((r, i) => i === 0 || r.x - s.rocks[i - 1].x === 160), JSON.stringify(s.rocks.map((r) => r.x)));
  { const sf = (await st()).sfx; check(`${mapId}: rocks make no sound`, !sf.some((n) => n === 'thud'), sf.join(',')); }
  if (mapId === 'void5') {
    // 맞아보기: 레인 위에 서 있기
    const lane = s.rocks[0].x; await stand(lane - 12, 168, 'right'); let h; { const t0 = Date.now(); do { await page.waitForTimeout(40); h = await st(); } while (Date.now() - t0 < 3000 && !h.invuln); }
    const atHit = h.p[0];
    check('void5: standing on the TOP row of a lane still gets hit (rock passes through) + red flash + slide starts', h.invuln && (h.hurt || h.knock) && atHit > lane - 40, JSON.stringify({ lane, p: h.p, hurt: h.hurt, knock: h.knock }));
    await page.waitForTimeout(450); h = await st();
    check('void5: slid left (not teleported), ~36px, and hit was silent', h.p[0] < lane - 30 && h.p[0] > lane - 80 && !h.sfx.includes('thud'), JSON.stringify({ lane, from: atHit, to: h.p, sfx: h.sfx }));
    await page.screenshot({ path: `${S}/rock_04_hit.png` });
  }
  // 안전하게 건너기: 각 레인 앞에서 'rest' 가 끝나는 순간(idle 진입)에 달려서 통과
  for (let i = 0; i < expectLanes; i++) {
    const lane = (await st()).rocks[i].x;
    await stand(lane - 60, 176 - 8, 'right');
    { const t0 = Date.now(); let prev = ''; while (Date.now() - t0 < 5000) { const r = (await st()).rocks[i]; if (prev === 'rest' && r.phase === 'idle') break; prev = r.phase; await page.waitForTimeout(25); } }
    await hold('ArrowRight', 420); await page.waitForTimeout(80);
    const q = await st(); if (q.p[0] < lane + 10) { logs.push(`[info] ${mapId} lane ${i} retry`); i--; continue; }
  }
  if (i_shot(mapId)) await page.screenshot({ path: `${S}/rock_05_${mapId}.png` });
  s = await st(); check(`${mapId}: crossed all lanes without being hit`, s.p[0] > s.rocks[expectLanes - 1].x + 10 && !s.invuln, JSON.stringify(s.p));
  // 꼬리 길 이벤트 (낙석 없는 구간)
  if (mapId === 'void5') {
    let L = await talk(924, 168, 'right', [0]);   // 꽃: 왼쪽에서 다가가 C(소품이 스프라이트에 안 가리게) — 냄새를 맡게 시킨다
    check('void5 flowers: 꽃들이다 → 네 왜요? → [냄새] → 아 넵 → 킁킁 → .... → 냄새 존나 구려요 → ㅋㅋ 갈길', ['꽃들이다', '네 왜요?', '아 넵', '킁킁', '....', '냄새 존나 구려요', 'ㅋㅋ 갈길 가야겠다'].every((k) => L.some((l) => l.includes(k))), JSON.stringify(L));
    s = await st(); check('void5 flowers: staged relative to the flowers (player ends below the flowers, same column as ppaman)', s.p[1] >= 210 && Math.abs(s.p[0] - 1004) < 6, JSON.stringify(s.p));
    check('void5 flowers: follower regrouped after sniffing', s.f && Math.hypot(s.p[0] - s.f[0], s.p[1] - s.f[1]) < 70 && s.flags.flowers_sniffed, JSON.stringify({ p: s.p, f: s.f }));
    L = await talk(924, 168, 'right', [1]);
    check('void5 flowers again: 저 이제 안 맡을 거예요', L.some((l) => l.includes('안 맡을')), JSON.stringify(L));
    // 오른쪽에서 눌러도 같은 자리(꽃 아래·그 아래), 겹치지 않고 막힌 칸이 아님
    await page.evaluate(() => { delete game.flags.flowers_sniffed; });
    { await stand(1084, 168, 'left'); await page.waitForTimeout(300); await page.keyboard.press('KeyC'); let snap = null; const t0 = Date.now();
      while (Date.now() - t0 < 12000) { await page.waitForTimeout(80); const q = await st(); if (!q.running) break; if (q.text.includes('킁킁') && !snap) { snap = await page.evaluate(() => { const f = game.entities.find((e) => e.def?.type === 'follower'), p = game.player, fl = game.entities.find((e) => e.id === 'flowers'); return { p: [p.x, p.y], f: [f.x, f.y], fl: [fl.x, fl.y, fl.w, fl.h], pSolid: game.map.solidRect(p.x, p.y, p.w, p.h), dist: Math.hypot(p.x - f.x, p.y - f.y) }; }); await page.screenshot({ path: `${S}/rock_08_flowers_right.png` }); } if (q.box === 'choice') { await page.keyboard.press('KeyC'); } else if (q.box === 'waiting' || q.box === 'typing') await page.keyboard.press('KeyC'); }
      check('void5 flowers from the RIGHT: staged relative to the flowers (ppaman below flowers, player further below), no overlap, not stuck', snap && Math.abs(snap.f[0] - (snap.fl[0] + snap.fl[2] / 2 - 12)) < 4 && snap.p[1] >= snap.f[1] + 30 && snap.dist >= 30 && !snap.pSolid, JSON.stringify(snap)); }
  }
  if (mapId === 'void6') {
    const L = await talk(1384, 170, 'right');
    check('void6 sign: 표지판이다 → 낙석 주의 → 지금 알려주면 → 맞는 말이다', ['표지판이다', '낙석 주의', '지금 알려주면', '맞는 말이다'].every((k) => L.some((l) => l.includes(k))), JSON.stringify(L));
  }
  if (mapId === 'void7') {
    let L = await talk(1850, 214, 'right', [0]);   // 말린다
    check('void7 boulder: 떨어진 바위다 → 차볼게요 → [말린다] → 아 넵 → 현명했다', ['떨어진 바위', '차볼게요', '아 넵', '현명했다'].every((k) => L.some((l) => l.includes(k))), JSON.stringify(L));
    L = await talk(1850, 214, 'right', [1]);       // 내버려 둔다
    check('void7 boulder kick: 얍! → 아 ㅅㅂ 발 → ㅂㅅ같다 → 갈길', ['얍!', 'ㅅㅂ', 'ㅂㅅ같다', '갈길 가야겠다'].every((k) => L.some((l) => l.includes(k))), JSON.stringify(L));
    s = await st(); check('void7 boulder: follower regrouped, flag', s.flags.boulder_kicked && s.f && Math.hypot(s.p[0] - s.f[0], s.p[1] - s.f[1]) < 70, JSON.stringify({ p: s.p, f: s.f }));
    L = await talk(1850, 214, 'right'); check('void7 boulder again: 다신 안 차요', L.some((l) => l.includes('다신 안')), JSON.stringify(L));
  }
  // 출구
  if (exitDir === 'down') { await stand((await page.evaluate(() => game.map.pxW)) - 3 * 32 + 4, 176 - 8, 'down'); await hold('ArrowDown', 1600); }
  else { await stand((await page.evaluate(() => game.map.pxW)) - 4 * 32, 176 - 8, 'right'); await hold('ArrowRight', 900); }
  await page.waitForTimeout(900); s = await st();
  check(`${mapId}: exit → ${nextMap}, bgm continues`, s.map === nextMap && s.bgm === 'scarlet' && !!s.f, JSON.stringify({ map: s.map, bgm: s.bgm }));
};
const i_shot = (m) => true;
await page.goto('http://127.0.0.1:8000/index.html?qa=rock1'); await ready(); await page.waitForTimeout(400);
await crossMap('void5', 3, 'down', 'void6');
await crossMap('void6', 6, 'down', 'void7');
await crossMap('void7', 9, 'right', 'void8');
await page.screenshot({ path: `${S}/rock_06_void8.png` });
// QA 지점
for (const [id, m] of [['rock2', 'void6'], ['rock3', 'void7']]) { await page.goto(`http://127.0.0.1:8000/index.html?qa=${id}`); await ready(); await page.waitForTimeout(300); s = await st(); check(`qa=${id} → ${m} with party`, s.map === m && !!s.f && s.bgm === 'scarlet', JSON.stringify({ map: s.map, bgm: s.bgm })); }
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
