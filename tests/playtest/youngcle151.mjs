import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/youngcle151-playtest';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
const checks = [];
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const check = (name, pass, detail) => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail)}`);
};
const shot = async name => {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: path.join(shots, `${name}.png`) });
};

try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:8799');
  await page.waitForFunction(() => window.game?.title);
  await page.evaluate(async () => {
    const { QA_POINTS } = await import('/src/core/story.js');
    game.devJump(QA_POINTS.find(point => point.id === 'youngcle6'));
    game.settings.textSpeed = 2;
  });
  await page.waitForFunction(() => game.mapId === 'youngcle6' && game.dialogue.running);
  const entry = await page.evaluate(() => ({
    gallery: ['warm_bidet', 'mini_mario', 'lucky_guy', 'park_guardian_costume'].map(id => {
      const actor = game.entities.find(entity => entity.id === id);
      return [id, actor?.visible, actor?.solid];
    }),
    cast: ['youngcle6_junhee', 'youngcle6_yongjun'].map(id => !!game.entities.find(entity => entity.id === id)),
    party: game.party,
  }));
  check('entry hides every lounge gallery NPC and keeps the five-person scene cast',
    entry.gallery.every(([, visible, solid]) => visible === false && solid === false)
      && entry.cast.every(Boolean) && JSON.stringify(entry.party) === JSON.stringify(['gyeongsub', 'ppaman']), entry);

  const seen = new Set();
  const lines = [];
  let lastNodeId = null;
  let headbuttReachedTv = false;
  const cageSamples = [];
  const started = Date.now();
  while (Date.now() - started < 30000) {
    const state = await page.evaluate(() => {
      window.__youngcleQaNodes ||= new WeakMap();
      window.__youngcleQaNodeIndex ||= 0;
      const node = game.textbox.node;
      if (node && !window.__youngcleQaNodes.has(node)) window.__youngcleQaNodes.set(node, ++window.__youngcleQaNodeIndex);
      return ({
      done: !!game.flags.youngcle_lounge_plan_b_done,
      running: game.dialogue.running,
      box: game.textbox.state,
      text: node?.text || '',
      nodeId: node ? window.__youngcleQaNodes.get(node) : null,
      expression: game.tvBroadcast?.expression || null,
      cutaway: !!game.youngcleDoorCutaway,
      map: game.mapId,
      cages: game.youngcleCages?.map(cage => ({ y: cage.y, screenY: cage.y - game.camera.y,
        trails: cage.trails.filter(trail => trail.life > 0).map(trail => ({ y: trail.y, life: trail.life })) })) || null,
      actors: ['youngcle6_junhee', 'youngcle6_yongjun'].map(id => {
        const actor = game.entities.find(entity => entity.id === id);
        return actor ? { id, x: actor.x, y: actor.y, visible: actor.visible,
          jitter: !!actor.jitter, hopY: actor.hopY || 0 } : null;
      }),
      bgm: game.sound.bgmName || null,
      zoom: game.zoom.s,
      fade: game.fade.alpha,
    }); });
    if (state.text && state.nodeId !== lastNodeId) { lines.push(state.text); lastNodeId = state.nodeId; }
    if (!seen.has('entry') && state.text === '* 헉 헉 헉') { seen.add('entry'); await shot('01-entry'); }
    if (!seen.has('headbutt-before') && state.text === '* 이 족같은 영클 에잇' && state.box === 'waiting') {
      seen.add('headbutt-before'); await shot('01b-headbutt-before');
    }
    const junhee = state.actors.find(actor => actor?.id === 'youngcle6_junhee');
    if (junhee?.y < 225) headbuttReachedTv = true;
    if (!seen.has('headbutt-contact') && junhee?.y < 225 && junhee.hopY > 2) {
      seen.add('headbutt-contact'); await shot('01c-headbutt-contact');
    }
    if (!seen.has('headbutt-recoil') && headbuttReachedTv && junhee?.y > 225 && junhee.hopY > 2) {
      seen.add('headbutt-recoil'); await shot('01d-headbutt-recoil');
    }
    if (!seen.has('middle') && state.expression === 'middle_finger') { seen.add('middle'); await shot('02-middle-finger'); }
    if (!seen.has('door') && state.cutaway && state.fade === 0) {
      seen.add('door');
      check('angel-door cutaway keeps the actual lounge map state', state.map === 'youngcle6', state);
      await shot('03-actual-angel-door-cutaway');
    }
    if (state.cages) {
      cageSamples.push(state);
      const trailing = state.cages.every(cage => cage.trails.some(trail => trail.y < cage.y));
      if (!seen.has('trail') && trailing && state.cages.every(cage => cage.screenY > 20)) {
        seen.add('trail'); await shot('04-cages-afterimages');
      }
      if (!seen.has('impact') && state.actors.every(actor => actor?.jitter)) { seen.add('impact'); await shot('05-cages-impact'); }
    }
    if (state.done && !state.running) break;
    if (state.box === 'typing') await page.keyboard.press('KeyX');
    else if (state.box === 'waiting') await page.keyboard.press('KeyC');
    await page.waitForTimeout(45);
  }
  const complete = await page.evaluate(() => ({
    done: game.flags.youngcle_lounge_plan_b_done,
    tv: game.tvBroadcast,
    cutaway: game.youngcleDoorCutaway,
    cages: game.youngcleCages,
    cast: ['youngcle6_junhee', 'youngcle6_yongjun'].map(id => {
      const actor = game.entities.find(entity => entity.id === id);
      return actor ? { visible: actor.visible, y: actor.y } : null;
    }),
    party: game.party,
    zoom: game.zoom.s,
    camera: game.camera.target === game.player,
    bgm: game.sound.bgmName || null,
  }));
  check('two separate cages trail, impact, and carry both actors below the viewport',
    seen.has('trail') && seen.has('impact') && cageSamples.some(sample => sample.actors.every(actor => actor.y > 360))
      && complete.cast.every(actor => actor && !actor.visible && actor.y > 360),
    { seen: [...seen], sampleCount: cageSamples.length, cast: complete.cast });
  check('final line alone commits completion and restores three-person field state',
    complete.done && complete.tv === null && complete.cutaway === null && complete.cages === null
      && complete.zoom === 1 && complete.camera && complete.bgm === 'youngcle_factory'
      && JSON.stringify(complete.party) === JSON.stringify(['gyeongsub', 'ppaman']), complete);
  check('all 46 requested dialogue nodes reach the final warning including adjacent repeats',
    lines.length === 46 && lines[7] === '* ?' && lines[8] === '* ?'
      && lines[13] === '* ㅇㅇ' && lines[33] === '* ㅇㅇ'
      && lines.at(-1) === '* 다음방이 걱정되는데 난..', lines);
  check('headbutt has visible anticipation contact and recoil frames',
    ['headbutt-before', 'headbutt-contact', 'headbutt-recoil'].every(key => seen.has(key)), [...seen]);
  await shot('06-complete');

  await page.evaluate(async () => {
    const { QA_POINTS } = await import('/src/core/story.js');
    game.devJump(QA_POINTS.find(point => point.id === 'youngcle6_after_plan_b'));
  });
  await page.waitForFunction(() => game.mapId === 'youngcle6' && !game.transitioning && !game.dialogue.running);
  const reentry = await page.evaluate(() => ({
    abducted: ['youngcle6_junhee', 'youngcle6_yongjun'].map(id => !!game.entities.find(entity => entity.id === id)),
    effects: [game.tvBroadcast, game.youngcleDoorCutaway, game.youngcleCages],
    party: game.party, attack: game.attack, hpBonus: game.hpBonus,
  }));
  check('completed QA reentry does not replay or respawn abducted actors and preserves upgrades',
    reentry.abducted.every(value => !value) && reentry.effects.every(value => value === null)
      && reentry.attack === 3 && reentry.hpBonus === 40
      && JSON.stringify(reentry.party) === JSON.stringify(['gyeongsub', 'ppaman']), reentry);
  await shot('07-completed-reentry');
  check('no runtime errors', errors.length === 0, errors);
} finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ checks, errors }, null, 2));
  await browser.close();
}
const failures = checks.filter(result => !result.pass).length + errors.length;
console.log(`fails=${failures}`);
process.exitCode = failures ? 1 : 0;
