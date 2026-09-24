import { runScenario } from './lib/harness.mjs';
import { escToTitle } from './lib/esc.mjs';

await runScenario({ name: 'ship-ending', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, check, shot, until, press, fixture }) => {
  const snapshot = () => page.evaluate(() => {
    const g = window.game;
    const actor = id => {
      const e = id === 'player' ? g.player : g.entities.find(e => e.id === id && !e.dead);
      return e ? { x: e.x, y: e.y, visible: e.visible, sprite: e.def.sprite, facing: e.facing, transit: e.doorTransit, moving: e.moving, jitter: e.jitter, motion: !!e.motion, frame: e.frame } : null;
    };
    const hatch = g.entities.find(e => e.id === 'ship_logo');
    return { text: g.textbox.node?.text, speaker: g.textbox.node?.speaker, boxState: g.textbox.state, waiting: !!g.dialogue.wait, dialogue: g.dialogue.running, index: g.dialogue.i,
      map: g.mapId, flags: g.flags, bgm: g.sound.bgmName, veil: g.darkSmoke?.veil ?? 0, fade: { alpha: g.fade.alpha, color: g.fade.color }, camera: { x: g.camera.x, y: g.camera.y },
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
  await fixture('release-render-observer', 'Observe original actor drawImage coordinates and fade on every rendered frame without changing animation, input, or time.', () => {
    const g = window.game, actor = g.entities.find(e => e.id === 'ship_youngcle');
    const draw = actor.drawSprite;
    window.releaseFrames = [];
    actor.drawSprite = function(ctx, cam) {
      const drawImage = ctx.drawImage;
      ctx.drawImage = function(image, ...args) {
        window.releaseFrames.push({ at: performance.now(), x: args[0], y: args[1], sprite: actor.def.sprite,
          jitter: !!actor.jitter, motion: !!actor.motion, frame: actor.frame, fade: g.fade.alpha, color: g.fade.color, box: g.textbox.state,
          footX: actor.x, footY: actor.y, veil: g.darkSmoke?.veil ?? 0 });
        return drawImage.call(this, image, ...args);
      };
      try { return draw.call(this, ctx, cam); } finally { ctx.drawImage = drawImage; }
    };
  });
  await page.waitForTimeout(700);
  s = await snapshot();
  check('completed groan stays transformed and still until C', s.text === '* 으윽...' && s.boxState === 'waiting' && !s.actors.ship_youngcle.jitter && !s.actors.ship_youngcle.motion && s.fade.alpha === 0);
  await press('KeyC');
  check('C starts visible tremble before white fade', await until(() => window.game.entities.find(e => e.id === 'ship_youngcle')?.jitter && window.game.fade.alpha === 0, 1500));
  await page.waitForTimeout(150); await shot('ending_01a_tremble');
  for (let n = 0; n < 4; n++) { await press('KeyC'); await page.waitForTimeout(100); }
  s = await snapshot();
  check('repeated C cannot skip trembling', s.actors.ship_youngcle.jitter?.t > 0 && s.actors.ship_youngcle.sprite === 'youngcle_tvform' && s.fade.alpha === 0 && s.waiting);
  check('tremble settles before white', await until(() => {
    const g = window.game, yc = g.entities.find(e => e.id === 'ship_youngcle');
    return !yc?.jitter && g.textbox.state === 'closed' && g.fade.alpha === 0;
  }, 1500));
  await shot('ending_01b_still_hold');
  await press('KeyC'); await page.waitForTimeout(160); await press('KeyC');
  s = await snapshot();
  check('C cannot skip the still breath after trembling', !s.actors.ship_youngcle.jitter && s.actors.ship_youngcle.sprite === 'youngcle_tvform' && s.fade.alpha === 0 && s.waiting);
  check('white fade starts after breath', await until(() => window.game.fade.color === '255,255,255' && window.game.fade.alpha > 0.15 && window.game.fade.alpha < 0.9, 1500));
  await shot('ending_01c_white_rising');
  check('sprite changes only after full white coverage', await until(() => window.game.entities.find(e => e.id === 'ship_youngcle')?.def.sprite === 'youngcle' && window.game.fade.alpha === 1, 1500));
  await shot('ending_01d_white_covered');
  await until(() => window.game.textbox.node?.text === '* ...', 8000);
  s = await snapshot(); await shot('ending_02_original_purple');
  check('white transition restores original character before purple veil clears', s.actors.ship_youngcle.sprite === 'youngcle' && s.veil > 0);
  const frames = await page.evaluate(() => window.releaseFrames);
  const shaking = frames.filter(f => f.jitter), firstShake = shaking[0];
  const still = frames.find(f => firstShake && f.at > firstShake.at && !f.jitter);
  const white = frames.find(f => f.color === '255,255,255' && f.fade > 0);
  const original = frames.find(f => f.sprite === 'youngcle');
  const timing = { trembleMs: still?.at - firstShake?.at, stillMs: white?.at - still?.at, fadeMs: original?.at - white?.at };
  check('rendered tremble lasts about 1.1s then holds about 0.5s before white', timing.trembleMs >= 1000 && timing.trembleMs < 1350 && timing.stillMs >= 450 && timing.stillMs < 750, JSON.stringify(timing));
  check('tremble visibly alternates 4px total without moving feet or dancing', shaking.length > 10 && Math.max(...shaking.map(f => f.x)) - Math.min(...shaking.map(f => f.x)) === 4 && new Set(shaking.map(f => f.y)).size === 1 && new Set(shaking.map(f => `${f.footX},${f.footY}`)).size === 1 && shaking.every(f => !f.motion && f.frame === 0));
  check('first normal-form render is fully covered and purple veil survives release', original?.fade === 1 && original?.color === '255,255,255' && frames.every(f => f.veil > 0));
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
  await until(() => game.fade.alpha === 0, 3000);
  const visibleAt = await page.evaluate(() => performance.now());
  check('newly visible lounge begins silent', await page.evaluate(() => !game.sound.bgm));
  await until(() => !!game.sound.bgm, 4000);
  const cue = await page.evaluate(() => ({ at: performance.now(), volume: game.sound.bgm?.volume ?? null }));
  await page.waitForTimeout(500);
  const risingVolume = await page.evaluate(() => game.sound.bgm?.volume ?? null);
  check('lounge cue waits 1.5 seconds after visible fade and rises gently', cue.at - visibleAt >= 1400 && cue.at - visibleAt < 2200 && cue.volume < 0.05 && risingVolume > 0.08 && risingVolume < 0.25, JSON.stringify({ leadMs: cue.at - visibleAt, initialVolume: cue.volume, after500ms: risingVolume }));
  await page.waitForTimeout(1000); await shot('ending_14_lounge');
  await until(() => game.sound.bgm?.currentTime > 0.2 && game.sound.bgm.volume >= 0.39, 8000);
  const audioBefore = await page.evaluate(() => ({ name: game.sound.bgmName ?? null, time: game.sound.bgm?.currentTime ?? null, volume: game.sound.bgm?.volume ?? null, paused: game.sound.bgm?.paused ?? null, muted: game.sound.muted, error: game.sound.bgm?.error?.code ?? null }));
  await page.waitForTimeout(400);
  const audioAfter = await page.evaluate(() => game.sound.bgm?.currentTime ?? null);
  check('real ending and C yes start audible advancing lounge music', audioBefore.name === 'ship_lounge' && audioBefore.volume >= 0.39 && audioBefore.paused === false && !audioBefore.muted && !audioBefore.error && audioAfter > audioBefore.time + 0.2, JSON.stringify({ before: audioBefore, after: audioAfter }));
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
  await press('KeyC');
  check('real victory C also starts tremble', await until(() => window.game.entities.find(e => e.id === 'ship_youngcle')?.jitter, 1500));
  await escToTitle(page);
  check('Escape during tremble returns to clean title', await until(() => {
    const g = window.game;
    return g.state === 'title' && !g.dialogue.running && !g.dialogue.wait && !g.darkSmoke && !g.flags.ship_ending_done && !g.entities.some(e => e.jitter || e.motion);
  }, 4000));
  await shot('ending_17_interrupted_title');
  const restartEnding = async () => {
    const { QA_POINTS } = await import('/src/core/story.js');
    window.game.devJump(QA_POINTS.find(q => q.id === 'ship_ending'));
  };
  await fixture('same-game-release-reentry', 'Restart the existing game instance at the ending QA point after real Escape, without reloading the page, to expose stale animation/wait state.', restartEnding);
  s = await text('으윽...');
  check('same-instance reentry starts fresh with no leftover tremble or completion', !s.actors.ship_youngcle.jitter && !s.actors.ship_youngcle.motion && !s.flags.ship_ending_done && s.fade.alpha === 0);
  await press('KeyC');
  await until(() => window.game.entities.find(e => e.id === 'ship_youngcle')?.jitter, 1500);
  await until(() => !window.game.entities.find(e => e.id === 'ship_youngcle')?.jitter, 1500);
  await fixture('same-game-hold-reset', 'Reset the QA point during the breath hold to verify pending release waits cannot switch the fresh actor or leave a white overlay.', restartEnding);
  s = await text('으윽...'); await page.waitForTimeout(1900); s = await snapshot();
  await shot('ending_18_reset_groan');
  check('QA reset during hold cancels the old release and keeps fresh groan visible', s.text === '* 으윽...' && s.boxState === 'waiting' && s.actors.ship_youngcle.sprite === 'youngcle_tvform' && !s.actors.ship_youngcle.jitter && s.fade.alpha === 0 && !s.flags.ship_ending_done);
});
