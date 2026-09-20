// 드럼통의 악마 승리 뒤 연출(BUILD254): 실제 경로 — 전투 직행 QA(jjajang_nest_battle)에서 전투를 승리로 끝내면(battle.finish(true)) 둥지 스크립트가 그대로 이어진다.
//   둥지(청소부 영웅·대사·승천) → 동상 앞(낙하·대사·휘이잉) → 전함 콰앙(동상 파괴) → 섬 전경 그림(영클·다리·점) → 억빠맨·경섭 낙하 → 영클 TV → 재합류 → 잔해 길 맵 → 통로 위 문 → 깊은숲 입구 → 마법의샘.
//   2026-09-18 회고(QA 지점 통과 ≠ 실제 진행 통과): 전투가 남기는 상태(카메라 잠금·검은 화면·battleFlag)를 지나 연출이 도는지 이 경로로 본다. 실행: tests/playtest/run.sh jjajang-nest-after
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'warning' && /cutscene|엔티티 없음|동작 없음/.test(m.text())) errors.push('warn: ' + m.text()); });
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'after_' + n + '.png') }); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
const ev = fn => page.evaluate(fn);
const st = () => ev(() => { const g = window.game; return { map: g.mapId, px: Math.round(g.player.x), py: Math.round(g.player.y), hop: g.player.hopY || 0, bgm: g.sound?.bgmName ?? null, text: g.textbox.node?.text || null, speaker: g.textbox.node?.speaker || null, party: [...g.party], picture: !!g.picture, flags: { won: !!g.flags.drum_devil_won, destroyed: !!g.flags.statue_destroyed, regrouped: !!g.flags.party_regrouped } }; });
const ent = id => page.evaluate(i => { const e = window.game.entities.find(x => x.id === i); return e ? { x: Math.round(e.x), y: Math.round(e.y), visible: e.visible !== false, dead: !!e.dead, hop: e.hopY || 0, fold: e.def?.foldX ?? 1 } : null; }, id);
// 대사 상자에 특정 문구가 뜰 때까지 C 로 넘긴다(각 줄은 다 찍힌 뒤(textbox.state 'waiting') 넘어간다). 찾은 줄은 아직 열려 있다 — 다음으로 가려면 next()
const next = async () => { await until(() => window.game.textbox.state === 'waiting', 6000); await press('KeyC'); };
const advanceTo = async (needle, ms = 60000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const s = await st();
    if (s.text && s.text.includes(needle)) return s;
    if (s.text) await next();
    await page.waitForTimeout(120);
  }
  return null;
};
const go = async (key, cond, ms, run = false) => { await page.evaluate(c => { window.__cond = c; }, cond); if (run) await page.keyboard.down('KeyX'); await page.keyboard.down(key); const ok = await page.waitForFunction(() => new Function('g', 'return ' + window.__cond)(window.game), null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false); await page.keyboard.up(key); if (run) await page.keyboard.up('KeyX'); return ok; };
try {
  // ── 전투 직행 → 승리 ──
  await page.goto('http://localhost:8000/?qa=jjajang_nest_battle');
  check(await until(() => window.game?.battle?.state === 'intro' && window.game.battle.typed, 40000), '드럼통의 악마 전투 시작');
  await ev(() => window.game.battle.finish(true));
  check(await until(() => !window.game.battle && window.game.flags.drum_devil_won, 15000), '승리 → drum_devil_won');
  // ── 둥지: 악마가 사라지고 청소부 영웅이 뒤(왼쪽)에, 요플래가 뒤를 본다 ──
  check(await until(() => { const g = window.game; const h = g.entities.find(e => e.id === 'janitor_hero'); return h && h.visible && !g.entities.find(e => e.id === 'drum_devil' && !e.dead); }, 8000), '악마 없음 · 청소부 영웅 보임');
  let s = await st(); const hero = await ent('janitor_hero');
  check(hero && hero.x < s.px && Math.abs(hero.y - s.py) <= 4, `청소부가 요플래 왼쪽 뒤에 (${hero?.x},${hero?.y}) vs (${s.px},${s.py})`);
  check(await until(() => window.game.player.facing === 'left', 4000), '요플래가 뒤(왼쪽)를 본다');
  await page.waitForTimeout(900); await cap('01_nest_hero');
  s = await advanceTo('껄껄'); check(!!s && s.speaker === '청소부', '청소부: 껄껄');
  s = await advanceTo('고맙네 자네가 아니였으면'); check(!!s, '고맙네 …');
  s = await advanceTo('멸공의 깃발'); check(!!s, '멸공의 깃발'); await cap('02_nest_talk');
  s = await advanceTo('좋은일은 연속으로'); check(!!s, '좋은일은 연속으로 …');
  await next();
  check(await until(() => window.game.player.emote?.kind === '!', 5000), '요플래 느낌표');
  // 승천: 둘이 떠오르고 흰 화면
  check(await until(() => (window.game.player.hopY || 0) > 60, 12000), '함께 떠오른다');
  await page.waitForTimeout(700); await cap('03_rise');
  check(await until(() => window.game.mapId === 'jjajang_statue' && !window.game.transitioning, 20000), '동상 앞 숲으로');
  // ── 동상 앞: 위에서 떨어짐 ──
  check(await until(() => window.game.fade.alpha < 0.5 && (window.game.player.hopY || 0) > 100, 8000), '떨어지는 중(위에 떠 있음)');
  await cap('04_falling');
  check(await until(() => (window.game.player.hopY || 0) === 0, 6000), '착지');
  const heroS = await ent('janitor_hero'); s = await st();
  check(heroS && heroS.visible && heroS.hop === 0 && heroS.x > s.px, '청소부도 옆(오른쪽)에 착지');
  s = await advanceTo('동상쪽으로 온것같다'); check(!!s, '나레이션: 동상쪽으로 온것같다 뭐지'); await cap('05_statue_landed');
  s = await advanceTo('꼭 너 혼자만의'); check(!!s, '혼자만의 힘 …');
  s = await advanceTo('사실 난'); check(!!s && s.text.includes('{w='), '사실 난 (딜레이) …');
  await next();
  check(await until(() => window.game.player.emote?.kind === '!', 6000), '요플래 느낌표(청소부 쪽)');
  check(await until(() => window.game.player.facing === 'right', 3000), '요플래가 청소부 쪽(오른쪽)을 본다');
  s = await advanceTo('꼭 좀 구해줬으면'); check(!!s, '꼭 좀 구해줬으면 좋겠네 우리아들을, 젊은이.'); await cap('06_last_words');
  await next();
  check(await until(() => { const h = window.game.entities.find(e => e.id === 'janitor_hero'); return !h || h.dead; }, 6000), '청소부 휘이잉 사라짐');
  // 진동 → 전함 → 동상 파괴
  check(await until(() => { const sh = window.game.entities.find(e => e.id === 'youngcle_warship'); return sh && sh.visible && sh.x < 1900; }, 15000), '엄청대박인배가 오른쪽에서 들어온다');
  await page.waitForTimeout(500); await cap('07_ship_incoming');
  check(await until(() => { const st = window.game.entities.find(e => e.id === 'jjajang_statue'); return !st || st.dead; }, 8000), '동상 파괴');
  await page.waitForTimeout(250); await cap('08_statue_boom');
  check(await until(() => window.game.entities.find(e => e.id === 'youngcle_warship').x <= 820, 8000), '전함이 동상 자리를 뚫고 들어온다');
  await cap('09_ship_through');
  // 섬 전경 그림
  check(await until(() => !!window.game.picture && window.game.fade.alpha < 0.3, 8000), '바다에서 본 섬 전경');
  await page.waitForTimeout(1500); await cap('10_island');
  s = await advanceTo('ㅋㅋ'); check(!!s && s.speaker === '영클', '영클: ㅋㅋ');
  s = await st(); check(s.bgm === 'storage_show', `영클 브금 (${s.bgm})`); await cap('11_island_youngcle');
  s = await advanceTo('존나달려왔음'); check(!!s, '바로 여기로 좌표찍고 존나달려왔음 ㅇㅇ');
  await next();
  check(await until(() => !!window.game.picture?.extra, 5000), '다리 내림·점 하강 덧그림');
  await page.waitForTimeout(1900); await cap('12_ramp_dots');
  // 억빠맨·경섭 낙하
  check(await until(() => !window.game.picture && window.game.entities.some(e => e.id === 'ppaman' && e.visible), 12000), '전경 끝 → 억빠맨·경섭이 떨어진다');
  check(await until(() => { const g = window.game; const p = g.entities.find(e => e.id === 'ppaman'), q = g.entities.find(e => e.id === 'gyeongsub'); return p && q && (p.hopY || 0) === 0 && (q.hopY || 0) === 0 && p.x < g.player.x && q.x > g.player.x; }, 6000), '양옆에 착지(억빠맨 왼쪽·경섭 오른쪽)');
  await cap('13_party_landed');
  s = await advanceTo('요플래 괜찮아요'); check(!!s && s.speaker === '억빠맨', '억빠맨: 요플래 괜찮아요?');
  s = await advanceTo('무사해서 다행이네'); check(!!s && s.speaker === '경섭', '경섭: 허허 무사해서 다행이네');
  s = await advanceTo('모두들'); check(!!s, '나레이션: 모두들...');
  s = await advanceTo('ㅋㅋ'); check(!!s, '영클: ㅋㅋ'); await next();
  // 영클 TV 내려와 펼쳐짐
  check(await until(() => { const tv = window.game.entities.find(e => e.id === 'youngcle_tv'); return tv && tv.visible && (tv.def.foldX ?? 1) > 0.95 && window.game.tvBroadcast?.phase === 'on'; }, 12000), '영클 TV 가 내려와 펼쳐지고 켜진다');
  await page.waitForTimeout(300); await cap('14_tv_open');
  s = await advanceTo('방해해서 미안하노'); check(!!s, '방해해서 미안하노');
  s = await advanceTo('재앙급의 인물'); check(!!s, '재앙급의 인물 …');
  s = await advanceTo('아.'); check(!!s && s.text.trim() === '* 아.', '영클: 아.');
  await next();
  s = await advanceTo('어둠의짜장면'); check(!!s && s.text.includes('{c=purple}어둠의짜장면{/c}'), '어둠의짜장면(보라색)');
  check(await until(() => !window.game.sound.bgmName, 4000), '브금 꺼짐'); await cap('15_dark_jjajang');
  s = await advanceTo('알아서 잘 할거라고'); check(!!s, '뭐 알아서 잘 할거라고 믿음 ㅇㅇ');
  await next();
  check(await until(() => { const tv = window.game.entities.find(e => e.id === 'youngcle_tv'); return tv && (tv.def.foldX ?? 1) < 0.1 && tv.y < 0; }, 12000), 'TV 가 접혀 올라간다');
  s = await advanceTo('다행이네요 형'); check(!!s && s.speaker === '억빠맨', '억빠맨: 다행이네요 형.');
  s = await advanceTo('다시 복귀되었군'); check(!!s && s.speaker === '경섭', '경섭: 우리 파티가 다시 복귀되었군 한번 가볼까?');
  s = await advanceTo('다시 동료가 되었다'); check(!!s && s.text.includes('{c=yellow}억빠맨{/c}') && s.text.includes('{c=yellow}경섭{/c}'), '억빠맨(노란색)과 경섭(노란색)이 다시 동료가 되었다');
  await cap('16_regroup');
  await next();
  // 흰 화면 → 잔해 길 맵
  check(await until(() => window.game.flags.statue_destroyed && window.game.flags.party_regrouped && !window.game.dialogue.running && window.game.fade.alpha === 0, 20000), '연출 끝: statue_destroyed·party_regrouped');
  s = await st();
  check(s.map === 'jjajang_statue' && s.party.join() === 'gyeongsub,ppaman', `파티 복귀 ${s.party.join(',')}`);
  const left = await ev(() => ({ statue: !!window.game.entities.find(e => e.id === 'jjajang_statue' && !e.dead), ship: !!window.game.entities.find(e => e.id === 'youngcle_warship' && !e.dead), rubble: window.game.entities.filter(e => /jjajang_rubble/.test(e.id) && !e.dead).length, tv: !!window.game.entities.find(e => e.id === 'youngcle_tv' && !e.dead) }));
  check(!left.statue && !left.ship && !left.tv && left.rubble === 5, `동상·전함·TV 없음, 잔해 ${left.rubble}개`);
  await page.waitForTimeout(400); await cap('17_rubble_map');
  // ── 통로 위로 → 깊은숲 입구 ──
  check(await go('ArrowUp', "g.mapId === 'jjajang_deep'", 25000, true), '통로 위 문 → 깊은숲 입구');
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 10000 });
  await page.waitForTimeout(700);
  s = await st(); check(s.bgm === 'wind', `깊은숲 입구 브금 wind (${s.bgm})`);
  check(s.party.join() === 'gyeongsub,ppaman', '동료가 따라온다');
  await cap('18_deep_entry');
  const S = await ev(() => window.game.map.def.meta.spring);
  check(await go('ArrowUp', `g.player.y <= ${S[1] * 32 + 8}`, 25000, true), '위로 가는 길을 따라 나들목 높이까지');
  check(await go('ArrowRight', `g.player.x >= ${(S[0] - 1) * 32 + 2}`, 10000), '오른쪽 나들목 끝');
  await page.waitForTimeout(200); await cap('19_deep_spring');
  await ev(() => { window.game.partyHp.hyungsub = 30; });
  await next();
  check(await until(() => window.game.dialogue.running, 3000), '마법의샘 C');
  check(await until(() => window.game.partyHp.hyungsub === window.game.maxHpOf('hyungsub'), 5000), '전체 회복');
  await cap('20_deep_heal');
} catch (e) { fails += 1; console.log('FAIL exception', e.message); await cap('99_error'); }
check(errors.length === 0, `페이지 오류 없음 ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
console.log('fails=' + fails);
process.exit(fails ? 1 : 0);
