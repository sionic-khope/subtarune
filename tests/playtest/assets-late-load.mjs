// 자산 늦게 도착/한 번 실패(BUILD269, GitHub Pages 재현): 시트 요청을 처음엔 500 으로 막았다가 풀어도 캐릭터가 문자 도트에 갇히지 않고 시트로 갈아탄다.
//   ① 컷신이 spawn 하는 청소부(jjajang_torii ‘어이’ 합류) — 시트 janitor.png 첫 요청 실패 → 재시도로 받아 그려진다. ② 준비 목록에 없는 시트(choimis)를 쓰는 NPC 를 spawn → 지연 적재. 실행: tests/playtest/run.sh assets-late-load
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'lateload_' + n + '.png') }); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
const failed = {};
await page.route(/assets\/(sprites\/janitor|portraits\/janitor|sprites\/choimis)\.png/, route => { const key = route.request().url().replace(/\?.*$/, '').split('/').slice(-2).join('/'); failed[key] = (failed[key] || 0) + 1; if (failed[key] <= 1) route.fulfill({ status: 500, body: 'flaky' }); else route.continue(); });
try {
  await page.goto('http://localhost:8000/?qa=jjajang_torii');
  check(await until(() => window.game?.mapId === 'jjajang_torii' && !window.game.transitioning, 30000), '토리이 길 QA(청소부 시트 첫 요청은 500)');
  await page.waitForTimeout(500);
  const sheet = await page.evaluate(() => !!window.game.spriteOverrides.janitor);
  check(sheet, `청소부 시트를 재시도로 받았다 (요청 ${JSON.stringify(failed)})`);
  // 준비 목록에 없는 시트: 최미스 NPC 를 즉석 spawn → 폴백으로 시작해도 곧 시트로
  const before = await page.evaluate(() => { const g = window.game; delete g.spriteOverrides.choimis; const e = g.spawn({ type: 'npc', id: 'late_choimis', sprite: 'choimis', x: g.player.x + 60, y: g.player.y, facing: 'left', wander: 0 }); return { fallback: !!e.sprite.fallback, fw: e.sprite.fw }; });
  check(before.fallback === true && before.fw === 16, `시트 없이 만든 NPC 는 폴백으로 시작 ${JSON.stringify(before)}`);
  check(await until(() => { const e = window.game.entities.find(x => x.id === 'late_choimis'); return e && !e.sprite.fallback && e.sprite.fw > 16; }, 8000), '그리는 동안 시트를 요청해 받으면 시트로 갈아탄다(첫 요청 500 → 재시도)');
  const after = await page.evaluate(() => { const e = window.game.entities.find(x => x.id === 'late_choimis'); return { fw: e.sprite.fw, px: e.sprite.px, name: e.sprite.name }; });
  check(after.fw === 128 && after.px === 2 && failed['sprites/choimis.png'] >= 2, `최미스 시트 프레임(512 시트 → 128) ${JSON.stringify(after)} (요청 ${JSON.stringify(failed)} — 첫 500 뒤 재시도)`);
  await page.waitForTimeout(300); await cap('00_choimis');
} catch (e) { fails += 1; console.log('FAIL exception', e.message); await cap('99_error'); }
check(errors.length === 0, `페이지 오류 없음 ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
console.log('fails=' + fails);
process.exit(fails ? 1 : 0);
