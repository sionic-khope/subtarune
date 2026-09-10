// 보라맵11 거대 나무 검증: ?qa=void11 → 조용히 시작(브금 없음) → 쥰희 첫 대사에 Lancer → 대사 순서(브리핑 그대로) → 식은땀 → 웃음 모션 ×2 → 통나무 뺏고 오른쪽으로 사라짐
//   → 경섭 "ㅅㅂ인생" → 뒤돌아 느낌표 → 카메라가 형섭·억빠맨에게 → 둘이 걸어옴 → 대화 → 경섭 합류(파티 2명, NPC 사라짐) → 오른쪽 출구 void12 → 되돌아와도 컷신 없음·NPC 없음·브금 유지(bgmFlag).
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
const st = () => page.evaluate(() => { const ent = (id) => { const e = game.entities.find((x) => x.id === id && x.def?.type !== 'follower'); return e ? { x: Math.round(e.x), y: Math.round(e.y), vis: e.visible !== false, dead: !!e.dead, facing: e.facing, emote: e.emote?.kind || null, motion: !!e.motion } : null; };
  return { map: game.mapId, running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: game.textbox.node?.text || '', p: [Math.round(game.player.x), Math.round(game.player.y)], pf: game.player.facing,
    f: game.entities.filter((e) => e.def?.type === 'follower').map((x) => ({ id: x.id, x: Math.round(x.x), y: Math.round(x.y), vis: x.visible })), party: [...game.party], flags: { ...game.flags }, bgm: game.sound.bgmName || null,
    cam: { x: Math.round(game.camera.x), y: Math.round(game.camera.y), locked: game.camera.locked, onPlayer: game.camera.target === game.player }, junhee: ent('junhee'), gyeongsub: ent('gyeongsub'), logs: ent('logs'), transitioning: game.transitioning }; });
const stand = (x, y, f) => page.evaluate(([x, y, f]) => { game.player.x = x; game.player.y = y; game.player.facing = f; game.player.trail = []; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); game.camera.snap(); }, [x, y, f]);
const drain = async (maxMs, probe) => {
  const out = []; const raw = []; const obs = []; const t0 = Date.now(); let idle = 0;
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(90); const s = await st(); if (probe) obs.push(await probe(s));
    if (!s.running) { if (++idle > 4) break; continue; } idle = 0;
    const k = (s.speaker || '') + '|' + s.text.replace(/\{[^}]*\}/g, ''); if (s.text && !raw.includes(s.text)) raw.push(s.text);
    if (s.box === 'waiting' || s.box === 'typing' || s.box === 'choice') { if (!out.includes(k)) out.push(k); await page.keyboard.press('KeyC'); }
  }
  return { lines: out, raw, obs };
};

