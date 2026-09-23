import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'castle-approach', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, check, fixture }) => {
  const state = () => page.evaluate(() => ({
    map: game.mapId, x: game.player.x, y: game.player.y, state: game.state,
    party: [...game.party], money: game.money, hp: { ...game.partyHp },
    flags: { ...game.flags }, inventory: [...game.inventory], bgm: game.sound.bgmName,
    blocked: game.map.solidRect(game.player.x, game.player.y, game.player.w, game.player.h),
    followers: game.entities.filter(entity => entity.def.type === 'follower').map(entity => ({
      x: entity.x, y: entity.y, blocked: game.map.solidRect(entity.x, entity.y, entity.w, entity.h),
    })),
  }));
  const walk = async (key, predicate, timeout = 16000) => {
    await page.keyboard.down(key);
    const reached = await until(predicate, timeout);
    await page.keyboard.up(key);
    assert.ok(reached, `walking ${key} reached target`);
  };
  const continueFromTitle = async () => {
    await open();
    assert.ok(await until(() => window.game?.state === 'title', 20000));
    await press('KeyZ');
    for (let i = 0; i < 40 && await page.evaluate(() => game.title.phase !== 'locked'); i++) {
      await press('KeyC'); await page.waitForTimeout(250);
    }
    await page.waitForTimeout(3300);
    await press('KeyC');
    assert.ok(await until(() => game.state === 'field' && !game.transitioning && game.fade.alpha === 0, 20000));
  };
  await open({ qa: 'gajaeman_castle_approach' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_approach' && game.state === 'field' && game.fade.alpha === 0, 25000));
  await press('KeyX');
  const direct = await state();
  const loaded = await page.evaluate(() => ({
    canvas: Boolean(game.map.canvas),
    tile: game.map.tileAt(11, 84).name,
    actors: [game.player, ...game.entities.filter(entity => entity.def.type === 'follower')].map(entity => ({ visible: entity.visible, fallback: entity.sprite.fallback === true })),
    backdrop: Boolean(game.propImages['assets/backdrops/castle306_distant.png']),
  }));
  check('direct QA loads real floor backdrop and all three sprites', direct.party.length === 2 && loaded.canvas && loaded.tile.startsWith('castle306_') && loaded.actors.length === 3 && loaded.actors.every(actor => actor.visible && !actor.fallback) && loaded.backdrop, JSON.stringify(loaded));
  await shot('00-direct-qa');
  await open({ qa: 'gajaeman_castle_entry' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_entry' && game.state === 'field' && !game.transitioning, 25000));
  await press('KeyX');
  await page.waitForTimeout(600);
  await shot('01-entry');
  await walk('ArrowRight', () => game.player.x >= 440);
  await walk('ArrowUp', () => game.mapId === 'gajaeman_castle_approach');
  assert.ok(await until(() => !game.transitioning));
  await page.waitForTimeout(300);
  const arrival = await state();
  check('north exit reaches approach with two followers', arrival.party.join() === 'gyeongsub,ppaman' && arrival.followers.length === 2 && !arrival.blocked);
  check('requested approach music starts', arrival.bgm === 'castle_approach');
  await shot('02-start');
  const started = Date.now();
  await page.keyboard.down('ArrowUp');
  assert.ok(await until(() => game.player.y <= 1640, 7000));
  await shot('03-middle');
  const reachedGate = await until(() => game.player.y <= 555, 7000);
  assert.ok(reachedGate, JSON.stringify(await state()));
  const seconds = (Date.now() - started) / 1000;
  await page.waitForTimeout(600);
  await page.keyboard.up('ArrowUp');
  const atGate = await state();
  check('normal north walk takes about ten seconds', seconds >= 9 && seconds <= 11, JSON.stringify({ seconds, startY: arrival.y, gateY: atGate.y }));
  check('closed gate blocks north movement', atGate.map === 'gajaeman_castle_approach' && atGate.y >= 544 && atGate.y <= 555);
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowUp');
  check('held north input cannot cross the closed gate', Math.abs((await state()).y - atGate.y) < 1);
  await press('KeyC');
  check('closed gate adds no unrequested dialogue', await page.evaluate(() => !game.dialogue.running && game.state === 'field'));
  await shot('04-gate');
  for (const [width, height] of [[375, 812], [768, 1024], [1280, 900]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(160);
    await shot(`04-gate-${width}`);
  }
  await page.setViewportSize({ width: 1000, height: 780 });
  await press('KeyV');
  check('menu opens at gate', Boolean(await until(() => game.state === 'menu')));
  await shot('05-menu');
  await press('KeyX');
  check('menu cancels to field', Boolean(await until(() => game.state === 'field')));
  await fixture('save-at-gate', 'Call the normal autosave at the naturally reached closed gate; no position or story change.', () => game.autosave());
  await continueFromTitle();
  const restored = await state();
  check('save restores gate position and complete party state', restored.map === atGate.map && Math.abs(restored.y - atGate.y) < 1 && restored.party.join() === atGate.party.join() && JSON.stringify(restored.hp) === JSON.stringify(atGate.hp) && restored.money === atGate.money && JSON.stringify(restored.inventory) === JSON.stringify(atGate.inventory) && restored.flags.ship_invasion_arrived);
  await shot('06-continue');
  await walk('ArrowDown', () => game.mapId === 'gajaeman_castle_entry');
  assert.ok(await until(() => !game.transitioning));
  await page.waitForTimeout(700);
  const returned = await state();
  check('south exit returns safely without ping-pong', returned.map === 'gajaeman_castle_entry' && !returned.blocked && returned.followers.every(follower => !follower.blocked));
  await shot('07-return');
  await walk('ArrowUp', () => game.mapId === 'gajaeman_castle_approach');
  assert.ok(await until(() => !game.transitioning));
  check('north re-entry works', (await state()).map === 'gajaeman_castle_approach');
  await fixture('legacy-east-save', 'Recreate BUILD305 save position x1452,y360 on the removed east corridor; preserve saved flags/items/party.', () => {
    const save = JSON.parse(localStorage.getItem('subtarune.save.v1'));
    save.map = 'gajaeman_castle_entry'; save.spawn = 'arrival'; save.x = 1452; save.y = 360;
    localStorage.setItem('subtarune.save.v1', JSON.stringify(save));
  });
  await continueFromTitle();
  const legacy = await state();
  check('removed east corridor save falls back to safe arrival', legacy.map === 'gajaeman_castle_entry' && !legacy.blocked && legacy.x < 544 && legacy.party.join() === 'gyeongsub,ppaman');
  await walk('ArrowUp', () => game.player.y < 400);
  await shot('08-legacy-save');
});
