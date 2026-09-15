// 리듬 게임(BUILD178): QA rhythm_stage → 밴드 셋 낙하 → 대사 → 사운드 체크(작은별 7음, 키 입력으로 GREAT) → 룰 대사 → 제목·지이잉 → TV 켜지며 곡 시작(영상 또는 시계) → 자동 입력으로 콤보 → 5연속 미스 게임오버 → 재도전 → 종료.
// 실행: tests/playtest/run.sh rhythm
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'rhythm_' + n + '.png') }); };
const st = () => page.evaluate(() => { const r = window.__rhythm; if (!r) return null; const s = r.state; return { phase: s.phase, landed: s.band.map(b => b.landed), talk: s.talk && s.talk.i, combo: s.play?.combo ?? null, max: s.play?.maxCombo ?? null, score: s.play?.score ?? null, misses: s.play?.misses ?? null, over: s.over, song: s.song, title: s.chart?.title, time: Math.round(r.songTime() * 100) / 100, video: !!s.video, fromClock: s.fromClock, tvOn: s.tvOn, pop: s.play ? Math.round(s.play.pop * 100) / 100 : null }; });
const pressC = async () => { await page.keyboard.press('KeyC'); await page.waitForTimeout(140); };
const talkThrough = async (maxLines) => { for (let i = 0; i < maxLines * 3; i++) { const s = await st(); if (!s || s.phase !== 'talk') return; await pressC(); await page.waitForTimeout(80); } };
// 노트가 판정선(±0.08초)에 올 때 키를 누르는 자동 연주기(홀드는 누른 채 유지)
const autoPlay = (seconds) => page.evaluate((seconds) => new Promise(resolve => {
  const r = window.__rhythm; const down = { L: false, R: false }; const key = { L: 'ArrowLeft', R: 'ArrowRight' };
  const fire = (type, k) => { const e = new KeyboardEvent(type, { key: k, code: k, bubbles: true }); window.dispatchEvent(e); document.dispatchEvent(e); };
  const t0 = performance.now();
  const tick = () => {
    const play = r.play, t = r.songTime();
    if (play) for (const lane of ['L', 'R']) {
      const n = play.notes.find(n => n.lane === lane && (n.status === 'wait' || n.status === 'holding'));
      const want = !!n && ((n.status === 'wait' && Math.abs(n.t - t) <= 0.06) || (n.status === 'holding' && t < n.t + n.dur - 0.05));
      if (want && !down[lane]) { down[lane] = true; fire('keydown', key[lane]); }
      if (!want && down[lane]) { down[lane] = false; fire('keyup', key[lane]); }
    }
    if (performance.now() - t0 < seconds * 1000 && window.__rhythm) requestAnimationFrame(tick);
    else { for (const lane of ['L', 'R']) if (down[lane]) fire('keyup', key[lane]); resolve(); }
  };
  requestAnimationFrame(tick);
}), seconds);
try {
  await page.goto('http://localhost:8000/?qa=rhythm_stage');
  await page.waitForFunction(() => !!window.__rhythm, null, { timeout: 25000 });
  await page.waitForFunction(() => window.__rhythm.state.band.every(b => b.landed), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(300); await cap('drop');
  let s = await st(); check(s && s.landed.every(Boolean), '밴드 셋이 차례로 떨어져 자리를 잡는다 ' + JSON.stringify(s?.landed));
  await page.waitForFunction(() => window.__rhythm.state.phase === 'talk', null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400); await cap('talk1');
  await talkThrough(4);
  await page.waitForFunction(() => window.__rhythm.state.phase === 'soundcheck', null, { timeout: 5000 }).catch(() => {});
  s = await st(); check(s.phase === 'soundcheck' && s.title === '사운드 체크', '대사 뒤 사운드 체크(작은별) ' + JSON.stringify([s.phase, s.title]));
  await autoPlay(8.5); await page.waitForTimeout(200); await cap('soundcheck');
  s = await st(); const sc = await page.evaluate(() => { const p = window.__rhythm.state; return { greats: p.play?.greats, misses: p.play?.misses, max: p.play?.maxCombo, phase: p.phase }; });
  check(sc.greats >= 5 && sc.max >= 5, '작은별 7음을 키로 쳐서 GREAT·콤보 ' + JSON.stringify(sc));
  await page.waitForFunction(() => window.__rhythm.state.phase === 'talk', null, { timeout: 6000 }).catch(() => {});
  await talkThrough(4);
  await page.waitForFunction(() => window.__rhythm.state.phase === 'title', null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(900); await cap('title');
  s = await st(); check(s.phase === 'title' && s.title === '방가방가 노앰토리', '노래방식 제목 카드(방가방가 노앰토리) ' + JSON.stringify([s.phase, s.title]));
  await page.waitForFunction(() => window.__rhythm.state.phase === 'play', null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200); await cap('tv_on');
  s = await st(); check(s.phase === 'play' && (s.video || s.fromClock), 'TV 켜지며 곡 시작(영상 또는 시계) ' + JSON.stringify([s.phase, s.video, s.fromClock, s.tvOn]));
  await autoPlay(9); await page.waitForTimeout(100); await cap('play');
  s = await st(); check(s.score > 0 && s.max >= 5 && s.time > 5, '자동 연주로 점수·콤보가 오르고 곡 시각이 흐른다 ' + JSON.stringify([s.score, s.max, s.time, s.misses]));
  // 손을 놓으면 5연속 MISS → 게임오버 → C 재도전
  await page.waitForFunction(() => window.__rhythm.state.over, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(300); await cap('over');
  s = await st(); check(s.over === true, '5연속 MISS 게임오버 ' + JSON.stringify([s.over, s.misses]));
  await pressC(); await page.waitForTimeout(500);
  s = await st(); check(s.over === false && s.combo === 0 && s.time < 3, '재도전: 곡 처음부터 ' + JSON.stringify([s.over, s.combo, s.time]));
  await autoPlay(4); s = await st(); check(s.max >= 3, '재도전 뒤에도 연주 ' + JSON.stringify([s.max]));
  await page.evaluate(() => window.__rhythm.finish(true));
  await page.waitForFunction(() => !window.__rhythm, null, { timeout: 5000 }).catch(() => {});
  await page.waitForFunction(() => !game.dialogue.running, null, { timeout: 8000 }).catch(() => {});
  const back = await page.evaluate(() => ({ map: game.mapId, done: game.flags.rhythm_stage_done === true, rhythm: !!window.__rhythm, videos: document.querySelectorAll('video').length }));
  check(back.map === 'youngcle12' && back.done && !back.rhythm && back.videos === 0, '씬 종료 → 대기실·플래그·영상 정리 ' + JSON.stringify(back));
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
