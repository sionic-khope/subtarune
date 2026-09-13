import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const root = process.env.SHOT_DIR || '/tmp/storage119-combat';
fs.mkdirSync(root, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const checks = [], errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const check = (name, ok, data) => { checks.push({ name, ok: !!ok, data }); if (!ok) console.log('FAIL', name, data); };
const until = async (fn, timeout = 15000) => page.waitForFunction(fn, null, { timeout });
const shot = async (name) => page.screenshot({ path: `${root}/${name}.png` });
try {
  await page.goto(`${process.env.BASE_URL || 'http://localhost:8777'}/?qa=maillard_storage`);
  await until(() => window.game?.player);
  await page.keyboard.press('KeyX'); await page.waitForTimeout(500);
  await page.evaluate(() => { game.startBattle({ enemies: ['expelled_viewer'], bgm: 'storage_battle' }); });
  await until(() => game.battle?.state === 'intro');
  const initial = await page.evaluate(() => ({ hp: game.battle.enemies[0].hp, images: Object.entries(game.battle.enemies[0].projectiles).map(([k, v]) => [k, !!v]), money: game.money }));
  check('HP66 and four generated projectile images load', initial.hp === 66 && initial.images.length === 4 && initial.images.every(([, v]) => v), initial);
  await shot('00-intro');
  await page.waitForTimeout(800); await page.keyboard.press('KeyC');
  await until(() => game.battle?.state === 'menu');
  for (const pattern of (process.env.PATTERNS || '0,1,2,3,4,5,6').split(',').map(Number)) {
    await page.evaluate((i) => { const b = game.battle; b.enemies[0].patternIdx = i; b.enemies[0].hp = 66; b.members.forEach((m) => { m.hp = m.maxHp; m.down = false; }); b.beginEnemyTurn(); }, pattern);
    await page.waitForTimeout(550); await shot(`p${pattern + 1}-prep`);
    await until(() => game.battle?.state === 'bullets', 16000);
    await page.waitForTimeout(330); await shot(`p${pattern + 1}-warning`);
    const shapes = new Set(), snapshots = [], began = Date.now(); let active = false, late = false, blast = false;
    while (Date.now() - began < 11500) {
      const state = await page.evaluate(() => { const b = game.battle; return { state: b.state, t: b.t, bubble: b.bubble?.text, bullets: b.bullets.map((p) => ({ shape: p.shape, x: p.x, y: p.y, vx: p.vx, vy: p.vy, age: p.age, warn: p.warn, heat: p.heat, harmless: p.harmless, image: p.image ? true : undefined })) }; });
      snapshots.push(state);
      state.bullets.forEach((b) => shapes.add(b.shape));
      if (!active && state.t > 1.25 && state.state === 'bullets') { await shot(`p${pattern + 1}-active`); active = true; }
      if (pattern === 2 && !late && state.t > 3.3) { await shot('p3-red-fuse'); late = true; }
      if (pattern === 2 && !blast && state.bullets.some((b) => b.shape === 'viewer_shard')) { await shot('p3-explosion'); blast = true; }
      if (state.state === 'menu') break;
      const dir = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'][Math.floor((Date.now() - began) / 600) % 4];
      await page.keyboard.down(dir); await page.waitForTimeout(90); await page.keyboard.up(dir);
    }
    check(`pattern ${pattern + 1} visible and standard menu returns`, active && snapshots.at(-1).state === 'menu' && shapes.size > 0, { shapes: [...shapes], last: snapshots.at(-1).state });
    if (pattern === 2) check('rock landed line and late-red fuse then fragments', snapshots.some((s) => s.bubble === '어 이건 무슨바위지?') && late && blast);
    if (pattern === 6) check('timeout speech and changing velocity', snapshots.some((s) => s.bubble === '벤하지말아주세요ㅠㅠ') && snapshots.some((s) => s.bullets.some((b) => b.shape === 'viewer_timeout' && Math.abs(b.vx) > 10 && Math.abs(b.vy) > 10)));
    fs.writeFileSync(`${root}/p${pattern + 1}.json`, JSON.stringify(snapshots, null, 2));
  }
  await page.evaluate(() => { const b = game.battle; b.members.forEach((m) => { m.hp = 1; m.down = false; }); for (let i = 0; i < 3; i++) b.hurtParty(11); });
  await until(() => game.battle?.state === 'lose' && game.battle.t > 2); await shot('08-gameover');
  check('all party down triggers standard game over', await page.evaluate(() => game.battle.members.every((m) => m.down)));
  await page.keyboard.press('KeyC'); await until(() => game.battle?.state === 'intro', 10000);
  check('retry resets same enemy HP66 and party', await page.evaluate(() => game.battle.enemies[0].id === 'expelled_viewer' && game.battle.enemies[0].hp === 66 && game.battle.members.every((m) => !m.down && m.hp > 0)));
  await page.waitForTimeout(800); await page.keyboard.press('KeyC'); await until(() => game.battle?.state === 'menu');
  const moneyBefore = await page.evaluate(() => game.money);
  await page.evaluate(() => { game.battle.enemies[0].hp = 1; });
  for (let n = 0; n < 3; n++) { await page.keyboard.press('KeyC'); await page.waitForTimeout(180); await page.keyboard.press('KeyC'); await page.waitForTimeout(180); }
  await until(() => game.battle?.state === 'win', 15000); await shot('09-win');
  check('actual final rush hit yields 666 money', await page.evaluate((before) => game.money - before === 666, moneyBefore));
  check('no runtime page errors', errors.length === 0, errors);
} catch (error) { check('scenario completed', false, error.stack); await shot('failure'); }
finally { fs.writeFileSync(`${root}/report.json`, JSON.stringify({ checks, errors }, null, 2)); await browser.close(); }
console.log(JSON.stringify(checks, null, 2));
process.exit(checks.some((c) => !c.ok) ? 1 : 0);
