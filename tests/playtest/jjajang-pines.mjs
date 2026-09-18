// 검은 소나무 숲(BUILD226, BUILD227 에서 입구가 아래로): 굽이 길에서 올라오는 아래 입구로 들어와 굽이 길(오른쪽→위→왼쪽→아래→가운데 오른쪽)을 따라 공터를 지나 오른쪽 끝까지 청소부가 뒤따른다.
//   실행: tests/playtest/run.sh jjajang-pines
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'pines_' + n + '.png') }); };
const st = () => page.evaluate(() => { const g = window.game; const f = g.entities.find(e => e.def?.type === 'follower' && !e.dead); return { map: g.mapId, px: Math.round(g.player.x), py: Math.round(g.player.y), bgm: g.sound.bgmName, t: g.sound.bgm ? +g.sound.bgm.currentTime.toFixed(2) : null, follower: f ? { x: Math.round(f.x), y: Math.round(f.y) } : null, party: [...g.party] }; });
const go = async (key, cond, ms, run = true) => { await page.evaluate(c => { window.__cond = c; }, cond); if (run) await page.keyboard.down('KeyX'); await page.keyboard.down(key); const ok = await page.waitForFunction(() => new Function('g', 'return ' + window.__cond)(window.game), null, { timeout: ms, polling: 40 }).then(() => true).catch(() => false); await page.keyboard.up(key); if (run) await page.keyboard.up('KeyX'); await page.waitForTimeout(120); return ok; };
try {
  await page.goto('http://localhost:8000/?qa=jjajang_pines');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_pines' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(700);
  let s = await st(); await cap('01_enter');
  check(s.map === 'jjajang_pines' && s.follower && s.party.includes('janitor') && s.py >= 18 * 32, '아래 입구에서 시작, 청소부 동행 ' + JSON.stringify(s));
  check(s.bgm === 'my_castle_town', '브금 my_castle_town ' + s.bgm);
  const t1 = s.t;
  check(await go('ArrowUp', 'g.player.y <= 16 * 32 + 8', 12000), '입구 줄기를 올라와');
  check(await go('ArrowRight', 'g.player.x >= 12 * 32 - 2', 12000), '오른쪽으로');
  check(await go('ArrowUp', 'g.player.y <= 4 * 32 + 8', 12000), '위로');
  await cap('02_top');
  check(await go('ArrowLeft', 'g.player.x <= 4 * 32 + 6', 12000), '왼쪽으로');
  check(await go('ArrowDown', 'g.player.y >= 10 * 32 + 2', 12000), '아래로 가운데 길까지');
  await cap('03_middle_road');
  check(await go('ArrowRight', 'g.player.x >= 37 * 32', 20000), '가운데 길로 공터까지');
  await page.waitForTimeout(400); s = await st(); await cap('04_plaza');
  check(s.map === 'jjajang_pines' && s.follower && Math.abs(s.follower.x - s.px) < 120, '공터에서 청소부가 바로 뒤에 있다 ' + JSON.stringify(s));
  check(s.bgm === 'my_castle_town' && s.t > t1, `브금이 끊기지 않고 이어진다 (${t1} → ${s.t})`);
  check(await go('ArrowRight', 'g.player.x >= 61 * 32', 20000), '오른쪽 끝까지(다음 맵 없음)');
  await cap('05_right_end');
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
