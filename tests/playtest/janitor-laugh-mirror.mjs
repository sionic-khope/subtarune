// 청소부 옆모습 웃음(BUILD229): 오른쪽을 보는 시트라 왼쪽을 볼 땐 world.js 가 좌우 반전한다 — 지팡이(갈색)가 오른쪽을 볼 땐 몸 오른쪽, 왼쪽을 볼 땐 몸 왼쪽에 그려지고,
//   빨간 셔츠 픽셀은 앵커 기준 거울상이다. 실행: tests/playtest/run.sh janitor-laugh-mirror
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 40 }).then(() => true).catch(() => false);
// 청소부 발 앵커 주변 화면 픽셀(캔버스는 2배 해상도)
const grab = () => page.evaluate(() => {
  const c = document.querySelector('canvas'); const g = window.game; const j = g.entities.find(e => e.id === 'janitor' && !e.dead);
  const ax = Math.round(j.x + j.w / 2 - g.camera.x) * 2, ay = Math.round(j.y + j.h - g.camera.y) * 2; const w = 160, h = 150;
  const d = c.getContext('2d').getImageData(ax - w / 2, ay - h + 12, w, h).data;
  return { w, h, d: Array.from(d), motion: !!j.motion, index: j.motion?.index ?? -1, facing: j.facing };
});
const isRed = (r, g, b) => r > 190 && g < 90 && b < 90;
const isCane = (r, g, b) => r > 140 && r < 230 && g > 80 && g < 160 && b < 90 && r - g > 40;
const analyse = ({ w, h, d }) => {
  const red = new Set(); let caneX = 0, caneN = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    if (isRed(r, g, b)) red.add(y * w + x); if (isCane(r, g, b)) { caneX += x - w / 2; caneN += 1; } }
  return { red, caneSide: caneN ? caneX / caneN : 0, caneN };
};
const laughAt = async facing => {
  await page.goto('http://localhost:8000/?qa=jjajang_walk');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_walk' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(400);
  await page.evaluate(f => { const j = game.entities.find(e => e.id === 'janitor'); j.facing = f; game.runScript([{ motion: 'janitor', name: 'laugh' }, { wait: 0.2 }, { end: true }]); }, facing);
  check(await until(() => { const j = window.game.entities.find(e => e.id === 'janitor'); return j && j.motion && j.motion.index === 1; }, 3000), `${facing}: 웃음 2번째 프레임`);
  await page.waitForTimeout(60);
  const g = await grab(); await page.screenshot({ path: path.join(shots, `mirror_${facing}.png`) });
  check(g.motion && g.index === 1 && g.facing === facing, `${facing}: 모션 중 잡음 ` + JSON.stringify({ index: g.index, facing: g.facing }));
  check(await until(() => !window.game.entities.find(e => e.id === 'janitor').motion, 3000), `${facing}: 웃음이 끝난다`);
  return analyse(g);
};
try {
  const right = await laughAt('right');
  const left = await laughAt('left');
  check(right.caneN > 20 && left.caneN > 20, `지팡이 픽셀이 보인다 (${right.caneN}, ${left.caneN})`);
  check(right.caneSide > 6 && left.caneSide < -6, `지팡이: 오른쪽 볼 땐 몸 오른쪽(${right.caneSide.toFixed(1)}), 왼쪽 볼 땐 몸 왼쪽(${left.caneSide.toFixed(1)})`);
  const w = 160; let inter = 0;
  for (const k of right.red) { const y = Math.floor(k / w), x = k % w; if (left.red.has(y * w + (w - 1 - x))) inter += 1; }
  const iou = inter / (right.red.size + left.red.size - inter);
  check(right.red.size > 200 && iou > 0.8, `빨간 셔츠가 거울상 (IoU ${iou.toFixed(2)}, ${right.red.size}/${left.red.size})`);
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
