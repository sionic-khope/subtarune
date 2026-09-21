// 벚꽃 숲 8·9(BUILD282): 벚꽃 숲 7 동쪽 끝 문 → 벚꽃 숲 8 서쪽 끝 → 오른쪽 3초 → 갈림목 연출 전부(원문 아홉 줄·카메라 윗길·경섭 혼자 오른쪽으로 떠남·억빠맨 오른쪽 길 가드·요플래 혼자)
//   → 오른쪽 길로 가려 하면 “윗길로 가보시는게 어때요?” + 되돌림 → 윗문 → 벚꽃 숲 9(위로 살짝 → 왼쪽 → 파란 토리이 → 왼쪽으로 15초 달리기: 분홍 나뭇잎·꽃가지 쳐내기, 물 없음) → 왼쪽 끝 → 재입장(가드만 남음). 실행: tests/playtest/run.sh jjajang-sakura8
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'warning' && /cutscene|엔티티 없음|동작 없음|없음/.test(m.text())) errors.push('warn: ' + m.text()); });
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'sakura8_' + n + '.png') }); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
const ev = (fn, arg) => page.evaluate(fn, arg);
const go = async (key, cond, ms, run = false) => { await page.evaluate(c => { window.__cond = c; }, cond); if (run) await page.keyboard.down('KeyX'); await page.keyboard.down(key); const ok = await until(() => new Function('g', 'return ' + window.__cond)(window.game), ms); await page.keyboard.up(key); if (run) await page.keyboard.up('KeyX'); await page.waitForTimeout(100); return ok; };
const ent = id => ev(i => { const e = window.game.entities.find(x => x.id === i && !x.dead); return e ? { x: Math.round(e.x), y: Math.round(e.y), facing: e.facing, visible: e.visible !== false, solid: !!e.solid } : null; }, id);
const st = () => ev(() => { const g = window.game; const r = g.runner; return { map: g.mapId, text: g.textbox.node?.text || null, speaker: g.textbox.node?.speaker || null, state: g.textbox.state, cam: [Math.round(g.camera.x), Math.round(g.camera.y)], bgm: g.sound.bgmName, px: Math.round(g.player.x), py: Math.round(g.player.y), facing: g.player.facing, dialogue: g.dialogue.running, party: g.party.slice(), followers: g.entities.filter(e => e.def?.type === 'follower' && !e.dead).map(e => ({ id: e.id, visible: e.visible !== false })), flags: { started: !!g.flags.sakura8_split_started, done: !!g.flags.sakura8_split_done }, runner: r ? { phase: r.phase, dir: r.core.dir, water: r.water, vx: Math.round(r.core.vx), obstacles: (r.core.obstacles || []).map(o => o.type), hurt: r.core.hurtCount, deflect: r.core.deflectCount, sfx: r.sfxLog.slice(-6) } : null, ripples: g.ripples.length, hp: g.hpOf('hyungsub') }; });
const next = async () => { await until(() => window.game.textbox.state === 'waiting', 8000); await press('KeyC'); };
const advanceTo = async (needle, ms = 40000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await st(); if (s.text && s.text.includes(needle)) return s; if (s.text) await next(); await page.waitForTimeout(100); } return null; };
// 달리는 동안: 앞에 장애물이 가까이 오면 C(쳐냄) — 토리이 굽이 길 playtest 와 같은 방식
const runThrough = async tags => {
  let deflects = 0, t0 = Date.now(), maxObst = 0; const types = new Set(); const seenShots = new Set();
  while (await ev(() => !!window.game.runner)) {
    const info = await ev(() => { const r = window.game.runner; if (!r || !r.core.obstacles) return { near: false, n: 0, types: [], ahead: [] }; const px = r.core.x + 12; return { near: r.core.obstacles.some(o => !o.deflected && (o.x - px) * r.core.dir > 36 && (o.x - px) * r.core.dir < 96 && !r.core.attack && r.core.grounded), n: r.core.obstacles.length, types: r.core.obstacles.map(o => o.type), ahead: r.core.obstacles.filter(o => !o.deflected && (o.x - px) * r.core.dir > 60 && (o.x - px) * r.core.dir < 200).map(o => o.type), deflect: r.core.deflectCount }; });
    maxObst = Math.max(maxObst, info.n); for (const t of info.types) types.add(t);
    // 장애물이 다가오는 장면(쳐내기 전): 종류마다 한 장 — 분홍 나뭇잎·꽃가지가 실제로 보이는지 눈으로
    for (const t of info.ahead) if (!seenShots.has(t)) { seenShots.add(t); await cap('09_ahead_' + t); }
    if (info.near) { await press('KeyC'); }
    if (tags[info.deflect] && !tags[info.deflect].done) { tags[info.deflect].done = true; await page.waitForTimeout(120); await cap(tags[info.deflect].name); }
    deflects = info.deflect ?? deflects;
    await page.waitForTimeout(40);
    if (Date.now() - t0 > 40000) break;
  }
  return { seconds: (Date.now() - t0) / 1000, deflects, maxObst, types: [...types] };
};
try {
  // 1) 벚꽃 숲 7 동쪽 끝 문 → 벚꽃 숲 8 서쪽 끝(브금 sakura, 경섭·억빠맨 동행)
  await page.goto('http://localhost:8000/?qa=jjajang_sakura7_after');
  check(await until(() => window.game?.mapId === 'jjajang_sakura7' && !window.game.transitioning, 30000), '벚꽃 숲 7 연출 끝 QA');
  await page.evaluate(() => window.game.changeMap('jjajang_sakura7', 'from_east'));
  await page.waitForFunction(() => window.game.mapId === 'jjajang_sakura7' && !window.game.transitioning, null, { timeout: 12000 }); await page.waitForTimeout(400);
  check(await go('ArrowRight', "g.mapId === 'jjajang_sakura8'", 15000), '벚꽃 숲 7 동쪽 끝 문 → 벚꽃 숲 8');
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 10000 }); await page.waitForTimeout(500);
  let s = await st(); check(s.bgm === 'sakura' && s.px < 100 && s.party.length === 2 && s.followers.length === 2, `8: 서쪽 끝·브금 sakura·둘 동행 ${JSON.stringify([s.px, s.py, s.bgm, s.party])}`); await cap('00_enter');
  const S = await ev(() => window.game.map.def.meta.sakura8);
  check(!(await ent('ppaman_guard')) && !(await ent('gyeongsub_npc'))?.visible, '연출 전엔 가드 없음·사본은 숨김');
  // 2) 오른쪽 3초 → 갈림목 연출: 원문 대로
  const t0 = Date.now();
  check(await go('ArrowRight', 'g.dialogue.running', 25000), '갈림목 → 연출 시작');
  const walked = (Date.now() - t0) / 1000; check(walked >= 2.5 && walked <= 8, `오른쪽으로 3초쯤 걸어 (${walked.toFixed(1)}초)`);
  s = await advanceTo('빠맨아'); check(!!s && s.speaker === '경섭', '경섭: 빠맨아,'); await cap('01_split');
  s = await advanceTo('네?'); check(!!s && s.speaker === '억빠맨', '억빠맨: 네?');
  s = await advanceTo('미스가 있는거같은데'); check(!!s && s.speaker === '경섭', '경섭: 아마 저 다음에 미스가 있는거같은데,');
  s = await advanceTo('내가 혼자 갔다오마'); check(!!s, '경섭: 내가 혼자 갔다오마');
  s = await advanceTo('아 네'); check(!!s && s.speaker === '억빠맨', '억빠맨: 아 네');
  s = await advanceTo('어둠의짜장면'); check(!!s && s.speaker === '경섭' && s.text.includes('{c=purple}어둠의짜장면{/c}') && !s.text.includes('(보라색)'), '경섭: 그동안 그 어둠의짜장면?을 … (어둠의짜장면은 보라색 글자, 괄호 없음)');
  await until(() => window.game.textbox.state === 'waiting', 8000); await cap('01b_purple');
  s = await advanceTo('고민좀 해볼게요'); check(!!s && s.speaker === '억빠맨', '억빠맨: 흠.. 저 고민좀 해볼게요');
  s = await advanceTo('저기라도 가보실래요'); check(!!s && s.speaker === '억빠맨', '억빠맨: 요플래형은 뭐 한번 저기라도 가보실래요?'); await cap('02_ask');
  const camBefore = s.cam; await next();
  // (윗길로 카메라를 가리킨다): 억빠맨이 위를 보고 카메라가 천천히 윗길로 → 잠깐 → 돌아옴 → 갔다오마.
  check(await until(() => window.game.entities.find(e => e.id === 'ppaman')?.facing === 'up', 3000), '억빠맨이 윗길을 본다');
  await page.waitForTimeout(600); const c1 = (await st()).cam; await page.waitForTimeout(700); const c2 = (await st()).cam;
  check(c1[1] < camBefore[1] - 20 && c2[1] < c1[1] - 10, `카메라가 천천히 윗길로 (${camBefore[1]} → ${c1[1]} → ${c2[1]})`);
  check(await until(() => Math.round(window.game.camera.y) === 60 && Math.round(window.game.camera.x) === 528, 4000), '윗길 뷰에 멈춤'); await page.waitForTimeout(300); await cap('03_upview');
  s = await advanceTo('갔다오마.'); check(!!s && s.speaker === '경섭' && Math.abs(s.cam[0] + 240 - (s.px + 12)) < 48, `카메라 돌아온 뒤 경섭: 갔다오마. (${s?.cam})`); await next();
  // (경섭이 오른쪽으로 쭉 걸어감): 동료에서 빠지고 사본이 오른쪽으로 걸어 나가 사라진다
  check(await until(() => { const g = window.game; const n = g.entities.find(e => e.id === 'gyeongsub_npc'); return n && n.visible !== false && !g.party.includes('gyeongsub'); }, 4000), '경섭이 동료에서 빠져 사본이 선다');
  const k0 = await ent('gyeongsub_npc'), p0 = await ent('ppaman_npc'); await page.waitForTimeout(900); const k1 = await ent('gyeongsub_npc'), p1 = await ent('ppaman_npc');
  check(k0 && k1 && k1.x > k0.x + 40 && k1.facing === 'right' && k1.y === S.roadY + 24, `경섭이 앞줄로 오른쪽으로 쭉 걸어간다 (${k0?.x} → ${k1?.x}, y ${k1?.y})`);
  check(p0 && p1 && p1.visible && p1.x > p0.x + 20 && p1.facing === 'right', `억빠맨도 거의 같이 오른쪽으로 (${p0?.x} → ${p1?.x})`); await cap('04_gyeongsub_leaves');
  check(await until(() => { const n = window.game.entities.find(e => e.id === 'gyeongsub_npc'); return !n || n.dead; }, 15000), '경섭이 맵 밖으로 사라짐');
  // 억빠맨: 동료에서 빠져 오른쪽 길 바로 앞을 막고 선다 → 요플래 혼자
  check(await until(() => { const g = window.game; const n = g.entities.find(e => e.id === 'ppaman_npc'); return n && n.visible !== false && !g.party.includes('ppaman'); }, 4000), '억빠맨이 동료에서 빠진다');
  check(await until(() => window.game.flags.sakura8_split_done && !window.game.dialogue.running, 10000), '연출 끝·플래그');
  await page.waitForTimeout(400); s = await st(); const guard = await ent('ppaman_npc');
  check(guard && guard.x === S.guard[0] && guard.y === S.guard[1] && guard.facing === 'left' && guard.solid, `억빠맨이 오른쪽 길 앞을 막고 선다 ${JSON.stringify(guard)}`);
  check(s.party.length === 0 && s.followers.length === 0 && s.bgm === 'sakura' && !s.dialogue, `요플래 혼자 (party ${JSON.stringify(s.party)}, 브금 ${s.bgm})`); await cap('05_alone');
  // 3) 오른쪽 길로 가려 하면 억빠맨: 윗길로 가보시는게 어때요? + 되돌림
  check(await go('ArrowRight', 'g.dialogue.running', 8000), '오른쪽 길로 가면 가드');
  s = await advanceTo('윗길로 가보시는게'); check(!!s && s.speaker === '억빠맨', '억빠맨: 윗길로 가보시는게 어때요?'); await cap('06_guard'); await next();
  check(await until(() => !window.game.dialogue.running, 6000), '가드 대사 끝');
  s = await st(); check(s.px + 24 < S.blockCols[0] * 32 + 16 && s.facing === 'up', `한 칸 되돌려 윗길을 본다 (px ${s.px}, facing ${s.facing})`);
  check(await go('ArrowRight', 'g.dialogue.running', 8000), '다시 가려 해도 또 막는다'); await advanceTo('윗길로 가보시는게'); await next(); await until(() => !window.game.dialogue.running, 6000);
  const gx = (await ent('ppaman_npc'))?.x; check(gx === S.guard[0], '가드는 자리를 지킨다');
  // 4) 윗길 → 윗문 → 벚꽃 숲 9(요플래 혼자)
  await page.evaluate(() => { const g = window.game; g.player.x = g.map.def.meta.sakura8.junctionX; });
  check(await go('ArrowUp', "g.mapId === 'jjajang_sakura9'", 20000, true), '윗길 끝 문 → 벚꽃 숲 9');
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 10000 }); await page.waitForTimeout(500);
  s = await st(); check(s.map === 'jjajang_sakura9' && s.bgm === 'sakura' && s.party.length === 0 && s.followers.length === 0 && s.facing === 'up', `9: 아래 가장자리·혼자·브금 sakura ${JSON.stringify([s.px, s.py, s.party])}`); await cap('07_sakura9');
  // 5) 위로 살짝 → 왼쪽 → 파란 토리이를 지나면 왼쪽으로 달린다(물 없음·분홍 장애물)
  check(await go('ArrowUp', 'g.player.y <= 300', 8000), '위로 살짝');
  const tStart = Date.now();
  check(await go('ArrowLeft', '!!g.runner', 12000), '왼쪽으로 → 파란 토리이 → 달리기 시작');
  await page.waitForTimeout(700); s = await st(); await cap('08_run_start');
  check(s.runner && s.runner.dir === -1 && s.runner.water === false, `왼쪽으로 달린다·물 바닥 아님 ${JSON.stringify(s.runner && [s.runner.phase, s.runner.dir, s.runner.water])}`);
  const hp0 = s.hp;
  const run = await runThrough({ 1: { name: '09_deflect1' }, 3: { name: '10_deflect3' } });
  const total = (Date.now() - tStart) / 1000;
  s = await st();
  check(!s.runner && s.map === 'jjajang_sakura9', '달리기 끝(러너 해제)');
  check(run.seconds >= 13 && run.seconds <= 20, `15초쯤 달렸다 (${run.seconds.toFixed(1)}초, 토리이부터 ${total.toFixed(1)}초)`);
  check(run.types.length >= 3 && run.types.every(t => t.startsWith('sakura_')), `장애물은 분홍 나뭇잎·꽃가지 ${JSON.stringify(run.types)}`);
  check(run.deflects >= 3, `쳐냈다 ${run.deflects}`);
  check(s.ripples === 0, `물결 고리 없음 (${s.ripples})`);
  check(s.px < 420 && s.px > 300, `왼쪽 끝 근처에서 멈춤 (px ${s.px})`); await cap('11_run_end');
  check(await go('ArrowLeft', 'g.player.x < 200', 6000), '끝에서 다시 걸을 수 있다');
  // 6) 재입장: 가드만 남고 사본 없음, 요플래 혼자
  await page.goto('http://localhost:8000/?qa=jjajang_sakura8_after');
  check(await until(() => window.game?.mapId === 'jjajang_sakura8' && !window.game.transitioning, 30000), '연출 뒤 QA');
  await page.waitForTimeout(600); s = await st();
  const re = { guard: await ent('ppaman_guard') };
  const copies = await ev(() => ['gyeongsub_npc', 'ppaman_npc'].filter(id => window.game.entities.find(e => e.id === id && !e.dead)).length);
  check(re.guard && re.guard.x === S.guard[0] && re.guard.facing === 'left' && re.guard.solid && copies === 0 && s.party.length === 0 && s.bgm === 'sakura', `다시 들어오면 가드만·혼자·브금 sakura ${JSON.stringify([re.guard, copies, s.party])}`); await cap('12_reenter');
  check(await go('ArrowRight', 'g.dialogue.running', 8000), '재입장 뒤에도 오른쪽 길은 막는다'); s = await advanceTo('윗길로 가보시는게'); check(!!s, '억빠맨: 윗길로 가보시는게 어때요? (재입장)'); await next();
} catch (e) { fails += 1; console.log('FAIL exception', e.stack || e.message); }
if (errors.length) { fails += 1; console.log('FAIL console/page errors', errors.slice(0, 5).join(' | ')); }
console.log(`=== total fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
