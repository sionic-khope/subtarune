import { chromium } from 'playwright-core';
import fs from 'node:fs';

const base = process.env.BASE_URL || 'http://localhost:8000';
const shots = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname;
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const errors = [], lines = [], captures = new Set();
let fails = 0;
const check = (name, ok, data = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, data); if (!ok) fails++; };
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && !/404/.test(m.text())) errors.push(m.text()); });
try {
  await page.goto(`${base}/index.html?qa=obj4`);
  await page.waitForFunction(() => window.game?.player && game.entities, { timeout: 20000 });
  await page.keyboard.press('KeyX');
  await page.waitForTimeout(300);
  check('grub is absent before its dialogue entrance', await page.evaluate(() => game.entities.find((e) => e.id === 'voidgrub')?.visible === false));
  await page.evaluate(() => {
    window.baronEvidence = { roar: new Set(), emerge: [], flies: {}, sounds: [], puff: false, grubClose: false, prepare: null, erupted: null };
    const sound = game.sound.sfx.bind(game.sound);
    game.sound.sfx = (id, options) => { baronEvidence.sounds.push(id); return sound(id, options); };
    window.baronSample = setInterval(() => {
      for (const e of game.entities) {
        if (e.id === 'baron' && !e.visible && game.shake?.amp === 7) baronEvidence.prepare ??= performance.now();
        if (e.id === 'baron' && e.emerge) baronEvidence.erupted ??= performance.now();
        if (e.id === 'baron' && e.motion) baronEvidence.roar.add(e.motion.index);
        if (e.emerge) baronEvidence.emerge.push(e.emerge.progress);
        if (['yongjun', 'cannon_up'].includes(e.id) && e.flyX) baronEvidence.flies[e.id] = Math.max(baronEvidence.flies[e.id] || 0, Math.abs(e.flyX));
      }
      if (game.sparks?.some((p) => p.size)) baronEvidence.puff = true;
      const grub = game.entities.find((e) => e.id === 'voidgrub'), y = game.entities.find((e) => e.id === 'yongjun');
      if (grub && y && game.textbox.node?.text?.includes('너무 힘들다') && Math.abs(grub.x - y.x) < 40) baronEvidence.grubClose = true;
    }, 35);
  });
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => game.dialogue.running, { timeout: 8000 });
  await page.keyboard.up('ArrowUp');
  const start = Date.now();
  while (Date.now() - start < 150000) {
    const s = await page.evaluate(() => ({ running: game.dialogue.running, battle: !!game.battle, state: game.textbox.state, text: game.textbox.node?.text || '', auto: game.textbox.auto,
      emerge: game.entities.find((e) => e.id === 'baron')?.emerge?.progress,
      roar: !!game.entities.find((e) => e.id === 'baron')?.motion,
      charge: game.zoom.s > 2, fly: game.entities.some((e) => Math.abs(e.flyX || 0) > 70), puff: !!game.sparks?.some((p) => p.size) }));
    if (!s.running || s.battle) break;
    if (['typing', 'waiting'].includes(s.state) && s.text && lines.at(-1) !== s.text) lines.push(s.text);
    for (const [label, active] of [['opening', s.text.includes('다 왔다') && s.state === 'waiting'], ['challenge', s.text.includes('바론 버스트') && s.state === 'waiting'], ['rise', s.emerge > 0.25 && s.emerge < 0.8], ['roar', s.roar], ['charge', s.charge], ['puff', s.puff], ['fly', s.fly]]) {
      if (active && !captures.has(label)) { captures.add(label); await page.screenshot({ path: `${shots}/obj4_${label}.png` }); }
    }
    if (s.state === 'waiting' && s.auto === null) await page.keyboard.press('KeyC');
    await page.waitForTimeout(55);
  }
  const result = await page.evaluate(() => {
    clearInterval(baronSample);
    return { done: game.flags.obj4_baron_done, battle: !!game.battle, running: game.dialogue.running, zoom: game.zoom.s,
      entities: game.entities.filter((e) => !e.dead).map((e) => e.id), evidence: { ...baronEvidence, roar: [...baronEvidence.roar] } };
  });
  check('challenge hands off to Baron battle with intro completion flag', result.done && result.battle && result.running, JSON.stringify(result));
  check('final dialogue is exact requested challenge', lines.at(-1) === '* 바론 버스트다 씨발새끼 들어와', JSON.stringify(lines));
  check('Baron rises through ground and all four roar frames play', result.evidence.emerge.some((n) => n > 0.2 && n < 0.8) && result.evidence.roar.length === 4);
  check('grub reaches Yongjun during tired dialogue', result.evidence.grubClose);
  check('cannon single puff and both actors visibly fling', result.evidence.puff && result.evidence.flies.yongjun > 100 && result.evidence.flies.cannon_up > 100);
  check('three audible roars and one charge/puff', ['baron_roar', 'cannon_charge', 'cannon_puff'].map((id) => result.evidence.sounds.filter((s) => s === id).length).join() === '3,1,1');
  const pause = result.evidence.erupted - result.evidence.prepare;
  check('three seconds of shaking before Baron becomes visible', pause >= 2900 && pause <= 3400, `${pause}ms`);
  check('Baron strike uses its own sound, not party sword', result.evidence.sounds.includes('baron_slam') && !result.evidence.sounds.includes('hit'));
  await page.waitForFunction(() => game.battle?.state === 'intro' && game.fade.alpha < 0.1);
  await page.screenshot({ path: `${shots}/obj4_battle_entry.png` });
  check('battle starts at HP100 with selected music and native modes', await page.evaluate(() => game.battle.enemies[0].hp === 100 && game.battle.cfg.bgm === 'baron_battle' && game.battle.modes.attack === 'rush' && game.battle.modes.enemy === 'bullets'));
  check('no console or page errors', errors.length === 0, JSON.stringify(errors));
} finally { if (errors.length) console.log('browser errors', errors); await browser.close(); }
console.log(`fails=${fails}`);
process.exitCode = fails ? 1 : 0;
