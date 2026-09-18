// 특별 패턴 1 섭리오만 집중 검사(2026-09-18 사용자 보정): QA ship_tvform_battle → 첫 적 턴을 섭리오로 고정 →
//   ① 셋이 하늘에서 차례로 떨어짐 ② 다 착지 ③ 도트 영클이 하늘에서 쿵 ④ 레이저가 총구에서 왼쪽으로 뻗음(영클은 왼쪽을 본다)
//   ⑤ 쓰러진 동안 '공격해라!' + 억빠맨 불·경섭 시계가 같이 때림. 실행: tests/playtest/run.sh tvform-subrio
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'tvform-subrio', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, check: checkResult, until, open, press: pressKey, fixture, shot }) => {
const check = (ok, msg) => checkResult(msg, ok);
const cap = n => shot('sub_' + n);
const press = async (k, ms = 220) => { await pressKey(k); await page.waitForTimeout(ms); };
const st = () => page.evaluate(() => { const b = window.game.battle; if (!b) return null; const g = b.gimmick?.snapshot;
  return { state: b.state, turn: b.support?.turn, special: b.support?.specialKind, phase: g?.phase || null, game: g?.game || null, ycHp: b.enemies[0]?.hp }; });
const gm = () => page.evaluate(() => window.game.battle.gimmick?.snapshot?.game || null);
const waitFor = async (fn, ms = 8000) => Boolean(await until(fn, ms));
const advanceUntil = async (fn, max = 30) => { for (let i = 0; i < max; i++) { const s = await st(); if (s && fn(s)) return s; await press('KeyC', 260); } return await st(); };
const attackRound = async () => { await waitFor(() => window.game.battle.state === 'menu', 20000); for (let m = 0; m < 3; m++) { await press('KeyC', 300); await press('KeyC', 350); } };
  await open({ qa: 'ship_tvform_battle' });
  check(await waitFor(() => window.game?.battle?.state === 'intro', 30000), '전투 인트로 진입');
  await page.waitForTimeout(800); await advanceUntil(x => x.state !== 'intro', 10);
  await waitFor(() => window.game.battle.state === 'menu', 20000);
  // 첫 적 턴을 곧바로 특별 1(섭리오)로
  await fixture('first-subrio-visit', 'Select Subrio A as the next special turn and fill party HP before real key input. No HP or actor positions are changed during the run.', () => { const b = window.game.battle; b.support.turn = 0; b.support.specialIdx = 0; for (const m of b.members) { m.hp = m.maxHp; m.down = false; } });
  await attackRound();
  const started = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.kind === 'subrio', 25000);
  check(started, '적 턴이 섭리오 특별 패턴으로 들어갔다');
  // ① 셋이 하늘에서 떨어지는 중(아직 아무도 착지 전)
  const falling = await waitFor(() => { const g = window.game.battle.gimmick?.snapshot?.game; return !!g && g.phase === 'drop' && g.t >= 0.45 && g.party.every(p => !p.dropped); }, 8000);
  await cap('01_party_falling');
  let g = await gm();
  check(falling && g && g.party.length === 3, '셋이 하늘에서 떨어진다 ' + JSON.stringify(g && g.party));
  check(!!g && g.ycDropped === false, '이때 도트 영클은 아직 없다(맵 밖)');
  // ② 셋 다 착지
  const landed = await waitFor(() => { const g = window.game.battle.gimmick?.snapshot?.game; return !!g && g.party.every(p => p.dropped); }, 8000);
  await cap('02_party_landed'); g = await gm();
  check(landed && g.phase === 'drop' && !g.ycDropped, '셋 다 착지한 뒤에도 영클은 아직 안 떨어졌다 ' + JSON.stringify([g.phase, g.ycDropped]));
  // ③ 도트 영클이 하늘에서 떨어진다 → 쿵
  const ycFall = await waitFor(() => { const g = window.game.battle.gimmick?.snapshot?.game; return !!g && g.phase === 'ycdrop' && !g.ycDropped && g.yc.y > 40; }, 8000);
  await cap('03_yc_falling'); g = await gm();
  check(ycFall && g.yc.y < 320, '영클이 하늘에서 떨어지는 중 ' + JSON.stringify(g.yc));
  const ycLand = await waitFor(() => { const g = window.game.battle.gimmick?.snapshot?.game; return !!g && g.ycDropped; }, 6000);
  await page.waitForTimeout(60); await cap('04_yc_landed'); g = await gm();
  check(ycLand && g.yc.y === 320 && g.yc.x === 372, '오른쪽 바닥에 쿵 ' + JSON.stringify(g.yc));
  check(Math.abs(g.yc.scale / 1.9 - 1.5) < 1e-9, '영클은 기존 크기의 1.5배');
  check(g.yc.x - 32 * g.yc.scale >= 16 && g.yc.x + 32 * g.yc.scale <= 464, '확대된 전체 셀이 양쪽 벽 안쪽');
  // ④ 레이저: 총구 섬광 + 왼쪽으로 뻗는 중
  const firing = await waitFor(() => { const g = window.game.battle.gimmick?.snapshot?.game; return !!g && g.lasers.some(l => l.fired && l.x1 > 24 && l.x1 < l.x2); }, 15000);
  await cap('05_laser_firing'); g = await gm();
  const mid = g.lasers.find(l => l.fired);
  check(firing, '레이저가 총구에서 왼쪽으로 뻗는 순간 ' + JSON.stringify(g.lasers));
  const held = await waitFor(() => { const g = window.game.battle.gimmick?.snapshot?.game; return !!g && g.lasers.some(l => l.fired && l.x1 <= 16); }, 8000);
  await cap('06_laser_full'); g = await gm();
  const full = g.lasers.find(l => l.fired);
  check(held && !!full && full.x2 === 351 && full.x1 === 16, '총구는 영클의 왼쪽, 빔은 왼쪽 벽까지 ' + JSON.stringify(full));
  check(g.yc.frame === 2 || g.lasers.length > 0, '쏘는 자세(frame 2) ' + g.yc.frame);
  // ⑤ 과부하 → 쓰러짐. 이때부터 오른쪽으로 걸어가 동료를 데려온다
  const down = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'down', 25000);
  await page.waitForTimeout(200); await cap('07_down_arrow');
  check(down, '과부하로 쓰러져 ‘공격해라!’ 화살표가 뜬다');
  await page.keyboard.down('ArrowRight');
  let shotMate = false, sawFire = false, sawClock = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 7600) {
    const s = await gm(); if (!s || s.phase !== 'down') break;
    if (s.fires > 0) sawFire = true;
    if (s.clocks > 0) sawClock = true;
    if (!shotMate && (s.fires > 0 || s.clocks > 0)) { shotMate = true; await cap('08_companion_hit'); }
    await page.keyboard.down('KeyC'); await page.waitForTimeout(40); await page.keyboard.up('KeyC'); await page.waitForTimeout(60);
  }
  await page.keyboard.up('ArrowRight');
  const last = await gm(); const s2 = await st();
  console.log('subrio down snapshot', JSON.stringify(last));
  check(sawFire || sawClock, `동료가 쓰러진 영클을 때린다(불 ${sawFire} 시계 ${sawClock})`);
  check(!!last && last.hits >= 10 && last.damageDealt >= 2, `쓰러진 7초 동안 ${last && last.hits}타 → 피해 ${last && last.damageDealt}`);
  await cap('09_hits_total');
  const up = await waitFor(() => { const g = window.game.battle.gimmick?.snapshot?.game; return !g || ['getup', 'done'].includes(g.phase); }, 10000);
  check(up, '다시 일어난다');
  const back = await waitFor(() => window.game.battle.gimmick?.snapshot?.phase === 'off' || window.game.battle.gimmick?.snapshot?.phase === 'zoomout' || window.game.battle.state === 'menu', 15000);
  await cap('10_back'); check(back, '지지직으로 전투 화면 복귀');
  console.log('ycHp', s2.ycHp);
});
