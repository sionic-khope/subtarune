import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.BASE_URL || 'http://localhost:8777';
const shots = process.env.SHOT_DIR || '/tmp/storage119-playtest';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const report = { checks: [], errors: [], captures: [] };
page.on('pageerror', e => report.errors.push(e.message));
const check = (name, pass, detail) => { report.checks.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); };
const ready = () => page.waitForFunction(() => window.game?.state === 'field' && !game.dialogue.running && !game.transitioning && game.fade.alpha === 0);
const next = () => page.keyboard.press('KeyC', { delay: 45 });
const capturedWarnings = new Set();
async function shot(name) {
  await page.screenshot({ path: path.join(shots, `${name}.png`) });
  report.captures.push({ name, data: await page.evaluate(() => ({ text: game.textbox.node?.text, battle: game.battle?.state, facing: game.entities.find(e => e.id === 'expelled_viewer')?.facing, motion: game.entities.find(e => e.id === 'expelled_viewer')?.motion?.index })) });
}
async function advanceToChoice() {
  for (let i = 0; i < 24; i++) {
    const status = await page.evaluate(() => ({ state: game.textbox.state, text: game.textbox.node?.text, page: game.textbox.page }));
    if (status.state === 'choice') break;
    const key = `${status.text}:${status.page}`;
    if (status.state === 'waiting' && !capturedWarnings.has(key)) {
      capturedWarnings.add(key);
      await shot(`warning-page-${capturedWarnings.size}`);
    }
    await next(); await page.waitForTimeout(100);
  }
  await page.waitForFunction(() => game.textbox.state === 'choice' && game.textbox.choiceLock <= 0);
}
async function approachActor() {
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => game.player.probe()?.id === 'expelled_viewer');
  await page.keyboard.up('ArrowUp');
  await next();
}
try {
  if (process.env.WIN_ONLY === '1') {
    await page.goto(`${base}/?qa=maillard_storage`); await ready();
    await page.keyboard.press('KeyX');
    await page.evaluate(() => { game.flags.storage_viewer_intro_seen = true; });
    await approachActor();
    await page.waitForFunction(() => game.battle?.state === 'intro');
  } else {
  await page.goto(`${base}/?qa=maillard_lounge`); await ready();
  await page.keyboard.press('KeyX');
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => game.player.y < 165);
  await page.keyboard.up('ArrowUp');
  await next();
  await page.waitForFunction(() => game.textbox.state === 'typing');
  await next(); await shot('01-warning');
  await advanceToChoice(); await shot('02-consent');
  check('consent labels', await page.evaluate(() => game.textbox.choice.options.map(o => o.label).join() === '네,아니오'));
  await page.keyboard.press('KeyX'); await ready();
  check('X rejects entry', await page.evaluate(() => game.mapId === 'maillard_lounge'));
  await next(); await advanceToChoice(); await next(); await ready();
  check('Yes enters storage', await page.evaluate(() => game.mapId === 'maillard_storage'));
  await page.evaluate(() => {
    window.viewerLines = []; window.viewerSfx = []; window.viewerFrames = [];
    const show = game.textbox.show;
    game.textbox.show = function (node, ...args) { viewerLines.push({ text: node.text, voice: node.voice, at: performance.now() }); return show.call(this, node, ...args); };
    const sfx = game.sound.sfx;
    game.sound.sfx = function (name, ...args) { viewerSfx.push(name); return sfx.call(this, name, ...args); };
    const update = game.update;
    game.update = function (...args) {
      const result = update.apply(this, args);
      const actor = this.entities.find(e => e.id === 'expelled_viewer');
      if (actor?.motion) viewerFrames.push({ facing: actor.facing, index: actor.motion.index, flip: actor.motion.flipEvery ? Math.floor(actor.motion.elapsed / actor.motion.flipEvery) % 2 : 0, pop: actor.motion.pop || 0, text: this.textbox.node?.text, state: this.textbox.state, revealed: this.textbox.revealed, total: this.textbox.tokens?.length });
      return result;
    };
  });
  await page.waitForTimeout(500); await shot('03-crouch');
  await approachActor();
  await page.waitForFunction(() => game.textbox.state === 'waiting'); await shot('04-first-line');
  check('C preserves back until reveal', await page.evaluate(() => game.entities.find(e => e.id === 'expelled_viewer').facing === 'up'));
  const capturedLines = new Set();
  for (let i = 0; i < 60; i++) {
    const status = await page.evaluate(() => ({ battle: !!game.battle, state: game.textbox.state, text: game.textbox.node?.text, page: game.textbox.page, cut: game.textbox.cut, cutTimer: game.textbox.cutTimer }));
    if (status.battle) break;
    const key = `${status.text}:${status.page}`;
    if ((status.state === 'waiting' || (status.cut && status.cutTimer > 0.6)) && !capturedLines.has(key)) {
      capturedLines.add(key);
      await shot(`intro-line-${capturedLines.size}`);
    }
    if (status.state === 'waiting' || (status.state === 'typing' && !status.cut)) {
      if (status.state === 'waiting' && status.text?.includes('흔들으라노')) await shot('05-reveal');
      if (status.state === 'waiting' && status.text?.includes('onep')) { await page.waitForTimeout(450); await shot('06-dance'); }
      if (status.state === 'waiting' && status.text?.includes('페이커')) { await page.waitForTimeout(450); await shot('07-dance-fast'); }
      await next();
    }
    await page.waitForTimeout(150);
  }
  await page.waitForFunction(() => game.battle?.state === 'intro'); await shot('08-battle');
  const evidence = await page.evaluate(() => ({ lines: viewerLines, sfx: viewerSfx, frames: viewerFrames, battleKeys: Object.keys(game.battle), bgm: game.sound.bgm?.src }));
  report.evidence = evidence;
  check('eleven requested intro lines reached', evidence.lines.length === 11, evidence.lines);
  check('applause and standard battle jingle', evidence.sfx.includes('maillard_applause') && evidence.sfx.includes('battle_start'), evidence.sfx);
  check('dance flips and pops', evidence.frames.some(f => f.flip === 1 && f.pop > 0) && evidence.frames.some(f => f.flip === 0 && f.pop > 0));
  check('real enemy starts at requested HP66', await page.evaluate(() => game.battle.enemies[0].id === 'expelled_viewer' && game.battle.enemies[0].hp === 66));
  check('intro is not a victory', await page.evaluate(() => game.flags.storage_viewer_intro_seen === true && !game.flags.storage_viewer_defeated));
  }
  const beforeMoney = await page.evaluate(() => game.money);
  await page.evaluate(() => { game.battle.enemies[0].hp = 1; });
  for (let i = 0; i < 140; i++) {
    const state = await page.evaluate(() => game.battle?.state);
    if (state === 'win') break;
    if (['intro', 'menu', 'target'].includes(state)) await next();
    await page.waitForTimeout(100);
  }
  await page.waitForFunction(() => game.battle?.state === 'win' && game.battle.typed && game.battle.t > 0.65);
  await shot('09-win');
  check('real final hit awards666', await page.evaluate(before => game.money === before + 666, beforeMoney));
  await next();
  await page.waitForFunction(() => game.textbox.node?.text === '* ... 아 안돼' && game.textbox.state === 'waiting');
  await shot('10-win-reaction'); await next();
  await page.waitForFunction(() => game.textbox.node?.text === '* 넌니애미따라가라' && game.textbox.state === 'waiting');
  await next(); await page.waitForTimeout(180); await shot('11-kick-stamp');
  await ready(); await shot('12-lying');
  check('victory lying NPC and flags persist', await page.evaluate(() => {
    const actor = game.entities.find(e => e.id === 'expelled_viewer');
    const saved = JSON.parse(localStorage.getItem('subtarune.save.v1'));
    return actor.def.sprite === 'expelled_viewer_down' && actor.def.script === 'storage_viewer_defeated' && saved.flags.storage_viewer_defeated && saved.flags.storage_viewer_intro_seen;
  }));
  await approachActor();
  await page.waitForFunction(() => game.textbox.node?.text === '* 강퇴당했다' && game.textbox.state === 'waiting');
  await shot('13-repeat'); await next(); await ready();
  await page.keyboard.press('Escape'); await page.waitForFunction(() => game.state === 'title');
  check('Esc exits to title', await page.evaluate(() => game.state === 'title'));
  await page.goto(base); await page.waitForFunction(() => window.game?.state === 'title' && game.title?.phase === 'wait');
  await page.keyboard.press('KeyX'); await page.waitForFunction(() => game.title.phase === 'zoom');
  await next(); await page.waitForFunction(() => game.title.phase === 'locked');
  await page.waitForTimeout(3300); await next(); await ready();
  check('real Continue restores one lying viewer and reward exactly once', await page.evaluate(expected => {
    const actors = game.entities.filter(e => e.id?.startsWith('expelled_viewer'));
    return game.mapId === 'maillard_storage' && actors.length === 1 && actors[0].def.sprite === 'expelled_viewer_down' && actors[0].def.script === 'storage_viewer_defeated' && game.money === expected;
  }, beforeMoney + 666));
  await shot('14-continue');
  check('no runtime errors', report.errors.length === 0, report.errors);
} catch (error) { report.errors.push(error.stack); await shot('failure'); }
finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
const failures = report.errors.length + report.checks.filter(c => !c.pass).length;
console.log(`fails=${failures}`);
if (failures) process.exitCode = 1;
