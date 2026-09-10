import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const outputDir = process.env.SHOT_DIR || new URL('./shots/battle-preview/', import.meta.url).pathname;
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:8765';
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
const consoleMessages = [];
const battleRequests = [];
page.on('console', (message) => consoleMessages.push(`[${message.type()}] ${message.text()}`));
page.on('pageerror', (error) => consoleMessages.push(`[pageerror] ${error.message}`));
page.on('request', (request) => {
  if (request.url().includes('/assets/battle/')) battleRequests.push(request.url());
});

await page.goto(`${baseUrl}/index.html?map=test`);
await page.waitForFunction(() => window.game?.state === 'field');
await page.waitForTimeout(250);
assert.equal(battleRequests.length, 0, 'ordinary field boot must not request battle atlases');

const before = await page.evaluate(() => {
  const sign = game.entities.find((entity) => entity.def.script === 'test_battle_preview');
  if (!sign) throw new Error('battle preview sign missing');
  game.player.x = sign.x;
  game.player.y = sign.y + sign.h + 8;
  game.player.facing = 'up';
  game.camera.snap();
  return {
    map: game.mapId,
    position: [game.player.x, game.player.y],
    flags: JSON.stringify(game.flags),
    save: localStorage.getItem('subtarune.save.v1'),
  };
});
await page.keyboard.press('KeyC');
await page.waitForFunction(() => window.game?.state === 'battle-preview');
await page.waitForFunction(() => window.game?.battlePreview.loading === false);

assert.equal(battleRequests.length, 6, 'opening preview must lazily request three battle and three run atlases');
assert.deepEqual(
  await page.evaluate(() => game.battlePreview.actors.map((actor) => ({ id: actor.id, ready: !!actor.frames, error: actor.error }))),
  [
    { id: 'hyungsub', ready: true, error: false },
    { id: 'gyeongsub', ready: true, error: false },
    { id: 'ppaman', ready: true, error: false },
  ],
);
const contactSheets = await page.evaluate(() => Object.fromEntries(game.battlePreview.actors.map((actor) => {
  const cellWidth = 128;
  const cellHeight = 160;
  const canvas = document.createElement('canvas');
  canvas.width = cellWidth * 4;
  canvas.height = cellHeight * 2;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#101018';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  [...actor.frames.idle, ...actor.frames.attack].forEach((frame, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const scale = actor.definition.scale;
    ctx.drawImage(
      frame.image,
      Math.round(column * cellWidth + cellWidth / 2 - frame.pivot[0] * scale),
      Math.round(row * cellHeight + 142 - frame.pivot[1] * scale),
      Math.round(frame.image.width * scale),
      Math.round(frame.image.height * scale),
    );
  });
  return [actor.id, canvas.toDataURL('image/png')];
})));
for (const [id, dataUrl] of Object.entries(contactSheets)) {
  fs.writeFileSync(`${outputDir}/contact-${id}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
}
await page.screenshot({ path: `${outputDir}/01-idle.png` });

await page.keyboard.press('ArrowRight');
await page.waitForFunction(() => game.battlePreview.selected === 1);
assert.equal(await page.evaluate(() => game.battlePreview.selected), 1);
await page.keyboard.press('KeyC');
await page.waitForFunction(() => game.battlePreview.actors[1].mode === 'approach');
await page.keyboard.press('ArrowRight');
assert.equal(await page.evaluate(() => game.battlePreview.selected), 1, 'busy selection must stay locked');
await page.screenshot({ path: `${outputDir}/02-approach.png` });
await page.waitForFunction(() => game.battlePreview.actors[1].mode === 'attack');
await page.waitForTimeout(70);
const firstAttackTime = await page.evaluate(() => game.battlePreview.actors[1].elapsed);
await page.keyboard.press('KeyC');
await page.waitForTimeout(70);
const secondAttack = await page.evaluate(() => ({
  mode: game.battlePreview.actors[1].mode,
  elapsed: game.battlePreview.actors[1].elapsed,
}));
assert.equal(secondAttack.mode, 'attack');
assert.ok(secondAttack.elapsed > firstAttackTime, 'confirm during attack must not restart elapsed time');
await page.screenshot({ path: `${outputDir}/02-attack.png` });

await page.waitForFunction(() => game.battlePreview.actors[1].mode === 'return');
await page.screenshot({ path: `${outputDir}/03-return.png` });
await page.waitForFunction(() => game.battlePreview.actors[1].mode === 'idle');
assert.equal(await page.evaluate(() => game.battlePreview.actors[1].mode), 'idle');
assert.deepEqual(await page.evaluate(() => game.battlePreview.actors[1].action.position), [150, 230]);
await page.screenshot({ path: `${outputDir}/03-returned-idle.png` });

await page.keyboard.press('KeyX');
await page.waitForFunction(() => window.game?.state === 'field');
const after = await page.evaluate(() => ({
  map: game.mapId,
  position: [game.player.x, game.player.y],
  flags: JSON.stringify(game.flags),
  save: localStorage.getItem('subtarune.save.v1'),
}));
assert.deepEqual(after, before, 'closing preview must preserve field and save state');
await page.screenshot({ path: `${outputDir}/04-field-return.png` });

const failures = consoleMessages.filter((line) => line.startsWith('[pageerror]') || line.includes('[battle-preview]'));
assert.deepEqual(failures, [], `browser console failures: ${failures.join('\n')}`);
fs.writeFileSync(`${outputDir}/console.txt`, consoleMessages.join('\n'));
fs.writeFileSync(`${outputDir}/result.json`, JSON.stringify({
  ordinaryBootBattleRequests: 0,
  previewBattleRequests: battleRequests.length,
  attackRetriggerIgnored: true,
  returnedState: after,
}, null, 2));

await browser.close();
console.log(`battle preview playtest passed: ${outputDir}`);
