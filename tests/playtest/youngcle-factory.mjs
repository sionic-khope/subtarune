import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/youngcle-factory144';
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
  if (response.status() >= 400 && /youngcle_factory|youngcle[2345]\.json|factory-puzzle-art/.test(response.url())) {
    factoryResourceErrors.push(`${response.status()} ${response.url()}`);
  }
});

async function walkTo(x, y) {
  for (const [axis, target, positive, negative] of [['x', x, 'ArrowRight', 'ArrowLeft'], ['y', y, 'ArrowDown', 'ArrowUp']]) {
    const current = await page.evaluate(key => game.player[key], axis);
    if (Math.abs(current - target) < 5) continue;
    const key = current < target ? positive : negative;
    await page.keyboard.down(key);
    try {
      await page.waitForFunction(({ axis: keyAxis, target: goal, increasing }) =>
        increasing ? game.player[keyAxis] >= goal - 3 : game.player[keyAxis] <= goal + 3,
      { axis, target, increasing: current < target }, { timeout: 8000 });
    } finally {
      await page.keyboard.up(key);
    }
  }
  await page.waitForTimeout(100);
}

async function pushOnce(crateId, direction, holdConfirm = false) {
  const directionKey = { right: 'ArrowRight', left: 'ArrowLeft', up: 'ArrowUp', down: 'ArrowDown' }[direction];
  const before = await page.evaluate(id => {
    const crate = game.entities.find(entity => entity.id === id);
    return [crate.x, crate.y];
  }, crateId);
  await page.keyboard.down(directionKey);
  try {
    await page.waitForFunction(({ id, move }) => game.player.facing === move && game.player.probe()?.id === id,
      { id: crateId, move: direction }, { timeout: 2000 });
  } finally {
    await page.keyboard.up(directionKey);
  }
  const afterArrow = await page.evaluate(id => {
    const crate = game.entities.find(entity => entity.id === id);
    return [Math.round(crate.x), Math.round(crate.y), !!crate.slide];
  }, crateId);
  check(`${crateId} ${direction} arrow only faces or walks`,
    afterArrow[0] === Math.round(before[0]) && afterArrow[1] === Math.round(before[1]) && !afterArrow[2], { before, afterArrow });
  await page.keyboard.down('KeyC');
  try {
    await page.waitForFunction(({ id, start }) => {
      const crate = game.entities.find(entity => entity.id === id);
      return crate.slide || crate.x !== start[0] || crate.y !== start[1];
    }, { id: crateId, start: before }, { timeout: 3000 });
    await page.waitForFunction(id => !game.entities.find(entity => entity.id === id).slide, crateId);
    if (holdConfirm) {
      await page.evaluate(({ id, move }) => {
        const crate = game.entities.find(entity => entity.id === id);
        const positions = {
          left: [crate.x + crate.w, crate.y + 6],
          right: [crate.x - game.player.w, crate.y + 6],
          up: [crate.x + 2, crate.y + crate.h],
          down: [crate.x + 2, crate.y - game.player.h],
        };
        [game.player.x, game.player.y] = positions[move];
        game.player.facing = move;
      }, { id: crateId, move: direction });
      await page.waitForTimeout(500);
    }
  } finally {
    await page.keyboard.up('KeyC');
  }
  await page.waitForTimeout(120);
  const after = await page.evaluate(id => {
    const crate = game.entities.find(entity => entity.id === id);
    return [Math.round(crate.x), Math.round(crate.y)];
  }, crateId);
  check(`${crateId} C ${direction} moves exactly one tile`, Math.abs(after[0] - before[0]) + Math.abs(after[1] - before[1]) === 32, { before, after, holdConfirm });
}

async function settleDialogueLine() {
  await page.waitForFunction(() => game.dialogue.running && game.textbox.node?.text);
  await page.keyboard.press('KeyX');
  await page.waitForFunction(() => game.textbox.state === 'waiting');
  const text = await page.evaluate(() => game.textbox.node.text);
  await page.keyboard.press('KeyC');
  await page.waitForTimeout(120);
  return text;
}

async function probeClosedGate(mapId, spawn) {
  await page.evaluate(({ map, at }) => game.changeMap(map, at, true, { enter: false }), { map: mapId, at: spawn });
  await page.waitForFunction(id => game.mapId === id && !game.transitioning, mapId);
  const results = [];
  for (const y of [176, 272, 352]) {
    await page.evaluate(targetY => { game.player.x = 416; game.player.y = targetY; }, y);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(350);
    await page.keyboard.up('ArrowRight');
    results.push(await page.evaluate(() => Math.round(game.player.x)));
  }
  return results;
}

