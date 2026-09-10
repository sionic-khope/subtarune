// 청록숲 4(teal_east) 검증: ?qa=teal4 → 오른쪽 → 아래로 긴 길 → 오른쪽 (44×40) · 이벤트 3(바나나 껍질 밟기·수상한 버튼2 → 바나나 획득·검은 꽃) · 걸어다니는 CS 둘(닿으면 표준 전투 진입 → 승리 30원·영구 제거) · 소지금 메뉴 표시 · 출구 teal5.
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
const st = () => page.evaluate(() => ({ map: game.mapId, running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: (game.textbox.node?.text || '').replace(/\{[^}]*\}/g, ''), p: [Math.round(game.player.x), Math.round(game.player.y)], battle: !!game.battle, bstate: game.battle?.state || null, money: game.money, inv: [...game.inventory], flags: { ...game.flags }, f: game.entities.filter((e) => e.def?.type === 'follower').length,
  walkers: game.entities.filter((e) => e.def?.type === 'enemy' && !e.dead).map((e) => ({ id: e.id, x: Math.round(e.x), y: Math.round(e.y) })), hopY: Math.round(game.player.hopY || 0), emote: game.player.emote?.kind || null }));
const stand = (x, y, f) => page.evaluate(([x, y, f]) => { game.player.x = x; game.player.y = y; game.player.facing = f; game.player.trail = []; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); game.camera.snap(); }, [x, y, f]);
const drain = async (maxMs, probe) => {
  const out = []; const t0 = Date.now(); let idle = 0;
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(80); const s = await st(); if (probe) await probe(s);
    if (!s.running) { if (++idle > 4) break; continue; } idle = 0;
    const k = (s.speaker || '') + '|' + s.text;
    if (s.box === 'choice') { await page.waitForTimeout(500); await page.keyboard.press('KeyC'); }
    else if (s.box === 'waiting' || s.box === 'typing') { if (s.text && !out.includes(k)) out.push(k); await page.keyboard.press('KeyC'); }
  }
  return out;
};
const talk = async (x, y, f) => { await stand(x, y, f); await page.waitForTimeout(250); await page.keyboard.press('KeyC'); return drain(12000); };
const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(150); };

await page.goto('http://127.0.0.1:8000/index.html?qa=teal4'); await ready(); await page.waitForTimeout(500);
let s = await st();
check('qa=teal4: teal_east map, party of 2, two walking CS present', s.map === 'teal_east' && s.f === 2 && s.walkers.length === 2, JSON.stringify({ map: s.map, f: s.f, w: s.walkers }));
const rows = await page.evaluate(async () => (await import('/src/data/maps.js')).MAPS.teal_east.rows);
check('map is long both ways (44×40) with a road right → down → right', rows.length === 40 && rows[0].length === 44 && /[tu]/.test(rows[5][3]) && /[tu]/.test(rows[20][25]) && /[tu]/.test(rows[34][40]), '');
await page.screenshot({ path: `${S}/teal4_01_start.png` });
// 1) 바나나 껍질: 위 길에서 오른쪽으로 걷다 밟는다
{ await stand(6 * 32, 5 * 32 + 8, 'right'); let hopSeen = false, bang = false; await page.keyboard.down('ArrowRight');
  const L = []; const t0 = Date.now(); while (Date.now() - t0 < 12000) { await page.waitForTimeout(70); const q = await st(); if (q.hopY > 6) hopSeen = true; if (q.emote === '!') bang = true; if (q.running) { await page.keyboard.up('ArrowRight'); if (q.box === 'waiting' || q.box === 'typing') { const k = (q.speaker || '') + '|' + q.text; if (q.text && !L.includes(k)) L.push(k); await page.keyboard.press('KeyC'); } } else if (L.length && !q.running) break; }
  await page.keyboard.up('ArrowRight');
  check('banana peel: stepping on it → slip hop + "!" → 미끄러졌다 → 빠맨 "형!!" → 경섭 → 나레이션, flag', hopSeen && bang && ['미끄러졌다', '형!!', '바나나 껍질은 조심', '누가 여기다'].every((k) => L.some((l) => l.includes(k))) && (await st()).flags.peel_slipped === true, JSON.stringify({ hopSeen, bang, L }));
  await page.screenshot({ path: `${S}/teal4_02_peel.png` });
  await page.waitForTimeout(1500);   // 트리거 쿨다운 뒤
  const L2 = await (async () => { await stand(6 * 32, 5 * 32 + 8, 'right'); await hold('ArrowRight', 900); return drain(5000); })();
  check('peel again: 이번엔 피했다', L2.some((l) => l.includes('이번엔 피했다')), JSON.stringify(L2)); }
