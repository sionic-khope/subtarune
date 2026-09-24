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
  assert.ok(await until(() => game.mapId === 'gajaeman_castle_cathedral', 10000));
  // BUILD323: 대성당 입장은 사용자 지정 연출로 시작한다. 긴 회랑 보행·검 회피는 castle-cathedral-climb 이 검사한다.
  const firstLine = () => until(() => game.textbox.isOpen && game.textbox.state === 'waiting' && game.textbox.node?.text === '* 여긴 어딜까요', 20000);
  assert.ok(await firstLine(), 'intro first line');
  const entry = await state(); await shot('entry-1280'); await partyFraming('landing');
  check('C enters the cathedral, party walks in and the intro starts with HP intact', entry.party.length === 2 && entry.followers.length === 2 && !entry.blocked && !entry.chase && !entry.dark && entry.dialogue && JSON.stringify(entry.hp) === JSON.stringify(initial.hp), JSON.stringify(entry));
  check('gate transition includes black fade', await page.evaluate(() => window.__cathedralQA.samples.some(s => s.fade > 0.95)));
  check('walk-in is silent until the laugh', !entry.bgm, entry.bgm);
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(100); await shot(`entry-${width}`);
    check(`entry canvas fits ${width}px viewport`, await page.evaluate(() => { const r = game.canvas.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }));
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  // 연출 도중 타이틀 → 이어하기: 완료 단계가 없으므로 입장 연출을 처음부터 다시 본다.
  await key('Escape'); assert.ok(await until(() => game.state === 'title' && game.title.phase === 'wait', 10000));
  await key('Space'); assert.ok(await until(() => game.title.phase === 'zoom', 5000));
  await key('KeyC'); assert.ok(await until(() => game.title.phase === 'locked' && game.title.time > 3.05, 5000));
  await key('KeyC'); assert.ok(await until(() => game.state === 'field', 20000));
  assert.ok(await firstLine(), 'intro replays after an interrupted entry');
  const continued = await state();
  check('interrupted intro resumes safely in the cathedral with the same HP', continued.map === cathedral && !continued.blocked && JSON.stringify(continued.hp) === JSON.stringify(initial.hp) && !(await page.evaluate(() => game.flags.castle_cathedral_climb)), JSON.stringify(continued));
  await saveEvidence();
});
