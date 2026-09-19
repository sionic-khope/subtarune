// 석상 앞 숲(BUILD228): 석상 아래에서 위로 가면 막힌다 → C → 브금 끔 → 둘 다 한 칸 물러서 위를 본다 → 카메라가 올라가 석상 전체가 대화창 위에 → 원문 26줄(껄껄 두 곳 뒤 웃음) → 브금·카메라 복귀 → 다시 C 는 무반응(막힘 유지)
//   → 길로 내려가 오른쪽 끝까지. 문: 석상 앞 숲 왼쪽 ↔ 소나무 숲 오른쪽(브금 이어짐). 실행: tests/playtest/run.sh jjajang-statue
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'statue_' + n + '.png') }); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 40 }).then(() => true).catch(() => false);
const st = () => page.evaluate(() => { const g = window.game; const f = g.entities.find(e => e.def?.type === 'follower' && !e.dead); return { map: g.mapId, px: Math.round(g.player.x), py: Math.round(g.player.y), facing: g.player.facing, bgm: g.sound.bgmName, t: g.sound.bgm ? +g.sound.bgm.currentTime.toFixed(2) : null, cam: [Math.round(g.camera.x), Math.round(g.camera.y)], locked: !!g.camera.locked, follower: f ? { x: Math.round(f.x), y: Math.round(f.y), facing: f.facing, motion: !!f.motion } : null }; });
const go = async (key, cond, ms, run = true) => { await page.evaluate(c => { window.__cond = c; }, cond); if (run) await page.keyboard.down('KeyX'); await page.keyboard.down(key); const ok = await page.waitForFunction(() => new Function('g', 'return ' + window.__cond)(window.game), null, { timeout: ms, polling: 40 }).then(() => true).catch(() => false); await page.keyboard.up(key); if (run) await page.keyboard.up('KeyX'); await page.waitForTimeout(120); return ok; };
const hold = async (key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(120); };
const line = async (text, capture) => {
  const seen = await page.waitForFunction(t => window.game.textbox.node?.text?.includes(t), text, { timeout: 12000, polling: 60 }).then(() => true).catch(() => false);
  check(seen, `대사: ${text}`); if (!seen) throw new Error('missing line ' + text);
  if (await page.evaluate(() => window.game.textbox.state === 'typing')) { await press('KeyC'); await until(() => window.game.textbox.state === 'waiting', 3000); }
  if (capture) await cap(capture);
  const before = await page.evaluate(() => window.game.textbox.node?.text);
  await press('KeyC');
  await page.waitForFunction(p => !window.game.dialogue.running || window.game.textbox.node?.text !== p, before, { timeout: 4000, polling: 40 }).catch(() => {});
};
const LINES = ['여기 숲은', '짜장숲', '깊은곳에는', '어둠의 힘', '그릇의 인간', '눈이 하나인', '동상을 깔아뒀다하지', '껄껄',
  '왕국을 구축하려는', '문제가 하나 있네', '부여하는것인데', '먹거나, 마시거나', '그리고 문제는', '짜장면이 존재한다고하네', '위험인물이 받게되면', '지나친 생각이였나.',
  '문제가 하나 더 있네', '바다에 잠식해있던', '어떠한 악마가.', '활동하기 시작했네', '드럼통의 악마', '잔혹하고 강력하네', '제대로 기억하는', '말이 너무 많았지', '오른쪽으로 가보는건'];
