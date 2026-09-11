// 청록숲9 검증: ?qa=teal9 → 일직선 길, 뒤로 갈수록 고대 사원 판석·기둥·석등·사원 문 → 오른쪽 끝 레드·블루가 막고 있음 → C → 파티 세로 정렬 → 브금 꺼짐 → 대사(브리핑 그대로)
//   → 셋 놀람 점프(공식 jump 소리 ✗, chime ✓) → "침입자 발생" 에 브금 alarm + 사이렌 + 레드 쿵쿵 + 붉은 번쩍 → 처리하라/하라 가속 응수 → 돌진 → 보스전(red·blue HP 22, 브금 boss) → 승리 → 둘 제거·플래그·브금 hopes → 오른쪽 문 → obj0(옵젝영역0).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
process.on('uncaughtException', (e) => { try { console.log(logs.join('\n')); } catch {} console.log('CRASH', e.stack || e.message); process.exit(2); });
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
for (const f of fs.readdirSync(S)) if (f.startsWith('teal9_')) fs.unlinkSync(`${S}/${f}`);
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0; const errs = []; let buffCam = null;
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) errs.push(`[${m.type()}] ${m.text().slice(0, 160)}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await page.evaluate(fn); if (v) return v; await page.waitForTimeout(60); } return null; };
const st = () => page.evaluate(() => { const e = (id) => { const x = id === 'player' ? game.player : game.entities.find((k) => k.id === id && !k.dead); return x ? { x: Math.round(x.x), y: Math.round(x.y), f: x.facing, em: x.emote?.kind || null, hop: Math.round(x.hopY || 0), solid: !!x.solid } : null; };
  return { map: game.mapId, running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: (game.textbox.node?.text || '').replace(/\{[^}]*\}/g, ''), bgm: game.sound.bgmName, hurt: +(game.hurt || 0).toFixed(2),
    battle: game.battle ? { state: game.battle.state, enemies: game.battle.enemies.map((k) => ({ id: k.id, hp: k.hp, max: k.maxHp })), members: game.battle.members.length } : null,
    p: e('player'), gs: e('gyeongsub'), pp: e('ppaman'), red: e('red'), blue: e('blue'), flags: { won: !!game.flags.teal9_boss_won }, sfx: (window.__sfx || []).slice() }; });
const stand = async (x, y, f) => { await page.evaluate(({ x, y, f }) => { game.player.x = x; game.player.y = y; game.player.facing = f; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); game.camera.snap?.(); }, { x, y, f }); await page.waitForTimeout(150); };
const key = (s) => (s.speaker || '') + '|' + s.text;

await page.goto('http://localhost:8000/index.html?qa=teal9'); await until(() => !!(window.game && game.entities && game.player), 15000); await page.keyboard.press('KeyX'); await page.waitForTimeout(400);
const meta = await page.evaluate(async () => (await import('/src/data/maps.js')).MAPS.teal9.meta);
const rows = await page.evaluate(async () => (await import('/src/data/maps.js')).MAPS.teal9.rows);
let s = await st();
check('qa=teal9: straight road into a tall plaza, party of 3, 레드(upper right)·블루(lower left) guard the giant stone door (solid, facing left)', s.map === 'teal9' && s.gs && s.pp && s.red && s.blue && s.red.solid && s.blue.solid && s.red.f === 'left' && s.red.x === meta.stage.red[0] && s.blue.y > s.red.y && s.red.x === s.blue.x && s.blue.y - s.red.y >= 150 && rows.length === 18, JSON.stringify({ red: s.red, blue: s.blue, rows: rows.length }));
const sizes = await page.evaluate(async () => { const { CHAR_SCALE } = await import('/src/world/world.js'); const h = (e) => Math.round(e.sprite.fh / e.sprite.px * CHAR_SCALE); const r = game.entities.find((e) => e.id === 'red'); return { red: h(r), player: h(game.player) }; });
check('레드·블루 are drawn much bigger than the party (≥ 2× 형섭 height) but capped so they fit the event camera', sizes.red >= sizes.player * 2 && sizes.red <= 170, JSON.stringify(sizes));
const doorBefore = await page.evaluate(() => { const c = game.entities.find((e) => e.id === 'door_closed'), o = game.entities.find((e) => e.id === 'door_open'); return { closed: !!c && c.solid, open: !!o, plazaRows: game.map.rows.slice(4, 13).every((r) => /[rR]/.test(r[48])) }; });
check('giant temple door: closed (solid) face stands at the right end over the open one; plaza rows 4~12 are stone', doorBefore.closed && doorBefore.open && doorBefore.plazaRows, JSON.stringify(doorBefore));
const stoneCols = rows[7].split('').map((ch, i) => 'rR'.includes(ch) ? i : -1).filter((i) => i >= 0);
check('ancient temple floor: ground tiles first, stone flagstones from col ~20 to the gate (moss variant mixed in)', stoneCols.length >= 30 && Math.min(...stoneCols) <= meta.stone_from && /[tuwn]/.test(rows[7][5]) && rows[7].includes('R'), JSON.stringify({ first: Math.min(...stoneCols), n: stoneCols.length }));
const props = await page.evaluate(() => { const c = {}; for (const e of game.entities) if (e.def?.type === 'prop' && !e.dead) { const k = (e.def.image || '').split('/').pop(); c[k] = (c[k] || 0) + 1; } return c; });
check('temple props: pillars, broken pillars, lanterns, blocks and the giant door (closed over open) are placed', (props['pillar.png'] || 0) >= 4 && (props['pillar_broken.png'] || 0) >= 1 && (props['stone_lantern.png'] || 0) >= 2 && (props['stone_block.png'] || 0) >= 2 && props['temple_door.png'] === 1 && props['temple_door_open.png'] === 1, JSON.stringify(props));
await stand(meta.stone_from * 32 + 96, 7 * 32 + 8, 'right'); await page.waitForTimeout(300); await page.screenshot({ path: `${S}/teal9_01_temple.png` });
// 석등 한 줄
const lan = await page.evaluate(() => { const l = game.entities.find((e) => e.id?.startsWith('lan_b')); return l ? { x: l.x, y: l.y } : null; });
if (lan) { await stand(lan.x + 2, lan.y - 26, 'down'); await page.keyboard.press('KeyC'); const q = await until(() => game.dialogue.running ? true : null, 2000); await page.waitForTimeout(200); const t = (await st()).text; check('stone lantern has a one-line interaction', !!q && t.includes('석등'), t);
  const tl = Date.now(); while (Date.now() - tl < 8000) { const b = await page.evaluate(() => ({ r: game.dialogue.running, box: game.textbox.state })); if (!b.r) break; if (b.box === 'waiting' || b.box === 'typing') await page.keyboard.press('KeyC'); await page.waitForTimeout(120); }   // 석등 대사를 끝까지 넘겨 닫는다(안 닫히면 다음 C 가 레드 대신 이 대사를 넘긴다)
  await page.waitForTimeout(500); }
// 레드 앞에서 C → 연출
await page.evaluate(() => { window.__sfx = []; const o = game.sound.sfx.bind(game.sound); game.sound.sfx = (n, a) => { window.__sfx.push(n); return o(n, a); }; });
await stand(meta.trigger_x - 120, 7 * 32 + 8, 'right'); await page.waitForTimeout(200);   // 말 걸기가 아니라 레드·블루 앞 영역(45열)에 닿으면 시작
await page.keyboard.down('ArrowRight'); const started = await until(() => game.dialogue.running ? true : null, 4000); await page.keyboard.up('ArrowRight');
check('walking into the area in front of 레드·블루 (x ≥ trigger) starts the scene (no C needed)', !!started && (await page.evaluate(() => game.flags.teal9_boss_seen)), '');
let lineupRects = null;
const lines = []; let lineup = null, hopSeen = false, alarmAt = null, hurtSeen = false, redHop = false, bgmOffSeen = false, battleSnap = null, chaseGaps = [];
let lastLineAt = 0, lastKey = '';
const t0 = Date.now();
while (Date.now() - t0 < 180000) {
  const q = await st();
  if (q.battle) {                                                                                   // 보스전: 인트로 → 적 HP 1 → 공격 ×3 → 승리 → C
    if (!battleSnap) { battleSnap = q.battle; await until(() => game.battle?.state === 'intro' ? true : null, 10000); await page.waitForTimeout(500); await page.screenshot({ path: `${S}/teal9_04_battle.png` });
      await page.evaluate(() => { const b = game.battle; b.shown = b.text.length; }); await page.waitForTimeout(600); await page.keyboard.press('KeyC'); await until(() => game.battle?.state === 'menu' ? true : null, 8000);
      await page.evaluate(() => { for (const en of game.battle.enemies) en.hp = 1; });
      for (let i = 0; i < 3; i++) { await page.keyboard.press('KeyC'); await page.waitForTimeout(160); const st2 = await page.evaluate(() => game.battle?.state); if (st2 === 'target') { await page.keyboard.press('KeyC'); await page.waitForTimeout(160); } }
      await until(() => game.battle?.state === 'win' ? true : null, 15000); await page.evaluate(() => { if (game.battle) game.battle.shown = game.battle.text.length; }); await page.waitForTimeout(800); await page.keyboard.press('KeyC');
      await until(() => !game.battle ? true : null, 8000); }
    else await page.waitForTimeout(100);
    continue;
  }
  if (!q.running) break;
  if (q.bgm === null) bgmOffSeen = true; if (q.bgm === 'alarm' && alarmAt === null) alarmAt = lines.length; if (q.hurt > 0.05) hurtSeen = true;
  if (q.red && q.red.hop > 2) redHop = true; if ((q.p && q.p.hop > 2) || (q.gs && q.gs.hop > 2) || (q.pp && q.pp.hop > 2)) hopSeen = true;
  if (q.box === 'waiting' || q.box === 'typing') { const k = key(q);
    if (k !== lastKey) { lastKey = k; lines.push(k); const now = Date.now(); if (k.startsWith('블루|* 하라') && lines.length > 18) chaseGaps.push(now - lastLineAt); lastLineAt = now;
      if (q.text.includes('레드랑 블루인데요') && !lineup) { lineup = q; await page.screenshot({ path: `${S}/teal9_02_lineup.png` });
        lineupRects = await page.evaluate(async () => { const { CHAR_SCALE } = await import('/src/world/world.js'); const rect = (e) => { const w = Math.round(e.sprite.fw / e.sprite.px * CHAR_SCALE), h = Math.round(e.sprite.fh / e.sprite.px * CHAR_SCALE); return { x: Math.round(e.x + e.w / 2 - w / 2), y: Math.round(e.y + e.h - h), w, h }; };
          const g = (id) => id === 'player' ? game.player : game.entities.find((k) => k.id === id && !k.dead); return { cam: { x: Math.round(game.camera.x), y: Math.round(game.camera.y) }, red: rect(g('red')), blue: rect(g('blue')), party: ['player', 'gyeongsub', 'ppaman'].map((id) => rect(g(id))) }; }); }
      if (q.speaker === '블루' && q.text === '* 없다.' && !fs.existsSync(`${S}/teal9_06_blue.png`)) { await page.waitForTimeout(400); const cb = await page.evaluate(async () => { const { CHAR_SCALE } = await import('/src/world/world.js'); const b = game.entities.find((e) => e.id === 'blue'); const h = Math.round(b.sprite.fh / b.sprite.px * CHAR_SCALE); return { top: b.y + b.h - h, bottom: b.y + b.h, camY: Math.round(game.camera.y) }; }); check('camera follows the speaker: on a 블루 line 블루 is fully inside the visible area above the text box', cb.top >= cb.camY && cb.bottom <= cb.camY + 230, JSON.stringify(cb)); await page.screenshot({ path: `${S}/teal9_06_blue.png` }); }
      if (q.text.includes('버프를 획득했다') && !buffCam) { await page.screenshot({ path: `${S}/teal9_07_buff.png` }); buffCam = await page.evaluate(async () => { const { CHAR_SCALE } = await import('/src/world/world.js'); const rect = (e) => { const w = Math.round(e.sprite.fw / e.sprite.px * CHAR_SCALE), h = Math.round(e.sprite.fh / e.sprite.px * CHAR_SCALE); return { x: Math.round(e.x + e.w / 2 - w / 2), y: Math.round(e.y + e.h - h), w, h }; }; const g = (id) => id === 'player' ? game.player : game.entities.find((k) => k.id === id && !k.dead); return { view: { x: Math.round(game.camera.x), y: Math.round(game.camera.y), w: 480, h: 230 }, party: ['player', 'gyeongsub', 'ppaman'].map((id) => rect(g(id))) }; }); }
      if (q.text.includes('침입자 발생') && !fs.existsSync(`${S}/teal9_03_alarm.png`)) { for (let i = 0; i < 12; i++) { const h = await page.evaluate(() => { const r = game.entities.find((e) => e.id === 'red'); return r ? r.hopY || 0 : 0; }); if (h > 2) redHop = true; await page.waitForTimeout(40); } await page.screenshot({ path: `${S}/teal9_03_alarm.png` }); } }
    if (k !== '레드|* 처리하라' && k !== '블루|* 하라') { await page.keyboard.press('KeyC'); }                       // 처리하라/하라 응수 구간(마침표 없음)은 auto 로 넘어간다
    await page.waitForTimeout(50); }
  else await page.waitForTimeout(50);
}
const want = ['억빠맨|* ... ... 레드랑 블루인데요?', '경섭|* 응 그렇네', '레드|* 여기는 지나갈 수 없다.', '블루|* 없다.', '억빠맨|* 마 말을 했어?', '레드|* 여기는 신성한 오브젝트들의 영역', '블루|* 영역', '레드|* 여기를 지나가기 위해서는 시험을 받아야한다.', '블루|* 한다',
  '억빠맨|* 이미 쥰희랑 용준이는 지나갔을텐데 ㅂㅅ인가?', '레드|* ...', '블루|* ...', '레드|* 침입자 발생 침입자 발생 침입자 발생', '블루|* 침입자', '레드|* 제거하라 제거하라 제거하라 제거하라 제거하라', '블루|* 하라.', '억빠맨|* 오...', '레드|* 처리하라', '블루|* 하라',
  '레드|* ...', '블루|* ...', '레드|* 시험에 통과한자들 지나가도 좋다.', '블루|* 좋다', '억빠맨|* 와 ㅈㄴ 세네 시발', '경섭|* 어서 지나가자.', '레드|* 잠깐', '블루|* 깐', '억빠맨|* ?', '레드|* 오브젝트님들의 영역은 신성한 곳', '블루|* 신성한 곳', '레드|* 시험에 통과했으니 우리의 힘을 주겠다.', '블루|* 겠다.', '|* 레드와 블루 버프를 획득했다.* 공격력과 체력이 증가하였다.', '레드|* 지나가라', '블루|* 라.'];
const inOrder = (w, got) => { let i = 0; for (const g of got) if (g === w[i]) i++; return { ok: i === w.length, at: i }; };
const io_ = inOrder(want, lines);
check('all lines in briefing order (verbatim) through the battle to the closing line', io_.ok, JSON.stringify({ reached: io_.at, of: want.length, next: want[io_.at], got: lines.slice(Math.max(0, io_.at - 2), io_.at + 2) }));
check('party lines up vertically from the top (형섭 → 경섭 → 빠맨, same x, 36px apart) facing right; 레드·블루 face left', !!lineup && lineup.p.x === lineup.gs.x && lineup.gs.x === lineup.pp.x && lineup.gs.y - lineup.p.y === 36 && lineup.pp.y - lineup.gs.y === 36 && [lineup.p, lineup.gs, lineup.pp].every((c) => c.f === 'right') && lineup.red.f === 'left', JSON.stringify(lineup && { p: lineup.p, gs: lineup.gs, pp: lineup.pp }));
{ const R = lineupRects; const inside = (r, box) => r.x >= box.x && r.y >= box.y && r.x + r.w <= box.x + box.w && r.y + r.h <= box.y + box.h; const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const view = R && { x: R.cam.x, y: R.cam.y, w: 480, h: 230 };   // 대화창 위 보이는 영역(대화창은 화면 y 230 부터)
  check('event framing: 레드 fully inside the visible area above the text box, 블루 top visible, neither overlaps the party or each other (no clipping — 2026-09-11 postmortem)', !!R && inside(R.red, view) && R.blue.y >= view.y && R.blue.y < view.y + view.h && !overlap(R.red, R.blue) && R.party.every((p) => !overlap(p, R.red) && !overlap(p, R.blue) && inside(p, view)), JSON.stringify(R)); }
check('BGM: off after the lineup, alarm track from "침입자 발생", boss track in battle, hopes after', bgmOffSeen && alarmAt !== null && alarmAt >= 12 && (await st()).bgm === 'hopes', JSON.stringify({ bgmOffSeen, alarmAt, now: (await st()).bgm }));
const sfx = (await st()).sfx;
check('startled hop uses the "!" chime, NOT the official jump sound; siren + thud stomps + red screen pulses during the alarm', hopSeen && sfx.includes('chime') && !sfx.includes('jump') && sfx.filter((n) => n === 'siren').length >= 2 && sfx.includes('thud') && redHop && hurtSeen, JSON.stringify({ hopSeen, redHop, hurtSeen, sfx: [...new Set(sfx)] }));
const chase = lines.filter((l) => l === '레드|* 처리하라').length;
check('처리하라/하라 exchange: 6 pairs, switching faster and faster (last gap < first gap)', chase === 6 && chaseGaps.length >= 5 && chaseGaps[chaseGaps.length - 1] < chaseGaps[0] * 0.6, JSON.stringify({ chase, gaps: chaseGaps }));
check('boss battle: 레드·블루 both, HP 22 each, party of 3', !!battleSnap && battleSnap.enemies.length === 2 && battleSnap.enemies.every((e) => e.max === 22) && battleSnap.members === 3, JSON.stringify(battleSnap));
s = await st();
const doorAfter = await page.evaluate(() => ({ closed: !!game.entities.find((e) => e.id === 'door_closed' && !e.dead), open: !!game.entities.find((e) => e.id === 'door_open' && !e.dead), attack: game.attack, hpBonus: game.hpBonus, maxHp: [game.maxHpOf('hyungsub'), game.maxHpOf('gyeongsub'), game.maxHpOf('ppaman')], hp: [game.hpOf('hyungsub'), game.hpOf('gyeongsub'), game.hpOf('ppaman')] }));
check('after: 레드·블루 stepped aside UP (plaza top row) facing down, the closed door gone (open passage remains), flag set', !!s.red && !!s.blue && s.red.y === meta.stage.red_aside[1] && s.blue.y === meta.stage.blue_aside[1] && s.red.f === 'down' && s.blue.f === 'down' && !doorAfter.closed && doorAfter.open && s.flags.won && s.gs && s.pp, JSON.stringify({ red: s.red, blue: s.blue, flags: s.flags, doorAfter }));
check('blessing: when the power lands the camera is on the party — all three fully inside the visible area (2026-09-11 "주인공 포커스")', !!buffCam && buffCam.party.every((p) => p.x >= buffCam.view.x && p.y >= buffCam.view.y && p.x + p.w <= buffCam.view.x + buffCam.view.w && p.y + p.h <= buffCam.view.y + buffCam.view.h), JSON.stringify(buffCam));
check('buff: attack 1→2, max HP +20 each (120/140/110) with current HP raised by 20 too; join sound (item) played', doorAfter.attack === 2 && doorAfter.hpBonus === 20 && doorAfter.maxHp.join() === '120,140,110' && doorAfter.hp.join() === '120,140,110' && sfx.includes('item'), JSON.stringify(doorAfter));
check('battle entry effect played before the boss battle: jingle + rumble after (door opening)', sfx.includes('battle_start') && sfx.includes('rumble'), JSON.stringify([...new Set(sfx)]));
await page.screenshot({ path: `${S}/teal9_05_after.png` });
await stand(48 * 32, 8 * 32 + 8, 'right'); await page.waitForTimeout(200);   // 광장 가운데 줄에서 열린 돌문 통로로
await page.keyboard.down('KeyX'); await page.keyboard.down('ArrowRight');
const t2 = Date.now(); let mapNow = 'teal9'; while (Date.now() - t2 < 15000) { mapNow = await page.evaluate(() => game.mapId); if (mapNow === 'obj0') break; await page.waitForTimeout(100); }
await page.keyboard.up('ArrowRight'); await page.keyboard.up('KeyX');
check('through the opened stone door → obj0 (옵젝영역0)', mapNow === 'obj0', mapNow);
check('no page/console errors', errs.length === 0, JSON.stringify(errs.slice(0, 4)));
console.log(logs.join('\n')); console.log(`fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
