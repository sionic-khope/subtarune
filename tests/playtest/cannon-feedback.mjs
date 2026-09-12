// Focused FX check: explicit mode-entry fixture, real C/arrows and real clock afterward.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const dir = process.env.SHOT_DIR || '/tmp/cannon-feedback98';
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [], captures = [], checks = [];
page.on('pageerror', e => errors.push(e.message));
const check = (name, ok, detail) => { checks.push({ name, ok, detail }); assert.ok(ok, name); };
const until = fn => page.waitForFunction(fn, null, { timeout: 20000 });
const press = key => page.keyboard.press(key, { delay: 55 });
async function capture(name) {
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file });
  captures.push({ file, viewport: page.viewportSize(), mode: await page.evaluate(() => game.battle.gimmick.snapshot) });
}
try {
  await page.addInitScript(() => {
    window.feedbackAudio = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      const src = this.currentSrc || this.src;
      const result = play.apply(this, args);
      if (/cannon_guard_(breath|block)/.test(src)) {
        result.then(() => feedbackAudio.push({ src, played: true }), e => feedbackAudio.push({ src, played: false, error: e.message }));
      }
      return result;
    };
  });
  await page.goto(`${process.env.BASE_URL || 'http://localhost:8000'}/?qa=obj4_battle`);
  await until(() => !!window.game?.player);
  await press('KeyX');
  await until(() => !game.transitioning && game.fade.alpha < 0.1);
  await page.waitForTimeout(500);
  await page.keyboard.down('ArrowUp');
  await until(() => game.battle?.state === 'menu');
  await page.keyboard.up('ArrowUp');
  await page.evaluate(async () => {
    const b = game.battle;
    window.feedbackEvents = [];
    const sfx = b.sfx.bind(b);
    b.sfx = name => { feedbackEvents.push({ name, elapsed: b.gimmick?.snapshot.elapsed, phaseTime: b.gimmick?.snapshot.phaseTime }); return sfx(name); };
    const { createCannonGuard } = await import('/src/battle/modes/cannon-guard.js');
    b.state = 'act'; b.cur = { gimmick: true }; b.setText('');
    b.gimmick = createCannonGuard(b, { target: b.enemies[0] });
  });
  await until(() => game.battle.gimmick.snapshot.phase === 'charge-dialogue' && game.battle.typed);
  await press('KeyC');
  await until(() => game.battle.gimmick.snapshot.phase === 'controls-dialogue' && game.battle.typed);
  await press('KeyC');
  const marks = new Set();
  while (await page.evaluate(() => ['guard', 'focus'].includes(game.battle.gimmick.snapshot.phase))) {
    const s = await page.evaluate(() => game.battle.gimmick.snapshot);
    const next = s.breaths.find(b => !b.resolved);
    if (next && next.lane !== s.lane) await press(next.lane < s.lane ? 'ArrowUp' : 'ArrowDown');
    for (const [name, at] of [['warning', 0.4], ['mouth_start', 0.8], ['stream_middle', 1.3], ['first_block', 1.82], ['upper_stream', 2.3], ['lower_stream', 3.2]]) {
      if (s.elapsed >= at && !marks.has(name)) { marks.add(name); await capture(name); }
    }
    await page.waitForTimeout(12);
  }
  let s = await page.evaluate(() => game.battle.gimmick.snapshot);
  check('12 real-key blocks reach cannon fire', s.phase === 'fire' && s.blocked === 12, s);
  check('baron HP unchanged before projectile impact', await page.evaluate(() => game.battle.enemies[0].hp === 250));
  await until(() => game.battle.gimmick.snapshot.phaseTime >= 0.7);
  await capture('cannon_flight');
  await until(() => game.battle.gimmick.snapshot.phaseTime >= 1.48);
  await capture('impact_core');
  await until(() => game.battle.gimmick.snapshot.phaseTime >= 1.7);
  await capture('impact_shockwave');
  await until(() => game.battle.gimmick.snapshot.phaseTime >= 2.1);
  await capture('impact_smoke');
  await until(() => game.battle.gimmick.snapshot.phase === 'success-dialogue' && game.battle.typed);
  check('exactly 60 damage applied', await page.evaluate(() => game.battle.enemies[0].hp === 190));
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(100);
    await capture(`settled_${width}`);
  }
  const events = await page.evaluate(() => feedbackEvents);
  const breaths = events.filter(e => e.name === 'cannon_guard_breath');
  const blocks = events.filter(e => e.name === 'cannon_guard_block');
  check('one emission sound for each of12 breaths', breaths.length === 12, breaths);
  check('one success sound for each of12 blocks', blocks.length === 12, blocks);
  check('emission cue starts at actual launch not warning', breaths.every((e, i) => Math.abs(e.elapsed - (0.7 + i * 0.9)) < 0.06), breaths);
  check('block cue follows1.1second travel', blocks.every((e, i) => Math.abs(e.elapsed - breaths[i].elapsed - 1.1) < 0.06), blocks);
  const audio = await page.evaluate(() => feedbackAudio);
  check('all24 media playback promises resolve', audio.length === 24 && audio.every(e => e.played), audio);
  check('no runtime errors', errors.length === 0, errors);
  for (const { file, viewport } of captures) {
    const data = fs.readFileSync(file);
    check(`valid capture ${path.basename(file)}`, data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && data.readUInt32BE(16) === viewport.width && data.readUInt32BE(20) === viewport.height);
  }
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ checks, captures, events, audio, errors, fixture: 'Mode entry only; no guard clock/lane edits; no full fight replay.' }, null, 2));
  console.log(`PASS ${checks.length} checks, ${captures.length} captures; ${dir}`);
} finally { await browser.close(); }
