import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'castle-lobby', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const key = async code => { await press(code, { delay: 45 }); await page.waitForTimeout(110); };
  const field = () => until(() => game.state === 'field' && !game.dialogue.running && !game.transitioning && game.fade.alpha < 0.01, 25000);
  const walk = async (code, predicate, timeout = 15000) => {
    await page.keyboard.down(code);
    try { assert.ok(await until(predicate, timeout), `walk ${code} reaches destination`); }
    finally { await page.keyboard.up(code); }
  };
  const state = () => page.evaluate(() => ({ map: game.mapId, x: game.player.x, y: game.player.y,
    party: [...game.party], inventory: [...game.inventory], money: game.money, hp: { ...game.partyHp },
    seen: !!game.flags.castle_lobby_seen, bgm: game.sound.bgmName, scene: !!game.castleLobby,
    blocked: game.map.solidRect(game.player.x, game.player.y, game.player.w, game.player.h) }));
  const position = (name, x, y) => fixture(name, 'Position near the named interaction for a focused input check; not evidence of walking the intervening route.', ([px, py]) => {
    game.player.x = px; game.player.y = py; game.player.facing = 'up'; game.player.trail = [];
    for (const entity of game.entities) if (entity.def.type === 'follower') entity.snapBehind();
    game.camera.snap();
  }, [x, y]);
  // QA_CASTLE_LOBBY_PHASE=right refreshes corridor evidence without replaying the unchanged intro.
  if (process.env.QA_CASTLE_LOBBY_PHASE === 'right') {
    await open({ qa: 'gajaeman_castle_right1' }); assert.ok(await field());
    check('right checkpoint restores completed party and requested BGM', (await state()).seen && (await state()).party.join() === 'gyeongsub,ppaman' && (await state()).bgm === 'castle_right');
    for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(120); await shot(`right-settled-${width}`); }
    const start = Date.now(); await page.keyboard.down('ArrowUp');
    assert.ok(await until(() => game.player.y < 750, 4000));
    check('right walk plays object loop without water ripples', await page.evaluate(() => !!game.sound.w && !game.sound.w.stopping && game.sound.w.def.ripple === false && !game.ripples?.length));
    await shot('right-middle'); assert.ok(await until(() => game.player.y <= 134, 6000)); await page.keyboard.up('ArrowUp');
    const seconds = (Date.now() - start) / 1000;
    check('right corridor reaches BUILD308 memory door at y128 in about 4.54 seconds', seconds >= 4.3 && seconds <= 5.5, JSON.stringify({ seconds }));
    await shot('right-end'); await walk('ArrowDown', () => game.mapId === 'gajaeman_castle_lobby'); assert.ok(await field()); await page.waitForTimeout(700);
    check('right return is safe without replay or ping-pong', (await state()).map === 'gajaeman_castle_lobby' && (await state()).seen && !(await state()).scene && !(await state()).blocked);
    await shot('right-return'); return;
  }
  await open({ qa: 'gajaeman_castle_approach' });
  assert.ok(await field());
  await position('approach-gate', 372, 549);
  await fixture('read-only-cinematic-observer', 'Record completed Canvas draws, visible text, actual actor positions and audio calls. No clock, story, movement, or completion mutation.', () => {
    const q = window.__castleQA = { samples: [], frames: {}, lines: [], audio: [], interrupts: [], enabled: true };
    const draw = game.draw.bind(game), sfx = game.sound.sfx.bind(game.sound), done = game.textbox._done.bind(game.textbox);
    game.sound.sfx = (name, options) => { q.audio.push({ name, at: performance.now() }); return sfx(name, options); };
    game.textbox._done = (...args) => {
      if (game.textbox.node?.cut === 999) q.interrupts.push(game.textbox._pageTokens().slice(0, game.textbox.revealed).map(t => t.ch).join(''));
      return done(...args);
    };
    game.draw = (...args) => {
      const result = draw(...args); if (!q.enabled) return result;
      const scene = game.castleLobby, box = game.textbox, now = performance.now();
      const text = box.isOpen ? box.node?.text : null;
      const actors = [game.player, ...game.entities.filter(e => e.def.type === 'follower' || ['castle_lobby_youngcle', 'castle_lobby_junhee', 'castle_lobby_gajaeman'].includes(e.id))].map(e => ({
        id: e === game.player ? 'player' : e.id, x: e.x, y: e.y, flyX: e.flyX || 0, flyY: e.flyY || 0,
        spin: e.spin || 0, visible: e.visible, dead: e.dead, facing: e.facing, fallback: !!e.sprite?.fallback,
        visualScale: e.def.visualScale || 1,
      }));
      const sample = { at: now, map: game.mapId, beat: scene?.beat, elapsed: scene?.elapsed,
        beams: scene?.beams.length, scars: scene?.scars.length, smoke: !!game.darkSmoke, text,
        seen: !!game.flags.castle_lobby_seen, fade: game.fade.alpha, actors, cameraY: game.camera.y,
        bgm: game.sound.bgmName, bgmTime: game.sound.bgm?.currentTime, bgmPaused: game.sound.bgm?.paused,
        emotes: game.entities.filter(e => e.emote?.kind === '!').length, ripples: game.ripples?.length || 0 };
      if (!q.samples.length || now - q.samples.at(-1).at > 65) q.samples.push(sample);
      if (text && q.lines.at(-1) !== text) q.lines.push(text);
      const capture = name => { if (!q.frames[name]) q.frames[name] = { ...sample, data: game.canvas.toDataURL('image/png') }; };
      if (game.fade.alpha < 0.01) {
        if (scene && ['raid', 'descend', 'dodge', 'depart'].includes(scene.beat)) capture(`${scene.beat}-${Math.floor(scene.elapsed * 4)}`);
        if (scene?.beams.length) capture(`beam-${scene.beat}-${scene.shots}`);
        if (box.state === 'waiting') capture(`line-${q.lines.length}-page-${box.page}`);
        if (sample.emotes) capture('surprise');
        if (scene?.beat === 'idle' && !q.lines.length) capture(`sealed-reveal-${Math.floor(game.camera.y / 32)}`);
        if (!box.isOpen && actors.some(a => a.id === 'castle_lobby_youngcle' && a.y > 610)) capture(`left-exit-${Math.floor(now / 250)}`);
      }
      return result;
    };
  });
  await key('KeyC');
  assert.ok(await until(() => game.mapId === 'gajaeman_castle_lobby' && game.castleLobby?.beat === 'raid', 25000));
  check('approach gate C starts real lobby intro with completion unset', !(await state()).seen);
  const started = Date.now(); let responsive = false;
  while (Date.now() - started < 210000) {
    const s = await page.evaluate(() => ({ done: game.flags.castle_lobby_seen && !game.dialogue.running,
      open: game.textbox.isOpen, state: game.textbox.state, cut: game.textbox.node?.cut,
      auto: game.textbox.node?.auto, text: game.textbox.node?.text }));
    if (s.done) break;
    if (!responsive && s.text?.includes('이런이런 그러지말게') && s.state === 'waiting') {
      for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(120); await shot(`lobby-dialogue-${width}`); }
      responsive = true;
    }
    if (s.open && s.state === 'waiting' && !s.cut && !s.auto) await key('KeyC');
    else await page.waitForTimeout(80);
  }
  assert.ok(await field(), 'intro completes and restores field');
  const q = await page.evaluate(() => { window.__castleQA.enabled = false; return window.__castleQA; });
  const captures = [];
  for (const [name, frame] of Object.entries(q.frames)) {
    const file = path.join(process.env.SHOT_DIR, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(frame.data.split(',')[1], 'base64'));
    captures.push({ ...frame, name, file, data: undefined });
  }
  fs.writeFileSync(path.join(process.env.SHOT_DIR, 'cinematic-evidence.json'), JSON.stringify({ ...q, frames: undefined, captures }, null, 2));
  const actors = (beat, id) => q.samples.filter(s => s.beat === beat).flatMap(s => s.actors.filter(a => a.id === id && a.visible && !a.dead));
  const range = (values, key) => values.length ? Math.max(...values.map(a => a[key])) - Math.min(...values.map(a => a[key])) : 0;
  const youngcle = actors('raid', 'castle_lobby_youngcle'), descent = actors('descend', 'castle_lobby_gajaeman');
  check('rotating hovercraft moves while three laser impacts leave destruction', range(youngcle, 'flyX') > 25 && new Set(youngcle.map(a => a.facing)).size >= 3 && q.samples.some(s => s.scars === 3) && q.audio.filter(a => a.name === 'break1').length === 3);
  check('all five actors react before right-side smoky descent', q.samples.some(s => s.emotes >= 5) && range(descent, 'y') > 200 && q.samples.some(s => s.beat === 'descend' && s.smoke && s.bgm === 'castle_gajaeman'));
  check('requested encounter BGM advances in real time', q.samples.some(s => s.bgm === 'castle_gajaeman' && s.bgmTime > 1 && !s.bgmPaused));
  check('greeting is interrupted exactly at 갑', q.interrupts.includes('* 다들 반갑'));
  check('laser dodge visibly moves Gajaeman left', range(actors('dodge', 'castle_lobby_gajaeman'), 'x') > 35);
  const hovering = q.samples.filter(s => s.beat === 'idle' && s.text === '* 이런이런 그러지말게 ㅋㅋㅋ');
  check('visible Gajaeman retains canonical scale and floats apart from Junhee', hovering.length > 0 && hovering.every(s => {
    const boss = s.actors.find(a => a.id === 'castle_lobby_gajaeman');
    const junhee = s.actors.find(a => a.id === 'castle_lobby_junhee');
    return boss?.visualScale === 1.89 && boss.x - junhee.x >= 150 && boss.y + boss.flyY < junhee.y - 50;
  }));
  check('Gajaeman departure visibly rises and spins', range(actors('depart', 'castle_lobby_gajaeman'), 'y') > 220 && range(actors('depart', 'castle_lobby_gajaeman'), 'spin') > 12);
  for (const id of ['castle_lobby_youngcle', 'castle_lobby_junhee']) {
    const samples = q.samples.flatMap(s => s.actors.filter(a => a.id === id && a.visible && !a.dead));
    const down = samples.findIndex(a => a.y >= 640), left = samples.findIndex((a, i) => i > down && a.x < 350);
    check(`${id} moves down then left to exit`, down >= 0 && left > down);
  }
  const required = ['흠.', '여기 뒤에 그새끼가 있는거같지만, 잠겨있다.', '일단 왼쪽 오른쪽 흩어져볼까요', '다들 반갑..', '어이코', '쓰레기같은 너희들에게 내 최종무기를 보여주지', '... 용준이빼고', '2런', '편집노조애들이 방금 브리핑 쳐줌', '타코 니는 따라오고 님들은 오른쪽을 부탁', '요플래형 경섭이형', '가시죠.', '가자.'];
  let prior = -1;
  for (const text of required) { const index = q.lines.indexOf(`* ${text}`, prior + 1); check(`dialogue order ${text}`, index > prior); if (index >= 0) prior = index; }
  check('completion flag stays unset during every cinematic beat', q.samples.filter(s => s.beat).every(s => !s.seen));
  check('all visible cinematic actors use actual sprites', q.samples.every(s => s.actors.filter(a => a.visible && !a.dead).every(a => !a.fallback)));
  check('three viewport dialogue captures exist', responsive);
  check('finish restores party, camera, silence and clears temporary scene', await page.evaluate(() => game.flags.castle_lobby_seen && game.party.join() === 'gyeongsub,ppaman' && !game.castleLobby && !game.darkSmoke && !game.sound.bgmName && !game.camera.locked && game.camera.target === game.player));
  for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(120); await shot(`lobby-settled-${width}`); }
  await key('KeyV'); check('V restores menu access', Boolean(await until(() => game.state === 'menu')));
  await shot('restored-menu'); await key('KeyX'); assert.ok(await field());
  await position('left-block-approach', 500, 656);
  await walk('ArrowLeft', () => game.dialogue.running, 3000);
  check('left attempt triggers Ppaman warning', Boolean(await until(() => game.textbox.node?.text === '* 형 여기가 아니에요.')));
  await shot('left-block');
  await key('KeyC'); await key('KeyC'); assert.ok(await field()); await page.waitForTimeout(800);
  check('left guard returns player without immediate retrigger', await page.evaluate(() => !game.dialogue.running && game.player.x >= 480 && !game.castleLobby));
  await position('sealed-door-inspection', 620, 359); await key('KeyC');
  check('central door describes exactly two black orbs', Boolean(await until(() => game.textbox.node?.text?.includes('두 개의 검은 구체'))));
  await shot('sealed-door'); await key('KeyC'); await key('KeyC'); assert.ok(await field());
  await position('right-door-approach', 980, 525);
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(400); await page.keyboard.up('ArrowUp');
  check('walking into right door does not enter', (await state()).map === 'gajaeman_castle_lobby');
  const latchCount = await page.evaluate(() => window.__castleQA.audio.filter(a => a.name === 'locker').length);
  await key('KeyC'); assert.ok(await until(() => game.fade.alpha > 0.65, 4000)); await shot('right-door-fade');
  assert.ok(await field());
  check('C enters right corridor with requested BGM', Boolean(await until(() => game.mapId === 'gajaeman_castle_right1' && game.sound.bgmName === 'castle_right' && game.sound.bgm?.currentTime > 0.1, 4000)), JSON.stringify(await state()));
  check('right door plays one latch cue', await page.evaluate(before => window.__castleQA.audio.filter(a => a.name === 'locker').length === before + 1, latchCount));
  await shot('right-start');
  const walkStart = Date.now();
  await page.keyboard.down('ArrowUp');
  assert.ok(await until(() => game.player.y < 750, 4000));
  check('corridor uses object walking loop without ripples', await page.evaluate(() => !!game.sound.w && !game.sound.w.stopping && game.sound.w.def.ripple === false && !game.ripples?.length));
  await shot('right-middle');
  assert.ok(await until(() => game.player.y <= 134, 6000));
  await page.keyboard.up('ArrowUp');
  const seconds = (Date.now() - walkStart) / 1000;
  check('north corridor reaches BUILD308 memory door at y128 in about 4.54 seconds', seconds >= 4.3 && seconds <= 5.5, JSON.stringify({ seconds }));
  await shot('right-end');
  await walk('ArrowDown', () => game.mapId === 'gajaeman_castle_lobby'); assert.ok(await field()); await page.waitForTimeout(700);
  check('return spawn stays in lobby without replay or ping-pong', (await state()).map === 'gajaeman_castle_lobby' && (await state()).seen && !(await state()).scene && !(await state()).blocked);
  const before = await state();
  await fixture('save-completed-lobby', 'Save naturally completed story and current party/inventory/money; no save edits.', () => game.autosave());
  await fixture('continue-completed-lobby', 'Use production continueGame on the unmodified completed save.', () => game.continueGame()); assert.ok(await field());
  const restored = await state();
  check('continue preserves completion, party, inventory, HP and money', restored.seen && !restored.scene && restored.map === before.map && restored.party.join() === before.party.join() && JSON.stringify(restored.inventory) === JSON.stringify(before.inventory) && restored.money === before.money && JSON.stringify(restored.hp) === JSON.stringify(before.hp));
  await shot('continued-lobby');
  await open({ qa: 'gajaeman_castle_lobby' });
  assert.ok(await until(() => game.castleLobby?.beat === 'raid', 25000));
  const cancelStarted = Date.now();
  while (Date.now() - cancelStarted < 30000 && !await page.evaluate(() => game.castleLobby?.beat === 'descend')) {
    if (await page.evaluate(() => game.textbox.isOpen && game.textbox.state === 'waiting')) await key('KeyC');
    else await page.waitForTimeout(80);
  }
  assert.ok(await until(() => game.castleLobby?.beat === 'descend' && game.darkSmoke && game.sound.bgmName === 'castle_gajaeman', 3000));
  await shot('cancel-active-smoke');
  await key('Escape');
  check('Escape cancels cinematic to title without completion, smoke or encounter music', Boolean(await until(() => game.state === 'title' && !game.castleLobby && !game.darkSmoke && !game.flags.castle_lobby_seen && game.sound.bgmName !== 'castle_gajaeman')));
  await open({ qa: 'gajaeman_castle_lobby' });
  check('cancelled encounter can start again', Boolean(await until(() => game.castleLobby?.beat === 'raid' && !game.flags.castle_lobby_seen, 25000)));
  await shot('reentry-after-cancel'); await key('Escape');
  await open({ qa: 'gajaeman_castle_lobby_after' }); assert.ok(await field());
  check('post-intro QA checkpoint has completed party and no cinematic', (await state()).seen && !(await state()).scene && (await state()).party.join() === 'gyeongsub,ppaman');
  await walk('ArrowDown', () => game.mapId === 'gajaeman_castle_approach'); assert.ok(await field());
  await page.waitForTimeout(700);
  check('lobby south return has safe stable approach spawn', (await state()).map === 'gajaeman_castle_approach' && !(await state()).blocked);
  await walk('ArrowUp', () => game.player.y <= 555); await key('KeyC'); assert.ok(await field());
  check('approach gate re-entry does not replay completed encounter', (await state()).map === 'gajaeman_castle_lobby' && (await state()).seen && !(await state()).scene);
  await open({ qa: 'gajaeman_castle_right1' }); assert.ok(await field());
  check('right-corridor QA checkpoint prepares completed three-person party', (await state()).seen && (await state()).party.join() === 'gyeongsub,ppaman' && (await state()).map === 'gajaeman_castle_right1');
});
