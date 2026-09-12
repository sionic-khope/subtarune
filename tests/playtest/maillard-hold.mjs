import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/maillard-hold104';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const errors = [], checks = [], lines = [], captured = new Set();
const check = (name, ok, detail) => { checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, detail ?? ''); };
const shot = async (name) => { captured.add(name); await page.screenshot({ path: path.join(shots, `${name}.png`) }); };
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'warning' && message.text().includes('cutscene')) errors.push(message.text()); });
try {
  await page.goto(`${process.env.BASE_URL || 'http://localhost:8767'}/?qa=maillard_deck`);
  await page.waitForFunction(() => !!window.game?.player);
  await page.keyboard.press('KeyX', { delay: 50 });
  const deadline = Date.now() + 70000;
  let last = '';
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => {
      const g = window.game;
      const y = g.entities.find(e => e.id === 'yongjun');
      return {
        running: g.dialogue.running, text: g.textbox.node?.text, box: g.textbox.state,
        face: g.player.facing, cameraX: g.camera.x, fade: g.fade.alpha,
        party: [g.player, ...g.entities.filter(e => ['gyeongsub', 'ppaman'].includes(e.id))].map(e => ({ id: e.id, visible: e.visible, moving: e.moving })),
        yongjun: y ? { x: y.x, y: y.y, visible: y.visible, moving: y.moving } : null,
      };
    });
    if (state.fade === 0 && state.party.filter(e => e.visible).length === 1 && !captured.has('emerge-one')) await shot('emerge-one');
    if (state.yongjun?.visible && state.yongjun.moving && state.yongjun.x > 200 && state.yongjun.x < 280 && !captured.has('yongjun-left')) {
      await shot('yongjun-left');
      check('party faces left toward entering Yongjun', state.face === 'left');
    }
    if (state.yongjun?.moving && state.yongjun.x > 780 && !captured.has('yongjun-stairs')) await shot('yongjun-stairs');
    if (!state.yongjun && state.cameraX > 400 && !captured.has('stairs-departed')) await shot('stairs-departed');
    if (state.text && state.text !== last && state.box !== 'closed') {
      lines.push(state.text); last = state.text;
      if (lines.length === 3) check('Yongjun is offscreen before his entrance', !state.yongjun?.visible);
    }
    if (state.box === 'typing') await page.keyboard.press('KeyX', { delay: 35 });
    else if (state.box === 'waiting') {
      if (lines.length === 4 && !captured.has('conversation')) await shot('conversation');
      await page.keyboard.press('KeyC', { delay: 45 });
    }
    if (!state.running && lines.length) break;
    await page.waitForTimeout(60);
  }
  check('all supplied dialogue plays', lines.length === 21, lines);
  check('sequential emergence and right portal disappearance are captured', ['emerge-one', 'yongjun-left', 'yongjun-stairs', 'stairs-departed'].every(name => captured.has(name)), [...captured]);
  check('interior returns control with wind and completion', await page.evaluate(() => game.mapId === 'maillard_deck' && game.flags.maillard_hold_done && game.sound.bgmName === 'wind' && !game.dialogue.running));
  await shot('interior-control');
  const oldX = await page.evaluate(() => game.player.x);
  await page.keyboard.press('ArrowRight', { delay: 200 });
  check('player can walk after dialogue', await page.evaluate(x => game.player.x > x, oldX));
  await page.evaluate(() => { game.autosave(); game.toTitle(); });
  await page.waitForFunction(() => game.state === 'title');
  await page.evaluate(() => game.continueGame());
  await page.waitForTimeout(600);
  check('continue does not repeat arrival', await page.evaluate(() => game.mapId === 'maillard_deck' && game.flags.maillard_hold_done && !game.dialogue.running));
  await page.setViewportSize({ width: 375, height: 812 });
  await shot('interior-narrow');
  check('no runtime errors', errors.length === 0, errors);
} catch (error) { errors.push(error.message); console.error(error); }
finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ checks, lines, captures: [...captured], errors }, null, 2));
  await browser.close();
}
process.exitCode = checks.some(check => !check.ok) || errors.length ? 1 : 0;
console.log(`fails=${checks.filter(check => !check.ok).length + errors.length}`);
