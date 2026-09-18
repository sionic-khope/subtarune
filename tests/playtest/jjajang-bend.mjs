// 짜장 굽이 길(BUILD227): 토리이 길 오른쪽 문 → 굽이 길(my_castle_town 시작) → 위·오른쪽·밑·오른쪽 → 돌 조사(청소부 두 마디 → 청소부가 다가가 줍는다 → 돌을 얻었다) → 위로 → 곧은 길(브금 이어짐).
//   실행: tests/playtest/run.sh jjajang-bend
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'bend_' + n + '.png') }); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 40 }).then(() => true).catch(() => false);
const st = () => page.evaluate(() => { const g = window.game; const f = g.entities.find(e => e.def?.type === 'follower' && !e.dead); return { map: g.mapId, px: Math.round(g.player.x), py: Math.round(g.player.y), bgm: g.sound.bgmName, t: g.sound.bgm ? +g.sound.bgm.currentTime.toFixed(2) : null, follower: f ? { x: Math.round(f.x), y: Math.round(f.y) } : null, inv: [...g.inventory], rock: g.entities.some(e => e.id === 'jjajang_rock' && !e.dead) }; });
const go = async (key, cond, ms, run = true) => { await page.evaluate(c => { window.__cond = c; }, cond); if (run) await page.keyboard.down('KeyX'); await page.keyboard.down(key); const ok = await page.waitForFunction(() => new Function('g', 'return ' + window.__cond)(window.game), null, { timeout: ms, polling: 40 }).then(() => true).catch(() => false); await page.keyboard.up(key); if (run) await page.keyboard.up('KeyX'); await page.waitForTimeout(120); return ok; };
const line = async (text, capture) => {
  const seen = await page.waitForFunction(t => window.game.textbox.node?.text?.includes(t), text, { timeout: 12000, polling: 60 }).then(() => true).catch(() => false);
  check(seen, `대사: ${text}`); if (!seen) throw new Error('missing line ' + text);
  if (await page.evaluate(() => window.game.textbox.state === 'typing')) { await press('KeyC'); await until(() => window.game.textbox.state === 'waiting', 3000); }
  if (capture) await cap(capture);
  const before = await page.evaluate(() => window.game.textbox.node?.text);
  await press('KeyC');
  await page.waitForFunction(p => !window.game.dialogue.running || window.game.textbox.node?.text !== p, before, { timeout: 4000, polling: 40 }).catch(() => {});
};
try {
  await page.goto('http://localhost:8000/?qa=jjajang_torii_joined');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_torii' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  const crossed = await go('ArrowRight', "g.mapId === 'jjajang_bend'", 15000);
  await page.waitForTimeout(800); let s = await st(); await cap('01_enter');
  check(crossed && s.map === 'jjajang_bend' && s.follower, '토리이 길 오른쪽 문 → 굽이 길, 청소부 동행 ' + JSON.stringify(s));
  check(s.bgm === 'my_castle_town', '이 맵부터 my_castle_town ' + s.bgm);
  check(await go('ArrowRight', 'g.player.x >= 2 * 32 + 4', 8000), '입구에서 길로');
  check(await go('ArrowUp', 'g.player.y <= 8 * 32 + 8', 20000), '위로');
  check(await go('ArrowRight', 'g.player.x >= 24 * 32 + 4', 20000), '오른쪽으로'); await cap('02_top_leg');
  check(await go('ArrowDown', 'g.player.y >= 32 * 32 + 2', 20000), '밑으로');
  // 돌: 윗줄(16행)을 따라 오른쪽으로 걷다가 돌에 막힌 자리에서 C
  await go('ArrowRight', 'g.player.x >= 38 * 32 + 6 - 25', 20000, true);
  await go('ArrowRight', 'g.player.x >= 38 * 32 + 6 - 25', 6000, false);
  await page.waitForTimeout(250); s = await st(); await cap('03_at_rock');
  check(s.rock && s.px < 38 * 32 + 6, '윗줄에서는 돌에 막힌다 ' + JSON.stringify([s.px, s.py]));
  await press('KeyC');
  await line('허허 볼품없는 돌이라네', '04_line');
  await line('누군가는 이걸 품어줘야지');
  check(await until(() => { const j = window.game.entities.find(e => e.id === 'janitor' && !e.dead), r = window.game.entities.find(e => e.id === 'jjajang_rock' && !e.dead); return j && r && Math.abs(j.x + j.w - r.x) < 10; }, 8000), '청소부가 돌 옆으로 다가간다');
  await cap('05_janitor_at_rock');
  await line('을 얻었다', '06_got_rock');
  check(await until(() => !window.game.dialogue.running && window.game.flags.jjajang_rock_taken, 6000), '이벤트가 끝난다');
  s = await st(); check(s.inv.includes('돌') && !s.rock, '돌이 인벤토리에 들어오고 길에서 사라진다 ' + JSON.stringify(s.inv));
  const use = await page.evaluate(() => { const g = window.game; const before = g.hpOf('hyungsub'); const ok = g.useItemOn('돌', 'hyungsub'); return { ok, before, after: g.hpOf('hyungsub'), inv: [...g.inventory] }; });
  check(use.ok && use.after === use.before - 5 && !use.inv.includes('돌'), '돌을 쓰면 HP 가 5 줄어든다 ' + JSON.stringify(use));
  const t1 = (await st()).t;
  check(await go('ArrowRight', 'g.player.x >= 50 * 32 + 4', 20000), '오른쪽으로');
  const up = await go('ArrowUp', "g.mapId === 'jjajang_walk'", 30000);
  await page.waitForTimeout(800); s = await st(); await cap('07_walk_from_west');
  check(up && s.map === 'jjajang_walk' && s.follower, '위 가장자리 → 곧은 길 왼쪽 입구 ' + JSON.stringify(s));
  check(s.bgm === 'my_castle_town' && s.t > t1, `맵을 옮겨도 브금이 다시 재생되지 않고 이어진다 (${t1} → ${s.t})`);
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
