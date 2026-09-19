// 드럼통 둥지(BUILD249): 굽은 물길 오른쪽 문 → 브금이 꺼지고, 오른쪽으로 1초쯤 걸으면 드럼통 더미가 두른 동그란 공간 → 가운데 오른쪽 드럼통에 C. 실행: tests/playtest/run.sh jjajang-nest
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'nest_' + n + '.png') }); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
const st = () => page.evaluate(() => { const g = window.game; return { map: g.mapId, px: Math.round(g.player.x), py: Math.round(g.player.y), bgm: g.sound?.bgmName ?? null, text: g.textbox.node?.text || null }; });
const go = async (key, cond, ms, run = false) => { await page.evaluate(c => { window.__cond = c; }, cond); if (run) await page.keyboard.down('KeyX'); await page.keyboard.down(key); const ok = await page.waitForFunction(() => new Function('g', 'return ' + window.__cond)(window.game), null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false); await page.keyboard.up(key); if (run) await page.keyboard.up('KeyX'); await page.waitForTimeout(100); return ok; };
try {
  // 굽은 물길 오른쪽 끝에서 문으로 들어간다 — 브금(my_castle_town)이 꺼져야 한다
  await page.goto('http://localhost:8000/?qa=jjajang_bend2');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_bend2' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  let s = await st(); check(s.bgm === 'my_castle_town', '굽은 물길: 브금이 흐른다 ' + s.bgm);
  const B = await page.evaluate(() => window.game.map.def.meta.bend);
  check(await go('ArrowRight', `g.player.x >= ${B.downCols[0] * 32 + 4}`, 25000, true), '윗길 오른쪽 끝');
  check(await go('ArrowDown', `g.player.y >= ${B.lowerRows[0] * 32 + 4}`, 15000, true), '아래로');
  check(await go('ArrowRight', "g.mapId === 'jjajang_nest'", 30000, true), '오른쪽 문 → 드럼통 둥지');
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 10000 });
  await page.waitForTimeout(800);
  s = await st(); check(!s.bgm, `둥지에 들어서면 브금이 꺼진다 (${s.bgm})`);
  await cap('00_entry');
  // 오른쪽으로 걸어 원형 공간 안으로(1초쯤)
  const N = await page.evaluate(() => window.game.map.def.meta.nest);
  const t0 = Date.now();
  check(await go('ArrowRight', `g.player.x >= ${(N.center[0] - N.radius) * 32}`, 15000), '1초쯤 걸으면 동그란 공간');
  const walked = (Date.now() - t0) / 1000;
  check(walked < 3, `입구에서 공간까지 ${walked.toFixed(1)}초`);
  check(await go('ArrowRight', `g.player.x >= ${(N.center[0] - 4) * 32}`, 15000), '공간 안쪽으로');
  await page.waitForTimeout(300); await cap('01_arena');
  const piles = await page.evaluate(() => window.game.entities.filter(e => /jjajang_nest_pile/.test(e.id || '')).length);
  check(piles >= 10, `드럼통 더미 ${piles}개가 둘러싼다`);
  // 가운데 오른쪽 드럼통에 C
  // 가운데 오른쪽 드럼통: 같은 줄에서 오른쪽으로 밀고 가면 막힌다(solid) → 그 자리에서 C
  await page.evaluate(() => window.game.changeMap('jjajang_nest', 'before_drum'));
  await page.waitForFunction(() => window.game.mapId === 'jjajang_nest' && !window.game.transitioning, null, { timeout: 10000 });
  await page.waitForTimeout(700);
  const drum = await page.evaluate(() => { const e = window.game.entities.find(x => x.id === 'jjajang_nest_drum'); return { x: e.x, y: e.y, w: e.w, h: e.h }; });
  await page.keyboard.down('ArrowRight');
  const blocked = await until(() => window.game.player.x + window.game.player.w >= window.game.entities.find(x => x.id === 'jjajang_nest_drum').x - 8, 15000);
  await page.keyboard.up('ArrowRight');
  check(blocked, '드럼통 앞에서 막힌다 ' + JSON.stringify({ px: await page.evaluate(() => Math.round(window.game.player.x)), drumX: drum.x }));
  await page.waitForTimeout(150);
  let opened = false;
  for (let i = 0; i < 3 && !opened; i += 1) { await press('KeyC'); opened = await until(() => window.game.dialogue.running, 1200); }
  check(opened, '드럼통에 C 로 상호작용');
  await cap('02_drum');
  for (let i = 0; i < 4 && (await page.evaluate(() => window.game.dialogue.running)); i += 1) { await press('KeyC'); await page.waitForTimeout(150); }
  s = await st(); check(!s.bgm, '상호작용 뒤에도 브금은 꺼진 채');
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
