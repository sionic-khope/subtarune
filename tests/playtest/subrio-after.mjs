// 섭리오 보스 격파 뒤 귀환 연출(BUILD172): QA `subrio_after`(비데 방, subrio_cleared 만 선 상태) → 토관에서 셋이 커지며 나옴(무음) → 비데가 왼쪽 아래에서 걸어옴 →
// 도트마리오가 비데 머리 위로 떨어짐 → 비데를 들고 왼쪽 문으로 질주 → 연결로(youngcle8) 가로지름 → 무대(youngcle7) 위 통로 철창을 넘어 철문 폭파 → 비데 방 복귀·조작.
// 실행: tests/playtest/run.sh subrio-after
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'subrio_after_' + n + '.png') }); };
const info = () => page.evaluate(() => {
  const ent = id => { const e = game.entities.find(x => x.id === id && !x.dead); return e ? [Math.round(e.x), Math.round(e.y), e.visible] : null; };
  const scale = e => Math.round((e.def.visualScale ?? 1) * 100) / 100;
  const party = ['gyeongsub', 'ppaman'].map(id => game.entities.find(x => x.id === id && !x.dead)).filter(Boolean);
  return { map: game.mapId, running: game.dialogue.running, tb: game.textbox.state, bgm: game.sound.bgmName ?? null, zoom: Math.round(game.zoom.s * 100) / 100,
    player: [Math.round(game.player.x), Math.round(game.player.y), game.player.visible, scale(game.player)], followersVisible: party.every(e => e.visible) && party.length === 2,
    bidet: ent('warm_bidet'), mario: ent('mini_mario'), door: ent('youngcle7_upper_door'), booms: (game.booms || []).length,
    after: game.flags.subrio_after_done === true, blown: game.flags.youngcle7_upper_door_blown === true, fade: Math.round(game.fade.alpha * 100) / 100 };
});
// 대사가 waiting 일 때만 C 로 넘기며 조건이 맞는 순간 스크린샷
const runUntil = async (cond, label, maxMs = 40000, extra = 0) => {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const s = await info();
    if (cond(s)) { if (extra) await page.waitForTimeout(extra); await cap(label); return s; }
    if (s.tb === 'waiting' || s.tb === 'choice') { await page.waitForTimeout(120); await page.keyboard.press('KeyC'); }
    await page.waitForTimeout(80);
  }
  return null;
};
try {
  await page.goto('http://localhost:8000/?qa=subrio_after');
  await page.waitForFunction(() => window.game?.player && game.mapId === 'youngcle9' && !game.transitioning, null, { timeout: 20000 });
  await page.waitForTimeout(300);
  const start = await info(); check(start.running && start.bgm === null, '귀환 연출 시작·무음 ' + JSON.stringify([start.running, start.bgm]));
  const emerge = await runUntil(s => s.player[2] && s.player[3] < 0.7, 'emerge', 8000, 0); check(!!emerge && emerge.bgm === null, '주인공이 토관에서 작은 몸으로 나온다 ' + JSON.stringify(emerge?.player));
  const out = await runUntil(s => s.player[2] && s.player[3] === 1 && s.followersVisible, 'party_out', 10000, 200); check(!!out && out.player[0] < 340, '셋 다 토관 입구 앞에 나와 섰다 ' + JSON.stringify(out?.player));
  const walkIn = await runUntil(s => !!s.bidet && s.bidet[2] && s.bidet[0] > 150, 'bidet_walk', 30000, 0); check(!!walkIn && walkIn.bidet[0] < walkIn.player[0], '비데가 왼쪽 아래에서 일행 왼쪽까지 걸어온다 ' + JSON.stringify(walkIn?.bidet));
  const drop = await runUntil(s => !!s.mario && s.mario[2] && !!s.bidet && s.mario[1] <= s.bidet[1] - 60, 'mario_drop', 40000, 150); check(!!drop, '도트마리오가 비데 머리 위로 떨어진다 ' + JSON.stringify(drop && [drop.mario, drop.bidet]));
  const carry = await runUntil(s => !!s.mario && !!s.bidet && s.bidet[1] <= s.mario[1] - 20 && s.mario[0] < s.player[0] - 40, 'carry_run', 20000, 0); check(!!carry && Math.abs(carry.bidet[0] - carry.mario[0]) <= 8, '비데를 머리 위에 들고 왼쪽 문으로 달린다 ' + JSON.stringify(carry && [carry.mario, carry.bidet]));
  const corridor = await runUntil(s => s.map === 'youngcle8' && !!s.mario && s.mario[2] && s.fade < 0.2 && s.mario[0] < 700, 'corridor', 15000, 0); check(!!corridor && !corridor.player[2] && corridor.zoom === 1, '연결로를 마리오가 가로지른다(일행은 안 보임) ' + JSON.stringify(corridor && [corridor.mario, corridor.player[2], corridor.zoom]));
  const passage = await runUntil(s => s.map === 'youngcle7' && !!s.mario && s.mario[1] < 200, 'passage', 20000, 450); check(!!passage && !!passage.door, '무대 위 통로를 올라간다(철문은 아직 있음) ' + JSON.stringify(passage && [passage.mario, passage.door]));
  const blast = await runUntil(s => s.map === 'youngcle7' && s.booms > 0, 'blast', 12000, 250); check(!!blast, '철문 폭파(폭발 이펙트) ' + JSON.stringify(blast && [blast.booms, blast.door]));
  const blown = await runUntil(s => s.blown && !s.door, 'blown', 8000, 0); check(!!blown, '문이 날아가고 youngcle7_upper_door_blown ' + JSON.stringify(blown && [blown.blown, blown.door]));
  const back = await runUntil(s => s.map === 'youngcle9' && !s.running, 'back', 30000, 300);
  check(!!back && back.after && back.bgm === null && back.player[2] && back.player[0] < 340 && back.zoom === 1 && back.followersVisible, '비데 방 복귀·subrio_after_done·무음·조작 ' + JSON.stringify(back && [back.after, back.bgm, back.player, back.zoom]));
  check(!!back && !back.bidet && !back.mario, '비데·마리오는 방에 없다');
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
