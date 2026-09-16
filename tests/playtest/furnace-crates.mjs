// 용광로 화물 검사실(BUILD193): QA youngcle15 → 왼쪽 문으로 용암 수로 끝(top_end) 왕복 → 해법대로 상자 밀기(엔진 interact, 25회) → 차단문 열림 → 오른쪽 문 → youngcle16 → 31회 → 열린 오른쪽 끝. 실행: tests/playtest/run.sh furnace-crates
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'crates_' + n + '.png') }); };
const st = () => page.evaluate(() => { const g = window.game; const gate = g.entities.find(e => e.def?.type === 'factory_gate'); return { map: g.mapId, px: Math.round(g.player.x), py: Math.round(g.player.y), solved: !!g.flags[`${g.mapId}_crate_solved`], gate: gate ? gate.solid : null, dialogue: g.dialogue.running, bgm: JSON.stringify([g.sound.bgmName, g.sound.currentBgm, g.sound.bgmId]).includes('pandora_palace'), backdrop: g.map?.def?.backdrop || g.mapDef?.backdrop || null }; });
// 해법대로: 상자 옆에 서서 상자를 향해 C(엔진 interact) — 단위 테스트의 push 헬퍼와 같은 자리
const solve = (mapId) => page.evaluate(async (mapId) => {
  const g = window.game; const data = g.maps ? g.maps[mapId] : null;
  const solution = (data && data.meta.solution) || (await (await fetch(`assets/maps/${mapId}.json`)).json()).meta.solution;
  const dir = { R: 'right', L: 'left', U: 'up', D: 'down' }; let done = 0;
  for (const move of solution) {
    const crate = g.entities.find(e => e.id === `${mapId}_crate_${move[0].toLowerCase()}`); const d = dir[move[1]];
    const pos = { left: [crate.x + crate.w, crate.y + 6], right: [crate.x - g.player.w, crate.y + 6], up: [crate.x + 2, crate.y + crate.h], down: [crate.x + 2, crate.y - g.player.h] }[d];
    [g.player.x, g.player.y] = pos; g.player.facing = d;
    crate.interact(g.player);
    if (!crate.slide) return { done, stuck: move };
    await new Promise(r => setTimeout(r, 200)); done += 1;
  }
  return { done, stuck: null };
}, mapId);
try {
  await page.goto('http://localhost:8000/?qa=youngcle15');
  await page.waitForFunction(() => window.game && window.game.mapId === 'youngcle15' && !window.game.dialogue.running, null, { timeout: 25000 });
  await page.waitForTimeout(800); await cap('room1');
  let s = await st();
  check(s.map === 'youngcle15' && s.gate === true && !s.solved && s.bgm, '검사실 1: 용광로 배경·Pandora Palace·차단문 닫힘 ' + JSON.stringify(s));
  // 왼쪽 문 → 용암 수로 끝(top_end) → 다시 오른쪽으로 걸어 들어온다(문 양방향, 가장자리 칸은 벽이 아니라 바닥 그림)
  await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(() => window.game.mapId === 'youngcle14', null, { timeout: 8000 }).catch(() => {});
  await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(600); s = await st(); await cap('lava_end');
  check(s.map === 'youngcle14' && s.px > 3200, '왼쪽 문 → 용암 수로 끝 착지(top_end) ' + JSON.stringify([s.map, s.px, s.py]));
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.game.mapId === 'youngcle15', null, { timeout: 8000 }).catch(() => {});
  await page.keyboard.up('ArrowRight'); await page.waitForTimeout(600); s = await st();
  check(s.map === 'youngcle15' && s.px < 120, '용암 수로 끝 → 오른쪽으로 걸어 검사실 1 ' + JSON.stringify([s.map, s.px]));
  // 초기화 콘솔: 상자를 몇 번 밀고 C → 처음 자리
  const reset = await page.evaluate(async () => { const g = window.game; const c = g.entities.find(e => e.id === 'youngcle15_crate_a'); const start = [c.x, c.y]; [g.player.x, g.player.y] = [c.x - g.player.w, c.y + 6]; g.player.facing = 'right'; c.interact(g.player); await new Promise(r => setTimeout(r, 250)); const moved = [c.x, c.y]; const con = g.entities.find(e => e.id === 'youngcle15_console'); con.interact(g.player); return { start, moved, after: [c.x, c.y] }; });
  check(reset.moved[0] === reset.start[0] + 32 && reset.after[0] === reset.start[0], '상자를 밀고 초기화 장치 → 처음 자리 ' + JSON.stringify(reset));
  // 초기화 대사를 닫는 C 가 상자를 또 밀지 않게 먼저 상자에서 떨어진다
  await page.evaluate(() => { const g = window.game; g.player.x = 64; g.player.y = 256; g.player.facing = 'right'; });
  for (let i = 0; i < 6; i++) { const running = await page.evaluate(() => window.game.dialogue.running); if (!running) break; await page.keyboard.press('KeyC'); await page.waitForTimeout(150); }
  const r1 = await solve('youngcle15'); await page.waitForTimeout(400); s = await st(); await cap('room1_solved');
  check(r1.stuck === null && r1.done === 25 && s.solved && s.gate === false, '검사실 1 해법 25회 → 차단문 열림 ' + JSON.stringify([r1, s.solved, s.gate]));
  // 오른쪽 문 → 검사실 2
  await page.evaluate(() => { const g = window.game; g.player.x = 470; g.player.y = 256; g.player.facing = 'right'; });
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.game.mapId === 'youngcle16', null, { timeout: 8000 }).catch(() => {});
  await page.keyboard.up('ArrowRight'); await page.waitForTimeout(800); s = await st(); await cap('room2');
  check(s.map === 'youngcle16' && s.gate === true && !s.solved, '열린 차단문을 지나 오른쪽 문 → 검사실 2 ' + JSON.stringify(s));
  const r2 = await solve('youngcle16'); await page.waitForTimeout(400); s = await st(); await cap('room2_solved');
  check(r2.stuck === null && r2.done === 31 && s.solved && s.gate === false, '검사실 2 해법 31회 → 차단문 열림 ' + JSON.stringify([r2, s.solved, s.gate]));
  await page.evaluate(() => { const g = window.game; g.player.x = 470; g.player.y = 256; g.player.facing = 'right'; });
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1500); await page.keyboard.up('ArrowRight'); s = await st(); await cap('room2_end');
  const end = await page.evaluate(() => { const r = window.game.map.rows; return { edge: r[8][17], door: window.game.entities.some(e => e.id === 'youngcle16_right') }; });
  check(s.map === 'youngcle16' && s.px >= 500 && end.edge === 'H' && !end.door, '검사실 2 오른쪽 끝은 열린 통로(다음 브리핑) ' + JSON.stringify([s.px, end]));
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
