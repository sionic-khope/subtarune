import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'castle-malzahar-battle-resize', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, check }) => {
  await open({ qa: 'malzahar_torii' });
  assert.ok(await until(() => window.game?.state === 'field' && !game.dialogue.running && !game.transitioning && game.fade.alpha < 0.01, 30000));
  await page.keyboard.down('ArrowRight');
  try { assert.ok(await until(() => !!game.runner, 6000)); }
  finally { await page.keyboard.up('ArrowRight'); }
  assert.ok(await until(() => game.battle?.gimmick?.fullscreen && game.battle.gimmick.snapshot.phase === 'hover', 15000));
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);
    const layout = await page.evaluate(() => {
      const canvas = document.querySelector('canvas'), rect = canvas.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: innerWidth, height: innerHeight,
        canvasWidth: canvas.width, canvasHeight: canvas.height, fullscreen: game.battle?.gimmick?.fullscreen,
        phase: game.battle?.gimmick?.snapshot.phase, hp: game.battle?.enemies[0].hp, playerHp: game.battle?.members[0].hp };
    });
    check(`loaded battle fits viewport ${width}`, layout.fullscreen && layout.canvasWidth / layout.canvasHeight === 4 / 3
      && layout.left >= 0 && layout.top >= 0 && layout.right <= layout.width + 1 && layout.bottom <= layout.height + 1, JSON.stringify(layout));
    await shot(`battle-hud-ground-controls-${width}`);
  }
});
