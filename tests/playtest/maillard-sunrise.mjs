import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/maillard-sunrise106';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const checks = [], errors = [], captures = [];
const check = (name, ok, detail) => { checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, detail ?? ''); };
const shot = async name => { await page.screenshot({ path: path.join(shots, `${name}.png`) }); captures.push(name); };
page.on('pageerror', error => errors.push(error.message));
const read = () => page.evaluate(() => ({
  map: game.mapId, state: game.state, x: game.player.x, y: game.player.y,
  phase: game.maillardCart?.phase, phaseTime: game.maillardCart?.phaseTime,
  rideTime: game.maillardCart?.rideTime, progress: game.sunrise.frame.progress,
  bgm: game.sound.bgmName, audioTime: game.sound.bgm?.currentTime,
  done: !!game.flags.maillard_cart_done, seen: !!game.flags.maillard_sunrise_seen,
  order: game.maillardCart?.config.order, party: game.party, fade: game.fade.alpha,
}));

try {
  await page.goto(`${process.env.BASE_URL || 'http://localhost:8767'}/?qa=maillard_path`);
  await page.waitForFunction(() => !!window.game?.player);
  await page.keyboard.press('KeyX', { delay: 40 });
  await page.evaluate(() => game.changeMap('maillard_deck', 'from_path', true, { enter: false }));
  await page.waitForTimeout(700);
  await page.keyboard.press('ArrowRight', { delay: 150 });
  await shot('hold-stairs');
  await page.keyboard.press('KeyC', { delay: 40 });
  await page.waitForFunction(() => game.mapId === 'maillard_path' && !game.transitioning);
  const entry = await read();
  check('hold stairs C connects to dark outdoor approach', entry.bgm === 'wind' && entry.progress === 0 && !entry.done, entry);
  await shot('approach-dark');
  const started = Date.now();
  await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(() => !!game.maillardCart, { timeout: 14000 });
  await page.keyboard.up('ArrowLeft');
  const approachSeconds = (Date.now() - started) / 1000;
  check('real walking reaches automatic boarding in about eight seconds', approachSeconds > 6.8 && approachSeconds < 9.2, approachSeconds);
  await shot('boarding');
  await page.waitForFunction(() => game.maillardCart?.phase === 'ride');
  const departure = await read();
  check('departure starts selected music at zero and keeps requested cart order', departure.bgm === 'maillard_sunrise' && departure.audioTime < 0.6 && departure.order.join(',') === 'player,ppaman,gyeongsub', departure);
  await page.waitForFunction(() => game.maillardCart?.rideTime >= 2);
  await shot('ride-dark');
  await page.keyboard.press('ArrowUp', { delay: 150 });
  check('cart ride does not let ordinary movement leave the scene', (await read()).state === 'cart');
  await page.waitForFunction(() => game.maillardCart?.rideTime >= 13.7);
  check('sun stays below horizon before music highlight', (await read()).progress === 0);
  await shot('before-highlight');
  await page.waitForFunction(() => game.maillardCart?.rideTime >= 15.9);
  const mid = await read();
  check('sun rises midway from actual media time', mid.progress > 0.4 && mid.progress < 0.65 && Math.abs(mid.rideTime - mid.audioTime) < 0.15, mid);
  await shot('sunrise-mid');
  await page.waitForFunction(() => game.maillardCart?.rideTime >= 18.3);
  check('sunrise settles and world fully brightens', (await read()).progress === 1);
  await shot('sunrise-raised');
  await page.waitForFunction(() => game.maillardCart?.phase === 'disembark');
  await page.waitForTimeout(350);
  await shot('disembark');
  await page.waitForFunction(() => !game.maillardCart && game.flags.maillard_cart_done && !game.transitioning);
  const landed = await read();
  check('landing restores field and keeps sun, music, original party order', landed.state === 'field' && landed.progress === 1 && landed.seen && landed.bgm === 'maillard_sunrise' && landed.party.join(',') === 'gyeongsub,ppaman', landed);
  await shot('landing-bright');
  const route = await page.evaluate(() => game.map.def.meta.sunriseWalkout);
  for (const [index, point] of route.entries()) {
    const state = await read();
    const dx = point[0] - 12 - state.x, dy = point[1] - 8 - state.y;
    if (Math.abs(dx) > 10) {
      await page.keyboard.down(dx < 0 ? 'ArrowLeft' : 'ArrowRight');
      await page.waitForFunction(({ target, sign }) => sign * (game.player.x - target) >= -8, { target: point[0] - 12, sign: Math.sign(dx) }, { timeout: 16000 });
      await page.keyboard.up(dx < 0 ? 'ArrowLeft' : 'ArrowRight');
    }
    if (Math.abs(dy) > 10) {
      await page.keyboard.down(dy < 0 ? 'ArrowUp' : 'ArrowDown');
      await page.waitForFunction(({ target, sign }) => sign * (game.player.y - target) >= -8, { target: point[1] - 8, sign: Math.sign(dy) }, { timeout: 16000 });
      await page.keyboard.up(dy < 0 ? 'ArrowUp' : 'ArrowDown');
    }
    await shot(`walkout-${index}`);
  }
  check('post-ride NPCs have no interaction or combat scripts', await page.evaluate(() => {
    const npcs = game.entities.filter(e => e.def.type === 'npc');
    return npcs.length >= 3 && npcs.every(e => !e.def.script && e.interact(game.player) === false);
  }));
  await page.keyboard.press('KeyC');
  check('confirm does not start a placeholder event', await page.evaluate(() => !game.dialogue.running && !game.battle));
  await page.evaluate(() => { game.autosave(); game.toTitle(); });
  await page.waitForFunction(() => game.state === 'title');
  await page.evaluate(() => game.continueGame());
  await page.waitForTimeout(600);
  check('continue restores raised sun without replaying the cart', await page.evaluate(() => game.mapId === 'maillard_path' && game.sunrise.frame.progress === 1 && !game.maillardCart && game.sound.bgmName === 'maillard_sunrise'));
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 812 });
    await shot(`width-${width}`);
  }
  check('no runtime errors', errors.length === 0, errors);
} catch (error) { errors.push(error.message); console.error(error); }
finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ fixture: 'QA completed hold state only; actual stairs C, approach keys, natural audio20s ride and walkout, save/continue.', checks, captures, errors }, null, 2));
  await browser.close();
}
const fails = checks.filter(item => !item.ok).length + errors.length;
console.log(`fails=${fails}`);
process.exitCode = fails ? 1 : 0;
