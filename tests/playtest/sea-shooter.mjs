import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/sea-shooter';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const errors = [], checks = [], samples = [];
let fails = 0;
page.on('pageerror', e => errors.push(e.message));
const check = (name, ok, detail) => { checks.push({ name, ok, detail }); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, detail ?? ''); };
const shot = name => page.screenshot({ path: path.join(shots, `${name}.png`) });
const press = () => page.keyboard.press('KeyC', { delay: 50 });
const intro = async () => {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const s = await page.evaluate(() => ({ phase: game.seaChase?.model.phase, box: game.textbox.state }));
    if (s.phase === 'tutorial') break;
    if (s.box === 'waiting') await press();
    await page.waitForTimeout(70);
  }
  await shot('tutorial'); await press();
  await page.waitForFunction(() => game.seaChase?.model.phase === 'tutorial-hit');
  await shot('first-hit');
  await page.waitForFunction(() => game.seaChase?.model.phase === 'fight');
};
try {
  await page.goto(`${process.env.BASE_URL || 'http://localhost:8767'}/?qa=obj5_sea`);
  await page.waitForFunction(() => !!window.game?.player);
  await page.keyboard.press('KeyX', { delay: 50 });
  await intro();
  check('music begins after tutorial roar', await page.evaluate(() => game.sound.bgmName === 'baron_sea_battle'));
  if (process.env.SEA_OUTCOME !== 'clear') {
  await page.waitForFunction(() => !!game.seaChase?.model.warning);
  await shot('warning');
  await page.waitForFunction(() => game.seaChase?.model.attacks.length > 0);
  await page.waitForTimeout(650); await shot('acid');
  await page.waitForFunction(() => game.seaChase?.model.phase === 'sinking', null, { timeout: 65000 });
  check('natural attacks produce five hits and exact scream', await page.evaluate(() => game.seaChase.model.playerHits === 5 && game.textbox.node.text === '* 으아악'));
  await shot('fifth-hit'); await page.waitForTimeout(1600); await shot('drift');
  await page.waitForFunction(() => !game.seaChase && game.textbox.node?.text === '* 재도전할까?');
  check('failure returns dock with one gun and both companions', await page.evaluate(() => game.mapId === 'obj5' && game.entrySpawn === 'dock' && game.inventory.filter(i => i === '나무총').length === 1 && game.party.length === 2));
  await page.keyboard.press('KeyX', { delay: 50 }); await page.waitForTimeout(600);
  await page.keyboard.press('ArrowRight'); await press();
  await page.waitForFunction(() => !game.dialogue.running);
  check('decline remains at dock with retry pending', await page.evaluate(() => !game.seaChase && game.flags.obj5_chase_retry_pending));
  await shot('declined');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => game.player.x >= 725, null, { timeout: 3000 });
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('ArrowUp', { delay: 100 }); await press();
  await page.waitForFunction(() => game.textbox.node?.text === '* 재도전할까?', null, { timeout: 5000 });
  await page.keyboard.press('KeyX', { delay: 50 }); await page.waitForTimeout(600); await press();
  await intro();
  check('retry resets player, boss and enrage state', await page.evaluate(() => game.seaChase.model.playerHits === 0 && game.seaChase.model.hits === 0 && !game.seaChase.model.enraged));
  }
  await page.evaluate(() => {
    const original = game.sound.sfx.bind(game.sound);
    window.seaRoars = [];
    game.sound.sfx = (name, options) => {
      if (name === 'baron_roar') window.seaRoars.push({ hits: game.seaChase?.model.hits, at: performance.now() });
      return original(name, options);
    };
  });
  await page.keyboard.down('KeyC');
  const deadline = Date.now() + 160000, start = Date.now();
  let held = null, capturedEnrage = false, capturedSweep = false;
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => {
      const m = game.seaChase?.model;
      if (!m || m.phase !== 'fight') return { phase: m?.phase };
      const c = m.config, travel = (m.bossX + c.boss.width * 0.48 - (c.raft.x + c.raft.gunWidth)) / c.bulletSpeed;
      const futureMotion = m.motionTime + travel * (m.enraged ? c.enrage.moveMultiplier : 1);
      const futureBossY = c.boss.baseY + c.boss.amplitude * (1 - Math.cos(futureMotion * Math.PI * 2 / c.boss.period)) / 2;
      let best = { score: Infinity, y: m.raftY };
      for (let y = c.raft.minY + 4; y < c.raft.maxY - 4; y += 4) {
        let risk = 0;
        for (const a of m.attacks) {
          const speed = Math.hypot(a.vx, a.vy), tail = a.length || 0;
          for (let t = 0; t <= 1.9; t += 0.08) {
            const atY = m.raftY + Math.sign(y - m.raftY) * Math.min(Math.abs(y - m.raftY), c.raft.speed * t);
            const headX = a.x + a.vx * t, headY = a.y + a.vy * t;
            const tailX = headX - a.vx / speed * tail, tailY = headY - a.vy / speed * tail;
            const dx = headX - tailX, dy = headY - tailY;
            const k = Math.max(0, Math.min(1, ((c.raft.x - tailX) * dx + (atY - 12 - tailY) * dy) / (dx * dx + dy * dy || 1)));
            if (Math.hypot(tailX + dx * k - c.raft.x, tailY + dy * k - (atY - 12)) < a.radius + c.raft.hitRadius + 11) risk += 10000 * (2 - t);
          }
        }
        const warning = m.warning;
        if (warning) {
          const targets = warning.kind === 'aimed' ? [warning.targetY - 20, warning.targetY, warning.targetY + 20] : c.attacks.lanes.filter(v => Math.abs(v - warning.gapY) >= c.attacks.gap / 2);
          if (targets.some(v => Math.abs(y - 12 - v) < 31)) risk += 2000;
        }
        const aim = m.opaqueAt(0.48, (y + c.raft.gunY - futureBossY) / c.boss.height, m.frame());
        const score = risk + (aim ? 0 : 160) + Math.abs(y - m.raftY) * 0.25;
        if (score < best.score) best = { score, y };
      }
      return { phase: m.phase, hits: m.hits, hurt: m.playerHits, enrage: m.enraged, sweep: m.attacks.some(a => a.kind === 'sweep'), direction: best.y < m.raftY - 4 ? 'ArrowUp' : best.y > m.raftY + 4 ? 'ArrowDown' : null };
    });
    if (state.phase !== 'fight') break;
    if (state.direction !== held) { if (held) await page.keyboard.up(held); if (state.direction) await page.keyboard.down(state.direction); held = state.direction; }
    if (state.enrage && !capturedEnrage) { await shot('enraged'); capturedEnrage = true; }
    if (state.sweep && !capturedSweep) { await shot('sweeping-breath'); capturedSweep = true; }
    samples.push({ t: Date.now() - start, ...state });
    await page.waitForTimeout(60);
  }
  await page.keyboard.up('KeyC'); if (held) await page.keyboard.up(held);
  check('normal-clock actual-key shooting clears all 400 HP', await page.evaluate(() => game.seaChase?.model.outcome === 'cleared' && game.seaChase.model.hits === 400), { elapsedMs: Date.now() - start, last: samples.at(-1) });
  check('enrage and sweeping breath observed', capturedEnrage && capturedSweep);
  check('threshold roar occurs exactly once at 30 percent HP', await page.evaluate(() => window.seaRoars.length === 1 && window.seaRoars[0].hits === 280), await page.evaluate(() => window.seaRoars));
  check('clear hands living boss to Maillard follow-up without starting battle', await page.evaluate(() => !!game.seaChase && game.flags.obj5_chase_cleared && !!game.maillardArrival && !game.battle));
  await shot('cleared');
  await page.setViewportSize({ width: 375, height: 812 }); await shot('narrow');
  check('no page errors', errors.length === 0, errors);
} catch (error) {
  fails++; errors.push(error.message); console.error(error);
} finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ checks, samples, errors, fails }, null, 2));
  await browser.close();
}
console.log(`fails=${fails}`);
process.exitCode = fails ? 1 : 0;
