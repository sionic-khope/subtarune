import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/maillard108';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const checks = [], errors = [], captures = [], resetCancellations = [];
let resettingFixture = false;
const check = (name, ok, detail) => { checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, detail ?? ''); };
const shot = async name => { await page.screenshot({ path: path.join(shots, name + '.png') }); captures.push(name); };
page.on('pageerror', error => errors.push(error.message));
page.on('requestfailed', request => {
  const failure = request.failure()?.errorText;
  if (resettingFixture && failure === 'net::ERR_ABORTED' && request.url().endsWith('/assets/audio/bgm/maillard_sunrise.mp3')) {
    resetCancellations.push(request.url());
    return;
  }
  errors.push(`${request.url()} ${failure}`);
});
const read = () => page.evaluate(() => {
  const g = game, cart = g.entities.find(e => e.id === 'maillard_cart');
  return {
    map: g.mapId, state: g.state, ride: g.ride?.id,
    x: g.player.x, facing: g.player.facing, screenY: g.player.y + g.player.h - g.camera.y,
    cart: cart && { x: cart.x, at: cart.at, moving: cart.moving },
    bgm: g.sound.bgmName, time: g.sound.bgm?.currentTime, paused: g.sound.bgm?.paused,
    sun: g.sunrise.frame.sunProgress, light: g.sunrise.frame.lightProgress,
    seen: !!g.flags.maillard_sunrise_seen, done: !!g.flags.maillard_cart_done,
    followers: g.entities.filter(e => e.def.type === 'follower').map(e => ({
      id: e.id, x: e.x, y: e.y, visible: e.visible, facing: e.facing,
      safe: !g.map.solidRect(e.x, e.y, e.w, e.h),
      clearOfCart: !cart?.overlaps(e.rect),
    })),
  };
});
try {
  await page.goto(`${process.env.BASE_URL || 'http://localhost:8000'}/?qa=maillard_path`);
  await page.waitForFunction(() => game?.mapId === 'maillard_path');
  await page.evaluate(() => {
    game.setFlag('maillard_hold_done');
    game.changeMap('maillard_deck', 'from_path', true, { enter: false });
  });
  await page.keyboard.press('ArrowRight', { delay: 1100 });
  const door = await page.evaluate(() => ({ facing: game.player.facing, target: game.player.probe()?.id, x: game.player.x }));
  check('right-facing interaction works at the far end of the stairs', door.facing === 'right' && door.target === 'hold_stairs_door', door);
  await shot('01-stairs-facing-right');
  await page.keyboard.press('KeyC');
  await page.waitForFunction(() => game.mapId === 'maillard_path' && !game.transitioning);
  check('stairs enter the deck without turning around', (await read()).map === 'maillard_path');
  await shot('02-lower-deck-dark');
  await page.evaluate(() => {
    window.cartSounds = [];
    const original = game.sound.sfx.bind(game.sound);
    game.sound.sfx = (name, ...args) => { window.cartSounds.push(name); return original(name, ...args); };
  });
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => game.player.probe()?.id === 'maillard_cart', null, { timeout: 12000 });
  await page.keyboard.up('ArrowRight');
  check('approaching the cart does not board without C', !(await read()).ride);
  await page.keyboard.press('KeyC');
  await page.waitForFunction(() => game.ride?.id === 'maillard_cart');
  const boarding = await read();
  check('C boards facing right and plays the boarding sound', boarding.facing === 'right' && await page.evaluate(() => window.cartSounds.filter(n => n === 'thud').length === 1), boarding);
  await page.waitForFunction(x => game.ride?.x > x + 128, boarding.cart.x);
  const moving = await read();
  check('rail rides along the bottom of the screen', moving.screenY > 280 && moving.screenY < 320, moving);
  const clipped = await page.evaluate(() => {
    const g = game, r = g.ride, c = document.createElement('canvas');
    c.width = 480; c.height = 360;
    const ctx = c.getContext('2d'), cam = { x: Math.round(g.camera.x), y: Math.round(g.camera.y) };
    for (const e of [g.player, ...g.entities.filter(e => e.def.type === 'follower')]) e.draw(ctx, cam);
    const rim = Math.round(r.drawY + r.def.seatClipY - cam.y);
    const pixels = ctx.getImageData(0, 0, 480, 360).data;
    let above = 0, below = 0;
    for (let y = 0; y < 360; y++) for (let x = 0; x < 480; x++) {
      if (pixels[(y * 480 + x) * 4 + 3]) { if (y >= rim) below++; else above++; }
    }
    return { above, below, rim };
  });
  check('riders draw only above the cart rim with no visible legs', clipped.above > 0 && clipped.below === 0, clipped);
  await shot('03-seated-rail-ride');
  await page.waitForFunction(() => game.sound.bgm.currentTime >= 14);
  const highlight = await read();
  check('the sun only starts at the music highlight', highlight.sun < 0.03 && highlight.light < 0.12, highlight);
  await shot('04-highlight-first-light');
  await page.waitForFunction(() => game.flags.maillard_cart_done && !game.ride, null, { timeout: 14000 });
  const landed = await read(), rideSeconds = landed.time - boarding.time;
  check('cart takes about ten seconds and lands with both followers', rideSeconds > 9.6 && rideSeconds < 10.5 && landed.followers.length === 2 && landed.followers.every(f => f.visible && f.safe && f.clearOfCart && Math.abs(f.x - landed.x) < 130), { rideSeconds, landed });
  await shot('05-everyone-disembarked');
  await page.keyboard.press('ArrowRight', { delay: 600 });
  const walked = await read();
  check('both followers keep following after disembarking', walked.followers.every(f => f.x > landed.followers.find(old => old.id === f.id).x && Math.abs(f.x - walked.x) < 130), walked);
  await shot('06-party-following');
  await page.waitForFunction(() => game.sound.bgm.currentTime >= 28);
  const halfway = await read();
  check('sunrise continues slowly after the ride', halfway.sun > 0.48 && halfway.sun < 0.53 && !halfway.ride, halfway);
  await shot('07-slow-sun-after-cart');
  await page.waitForFunction(() => game.sunrise.frame.completed, null, { timeout: 18000 });
  const complete = await read();
  check('large sunrise finishes near 42 seconds with continuous music', complete.seen && complete.time >= 42 && complete.bgm === 'maillard_sunrise' && !complete.paused, complete);
  await shot('08-wide-sky-sunrise');
  resettingFixture = true;
  await page.evaluate(() => game.continueGame());
  const continued = await read();
  check('continue restores both followers at safe landing', continued.done && continued.seen && continued.followers.length === 2 && continued.followers.every(f => f.visible && f.safe && f.clearOfCart), continued);
  await page.evaluate(() => {
    game.devJump({ map: 'maillard_path', spawn: 'from_hold', flags: { maillard_hold_done: true }, party: ['gyeongsub', 'ppaman'] });
    const cart = game.entities.find(e => e.id === 'maillard_cart');
    cart.interact(game.player);
    window.safeCartSave = localStorage.getItem('subtarune.save.v1');
    game.sunrise.sound = { bgmName: 'maillard_sunrise', bgm: { currentTime: 43 } };
  });
  await page.waitForFunction(() => game.sunrise.frame.completed, null, { timeout: 5000 });
  check('late boarding still defers sunrise autosave while riding', await page.evaluate(() => !!game.ride && localStorage.getItem('subtarune.save.v1') === window.safeCartSave));
  await page.evaluate(() => game.continueGame());
  const deferred = await read();
  check('mid-ride reload returns safely to the station', !deferred.ride && deferred.cart.at === 0 && deferred.x < deferred.cart.x, deferred);
  check('no runtime or asset-load errors', errors.length === 0, errors);
} catch (error) {
  errors.push(error.message); console.error(error);
} finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ fixture: 'Completed hold fixture, real right/C portal and boarding, real 42-second BGM clock; final synthetic media-clock fixture checks late-boarding persistence.', checks, captures, errors, resetCancellations }, null, 2));
  await browser.close();
}
const fails = checks.filter(check => !check.ok).length + errors.length;
console.log(`fails=${fails}`);
process.exitCode = fails ? 1 : 0;
