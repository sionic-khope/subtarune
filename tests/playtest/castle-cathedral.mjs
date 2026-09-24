import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'castle-cathedral', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const cathedral = 'gajaeman_castle_cathedral';
  const observations = { approaches: [], timing: null, bindings: [], framing: [] };
  const key = async code => { await press(code, { delay: 40 }); await page.waitForTimeout(90); };
  const ready = () => until(() => game.state === 'field' && !game.dialogue.running && !game.transitioning && game.fade.alpha < 0.01, 30000);
  const state = () => page.evaluate(() => ({ map: game.mapId, xy: [game.player.x, game.player.y],
    party: [...game.party], hp: ['hyungsub', ...game.party].map(id => [id, game.hpOf(id)]),
    inventory: game.inventory, blocked: game.map.solidRect(game.player.x, game.player.y, game.player.w, game.player.h),
    camera: [game.camera.x, game.camera.y], zoom: game.zoom.s, dialogue: game.dialogue.running,
    chase: !!game.castleDarkChase, dark: !!game.castleDarkPath, bgm: game.sound.bgmName,
    followers: game.entities.filter(e => e.def?.type === 'follower').map(e => ({ id: e.id, xy: [e.x, e.y], sheet: !!e.sprite })) }));
  const walk = async (code, predicate, label, timeout = 15000) => {
    await page.keyboard.down(code);
    try { assert.ok(await until(predicate, timeout), label); }
    finally { await page.keyboard.up(code); }
  };
  const hold = async (code, ms) => {
    await page.keyboard.down(code);
    try { await page.waitForTimeout(ms); }
    finally { await page.keyboard.up(code); }
  };
  const partyFraming = async label => {
    const bounds = await page.evaluate(async () => {
      const { CHAR_SCALE } = await import('./src/world/world.js');
      return [game.player, ...game.entities.filter(e => e.def?.type === 'follower')].map(e => ({
        id: e.id, top: e.y + e.h - Math.round(e.sprite.fh / e.sprite.px * CHAR_SCALE * (e.def.visualScale || 1)) - game.camera.y,
        bottom: e.y + e.h - game.camera.y, fallback: !!e.sprite.fallback,
      }));
    });
    observations.framing.push({ label, bounds });
    check(`${label} keeps three decoded party sprites inside the frame`, bounds.length === 3 && bounds.every(e => e.top >= -1 && e.bottom <= 361 && !e.fallback), JSON.stringify(bounds));
  };
  const saveEvidence = async () => {
    observations.samples = await page.evaluate(() => window.__cathedralQA?.samples || []);
    fs.writeFileSync(path.join(process.env.SHOT_DIR, 'observations.json'), JSON.stringify(observations, null, 2));
  };
  const bindSources = async () => {
    const map = JSON.parse(fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, `assets/maps/${cathedral}.json`)));
    const files = new Set(['index.html', 'src/data/build.js', 'src/main.js', 'src/core/story.js', 'src/core/input.js',
      'src/world/world.js', 'src/world/tiles.js', 'src/data/scripts.js', 'src/data/cutscenes/castle_dark_chase.js',
      'assets/maps/gajaeman_castle_dark_refuge.json', `assets/maps/${cathedral}.json`,
      ...['floor', 'steps', 'edge_left', 'edge_right'].map(name => `assets/tiles/castle321_${name}.png`),
      ...(map.preload || []), ...map.entities.map(e => e.image).filter(Boolean)]);
    for (const file of files) {
      const local = fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, file));
      const response = await page.request.get(new URL(file, process.env.QA_BASE_URL).href);
      const remote = Buffer.from(await response.body());
      const hash = crypto.createHash('sha256').update(local).digest('hex');
      observations.bindings.push({ file, hash, status: response.status(), equal: local.equals(remote) });
      check(`served source ${file}`, response.ok() && local.equals(remote), hash);
    }
  };
  await page.setViewportSize({ width: 1280, height: 900 });
  await bindSources();
  await open({ qa: 'castle_dark_refuge' });
  assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_dark_refuge' && !game.transitioning, 30000));
  for (const text of ['* 와 겨우 나왔네요 ㅈ될뻔', '* 후.. 저 앞에 문이 있네', '* 얼른 가보죠']) {
    assert.ok(await until(() => game.textbox.isOpen && game.textbox.state === 'waiting', 10000));
    check('refuge arrival dialogue precedes cathedral gate traversal', await page.evaluate(expected => game.textbox.node.text === expected, text), text);
    await key('KeyC');
  }
  assert.ok(await ready());
  await fixture('read-only-frame-observer', 'Wrap completed production draws to record actual positions, fade, camera, HP and dialogue. No movement, clocks, input or story flags are injected.', () => {
    const q = window.__cathedralQA = { samples: [] }, draw = game.draw.bind(game);
    game.draw = (...args) => {
      const result = draw(...args);
      if (!q.samples.length || performance.now() - q.samples.at(-1).at > 60) q.samples.push({ at: performance.now(), map: game.mapId,
        xy: [game.player.x, game.player.y], camera: [game.camera.x, game.camera.y], fade: game.fade.alpha,
        hp: ['hyungsub', ...game.party].map(id => [id, game.hpOf(id)]), dialogue: game.dialogue.running });
      return result;
    };
  });
  await fixture('wounded-party-preservation', 'Set each party member below full HP once before the gate to make unintended healing/damage observable. All traversal and saving thereafter uses real keyboard input.', () => {
    for (const id of ['hyungsub', ...game.party]) game.partyHp[id] = game.maxHpOf(id) - 23;
  });
  const initial = await state();
  await walk('ArrowUp', () => game.player.y <= 324, 'center approach to closed gate');
  await hold('ArrowUp', 500);
  const atGate = await state(); await shot('refuge-closed-gate');
  check('closed gate stops real upward approach until C', atGate.map === 'gajaeman_castle_dark_refuge' && atGate.xy[1] >= 319 && !atGate.dialogue);
  await key('KeyC');
  assert.ok(await until(() => game.mapId === 'gajaeman_castle_cathedral', 10000)); assert.ok(await ready());
  const entry = await state(); await shot('entry-1280'); await partyFraming('landing');
  check('C enters safe cathedral landing with intact party and HP', entry.party.length === 2 && entry.followers.length === 2 && !entry.blocked && !entry.chase && !entry.dark && JSON.stringify(entry.hp) === JSON.stringify(initial.hp));
  check('gate transition includes black fade and adds no dialogue', await page.evaluate(() => window.__cathedralQA.samples.some(s => s.fade > 0.95) && window.__cathedralQA.samples.every(s => !s.dialogue)));
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(100); await shot(`entry-${width}`);
    check(`entry canvas fits ${width}px viewport`, await page.evaluate(() => { const r = game.canvas.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }));
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await walk('ArrowUp', () => game.player.y <= 7612, 'walk landing to stairs');
  await partyFraming('stairs-immediate'); await page.waitForTimeout(600);
  await shot('stairs'); await partyFraming('stairs-settled');
  await page.keyboard.down('KeyX');
  try {
    await walk('ArrowUp', () => game.player.y <= 7552, 'reach start of long aisle at slow speed');
    const begin = await state(), started = Date.now();
    await page.keyboard.down('ArrowUp');
    try {
      assert.ok(await until(() => game.player.y <= 4064, 40000), 'slow walk reaches middle');
      await shot('aisle-middle');
      const reached = await until(() => game.player.y <= 68, 40000);
      if (!reached) { await shot('north-traversal-failure'); await saveEvidence(); }
      assert.ok(reached, `slow walk reaches open north edge: ${JSON.stringify(await state())}`);
    } finally { await page.keyboard.up('ArrowUp'); }
    const end = await state(), ms = Date.now() - started;
    observations.timing = { start: begin.xy, end: end.xy, milliseconds: ms, pixelsPerSecond: (begin.xy[1] - end.xy[1]) / (ms / 1000) };
    check('full aisle takes about one minute with real X plus Up', ms >= 58000 && ms <= 64000, JSON.stringify(observations.timing));
  } finally { await page.keyboard.up('KeyX'); }
  await hold('ArrowUp', 600); await shot('north-open-edge'); await partyFraming('north end');
  check('open north passage stops safely without an invented next scene', (await state()).map === cathedral && (await state()).xy[1] >= 64 && (await state()).xy[1] <= 68 && !(await state()).dialogue);
  await walk('ArrowDown', () => game.player.y >= 3864, 'default speed return to middle', 25000);
  await hold('ArrowLeft', 1100); const left = await state();
  await hold('ArrowRight', 1500); const right = await state();
  check('all three lanes are traversable and both outer edges block', left.xy[0] >= 287 && left.xy[0] < 292 && right.xy[0] > 452 && right.xy[0] <= 456.1 && !left.blocked && !right.blocked, JSON.stringify({ left: left.xy, right: right.xy }));
  await walk('ArrowLeft', () => game.player.x <= 374, 'return center lane'); await shot('three-lane-middle');
  const beforeContinue = await state();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(game.constructor.SAVE_KEY)));
  await key('Escape'); assert.ok(await until(() => game.state === 'title' && game.title.phase === 'wait', 10000));
  await key('Space'); assert.ok(await until(() => game.title.phase === 'zoom', 5000));
  await key('KeyC'); assert.ok(await until(() => game.title.phase === 'locked' && game.title.time > 3.05, 5000));
  await key('KeyC'); assert.ok(await until(() => game.state === 'field', 20000)); assert.ok(await ready());
  const continued = await state();
  observations.continue = { before: beforeContinue, saved: { map: saved.map, x: saved.x, y: saved.y, party: saved.party, partyHp: saved.partyHp }, after: continued };
  check('Escape Continue restores saved cathedral checkpoint with party HP and inventory', continued.map === cathedral && continued.map === saved.map && Math.hypot(continued.xy[0] - saved.x, continued.xy[1] - saved.y) < 1 && JSON.stringify(continued.hp) === JSON.stringify(initial.hp) && JSON.stringify(continued.party) === JSON.stringify(initial.party) && JSON.stringify(continued.inventory) === JSON.stringify(initial.inventory) && !continued.blocked, JSON.stringify(observations.continue));
  await walk('ArrowDown', () => game.mapId === 'gajaeman_castle_dark_refuge', 'return through south opening', 25000); assert.ok(await ready()); await shot('refuge-return');
  const returned = await state(); await page.waitForTimeout(800);
  check('south return is safe and stable without a transition loop', returned.map === 'gajaeman_castle_dark_refuge' && (await state()).map === returned.map && !returned.blocked && JSON.stringify(returned.hp) === JSON.stringify(initial.hp));
  for (const side of ['left', 'right']) {
    await walk('ArrowDown', () => game.player.y >= 368, `${side} approach backs away from door`);
    await walk(side === 'left' ? 'ArrowLeft' : 'ArrowRight', side === 'left' ? () => game.player.x <= 308 : () => game.player.x >= 436, `${side} approach offset`);
    await walk('ArrowUp', () => game.player.y <= 324, `${side} approach reaches closed gate`); await hold('ArrowUp', 350);
    const before = await state(); await key('KeyC');
    assert.ok(await until(() => game.mapId === 'gajaeman_castle_cathedral', 10000), `${side} C activates gate`); assert.ok(await ready());
    observations.approaches.push({ side, before, after: await state() });
    check(`${side} end approach C enters safely with preserved HP`, !(await state()).blocked && JSON.stringify((await state()).hp) === JSON.stringify(initial.hp));
    await walk('ArrowDown', () => game.mapId === 'gajaeman_castle_dark_refuge', `${side} return to refuge`); assert.ok(await ready());
  }
  check('cathedral traversal does not invent hazards damage or dialogue', await page.evaluate(() => {
    const samples = window.__cathedralQA.samples.filter(s => s.map === 'gajaeman_castle_cathedral' && s.fade < 0.01);
    return samples.length > 500 && samples.every(s => !s.dialogue && JSON.stringify(s.hp) === JSON.stringify(samples[0].hp));
  }));
  await saveEvidence();
});
