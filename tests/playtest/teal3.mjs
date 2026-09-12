// 청록숲 3 검증: ?qa=teal3 → 아래 길에서 위 공터로 → 공구상자 C: 브금 꺼짐 → 셋이 상자 기준으로 흩어져 상자를 바라봄 → 대사 → 오른쪽 풀숲에서 CS 두 마리가 튀어나옴(hop)
//   → 대사 → CS 점프 → 셋이 한 칸 물러나 오른쪽을 봄 → 빠맨이 상자→형섭→상자→경섭 달리기 → "오 온다!" → 전투 시작 연출 → 전투(여기선 바로 승리 처리; 전투 자체는 battle.mjs)
//   → 전투 뒤: 미니언 파들파들 → "응 ? 뭐 뭐지" → 길 따라 내려감 → teal2 동상 벽 펑펑(사용자 지정 영상에서 딴 폭발 애니 3발 + explosion 소리, 동상 날아가 사라짐, statues_cleared) → teal3 주인공 화면 → "어찌저찌"/"전투를 할 수 있게 되었다!" → teal2 오른쪽 길이 뚫려 teal_east 까지.
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
const st = () => page.evaluate(() => { const ent = (id) => { const e = game.entities.find((x) => x.id === id); return e ? { x: Math.round(e.x), y: Math.round(e.y), facing: e.facing, hopY: Math.round(e.hopY || 0), emote: e.emote?.kind || null, dead: !!e.dead } : null; };
  return { map: game.mapId, running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: (game.textbox.node?.text || '').replace(/\{[^}]*\}/g, ''), p: [Math.round(game.player.x), Math.round(game.player.y)], pf: game.player.facing,
    pp: ent('ppaman'), gs: ent('gyeongsub'), cs1: ent('cs1'), cs2: ent('cs2'), cam: Math.round(game.camera.x), bgm: game.sound.bgmName || null, zoom: +(game.zoom?.s ?? 1).toFixed(2), shake: !!game.shake, flags: { ...game.flags }, f: game.entities.filter((e) => e.def?.type === 'follower').map((x) => ({ id: x.id, x: Math.round(x.x), y: Math.round(x.y), vis: x.visible })) }; });
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

