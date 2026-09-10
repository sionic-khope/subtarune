// 청록숲 3 검증: ?qa=teal3 → 아래 길에서 위 공터로 → 공구상자 C: 브금 꺼짐 → 셋이 상자 기준으로 흩어져 상자를 바라봄 → 대사 → 오른쪽 풀숲에서 CS 두 마리가 튀어나옴(hop)
//   → 대사 → CS 점프 → 셋이 한 칸 물러나 오른쪽을 봄 → 빠맨이 상자→형섭→상자→경섭 달리기 → "오 온다!" → 전투 시작 연출(줌·흰 섬광) → 자리표시 → 재조작 가능·동료 재정렬 → 재방문 대사.
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
const st = () => page.evaluate(() => { const ent = (id) => { const e = game.entities.find((x) => x.id === id); return e ? { x: Math.round(e.x), y: Math.round(e.y), facing: e.facing, hopY: Math.round(e.hopY || 0), emote: e.emote?.kind || null, dead: !!e.dead } : null; };
  return { map: game.mapId, running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: (game.textbox.node?.text || '').replace(/\{[^}]*\}/g, ''), p: [Math.round(game.player.x), Math.round(game.player.y)], pf: game.player.facing,
    pp: ent('ppaman'), gs: ent('gyeongsub'), cs1: ent('cs1'), cs2: ent('cs2'), bgm: game.sound.bgmName || null, zoom: +(game.zoom?.s ?? 1).toFixed(2), shake: !!game.shake, flags: { ...game.flags }, f: game.entities.filter((e) => e.def?.type === 'follower').map((x) => ({ id: x.id, x: Math.round(x.x), y: Math.round(x.y), vis: x.visible })) }; });
const stand = (x, y, f) => page.evaluate(([x, y, f]) => { game.player.x = x; game.player.y = y; game.player.facing = f; game.player.trail = []; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); game.camera.snap(); }, [x, y, f]);
const drain = async (maxMs, probe) => {
  const out = []; const obs = []; const t0 = Date.now(); let idle = 0;
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(80); const s = await st(); if (probe) obs.push(await probe(s));
    if (!s.running) { if (++idle > 4) break; continue; } idle = 0;
    const k = (s.speaker || '') + '|' + s.text;
    if (s.box === 'choice') { await page.waitForTimeout(500); await page.keyboard.press('KeyC'); }
    else if (s.box === 'waiting' || s.box === 'typing') { if (s.text && !out.includes(k)) out.push(k); await page.keyboard.press('KeyC'); }
  }
  return { lines: out, obs };
};

await page.goto('http://127.0.0.1:8000/index.html?qa=teal3'); await ready(); await page.waitForTimeout(500);
let s = await st();
check('qa=teal3: forest clearing map, party of 2, bgm hopes', s.map === 'teal3' && s.f.length === 2 && s.bgm === 'hopes', JSON.stringify({ map: s.map, f: s.f.length, bgm: s.bgm }));
const meta = await page.evaluate(async () => (await import('/src/data/maps.js')).MAPS.teal3.meta);
{ const info = await page.evaluate(() => ({ trees: game.entities.filter((e) => e.image && e.def?.image === 'assets/props/tree_forest.png').length, bushes: game.entities.filter((e) => e.def?.image === 'assets/props/bush_teal.png').length, box: !!game.entities.find((e) => e.id === 'toolbox'), leaves: (window.__rows = null, true) }));
  const rows = await page.evaluate(async () => (await import('/src/data/maps.js')).MAPS.teal3.rows);
  check('teal3: dense forest trees (≥ 25), bushes on the right, leaves scattered, toolbox in the middle', info.trees >= 25 && info.bushes >= 3 && info.box && rows.some((r) => r.includes('n')), JSON.stringify(info)); }
