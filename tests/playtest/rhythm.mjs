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
const st = () => page.evaluate(() => { const r = window.__rhythm; if (!r) return null; const s = r.state; return { phase: s.phase, landed: s.band.map(b => b.landed), talk: s.talk && s.talk.i, combo: s.play?.combo ?? null, max: s.play?.maxCombo ?? null, score: s.play?.score ?? null, misses: s.play?.misses ?? null, over: s.over, song: s.song, title: s.chart?.title, time: Math.round(r.songTime() * 100) / 100, video: !!s.video, fromClock: s.fromClock, tvOn: s.tvOn, pop: s.play ? Math.round(s.play.pop * 100) / 100 : null, notesFrom: s.chart?.notesFrom || 0 }; });
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
  // 사운드 체크 대사 다음 줄 = 조작 안내 ‘키보드 왼쪽 오른쪽 두개로 … ← →’(BUILD192)
  const arrowLine = await page.evaluate(() => { const tk = window.__rhythm.state.talk; return tk ? tk.lines.findIndex(l => l.text.includes('왼쪽 오른쪽') && l.text.includes('←') && l.text.includes('→')) : -1; });
  check(arrowLine === 4, '사운드 체크 대사 다음에 ← → 조작 안내 줄 ' + JSON.stringify(arrowLine));
  for (let i = 0; i < 12; i++) { const ti = await page.evaluate(() => window.__rhythm.state.talk?.i); if (ti === 4 || ti == null) break; await pressC(); await page.waitForTimeout(60); }
  await page.waitForTimeout(1700); await cap('talk_arrows');
  await talkThrough(4);
  await page.waitForFunction(() => window.__rhythm.state.phase === 'soundcheck', null, { timeout: 5000 }).catch(() => {});
  s = await st(); check(s.phase === 'soundcheck' && s.title === '사운드 체크', '대사 뒤 사운드 체크(작은별) ' + JSON.stringify([s.phase, s.title]));
  // GREAT 마다 그 칸에서 노란 세로 빔이 쏘아진다(BUILD195): 자동 연주 동안 beam fx 가 생기는지 세고, 하나를 직접 띄워 프레임을 찍는다
  const beamCount = page.evaluate(() => new Promise(resolve => { let n = 0, last = null; const t0 = performance.now(); const tick = () => { const b = window.__rhythm.state.fx.filter(f => f.kind === 'beam'); if (b.length && b[0] !== last) { n += 1; last = b[0]; } if (performance.now() - t0 > 7000) resolve(n); else requestAnimationFrame(tick); }; tick(); }));
  await autoPlay(8.5); await page.waitForTimeout(200); await cap('soundcheck');
  const beams = await beamCount;
  check(beams >= 4, 'GREAT 마다 노란 세로 빔 이펙트가 쏘아진다 ' + JSON.stringify(beams));
  s = await st(); const sc = await page.evaluate(() => { const p = window.__rhythm.state; return { greats: p.play?.greats, misses: p.play?.misses, max: p.play?.maxCombo, phase: p.phase }; });
  check(sc.greats >= 5 && sc.max >= 5, '작은별 7음을 키로 쳐서 GREAT·콤보 ' + JSON.stringify(sc));
  await page.waitForFunction(() => window.__rhythm.state.phase === 'talk', null, { timeout: 6000 }).catch(() => {});
  await talkThrough(4);
  // ‘관객 여러분들 즐길 준비되셨나요?’ → 함성·박수·꽃(hype) → ‘처음곡은 방가방가 노앰토리~’
  await page.waitForFunction(() => window.__rhythm.state.phase === 'hype', null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(700); await cap('hype');
  s = await st(); const hype = await page.evaluate(() => ({ cheer: window.__rhythm.state.cheer, flowers: window.__rhythm.state.flowers.length }));
  check(s.phase === 'hype' && hype.cheer > 0 && hype.flowers > 5, '관객 함성·꽃 던지기 ' + JSON.stringify([s.phase, hype]));
  await page.waitForFunction(() => window.__rhythm.state.phase === 'talk', null, { timeout: 8000 }).catch(() => {});
  await talkThrough(1);
  await page.waitForFunction(() => window.__rhythm.state.phase === 'title', null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(900); await cap('title');
  s = await st(); check(s.phase === 'title' && s.title === '방가방가 노앰토리', '노래방식 제목 카드(방가방가 노앰토리) ' + JSON.stringify([s.phase, s.title]));
  await page.waitForFunction(() => window.__rhythm.state.phase === 'play', null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200); await cap('tv_on');
  s = await st(); check(s.phase === 'play' && (s.video || s.fromClock), 'TV 켜지며 곡 시작(영상 또는 시계) ' + JSON.stringify([s.phase, s.video, s.fromClock, s.tvOn]));
  // 노앰토리는 영상은 처음부터, 노트는 18.2초(‘만원 주면~’)부터 — 그 전엔 세 기둥 다 비어 있다
  await page.waitForTimeout(1500); s = await st(); const early = await page.evaluate(() => ({ notes: window.__rhythm.play.notes.filter(n => n.status !== 'wait').length, t: window.__rhythm.songTime() }));
  check(s.notesFrom > 18 && early.notes === 0 && early.t < s.notesFrom, '노트는 notesFrom(18.2초) 전엔 하나도 안 떨어진다 ' + JSON.stringify([s.notesFrom, early]));
  await page.evaluate(() => window.__rhythm.seek(window.__rhythm.state.chart.notesFrom - 0.5));
  await autoPlay(6); await page.evaluate(() => { const r = window.__rhythm.state; r.fx.push({ kind: 'beam', lane: 'L', t: 0.05, dur: 0.34 }, { kind: 'beam', lane: 'R', t: 0.16, dur: 0.34 }); }); await page.waitForTimeout(30); await cap('play');
  s = await st(); check(s.score > 0 && s.max >= 5 && s.time > s.notesFrom + 4, '자동 연주로 점수·콤보가 오르고 곡 시각이 흐른다 ' + JSON.stringify([s.score, s.max, s.time, s.notesFrom, s.misses]));
  // C 일시정지(BUILD192): 영상·곡 시각이 멈추고, 다시 C 로 이어서
  await pressC(); await page.waitForTimeout(300); await cap('pause');
  const pz = await page.evaluate(() => { const r = window.__rhythm; return { paused: r.state.paused, vpaused: r.state.video && !r.state.fromClock ? r.state.video.paused : null, t: r.songTime() }; });
  await page.waitForTimeout(500);
  const pz2 = await page.evaluate(() => ({ t: window.__rhythm.songTime(), paused: window.__rhythm.state.paused }));
  check(pz.paused && pz2.paused && pz.vpaused !== false && Math.abs(pz2.t - pz.t) < 0.05, 'C 로 일시정지: 영상·곡 시각이 멈춘다 ' + JSON.stringify([pz, pz2]));
  await pressC(); await page.waitForTimeout(500);
  const pz3 = await page.evaluate(() => { const r = window.__rhythm; return { t: r.songTime(), paused: r.state.paused, vpaused: r.state.video && !r.state.fromClock ? r.state.video.paused : null }; });
  check(!pz3.paused && pz3.t > pz2.t + 0.2 && pz3.vpaused !== true, '다시 C 로 이어서 ' + JSON.stringify(pz3));
  // 하이라이트(코러스) 구간으로 건너뛰면 색종이·불꽃·관객 점프·스트로브(BUILD181)
  await page.evaluate(() => window.__rhythm.seek(window.__rhythm.state.chart.highlights[0][0] - 0.8));
  await autoPlay(3); await page.waitForTimeout(60); await cap('highlight');
  const hl = await page.evaluate(() => { const r = window.__rhythm.state; return { hi: r.hi, confetti: r.confetti.length, cheer: Math.round(r.cheer * 100) / 100, sparks: r.sparks.length, hl: r.chart.highlights }; });
  check(hl.hi === true && hl.confetti > 20 && hl.cheer > 0, '코러스 하이라이트: 색종이·관객 환호 ' + JSON.stringify(hl));
  // 손을 놓으면 MISS 가 쌓여 신호가 나빠진다 → ‘● 연결 안 됨’ 배지(최상위) → HP 가 0 이 되는 멤버 → 게임오버 → C 재도전
  await page.waitForFunction(() => { const r = window.__rhythm.state; return r.signal < 0.6 && !r.over; }, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(350); await cap('badge');
  const bd = await page.evaluate(() => { const r = window.__rhythm.state; return { signal: Math.round(r.signal * 100) / 100, badge: Math.round(r.badge * 100) / 100, over: r.over }; });
  check(bd.badge > 0.5 && bd.signal < 0.6, '신호가 나쁘면 “연결 안 됨” 배지가 뜬다 ' + JSON.stringify(bd));
  // MISS 마다 파티 HP −10(BUILD190): 미스가 쌓이면 HP 가 줄고, 누구 하나 0 이면 게임오버
  await page.waitForFunction(() => window.__rhythm.state.play.misses >= 3, null, { timeout: 15000 }).catch(() => {});
  const hpMid = await page.evaluate(() => { const r = window.__rhythm; return { misses: r.state.play.misses, start: r.state.hpAtStart, hp: ['hyungsub', 'gyeongsub', 'ppaman'].map(id => r.hpOf(id)), fx: r.state.fx.filter(f => f.kind === 'dmg').length }; });
  check(['hyungsub', 'gyeongsub', 'ppaman'].every((id, i) => hpMid.hp[i] === hpMid.start[id] - 10 * hpMid.misses) && hpMid.hp.every(h => h > 0), '미스마다 형섭·경섭·빠맨 HP −10(곡 시작 HP 기준, −10 팝업) ' + JSON.stringify(hpMid));
  // 피해 소리는 맞는 소리(damage)만, 검 소리(hit)는 없다(BUILD192)
  const dmgSfx = await page.evaluate(() => { const g = window.game; const calls = []; const orig = g.sound.sfx.bind(g.sound); g.sound.sfx = (n, o) => { calls.push([n, o && o.volume]); return orig(n, o); }; window.__rhythm.damageParty(); g.sound.sfx = orig; return calls; });
  check(dmgSfx.some(([n, v]) => n === 'damage' && v <= 0.45) && !dmgSfx.some(([n]) => n === 'hit'), 'MISS 피해 소리는 맞는 소리(damage, 살짝 작게)만 — 검 소리(hit) 없음 ' + JSON.stringify(dmgSfx));
  await page.waitForFunction(() => window.__rhythm.state.over, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(300); await cap('over');
  s = await st(); const hpOver = await page.evaluate(() => ['hyungsub', 'gyeongsub', 'ppaman'].map(id => window.__rhythm.hpOf(id)));
  check(s.over === true && hpOver.some(h => h === 0), 'HP 가 0 이 된 멤버가 생기면 게임오버 ' + JSON.stringify([s.over, s.misses, hpOver]));
  const sig = await page.evaluate(() => { const r = window.__rhythm.state; return { signal: Math.round(r.signal * 100) / 100, noise: !!r.noise, vol: r.video ? Math.round(r.video.volume * 100) / 100 : null }; });
  check(sig.signal < 0.4 && !sig.noise && (sig.vol === null || sig.vol < 0.6), '미스가 쌓이면 신호 품질이 떨어져 노래가 작아진다(게임오버 땐 잡음 정지) ' + JSON.stringify(sig));
  await pressC(); await page.waitForTimeout(500);
  s = await st(); const hpRetry = await page.evaluate(() => ['hyungsub', 'gyeongsub', 'ppaman'].map(id => window.__rhythm.hpOf(id)));
  check(s.over === false && s.combo === 0 && s.time < 3 && hpRetry.every(h => h > 50), '재도전: 곡 처음부터, HP 는 곡 시작 값으로 복구 ' + JSON.stringify([s.over, s.combo, s.time, hpRetry]));
  await page.evaluate(() => window.__rhythm.seek(window.__rhythm.state.chart.notesFrom - 0.5));
  await autoPlay(4); s = await st(); check(s.max >= 3, '재도전 뒤에도 연주 ' + JSON.stringify([s.max]));
  const sig2 = await page.evaluate(() => { const r = window.__rhythm.state; return { signal: Math.round(r.signal * 100) / 100, noise: !!r.noise && r.noise.loop, noiseVol: r.noise ? Math.round(r.noise.volume * 100) / 100 : null }; });
  check(sig2.signal >= 0.99 && sig2.noise && sig2.noiseVol === 0, '잘 맞추면 신호 1 — 노래 온전, 잡음 0 ' + JSON.stringify(sig2));
  // 곡이 끝나면 기립 환호(크게·오래) + 꽃·동전 → ‘너무 감동적인 곡이군요...’ / ‘이제 이게 끝이 아닙니다.’ → 보X팜 제목 때도 환호
  await page.evaluate(() => window.__rhythm.endSong());
  await page.waitForTimeout(400); await cap('ovation');
  const ov = await page.evaluate(() => { const r = window.__rhythm.state; return { phase: r.phase, cheer: Math.round(r.cheer * 10) / 10, coins: r.coins.length, flowers: r.flowers.length }; });
  check(ov.phase === 'ovation' && ov.cheer > 5 && ov.coins > 10 && ov.flowers > 20, '곡 끝 기립 환호·동전·꽃 ' + JSON.stringify(ov));
  await page.waitForFunction(() => window.__rhythm.state.phase === 'talk', null, { timeout: 8000 }).catch(() => {});
  const t3 = await page.evaluate(() => { const r = window.__rhythm.state; return r.talk ? r.talk.lines.slice(0, 2).map(l => l.text) : null; });
  check(t3 && t3[0] === '너무 감동적인 곡이군요...' && t3[1] === '환상적인 연주네요~', '곡 뒤 대사(감동적/환상적/끝이 아닙니다/다음곡/이 노래가/전설의 악질 시청자) ' + JSON.stringify(t3));
  await talkThrough(6);
  await page.waitForFunction(() => window.__rhythm.state.phase === 'title', null, { timeout: 8000 }).catch(() => {});
  const t2 = await page.evaluate(() => { const r = window.__rhythm.state; return { song: r.song, title: r.chart?.title, cheer: Math.round(r.cheer * 10) / 10 }; });
  check(t2.song === 1 && t2.title === '악질 시청자' && t2.cheer > 0, '둘째 곡 악질 시청자(-쥰희- 버전) 제목 카드 + 관객 환호 ' + JSON.stringify(t2));
  const n3 = await page.evaluate(() => window.__rhythm.state.charts.map(c => c && c.title));
  check(n3.length === 3 && n3[2] === '보X팜', '세 곡 순서: 노앰토리 → 악질 시청자 → 보X팜 ' + JSON.stringify(n3));
  // 마지막 곡을 끝낸 셈 치면(song=2) 기립 환호 → 결과창이 한 글자씩 찍힌다(사용자) → 다 찍히면 C 계속
  await page.evaluate(() => { const r = window.__rhythm; r.state.song = 2; r.state.phase = 'play'; r.endSong(); });
  await page.waitForFunction(() => window.__rhythm.state.phase === 'result', null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200); await cap('result_typing');
  const rt = await page.evaluate(() => { const r = window.__rhythm.state.result; return r ? { line: r.line, shown: r.shown, done: r.done, lines: r.lines.length } : null; });
  check(rt && !rt.done && (rt.line > 0 || rt.shown > 0), '결과창이 한 글자씩 찍히는 중 ' + JSON.stringify(rt));
  await page.waitForFunction(() => window.__rhythm.state.result?.done, null, { timeout: 15000 }).catch(() => {});
  await cap('result'); const rt2 = await page.evaluate(() => window.__rhythm.state.result?.done);
  check(rt2 === true, '결과창 다 찍힘 → C 계속 ' + JSON.stringify(rt2));
  const cr = await page.evaluate(() => ({ active: window.__rhythm.state.crowdActive.length, bed: !!window.__rhythm.state.bed }));
  console.log('crowd layer', JSON.stringify(cr));
  await page.evaluate(() => window.__rhythm.finish(true));
  await page.waitForFunction(() => !window.__rhythm, null, { timeout: 5000 }).catch(() => {});
  // 씬이 끝나면 공연 뒤 연출(검은 화면 나레이션)로 이어진다 — 상세는 stage-after-show 플레이테스트
  await page.waitForFunction(() => game.dialogue.running && game.curtain === 'black', null, { timeout: 8000 }).catch(() => {});
  const back = await page.evaluate(() => ({ done: game.flags.rhythm_stage_done === true, rhythm: !!window.__rhythm, videos: document.querySelectorAll('video').length, curtain: game.curtain, text: game.textbox.node?.text?.slice(0, 20) }));
  check(back.done && !back.rhythm && back.videos === 0 && back.curtain === 'black', '씬 종료 → 플래그·영상 정리 → 검은 화면 나레이션 ' + JSON.stringify(back));
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
