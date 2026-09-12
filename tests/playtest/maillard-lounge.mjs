import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/maillard113';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const checks = [], errors = [], captures = [];
const check = (name, ok, detail) => { checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };
const shot = async name => { await page.screenshot({ path: path.join(shots, `${name}.png`) }); captures.push(name); };
page.on('pageerror', error => errors.push(error.message));

async function walkTo(x, y) {
  for (const [axis, target, positive, negative] of [['x', x, 'ArrowRight', 'ArrowLeft'], ['y', y, 'ArrowDown', 'ArrowUp']]) {
    const current = await page.evaluate(axis => game.player[axis], axis);
    if (Math.abs(current - target) < 8) continue;
    const key = current < target ? positive : negative;
    await page.keyboard.down(key);
    try {
      await page.waitForFunction(({ axis, target, increasing }) => increasing ? game.player[axis] >= target : game.player[axis] <= target,
        { axis, target, increasing: current < target }, { timeout: 12000 });
    } finally { await page.keyboard.up(key); }
  }
  await page.waitForTimeout(160);
}

try {
  await page.goto(`${process.env.BASE_URL || 'http://localhost:8771'}/?qa=maillard_lounge`);
  await page.waitForFunction(() => game?.player && game.state === 'field' && !game.transitioning);
  await page.keyboard.press('KeyX');
  await page.evaluate(() => game.changeMap('maillard_path', 'from_lounge', true, { enter: false }));
  await page.waitForTimeout(500);
  await shot('01-deck-entrance');
  await walkTo(7660, 168);
  await shot('02-entrance-approach');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => game.mapId === 'maillard_lounge' && !game.transitioning);
  await page.keyboard.up('ArrowRight');
  check('walking right enters the lounge without C or a turn', await page.evaluate(() => game.mapId === 'maillard_lounge'));
  await page.waitForFunction(() => game.sound.bgmName === 'maillard_lounge' && !game.sound.bgm.paused && game.sound.bgm.currentTime > 0.5);
  check('requested full BGM plays and loops', await page.evaluate(() => game.sound.bgm.src.endsWith('/maillard_lounge.mp3') && game.sound.bgm.duration > 89 && game.sound.bgm.loop));
  check('large enclosed room contains no premature NPCs or events', await page.evaluate(() => game.map.pxW === 1536 && game.map.pxH === 896 && !game.map.def.backdrop && !game.dialogue.running && !game.entities.some(e => e.def.type === 'npc')));
  await shot('03-lounge-arrival');
  await walkTo(1030, 450);
  await shot('04-mana-spring');
  check('party traverses the open lounge to the spring', await page.evaluate(() => game.entities.some(e => e.id === 'lounge_spring') && game.party.length === 2 && game.player.x > 1000));
  await walkTo(1400, 184);
  await shot('05-upper-right-wall');
  await walkTo(1400, 784);
  await shot('06-lower-right-wall');
  await walkTo(80, 784);
  await shot('07-lower-left-wall');
  await walkTo(80, 184);
  await shot('08-upper-left-wall');
  await page.setViewportSize({ width: 375, height: 812 });
  await shot('09-small-viewport');
  await page.setViewportSize({ width: 1000, height: 780 });
  await walkTo(112, 440);
  await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(() => game.mapId === 'maillard_path' && !game.transitioning);
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(800);
  check('return remains outside without portal ping-pong', await page.evaluate(() => game.mapId === 'maillard_path' && game.player.facing === 'left' && game.sound.bgmName === 'maillard_sunrise'));
  await shot('10-return-to-deck');
  check('no runtime errors', errors.length === 0, errors);
} catch (error) { errors.push(error.message); console.error(error); }
finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ checks, errors, captures }, null, 2));
  await browser.close();
}
const fails = checks.filter(c => !c.ok).length + errors.length;
console.log(`fails=${fails}`);
process.exitCode = fails ? 1 : 0;
