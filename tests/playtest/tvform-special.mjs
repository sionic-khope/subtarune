// 변신 영클 특별 패턴 4종(BUILD216): QA ship_tvform_battle → 인트로 넘김 → 적 턴이 일반(코인) → 특별 순으로 번갈아 —
//   특별 1 섭리오(점프·춤·TV 확대 → 정사각 맵 → 도트 영클 레이저 → 과부하로 쓰러짐 → 7초 동안 창으로 때리기 5대=1 피해 → 일어남 → 지지직 복귀)
//   특별 2 리듬(패드 삐용 → 브금 박자 노트 15초, 봇이 맞춤 → 3회 미만이면 우는 영클 10 피해)  특별 3 마녀재판(3번 “임금체불은 안했다” → 소레와 오카시요 → 호옥! → 망치 낙하 10 피해)
//   특별 4 팽이 배틀(무방비일 때 10번 맞히면 10 피해, 자세한 검사는 tests/playtest/tvform-ball.mjs). 실행: tests/playtest/run.sh tvform-special
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'tvs_' + n + '.png') }); };
const press = async (k, ms = 220) => { await page.keyboard.press(k); await page.waitForTimeout(ms); };
const st = () => page.evaluate(() => { const b = window.game.battle; if (!b) return null; const sp = b.support, g = b.gimmick?.snapshot;
  return { state: b.state, text: (b.text || '').slice(0, 60), turn: sp?.turn, special: sp?.specialKind, gimmick: g || null, ycHp: b.enemies[0]?.hp, members: b.members.map(m => m.hp), soul: { x: Math.round(b.soul.x), y: Math.round(b.soul.y) } }; });