try {
  await page.goto('http://localhost:8000/?qa=jjajang_statue_front');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_statue' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  let s = await st(); check(s.follower && s.bgm === 'my_castle_town' && s.facing === 'up', '석상 아래 QA: 청소부 동행, my_castle_town ' + JSON.stringify(s));
  await hold('ArrowUp', 1600);
  s = await st(); await cap('01_blocked');
  const statue = await page.evaluate(() => { const e = window.game.entities.find(x => x.id === 'jjajang_statue'); return { x: e.x, y: e.y, w: e.w, h: e.h, iy: e.def.iy, ih: e.ih }; });
  check(s.py >= statue.y + statue.h && s.py <= statue.y + statue.h + 10, '석상이 막는다(위로 못 간다) ' + JSON.stringify({ py: s.py, statue }));
  const at0 = s;
  await press('KeyC');
  check(await until(() => window.game.dialogue.running, 3000), 'C 로 이야기가 시작된다');
  check(await until(() => !window.game.sound.bgmName, 3000), '브금이 꺼진다');
  check(await page.waitForFunction(y => window.game.player.y >= y, at0.py + 28, { timeout: 4000, polling: 40 }).then(() => true).catch(() => false), '요플래가 한 칸 물러선다');
  check(await page.waitForFunction(x => window.game.player.x <= x, at0.px - 28, { timeout: 4000, polling: 40 }).then(() => true).catch(() => false), '요플래가 왼쪽으로 한 칸 퍼진다');
  await page.waitForTimeout(400); s = await st();
  check(s.follower && s.py >= at0.py + 28 && Math.abs(s.follower.y - s.py) <= 6 && s.follower.x >= s.px + 56 && s.facing === 'up' && s.follower.facing === 'up', '청소부는 물러선 뒤 오른쪽으로 퍼져 요플래와 같은 줄, 둘 다 위를 본다 ' + JSON.stringify({ at0, s }));
  await line('여기 숲은');
  s = await st();
  check(s.locked && s.cam[1] <= statue.iy - 4 && statue.iy + statue.ih - s.cam[1] <= 230, `카메라가 올라가 석상 전체(${statue.iy}~${statue.iy + statue.ih})가 대화창 위에 (cam ${s.cam})`);
  await line('짜장숲', '02_view');
  for (const t of LINES.slice(2, 7)) await line(t);
  await line('껄껄');
  check(await until(() => { const j = window.game.entities.find(e => e.id === 'janitor' && !e.dead); return j && !!j.motion; }, 3000), '껄껄 뒤에 웃는다');
  await page.waitForTimeout(280); await cap('03_laugh');
  for (const t of LINES.slice(8, 15)) await line(t);
  await line('지나친 생각이였나.');
  check(await until(() => { const j = window.game.entities.find(e => e.id === 'janitor' && !e.dead); return j && !!j.motion; }, 3000), '두 번째 껄껄 뒤에도 웃는다');
  for (const t of LINES.slice(16, 24)) await line(t);
  await line('오른쪽으로 가보는건', '04_last');
  check(await until(() => !window.game.dialogue.running && window.game.flags.jjajang_statue_told, 6000), '이야기가 끝난다');
  check(await until(() => window.game.sound.bgmName === 'my_castle_town', 4000), '브금이 돌아온다');
  await page.waitForTimeout(900); s = await st();
  check(!s.locked && Math.abs(s.cam[1] - (s.py - 172)) < 40 && s.follower && s.follower.y > s.py, '카메라가 요플래로 돌아오고 청소부는 뒤에 ' + JSON.stringify(s));
  await cap('05_after');
  await hold('ArrowUp', 900);
  await press('KeyC'); await page.waitForTimeout(700);
  s = await st();
  check(!(await page.evaluate(() => window.game.dialogue.running)) && s.py >= statue.y + statue.h, '다시 C 는 이야기 없음, 여전히 막혀 있다');
  const t1 = s.t;
  await go('ArrowRight', 'g.player.x >= 28 * 32 + 8', 3000);
  check(await go('ArrowDown', 'g.player.y >= 14 * 32', 8000), '길로 내려온다');
  check(await go('ArrowRight', 'g.player.x >= 57 * 32', 25000), '오른쪽 끝까지');
  s = await st(); await cap('06_east_end');
  check(s.map === 'jjajang_statue' && s.bgm === 'my_castle_town' && s.t > t1, '오른쪽 끝(다음 맵 대기), 브금 이어짐');
  // 문: 왼쪽 가장자리 ↔ 소나무 숲 오른쪽 끝
  await page.goto('http://localhost:8000/?qa=jjajang_statue');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_statue' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(400); s = await st(); const t2 = s.t;
  // 갈림목까지 오른쪽으로 → 청소부: 위로 한번 가보새 (한 번)
  const hinted = await go('ArrowRight', 'g.dialogue.running && g.flags.jjajang_statue_hint_started', 20000);
  check(hinted, '가운데 길 갈림목에서 연출이 시작된다');
  await line('위로 한번 가보새', '08_hint');
  check(await until(() => !window.game.dialogue.running && window.game.flags.jjajang_statue_hint_done, 5000), '한마디 뒤 끝');
  s = await st(); check(s.follower && s.follower.facing === 'right' && s.follower.x < s.px && s.px >= 26 * 32 && s.px <= 31 * 32, '청소부가 요플래 쪽을 본다 ' + JSON.stringify(s));
  check(await go('ArrowLeft', 'g.player.x <= 3 * 32', 20000), '왼쪽 입구로 되돌아온다');
  check(await go('ArrowLeft', "g.mapId === 'jjajang_pines'", 8000), '왼쪽 문 → 소나무 숲');
  await page.waitForTimeout(600); s = await st(); await cap('07_pines_east');
  check(s.map === 'jjajang_pines' && s.px > 60 * 32 && s.facing === 'left' && s.follower && s.bgm === 'my_castle_town' && s.t > t2, '소나무 숲 오른쪽 끝, 브금 이어짐 ' + JSON.stringify(s));
  check(await go('ArrowRight', "g.mapId === 'jjajang_statue'", 8000), '소나무 숲 오른쪽 문 → 석상 앞 숲');
  await page.waitForTimeout(500); s = await st();
  check(s.map === 'jjajang_statue' && s.px < 3 * 32 && s.follower, '석상 앞 숲 왼쪽 입구 ' + JSON.stringify(s));
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
