import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.BASE_URL || 'http://localhost:8774';
const out = process.env.SHOT_DIR || '/tmp/shop116-greeting';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const checks = [], errors = [], resources = [], requestFailures = [], captures = [];
const optional = new Set([
  ...['default', 'hero', 'low', 'cat', 'robot'].flatMap(name => ['mp3', 'ogg'].map(ext => `/assets/audio/voices/${name}.${ext}`)),
  ...['open', 'close', 'chime'].flatMap(name => ['mp3', 'ogg'].map(ext => `/assets/audio/sfx/${name}.${ext}`)),
  ...['void', 'backdrop_void', 'grass_flower', 'grass', 'path', 'water', 'floor', 'rug', 'tree', 'door', 'wall', 'sign', 'chest', 'bed', 'desk', 'window', 'ground_purple_solid'].map(name => `/assets/tiles/${name}.png`),
  ...['merchant', 'cat', 'guard', 'ghost', 'hero'].map(name => `/assets/sprites/${name}.png`),
  ...['chakgeom', 'parang', 'norang', 'wemix', 'baron_intro', 'baron_chase', 'voidgrub', 'yongjun', 'cs_red', 'wolf', 'cs_blue', 'razorbeak', 'krug', 'toad', 'scuttle', 'cannon', 'red', 'blue', 'baron', 'cat', 'merchant', 'guard', 'ghost', 'hero'].map(name => `/assets/portraits/${name}.png`),
]);
const unexpectedResources = () => resources.filter(entry => !entry.startsWith('404 ') || !optional.has(new URL(entry.slice(4)).pathname));
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) resources.push(`${response.status()} ${response.url()}`); });
page.on('requestfailed', request => requestFailures.push({ url: request.url(), error: request.failure()?.errorText }));
await page.addInitScript(() => {
  window.shopAudio = [];
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    if (this.src.endsWith('/plug.mp3')) window.shopAudio.push(this);
    return play.apply(this, args);
  };
});
const check = (name, value, detail) => { checks.push({ name, ok: !!value, detail }); assert.ok(value, name); console.log(`PASS ${name}`); };
const key = async code => { await page.keyboard.press(code, { delay: 30 }); await page.waitForTimeout(150); };
const settled = () => page.waitForFunction(() => !game.transitioning && game.fade.alpha === 0);
const state = () => page.evaluate(() => ({ money: game.money, inventory: [...game.inventory], attack: game.attack, hpBonus: game.hpBonus, partyHp: { ...game.partyHp } }));
const shot = async name => {
  const file = path.join(out, `${name}.png`);
  await page.screenshot({ path: file });
  const png = fs.readFileSync(file), viewport = page.viewportSize();
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), viewport.width);
  assert.equal(png.readUInt32BE(20), viewport.height);
  captures.push({ file, viewport: page.viewportSize(), state: await page.evaluate(() => ({ mode: game.shop.mode, fade: game.fade.alpha, text: game.shop.greeting?.active?.node?.text })) });
};
async function walk(x, y) {
  for (const [axis, target, forward, back] of [['x', x, 'ArrowRight', 'ArrowLeft'], ['y', y, 'ArrowDown', 'ArrowUp']]) {
    const current = await page.evaluate(axis => game.player[axis], axis);
    if (Math.abs(current - target) < 5) continue;
    const code = current < target ? forward : back;
    await page.keyboard.down(code);
    try { await page.waitForFunction(({ axis, target, positive }) => positive ? game.player[axis] >= target : game.player[axis] <= target,
      { axis, target, positive: current < target }, { timeout: 12000 }); }
    finally { await page.keyboard.up(code); }
  }
}
async function front() { await walk(1084, 364); await key('ArrowUp'); }
async function open() { await key('KeyC'); await settled(); await page.waitForFunction(() => game.state === 'shop' && !game.shop.waitForRelease && game.shop.lock === 0); }
async function transaction() { await key('KeyC'); assert.equal(await page.evaluate(() => game.shop.mode), 'confirm'); await key('ArrowLeft'); await key('KeyC'); }
async function home() {
  for (let i = 0; i < 3 && await page.evaluate(() => game.shop.mode !== 'home'); i++) await key('KeyX');
  assert.equal(await page.evaluate(() => game.shop.mode), 'home');
}
async function sellFixture(inventory) {
  await home();
  await page.evaluate(inventory => { game.inventory = inventory; game.shop.index = 1; }, inventory);
  await key('KeyC');
  assert.equal(await page.evaluate(() => game.shop.mode), 'sell');
}
try {
  await page.goto(`${base}/?qa=maillard_lounge`);
  await page.waitForFunction(() => game.state === 'field' && game.player && !game.transitioning);
  await key('KeyX');
  await front();
  await page.evaluate(() => game.autosave());
  const initial = await state();
  await shot('01-entry-rest');
  await page.keyboard.press('KeyC', { delay: 25 });
  await page.waitForFunction(() => game.transitioning && game.state !== 'shop' && game.fade.alpha > 0 && game.fade.alpha < 1);
  const outFade = await page.evaluate(() => ({ alpha: game.fade.alpha, color: game.fade.color }));
  await shot('02-entry-fadeout');
  await page.waitForFunction(() => game.state === 'shop' && game.fade.alpha > 0 && game.fade.alpha < 1);
  const inFade = await page.evaluate(() => ({ alpha: game.fade.alpha, color: game.fade.color }));
  await shot('03-entry-fadein');
  await settled();
  await page.waitForTimeout(200);
  await shot('04-entry-settled');
  check('keyboard entry fades field out and shop in through black', outFade.color === '0,0,0' && inFade.color === '0,0,0', { outFade, inFade });
  const audio = await page.evaluate(() => ({ registered: game.sound.files.plug?.src, plays: window.shopAudio.map(a => ({ src: a.src, time: a.currentTime, duration: a.duration, error: a.error?.message })) }));
  check('entry plays loaded plug audio with advancing media clock', audio.registered?.endsWith('/plug.mp3') && audio.plays.length === 1 && audio.plays[0].time > 0 && !audio.plays[0].error, audio);
  check('first entry starts greeting without spending', await page.evaluate(() => game.shop.mode === 'greeting' && !game.flags.shop_yongjun_greeted) && JSON.stringify(initial) === JSON.stringify(await state()));
  await key('KeyX'); await key('KeyX');
  check('X reveals text but cannot skip the greeting', await page.evaluate(() => game.shop.mode === 'greeting' && game.shop.greeting.active.node.text === '* 오 안녕하세요 형' && game.shop.greeting.active.state === 'waiting'));
  await key('KeyC');
  await page.evaluate(() => game.autosave());
  check('mid-greeting save never marks completion', await page.evaluate(() => !JSON.parse(localStorage.getItem('subtarune.save.v1')).flags.shop_yongjun_greeted));
  // QA query intentionally autosaves a fresh fixture at boot; a real reload uses the normal URL.
  await page.evaluate(() => history.replaceState(null, '', '/'));
  await page.reload();
  await page.waitForFunction(() => game.state === 'title');
  await key('KeyX');
  await page.evaluate(() => game.continueGame());
  await settled(); await open();
  check('reload and continue restart unfinished greeting from line one', await page.evaluate(() => game.shop.mode === 'greeting' && game.shop.greeting.active.node.text === '* 오 안녕하세요 형' && !game.flags.shop_yongjun_greeted));
  const lines = ['* 오 안녕하세요 형', '* 너 뭐해 여기서', '* 알바하면 자꾸 잘려서 제가 편의점을 차렸어요', '* 걍 다내놔 시발새끼야', '* 어허 안됩니다', '* 필요한거 있으시면{n}말씀주세요 ㅎㅎ'];
  for (let i = 0; i < lines.length; i++) {
    const voice = [1, 3].includes(i) ? 'ppaman' : 'yongjun';
    await page.waitForFunction(voice => game.sound._lastVoice?.startsWith(`${voice}@`) && game.shop.greeting.active.revealed > 1, voice);
    const detail = await page.evaluate(() => {
      const box = game.shop.greeting.active;
      return { text: box.node.text, voice: box.voice, lastVoice: game.sound._lastVoice, fileDecoded: !!game.sound.voiceBuf[box.voice], nativeSample: game.sound._lastBlip?.voice, global: box === game.textbox, portrait: !!box.portrait, rect: box.layoutRect(), lines: box.pages.flat().map(line => line.map(t => t.ch).join('')), widths: box.pages.flat().map(line => line.reduce((n, t) => n + (t.w || 0), 0)), maxWidth: box.textWidth() };
    });
    check(`line ${i + 1} exact text, live ${voice} voice and correct textbox`, detail.text === lines[i] && detail.voice === voice && detail.fileDecoded && detail.nativeSample === voice && detail.global === (voice === 'ppaman') && detail.portrait === (voice === 'ppaman') && detail.widths.every(w => w <= detail.maxWidth), detail);
    await key('KeyX');
    await shot(`line-${i + 1}-${voice}-1280`);
    if ([1, 2].includes(i)) {
      for (const width of [375, 768]) { await page.setViewportSize({ width, height: 900 }); await shot(`line-${i + 1}-${voice}-${width}`); }
      await page.setViewportSize({ width: 1280, height: 900 });
    }
    await key('KeyC');
  }
  check('final C ends at home without purchase and saves completed flag', await page.evaluate(() => game.shop.mode === 'home' && game.flags.shop_yongjun_greeted && JSON.parse(localStorage.getItem('subtarune.save.v1')).flags.shop_yongjun_greeted) && JSON.stringify(initial) === JSON.stringify(await state()));
  await shot('home-1280');
  await key('KeyX'); await open();
  check('reentry does not repeat completed greeting', await page.evaluate(() => game.shop.mode === 'home'));
  await key('KeyX'); await page.evaluate(() => game.continueGame()); await settled(); await open();
  check('continue retains completion and skips greeting', await page.evaluate(() => game.shop.mode === 'home'));
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 900 }); await shot(`home-${width}`);
    await key('KeyC'); await shot(`buy-${width}`); await key('KeyX');
    await key('ArrowDown'); await key('KeyC'); await shot(`sell-${width}`); await key('KeyX'); await key('ArrowUp');
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await sellFixture(['에그타르트', '에그타르트', '위장약', '바나나', '먼지', '낡은 열쇠', '미등록 물건']);
  const before = await state();
  await key('KeyC'); await shot('sell-confirm-no'); await key('KeyC');
  check('sale confirmation defaults No and leaves all data unchanged', JSON.stringify(before) === JSON.stringify(await state()));
  await key('KeyC'); await key('ArrowLeft'); await key('KeyX');
  check('X cancels sale even after selecting Yes', JSON.stringify(before) === JSON.stringify(await state()));
  await transaction(); await shot('sell-one-duplicate'); await key('KeyC');
  check('selling duplicate removes exactly one slot and credits 25', await page.evaluate(money => game.money === money + 25 && game.inventory.filter(n => n === '에그타르트').length === 1 && game.inventory.length === 6, before.money));
  await key('ArrowDown'); await transaction(); await key('KeyC');
  check('medicine sale credits half its 100 purchase price', await page.evaluate(money => game.money === money + 75 && !game.inventory.includes('위장약'), before.money));
  await transaction(); await key('KeyC');
  check('banana sale credits user-set 10', await page.evaluate(money => game.money === money + 85 && !game.inventory.includes('바나나'), before.money));
  await transaction(); await key('KeyC');
  check('dust sale credits user-set 1', await page.evaluate(money => game.money === money + 86 && !game.inventory.includes('먼지'), before.money));
  const protectedBefore = await state();
  await key('KeyC'); await shot('sell-key-protected');
  check('key item shows protected feedback without mutation', await page.evaluate(() => game.shop.mode === 'message' && game.shop.message.reason === 'key_item') && JSON.stringify(protectedBefore) === JSON.stringify(await state()));
  await key('KeyX'); await key('ArrowDown'); await key('KeyC'); await shot('sell-unknown-protected');
  check('unknown item shows protected feedback without mutation', await page.evaluate(() => game.shop.mode === 'message' && game.shop.message.reason === 'unknown') && JSON.stringify(protectedBefore) === JSON.stringify(await state()));
  const after = await state();
  check('sales never alter permanent buffs or party HP', before.attack === after.attack && before.hpBonus === after.hpBonus && JSON.stringify(before.partyHp) === JSON.stringify(after.partyHp));
  await home(); await key('KeyX'); await page.evaluate(() => game.continueGame()); await settled();
  check('sale money inventory and buffs survive continue', JSON.stringify(after) === JSON.stringify(await state()));
  await open(); await sellFixture(['먼지']);
  const money = (await state()).money;
  await transaction(); await key('KeyC'); await shot('sell-last-item-empty');
  check('last item sale becomes empty inventory with Back only', await page.evaluate(money => game.inventory.length === 0 && game.money === money + 1 && game.shop.index === 0 && game.shop.mode === 'sell', money));
  await key('KeyC');
  check('empty sale list returns safely to home', await page.evaluate(() => game.shop.mode === 'home'));
  await key('ArrowDown'); await key('KeyC');
  check('home exit returns safely to field', await page.evaluate(() => game.state === 'field'));
  check('no runtime errors, failed requests or unexpected HTTP errors', !errors.length && !requestFailures.length && !unexpectedResources().length, { errors, requestFailures, unexpectedResources: unexpectedResources() });
} catch (error) { errors.push(error.stack); console.error(error); }
finally {
  await browser.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ checks, errors, resources: [...new Set(resources)], unexpectedResources: unexpectedResources(), requestFailures, captures }, null, 2));
}
console.log(`fails=${errors.length}`);
process.exitCode = errors.length ? 1 : 0;
