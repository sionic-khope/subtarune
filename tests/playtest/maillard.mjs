import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/maillard-finale';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const errors = [], checks = [], seen = new Set(), lines = [], sounds = [], whiteFrames = [];
let fails = 0;
const check = (name, ok, detail) => { checks.push({ name, ok, detail }); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, detail ?? ''); };
const shot = (name) => page.screenshot({ path: path.join(shots, `${name}.png`) });
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(`${process.env.BASE_URL || 'http://localhost:8767'}/?qa=obj5_sea`);
  await page.waitForFunction(() => !!window.game?.player);
  await page.keyboard.press('KeyX', { delay: 50 });
  await page.waitForFunction(() => !!game.seaChase);
  await page.waitForFunction(() => game.fade.alpha === 0);
  await page.evaluate(() => {
    game.setFlag('obj5_chase_cleared');
    game.seaChase.model.setPhase('cleared');
    game.seaChase.model.hits = game.seaChase.model.config.hitsToClear;
    window.maillardSounds = [];
    const sfx = game.sound.sfx.bind(game.sound);
    game.sound.sfx = (name, options) => { window.maillardSounds.push(name); return sfx(name, options); };
  });
  await page.waitForFunction(() => !!game.maillardArrival && game.dialogue.running);
  check('cleared fixture enters next scene with loaded art', await page.evaluate(() => !!game.maillardArrival.ship && !!game.maillardArrival.island));
  await page.evaluate(() => {
    window.revealedBossDraws = 0;
    const scene = game.maillardArrival;
    const drawBoss = scene.sea.drawBoss.bind(scene.sea);
    scene.sea.drawBoss = (...args) => {
      if (['reveal', 'hops', 'compose', 'spotlight', 'laugh', 'island', 'boarding'].includes(scene.beat)) window.revealedBossDraws++;
      return drawBoss(...args);
    };
  });
  const deadline = Date.now() + 120000;
  let lastLine = '';
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => ({
      beat: game.maillardArrival?.beat, t: game.maillardArrival?.beatTime, box: game.textbox.state,
      text: game.textbox.node?.text, map: game.mapId, running: game.dialogue.running,
      music: game.sound.bgmName, fade: game.fade.alpha,
      shipRect: game.maillardArrival?.shipRect(),
      clock: performance.now(), color: game.fade.color,
    }));
    if (state.map === 'maillard_deck' && !state.running && state.fade === 0) break;
    if (state.beat === 'boarding' && state.fade === 1 && state.color === '255,255,255') whiteFrames.push(state.clock);
    if (state.text && state.text !== lastLine && state.box !== 'closed') {
      lines.push({ text: state.text, music: state.music, beat: state.beat, map: state.map }); lastLine = state.text;
    }
    const thresholds = { unstable: 0.8, resurgence: 0.35, shadow: 1.8, fall: 0.7, reveal: 2.25, hops: 0.2, compose: 0.45, spotlight: 0.2, laugh: 0.2, island: 0.7, boarding: 0.7 };
    if (!seen.has(state.beat) && state.t >= (thresholds[state.beat] ?? Infinity)) {
      seen.add(state.beat); await shot(state.beat);
      if (state.beat === 'compose') check('entire ship fits above dialogue', state.shipRect.x >= 0 && state.shipRect.x + state.shipRect.width <= 480 && state.shipRect.y >= 0 && state.shipRect.y + state.shipRect.height <= 230, state.shipRect);
    }
    if (state.beat === 'spotlight' && !seen.has('sailing-motion')) {
      seen.add('sailing-motion');
      const before = await page.evaluate(() => ({ scroll: game.seaChase.model.scroll, rect: game.maillardArrival.shipRect() }));
      await shot('sailing-start');
      await page.waitForTimeout(1000);
      const after = await page.evaluate(() => ({ scroll: game.seaChase.model.scroll, rect: game.maillardArrival.shipRect() }));
      await shot('sailing-later');
      check('water travels right past left-facing ship with no living Baron', after.scroll < before.scroll && await page.evaluate(() => window.revealedBossDraws === 0), { before, after });
    }
    if (state.box === 'typing') await page.keyboard.press('KeyX', { delay: 40 });
    else if (state.box === 'waiting') {
      if (!seen.has(`line-${lines.length}`)) { await shot(`line-${lines.length}`); seen.add(`line-${lines.length}`); }
      await page.keyboard.press('KeyC', { delay: 50 });
    }
    await page.waitForTimeout(60);
  }
  sounds.push(...await page.evaluate(() => window.maillardSounds));
  check('all fourteen reveal lines play before new interior dialogue', lines.filter(line => line.map === 'obj5').length === 14, lines);
  check('requested visual beats were observed', ['unstable', 'resurgence', 'shadow', 'fall', 'reveal', 'hops', 'spotlight', 'laugh', 'island'].every(beat => seen.has(beat)), [...seen]);
  check('roar, hull impact, applause, laugh and water lift sounds trigger', ['baron_roar', 'maillard_splash', 'maillard_applause', 'laugh_junhee', 'maillard_water_lift'].every(name => sounds.includes(name)), sounds);
  check('white boarding hold lasts at least 1.5 seconds', whiteFrames.length > 1 && whiteFrames.at(-1) - whiteFrames[0] >= 1500, whiteFrames.at(-1) - whiteFrames[0]);
  check('starts silent, chosen reveal song, then wind inside', !lines[0]?.music && lines.some(line => line.music === 'maillard_reveal') && lines.at(-1)?.music === 'wind');
  check('new interior narrative completes once', lines.at(-1)?.text === '* 갑판으로 올라가자.' && await page.evaluate(() => game.flags.maillard_hold_done));
  check('defeated Baron is absent from all zoomed-out frames', await page.evaluate(() => window.revealedBossDraws === 0));
  check('deck control returns with one-time completion and no combat scene', await page.evaluate(() => game.mapId === 'maillard_deck' && game.flags.obj5_maillard_done && !game.maillardArrival && !game.seaChase && !game.dialogue.running && !game.ride));
  await shot('deck');
  const oldX = await page.evaluate(() => game.player.x);
  await page.keyboard.press('ArrowRight', { delay: 220 });
  check('player can walk on deck', await page.evaluate(x => game.player.x > x, oldX));
  await page.evaluate(() => game.autosave());
  await page.evaluate(() => game.toTitle());
  await page.waitForFunction(() => game.state === 'title');
  await page.evaluate(() => game.continueGame());
  await page.waitForTimeout(700);
  check('continue stays on deck without replay', await page.evaluate(() => game.mapId === 'maillard_deck' && !game.maillardArrival && !game.seaChase && !game.dialogue.running));
  await page.setViewportSize({ width: 375, height: 812 }); await shot('deck-narrow');
  await page.setViewportSize({ width: 768, height: 900 }); await shot('deck-tablet');
  await page.setViewportSize({ width: 1280, height: 900 }); await shot('deck-wide');
  check('no page errors', errors.length === 0, errors);
} catch (error) { fails++; errors.push(error.message); console.error(error); }
finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ checks, lines, sounds, seen: [...seen], errors, fails }, null, 2));
  await browser.close();
}
console.log(`fails=${fails}`);
process.exitCode = fails ? 1 : 0;
