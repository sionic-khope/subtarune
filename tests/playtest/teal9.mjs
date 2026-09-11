// 청록숲9 검증: ?qa=teal9 → 일직선 길, 뒤로 갈수록 고대 사원 판석·기둥·석등·사원 문 → 오른쪽 끝 레드·블루가 막고 있음 → C → 파티 세로 정렬 → 브금 꺼짐 → 대사(브리핑 그대로)
//   → 셋 놀람 점프(공식 jump 소리 ✗, chime ✓) → "침입자 발생" 에 브금 alarm + 사이렌 + 레드 쿵쿵 + 붉은 번쩍 → 처리하라/하라 가속 응수 → 돌진 → 보스전(red·blue HP 22, 브금 boss) → 승리 → 둘 제거·플래그·브금 hopes → 오른쪽 문 → teal10.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
process.on('uncaughtException', (e) => { try { console.log(logs.join('\n')); } catch {} console.log('CRASH', e.stack || e.message); process.exit(2); });
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
for (const f of fs.readdirSync(S)) if (f.startsWith('teal9_')) fs.unlinkSync(`${S}/${f}`);
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0; const errs = [];
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
check('qa=teal9: straight road, party of 3, 레드·블루 block the right end (solid, facing left)', s.map === 'teal9' && s.gs && s.pp && s.red && s.blue && s.red.solid && s.blue.solid && s.red.f === 'left' && s.red.x === meta.stage.red[0] && s.blue.y > s.red.y, JSON.stringify({ red: s.red, blue: s.blue }));
const stoneCols = rows[7].split('').map((ch, i) => 'rR'.includes(ch) ? i : -1).filter((i) => i >= 0);
check('ancient temple floor: ground tiles first, stone flagstones from col ~20 to the gate (moss variant mixed in)', stoneCols.length >= 30 && Math.min(...stoneCols) <= meta.stone_from && /[tuwn]/.test(rows[7][5]) && rows[7].includes('R'), JSON.stringify({ first: Math.min(...stoneCols), n: stoneCols.length }));
const props = await page.evaluate(() => { const c = {}; for (const e of game.entities) if (e.def?.type === 'prop' && !e.dead) { const k = (e.def.image || '').split('/').pop(); c[k] = (c[k] || 0) + 1; } return c; });
check('temple props: pillars, broken pillars, lanterns, blocks and the gate arch are placed', (props['pillar.png'] || 0) >= 4 && (props['pillar_broken.png'] || 0) >= 2 && (props['stone_lantern.png'] || 0) >= 2 && (props['stone_block.png'] || 0) >= 2 && props['temple_gate.png'] === 1, JSON.stringify(props));
await stand(meta.stone_from * 32 + 96, 7 * 32 + 8, 'right'); await page.waitForTimeout(300); await page.screenshot({ path: `${S}/teal9_01_temple.png` });
// 석등 한 줄
const lan = await page.evaluate(() => { const l = game.entities.find((e) => e.id?.startsWith('lan_b')); return l ? { x: l.x, y: l.y } : null; });
if (lan) { await stand(lan.x + 2, lan.y - 26, 'down'); await page.keyboard.press('KeyC'); const q = await until(() => game.dialogue.running ? true : null, 2000); await page.waitForTimeout(200); const t = (await st()).text; check('stone lantern has a one-line interaction', !!q && t.includes('석등'), t);
  const tl = Date.now(); while (Date.now() - tl < 8000) { const b = await page.evaluate(() => ({ r: game.dialogue.running, box: game.textbox.state })); if (!b.r) break; if (b.box === 'waiting' || b.box === 'typing') await page.keyboard.press('KeyC'); await page.waitForTimeout(120); }   // 석등 대사를 끝까지 넘겨 닫는다(안 닫히면 다음 C 가 레드 대신 이 대사를 넘긴다)
  await page.waitForTimeout(500); }
