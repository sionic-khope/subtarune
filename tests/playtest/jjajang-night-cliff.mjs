import { runScenario } from './lib/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { verifyRunaway } from './lib/choimis-runaway.mjs';

await runScenario({ name: 'jjajang-night-cliff', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, check, shot, until, press, fixture }) => {
  page.setDefaultNavigationTimeout(30000);
  const snapshot = () => page.evaluate(() => {
    const g = window.game;
    const actor = id => {
      const e = id === 'player' ? g.player : g.entities.find(a => a.id === id && !a.dead);
      return e ? { x: e.x, y: e.y, visible: e.visible, sprite: e.def.sprite, facing: e.facing, hopY: e.hopY || 0, flyX: e.flyX || 0, moving: e.moving } : null;
    };
    return { text: g.textbox.node?.text, box: g.textbox.state, speaker: g.textbox.node?.speaker, mosaic: g.textbox.node?.mosaic,
      dialogue: g.dialogue.running, waiting: !!g.dialogue.wait, index: g.dialogue.i, map: g.mapId,
      bgm: g.sound.bgmName, musicTime: g.sound.bgm?.currentTime, musicPaused: g.sound.bgm?.paused,
      fade: g.fade.alpha, camera: { x: g.camera.x, y: g.camera.y, locked: g.camera.locked },
      party: g.party, hp: g.partyHp, inventory: g.inventory, money: g.money, flags: g.flags,
      actors: Object.fromEntries(['player', 'gyeongsub', 'choimis'].map(id => [id, actor(id)])) };
  });
  const advance = async () => {
    const before = await snapshot();
    for (let i = 0; i < 3; i++) {
      await press('KeyC'); await page.waitForTimeout(140);
      const after = await snapshot();
      if (after.index !== before.index || after.text !== before.text || !after.dialogue) return;
    }
  };
  const text = async needle => {
    for (let i = 0; i < 500; i++) {
      const s = await snapshot();
      if (s.text?.includes(needle) && s.box !== 'closed') return s;
      if (s.box !== 'closed' && !s.waiting) await advance();
      else await page.waitForTimeout(70);
    }
    await shot('failure');
    throw new Error(`Line not reached: ${needle}; ${JSON.stringify(await snapshot())}`);
  };
  const settle = async () => { await press('KeyX'); await page.waitForTimeout(120); };
  const walk = async (key, predicate, timeout = 12000) => {
    await page.keyboard.down(key);
    try { return await until(predicate, timeout); }
    finally { await page.keyboard.up(key); }
  };

  await open({ qa: 'jjajang_sakura12' });
  check('altar QA loaded', await until(() => window.game?.mapId === 'jjajang_sakura12' && !window.game.transitioning, 30000));
  await page.waitForTimeout(400);
  const before = await snapshot();
  await fixture('render-observer', 'Observe actual rendered camera and jump frames without changing inputs, time or world state. Capture exact intermediate canvas frames even under CPU contention.', () => {
    const g = window.game, draw = g.draw;
    window.nightObserved = { frames: [], images: {} };
    g.draw = function(...args) {
      const result = draw.apply(this, args);
      if (this.mapId !== 'jjajang_night_cliff') return result;
      const actor = this.entities.find(e => e.id === 'choimis' && !e.dead);
      const f = { cameraX: this.camera.x, text: this.textbox.node?.text, actor: actor && { x: actor.x, y: actor.y, hopY: actor.hopY || 0, flyX: actor.flyX || 0 } };
      const observed = window.nightObserved;
      observed.frames.push(f);
      if (!observed.images.camera && f.text === '* 형 저는 왜 항상 이런식일까요' && f.cameraX > 420 && f.cameraX < 540) observed.images.camera = this.canvas.toDataURL('image/png');
      if (!observed.images.jump && actor && actor.hopY > 20 && actor.y - actor.hopY < 199) observed.images.jump = this.canvas.toDataURL('image/png');
      return result;
    };
  });
  check('C interaction reached by walking from altar entrance', await walk('ArrowUp', () => window.game.player.y <= 200));
  await press('KeyC');
  await text('나는 눈을 감는다.'); await settle(); await shot('01_eyes_close_line');
  await advance();
  check('eyes close reaches opaque black', await until(() => window.game.fade.alpha > 0.98, 3500));
  await shot('02_black_transition');
  check('blackout transitions into remote scene', await until(() => window.game.mapId === 'jjajang_night_cliff', 12000));
  check('hidden protagonist while Gyeongsub walks right', await until(() => window.game.entities.find(e => e.id === 'gyeongsub')?.moving, 6000));
  const k0 = await snapshot();
  await page.waitForTimeout(550);
  const k1 = await snapshot();
  check('visible walk advances without a protagonist identity swap', !k1.actors.player.visible && k1.actors.player.sprite === before.actors.player.sprite && k1.actors.gyeongsub.x > k0.actors.gyeongsub.x + 45);
  check('entrance is silent', !k1.bgm);
  await shot('03_approach');
  await text('어 미스야'); await settle(); await shot('04_greeting');
  await text('어 형. 안녕하세요'); await settle(); await advance();
  check('Gyeongsub unfinished line appears', await until(() => window.game.textbox.node?.text === '* ... 그 내 ㄷ..', 1800));
  await shot('05_interrupted');
  check('Choimis interrupts automatically', await until(() => window.game.textbox.node?.text === '* 형 저는 왜 항상 이런식일까요', 1800));
  const panStart = await snapshot();
  await press('KeyX'); await page.waitForTimeout(90); await press('KeyC');
  await page.waitForTimeout(180);
  const panMiddle = await snapshot();
  check('fast confirm never reveals next line before camera arrives', panMiddle.text !== '* 그게 무슨말이야' || Math.abs(panMiddle.camera.x - 560) < 0.1, JSON.stringify({ panStart: panStart.camera.x, panMiddle: panMiddle.camera.x, text: panMiddle.text }));
  await shot('06_camera_mid');
  await text('그게 무슨말이야'); await settle();
  const wide = await snapshot();
  check('Choimis left edge with wide night vista', wide.actors.choimis.x - wide.camera.x >= 50 && wide.actors.choimis.x - wide.camera.x <= 110 && Math.abs(wide.camera.x - 560) < 0.1);
  check('specified music plays at confession', wide.bgm === 'ship_sinking' && wide.musicTime > 0 && wide.musicPaused === false);
  await shot('07_moon_vista');
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(120);
    check(`viewport ${width} has no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await shot(`07_vista_${width}`);
  }
  await page.setViewportSize({ width: 1000, height: 780 });
  await text('순수하게'); await settle();
  const censored = await snapshot();
  check('only requested word uses actual mosaic', censored.mosaic?.text === '보지' && censored.mosaic.block === 2 && censored.text.includes('보지를'));
  await shot('08_mosaic');
  await text('옷도 여러벌'); await settle(); await shot('09_long_line');
  await text('1500만원'); await settle(); await shot('10_debt');
  await advance(); await text('* ...'); await settle(); await advance();
  await text('* ...'); await settle(); await advance();
  check('Choimis visibly jumps down-right off the ledge', await until(() => window.game.entities.find(e => e.id === 'choimis')?.hopY > 20, 3500));
  await page.waitForTimeout(100);
  const jump = await snapshot();
  check('jump first visibly rises and draws displacement once', await page.evaluate(() => window.nightObserved.frames.some(f => f.actor && f.actor.x > 644 && f.actor.y > 199 && f.actor.y - f.actor.hopY < 199 && f.actor.flyX === 0)), JSON.stringify(jump.actors.choimis));
  await shot('11_escape_jump');
  await text('아 씨발년 이럴줄알았어'); await settle(); await shot('12_last_line');
  const last = await snapshot();
  const observed = await page.evaluate(() => window.nightObserved);
  check('actual rendered camera pan contains intermediate frames', observed.frames.some(f => f.text === '* 형 저는 왜 항상 이런식일까요' && f.cameraX > 420 && f.cameraX < 540));
  check('all rendered next-line frames wait for final composition', observed.frames.filter(f => f.text === '* 그게 무슨말이야').every(f => Math.abs(f.cameraX - 560) < 0.1));
  for (const [name, data] of Object.entries(observed.images)) {
    const file = path.join(process.env.SHOT_DIR, `observed_${name}.png`);
    fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
    check(`exact ${name} frame captured from live canvas`, true, file);
  }
  check('Choimis has escaped; no death or damage state', !last.actors.choimis && JSON.stringify(last.hp) === JSON.stringify(before.hp));
  check('same music continues through the exchange', last.bgm === wide.bgm && last.musicTime > wide.musicTime);
  await verifyRunaway({ page, check, shot, until, press, fixture }, before, advance);
  const after = await snapshot();
  check('solo identity HP and money preserved', after.actors.player.sprite === before.actors.player.sprite && after.actors.player.visible && JSON.stringify(after.party) === JSON.stringify(before.party) && JSON.stringify(after.hp) === JSON.stringify(before.hp) && after.money === before.money);
  check('night sequence continues through the food event once', !after.inventory.includes('어둠의 짜장면') && after.flags.night_cliff_scene_done && after.flags.sakura8_right_open && after.flags.choimis_runaway_done);
  check('camera and current aura music restored', !after.camera.locked && after.bgm === 'captain_reveal');
  await shot('13_full_chain_return');
  await press('ArrowRight', { delay: 250 });
  check('movement works after the remote scene', (await snapshot()).actors.player.x > after.actors.player.x);
  await fixture('completed-fork-entry', 'Load existing completed state at Sakura8 after spawn; use actual arrows to verify the newly open physical route and return.', async () => { await window.game.changeMap('jjajang_sakura8', 'after', true); });
  check('unblocked right route enters night map with arrow input', await walk('ArrowRight', () => window.game.mapId === 'jjajang_night_cliff', 14000));
  await until(() => !window.game.transitioning, 10000); await page.waitForTimeout(450);
  const revisit = await snapshot();
  check('revisit keeps visible Yop and does not replay', revisit.map === 'jjajang_night_cliff' && !revisit.dialogue && revisit.actors.player.visible && !revisit.actors.choimis && !revisit.actors.gyeongsub);
  await shot('14_revisit');
  check('left exit returns to fork without C', revisit.map === 'jjajang_night_cliff' && await walk('ArrowLeft', () => window.game.mapId === 'jjajang_sakura8', 8000));
  await until(() => !window.game.transitioning, 10000);
  await shot('15_fork_return');
});
