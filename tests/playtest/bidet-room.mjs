// 비데 방(youngcle9) BUILD167: 브금 없다가 연출 시작에 등장 곡, 마리오가 눕힌 토관 입구에서 비데 머리 위로, 거대 스크린 줌아웃(0.5), 토관 입구로 걸어 들어가면 섭리오. 실행: tests/playtest/run.sh bidet-room
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
import { escToTitle } from './lib/esc.mjs';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'bidet_room_' + n + '.png') }); };
const info = () => page.evaluate(() => { const m = game.entities.find(e => e.id === 'mini_mario' && !e.dead); const b = game.entities.find(e => e.id === 'warm_bidet' && !e.dead); return { node: game.dialogue.i, running: game.dialogue.running, tb: game.textbox.state, bgm: game.sound.bgmName ?? null, zoom: Math.round(game.zoom.s * 100) / 100, mario: m && [Math.round(m.x), Math.round(m.y), Math.round(m.hopY || 0)], bidet: b && [Math.round(b.x), Math.round(b.y), b.visible], player: [Math.round(game.player.x), Math.round(game.player.y), game.player.visible], scale: Math.round((game.player.def.visualScale ?? 1) * 100) / 100, bidetScale: b ? Math.round((b.def.visualScale ?? 1) * 100) / 100 : null }; });
// 대사가 waiting 일 때만 C 로 넘기며 조건이 맞는 순간 스크린샷
const runUntil = async (cond, label, maxMs = 40000, extra = 0) => {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const s = await info();
    if (cond(s)) { if (extra) await page.waitForTimeout(extra); await cap(label); return s; }
    if (s.tb === 'waiting' || s.tb === 'choice') { await page.waitForTimeout(120); await page.keyboard.press('KeyC'); }
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
  const enter = await info(); check(enter.running && enter.bgm === null, '입장 0.5초: 연출은 시작했지만 아직 무음(일행이 걸어 들어오는 중) ' + JSON.stringify([enter.running, enter.bgm])); await cap('enter');
  const walked = await runUntil(s => s.player[0] >= 130, 'walk_in', 8000, 0); check(!!walked && walked.bgm === null && walked.zoom === 1, '일행이 문에서 걸어 들어올 때까지 카메라·곡 그대로 ' + JSON.stringify(walked && [walked.player, walked.bgm, walked.zoom]));
  const cam = await runUntil(s => s.zoom <= 0.8, 'camera_to_bidet', 8000, 0); check(!!cam, '그 다음 카메라가 비데 쪽으로');
  const cue = await runUntil(s => s.bgm === 'editor_union_stage', 'cue', 8000, 0); check(!!cue, '카메라 뒤 등장 곡 시작(3초 페이드인)');
  const out = await runUntil(s => s.mario && s.mario[2] > 20, 'mario_out', 40000, 0); check(!!out && out.mario[0] < 420, '마리오가 토관 입구(x336)에서 튀어나온다 ' + JSON.stringify(out?.mario));
  const head = await runUntil(s => s.mario && s.mario[1] <= 430 && s.mario[2] === 0, 'mario_head', 20000, 200); check(!!head && head.mario[0] === 480 && head.mario[1] === 423, '비데 머리 위(480,423) 착지 ' + JSON.stringify(head?.mario));
  const zoom = await runUntil(s => s.zoom <= 0.52, 'screen_zoomout', 20000, 900); check(!!zoom, '거대 스크린 줌아웃 0.5 ' + JSON.stringify(zoom && [zoom.zoom]));
  let bidetMin = 1;
  const gone = await runUntil(s => { if (s.bidetScale !== null) bidetMin = Math.min(bidetMin, s.bidetScale); return !s.bidet || !s.bidet[2]; }, 'bidet_in_pipe', 60000, 0); check(!!gone && (!gone.bidet || (gone.bidet[0] >= 356 && gone.bidet[0] <= 380)), '비데가 토관 입구로 들어가 숨고 제거된다 ' + JSON.stringify(gone?.bidet ?? 'removed'));
  check(bidetMin < 0.6, '비데가 들어가며 몸이 줄어든다(최소 배율 ' + bidetMin.toFixed(2) + ')');
  const done = await runUntil(s => !s.running, 'done', 30000, 300); check(!!done && done.bgm === 'editor_union_stage', '연출 뒤에도 등장 곡 유지 ' + JSON.stringify(done && [done.bgm]));
  check(await page.evaluate(() => game.flags.bidet_arcade_done === true), 'bidet_arcade_done 플래그');
  // 토관 입구 앞(x~356)에서 C → '들어갈까?' 선택 → 들어간다(첫 항목, C) → 몸이 줄어들며 들어가 숨는다
  await page.waitForTimeout(1200);
  await page.evaluate(() => { game.player.x = 356; game.player.y = 556; game.player.facing = 'right'; });
  await page.waitForTimeout(300); await page.keyboard.press('KeyC');
  let asked = await runUntil(s => s.tb === 'choice' || (s.running && s.node >= 2), 'ask', 4000, 0);
  if (!asked) { await page.keyboard.press('KeyC'); asked = await runUntil(s => s.tb === 'choice' || (s.running && s.node >= 2), 'ask', 6000, 0); }
  check(!!asked, '토관 C → 들어갈까? 선택 ' + JSON.stringify(asked && [asked.node, asked.tb]));
  let minScale = 1;
  const hidden = await runUntil(s => { minScale = Math.min(minScale, s.scale); return !s.player[2]; }, 'into_pipe', 20000, 0);
  check(!!hidden && hidden.player[0] >= 356, '주인공이 토관 안으로 들어가 숨는다 ' + JSON.stringify(hidden?.player));
  check(minScale < 0.6, '들어가며 몸이 줄어든다(최소 배율 ' + minScale.toFixed(2) + ')');
  await page.waitForTimeout(400);
  check((await info()).scale === 1, '숨은 뒤 배율은 1로 복귀');
  const opened = await page.waitForFunction(() => !!window.__subrio, null, { timeout: 15000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(900); await cap('subrio_open');
  check(opened, '섭리오 오버레이 열림');
  await escToTitle(page);
  await page.waitForFunction(() => !window.__subrio, null, { timeout: 8000 }).catch(() => {});
  const back = await runUntil(s => !s.running && s.player[2], 'back', 20000, 300);
  check(!!back && back.player[0] < 340 && back.bgm === 'editor_union_stage', '토관 입구로 나와 등장 곡 복귀 ' + JSON.stringify(back && [back.player, back.bgm]));
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
