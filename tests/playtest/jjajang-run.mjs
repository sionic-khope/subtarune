// 파란 토리이 길(BUILD230): 토리이 직전에서 오른쪽으로 지나면 러너 기믹 — 준비(검 뽑는 소리 weaponpull) → 대시(wing, 잔상) → 달리기(카메라 왼쪽 22%, 발마다 물결) → X 점프(jump) → C 베기(swing) → 공중 C 회전 베기(criticalswing)
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
const st = () => page.evaluate(() => { const g = window.game; const r = g.runner; const f = g.entities.find(e => e.def?.type === 'follower' && !e.dead); return { map: g.mapId, px: Math.round(g.player.x), py: Math.round(g.player.y), facing: g.player.facing, bgm: g.sound.bgmName, cam: [Math.round(g.camera.x), Math.round(g.camera.y)], locked: !!g.camera.locked, ripples: g.ripples.length, runner: r ? { phase: r.phase, vx: Math.round(r.core.vx), airY: Math.round(r.core.airY), grounded: r.core.grounded, attack: r.core.attack?.kind || null, anim: r.core.anim, frame: r.core.frame, trail: r.core.trail.length, elapsed: +r.core.elapsed.toFixed(2), sfx: r.sfxLog.slice() } : null, follower: f ? { x: Math.round(f.x), y: Math.round(f.y), visible: f.visible !== false } : null }; });
const go = async (key, cond, ms, run = true) => { await page.evaluate(c => { window.__cond = c; }, cond); if (run) await page.keyboard.down('KeyX'); await page.keyboard.down(key); const ok = await page.waitForFunction(() => new Function('g', 'return ' + window.__cond)(window.game), null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false); await page.keyboard.up(key); if (run) await page.keyboard.up('KeyX'); await page.waitForTimeout(100); return ok; };
try {
  await page.goto('http://localhost:8000/?qa=jjajang_run_torii');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_run' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  let s = await st(); check(s.follower && s.bgm === 'my_castle_town' && !s.runner, '토리이 직전 QA: 청소부 동행, my_castle_town, 아직 걷기 ' + JSON.stringify({ px: s.px, bgm: s.bgm }));
  const r0 = s.ripples;
  await cap('00_before');
  // 걸어서(달리기 아님) 토리이를 지난다 — 검은 물 위 발자국마다 물결 고리
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  s = await st(); check(s.ripples > r0, '검은 물 위를 걸으면 물결 고리가 뜬다 ' + s.ripples);
  const started = await until(() => !!window.game.runner, 12000);
  await page.keyboard.up('ArrowRight');
  check(started, '기둥 사이를 지나면 러너 기믹이 시작된다');
  s = await st(); check(s.runner && s.runner.phase === 'prep' && s.locked && s.follower && !s.follower.visible, '준비 동작(제자리), 카메라 잠금, 동료 숨김 ' + JSON.stringify(s.runner));
  const xPrep = s.px;
  await page.waitForTimeout(300); await cap('01_prep');
  check(await until(() => window.game.runner?.sfxLog.includes('weaponpull'), 2000), '검 뽑는 소리(weaponpull)');
  check(await until(() => window.game.runner?.phase === 'dash', 2000), '대시로 넘어간다');
  await page.waitForTimeout(220); s = await st(); await cap('02_dash');
  check(s.runner.sfx.includes('wing') && s.runner.trail > 2 && s.px === xPrep + Math.round(s.px - xPrep), '대시: 휘융 + 잔상 ' + JSON.stringify(s.runner));
  check(await until(() => window.game.runner?.phase === 'run', 2000), '달리기');
  await page.waitForTimeout(400); s = await st();
  check(s.runner.vx === 520 && s.runner.anim === 'run', '최고 속도 520px/s 달리기 프레임 ' + JSON.stringify(s.runner));
  const camLeft = s.px + 12 - s.cam[0];
  check(Math.abs(camLeft - 480 * 0.22) < 40, `카메라: 캐릭터가 화면 왼쪽(${camLeft.toFixed(0)}px)`);
  const rBefore = s.ripples; await page.waitForTimeout(500); s = await st();
  check(s.ripples >= rBefore || s.ripples > 0, '달리는 동안 발마다 물결 ' + s.ripples);
  await cap('03_run');
  // X 점프
  await press('KeyX');
  check(await until(() => window.game.runner && !window.game.runner.core.grounded && window.game.runner.core.airY > 10, 1500), 'X 점프: 떠오른다');
  await page.waitForTimeout(120); s = await st(); await cap('04_jump');
  check(s.runner.sfx.includes('jump') && s.runner.anim === 'jump', '점프 소리·점프 프레임 ' + JSON.stringify(s.runner));
  check(await until(() => window.game.runner?.core.grounded, 2000), '착지');
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
  check(await until(() => window.game.runner?.core.attack?.kind === 'spin', 1000), '공중 C: 회전 베기 시작');
  await page.waitForTimeout(200); s = await st(); await cap('06_spin');
  const spinAngle = await page.evaluate(() => window.game.runner?.core.spinAngle || 0);
  check(s.runner.sfx.includes('criticalswing') && spinAngle > 1 && s.runner.frame === 2, `회전 베기: criticalswing, 각도 ${spinAngle.toFixed(2)}`);
  // 끝까지: 시작 뒤 약 10초 남짓
  const done = await until(() => !window.game.runner, 16000);
  s = await st();
  check(done && s.px >= 6304 - 4 && !s.locked && s.follower && s.follower.visible && s.follower.x < s.px, '오른쪽 끝(6304)에서 멈추고 조작·카메라·동료 복귀 ' + JSON.stringify({ px: s.px, cam: s.cam, follower: s.follower }));
  await page.waitForTimeout(300); await cap('07_end');
  const elapsed = await page.evaluate(() => window.__runElapsed);
  // 끝난 뒤 다시 조작: 왼쪽으로 걸을 수 있다
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(400); await page.keyboard.up('ArrowLeft');
  const s2 = await st(); check(s2.px < s.px - 20 && s2.facing === 'left', '끝난 뒤 다시 걸을 수 있다');
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
