// 비데 방(youngcle9) BUILD167: 브금 없다가 연출 시작에 등장 곡, 마리오가 눕힌 토관 입구에서 비데 머리 위로, 거대 스크린 줌아웃(0.5), 토관 입구로 걸어 들어가면 섭리오. 실행: tests/playtest/run.sh bidet-room
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'bidet_room_' + n + '.png') }); };
const info = () => page.evaluate(() => { const m = game.entities.find(e => e.id === 'mini_mario'); const b = game.entities.find(e => e.id === 'warm_bidet'); return { node: game.dialogue.i, running: game.dialogue.running, tb: game.textbox.state, bgm: game.sound.bgmName ?? null, zoom: Math.round(game.zoom.s * 100) / 100, mario: m && [Math.round(m.x), Math.round(m.y), Math.round(m.hopY || 0)], bidet: b && [Math.round(b.x), Math.round(b.y), b.visible], player: [Math.round(game.player.x), Math.round(game.player.y), game.player.visible] }; });
// 대사가 waiting 일 때만 C 로 넘기며 조건이 맞는 순간 스크린샷
const runUntil = async (cond, label, maxMs = 40000, extra = 0) => {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const s = await info();
    if (cond(s)) { if (extra) await page.waitForTimeout(extra); await cap(label); return s; }
    if (s.tb === 'waiting') { await page.waitForTimeout(120); await page.keyboard.press('KeyC'); }
    await page.waitForTimeout(90);
  }
  return null;
};
try {
  await page.goto('http://localhost:8000/?qa=youngcle8');
  await page.waitForFunction(() => window.game?.player && game.mapId === 'youngcle8' && !game.transitioning, null, { timeout: 20000 });
  await page.waitForTimeout(400);
  check((await info()).bgm === null, '연결로(youngcle8)는 브금 없음');
  await page.goto('http://localhost:8000/?qa=youngcle9');
  await page.waitForFunction(() => window.game?.player && game.mapId === 'youngcle9' && !game.transitioning, null, { timeout: 20000 });
  await page.waitForTimeout(500);
  const enter = await info(); check(enter.running && enter.bgm === 'editor_union_stage', '입장 연출 시작과 함께 파크가디언 등장 곡 ' + JSON.stringify(enter)); await cap('enter');
  const out = await runUntil(s => s.mario && s.mario[2] > 20, 'mario_out', 40000, 0); check(!!out && out.mario[0] < 420, '마리오가 토관 입구(x336)에서 튀어나온다 ' + JSON.stringify(out?.mario));
  const head = await runUntil(s => s.mario && s.mario[1] <= 430 && s.mario[2] === 0, 'mario_head', 20000, 200); check(!!head && head.mario[0] === 480 && head.mario[1] === 423, '비데 머리 위(480,423) 착지 ' + JSON.stringify(head?.mario));
  const zoom = await runUntil(s => s.zoom <= 0.52, 'screen_zoomout', 20000, 900); check(!!zoom, '거대 스크린 줌아웃 0.5 ' + JSON.stringify(zoom && [zoom.zoom]));
  const gone = await runUntil(s => s.bidet && !s.bidet[2], 'bidet_in_pipe', 60000, 0); check(!!gone && gone.bidet[0] >= 356 && gone.bidet[0] <= 380, '비데가 토관 입구로 들어가 숨는다 ' + JSON.stringify(gone?.bidet));
  const done = await runUntil(s => !s.running, 'done', 30000, 300); check(!!done && done.bgm === 'editor_union_stage', '연출 뒤에도 등장 곡 유지 ' + JSON.stringify(done && [done.bgm]));
  check(await page.evaluate(() => game.flags.bidet_arcade_done === true), 'bidet_arcade_done 플래그');
  // 토관 입구(x320~352,y528~584)로 왼쪽에서 걸어 들어가면 섭리오 (트리거 쿨다운이 지난 뒤)
  await page.waitForTimeout(800);
  await page.evaluate(() => { game.player.x = 280; game.player.y = 560; game.player.facing = 'right'; });
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(700); await page.keyboard.up('ArrowRight');
  const hidden = await runUntil(s => !s.player[2], 'into_pipe', 20000, 0); check(!!hidden && hidden.player[0] >= 360, '주인공이 토관 안으로 걸어 들어가 숨는다 ' + JSON.stringify(hidden?.player));
  const opened = await page.waitForFunction(() => !!window.__subrio, null, { timeout: 15000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(900); await cap('subrio_open');
  check(opened, '섭리오 오버레이 열림');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__subrio, null, { timeout: 8000 }).catch(() => {});
  const back = await runUntil(s => !s.running && s.player[2], 'back', 20000, 300);
  check(!!back && back.player[0] < 330 && back.bgm === 'editor_union_stage', '토관 입구로 나와 등장 곡 복귀 ' + JSON.stringify(back && [back.player, back.bgm]));
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
