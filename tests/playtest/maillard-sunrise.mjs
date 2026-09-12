import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/maillard-sunrise107';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const checks = [], errors = [], captures = [];
const check = (name, ok, detail) => { checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, detail ?? ''); };
const shot = async (name) => { await page.screenshot({ path: path.join(shots, `${name}.png`) }); captures.push(name); };
page.on('pageerror', (error) => errors.push(error.message));
page.on('requestfailed', (request) => errors.push(`${request.url()} ${request.failure()?.errorText}`));
const read = () => page.evaluate(() => {
  const cart = game.entities.find((entity) => entity.id === 'maillard_cart');
  return {
    map: game.mapId,
    state: game.state,
    player: { x: game.player.x, y: game.player.y, facing: game.player.facing },
    cart: cart && { x: cart.x, y: cart.y, riding: cart.riding, moving: cart.moving, at: cart.at },
    fieldRide: game.ride?.id,
    hasSpecialScene: Object.hasOwn(game, 'maillardCart'),
    bgm: game.sound.bgmName,
    bgmPaused: game.sound.bgm?.paused,
    bgmTime: game.sound.bgm?.currentTime,
    light: game.sunrise.frame.lightProgress,
    sun: game.sunrise.frame.sunProgress,
    done: !!game.flags.maillard_cart_done,
    seen: !!game.flags.maillard_sunrise_seen,
    party: game.party,
  };
});

try {
  await page.goto(`${process.env.BASE_URL || 'http://localhost:8000'}/?qa=maillard_path`);
  await page.waitForFunction(() => window.game?.mapId === 'maillard_path');
  const entry = await read();
  check('map entry selects sunrise BGM before cart boarding', entry.bgm === 'maillard_sunrise' && entry.player.facing === 'right', entry);
  check('sunrise begins independently in normal field state', entry.state === 'field' && entry.light === 0 && entry.sun === 0 && !entry.hasSpecialScene, entry);
  await shot('01-entry-dark');

  const started = Date.now();
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => game.ride?.id === 'maillard_cart', { timeout: 12000 });
  await page.keyboard.up('ArrowRight');
  const boarding = await read();
  const approachSeconds = (Date.now() - started) / 1000;
  check('walking right auto-boards in about eight seconds without confirm', approachSeconds > 7.3 && approachSeconds < 8.8 && boarding.fieldRide === 'maillard_cart', { approachSeconds, boarding });
  check('cart remains a map entity in field state and faces right', boarding.state === 'field' && boarding.cart?.riding && boarding.cart?.moving && boarding.player.facing === 'right' && !boarding.hasSpecialScene, boarding);
  check('first movement unlocks and plays BGM without confirm', boarding.bgm === 'maillard_sunrise' && boarding.bgmPaused === false && boarding.bgmTime > 6, boarding);
  const boardingMusicTime = boarding.bgmTime;
  await shot('02-auto-board-field');

  await page.waitForFunction((x) => game.entities.find((entity) => entity.id === 'maillard_cart')?.x > x + 40, boarding.cart.x);
  const moving = await read();
  check('field cart travels right and does not reset the music clock', moving.cart.x > boarding.cart.x && moving.bgmTime > boardingMusicTime && moving.state === 'field', { boarding, moving });
  await shot('03-field-ride');

  await page.waitForFunction(() => game.sound.bgm?.currentTime >= 9);
  const gradual = await read();
  check('light and sun are still mid-rise after nine seconds', gradual.light > 0.45 && gradual.light < 0.56 && gradual.sun > 0.35 && gradual.sun < 0.46, gradual);
  await shot('04-slow-rise-9s');

  await page.waitForFunction(() => game.sound.bgm?.currentTime >= 14);
  const highlight = await read();
  check('music highlight occurs during the same continuous field ride', highlight.fieldRide === 'maillard_cart' && highlight.light > 0.75 && highlight.light < 0.82 && highlight.sun > 0.64 && highlight.sun < 0.72, highlight);
  await shot('05-low-sun-14s');

  await page.waitForFunction(() => game.sunrise.frame.completed);
  const raised = await read();
  check('slow sunrise completes without requiring cart completion', raised.seen && raised.light === 1 && raised.sun === 1, raised);
  const midRideSave = await page.evaluate(() => localStorage.getItem('subtarune.save.v1'));
  const midRidePersisted = JSON.parse(midRideSave);
  check('mid-ride sunrise completion defers persistence until safe landing', !midRidePersisted.flags.maillard_sunrise_seen && !midRidePersisted.flags.maillard_cart_done, midRidePersisted);
  await shot('06-sunrise-complete');

  await page.waitForFunction(() => game.flags.maillard_cart_done && !game.ride, { timeout: 14000 });
  const landed = await read();
  check('cart disembarks on the right into the winding deck', landed.done && landed.cart?.at === 1 && landed.player.x > 3200 && landed.player.facing === 'right', landed);
  check('BGM remains continuous after disembark', landed.bgm === 'maillard_sunrise' && landed.bgmPaused === false && landed.bgmTime > raised.bgmTime, { raised, landed });
  const landedSave = await page.evaluate(() => JSON.parse(localStorage.getItem('subtarune.save.v1')));
  check('safe landing persists both sunrise and cart completion', landedSave.flags.maillard_sunrise_seen && landedSave.flags.maillard_cart_done && landedSave.x > 3200, landedSave);
  await shot('07-right-landing');

  await page.keyboard.down('ArrowRight');
  await page.waitForFunction((x) => game.player.x > x + 96, landed.player.x, { timeout: 4000 });
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(800);
  check('post-cart winding path returns normal movement', await page.evaluate(() => !game.ride && game.state === 'field'));
  await shot('08-winding-path');

  await page.evaluate((save) => { localStorage.setItem('subtarune.save.v1', save); game.continueGame(); }, midRideSave);
  await page.waitForFunction(() => game.mapId === 'maillard_path' && game.state === 'field');
  const resumed = await read();
  check('reloading the deferred mid-ride save resumes safely before the cart', !resumed.fieldRide && resumed.cart?.at === 0 && resumed.player.x < resumed.cart.x, resumed);

  check('no runtime or asset-load errors', errors.length === 0, errors);
} catch (error) {
  errors.push(error.message);
  console.error(error);
} finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({
    fixture: 'QA maillard_path; only ArrowRight input, zero confirm presses; natural BGM clock and field-cart movement.',
    checks,
    captures,
    errors,
  }, null, 2));
  await browser.close();
}
const fails = checks.filter((item) => !item.ok).length + errors.length;
console.log(`fails=${fails}`);
process.exitCode = fails ? 1 : 0;
