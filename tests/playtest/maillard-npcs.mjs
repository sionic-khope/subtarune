import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/maillard111';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const checks = [], errors = [], transcripts = {}, captures = [];
const check = (name, ok, detail) => { checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, detail ?? ''); };
const shot = async (page, name) => { await page.screenshot({ path: path.join(shots, `${name}.png`) }); captures.push(name); };
async function open(qa) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'warning' && message.text().includes('cutscene')) errors.push(message.text()); });
  await page.goto(`${process.env.BASE_URL || 'http://localhost:8770'}/?qa=${qa}`);
  await page.waitForFunction(() => game?.player && game.state === 'field' && !game.dialogue.running);
  await page.keyboard.press('KeyX');
  return page;
}
async function talk(page, name, automatic = false) {
  const lines = [], seen = new Set();
  await page.keyboard.press('KeyC');
  await page.waitForFunction(() => game.dialogue.running);
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => {
      const e = game.entities.find(e => e.id === 'wemix');
      return { running: game.dialogue.running, text: game.textbox.node?.text, speaker: game.textbox.node?.speaker,
        voice: game.textbox.node?.voice, box: game.textbox.state, hop: e?.hopY || 0, dead: e?.dead };
    });
    if (!state.running) break;
    if (state.text && !seen.has(state.text)) {
      seen.add(state.text); lines.push({ text: state.text, speaker: state.speaker, voice: state.voice });
    }
    if (state.hop > 12 && !seen.has('jump')) { seen.add('jump'); await shot(page, `${name}-jump`); }
    if (state.hop < -45 && !state.dead && !seen.has('fall')) { seen.add('fall'); await shot(page, `${name}-fall`); }
    if (state.box === 'waiting' && state.text && !seen.has(`shot:${state.text}`)) {
      seen.add(`shot:${state.text}`); await shot(page, `${name}-line-${lines.length}`);
    }
    if (!automatic && state.box !== 'closed') await page.keyboard.press('KeyC');
    await page.waitForTimeout(70);
  }
  check(`${name} returns field control`, await page.evaluate(() => !game.dialogue.running));
  transcripts[name] = lines;
  return { lines, seen };
}

try {
  const first = await open('maillard_chakgeom');
  check('all four requested sprite assets loaded', await first.evaluate(() => ['chakgeom', 'parang', 'norang', 'wemix'].every(id => !!game.spriteOverrides[id])));
  await shot(first, 'chakgeom-before');
  const greeting = await talk(first, 'chakgeom');
  check('chakgeom opens politely and completes his scene', greeting.lines[0]?.text.includes('안녕하세요 형님들') && await first.evaluate(() => game.flags.maillard_chakgeom_seen));
  await first.evaluate(() => game.changeMap('maillard_path', 'chakgeom', true, { enter: false }));
  await talk(first, 'chakgeom-repeat');
  await first.close();

  const pair = await open('maillard_tarts');
  await shot(pair, 'pair-original-art');
  const gift = await talk(pair, 'pair');
  const count = () => pair.evaluate(() => game.inventory.filter(name => name === '에그타르트').length);
  check('pair uses narrator voices and gives exactly two tarts', gift.lines.filter(line => ['파랑이', '노랑이'].includes(line.speaker)).every(line => line.voice === 'narrator') && await count() === 2, gift.lines);
  await pair.evaluate(() => game.changeMap('maillard_path', 'tarts', true, { enter: false }));
  await pair.keyboard.press('ArrowRight', { delay: 510 });
  await pair.keyboard.press('ArrowUp', { delay: 30 });
  check('yellow friend can also be addressed', await pair.evaluate(() => game.player.probe()?.id === 'norang'));
  await talk(pair, 'pair-repeat-yellow');
  check('shared gift cannot be duplicated by talking to the other friend', await count() === 2);
  const healing = await pair.evaluate(() => {
    game.partyHp.gyeongsub = 1;
    const first = game.useItemOn('에그타르트', 'gyeongsub');
    const afterFirst = game.hpOf('gyeongsub');
    const second = game.useItemOn('에그타르트', 'gyeongsub');
    return { first, second, afterFirst, afterSecond: game.hpOf('gyeongsub'), max: game.maxHpOf('gyeongsub') };
  });
  check('each tart heals 100 and the second respects max HP', healing.first && healing.second && healing.afterFirst === 101 && healing.afterSecond === healing.max && await count() === 0, healing);
  await pair.evaluate(() => { game.autosave(); game.continueGame(); });
  await pair.waitForFunction(() => !game.transitioning && game.state === 'field');
  check('consumed tarts stay consumed after continue', await count() === 0);
  await pair.setViewportSize({ width: 375, height: 812 });
  await shot(pair, 'pair-small-viewport');
  await pair.close();

  const exit = await open('maillard_wemix');
  await exit.evaluate(() => {
    window.remixPlayed = 0;
    window.remixAudios = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function(...args) {
      if (this.src.includes('wemix_remix')) window.remixAudios.push(this);
      return play.apply(this, args);
    };
    const original = game.sound.sfx.bind(game.sound);
    game.sound.sfx = (name, ...args) => { if (name === 'wemix_remix') window.remixPlayed++; return original(name, ...args); };
  });
  check('requested remix is loaded as the real audio file', await exit.evaluate(() => game.sound.files.wemix_remix?.readyState >= 3 && game.sound.files.wemix_remix.duration > 2));
  await shot(exit, 'wemix-before');
  const falling = await talk(exit, 'wemix', true);
  check('wemix visibly jumps and falls with real audio playback and no additional input', falling.seen.has('jump') && falling.seen.has('fall') && await exit.evaluate(() => window.remixPlayed === 1 && window.remixAudios.some(audio => audio.currentTime > 1) && game.flags.maillard_wemix_gone));
  check('requested reaction follows the fall', falling.lines.some(line => line.speaker === '억빠맨' && line.text.includes('어 위믹스 어 떨어졌네')) && falling.lines.some(line => line.voice === 'narrator' && line.text.includes('씨발')));
  await exit.evaluate(() => { game.autosave(); game.continueGame(); });
  await exit.waitForFunction(() => !game.transitioning && game.state === 'field');
  check('wemix stays gone after continue and sunset music remains', await exit.evaluate(() => !game.entities.some(e => e.id === 'wemix' && !e.dead) && game.sound.bgmName === 'maillard_sunrise'));
  await shot(exit, 'wemix-gone');
  await exit.close();
  check('no runtime errors', errors.length === 0, errors);
} catch (error) { errors.push(error.message); console.error(error); }
finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ checks, transcripts, captures, errors }, null, 2));
  await browser.close();
}
const fails = checks.filter(check => !check.ok).length + errors.length;
console.log(`fails=${fails}`);
process.exitCode = fails ? 1 : 0;
