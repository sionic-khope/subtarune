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
  check(s.map === 'jjajang_pines' && s.follower && s.party.includes('janitor') && s.py >= 16 * 32 && s.px < 3 * 32, '왼쪽 입구에서 시작, 청소부 동행 ' + JSON.stringify(s));
  check(s.bgm === 'my_castle_town', '브금 my_castle_town ' + s.bgm);
  const t1 = s.t;
  check(await go('ArrowRight', 'g.player.x >= 12 * 32 + 2', 12000), '오른쪽으로');
  check(await go('ArrowUp', 'g.player.y <= 4 * 32 + 8', 12000), '위로');
  await cap('02_top');
  check(await go('ArrowLeft', 'g.player.x <= 4 * 32 + 6', 12000), '왼쪽으로');
  check(await go('ArrowDown', 'g.player.y >= 10 * 32 + 2', 12000), '아래로 가운데 길까지');
  await cap('03_middle_road');
  // BUILD227+: 공터(34~41열) 가운데 트리거에서 아짐키야 조우 컷신→전투가 시작된다(세부는 jjajang-pines-center). 공터 가장자리에서 먼저 동행·브금을 본다
  check(await go('ArrowRight', 'g.player.x >= 33 * 32', 20000), '가운데 길로 공터 가장자리까지');
  await page.waitForTimeout(400); s = await st(); await cap('04_plaza');
  check(s.map === 'jjajang_pines' && s.follower && Math.abs(s.follower.x - s.px) < 120, '공터에서 청소부가 바로 뒤에 있다 ' + JSON.stringify(s));
  check(s.bgm === 'my_castle_town' && s.t > t1, `브금이 끊기지 않고 이어진다 (${t1} → ${s.t})`);
  const center = await go('ArrowRight', 'g.dialogue.running && g.flags.pines_center_started', 12000);
  await page.waitForTimeout(900); s = await st(); await cap('05_center_event');
  check(center && s.map === 'jjajang_pines' && s.px < 39 * 32 && !s.bgm, '공터 가운데로 가면 아짐키야 조우가 시작되고 브금이 꺼진다 ' + JSON.stringify(s));
  // 오른쪽 끝: 아짐키야를 이긴 뒤의 상태(pines_ajimkiya_won)로 공터 앞에서 다시 시작해 끝 문(pines_statue_door)을 지난다
  await page.goto('http://localhost:8000/?qa=jjajang_pines_center');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_pines' && !window.game.dialogue.running && !window.game.transitioning, null, { timeout: 30000 });
  console.log('FIXTURE pines-won: 아짐키야 전투 승리 플래그만 세운다(전투 자체는 jjajang-pines-center 가 검사)');
  await page.evaluate(() => { window.game.flags.pines_ajimkiya_won = true; });
  await page.waitForTimeout(400);
  const east = await go('ArrowRight', "g.mapId === 'jjajang_statue'", 25000);
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500); s = await st(); await cap('06_right_end_statue');
  check(east && s.map === 'jjajang_statue' && s.px < 3 * 32 && s.follower && s.party.includes('janitor'), '이긴 뒤엔 공터를 지나 오른쪽 끝 문으로 석상 앞 숲(jjajang_statue) 왼쪽 입구에 닿고 청소부가 따라온다 ' + JSON.stringify(s));
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
