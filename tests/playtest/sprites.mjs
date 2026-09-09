// PNG 오버라이드 4명 × 4방향 이동 및 실제 대화창 초상화 검증.
// 서버: python3 serve.py 8765. 실행: node tests/playtest/sprites.mjs (playwright-core 필요)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const output = process.env.SHOT_DIR || new URL('./shots/sprites/', import.meta.url).pathname;
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
const errors = [];
const results = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => {
  if (/assets\/(sprites|portraits)\/(hyungsub|gyeongsub|ppaman|junhee)\.png/.test(response.url()) && !response.ok()) {
    errors.push(`${response.status()} ${response.url()}`);
  }
});
try {
  for (const id of ['hyungsub', 'gyeongsub', 'ppaman', 'junhee']) {
    await page.goto(`http://127.0.0.1:8765/?map=test&sprite=${id}`);
    await page.waitForFunction((name) => window.game?.state === 'field' && game.portraits[name]?.naturalWidth === 96, id);
    const sheet = await page.evaluate((name) => {
      const image = game.spriteOverrides[name];
      return { loaded: !!image, width: image?.width, height: image?.height, px: game.player.sprite.px };
    }, id);
    assert.equal(sheet.loaded, true, `${id}: PNG must replace fallback art`);
    assert.equal(sheet.width % 4, 0);
    assert.equal(sheet.height % 4, 0);
    assert.equal(sheet.px, 2);
    for (const [direction, key] of [['down', 'ArrowDown'], ['up', 'ArrowUp'], ['left', 'ArrowLeft'], ['right', 'ArrowRight']]) {
      await page.evaluate(() => { game.player.x = 240; game.player.y = 260; game.camera.snap(); });
      await page.keyboard.down('Shift');
      await page.keyboard.down(key);
      const frames = new Set();
      for (let tick = 0; tick < 12; tick++) {
        await page.waitForTimeout(50);
        const state = await page.evaluate(() => ({ facing: game.player.facing, frame: game.player.frame, moving: game.player.moving }));
        assert.equal(state.facing, direction, `${id}: ${direction} facing`);
        assert.equal(state.moving, true, `${id}: walking animation`);
        frames.add(state.frame);
      }
      await page.screenshot({ path: `${output}/${id}-${direction}.png` });
      await page.keyboard.up(key);
      await page.keyboard.up('Shift');
      assert.equal(frames.size, 4, `${id}: ${direction} must cycle all four frames`);
      results.push(`PASS ${id} ${direction}: loaded PNG, four moving frames`);
    }
    await page.evaluate((name) => game.runScript(`test_${name}`), id);
    await page.waitForFunction(() => game.textbox.state === 'typing' || game.textbox.state === 'waiting');
    await page.keyboard.press('KeyC');
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${output}/${id}-dialogue.png` });
    const portrait = await page.evaluate(() => game.textbox.node?.portrait || null);
    assert.equal(portrait, id === 'hyungsub' ? null : id, `${id}: portrait identity / self narration`);
    results.push(`PASS ${id} dialogue: ${portrait || 'self narration without portrait'}`);
  }
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://127.0.0.1:8765/?map=test&sprite=hyungsub');
    await page.waitForFunction(() => window.game?.state === 'field');
    await page.screenshot({ path: `${output}/viewport-${width}.png` });
  }
  assert.deepEqual(errors, [], 'runtime and required asset responses');
  results.push('PASS no page errors or failed character asset requests');
} finally {
  fs.writeFileSync(`${output}/results.txt`, [...results, ...errors].join('\n'));
  await browser.close();
}
console.log(results.join('\n'));