// 레드 앞에서 C → 연출
await page.evaluate(() => { window.__sfx = []; const o = game.sound.sfx.bind(game.sound); game.sound.sfx = (n, a) => { window.__sfx.push(n); return o(n, a); }; });
await stand(meta.stage.red[0] - 40, meta.stage.red[1] + 12, 'right'); await page.waitForTimeout(200); await page.keyboard.press('KeyC');
const started = await until(() => game.dialogue.running ? true : null, 3000); check('C on 레드 → scene starts', !!started, '');
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
      if (q.text.includes('레드랑 블루인데요') && !lineup) { lineup = q; await page.screenshot({ path: `${S}/teal9_02_lineup.png` }); }
      if (q.text.includes('침입자 발생') && !fs.existsSync(`${S}/teal9_03_alarm.png`)) { for (let i = 0; i < 12; i++) { const h = await page.evaluate(() => { const r = game.entities.find((e) => e.id === 'red'); return r ? r.hopY || 0 : 0; }); if (h > 2) redHop = true; await page.waitForTimeout(40); } await page.screenshot({ path: `${S}/teal9_03_alarm.png` }); } }
    if (k !== '레드|* 처리하라' && k !== '블루|* 하라') { await page.keyboard.press('KeyC'); }                       // 처리하라/하라 응수 구간(마침표 없음)은 auto 로 넘어간다
    await page.waitForTimeout(50); }
  else await page.waitForTimeout(50);
}
const want = ['억빠맨|* ... ... 레드랑 블루인데요?', '경섭|* 응 그렇네', '레드|* 여기는 지나갈 수 없다.', '블루|* 없다.', '억빠맨|* 마 말을 했어?', '레드|* 여기는 신성한 오브젝트들의 영역', '블루|* 영역', '레드|* 여기를 지나가기 위해서는 시험을 받아야한다.', '블루|* 한다',
  '억빠맨|* 이미 쥰희랑 용준이는 지나갔을텐데 ㅂㅅ인가?', '레드|* ...', '블루|* ...', '레드|* 침입자 발생 침입자 발생 침입자 발생', '블루|* 침입자', '레드|* 제거하라 제거하라 제거하라 제거하라 제거하라', '블루|* 하라.', '억빠맨|* 오...', '레드|* 처리하라', '블루|* 하라', '|* 시험이 끝났다. 사원으로 가는 길이 열렸다.'];
const inOrder = (w, got) => { let i = 0; for (const g of got) if (g === w[i]) i++; return { ok: i === w.length, at: i }; };
const io_ = inOrder(want, lines);
check('all lines in briefing order (verbatim) through the battle to the closing line', io_.ok, JSON.stringify({ reached: io_.at, of: want.length, next: want[io_.at], got: lines.slice(Math.max(0, io_.at - 2), io_.at + 2) }));
check('party lines up vertically from the top (형섭 → 경섭 → 빠맨, same x, 36px apart) facing right; 레드·블루 face left', !!lineup && lineup.p.x === lineup.gs.x && lineup.gs.x === lineup.pp.x && lineup.gs.y - lineup.p.y === 36 && lineup.pp.y - lineup.gs.y === 36 && [lineup.p, lineup.gs, lineup.pp].every((c) => c.f === 'right') && lineup.red.f === 'left', JSON.stringify(lineup && { p: lineup.p, gs: lineup.gs, pp: lineup.pp }));
check('BGM: off after the lineup, alarm track from "침입자 발생", boss track in battle, hopes after', bgmOffSeen && alarmAt !== null && alarmAt >= 12 && (await st()).bgm === 'hopes', JSON.stringify({ bgmOffSeen, alarmAt, now: (await st()).bgm }));
const sfx = (await st()).sfx;
check('startled hop uses the "!" chime, NOT the official jump sound; siren + thud stomps + red screen pulses during the alarm', hopSeen && sfx.includes('chime') && !sfx.includes('jump') && sfx.filter((n) => n === 'siren').length >= 2 && sfx.includes('thud') && redHop && hurtSeen, JSON.stringify({ hopSeen, redHop, hurtSeen, sfx: [...new Set(sfx)] }));
const chase = lines.filter((l) => l === '레드|* 처리하라').length;
check('처리하라/하라 exchange: 6 pairs, switching faster and faster (last gap < first gap)', chase === 6 && chaseGaps.length >= 5 && chaseGaps[chaseGaps.length - 1] < chaseGaps[0] * 0.6, JSON.stringify({ chase, gaps: chaseGaps }));
check('boss battle: 레드·블루 both, HP 22 each, party of 3', !!battleSnap && battleSnap.enemies.length === 2 && battleSnap.enemies.every((e) => e.max === 22) && battleSnap.members === 3, JSON.stringify(battleSnap));
s = await st();
check('after: 레드·블루 removed, flag set, party regrouped', !s.red && !s.blue && s.flags.won && s.gs && s.pp, JSON.stringify({ red: s.red, blue: s.blue, flags: s.flags }));
await page.screenshot({ path: `${S}/teal9_05_after.png` });
await stand(46 * 32, 7 * 32 + 8, 'right'); await page.waitForTimeout(200);   // 문 구간은 아래 두 줄(7~8행)만 열려 있다
await page.keyboard.down('KeyX'); await page.keyboard.down('ArrowRight');
const t2 = Date.now(); let mapNow = 'teal9'; while (Date.now() - t2 < 15000) { mapNow = await page.evaluate(() => game.mapId); if (mapNow === 'teal10') break; await page.waitForTimeout(100); }
await page.keyboard.up('ArrowRight'); await page.keyboard.up('KeyX');
check('right door (past the gate) → teal10', mapNow === 'teal10', mapNow);
check('no page/console errors', errs.length === 0, JSON.stringify(errs.slice(0, 4)));
console.log(logs.join('\n')); console.log(`fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
