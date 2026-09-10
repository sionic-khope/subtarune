// 새 게임 오디오 검증 (2026-09-10 "처음부터 하니까 형섭이 목소리 안 들리고 브금도 안 들려"): 타이틀 → 새 게임 → 오프닝 브금이 실제로 재생(currentTime 증가)되고
//   나레이션 블립이 울리며, 목소리 파일(형섭·나레이터·억빠맨·경섭·쥰희)이 디코드돼 있고, 페이지 에러가 없다.
import { chromium } from 'playwright-core';
process.on('uncaughtException', (e) => { try { console.log(logs.join('\n')); } catch {} console.log('CRASH', e.stack || e.message); process.exit(2); });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0; const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text().slice(0, 160)); });
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await page.evaluate(fn); if (v) return v; await page.waitForTimeout(100); } return null; };

await page.goto('http://localhost:8000/index.html');
await until(() => !!(window.game && game.title), 15000);
await page.evaluate(() => localStorage.removeItem('subtarune.save.v1'));
await page.waitForTimeout(400); await page.keyboard.press('Space');
await until(() => game.title.phase === 'zoom', 6000); await page.keyboard.press('KeyC');
await until(() => game.title.phase === 'locked', 6000); await page.waitForTimeout(3300);
await page.keyboard.press('KeyC');                                           // 세이브 없음 → 새 게임
const field = await until(() => game.state === 'field' && game.dialogue.running, 8000);
check('title → new game → opening cutscene running', !!field, '');
await page.evaluate(() => { const s = game.sound; s.__blips = {}; const ob = s.blip.bind(s); s.blip = (v) => { s.__blips[v] = (s.__blips[v] || 0) + 1; return ob(v); }; });
const t0 = await page.evaluate(() => game.sound.bgm?.currentTime ?? -1);
await page.waitForTimeout(1500);
const a = await page.evaluate(() => { const s = game.sound; const b = s.bgm; return { name: s.bgmName, t: b?.currentTime ?? -1, paused: b?.paused, vol: b?.volume, ctx: s.ctx?.state, blips: s.__blips, voices: Object.keys(s.voiceBuf || {}), muted: s.muted, sound: game.settings?.sound }; });
check('opening BGM is playing (opening.mp3, currentTime advancing, unmuted)', a.name === 'opening' && a.t > t0 && a.paused === false && a.vol > 0 && !a.muted && a.sound !== false, JSON.stringify({ name: a.name, t0, t: a.t, paused: a.paused, vol: a.vol, ctx: a.ctx }));
check('narration blips fire while the opening types', (a.blips.narrator || 0) >= 5, JSON.stringify(a.blips));
const voices = await until(() => { const v = Object.keys(game.sound.voiceBuf || {}); return ['hyungsub', 'narrator', 'ppaman', 'gyeongsub', 'junhee'].every((k) => v.includes(k)) ? v : null; }, 8000);
check('voice files decoded after unlock: hyungsub/narrator/ppaman/gyeongsub/junhee', !!voices, JSON.stringify(voices || a.voices));
check('no page errors during boot/title/new game', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
console.log(logs.join('\n')); console.log(`fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
