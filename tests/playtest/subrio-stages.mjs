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
    await page.waitForFunction((n) => window.__subrio?.state.stage === n && (window.__subrio.state.control || window.__subrio.state.sub === 'intro'), next, { timeout: 16000 }).catch(() => {});
    s = await sub(); check(s.stage === next && (s.control || s.sub === 'intro'), `stage ${next + 1} 로드 ` + JSON.stringify([s.stage, s.control, s.sub, s.enemies])); await cap('s' + (next + 1));
  }
  // 1-4 오프닝: 브금 꺼짐 → 세 명 낙하 → 대사 → 가운데 내려찍기(모두 양옆) → 둘러봄 → 대사 → 보스전 → START!!
  await page.waitForFunction(() => window.__subrio?.state.sub === 'intro', null, { timeout: 12000 }).catch(() => {});
  const introBgm = await page.evaluate(() => game.sound.bgmName ?? null); check((await sub()).sub === 'intro' && introBgm === null, '1-4 오프닝 시작·브금 꺼짐 ' + JSON.stringify([introBgm]));
  await page.waitForFunction(() => window.__subrio?.state.boss && window.__subrio.state.boss.state === 'marker', null, { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(400); await cap('boss_intro_marker');
  await page.waitForFunction(() => window.__subrio?.state.intro?.step >= 5, null, { timeout: 12000 }).catch(() => {}); await page.waitForTimeout(200);
  const split = await page.evaluate(() => { const st = window.__subrio.state; const by = Object.fromEntries(st.actors.map(a => [a.id, Math.round(a.x + a.w / 2)])); return { by, boss: [Math.round(st.boss.x + st.boss.w / 2), st.boss.state] }; });
  check(split.boss[1] === 'intro' && Math.abs(split.boss[0] - 288) < 20 && split.by.gyeongsub < 200 && split.by.hyungsub > 340 && split.by.ppaman > 340, '가운데 내려찍기 뒤 경섭 왼쪽·요플래/억빠맨 오른쪽 ' + JSON.stringify(split)); await cap('boss_intro_split');
  await page.waitForFunction(() => window.__subrio?.state.banner?.text === '보스전', null, { timeout: 25000 }).catch(() => {}); await page.waitForTimeout(200); await cap('boss_intro_banner');
  const banner = await page.evaluate(() => window.__subrio.state.banner?.text); check(banner === '보스전', '보스전 배너 ' + banner);
  await page.waitForFunction(() => window.__subrio?.state.banner?.text === 'START!!', null, { timeout: 6000 }).catch(() => {}); await page.waitForTimeout(150); await cap('boss_intro_start');
  await page.waitForFunction(() => window.__subrio?.state.bossFight && window.__subrio.state.control, null, { timeout: 6000 }).catch(() => {});
  s = await sub(); const fightBgm = await page.evaluate(() => game.sound.bgmName); check(s.sub === 'run' && s.control && fightBgm === 'subrio_sword', 'START!! 뒤 조작·브금 ' + JSON.stringify([s.sub, fightBgm]));
  await page.waitForFunction(() => ['chase', 'recover', 'windup', 'swing', 'spinWind'].includes(window.__subrio?.state.boss?.state), null, { timeout: 12000 }).catch(() => {});
  s = await sub(); check(!!s.boss, '첫 패턴 뒤 추격 ' + JSON.stringify(s.boss)); await cap('boss_roar');
  await page.evaluate(() => { const st = window.__subrio.state; const l = st.actors[0]; l.x = Math.max(120, st.boss.x - 100); l.y = 250; });
  await page.waitForFunction(() => ['windup', 'swing'].includes(window.__subrio?.state.boss?.state), null, { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(60);
  s = await sub(); check(s.boss && ['windup', 'swing'].includes(s.boss[1]), '보스 도끼 휘두름 ' + JSON.stringify(s.boss)); await cap('boss_swing');
  await page.waitForTimeout(600);
  await page.evaluate(() => { const st = window.__subrio.state; const l = st.actors[0]; l.invuln = 0; l.hurtT = 0; l.x = Math.max(120, st.boss.x - 90); l.y = 250; l.facing = 1; });
  await page.keyboard.down('KeyX');
  await page.waitForFunction(() => window.__subrio?.state.boss?.state === 'swing', null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(150);
  s = await sub(); check(s.lead[2] === 'guard', '방패 자세로 막기 ' + JSON.stringify(s.lead)); await cap('boss_guard');
  await page.keyboard.up('KeyX');
  // 도끼 찌르기(BUILD172): 150px 앞의 주인공을 예비(빨간 띠) → 찌르기 → 보스 앞까지 끌어당김 → 곧 평타
  await page.evaluate(() => { const st = window.__subrio.state, b = st.boss, l = st.actors[0]; Object.assign(b, { state: 'chase', stateT: 0.5, seq: 1, pulling: null, forceSwing: false, x: 200, facing: 1, vx: 0 }); Object.assign(l, { x: 350, y: 256, vx: 0, vy: 0, invuln: 0, hurtT: 0, slowT: 0, state: 'idle', charge: 0 }); });
  await page.waitForFunction(() => window.__subrio?.state.boss?.state === 'hookWind', null, { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(200); await cap('boss_hook_wind');
  s = await sub(); check(s.boss && s.boss[1] === 'hookWind', '찌르기 예비 ' + JSON.stringify(s.boss));
  await page.waitForFunction(() => window.__subrio?.state.boss?.state === 'hookPull', null, { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(120); await cap('boss_hook_pull');
  s = await sub(); const pullX0 = s.lead[0];
  await page.waitForFunction(() => window.__subrio?.state.boss?.state === 'recover', null, { timeout: 3000 }).catch(() => {});
  s = await sub(); check(s.boss && s.boss[1] === 'recover' && s.lead[0] < pullX0 && Math.abs(s.lead[0] - (s.boss[0] + 72 + 4)) < 10, '찌르기에 걸려 보스 앞(몸 오른쪽 끝 +4)까지 끌려온다 ' + JSON.stringify([pullX0, s.lead, s.boss]));
  await page.waitForFunction(() => window.__subrio?.state.boss?.state === 'windup', null, { timeout: 4000 }).catch(() => {}); s = await sub(); check(s.boss && s.boss[1] === 'windup', '끌어당긴 뒤 곧바로 평타 예비 ' + JSON.stringify(s.boss)); await cap('boss_hook_swing');
  // 격노 3연속 내려찍기(BUILD173): 영역 셋(본체 + 그림자 둘) → 비융·비융·비융 → 팟·팟·팟(그림자가 본체보다 늦게 착지)
  await page.evaluate(() => { const st = window.__subrio.state, b = st.boss, l = st.actors[0]; Object.assign(b, { enraged: true, state: 'chase', stateT: 0.5, seq: 3, pulling: null, forceSwing: false, x: 300, vx: 0 }); Object.assign(l, { x: 288, y: 256, vx: 0, vy: 0, invuln: 3, hurtT: 0, slowT: 0, state: 'idle', charge: 0 }); });
  await page.waitForFunction(() => window.__subrio?.state.boss?.state === 'marker', null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(150); await cap('boss_triple_marker');
  const marker = await page.evaluate(() => { const b = window.__subrio.state.boss; return { state: b.state, extras: b.extraSlams.map(sh => [sh.x, sh.y]), main: [b.markerX, b.markerY] }; });
  check(marker.state === 'marker' && marker.extras.length === 2 && marker.extras.every(([x]) => Math.abs(x - marker.main[0]) >= 76), '격노 내려찍기 영역 셋 ' + JSON.stringify(marker));
  await page.waitForFunction(() => { const b = window.__subrio?.state.boss; return b && b.state === 'slam' && b.extraSlams.some(sh => sh.started && !sh.landed); }, null, { timeout: 5000 }).catch(() => {}); await cap('boss_triple_falling');
  await page.waitForFunction(() => { const b = window.__subrio?.state.boss; return b && b.state === 'slam' && b.extraSlams.length === 2 && b.extraSlams.every(sh => sh.landed); }, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(60); await cap('boss_triple_slam');
  const landed = await page.evaluate(() => { const b = window.__subrio.state.boss; return { state: b.state, landed: b.extraSlams.map(sh => sh.landed), order: b.extraSlams.map(sh => sh.landedAt) }; });
  check(landed.state === 'slam' && landed.landed.every(Boolean) && landed.order[0] < landed.order[1], '그림자 둘이 차례로 착지(팟·팟·팟) ' + JSON.stringify(landed));
  await page.waitForFunction(() => window.__subrio?.state.boss?.state === 'recover', null, { timeout: 4000 }).catch(() => {});
  await page.evaluate(() => { window.__subrio.state.boss.enraged = false; });
  // 에너지파 없음 확인 + 창 2방 격파
  s = await sub(); check(s.waters === 0, '물줄기(에너지파) 없음');
  await page.evaluate(() => { const st = window.__subrio.state; st.boss.hp = 2; st.boss.x = 300; st.boss.state = 'chase'; st.boss.stateT = 0; const l = st.actors[0]; l.x = 150; l.y = 250; l.facing = 1; l.invuln = 3; });
  await page.waitForTimeout(500); await page.keyboard.press('KeyC'); await page.waitForTimeout(600); await page.keyboard.press('KeyC');
  await page.waitForFunction(() => window.__subrio?.state.sub === 'victory', null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(300);
  s = await sub(); check(s.sub === 'victory' && s.cleared, '창 2방 → 격파 ' + JSON.stringify([s.sub, s.cleared])); await cap('boss_victory');
  await page.waitForFunction(() => window.__subrio?.state.bossGone, null, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(200); await cap('boss_clear');
  // 결과창(BUILD172): 검게 → WORLD 1 CLEAR! → 줄 7개가 차례로(숫자 올라감) → S+!! 도장 → C 로 넘김. 브금은 꺼진다
  await page.waitForFunction(() => window.__subrio?.state.sub === 'result', null, { timeout: 12000 }).catch(() => {});
  let r = await page.evaluate(() => { const st = window.__subrio?.state; return st && { sub: st.sub, bgm: game.sound.bgmName }; });
  check(!!r && r.sub === 'result', '결과창 시작 ' + JSON.stringify(r));
  await page.waitForTimeout(900); await cap('result_title');
  await page.waitForFunction(() => window.__subrio?.state.result?.view?.rowsDone, null, { timeout: 12000 }).catch(() => {}); await cap('result_rows');
  await page.waitForFunction(() => window.__subrio?.state.result?.view?.stampDone, null, { timeout: 6000 }).catch(() => {}); await page.waitForTimeout(150); await cap('result_stamp');
  r = await page.evaluate(() => { const st = window.__subrio.state, v = st.result.view; return { rows: v?.rows.map(x => x.text), stamp: v?.stamp, rank: v?.rank, stats: st.stats, bgm: game.sound.bgmName }; });
  check(!!r.rows && r.rows.length === 7 && r.stamp === 1 && r.rank === 'S+' && r.bgm === null, '결과 줄 7개·S+ 도장·브금 없음 ' + JSON.stringify(r));
  check(r.stats.time > 10 && r.rows[0] === (() => { const m = Math.floor(r.stats.time / 60), s = r.stats.time - m * 60; return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`; })(), '클리어 시간 집계·표기 ' + JSON.stringify([r.stats.time, r.rows[0]]));
  await page.waitForFunction(() => window.__subrio?.state.result?.view?.canSkip, null, { timeout: 6000 }).catch(() => {}); await page.keyboard.press('KeyC');
  await page.waitForFunction(() => !window.__subrio, null, { timeout: 15000 }).catch(() => {});
  // 귀환 연출이 이어진다(bidet_pipe_enter → after): 토관에서 나오는 중, 무음 — 전체 흐름은 tests/playtest/subrio-after.mjs
  await page.waitForFunction(() => game.player.visible, null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(300);
  const exit = await page.evaluate(() => ({ subrio: !!window.__subrio, cleared: game.flags.subrio_cleared, result: game.flags.subrio_result, running: game.dialogue.running, bgm: game.sound.bgmName, visible: game.player.visible, x: Math.round(game.player.x) }));
  check(!exit.subrio && exit.cleared === true && exit.result === 'found' && exit.running && exit.bgm === null && exit.visible && exit.x < 380, '방 복귀·subrio_cleared·귀환 연출 시작(무음) ' + JSON.stringify(exit)); await cap('room');
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
