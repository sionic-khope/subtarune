// BUILD174: QA 보스전 직행(subrio_boss) + 무대 위 윗길(youngcle10, 마나샘) 연결. 실행: tests/playtest/run.sh upper-path
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
import { escToTitle } from './lib/esc.mjs';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'upper_' + n + '.png') }); };
const holdUntil = async (key, cond, maxMs = 8000) => { await page.keyboard.down(key); const t0 = Date.now(); let ok = false; while (Date.now() - t0 < maxMs) { if (await page.evaluate(cond)) { ok = true; break; } await page.waitForTimeout(80); } await page.keyboard.up(key); return ok; };
try {
  // 1) Q 메뉴 QA 지점 subrio_boss: 방에 서자마자 섭리오가 1-4 낙하부터 열린다
  await page.goto('http://localhost:8000/?qa=subrio_boss');
  const opened = await page.waitForFunction(() => !!window.__subrio && window.__subrio.state.phase === 'play', null, { timeout: 20000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(600); await cap('boss_jump');
  const st = await page.evaluate(() => { const s = window.__subrio?.state; return s && { stage: s.stage, sub: s.sub, phase: s.phase, bgm: game.sound.bgmName ?? null }; });
  check(opened && st && st.stage === 4 && st.phase === 'play' && ['drop', 'run'].includes(st.sub), '보스전 직행: 1-4 낙하부터 ' + JSON.stringify(st));
  await page.waitForFunction(() => window.__subrio?.state.intro, null, { timeout: 8000 }).catch(() => {});
  const intro = await page.evaluate(() => ({ intro: !!window.__subrio?.state.intro, bgm: game.sound.bgmName ?? null }));
  check(intro.intro && intro.bgm === null, '착지 뒤 오프닝 시작·무음 ' + JSON.stringify(intro)); await cap('boss_jump_intro');
  await escToTitle(page);
  await page.waitForFunction(() => !window.__subrio, null, { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => !game.dialogue.running && game.player.visible, null, { timeout: 15000 }).catch(() => {});
  const back = await page.evaluate(() => ({ map: game.mapId, visible: game.player.visible, x: Math.round(game.player.x), zoom: Math.round(game.zoom.s * 100) / 100 }));
  check(back.map === 'youngcle9' && back.visible && back.x < 340 && back.zoom === 1, 'Esc → 토관 앞으로 복귀 ' + JSON.stringify(back)); await cap('boss_jump_back');
  // 2) 윗길 youngcle10: 아래 문으로 무대 위 통로(from_upper) → 다시 위로 올라오면 윗길
  await page.goto('http://localhost:8000/?qa=youngcle10');
  await page.waitForFunction(() => window.game?.player && game.mapId === 'youngcle10' && !game.transitioning, null, { timeout: 20000 });
  await page.waitForTimeout(400); await cap('youngcle10');
  const info = await page.evaluate(() => ({ map: game.mapId, bgm: game.sound.bgmName ?? null, spring: !!game.entities.find(e => e.id === 'youngcle10_spring'), player: [Math.round(game.player.x), Math.round(game.player.y)] }));
  check(info.map === 'youngcle10' && info.bgm === null && info.spring, '윗길 도착·무음·마나샘 있음 ' + JSON.stringify(info));
  const down = await holdUntil('ArrowDown', () => game.mapId === 'youngcle7' && !game.transitioning, 8000);
  await page.waitForTimeout(300); const stage = await page.evaluate(() => ({ map: game.mapId, player: [Math.round(game.player.x), Math.round(game.player.y)], grate: !!game.entities.find(e => e.id === 'youngcle7_grate' && !e.dead) }));
  check(down && stage.map === 'youngcle7' && stage.player[1] < 120 && !stage.grate, '아래 문 → 무대 위 통로 꼭대기(from_upper), 철창 없음 ' + JSON.stringify(stage)); await cap('stage_from_upper');
  const up = await holdUntil('ArrowUp', () => game.mapId === 'youngcle10' && !game.transitioning, 8000);
  await page.waitForTimeout(300); check(up && (await page.evaluate(() => game.mapId)) === 'youngcle10', '위 문 → 윗길');
  // 마나샘: 통로 오른쪽 주머니 앞에서 C → HP 가득
  await page.evaluate(() => { game.partyHp.hyungsub = 5; game.player.x = 532; game.player.y = 172; game.player.facing = 'up'; });
  await page.waitForTimeout(200); await page.keyboard.press('KeyC'); await page.waitForTimeout(600); await cap('spring');
  const hp = await page.evaluate(() => ({ hp: game.hpOf('hyungsub'), max: game.maxHpOf('hyungsub'), tb: game.textbox.state }));
  check(hp.hp === hp.max, '마나샘 C → HP 가득 ' + JSON.stringify(hp));
  // 회복 안내창을 닫는다(열린 채면 이동이 막힌다)
  for (let i = 0; i < 6 && await page.evaluate(() => game.dialogue.running || game.textbox.state !== 'closed'); i++) { await page.keyboard.press('KeyC'); await page.waitForTimeout(250); }
  // 2b) 윗길 세로 통로 → 무대 홀(youngcle11): 어둠 막·계단·커튼이 있고 무음, 아래 문으로 다시 윗길
  await page.evaluate(() => { game.player.x = 368; game.player.y = 140; game.player.facing = 'up'; });
  await page.waitForTimeout(800);
  const upHall = await holdUntil('ArrowUp', () => game.mapId === 'youngcle11' && !game.transitioning, 8000);
  await page.waitForTimeout(400); await cap('hall');
  const hall = await page.evaluate(() => ({ map: game.mapId, bgm: game.sound.bgmName ?? null, dark: !!game.entities.find(e => e.id === 'stage11_dark'), stairs: game.entities.filter(e => e.id?.startsWith('stage11_stairs')).length, valance: !!game.entities.find(e => e.id === 'stage11_valance'), player: [Math.round(game.player.x), Math.round(game.player.y)] }));
  check(upHall && hall.map === 'youngcle11' && hall.bgm === null && hall.dark && hall.stairs === 2 && hall.valance, '위 문 → 무대 홀(어둠 막·계단 둘·커튼·무음) ' + JSON.stringify(hall));
  // 첫 입장이면 무대 홀 입장 연출(stage_hall_intro: 뚜울라알라가 무대로 도망 → 억빠맨·경섭 대사)이 먼저 — 끝까지 넘겨야 조작이 돌아온다
  for (let i = 0, t0 = Date.now(); Date.now() - t0 < 40000; i++) {
    const q = await page.evaluate(() => ({ running: game.dialogue.running, box: game.textbox.state }));
    if (!q.running) break;
    if (q.box === 'waiting') await page.keyboard.press('KeyC');
    await page.waitForTimeout(150);
  }
  const introDone = await page.evaluate(() => ({ done: !!game.flags.stage_hall_intro_done, lit: !!game.flags.stage_hall_lit, running: game.dialogue.running }));
  check(introDone.done && introDone.lit && !introDone.running, '무대 홀 입장 연출(뚜울라알라) 뒤 불 켜지고 조작 복귀 ' + JSON.stringify(introDone));
  await page.evaluate(() => { game.player.x = 116; game.player.y = 300; for (const e of game.entities) if (e.def?.type === 'follower') e.snapBehind(); });
  await page.waitForTimeout(300);
  const climbed = await holdUntil('ArrowUp', () => game.player.y < 200, 6000);
  check(climbed, '왼쪽 계단으로 무대에 올라간다 ' + JSON.stringify(await page.evaluate(() => [Math.round(game.player.x), Math.round(game.player.y)]))); await cap('hall_stage');
  // 입장 연출 뒤엔 관객 28명과 관객석 줄(stage11_rope, 틈 x384~416 은 crowd_3 이 막음)이 홀 아래를 막는다 — “줄 아래로는 못 내려간다”(tools/maps/youngcle11.py).
  // 아래 문 자체는 윗길(youngcle10 from_hall)로 이어져 있고, 무대 앞에서 아래로 걸어도 줄 앞에서 멈춘다
  // 왼쪽 계단 끝은 대기실(youngcle12) 문이다 — 윗길 쪽 아래 문으로 다시 들어오면 관객 사이를 지나온 셈으로 무대 앞(404,330)에 선다
  await page.waitForFunction(() => !game.transitioning, null, { timeout: 10000 }).catch(() => {});
  await page.evaluate(() => game.changeMap('youngcle11', 'from_below', true));
  await page.waitForFunction(() => game.mapId === 'youngcle11' && !game.transitioning && !game.dialogue.running && game.fade.alpha < 0.05, null, { timeout: 15000 }).catch(() => {});
  const reentry = await page.evaluate(() => ({ map: game.mapId, x: Math.round(game.player.x), y: Math.round(game.player.y) }));
  check(reentry.map === 'youngcle11' && reentry.x === 404 && reentry.y === 330, '연출 뒤 아래 문 재입장 → 관객 앞 무대 앞(404,330) ' + JSON.stringify(reentry));
  await page.waitForTimeout(400);
  const leftHall = await holdUntil('ArrowDown', () => game.mapId !== 'youngcle11', 2500);
  const blocked = await page.evaluate(() => { const rope = game.entities.find(e => e.id === 'stage11_rope_r'); const door = game.entities.find(e => e.id === 'youngcle11_down'); return { map: game.mapId, y: Math.round(game.player.y), ropeY: rope?.y, door: door && { to: door.def?.to, spawn: door.def?.spawn } }; });
  check(!leftHall && blocked.map === 'youngcle11' && blocked.y + 16 <= blocked.ropeY + 1 && blocked.door?.to === 'youngcle10' && blocked.door?.spawn === 'from_hall', '연출 뒤 홀 아래는 관객석 줄이 막는다(아래 문은 윗길로 연결) ' + JSON.stringify(blocked));
  // 3) 철창이 안 뚫린 상태: 위 문은 잠김(내레이션)
  await page.goto('http://localhost:8000/?qa=park_guardian_after_grate');
  await page.waitForFunction(() => window.game?.player && game.mapId === 'youngcle7' && !game.transitioning && !game.dialogue.running, null, { timeout: 20000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => { game.player.x = 976; game.player.y = 80; game.player.facing = 'up'; });
  await page.waitForTimeout(200); await page.keyboard.down('ArrowUp'); await page.waitForTimeout(700); await page.keyboard.up('ArrowUp'); await page.waitForTimeout(300);
  const locked = await page.evaluate(() => ({ map: game.mapId, running: game.dialogue.running, tb: game.textbox.state }));
  check(locked.map === 'youngcle7' && (locked.running || locked.tb !== 'closed'), '철창 전엔 위 문 잠김(내레이션) ' + JSON.stringify(locked)); await cap('locked');
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
