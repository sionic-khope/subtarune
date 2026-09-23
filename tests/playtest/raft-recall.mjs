import { runScenario } from './lib/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

await runScenario({ name: 'raft-recall', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const root = process.env.QA_SOURCE_ROOT;
  if (!root) throw new Error('QA_SOURCE_ROOT must identify the served checkout');
  const maps = fs.readdirSync(path.join(root, 'assets/maps')).filter(name => name.endsWith('.json')).map(name => {
    const map = JSON.parse(fs.readFileSync(path.join(root, 'assets/maps', name)));
    return { ...map, file: `assets/maps/${name}` };
  }).filter(map => map.entities?.some(e => e.type === 'raft' && e.id !== 'maillard_cart'));
  const cases = maps.flatMap(map => map.entities.filter(e => e.type === 'raft_recall').map(lever => ({ map: map.id, lever })));
  const raftCount = maps.flatMap(map => map.entities.filter(e => e.type === 'raft' && e.id !== 'maillard_cart')).length;
  check('authored scope has twenty-five actual rafts and forty-nine bank levers', raftCount === 25 && cases.length === 49, JSON.stringify({ raftCount, levers: cases.length }));
  if (cases.length !== 49) return;
  const evidence = { disclosure: 'Each map is prepared with its prerequisite story stage, completed local trigger/enter flags, no party, and the target raft at the opposite endpoint. A nearby collision-free bank approach is positioned; arrows and C then use production input. Recall itself must not change any story/tutorial flags. This is local accessibility/recall verification, not complete river traversal or natural whole-game progression. Fresh teal5 and void8 QA checkpoints separately test original first-board tutorials.', bindings: [], banks: [], tutorials: [] };
  const save = () => fs.writeFileSync(path.join(process.env.SHOT_DIR, 'raft-recall-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const sources = ['src/world/world.js', 'src/main.js', 'src/core/story.js', 'assets/props/raft_call_lever_off.png', 'assets/props/raft_call_lever_on.png', 'assets/maps/youngcle15.json', ...maps.map(map => map.file)];
  for (const relative of sources) {
    const response = await page.request.get(new URL(relative, process.env.QA_BASE_URL).href);
    const local = hash(fs.readFileSync(path.join(root, relative))), served = hash(await response.body());
    evidence.bindings.push({ relative, local, served });
    check(`served source ${relative}`, response.ok() && local === served);
  }
  const field = () => until(() => game.state === 'field' && !game.dialogue.running && !game.transitioning && game.fade.alpha < 0.01, 20000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await open({ qa: 'raft' });
  if (!await field()) throw new Error('initial raft checkpoint did not reach field');
  await fixture('recall-render-observer', 'Observe actual completed draw frames, active lever PNG, saves and effects without modifying input or animation clocks.', () => {
    const q = window.__recallQA = { saves: 0, audio: [], active: {}, current: null };
    const originalSave = game.autosave.bind(game), originalSfx = game.sound.sfx.bind(game.sound), originalDraw = game.draw.bind(game);
    game.autosave = (...args) => { q.saves++; return originalSave(...args); };
    game.sound.sfx = (name, options) => { q.audio.push(name); return originalSfx(name, options); };
    game.draw = (...args) => {
      const result = originalDraw(...args), lever = game.entities.find(e => e.id === q.current && !e.dead);
      if (lever?.pulled > 0 && !q.active[`${game.mapId}-${lever.id}`]) q.active[`${game.mapId}-${lever.id}`] = {
        imageOn: lever.image === game.propImages[lever.def.imageOn], pulled: lever.pulled,
        data: game.canvas.toDataURL('image/png'), x: lever.drawX, y: lever.drawY,
      };
      return result;
    };
  });
  const prepareMap = async mapId => fixture(`map-${mapId}`, 'Prepare map prerequisites and completed local enter/trigger events; retain all authored static geometry and props. No raft boarding/arrival tutorial flag is set here.', async mapId => {
    const { MAPS } = await import('./src/data/maps.js');
    const def = MAPS[mapId];
    game.resetState(); game.state = 'field';
    if (def.stage) game.story.advance(def.stage);
    if (def.enter?.flag) game.flags[def.enter.flag] = true;
    for (const e of def.entities) if (e.type === 'trigger' && e.flag) game.flags[e.flag] = true;
    await game.changeMap(mapId, Object.keys(def.spawns)[0], true, { enter: false, bgm: false });
    game.fadeTo(0, 0); game.camera.target = game.player; game.camera.locked = null; game.camera.snap();
    game.zoom = { s: 1, at: null, tween: null };
    window.__recallQA.current = null;
    return { flags: { ...game.flags }, spawn: game.entrySpawn };
  }, mapId);
  const prepareBank = async (mapId, leverId) => fixture(`bank-${mapId}-${leverId}`, 'Place only the target raft at the opposite endpoint and the player at a locally reachable solid-bank approach. Search checks every 2px of the short approach against terrain, solid props and doors, then actual arrows enter the C probe.', ({ leverId }) => {
    const lever = game.entities.find(e => e.id === leverId && !e.dead), raft = game.entities.find(e => e.id === lever.def.raft && !e.dead), player = game.player;
    const endpoint = lever.def.endpoint === 'start' ? 0 : raft.route.length - 1, opposite = endpoint ? 0 : raft.route.length - 1;
    raft.at = opposite; raft.setPos(raft.route[opposite]); game.flags[raft.flagKey] = opposite;
    const overlap = (x, y, e) => x < e.x + e.w && x + player.w > e.x && y < e.y + e.h && y + player.h > e.y;
    const free = (x, y) => !game.map.solidRect(x, y, player.w, player.h) && !game.entities.some(e => e !== player && !e.dead && e.visible && (e.solid || e.def.type === 'door') && overlap(x, y, e));
    const directions = [
      { key: 'ArrowDown', facing: 'down', dx: 0, dy: 1, x: lever.x + lever.w / 2 - player.w / 2, y: lever.y - player.h - 1 },
      { key: 'ArrowRight', facing: 'right', dx: 1, dy: 0, x: lever.x - player.w - 1, y: lever.y + lever.h / 2 - player.h / 2 },
      { key: 'ArrowLeft', facing: 'left', dx: -1, dy: 0, x: lever.x + lever.w + 1, y: lever.y + lever.h / 2 - player.h / 2 },
      { key: 'ArrowUp', facing: 'up', dx: 0, dy: -1, x: lever.x + lever.w / 2 - player.w / 2, y: lever.y + lever.h + 1 },
    ];
    let approach = null;
    for (const distance of [32, 24, 16, 8]) {
      for (const direction of directions) {
        let valid = true;
        for (let step = 0; step <= distance; step += 2) if (!free(direction.x - direction.dx * step, direction.y - direction.dy * step)) { valid = false; break; }
        if (!valid) continue;
        Object.assign(player, { x: direction.x, y: direction.y, facing: direction.facing });
        if (player.probe()?.id !== leverId) continue;
        approach = { ...direction, distance, x: direction.x - direction.dx * distance, y: direction.y - direction.dy * distance }; break;
      }
      if (approach) break;
    }
    if (!approach) return { error: 'No solid bank approach reaches this lever as the first C target', lever: lever.def, raft: { x: raft.x, y: raft.y, route: raft.route } };
    Object.assign(player, { x: approach.x, y: approach.y, facing: approach.facing }); player.trail = [];
    game.camera.snap(); window.__recallQA.current = leverId;
    game.autosave();
    const targetRect = { x: raft.route[endpoint][0], y: raft.route[endpoint][1], w: raft.w, h: raft.h };
    const blockers = game.entities.filter(e => e !== raft && !e.dead && e.visible && e.solid && e.overlaps(targetRect)).map(e => e.id || e.def.type);
    return { approach, endpoint, opposite, target: raft.route[endpoint], flagKey: raft.flagKey, blockers,
      flags: { ...game.flags }, map: game.mapId, player: [player.x, player.y], loaded: !!lever.image && !!game.propImages[lever.def.imageOn],
      raftId: raft.id, route: raft.route, lava: !!raft.def.lava, saves: window.__recallQA.saves };
  }, { leverId });
  let previousMap = null;
  for (const { map, lever } of cases) {
    if (previousMap !== map) { await prepareMap(map); if (!await field()) throw new Error(`${map} fixture failed`); previousMap = map; }
    const bank = { map, lever: lever.id, setup: await prepareBank(map, lever.id) };
    evidence.banks.push(bank); save();
    const label = `${map}-${lever.id}`;
    check(`${label} clear solid-bank approach and free destination`, !bank.setup.error && bank.setup.loaded && bank.setup.blockers.length === 0, JSON.stringify(bank.setup.error || bank.setup.blockers));
    if (bank.setup.error || bank.setup.blockers.length) continue;
    await page.waitForTimeout(90); await shot(`${label}-placement`);
    await page.keyboard.down(bank.setup.approach.key);
    const reached = await until(() => game.player.probe()?.id === window.__recallQA.current, 2000);
    await page.keyboard.up(bank.setup.approach.key);
    check(`${label} actual walking reaches lever C target`, reached && await page.evaluate(start => Math.hypot(game.player.x - start[0], game.player.y - start[1]) > 1, bank.setup.player));
    await page.waitForTimeout(90);
    bank.before = await page.evaluate(() => ({ player: [game.player.x, game.player.y], flags: { ...game.flags }, saves: window.__recallQA.saves }));
    await press('KeyC', { delay: 45 });
    await page.waitForTimeout(90);
    bank.after = await page.evaluate(({ leverId, raftId }) => {
      const lever = game.entities.find(e => e.id === leverId), raft = game.entities.find(e => e.id === raftId);
      return { at: raft.at, x: raft.x, y: raft.y, flags: { ...game.flags }, player: [game.player.x, game.player.y], saves: window.__recallQA.saves,
        saved: JSON.parse(localStorage.getItem('subtarune.save.v1')), ride: !!game.ride, dialogue: game.dialogue.running,
        active: window.__recallQA.active[`${game.mapId}-${leverId}`], audio: window.__recallQA.audio.slice(-2), imageOn: lever.image === game.propImages[lever.def.imageOn] };
    }, { leverId: lever.id, raftId: bank.setup.raftId });
    const expectedFlags = { ...bank.before.flags, [bank.setup.flagKey]: bank.setup.endpoint };
    check(`${label} real C recalls exactly the requested endpoint`, bank.after.at === bank.setup.endpoint && bank.after.x === bank.setup.target[0] && bank.after.y === bank.setup.target[1] && !bank.after.ride && !bank.after.dialogue);
    check(`${label} only raft flag changes and player stays on bank`, JSON.stringify(bank.after.flags) === JSON.stringify(expectedFlags) && JSON.stringify(bank.after.player) === JSON.stringify(bank.before.player));
    check(`${label} active PNG and effects render once`, bank.after.active?.imageOn && bank.after.active.pulled > 0 && bank.after.audio.includes('click') && bank.after.audio.includes(bank.setup.lava ? 'sizzle' : 'splash'));
    if (bank.after.active?.data) {
      fs.writeFileSync(path.join(process.env.SHOT_DIR, `${label}-active.png`), Buffer.from(bank.after.active.data.split(',')[1], 'base64'));
      delete bank.after.active.data;
    }
    check(`${label} recall automatically persists endpoint`, bank.after.saves === bank.before.saves + 1 && bank.after.saved?.flags[bank.setup.flagKey] === bank.setup.endpoint && bank.after.saved.map === map);
    await page.waitForTimeout(300);
    for (let i = 0; i < 3; i++) { await press('KeyC', { delay: 25 }); await page.waitForTimeout(35); }
    check(`${label} repeated C neither moves nor saves again`, await page.evaluate(({ raftId, endpoint, saves }) => game.entities.find(e => e.id === raftId).at === endpoint && window.__recallQA.saves === saves && !game.ride && !game.dialogue.running, { raftId: bank.setup.raftId, endpoint: bank.setup.endpoint, saves: bank.after.saves }));
    if (['void2', 'teal5', 'youngcle14'].includes(map) && lever.endpoint === 'start' && !evidence.banks.some(b => b !== bank && b.map === map && b.responsive)) {
      for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 800 }); await shot(`${label}-${width}`); }
      bank.responsive = true;
    }
    await fixture(`reload-${label}`, 'Reload the same authored map without changing persisted flags; this checks Raft constructor restoration after the real recall.', async mapId => { await game.changeMap(mapId, game.entrySpawn, true, { enter: false, bgm: false }); game.fadeTo(0, 0); }, map);
    check(`${label} map reload retains endpoint`, await page.evaluate(({ raftId, endpoint }) => game.entities.find(e => e.id === raftId)?.at === endpoint, { raftId: bank.setup.raftId, endpoint: bank.setup.endpoint }));
    if (bank.responsive) {
      await fixture(`continue-${label}`, 'Load the autosave created by actual C without rewriting its payload or resaving the reloaded map.', () => game.continueGame());
      check(`${label} normal continue restores saved endpoint and usable field`, await field() && await page.evaluate(({ raftId, endpoint }) => game.entities.find(e => e.id === raftId)?.at === endpoint && !game.ride, { raftId: bank.setup.raftId, endpoint: bank.setup.endpoint }));
      await shot(`${label}-continued`);
    }
    save();
  }
  await prepareMap('youngcle14');
  await fixture('lava-east-bank-exit-approach', 'Use the existing top_end spawn after the third lava crossing, then actual ArrowRight must traverse the unchanged open exit to youngcle15.', async () => {
    await game.changeMap('youngcle14', 'top_end', true, { enter: false, bgm: false });
    game.fadeTo(0, 0); game.camera.snap();
  });
  await shot('lava-top-end-exit-before');
  await page.keyboard.down('ArrowRight');
  const exitedLava = await until(() => game.mapId === 'youngcle15' && !game.transitioning, 10000);
  await page.keyboard.up('ArrowRight');
  check('lava top_end bank remains walkable through the real youngcle15 exit', exitedLava);
  await shot('lava-top-end-exit-after');
  evidence.lavaExit = await page.evaluate(() => ({ map: game.mapId, x: game.player.x, y: game.player.y, transitioning: game.transitioning }));
  for (const [qa, mapId, raftId] of [['raft8', 'void8', 'raft8'], ['teal5', 'teal5', 'raft5']]) {
    await open({ qa });
    if (!await field()) throw new Error(`${qa} first-board checkpoint failed`);
    const before = await fixture(`fresh-${qa}-dock`, 'Fresh registered checkpoint preserves original first-board flags. Position on its authored dock; actual C must still start the original tutorial.', async ({ mapId, raftId }) => {
      const { MAPS } = await import('./src/data/maps.js'), raft = game.entities.find(e => e.id === raftId), dock = MAPS[mapId].spawns.dock;
      game.player.x = dock.x; game.player.y = dock.y; game.player.facing = dock.facing || 'right'; game.player.trail = [];
      for (const e of game.entities) if (e.def.type === 'follower') e.snapBehind();
      game.camera.snap();
      return { flag: raft.def.onBoardFlag || `${raft.id}_boarded`, wasBoarded: !!game.flags[raft.def.onBoardFlag || `${raft.id}_boarded`], probe: game.player.probe()?.id, onBoard: raft.def.onBoard };
    }, { mapId, raftId });
    check(`${qa} original raft C probe remains clear of new levers`, before.probe === raftId && !before.wasBoarded, JSON.stringify(before));
    await press('KeyC', { delay: 60 });
    check(`${qa} first C starts original boarding tutorial`, await until(() => game.dialogue.running && !!game.ride, 3000));
    await page.waitForTimeout(300); await shot(`${qa}-original-first-board`);
    evidence.tutorials.push({ qa, before, after: await page.evaluate(flag => ({ boarded: game.flags[flag], text: game.textbox.node?.text, moving: game.ride?.moving, map: game.mapId }), before.flag) });
  }
  evidence.afterBindings = sources.map(relative => ({ relative, hash: hash(fs.readFileSync(path.join(root, relative))) }));
  check('all forty-nine authored levers were tested', evidence.banks.length === 49 && evidence.banks.every(bank => bank.after));
  check('bound runtime maps and assets stayed unchanged throughout QA', evidence.afterBindings.every(source => evidence.bindings.find(binding => binding.relative === source.relative).local === source.hash));
  save();
});
