// 청록숲 검증: ?qa=teal1 → 청록 타일·수풀 배경·Weird Birds → 오른쪽 끝 → teal2(Field of Hopes and Dreams)
//   → 동상 벽이 오른쪽을 막음 → 벽 동상에 C: 빠맨·경섭 대사 → 빠맨 몸통 박치기(hop)·쿵·흔들림·식은땀 → "다른 방법을 찾아봐야겠다" → 카메라가 위 길을 비춤 → 재방문 대사 → 깔린 동상 나레이션 → 위 길 → teal3 → 되돌아오기.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
process.on('uncaughtException', (e) => { try { console.log(logs.join('\n')); } catch {} console.log('CRASH', e.stack || e.message); process.exit(2); });   // logs 가 아직 없어도(TDZ) 진짜 에러를 보여 준다
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
const talk = async (x, y, f, picks = []) => {   // C → 대사 넘김, 선택지는 picks 순서로 (n: 아래 floor(n/2), 오른쪽 n%2)
  await stand(x, y, f); await page.waitForTimeout(250); await page.keyboard.press('KeyC');
  const out = []; let idle = 0, pi = 0;
  for (let i = 0; i < 150; i++) {
    await page.waitForTimeout(120); const s = await st();
    if (!s.running) { if (++idle > 3) break; continue; } idle = 0;
    const k = (s.speaker || '') + '|' + s.text.replace(/\{[^}]*\}/g, '');
    if (s.box === 'choice') { if (!out.includes(k)) out.push(k); await page.waitForTimeout(500); const n = picks[pi++] ?? 0; for (let j = 0; j < Math.floor(n / 2); j++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80); } for (let j = 0; j < n % 2; j++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80); } await page.keyboard.press('KeyC'); await page.waitForTimeout(200); }
    else if (s.box === 'waiting' || s.box === 'typing') { if (!out.includes(k)) out.push(k); await page.keyboard.press('KeyC'); }
  }
  return out;
};
const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(150); };

await page.goto('http://127.0.0.1:8000/index.html?qa=teal1'); await ready(); await page.waitForTimeout(700);
let s = await st();
const d1 = await mapdef('teal1');
check('qa=teal1: teal forest, party of 2, Weird Birds, teal_bush backdrop', s.map === 'teal1' && s.f.length === 2 && s.bgm === 'weird_birds' && d1.backdrop === 'teal_bush', JSON.stringify({ map: s.map, f: s.f.length, bgm: s.bgm, bd: d1.backdrop }));
{ const rows = d1.rows; const t = { teal: rows.some((r) => /[tu]/.test(r)), grass: rows.some((r) => r.includes('w')), cliff: rows.some((r) => r.includes('v')), purple: rows.some((r) => /[xXy]/.test(r)) };
  check('teal1 tiles: teal ground/grass/cliff, no purple', t.teal && t.grass && t.cliff && !t.purple, JSON.stringify(t)); }
