// 짜장 곧은 길(BUILD227): 중간에서 “어이 잠깐” → 청소부는 멈추고 요플래만 한 발짝 앞으로 가 간격이 벌어진 뒤 뒤를 돌아본다 → 대사 넷(껄껄 뒤 웃음) → 끝 → 오른쪽 끝 → 검은 소나무 숲 왼쪽 입구(브금 이어짐).
//   실행: tests/playtest/run.sh jjajang-walk
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'walk_' + n + '.png') }); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 40 }).then(() => true).catch(() => false);
const st = () => page.evaluate(() => { const g = window.game; const f = g.entities.find(e => e.def?.type === 'follower' && !e.dead); return { map: g.mapId, px: Math.round(g.player.x), py: Math.round(g.player.y), facing: g.player.facing, bgm: g.sound.bgmName, t: g.sound.bgm ? +g.sound.bgm.currentTime.toFixed(2) : null, follower: f ? { x: Math.round(f.x), y: Math.round(f.y), facing: f.facing } : null }; });
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
  await page.goto('http://localhost:8000/?qa=jjajang_walk');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_walk' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  let s = await st(); check(s.follower && s.bgm === 'my_castle_town', '곧은 길 QA: 청소부 동행, my_castle_town ' + JSON.stringify(s));
  await page.keyboard.down('ArrowRight');
  const fired = await until(() => window.game.dialogue.running && window.game.flags.jjajang_walk_started, 10000);
  await page.keyboard.up('ArrowRight');
  check(fired, '중간에서 걷는 것만으로 연출이 시작된다');
  // “어이 잠깐” 이 떠 있는 동안(넘기기 전)의 자리를 기준으로 잰다
  check(await until(() => window.game.textbox.node?.text?.includes('어이 잠깐'), 8000), '대사: 어이 잠깐');
  if (await page.evaluate(() => window.game.textbox.state === 'typing')) { await press('KeyC'); await until(() => window.game.textbox.state === 'waiting', 3000); }
  const at0 = await st(); await cap('01_wait');
  await press('KeyC');
  check(await until(() => window.game.player.facing === 'left', 5000), '요플래가 뒤를 돌아본다');
  await page.waitForTimeout(200); s = await st(); await cap('02_gap');
  check(s.px >= at0.px + 28 && s.follower && Math.abs(s.follower.x - at0.follower.x) < 4 && s.px - s.follower.x > at0.px - at0.follower.x + 24, '청소부는 멈춰 있고 요플래만 한 발짝 앞으로 가 간격이 벌어진다 ' + JSON.stringify({ at0, s }));
  check(s.follower.facing === 'right' && s.facing === 'left', '서로 마주 본다');
  await line('너무 빠르네');
  await line('시프트를 누르면');
  await line('껄껄 알겠네');
  check(await until(() => { const j = window.game.entities.find(e => e.id === 'janitor' && !e.dead); return j && !!j.motion; }, 3000), '껄껄 뒤에 웃는다');
  await page.waitForTimeout(250); await cap('03_laugh');
  await line('때로는 천천히');
  check(await until(() => !window.game.dialogue.running && window.game.flags.jjajang_walk_done, 6000), '연출이 끝난다');
  s = await st(); check(s.facing === 'right' && s.follower && s.follower.x < s.px, '다시 오른쪽을 보고 청소부는 뒤에 ' + JSON.stringify(s));
  const t1 = s.t;
  const east = await go('ArrowRight', "g.mapId === 'jjajang_pines'", 25000);
  await page.waitForTimeout(800); s = await st(); await cap('04_pines');
  check(east && s.map === 'jjajang_pines' && s.px < 3 * 32 && s.follower, '오른쪽 끝 → 검은 소나무 숲 왼쪽 입구 ' + JSON.stringify(s));
  check(s.bgm === 'my_castle_town' && s.t > t1, `브금이 이어진다 (${t1} → ${s.t})`);
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
