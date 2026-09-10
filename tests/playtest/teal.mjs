// 청록숲 검증: ?qa=teal1 → 청록 타일·수풀 배경·Weird Birds → 오른쪽 끝 → teal2(Field of Hopes and Dreams)
//   → 동상 벽이 오른쪽을 막음 → 벽 동상에 C: 빠맨·경섭 대사 → 빠맨 몸통 박치기(hop)·쿵·흔들림·식은땀 → "다른 방법을 찾아봐야겠다" → 카메라가 위 길을 비춤 → 재방문 대사 → 깔린 동상 나레이션 → 위 길 → teal3 → 되돌아오기.
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
const st = () => page.evaluate(() => { const pp = game.entities.find((e) => e.def?.type === 'follower' && e.id === 'ppaman');
  return { map: game.mapId, running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: game.textbox.node?.text || '', p: [Math.round(game.player.x), Math.round(game.player.y)],
    f: game.entities.filter((e) => e.def?.type === 'follower').map((x) => ({ id: x.id, x: Math.round(x.x), y: Math.round(x.y), vis: x.visible })), party: [...game.party], flags: { ...game.flags }, bgm: game.sound.bgmName || null,
    cam: { x: Math.round(game.camera.x), y: Math.round(game.camera.y), onPlayer: game.camera.target === game.player }, pp: pp ? { x: Math.round(pp.x), hopY: Math.round(pp.hopY || 0), emote: pp.emote?.kind || null } : null, shake: !!game.shake }; });
const mapdef = (id) => page.evaluate(async ([id]) => { const { MAPS } = await import('/src/data/maps.js'); const m = MAPS[id]; return { backdrop: m.backdrop || null, rows: m.rows, meta: m.meta || null }; }, [id]);
const stand = (x, y, f) => page.evaluate(([x, y, f]) => { game.player.x = x; game.player.y = y; game.player.facing = f; game.player.trail = []; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); game.camera.snap(); }, [x, y, f]);
const drain = async (maxMs, probe) => {
  const out = []; const obs = []; const t0 = Date.now(); let idle = 0;
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(80); const s = await st(); if (probe) obs.push(await probe(s));
    if (!s.running) { if (++idle > 4) break; continue; } idle = 0;
    const k = (s.speaker || '') + '|' + s.text.replace(/\{[^}]*\}/g, '');
    if (s.box === 'waiting' || s.box === 'typing' || s.box === 'choice') { if (!out.includes(k)) out.push(k); await page.keyboard.press('KeyC'); }
  }
  return { lines: out, obs };
};
const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(150); };

await page.goto('http://127.0.0.1:8000/index.html?qa=teal1'); await ready(); await page.waitForTimeout(700);
let s = await st();
const d1 = await mapdef('teal1');
check('qa=teal1: teal forest, party of 2, Weird Birds, teal_bush backdrop', s.map === 'teal1' && s.f.length === 2 && s.bgm === 'weird_birds' && d1.backdrop === 'teal_bush', JSON.stringify({ map: s.map, f: s.f.length, bgm: s.bgm, bd: d1.backdrop }));
{ const rows = d1.rows; const t = { teal: rows.some((r) => /[tu]/.test(r)), grass: rows.some((r) => r.includes('g')), cliff: rows.some((r) => r.includes('v')), purple: rows.some((r) => /[xXy]/.test(r)) };
  check('teal1 tiles: teal ground/grass/cliff, no purple', t.teal && t.grass && t.cliff && !t.purple, JSON.stringify(t)); }
