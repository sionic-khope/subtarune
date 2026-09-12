import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/rooms115';
const base = process.env.BASE_URL || 'http://localhost:8773';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const checks = [], errors = [], captures = [], resourceErrors = [];
const check = (name, ok, detail) => { checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) resourceErrors.push(`${response.status()} ${response.url()}`); });
const shot = async name => {
  await page.screenshot({ path: path.join(shots, `${name}.png`) });
  captures.push({ name, viewport: page.viewportSize(), state: await page.evaluate(() => ({ map: game.mapId, player: [game.player?.x, game.player?.y], camera: [game.camera?.x, game.camera?.y], fade: game.fade.alpha, textbox: game.textbox?.state })) });
};
const ready = async map => page.waitForFunction(map => game?.mapId === map && game.state === 'field' && !game.transitioning && !game.dialogue.running && game.fade.alpha === 0, map);
async function walkTo(x, y) {
  for (const [axis, target, positive, negative] of [['x', x, 'ArrowRight', 'ArrowLeft'], ['y', y, 'ArrowDown', 'ArrowUp']]) {
    const current = await page.evaluate(axis => game.player[axis], axis);
    if (Math.abs(current - target) < 7) continue;
    const key = current < target ? positive : negative;
    await page.keyboard.down(key);
    try {
      await page.waitForFunction(({ axis, target, increasing }) => increasing ? game.player[axis] >= target : game.player[axis] <= target,
        { axis, target, increasing: current < target }, { timeout: 15000 });
    } finally { await page.keyboard.up(key); }
  }
  await page.waitForTimeout(180);
}
async function wallApproach(x) {
  await walkTo(x, 208);
  await page.keyboard.press('ArrowUp', { delay: 700 });
  await page.waitForTimeout(200);
}
const stats = () => page.evaluate(() => ({ party: [...game.party], inventory: [...game.inventory], money: game.money, attack: game.attack, hpBonus: game.hpBonus, hp: ['hyungsub', ...game.party].map(id => game.hpOf(id)) }));
async function safeParty(name) {
  const detail = await page.evaluate(async () => {
    const { CHAR_SCALE } = await import('/src/world/world.js');
    return game.entities.filter(e => e === game.player || e.def.type === 'follower').map(e => {
      const w = Math.round(e.sprite.fw / e.sprite.px * CHAR_SCALE), h = Math.round(e.sprite.fh / e.sprite.px * CHAR_SCALE);
      const x = e.x + e.w / 2 - w / 2, y = e.y + e.h - h;
      return { id: e.id, x: e.x, y: e.y, safe: !game.map.solidRect(e.x, e.y, e.w, e.h), visible: !e.hidden && x >= game.camera.x && y >= game.camera.y && x + w <= game.camera.x + 480 && y + h <= game.camera.y + 360 };
    });
  });
  const distinct = detail.every((e, i) => detail.slice(i + 1).every(other => Math.hypot(e.x - other.x, e.y - other.y) >= 32));
  check(name, detail.length === 3 && detail.every(e => e.safe && e.visible) && distinct, detail);
}
async function follow(name, x, y) {
  const before = await page.evaluate(() => game.entities.filter(e => e.def.type === 'follower').map(e => ({ id: e.id, x: e.x, y: e.y })));
  await walkTo(x, y);
  await page.waitForFunction(before => before.every(b => { const e = game.entities.find(e => e.id === b.id); return Math.hypot(e.x - b.x, e.y - b.y) > 24 && Math.hypot(e.x - game.player.x, e.y - game.player.y) <= 115; }), before, { timeout: 3000 });
  check(name, await page.evaluate(before => before.every(b => { const e = game.entities.find(e => e.id === b.id); return Math.hypot(e.x - b.x, e.y - b.y) > 24 && Math.hypot(e.x - game.player.x, e.y - game.player.y) <= 115; }), before));
}
async function choice() {
  await page.keyboard.press('KeyC', { delay: 40 });
  await page.waitForFunction(() => game.dialogue.running);
  await page.keyboard.press('KeyX', { delay: 40 });
  await page.waitForFunction(() => game.textbox.state === 'choice' && game.textbox.choiceLock <= 0);
}
async function audio(name) {
  await page.waitForFunction(name => game.sound.bgmName === name && game.sound.bgm && !game.sound.bgm.paused && game.sound.bgm.currentTime > 0.3, name);
  check(`${name} real BGM plays after keyboard gesture`, await page.evaluate(name => game.sound.bgm.src.endsWith(`/${name}.mp3`) && game.sound.bgm.loop && game.sound.bgm.volume > 0, name));
}
async function title() {
  await page.goto(base);
  await page.waitForFunction(() => game?.state === 'title' && game.title?.phase === 'wait');
  await page.keyboard.press('KeyX');
  await page.waitForFunction(() => game.title.phase === 'zoom');
  await page.keyboard.press('KeyC');
  await page.waitForFunction(() => game.title.phase === 'locked');
  await page.waitForTimeout(3300);
}
async function qJump(id) {
  await title();
  await page.keyboard.press('KeyQ');
  await page.waitForFunction(() => !!game.title.qa);
  const upCount = await page.evaluate(async id => { const { QA_POINTS } = await import('/src/core/story.js'); return QA_POINTS.length - QA_POINTS.findIndex(p => p.id === id); }, id);
  for (let i = 0; i < upCount; i++) await page.keyboard.press('ArrowUp', { delay: 50 });
  await shot(`q-menu-${id}`);
  await page.keyboard.press('KeyC');
  await ready(id);
}

