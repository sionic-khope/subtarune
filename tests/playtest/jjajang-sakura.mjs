// 벚꽃 숲(jjajang_sakura, BUILD261~262): QA jjajang_sakura 에서 브금 sakura·꽃잎 조금·발소리 없음 → 위로 달려 넓은 풀숲 초입 트리거(예약) → 브금 하이라이트 11.0초에 거대 벚꽃 대각선 sweep(2.5초)·꽃잎 폭발·땅과 나무가 번지듯 분홍으로 → 위로 → 오른쪽으로 꺾어 끝까지 → 재진입 땐 처음부터 핀 상태. 실행: tests/playtest/run.sh jjajang-sakura
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'warning' && /cutscene|bloom|tiles|없음/.test(m.text())) errors.push('warn: ' + m.text()); });
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'sakura_' + n + '.png') }); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
const ev = fn => page.evaluate(fn);
const go = async (key, cond, ms, run = false) => { await page.evaluate(c => { window.__cond = c; }, cond); if (run) await page.keyboard.down('KeyX'); await page.keyboard.down(key); const ok = await until(() => new Function('g', 'return ' + window.__cond)(window.game), ms); await page.keyboard.up(key); if (run) await page.keyboard.up('KeyX'); return ok; };
const pink = () => ev(() => { const c = document.querySelector('canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0, all = 0; for (let i = 0; i < d.length; i += 16) { all++; if (d[i] > 150 && d[i] > d[i + 1] + 50 && d[i + 2] > 110) n++; } return n / all; });
const state = () => ev(() => { const g = window.game; return { map: g.mapId, bgm: g.sound.bgmName, petals: g.petals?.count ?? -1, rate: g.petals?.rate, bloom: !!g.flags.sakura_bloom, spread: !!g.tileSpread, walkLoop: !!g.sound.w, row: Math.floor((g.player.y + g.player.h) / 32), col: Math.floor((g.player.x + 12) / 32), bloomedTrees: g.entities.filter(e => e.def?.bloom).length ? g.entities.filter(e => e.def?.bloom && e.bloomed).length : -1, trees: g.entities.filter(e => e.def?.bloom).length, groundRows: g.map.rows.filter(r => r.includes('(')).length, pinkRows: g.map.rows.filter(r => r.includes(')')).length }; });
try {
  await page.goto('http://localhost:8000/?qa=jjajang_sakura');
  check(await until(() => window.game?.mapId === 'jjajang_sakura' && !window.game.transitioning, 30000), '벚꽃 숲 QA 진입');
  await page.waitForTimeout(1500);
  let s = await state(); check(s.bgm === 'sakura', `브금 sakura (${s.bgm})`);
  check(s.petals > 0 && s.petals < 40, `꽃잎이 조금씩 날린다(${s.petals}개, rate ${s.rate})`);
  check(s.groundRows === 82 && s.pinkRows === 0 && s.bloomedTrees === 0, `아직 검은 풀숲 땅·어두운 나무 ${JSON.stringify([s.groundRows, s.pinkRows, s.bloomedTrees, s.trees])}`);
  const pinkBefore = await pink(); await cap('00_entry');
  // 걸어 올라가면서 발소리 루프가 켜지지 않는다(사용자 “벚꽃맵부터는 발소리 안나게”)
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(700);
  const walking = await state(); await page.keyboard.up('ArrowUp');
  check(!walking.walkLoop && walking.row < s.row, `걷는 동안 발소리 루프 없음(walkLoop ${walking.walkLoop}, ${s.row}→${walking.row}행)`);
  // 기본이 달리기(≈220px/s): 54행 길을 달리면 브금 하이라이트(11.0초) 전에 풀숲 초입에 닿아 예약(bloomArmed) → 하이라이트 순간에 거대 벚꽃 sweep + 번짐(사용자 “몇초 걷다가 브금 하이라이트때 쫙”)
  check(await go('ArrowUp', 'g.flags.sakura_bloom', 30000), '위로 달려 넓은 풀숲 초입 → 플래그 sakura_bloom');
  const armed = await ev(() => ({ armed: window.game.bloomArmed, spread: !!window.game.tileSpread, bgm: +(window.game.bgmTime() ?? -1).toFixed(2), atBgm: window.game.map.def.meta.bloom.atBgm }));
  check(armed.armed && !armed.spread && armed.bgm >= 0 && armed.bgm < armed.atBgm, `하이라이트 전에 닿아 예약만(브금 ${armed.bgm}초 < ${armed.atBgm}) ${JSON.stringify(armed)}`);
  check(await until(() => !!window.game.tileSpread, 12000), '브금 하이라이트에 번짐 시작');
  const fired = await ev(() => ({ bgm: +(window.game.bgmTime() ?? -1).toFixed(2), sweep: !!window.game.sweep, sweepT: +(window.game.sweep?.t ?? -1).toFixed(2), img: !!window.game.sweep?.image, petalImg: !!window.game.sweep?.petal }));
  check(Math.abs(fired.bgm - armed.atBgm) < 0.35 && fired.sweep && fired.img && fired.petalImg, `브금 ${fired.bgm}초(하이라이트 ${armed.atBgm}) 에 거대 벚꽃 sweep 시작 ${JSON.stringify(fired)}`);
  await page.waitForTimeout(1250); s = await state(); await cap('01_sweep');   // sweep 2.5초의 한가운데
  const mid = await ev(() => { const g = window.game; const c = document.querySelector('canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let big = 0; for (let i = 0; i < d.length; i += 8) if (d[i] > 200 && d[i + 1] > 120 && d[i + 1] < 215 && d[i + 2] > 170) big++; return { t: +(g.sweep?.t ?? -1).toFixed(2), pinkPixels: big / (d.length / 8) }; });
  check(mid.t > 0.9 && mid.t < 1.8 && mid.pinkPixels > 0.03, `sweep 중간(1.25초)에 큰 벚꽃이 화면에 있다 ${JSON.stringify(mid)}`);
  check(s.petals > 150 && s.spread, `꽃잎 폭발(${s.petals}개)·번짐 진행 중`);
  check(await until(() => !window.game.sweep, 7000), 'sweep 은 2.5초(+꼬리) 뒤 끝');
  check(!(await ev(() => window.game.dialogue.running)), '멈춤 없이 걸을 수 있다');
  s = await state(); await cap('02_spreading');
  check(s.pinkRows > 3 && s.groundRows > 3 && s.bloomedTrees > 0 && s.bloomedTrees < s.trees, `번지는 중: 분홍 ${s.pinkRows}행/검은 ${s.groundRows}행, 벚꽃 나무 ${s.bloomedTrees}/${s.trees}`);
  check(await until(() => !window.game.tileSpread, 12000), '번짐 끝');
  await page.waitForTimeout(1500); s = await state(); await cap('03_bloomed');
  check(s.groundRows === 0 && s.pinkRows === 82 && s.bloomedTrees === s.trees, `땅 전부 분홍·나무 전부 벚꽃 ${JSON.stringify([s.groundRows, s.pinkRows, s.bloomedTrees, s.trees])}`);
  check(s.rate === 18 && s.petals > 40, `그 뒤에도 작은 꽃잎이 계속(rate ${s.rate}, ${s.petals}개)`);
  const pinkAfter = await pink(); check(pinkAfter > pinkBefore + 0.08, `화면이 분홍으로 바뀌었다(분홍 픽셀 ${(pinkBefore * 100).toFixed(1)}% → ${(pinkAfter * 100).toFixed(1)}%)`);
  // 살짝 더 올라가서 오른쪽으로 꺾어 끝까지
  check(await go('ArrowUp', 'g.player.y <= 9 * 32 + 8', 30000, true), '풀숲을 지나 위 길 끝(오른쪽으로 꺾이는 곳)');
  check(await go('ArrowRight', 'g.player.x >= 27 * 32', 20000, true), '오른쪽으로 꺾어 끝까지 걸어간다');
  await page.waitForTimeout(300); s = await state(); await cap('04_east_end');
  check(s.map === 'jjajang_sakura' && s.col >= 27, `오른쪽 끝 가까이(${s.col}열)`);
  check(await go('ArrowRight', "g.mapId === 'jjajang_sakura2'", 10000, true), '오른쪽 문 → 벚꽃 숲 2(BUILD264)');
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 10000 });
  // 재진입: 플래그가 선 채 다시 들어오면 처음부터 핀 상태(땅·나무·꽃잎 after 밀도)
  await ev(() => window.game.changeMap('jjajang_sakura', 'from_south'));
  check(await until(() => window.game.mapId === 'jjajang_sakura' && !window.game.transitioning && window.game.player.y > 84 * 32, 15000), '입구로 재진입');
  await page.waitForTimeout(800); s = await state(); await cap('05_reentry');
  check(s.groundRows === 0 && s.pinkRows === 82 && s.bloomedTrees === s.trees && s.rate === 18 && !s.spread, `재진입도 핀 상태 ${JSON.stringify([s.groundRows, s.pinkRows, s.bloomedTrees, s.rate])}`);
  // 공터 위 문 ↔ 벚꽃 숲 연결
  await page.goto('http://localhost:8000/?qa=jjajang_glade');
  check(await until(() => window.game?.mapId === 'jjajang_glade' && !window.game.transitioning, 30000), '공터 QA');
  await ev(() => { const g = window.game; const p = g.player; p.x = 18 * 32 - 8; p.y = 3 * 32; g.camera.snap(); });
  check(await go('ArrowUp', "g.mapId === 'jjajang_sakura'", 15000, true), '공터 위 문 → 벚꽃 숲');
} catch (e) { fails += 1; console.log('FAIL exception', e.message); await cap('99_error'); }
check(errors.length === 0, `페이지 오류 없음 ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
console.log('fails=' + fails);
process.exit(fails ? 1 : 0);
