// 실제 Canvas 캐시의 3포즈/상체 고정 및 이동→정지 회귀. 서버 8765, playwright-core 필요.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const output = process.env.SHOT_DIR || new URL('./shots/side-walk/', import.meta.url).pathname;
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8765';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
const errors = [];
const results = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  for (const id of ['hyungsub', 'gyeongsub', 'ppaman', 'junhee', 'merchant', 'cat', 'guard', 'ghost']) {
    await page.goto(`${baseURL}/?map=test&sprite=${id}`);
    await page.waitForFunction(() => window.game?.state === 'field');
    const poses = await page.evaluate(async (name) => {
      const { CHARACTERS } = await import('/src/data/characters.js');
      const sprite = game.player.sprite;
      const feetY = CHARACTERS[name].sideWalk?.feetY ?? 11;
      const bytes = (canvas, height = canvas.height) => Array.from(canvas.getContext('2d').getImageData(0, 0, canvas.width, height).data).join(',');
      const strip = document.createElement('canvas');
      strip.width = sprite.fw * 4;
      strip.height = sprite.fh * 2;
      const ctx = strip.getContext('2d');
      const sides = ['left', 'right'].map((direction, row) => {
        const frames = sprite[direction];
        frames.forEach((frame, column) => ctx.drawImage(frame, column * sprite.fw, row * sprite.fh));
        return {
          direction,
          count: frames.length,
          unique: new Set(frames.map((frame) => bytes(frame))).size,
          neutralRepeated: bytes(frames[0]) === bytes(frames[2]),
          upperIdentical: new Set(frames.map((frame) => bytes(frame, feetY))).size === 1,
        };
      });
      const unchanged = ['down', 'up'].every((direction, row) => sprite[direction].every((frame, column) => {
        if (!game.spriteOverrides[name]) return true;
        const original = document.createElement('canvas');
        original.width = sprite.fw; original.height = sprite.fh;
        original.getContext('2d').drawImage(game.spriteOverrides[name], column * sprite.fw, row * sprite.fh, sprite.fw, sprite.fh, 0, 0, sprite.fw, sprite.fh);
        return bytes(frame) === bytes(original);
      }));
      return { sides, unchanged, png: strip.toDataURL('image/png'), spriteName: game.player.def.sprite };
    }, id);
    assert.equal(poses.spriteName, id);
    for (const side of poses.sides) {
      assert.equal(side.count, 4, `${id} ${side.direction}: four timing slots`);
      assert.equal(side.unique, 3, `${id} ${side.direction}: exactly three unique poses`);
      assert.equal(side.neutralRepeated, true, `${id} ${side.direction}: repeated neutral`);
      assert.equal(side.upperIdentical, true, `${id} ${side.direction}: body stays fixed`);
    }
    assert.equal(poses.unchanged, true, `${id}: front/back source pixels unchanged`);
    fs.writeFileSync(`${output}/${id}-poses.png`, Buffer.from(poses.png.split(',')[1], 'base64'));
    for (const [direction, key] of [['left', 'ArrowLeft'], ['right', 'ArrowRight']]) {
      await page.evaluate(() => { game.player.x = 432; game.player.y = 400; game.camera.snap(); });
      await page.keyboard.down('Shift');
      await page.keyboard.down(key);
      const phases = new Set();
      for (let tick = 0; tick < 12; tick++) {
        await page.waitForTimeout(50);
        const state = await page.evaluate(() => ({ frame: game.player.frame, moving: game.player.moving, facing: game.player.facing }));
        assert.equal(state.moving, true);
        assert.equal(state.facing, direction);
        phases.add(state.frame);
        if ([0, 4, 8].includes(tick)) await page.screenshot({ path: `${output}/${id}-${direction}-${tick}.png` });
      }
      await page.keyboard.up(key);
      await page.keyboard.up('Shift');
      await page.waitForFunction(() => !game.player.moving && game.player.frame === 0);
      assert.equal(phases.size, 4, `${id} ${direction}: all timing slots while moving`);
    }
    results.push(`PASS ${id}: three side poses, fixed body, unchanged front/back, move/stop both sides`);
  }
  assert.deepEqual(errors, []);
  results.push('PASS no browser runtime errors');
} finally {
  fs.writeFileSync(`${output}/results.txt`, [...results, ...errors].join('\n'));
  await browser.close();
}
console.log(results.join('\n'));
