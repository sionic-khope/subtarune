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
// 깃발 클리어: 몬스터를 다 없앤 뒤 깃발 앞에서 C (남아 있으면 안 됨을 먼저 확인)
const toGoal = async (expectBlockedFirst = false) => {
  await page.evaluate(() => { const st = window.__subrio.state; const g = window.__subrio.level.goal; st.actors.forEach((a, i) => { a.x = g.x - 8 - i * 30; a.y = 200; }); st.demoDone = true; st.demo = null; st.control = true; });
  await page.waitForTimeout(500);
  if (expectBlockedFirst) { await page.keyboard.press('KeyC'); await page.waitForTimeout(300); const s = await sub(); check(s.sub === 'run', '몬스터가 남아 있으면 깃발 C 로 못 넘어감 ' + JSON.stringify([s.sub, s.alive])); }
  await page.evaluate(() => { const st = window.__subrio.state; st.enemies = []; });
  await page.waitForTimeout(200); await page.keyboard.press('KeyC');
  await page.waitForFunction(() => window.__subrio?.state.sub === 'clear', null, { timeout: 8000 }).catch(() => {});
};
try {
  await page.goto('http://localhost:8000/?qa=youngcle9_after');
  await page.waitForFunction(() => window.game?.player && game.mapId === 'youngcle9' && !game.transitioning, null, { timeout: 20000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => { game.player.x = 356; game.player.y = 556; game.player.facing = 'right'; });
  await page.waitForTimeout(150); await page.keyboard.press('KeyC');
  await page.waitForFunction(() => game.dialogue.running, null, { timeout: 5000 });
  for (let i = 0; i < 150 && !(await page.evaluate(() => !!window.__subrio)); i++) { const tb = await page.evaluate(() => game.textbox.state); if (tb === 'waiting' || tb === 'choice') { await page.waitForTimeout(150); await page.keyboard.press('KeyC'); } await page.waitForTimeout(120); }
  await page.waitForFunction(() => !!window.__subrio, null, { timeout: 15000 });
  await page.evaluate(() => window.__subrio.skipTo('play'));
  await page.waitForFunction(() => window.__subrio?.state.control, null, { timeout: 10000 });
  let s = await sub(); check(s.stage === 0 && s.hp === undefined && s.enemies === 2, '1-0 튜토리얼 시작, 체력 없음, 시범 미니언+토템 ' + JSON.stringify([s.stage, s.enemies])); await cap('s0');
  // 1-0: 착지 대사가 뜨고(C 없이 시간이 지나면 넘어감), 동료는 토템을 때리기 전까지 공격하지 않는다
  const chat0 = await page.evaluate(() => { const st = window.__subrio.state; return { line: st.chat.line?.text, queue: st.chat.queue.length, team: st.teamAttack }; });
  check(!!chat0.line && chat0.team === false, '1-0 착지 대사·동료 공격 잠김 ' + JSON.stringify(chat0)); await cap('s0_chat');
  await page.waitForTimeout(2600); const chat1 = await page.evaluate(() => window.__subrio.state.chat.line?.text); check(chat1 !== chat0.line, '대사가 시간이 지나면 다음 줄로 ' + JSON.stringify([chat0.line, chat1]));
  // 밟기 시범: 트리거 열까지 옮기면 억빠맨이 혼자 나가 밟는다
  await page.evaluate(() => { const st = window.__subrio.state; st.chat = { queue: [], line: null, holdT: 0 }; st.actors.forEach((a, i) => { a.x = 50 * 16 + 4 - i * 30; a.y = 200; }); });
  await page.waitForFunction(() => window.__subrio.state.demo !== null, null, { timeout: 6000 }).catch(() => {});
  const demoStarted = await page.evaluate(() => !!window.__subrio.state.demo); check(demoStarted, '밟기 시범 시작(모두 정지)');
  const stomped = await page.waitForFunction(() => window.__subrio.state.enemies.find(e => e.demo)?.dead === true || window.__subrio.state.enemies.every(e => !e.demo), null, { timeout: 25000 }).then(() => true).catch(() => false);
  await cap('s0_stomp'); check(stomped, '억빠맨이 미니언을 밟아 죽인다');
  await page.waitForFunction(() => window.__subrio.state.demoDone && window.__subrio.state.control, null, { timeout: 25000 }).catch(() => {});
  check(await page.evaluate(() => window.__subrio.state.demoDone && window.__subrio.state.control), '시범 뒤 조작 복귀');
  // 토템: 요플래가 창으로 때리면 동료 공격 해제
  await page.evaluate(() => { const st = window.__subrio.state; const t = st.enemies.find(e => e.type === 'totem'); const l = st.actors[0]; l.x = t.x - 90; l.y = 200; l.facing = 1; st.actors[1].x = l.x - 30; st.actors[2].x = l.x - 60; st.chat = { queue: [], line: null, holdT: 0 }; });
  await page.waitForTimeout(600); await page.keyboard.press('KeyC');
  await page.waitForFunction(() => window.__subrio.state.teamAttack, null, { timeout: 6000 }).catch(() => {});
  await cap('s0_totem'); check(await page.evaluate(() => window.__subrio.state.teamAttack && window.__subrio.state.totemHit), '토템 명중 → 동료 공격 해제');
  await toGoal(true);
  await page.waitForFunction(() => window.__subrio?.state.stage === 1 && window.__subrio.state.control, null, { timeout: 14000 }).catch(() => {});
  s = await sub(); check(s.stage === 1 && s.enemies >= 20, '1-1 트위치 시작 ' + JSON.stringify([s.stage, s.enemies])); await cap('s1');
  const enemies0 = s.enemies;
  // 차징 창: C 를 0.6초 누르면 charge 상태, 놓으면 charged 창
  await page.keyboard.down('KeyC'); await page.waitForTimeout(600); s = await sub(); const charging = s.lead[2] === 'charge'; await cap('charge'); await page.keyboard.up('KeyC'); await page.waitForTimeout(80); s = await sub();
  check(charging && s.spears.includes(true), '차징 창 ' + JSON.stringify([charging, s.spears]));
  await page.waitForTimeout(700); await page.keyboard.press('KeyC'); await page.waitForTimeout(80); s = await sub(); check(s.spears.includes(false), '탭 창 ' + JSON.stringify(s.spears));
  // 체력: 미니언에 닿으면 RPG 체력이 깎이고 인게임 메뉴(Tab)에서도 같은 값
  const hp0 = await page.evaluate(() => game.hpOf('hyungsub'));
  await page.evaluate(() => { const st = window.__subrio.state; st.teamAttack = false; const l = st.actors[0]; l.invuln = 0; l.hurtT = 0; const e = st.enemies.find(en => !en.dead); e.x = l.x + 4; e.y = l.y; e.vy = 0; e.stunT = 0; e.hp = 99; });
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__subrio.state.teamAttack = true; });
  const hp1 = await page.evaluate(() => game.hpOf('hyungsub'));
  const dbg = await page.evaluate(() => { const st = window.__subrio.state; const l = st.actors[0]; const e = st.enemies.find(en => en.hp === 99 || en.hp === 98) || st.enemies[0]; return { l: [Math.round(l.x), Math.round(l.y), l.state, l.invuln, l.hurtT, l.grounded, Math.round(l.vy)], e: [Math.round(e.x), Math.round(e.y), e.dead, e.hp, e.stunT, e.type], sub: st.sub, demo: !!st.demo, control: st.control, party: game.partyHp.hyungsub }; });
  check(hp1 < hp0, `맞으면 체력이 깎인다 ${hp0} → ${hp1} ` + JSON.stringify(dbg)); await cap('hp_hit');
  await page.keyboard.press('Tab'); await page.waitForTimeout(400);
  const menu = await page.evaluate(() => ({ state: game.state, paused: window.__subrio.state.paused, overlay: document.getElementById('subrio')?.style.opacity }));
  check(menu.state === 'menu' && menu.paused && menu.overlay === '0', 'Tab 으로 인게임 메뉴가 열리고 섭리오는 멈춤 ' + JSON.stringify(menu)); await cap('menu');
  await page.keyboard.press('KeyX'); await page.waitForTimeout(500);
  const resumed = await page.evaluate(() => ({ state: game.state, paused: window.__subrio.state.paused, overlay: document.getElementById('subrio')?.style.opacity }));
  check(resumed.state !== 'menu' && !resumed.paused && resumed.overlay === '1', '메뉴를 닫으면 재개 ' + JSON.stringify(resumed));
  await page.evaluate(() => { const st = window.__subrio.state; const e = st.enemies.find(en => !en.dead); e.x = st.actors[0].x + 150; e.hp = 3; });
  // 미니언을 일행 앞에 옮기면 브랜드 불·질리언 시계가 자동으로 나간다
  await page.evaluate(() => { const st = window.__subrio.state; const l = st.actors[0]; const e = st.enemies.find(en => !en.dead); e.x = l.x + 150; e.y = l.y; e.vy = 0; e.dir = -1; });
  await page.waitForFunction(() => { const st = window.__subrio.state; return st.fires.length > 0 || st.actors.some(a => a.classId === 'brand' && a.fireCool > 0); }, null, { timeout: 6000 }).catch(() => {});
  s = await sub(); check(s.fires > 0 || (await page.evaluate(() => window.__subrio.state.actors.find(a => a.classId === 'brand').fireCool > 0)), '브랜드 불 발사·게이지 ' + JSON.stringify([s.fires])); await cap('brand_fire');
  await page.waitForFunction(() => window.__subrio.state.clocks.length > 0 || window.__subrio.state.enemies.some(e => e.clockHits.length > 0 || e.stunT > 0 || e.dead), null, { timeout: 6000 }).catch(() => {});
  s = await sub(); await cap('zilean_clock'); check(s.clocks > 0 || s.stunned > 0 || s.alive < enemies0, '질리언 시계 ' + JSON.stringify([s.clocks, s.stunned, s.alive, enemies0]));
  const stunned = await page.waitForFunction(() => window.__subrio.state.enemies.some(e => e.stunT > 0), null, { timeout: 8000 }).then(() => true).catch(() => false);
  await cap('stun'); s = await sub(); check(stunned || s.alive < enemies0, '시계 둘 맞아 스턴(또는 격파) ' + JSON.stringify([stunned, s.alive, enemies0]));
  for (const next of [2, 3, 4]) {
    await toGoal(next === 2); s = await sub(); check(s.sub === 'clear', `stage ${next} 깃발 → clear ` + JSON.stringify([s.stage, s.sub]));
    await page.waitForFunction(() => window.__subrio?.state.sub === 'card' && window.__subrio.state.fade >= 1, null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(250); await cap('card' + next);
    await page.waitForFunction((n) => window.__subrio?.state.stage === n && window.__subrio.state.control, next, { timeout: 14000 }).catch(() => {});
    s = await sub(); check(s.stage === next && s.control, `stage ${next + 1} 로드·조작 ` + JSON.stringify([s.stage, s.control, s.enemies])); await cap('s' + (next + 1));
  }
  await page.waitForFunction(() => window.__subrio?.state.boss?.state === 'roar', null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(250);
  s = await sub(); check(s.boss && s.boss[1] === 'roar', '보스 착지·포효 ' + JSON.stringify(s.boss)); await cap('boss_roar');
  await page.waitForFunction(() => window.__subrio?.state.boss?.state === 'swing', null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(80);
  s = await sub(); check(s.boss && s.boss[1] === 'swing', '보스 도끼 휘두름 ' + JSON.stringify(s.boss)); await cap('boss_swing');
  await page.waitForTimeout(600);
  await page.evaluate(() => { const st = window.__subrio.state; const l = st.actors[0]; l.invuln = 0; l.hurtT = 0; l.x = Math.max(120, st.boss.x - 90); l.y = 250; l.facing = 1; });
  await page.keyboard.down('KeyX');
  await page.waitForFunction(() => window.__subrio?.state.boss?.state === 'swing', null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(150);
  s = await sub(); check(s.lead[2] === 'guard', '방패 자세로 막기 ' + JSON.stringify(s.lead)); await cap('boss_guard');
  await page.keyboard.up('KeyX');
  // 에너지파 없음 확인 + 창 2방 격파
  s = await sub(); check(s.waters === 0, '물줄기(에너지파) 없음');
  await page.evaluate(() => { const st = window.__subrio.state; st.boss.hp = 2; st.boss.x = 300; st.boss.state = 'chase'; st.boss.stateT = 0; const l = st.actors[0]; l.x = 150; l.y = 250; l.facing = 1; l.invuln = 3; });
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
