import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/maillard114-lounge';
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
  await page.goto(`${process.env.BASE_URL || 'http://localhost:8772'}/?qa=maillard_lounge`);
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
  check('shorter enclosed room retains open floor without unrequested NPCs or automatic events', await page.evaluate(() => game.map.pxW === 1536 && game.map.pxH === 640 && !game.map.def.backdrop && !game.dialogue.running && !game.entities.some(e => e.def.type === 'npc')));
  await shot('03-lounge-arrival');
  for (const [x, pose] of [[312, 'arms_crossed'], [472, 'laugh'], [632, 'gesture']]) {
    await walkTo(x, 248);
    await page.keyboard.press('ArrowUp', { delay: 40 });
    const before = await page.evaluate(() => game.entities.filter(e => e === game.player || e.def.type === 'follower').map(e => [e.x, e.y]));
    await page.keyboard.press('KeyC', { delay: 40 });
    await page.waitForFunction(() => game.dialogue.running);
    check(`${pose} statue responds with one line in place`, await page.evaluate(before =>
      game.textbox.node.voice === 'narrator' && !game.textbox.node.text.includes('{n}') &&
      JSON.stringify(game.entities.filter(e => e === game.player || e.def.type === 'follower').map(e => [e.x, e.y])) === JSON.stringify(before), before));
    await page.keyboard.press('KeyX', { delay: 40 });
    await page.waitForFunction(() => game.textbox.state === 'waiting');
    await shot(`statue-${pose}`);
    await page.keyboard.press('KeyC', { delay: 40 });
    await page.waitForFunction(() => !game.dialogue.running);
  }
  await walkTo(700, 400);
  await walkTo(1348, 264);
  await page.keyboard.press('ArrowUp', { delay: 40 });
  await page.evaluate(() => {
    game.loungeHealSounds = 0;
    const original = game.sound.sfx.bind(game.sound);
    game.sound.sfx = name => { if (name === 'heal') game.loungeHealSounds++; return original(name); };
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.evaluate(() => { for (const id of ['hyungsub', ...game.party]) game.partyHp[id] = 1; });
    const before = await page.evaluate(() => game.entities.filter(e => e === game.player || e.def.type === 'follower').map(e => [e.x, e.y]));
    await page.keyboard.press('KeyC', { delay: 40 });
    await page.waitForFunction(() => game.dialogue.running);
    check(`spring C interaction ${attempt + 1} immediately heals everyone without repositioning`, await page.evaluate(before =>
      ['hyungsub', ...game.party].every(id => game.partyHp[id] === game.maxHpOf(id)) &&
      JSON.stringify(game.entities.filter(e => e === game.player || e.def.type === 'follower').map(e => [e.x, e.y])) === JSON.stringify(before), before));
    await page.keyboard.press('KeyX', { delay: 40 });
    await page.waitForFunction(() => game.textbox.state === 'waiting');
    await shot(`spring-heal-${attempt + 1}`);
    await page.keyboard.press('KeyC', { delay: 40 });
    await page.waitForFunction(() => !game.dialogue.running);
  }
  check('each spring interaction plays the existing heal sound', await page.evaluate(() => game.loungeHealSounds === 2));
  check('party traverses the open lounge to the spring', await page.evaluate(() => game.entities.some(e => e.id === 'lounge_spring') && game.party.length === 2 && game.player.x > 1300));
  await walkTo(1400, 184);
  await shot('05-upper-right-wall');
  await walkTo(1400, 552);
  await shot('06-lower-right-wall');
  await walkTo(80, 552);
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
