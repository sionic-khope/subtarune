// 특별 패턴 1 섭리오 B 판(2026-09-18 사용자 “가로로 긴맵(치지직 맵)에 영클이 비데처럼 위에서 내려찍는 패턴을 여러번, 피하다가 발 헛디디면 때릴 타이밍”):
//   QA ship_tvform_battle → 섭리오를 두 번째 방문으로 만들어 B 를 바로 본다 →
//   ① 가로로 긴 치지직 맵에서 카메라가 요플래를 따라 흐름 ② 지지직 하며 사라짐 ③ 바닥 영역 표시 ④ 하늘에서 낙하 ⑤ 내려찍기 착지
//   ⑥ 마지막에 발을 헛디뎌 넘어짐 ⑦ ‘공격해라!’ 창·동료 공격. 실행: tests/playtest/run.sh tvform-subrio-b
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'subb_' + n + '.png') }); };
const press = async (k, ms = 220) => { await page.keyboard.press(k); await page.waitForTimeout(ms); };
const st = () => page.evaluate(() => { const b = window.game.battle; if (!b) return null; const g = b.gimmick?.snapshot;
  return { state: b.state, variant: b.support?.specialVariant, special: b.support?.specialKind, phase: g?.phase || null, game: g?.game || null, ycHp: b.enemies[0]?.hp }; });
