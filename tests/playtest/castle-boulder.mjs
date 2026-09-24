import assert from 'node:assert/strict';
import { runScenario } from './lib/harness.mjs';

const INTRO = ['흠.. 영클형이 이쯤에서... 있었던거같은데', '음..', '2런 시발', '어 ㅎ2', '이게 무슨일이야?',
  '저 뒤에서 이 미친 돌을 밀고있음.', '잔말말고 빨리 도와 씨발 !!!!', '난 도움이 안될거같아서 일단 레이저쏘는중',
  '저 뒤에 누가있는거지?', '가재맨 모양의 누누와윌럼프가 있음', '와 타코 혼자서 이걸 막네', '형님들!',
  '안냐세여', '오우 지금 뭔상황이죠?', 'ㅈ된상황', '어.. 일단 쥰희 도와야하지 않을까요', '그런듯',
  '일단 이걸 좀 밀어야될거같은데', '다들 붙으시죠', '아.. 자 준비하고...', '밀어!!!!!!'];
const OUTRO = ['히야아ㅏ아아아아아아ㅏㅏ아아아압!', '맛이 어떠냐 쓰레기년', '휴.. 다행이네요',
  '일단 위에 또 이상한 방이 있네 요플래 갔다와.', '좀 쉬고있어야겠다.', '잘했음 ㅇㅇ'];
const STELES = ['나도 너희들이 하라고해서 한거야, 진정으로 내가 돌리고싶어서 돌린게 아니야.',
  '너희들도 웃어줬잖아, 내가 이긴판에서 좋아한게 뭐가 문제야?', '그래. 어린애를 그렇게 몰아친 내가 쓰레기지 위선자들.',
  '자격지심 아니야. 아니라고, 아니라면 아닌줄알아', '패드립하지마,, 더러운말을 하면 안됐었어... 난... 이런 시선을 받으려고... 살아온게..',
  '세상이 나를 억까하고 있어, 난 더 성공할 수 있는 사람이였어.'];

