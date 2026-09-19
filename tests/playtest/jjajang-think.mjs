// 생각 길(BUILD245): 혼잣말 직전에서 오른쪽으로 → 나레이션 4줄 → 요플래 느낌표 → 6줄 → 플래그 → 오른쪽 문 → 굽은 물길(오른쪽 → 아래 → 오른쪽 끝). 실행: tests/playtest/run.sh jjajang-think
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'think_' + n + '.png') }); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
const st = () => page.evaluate(() => { const g = window.game; return { map: g.mapId, px: Math.round(g.player.x), py: Math.round(g.player.y), party: [...g.party], bgm: g.sound?.bgmName ?? null, done: !!g.flags.think_done }; });
const go = async (key, cond, ms, run = true) => { await page.evaluate(c => { window.__cond = c; }, cond); if (run) await page.keyboard.down('KeyX'); await page.keyboard.down(key); const ok = await page.waitForFunction(() => new Function('g', 'return ' + window.__cond)(window.game), null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false); await page.keyboard.up(key); if (run) await page.keyboard.up('KeyX'); await page.waitForTimeout(100); return ok; };
const line = async (text, capture) => {
  const seen = await page.waitForFunction(t => window.game.textbox.node?.text?.includes(t), text, { timeout: 15000, polling: 60 }).then(() => true).catch(() => false);
  check(seen, `나레이션: ${text}`); if (!seen) throw new Error('missing line ' + text);
  if (await page.evaluate(() => window.game.textbox.state === 'typing')) { await press('KeyC'); await until(() => window.game.textbox.state === 'waiting', 3000); }
  if (capture) await cap(capture);
  const before = await page.evaluate(() => window.game.textbox.node?.text);
  await press('KeyC');
  await page.waitForFunction(p => !window.game.dialogue.running || window.game.textbox.node?.text !== p, before, { timeout: 4000, polling: 40 }).catch(() => {});
};
try {
  await page.goto('http://localhost:8000/?qa=jjajang_think_mid');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_think' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  let s = await st(); check(s.party.length === 0 && s.bgm === 'my_castle_town', '혼잣말 직전 QA: 요플래 혼자, 브금 이어짐 ' + JSON.stringify(s));
  await page.keyboard.down('ArrowRight');
  const started = await until(() => window.game.dialogue.running && window.game.flags.think_started, 8000);
  await page.keyboard.up('ArrowRight');
  check(started, '가운데에서 혼잣말 시작');
  await line('아 근데 난 뭘 하고 있는거지', '00_first');
  await line('다시 동료들과 합류해야한다');
  await line('나의 위치를 알릴 수 있는 방법');
  await line('... ... ...');
  check(await until(() => !!window.game.player.emote, 3000), '요플래 느낌표');
  await cap('01_exclaim');
  await line('봉인한 것은 아마도 영클일 것이다', '02_after_bang');
  await line('봉인이 풀렸을때도 감지할 수 있게');
  await line('지금 선택지가 그거밖에 없는듯하다');
  await line('그 동상을 부술 수 있을까');
  await line('아빠에게 조언을 구해야될 것 같다');
  await line('일단 오른쪽으로 쭉 가보자', '03_last');
  check(await until(() => !window.game.dialogue.running && window.game.flags.think_done, 6000), '혼잣말 끝 → 플래그');
  s = await st(); check(s.bgm === 'my_castle_town', '브금은 그대로');
  check(await go('ArrowRight', "g.mapId === 'jjajang_bend2'", 25000), '오른쪽 문 → 굽은 물길');
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 8000 });
  await page.waitForTimeout(300); await cap('04_bend2');
  const B = await page.evaluate(() => window.game.map.def.meta.bend);
  check(await go('ArrowRight', `g.player.x >= ${B.downCols[0] * 32 + 4}`, 20000), '윗길 오른쪽 끝');
  check(await go('ArrowDown', `g.player.y >= ${B.lowerRows[0] * 32 + 4}`, 12000), '아래로');
  check(await go('ArrowRight', 'g.player.x >= g.map.pxW - 3 * 32', 25000), '아랫길 오른쪽 끝(다음 맵 대기)');
  await cap('05_bend2_end');
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
