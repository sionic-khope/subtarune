// 변신 영클 특별 패턴 4 — 팽이 배틀(BUILD218 '너무 쉽다 · 10대는 때려야 · 경기장은 화면 전체'):
//   QA ship_tvform_battle 로 들어가 첫 적 턴을 팽이 배틀로 보내고(turn=0, specialIdx=3) 봇이 영클을 쫓아가 무방비일 때 받아친다.
//   본다: 0프레임부터 화면 전체 경기장(파티 HP 띠 322~ 는 안 가림) · 돌진 예고 · 팅! 비비기 · 10/10 마무리 10 피해.
//   실행: tests/playtest/run.sh tvform-ball
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'ball_' + n + '.png') }); };
const press = async (k, ms = 220) => { await page.keyboard.press(k); await page.waitForTimeout(ms); };
const st = () => page.evaluate(() => { const b = window.game.battle; if (!b) return null; const sp = b.support;
  return { state: b.state, text: (b.text || '').slice(0, 60), turn: sp?.turn, special: sp?.specialKind, gimmick: b.gimmick?.snapshot || null, ycHp: b.enemies[0]?.hp, members: b.members.map(m => m.hp) }; });
const waitFor = async (fn, ms = 8000) => page.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
const advanceUntil = async (fn, max = 30) => { for (let i = 0; i < max; i++) { const s = await st(); if (s && fn(s)) return s; await press('KeyC', 260); } return await st(); };
const attackRound = async () => { await waitFor(() => window.game.battle.state === 'menu', 20000); for (let m = 0; m < 3; m++) { await press('KeyC', 300); await press('KeyC', 350); } };
// 한 번의 왕복으로 스냅샷을 읽고 파티를 회복시킨다(팽이 배틀만 보는 테스트라 전멸로 끊기지 않게)
const tick = () => page.evaluate(() => { const b = window.game.battle; for (const m of b.members) { m.hp = m.maxHp; m.down = false; } return b.gimmick?.snapshot?.game || null; });
const held = new Set();
const setKeys = async (want) => {
  for (const k of [...held]) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k); }
  for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); }
};
try {
  await page.goto('http://localhost:8000/?qa=ship_tvform_battle');
  await page.waitForFunction(() => window.game && window.game.battle && window.game.battle.state === 'intro', null, { timeout: 30000 });
  await page.waitForTimeout(800); await advanceUntil(x => x.state !== 'intro', 10);
  await waitFor(() => window.game.battle.state === 'menu', 20000);
  let s = await st(); check(s.state === 'menu' && s.ycHp === 200, '인트로 뒤 메뉴, 영클 hp 200 ' + JSON.stringify([s.state, s.ycHp]));
  // 첫 적 턴을 특별 4(팽이 배틀)로
  await page.evaluate(() => { const sp = window.game.battle.support; sp.turn = 0; sp.specialIdx = 3; });
  await attackRound();
  const came = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.kind === 'ball', 25000);
  await cap('00_poweron');
  s = await st(); check(came && s.special === 'ball', '특별 4: 팽이 배틀이 시작됐다 ' + JSON.stringify([s.special, s.gimmick?.game?.phase]));
  const hp0 = s.ycHp;
  await page.waitForTimeout(450); await cap('01_arena_start');
  const g0 = await tick();
  check(!!g0 && g0.need === 10, '10대를 때워야 끝난다(need) ' + JSON.stringify([g0?.need]));
  let maxY = 0, teleShot = false, clashShot = false, sawTele = false, sawClash = false, last = g0, ended = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 62000) {
    const g = await tick();
    if (!g || g.kind !== 'ball') break;
    last = g;
    if (g.phase === 'enter') { await page.waitForTimeout(70); continue; }
    if (g.phase !== 'game') { ended = g; break; }
    maxY = Math.max(maxY, g.ball.y + 16, g.yc.y + 40);
    if (g.yc.tele) { sawTele = true; if (!teleShot) { teleShot = true; await cap('02_telegraph'); } }
    if (g.clash) { sawClash = true; if (!clashShot) { clashShot = true; await cap('03_clash'); } }
    const dx = g.yc.x - g.ball.x, dy = g.yc.y - g.ball.y, d = Math.hypot(dx, dy), want = new Set();
    if (dx < -8) want.add('ArrowLeft'); else if (dx > 8) want.add('ArrowRight');
    if (dy < -8) want.add('ArrowUp'); else if (dy > 8) want.add('ArrowDown');
    await setKeys(want);
    if (!g.yc.dashing && !g.clash && !g.ball.dashing && d < 92) await page.keyboard.press('KeyC');
    await page.waitForTimeout(35);
  }
  await setKeys(new Set());
  await cap('04_finish');
  const fin = ended || last;
  check(!!fin && fin.hits >= 10, `무방비일 때 받아쳐 10히트 (${fin?.hits} / ${fin?.need})`);
  check(!!fin && fin.phase === 'finish' && fin.damaged === true, '10히트에서 쿠왕!! 마무리 ' + JSON.stringify([fin?.phase, fin?.damaged]));
  s = await st();
  check(s.ycHp === hp0 - 10, `영클 10 피해 (hp ${hp0}→${s.ycHp})`);
  check(maxY <= 316, `두 공 모두 y ${Math.round(maxY)} ≤ 316 — 파티 HP 띠(322~)를 가리지 않는다`);
  check(sawTele && (fin?.dashes || 0) >= 2, `예고 뒤 돌진이 반복된다 (돌진 ${fin?.dashes}회, 팅! ${fin?.clashes}회)`);
  console.log('ball snapshot', JSON.stringify(fin));
  console.log('clash 봤나', sawClash, 'clashes', fin?.clashes);
  const back = await waitFor(() => window.game.battle.state === 'menu' || window.game.battle.gimmick?.snapshot?.phase === 'outro', 20000);
  await page.waitForTimeout(400); await cap('05_back');
  check(back, '끝나면 지지직으로 전투로 돌아온다');
  check(errors.length === 0, '페이지 오류 없음 ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('CRASH', e.message); await cap('crash'); }
console.log('fails=' + fails);
await browser.close();