const hookSfx = () => page.evaluate(() => { if (window.__sfx) return; window.__sfx = []; const o = game.sound.sfx.bind(game.sound); game.sound.sfx = (n, x) => { window.__sfx.push(n); return o(n, x); }; });
await page.goto('http://127.0.0.1:8000/index.html?qa=teal3'); await ready(); await hookSfx(); await page.waitForTimeout(500);
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
const shots = { spread: false, pop: false, jump: false, back: false, flash: false, smash: false }; let spr = null; let post = { tremble: false, teal2: false, statueFly: false, statuesGone: false };
const r = await drain(90000, async (q) => {
  if (q.text.startsWith('* 뭔가 많이') && !shots.spread) { shots.spread = true; await page.screenshot({ path: `${S}/teal3_02_spread.png` }).catch(() => {}); }
  if (q.cs1 && !spr) spr = await page.evaluate(() => { const e = game.entities.find((x) => x.id === 'cs1'); const f = game.entities.find((x) => x.id === 'cs2'); const info = (e) => e ? { fw: e.sprite.fw, fh: e.sprite.fh, px: e.sprite.px, same: e.sprite.down[0] === e.sprite.left[1], sprite: e.def.sprite } : null; return { cs1: info(e), cs2: info(f), box: game.entities.find((x) => x.id === 'toolbox')?.def.image }; });
  if (spr && !spr.cs2) spr = null;   // cs2 는 cs1 바로 다음 노드에서 스폰 — 둘 다 있을 때만 확정(폴링이 그 사이에 걸리면 재시도)
  if (q.cs1 && q.cs1.hopY > 6 && !shots.pop) { shots.pop = true; shots.popOnScreen = q.cs1.x - q.cam > 0 && q.cs1.x - q.cam < 470 && q.p[0] - q.cam > 0; await page.screenshot({ path: `${S}/teal3_03_pop.png` }).catch(() => {}); }
  if (q.text.startsWith('* 아 안되겠다') && !shots.back) { shots.back = true; await page.screenshot({ path: `${S}/teal3_04_back.png` }).catch(() => {}); }
  if (q.zoom > 1.3 && !shots.flash) { shots.flash = true; await page.screenshot({ path: `${S}/teal3_05_battle.png` }).catch(() => {}); }
  if (q.cs1 && (await page.evaluate(() => !!game.entities.find((x) => x.id === 'cs1')?.jitter))) post.tremble = true;
  // 동상: 위로만이 아니라 가로로도 날아가야(flyX) — 이전엔 hopY 만 봐서 제자리 점프를 못 잡았다
  if (q.map === 'teal2') { post.teal2 = true; const w = await page.evaluate(() => { const ws = game.entities.filter((e) => /^statue_w\d$/.test(e.id)); return { n: ws.filter((e) => !e.dead).length, fly: ws.some((e) => (e.hopY || 0) > 10 && Math.abs(e.flyX || 0) > 4), booms: game.booms.length, boomFrame: game.booms[0] ? Math.floor(game.booms[0].t * game.booms[0].fps) : -1 }; });
    if (w.booms) { post.booms = Math.max(post.booms || 0, w.booms); if (w.boomFrame >= 3 && !shots.boom) { shots.boom = true; await page.screenshot({ path: `${S}/teal3_07_boom.png` }).catch(() => {}); } } if (w.fly) { post.statueFly = true; if (!shots.smash) { shots.smash = true; await page.screenshot({ path: `${S}/teal3_07_smash.png` }).catch(() => {}); } } if (w.n === 0) post.statuesGone = true; }
  // 전투가 뜨면 바로 승리 처리 (전투 검증은 battle.mjs)
  const inBattle = await page.evaluate(() => { const b = game.battle; if (!b || b.state === 'load' || b.state === 'ending') return false; if (b.state !== 'win') { for (const e of b.enemies) { e.hp = 0; e.dead = true; } b.state = 'win'; b.t = 1; b.setText('* 이겼다!'); } return true; });
  if (inBattle) { await page.waitForTimeout(80); await page.keyboard.press('KeyC'); }
  return { text: q.text.slice(0, 12), bgm: q.bgm, p: q.p, pf: q.pf, pp: q.pp, gs: q.gs, cs1: q.cs1, cs2: q.cs2, zoom: q.zoom, shake: q.shake };
});
const L = r.lines, o = r.obs; const li = (t) => o.findIndex((x) => x.text.startsWith(t));
const ORDER = ['억빠맨|* 뭔가 많이 들어있네요', '경섭|* 응 그렇네', '억빠맨|* 응? 이게 무슨소리죠', '경섭|* ???', '억빠맨|* 앗 ... ... 엥 CS?', '경섭|* 허허 저게 뭐냐 근데 뭔가 꼭... 우리를', '억빠맨|* 아 안되겠다 싸 싸워야할거같은데요? ㅈ ㅈ됐다. 빨리 이 상자에서 아무거나 꺼내봐요 !!!', '억빠맨|* 오 온다!'];
const idx = ORDER.map((k) => L.indexOf(k));
check('toolbox scene: 8 lines in briefing order', idx.every((i) => i >= 0) && idx.every((v, i) => i === 0 || v > idx[i - 1]), JSON.stringify(ORDER.filter((k, i) => idx[i] < 0)) + ' got=' + JSON.stringify(L));
{ const a = o[li('* 뭔가 많이')];
  check('bgm off when the scene starts', a && a.bgm === null, JSON.stringify({ bgm: a?.bgm }));
  check('spread around the box facing it: player below (up), ppaman left (right), gyeongsub right (left)', a && a.p[1] > by && a.pf === 'up' && a.pp.x < bx && a.pp.facing === 'right' && a.gs.x > bx + 32 && a.gs.facing === 'left', JSON.stringify({ p: a?.p, pf: a?.pf, pp: a?.pp, gs: a?.gs }));
  const q1 = li('* ???'), q2 = li('* 앗');
  check('CS minions appear from the right bushes after "???" and hop out (hopY > 6, moved left)', o.slice(q1, q2 + 1).some((x) => x.cs1 && x.cs1.hopY > 6) && o[q2] && o[q2].cs1 && o[q2].cs1.x < 850 && o[q2].cs2 && o[q2].cs2.x < 850 && !o[q1 - 1]?.cs1, JSON.stringify({ atQ: o[q2]?.cs1, before: o[q1 - 1]?.cs1 }));
  const j0 = li('* 허허 저게'), j1 = li('* 아 안되겠다');
  check('field CS use PR #7 still images (48×48, not split), red/blue; weapon box image on the chest', !!spr && !!spr.cs1 && spr.cs1.fw === 48 && spr.cs1.fh === 48 && spr.cs1.px === 1 && spr.cs1.same && spr.cs1.sprite === 'cs_red' && spr.cs2?.sprite === 'cs_blue' && spr.box === 'assets/props/weapon_box_open.png', JSON.stringify(spr));
  check('CS pop out is on screen (camera moved so both the party and the bushes are visible)', shots.pop && shots.popOnScreen === true, JSON.stringify({ pop: shots.pop, onScreen: shots.popOnScreen }));
  check('CS jump staging between "허허 저게 뭐냐" and "아 안되겠다"', o.slice(j0, j1).filter((x) => x.cs1 && x.cs1.hopY > 6).length >= 2, '');
  const b = o[j1];
  check('all three stepped back one tile (x −32) and face right', b && b.p[0] === a.p[0] - 32 && b.pp.x === a.pp.x - 32 && b.gs.x === a.gs.x - 32 && b.pf === 'right' && b.pp.facing === 'right' && b.gs.facing === 'right', JSON.stringify({ a: [a?.p, a?.pp?.x, a?.gs?.x], b: [b?.p, b?.pp?.x, b?.gs?.x, b?.pf, b?.pp?.facing, b?.gs?.facing] }));
  const run = o.slice(j1, li('* 오 온다')).map((x) => x.pp?.x ?? 0);
  const nearBox = run.some((x) => Math.abs(x + 12 - (bx + 16)) < 14), nearPlayer = run.some((x) => b && Math.abs(x - (b.p[0] - 32)) < 14), nearGs = run.some((x) => b && Math.abs(x - (b.gs.x - 32)) < 14);
  check('ppaman ran to the box, then to the player, back to the box, then to gyeongsub', nearBox && nearPlayer && nearGs, JSON.stringify({ nearBox, nearPlayer, nearGs, minX: Math.min(...run), maxX: Math.max(...run) }));
  const k = li('* 오 온다');
  check('battle start: zoom-in + shake after "오 온다!"', o.slice(k).some((x) => x.zoom > 1.3) && o.slice(k).some((x) => x.shake), JSON.stringify({ maxZoom: Math.max(...o.slice(Math.max(0, k)).map((x) => x.zoom)) })); }
