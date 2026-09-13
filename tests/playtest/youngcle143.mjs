import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.BASE_URL || 'http://localhost:8000';
const shots = process.env.SHOT_DIR || '/tmp/youngcle143-playtest';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
await page.addInitScript(() => {
  window.plugPlays = 0;
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    if (this.src.endsWith('/plug.mp3')) window.plugPlays++;
    return play.apply(this, args);
  };
});
const checks = [], errors = [], resources = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) resources.push(`${response.status()} ${response.url()}`); });
const check = (name, pass, detail) => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
};
const shot = name => page.screenshot({ path: path.join(shots, `${name}.png`) });
const confirm = async () => { await page.keyboard.press('KeyC'); await page.waitForTimeout(120); };
const ready = map => page.waitForFunction(map => game.mapId === map && game.state === 'field'
  && !game.transitioning && !game.dialogue.running && game.fade.alpha === 0, map);

try {
  await page.goto(base);
  await page.waitForFunction(() => window.game?.title);
  await page.evaluate(async () => {
    const { QA_POINTS } = await import('/src/core/story.js');
    const point = QA_POINTS.find(entry => entry.id === 'youngcle1');
    game.devJump({ ...point, flags: { ...point.flags, youngcle_intro_done: true } });
  });
  await ready('youngcle1');
  await page.evaluate(() => {
    game.player.x = 660; game.player.y = 220; game.player.facing = 'up'; game.player.trail = [];
    window.tvAnchor = game.entities.find(entity => entity.id === 'youngcle_tv_screen');
    window.partyBeforeGag = [game.player, ...game.entities.filter(entity => entity.def.type === 'follower')]
      .map(entity => ({ id: entity.id, x: entity.x, y: entity.y }));
  });
  await shot('01-off-tv');
  await confirm();
  await page.waitForFunction(() => game.tvBroadcast?.expression === 'read' && game.textbox.node?.text === '* ..오..');
  await page.waitForTimeout(220);
  await shot('02-reading');
  check('first C uses the original live TV interaction entity', await page.evaluate(() =>
    window.tvAnchor === game.entities.find(entity => entity.id === 'youngcle_tv_screen')
      && window.tvAnchor.def.script === 'youngcle_tv_off'));
  await confirm(); await confirm();
  await page.waitForFunction(() => game.tvBroadcast?.expression === 'shock' && game.textbox.node?.text === '* 뭐 뭐노?!');
  await page.waitForTimeout(180);
  await shot('03-shocked');
  await confirm(); await confirm();
  await page.waitForFunction(() => game.tvBroadcast?.expression === 'hide');
  await shot('04-hide');
  await ready('youngcle1');
  const gag = await page.evaluate(() => ({ done: game.flags.youngcle_tv_gag_done, tv: game.tvBroadcast,
    phase: game.tvBroadcast?.phase, zoom: game.zoom.s, cameraIsPlayer: game.camera.target === game.player,
    party: [game.player, ...game.entities.filter(entity => entity.def.type === 'follower')]
      .map(entity => ({ id: entity.id, x: entity.x, y: entity.y })) }));
  check('gag powers off once and restores player camera', gag.done && gag.tv === null
    && gag.zoom === 1 && gag.cameraIsPlayer, gag);
  check('simple TV interaction never relocates the party', JSON.stringify(gag.party) === JSON.stringify(await page.evaluate(() => window.partyBeforeGag)), gag.party);
  await confirm();
  await page.waitForFunction(() => game.textbox.node?.text === '* TV는 꺼져 있다.');
  await page.waitForFunction(() => game.textbox.state === 'waiting');
  await page.waitForTimeout(250);
  await shot('05-repeat-off');
  check('repeat response does not restart the broadcast', await page.evaluate(() => game.tvBroadcast === null));
  await confirm(); await ready('youngcle1');

  await page.evaluate(() => {
    game.player.x = 108; game.player.y = 220; game.player.facing = 'up'; game.camera.snap();
  });
  await confirm();
  await page.waitForFunction(() => game.textbox.node?.text === '* 문은 잠겨 있다.');
  await page.waitForFunction(() => game.textbox.state === 'waiting');
  await page.waitForTimeout(250);
  await shot('06-left-locked');
  check('left upper door stays locked in the first room', await page.evaluate(() => game.mapId === 'youngcle1'));
  await confirm(); await ready('youngcle1');

  await page.evaluate(() => {
    game.player.x = 1212; game.player.y = 220; game.player.facing = 'up'; game.camera.snap();
  });
  await shot('07-right-door');
  await confirm();
  await page.waitForFunction(() => game.mapId === 'youngcle1' && game.transitioning
    && game.fade.color === '0,0,0' && game.fade.alpha > 0.4);
  await shot('08-right-black-fade');
  await ready('youngcle2');
  await shot('09-youngcle2-left-arrival');
  const arrival = await page.evaluate(() => ({ map: game.mapId, entry: game.entrySpawn,
    x: game.player.x, y: game.player.y, facing: game.player.facing,
    expected: game.map.def.spawns.left, plugPlays: window.plugPlays }));
  check('right upper door uses C, clunk transition, and youngcle2 left spawn', arrival.map === 'youngcle2'
    && arrival.entry === 'left' && arrival.x === arrival.expected.x && arrival.y === arrival.expected.y
    && arrival.facing === arrival.expected.facing && arrival.plugPlays === 1, arrival);
  check('new TV pose and portrait files load without HTTP failures', !resources.some(url => /youngcle-tv-(read|shock|hide)|youngcle_tv_(read|shock|hide)/.test(url)), resources);
  check('no browser runtime errors', errors.length === 0, errors);
} catch (error) {
  errors.push(error.stack || error.message);
  await shot('failure');
  console.error(error);
} finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ checks, errors, resources }, null, 2));
  await browser.close();
}
const failures = errors.length + checks.filter(check => !check.pass).length;
console.log(`fails=${failures}`);
process.exitCode = failures ? 1 : 0;
