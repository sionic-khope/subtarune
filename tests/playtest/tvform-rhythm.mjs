// 변신 영클 특별 패턴 2 리듬(BUILD217): QA ship_tvform_battle → 첫 적 턴을 리듬으로 돌려(support.turn/specialIdx) 확인한다.
//   TV 가 켜지며 뚜울라 무대 화면(배경·TV·스포트라이트·바닥 원·밴드 셋·관객·인기 기둥·가운데 기둥) → 패드 삐용 → 브금 멜로디 노트 15초 →
//   “* 영클이 감동한다!” → 우는 영클(70%)이 올라와 눈물 터짐 10 피해. 봇은 페이지 안 rAF 로 노트 시각에 맞춰 ←/→ 를 친다.
// 실행: tests/playtest/run.sh tvform-rhythm
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'tvrh_' + n + '.png') }); };
const press = async (k, ms = 220) => { await page.keyboard.press(k); await page.waitForTimeout(ms); };
const st = () => page.evaluate(() => { const b = window.game.battle; if (!b) return null; const g = b.gimmick?.snapshot;
  return { state: b.state, text: (b.text || '').slice(0, 40), special: b.support?.specialKind, phase: g?.phase || null, game: g?.game || null, ycHp: b.enemies[0]?.hp, members: b.members.map(m => m.hp) }; });
const waitFor = async (fn, ms = 8000) => page.waitForFunction(fn, null, { timeout: ms }).then(() => true).catch(() => false);
const advanceUntil = async (fn, max = 30) => { for (let i = 0; i < max; i++) { const s = await st(); if (s && fn(s)) return s; await press('KeyC', 260); } return await st(); };
const attackRound = async () => { await waitFor(() => window.game.battle.state === 'menu', 20000); for (let m = 0; m < 3; m++) { await press('KeyC', 300); await press('KeyC', 350); } };
// 노트 시각에 맞춰 페이지 안에서 ←/→ (keydown+keyup 을 같은 프레임에 — Input._buffer 가 눌린 순간을 잡는다)
const autoPlay = (seconds) => page.evaluate((seconds) => new Promise(resolve => {
  const fire = (type, code) => { const e = new KeyboardEvent(type, { key: code, code, bubbles: true }); window.dispatchEvent(e); document.dispatchEvent(e); };
  const t0 = performance.now(); let last = -1, pressed = 0;
  const tick = () => {
    const g = window.game.battle?.gimmick?.snapshot?.game;
    if (g && g.kind === 'rhythm' && g.phase === 'play' && g.next !== null && g.next !== last && g.next - g.time <= 0.05 && g.next - g.time > -0.12) {
      last = g.next; const code = g.nextLane === 'L' ? 'ArrowLeft' : 'ArrowRight'; fire('keydown', code); fire('keyup', code); pressed += 1;
    }
    if (performance.now() - t0 < seconds * 1000) requestAnimationFrame(tick); else resolve(pressed);
  };
  tick();
}), seconds);
try {
  await page.goto('http://localhost:8000/?qa=ship_tvform_battle');
  await page.waitForFunction(() => window.game && window.game.battle && window.game.battle.state === 'intro', null, { timeout: 30000 });
  await page.evaluate(() => { const snd = window.game.sound; window.__sfx = []; const orig = snd.sfx.bind(snd); snd.sfx = (name, opts) => { window.__sfx.push(name); return orig(name, opts); }; });
  await page.waitForTimeout(800); await advanceUntil(x => x.state !== 'intro', 10);
  await waitFor(() => window.game.battle.state === 'menu', 20000);
  // 첫 적 턴을 특별 2(리듬)로 + 미스로 파티가 죽지 않게 체력 유지
  await page.evaluate(() => { const sp = window.game.battle.support; sp.turn = 0; sp.specialIdx = 1;
    window.__alive = setInterval(() => { const b = window.game.battle; if (!b) return; for (const m of b.members) { m.hp = m.maxHp; m.down = false; } }, 200); });
  await attackRound();
  const on = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.kind === 'rhythm', 20000);
  let s = await st(); check(on && s.special === 'rhythm', '특별 2 리듬 시작 ' + JSON.stringify([s.special, s.phase]));
  // TV 가 켜지는 첫 프레임부터 무대가 다 그려져 있어야 한다(노트는 아직 없음)
  await waitFor(() => window.game.battle.gimmick?.snapshot?.phase === 'game', 6000);
  await cap('01_stage');
  s = await st(); check(s.game && s.game.phase === 'pads', '패드가 뜨는 동안 무대만 ' + JSON.stringify([s.game?.phase, s.game?.notes]));
  const sfxA = await page.evaluate(() => window.__sfx.slice(-30)); check(sfxA.includes('bell'), '패드 삐용(bell) ' + JSON.stringify(sfxA.slice(-5)));
  const playing = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'play', 6000);
  s = await st();
  check(playing && s.game.chartLoaded && s.game.melody, '곡 멜로디 차트(tvtime.json)를 잘라 왔다 ' + JSON.stringify([s.game?.chartLoaded, s.game?.melody, s.game?.notes]));
  check(s.game.notes >= 25, `15초 구간 노트 ${s.game?.notes} 개`);
  const hp0 = s.ycHp;
  const bot = autoPlay(19);
  await page.waitForTimeout(4500); await cap('02_play');
  s = await st(); check((s.game?.greats ?? 0) >= 5, `연주 중 GREAT ${s.game?.greats} COMBO ${s.game?.combo}`);
  const pressedCount = await bot;
  const movedOn = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'moved', 8000);
  await page.waitForTimeout(600); await cap('03_moved');
  s = await st();
  check(movedOn && (s.text || '').includes('감동'), `“영클이 감동한다!” (GREAT ${s.game?.greats} MISS ${s.game?.misses}, 친 노트 ${pressedCount}) ` + JSON.stringify([s.text]));
  const cried = await waitFor(() => window.game.battle.gimmick?.snapshot?.game?.cried, 8000);
  await page.waitForTimeout(160); await cap('04_cry');
  s = await st();
  check(cried && s.ycHp === hp0 - 10, `우는 영클이 올라와 눈물 터짐 → 10 피해(hp ${hp0}→${s.ycHp})`);
  check((s.game?.misses ?? 9) < 3, `MISS ${s.game?.misses} (3회 미만)`);
  const back = await waitFor(() => ['off', 'zoomout', 'back', 'done'].includes(window.game.battle.gimmick?.snapshot?.phase) || window.game.battle.state === 'menu', 12000);
  await cap('05_back'); check(back, '지지직 걷히며 전투로 복귀');
  check(errors.length === 0, '페이지 오류 없음 ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('CRASH', e.message); await cap('crash'); }
console.log('fails=' + fails);
await browser.close();
