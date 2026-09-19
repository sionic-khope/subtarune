// 파란 토리이 길(BUILD230): 토리이 직전에서 오른쪽으로 지나면 러너 기믹 — 준비(검 뽑는 소리 weaponpull) → 대시(wing, 잔상) → 달리기(카메라 왼쪽 22%, 발마다 물결) → X 점프(jump)·착지 웅크림 → C 베기(swing) → 공중 C 내려치기(criticalswing)
//   → 약 10초 뒤 오른쪽 끝에서 멈추고 조작·동료 복귀. 왼쪽 문 ↔ 석상 앞 숲 오른쪽. 실행: tests/playtest/run.sh jjajang-run
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'run_' + n + '.png') }); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
const st = () => page.evaluate(() => { const g = window.game; const r = g.runner; const f = g.entities.find(e => e.def?.type === 'follower' && !e.dead); return { map: g.mapId, px: Math.round(g.player.x), py: Math.round(g.player.y), facing: g.player.facing, bgm: g.sound.bgmName, cam: [Math.round(g.camera.x), Math.round(g.camera.y)], locked: !!g.camera.locked, ripples: g.ripples.length, runner: r ? { phase: r.phase, vx: Math.round(r.core.vx), airY: Math.round(r.core.airY), grounded: r.core.grounded, attack: r.core.attack?.kind || null, anim: r.core.anim, frame: r.core.frame, trail: r.core.trail.length, elapsed: +r.core.elapsed.toFixed(2), sfx: r.sfxLog.slice(), wind: r.wind.length, streaks: r.streaks.length, spray: r.spray.length } : null, follower: f ? { x: Math.round(f.x), y: Math.round(f.y), visible: f.visible !== false } : null }; });
const go = async (key, cond, ms, run = true) => { await page.evaluate(c => { window.__cond = c; }, cond); if (run) await page.keyboard.down('KeyX'); await page.keyboard.down(key); const ok = await page.waitForFunction(() => new Function('g', 'return ' + window.__cond)(window.game), null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false); await page.keyboard.up(key); if (run) await page.keyboard.up('KeyX'); await page.waitForTimeout(100); return ok; };
const line = async (text, capture) => {
  const seen = await page.waitForFunction(t => window.game.textbox.node?.text?.includes(t), text, { timeout: 12000, polling: 60 }).then(() => true).catch(() => false);
  check(seen, `대사: ${text}`); if (!seen) throw new Error('missing line ' + text);
  if (await page.evaluate(() => window.game.textbox.state === 'typing')) { await press('KeyC'); await until(() => window.game.textbox.state === 'waiting', 3000); }
  if (capture) await cap(capture);
  const before = await page.evaluate(() => window.game.textbox.node?.text);
  await press('KeyC');
  await page.waitForFunction(p => !window.game.dialogue.running || window.game.textbox.node?.text !== p, before, { timeout: 4000, polling: 40 }).catch(() => {});
};
try {
  await page.goto('http://localhost:8000/?qa=jjajang_run_torii');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_run' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  let s = await st(); check(s.follower && s.bgm === 'my_castle_town' && !s.runner, '토리이 직전 QA: 청소부 동행, my_castle_town, 아직 걷기 ' + JSON.stringify({ px: s.px, bgm: s.bgm }));
  const r0 = s.ripples;
  await cap('00_before');
  // 토리이 앞 청소부 연출(BUILD235): 대사 10줄 → 껄껄 웃음 → 휘리릭 사라짐
  await page.keyboard.down('ArrowRight');
  check(await until(() => window.game.ripples.length > 0, 1500), '검은 물 위를 걸으면 물결 고리가 뜬다');
  const introUp = await until(() => window.game.dialogue.running && window.game.flags.run_intro_started, 8000);
  await page.keyboard.up('ArrowRight');
  check(introUp, '토리이 앞에서 청소부 연출이 시작된다');
  await line('파란 토리이', '00b_intro');
  for (const t of ['경계의 표시일새', '빠르게 달린다면', '뚫는다나 뭐라나', '그냥 지나가면 되는거지만', '경직되게 휘두른다를', '검을 가볍게 움직여보는건', '더욱 빨리 가는 방법을']) await line(t);
  await line('껄껄 이런느낌일새');
  check(await until(() => { const j = window.game.entities.find(e => e.id === 'janitor' && !e.dead); return j && !!j.motion; }, 3000), '껄껄 뒤에 웃는다');
  await line('결계를 뚫는다는 느낌으로');
  check(await until(() => !window.game.dialogue.running && window.game.flags.run_intro_done, 6000), '연출이 끝난다');
  s = await st(); check(s.follower && !s.follower.visible, '청소부가 휘리릭 사라졌다 ' + JSON.stringify(s.follower));
  // 걸어서(달리기 아님) 토리이를 지난다
  await page.keyboard.down('ArrowRight');
  const started = await until(() => !!window.game.runner, 12000);
  await page.keyboard.up('ArrowRight');
  check(started, '기둥 사이를 지나면 러너 기믹이 시작된다');
  s = await st(); check(s.runner && s.runner.phase === 'prep' && s.locked && s.follower && !s.follower.visible, '준비 동작(제자리), 카메라 잠금, 동료 숨김 ' + JSON.stringify(s.runner));
  const xPrep = s.px;
  await page.waitForTimeout(300); await cap('01_prep');
  check(await until(() => window.game.runner?.sfxLog.includes('weaponpull'), 2000), '검 뽑는 소리(weaponpull)');
  check(await until(() => window.game.runner?.phase === 'dash', 2000), '대시로 넘어간다');
  await page.waitForTimeout(220); s = await st(); await cap('02_dash');
  check(s.runner.sfx.includes('wing') && s.runner.trail > 2 && s.px > xPrep + 10, '대시: 휘융 + 잔상 ' + JSON.stringify(s.runner));
  check(await until(() => window.game.runner?.phase === 'run', 2000), '달리기');
  await page.waitForTimeout(400); s = await st();
  check(s.runner.vx === 520 && s.runner.anim === 'run', '최고 속도 520px/s 달리기 프레임 ' + JSON.stringify(s.runner));
  const camLeft = s.px + 12 - s.cam[0];
  check(Math.abs(camLeft - 480 * 0.22) < 40, `카메라: 캐릭터가 화면 왼쪽(${camLeft.toFixed(0)}px)`);
  const rBefore = s.ripples; await page.waitForTimeout(500); s = await st();
  check(s.ripples >= rBefore || s.ripples > 0, '달리는 동안 발마다 물결 ' + s.ripples);
  check(s.runner.wind > 3 && s.runner.streaks > 3 && s.runner.spray > 0, '바람 줄기·바닥 줄기·물보라가 나온다 ' + JSON.stringify({ wind: s.runner.wind, streaks: s.runner.streaks, spray: s.runner.spray }));
  await cap('03_run');
  // X 점프
  await press('KeyX');
  check(await until(() => window.game.runner && !window.game.runner.core.grounded && window.game.runner.core.airY > 10, 1500), 'X 점프: 떠오른다');
  await page.waitForTimeout(120); s = await st(); await cap('04_jump');
  check(s.runner.sfx.includes('jump') && s.runner.anim === 'jump', '점프 소리·점프 프레임 ' + JSON.stringify(s.runner));
  check(await until(() => window.game.runner?.core.grounded, 2000), '착지');
  s = await st(); check(s.runner.anim === 'jump' && s.runner.frame === 3, '착지 웅크림 프레임 ' + JSON.stringify({ anim: s.runner.anim, frame: s.runner.frame }));
  await until(() => window.game.runner?.core.landT === 0, 1000);
  // C 베기(땅)
  await press('KeyC');
  check(await until(() => window.game.runner?.core.attack?.kind === 'slash', 1000), 'C 베기 시작');
  await page.waitForTimeout(100); s = await st(); await cap('05_slash');
  check(s.runner.sfx.includes('swing') && s.runner.anim === 'slash' && s.runner.grounded, '베기: 검 소리(swing) + 베기 프레임 ' + JSON.stringify(s.runner));
  check(await until(() => window.game.runner && !window.game.runner.core.attack, 1500), '베기 끝');
  // 점프 + C 회전 베기
  await press('KeyX');
  check(await until(() => window.game.runner && !window.game.runner.core.grounded && window.game.runner.core.airY > 15, 1500), '점프');
  await press('KeyC');
  check(await until(() => window.game.runner?.core.attack?.kind === 'airslash', 1000), '공중 C: 내려치기 시작');
  await page.waitForTimeout(120); s = await st(); await cap('06_airslash');
  check(s.runner.sfx.includes('criticalswing') && s.runner.anim === 'airslash' && !s.runner.grounded, '내려치기: criticalswing + 공중 베기 프레임 ' + JSON.stringify({ anim: s.runner.anim, frame: s.runner.frame }));
  // 끝까지: 시작 뒤 약 10초 남짓. 제동(손 짚고 미끄러짐) 때도 캐릭터는 화면 왼쪽 22% 자리
  check(await until(() => window.game.runner?.phase === 'brake', 16000), '끝 앞에서 제동 시작');
  s = await st(); await cap('06b_skid');
  check(s.runner.anim === 'prep' && s.runner.frame === 1 && s.runner.sfx.includes('scrape') && Math.abs(s.px + 12 - s.cam[0] - 480 * 0.22) < 40, '손 짚은 웅크림으로 미끄러지고(scrape) 구도는 왼쪽 22% ' + JSON.stringify({ px: s.px, cam: s.cam, anim: s.runner.anim }));
  check(await until(() => window.game.runner?.phase === 'settle', 4000), '멈춘 뒤 웅크린 채 잠깐(settle)');
  const done = await until(() => !window.game.runner, 6000);
  s = await st();
  const endX = await page.evaluate(() => window.game.map.def.meta.run.endX);
  check(done && s.px >= endX - 4 && !s.locked, `오른쪽 끝(${endX})에서 멈추고 조작·카메라 복귀 ` + JSON.stringify({ px: s.px, cam: s.cam }));
  // 끝 연출(BUILD235): 청소부가 오른쪽 화면 밖에서 천천히 걸어온다 → 대사 4줄 → 동료 복귀
  check(await until(() => window.game.dialogue.running && window.game.flags.run_outro_done !== true, 4000), '끝 연출 시작');
  const appeared = await until(() => { const j = window.game.entities.find(e => e.id === 'janitor' && !e.dead); return j && j.visible !== false && j.x > window.game.player.x + 150; }, 3000);
  const walkIn = await page.evaluate(() => { const j = window.game.entities.find(e => e.id === 'janitor' && !e.dead); return { x: Math.round(j.x), visible: j.visible !== false, px: Math.round(window.game.player.x) }; });
  check(appeared, '청소부가 오른쪽 멀리서 나타난다 ' + JSON.stringify(walkIn));
  await page.waitForTimeout(1500); await cap('07_walk_in');
  await line('껄껄');
  check(await until(() => { const j = window.game.entities.find(e => e.id === 'janitor' && !e.dead); return j && !!j.motion; }, 3000), '껄껄 뒤에 웃는다');
  s = await st(); check(s.follower && s.follower.x > s.px && s.follower.x < s.px + 90, '요플래 오른쪽 앞에 서서 ' + JSON.stringify(s.follower));
  await line('무슨 느낌인지');
  await line('x로 점프를하면');
  await line('점프하면서 공격할수도');
  check(await until(() => !window.game.dialogue.running && window.game.flags.run_outro_done, 6000), '끝 연출이 끝난다');
  await page.waitForTimeout(600); s = await st(); await cap('07_end');
  check(s.follower && s.follower.visible && s.follower.x < s.px, '다시 동료로 뒤에 선다 ' + JSON.stringify(s.follower));
  const f2 = await st();
  check(f2.follower && Math.abs(f2.follower.x - s.follower.x) < 12, '끝난 뒤 동료가 반대쪽으로 걸어가지 않는다 ' + JSON.stringify({ before: s.follower, after: f2.follower }));
  // 끝난 뒤 다시 조작: 왼쪽으로 걸을 수 있다
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(400); await page.keyboard.up('ArrowLeft');
  const s2 = await st(); check(s2.px < s.px - 20 && s2.facing === 'left', '끝난 뒤 다시 걸을 수 있다');
  // 달리는 중 비상탈출(메뉴 → 탈출): 러너가 사라지고 카메라 잠금이 풀리며 입구 스폰으로(리뷰 2026-09-19: 살아남은 러너가 다시 코스로 끌고 가던 것)
  await page.goto('http://localhost:8000/?qa=jjajang_run_torii');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_run' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.game.flags.run_intro_done = true; window.game.flags.run_outro_done = true; });
  await page.keyboard.down('ArrowRight'); await until(() => window.game.runner?.phase === 'run', 12000); await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(600);
  await page.evaluate(() => window.game.doEscape());
  await page.waitForTimeout(900); s = await st();
  check(!s.runner && !s.locked && s.px < 30 * 32 && s.follower && s.follower.visible, '달리는 중 비상탈출: 러너 해제·카메라 잠금 해제·입구 스폰 ' + JSON.stringify({ px: s.px, locked: s.locked, runner: !!s.runner }));
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
  // 문: 왼쪽 가장자리 ↔ 석상 앞 숲 오른쪽
  await page.goto('http://localhost:8000/?qa=jjajang_run');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_run' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(400);
  check(await go('ArrowLeft', "g.mapId === 'jjajang_statue'", 8000), '왼쪽 문 → 석상 앞 숲');
  await page.waitForTimeout(500); s = await st();
  check(s.map === 'jjajang_statue' && s.px > 56 * 32 && s.facing === 'left' && s.follower, '석상 앞 숲 오른쪽 끝 ' + JSON.stringify({ px: s.px }));
  check(await go('ArrowRight', "g.mapId === 'jjajang_run'", 8000), '석상 앞 숲 오른쪽 문 → 파란 토리이 길');
  await page.waitForTimeout(400); s = await st();
  check(s.map === 'jjajang_run' && s.px < 3 * 32 && s.bgm === 'my_castle_town', '파란 토리이 길 왼쪽 입구, 브금 이어짐');
  await cap('08_west');
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