s = await st();
const sfxAll = await page.evaluate(() => window.__sfx || []);
check('statue wall explosion: the user-supplied animation plays (≥ 2 bursts from assets/fx/explosion.png) with the explosion sound from the same clip (no more placeholder pops)', (post.booms || 0) >= 2 && sfxAll.includes('explosion') && !sfxAll.includes('pop'), JSON.stringify({ booms: post.booms, explosion: sfxAll.filter((n) => n === 'explosion').length, sfx: [...new Set(sfxAll)] }));
check('post-battle: minions tremble → "응 ? 뭐 뭐지" → scene moves to teal2 → statues fling sideways+up (hopY & flyX) and vanish → "어찌저찌" / "전투를 할 수 있게 되었다!"', post.tremble && post.teal2 && post.statueFly && post.statuesGone && ['응 ? 뭐 뭐지', '어찌저찌', '전투를 할 수 있게'].every((k) => r.lines.some((l) => l.includes(k))) && s.map === 'teal3' && s.flags.statues_cleared === true, JSON.stringify({ post, map: s.map, tail: r.lines.slice(-3) }));
check('after the battle: flags set (won + pending), CS removed, zoom back, camera on player, followers regrouped, controllable', s.flags.teal3_battle_pending === true && s.flags.teal3_cs_won === true && (await page.evaluate(() => game.camera.target === game.player && !game.camera.locked)) && (!s.cs1 || s.cs1.dead) && (!s.cs2 || s.cs2.dead) && s.zoom === 1 && !s.running && s.f.every((x) => x.vis && Math.hypot(x.x - s.p[0], x.y - s.p[1]) < 140), JSON.stringify({ flags: s.flags.teal3_battle_pending, cs1: s.cs1, zoom: s.zoom, f: s.f, p: s.p }));
{ await stand(bx + 4, by + 24, 'up'); await page.waitForTimeout(250); await page.keyboard.press('KeyC'); const r2 = await drain(6000);
  check('toolbox again: 공구상자다. 뭔가 많이 들어 있다.', r2.lines.some((l) => l.includes('뭔가 많이 들어 있다')), JSON.stringify(r2.lines)); }
