import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const dir = process.env.SHOT_DIR || '/tmp/sea-heart103';
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const errors = [], checks = [];
let fails = 0;
const check = (name, ok, detail) => { checks.push({ name, ok, detail }); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, detail || ''); };
const shot = name => page.screenshot({ path: path.join(dir, `${name}.png`) });
const key = name => page.keyboard.press(name, { delay: 65 });
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(`${process.env.BASE_URL || 'http://localhost:8767'}/?qa=obj5_sea`);
  await page.waitForFunction(() => window.game?.player);
  await key('KeyX');
  for (let i = 0; i < 2; i++) { await page.waitForFunction(() => game.textbox.state === 'waiting'); await key('KeyC'); }
  await page.waitForFunction(() => game.seaChase.model.phase === 'tutorial');
  await key('KeyC');
  await page.waitForFunction(() => game.seaChase.model.phase === 'fight');
  await page.evaluate(() => { game.seaChase.model.attackClock = 999; });
  const dim = await page.evaluate(() => {
    const scene = game.seaChase, m = scene.model, phase = m.phase;
    const render = (mode) => {
      m.phase = mode;
      const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 360;
      canvas.getContext('2d').imageSmoothingEnabled = false;
      scene.drawRaft(canvas.getContext('2d'));
      return canvas.getContext('2d').getImageData(0, 0, 480, 360).data;
    };
    const before = render('tutorial'), after = render('fight'); m.phase = phase;
    const pose = m.raftPose(), sprite = scene.playerSprite;
    const width = Math.round(sprite.fw / sprite.px * 1.43), height = Math.round(sprite.fh / sprite.px * 1.43);
    const x = Math.round(pose.x - width / 2), y = Math.round(pose.y + 8 - height);
    let changed = 0, outside = 0, alphaChanges = 0, source = 0, target = 0;
    for (let i = 0; i < before.length; i += 4) {
      if (before[i + 3] !== after[i + 3]) alphaChanges++;
      if (before[i] === after[i] && before[i + 1] === after[i + 1] && before[i + 2] === after[i + 2]) continue;
      changed++;
      const px = i / 4 % 480, py = Math.floor(i / 4 / 480);
      if (px < x || px >= x + width || py < y || py >= y + height) outside++;
      source += before[i] + before[i + 1] + before[i + 2]; target += after[i] + after[i + 1] + after[i + 2];
    }
    return { changed, outside, alphaChanges, brightness: target / source };
  });
  check('only Hyungsub darkens slightly during fight, without transparency', dim.changed > 100 && dim.outside === 0 && dim.alphaChanges === 0 && dim.brightness > 0.7 && dim.brightness < 0.85, dim);
  await shot('rest');
  const before = await page.evaluate(() => game.seaChase.model.playerHeart());
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(100); await shot('move-mid');
  await page.waitForTimeout(120); await page.keyboard.up('ArrowUp'); await shot('moved');
  check('real up input moves face-heart with raft', await page.evaluate(before => { const m = game.seaChase.model, h = m.playerHeart(), r = m.raftPose(); return h.y < before.y - 20 && h.x - r.x === m.config.heart.x && h.y - r.y === m.config.heart.y; }, before));
  await page.keyboard.down('KeyC'); await page.waitForTimeout(45); await shot('recoil');
  check('shooting recoil shares the displayed heart origin', await page.evaluate(() => { const m = game.seaChase.model; return m.recoil > 0 && m.playerHeart().x === m.raftPose().x + m.config.heart.x; }));
  await page.keyboard.up('KeyC'); await page.waitForTimeout(200);
  const projectile = async mode => page.evaluate(mode => {
    const m = game.seaChase.model, heart = m.playerHeart();
    m.attacks = [{ x: heart.x + 55, y: mode === 'body' ? m.raftY - 12 : heart.y + (mode === 'graze' ? 17 : 0), vx: -170, vy: 0, radius: 10, life: 4, kind: 'aimed' }];
  }, mode);
  await projectile('body'); await page.waitForTimeout(260); await shot('body-miss'); await page.waitForTimeout(400);
  check('actual acid crossing the old torso hitbox causes no damage', await page.evaluate(() => game.seaChase.model.playerHits === 0));
  await projectile('graze'); await page.waitForTimeout(650);
  check('acid passing beside the small heart causes no damage', await page.evaluate(() => game.seaChase.model.playerHits === 0));
  await projectile('heart'); await page.waitForFunction(() => game.seaChase.model.playerHits === 1); await shot('heart-hit');
  check('direct heart collision removes exactly one life', await page.evaluate(() => game.seaChase.model.playerHits === 1 && game.seaChase.model.invulnerable > 0));
  for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 812 }); await shot(`width-${width}`); }
  await page.evaluate(() => { const m = game.seaChase.model; game.setFlag('obj5_chase_cleared'); m.setPhase('cleared'); m.attacks = []; });
  await page.waitForFunction(() => !!game.maillardArrival);
  check('cleared follow-up has no combat heart render path', await page.evaluate(() => game.seaChase.model.phase === 'cleared' && game.maillardArrival.beat === 'unstable'));
  check('no page errors', errors.length === 0, errors);
} catch (error) { fails++; errors.push(error.message); }
finally { fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ fixture: 'Natural tutorial, then isolated radius10 acid volleys; real input and runtime collision.', checks, errors, fails }, null, 2)); await browser.close(); }
console.log(`fails=${fails}`);
process.exitCode = fails ? 1 : 0;