await page.screenshot({ path: `${S}/teal_01_road.png` });
// 오른쪽 끝 → teal2
await stand(62 * 32 - 60, 6 * 32 + 8, 'right'); await hold('ArrowRight', 900); await page.waitForTimeout(900); s = await st();
check('right edge → teal2, bgm Field of Hopes and Dreams', s.map === 'teal2' && s.bgm === 'hopes' && s.f.length === 2, JSON.stringify({ map: s.map, bgm: s.bgm, f: s.f.length }));
const meta = (await mapdef('teal2')).meta;
const wallX = meta.wallCol * 32;
// 동상 벽이 막는다
await stand(wallX - 120, 21 * 32 + 8, 'right'); await hold('ArrowRight', 1500); s = await st();
check('statue wall blocks the road (player cannot pass the wall column)', s.p[0] + 24 <= wallX && s.p[0] > wallX - 120, JSON.stringify({ p: s.p, wallX }));
await page.screenshot({ path: `${S}/teal_02_wall.png` });
// 벽 동상에 C
{ await stand(wallX - 36, 21 * 32 + 8, 'right'); await page.waitForTimeout(250); await page.keyboard.press('KeyC');
  let shot = false;
  const r = await drain(40000, async (q) => { if (q.pp && q.pp.hopY > 3 && !shot) { shot = true; await page.screenshot({ path: `${S}/teal_03_bump.png` }).catch(() => {}); } return { text: q.text.replace(/\{[^}]*\}/g, '').slice(0, 10), hop: q.pp?.hopY || 0, shake: q.shake, emote: q.pp?.emote || null, ppx: q.pp?.x ?? null, camY: q.cam.y }; });
  const ORDER = ['억빠맨|* 음 이 더러운 동상은 뭐지? 타코 닮았어요', '경섭|* 허허 지나갈 수 가 없네', '억빠맨|* 부숴버리면 되는거죠', '억빠맨|* 아 존나 아프다 씨발 이거 왜이렇게 단단해', '|* ... 다른 방법을 찾아봐야겠다.'];
  const idx = ORDER.map((k) => r.lines.indexOf(k));
  check('statue wall scene: 5 lines in order', idx.every((i) => i >= 0) && idx.every((v, i) => i === 0 || v > idx[i - 1]), JSON.stringify(r.lines));
  const o = r.obs; const li = (t) => o.findIndex((x) => x.text.startsWith(t));
  const between = o.slice(li('* 부숴버리면'), li('* 아 존나'));
  check('ppaman charges the statue: ran up close (x near the wall), hopped, thud shake', between.some((x) => x.ppx !== null && x.ppx > wallX - 70) && between.some((x) => x.hop > 3) && between.some((x) => x.shake), JSON.stringify({ maxPpx: Math.max(...between.map((x) => x.ppx ?? -1)), hop: between.some((x) => x.hop > 3), shake: between.some((x) => x.shake) }));
  check('ppaman sweats before "아 존나 아프다"', o.slice(li('* 부숴버리면'), li('* 아 존나') + 2).some((x) => x.emote === 'sweat'), '');
  check('camera shows the upward path after the narration (cam.y drops near the top) then returns', o.slice(li('* ... 다른')).some((x) => x.camY < 120) && (await st()).cam.onPlayer, JSON.stringify({ minCamY: Math.min(...o.slice(Math.max(0, li('* ... 다른'))).map((x) => x.camY)) }));
  s = await st(); check('flag statue_hit, followers regrouped near the player', s.flags.statue_hit === true && s.f.every((x) => x.vis && Math.hypot(x.x - s.p[0], x.y - s.p[1]) < 140), JSON.stringify({ p: s.p, f: s.f })); }
{ await stand(wallX - 36, 21 * 32 + 8, 'right'); await page.waitForTimeout(250); await page.keyboard.press('KeyC'); const r = await drain(8000);
  check('statue wall again: 아주 단단하다 / 저건 다신 안 건드릴래요', r.lines.some((l) => l.includes('아주 단단하다')) && r.lines.some((l) => l.includes('다신 안 건드릴래요')), JSON.stringify(r.lines)); }
{ const d = await page.evaluate(() => { const e = game.entities.find((x) => x.id === 'statue_d3'); return { x: e.x, y: e.y, w: e.w, h: e.h }; });
  await stand(d.x + d.w / 2 - 12, d.y + d.h + 6, 'up'); await page.waitForTimeout(250); await page.keyboard.press('KeyC'); const r = await drain(6000);
  check('decorative statue: 나무 동상이다', r.lines.some((l) => l.includes('나무 동상이다')), JSON.stringify(r.lines)); }
// 위로 가는 길 → teal3 → 되돌아오기
await stand(36 * 32 + 4, 4 * 32, 'up'); await page.screenshot({ path: `${S}/teal_04_up.png` }); await hold('ArrowUp', 1200); await page.waitForTimeout(900); s = await st();
check('up path → teal3 placeholder, party intact, bgm hopes', s.map === 'teal3' && s.f.length === 2 && s.bgm === 'hopes', JSON.stringify({ map: s.map, f: s.f.length, bgm: s.bgm }));
await hold('ArrowDown', 1200); await page.waitForTimeout(900); s = await st();
check('back down → teal2 from_top', s.map === 'teal2' && s.p[1] < 200, JSON.stringify({ map: s.map, p: s.p }));
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
