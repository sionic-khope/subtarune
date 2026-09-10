// 보라맵10 미로 검증: ?qa=void10 → 도착 컷신(카메라가 출구로 → 브금 꺼짐 → 쥰희 "형 빨리 오샘" 포탈로 사라짐 → 경섭 "어 그래 어휴.." → 브금 복귀 → 카메라 주인공에게)
//   → 미로가 시작~출구까지 걸어서 풀림(BFS) → 표지판 5개 대사(진행 순서) → 오른쪽 가장자리로 나가면 void11: 형섭이 먼저 보이고(브금 없음) 카메라가 오른쪽으로 이동하며 컷신.
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
const st = () => page.evaluate(() => { const ent = (id) => { const e = game.entities.find((x) => x.id === id); return e ? { x: Math.round(e.x), y: Math.round(e.y), vis: e.visible !== false, dead: !!e.dead } : null; };
  return { map: game.mapId, running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: game.textbox.node?.text || '', p: [Math.round(game.player.x), Math.round(game.player.y)],
    f: game.entities.filter((e) => e.def?.type === 'follower').map((x) => ({ id: x.id, vis: x.visible })), flags: { ...game.flags }, bgm: game.sound.bgmName || null,
    cam: { x: Math.round(game.camera.x), y: Math.round(game.camera.y), locked: game.camera.locked, onPlayer: game.camera.target === game.player }, junhee: ent('junhee'), gyeongsub: ent('gyeongsub'), transitioning: game.transitioning }; });
const stand = (x, y, f) => page.evaluate(([x, y, f]) => { game.player.x = x; game.player.y = y; game.player.facing = f; game.player.trail = []; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); game.camera.snap(); }, [x, y, f]);
/** 진행 중인 컷신을 끝까지 넘기며 대사·관찰값을 모은다 */
const drain = async (maxMs, probe) => {
  const out = []; const obs = []; const t0 = Date.now(); let idle = 0;
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(90); const s = await st(); if (probe) obs.push(probe(s));
    if (!s.running) { if (++idle > 4) break; continue; } idle = 0;
    const k = (s.speaker || '') + '|' + s.text.replace(/\{[^}]*\}/g, '');
    if (s.box === 'choice') { if (!out.includes(k)) out.push(k); await page.keyboard.press('KeyC'); }
    else if (s.box === 'waiting') { if (!out.includes(k)) out.push(k); await page.keyboard.press('KeyC'); }
    else if (s.box === 'typing') { if (!out.includes(k)) out.push(k); await page.keyboard.press('KeyC'); }
  }
  return { lines: out, obs };
};
const talk = async (x, y, f) => { await stand(x, y, f); await page.waitForTimeout(250); await page.keyboard.press('KeyC'); return (await drain(8000)).lines; };

await page.goto('http://127.0.0.1:8000/index.html?qa=void10'); await ready(); await page.waitForTimeout(150);
let s = await st(); check('qa=void10: maze with party, intro starts (junhee/gyeongsub NPCs present)', s.map === 'void10' && s.f.length === 1 && s.junhee && s.gyeongsub, JSON.stringify({ map: s.map, f: s.f, j: s.junhee, g: s.gyeongsub }));
{ let shot = false;
  const r = await drain(30000, (q) => { if (q.text.includes('빨리 오샘') && !shot) { shot = true; page.screenshot({ path: `${S}/void10_01_intro.png` }).catch(() => {}); } return { bgm: q.bgm, cam: q.cam.x, jvis: q.junhee ? q.junhee.vis : null, gvis: q.gyeongsub ? q.gyeongsub.vis : null, running: q.running, gap: q.junhee && q.gyeongsub ? Math.hypot(q.junhee.x - q.gyeongsub.x, q.junhee.y - q.gyeongsub.y) : null, text: q.text, jx: q.junhee?.x ?? null }; });
  { const at = r.obs.find((o) => o.text.includes('빨리 오샘')); check('intro: 쥰희 and 경섭 stand apart (≥ 70px) while she speaks', at && at.gap >= 70, JSON.stringify({ gap: at?.gap })); }
  check('intro: 쥰희 walked out past the right map edge before vanishing (no portal)', r.obs.some((o) => o.jx !== null && o.jx > 1430) && !(await page.evaluate(() => game.entities.some((e) => e.id === 'portal'))), 'maxJx=' + Math.max(...r.obs.map((o) => o.jx ?? -1)));
  check('intro: 쥰희 "형 빨리 오샘" → 경섭 "어 그래 어휴.."', ['쥰희|* 형 빨리 오샘', '경섭|* 어 그래 어휴..'].every((k) => r.lines.includes(k)), JSON.stringify(r.lines));
  check('intro: camera panned to the exit (far right) during the scene', r.obs.some((o) => o.cam > 900), 'maxCam=' + Math.max(...r.obs.map((o) => o.cam)));
  check('intro: bgm off while they talk, back to scarlet after', r.obs.some((o) => o.running && o.bgm === null) && (await st()).bgm === 'scarlet', JSON.stringify([...new Set(r.obs.map((o) => o.bgm))]));
  const q = await st();
  check('intro: junhee then gyeongsub walked off and vanished', q.junhee && !q.junhee.vis && q.gyeongsub && !q.gyeongsub.vis && r.obs.some((o) => o.jvis === false && o.gvis === true), JSON.stringify({ j: q.junhee, g: q.gyeongsub }));
  check('intro: camera returned to the player and follows', q.cam.onPlayer && !q.cam.locked && Math.abs(q.cam.x) < 200, JSON.stringify(q.cam));
  check('intro: flag void10_intro set, no re-run', q.flags.void10_intro === true && !q.running, JSON.stringify({ f: q.flags.void10_intro, running: q.running })); }
