import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/maillard-finale';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const errors = [], checks = [], seen = new Set(), lines = [], sounds = [];
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
  const deadline = Date.now() + 90000;
  let lastLine = '';
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => ({
      beat: game.maillardArrival?.beat, t: game.maillardArrival?.beatTime, box: game.textbox.state,
      text: game.textbox.node?.text, map: game.mapId, running: game.dialogue.running,
      music: game.sound.bgmName, fade: game.fade.alpha,
      shipRect: game.maillardArrival?.shipRect(),
    }));
    if (state.map === 'maillard_deck' && !state.running && state.fade === 0) break;
    if (state.text && state.text !== lastLine && state.box !== 'closed') {
      lines.push({ text: state.text, music: state.music, beat: state.beat }); lastLine = state.text;
    }
    const thresholds = { unstable: 0.8, resurgence: 0.35, shadow: 1.8, fall: 0.7, reveal: 2.25, hops: 0.2, compose: 0.45, spotlight: 0.2, laugh: 0.2, island: 0.7 };
    if (!seen.has(state.beat) && state.t >= (thresholds[state.beat] ?? Infinity)) {
      seen.add(state.beat); await shot(state.beat);
      if (state.beat === 'compose') check('entire ship fits above dialogue', state.shipRect.x >= 0 && state.shipRect.x + state.shipRect.width <= 480 && state.shipRect.y >= 0 && state.shipRect.y + state.shipRect.height <= 230, state.shipRect);
    }
    if (state.box === 'typing') await page.keyboard.press('KeyX', { delay: 40 });
    else if (state.box === 'waiting') {
      if (!seen.has(`line-${lines.length}`)) { await shot(`line-${lines.length}`); seen.add(`line-${lines.length}`); }
      await page.keyboard.press('KeyC', { delay: 50 });
    }
    await page.waitForTimeout(60);
  }
  sounds.push(...await page.evaluate(() => window.maillardSounds));
  check('all fourteen supplied lines played', lines.length === 14, lines);
  check('requested visual beats were observed', ['unstable', 'resurgence', 'shadow', 'fall', 'reveal', 'hops', 'spotlight', 'laugh', 'island'].every(beat => seen.has(beat)), [...seen]);
  check('roar, hull impact, applause and existing laugh sounds trigger', ['baron_roar', 'maillard_splash', 'maillard_applause', 'laugh_junhee'].every(name => sounds.includes(name)), sounds);
  check('starts silent then selected reveal song and ends silent', !lines[0]?.music && lines.some(line => line.music === 'maillard_reveal') && !lines.at(-1)?.music);
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
  check('no page errors', errors.length === 0, errors);
} catch (error) { fails++; errors.push(error.message); console.error(error); }
finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ checks, lines, sounds, seen: [...seen], errors, fails }, null, 2));
  await browser.close();
}
console.log(`fails=${fails}`);
process.exitCode = fails ? 1 : 0;
