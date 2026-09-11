// 청록숲7 검증: ?qa=teal7 → 오른쪽으로 3초쯤 걸으면 연출(1회) — ??? "아 경섭이형 어딨어!" → 형섭·빠맨 ! → 위 나무 사이에 양옆으로 숨음(아래를 봄) / 경섭은 바로 아래 길
//   → 쥰희 오른쪽에서 등장·! → 브금 Lancer → 티키타카(그것 노란색, 클로즈업 두둥) → ???: 형 → 쥰희가 형섭·빠맨 사이로 올라감(둘은 비켜서 식은땀) → 용준 등장·대화(끊김) → 퇴장 → 쥰희 "... / 뭐 ㅅㅂ 이따봐 형" 퇴장
//   → 형섭·빠맨 내려옴 → 억빠맨 "형 뭐 숨기고있어요?" … "그 그려" → 브금 hopes 복귀·동료 재정렬 → 플래그 → 오른쪽 문 → teal8.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
process.on('uncaughtException', (e) => { try { console.log(logs.join('\n')); } catch {} console.log('CRASH', e.stack || e.message); process.exit(2); });
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
for (const f of fs.readdirSync(S)) if (f.startsWith('teal7_')) fs.unlinkSync(`${S}/${f}`);
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0; const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) errs.push(`[${m.type()}] ${m.text().slice(0, 160)}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await page.evaluate(fn); if (v) return v; await page.waitForTimeout(60); } return null; };
const st = () => page.evaluate(() => { const e = (id) => { const x = id === 'player' ? game.player : game.entities.find((k) => k.id === id && !k.dead); return x ? { x: Math.round(x.x), y: Math.round(x.y), f: x.facing, em: x.emote?.kind || null, fr: x.frame, mv: !!x.moving, mo: !!x.motion, vis: x.visible !== false } : null; };
  return { map: game.mapId, running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: (game.textbox.node?.text || '').replace(/\{[^}]*\}/g, ''), voice: game.textbox.node?.voice || null, bgm: game.sound.bgmName, zoom: +(game.zoom?.s || 1).toFixed(2),
    p: e('player'), pp: e('ppaman'), gs: e('gyeongsub'), j: e('junhee'), y: e('yongjun'), flags: { seen: !!game.flags.teal7_hide_seen, done: !!game.flags.teal7_hide_done } }; });
const key = (s) => (s.speaker || '') + '|' + s.text;

await page.goto('http://localhost:8000/index.html?qa=teal7'); await until(() => !!(window.game && game.entities && game.player), 15000); await page.keyboard.press('KeyX'); await page.waitForTimeout(400);
const meta = await page.evaluate(async () => (await import('/src/data/maps.js')).MAPS.teal7.meta);
let s = await st();
check('qa=teal7: straight road, party of 2, hide pocket meta present', s.map === 'teal7' && s.pp && s.gs && meta.hide && meta.stage, JSON.stringify({ map: s.map, meta: Object.keys(meta) }));
// 오른쪽으로 걷다 3초쯤에 연출 시작
await page.keyboard.down('ArrowRight');
const t0 = Date.now(); const started = await until(() => game.dialogue.running ? Math.round(performance.now()) : null, 9000); const walkMs = Date.now() - t0;
await page.keyboard.up('ArrowRight');
check('walking right ~3s triggers the scene once (flag teal7_hide_seen)', !!started && walkMs >= 1500 && walkMs <= 6000 && (await st()).flags.seen, `after ${walkMs}ms`);
// 연출 펌프: 대사 기록 + 상태 스냅
const lines = []; let talkSnap = null, hideSnap = null, sandwich = null, sweat = false, lancer = false, zoomed = false, yongjunSeen = false, closeupAt = null, camY = null;
const voices = {}; let yongjunAt = null, yongjunLineAt = null, dashStart = null, dashEnd = null;
const walkFrames = { j: new Set(), y: new Set() }, stopFrames = { j: new Set(), y: new Set() };   // NPC 걷기 프레임이 컷신 이동 중 0 에 고정되지 않는지(PR #13 프레임 초기화 버그), 멈추면 0 으로 돌아오는지   // 화면 밖 목소리 / 용준 달려오는 시간 / 쥰희 숨으러 달리는 시간 (사용자 2026-09-11)
const t1 = Date.now();
while (Date.now() - t1 < 120000) {
  const q = await st(); if (!q.running) break;
  for (const k of ['j', 'y']) if (q[k] && !q[k].mo) { (q[k].mv ? walkFrames : stopFrames)[k].add(q[k].fr); }
  if (q.bgm === 'lancer') lancer = true; if (q.zoom >= 1.4) zoomed = true; if (q.y) { yongjunSeen = true; if (yongjunAt === null) yongjunAt = Date.now(); }
  if (q.j && sandwich === null) { if (dashStart === null && q.j.x === meta.stage.guest[0] && q.j.y === meta.stage.guest[1] && lines.includes('쥰희|* 오 이런 나좀 숨겨줘')) dashStart = Date.now(); if (dashStart !== null && dashEnd === null && q.j.y === meta.hide.center[1]) dashEnd = Date.now(); }
  if ((q.box === 'waiting' || q.box === 'typing')) { const k = key(q); if (lines[lines.length - 1] !== k) { lines.push(k); if (q.speaker === '???') voices[q.text] = q.voice; if (k === '박용준|* 어 형 안녕하세요' && yongjunLineAt === null) yongjunLineAt = Date.now();
      if (q.text.includes('형 여깄었구나') && !hideSnap) { hideSnap = q; camY = await page.evaluate(() => Math.round(game.camera.y)); await page.screenshot({ path: `${S}/teal7_01_hide.png` }); }
      if (q.text.includes('어 ?') && q.speaker === '경섭' && !sandwich) { sandwich = q; await page.screenshot({ path: `${S}/teal7_02_sandwich.png` }); }
      if (q.text.includes('센게 멋지잖아') && !closeupAt) { closeupAt = q.zoom; await page.screenshot({ path: `${S}/teal7_03_closeup.png` }); }
      if (q.text.includes('아까 본게 쥰희였구나') && !talkSnap) { talkSnap = q; await page.screenshot({ path: `${S}/teal7_05_talk.png` }); } }
    if (q.p?.em === 'sweat' || q.pp?.em === 'sweat') sweat = true;
    await page.keyboard.press('KeyC'); await page.waitForTimeout(50); }
  else { if (q.p?.em === 'sweat' || q.pp?.em === 'sweat') sweat = true; await page.waitForTimeout(50); }
}
const want = ['???|* 아 경섭이형 어딨어!', '쥰희|* 형 여깄었구나', '경섭|* 어 그치 나 여기있었어', '쥰희|* 내가 엄청난녀석을 발견했어 저기 뒤로가면 바론있음', '경섭|* 응?', '쥰희|* 내가 만든 무기를 시험해 볼때가 온거야 으하하하', '경섭|* 허허 바론은 좀 힘들지 않을까?', '쥰희|* 솔바론 씹가능이라구여 진짜로 형 나 믿어봐', '경섭|* 응 그러면 바로 걔랑 싸우러 갈거야?', '쥰희|* 아니 아직 부족해 일단 우리가 만든 그것이 목표잖아? 바론 잡는건 사실 아무 상관없어 그렇지만..', '경섭|* 그렇지만?', '쥰희|* 그냥 존나 센게 멋지잖아!', '경섭|* 허허..', '쥰희|* 일단은 잘 준비하고 따라와보라고 으하하', '???|* 형', '쥰희|* 오 이런 나좀 숨겨줘', '경섭|* 어 ?', '박용준|* 어 형 안녕하세요', '경섭|* 어 용준아 안녕', '박용준|* 쥰희형 못보셨어요?', '경섭|* 어? 응 아직 못봤어', '박용준|* 에잉ㅉ 형 제가 쥰희형이랑 만든거 꼭 구경하셔야해요 옆에 바론이 있는데 잡으려구요', '경섭|* 오 그렇구나 근데 쥰희는 왜 찾니?', '박용준|* 아니 쥰희형은 ㅅㅂ 하이퍼 초 로케트 슈퍼 펀치 울트라 미라클 개쩌는 무기를 만들생각을 안하고', '경섭|* 어어어 용준아 그렇구나', '박용준|* 어쨋든 그래서 제가 강제노동을 조금시켰거든요? 바론잡기 먼저하자고', '박용준|* 근데 갑자기 처 도망가서는 어휴 잡으러 왔는데 안계시더라구요', '경섭|* 아 그렇구나', '박용준|* 쥰희형은 또 지가 만든거 아니면서 자기가 만들었다고 꺼드럭거리는거 아니겠죠?', '경섭|* 허허 아닐거야', '박용준|* 형 일단 전 먼저 가볼게요 이따봐요 ㅎㅎ', '경섭|* 어 그래', '쥰희|* ... ... ...', '경섭|* ... ... ...', '쥰희|* 뭐 ㅅㅂ 이따봐 형', '억빠맨|* 아까 본게 쥰희였구나. 형 뭐 숨기고있어요?', '경섭|* 응? 아니 아 아니야..', '억빠맨|* (... 있는거같은데 걍 묻지말자)', '억빠맨|* 흠 일단 형 옆에 바론? 잡자고 했으니까 저희도 한번 구경가보죠', '경섭|* 그 그려'];
const inOrder = (w, got) => { let i = 0; for (const g of got) if (g === w[i]) i++; return { ok: i === w.length, at: i }; };
const io_ = inOrder(want, lines);
check('all lines in briefing order (interrupt line "그 ㅂ.." may be skipped by auto)', io_.ok, JSON.stringify({ reached: io_.at, of: want.length, next: want[io_.at], got: lines.slice(Math.max(0, io_.at - 2), io_.at + 2) }));
check('camera sits lower during the hide so both the pocket row and the road are above the text box', camY !== null && hideSnap && hideSnap.p.y - camY < 120 && hideSnap.gs.y - camY < 230, JSON.stringify({ camY, p: hideSnap?.p?.y, gs: hideSnap?.gs?.y }));
check('hide staging: 형섭 left / 빠맨 right in the pocket row facing down, 경섭 on the road right below, 쥰희 arrived from the right facing left', !!hideSnap && hideSnap.p.y === meta.hide.left[1] && hideSnap.pp.y === meta.hide.right[1] && hideSnap.p.x < hideSnap.pp.x && hideSnap.p.f === 'down' && hideSnap.pp.f === 'down' && hideSnap.gs.y === meta.stage.gyeongsub[1] && hideSnap.j && hideSnap.j.f === 'left' && hideSnap.j.x > hideSnap.gs.x, JSON.stringify(hideSnap && { p: hideSnap.p, pp: hideSnap.pp, gs: hideSnap.gs, j: hideSnap.j }));
check('BGM: Lancer plays during the scene; close-up zoom on 쥰희 at "센게 멋지잖아!"', lancer && zoomed && closeupAt >= 1.4, JSON.stringify({ lancer, zoomed, closeupAt }));
check('off-screen ??? lines use the real voices: "아 경섭이형 어딨어!" = junhee, "형" = yongjun', voices['* 아 경섭이형 어딨어!'] === 'junhee' && voices['* 형'] === 'yongjun', JSON.stringify(voices));
check('NPC walk frames advance during cutscene moves (쥰희·용준 not stuck on frame 0) and rest on frame 0 when stopped', walkFrames.j.size >= 2 && walkFrames.y.size >= 2 && [...stopFrames.j].every((f) => f === 0) && [...stopFrames.y].every((f) => f === 0), JSON.stringify({ walk: { j: [...walkFrames.j], y: [...walkFrames.y] }, stop: { j: [...stopFrames.j], y: [...stopFrames.y] } }));
check('용준 runs in: spawn → first line within 3.5s (was a 4.5s walk)', yongjunAt !== null && yongjunLineAt !== null && yongjunLineAt - yongjunAt <= 3500, `${yongjunLineAt - yongjunAt}ms`);
check('쥰희 sprints up to hide: guest → center row within 0.9s', dashStart !== null && dashEnd !== null && dashEnd - dashStart <= 900, `${dashEnd - dashStart}ms`);
const pocket = await page.evaluate(() => { const ring = game.entities.filter((e) => e.def.type === 'prop' && /^ring_/.test(e.id || '')); const sh = game.entities.find((e) => e.def.type === 'shade');
  return { ring: ring.length, shade: sh ? [sh.x, sh.y, sh.w, sh.h] : null }; });
const inside = (pt) => pocket.shade && pt[0] >= pocket.shade[0] && pt[0] + 24 <= pocket.shade[0] + pocket.shade[2] && pt[1] >= pocket.shade[1] && pt[1] <= pocket.shade[1] + pocket.shade[3];
check('hideout: 17 ring trees around the pocket + shade overlay covering all hide spots', pocket.ring === meta.ring && pocket.ring === 17 && !!pocket.shade && ['left', 'center', 'right', 'left_wide', 'right_wide'].every((k) => inside(meta.hide[k])), JSON.stringify(pocket));
check('sandwich: 쥰희 goes up between 형섭 and 빠맨 (x order 형섭 < 쥰희 < 빠맨, same row, all facing down) with sweat emotes', !!sandwich && sandwich.j && sandwich.p.x < sandwich.j.x && sandwich.j.x < sandwich.pp.x && sandwich.j.y === meta.hide.center[1] && sandwich.j.f === 'down' && sweat, JSON.stringify(sandwich && { p: sandwich.p, j: sandwich.j, pp: sandwich.pp, sweat }));
s = await st();
check('after: 용준 appeared and left, 쥰희 gone, party back on the road behind 형섭, BGM hopes, flag done', yongjunSeen && !s.j && !s.y && s.flags.done && s.bgm === 'hopes' && s.p.y === meta.stage.back_h[1] && s.pp && s.gs && Math.abs(s.pp.y - s.p.y) <= 40 && Math.abs(s.gs.y - s.p.y) <= 40, JSON.stringify({ yongjunSeen, j: s.j, y: s.y, flags: s.flags, bgm: s.bgm, p: s.p, pp: s.pp, gs: s.gs }));
await page.screenshot({ path: `${S}/teal7_04_after.png` });
check('final talk staging ("아까 본게 쥰희였구나") is loose: 경섭 ← ≥56px → 형섭 ← ≥56px → 빠맨, 빠맨 one step lower (32px was "too close")', !!talkSnap && Math.abs(talkSnap.gs.x - talkSnap.p.x) >= 56 && Math.abs(talkSnap.p.x - talkSnap.pp.x) >= 56 && talkSnap.pp.y > talkSnap.p.y, JSON.stringify(talkSnap && { gs: talkSnap.gs.x, p: [talkSnap.p.x, talkSnap.p.y], pp: [talkSnap.pp.x, talkSnap.pp.y] }));
await page.keyboard.down('KeyX'); await page.keyboard.down('ArrowRight');
const t2 = Date.now(); let mapNow = 'teal7'; while (Date.now() - t2 < 20000) { mapNow = await page.evaluate(() => game.mapId); if (mapNow === 'teal8') break; await page.waitForTimeout(100); }
await page.keyboard.up('ArrowRight'); await page.keyboard.up('KeyX');
check('right door → teal8', mapNow === 'teal8', mapNow);
check('no page/console errors', errs.length === 0, JSON.stringify(errs.slice(0, 4)));
console.log(logs.join('\n')); console.log(`fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
