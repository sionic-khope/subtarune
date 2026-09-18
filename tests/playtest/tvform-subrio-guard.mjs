// 섭리오 특별 패턴 — 레이저 피해 규칙(2026-09-18 사용자 “한 대만 맞는 거라고, 방어할 때 왜 안 막히냐”):
//   X(방패)를 든 채 오른쪽(영클)을 보고 있으면 레이저에 피해가 없고, 방패를 내리면 레이저 한 줄에 정확히 15 한 번. 페이지 오류 없음. 실행: tests/playtest/run.sh tvform-subrio-guard
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'tvform-subrio-guard', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, check: checkResult, until, open, press: pressKey, fixture, shot }) => {
const check = (ok, msg) => checkResult(msg, ok);
const cap = n => shot('guard_' + n);
const press = async (k, ms = 220) => { await pressKey(k); await page.waitForTimeout(ms); };
const st = () => page.evaluate(() => { const b = window.game.battle; if (!b) return null; const g = b.gimmick?.snapshot; return { state: b.state, phase: g?.phase, game: g?.game ? { phase: g.game.phase, hero: g.game.hero, lasers: g.game.lasers } : null, members: b.members.map(m => m.hp), max: b.members.map(m => m.maxHp) }; });
const waitFor = async (fn, ms = 8000) => Boolean(await until(fn, ms));
  await open({ qa: 'ship_tvform_battle' });
  check(await waitFor(() => window.game?.battle?.state === 'intro', 30000), '전투 인트로 진입');
  await page.waitForTimeout(800); for (let i = 0; i < 10; i++) { const s = await st(); if (s.state !== 'intro') break; await press('KeyC', 260); }
  await waitFor(() => window.game.battle.state === 'menu', 20000);
  await fixture('first-subrio-ground-lasers', 'Select Subrio A and make its random laser choice deterministic at floor height so guard and exact unguarded damage are both exercised. All subsequent guard and movement use real keyboard input.', () => { const b = window.game.battle; b.support.turn = 0; b.support.specialIdx = 0; b.rnd = () => 0; });
  for (let m = 0; m < 3; m++) { await press('KeyC', 300); await press('KeyC', 350); }
  const lasersOn = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'lasers', 40000);
  check(lasersOn, '레이저 단계 진입');
  // 오른쪽(영클)을 보고 방패: 오른쪽 살짝 → X 누른 채 7초(레이저 4~5줄)
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(120); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(100);
  await page.keyboard.down('KeyX');
  const total = values => values.reduce((sum, value) => sum + value, 0);
  let minHp = Infinity, fired = 0, lastFired = 0, capturedBlock = false; const t0 = Date.now();
  while (Date.now() - t0 < 7000) { const s = await st(); if (!s?.game || s.game.phase !== 'lasers') break; minHp = Math.min(minHp, total(s.members)); const f = s.game.lasers.filter(l => l.fired).length; if (f > lastFired) fired += f - lastFired; lastFired = f; if (f && !capturedBlock) { capturedBlock = true; await cap('01_block'); } await page.waitForTimeout(80); }
  await page.keyboard.up('KeyX');
  let s = await st(); check(fired >= 2 && minHp === total(s.max), `방패로 막는 동안 피해 0 (레이저 ${fired}줄, 최소 HP ${minHp}/${total(s.max)})`);
  // 방패를 내리고 서 있기: 레이저마다 정확히 15 한 번
  const hp0 = total(s.members); const drops = []; let prev = hp0; const t1 = Date.now();
  // 레이저 단계가 끝날 때까지(최대 14초) 서서 맞는다 — 바닥 높이 레이저가 올 때마다 정확히 15 한 번
  while (Date.now() - t1 < 14000) { s = await st(); if (!s?.game || s.game.phase !== 'lasers') break; if (total(s.members) < prev) { drops.push(prev - total(s.members)); prev = total(s.members); await cap('02_hit'); } await page.waitForTimeout(60); }
  check(drops.length >= 1 && drops.every(d => d === 15), `맞으면 한 번에 15 (${JSON.stringify(drops)}${drops.length ? '' : ' — 바닥 높이 레이저 없음'})`);
});
