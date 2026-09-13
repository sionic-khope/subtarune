import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/youngcle-factory143';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const checks = [], errors = [], captures = [], factoryResourceErrors = [];
const check = (name, ok, detail) => {
  checks.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
};
const shot = async name => {
  const file = path.join(shots, `${name}.png`);
  await page.screenshot({ path: file });
  captures.push(file);
};
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text());
});
page.on('response', response => {
  if (response.status() >= 400 && /youngcle_factory|youngcle[234]\.json/.test(response.url())) {
    factoryResourceErrors.push(`${response.status()} ${response.url()}`);
  }
});

async function walkTo(x, y) {
  for (const [axis, target, positive, negative] of [['x', x, 'ArrowRight', 'ArrowLeft'], ['y', y, 'ArrowDown', 'ArrowUp']]) {
    const current = await page.evaluate(key => game.player[key], axis);
    if (Math.abs(current - target) < 6) continue;
    const key = current < target ? positive : negative;
    await page.keyboard.down(key);
    try {
      await page.waitForFunction(({ axis: keyAxis, target: goal, increasing }) =>
        increasing ? game.player[keyAxis] >= goal : game.player[keyAxis] <= goal,
      { axis, target, increasing: current < target }, { timeout: 12000 });
    } finally {
      await page.keyboard.up(key);
    }
  }
  await page.waitForTimeout(120);
}

