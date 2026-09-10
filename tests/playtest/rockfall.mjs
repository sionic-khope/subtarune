// 레버 열쇠 → 철컥 문 → 낙석 맵 3개(3/6/9) → 다음 방 검증.
//   ?qa=key → 문에 닿음 → 억빠맨 "어라 문이 잠겨있네요" → 억빠맨이 앞장서 레버로(플레이어 따라감) → "음음 이 레버를" → 레버 사라짐 → "뽑아버렸다" → "열쇠?를 얻었다"(인벤토리)
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
const st = () => page.evaluate(() => { const f = game.entities.find((e) => e.def?.type === 'follower'); return { map: game.mapId, running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: game.textbox.node?.text || '', p: [Math.round(game.player.x), Math.round(game.player.y)], f: f ? [Math.round(f.x), Math.round(f.y)] : null, flags: { ...game.flags }, inv: [...game.inventory], bgm: game.sound.bgmName, leverOn: !!game.entities.find((e) => e.id === 'lever_on' && !e.dead && e.visible), padlock: !!game.entities.find((e) => e.id === 'padlock' && !e.dead), rocks: game.entities.filter((e) => e.def?.type === 'rockfall').map((r) => ({ x: r.lx, phase: r.phase, k: +r.k.toFixed(2) })), hurt: game.hurt > 0, invuln: game.invuln > 0 }; });
const stand = (x, y, f) => page.evaluate(([x, y, f]) => { game.player.x = x; game.player.y = y; game.player.facing = f; game.player.trail = []; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); game.camera.snap(); }, [x, y, f]);
const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };
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

// ── 1) 잠긴 문 → 레버 열쇠 ──
await page.goto('http://127.0.0.1:8000/index.html?qa=key'); await ready(); await page.waitForTimeout(400);
let s = await st(); check('qa=key: void4 landing with party', s.map === 'void4' && s.flags.ppaman_joined && !!s.f, JSON.stringify({ p: s.p, f: s.f }));
await stand(2350, 300, 'right'); await page.waitForTimeout(700); await hold('ArrowRight', 500);
let lines = []; let ppamanAtLever = false;
{ const t0 = Date.now(); while (Date.now() - t0 < 30000) { await page.waitForTimeout(150); s = await st(); if (!s.running && lines.length) break; if (s.f && s.f[1] < 100 && s.f[0] < 2260) ppamanAtLever = true; if (s.box === 'waiting') { const k = (s.speaker || '') + '|' + s.text; if (!lines.includes(k)) lines.push(k); if (s.text.includes('이 레버를')) await page.screenshot({ path: `${S}/rock_01_lever.png` }); await page.keyboard.press('KeyC'); } else if (s.box === 'typing') await page.keyboard.press('KeyC'); } }
check('door: 어라 문이 잠겨있네요 / 아까 레버에', lines.some((l) => l.includes('문이 잠겨있네요')) && lines.some((l) => l.includes('레버에 뭐 없으셨어요')), JSON.stringify(lines.slice(0, 2)));
check('ppaman led the way to the lever (upper platform)', ppamanAtLever);
s = await st();
check('player followed up to the platform', s.p[1] < 100 && s.p[0] > 2260, JSON.stringify(s.p));
check('음음 이 레버를 → 뽑아버렸다 → 열쇠', lines.some((l) => l.includes('이 레버를')) && lines.some((l) => l.startsWith('|') && l.includes('뽑아버렸다')) && lines.some((l) => l.includes('열쇠로 쓰면')) && lines.some((l) => l.includes('열쇠?')), JSON.stringify(lines.slice(2)));
check('lever gone, key in inventory, flag', !s.leverOn && s.inv.includes('열쇠?') && s.flags.lever_taken, JSON.stringify({ lever: s.leverOn, inv: s.inv }));
check('follower regrouped near player', s.f && Math.hypot(s.p[0] - s.f[0], s.p[1] - s.f[1]) < 40, JSON.stringify({ p: s.p, f: s.f }));
await page.screenshot({ path: `${S}/rock_02_key.png` });
// ── 2) 문 열기 ──
await stand(2350, 300, 'right'); await page.waitForTimeout(700); await hold('ArrowRight', 500);
lines = await collect();
await page.waitForTimeout(800); s = await st();
check('철컥! 문이 열렸다 → ㅎㅎ', lines.some((l) => l.includes('철컥')) && lines.some((l) => l.includes('ㅎㅎ')), JSON.stringify(lines));
check('now in void5 with scarlet bgm, party along', s.map === 'void5' && s.bgm === 'scarlet' && !!s.f && s.flags.door_open, JSON.stringify({ map: s.map, bgm: s.bgm }));
await page.screenshot({ path: `${S}/rock_03_void5.png` });
// void4 로 돌아가면 자물쇠 없음 + 문이 바로 열림
await page.evaluate(() => game.changeMap('void4', 'door_back', true)); await page.waitForTimeout(300); s = await st();
check('back in void4: padlock gone', !s.padlock);
await page.waitForTimeout(600); await hold('ArrowRight', 700); await page.waitForTimeout(900); s = await st();
check('open door passes straight to void5', s.map === 'void5' && !s.running, s.map);

// ── 3) 낙석 맵 ──
const crossMap = async (mapId, expectLanes, exitDir, nextMap) => {
  s = await st(); check(`${mapId}: ${expectLanes} rockfall lanes`, s.map === mapId && s.rocks.length === expectLanes, JSON.stringify({ map: s.map, n: s.rocks.length }));
  // 빛기둥 → 낙하 → 착지 순서 관찰
  const seen = new Set(); { const t0 = Date.now(); while (Date.now() - t0 < 3000) { const r = (await st()).rocks[0]; seen.add(r.phase); await page.waitForTimeout(60); } }
  check(`${mapId}: lane cycles warn→fall→rest→idle`, ['warn', 'fall', 'rest', 'idle'].every((p) => seen.has(p)), [...seen].join(','));
  if (mapId === 'void5') {
    // 맞아보기: 레인 위에 서 있기
    const lane = s.rocks[0].x; await stand(lane - 12, 168, 'right'); let h; { const t0 = Date.now(); do { await page.waitForTimeout(80); h = await st(); } while (Date.now() - t0 < 3000 && !h.invuln); }
    check('void5: standing on a lane → knocked back left + red flash', h.p[0] < lane - 30 && (h.hurt || h.invuln), JSON.stringify({ lane, p: h.p, hurt: h.hurt, invuln: h.invuln }));
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