try {
  await page.goto(`${process.env.BASE_URL || 'http://localhost:8793'}/?qa=youngcle3`);
  await page.waitForFunction(() => game?.player && game.mapId === 'youngcle3' && !game.transitioning);
  await page.evaluate(() => { window.__factoryBgm = game.sound.bgm; });
  const intro = [await settleDialogueLine(), await settleDialogueLine(), await settleDialogueLine()];
  await page.waitForFunction(() => !game.dialogue.running);
  check('first entry explains the marked target and one-cell C push',
    intro.some(text => text.includes('표시된 데')) && intro.some(text => text.includes('C를 누르면 한 칸씩')), intro);
  check('tutorial intro records a one-time flag', await page.evaluate(() => game.flags.youngcle3_crate_intro_seen === true));
  await shot('01-tutorial-intro-complete');

  const closed3 = await probeClosedGate('youngcle3', 'left');
  check('tutorial gate blocks top middle and bottom lanes while unsolved', closed3.every(x => x < 430), closed3);
  await page.evaluate(() => game.changeMap('youngcle3', 'left', true, { enter: false }));
  await page.waitForFunction(() => game.mapId === 'youngcle3' && !game.transitioning);
  await walkTo(160, 296);
  await pushOnce('youngcle3_crate', 'right', true);
  await pushOnce('youngcle3_crate', 'right');
  await walkTo(220, 344);
  await walkTo(260, 344);
  await pushOnce('youngcle3_crate', 'up');
  check('tutorial R R U solve opens its gate', await page.evaluate(() => game.flags.youngcle3_crate_solved && !game.entities.find(entity => entity.id === 'youngcle3_gate').solid));
  await shot('02-tutorial-solved');

  await walkTo(220, 360);
  await walkTo(400, 360);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => game.mapId === 'youngcle4' && !game.transitioning, { timeout: 8000 });
  await page.keyboard.up('ArrowRight');
  check('open tutorial gate and threshold allow direction-only travel into medium room', await page.evaluate(() => game.mapId === 'youngcle4'));
  check('factory BGM keeps the same audio element through the first threshold', await page.evaluate(() => game.sound.bgm === window.__factoryBgm));

  const closed4 = await probeClosedGate('youngcle4', 'left');
  check('medium gate blocks top middle and bottom lanes while unsolved', closed4.every(x => x < 430), closed4);
  await page.evaluate(() => game.changeMap('youngcle4', 'left', true, { enter: false }));
  await page.waitForFunction(() => game.mapId === 'youngcle4' && !game.transitioning);
  await walkTo(160, 296);
  await pushOnce('youngcle4_crate', 'right');
  await pushOnce('youngcle4_crate', 'right');
  await walkTo(220, 360);
  await walkTo(260, 360);
  await pushOnce('youngcle4_crate', 'up');
  await pushOnce('youngcle4_crate', 'up');
  await walkTo(200, 232);
  await pushOnce('youngcle4_crate', 'right');
  await pushOnce('youngcle4_crate', 'right');
  check('medium R R U U R R solve opens its gate', await page.evaluate(() => game.flags.youngcle4_circuit_solved && !game.entities.find(entity => entity.id === 'youngcle4_gate').solid));
  await shot('03-medium-solved');

  await walkTo(200, 360);
  await walkTo(400, 360);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => game.mapId === 'youngcle5' && !game.transitioning, { timeout: 8000 });
  await page.keyboard.up('ArrowRight');
  check('open medium gate and threshold allow direction-only travel into hard room', await page.evaluate(() => game.mapId === 'youngcle5'));
  check('factory BGM keeps the same audio element through the second threshold', await page.evaluate(() => game.sound.bgm === window.__factoryBgm));

  const closed5 = await probeClosedGate('youngcle5', 'left');
  check('hard gate blocks top middle and bottom lanes while unsolved', closed5.every(x => x < 430), closed5);
  await page.evaluate(() => game.changeMap('youngcle5', 'left', true, { enter: false }));
  await page.waitForFunction(() => game.mapId === 'youngcle5' && !game.transitioning);
  await walkTo(64, 264);
  await walkTo(120, 264);
  await pushOnce('youngcle5_crate_a', 'right');
  await walkTo(150, 220);
  await walkTo(196, 220);
  await pushOnce('youngcle5_crate_a', 'down');
  await walkTo(196, 264);
  await walkTo(198, 264);
  await pushOnce('youngcle5_crate_b', 'right');
  for (let count = 0; count < 4; count += 1) await pushOnce('youngcle5_crate_b', 'right');
  check('one hard-room target does not open the gate', await page.evaluate(() => !game.flags.youngcle5_crate_solved));
  await walkTo(196, 260);
  await pushOnce('youngcle5_crate_a', 'down');
  await walkTo(150, 328);
  await pushOnce('youngcle5_crate_a', 'right');
  for (let count = 0; count < 5; count += 1) await pushOnce('youngcle5_crate_a', 'right');
  await walkTo(340, 298);
  await walkTo(388, 298);
  await pushOnce('youngcle5_crate_b', 'up');
  await pushOnce('youngcle5_crate_b', 'up');
  const completion = [await settleDialogueLine(), await settleDialogueLine(), await settleDialogueLine(),
    await settleDialogueLine(), await settleDialogueLine()];
  await page.waitForFunction(() => !game.dialogue.running);
  check('hard first solve plays the exact five-line completion dialogue once', JSON.stringify(completion) === JSON.stringify([
    '* ...',
    '* 빠맨아 왜?',
    '* 제작자가 김형섭 맞춤 퍼즐난이도 조정 ㅈㄴ 잘한거같아서 감탄중이에요',
    '* 개추 ㅋㅋㅋ',
    '* ㅅㅂ년들이',
  ]), completion);
  check('hard 16-push ordered solution opens only after both targets', await page.evaluate(() => game.flags.youngcle5_crate_solved && !game.entities.find(entity => entity.id === 'youngcle5_gate').solid));
  await shot('04-hard-solved');

  await page.evaluate(() => game.changeMap('youngcle5', 'left', true, { enter: false }));
  await page.waitForFunction(() => game.mapId === 'youngcle5' && !game.transitioning);
  check('hard solved return restores two occupied targets and open gate', await page.evaluate(() => {
    const crates = game.entities.filter(entity => entity.def.type === 'factory_crate');
    const plates = game.entities.filter(entity => entity.def.type === 'factory_plate');
    return plates.every(plate => crates.some(crate => plate.contains(crate))) && !game.entities.find(entity => entity.id === 'youngcle5_gate').solid;
  }));
  check('hard solved return does not replay completion dialogue', await page.evaluate(() => !game.dialogue.running));
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