// 2) 수상한 버튼 2: 두 번 누르면 바나나가 떨어져 획득
{ const b = await page.evaluate(() => { const e = game.entities.find((x) => x.id === 'button2'); return { x: e.x, y: e.y, w: e.w, h: e.h }; });
  const L1 = await talk(b.x + b.w / 2 - 12, b.y + b.h + 6, 'up'); check('button2 first press: 아무 일도 일어나지 않았다 / 뻥이네요', L1.some((l) => l.includes('아무 일도')) && L1.some((l) => l.includes('뻥이네요')), JSON.stringify(L1));
  const inv0 = (await st()).inv.filter((n) => n === '바나나').length;
  const L2 = await talk(b.x + b.w / 2 - 12, b.y + b.h + 6, 'up'); const s2 = await st();
  check('button2 second press: banana drops → 아야 → 바나나를 얻었다 (+1 inventory) → 좋은 일 맞네요, done flag', L2.some((l) => l.includes('바나나를 얻었다')) && L2.some((l) => l.includes('좋은 일 맞네요')) && s2.inv.filter((n) => n === '바나나').length === inv0 + 1 && s2.flags.button2_done === true, JSON.stringify({ L2, inv: s2.inv }));
  await page.screenshot({ path: `${S}/teal4_03_button.png` });
  const L3 = await talk(b.x + b.w / 2 - 12, b.y + b.h + 6, 'up'); check('button2 after: 더 이상 아무 일도 없다', L3.some((l) => l.includes('더 이상 아무 일도')), JSON.stringify(L3)); }
// 3) 검은 꽃 (음지)
{ const fl = await page.evaluate(() => { const e = game.entities.find((x) => x.id === 'black_flower'); return { x: e.x, y: e.y, w: e.w, h: e.h }; });
  const L = await talk(fl.x + fl.w / 2 - 12, fl.y + fl.h + 6, 'up');
  check('black flower: 향기가 없다 → "...나가..." → 빠맨 "꽃이 말했어요?" → 경섭 → 확실히 말했다', ['향기가 없다', '나가', '꽃이 말했어요', '꽃이 무슨', '확실히 말했다'].every((k) => L.some((l) => l.includes(k))) && (await st()).flags.flower_spoke === true, JSON.stringify(L));
  await page.screenshot({ path: `${S}/teal4_04_flower.png` }); }
