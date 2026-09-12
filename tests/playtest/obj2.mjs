// 옵젝영역2 검증: ?qa=obj2 → 오른쪽으로 긴 얕은 물 길 + 가운데 광장(마나샘·귀환 발판·오브젝트 알·바나나) →
//   오른쪽길은 쥰희 나무 동상 3개로 막혀 있고(지나갈 수 없다) 조사하면 브리핑 대사 9줄 → 윗길 표지판(바론 둥지 경고) 6줄 → 윗길로 나가면 obj3.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
process.on('uncaughtException', (e) => { try { console.log(logs.join('\n')); } catch {} console.log('CRASH', e.stack || e.message); process.exit(2); });
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
for (const f of fs.readdirSync(S)) if (f.startsWith('obj2_')) fs.unlinkSync(`${S}/${f}`);
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0; const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) errs.push(`[${m.type()}] ${m.text().slice(0, 160)}`); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await page.evaluate(fn); if (v) return v; await page.waitForTimeout(60); } return null; };
const st = () => page.evaluate(() => ({ map: game.mapId, running: game.dialogue.running, p: [Math.round(game.player.x), Math.round(game.player.y)], hp: [game.hpOf('hyungsub'), game.hpOf('gyeongsub'), game.hpOf('ppaman')], max: [game.maxHpOf('hyungsub'), game.maxHpOf('gyeongsub'), game.maxHpOf('ppaman')],
  inv: [...game.inventory], ppaman: (() => { const e = game.entities.find((x) => x.id === 'ppaman'); return e ? { visible: e.visible !== false, x: Math.round(e.x) } : null; })(),
  ents: game.entities.filter((e) => ['blue', 'recall', 'egg', 'egg_run', 'banana', 'sign', 'statue1', 'statue2', 'statue3'].includes(e.id) && !e.dead).map((e) => e.id), flags: Object.keys(game.flags).filter((k) => k.startsWith('obj2_')) }));
const stand = async (x, y, f) => { await page.evaluate(({ x, y, f }) => { game.player.x = x; game.player.y = y; game.player.facing = f; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); game.camera.snap(); }, { x, y, f }); await page.waitForTimeout(150); };
const key = (q) => (q.speaker || '') + '|' + (q.text || '').replace(/\{[^}]*\}/g, '');
const talk = async (id, ms = 40000) => { const pos = await page.evaluate((id) => { const e = game.entities.find((x) => x.id === id); return e ? { x: e.x, y: e.y, w: e.w, h: e.h } : null; }, id);
  if (!pos) return null;
  await stand(pos.x + pos.w / 2 - 12, pos.y + pos.h + 8, 'up'); await page.waitForTimeout(200); await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
  const lines = []; let last = null; const t0 = Date.now();
  while (Date.now() - t0 < ms) { const q = await page.evaluate(() => ({ running: game.dialogue.running, box: game.textbox.state, speaker: game.textbox.speaker, text: game.textbox.node?.text || '', auto: game.textbox.auto })); if (!q.running) break;
    if (q.box === 'waiting' || q.box === 'typing') { const k = key(q); if (k !== last) { last = k; lines.push(k); } if (q.box === 'waiting' && q.auto === null) await page.keyboard.press('KeyC'); }
    await page.waitForTimeout(60); }
  return lines; };

