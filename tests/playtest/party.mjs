// 억빠맨 대화 + 파티 시스템 검증: ?qa=ppaman → 인사 → 1(여긴 어디: 의성어 20개 빠른 연출 → ㅂㅅ새끼같다 → 어쨋든) → "더 물어보실거" 루프 → 2(왜 여기) → 루프 → 3(동행)
//   → [억빠맨이 동료가 되었다] → NPC 사라지고 Follower 가 뒤에서 따라 걸음(발자국 추적, 거리 유지, 겹치지 않음) → 메뉴 파티창 → 자동저장/이어하기 복원 → 맵 전환 후 재정렬 → 뗏목 동승 → 다시 말 걸면 짧은 한마디.
// 실행: CHROME_EXE=... node tests/playtest/party.mjs   (서버 8000)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0;
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const st = () => page.evaluate(() => { const f = game.entities.find((e) => e.def?.type === 'follower'); const n = game.entities.find((e) => e.def?.type === 'npc' && e.id === 'ppaman' && !e.dead); return { map: game.mapId, running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: game.textbox.node?.text || '', auto: game.textbox.node?.auto ?? null, party: [...game.party], flags: { ...game.flags }, p: [Math.round(game.player.x), Math.round(game.player.y)], pf: game.player.facing, f: f ? [Math.round(f.x), Math.round(f.y), f.facing, f.moving] : null, npc: !!n, state: game.state, ride: !!game.ride }; });
const stand = (x, y, f) => page.evaluate(([x, y, f]) => { game.player.x = x; game.player.y = y; game.player.facing = f; game.camera.snap(); }, [x, y, f]);
const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };
// 선택지가 뜰 때까지 대사를 넘기며 본문을 모은다
const untilChoice = async (max = 60) => {
  const texts = [];
  for (let i = 0; i < max; i++) {
    await page.waitForTimeout(120); const s = await st();
    if (!s.running) return { texts, choice: false };
    if (s.box === 'choice') return { texts, choice: true, prompt: s.text };
    if (s.box === 'waiting') { texts.push((s.speaker || '') + '|' + s.text); await page.keyboard.press('KeyC'); }
    else if (s.box === 'typing' && s.auto === null) await page.keyboard.press('KeyC');
    else if (s.box === 'typing' && s.auto !== null) { if (!texts.includes((s.speaker || '') + '|' + s.text)) texts.push((s.speaker || '') + '|' + s.text); }
  }
  return { texts, choice: false };
};
const pick = async (idx) => { for (let k = 0; k < idx; k++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(70); } await page.keyboard.press('KeyC'); await page.waitForTimeout(250); };

