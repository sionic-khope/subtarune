import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const outputDir = process.env.SHOT_DIR || new URL('./shots/battle-preview/', import.meta.url).pathname;
const baseUrl = (process.env.QA_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
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
// BUILD253(d2114e5a): 맵 준비가 현재 파티(형섭 + 동료)의 전투 그림·쓰러짐 그림을 미리 받는다(Battle.preload) —
// 첫 전투가 로딩 정지 없이 열리게. 그래서 필드 부팅은 파티 밖 배우(경섭·빠맨)의 아틀라스는 요청하지 않아야 한다.
const bootParty = await page.evaluate(() => ['hyungsub', ...game.party]);
const fieldBootRequests = [...battleRequests];
assert.ok(
  fieldBootRequests.every((url) => bootParty.some((id) => new RegExp(`/assets/battle/(?:down/)?${id}(?:-run)?(?:-runtime)?\\.png`).test(url))),
  `ordinary field boot may preload only the party's own battle art: ${JSON.stringify({ bootParty, fieldBootRequests })}`,
);

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

{
  // 미리보기는 세 배우의 원본 전투·달리기 아틀라스(3 + 3, battle-preview.js 는 runtime 사본을 안 쓴다)를 열 때 처음 요청한다(지연 적재)
  const atlas = (url) => new URL(url).pathname.match(/^\/assets\/battle\/([a-z]+)(-run)?\.png$/);
  const previewAtlases = battleRequests.slice(fieldBootRequests.length).map(atlas).filter(Boolean);
  assert.equal(new Set(previewAtlases.map((m) => m[0])).size, 6, `opening preview must lazily request three battle and three run atlases: ${JSON.stringify(previewAtlases.map((m) => m[0]))}`);
  assert.deepEqual([...new Set(previewAtlases.map((m) => m[1]))].sort(), ['gyeongsub', 'hyungsub', 'ppaman'], 'preview atlases belong to the three preview actors');
  assert.ok(!fieldBootRequests.some(atlas), 'field boot never requested the preview atlases');
}
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
  ordinaryBootBattleRequests: fieldBootRequests.length,
  previewBattleRequests: battleRequests.length,
  attackRetriggerIgnored: true,
  returnedState: after,
}, null, 2));

await browser.close();
console.log(`battle preview playtest passed: ${outputDir}`);
console.log('fails=0');