await page.screenshot({ path: `${S}/teal_01_road.png` });
// 꽃가루 풀 3마리: 균등 배치, 가까이 가면 뿜고, 맞아도 아무 일 없음
{ const sp = await page.evaluate(() => game.entities.filter((e) => e.def?.type === 'spitter').map((e) => ({ id: e.id, x: e.x, y: e.y })));
  const W = d1.rows[0].length * 32; const xs = sp.map((e) => e.x).sort((a, b) => a - b);
  check('teal1: 3 spitters evenly spaced just above the road (outside it, in the dark)', sp.length === 3 && xs.every((x, i) => Math.abs(x - (W * (i + 1) / 4)) < 80) && sp.every((e) => e.y < 4 * 32 && e.y + 8 <= 4 * 32), JSON.stringify(sp));
  await stand(xs[0] - 90, 6 * 32 + 8, 'right'); const p0 = await st(); const hurt0 = await page.evaluate(() => game.hurt || 0);
  let puffs = 0, shots = 0; const t0 = Date.now(); while (Date.now() - t0 < 4500) { await page.waitForTimeout(150); const q = await page.evaluate(() => { const e = game.entities.find((x) => x.id === 'spitter1'); return { puffs: e.puffs.length, shots: e.shots }; }); puffs = Math.max(puffs, q.puffs); shots = q.shots; if (shots >= 1 && puffs >= 6) { await page.screenshot({ path: `${S}/teal_01b_pollen.png` }).catch(() => {}); break; } }
  const p1 = await st(); check('spitter1 fires white pollen toward the player; player unaffected (no hurt, no move)', shots >= 1 && puffs >= 6 && p1.p[0] === p0.p[0] && p1.p[1] === p0.p[1] && (await page.evaluate(() => game.hurt || 0)) === hurt0, JSON.stringify({ shots, puffs, p0: p0.p, p1: p1.p })); }
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
  check('camera shows the upward path (above the plaza) after the narration then returns', o.slice(li('* ... 다른')).some((x) => x.camY < 120) && (await st()).cam.onPlayer, JSON.stringify({ minCamY: Math.min(...o.slice(Math.max(0, li('* ... 다른'))).map((x) => x.camY)) }));
  s = await st(); check('flag statue_hit, followers regrouped near the player', s.flags.statue_hit === true && s.f.every((x) => x.vis && Math.hypot(x.x - s.p[0], x.y - s.p[1]) < 140), JSON.stringify({ p: s.p, f: s.f })); }
{ await stand(wallX - 36, 21 * 32 + 8, 'right'); await page.waitForTimeout(250); await page.keyboard.press('KeyC'); const r = await drain(8000);
  check('statue wall again: 아주 단단하다 / 저건 다신 안 건드릴래요', r.lines.some((l) => l.includes('아주 단단하다')) && r.lines.some((l) => l.includes('다신 안 건드릴래요')), JSON.stringify(r.lines)); }
{ const d = await page.evaluate(() => { const e = game.entities.find((x) => x.id === 'statue_d3'); return { x: e.x, y: e.y, w: e.w, h: e.h }; });
  await stand(d.x + d.w / 2 - 12, d.y + d.h + 6, 'up'); await page.waitForTimeout(250); await page.keyboard.press('KeyC'); const r = await drain(6000);
  check('decorative statue: 나무 동상이다', r.lines.some((l) => l.includes('나무 동상이다')), JSON.stringify(r.lines)); }
