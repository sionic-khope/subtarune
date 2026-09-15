// 섭리오 1-1 → 1-2 → 1-3 → 1-4 보스전 → CLEAR → 방 복귀 (BUILD167: 미니언·차징 창·브랜드 불·질리언 시계·체력 없음). 실행: tests/playtest/run.sh subrio-stages
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
  return { stage: st.stage, sub: st.sub, control: st.control, lead: l && [Math.round(l.x), Math.round(l.y), l.state, Math.round(l.charge * 100) / 100], boss: b && [Math.round(b.x), b.state, b.hp], enemies: st.enemies.length, alive: st.enemies.filter(e => !e.dead).length, stunned: st.enemies.filter(e => e.stunT > 0).length, spears: st.spears.map(s => s.charged), fires: st.fires.length, clocks: st.clocks.length, waters: st.waters.length, cleared: st.cleared, hp: l?.hp }; });
const toGoal = async () => {
  await page.evaluate(() => { const st = window.__subrio.state; const g = window.__subrio.level.goal; st.actors.forEach((a, i) => { a.x = g.x - 70 - i * 30; a.y = 200; }); st.enemies = []; });
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.__subrio?.state.sub === 'clear', null, { timeout: 8000 }).catch(() => {});
  await page.keyboard.up('ArrowRight');
};
try {
  await page.goto('http://localhost:8000/?qa=youngcle9_after');
  await page.waitForFunction(() => window.game?.player && game.mapId === 'youngcle9' && !game.transitioning, null, { timeout: 20000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => { game.player.x = 280; game.player.y = 560; game.player.facing = 'right'; });
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(700); await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => game.dialogue.running, null, { timeout: 5000 }); await page.waitForTimeout(700); await page.keyboard.press('KeyC');
  await page.waitForFunction(() => !!window.__subrio, null, { timeout: 15000 });
  await page.evaluate(() => window.__subrio.skipTo('play'));
  await page.waitForFunction(() => window.__subrio?.state.control, null, { timeout: 10000 });
  let s = await sub(); check(s.stage === 0 && s.hp === undefined && s.enemies >= 20, '1-1 시작, 체력 없음, 미니언 존재 ' + JSON.stringify([s.stage, s.enemies])); await cap('s1');
  const enemies0 = s.enemies;
  // 차징 창: C 를 0.6초 누르면 charge 상태, 놓으면 charged 창
  await page.keyboard.down('KeyC'); await page.waitForTimeout(600); s = await sub(); const charging = s.lead[2] === 'charge'; await cap('charge'); await page.keyboard.up('KeyC'); await page.waitForTimeout(80); s = await sub();
  check(charging && s.spears.includes(true), '차징 창 ' + JSON.stringify([charging, s.spears]));
  await page.waitForTimeout(700); await page.keyboard.press('KeyC'); await page.waitForTimeout(80); s = await sub(); check(s.spears.includes(false), '탭 창 ' + JSON.stringify(s.spears));
  // 미니언을 일행 앞에 옮기면 브랜드 불·질리언 시계가 자동으로 나간다
  await page.evaluate(() => { const st = window.__subrio.state; const l = st.actors[0]; const e = st.enemies[0]; e.x = l.x + 150; e.y = l.y; e.vy = 0; e.dir = -1; });
  await page.waitForFunction(() => { const st = window.__subrio.state; return st.fires.length > 0 || st.actors.some(a => a.classId === 'brand' && a.fireCool > 0); }, null, { timeout: 6000 }).catch(() => {});
  s = await sub(); check(s.fires > 0 || (await page.evaluate(() => window.__subrio.state.actors.find(a => a.classId === 'brand').fireCool > 0)), '브랜드 불 발사·게이지 ' + JSON.stringify([s.fires])); await cap('brand_fire');
  await page.waitForFunction(() => window.__subrio.state.clocks.length > 0 || window.__subrio.state.enemies.some(e => e.clockHits.length > 0 || e.stunT > 0 || e.dead), null, { timeout: 6000 }).catch(() => {});
  s = await sub(); await cap('zilean_clock'); check(s.clocks > 0 || s.stunned > 0 || s.alive < enemies0, '질리언 시계 ' + JSON.stringify([s.clocks, s.stunned, s.alive, enemies0]));
  const stunned = await page.waitForFunction(() => window.__subrio.state.enemies.some(e => e.stunT > 0), null, { timeout: 8000 }).then(() => true).catch(() => false);
  await cap('stun'); s = await sub(); check(stunned || s.alive < enemies0, '시계 둘 맞아 스턴(또는 격파) ' + JSON.stringify([stunned, s.alive, enemies0]));
  for (const next of [1, 2, 3]) {
    await toGoal(); s = await sub(); check(s.sub === 'clear', `stage ${next} 깃발 → clear ` + JSON.stringify([s.stage, s.sub]));
    await page.waitForFunction(() => window.__subrio?.state.sub === 'card' && window.__subrio.state.fade >= 1, null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(250); await cap('card' + next);
    await page.waitForFunction((n) => window.__subrio?.state.stage === n && window.__subrio.state.control, next, { timeout: 14000 }).catch(() => {});
    s = await sub(); check(s.stage === next && s.control, `stage ${next + 1} 로드·조작 ` + JSON.stringify([s.stage, s.control, s.enemies])); await cap('s' + (next + 1));
  }
  await page.waitForFunction(() => window.__subrio?.state.boss?.state === 'roar', null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(250);
  s = await sub(); check(s.boss && s.boss[1] === 'roar', '보스 착지·포효 ' + JSON.stringify(s.boss)); await cap('boss_roar');
  await page.waitForFunction(() => window.__subrio?.state.boss?.state === 'swing', null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(80);
  s = await sub(); check(s.boss && s.boss[1] === 'swing', '보스 도끼 휘두름 ' + JSON.stringify(s.boss)); await cap('boss_swing');
  await page.waitForTimeout(600);
  await page.evaluate(() => { const st = window.__subrio.state; const l = st.actors[0]; l.invuln = 0; l.hurtT = 0; l.x = st.boss.x - 60; l.y = 200; l.facing = 1; });
  await page.keyboard.down('KeyX');
  await page.waitForFunction(() => window.__subrio?.state.boss?.state === 'swing', null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(150);
  s = await sub(); check(s.lead[2] === 'guard', '방패 자세로 막기 ' + JSON.stringify(s.lead)); await cap('boss_guard');
  await page.keyboard.up('KeyX');
  await page.evaluate(() => { const st = window.__subrio.state; st.boss.hp = 2; st.boss.x = 300; st.boss.state = 'chase'; st.boss.stateT = 0; const l = st.actors[0]; l.x = 150; l.y = 200; l.facing = 1; l.invuln = 3; });
  await page.waitForTimeout(500); await page.keyboard.press('KeyC'); await page.waitForTimeout(600); await page.keyboard.press('KeyC');
  await page.waitForFunction(() => window.__subrio?.state.sub === 'victory', null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(300);
  s = await sub(); check(s.sub === 'victory' && s.cleared, '창 2방 → 격파 ' + JSON.stringify([s.sub, s.cleared])); await cap('boss_victory');
  await page.waitForFunction(() => window.__subrio?.state.bossGone, null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(200); await cap('boss_clear');
  await page.waitForFunction(() => !window.__subrio, null, { timeout: 15000 }).catch(() => {});
  await page.waitForFunction(() => !game.dialogue.running, null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(500);
  const exit = await page.evaluate(() => ({ subrio: !!window.__subrio, cleared: game.flags.subrio_cleared, result: game.flags.subrio_result, zoom: Math.round(game.zoom.s * 100) / 100, bgm: game.sound.bgmName, visible: game.player.visible, x: Math.round(game.player.x) }));
  check(!exit.subrio && exit.cleared === true && exit.result === 'found' && exit.zoom === 1 && exit.bgm === 'editor_union_stage' && exit.visible && exit.x < 330, '방 복귀·subrio_cleared·등장 곡 ' + JSON.stringify(exit)); await cap('room');
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
