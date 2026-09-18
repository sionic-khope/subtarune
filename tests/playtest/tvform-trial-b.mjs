// 영클의 마녀재판 B(BUILD220 사용자 브리핑): 재판은 두 번째 방문부터 B 판(따뜻한비데 부당 해고, 옆에 우는 따뜻한비데, 3번 “너네엄마가 사장이였어도…” 가 정답 → 소레와 오카시요 → 호옥! → 망치 10).
//   A 를 한 번 지난 뒤 다시 재판으로 보내 B 를 본다. 실행: tests/playtest/run.sh tvform-trial-b
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'trb_' + n + '.png') }); };
const press = async (k, ms = 220) => { await page.keyboard.press(k); await page.waitForTimeout(ms); };
const st = () => page.evaluate(() => { const b = window.game.battle; if (!b) return null; const g = b.gimmick?.snapshot; return { state: b.state, text: (b.text || '').slice(0, 80), variant: g?.variant, phase: g?.phase, game: g?.game ? { phase: g.game.phase, trialIndex: g.game.trialIndex, chargeLines: g.game.chargeLines, choiceTexts: g.game.choiceTexts, gavelHit: g.game.gavelHit, speech: (g.game.currentSpeech || '').slice(0, 80) } : null, ycHp: b.enemies[0]?.hp }; });
const waitFor = async (fn, ms = 8000) => page.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
const advanceUntil = async (fn, max = 60) => { for (let i = 0; i < max; i++) { const s = await st(); if (s && fn(s)) return s; await press('KeyC', 260); } return await st(); };
const attackRound = async () => { await waitFor(() => window.game.battle.state === 'menu', 20000); for (let m = 0; m < 3; m++) { await press('KeyC', 300); await press('KeyC', 350); } };
const untilMenu = async (ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await st(); if (!s) return null; if (s.state === 'menu') return s; if (s.state === 'text') await press('KeyC', 150); else await page.waitForTimeout(250); } return await st(); };
const playTrial = async (tag) => {
  const on = await waitFor(() => window.game.battle.gimmick?.snapshot?.kind === 'trial' && window.game.battle.gimmick.snapshot.phase === 'game', 20000);
  const hp0 = (await st())?.ycHp;   // 특별 패턴이 시작된 뒤 기준(평타 피해 제외)
  let s = await advanceUntil(x => x.game?.phase === 'question', 60); await page.waitForTimeout(400); await cap(tag + '_question'); s = await st();
  await page.evaluate(() => { const b = window.game.battle; b.soul.x = 394; b.soul.y = 273; }); await page.waitForTimeout(300); await press('KeyC', 300);
  for (let i = 0; i < 80; i++) { const ph = (await st())?.phase; if (ph !== 'game') break; const g = (await st())?.game; if (g?.phase === 'shock' && !fs.existsSync(path.join(shots, 'trb_' + tag + '_shock.png'))) await cap(tag + '_shock'); await press('KeyC', 300); }
  return { on, s, hp0 };
};
try {
  await page.goto('http://localhost:8000/?qa=ship_tvform_battle');
  await page.waitForFunction(() => window.game && window.game.battle && window.game.battle.state === 'intro', null, { timeout: 30000 });
  await page.waitForTimeout(800); await advanceUntil(x => x.state !== 'intro', 10);
  await waitFor(() => window.game.battle.state === 'menu', 20000);
  await page.evaluate(() => { window.game.battle.soul.invuln = 99; for (const m of window.game.battle.members) m.hp = m.maxHp; });
  // ① 첫 방문 = A(파크가디언 사건)
  await page.evaluate(() => { const sp = window.game.battle.support; sp.turn = 0; sp.specialIdx = 2; });
  await attackRound();
  let r = await playTrial('a'); check(r.on && r.s.variant === 'a' && r.s.game?.trialIndex === 0 && JSON.stringify(r.s.game?.choiceTexts || []).includes('임금체불'), '첫 재판은 A(파크가디언, 임금체불 선택지) ' + JSON.stringify([r.s.variant, r.s.game?.trialIndex]));
  await untilMenu(30000);
  // ② 두 번째 방문 = B(따뜻한비데 부당 해고)
  await page.evaluate(() => { const sp = window.game.battle.support; sp.turn = 0; sp.specialIdx = 2; });
  await attackRound();
  r = await playTrial('b');
  check(r.on && r.s.variant === 'b' && r.s.game?.trialIndex === 1, '두 번째 재판은 B ' + JSON.stringify([r.s.variant, r.s.game?.trialIndex]));
  check((r.s.game?.chargeLines || []).join('').includes('따뜻한비데') && (r.s.game?.chargeLines || []).join('').includes('정당한 해고사유없이'), '죄목 대사 원문(따뜻한비데 부당 해고) ' + JSON.stringify(r.s.game?.chargeLines));
  check(JSON.stringify(r.s.game?.choiceTexts || []) === JSON.stringify(['맞습니다', '비데 애미창년아 그걸꼰지르냐', '너네엄마가 사장이였어도 잘랐을거다 꼬라지를 봐라']), '선택지 3개 원문 ' + JSON.stringify(r.s.game?.choiceTexts));
  const s = await st(); check(s.ycHp === r.hp0 - 10, '3번 → 호옥! → 망치 10 피해 ' + JSON.stringify([r.hp0, s.ycHp]));
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