// 미로: 시작 타일 → 출구(포탈 문)까지 걸어서 도달 가능한가 (플레이어 히트박스로 BFS)
{ const r = await page.evaluate(() => { const m = game.map, p = game.player; const meta = game.entities.length && (window.MAPS?.void10?.meta); const door = game.entities.find((e) => e.def?.type === 'door' && e.def.to === 'void11');
    const cols = m.cols ?? m.w ?? 46, rows = m.rows?.length ?? m.h ?? 34; const free = (tx, ty) => !m.solidRect(tx * 32 + 4, ty * 32 + 10, p.w, p.h) && !game.entities.some((e) => e.solid && !e.dead && e.def?.type === 'prop' && e.overlaps({ x: tx * 32 + 4, y: ty * 32 + 10, w: p.w, h: p.h }));
    const start = [Math.floor(p.x / 32), Math.floor(p.y / 32)], goal = [Math.floor((door.x + door.w / 2) / 32), Math.floor((door.y + door.h - 4) / 32)];
    const key = (c, r) => c + ',' + r; const dist = new Map([[key(...start), 0]]); const q = [start]; let found = null;
    while (q.length) { const [c, r] = q.shift(); if (c === goal[0] && r === goal[1]) { found = dist.get(key(c, r)); break; }
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = c + dc, nr = r + dr; if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || dist.has(key(nc, nr)) || !free(nc, nr)) continue; dist.set(key(nc, nr), dist.get(key(c, r)) + 1); q.push([nc, nr]); } }
    return { start, goal, found, reached: dist.size, signs: game.entities.filter((e) => /^sign\d$/.test(e.id)).map((e) => ({ id: e.id, x: e.x, y: e.y, w: e.w, h: e.h })) }; });
  check('maze: exit reachable on foot from the start, long enough to be a maze', r.found !== null && r.found >= 80, JSON.stringify({ start: r.start, goal: r.goal, tiles: r.found }));
  check('maze: 5 signs placed', r.signs.length === 5, JSON.stringify(r.signs.map((x) => x.id)));
  // 표지판: 아래(막혔으면 위)에서 C
  const KEYS = [['외딴섬'], ['아직 여기 계시는'], ['0/0/0', '0/32/1', '뭐라는거지'], ['치지직'], ['나갈 수 없어', '너만큼은']];
  for (let i = 0; i < 5; i++) {
    const sg = r.signs.find((x) => x.id === 'sign' + (i + 1));
    const pos = await page.evaluate(([sg]) => { const p = game.player; const below = { x: sg.x + sg.w / 2 - p.w / 2, y: sg.y + sg.h + 6, f: 'up' }, above = { x: sg.x + sg.w / 2 - p.w / 2, y: sg.y - p.h - 6, f: 'down' }; return game.map.solidRect(below.x, below.y, p.w, p.h) ? above : below; }, [sg]);
    const L = await talk(pos.x, pos.y, pos.f);
    if (i === 2) await page.screenshot({ path: `${S}/void10_02_sign3.png` }).catch(() => {});
    check(`sign${i + 1}: ${KEYS[i].join(' / ')}`, L.some((l) => l.includes('표지판')) && KEYS[i].every((k) => L.some((l) => l.includes(k))), JSON.stringify(L));
  }
  // 출구: 오른쪽 가장자리로 걸어 나간다
  const door = await page.evaluate(() => { const d = game.entities.find((e) => e.def?.type === 'door' && e.def.to === 'void11'); return { x: d.x, y: d.y, w: d.w, h: d.h }; });
  await stand(door.x - 70, door.y + 30, 'right'); await page.waitForTimeout(200); await page.screenshot({ path: `${S}/void10_03_exit.png` });
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(900); await page.keyboard.up('ArrowRight');
  const early = []; const t0 = Date.now(); while (Date.now() - t0 < 4500) { await page.waitForTimeout(40); const q = await st(); if (q.map === 'void11') early.push({ cam: q.cam.x, p: q.p[0], running: q.running, tr: q.transitioning, bgm: q.bgm }); }
  check('edge → void11', early.length > 0, JSON.stringify(early.slice(0, 2)));
  check('void11: player framed first (cam near x≈100), bgm silent, then the camera pans right past 500 to the pair', early.length > 0 && early[0].cam < 200 && early[0].bgm === null && early.some((o) => o.cam > 500), JSON.stringify({ first: early[0], max: Math.max(...early.map((o) => o.cam)) }));
  check('void11: intro cutscene running after arrival', early.some((o) => o.running), '');
  await page.screenshot({ path: `${S}/void10_04_void11_cut.png` }); }
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
