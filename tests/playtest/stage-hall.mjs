// 무대 홀(youngcle11) 입장 연출(BUILD177): 무음·걸어 들어옴 → 카메라 무대 → 철컥 불 켜짐(어둠 막 제거·스포트라이트) → 뚜울라 등장·점프 내려옴·뒷걸음질 → 브금 → 대사 → 브금 꺼짐·... → 계단으로 도망 → 카메라 복귀 → 조작.
// 재입장은 불 켜진 채 뚜울라가 무대에서 기다린다. 실행: tests/playtest/run.sh stage-hall
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'stage_hall_' + n + '.png') }); };
const info = () => page.evaluate(() => {
  const ent = id => { const e = game.entities.find(x => x.id === id && !x.dead); return e ? [Math.round(e.x), Math.round(e.y), e.visible] : null; };
  return { map: game.mapId, running: game.dialogue.running, tb: game.textbox.state, bgm: game.sound.bgmName ?? null, zoom: Math.round(game.zoom.s * 100) / 100,
    cam: [Math.round(game.camera.x), Math.round(game.camera.y)], player: [Math.round(game.player.x), Math.round(game.player.y), game.player.facing],
    mouse: ent('ttuulla'), wait: ent('ttuulla_wait'), dark: !!ent('stage11_dark'), spot: Math.round((game.editorUnionStage?.spotlight ?? 0) * 100) / 100,
    done: game.flags.stage_hall_intro_done === true, lit: game.flags.stage_hall_lit === true, fade: Math.round(game.fade.alpha * 100) / 100 };
});
const runUntil = async (cond, label, maxMs = 40000, extra = 0) => {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    let s = await info();
    if (cond(s)) { if (extra) { await page.waitForTimeout(extra); s = await info(); } await cap(label); return s; }
    if (s.tb === 'waiting' || s.tb === 'choice') { await page.waitForTimeout(120); await page.keyboard.press('KeyC'); }
    await page.waitForTimeout(80);
  }
  return null;
};
try {
  await page.goto('http://localhost:8000/?qa=youngcle11');
  await page.waitForFunction(() => window.game?.player && game.mapId === 'youngcle11', null, { timeout: 20000 });
  await page.waitForTimeout(300);
  const start = await info(); check(start.running && start.bgm === null && start.dark && !start.mouse?.[2], '입장: 연출 시작·무음·무대는 어둠 막·뚜울라 안 보임 ' + JSON.stringify([start.running, start.bgm, start.dark]));
  const walkIn = await runUntil(s => s.player[1] < 660, 'walk_in', 8000, 0); check(!!walkIn, '일행이 아래 문에서 걸어 들어온다 ' + JSON.stringify(walkIn?.player));
  const camUp = await runUntil(s => s.zoom <= 0.8 && s.cam[1] < 200, 'camera_stage', 8000, 200); check(!!camUp && camUp.dark, '카메라가 어두운 무대로(줌 0.75) ' + JSON.stringify(camUp && [camUp.zoom, camUp.cam, camUp.dark]));
  const front = await runUntil(s => s.player[1] < 340 && s.player[2] === 'up', 'front', 20000, 0); check(!!front && front.dark, '무대 아래 앞에 서서 위를 본다(아직 어둠) ' + JSON.stringify(front?.player));
  const lit = await runUntil(s => !s.dark && !!s.mouse && s.mouse[2], 'lights_on', 15000, 350); check(!!lit && lit.spot > 0, '철컥 → 어둠 막 제거·스포트라이트·뚜울라 보임 ' + JSON.stringify(lit && [lit.dark, lit.spot, lit.mouse]));
  const down = await runUntil(s => !!s.mouse && s.mouse[1] > 270 && s.bgm === 'mike_board', 'mouse_down', 20000, 100); check(!!down && down.player[1] > front.player[1] + 10, '점프해 내려옴·일행 뒷걸음질·브금 ' + JSON.stringify(down && [down.mouse, down.player, down.bgm]));
  const talk = await runUntil(s => s.bgm === null && !s.dark && !!s.mouse && s.mouse[1] > 270, 'bgm_off', 60000, 0); check(!!talk, '“노래로 승부” 뒤 브금 꺼짐 ' + JSON.stringify(talk && [talk.bgm]));
  const flee = await runUntil(s => !!s.mouse && s.mouse[1] < 130 && Math.abs(s.mouse[0] - 404) < 14, 'flee', 30000, 150); check(!!flee, '계단으로 올라가 무대 가운데로 ' + JSON.stringify(flee?.mouse));
  const back = await runUntil(s => !s.running, 'done', 30000, 300);
  check(!!back && back.done && back.lit && back.zoom === 1 && back.bgm === null && !back.dark, '연출 끝: 플래그·줌 1·무음·무대 밝음 ' + JSON.stringify(back && [back.done, back.lit, back.zoom, back.bgm, back.dark]));
  // 재입장: 불 켜진 채 뚜울라가 무대에서 기다린다
  await page.goto('http://localhost:8000/?qa=stage_hall_after');
  await page.waitForFunction(() => window.game?.player && game.mapId === 'youngcle11' && !game.transitioning, null, { timeout: 20000 });
  await page.waitForTimeout(500);
  const again = await info(); await cap('reentry');
  check(!again.running && !again.dark && !!again.wait && again.wait[2] && !again.mouse, '재입장: 연출 없음·무대 밝음·뚜울라 대기 ' + JSON.stringify([again.running, again.dark, again.wait, again.mouse]));
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
