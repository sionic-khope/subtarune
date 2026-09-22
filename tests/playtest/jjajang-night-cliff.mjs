import { runScenario } from './lib/harness.mjs';

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
  check('fast confirm does not bypass camera travel', panMiddle.camera.x > panStart.camera.x && panMiddle.camera.x < 559.99 && panMiddle.text !== '* 그게 무슨말이야');
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
  check('jump first visibly rises and draws displacement once', jump.actors.choimis.x > 644 && jump.actors.choimis.y > 199 && jump.actors.choimis.y - jump.actors.choimis.hopY < 199 && jump.actors.choimis.flyX === 0);
  await shot('11_escape_jump');
  await text('아 씨발년 이럴줄알았어'); await settle(); await shot('12_last_line');
  const last = await snapshot();
  check('Choimis has escaped; no death or damage state', !last.actors.choimis && JSON.stringify(last.hp) === JSON.stringify(before.hp));
  check('same music continues through the exchange', last.bgm === wide.bgm && last.musicTime > wide.musicTime);
  await advance();
  check('returns to altar with control', await until(() => window.game.mapId === 'jjajang_sakura12' && !window.game.dialogue.running && window.game.fade.alpha < 0.01, 8000));
  const after = await snapshot();
  check('solo identity HP and money preserved', after.actors.player.sprite === before.actors.player.sprite && after.actors.player.visible && JSON.stringify(after.party) === JSON.stringify(before.party) && JSON.stringify(after.hp) === JSON.stringify(before.hp) && after.money === before.money);
  check('item exactly once and scene completed', after.inventory.filter(i => i === '어둠의 짜장면').length === 1 && after.flags.night_cliff_scene_done && after.flags.sakura8_right_open);
  check('camera and altar music restored', !after.camera.locked && after.bgm === 'shop3');
  await shot('13_altar_return');
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
