import { runScenario } from './lib/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

await runScenario({ name: 'ship-invasion-ocean', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, fixture, shot, check }) => {
  const bindings = [];
  for (const relative of ['src/main.js', 'src/scenes/ship-invasion.js', 'src/scenes/ship-invasion-render.js', 'src/data/ship-invasion.js']) {
    const response = await page.request.get(new URL(relative, process.env.QA_BASE_URL).href);
    const hash = bytes => createHash('sha256').update(bytes).digest('hex');
    const local = hash(fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, relative))), served = hash(await response.body());
    bindings.push({ relative, local, served });
    check(`served source ${relative}`, response.ok() && local === served);
  }
  fs.writeFileSync(path.join(process.env.SHOT_DIR, 'source-bindings.json'), JSON.stringify(bindings, null, 2));
  await open({ qa: 'choimis_return' });
  const ready = await until(() => window.game?.mapId === 'ship_lounge' && game.state === 'field', 30000);
  check('lounge ready', ready);
  if (!ready) return;
  await fixture('invasion-presentation-only', 'Prepare production scene directly; select authored beats without replaying narrative. All motion/contact/audio clocks then run in realtime. Full story input is a separate scenario.', async () => {
    const api = await import('./src/scenes/ship-invasion.js');
    window.__invasionAPI = api;
    await api.prepareShipInvasion(game);
    game.sound.stopBgm(0);
    game.fade.alpha = 0;
    api.setInvasionBeat(game, 'sail');
  });
  await shot('sail-start');
  check('three seconds sail completes', await until(() => game.shipInvasion.done, 5000));
  await shot('sail-end');
  await page.evaluate(() => __invasionAPI.setInvasionBeat(game, 'castle-look'));
  await page.waitForTimeout(1500); await shot('castle-pan');
  check('castle pan and two-half-second hold complete', await until(() => game.shipInvasion.done, 7000));
  await shot('castle-revealed');
  await page.evaluate(() => __invasionAPI.setInvasionBeat(game, 'room-impact'));
  await page.waitForTimeout(450); await shot('room-impact-debris-early');
  check('first room explosion starts invasion music before castle contact', await page.evaluate(() => game.sound.bgmName === 'ship_invasion' && game.shipInvasion.impactCount === 0));
  await page.evaluate(() => { window.__initialInvasionBgm = game.sound.bgm; });
  await page.waitForTimeout(350); await shot('room-impact-debris-falling');
  check('visible debris travels downward across actual rendered frames', await page.evaluate(async () => {
    const { invasionRoomDebris } = await import('./src/scenes/ship-invasion-render.js');
    return invasionRoomDebris(game.shipInvasion).filter(piece => piece.y > 30 && piece.y < 230).length >= 6;
  }));
  await page.evaluate(() => __invasionAPI.setInvasionBeat(game, 'room-shadow'));
  await page.waitForTimeout(800); await shot('room-shadow-mid');
  check('room shadow done', await until(() => game.shipInvasion.done, 3000));
  await shot('room-shadow-full');
  await page.evaluate(() => __invasionAPI.setInvasionBeat(game, 'castle-drop'));
  await page.waitForTimeout(1100); await shot('castle-dropping');
  check('contact happens once', await until(() => game.shipInvasion.impactCount === 1, 3000));
  await shot('castle-contact');
  await page.waitForTimeout(550); await shot('hull-split');
  check('contact pullback and hold finish', await until(() => game.shipInvasion.done, 5000));
  await shot('aftermath-wide');
  check('castle above centered broken ship at six-times scale', await page.evaluate(() => {
    const g = game.shipInvasion.snapshot;
    return Math.abs(g.castle.x + g.castle.width / 2 - g.warship.x - g.warship.width / 2) < 0.1 && g.castle.width / g.warship.width >= 6 && g.split === 1;
  }));
  check('initial explosion music survives later impact without restart', await page.evaluate(() => game.sound.bgmName === 'ship_invasion' && game.sound.bgm === window.__initialInvasionBgm && game.sound.bgm.currentTime > 5));
  for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 800 }); await shot(`aftermath-${width}`); }
  await page.evaluate(() => __invasionAPI.setInvasionBeat(game, 'teleport'));
  await page.waitForTimeout(820); await shot('teleport-first');
  await page.waitForTimeout(450); await shot('teleport-later');
  check('five launches finish', await until(() => game.shipInvasion.done && game.shipInvasion.launchCount === 5, 5000));
  await page.evaluate(() => game.toTitle());
  check('title cleans scene', await until(() => !game.shipInvasion, 3000));
  await shot('title-cleanup');
});
