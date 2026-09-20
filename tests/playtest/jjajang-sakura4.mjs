// 벚꽃 숲 4(BUILD266): 다오·배찌 표준 조우 — QA 다오 앞에서 오른쪽으로 → 닿으면 전투(배경 sakura, 적 그림) → 이기면 제거·플래그·브금 복귀 → QA 배찌 앞에서 같은 흐름. 실행: tests/playtest/run.sh jjajang-sakura4
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) errors.push(m.type() + ': ' + m.text().slice(0, 160)); });
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'sakura4_' + n + '.png') }); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
const ev = fn => page.evaluate(fn);
const st = () => ev(() => { const g = window.game; return { map: g.mapId, bgm: g.sound.bgmName, battle: !!g.battle, state: g.battle?.state || null, enemies: g.entities.filter(e => e.def?.type === 'enemy' && !e.dead).map(e => e.id), flags: { dao: !!g.flags.jjajang_sakura4_dao_defeated, bazzi: !!g.flags.jjajang_sakura4_bazzi_defeated }, money: g.money, petals: g.petals?.count ?? -1, px: Math.round(g.player.x), py: Math.round(g.player.y) }; });
async function encounter(qa, id, key) {
  await page.goto(`http://localhost:8000/?qa=${qa}`);
  check(await until(() => window.game?.mapId === 'jjajang_sakura4' && !window.game.transitioning, 30000), `${id}: QA 진입`);
  await page.waitForTimeout(600); let s = await st();
  check(s.bgm === 'sakura' && s.enemies.includes(id) && s.petals > 0, `${id}: 브금 sakura·필드에 ${id}·꽃잎 ${JSON.stringify(s.enemies)}`);
  const sprite = await page.evaluate(i => { const e = window.game.entities.find(x => x.id === i); return e ? { x: Math.round(e.x), y: Math.round(e.y), visible: e.visible !== false } : null; }, id);
  check(!!sprite && sprite.visible, `${id}: 필드 스프라이트 ${JSON.stringify(sprite)}`); await cap(`${id}_00_field`);
  await page.keyboard.down(key);
  check(await until(() => !!window.game.battle, 15000), `${id}: 닿으면 표준 조우`); await page.keyboard.up(key);
  check(await until(() => window.game.battle && window.game.battle.state === 'intro' && window.game.battle.enemies.every(e => e.img), 15000), `${id}: 전투 열림(적 그림 적재)`);
  await page.waitForTimeout(500);
  const b = await ev(() => { const bt = window.game.battle; return { bg: bt.cfg.bg, names: bt.enemies.map(e => e.name), hp: bt.enemies.map(e => e.hp), bgm: window.game.sound.bgmName }; });
  check(b.bg === 'sakura' && b.hp[0] === 36 && b.bgm === 'jjajang_battle', `${id}: 배경 sakura·체력 36·전투 브금 ${JSON.stringify(b)}`); await cap(`${id}_01_battle`);
  const money0 = (await st()).money;
  await ev(() => window.game.battle.finish(true));
  check(await until(() => !window.game.battle && !window.game.dialogue.running && !window.game.transitioning, 15000), `${id}: 승리 뒤 맵으로`);
  await page.waitForTimeout(700); s = await st();
  check(!s.enemies.includes(id) && s.flags[id] && s.bgm === 'sakura', `${id}: 제거·플래그·브금 복귀 ${JSON.stringify({ enemies: s.enemies, flags: s.flags, bgm: s.bgm, money: [money0, s.money] })}`);
  await cap(`${id}_02_after`);
}
try {
  await encounter('jjajang_sakura4_dao', 'dao', 'ArrowRight');
  await encounter('jjajang_sakura4_bazzi', 'bazzi', 'ArrowLeft');
  // 입구 → 지그재그 끝까지 걸을 수 있다(길이)
  await page.goto('http://localhost:8000/?qa=jjajang_sakura4'); await until(() => window.game?.mapId === 'jjajang_sakura4' && !window.game.transitioning, 30000);
  await ev(() => { window.game.setFlag('jjajang_sakura4_dao_defeated'); window.game.setFlag('jjajang_sakura4_bazzi_defeated'); for (const e of window.game.entities) if (e.def?.type === 'enemy') e.dead = true; });
  const L = await ev(() => window.game.map.def.meta.sakura4.legs);
  const go = async (key, cond, ms) => { await page.evaluate(c => { window.__cond = c; }, cond); await page.keyboard.down(key); const ok = await until(() => new Function('g', 'return ' + window.__cond)(window.game), ms); await page.keyboard.up(key); return ok; };
  const t0 = Date.now();
  check(await go('ArrowDown', `g.player.y >= ${(L[0][3] - 1) * 32}`, 15000) && await go('ArrowRight', `g.player.x >= ${(L[1][1] - 1) * 32}`, 15000) && await go('ArrowDown', `g.player.y >= ${(L[2][3] - 1) * 32}`, 15000) && await go('ArrowLeft', `g.player.x <= ${(L[3][0] + 1) * 32}`, 15000) && await go('ArrowDown', `g.player.y >= ${(L[4][3] - 1) * 32}`, 15000) && await go('ArrowRight', `g.player.x >= ${(L[5][1] - 1) * 32}`, 15000) && await go('ArrowDown', `g.player.y >= ${(L[6][3] - 2) * 32}`, 15000), `지그재그 끝까지 ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  await cap('03_south_end');
} catch (e) { fails += 1; console.log('FAIL exception', e.message); await cap('99_error'); }
check(errors.length === 0, `페이지 오류 없음 ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
console.log('fails=' + fails);
process.exit(fails ? 1 : 0);
