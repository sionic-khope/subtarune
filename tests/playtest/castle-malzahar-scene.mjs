import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'castle-malzahar-scene', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const field = () => until(() => window.game?.state === 'field' && !game.dialogue.running && !game.transitioning && game.fade.alpha < 0.01, 30000);
  const walk = async (key, predicate, label, timeout = 12000) => {
    await page.keyboard.down(key);
    try { assert.ok(await until(predicate, timeout), label); }
    finally { await page.keyboard.up(key); }
    await page.waitForTimeout(100);
  };
  const snapshot = () => page.evaluate(() => ({ map: game.mapId, party: [...game.party],
    x: game.player.x, y: game.player.y, bgm: game.sound.bgmName,
    split: !!game.flags.castle_malzahar_split, cameraLocked: game.camera.locked,
    defenders: game.entities.filter(entity => ['castle_warm_bidet', 'castle_dot_mario', 'castle_guard_gyeongsub', 'castle_guard_ppaman'].includes(entity.id))
      .map(entity => ({ id: entity.id, x: entity.x, y: entity.y, visible: entity.visible, facing: entity.facing })),
  }));
  const sizes = async label => {
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(150); await shot(`${label}-${width}`);
      check(`${label} canvas fits viewport ${width}`, await page.evaluate(() => {
        const rect = document.querySelector('canvas').getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth + 1 && rect.top >= 0 && rect.bottom <= innerHeight + 1;
      }));
    }
    await page.setViewportSize({ width: 1000, height: 780 });
  };
  await open({ qa: 'memory_end' }); assert.ok(await field());
  await shot('memory-north-before');
  await walk('ArrowUp', () => game.mapId === 'gajaeman_castle_fork', 'normal north threshold enters fork');
  assert.ok(await until(() => game.dialogue.running && game.fade.alpha < 0.01, 15000));
  await shot('fork-entry-exclamation');
  await page.waitForTimeout(650); await shot('fork-reveal-camera-mid');
  const pages = [], captured = new Set();
  let splitMotion = false;
  while (await page.evaluate(() => game.dialogue.running)) {
    assert.ok(await until(() => !game.dialogue.running || (game.textbox.isOpen && game.textbox.state === 'waiting'), 12000), 'script reaches readable dialogue or field');
    if (!await page.evaluate(() => game.dialogue.running)) break;
    const node = await page.evaluate(() => ({ text: game.textbox.node.text, speaker: game.textbox.node.speaker, voice: game.textbox.node.voice }));
    if (pages.at(-1)?.text !== node.text) pages.push(node);
    const captures = [['* 오 ㅎㅇ', 'fork-meeting'], ['* 하이', 'fork-mario-after-jump'],
      ['* 이상한 결계같은게 있는데 제가 들어가도 다시 튕겨져 나오더라구요', 'fork-torii-camera'],
      ['* 몬스터들이 나와요.', 'fork-upper-aperture'], ['* 몸조심하세요 형.', 'fork-farewell']];
    for (const [text, label] of captures) if (node.text === text && !captured.has(label)) {
      await shot(label); captured.add(label);
    }
    await press('KeyC', { delay: 45 }); await page.waitForTimeout(100);
    if (node.text === '* 아마 그럴거같아 요플래 부탁한다.' && !splitMotion) {
      await page.waitForTimeout(1500); await shot('fork-split-walk-mid'); splitMotion = true;
    }
  }
  assert.ok(await field());
  check('full introduction reaches farewell with narrator voice and silent Mario', pages.length === 25
    && pages.at(-1).text === '* 몸조심하세요 형.'
    && pages.some(node => node.text === '* 내가 저 길을 뚫을 수 있다고 말했다.' && node.voice === 'narrator')
    && pages.every(node => !node.speaker?.includes('마리오')), JSON.stringify(pages));
  const separated = await snapshot();
  check('split returns solo control with four defenders, camera follow and field BGM', separated.split && separated.party.length === 0
    && !separated.cameraLocked && separated.defenders.length === 4 && separated.defenders.every(actor => actor.visible && actor.y < separated.y && actor.facing === 'up')
    && separated.bgm === 'castle_right', JSON.stringify(separated));
  await sizes('fork-separated');
  await walk('ArrowDown', () => game.player.y >= 704, 'return to horizontal fork');
  await walk('ArrowLeft', () => game.player.x <= 388, 'return along west stone floor');
  await walk('ArrowDown', () => game.mapId === 'gajaeman_memory2', 'return to memory2'); assert.ok(await field());
  check('memory return preserves solo party after split', (await snapshot()).party.length === 0);
  await walk('ArrowUp', () => game.mapId === 'gajaeman_castle_fork', 're-enter fork'); assert.ok(await field());
  const reentered = await snapshot();
  check('re-entry skips replay and restores all four defenders', reentered.split && reentered.party.length === 0
    && reentered.defenders.every(actor => actor.visible && actor.facing === 'up' && actor.y <= 336), JSON.stringify(reentered));
  await fixture('production-save-and-continue', 'Persist the naturally completed split through production autosave, then read that unmodified save through continueGame. No flags, position, party or HP are injected.', async () => {
    game.autosave(); await game.continueGame();
  });
  assert.ok(await field());
  const continued = await snapshot();
  check('continue restores split, solo party, exact position and defenders', continued.map === reentered.map && continued.split && continued.party.length === 0
    && Math.abs(continued.x - reentered.x) < 2 && Math.abs(continued.y - reentered.y) < 2
    && JSON.stringify(continued.defenders) === JSON.stringify(reentered.defenders), JSON.stringify(continued));
  await walk('ArrowUp', () => game.player.y <= 680, 'approach horizontal torii road');
  await walk('ArrowRight', () => game.player.x >= 1068, 'walk through purple torii', 16000);
  await sizes('torii-before-run');
  check('torii approach is still solo field before runner trigger', await page.evaluate(() => !game.runner && !game.battle && game.party.length === 0));
  await open({ qa: 'malzahar_arrival' }); assert.ok(await field());
  check('arrival checkpoint is solo with castle music', await page.evaluate(() => game.mapId === 'gajaeman_torii_end' && game.party.length === 0 && game.sound.bgmName === 'castle_right'));
  await shot('arrival-before-door');
  await walk('ArrowUp', () => game.player.probe()?.id === 'castle_torii_end_door', 'reach north door with normal movement');
  await press('KeyC', { delay: 45 });
  assert.ok(await until(() => game.mapId === 'gajaeman_castle_orb', 15000));
  assert.ok(await field());
  check('north door C enters the BUILD311 orb room with solo party and requested music', await page.evaluate(() =>
    game.party.length === 0 && game.sound.bgmName === 'castle_orb' && !game.flags.castle_right_seal_active));
  await shot('arrival-orb-room');
});
