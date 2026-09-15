// 섭리오 스테이지 1~3 → FINAL 보스전 → CLEAR → 방 복귀 (BUILD166). 실행: tests/playtest/run.sh subrio-stages
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.waitForTimeout(60); await page.screenshot({ path: path.join(shots, 'subrio_' + n + '.png') }); };
const sub = () => page.evaluate(() => { const st = window.__subrio?.state; if (!st) return null; const l = st.actors[0]; const b = st.boss;
  return { stage: st.stage, sub: st.sub, control: st.control, hp: l?.hp, lead: l && [Math.round(l.x), Math.round(l.y), l.state], boss: b && [Math.round(b.x), b.state, b.hp], waters: st.waters.length, cleared: st.cleared }; });
const toGoal = async () => {
  await page.evaluate(() => { const st = window.__subrio.state; const g = window.__subrio.level.goal; st.actors.forEach((a, i) => { a.x = g.x - 70 - i * 30; a.y = 200; }); });
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.__subrio?.state.sub === 'clear', null, { timeout: 8000 }).catch(() => {});
  await page.keyboard.up('ArrowRight');
};
try {
  await page.goto('http://localhost:8000/?qa=youngcle9_after');
  await page.waitForFunction(() => window.game?.player && game.mapId === 'youngcle9' && !game.transitioning, null, { timeout: 20000 });
  await page.keyboard.press('KeyX'); await page.waitForTimeout(300);
  await page.evaluate(() => { game.player.x = 760; game.player.y = 420; game.player.facing = 'up'; });
  await page.waitForTimeout(200); await page.keyboard.press('KeyC');
  await page.waitForFunction(() => game.dialogue.running, null, { timeout: 5000 }); await page.waitForTimeout(600); await page.keyboard.press('KeyC');
  await page.waitForFunction(() => !!window.__subrio, null, { timeout: 15000 });
  await page.evaluate(() => window.__subrio.skipTo('play'));
  await page.waitForFunction(() => window.__subrio?.state.control, null, { timeout: 10000 });
  let s = await sub(); check(s.stage === 0 && s.hp === 5, 'stage 1 시작, 하트 5 ' + JSON.stringify(s)); await cap('s1');
  for (const next of [1, 2, 3]) {
    await toGoal(); s = await sub(); check(s.sub === 'clear', `stage ${next} 깃발 → clear ` + JSON.stringify(s));
    await page.waitForFunction(() => window.__subrio?.state.sub === 'card' && window.__subrio.state.fade >= 1, null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(250); await cap('card' + next);
    await page.waitForFunction((n) => window.__subrio?.state.stage === n && window.__subrio.state.control, next, { timeout: 14000 }).catch(() => {});
    s = await sub(); check(s.stage === next && s.control, `stage ${next + 1} 로드·조작 ` + JSON.stringify(s)); await cap('s' + (next + 1));
  }
  await page.waitForFunction(() => window.__subrio?.state.boss?.state === 'roar', null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(250);
  s = await sub(); check(s.boss && s.boss[1] === 'roar', '보스 착지·포효 ' + JSON.stringify(s)); await cap('boss_roar');
  await page.waitForFunction(() => window.__subrio?.state.boss?.state === 'swing', null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(80);
  s = await sub(); check(s.boss && s.boss[1] === 'swing', '보스 도끼 휘두름 ' + JSON.stringify(s)); await cap('boss_swing');
  await page.waitForTimeout(600);
  // 가드: 보스 쪽을 보고 X — 하트가 줄지 않아야 한다
  const hpBefore = (await page.evaluate(() => { const st = window.__subrio.state; const l = st.actors[0]; l.invuln = 0; l.hurtT = 0; l.x = st.boss.x - 50; l.y = 200; l.facing = 1; return l.hp; }));
  await page.keyboard.down('KeyX');
  await page.waitForFunction(() => window.__subrio?.state.boss?.state === 'swing', null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(150);
  s = await sub(); check(s.lead[2] === 'guard' && s.hp === hpBefore, '방패로 도끼 막힘 ' + JSON.stringify(s)); await cap('boss_guard');
  await page.keyboard.up('KeyX');
  await page.evaluate(() => { const st = window.__subrio.state; const l = st.actors[0]; l.x = 90; l.y = 200; l.invuln = 0; st.boss.x = 520; st.boss.state = 'chase'; st.boss.stateT = 2.5; });
  await page.waitForFunction(() => window.__subrio?.state.waters.length > 0, null, { timeout: 8000 }).catch(() => {});
  s = await sub(); check(s.waters > 0 && s.boss[1] === 'spray', '물줄기 ' + JSON.stringify(s)); await cap('boss_spray');
  await page.evaluate(() => { const st = window.__subrio.state; st.boss.hp = 2; st.boss.x = 300; st.boss.state = 'chase'; st.boss.stateT = 0; const l = st.actors[0]; l.x = 150; l.y = 200; l.facing = 1; l.invuln = 3; });
  await page.waitForTimeout(500); await page.keyboard.press('KeyC'); await page.waitForTimeout(600); await page.keyboard.press('KeyC');
  await page.waitForFunction(() => window.__subrio?.state.sub === 'victory', null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(300);
  s = await sub(); check(s.sub === 'victory' && s.cleared, '창 2방 → 격파 ' + JSON.stringify(s)); await cap('boss_victory');
  await page.waitForFunction(() => window.__subrio?.state.bossGone, null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(200); await cap('boss_clear');
  await page.waitForFunction(() => !window.__subrio, null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(1800);
  const exit = await page.evaluate(() => ({ subrio: !!window.__subrio, cleared: game.flags.subrio_cleared, result: game.flags.subrio_result, zoom: Math.round(game.zoom.s * 100) / 100, bgm: game.sound.bgmName, overlay: !!document.getElementById('subrio') }));
  check(!exit.subrio && exit.cleared === true && exit.result === 'found' && exit.zoom === 1 && exit.bgm === 'youngcle_factory' && !exit.overlay, '방 복귀·subrio_cleared ' + JSON.stringify(exit)); await cap('room');
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