await page.goto('http://127.0.0.1:8000/index.html?qa=void11'); await ready(); await page.waitForTimeout(120);
let s = await st(); check('qa=void11: tree map, party ppaman, NPCs + logs present, bgm silent before the scene', s.map === 'void11' && s.f.length === 1 && s.junhee && s.gyeongsub && s.logs && s.bgm === null, JSON.stringify({ map: s.map, f: s.f, bgm: s.bgm, j: !!s.junhee, g: !!s.gyeongsub, logs: !!s.logs }));
const shots = { laugh: false, sweat: false, bang: false, walk: false };
const r = await drain(90000, async (q) => {
  if (q.junhee?.motion && !shots.laugh) { shots.laugh = true; await page.screenshot({ path: `${S}/void11_01_laugh.png` }).catch(() => {}); }
  if (q.junhee?.emote === 'sweat' && !shots.sweat) { shots.sweat = true; await page.screenshot({ path: `${S}/void11_02_sweat.png` }).catch(() => {}); }
  if (q.gyeongsub?.emote === '!' && !shots.bang) { shots.bang = true; await page.screenshot({ path: `${S}/void11_03_bang.png` }).catch(() => {}); }
  if (q.text.includes('경섭이형 여기') && !shots.walk) { shots.walk = true; await page.screenshot({ path: `${S}/void11_04_meet.png` }).catch(() => {}); }
  return { bgm: q.bgm, text: q.text.slice(0, 12), jm: !!q.junhee?.motion, je: q.junhee?.emote || null, ge: q.gyeongsub?.emote || null, jdead: q.junhee ? q.junhee.dead : 'gone', jx: q.junhee?.x ?? null, logs: q.logs ? q.logs.dead : 'gone', cam: q.cam.x, p: q.p[0], gf: q.gyeongsub?.facing || null };
});
const L = r.lines;
const ORDER = ['쥰희|* 형 빨리 형 옮겨야해', '경섭|* 헉 헉 헉.. 나무 다 캤어.', '쥰희|* 아 진짜!! 빨리좀 해 느려 터졌네', '경섭|* 미안해', '쥰희|* 형이 그래서 안되는거야', '경섭|* 응', '쥰희|* 1500 뜯긴새끼 ㅋㅋ', '경섭|* 야.', '쥰희|* 어 미안 장난이였는데',
  '경섭|* 어쨋든 조금만 쉬면 안될까 형 너무 힘들다', '쥰희|* 테스트룸에 참고하면 될거임', '쥰희|* 형 이제 코앞이야 우리들의 세계 우리들의 월드', '쥰희|* 더러운 김형섭따위 없는 세상이 왔어.', '쥰희|* 나의 마이야르 슈퍼 페이스츄리 어쩌고 타코마스터 세상이 온거라고!!!!!', '경섭|* 허허', '쥰희|* 그렇기에',
  '쥰희|* 우리는 빨리 그것 을 완성시켜야해', '경섭|* 응 그럴게', '쥰희|* 으하하 으하하 내 야망은 곧 실현될거야', '쥰희|* 어서 김형섭이 오기전에 후딱 만들자고 나무줘', '경섭|* ㅅㅂ인생', '경섭|* 어 빠맨아 어 ? 너희들 여기',
  '억빠맨|* 경섭이형 여기 계셨네요 다행이네요 무사하셔서', '경섭|* 어 그래', '억빠맨|* 형 여기서 뭐하고계셨어요?', '경섭|* 응 아니 뭐 그냥 뭐 이것저것.. 그냥', '억빠맨|* 음 그렇군요 아까 다른애도 있던거같던데 누구에요?', '경섭|* 응? 글쎄 허허 있었나?', '억빠맨|* 형 일단 저희 같이 다니실까요? 여기서 얼른 나가려구요', '경섭|* 응? 어 그래야지 그래 그래야지.', '|* 뭔가 살짝 수상하지만 경섭이 동료가 되었다.'];
