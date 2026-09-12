import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.BASE_URL || 'http://localhost:8772';
const out = process.env.SHOT_DIR || '/tmp/shop114-integration';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
const snap = name => page.screenshot({ path: path.join(out, `${name}.png`) });
const key = async code => { await page.keyboard.press(code); await page.waitForTimeout(180); };
const check = (name, value) => { assert.ok(value, name); checks.push(name); console.log(`PASS ${name}`); };
async function walk(x, y) {
  for (const [axis, target, forward, back] of [['x', x, 'ArrowRight', 'ArrowLeft'], ['y', y, 'ArrowDown', 'ArrowUp']]) {
    const current = await page.evaluate(axis => game.player[axis], axis);
    if (Math.abs(current - target) < 5) continue;
    await page.keyboard.down(current < target ? forward : back);
    try { await page.waitForFunction(({ axis, target, dir }) => dir ? game.player[axis] >= target : game.player[axis] <= target,
      { axis, target, dir: current < target }, { timeout: 12000 }); }
    finally { await page.keyboard.up(current < target ? forward : back); }
  }
}
async function buy() {
  await key('KeyC');
  assert.equal(await page.evaluate(() => game.shop.mode), 'confirm');
  assert.equal(await page.evaluate(() => game.shop.choice), 1);
  await key('ArrowLeft'); await key('KeyC');
  assert.equal(await page.evaluate(() => game.shop.message.ok), true);
  await key('KeyC');
}
try {
  await page.goto(`${base}/?qa=maillard_lounge`);
  await page.waitForFunction(() => game.state === 'field' && game.player && !game.transitioning);
  await key('KeyX');
  await page.evaluate(() => { game.money = 2800; });
  await walk(1084, 364); await key('ArrowUp');
  await snap('01-shop-front');
  await key('KeyC');
  await page.waitForFunction(() => game.state === 'shop' && game.shop.art);
  await snap('02-shop-entry');
  check('real storefront C opens shop without buying', await page.evaluate(() => game.money === 2800 && game.shop.mode === 'browse'));
  await key('KeyC'); await key('KeyC');
  check('default No cancels without spending', await page.evaluate(() => game.money === 2800 && game.shop.mode === 'browse'));
  await buy(); await key('ArrowDown'); await buy(); await key('ArrowDown'); await buy(); await key('ArrowDown'); await buy();
  await snap('03-purchased-stock');
  check('all four products debit exact prices and apply team upgrades once', await page.evaluate(() => game.money === 150 && game.attack === 3 && game.hpBonus === 40 && game.inventory.includes('위장약') && game.inventory.includes('에그타르트')));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('subtarune.save.v1')));
  check('purchase autosaves while shop remains open', saved.money === 150 && saved.attack === 3 && saved.hpBonus === 40 && saved.flags.shop_yongjun_cialis && saved.flags.shop_yongjun_vaseline);
  await key('KeyC');
  check('sold-out cannot charge twice', await page.evaluate(() => game.shop.message.reason === 'sold_out' && game.money === 150));
  await snap('04-sold-out'); await key('KeyX'); await key('KeyX');
  await page.evaluate(() => game.continueGame());
  await page.waitForFunction(() => !game.transitioning && game.fade.alpha === 0);
  check('continue restores totals without reapplying upgrades', await page.evaluate(() => game.attack === 3 && game.hpBonus === 40 && game.money === 150));
  const medicineIndex = await page.evaluate(async () => { const { plainItems } = await import('./src/data/items.js'); return plainItems(game.inventory).indexOf('위장약'); });
  await key('Tab'); await key('KeyC');
  for (let i = 0; i < medicineIndex; i++) await key('ArrowDown');
  await key('KeyC'); await key('KeyC');
  check('using a purchased item in Tab menu saves consumption immediately', await page.evaluate(() => !game.inventory.includes('위장약') && !JSON.parse(localStorage.getItem('subtarune.save.v1')).inventory.includes('위장약')));
  await key('KeyX'); await key('KeyX');
  check('menu cannot overwrite a safe save while riding', await page.evaluate(() => {
    const before = localStorage.getItem('subtarune.save.v1');
    game.state = 'menu'; game.ride = {}; game.money++;
    game.autosave();
    const unchanged = before === localStorage.getItem('subtarune.save.v1');
    game.money--; game.ride = null; game.state = 'field';
    return unchanged;
  }));
  await walk(1348, 270); await key('ArrowUp');
  for (let pass = 0; pass < 2; pass++) {
    await page.evaluate(() => { game.partyHp = { hyungsub: 1, gyeongsub: 2, ppaman: 0 }; });
    await key('KeyC');
    check(`spring interaction ${pass + 1} immediately restores all members`, await page.evaluate(() => ['hyungsub', ...game.party].every(id => game.hpOf(id) === game.maxHpOf(id))));
    await key('KeyC'); await snap(`05-spring-${pass + 1}`);
    for (let i = 0; i < 4 && await page.evaluate(() => game.dialogue.running); i++) await key('KeyC');
  }
  await page.evaluate(() => { const save = JSON.parse(localStorage.getItem('subtarune.save.v1')); save.x = 1400; save.y = 780; localStorage.setItem('subtarune.save.v1', JSON.stringify(save)); game.continueGame(); });
  await page.waitForFunction(() => game.fade.alpha === 0);
  check('old tall-room save resumes on traversable floor', await page.evaluate(() => game.player.y < 576 && !game.map.solidRect(game.player.x, game.player.y, game.player.w, game.player.h)));
  await snap('06-old-save-recovered');
  await page.evaluate(async () => { const { QA_POINTS } = await import('./src/core/story.js'); game.devJump(QA_POINTS.find(q => q.id === 'maillard_lounge')); });
  check('QA lounge starts clean without free shop upgrades', await page.evaluate(() => game.attack === 2 && game.hpBonus === 20 && !game.flags.shop_yongjun_cialis && !game.flags.shop_yongjun_vaseline && game.party.length === 2));
  check('no runtime errors', errors.length === 0);
} catch (error) { errors.push(error.stack); console.error(error); }
finally { await browser.close(); fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ checks, errors }, null, 2)); }
console.log(`fails=${errors.length}`);
process.exitCode = errors.length ? 1 : 0;
