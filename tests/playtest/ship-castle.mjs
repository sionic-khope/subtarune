import { runScenario } from './lib/harness.mjs';
import { escToTitle } from './lib/esc.mjs';

await runScenario({ name: 'ship-castle', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, check, until, open, press, shot, fixture }) => {
  if (process.env.QA_SHIP_CASTLE_FOCUS === 'powershot') {
    await powershotFocus({ page, check, until, open, press, shot, fixture });
    return;
  }
  await open({ qa: 'ship_castle' });
  check('QA starts below the untouched proximity trigger', !!await until(() => game.mapId === 'ship_lounge' && !game.dialogue.running && !game.flags.ship_castle_started, 20000));
  await page.keyboard.down('ArrowUp');
  check('interrupt audit first reaches the event through real walking', !!await until(() => game.flags.ship_castle_started && game.dialogue.running && game.shipCastle, 12000));
  await page.keyboard.up('ArrowUp');
  await escToTitle(page);
  check('Escape interrupts the active scene and returns to title', !!await until(() => game.state === 'title' && !game.shipCastle && !game.dialogue.running, 5000));
  const interrupted = await page.evaluate(() => ({ bgm: game.sound.bgmName, saved: JSON.parse(localStorage.getItem('subtarune.save.v1')) }));
  check('interruption cleans scene audio and does not save the once flag', interrupted.bgm !== 'ship_castle' && !interrupted.saved.flags.ship_castle_started && !interrupted.saved.flags.ship_castle_done, JSON.stringify(interrupted));
  await open({ qa: 'ship_castle' });
  check('QA re-entry reconstructs the untouched approach after interruption', !!await until(() => game.mapId === 'ship_lounge' && !game.dialogue.running && !game.flags.ship_castle_started && !game.shipCastle, 20000));
  const observed = await fixture('observe-castle-audio', 'Record audio API calls without replacing playback; QA shortcut only prepares the pre-event story state.', () => {
    const log = window.__shipCastleQA = { sfx: [], bgm: [], stop: [] };
    const sound = game.sound;
    const sfx = sound.sfx.bind(sound);
    const playBgm = sound.playBgm.bind(sound);
    const stopBgm = sound.stopBgm.bind(sound);
    sound.sfx = (name, options) => { log.sfx.push(name); return sfx(name, options); };
    sound.playBgm = (name, options) => { log.bgm.push({ name, options: { ...options } }); return playBgm(name, options); };
    sound.stopBgm = duration => { log.stop.push(duration); return stopBgm(duration); };
    return true;
  });
  check('audio observer installed before natural trigger', observed === true);
  const baseline = await page.evaluate(() => ({ inventory: [...game.inventory], party: [...game.party], partyHp: { ...game.partyHp } }));
  const line = async (text, capture) => {
    let visible = false;
    try {
      const handle = await page.waitForFunction(expected => game.textbox.node?.text?.includes(expected), text, { timeout: 20000, polling: 80 });
      visible = await handle.jsonValue();
      await handle.dispose();
    } catch (error) { if (error.name !== 'TimeoutError') throw error; }
    check(`dialogue appears: ${text}`, !!visible);
    if (!visible) throw new Error(`Missing required dialogue: ${text}`);
    const before = await page.evaluate(() => ({ text: game.textbox.node?.text, state: game.textbox.state }));
    if (before.state === 'typing') {
      await press('KeyC');
      check(`dialogue finishes typing: ${text}`, !!await until(() => game.textbox.state === 'waiting', 2000));
    }
    if (capture) await shot(capture);
    await press('KeyC');
    let advanced = false;
    try {
      const handle = await page.waitForFunction(previous => !game.dialogue.running || game.textbox.node?.text !== previous, before.text, { timeout: 2000, polling: 40 });
      advanced = await handle.jsonValue();
      await handle.dispose();
    } catch (error) { if (error.name !== 'TimeoutError') throw error; }
    check(`dialogue advances: ${text}`, !!advanced);
  };
  const beat = async (name, capture) => {
    let reached = false;
    try {
      const handle = await page.waitForFunction(expected => game.shipCastle?.beat === expected, name, { timeout: 20000, polling: 40 });
      reached = await handle.jsonValue();
      await handle.dispose();
    } catch (error) { if (error.name !== 'TimeoutError') throw error; }
    check(`scene reaches ${name}`, !!reached);
    if (!reached) throw new Error(`Missing required castle beat: ${name}`);
    if (capture) await shot(capture);
    return page.evaluate(() => game.shipCastle?.snapshot());
  };

  await press('KeyX');
  await page.waitForTimeout(200);
  await shot('castle_00_before_walk');
  await page.keyboard.down('ArrowUp');
  check('real walking enters the proximity region without C', !!await until(() => game.flags.ship_castle_started && game.dialogue.running, 12000));
  await page.keyboard.up('ArrowUp');
  check('authored formation settles before its first line', !!await until(() => game.textbox.node?.text?.includes('여기임'), 10000));
  await shot('castle_01_triggered_spread');
  const triggerState = await page.evaluate(() => ({ p: { x: game.player.x, y: game.player.y }, trigger: game.entities.find(entity => entity.id === 'ship_castle_trigger')?.rect,
    party: ['player', 'gyeongsub', 'ppaman'].map(id => { const entity = id === 'player' ? game.player : game.entities.find(item => item.id === id); return { id, x: entity.x, y: entity.y, facing: entity.facing }; }) }));
  check('triggered player actually overlaps the map proximity rectangle', triggerState.p.y < triggerState.trigger.y + triggerState.trigger.h && triggerState.p.y + 24 > triggerState.trigger.y, JSON.stringify(triggerState));
  const spreadX = triggerState.party.map(actor => actor.x);
  check('party visibly spreads across the doorway and all look up', Math.max(...spreadX) - Math.min(...spreadX) >= 100 && triggerState.party.every(actor => actor.facing === 'up'), JSON.stringify(triggerState.party));

  await line('여기임', 'castle_02_dialogue_start');
  await line('생각보다 ㅈㄴ 크네');
  await line('ㅇㅇ');
  await line('그럼 여기에 그 코드를 꼽으면 될까요?', 'castle_02b_intro_long_line');
  await line('ㅇㅇ');
  await line('그럼 부탁드립니다.');
  const floating = await beat('field_float', 'castle_03_cord_float');
  check('lounge BGM is stopped before the raised cord hold', await page.evaluate(() => game.sound.bgmName !== 'ship_lounge' && !game.sound.bgm));
  check('cord float is a full two-second authored hold', floating.elapsed < 0.5 && await page.evaluate(() => game.shipCastle.config.timing.floatHold === 2));
  await page.waitForTimeout(3600);
  await page.setViewportSize({ width: 375, height: 667 });
  await shot('castle_04_cord_float_mid_375');
  await page.setViewportSize({ width: 1000, height: 780 });
  const walking = await beat('field_walk', 'castle_05_slow_walk_start');
  check('slow approach begins with the cord owned by both actors', walking.cordOwner === 'shared');
  await page.waitForTimeout(1200);
  await shot('castle_06_blockers_backstep');
  const path = await page.evaluate(() => { const bounds = e => { const scale = 1.43 * (e.def.visualScale || 1); const w = e.sprite.fw / e.sprite.px * scale; const h = e.sprite.fh / e.sprite.px * scale; return { x: e.x + e.w / 2 - w / 2, y: e.y + e.h - h, w, h }; }; return { player: { x: game.player.x, y: game.player.y, facing: game.player.facing, bounds: bounds(game.player) }, blockers: ['lounge_youngcle', 'lounge_junhee', 'lounge_yongjun'].map(id => { const e = game.entities.find(x => x.id === id); return { id, x: e.x, y: e.y, facing: e.facing, bounds: bounds(e) }; }) }; });
  check('Yoplait continuously walks up while all three blockers visibly clear the aisle facing him', path.player.facing === 'up' && path.blockers.every(actor => actor.facing === 'down') && path.blockers[0].x < 286 && path.blockers[2].x > 454, JSON.stringify(path));
  const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  check('backstepping blockers have no rendered-body overlap with Yoplait', path.blockers.every(actor => !overlaps(path.player.bounds, actor.bounds)), JSON.stringify(path));
  await line('긴 여정의 끝을 얘기하는 문이다.', 'castle_07_door_narration');
  await line('보라색 코드', 'castle_07b_door_cord_line');
  await page.evaluate(() => {
    const log = window.__shipCastleQA;
    const ids = ['lounge_junhee', 'lounge_yongjun', 'lounge_youngcle', 'ppaman', 'gyeongsub'];
    log.turn = [];
    const tick = () => {
      const facings = ids.map(id => game.entities.find(entity => entity.id === id)?.facing);
      log.turn.push({ x: game.player.x, right: facings.filter(dir => dir === 'right').length, facings, caption: !!game.textbox.node?.text?.includes('앗!') });
      if (log.turn.length < 1500 && game.shipCastle && game.shipCastle.beat !== 'ocean_rise') requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const rush = await beat('field_rush', 'castle_08_offscreen_rush');
  check('Gajaeman rush begins on the field overlay', rush.fullFrame === false);
  check('the slam shows a bottom caption from Ppaman', !!await until(() => game.textbox.node?.text?.includes('앗!') && game.textbox.node?.speaker === '억빠맨', 8000));
  await shot('castle_08b_slam_caption');
  check('that caption clears itself with no input at all', !!await until(() => !game.textbox.node?.text?.includes('앗!'), 4000));
  await beat('field_window', 'castle_09_window_break');
  const impact = await page.evaluate(() => { const carrier = game.entities.find(entity => entity.id === 'ship_castle_gajaeman'); return { reactions: ['lounge_junhee', 'lounge_yongjun', 'lounge_youngcle', 'ppaman', 'gyeongsub'].map(id => { const e = game.entities.find(x => x.id === id); return { id, facing: e.facing, emote: e.emote?.kind }; }),
    carrier: { x: carrier.x, y: carrier.y, visualScale: carrier.def.visualScale }, player: { x: game.player.x, y: game.player.y },
    shake: game.shake ? { ...game.shake } : null, sfx: window.__shipCastleQA.sfx.slice(-4) }; });
  check('the pane impact fires glass and explosion together with a hard shake', impact.sfx.includes('park_trial_shatter') && impact.sfx.includes('explosion') && impact.shake?.amp >= 8, JSON.stringify({ shake: impact.shake, sfx: impact.sfx }));
  await page.waitForTimeout(220);
  await shot('castle_09b_window_shards');
  check('all five witnesses face right with exclamation marks at impact', impact.reactions.every(actor => actor.facing === 'right' && actor.emote === '!'), JSON.stringify(impact.reactions));
  const turn = await page.evaluate(() => window.__shipCastleQA.turn);
  const captionFrames = turn.filter(sample => sample.caption);
  const slamX = captionFrames[0]?.x;
  const firstRight = turn.find(sample => sample.right > 0);
  check('during the centre slam caption the five still look at Yoplait, none right yet', captionFrames.length > 0 && captionFrames.every(sample => sample.right === 0 && sample.facings.every(dir => dir === 'down' || dir === 'up')), JSON.stringify(captionFrames[0]));
  check('the five turn right only once Gajaeman is already dragging Yoplait to the right', !!firstRight && slamX != null && firstRight.x >= slamX + 20 && firstRight.right === 5, JSON.stringify({ slamX, firstRight }));
  check('enlarged Gajaeman carries Yoplait upward through the pane before it breaks', impact.carrier.visualScale === 1.89 && impact.carrier.y === 150 && impact.player.y === 150 && impact.player.x >= 640, JSON.stringify(impact));
  const ocean = await beat('ocean_rise', 'castle_10_ocean_rise');
  const castleBgm = await page.evaluate(() => ({ name: game.sound.bgmName, src: game.sound.bgm?.src, loop: game.sound.bgm?.loop,
    request: window.__shipCastleQA.bgm.find(entry => entry.name === 'ship_castle') }));
  check('specified full-track BGM starts non-looping on the window impact and is still running at sea', castleBgm.name === 'ship_castle' && castleBgm.src.endsWith('/assets/audio/bgm/ship_castle.mp3') && castleBgm.loop === false && castleBgm.request?.options?.loop === false, JSON.stringify(castleBgm));
  check('ocean presentation takes over the full frame', ocean.fullFrame === true);
  check('establishing view starts with two complete connected ships and tiny airborne actors', ocean.geometry.maillard.y + ocean.geometry.maillard.height < 360 && ocean.geometry.warship.y + ocean.geometry.warship.height < 360 && ocean.ascent.scale < 0.15, JSON.stringify(ocean));
  await page.waitForTimeout(1000);
  await shot('castle_10a_establish_tiny_pair');
  const establishing = await page.evaluate(() => game.shipCastle.snapshot());
  check('fleet stays in view while the tiny pair first rises', establishing.ascent.bottom < ocean.ascent.bottom && establishing.geometry.warship.y + establishing.geometry.warship.height < 360 && establishing.ascent.scale < 0.15, JSON.stringify(establishing.ascent));
  await line('오 이게 뭐노', 'castle_10b_youngcle_spots_the_dots');
  const holding = await page.evaluate(() => game.shipCastle.snapshot());
  check('both reaction lines play on the held wide fleet shot, not mid-zoom', holding.ascentHeld === true && holding.ascent.zoom === 0 && holding.ascent.scale < 0.2, JSON.stringify(holding.ascent));
  check('the rising pair clears the horizon so both dots read against open sky', holding.ascent.bottom < holding.ascent.horizon, JSON.stringify(holding.ascent));
  check('both connected ships stay inside the dialogue budget while those lines play', [holding.geometry.warship, holding.geometry.maillard].every(rect => rect.x >= 0 && rect.x + rect.width <= 480 && rect.y >= 0 && rect.y + rect.height <= 230), JSON.stringify(holding.geometry));
  await line('요플래!!!', 'castle_10c_junhee_calls_yoplait');
  check('the camera push starts only after both reaction lines', !!await until(() => game.shipCastle?.snapshot().ascentHeld === false, 6000));
  const veilWatch = await fixture('observe-castle-veil', 'Sample the scene veil every frame without changing it; read-only presentation probe.', () => {
    window.__castleVeil = { max: 0, closed: false, reopened: false, bgmDuringVeil: null };
    const tick = () => {
      const scene = game.shipCastle;
      if (scene && !scene.disposed) {
        const snapshot = scene.snapshot();
        const veil = snapshot.veil;
        window.__castleVeil.max = Math.max(window.__castleVeil.max, veil);
        if (veil >= 0.99) { window.__castleVeil.closed = true; window.__castleVeil.bgmDuringVeil = game.sound.bgmName; }
        if (window.__castleVeil.closed && veil <= 0.01 && scene.beat === 'sky_tug') window.__castleVeil.reopened = true;
        if (snapshot.castleLanded && !window.__castleVeil.landedAt) window.__castleVeil.landedAt = performance.now();
        if (snapshot.beamsFired > 0 && !window.__castleVeil.firstBeamAt) window.__castleVeil.firstBeamAt = performance.now();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return true;
  });
  check('veil observer installed before the push finishes', veilWatch === true);
  await page.waitForTimeout(1700);
  await shot('castle_10d_zoom_push_mid');
  const ascending = await page.evaluate(() => game.shipCastle.snapshot());
  check('the camera pushes the whole frame in while the pair itself stays a dot', ascending.geometry.screen.zoom > establishing.geometry.screen.zoom * 2 && ascending.geometry.screen.horizon > establishing.geometry.screen.horizon && ascending.geometry.screen.warshipBottom > establishing.geometry.screen.warshipBottom, JSON.stringify({ before: establishing.geometry.screen, after: ascending.geometry.screen }));
  check('the pair never becomes a full-size sprite before the veil', ascending.ascent.scale < 0.2 && ascending.geometry.screen.pairScale > establishing.geometry.screen.pairScale && ascending.geometry.screen.pairScale < 1, JSON.stringify(ascending.geometry.screen));
  await page.waitForTimeout(1500);
  await shot('castle_10e_zoom_push_near');
  check('a black veil closes over the finished push', !!await until(() => game.shipCastle?.snapshot().veil > 0.2, 4000));
  await shot('castle_10f_black_veil');
  await beat('sky_tug');
  await shot('castle_10g_veil_opens_on_the_struggle');
  const veil = await page.evaluate(() => ({ ...window.__castleVeil, bgm: game.sound.bgmName, scroll: game.shipCastle?.scroll }));
  check('the veil fully closes and reopens on the close-up without cutting the music', veil.closed === true && veil.max >= 0.99 && veil.bgmDuringVeil === 'ship_castle' && veil.bgm === 'ship_castle', JSON.stringify(veil));
  check('scene clocks keep running under the veil so clouds never restart', veil.scroll > 0 && !!await until(() => game.shipCastle?.snapshot().veil === 0, 4000), JSON.stringify(veil));
  await shot('castle_11_sky_tug');
  await line('후후후 마음데로 될줄알았나.', 'castle_12_gajaeman_line');
  await beat('sky_opposite_aura');
  await page.waitForTimeout(1150);
  await shot('castle_13_opposite_aura');
  await line('ㅋㅋ이제 제대로 하는건가.', 'castle_13b_second_gajaeman_line');
  await line('하지만...', 'castle_13c_gajaeman_but_line');
  await beat('vortex_gather');
  await page.waitForTimeout(1800);
  await shot('castle_14_vortex_gather');
  const burst = await beat('vortex_burst');
  await page.waitForTimeout(90);
  await shot('castle_15a_vortex_burst_flash');
  await page.waitForTimeout(190);
  await shot('castle_15_vortex_burst');
  const burstAudio = await page.evaluate(() => ({ explosion: window.__shipCastleQA.sfx.filter(name => name === 'explosion').length, wing: window.__shipCastleQA.sfx.includes('wing'), shake: game.shake ? { ...game.shake } : null }));
  check('the burst fires the explosion clip on top of the whoosh with a hard shake', burstAudio.explosion >= 2 && burstAudio.wing && burstAudio.shake?.amp >= 12, JSON.stringify(burstAudio));
  await page.waitForTimeout(240);
  await shot('castle_15b_yoplait_hurled_to_the_sea');
  check('burst leaves the cord with Gajaeman', burst.cordOwner === 'gajaeman');
  check('the actual inventory loses every purple cord at theft', await until(() => game.flags.ship_castle_cord_stolen && !game.inventory.includes('보라색 코드 ?'), 5000));
  const revealStart = await beat('castle_reveal', 'castle_16a_reveal_gather_starts');
  check('the reveal opens on a gathering point with no castle yet', revealStart.geometry.phase.gather < 1 && revealStart.geometry.castle.width <= 12, JSON.stringify({ phase: revealStart.geometry.phase, castle: revealStart.geometry.castle }));
  check('Yoplait leaves from the centre of the sky and travels right', await page.evaluate(() => {
    const { flyFrom, flyTo } = game.shipCastle.config.ocean;
    return Math.abs(flyFrom[0] - 240) <= 20 && flyTo[0] > flyFrom[0] + 60;
  }), JSON.stringify(await page.evaluate(() => game.shipCastle.config.ocean.flyFrom.concat(game.shipCastle.config.ocean.flyTo))));
  await page.waitForTimeout(2600);
  await shot('castle_16b_gather_building');
  const gathering = await page.evaluate(() => game.shipCastle.snapshot());
  check('the gathering runs long before any castle exists', gathering.geometry.phase.gather < 1 && gathering.geometry.phase.gather > revealStart.geometry.phase.gather && gathering.geometry.castle.width <= 12, JSON.stringify(gathering.geometry.phase));
  await page.waitForTimeout(2300);
  await shot('castle_16c_burst_out');
  const emerging = await page.evaluate(() => game.shipCastle.snapshot());
  check('the castle bursts out of that point while it still hangs above the sea', emerging.geometry.castle.width > revealStart.geometry.castle.width * 6 && emerging.geometry.phase.lift > 0 && emerging.castleLanded === false, JSON.stringify({ phase: emerging.geometry.phase, castle: emerging.geometry.castle }));
  await page.waitForTimeout(1000);
  await shot('castle_16d_dropping');
  check('the castle lands on the water with exactly one heavy impact', !!await until(() => game.shipCastle?.snapshot().castleLanded === true, 6000)
    && await page.evaluate(() => window.__shipCastleQA.sfx.filter(name => name === 'furnace_blast').length === 1));
  await page.waitForTimeout(240);
  await shot('castle_16e_landing_waves');
  const landed = await page.evaluate(() => game.shipCastle.snapshot());
  check('waves roll out along the waterline while the fleet rides them', landed.geometry.wave > 0 && landed.geometry.wave < 1 && landed.geometry.phase.lift === 0
    && landed.geometry.phase.landed === true
    && Math.abs((landed.geometry.castle.y + landed.geometry.castle.height - 200) / landed.geometry.castle.height - 0.1) < 0.02, JSON.stringify({ wave: landed.geometry.wave, castle: landed.geometry.castle }));
  check('one powershot cue, never a repeating loop', await page.evaluate(() => window.__shipCastleQA.sfx.filter(name => name === 'energetic_powershot').length === 1));
  check('reveal completes before dialogue', !!await until(() => game.shipCastle?.elapsed >= game.shipCastle.config.timing.castleReveal - 0.1, 10000));
  await page.setViewportSize({ width: 1280, height: 900 });
  await shot('castle_16_whole_castle_1280');
  await page.setViewportSize({ width: 1000, height: 780 });
  const reveal = await page.evaluate(() => game.shipCastle.snapshot());
  check('whole castle projection is at least six warship widths', reveal.castleToWarship >= 6 && reveal.geometry.castle.width >= reveal.geometry.warship.width * 6, JSON.stringify(reveal.geometry));
  check('whole castle towers over both ships and all silhouettes clear the dialogue budget', reveal.geometry.castle.y >= 0 && reveal.geometry.castle.y < reveal.geometry.warship.y && [reveal.geometry.castle, reveal.geometry.warship, reveal.geometry.maillard].every(rect => rect.x >= 0 && rect.x + rect.width <= 480 && rect.y + rect.height <= 230), JSON.stringify(reveal.geometry));
  check('the resting castle stands a tenth under the waterline', Math.abs((reveal.geometry.castle.y + reveal.geometry.castle.height - 200) / reveal.geometry.castle.height - 0.1) < 0.02, JSON.stringify(reveal.geometry.castle));
  await line('저 저게뭐노');
  await line('씨발 저게 뭐야!!!', 'castle_17_reveal_dialogue');
  await line('요 요플래!!!!');
  check('a longer fade carries the wide shot into the sea fall', !!await until(() => game.shipCastle?.snapshot().veil > 0.5, 3000));
  await shot('castle_17b_fall_fade');
  await beat('yoplait_fall');
  await shot('castle_18a_fall_start_same_fleet');
  await page.waitForTimeout(900);
  await shot('castle_18_yoplait_fall');
  await page.waitForTimeout(1450);
  await shot('castle_18b_yoplait_splash');
  check('the sea entry plays one splash inside the pushed-in framing', await page.evaluate(() => window.__shipCastleQA.sfx.filter(name => name === 'maillard_splash').length === 1));
  await page.waitForTimeout(500);
  await shot('castle_18c_splash_settles');
  await beat('castle_attack');
  await page.waitForTimeout(600);
  await shot('castle_19a_castle_rests_before_any_beam');
  const beforeBeam = await page.evaluate(() => ({ beams: game.shipCastle.snapshot().beamsFired, wave: game.shipCastle.snapshot().geometry.wave }));
  check('the castle sits on settled water before the first beam', beforeBeam.beams === 0 && beforeBeam.wave >= 1, JSON.stringify(beforeBeam));
  await page.waitForTimeout(250);
  await shot('castle_19_castle_attack_charge');
  await page.waitForTimeout(450);
  await shot('castle_19b_castle_attack_beam');
  await line('일 일단 후퇴다 다시 돌아오자.\n저건 이길수없음', 'castle_19c_retreat_long_line');
  await line('큭 꼭 살아만 있어라 요플래');
  const retreatStart = await beat('retreat', 'castle_20_retreat');
  await page.waitForTimeout(2800);
  await shot('castle_20b_retreat_mid');
  const fleeing = await page.evaluate(() => game.shipCastle.snapshot());
  check('the linked pair runs far and fast while the beams chase them', fleeing.geometry.retreat > 80 && fleeing.geometry.warship.x < 200
    && Math.abs((fleeing.geometry.warship.x - fleeing.geometry.maillard.x) - (retreatStart.geometry.warship.x - retreatStart.geometry.maillard.x)) <= 1,
  JSON.stringify({ retreat: fleeing.geometry.retreat, start: retreatStart.geometry.warship.x, now: fleeing.geometry.warship.x }));
  await beat('final_hold', 'castle_21_transition_hold');
  check('required field and ocean sounds were emitted through the real audio API', await page.evaluate(() => ['bell', 'wing', 'park_trial_shatter', 'explosion', 'maillard_water_lift', 'power', 'rumble', 'energetic_powershot', 'laser_charge', 'laser_beam'].every(name => window.__shipCastleQA.sfx.includes(name))), JSON.stringify(await page.evaluate(() => window.__shipCastleQA)));
  const beamTiming = await page.evaluate(() => ({ landedAt: window.__castleVeil.landedAt, firstBeamAt: window.__castleVeil.firstBeamAt }));
  check('the beams only start well after the castle landed and its waves rolled out', beamTiming.landedAt > 0 && beamTiming.firstBeamAt > beamTiming.landedAt + 1500, JSON.stringify({ ...beamTiming, gapMs: Math.round(beamTiming.firstBeamAt - beamTiming.landedAt) }));
  check('three isolated charged beams do not retrigger during dialogue holds', await page.evaluate(() => ['laser_charge', 'laser_beam'].every(name => window.__shipCastleQA.sfx.filter(cue => cue === name).length === 3)));
  check('glass impact and castle BGM each have exactly one owner and cue', await page.evaluate(() => window.__shipCastleQA.sfx.filter(name => name === 'park_trial_shatter').length === 1 && window.__shipCastleQA.bgm.filter(entry => entry.name === 'ship_castle').length === 1));
  check('a black fade starts closing the retreat before the sea scene', !!await until(() => game.fade?.alpha >= 0.3, 6000));
  await shot('castle_21b_outro_fade_mid');
  check('that fade reaches full black between the two scenes', !!await until(() => game.fade?.alpha >= 0.95, 4000));
  check('castle completion and theft flags persist into the queued sinking continuation', !!await until(() => game.flags.ship_castle_done && game.flags.ship_castle_cord_stolen, 10000));
  check('castle surface hands off without cancelling the sinking script', !!await until(() => !game.shipCastle && game.shipMemory?.beat === 'underwater_enter' && game.dialogue.running, 10000));
  check('the underwater scene opens by fading back in', !!await until(() => game.fade?.alpha <= 0.1 && game.shipMemory, 8000));
  await page.waitForTimeout(1200);
  await shot('castle_22_underwater_sinking');
  const sinkingStart = await page.evaluate(() => ({ depth: game.shipMemory.sinkDepth, bgm: game.sound.bgmName, loop: game.sound.bgm?.loop }));
  check('underwater drift and exact non-looping music continue together', sinkingStart.depth > 0 && sinkingStart.bgm === 'ship_sinking' && sinkingStart.loop === false, JSON.stringify(sinkingStart));
  await line('...');
  await line('... ... ... 가재맨', 'castle_23_underwater_narration');
  await line('어쩌다가 우린');
  await line('이렇게 된걸까');
  await line('분명 행복한 삶이지 않았는가.');
  for (let index = 1; index <= 5; index++) {
    const name = `memory_${index}`;
    let reached = false;
    try {
      const handle = await page.waitForFunction(expected => game.shipMemory?.beat === expected, name, { timeout: 20000, polling: 80 });
      reached = await handle.jsonValue();
      await handle.dispose();
    } catch (error) { if (error.name !== 'TimeoutError') throw error; }
    check(`memory sequence reaches distinct panel ${index}`, !!reached);
    await page.waitForTimeout(5300);
    if (index === 3) await page.setViewportSize({ width: 768, height: 768 });
    await shot(`castle_2${3 + index}_memory_${index}`);
    if (index === 3) await page.setViewportSize({ width: 1000, height: 780 });
  }
  check('memory sequence returns to the same underwater actor', !!await until(() => game.shipMemory?.beat === 'underwater_return', 20000));
  await page.waitForTimeout(5000);
  await shot('castle_29_underwater_return');
  await line('... 그럼에도');
  await line('난 ... 포기할수...', 'castle_30_yoplait_resolve');
  check('very slow shore transition begins', !!await until(() => game.shipMemory?.beat === 'shore_transition', 10000));
  check('shore arrival changes map without replaying or keeping followers', !!await until(() => game.mapId === 'jjajang_shore' && game.dialogue.running && !game.shipMemory && game.entities.every(entity => entity.def.type !== 'follower'), 15000));
  await page.waitForTimeout(900);
  await shot('castle_31_shore_lying');
  await line('... ...');
  await line('여긴 어디지.', 'castle_32_shore_dialogue');
  check('shore arrival returns stable solo field control', !!await until(() => game.flags.ship_sinking_done && game.mapId === 'jjajang_shore' && game.state === 'field' && !game.dialogue.running && game.party.length === 0, 10000));
  const terminal = await page.evaluate(() => ({ inventory: [...game.inventory], party: [...game.party], partyHp: { ...game.partyHp }, followers: game.entities.filter(entity => entity.def.type === 'follower').length,
    pose: game.player.pose, facing: game.player.facing, bgm: game.sound.bgmName, flags: { stolen: game.flags.ship_castle_cord_stolen, castle: game.flags.ship_castle_done, shore: game.flags.ship_sinking_done } }));
  check('terminal inventory preserves progress except the stolen purple cord', JSON.stringify(terminal.inventory) === JSON.stringify(baseline.inventory.filter(item => item !== '보라색 코드 ?')), JSON.stringify({ baseline: baseline.inventory, terminal: terminal.inventory }));
  check('terminal state keeps companion stats but controls only standing Yoplait', terminal.followers === 0 && terminal.pose == null && terminal.facing === 'up' && JSON.stringify(terminal.partyHp) === JSON.stringify(baseline.partyHp), JSON.stringify(terminal));
  check('all completion flags and shore ambience are stable', terminal.flags.stolen && terminal.flags.castle && terminal.flags.shore && terminal.bgm === 'jjajang_shore', JSON.stringify(terminal));
  await page.setViewportSize({ width: 375, height: 667 });
  await shot('castle_33_shore_control_375');
  await page.setViewportSize({ width: 1000, height: 780 });
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(3100);
  await page.keyboard.up('ArrowUp');
  await shot('castle_34_forest_after_walk');
  const walked = await page.evaluate(() => ({ y: game.player.y, row: Math.floor(game.player.y / 32), role: game.map.def?.meta?.role || null }));
  check('three seconds of real walking reveals the blocked forest entrance', walked.row <= 8, JSON.stringify(walked));
  await press('KeyV');
  check('solo shore menu opens and X returns control', !!await until(() => game.state === 'menu', 2000));
  await shot('castle_35_solo_menu');
  await press('KeyX');
  check('menu closes back to shore field', !!await until(() => game.state === 'field', 2000));
  const saved = await page.evaluate(() => { game.autosave(); return JSON.parse(localStorage.getItem('subtarune.save.v1')); });
  check('save stores solo shore and never regrants stolen cord', saved.map === 'jjajang_shore' && saved.party.length === 0 && saved.flags.ship_sinking_done && saved.flags.ship_castle_cord_stolen && !saved.inventory.includes('보라색 코드 ?'), JSON.stringify(saved));
  await open();
  check('title loads with the completed save', !!await until(() => game.state === 'title' && game.hasSave(), 15000));
  await press('KeyZ');
  for (let index = 0; index < 40 && await page.evaluate(() => game.title?.phase !== 'locked'); index++) {
    await press('KeyC');
    await page.waitForTimeout(250);
  }
  await press('KeyQ');
  check('title Q opens the QA menu', !!await until(() => game.title.qa, 3000));
  const qaIds = await page.evaluate(async () => (await import('/src/core/story.js')).QA_POINTS.filter(point => !point.hidden).map(point => point.id));
  check('QA menu data includes castle, sinking, and shore checkpoints', ['ship_castle', 'ship_sinking', 'jjajang_shore'].every(id => qaIds.includes(id)), JSON.stringify(qaIds.slice(-8)));
  await shot('castle_36_title_qa');
  await open();
  await until(() => game.state === 'title', 15000);
  await press('KeyZ');
  for (let index = 0; index < 40 && await page.evaluate(() => game.title?.phase !== 'locked'); index++) {
    await press('KeyC');
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(3300);
  await press('KeyC');
  check('real Continue restores stable solo shore without replaying either cinematic', !!await until(() => game.mapId === 'jjajang_shore' && game.state === 'field' && !game.dialogue.running && !game.shipCastle && !game.shipMemory && game.party.length === 0, 15000));
  await page.waitForTimeout(2600);
  const continued = await page.evaluate(() => ({ flags: game.flags, inventory: game.inventory, followers: game.entities.filter(entity => entity.def.type === 'follower').length, bgm: game.sound.bgmName }));
  check('Continue keeps theft, completion, no followers, and shore ambience', continued.flags.ship_castle_cord_stolen && continued.flags.ship_castle_done && continued.flags.ship_sinking_done && !continued.inventory.includes('보라색 코드 ?') && continued.followers === 0 && continued.bgm === 'jjajang_shore', JSON.stringify(continued));
  await shot('castle_37_continue_shore');
});

async function powershotFocus({ page, check, until, open, press, shot, fixture }) {
  await open({ qa: 'ship_castle' });
  check('castle approach assets are ready', !!await until(() => game.mapId === 'ship_lounge' && !game.dialogue.running, 20000));
  await press('KeyX');
  await fixture('castle-powershot-adjacent-beats', 'Prepare the existing script at 하지만... after the sky confrontation; play the original vortex, reveal, reactions, fall and first beam at real time. Earlier lounge approach and later memories are outside this focused regression.', async () => {
    const { ship_castle } = await import('/src/data/cutscenes/ship_castle.js');
    const originalSfx = game.sound.sfx.bind(game.sound);
    window.__powershot = { calls: [], handle: null, playing: false, ended: false };
    game.sound.sfx = (name, options) => {
      const handle = originalSfx(name, options);
      window.__powershot.calls.push({ name, at: performance.now(), elapsed: game.shipCastle?.elapsed });
      if (name === 'energetic_powershot' && handle) {
        window.__powershot.handle = handle;
        handle.addEventListener('playing', () => { window.__powershot.playing = true; }, { once: true });
        handle.addEventListener('ended', () => { window.__powershot.ended = true; }, { once: true });
      }
      return handle;
    };
    game.startShipCastle().setBeat('ocean_rise').setBeat('sky_opposite_aura');
    game.runScript(Object.assign(ship_castle.slice(ship_castle.findIndex(node => node.text === '* 하지만...')), { silent: true }));
  });
  const line = async text => {
    await page.waitForFunction(expected => game.textbox.node?.text?.includes(expected), text, { timeout: 20000 });
    await press('KeyX');
    await page.waitForTimeout(100);
    await press('KeyC');
  };
  await shot('powershot_00_previous_confrontation');
  await line('하지만...');
  check('adjacent vortex burst still plays before castle creation', !!await until(() => game.shipCastle?.beat === 'vortex_burst', 5000));
  await shot('powershot_01_previous_burst');
  check('exact powershot begins actual browser playback', !!await until(() => window.__powershot.playing && window.__powershot.handle.currentTime > 0.1, 6000));
  const playback = await page.evaluate(() => {
    const audio = window.__powershot.handle;
    return { src: audio.currentSrc, currentTime: audio.currentTime, paused: audio.paused, rate: audio.playbackRate, duration: audio.duration, muted: audio.muted, volume: audio.volume, sceneTime: game.shipCastle.elapsed };
  });
  check('unmodified full clip plays once at its native speed with audible gain', playback.src.endsWith('/assets/audio/sfx/energetic_powershot.mp3') && playback.duration > 10.2 && playback.duration < 10.4 && playback.rate === 1 && !playback.paused && !playback.muted && playback.volume > 0, JSON.stringify(playback));
  await shot('powershot_02_audio_gather');
  check('audio gathers before any castle appears', !!await until(() => game.shipCastle?.elapsed >= 4.2, 6000));
  const gathering = await page.evaluate(() => game.shipCastle.snapshot());
  check('the four-second gathering remains only a point', gathering.geometry.phase.gather < 1 && gathering.geometry.castle.width < 12, JSON.stringify(gathering.geometry.phase));
  await shot('powershot_03_before_appearance');
  await until(() => game.shipCastle?.elapsed >= 4.9, 3000);
  await shot('powershot_04_castle_appears');
  const emerging = await page.evaluate(() => ({ snapshot: game.shipCastle.snapshot(), audioTime: window.__powershot.handle.currentTime }));
  check('castle grows and drops on the actual source clock', emerging.snapshot.geometry.castle.width > 70 && emerging.snapshot.geometry.phase.lift > 0 && !emerging.snapshot.castleLanded && Math.abs(emerging.snapshot.elapsed - emerging.audioTime) < 0.1, JSON.stringify({ phase: emerging.snapshot.geometry.phase, elapsed: emerging.snapshot.elapsed, audioTime: emerging.audioTime }));
  await until(() => game.shipCastle?.elapsed >= 6, 3000);
  await shot('powershot_05_castle_dropping');
  check('landing follows emergence with one impact', !!await until(() => game.shipCastle?.landPlayed, 3000));
  await page.waitForTimeout(240);
  await shot('powershot_06_impact_waves');
  const landed = await page.evaluate(() => game.shipCastle.snapshot());
  check('waves spread after landing with connected ships below the castle', landed.geometry.wave > 0 && landed.geometry.wave < 1 && landed.geometry.phase.lift === 0 && [landed.geometry.maillard, landed.geometry.warship].every(ship => ship.y > landed.geometry.castle.y && ship.y + ship.height <= 230), JSON.stringify(landed.geometry));
  await page.waitForFunction(() => game.textbox.node?.text?.includes('저 저게뭐노'), undefined, { timeout: 6000 });
  await press('KeyX');
  await page.waitForTimeout(100);
  await shot('powershot_07_reaction');
  check('waves finish before the first reaction and no beam intrudes', await page.evaluate(() => game.shipCastle.snapshot().geometry.wave >= 0.97 && game.shipCastle.beamIndex === 0));
  await line('저 저게뭐노');
  await line('씨발 저게 뭐야!!!');
  await line('요 요플래!!!!');
  check('Yoplait fall remains after castle reaction', !!await until(() => game.shipCastle?.beat === 'yoplait_fall', 3000));
  check('full original powershot reaches its own ended event across the real dialogue boundary', !!await until(() => window.__powershot.ended, 3000));
  await page.waitForTimeout(1000);
  await shot('powershot_08_following_fall');
  check('first beam remains after landing, waves and fall', !!await until(() => game.shipCastle?.beamIndex === 1, 6000));
  await shot('powershot_09_following_beam');
  const calls = await page.evaluate(() => window.__powershot.calls);
  check('powershot and impact each fire once without old summon overlays', calls.filter(cue => cue.name === 'energetic_powershot').length === 1 && calls.filter(cue => cue.name === 'furnace_blast').length === 1 && !calls.some(cue => ['mankatsuki_clone', 'boom'].includes(cue.name)), JSON.stringify(calls));
  await fixture('castle-powershot-abort', 'Replay only the reveal to exercise Escape during the new ten-second owned audio; original narrative completion is not forced.', () => {
    game.shipCastle.setBeat('castle_reveal');
  });
  check('second reveal starts one fresh real clip for abort test', !!await until(() => window.__powershot.handle.currentTime > 0.1 && !window.__powershot.handle.paused, 3000));
  await escToTitle(page);
  check('Escape releases powershot and scene without falsely completing story', !!await until(() => game.state === 'title' && !game.shipCastle && window.__powershot.handle.paused && !game.flags.ship_castle_done, 3000));
}
