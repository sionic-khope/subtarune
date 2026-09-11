// 옵젝영역1 검증: ?qa=obj1 → 도착 연출(브금 vs_lancer, 카메라가 가운데 둘에게, 허이얍/흐이야아압 마다 대포+둘이 한 칸(32px)·드륵 ×5, "그 소리 내면" 에 브금 일시정지 → . . . 말풍선 → "하이얍" 에 이어서, 카메라 주인공)
//   → 걸어가 둘 앞 3칸 트리거 → 만남 연출(느낌표, 두구두구 → 대포 줌 → 빰빠밤, 다 닥쳐(흔들림·브금 off), 요플래 줌, 웃음, 쥰희가 오른쪽으로 달려 맵 밖으로, 카메라 복귀, 도와주실 수 있나요, 브금 wind)
//   → 다시 들어오면 연출 없음, 용준·대포는 민 자리에, 쥰희 없음.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
process.on('uncaughtException', (e) => { try { console.log(logs.join('\n')); } catch {} console.log('CRASH', e.stack || e.message); process.exit(2); });
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
for (const f of fs.readdirSync(S)) if (f.startsWith('obj1_')) fs.unlinkSync(`${S}/${f}`);
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0; const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) errs.push(`[${m.type()}] ${m.text().slice(0, 160)}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await page.evaluate(fn); if (v) return v; await page.waitForTimeout(60); } return null; };
const st = () => page.evaluate(() => { const g = (id) => game.entities.find((e) => e.id === id && !e.dead); const c = g('cannon') || g('cannon_after'), j = g('junhee'), y = g('yongjun') || g('yongjun_after');
  return { map: game.mapId, running: game.dialogue.running, box: game.textbox.state, bgm: game.sound.bgmName, paused: !!game.sound.paused, zoom: +game.zoom.s.toFixed(2), shake: !!game.shake, cam: [Math.round(game.camera.x), Math.round(game.camera.y)], camTarget: game.camera.target === game.player ? 'player' : (game.camera.target?.id || null),
    p: [Math.round(game.player.x), Math.round(game.player.y)], cannon: c ? { id: c.id, x: c.x, ix: c.def.ix } : null, junhee: j ? { x: Math.round(j.x), y: Math.round(j.y), frame: j.frame, emote: j.emote?.kind || null } : null, yongjun: y ? { id: y.id, x: Math.round(y.x), frame: y.frame } : null,
    bubble: !!(game.bubble && !game.bubble.done), sfx: window.__sfx || [], flags: Object.keys(game.flags).filter((k) => k.startsWith('obj1_')) }; });
const stand = async (x, y, f) => { await page.evaluate(({ x, y, f }) => { game.player.x = x; game.player.y = y; game.player.facing = f; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); game.camera.snap(); }, { x, y, f }); await page.waitForTimeout(150); };
const advance = async () => { await until(() => game.textbox.state === 'waiting' ? true : null, 4000); await page.keyboard.press('KeyC'); };   // 다 찍힌 뒤 C (타자 중 C 는 글자만 다 찍는다)
const key = (q) => (q.speaker || '') + '|' + (q.text || '').replace(/\{[^}]*\}/g, '');
// 대사를 넘기며 관찰: lines + 각 대사 때의 상태 스냅샷(onLine 콜백)
const pump = async (ms, onLine) => { await until(() => game.dialogue.running ? true : null, 4000); const t0 = Date.now(); let last = null; const lines = [];
  while (Date.now() - t0 < ms) { const q = await page.evaluate(() => ({ running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: game.textbox.node?.text || '', auto: game.textbox.auto })); if (!q.running) break;
    if (q.box === 'waiting' || q.box === 'typing') { const k = key(q); if (k !== last) { last = k; lines.push(k); if (onLine) await onLine(k, q); } if (q.box === 'waiting' && q.auto === null) await page.keyboard.press('KeyC'); }
    await page.waitForTimeout(60); }
  return lines; };

await page.goto('http://localhost:8000/index.html?qa=obj1'); await until(() => !!(window.game && game.entities && game.player), 15000); await page.keyboard.press('KeyX');
await page.evaluate(() => { window.__sfx = []; const prev = game.sound.sfx.bind(game.sound); game.sound.sfx = (n, o) => { window.__sfx.push(n); return prev(n, o); }; });
const meta = await page.evaluate(async () => (await import('/src/data/maps.js')).MAPS.obj1.meta);
const s0 = await st();
check('qa=obj1: taller water road (6 rows), cannon + 쥰희·용준 in the middle, map bgm wind before the scene', s0.map === 'obj1' && meta.road[1] - meta.road[0] === 5 && !!s0.cannon && !!s0.junhee && !!s0.yongjun && s0.cannon.ix === meta.cannon[0], JSON.stringify({ cannon: s0.cannon, junhee: s0.junhee, yongjun: s0.yongjun, bgm: s0.bgm }));
// 도착 연출
const snaps = {}; const cannonXs = []; let pausedSeen = false, bubbleSeen = false, resumedAt = null, junheeWalked = false;
const lines1 = await pump(60000, async (k) => { const q = await st(); snaps[k] = q; cannonXs.push(q.cannon.x); if (k.includes('흐이야아압!!') && !fs.existsSync(`${S}/obj1_01_push.png`)) { await advance(); for (let i = 0; i < 10; i++) { await page.waitForTimeout(60); const w = await st(); if (w.junhee && w.junhee.frame !== 0) junheeWalked = true; if (i === 4) await page.screenshot({ path: `${S}/obj1_01_push.png` }); } }
  if (k.includes('안되는거 아니에요')) { await advance(); for (let i = 0; i < 50; i++) { await page.waitForTimeout(70); const w = await st(); if (w.paused && w.bgm === null) pausedSeen = true; if (w.bubble) bubbleSeen = true; const cur = await page.evaluate(() => game.textbox.node?.text || ''); if (cur.includes('하이얍!!!!')) break; } }
  if (k.includes('하이얍!!!!')) { resumedAt = (await st()).bgm; } });
let s = await st();
const want1 = ['쥰희|* 허이얍!!', '박용준|* 흐이야아압!!', '쥰희|* 허이얍!!!!!! 하아아압!!', '박용준|* 흐이이야압!!!!!!!!!!!!!!!!!!!!!!!!!!!!', '쥰희|* 흐에에 !!!!!', '박용준|* 어 형 그 소리 내면 안되는거 아니에요?', '쥰희|* 하이얍!!!!'];
check('arrival: 7 lines verbatim in order', JSON.stringify(lines1) === JSON.stringify(want1), JSON.stringify(lines1));
check('arrival: bgm Vs. Lancer from the start, camera on the pushers (far from the player) at the first line', snaps[want1[0]]?.bgm === 'vs_lancer' && Math.abs(snaps[want1[0]].cam[0] + 240 - snaps[want1[0]].p[0]) > 300, JSON.stringify(snaps[want1[0]] && { bgm: snaps[want1[0]].bgm, cam: snaps[want1[0]].cam, p: snaps[want1[0]].p }));
check('each shout pushes the cannon one tile (32px) with 드륵 (scrape ×5), and the pushers walk with it (leg frames change)', s.cannon.ix === meta.cannon[0] + 5 * 32 && s.junhee.x === meta.pushers[0] + 5 * 32 && s.yongjun.x === meta.pushers[2] + 5 * 32 && s.sfx.filter((n) => n === 'scrape').length === 5 && junheeWalked, JSON.stringify({ cannon: s.cannon, junhee: s.junhee, yongjun: s.yongjun, scrape: s.sfx.filter((n) => n === 'scrape').length, junheeWalked, cannonXs }));
check('"그 소리 내면 안되는거 아니에요?" → bgm paused (silent) → 쥰희 . . . bubble (no text box) → bgm resumes on "하이얍!!!!"', pausedSeen && bubbleSeen && resumedAt === 'vs_lancer' && s.bgm === 'vs_lancer' && !s.paused, JSON.stringify({ pausedSeen, bubbleSeen, resumedAt, bgm: s.bgm }));
await page.waitForTimeout(1100); s = await st();
check('after the arrival scene the camera is back on the player (clamped at the left edge) and control returns', !s.running && s.camTarget === 'player' && s.cam[0] <= 60, JSON.stringify({ running: s.running, camTarget: s.camTarget, cam: s.cam, p: s.p }));
// 걸어가서 만남 트리거
await page.keyboard.down('ArrowRight'); const started = await until(() => game.dialogue.running ? true : null, 12000); await page.keyboard.up('ArrowRight');
const trigP = await st();
check('walking up to them (≈2 tiles in front of 쥰희) starts the meeting scene', !!started && trigP.p[0] < meta.pushers[0] + 5 * 32 - 40, JSON.stringify({ p: trigP.p, junhee: meta.pushers[0] + 5 * 32 }));
let framing = null; let emoteSeen = false, zoomCannon = 0, zoomPlayer = 0, shakeSeen = false, bgmAtShout = 'x', bgmAtName = 'x', junheeGoneMid = false, camFollowed = false;
const lines2 = await pump(120000, async (k) => { const q = await st(); if (q.junhee?.emote === '!') emoteSeen = true;
  if (k.includes('용준짱 대포')) { zoomCannon = q.zoom; bgmAtName = q.bgm; await page.screenshot({ path: `${S}/obj1_02_cannon.png` }); }
  if (k.includes('뭐함 너네')) { framing = await page.evaluate(async () => { const { CHAR_SCALE } = await import('/src/world/world.js'); const rect = (e) => { const w = Math.round(e.sprite.fw / e.sprite.px * CHAR_SCALE), h = Math.round(e.sprite.fh / e.sprite.px * CHAR_SCALE); return { x: Math.round(e.x + e.w / 2 - w / 2), y: Math.round(e.y + e.h - h), w, h }; }; const g = (id) => id === 'player' ? game.player : game.entities.find((k) => k.id === id && !k.dead); return { view: { x: Math.round(game.camera.x), y: Math.round(game.camera.y), w: 480, h: 230 }, chars: ['player', 'gyeongsub', 'ppaman', 'junhee', 'yongjun'].map((id) => ({ id, ...rect(g(id)) })) }; }); }
  if (k.includes('다 닥쳐')) { for (let i = 0; i < 8; i++) { await page.waitForTimeout(60); const w = await st(); if (w.shake) shakeSeen = true; } bgmAtShout = (await st()).bgm; await page.screenshot({ path: `${S}/obj1_03_shout.png` }); }
  if (k.includes('네녀석이 어떻게')) { await page.waitForTimeout(450); zoomPlayer = (await st()).zoom; }
  if (k.includes('생각하지마라')) { await advance(); for (let i = 0; i < 60; i++) { await page.waitForTimeout(80); const w = await st(); if (w.camTarget === 'junhee') camFollowed = true; if (!w.junhee) { junheeGoneMid = true; break; } } }
  if (k.includes('도와주실 수 있나요')) await page.screenshot({ path: `${S}/obj1_04_end.png` }); });
s = await st();
const want2 = ['쥰희|* 아 아닛 이럴수가 너 너희가 어떻게', '박용준|* 어 경섭이형 응 빠맨이형도 있네 그리고..', '억빠맨|* 뭐함 너네?', '박용준|* 훗훗훗 저희 바론 사냥하러 갑니다 빠맨이형', '억빠맨|* 뭔데 이게?', '박용준|* 이거로 말씀드릴거같으면 바로 ~!!', '박용준|* 저의 역착 울트라 슈퍼 하이퍼 초 미라클 레전더리 어메이징 바주카 용준짱 대포!!!!', '억빠맨|* 울트라 스펠링 머임?', '박용준|* ... 네? 아.. ㅋㅋ 아 형 그게 무슨상관', '억빠맨|* 머냐고', '박용준|* ... ... ... ourtla ?', '억빠맨|* 느금마', '쥰희|* 다 닥쳐!!!', '쥰희|* 네 네녀석이 어떻게 여기있는거야!!!', '쥰희|* 이런 이런 내 계획이 틀어졌어.', '박용준|* 형 그게 무슨소리에요', '쥰희|* 용준아 솔바론은 포기해야할거같다. 일단 난 그것을 손보러 가야될 것 같아.', '박용준|* 네?', '쥰희|* 흥 흥!!!!', '쥰희|* 나를 막을 수 있을거라고 생각하지마라.', '박용준|* 형 어쩔수없네요 뭐 저새긴 원래부터 필요없었어요', '박용준|* 그래서 말인데요 형님들 저 이거 미는것좀 도와주실 수 있나요?'];
const inside = (r, b) => r.x >= b.x && r.y >= b.y && r.x + r.w <= b.x + b.w && r.y + r.h <= b.y + b.h; const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
check('meeting framing: party of 3 + 쥰희·용준 all fully inside the visible area (no edge clipping, not under the text box), 쥰희 and 용준 not overlapping each other', !!framing && framing.chars.every((c) => inside(c, framing.view)) && !overlap(framing.chars[3], framing.chars[4]), JSON.stringify(framing));
check('meeting: 22 lines verbatim in order', JSON.stringify(lines2) === JSON.stringify(want2), JSON.stringify(lines2));
check('meeting: 쥰희 "!" emote, drumroll then cannon close-up (zoom ≥ 1.4 — the 2× cannon fully inside the area above the text box) on the name line, fanfare after it', emoteSeen && s.sfx.includes('drumroll') && zoomCannon >= 1.4 && s.sfx.includes('fanfare') && bgmAtName === 'vs_lancer', JSON.stringify({ emoteSeen, zoomCannon, bgmAtName, sfx: [...new Set(s.sfx)] }));
check('"다 닥쳐!!!": screen shakes and the bgm is off; 요플래 close-up on the next line; 쥰희 laugh sfx', shakeSeen && bgmAtShout === null && zoomPlayer >= 1.5 && s.sfx.includes('laugh_junhee'), JSON.stringify({ shakeSeen, bgmAtShout, zoomPlayer }));
check('쥰희 dashes right off the map edge (camera follows, then returns); flag set; map bgm wind back; camera on the player', camFollowed && junheeGoneMid && !s.junhee && s.flags.includes('obj1_junhee_gone') && s.flags.includes('obj1_meet_seen') && s.bgm === 'wind' && s.camTarget === 'player', JSON.stringify({ camFollowed, junheeGoneMid, junhee: s.junhee, flags: s.flags, bgm: s.bgm, camTarget: s.camTarget }));
// 다시 들어오면: 연출 없음, 용준·대포는 민 자리에, 쥰희 없음
const L = await page.evaluate(async () => (await import('/src/data/maps.js')).MAPS.obj1.spawns.landing);
await page.waitForTimeout(500); await stand(L.x, L.y, 'right'); await page.keyboard.down('ArrowRight'); await until(() => game.mapId === 'obj2' ? true : null, 8000); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(800);
await page.keyboard.down('ArrowLeft'); await until(() => game.mapId === 'obj1' ? true : null, 8000); await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(1200); s = await st();
check('re-entering obj1: no scene, 용준(after) and the cannon stand where they were pushed to, 쥰희 gone, bgm wind', s.map === 'obj1' && !s.running && s.yongjun?.id === 'yongjun_after' && s.yongjun.x === meta.pushers[2] + 5 * 32 && s.cannon?.id === 'cannon_after' && s.cannon.ix === meta.cannon[0] + 5 * 32 && !s.junhee && s.bgm === 'wind', JSON.stringify({ running: s.running, yongjun: s.yongjun, cannon: s.cannon, junhee: s.junhee, bgm: s.bgm }));
check('no page/console errors', errs.length === 0, JSON.stringify(errs.slice(0, 4)));
console.log(logs.join('\n')); console.log(`fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
