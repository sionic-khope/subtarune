import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/tv148-playtest';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: false });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const checks = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
const check = (name, pass, detail) => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail)}`);
};
const ready = () => page.waitForFunction(() => game.state === 'field' && !game.transitioning
  && !game.dialogue.running && game.fade.alpha === 0);
const press = async () => { await page.keyboard.press('KeyC'); await page.waitForTimeout(100); };
const walk = async (key, ms) => {
  await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key);
};
const close = async () => {
  for (let i = 0; i < 4 && await page.evaluate(() => game.dialogue.running); i++) await press();
  await ready();
};
const place = (x, y) => page.evaluate(({ x, y }) => {
  game.player.x = x; game.player.y = y; game.player.trail = []; game.camera.snap();
}, { x, y });
const shot = async name => {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: path.join(shots, `${name}.png`) });
};

try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:8799');
  await page.waitForFunction(() => window.game?.title);
  await page.evaluate(async () => {
    const { QA_POINTS } = await import('/src/core/story.js');
    const point = QA_POINTS.find(entry => entry.id === 'youngcle1');
    game.devJump({ ...point, flags: { ...point.flags, youngcle_intro_done: true, youngcle_tv_gag_done: true } });
  });
  await ready();
  const art = await page.evaluate(() => {
    const tv = game.entities.find(e => e.id === 'youngcle_tv');
    const screen = game.entities.find(e => e.id === 'youngcle_tv_screen');
    return { art: { x: tv.drawX, y: tv.drawY, w: tv.iw, h: tv.ih }, anchor: screen.rect };
  });
  check('actual rendered TV rectangle and unchanged staging anchor',
    JSON.stringify(art) === JSON.stringify({ art: { x: 528, y: 32, w: 288, h: 176 }, anchor: { x: 528, y: 196, w: 288, h: 12 } }), art);

  for (const [name, x] of [['front-left', 528], ['front-center', 660], ['front-right', 792]]) {
    await place(x, 260);
    await walk('ArrowUp', 1100);
    const before = await page.evaluate(() => ({ x: game.player.x, y: game.player.y,
      facing: game.player.facing, target: game.player.probe()?.id || null,
      wallBehind: game.map.solidRect(game.player.x, game.player.y - 16, 24, 16) }));
    await press();
    const responds = await page.evaluate(() => game.textbox.node?.text === '* TV는 꺼져 있다.' && game.dialogue.running);
    if (responds) await page.waitForFunction(() => game.textbox.state === 'waiting');
    await shot(name);
    check(`${name}: walk all the way up then C inspects TV`, responds && before.wallBehind, before);
    await close();
  }
  for (const [name, x, key] of [['left', 476, 'ArrowRight'], ['right', 842, 'ArrowLeft']]) {
    await place(x, 194);
    await walk(key, 160);
    const before = await page.evaluate(() => ({ x: game.player.x, y: game.player.y,
      facing: game.player.facing, target: game.player.probe()?.id || null }));
    await press();
    const responds = await page.evaluate(() => game.textbox.node?.text === '* TV는 꺼져 있다.' && game.dialogue.running);
    if (responds) await page.waitForFunction(() => game.textbox.state === 'waiting');
    await shot(name);
    check(`${name}: sideways approach then C inspects TV`, responds, before);
    await close();
  }
  await place(660, 260);
  await walk('ArrowUp', 30);
  await press();
  check('distant C does not inspect TV', await page.evaluate(() => !game.dialogue.running));

  await place(660, 260);
  await walk('ArrowUp', 1100);
  const toggle = await page.evaluate(() => {
    const screen = game.entities.find(e => e.id === 'youngcle_tv_screen');
    const saved = screen.def.inspectRect;
    delete screen.def.inspectRect;
    const before = game.player.probe()?.id || null;
    screen.def.inspectRect = { x: 0, y: -164, w: 288, h: 176 };
    const expanded = game.player.probe()?.id || null;
    if (saved) screen.def.inspectRect = saved;
    else delete screen.def.inspectRect;
    return { before, expanded, restored: game.player.probe()?.id || null };
  });
  check('full art rectangle contains the wall-stop probe', toggle.before === null && toggle.expanded === 'youngcle_tv_screen', toggle);

  await page.evaluate(() => { delete game.flags.youngcle_tv_gag_done; });
  await press();
  await page.waitForFunction(() => game.tvBroadcast?.expression === 'read' && game.textbox.node?.text === '* ..오..');
  await page.waitForFunction(() => game.textbox.state === 'waiting');
  await shot('gag-read');
  const retreat = await page.evaluate(() => ({ player: [game.player.x, game.player.y],
    screen: game.entities.find(e => e.id === 'youngcle_tv_screen').rect }));
  check('first inspect preserves retreat staging and TV anchor',
    JSON.stringify(retreat) === JSON.stringify({ player: [660, 284], screen: { x: 528, y: 196, w: 288, h: 12 } }), retreat);
  await press(); await press();
  await page.waitForFunction(() => game.tvBroadcast?.expression === 'shock' && game.textbox.node?.text === '* 뭐 뭐노?!');
  await page.waitForFunction(() => game.textbox.state === 'waiting');
  await shot('gag-shock');
  await press(); await press();
  await ready();
  check('TV gag completes once and restores camera/zoom', await page.evaluate(() => game.flags.youngcle_tv_gag_done
    && game.tvBroadcast === null && game.zoom.s === 1 && game.camera.target === game.player));
  check('no runtime errors', errors.length === 0, errors);
} finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ checks, errors }, null, 2));
  await browser.close();
}
const failures = checks.filter(check => !check.pass).length + errors.length;
console.log(`fails=${failures}`);
process.exitCode = failures ? 1 : 0;