async function captureBreakpoints(mapId, spawn) {
  await page.evaluate(({ id, at }) => game.changeMap(id, at, true, { enter: false }), { id: mapId, at: spawn });
  for (const [width, height] of [[375, 812], [768, 900], [1280, 900]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    await shot(`${mapId}-${width}`);
  }
}

try {
  await page.goto(`${process.env.BASE_URL || 'http://localhost:8793'}/?qa=youngcle2`);
  await page.waitForFunction(() => game?.player && game.mapId === 'youngcle2' && !game.transitioning);
  await page.waitForTimeout(500);
  const arrival = await page.evaluate(() => game.entities
    .filter(entity => entity === game.player || entity.def.type === 'follower')
    .map(entity => [Math.round(entity.x), Math.round(entity.y)]));
  check('youngcle2 arrival separates the three-person party on the lower landing',
    new Set(arrival.map(point => point.join(','))).size === 3, arrival);
  check('factory BGM starts on the first factory map',
    await page.evaluate(() => game.sound.bgmName === 'youngcle_factory'));
  await page.evaluate(() => { window.__factoryBgm = game.sound.bgm; });
  await shot('01-youngcle2-lower-arrival');
  await walkTo(304, 784);
  await shot('02-youngcle2-bend');
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => game.mapId === 'youngcle3' && !game.transitioning, { timeout: 15000 });
  await page.keyboard.up('ArrowUp');
  check('one-bend catwalk progresses upward into youngcle3 without C',
    await page.evaluate(() => game.mapId === 'youngcle3'));
  check('factory BGM continues without a new audio element',
    await page.evaluate(() => game.sound.bgm === window.__factoryBgm));
  await shot('03-youngcle3-unsolved');

  await walkTo(132, 236);
  await page.keyboard.press('ArrowUp', { delay: 30 });
  await page.keyboard.press('KeyC');
  await page.waitForFunction(() => game.dialogue.running);
  check('crate console explains direction controls through the standard dialogue box',
    await page.evaluate(() => game.textbox.node?.text.includes('방향키')));
  await page.keyboard.press('KeyX');
  await page.waitForFunction(() => game.textbox.state === 'waiting');
  await shot('04-crate-controls');
  await page.keyboard.press('KeyC');
  await page.waitForFunction(() => !game.dialogue.running);

  await walkTo(166, 248);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => game.entities.find(entity => entity.id === 'youngcle3_crate').slide);
  await page.waitForTimeout(65);
  await shot('05-crate-mid-slide');
  await page.waitForFunction(() => game.flags.youngcle3_crate_solved, { timeout: 5000 });
  await page.keyboard.up('ArrowRight');
  const crateSolved = await page.evaluate(() => {
    const crate = game.entities.find(entity => entity.id === 'youngcle3_crate');
    const plate = game.entities.find(entity => entity.id === 'youngcle3_plate');
    const gate = game.entities.find(entity => entity.id === 'youngcle3_gate');
    return { crate: [Math.round(crate.x), Math.round(crate.y)], plate: [plate.x, plate.y],
      gateSolid: gate.solid, saved: JSON.parse(localStorage.getItem(game.constructor.SAVE_KEY)).flags.youngcle3_crate_solved };
  });
  check('three held-direction pushes place the cross-braced crate on the plate and open the full gate',
    crateSolved.crate[0] === 288 && crateSolved.gateSolid === false, crateSolved);
  check('crate solution is present in the autosave', crateSolved.saved === true, crateSolved);
  await shot('06-crate-solved');

  await walkTo(260, 306);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => game.mapId === 'youngcle4' && !game.transitioning, { timeout: 10000 });
  await page.keyboard.up('ArrowRight');
  check('open youngcle3 threshold walks into youngcle4 without C',
    await page.evaluate(() => game.mapId === 'youngcle4'));
  check('the same factory BGM continues into youngcle4',
    await page.evaluate(() => game.sound.bgm === window.__factoryBgm));
  await shot('07-circuit-unsolved');

  await walkTo(96, 306);
  await walkTo(228, 306);
  await walkTo(228, 276);
  await page.keyboard.press('ArrowUp', { delay: 30 });
  await page.keyboard.press('KeyC');
  await page.waitForTimeout(180);
  const partial = await page.evaluate(() => ({
    middle: game.entities.find(entity => entity.id === 'youngcle4_wire_middle').isLit(),
    breaker: game.entities.find(entity => entity.id === 'youngcle4_wire_breaker').isLit(),
  }));
  check('first rotated plate lights only the contiguous middle segment',
    partial.middle === true && partial.breaker === false, partial);
  await shot('08-circuit-partial');

  await walkTo(324, 276);
  await page.keyboard.press('ArrowUp', { delay: 30 });
  await page.keyboard.press('KeyC');
  await page.waitForFunction(() => game.flags.youngcle4_circuit_solved);
  const circuitSolved = await page.evaluate(() => ({
    breaker: game.entities.find(entity => entity.id === 'youngcle4_wire_breaker').isLit(),
    gateSolid: game.entities.find(entity => entity.id === 'youngcle4_gate').solid,
    onwardDoor: game.entities.some(entity => entity.def.type === 'door' && entity.def.to !== 'youngcle3'),
  }));
  check('second rotated plate lights the breaker and deactivates the plasma gate',
    circuitSolved.breaker === true && circuitSolved.gateSolid === false, circuitSolved);
  check('the final landing has no invented onward map or event', circuitSolved.onwardDoor === false, circuitSolved);
  await shot('09-circuit-solved');
  await walkTo(468, 248);
  await shot('10-final-landing');

  await walkTo(468, 306);
  await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(() => game.mapId === 'youngcle3' && !game.transitioning, { timeout: 10000 });
  await page.keyboard.up('ArrowLeft');
  check('re-entered crate room restores solved crate and open gate',
    await page.evaluate(() => game.entities.find(entity => entity.id === 'youngcle3_gate').solid === false
      && Math.round(game.entities.find(entity => entity.id === 'youngcle3_crate').x) === 290));
  await page.waitForTimeout(700);
  await walkTo(448, 248);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => game.mapId === 'youngcle4' && !game.transitioning, { timeout: 10000 });
  await page.keyboard.up('ArrowRight');
  check('re-entered circuit room restores aligned plates and open gate',
    await page.evaluate(() => game.entities.find(entity => entity.id === 'youngcle4_gate').solid === false
      && game.entities.filter(entity => entity.def.type === 'factory_circuit')
        .every(entity => entity.orientation === entity.solution)));

  await captureBreakpoints('youngcle2', 'left');
  await captureBreakpoints('youngcle3', 'left');
  await captureBreakpoints('youngcle4', 'landing');
  check('no runtime errors or missing factory resources',
    errors.length === 0 && factoryResourceErrors.length === 0, { errors, factoryResourceErrors });
} catch (error) {
  errors.push(error.stack || error.message);
  console.error(error);
} finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ checks, errors, factoryResourceErrors, captures }, null, 2));
  await browser.close();
}

const fails = checks.filter(result => !result.ok).length + errors.length;
console.log(`fails=${fails}`);
process.exitCode = fails ? 1 : 0;