await page.screenshot({ path: `${S}/teal3_06_after.png` });
// 메뉴에서 힐템: 전투 뒤 바나나 2개 → V → 아이템 → 바나나 → 대상 경섭(HP 깎아 둠) → 회복·소모, 파티 HP 바 색
{ const inv = await page.evaluate(() => game.inventory.filter((n) => n === '바나나').length); check('after the scene: 2 bananas in the inventory', inv === 2, 'bananas=' + inv);
  await page.evaluate(() => { game.partyHp.gyeongsub = 40; });
  await page.keyboard.press('KeyV'); await page.waitForTimeout(250); await page.keyboard.press('KeyC'); await page.waitForTimeout(200);   // 아이템
  await page.keyboard.press('KeyC'); await page.waitForTimeout(200);   // 바나나 → 대상
  let mm = await page.evaluate(() => ({ state: game.state, sub: game.menu.sub, pick: game.menu.pick })); check('menu: item → target picker opened', mm.state === 'menu' && mm.sub === 0 && mm.pick === 0, JSON.stringify(mm));
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(120); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(120);   // 요플래 → 억빠맨 → 경섭
  mm = await page.evaluate(() => ({ pick: game.menu.pick, party: game.party })); const gsIdx = 1 + mm.party.indexOf('gyeongsub');
  for (let i = mm.pick; i !== gsIdx; i = (i + 1) % (mm.party.length + 1)) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(120); }
  await page.screenshot({ path: `${S}/teal3_08_menu_item.png` });
  await page.keyboard.press('KeyC'); await page.waitForTimeout(250);
  const res = await page.evaluate(() => ({ hp: game.partyHp.gyeongsub, bananas: game.inventory.filter((n) => n === '바나나').length }));
  check('menu heal: 경섭 40 → 70, one banana consumed', res.hp === 70 && res.bananas === 1, JSON.stringify(res));
  await page.keyboard.press('KeyX'); await page.waitForTimeout(150); await page.keyboard.press('KeyX'); await page.waitForTimeout(200); }
// 청록숲2 로 내려가면 동상 벽이 없고 오른쪽 길이 뚫려 teal_east 까지 간다
await stand(17 * 32 + 4, 27 * 32 + 8, 'down'); await page.keyboard.down('ArrowDown'); await page.waitForTimeout(1300); await page.keyboard.up('ArrowDown'); await page.waitForTimeout(900); s = await st();
{ const q = await page.evaluate(() => ({ map: game.mapId, statues: game.entities.filter((e) => /^statue_w\d$/.test(e.id) && !e.dead).length })); check('teal2 after clearing: no statue wall', q.map === 'teal2' && q.statues === 0, JSON.stringify(q));
  await stand(38 * 32, 21 * 32 + 8, 'right'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1800); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(900); const q2 = await st(); check('right road now open → teal_east', q2.map === 'teal_east', q2.map); }
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
