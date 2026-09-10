// 목소리 유실 재현/방지: 파일이 도착하기 전에 unlock(디코드) 이 먼저 일어나도, 나중에 온 파일이 디코드되어 목소리가 살아나는가
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
await page.route('**/assets/audio/voices/*.mp3', async (route) => { await new Promise((r) => setTimeout(r, 2500)); await route.continue(); });   // 목소리 파일만 2.5초 늦게
await page.goto('http://127.0.0.1:8000/index.html?qa=teal2');
await page.waitForTimeout(600);
await page.evaluate(() => { if (window.game) game.sound.unlock(); });   // 파일 도착 전 unlock
const t0 = Date.now(); while (Date.now() - t0 < 20000) { if (await page.evaluate(() => !!(window.game && game.entities && game.player))) break; await page.waitForTimeout(100); }
await page.waitForTimeout(3500);
const r = await page.evaluate(() => ({ raw: Object.keys(game.sound.voiceRaw).length, buf: Object.keys(game.sound.voiceBuf).length, ctx: game.sound.ctx?.state || null }));
console.log('after late files:', JSON.stringify(r));
console.log((r.buf >= 5 && r.ctx === 'running' ? 'PASS' : 'FAIL') + ' late voice files decoded after unlock ' + JSON.stringify(r));
console.log('fails=' + (r.buf >= 5 && r.ctx === 'running' ? 0 : 1));
await browser.close();
