// 전투 브금 시작점 검증 (사용자 2026-09-11 "전투브금 시작지점이 살짝 사라진 느낌"): 조우 징글 → 전투 화면 → rude_buster 가 **0초부터, 원래 음량으로 바로** 나와야 한다.
//   rude_buster.mp3 는 0.000s 에 가장 큰 첫 타(peak 1.07)가 있어 페이드인이 있으면 그 타가 사라진다. 여기서는 엘리먼트를 20ms 마다 찍어
//   처음 소리가 나는 순간의 currentTime(≈0)·volume(=bgmVolume 0.4, 페이드 없음)·징글 시작 뒤 경과(1.3~2.0s: 징글이 1.50s 에 끝나고 화면이 1.52s 에 열린다)를 잰다.
import { chromium } from 'playwright-core';
process.on('uncaughtException', (e) => { try { console.log(logs.join('\n')); } catch {} console.log('CRASH', e.stack || e.message); process.exit(2); });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0; const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await page.evaluate(fn); if (v) return v; await page.waitForTimeout(80); } return null; };

await page.goto('http://localhost:8000/index.html?qa=teal6');
await until(() => !!(window.game && game.entities && game.player), 15000); await page.keyboard.press('KeyX'); await page.waitForTimeout(300);
await page.evaluate(() => {
  const s = game.sound; window.__bgmLog = { jingleAt: null, callAt: null, first: null, samples: [] };
  const sfx0 = s.sfx.bind(s); s.sfx = (name, o) => { if (name === 'battle_start' && window.__bgmLog.jingleAt === null) window.__bgmLog.jingleAt = performance.now(); return sfx0(name, o); };
  const play0 = s.playBgm.bind(s); s.playBgm = (name, o) => {
    const r = play0(name, o); if (name !== 'rude_buster') return r;
    const L = window.__bgmLog; L.callAt = performance.now(); L.opts = o; const a = s.bgm;
    const tick = () => { if (!a) return; const now = performance.now(); L.samples.push([Math.round(now - L.callAt), +a.currentTime.toFixed(3), +a.volume.toFixed(2), a.paused]);
      if (L.first === null && !a.paused && a.currentTime > 0) L.first = { at: now, sinceCall: now - L.callAt, sinceJingle: L.jingleAt === null ? null : now - L.jingleAt, currentTime: a.currentTime, volume: a.volume, target: s.bgmVolume };
      if (now - L.callAt < 2500) setTimeout(tick, 20); };
    tick(); return r; };
  const e = game.entities.find((k) => k.def.type === 'enemy'); game.startEncounter(e);
});
await until(() => window.__bgmLog.first ? true : null, 12000); await page.waitForTimeout(600);
const L = await page.evaluate(() => window.__bgmLog);
check('battle BGM element actually started (headless audio)', !!L.first, JSON.stringify(L.samples.slice(0, 8)));
if (L.first) {
  check('starts from the beginning: currentTime at first sound < 0.08s', L.first.currentTime < 0.08, `currentTime=${L.first.currentTime.toFixed(3)}`);
  check('no fade-in: volume is already the full BGM level (playBgm caps at 0.4) at the first sound', L.first.target > 0 && Math.abs(L.first.volume - L.first.target) < 0.01 && (L.opts?.fadeIn ?? 0) === 0, `volume=${L.first.volume} target=${L.first.target} fadeIn=${L.opts?.fadeIn}`);
  check('preloaded: sound within 0.35s of playBgm()', L.first.sinceCall < 350, `${Math.round(L.first.sinceCall)}ms`);
  check('timeline: first sound 1.3~2.2s after the jingle (jingle ends 1.50s, screen opens 1.52s)', L.first.sinceJingle !== null && L.first.sinceJingle >= 1300 && L.first.sinceJingle <= 2200, `${Math.round(L.first.sinceJingle)}ms after jingle`);
}
check('no page errors', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
console.log(logs.join('\n')); console.log(`fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