// 광장: 똑똑 나무 + 바나나
{ const pz = meta.plaza; check('teal2: center plaza is open ground (cols 13~28, rows 12~23)', !!pz && (await page.evaluate(([c, r]) => !game.map.solidRect(c * 32 + 4, r * 32 + 8, 24, 16), [20, 14])) && (await page.evaluate(([c, r]) => !game.map.solidRect(c * 32 + 4, r * 32 + 8, 24, 16), [14, 17])), JSON.stringify(pz));
  const tr = await page.evaluate(() => { const t = game.entities.find((e) => e.id === 'tree'); return { x: t.x, y: t.y, w: t.w, h: t.h }; });
  await stand(tr.x + tr.w / 2 - 12, tr.y + tr.h + 6, 'up'); await page.waitForTimeout(250); await page.keyboard.press('KeyC');
  let bang = false, ranBack = false; const r = await drain(30000, async (q) => { if (q.pp?.emote === '!') { bang = true; await page.screenshot({ path: `${S}/teal_05_tree.png` }).catch(() => {}); } if (q.text.includes('저 여기 있을게요') && q.pp && q.pp.x < q.p[0]) ranBack = true; return null; });
  check('tree event: 얼굴 같지 않아요 → 두드려 볼게요 → 똑똑 → ...똑똑 → ! → 안에서 두드린 거 → 바람 소리 → 저 여기 있을게요 → 확실히 두 번 두드렸다', ['얼굴 같지 않아요', '두드려 볼게요', '똑똑', '안에서 두드린', '바람 소리', '저 여기 있을게요', '확실히 두 번'].every((k) => r.lines.some((l) => l.includes(k))) && bang && ranBack, JSON.stringify({ lines: r.lines, bang, ranBack }));
  s = await st(); check('tree event: flag + followers regrouped', s.flags.tree_knocked === true && s.f.every((x) => Math.hypot(x.x - s.p[0], x.y - s.p[1]) < 140), JSON.stringify({ f: s.f, p: s.p }));
  const L2 = await talk(tr.x + tr.w / 2 - 12, tr.y + tr.h + 6, 'up'); check('tree again: 저건 다신 안 두드릴래요', L2.some((l) => l.includes('다신 안 두드릴래요')), JSON.stringify(L2));
  const bn = await page.evaluate(() => ['banana1'].map((id) => { const e = game.entities.find((x) => x.id === id); return e ? { x: e.x, y: e.y, w: e.w, h: e.h } : null; }));
  check('one banana placed in the upper plaza; no second banana', bn.every(Boolean) && bn[0].y < 15 * 32 && !(await page.evaluate(() => game.entities.some((e) => e.id === 'banana2'))), JSON.stringify(bn));
  { await stand(bn[0].x + bn[0].w / 2 - 12, bn[0].y + bn[0].h + 4, 'up'); await page.waitForTimeout(250); await page.keyboard.press('KeyC');   // 선택지 잠금: 뜨자마자 C 연타해도 안 넘어간다 (사용자 2026-09-10)
    let sawChoice = false; const t0 = Date.now(); while (Date.now() - t0 < 6000) { await page.waitForTimeout(40); const q = await st(); if (!q.running) break; if (q.box === 'choice') { sawChoice = true; break; } if (q.box === 'waiting' || q.box === 'typing') await page.keyboard.press('KeyC'); }
    await page.keyboard.press('KeyC'); await page.waitForTimeout(30);   // 잠금(0.1s) 안의 한 번은 무시
    const q = await st(); check('choice lock: mashing C right as the choice appears does not confirm it', sawChoice && q.box === 'choice' && q.running, JSON.stringify({ sawChoice, box: q.box }));
    await page.waitForTimeout(500); await page.keyboard.press('KeyC');   // 잠금 뒤 [먹는다]
    const rest = await drain(6000); check('choice lock: after the lock, C confirms [먹는다] → 포타슘', rest.lines.some((l) => l.includes('포타슘')), JSON.stringify(rest.lines)); }
  { const gone = await page.evaluate(() => { const e = game.entities.find((x) => x.id === 'banana1'); return !e || e.dead; }); check('banana1 gone after eating + flag', gone && (await st()).flags.banana1_eaten === true, ''); }
  await page.evaluate(() => { delete game.flags.banana1_eaten; game.spawn({ type: 'prop', id: 'banana1', image: 'assets/props/banana.png', x: 25 * 32 + 2, y: 13 * 32 + 14, w: 28, h: 10, ix: 25 * 32 + 2, iy: 13 * 32 + 4, solid: false, script: 'teal2_banana1' }); });
  const L3 = await talk(bn[0].x + bn[0].w / 2 - 12, bn[0].y + bn[0].h + 4, 'up', [0]);
  s = await st(); const b1 = await page.evaluate(() => { const e = game.entities.find((x) => x.id === 'banana1'); return !e || e.dead; });
  check('banana1: 형섭이형 바나나 드세요 → [먹는다] → 포타슘, banana gone + flag', L3.some((l) => l.includes('바나나 드세요')) && L3.some((l) => l.includes('포타슘')) && b1 && s.flags.banana1_eaten === true, JSON.stringify(L3));
  // 안먹는다 분기: 플래그·바나나를 되돌려 같은 바나나로 확인
  await page.evaluate(() => { delete game.flags.banana1_eaten; game.spawn({ type: 'prop', id: 'banana1', image: 'assets/props/banana.png', x: 25 * 32 + 2, y: 13 * 32 + 14, w: 28, h: 10, ix: 25 * 32 + 2, iy: 13 * 32 + 4, solid: false, script: 'teal2_banana1' }); });
  const L4 = await talk(bn[0].x + bn[0].w / 2 - 12, bn[0].y + bn[0].h + 4, 'up', [1]);
  const b2 = await page.evaluate(() => { const e = game.entities.find((x) => x.id === 'banana1'); return !!e && !e.dead; });
  check('banana: [안먹는다] → 몸상하세요, banana stays', L4.some((l) => l.includes('몸상하세요')) && !L4.some((l) => l.includes('포타슘')) && b2, JSON.stringify(L4));
  await page.screenshot({ path: `${S}/teal_06_plaza.png` }); }
// 위로 가는 길 → teal3 → 되돌아오기
{ const up = meta.upCols; check('up path starts from the top of the central plaza (cols 20~22), not beside the statue wall', up[0] === 20 && up[1] === 22 && (await page.evaluate(() => !game.map.solidRect(21 * 32 + 4, 8 * 32, 24, 16))), JSON.stringify(up)); }
await stand(21 * 32 + 4, 4 * 32, 'up'); await page.screenshot({ path: `${S}/teal_04_up.png` }); await hold('ArrowUp', 1200); await page.waitForTimeout(900); s = await st();
check('up path → teal3 placeholder, party intact, bgm hopes', s.map === 'teal3' && s.f.length === 2 && s.bgm === 'hopes', JSON.stringify({ map: s.map, f: s.f.length, bgm: s.bgm }));
await hold('ArrowDown', 1200); await page.waitForTimeout(900); s = await st();
check('back down → teal2 from_top', s.map === 'teal2' && s.p[1] < 200, JSON.stringify({ map: s.map, p: s.p }));
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