await page.goto('http://localhost:8000/index.html?qa=obj2'); await until(() => !!(window.game && game.entities && game.player), 15000); await page.keyboard.press('KeyX'); await page.waitForTimeout(500);
const meta = await page.evaluate(async () => (await import('/src/data/maps.js')).MAPS.obj2.meta);
let s = await st();
check('qa=obj2: 오른쪽으로 긴 맵(76×22) with a plaza in the middle; 마나샘·귀환 발판·알·바나나·표지판·동상 3 all present', s.map === 'obj2' && meta.plaza.join() === '26,44,6,17' && ['blue', 'recall', 'egg', 'banana', 'sign', 'statue1', 'statue2', 'statue3'].every((id) => s.ents.includes(id)), JSON.stringify({ ents: s.ents, plaza: meta.plaza }));
await stand(34 * 32, 12 * 32, 'down'); await page.waitForTimeout(300); await page.screenshot({ path: `${S}/obj2_01_plaza.png` });
// 오른쪽길은 동상으로 막혀 있다 — 광장에서 오른쪽으로 계속 걸어도 동상 열을 못 지나간다
await stand(46 * 32, 14 * 32 + 8, 'right'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(2500); await page.keyboard.up('ArrowRight');
s = await st();
check('right path is blocked by the 쥰희 statues (cannot walk past them)', s.p[0] < meta.statue_c * 32, JSON.stringify({ x: s.p[0], statueX: meta.statue_c * 32 }));
await page.screenshot({ path: `${S}/obj2_02_statue.png` });
const wantStatue = ['억빠맨|* 아 씨발 또 이 좆같은걸로 막혀있네요', '경섭|* 허허..', '억빠맨|* 여기 뭐가 적혀있네 그것을 만드는 장소?', '경섭|* 뭐 뭐라고????', '억빠맨|* 뻥인데요', '경섭|* ...', '억빠맨|* 뭔가 많이 당황하시네요', '경섭|* 허허 그런가', '|* 분열이 일어나면 안될텐데'];
const gotStatue = await talk('statue2');
check('statue: 9 lines verbatim in order', JSON.stringify(gotStatue) === JSON.stringify(wantStatue), JSON.stringify(gotStatue));
// 표지판(바론 둥지 경고)
const wantSign = ['|* 주의 주의 오브젝트 서식지 아주 아주 위험하다', '억빠맨|* ... 형 저 무서워요', '경섭|* 아까 그 대포가 있으니까 문제없지않을까?', '억빠맨|* 형들은 걔네를 믿으세요? 전 아직도 이상해요 그 저능한 용준이가 어떻게 그렇게 똑똑해진거지?', '경섭|* 음..', '|* 게임적 연출로 똑똑해진건 아닌듯하다.'];
const gotSign = await talk('sign');
check('signpost: 6 lines verbatim in order', JSON.stringify(gotSign) === JSON.stringify(wantSign), JSON.stringify(gotSign));
await page.screenshot({ path: `${S}/obj2_03_sign.png` });
// 마나샘: 이번엔 억빠맨이 양보 → 전원 회복
await page.evaluate(() => { game.partyHp.hyungsub = 30; game.partyHp.gyeongsub = 40; game.partyHp.ppaman = 20; });
const gotBlue = await talk('blue'); s = await st();
check('mana spring (new lines: 억빠맨 gives way because of the dirt taste) → party healed to max', ['또 마나샘이네', '이번엔 형이 드세요', '웬일로 양보를', '흙맛이 아직', '경섭이 마나샘 물을', '셋 다 마셨다', '회복되었다', '흙맛 빠졌다'].every((k) => gotBlue.some((l) => l.includes(k))) && s.hp.join() === s.max.join(), JSON.stringify({ gotBlue, hp: s.hp, max: s.max }));
// 귀환 발판: 억빠맨이 사라졌다가 돌아온다
let vanished = false;
const recallP = page.evaluate(async () => { const t0 = Date.now(); let gone = false; while (Date.now() - t0 < 40000) { const e = game.entities.find((x) => x.id === 'ppaman'); if (e && e.visible === false) gone = true; await new Promise((r) => setTimeout(r, 60)); } return gone; });
const gotRecall = await talk('recall');
vanished = await recallP; s = await st();
check('recall pad: 억빠맨 channels (aura) → vanishes → silence → comes back ("집이 없었어요"), and is visible again', ['귀환진 아니에요', '집 좀 갔다 올게요', '귀환을 시작했다', '진짜 갔네', '집이 없었어요'].every((k) => gotRecall.some((l) => l.includes(k))) && vanished && s.ppaman?.visible === true && s.flags.includes('obj2_recall_done'), JSON.stringify({ gotRecall, vanished, ppaman: s.ppaman }));
await page.screenshot({ path: `${S}/obj2_04_recall.png` });
// 오브젝트 알: 톡톡 → 쩍 → 다리 달고 도망(자리 빔)
const gotEgg = await talk('egg'); s = await st();
check('object egg: knock twice → cracks → runs away on legs, leaving the spot empty', ['커다란 알이다', '오브젝트 알인가요', '톡', '쩍', '도망갔어요', '다리가 있었네'].every((k) => gotEgg.some((l) => l.includes(k))) && !s.ents.includes('egg') && !s.ents.includes('egg_run') && s.flags.includes('obj2_egg_hatched'), JSON.stringify({ gotEgg, ents: s.ents }));
// 바나나 1개
const invBefore = (await st()).inv.filter((n) => n === '바나나').length;
const gotBanana = await talk('banana'); s = await st();
check('banana: picked up (+1 바나나, prop gone)', s.inv.filter((n) => n === '바나나').length === invBefore + 1 && !s.ents.includes('banana') && gotBanana.some((l) => l.includes('바나나')), JSON.stringify({ before: invBefore, inv: s.inv, gotBanana }));
// 윗길로 나가면 obj3
await stand(34 * 32 + 40, 5 * 32, 'up'); await page.keyboard.down('ArrowUp');
const up = await until(() => game.mapId === 'obj3' ? true : null, 8000); await page.keyboard.up('ArrowUp');
check('the up path (바론 둥지 쪽) leads to obj3', !!up, (await st()).map);
check('no page/console errors', errs.length === 0, JSON.stringify(errs.slice(0, 4)));
console.log(logs.join('\n')); console.log(`fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