const waitFor = async (fn, ms = 8000) => page.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
const god = () => page.evaluate(() => { window.game.battle.soul.invuln = 5; for (const m of window.game.battle.members) { m.hp = m.maxHp; m.down = false; } });
const advanceUntil = async (fn, max = 30) => { for (let i = 0; i < max; i++) { const s = await st(); if (s && fn(s)) return s; await press('KeyC', 260); } return await st(); };
const attackRound = async () => { await waitFor(() => window.game.battle.state === 'menu', 20000); for (let m = 0; m < 3; m++) { await press('KeyC', 300); await press('KeyC', 350); } };
const untilMenu = async (ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await st(); if (!s) return null; if (s.state === 'menu') return s; if (s.state === 'text') await press('KeyC', 150); if (s.state === 'bullets' || s.state === 'enemy-mode') await god(); await page.waitForTimeout(120); } return await st(); };
try {
  await page.goto('http://localhost:8000/?qa=ship_tvform_battle');
  await page.waitForFunction(() => window.game && window.game.battle && window.game.battle.state === 'intro', null, { timeout: 30000 });
  await page.evaluate(() => { const snd = window.game.sound; window.__sfx = []; const orig = snd.sfx.bind(snd); snd.sfx = (name, opts) => { window.__sfx.push(name); return orig(name, opts); }; });
  await page.waitForTimeout(800); await advanceUntil(x => x.state !== 'intro', 10);
  await waitFor(() => window.game.battle.state === 'menu', 20000);
  let s = await st(); check(s.state === 'menu' && s.ycHp === 200, '인트로 뒤 메뉴, 영클 hp 200 ' + JSON.stringify([s.state, s.ycHp]));
  // 턴 0(일반 코인) 넘기기
  await attackRound(); await untilMenu();
  // ── 특별 1 섭리오 ──
  await attackRound();
  const jump = await waitFor(() => window.game.battle.state === 'enemy-mode' && window.game.battle.gimmick?.snapshot?.kind === 'subrio', 15000);
  s = await st(); check(jump && s.special === 'subrio' && ['jump', 'dance'].includes(s.gimmick.phase), '특별 1: 영클이 가운데로 점프해 춤 ' + JSON.stringify([s.special, s.gimmick?.phase]));
  await waitFor(() => window.game.battle.gimmick?.snapshot?.phase === 'dance', 4000); await page.waitForTimeout(700); await cap('01_dance');
  const zoomed = await waitFor(() => window.game.battle.gimmick?.snapshot?.phase === 'zoom', 4000); await page.waitForTimeout(600); await cap('02_zoom_tv');
  const gameOn = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.kind === 'subrio', 5000);
  check(zoomed && gameOn, 'TV 확대 → 지지직 → 섭리오 화면 ' + JSON.stringify([zoomed, gameOn]));
  const lasersOn = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.lasers?.some(l => l.fired), 12000); await page.waitForTimeout(150); await cap('03_subrio_laser');
  s = await st(); check(lasersOn && s.gimmick.game.yc.x === 424, '도트 영클이 오른쪽에서 걸어와 레이저를 쏜다 ' + JSON.stringify([lasersOn, s.gimmick?.game?.yc]));
  const hpBefore = s.ycHp;
  const down = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'down', 20000); await page.waitForTimeout(300); await cap('04_subrio_down');
  check(down, '과부하로 쓰러짐(공격해라 화살표)');
  // 봇: 쓰러진 동안 C 연타(창) — 요플래는 왼쪽에 서 있고 창이 오른쪽으로 날아가 몸에 맞는다
  const t0 = Date.now(); while (Date.now() - t0 < 7200) { const g = (await st())?.gimmick?.game; if (!g || g.phase !== 'down') break; await page.keyboard.down('KeyC'); await page.waitForTimeout(40); await page.keyboard.up('KeyC'); await page.waitForTimeout(70); }
  s = await st(); await cap('05_subrio_hits'); console.log('subrio down snapshot', JSON.stringify(s.gimmick?.game));
  const gotUp = await waitFor(() => ['getup', 'done'].includes(window.game.battle.gimmick?.snapshot?.game?.phase) || ['off', 'zoomout', 'back', 'done'].includes(window.game.battle.gimmick?.snapshot?.phase), 10000);
  check(gotUp && s.gimmick.game.hits >= 10 && s.gimmick.game.damageDealt >= 2 && s.ycHp === hpBefore - s.gimmick.game.damageDealt, `쓰러진 7초 동안 창으로 ${s.gimmick?.game?.hits}타 → 피해 ${s.gimmick?.game?.damageDealt}(5타당 1, 영클 hp ${hpBefore}→${s.ycHp}) → 다시 일어남`);
  const outro = await waitFor(() => ['off', 'zoomout', 'back', 'done'].includes(window.game.battle.gimmick?.snapshot?.phase), 8000); await page.waitForTimeout(300); await cap('06_noise_back');
  check(outro, '지지직 노이즈로 원상복구');
  await untilMenu(30000); await attackRound(); await untilMenu();   // 일반 코인 턴
  // ── 특별 2 리듬 ──
  await attackRound();
  const rh = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.kind === 'rhythm', 15000);
  s = await st(); check(rh && s.special === 'rhythm', '특별 2: 리듬 화면 ' + JSON.stringify([s.special, s.gimmick?.game?.phase]));
  // 패드 삐용은 TV 가 켜지는 연출(on)이 끝나고 게임이 돌기 시작할 때 난다 — 시간 대신 소리를 기다린다
  const bell = await waitFor(() => (window.__sfx || []).slice(-40).includes('bell'), 8000);
  const sfxA = await page.evaluate(() => window.__sfx.slice(-30)); check(bell, '패드 삐용(bell) 뒤 등장 ' + JSON.stringify(sfxA.slice(-6)));
  await page.waitForTimeout(1200); await cap('07_rhythm_pads');
  const hp2 = s.ycHp;
  // 봇: 다음 노트 시각에 맞춰 레인 키
  const t1 = Date.now(); let pressed = 0, firstShot = false;
  while (Date.now() - t1 < 22000) { const g = (await page.evaluate(() => window.game.battle.gimmick?.snapshot?.game || null)); if (!g || g.kind !== 'rhythm') break; if (g.phase !== 'play') { if (['after', 'cry', 'done'].includes(g.phase)) break; await page.waitForTimeout(60); continue; }
    if (g.next !== null && g.next - g.time <= 0.05 && g.next - g.time > -0.1) { await page.keyboard.press(g.nextLane === 'L' ? 'ArrowLeft' : 'ArrowRight'); pressed++; if (!firstShot && pressed > 3) { firstShot = true; await cap('08_rhythm_play'); } await page.waitForTimeout(40); }
    else await page.waitForTimeout(15); }
  const cry = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'cry', 6000); await page.waitForTimeout(1500); await cap('09_rhythm_cry');
  const cried = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.cried, 4000); s = await st();
  check(cry && cried && s.gimmick.game.misses < 3 && s.gimmick.game.greats >= 15 && s.ycHp === hp2 - 10, `리듬 15초: GREAT ${s.gimmick?.game?.greats} MISS ${s.gimmick?.game?.misses} → 3회 미만이라 영클이 감동해 울며 10 피해(hp ${hp2}→${s.ycHp})`);
  await untilMenu(30000); await attackRound(); await untilMenu();
  // ── 특별 3 마녀재판 ──
  await attackRound();
  const tr = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'opening', 20000);
  s = await st(); check(tr && (s.text || '').includes('영클의 마녀재판'), '특별 3: “자자 영클의 마녀재판 개정하겠습니다.” ' + JSON.stringify([s.text]));
  await cap('10_trial_open');
  s = await advanceUntil(x => x.gimmick?.game?.phase === 'read-question', 12); await page.waitForTimeout(1300); await cap('11_trial_charge');
  check(s?.gimmick?.game?.phase === 'read-question' && (s.text || '').includes('피고인 요플래'), '죄목 대사(파크가디언 울면서 페이드인) ' + JSON.stringify([s?.text]));
  s = await advanceUntil(x => x.gimmick?.game?.phase === 'question', 40); await page.waitForTimeout(400); await cap('12_trial_choices');
  check(s?.gimmick?.game?.phase === 'question' && JSON.stringify(s.gimmick.game.choiceTexts || []).includes('임금체불'), '선택지 3개(임금체불은 안했다 포함) ' + JSON.stringify(s?.gimmick?.game?.choiceTexts));
  const hp3 = s.ycHp;
  await page.evaluate(() => { const so = window.game.battle.soul; so.x = 394; so.y = 273; }); await page.waitForTimeout(300); await press('KeyC', 400);
  const obj = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'objection', 4000); await page.waitForTimeout(500); await cap('13_objection');
  const shock = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'shock', 8000); s = await st(); await cap('14_shock');
  check(obj && shock && (s.text || '').includes('호옥'), '3번 → 소레와 오카시요! → 영클 “호옥!” ' + JSON.stringify([obj, shock, s?.text]));
  await advanceUntil(x => x.gimmick?.game?.phase === 'gavel', 8);
  const gavel = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.gavelHit, 4000); await page.waitForTimeout(200); await cap('15_gavel_hit'); s = await st();
  check(gavel && s.ycHp === hp3 - 10, `망치를 놓쳐 머리에 맞고 10 피해(hp ${hp3}→${s.ycHp})`);
  await untilMenu(30000); await attackRound(); await untilMenu();
  // ── 특별 4 팽이 배틀 ──
  await attackRound();
  const bl = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'game' && window.game.battle.gimmick?.snapshot?.game?.kind === 'ball', 20000);
  s = await st(); check(bl && s.special === 'ball', '특별 4: 팽이 배틀(영클 거대 공) ' + JSON.stringify([s.special]));
  const hp4 = s.ycHp; let clashSeen = false, shot4 = false;
  const t2 = Date.now();
  while (Date.now() - t2 < 56000) { const g = await page.evaluate(() => window.game.battle.gimmick?.snapshot?.game || null); if (!g || g.kind !== 'ball' || g.phase !== 'game') break; await god();
    if (g.clash) clashSeen = true;
    const dx = g.yc.x - g.ball.x, dy = g.yc.y - g.ball.y, dist = Math.hypot(dx, dy), keys = [];
    if (dx < -8) keys.push('ArrowLeft'); else if (dx > 8) keys.push('ArrowRight');
    if (dy < -8) keys.push('ArrowUp'); else if (dy > 8) keys.push('ArrowDown');
    for (const k of keys) await page.keyboard.down(k);
    await page.waitForTimeout(45);
    for (const k of keys) await page.keyboard.up(k);
    if (!g.yc.dashing && !g.clash && !g.ball.dashing && dist < 92) { await page.keyboard.press('KeyC'); if (!shot4) { shot4 = true; await page.waitForTimeout(150); await cap('16_ball_duel'); } }
    await page.waitForTimeout(35); }
  const fin = await waitFor(() => ['finish', 'done'].includes(window.game.battle.gimmick?.snapshot?.game?.phase) || window.game.battle.gimmick?.snapshot?.phase !== 'game', 8000); s = await st(); await cap('17_ball_end');
  const ballHits = s.gimmick?.game?.hits ?? (await page.evaluate(() => window.__lastBallHits || 0));
  check(fin && (s.ycHp <= hp4 - 10 || ballHits >= 10), `팽이 배틀: 무방비일 때 맞혀 10히트 → 10 피해(hp ${hp4}→${s.ycHp}, hits ${ballHits})`);
  const order = await page.evaluate(() => window.game.battle.support.specialIdx);
  check(order === 4, '특별 4종이 일반 턴과 번갈아 한 번씩 나왔다 ' + order);
  check(errors.length === 0, '페이지 오류 없음 ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('CRASH', e.message); await cap('crash'); }
console.log('fails=' + fails);
await browser.close();
