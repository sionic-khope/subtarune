import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'ship-castle', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, check, until, open, press, shot, fixture }) => {
  await open({ qa: 'ship_castle' });
  check('QA starts below the untouched proximity trigger', !!await until(() => game.mapId === 'ship_lounge' && !game.dialogue.running && !game.flags.ship_castle_started, 20000));
  await page.keyboard.down('ArrowUp');
  check('interrupt audit first reaches the event through real walking', !!await until(() => game.flags.ship_castle_started && game.dialogue.running && game.shipCastle, 12000));
  await page.keyboard.up('ArrowUp');
  await press('Escape');
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
  const rush = await beat('field_rush', 'castle_08_offscreen_rush');
  check('Gajaeman rush begins on the field overlay', rush.fullFrame === false);
  await beat('field_window', 'castle_09_window_break');
  const impact = await page.evaluate(() => { const carrier = game.entities.find(entity => entity.id === 'ship_castle_gajaeman'); return { reactions: ['lounge_junhee', 'lounge_yongjun', 'lounge_youngcle', 'ppaman', 'gyeongsub'].map(id => { const e = game.entities.find(x => x.id === id); return { id, facing: e.facing, emote: e.emote?.kind }; }),
    carrier: { x: carrier.x, y: carrier.y, visualScale: carrier.def.visualScale }, player: { x: game.player.x, y: game.player.y } }; });
  check('all five witnesses face right with exclamation marks at impact', impact.reactions.every(actor => actor.facing === 'right' && actor.emote === '!'), JSON.stringify(impact.reactions));
  check('enlarged Gajaeman carries Yoplait upward through the pane before it breaks', impact.carrier.visualScale === 1.89 && impact.carrier.y === 150 && impact.player.y === 150 && impact.player.x >= 640, JSON.stringify(impact));
  const ocean = await beat('ocean_rise', 'castle_10_ocean_rise');
  const castleBgm = await page.evaluate(() => ({ name: game.sound.bgmName, src: game.sound.bgm?.src, loop: game.sound.bgm?.loop,
    request: window.__shipCastleQA.bgm.find(entry => entry.name === 'ship_castle') }));
  check('specified full-track BGM starts non-looping only after the window exit', castleBgm.name === 'ship_castle' && castleBgm.src.endsWith('/assets/audio/bgm/ship_castle.mp3') && castleBgm.loop === false && castleBgm.request?.options?.loop === false, JSON.stringify(castleBgm));
  check('ocean presentation takes over the full frame', ocean.fullFrame === true);
  await beat('sky_tug', 'castle_11_sky_tug');
  await line('후후후 마음데로 될줄알았나.', 'castle_12_gajaeman_line');
  await beat('sky_opposite_aura', 'castle_13_opposite_aura');
  await line('ㅋㅋ이제 제대로 하는건가.', 'castle_13b_second_gajaeman_line');
  await beat('vortex_gather');
  await page.waitForTimeout(1800);
  await shot('castle_14_vortex_gather');
  const burst = await beat('vortex_burst');
  await page.waitForTimeout(450);
  await shot('castle_15_vortex_burst');
  check('burst leaves the cord with Gajaeman', burst.cordOwner === 'gajaeman');
  check('the actual inventory loses every purple cord at theft', await until(() => game.flags.ship_castle_cord_stolen && !game.inventory.includes('보라색 코드 ?'), 5000));
  await beat('castle_reveal');
  check('reveal zooms out before dialogue', !!await until(() => game.shipCastle?.elapsed >= game.shipCastle.config.timing.castleReveal - 0.1, 6000));
  await page.setViewportSize({ width: 1280, height: 900 });
  await shot('castle_16_whole_castle_1280');
  await page.setViewportSize({ width: 1000, height: 780 });
  const reveal = await page.evaluate(() => game.shipCastle.snapshot());
  check('whole castle projection is at least six warship widths', reveal.castleToWarship >= 6 && reveal.geometry.castle.width >= reveal.geometry.warship.width * 6, JSON.stringify(reveal.geometry));
  await line('저 저게뭐노');
  await line('씨발 저게 뭐야!!!', 'castle_17_reveal_dialogue');
  await line('요 요플래!!!!');
  await beat('yoplait_fall');
  await page.waitForTimeout(700);
  await shot('castle_18_yoplait_fall');
  await page.waitForTimeout(1000);
  await shot('castle_18b_yoplait_splash');
  await beat('castle_attack');
  await page.waitForTimeout(260);
  await shot('castle_19_castle_attack_charge');
  await page.waitForTimeout(70);
  await shot('castle_19b_castle_attack_beam');
  await line('일 일단 후퇴다 다시 돌아오자.\n저건 이길수없음', 'castle_19c_retreat_long_line');
  await line('큭 꼭 살아만 있어라 요플래');
  await beat('retreat', 'castle_20_retreat');
  await beat('final_hold', 'castle_21_transition_hold');
  check('required field and ocean sounds were emitted through the real audio API', await page.evaluate(() => ['bell', 'wing', 'park_trial_shatter', 'maillard_water_lift', 'power', 'rumble', 'laser_charge', 'laser_beam'].every(name => window.__shipCastleQA.sfx.includes(name))), JSON.stringify(await page.evaluate(() => window.__shipCastleQA)));
  check('castle completion and theft flags persist into the queued sinking continuation', !!await until(() => game.flags.ship_castle_done && game.flags.ship_castle_cord_stolen, 10000));
  check('castle surface hands off without cancelling the sinking script', !!await until(() => !game.shipCastle && game.shipMemory?.beat === 'underwater_enter' && game.dialogue.running, 10000));
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