// 아래 길 → 공터 (걸어서 올라감)
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(2600); await page.keyboard.up('ArrowUp'); s = await st();
check('walked up the path into the clearing', s.p[1] < meta.clearing[3] * 32 + 16, JSON.stringify(s.p));
await page.screenshot({ path: `${S}/teal3_01_clearing.png` });
// 공구상자 C
const [bx, by] = meta.box;
await stand(bx + 4, by + 24, 'up'); await page.waitForTimeout(250); await page.keyboard.press('KeyC');
const shots = { spread: false, pop: false, jump: false, back: false, flash: false };
const r = await drain(90000, async (q) => {
  if (q.text.startsWith('* 뭔가 많이') && !shots.spread) { shots.spread = true; await page.screenshot({ path: `${S}/teal3_02_spread.png` }).catch(() => {}); }
  if (q.cs1 && q.cs1.hopY > 6 && !shots.pop) { shots.pop = true; await page.screenshot({ path: `${S}/teal3_03_pop.png` }).catch(() => {}); }
  if (q.text.startsWith('* 아 안되겠다') && !shots.back) { shots.back = true; await page.screenshot({ path: `${S}/teal3_04_back.png` }).catch(() => {}); }
  if (q.zoom > 1.3 && !shots.flash) { shots.flash = true; await page.screenshot({ path: `${S}/teal3_05_battle.png` }).catch(() => {}); }
  return { text: q.text.slice(0, 12), bgm: q.bgm, p: q.p, pf: q.pf, pp: q.pp, gs: q.gs, cs1: q.cs1, cs2: q.cs2, zoom: q.zoom, shake: q.shake };
});
const L = r.lines, o = r.obs; const li = (t) => o.findIndex((x) => x.text.startsWith(t));
const ORDER = ['억빠맨|* 뭔가 많이 들어있네요', '경섭|* 응 그렇네', '억빠맨|* 응? 이게 무슨소리죠', '경섭|* ???', '억빠맨|* 앗 ... ... 엥 CS?', '경섭|* 허허 저게 뭐냐 근데 뭔가 꼭... 우리를', '억빠맨|* 아 안되겠다 싸 싸워야할거같은데요? ㅈ ㅈ됐다. 빨리 이 상자에서 아무거나 꺼네봐요 !!!', '억빠맨|* 오 온다!'];
const idx = ORDER.map((k) => L.indexOf(k));
check('toolbox scene: 8 lines in briefing order', idx.every((i) => i >= 0) && idx.every((v, i) => i === 0 || v > idx[i - 1]), JSON.stringify(ORDER.filter((k, i) => idx[i] < 0)) + ' got=' + JSON.stringify(L));
{ const a = o[li('* 뭔가 많이')];
  check('bgm off when the scene starts', a && a.bgm === null, JSON.stringify({ bgm: a?.bgm }));
  check('spread around the box facing it: player below (up), ppaman left (right), gyeongsub right (left)', a && a.p[1] > by && a.pf === 'up' && a.pp.x < bx && a.pp.facing === 'right' && a.gs.x > bx + 32 && a.gs.facing === 'left', JSON.stringify({ p: a?.p, pf: a?.pf, pp: a?.pp, gs: a?.gs }));
  const q1 = li('* ???'), q2 = li('* 앗');
  check('CS minions appear from the right bushes after "???" and hop out (hopY > 6, moved left)', o.slice(q1, q2 + 1).some((x) => x.cs1 && x.cs1.hopY > 6) && o[q2] && o[q2].cs1 && o[q2].cs1.x < 850 && o[q2].cs2 && o[q2].cs2.x < 850 && !o[q1 - 1]?.cs1, JSON.stringify({ atQ: o[q2]?.cs1, before: o[q1 - 1]?.cs1 }));
  const j0 = li('* 허허 저게'), j1 = li('* 아 안되겠다');
  check('CS jump staging between "허허 저게 뭐냐" and "아 안되겠다"', o.slice(j0, j1).filter((x) => x.cs1 && x.cs1.hopY > 6).length >= 2, '');
  const b = o[j1];
  check('all three stepped back one tile (x −32) and face right', b && b.p[0] === a.p[0] - 32 && b.pp.x === a.pp.x - 32 && b.gs.x === a.gs.x - 32 && b.pf === 'right' && b.pp.facing === 'right' && b.gs.facing === 'right', JSON.stringify({ a: [a?.p, a?.pp?.x, a?.gs?.x], b: [b?.p, b?.pp?.x, b?.gs?.x, b?.pf, b?.pp?.facing, b?.gs?.facing] }));
  const run = o.slice(j1, li('* 오 온다')).map((x) => x.pp?.x ?? 0);
  const nearBox = run.some((x) => Math.abs(x + 12 - (bx + 16)) < 14), nearPlayer = run.some((x) => b && Math.abs(x - (b.p[0] - 32)) < 14), nearGs = run.some((x) => b && Math.abs(x - (b.gs.x - 32)) < 14);
  check('ppaman ran to the box, then to the player, back to the box, then to gyeongsub', nearBox && nearPlayer && nearGs, JSON.stringify({ nearBox, nearPlayer, nearGs, minX: Math.min(...run), maxX: Math.max(...run) }));
  const k = li('* 오 온다');
  check('battle start: zoom-in + shake after "오 온다!"', o.slice(k).some((x) => x.zoom > 1.3) && o.slice(k).some((x) => x.shake), JSON.stringify({ maxZoom: Math.max(...o.slice(Math.max(0, k)).map((x) => x.zoom)) })); }
s = await st();
check('after the placeholder: flag set, CS removed, zoom back, followers regrouped, controllable', s.flags.teal3_battle_pending === true && (!s.cs1 || s.cs1.dead) && (!s.cs2 || s.cs2.dead) && s.zoom === 1 && !s.running && s.f.every((x) => x.vis && Math.hypot(x.x - s.p[0], x.y - s.p[1]) < 140), JSON.stringify({ flags: s.flags.teal3_battle_pending, cs1: s.cs1, zoom: s.zoom, f: s.f, p: s.p }));
{ await stand(bx + 4, by + 24, 'up'); await page.waitForTimeout(250); await page.keyboard.press('KeyC'); const r2 = await drain(6000);
  check('toolbox again: 공구상자다. 뭔가 많이 들어 있다.', r2.lines.some((l) => l.includes('뭔가 많이 들어 있다')), JSON.stringify(r2.lines)); }
await page.screenshot({ path: `${S}/teal3_06_after.png` });
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
