import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

// BUILD337: 계단 꼭대기 → 꼭대기 길(위로 잠깐 → 오른쪽으로 쭉) → 부서진 끝 대치 연출(청소년 등장·가재맨 강림·어깨 안착).
await runScenario({ name: 'castle-summit', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, shot, check }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open({ qa: 'castle_summit' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_summit' && game.state === 'field' && !game.transitioning, 30000));
  await page.waitForTimeout(400); await shot('00-start');
  const t0 = Date.now();
  await page.keyboard.down('ArrowUp');
  try { assert.ok(await until(() => game.player.y < 420, 6000), 'up the short stair'); } finally { await page.keyboard.up('ArrowUp'); }
  const upSeconds = (Date.now() - t0) / 1000;
  check('the climb out of the clouds is short (~1-2s)', upSeconds < 2.6, upSeconds.toFixed(2));
  await shot('01-top-of-stair');
  await page.keyboard.down('ArrowRight');
  let n = 0;
  try {
    assert.ok(await page.waitForFunction(() => game.dialogue.running, null, { timeout: 40000, polling: 200 }).then(() => true, () => false), 'reaches the broken end');
  } finally { await page.keyboard.up('ArrowRight'); }
  const lines = [];
  for (let i = 0; i < 600; i++) {
    const s = await page.evaluate(() => ({ running: game.dialogue.running, waiting: game.textbox.isOpen && game.textbox.state === 'waiting', text: game.textbox.node?.text, scene: game.castleSummit?.snapshot, bgm: game.sound.bgmName }));
    if (s.waiting) { if (lines.at(-1) !== s.text || true) { lines.push(s.text); if (lines.length % 3 === 1) await shot(`line-${String(lines.length).padStart(2, '0')}`); } await page.keyboard.press('KeyC'); await page.waitForTimeout(140); }
    else { if (i % 8 === 0) await shot(`f-${String(n++).padStart(3, '0')}`); await page.waitForTimeout(150); }
    if (!s.running && i > 5) break;
  }
  await shot('end');
  const end = await page.evaluate(() => ({ stage: !!game.flags.castle_summit_ready, bgm: game.sound.bgmName, scene: game.castleSummit?.snapshot }));
  check('all 23 lines', lines.length === 23, JSON.stringify(lines));
  check('gallery plays and the giant is fully revealed with gajaeman perched', end.bgm === 'gallery' && end.scene.giant === 1 && end.scene.gajaeman, JSON.stringify(end));
  check('ready for the battle', end.stage);
});