try {
  await page.goto(`${base}/?qa=maillard_lounge`);
  await ready('maillard_lounge');
  await page.keyboard.press('KeyX');
  const initialStats = await stats();
  await walkTo(180, 208);
  await shot('01-door-pair');
  await wallApproach(180);
  check('walking fully to iron door does not enter or start dialogue', await page.evaluate(() => game.mapId === 'maillard_lounge' && !game.dialogue.running));
  await choice();
  check('iron door shows exact prompt and yes/no', await page.evaluate(() => game.textbox.node.text === '* 강퇴폐기창고입니다.{n}* 들어가시겠습니까?' && game.textbox.choice.options.map(o => o.label).join() === '예,아니오'));
  await shot('02-iron-choice');
  await page.setViewportSize({ width: 375, height: 812 });
  await shot('03-small-choice');
  await page.setViewportSize({ width: 1000, height: 780 });
  await page.keyboard.press('ArrowRight', { delay: 50 });
  await page.keyboard.press('KeyC', { delay: 50 });
  await ready('maillard_lounge');
  check('No stays outside', await page.evaluate(() => game.mapId === 'maillard_lounge'));
  await choice();
  await page.keyboard.press('KeyX', { delay: 50 });
  await ready('maillard_lounge');
  check('X cancels and stays outside', await page.evaluate(() => game.mapId === 'maillard_lounge'));
  await choice();
  await page.keyboard.press('KeyC', { delay: 20 });
  await page.waitForFunction(() => game.fade.alpha > 0.1);
  check('Yes starts black fade', await page.evaluate(() => game.fade.color === '0,0,0'));
  await shot('04-iron-fade');
  await ready('maillard_storage');
  await audio('wind');
  check('storage is empty steel room 480x448 with one exit and no automatic events', await page.evaluate(() => game.map.pxW === 480 && game.map.pxH === 448 && !game.map.def.enter && !game.entities.some(e => ['npc', 'trigger'].includes(e.def.type)) && game.map.def.entities.filter(e => e.type === 'door').length === 1));
  await safeParty('all party members arrive safely and visibly in storage');
  await shot('05-storage-entry');
  await follow('storage party continues following', 360, 304);
  for (const [x, y, name] of [[380, 168, 'upper-right'], [380, 348, 'lower-right'], [70, 348, 'lower-left'], [70, 168, 'upper-left']]) {
    await walkTo(x, y);
    await shot(`06-storage-${name}`);
  }
  await wallApproach(228);
  check('walking to storage exit requires C', await page.evaluate(() => game.mapId === 'maillard_storage'));
  await page.keyboard.press('KeyC', { delay: 50 });
  await ready('maillard_lounge');
  check('storage return uses safe down-facing lounge spawn', await page.evaluate(() => Math.abs(game.player.x - 180) < 2 && game.player.y === 304 && game.player.facing === 'down'));
  await safeParty('storage return shows all party on safe floor');
  await audio('maillard_lounge');
  await shot('07-storage-return');
  await follow('party follows after storage return', 180, 416);
  await wallApproach(402);
  check('walking fully to wooden door does not enter', await page.evaluate(() => game.mapId === 'maillard_lounge' && !game.dialogue.running));
  await page.keyboard.press('KeyC', { delay: 50 });
  await ready('maillard_saloon');
  await audio('maillard_lounge');
  check('wooden room is exactly 3x storage width, same height and empty', await page.evaluate(() => game.map.pxW === 1440 && game.map.pxH === 448 && !game.map.def.enter && !game.entities.some(e => ['npc', 'trigger'].includes(e.def.type)) && game.map.def.entities.filter(e => e.type === 'door').length === 1));
  await safeParty('wooden entry shows all party safely');
  await shot('08-wood-left');
  await follow('wooden room party follows across open floor', 704, 280);
  await shot('09-wood-middle');
  await walkTo(1320, 280);
  await shot('10-wood-right');
  await wallApproach(228);
  check('wooden room exit also requires C', await page.evaluate(() => game.mapId === 'maillard_saloon'));
  await page.keyboard.press('KeyC', { delay: 50 });
  await ready('maillard_lounge');
  check('wooden return uses safe down-facing lounge spawn', await page.evaluate(() => Math.abs(game.player.x - 402) < 2 && game.player.y === 304 && game.player.facing === 'down'));
  await safeParty('wooden return shows all party safely');
  await shot('11-wood-return');
  await follow('party follows after wooden return', 402, 416);
  check('room round trips retain party inventory money and combat stats', JSON.stringify(await stats()) === JSON.stringify(initialStats));
  await title();
  await page.keyboard.press('KeyC', { delay: 50 });
  await ready('maillard_lounge');
  await safeParty('continue restores lounge with safe visible party');
  await follow('party keeps following after continue', 520, 340);
  await shot('12-continue-return');
  for (const id of ['maillard_storage', 'maillard_saloon']) {
    await qJump(id);
    check(`Q menu ${id} retains canonical party and stats`, JSON.stringify(await stats()) === JSON.stringify(initialStats));
    await safeParty(`Q menu ${id} arrives safely`);
    await shot(`q-arrival-${id}`);
  }
  check('no browser runtime or console errors', errors.length === 0, errors);
  check('room assets and requested audio have no failed requests', !resourceErrors.some(url => /maillard_|\/wind\.mp3|\/props\/door\.png/.test(url)), resourceErrors);
} catch (error) {
  errors.push(error.stack || error.message);
  errors.push(JSON.stringify(await page.evaluate(() => ({ map: game.mapId, bgm: game.sound.bgmName, src: game.sound.bgm?.src, time: game.sound.bgm?.currentTime, paused: game.sound.bgm?.paused }))));
  await shot('failure');
  console.error(error);
}
finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ checks, errors, resourceErrors, captures }, null, 2));
  await browser.close();
}
const fails = checks.filter(c => !c.ok).length + errors.length;
console.log(`fails=${fails}`);
process.exitCode = fails ? 1 : 0;