await page.goto('http://127.0.0.1:8000/index.html?qa=ppaman'); await page.waitForTimeout(1000);
let s = await st(); check('qa=ppaman: next to pillar, bridge down, npc present', s.map === 'void4' && s.flags.bridge_down && s.npc && s.party.length === 0, JSON.stringify({ p: s.p, npc: s.npc }));
await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
let r = await untilChoice();
check('greeting then choice', r.choice && r.texts.some((t) => t.includes('구해주셔서 감사해요')), JSON.stringify(r.texts));
await page.screenshot({ path: `${S}/party_01_choice.png` });
// 1. 여긴 어디
await page.evaluate(() => { window.__shown = []; const o = game.textbox.show.bind(game.textbox); game.textbox.show = (node, ctx, cb) => { window.__shown.push((node.auto !== undefined ? 'A' : '') + (node.speaker || '') + '|' + (node.text || '')); return o(node, ctx, cb); }; });   // 'A' = auto(개그 상자)   // 0.16s 개그 상자는 폴링으로 못 세니 show() 호출을 기록
const t1 = Date.now(); await pick(0);
// 개그 뒤 말풍선: 대화창이 닫힌 채 형섭 머리 위 점이 하나씩 (bubble.shown 1→3)
let bubbleSeen = 0, bubbleBoxClosed = false;
{ const tb = Date.now(); while (Date.now() - tb < 12000) { const b = await page.evaluate(() => ({ done: game.bubble.done, shown: game.bubble.shown, box: game.textbox.state, auto: game.textbox.node?.auto ?? null })); if (!b.done) { bubbleSeen = Math.max(bubbleSeen, b.shown); if (b.box === 'closed') bubbleBoxClosed = true; if (b.shown === 2 && !fs.existsSync(`${S}/party_02b_bubble.png`)) await page.screenshot({ path: `${S}/party_02b_bubble.png` }); if (b.shown >= 3) break; } else if (b.box === 'typing' && b.auto === null) await page.keyboard.press('KeyC'); else if (b.box === 'waiting') await page.keyboard.press('KeyC'); await page.waitForTimeout(60); } }
check('bubble: dots appear one by one with textbox closed', bubbleSeen >= 3 && bubbleBoxClosed, JSON.stringify({ shown: bubbleSeen, closed: bubbleBoxClosed }));
r = await untilChoice(120); const gagSec = (Date.now() - t1) / 1000;
const shown = await page.evaluate(() => window.__shown);
const boom = shown.filter((t) => t.startsWith('A억빠맨|'));   // auto 0.16s 개그 상자만
check('where: story lines', shown.some((t) => t.includes('저도 잘 모르겠어요')) && shown.some((t) => t.includes('꺄아아아아아악')), JSON.stringify(shown.slice(0, 5)));
check('where: rapid gag 20 boxes', boom.length === 20, `${boom.length} in ${gagSec.toFixed(1)}s`);
check('where: gag fast (<12s total incl. lines+bubble)', gagSec < 14, gagSec.toFixed(1) + 's');
check('where: 했어요 → narrator ㅂㅅ새끼같다 → 어쨋든', shown.some((t) => t.endsWith('|* 했어요.')) && shown.some((t) => t.startsWith('|') && t.includes('ㅂㅅ새끼')) && shown.some((t) => t.includes('어쨋든 그래요')), '');
check('loop prompt: 더 물어보실거 있으세요?', r.choice && r.prompt.includes('더 물어보실거'), r.prompt);
await page.screenshot({ path: `${S}/party_02_loop.png` });
// 2. 왜 여기
await pick(1); r = await untilChoice();
check('why: 3 lines', r.texts.some((t) => t.includes('보라색 땅이였고')) && r.texts.some((t) => t.includes('다른 사람들도')) && r.texts.some((t) => t.includes('빨리 저도 나가고싶어요')), JSON.stringify(r.texts));
check('loop again', r.choice && r.prompt.includes('더 물어보실거'));
// 1 again (loop works for repeats)
await pick(0); r = await untilChoice(120); check('where again loops back', r.choice && r.prompt.includes('더 물어보실거'));
// 3. 물어볼건 없다 → 동행
await pick(2); r = await untilChoice();
s = await st();
check('join lines + 동료가 되었다', r.texts.some((t) => t.includes('동행해도 괜찮을까요')) && r.texts.some((t) => t.includes('빨리 나가는걸 목표로')) && r.texts.some((t) => t.includes('동료가 되었다')), JSON.stringify(r.texts.slice(-3)));
check('party has ppaman, npc gone, follower spawned', s.party.includes('ppaman') && !s.npc && !!s.f && s.flags.ppaman_joined, JSON.stringify({ party: s.party, npc: s.npc, f: s.f }));
await page.screenshot({ path: `${S}/party_03_joined.png` });
// 따라 걷기: 오른쪽으로 걷다가 멈춤 → 뒤에서 따라오고, 겹치지 않고, 거리 유지
await hold('ArrowRight', 1200); await page.waitForTimeout(700);
s = await st();
const gap = s.f ? Math.hypot(s.p[0] - s.f[0], s.p[1] - s.f[1]) : 0;
check('follower trails behind (left of player), reasonable gap', s.f && s.f[0] < s.p[0] && gap > 16 && gap < 60, JSON.stringify({ p: s.p, f: s.f, gap: Math.round(gap) }));
check('follower faces walking direction and stops', s.f && s.f[2] === 'right' && s.f[3] === false, JSON.stringify(s.f));
await page.screenshot({ path: `${S}/party_04_follow.png` });
await hold('ArrowLeft', 900); await page.waitForTimeout(400); s = await st();
check('turn around: follower now on the right', s.f && s.f[0] > s.p[0], JSON.stringify({ p: s.p, f: s.f }));
// 메뉴 파티창
await page.keyboard.press('KeyV'); await page.waitForTimeout(200); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(120); await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
check('menu party panel open', await page.evaluate(() => game.state === 'menu' && game.menu.sub === 1));
await page.screenshot({ path: `${S}/party_05_menu.png` });
await page.keyboard.press('KeyX'); await page.waitForTimeout(150); await page.keyboard.press('KeyX'); await page.waitForTimeout(200);
// 다시 말 걸기: follower 는 대상이 아님 → 아무 대사 없음 (뒤로 돌아서 C)
await page.keyboard.press('KeyC'); await page.waitForTimeout(300); s = await st();
check('follower is not interactable', !s.running || !s.text.includes('빨리 나가요'), JSON.stringify({ running: s.running, text: s.text }));
// 저장/이어하기
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('subtarune.save.v1') || 'null'));
check('autosave has party', Array.isArray(saved?.party) && saved.party.includes('ppaman'), JSON.stringify(saved?.party));
await page.goto('http://127.0.0.1:8000/index.html'); await page.waitForTimeout(1200);
await page.keyboard.press('KeyX'); await page.waitForTimeout(3600);
for (let j = 0; j < 12; j++) { await page.keyboard.press('KeyC'); await page.waitForTimeout(500); if ((await page.evaluate(() => game.state)) !== 'title') break; }
await page.waitForTimeout(900); s = await st();
check('continue restores party + follower', s.state === 'field' && s.party.includes('ppaman') && !!s.f && !s.npc, JSON.stringify({ party: s.party, f: s.f, npc: s.npc }));
// 맵 전환 후 재정렬 + 뗏목 동승
await page.evaluate(() => game.changeMap('void4', 'from_void3', true)); await page.waitForTimeout(300); s = await st();
check('after map change follower regroups behind', s.f && Math.hypot(s.p[0] - s.f[0], s.p[1] - s.f[1]) < 40, JSON.stringify({ p: s.p, f: s.f }));
await stand(132, 274, 'right'); await page.waitForTimeout(100); await page.keyboard.press('KeyC'); await page.waitForTimeout(1500); s = await st();
check('follower rides along on the raft', s.ride && s.f && Math.abs(s.f[0] - s.p[0]) < 12 && Math.abs(s.f[1] - s.p[1]) < 8, JSON.stringify({ p: s.p, f: s.f }));
await page.screenshot({ path: `${S}/party_06_raft.png` });
// QA party 지점
await page.goto('http://127.0.0.1:8000/index.html?qa=party'); await page.waitForTimeout(900); s = await st();
check('qa=party starts with follower and no npc', s.party.includes('ppaman') && !!s.f && !s.npc && s.flags.ppaman_joined, JSON.stringify({ party: s.party, npc: s.npc }));
await browser.close();
logs.push(`fails=${fails}`);
console.log(logs.join('\n'));
process.exit(fails ? 1 : 0);