const gm = () => page.evaluate(() => window.game.battle.gimmick?.snapshot?.game || null);
const waitFor = async (fn, ms = 8000) => page.waitForFunction(fn, null, { timeout: ms, polling: 'raf' }).then(() => true).catch(() => false);
const god = () => page.evaluate(() => { for (const m of window.game.battle.members) { m.hp = m.maxHp; m.down = false; } });
const advanceUntil = async (fn, max = 30) => { for (let i = 0; i < max; i++) { const s = await st(); if (s && fn(s)) return s; await press('KeyC', 260); } return await st(); };
const attackRound = async () => { await waitFor(() => window.game.battle.state === 'menu', 20000); for (let m = 0; m < 3; m++) { await press('KeyC', 300); await press('KeyC', 350); } };
try {
  await page.goto('http://localhost:8000/?qa=ship_tvform_battle');
  await page.waitForFunction(() => window.game && window.game.battle && window.game.battle.state === 'intro', null, { timeout: 30000 });
  await page.waitForTimeout(800); await advanceUntil(x => x.state !== 'intro', 10);
  await waitFor(() => window.game.battle.state === 'menu', 20000);
  // 섭리오를 한 번 '방문' 시켜 두고(A 판은 건너뛴다) 다음 적 턴이 두 번째 방문 = B 판이 되게 한다
  await page.evaluate(() => { const sp = window.game.battle.support; sp.turn = 0; sp.specialIdx = 0; sp.enemyModeFor(); sp.turn = 0; sp.specialIdx = 0; });
  await attackRound();
  const started = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.kind === 'subrio', 25000);
  let s = await st();
  check(started && s.game.variant === 'b', '두 번째 방문이라 B 판으로 들어갔다 ' + JSON.stringify([s.variant, s.game && s.game.variant]));
  // ① 파티 착지 뒤 오른쪽으로 달려 카메라가 흐르는지
  await waitFor(() => { const g = window.game.battle.gimmick?.snapshot?.game; return !!g && g.party.every(p => p.dropped); }, 10000);
  await page.keyboard.down('ArrowRight');
  const scrolled = await waitFor(() => (window.game.battle.gimmick?.snapshot?.game?.cam || 0) > 60, 8000);
  await cap('b01_long_map_scrolled'); const g1 = await gm();
  check(scrolled && g1.cam > 60, `가로로 긴 맵에서 카메라가 따라 흐른다 (cam ${g1 && g1.cam})`);
  await page.keyboard.up('ArrowRight');
  // ② 사라짐
  const vanish = await waitFor(() => { const g = window.game.battle.gimmick?.snapshot?.game; return !!g && g.phase === 'vanish'; }, 12000);
  await cap('b02_vanish'); let g2 = await gm();
  check(vanish && ['vanish', 'marker'].includes(g2.phase), '지지직 하며 사라진다 ' + JSON.stringify([g2 && g2.phase, g2 && g2.ycVisible]));
  // ③ 영역 표시(영클은 안 보인다)
  const marked = await waitFor(() => { const g = window.game.battle.gimmick?.snapshot?.game; return !!g && g.phase === 'marker' && g.marker; }, 6000);
  await cap('b03_marker'); g2 = await gm();
  check(marked && g2.marker && g2.ycVisible === false, '바닥에 내려찍기 영역이 뜨고 영클은 사라진 상태 ' + JSON.stringify([g2 && g2.marker, g2 && g2.ycVisible]));
  check(!!g2.marker && Math.abs(g2.marker.x - (g2.hero.x + 8)) < 90, '영역은 요플래 자리를 노린다 ' + JSON.stringify([g2 && g2.marker && g2.marker.x, g2 && g2.hero.x]));
  // ④ 하늘에서 낙하
  const diving = await waitFor(() => { const g = window.game.battle.gimmick?.snapshot?.game; return !!g && g.phase === 'dive' && g.yc.y > 185 && g.yc.y < 312; }, 6000);
  await cap('b04_dive'); g2 = await gm();
  check(diving, '하늘에서 내려찍으러 떨어진다 ' + JSON.stringify(g2 && g2.yc));
  // ⑤ 착지
  const slammed = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'slam', 6000);
  await page.waitForTimeout(70); await cap('b05_slam'); g2 = await gm();
  check(slammed && g2.slams >= 1, `내려찍기 착지 ${g2 && g2.slams}번째`);
  // ⑥ 여러 번 반복하다 마지막에 발을 헛디딘다. 그동안 좌우로 피한다
  let dir = 'ArrowRight';
  const t0 = Date.now(); let seenSlams = 0, shotStumble = false;
  while (Date.now() - t0 < 30000) {
    const g = await gm(); if (!g) break;
    await god();
    if (g.slams > seenSlams) { seenSlams = g.slams; dir = dir === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight'; }
    if (g.phase === 'stumble') { if (!shotStumble) { shotStumble = true; await page.keyboard.up(dir); await cap('b06_stumble'); } break; }
    if (g.phase === 'down') break;
    await page.keyboard.down(dir); await page.waitForTimeout(90); await page.keyboard.up(dir);
  }
  g2 = await gm();
  check(shotStumble || (g2 && g2.phase === 'down'), `${seenSlams}번 내려찍은 뒤 발을 헛디뎌 넘어진다 (phase ${g2 && g2.phase})`);
  const down = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'down', 8000);
  await page.waitForTimeout(200); await cap('b07_down_arrow'); g2 = await gm();
  check(down && g2.slams === 5, `5번 내려찍고 ‘공격해라!’ 창이 열린다 (slams ${g2 && g2.slams})`);
  console.log('facing after passing', JSON.stringify(g2 && g2.yc));
  // ⑦ 창 연타 + 동료 공격
  const hpBefore = (await st()).ycHp;
  let sawMate = false, shotMate = false;
  const t1 = Date.now();
  while (Date.now() - t1 < 7600) {
    const g = await gm(); if (!g || g.phase !== 'down') break;
    await god();
    if (g.fires > 0 || g.clocks > 0) { sawMate = true; if (!shotMate) { shotMate = true; await cap('b08_companion_hit'); } }
    await page.keyboard.down('KeyC'); await page.waitForTimeout(40); await page.keyboard.up('KeyC'); await page.waitForTimeout(60);
  }
  const last = await gm(); const s2 = await st();
  console.log('subrio-b down snapshot', JSON.stringify(last));
  check(sawMate, '동료(억빠맨 불·경섭 시계)도 쓰러진 영클을 때린다');
  check(!!last && last.hits >= 10 && last.damageDealt >= 2 && s2.ycHp === hpBefore - last.damageDealt, `${last && last.hits}타 → 피해 ${last && last.damageDealt} (hp ${hpBefore}→${s2.ycHp})`);
  await cap('b09_hits_total');
  const up = await waitFor(() => { const g = window.game.battle.gimmick?.snapshot?.game; return !g || ['getup', 'done'].includes(g.phase); }, 10000);
  check(up, '다시 일어난다');
  const back = await waitFor(() => ['off', 'zoomout', 'back'].includes(window.game.battle.gimmick?.snapshot?.phase) || window.game.battle.state === 'menu', 15000);
  await cap('b10_back'); check(back, '지지직으로 전투 화면 복귀');
  check(errors.length === 0, '페이지 오류 없음 ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('CRASH', e.message); await cap('crash'); }
console.log('fails=' + fails);
await browser.close();