const idx = ORDER.map((k) => L.indexOf(k));
check('all 31 lines in briefing order', idx.every((i) => i >= 0) && idx.every((v, i) => i === 0 || v > idx[i - 1]), JSON.stringify(ORDER.filter((k, i) => idx[i] < 0)) + ' got=' + JSON.stringify(L));
check('"그것" is yellow in the raw text', r.raw.some((t) => t.includes('{c=yellow}그것{/c}')), '');
{ const o = r.obs; const firstLine = o.findIndex((x) => x.text.startsWith('* 형 빨리')), firstLancer = o.findIndex((x) => x.bgm === 'lancer');
  check('bgm: silent at start, Lancer starts with 쥰희\'s first line', o[0].bgm === null && firstLancer >= 0 && firstLine >= 0 && Math.abs(firstLancer - firstLine) <= 6, JSON.stringify({ firstLine, firstLancer, bgms: [...new Set(o.map((x) => x.bgm))] }));
  const sweatI = o.findIndex((x) => x.je === 'sweat'), laughI = o.findIndex((x) => x.jm), bangI = o.findIndex((x) => x.ge === '!');
  const lineI = (t) => o.findIndex((x) => x.text.startsWith(t));
  check('sweat emote right after "야." and before "어 미안"', sweatI >= 0 && sweatI >= lineI('* 야.') && sweatI <= lineI('* 어 미안') + 1, JSON.stringify({ sweatI, ya: lineI('* 야.'), mian: lineI('* 어 미안') }));
  check('laugh motion (junhee-laugh sheet) played before "테스트룸에" and again before "으하하"', laughI >= 0 && laughI < lineI('* 테스트룸에') && o.slice(lineI('* 응 그럴게')).some((x) => x.jm), JSON.stringify({ laughI, test: lineI('* 테스트룸에') }));
  check('junhee grabbed the logs (logs removed) and ran off right (removed)', o.some((x) => x.logs === true || x.logs === 'gone') && o.some((x) => x.jx !== null && x.jx > 1000) && (await st()).junhee?.dead !== false, JSON.stringify({ maxJx: Math.max(...o.map((x) => x.jx ?? -1)), logsEnd: o[o.length - 1].logs }));
  check('gyeongsub turned around (left) then "!" emote before "어 빠맨아"', bangI >= 0 && bangI < lineI('* 어 빠맨아') && o[bangI].gf === 'left', JSON.stringify({ bangI, ppaman: lineI('* 어 빠맨아'), gf: o[bangI]?.gf }));
  const meetI = lineI('* 경섭이형');
  check('camera moved to the player before they walked up (cam.x dropped below 500 after the "!")', o.slice(bangI, meetI).some((x) => x.cam < 500), JSON.stringify({ camMin: Math.min(...o.slice(Math.max(0, bangI), Math.max(bangI + 1, meetI)).map((x) => x.cam)) }));
  check('player walked to gyeongsub (x > 600) by the meeting line', meetI >= 0 && o[meetI].p > 600, JSON.stringify({ p: o[meetI]?.p })); }
s = await st();
check('경섭 joined: party [ppaman, gyeongsub], two followers visible, NPC gone, flag void11_done', JSON.stringify(s.party) === '["ppaman","gyeongsub"]' && s.f.length === 2 && s.f.every((x) => x.vis) && (!s.gyeongsub || s.gyeongsub.dead) && s.flags.void11_done === true, JSON.stringify({ party: s.party, f: s.f, g: s.gyeongsub }));
check('after the scene: camera follows the player, Lancer keeps playing', s.cam.onPlayer && !s.cam.locked && s.bgm === 'lancer', JSON.stringify({ cam: s.cam, bgm: s.bgm }));
await page.screenshot({ path: `${S}/void11_05_party.png` });
// 오른쪽 출구 → void12 (동료 둘 다 보임)
await stand(1330, 336, 'right'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(900); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(900);
s = await st(); check('right edge → void12 placeholder with both followers, bgm lancer', s.map === 'void12' && s.f.length === 2 && s.f.every((x) => x.vis) && s.bgm === 'lancer', JSON.stringify({ map: s.map, f: s.f, bgm: s.bgm }));
// 되돌아오기: 컷신 없음, NPC·통나무 없음, 브금 유지 (bgmFlag), 나무 밑동은 막힘
await stand(60, 184, 'left'); await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(800); await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(900);
s = await st(); check('back to void11: no cutscene, no NPCs/logs, Lancer continues', s.map === 'void11' && !s.running && !s.junhee && !s.gyeongsub && !s.logs && s.bgm === 'lancer' && s.f.length === 2, JSON.stringify({ map: s.map, running: s.running, j: s.junhee, g: s.gyeongsub, logs: s.logs, bgm: s.bgm }));
{ const t = await page.evaluate(() => { const tr = game.entities.find((e) => e.id === 'tree'); return { solid: tr.solid, w: tr.w, h: tr.h, iw: tr.iw, ih: tr.ih }; }); check('tree prop: trunk hitbox solid, big image', t.solid && t.w === 64 && t.iw === 240 && t.ih === 264, JSON.stringify(t)); }
await stand(560, 336, 'right'); await page.waitForTimeout(200); await page.screenshot({ path: `${S}/void11_06_tree.png` });
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
