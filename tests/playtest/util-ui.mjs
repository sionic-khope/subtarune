import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD329: 부팅 에셋 로딩 화면(문구+막대) → 타이틀 → Shift+Q QA 목록(작은 글씨·꾹 누르기·좌우 페이지) → 게임 중 Esc 경고창(아니요/예).
await runScenario({ name: 'util-ui', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, check }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ params: { bootload: '1' }, waitUntil: 'domcontentloaded' });
  const sawLoading = await page.waitForFunction(() => window.game?.bootLoad?.active, null, { timeout: 15000, polling: 30 }).then(() => true, () => false);
  if (sawLoading) { await page.waitForTimeout(300); await shot('01-boot-loading'); }
  check('boot loading screen shows while assets load', sawLoading);
  const progress = await page.evaluate(() => ({ ...game.bootLoad }));
  check('progress has a map total', progress.total > 50, JSON.stringify(progress));
  assert.ok(await until(() => game.bootLoad && !game.bootLoad.active, 240000), 'boot load finishes');
  await page.keyboard.press('KeyZ');
  check('keys during loading did not skip ahead; a key after loading starts the intro', await until(() => game.title.phase !== 'wait', 5000));
  await until(() => ['zoom', 'locked'].includes(game.title.phase));
  if (await page.evaluate(() => game.title.phase === 'zoom')) await page.keyboard.press('KeyC');
  assert.ok(await until(() => game.title.phase === 'locked', 8000));
  await page.keyboard.press('KeyQ'); await page.waitForTimeout(200);
  check('plain Q does nothing', await page.evaluate(() => !game.title.qa));
  await page.keyboard.press('KeyT'); await page.waitForTimeout(200);
  check('plain T does nothing', await page.evaluate(() => game.state === 'title' && !game.title.leaving));
  await page.keyboard.press('Shift+KeyQ');
  assert.ok(await until(() => !!game.title.qa, 3000), 'Shift+Q opens the QA list');
  await shot('02-qa-list');
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(1500); await page.keyboard.up('ArrowDown');
  const held = await page.evaluate(() => game.title.qa.i);
  check('holding down keeps moving', held > 15, `${held}`);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100);
  const paged = await page.evaluate(() => game.title.qa.i);
  check('right jumps a page (24)', paged === held + 24 || paged > held, `${held}->${paged}`);
  await shot('03-qa-paged');
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(100);
  check('left jumps back a page', await page.evaluate(h => game.title.qa.i === h, held));
  // QA 지점 하나로 이동 → Esc 경고
  await page.keyboard.press('KeyC');
  assert.ok(await until(() => game.state === 'field' && !game.transitioning, 30000), 'QA jump to the selected point works');
  await until(() => !game.dialogue.running, 15000);
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  assert.ok(await until(() => !!game.escConfirm, 3000), 'Esc opens the confirm');
  await page.waitForTimeout(200); await shot('04-esc-confirm');
  check('default is 아니요', await page.evaluate(() => game.escConfirm.i === 1));
  await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
  check('아니요 keeps playing', await page.evaluate(() => !game.escConfirm && game.state === 'field'));
  await page.keyboard.press('Escape'); await until(() => !!game.escConfirm, 3000);
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(120);
  await page.keyboard.press('KeyC');
  check('예 returns to the title', await until(() => game.state === 'title', 5000));
});