await runScenario({ name: 'castle-boulder', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const phase = process.env.BOULDER_PHASE || 'main';
  const errors = [], requiredFailures = [];
  page.on('response', response => { if (response.status() >= 400 && /(?:castle-boulder|nunusub316|castle_left_orb)/.test(response.url())) requiredFailures.push(`${response.status()} ${response.url()}`); });
  page.on('console', message => { if ((message.type() === 'error' && !/Failed to load resource/.test(message.text()))
    || /에셋 로드 실패|없는 라벨|\[script\] 없음/.test(message.text())) errors.push(message.text()); });
  const field = () => until(() => window.game?.state === 'field' && !game.dialogue.running && !game.transitioning
    && !game.castleBoulderPush && !game.castleOrb && game.fade.alpha < 0.01, 30000);
  const key = async code => { await press(code, { delay: 35 }); await page.waitForTimeout(70); };
  const walk = async (code, predicate, label, timeout = 16000) => {
    await page.keyboard.down(code);
    try { assert.ok(await until(predicate, timeout), `${label}: ${JSON.stringify(await snap())}`); }
    finally { await page.keyboard.up(code); }
  };
  const snap = () => page.evaluate(() => ({ map: game.mapId, state: game.state, x: game.player.x, y: game.player.y,
    party: [...game.party], flags: { done: !!game.flags.castle_boulder_done, left: !!game.flags.castle_left_seal_active, right: !!game.flags.castle_right_seal_active },
    dialogue: game.dialogue.running, text: game.textbox.node?.text, speaker: game.textbox.node?.speaker, voice: game.textbox.node?.voice,
    textbox: game.textbox.state, textboxOpen: game.textbox.isOpen, bgm: game.sound.bgmName, locked: game.camera.locked, fade: game.fade.alpha,
    scene: game.castleBoulder && { beat: game.castleBoulder.beat, elapsed: game.castleBoulder.elapsed, rockX: game.castleBoulder.rockX,
      angle: game.castleBoulder.rockAngle, monsterX: game.castleBoulder.monsterX, beams: game.castleBoulder.beams.length, crashed: game.castleBoulder.crashed },
    push: game.castleBoulderPush && { stage: game.castleBoulderPush.stage, phase: game.castleBoulderPush.phase,
      count: game.castleBoulderPush.count, marker: game.castleBoulderPush.marker, feedback: game.castleBoulderPush.feedback,
      result: game.castleBoulderPush.result, armed: game.castleBoulderPush.armed },
    orb: game.castleOrb && { beat: game.castleOrb.beat, elapsed: game.castleOrb.elapsed, side: game.castleOrb.orb?.flag },
  }));
  const responsive = async label => {
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(100); await shot(`${label}-${width}`);
      check(`${label} canvas fits ${width}`, await page.evaluate(() => { const r = game.canvas.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }));
    }
    await page.setViewportSize({ width: 1000, height: 780 });
  };
  let shotPrefix = '', captured = new Set();
  const capture = async (label, condition = true) => {
    if (shotPrefix.startsWith('cancel-')) return;
    if (condition && !captured.has(label)) { captured.add(label); await shot(`${shotPrefix}${label}`); }
  };
  const observe = async () => {
    const s = await snap();
    await capture('giant-reveal', s.scene?.beat === 'reveal' && s.scene.elapsed > 1.1);
    await capture('giant-reveal-settled', s.scene?.beat === 'reveal' && s.scene.elapsed > 2.5);
    await capture('laser-contact', s.scene?.beams > 0 && s.scene.beat === 'reveal');
    await capture('nunu-roar', s.scene?.beat === 'roar' && s.scene.elapsed > 0.6);
    await capture('rolling-mid', s.scene?.beat === 'launch' && s.scene.elapsed > 1.5 && s.scene.elapsed < 3.5);
    await capture('wall-crash', s.scene?.crashed && s.scene.elapsed > 4.3);
    return s;
  };
  const advanceStory = async (stop, label, timeout = 100000) => {
    const pages = [], started = Date.now(); let previous;
    while (Date.now() - started < timeout) {
      const s = await observe();
      if (s.text && s.textboxOpen && s.dialogue && s.text !== previous) {
        pages.push(s.text.replace(/^\* /, '').replace(/\n(?:\* )?/g, ' ')); previous = s.text;
      }
      if (await page.evaluate(stop)) return pages;
      if (s.dialogue && s.textboxOpen && ['typing', 'waiting'].includes(s.textbox)) {
        if (s.textbox === 'waiting') await capture(`${label.replace(/\s+/g, '-')}-line-${pages.length}`, true);
        await key('KeyC');
      } else await page.waitForTimeout(35);
    }
    assert.fail(`${label} timed out: ${JSON.stringify(await snap())}`);
  };
  const begin = async prefix => {
    shotPrefix = prefix; captured = new Set();
    await open({ qa: 'castle_boulder' });
    assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_boulder' && !!game.castleBoulder, 30000));
    await fixture('scene-observer', 'Record production SFX and final-screen scene state only; no timeline, HP, flags or position changes.', () => {
      const original = game.sound.sfx.bind(game.sound); window.boulderSounds = [];
      game.sound.sfx = (name, options) => { boulderSounds.push({ name, at: performance.now(), beat: game.castleBoulder?.beat }); return original(name, options); };
    });
    const pages = await advanceStory(() => !!game.castleBoulderPush, 'introduction reaches timing game');
    check(`${prefix} exact introduction dialogue order`, JSON.stringify(pages) === JSON.stringify(INTRO), JSON.stringify(pages));
    check(`${prefix} timing starts with three-person party and no completion flag`, await page.evaluate(() => game.party.join() === 'gyeongsub,ppaman'
      && !game.flags.castle_boulder_done && game.castleBoulderPush.phase === 'timing' && game.castleBoulderPush.stage === 0 && !game.sound.bgmName));
    check(`${prefix} generated rock monster and embedded wall images decoded`, await page.evaluate(() => ['assets/props/castle-boulder316.png',
      'assets/enemies/nunusub316.png', 'assets/props/castle-boulder-wall316.png'].every(src => game.propImages[src]?.width > 0)));
    await capture('timing-start');
  };
  const hit = async () => {
    const before = (await snap()).push.stage;
    await page.waitForFunction(() => { const s = game.castleBoulderPush; if (!s || s.phase !== 'timing' || s.feedback > 0 || !s.armed) return false;
      const center = [0.5, 0.68, 0.34, 0.6, 0.42][s.stage % 5]; return Math.abs(s.marker - center) < 0.02; }, undefined, { timeout: 6000, polling: 'raf' });
    await key('KeyC');
    const judged = (await snap()).push;
    const center = [0.5, 0.68, 0.34, 0.6, 0.42][before % 5], half = (0.25 - Math.min(9, before) * 0.012) / 2;
    const hitZone = judged.marker >= center - half && judged.marker <= center + half;
    check(`${shotPrefix} fresh timing input at stage ${before} matches the judged visible marker`, judged.feedback > 0
      && judged.stage === (hitZone ? before + 1 : Math.max(0, before - 1)) && judged.result === (hitZone ? 'hit' : 'miss'), JSON.stringify(judged));
  };
  const pushToLaunch = async deliberate => {
    if (deliberate) {
      await page.keyboard.down('KeyC'); await page.waitForTimeout(120); const one = (await snap()).push.stage;
      await page.waitForTimeout(1600); check('holding C cannot advance multiple timing stages', (await snap()).push.stage === one);
      await page.keyboard.up('KeyC'); await page.waitForTimeout(100);
      while ((await snap()).push.stage < 2) await hit();
      assert.ok(await until(() => game.castleBoulderPush.feedback <= 0 && game.castleBoulderPush.armed && game.castleBoulderPush.marker < 0.1, 5000));
      await key('KeyC');
      check('intentional miss loses exactly one stage', (await snap()).push.stage === 1 && (await snap()).push.result === 'miss', JSON.stringify((await snap()).push));
      await capture('timing-one-stage-miss'); await responsive('timing-ui');
    }
    while ((await snap()).push?.phase === 'timing') {
      if ((await snap()).push.stage >= 10) break;
      await hit();
    }
    assert.ok(await until(() => game.castleBoulderPush?.phase === 'mash', 3000));
    check(`${shotPrefix} all ten timing stages precede mash`, (await snap()).push.stage === 10 && (await snap()).push.count === 0);
    await capture('mash-start');
    if (deliberate) {
      await page.waitForTimeout(60); await page.keyboard.down('KeyC'); await page.waitForTimeout(120);
      const count = (await snap()).push.count; await page.waitForTimeout(800);
      check('holding C is not repeated mash input', (await snap()).push.count === count && count <= 1);
      await page.keyboard.up('KeyC'); await page.waitForTimeout(60);
    }
    let presses = 0;
    while ((await snap()).push?.phase === 'mash' && presses < 45) { await key('KeyC'); presses++; }
    check(`${shotPrefix} fresh presses fill final 35-press gauge`, (await snap()).push?.count === 35 && (await snap()).push.phase === 'complete');
    await capture('mash-full');
    await advanceStory(() => game.castleBoulder?.beat === 'launch', 'final shout starts real launch', 8000);
  };
  const narrateOrb = async prefix => {
    const pages = []; await key('KeyC');
    for (let i = 0; i < 3; i++) {
      assert.ok(await until(() => game.textbox.isOpen && game.textbox.state === 'waiting', 8000));
      pages.push(await page.evaluate(() => ({ text: game.textbox.node.text, voice: game.textbox.node.voice, speaker: game.textbox.node.speaker })));
      await shot(`${prefix}-narration-${i + 1}`); await key('KeyC');
    }
    check(`${prefix} exact narrator contact lines`, JSON.stringify(pages.map(p => p.text)) === JSON.stringify(['* ...', '* 알수없는 힘으로 가득한 구체다.', '* 나는 그것에 손을 가져다댔다.'])
      && pages.every(p => p.voice === 'narrator' && !p.speaker));
  };
  const continueTitle = async () => {
    assert.ok(await until(() => game.state === 'title' && game.title.phase === 'wait', 5000));
    await key('Space'); assert.ok(await until(() => game.title.phase === 'zoom', 5000));
    await key('KeyC'); assert.ok(await until(() => game.title.phase === 'locked' && game.title.time > 3.05, 6000));
    await key('KeyC');
    assert.ok(await until(() => game.state === 'field' && !game.transitioning, 20000));
  };

  if (phase === 'reveal') {
    await open({ qa: 'castle_boulder' });
    assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_boulder' && !!game.castleBoulder, 30000));
    await advanceStory(() => game.castleBoulder?.beat === 'reveal' && game.castleBoulder.elapsed > 2.55, 'settled threat reveal');
    check('settled reveal retains original encounter before completion', (await snap()).scene.beat === 'reveal' && !(await snap()).flags.done);
    return;
  }

  if (phase === 'cancel') {
    for (const boundary of ['timing', 'launch']) {
      await begin(`cancel-${boundary}-`);
      if (boundary === 'launch') { await pushToLaunch(false); await page.waitForTimeout(1200); }
      await shot(`cancel-${boundary}-before`); await key('Escape');
      assert.ok(await until(() => game.state === 'title' && !game.castleBoulderPush && !game.castleBoulder, 6000));
      await page.waitForTimeout(900);
      check(`${boundary} cancellation clears scene without false completion`, await page.evaluate(() => !game.flags.castle_boulder_done
        && !game.dialogue.running && !game.castleBoulder && !game.castleBoulderPush && !game.camera.locked));
      await shot(`cancel-${boundary}-title`);
      await continueTitle();
      check(`${boundary} continue preserves three-person unfinished state`, await page.evaluate(() => game.mapId === 'gajaeman_castle_boulder'
        && !game.flags.castle_boulder_done && game.party.join() === 'gyeongsub,ppaman'));
      await shot(`cancel-${boundary}-continued`);
    }
    await open({ qa: 'castle_left_orb' }); assert.ok(await field());
    await walk('ArrowUp', () => game.player.probe()?.id === 'castle_seal_orb', 'left orb cancel approach');
    await narrateOrb('cancel-left'); assert.ok(await until(() => game.castleOrb?.beat === 'pan', 12000));
    await shot('cancel-left-pan'); await key('Escape');
    assert.ok(await until(() => game.state === 'title' && !game.castleOrb, 6000));
    await page.waitForTimeout(500);
    await continueTitle(); assert.ok(await field());
    check('left pan cancellation preserves existing right seal and does not activate left', await page.evaluate(() => game.flags.castle_right_seal_active && !game.flags.castle_left_seal_active && !game.dialogue.running));
    await shot('cancel-left-continued');
    return;
  }

  if (phase === 'steles') {
    for (const map of ['gajaeman_regret1', 'gajaeman_regret2']) {
      await open({ qa: 'castle_boulder' }); assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_boulder', 30000));
      await fixture(`${map}-cleared-boundary`, 'Use the disclosed boulder QA cleared-regret state, then production map change to the regret-room start. This is stele-only preparation, not a natural combat clear; physical walking and C interactions follow.', async map => {
        game.dialogue.script = null; game.textbox.close();
        await game.changeMap(map, 'start', true, { enter: false }); game.fadeTo(0, 0.2);
      }, map); assert.ok(await field());
      const routes = map.endsWith('1') ? [
        [1, [['ArrowUp', 'y', 1190, -1], ['ArrowRight', 'x', 292, 1]], 'ArrowUp'],
        [2, [['ArrowLeft', 'x', 260, -1], ['ArrowUp', 'y', 968, -1], ['ArrowRight', 'x', 1030, 1], ['ArrowUp', 'y', 790, -1], ['ArrowRight', 'x', 1060, 1]], 'ArrowUp'],
        [3, [['ArrowLeft', 'x', 1030, -1], ['ArrowUp', 'y', 328, -1], ['ArrowLeft', 'x', 644, -1]], 'ArrowUp'],
      ] : [
        [4, [['ArrowLeft', 'x', 1156, -1]], 'ArrowUp'],
        [5, [['ArrowLeft', 'x', 300, -1], ['ArrowUp', 'y', 1090, -1], ['ArrowRight', 'x', 324, 1]], 'ArrowUp'],
        [6, [['ArrowLeft', 'x', 292, -1], ['ArrowUp', 'y', 808, -1], ['ArrowRight', 'x', 1124, 1]], 'ArrowUp'],
      ];
      for (const [number, steps, facing] of routes) {
        for (const [code, axis, value, sign] of steps) {
          await page.keyboard.down(code);
          try { await page.waitForFunction(({ axis, value, sign }) => sign > 0 ? game.player[axis] >= value : game.player[axis] <= value, { axis, value, sign }, { timeout: 18000 }); }
          finally { await page.keyboard.up(code); }
        }
        await key(facing);
        await walk(facing, () => game.player.probe()?.id?.startsWith('castle_regret_stele'), `stele ${number} visible C collider`, 4000);
        check(`stele ${number} correct physical probe`, await page.evaluate(n => game.player.probe()?.id === `castle_regret_stele${n}`, number));
        await key('KeyC'); assert.ok(await until(() => game.textbox.state === 'waiting', 9000));
        const text = await page.evaluate(() => ({ text: game.textbox.node.text, voice: game.textbox.node.voice, speaker: game.textbox.node.speaker, portrait: game.textbox.node.portrait }));
        check(`stele ${number} exact narrator wording without portrait`, text.text.replaceAll('\n', ' ') === `* ${STELES[number - 1]}`
          && text.voice === 'narrator' && !text.speaker && !text.portrait, JSON.stringify(text));
        await shot(`stele-${number}`); if (number === 5) await responsive('stele-longest');
        await key('KeyC'); assert.ok(await field());
      }
    }
    return;
  }

  if (phase === 'after') { await open({ qa: 'castle_boulder_after' }); assert.ok(await field()); }
  else {
    await begin(''); await pushToLaunch(true);
    const launch = await snap();
    check('launch has not prematurely marked the event completed', !launch.flags.done);
    const outro = await advanceStory(() => !!game.flags.castle_boulder_done && !game.dialogue.running, 'launch crash and solo aftermath', 35000);
    assert.ok(await field());
    check('aftermath preserves exact final dialogue', JSON.stringify(outro) === JSON.stringify(OUTRO.slice(1)), JSON.stringify(outro));
    check('rock visibly travels right then crashes before completion', captured.has('rolling-mid') && captured.has('wall-crash') && launch.scene.rockX < 2200);
    check('completion leaves solo player and eight visible waiting allies with real sheets', await page.evaluate(() => game.party.length === 0 && !game.castleBoulderPush && !game.castleBoulder
      && !game.camera.locked && game.entities.filter(e => /^boulder_/.test(e.id) && e.def.type === 'npc' && e.visible).length >= 8
      && game.entities.filter(e => /^boulder_/.test(e.id) && e.visible && e.sprite).every(e => !e.sprite.fallback)));
    await responsive('completed-wall-party');
    check('scene sound cues include laser roar and crash', await page.evaluate(() => ['laser_zap', 'baron_roar', 'furnace_blast', 'break1'].every(name => boulderSounds.some(s => s.name === name))));
    const timingSounds = await page.evaluate(() => boulderSounds.filter(sound => sound.beat === 'push').map(sound => sound.name));
    check('successful timing uses great_shine and never ember', timingSounds.includes('great_shine') && !timingSounds.includes('ember'), JSON.stringify(timingSounds));
  }
  await walk('ArrowDown', () => game.player.y >= 754, 'go below resting allies');
  await walk('ArrowLeft', () => game.textbox.isOpen, 'left return guard triggers');
  assert.ok(await until(() => game.textbox.state === 'waiting', 6000));
  check('Junhee left guard has requested line', await page.evaluate(() => game.textbox.node.text === '* 빨리 갔다와.' && game.textbox.node.voice === 'junhee'));
  await shot('left-guard'); await key('KeyC'); assert.ok(await field());
  check('left guard returns player to safe east position', (await snap()).x >= 2950);
  await fixture('save-solo-boulder', 'After testing the natural same-map left guard, persist completed boulder via production autosave and continueGame without altering the save.', async () => { game.autosave(); await game.continueGame(); });
  assert.ok(await field());
  check('boulder continue restores solo completion without replay', (await snap()).flags.done && (await snap()).party.length === 0 && !(await snap()).scene);
  await walk('ArrowRight', () => game.player.x >= 3140, 'align north orb approach');
  await walk('ArrowUp', () => game.player.probe()?.id === 'castle_boulder_orb_door', 'north closed door C probe');
  await shot('north-door-before'); await key('KeyC');
  assert.ok(await until(() => game.mapId === 'gajaeman_castle_left_orb', 12000)); assert.ok(await field());
  const before = await snap();
  check('natural north door reaches left orb solo preserving right seal', before.party.length === 0 && before.flags.right && !before.flags.left && before.bgm === 'castle_orb');
  await walk('ArrowUp', () => game.player.probe()?.id === 'castle_seal_orb', 'walk to left orb');
  await narrateOrb('left-activation');
  const seen = [], seals = [], started = Date.now();
  while (Date.now() - started < 20000) {
    const s = await snap(); if (!s.orb) break;
    if (!seen.includes(s.orb.beat)) { seen.push(s.orb.beat); await page.waitForTimeout(180); await shot(`left-orb-${s.orb.beat}`); }
    seals.push({ beat: s.orb.beat, ...s.flags });
    await page.waitForTimeout(100);
  }
  assert.ok(await field());
  check('right seal remains active throughout every left-orb beat', ['charge', 'out', 'reveal', 'pan', 'crackle', 'ignite', 'hold', 'returnOut', 'returnIn'].every(beat => seals.some(sample => sample.beat === beat))
    && seals.every(sample => sample.right), JSON.stringify(seals));
  check('left orb actual pan ignites only left while keeping right', ['pan', 'ignite', 'returnIn'].every(beat => seen.includes(beat)) && (await snap()).flags.left && (await snap()).flags.right);
  await responsive('left-orb-completed');
  await fixture('save-completed-left-orb', 'Persist only the naturally completed boulder and left seal through production autosave and continueGame. No save content is altered.', async () => { game.autosave(); await game.continueGame(); });
  assert.ok(await field()); check('continue preserves solo completed boulder and both seals', (await snap()).party.length === 0 && (await snap()).flags.done && (await snap()).flags.left && (await snap()).flags.right);
  await walk('ArrowDown', () => game.mapId === 'gajaeman_castle_boulder', 'south exit returns to completed boulder'); assert.ok(await field());
  await shot('returned-completed-wall'); check('return does not replay boulder or restore party', (await snap()).party.length === 0 && !(await snap()).scene && (await snap()).flags.done);
  await walk('ArrowUp', () => game.player.probe()?.id === 'castle_boulder_orb_door', 're-enter completed left orb'); await key('KeyC');
  assert.ok(await until(() => game.mapId === 'gajaeman_castle_left_orb', 12000)); assert.ok(await field());
  await walk('ArrowUp', () => game.player.probe()?.id === 'castle_seal_orb', 'reinspect completed left orb'); await key('KeyC');
  assert.ok(await until(() => game.textbox.state === 'waiting', 6000));
  check('left orb repeat C only reads completed state', await page.evaluate(() => !game.castleOrb && game.textbox.node.text === '* 구체가 보라색으로 빛나고 있다.'));
  await shot('left-orb-repeat');
  check('no scene module or asset loading errors', errors.length === 0, JSON.stringify(errors));
  check('required boulder assets and modules have no failed HTTP responses', requiredFailures.length === 0, JSON.stringify(requiredFailures));
});
