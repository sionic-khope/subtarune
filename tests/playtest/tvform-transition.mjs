// 변신 영클 전투 — 적 턴 말풍선(패턴별 대사)과 특별 패턴 전환(BUILD218 사용자 정정): 코인 레이저 말풍선 → 미로는 “후후 탈출할수있을까?” 뒤에 열림 →
//   특별(재판): 가운데 점프 → 춤추며 말풍선 → 춤추는 채 TV 확대·TV 화면 안 지지직 → 가로선에서 펼쳐지며 켜짐 → 게임 → 접히며 꺼짐 → 지지직 걷히며 축소 → 제자리 점프.
//   실행: tests/playtest/run.sh tvform-transition
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'tr_' + n + '.png') }); };
const press = async (k, ms = 220) => { await page.keyboard.press(k); await page.waitForTimeout(ms); };
const st = () => page.evaluate(() => { const b = window.game.battle; if (!b) return null; const sp = b.support, g = b.gimmick?.snapshot;
  return { state: b.state, text: (b.text || '').slice(0, 60), bubble: b.bubble?.text || null, turn: sp?.turn, special: sp?.specialKind, gimmick: g || null, ycHp: b.enemies[0]?.hp, members: b.members.map(m => m.hp) }; });
const waitFor = async (fn, ms = 8000) => page.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
const advanceUntil = async (fn, max = 30) => { for (let i = 0; i < max; i++) { const s = await st(); if (s && fn(s)) return s; await press('KeyC', 260); } return await st(); };
const attackRound = async () => { await waitFor(() => window.game.battle.state === 'menu', 20000); for (let m = 0; m < 3; m++) { await press('KeyC', 300); await press('KeyC', 350); } };
const untilMenu = async (ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await st(); if (!s) return null; if (s.state === 'menu') return s; if (s.state === 'text') await press('KeyC', 150); else await page.waitForTimeout(250); } return await st(); };
const phaseShot = async (phase, wait, name) => { const ok = await page.waitForFunction(p => window.game.battle.gimmick?.snapshot?.phase === p, phase, { timeout: 15000 }).then(() => true).catch(() => false); await page.waitForTimeout(wait); await cap(name); return ok; };
try {
  await page.goto('http://localhost:8000/?qa=ship_tvform_battle');
  await page.waitForFunction(() => window.game && window.game.battle && window.game.battle.state === 'intro', null, { timeout: 30000 });
  await page.waitForTimeout(800); await advanceUntil(x => x.state !== 'intro', 10);
  await waitFor(() => window.game.battle.state === 'menu', 20000);
  // ① 코인 레이저(엔진 경로): 준비 말풍선에 패턴 대사
  await attackRound();
  const prep = await waitFor(() => window.game.battle.state === 'enemy-prep' && window.game.battle.bubble, 15000); await page.waitForTimeout(500); await cap('01_lasers_bubble');
  let s = await st(); check(prep && (s.bubble || '').includes('레이저'), '코인 레이저 턴: 말풍선에 패턴 대사 ' + JSON.stringify(s?.bubble));
  await page.evaluate(() => { window.game.battle.soul.invuln = 30; });
  await untilMenu(40000);
  // ② 미로: 한마디 먼저 → 미로
  await page.evaluate(() => { const sp = window.game.battle.support; sp.turn = 1; sp.coinIdx = 1; });
  await attackRound();
  const preOn = await waitFor(() => window.game.battle.gimmick?.snapshot?.pre === true, 15000); await page.waitForTimeout(450); await cap('02_maze_bubble');
  s = await st(); check(preOn && (s.bubble || '').includes('탈출'), '미로 턴: “후후 탈출할수있을까?” 말풍선이 먼저 ' + JSON.stringify(s?.bubble));
  const mazeOpen = await waitFor(() => window.game.battle.gimmick?.snapshot?.pre === false, 8000); await page.waitForTimeout(900); await cap('03_maze_open');
  s = await st(); check(mazeOpen && s.bubble === null && s.gimmick?.open >= 0.99, '말풍선 뒤 미로가 열린다 ' + JSON.stringify([s?.bubble, s?.gimmick?.open]));
  await page.evaluate(() => { window.game.battle.soul.invuln = 60; });
  await untilMenu(45000);
  // ③ 특별(재판): 점프 → 춤+말풍선 → 확대(춤 유지·지지직) → 켜짐 → 게임 → 꺼짐 → 축소 → 복귀
  await page.evaluate(() => { const sp = window.game.battle.support; sp.turn = 0; sp.specialIdx = 2; });
  await attackRound();
  const jump = await waitFor(() => window.game.battle.gimmick?.snapshot?.kind === 'trial' && window.game.battle.gimmick.snapshot.phase === 'jump', 15000); await page.waitForTimeout(250); await cap('04_jump');
  const danceOk = await phaseShot('dance', 900, '05_dance_bubble'); s = await st();
  check(jump && danceOk && (s.bubble || '').includes('재판') && s.gimmick?.ycPose && Math.abs(s.gimmick.ycPose[0] - 240) < 10, '점프 → 가운데서 춤 + 패턴 대사 말풍선 ' + JSON.stringify([s?.bubble, s?.gimmick?.ycPose]));
  const zoomMid = await phaseShot('zoom', 420, '06_zoom_mid'); const poseA = (await st())?.gimmick?.ycPose;
  await page.waitForTimeout(160); const poseB = (await st())?.gimmick?.ycPose; await page.waitForTimeout(300); await cap('07_zoom_static');
  check(zoomMid && poseA && poseB && (poseA[0] !== poseB[0] || poseA[1] !== poseB[1]), '확대 중에도 춤(자세가 계속 움직인다) ' + JSON.stringify([poseA, poseB]));
  const onOk = await phaseShot('on', 180, '08_tv_on'); check(onOk, 'TV 켜짐(가로선에서 펼쳐짐)');
  const gameOk = await phaseShot('game', 300, '09_game'); check(gameOk && (await st())?.gimmick?.phase === 'game' && (await st())?.gimmick?.game, '게임 시작(재판)');
  // 재판 진행: 3번 선택 → 호옥 → 망치 → 끝
  await page.evaluate(() => { window.game.battle.soul.invuln = 60; });
  s = await advanceUntil(x => x.gimmick?.game?.phase === 'question', 60); await page.waitForTimeout(300);
  await page.evaluate(() => { const b = window.game.battle; b.soul.x = 394; b.soul.y = 273; }); await page.waitForTimeout(300); await press('KeyC', 300);
  // 오브젝션 → 호옥 → 망치 → 퇴장: 대사는 C 로 넘긴다(꺼지는 단계가 올 때까지)
  for (let i = 0; i < 80; i++) { const ph = (await st())?.gimmick?.phase; if (ph !== 'game') break; await press('KeyC', 300); }
  const offOk = await phaseShot('off', 150, '10_tv_off'); check(offOk, '게임 끝 → 화면이 접히며 꺼짐');
  const outOk = await phaseShot('zoomout', 300, '11_zoomout'); check(outOk, '지지직 걷히며 축소');
  const backOk = await phaseShot('back', 200, '12_back'); check(backOk, '제자리로 점프');
  const menu = await untilMenu(20000); check(menu?.state === 'menu' && menu.gimmick === null, '전환 뒤 메뉴로 ' + JSON.stringify([menu?.state]));
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
