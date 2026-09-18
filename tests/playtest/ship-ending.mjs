import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'ship-ending', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, check, shot, until, press, fixture }) => {
  const snapshot = () => page.evaluate(() => {
    const g = window.game;
    const actor = id => {
      const e = id === 'player' ? g.player : g.entities.find(e => e.id === id && !e.dead);
      return e ? { x: e.x, y: e.y, visible: e.visible, sprite: e.def.sprite, facing: e.facing, transit: e.doorTransit, moving: e.moving } : null;
    };
    const hatch = g.entities.find(e => e.id === 'ship_logo');
    return { text: g.textbox.node?.text, speaker: g.textbox.node?.speaker, boxState: g.textbox.state, waiting: !!g.dialogue.wait, dialogue: g.dialogue.running, index: g.dialogue.i,
      map: g.mapId, flags: g.flags, bgm: g.sound.bgmName, veil: g.darkSmoke?.veil ?? 0, camera: { x: g.camera.x, y: g.camera.y },
      actors: Object.fromEntries(['player', 'gyeongsub', 'ppaman', 'ship_youngcle', 'ship_junhee', 'ship_yongjun'].map(id => [id, actor(id)])), hatch: hatch?.hatchProgress };
  });
  const advance = async () => {
    const before = await snapshot();
    for (let n = 0; n < 3; n++) {
      await press('KeyC'); await page.waitForTimeout(180);
      const after = await snapshot();
      if (after.index !== before.index || after.text !== before.text || !after.dialogue) return;
    }
  };
  const text = async needle => {
    for (let n = 0; n < 400; n++) {
      const s = await snapshot();
      if (s.text?.includes(needle)) {
        await until(() => window.game.textbox.state !== 'typing', 8000);
        return snapshot();
      }
      if (s.boxState !== 'closed' && !s.waiting) await advance();
      else await page.waitForTimeout(100);
    }
    await shot('ending_failure');
    throw new Error(`Dialogue not reached: ${needle}; state=${JSON.stringify(await snapshot())}`);
  };
  await open({ qa: 'ship_ending' });
  await until(() => window.game?.mapId === 'youngcle20', 25000);
  let s = await text('으윽...'); await shot('ending_01_tv');
  check('victory ending starts silent with transformed form and purple veil', !s.bgm && s.actors.ship_youngcle.sprite === 'youngcle_tvform' && s.veil > 0);
  await advance();
  await until(() => window.game.textbox.node?.text === '* ...', 8000);
  s = await snapshot(); await shot('ending_02_original_purple');
  check('white transition restores original character before purple veil clears', s.actors.ship_youngcle.sprite === 'youngcle' && s.veil > 0);
  s = await text('내가 속은거였다니.'); await shot('ending_03_original_clear');
  check('purple veil gone on realization dialogue', s.veil === 0 && !s.bgm);
  await text('비켜보샘'); await advance();
  const opening = await until(() => { const h = window.game.entities.find(e => e.id === 'ship_logo'); return h?.hatchProgress > 0.15 && h.hatchProgress < 0.7; }, 10000);
  await shot('ending_04_hatch_moving'); check('existing face lid visibly slides open', opening);
  s = await text('사실 여기가 통로임'); await shot('ending_05_hatch_open');
  check('hatch stays open for next dialogue', s.flags.ship_manhole_open && s.hatch === 1);
  await advance(); await page.waitForTimeout(650); await shot('ending_06_dots');
  await text('으어어..'); s = await snapshot();
  check('Yongjun is not visible during offscreen voice', s.actors.ship_yongjun.visible === false);
  await advance();
  await until(() => { const g = window.game, y = g.entities.find(e => e.id === 'ship_yongjun'); return y?.visible && y.x < g.camera.x + 472 && y.x > g.camera.x + 425; }, 5000);
  await shot('ending_07_yongjun_enters');
  s = await text('아오 형님들'); await shot('ending_08_yongjun_arrived');
  check('Yongjun arrives from right before speaking and everyone looks right', s.actors.ship_yongjun.x === 636 && ['player','gyeongsub','ppaman','ship_junhee','ship_youngcle'].every(id => s.actors[id].facing === 'right'));
  await text('네 형'); await advance();
  for (const [number, id] of [[9, 'ship_yongjun'], [10, 'ship_junhee'], [11, 'ship_youngcle']]) {
    const sinking = await until(() => { const e = window.game.entities.find(e => e.visible && e.doorTransit); return e?.id; }, 16000);
    check(`ordered descent ${id}`, sinking === id);
    await page.waitForTimeout(550); await shot(`ending_${number}_descent`);
    const descended = await until(() => !window.game.entities.some(e => e.visible && e.doorTransit), 3000);
    check(`descent completes with full occlusion ${id}`, descended);
  }
  check('ending returns to field control', await until(() => window.game.flags.ship_ending_done && !window.game.dialogue.running, 5000));
  s = await snapshot(); await shot('ending_12_field');
  check('departed actors removed and field silent', ['ship_youngcle','ship_junhee','ship_yongjun'].every(id => !s.actors[id]) && !s.bgm && s.veil === 0);
  await press('ArrowRight', { delay: 220 });
  check('player can move after ending', (await snapshot()).actors.player.x > s.actors.player.x);
  await fixture('hatch-approach', 'Place party below open hatch to test real C/X choice and map transition, not full walk from ending pose.', () => {
    const g = window.game; g.player.x = 468; g.player.y = 376; g.player.facing = 'up';
    for (const e of g.entities) if (e.def?.type === 'follower') e.snapBehind();
  });
  await press('KeyC'); await page.waitForTimeout(700); await shot('ending_13_choice');
  check('C on hatch offers yes/no', (await snapshot()).text?.includes('내려갈까?'));
  await press('KeyX'); await page.waitForTimeout(350);
  s = await snapshot();
  check('cancel stays on control room without closing hatch', s.map === 'youngcle20' && s.flags.ship_manhole_open && !s.dialogue);
  await press('KeyC'); await page.waitForTimeout(700); await press('KeyC');
  check('yes enters lounge', await until(() => window.game.mapId === 'ship_lounge', 6000));
  await page.waitForTimeout(1000); await shot('ending_14_lounge');
  await fixture('control-reentry', 'Re-enter control map with naturally acquired flags to verify persistent hole and no boss/cutscene replay.', () => window.game.changeMap('youngcle20', 'from_lounge'));
  await until(() => !window.game.transitioning && !window.game.dialogue.running, 6000);
  s = await snapshot(); await shot('ending_15_reentry');
  check('reentry does not revive boss or replay ending', s.flags.ship_ending_done && s.flags.ship_manhole_open && !s.actors.ship_youngcle && !s.dialogue && !s.bgm && s.veil === 0);
  await open({ qa: 'ship_tvform_battle' });
  check('real battle intro starts before win-path check', await until(() => window.game?.battle?.state === 'intro', 30000));
  for (let n = 0; n < 90; n++) {
    if (await page.evaluate(() => window.game.battle?.state === 'menu')) break;
    await press('KeyC'); await page.waitForTimeout(250);
  }
  await fixture('final-hit', 'Prepare boss at one remaining HP and healthy party; victory, endBattle callback, flags, dialogue and effects must be reached by real attack input, not injected.', () => {
    const b = window.game.battle; b.enemies[0].hp = 1;
    for (const member of b.members) { member.hp = member.maxHp; member.down = false; }
  });
  check('won flag remains false before final attack', await page.evaluate(() => !window.game.flags.ship_tvform_won));
  for (let n = 0; n < 160; n++) {
    if (await page.evaluate(() => !window.game.battle && window.game.flags.ship_tvform_won)) break;
    await press('KeyC'); await page.waitForTimeout(180);
  }
  s = await text('으윽...'); await shot('ending_16_real_victory');
  check('real win callback enters ending once with silent BGM', s.flags.ship_tvform_won && !s.flags.ship_ending_done && !s.bgm && s.actors.ship_youngcle.sprite === 'youngcle_tvform');
});