// 4) 걸어다니는 CS 에 닿으면 전투 → (승리 처리) → 30원, 제거, 플래그
{ const w = (await st()).walkers.find((x) => x.id === 'walker1'); const money0 = (await st()).money;
  await stand(w.x - 40, w.y, 'right'); await page.waitForTimeout(150);
  const started = await (async () => { const t0 = Date.now(); while (Date.now() - t0 < 8000) { const q = await st(); if (q.battle) return q; if (!q.running) await hold('ArrowRight', 120); else if (q.box === 'waiting' || q.box === 'typing') await page.keyboard.press('KeyC'); await page.waitForTimeout(60); } return null; })();
  check('touching a walking CS → standard encounter → battle starts', !!started, '');
  // 승리 처리(전투 자체는 battle.mjs) → 표준 승리 문구 '전투에서 승리했다! 30원을 얻었다.'
  await page.evaluate(() => { const t0 = Date.now(); const tick = () => { const b = game.battle; if (!b) return; if (b.state === 'menu' || b.state === 'intro') { if (b.state === 'intro') { b.shown = b.text.length; } } if (Date.now() - t0 > 20000) return; }; tick(); });
  let winText = '';
  const won = await (async () => { const t0 = Date.now(); while (Date.now() - t0 < 30000) { const q = await page.evaluate(() => { const b = game.battle; if (!b) return { gone: true }; if (b.state === 'intro') { b.shown = b.text.length; return { intro: true, typed: b.typed, t: b.t }; } if (b.state === 'menu') { for (const e of b.enemies) { e.hp = 1; } return { menu: true }; } return { state: b.state, text: b.text, typed: b.typed }; }); if (q.gone) return true; if (q.intro) { if (q.typed && q.t > 0.65) await page.keyboard.press('KeyC'); } else if (q.menu) { await page.keyboard.press('KeyC'); await page.waitForTimeout(150); await page.keyboard.press('KeyC'); await page.waitForTimeout(150); await page.keyboard.press('KeyC'); await page.waitForTimeout(150); await page.keyboard.press('KeyC'); await page.waitForTimeout(150); await page.keyboard.press('KeyC'); await page.waitForTimeout(150); await page.keyboard.press('KeyC'); } else if (q.state === 'win') { winText = q.text; if (q.typed) await page.keyboard.press('KeyC'); } await page.waitForTimeout(120); } return false; })();
  check('battle won → standard victory text "전투에서 승리했다! 30원을 얻었다."', won && winText.includes('전투에서 승리했다') && winText.includes('30원을 얻었다'), JSON.stringify({ won, winText }));
  const after = await (async () => { const t0 = Date.now(); while (Date.now() - t0 < 10000) { const q = await st(); if (!q.running && !q.battle) return q; if (q.box === 'waiting' || q.box === 'typing') await page.keyboard.press('KeyC'); await page.waitForTimeout(100); } return await st(); })();
  check('after: money +30, walker1 removed and flagged (teal_east_walker1_defeated), back on the map', after.money === money0 + 30 && !after.walkers.some((x) => x.id === 'walker1') && after.flags.teal_east_walker1_defeated === true && after.map === 'teal_east' && !after.battle, JSON.stringify({ money: after.money, walkers: after.walkers, flag: after.flags.teal_east_walker1_defeated }));
  const bgmBack = await page.evaluate(() => game.sound.bgmName); check('after a standard encounter the map BGM (hopes) comes back (bug: BGM vanished after battle, 2026-09-10)', bgmBack === 'hopes', String(bgmBack));
  // 메뉴 소지금 표시
  await page.keyboard.press('KeyV'); await page.waitForTimeout(250); await page.keyboard.press('KeyC'); await page.waitForTimeout(250); await page.screenshot({ path: `${S}/teal4_05_money.png` });
  const px = await page.evaluate(() => { const c = document.querySelector('canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let yellow = 0; for (let i = 0; i < d.length; i += 4 * 31) if (d[i] > 220 && d[i + 1] > 200 && d[i + 2] < 140) yellow++; return yellow; });
  check('menu items panel shows 소지금 (yellow text present)', (await page.evaluate(() => game.state === 'menu' && game.menu.sub === 0)) && px > 5, 'yellowPx=' + px);
  await page.keyboard.press('KeyX'); await page.waitForTimeout(150); await page.keyboard.press('KeyX'); await page.waitForTimeout(200); }
// 5) 출구 → teal5
await stand(41 * 32, 34 * 32 + 8, 'right'); await hold('ArrowRight', 900); await page.waitForTimeout(900); s = await st();
check('bottom-right exit → teal5 placeholder', s.map === 'teal5' && s.f === 2, s.map);
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
