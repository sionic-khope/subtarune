import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { runScenario } from './lib/harness.mjs';
import { escToTitle } from './lib/esc.mjs';

const INTRO = ['흠.. 영클형이 이쯤에서... 있었던거같은데', '음..', '2런 시발', '어 ㅎ2', '이게 무슨일이야?',
  '저 뒤에서 이 미친 돌을 밀고있음.', '잔말말고 빨리 도와 씨발 !!!!', '난 도움이 안될거같아서 일단 레이저쏘는중',
  '저 뒤에 누가있는거지?', '가재맨 모양의 누누와윌럼프가 있음', '와 타코 혼자서 이걸 막네', '형님들!',
  '안냐세여', '오우 지금 뭔상황이죠?', 'ㅈ된상황', '어.. 일단 쥰희 도와야하지 않을까요', '그런듯',
  '일단 이걸 좀 밀어야될거같은데', '다들 붙으시죠', '아.. 자 준비하고...', '타이밍에 맞춰서 c를 눌러, 합 맞춰서 미는거야!', '밀어!!!!!!'];
const INTERLUDE = '거의다 온거같아 마지막 스퍼트다 밀어!!!!!';
const OUTRO = ['히야아ㅏ아아아아아아ㅏㅏ아아아압!', '맛이 어떠냐 쓰레기년', '휴.. 다행이네요',
  '일단 위에 또 이상한 방이 있네 요플래 갔다와.', '좀 쉬고있어야겠다.', '잘했음 ㅇㅇ'];
const STELES = ['나도 너희들이 하라고해서 한거야, 진정으로 내가 돌리고싶어서 돌린게 아니야.',
  '너희들도 웃어줬잖아, 내가 이긴판에서 좋아한게 뭐가 문제야?', '그래. 어린애를 그렇게 몰아친 내가 쓰레기지 위선자들.',
  '자격지심 아니야. 아니라고, 아니라면 아닌줄알아', '패드립하지마,, 더러운말을 하면 안됐었어... 난... 이런 시선을 받으려고... 살아온게..',
  '세상이 나를 억까하고 있어, 난 더 성공할 수 있는 사람이였어.'];

await runScenario({ name: 'castle-boulder', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const phase = process.env.BOULDER_PHASE || 'main';
  const bounded = ['audio-baseline', 'audio-staging', 'audio-cancel'].includes(phase);
  const sourceRoot = process.env.QA_RESULT_FILE
    ? JSON.parse(fs.readFileSync(path.join(path.dirname(process.env.QA_RESULT_FILE), '..', 'summary.json'), 'utf8')).cwd
    : process.cwd();
  const boundSources = ['src/data/cutscenes/castle_boulder.js', 'src/scenes/castle-boulder.js', 'src/scenes/castle-boulder-push.js', 'assets/maps/gajaeman_castle_boulder.json'];
  if (bounded) boundSources.push('src/core/audio.js', 'src/data/build.js', 'assets/audio/bgm/baron_intro.mp3', 'assets/audio/bgm/castle_battle.mp3',
    'assets/audio/sfx/laser_zap.mp3', 'assets/audio/sfx/rumble.mp3', 'assets/audio/sfx/baron_roar.mp3');
  for (const file of boundSources) {
    const local = fs.readFileSync(path.join(sourceRoot, file));
    const response = await fetch(new URL(file, process.env.QA_BASE_URL));
    const served = Buffer.from(await response.arrayBuffer());
    const hash = data => createHash('sha256').update(data).digest('hex');
    check(`served source identity ${file}`, response.ok && hash(local) === hash(served), hash(served));
  }
  const fixedWidth = Number(process.env.BOULDER_WIDTH || 0);
  if (fixedWidth) { assert.ok([375, 768, 1280].includes(fixedWidth)); await page.setViewportSize({ width: fixedWidth, height: 900 }); }
  const errors = [], requiredFailures = [];
  page.on('response', response => { if (response.status() >= 400 && /(?:castle-boulder|nunusub316|castle_left_orb|\.(?:js|json)(?:\?|$))/.test(response.url())) requiredFailures.push(`${response.status()} ${response.url()}`); });
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
    textbox: game.textbox.state, textboxOpen: game.textbox.isOpen, bgm: game.sound.bgmName,
    bgmTime: game.sound.bgm?.currentTime, bgmPaused: game.sound.bgm?.paused,
    camera: { x: game.camera.x, y: game.camera.y, zoom: game.zoom.s }, locked: game.camera.locked, fade: game.fade.alpha,
    scene: game.castleBoulder && { beat: game.castleBoulder.beat, elapsed: game.castleBoulder.elapsed, rockX: game.castleBoulder.rockX,
      angle: game.castleBoulder.rockAngle, monsterX: game.castleBoulder.monsterX, beams: game.castleBoulder.beams.length, crashed: game.castleBoulder.crashed },
    push: game.castleBoulderPush && { stage: game.castleBoulderPush.stage, phase: game.castleBoulderPush.phase,
      elapsed: game.castleBoulderPush.elapsed,
      count: game.castleBoulderPush.count, marker: game.castleBoulderPush.marker, feedback: game.castleBoulderPush.feedback,
      result: game.castleBoulderPush.result, armed: game.castleBoulderPush.armed },
    orb: game.castleOrb && { beat: game.castleOrb.beat, elapsed: game.castleOrb.elapsed, side: game.castleOrb.orb?.flag },
  }));
  const responsive = async label => {
    for (const width of fixedWidth ? [fixedWidth] : [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(100); await shot(`${label}-${width}`);
      check(`${label} canvas fits ${width}`, await page.evaluate(() => { const r = game.canvas.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }));
    }
    if (!fixedWidth) await page.setViewportSize({ width: 1000, height: 780 });
  };
  let shotPrefix = '', captured = new Set();
  const capture = async (label, condition = true) => {
    if (shotPrefix.startsWith('cancel-')) return;
    if (bounded && !['giant-reveal', 'giant-reveal-settled', 'laser-contact', 'gauge-lead-settled', 'timing-start',
      'ten-hit-interlude-start', 'ten-hit-shove-mid', 'ten-hit-nunu-roar', 'ten-hit-final-sprint-line-1', 'mash-start', 'rolling-mid', 'wall-crash'].includes(label)) return;
    if (condition && !captured.has(label)) { captured.add(label); await shot(`${shotPrefix}${label}`); }
  };
  const observe = async () => {
    const s = await snap();
    await capture('giant-reveal', s.scene?.beat === 'reveal' && s.scene.elapsed > 1.1);
    const settledReveal = phase === 'audio-baseline' ? s.scene?.beat === 'reveal' && s.scene.elapsed > 2.5
      : s.scene?.beat === 'focus' && s.scene.elapsed > 0.35;
    await capture('giant-reveal-settled', settledReveal);
    await capture('laser-contact', s.scene?.beams > 0 && [phase === 'audio-baseline' ? 'reveal' : 'focus'].includes(s.scene.beat));
    await capture('nunu-roar', s.scene?.beat === 'roar' && s.scene.elapsed > 0.6);
    await capture('ten-hit-shove-mid', s.scene?.beat === 'surge' && s.scene.elapsed > 0.4);
    await capture('ten-hit-nunu-roar', s.scene?.beat === 'surge' && s.scene.elapsed > 1.3);
    await capture('rolling-mid', s.scene?.beat === 'launch' && s.scene.elapsed > 1.5 && s.scene.elapsed < 3.5);
    await capture('wall-crash', s.scene?.crashed && s.scene.elapsed > 4.3);
    if (bounded && settledReveal && !captured.has('reveal-audio-checked')) {
      captured.add('reveal-audio-checked');
      check('first Youngcle-rock reveal plays advancing tense music', s.bgm === 'baron_intro' && s.bgmTime > 0.1 && !s.bgmPaused, JSON.stringify(s));
    }
    if (bounded && s.text === '* 다들 붙으시죠' && s.textbox === 'waiting' && !captured.has('spectators')) {
      captured.add('spectators');
      const group = await page.evaluate(() => {
        const junhee = game.entities.find(e => e.id === 'boulder_junhee');
        return { junhee: { x: junhee.x, y: junhee.y }, spectators: [game.player, ...['gyeongsub', 'ppaman', 'boulder_bidet', 'boulder_mario', 'boulder_ttuulla', 'boulder_park'].map(id => game.entities.find(e => e.id === id))].map(e => ({ id: e.id, x: e.x, y: e.y, w: e.w })) };
      });
      check('spectators stay left behind Junhee until invitation', group.spectators.every(e => e.x + e.w <= group.junhee.x - 40), JSON.stringify(group));
      if (phase !== 'audio-cancel') await responsive('spectators-before-joining');
    }
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
    const begun = await until(() => window.game?.mapId === 'gajaeman_castle_boulder' && !!game.castleBoulder, 30000);
    if (!begun) {
      await shot('begin-failure');
      const state = await page.evaluate(() => ({ ready: !!window.game, state: window.game?.state, map: window.game?.mapId,
        transitioning: window.game?.transitioning, dialogue: window.game?.dialogue?.running, text: window.game?.textbox?.node?.text }));
      check('boulder QA startup state', false, JSON.stringify({ state, errors, requiredFailures }));
    }
    assert.ok(begun, 'boulder QA scene starts');
    await fixture('scene-observer', 'Record production SFX/BGM and phase timing only; no timeline, HP, flags or position changes. Audio call observation is not subjective listening approval.', () => {
      window.boulderSounds = []; window.boulderTimeline = []; window.boulderAudioHandles = [];
      for (const method of ['sfx', 'playBgm', 'stopBgm']) {
        const original = game.sound[method].bind(game.sound);
        game.sound[method] = (...args) => {
          const event = { method, name: args[0], at: performance.now(), beat: game.castleBoulder?.beat,
            text: game.textbox.node?.text, phase: game.castleBoulderPush?.phase, elapsed: game.castleBoulderPush?.elapsed,
            camera: { x: game.camera.x, y: game.camera.y, zoom: game.zoom.s } };
          if (args[0] === 'laser_zap' && game.castleBoulder) {
            const scene = game.castleBoulder, beam = scene.beams.at(-1), z = game.zoom.s;
            const project = (x, y) => ({ x: (x - game.camera.x - 240) * z + 240, y: (y - game.camera.y - 180) * z + 180 });
            event.focus = beam && { emitter: project(...beam.from), rockContact: project(...beam.to) };
          }
          const result = original(...args), handle = method === 'playBgm' ? game.sound.bgm : result;
          boulderSounds.push(event);
          if (handle instanceof HTMLMediaElement) {
            event.audio = { src: handle.src, initialTime: handle.currentTime, maxTime: handle.currentTime, playingSamples: 0, volume: handle.volume };
            boulderAudioHandles.push({ event, handle });
          }
          return result;
        };
      }
      const scene = game.castleBoulder; let previous = '';
      const observe = () => {
        if (game.castleBoulder !== scene) return;
        for (const { event, handle } of boulderAudioHandles) {
          event.audio.maxTime = Math.max(event.audio.maxTime, handle.currentTime);
          event.audio.volume = Math.max(event.audio.volume, handle.volume);
          if (!handle.paused && handle.currentTime > event.audio.initialTime) event.audio.playingSamples++;
        }
        const push = game.castleBoulderPush;
        const state = `${scene.beat}:${push?.phase || ''}:${game.textbox.isOpen ? game.textbox.node?.text : ''}`;
        if (state !== previous) { previous = state; boulderTimeline.push({ at: performance.now(), beat: scene.beat,
          phase: push?.phase, elapsed: push?.elapsed, stage: push?.stage, text: game.textbox.isOpen ? game.textbox.node?.text : null,
          rockX: scene.rockX, bgm: game.sound.bgmName, camera: { x: game.camera.x, y: game.camera.y, zoom: game.zoom.s } }); }
        requestAnimationFrame(observe);
      }; requestAnimationFrame(observe);
    });
    const pages = await advanceStory(() => !!game.castleBoulderPush, 'introduction reaches timing game');
    check(`${prefix} exact introduction dialogue order`, JSON.stringify(pages) === JSON.stringify(INTRO), JSON.stringify(pages));
    check(`${prefix} gauge entrance keeps three-person party and no completion flag`, await page.evaluate(() => game.party.join() === 'gyeongsub,ppaman'
      && !game.flags.castle_boulder_done && game.castleBoulderPush.phase === 'intro' && game.castleBoulderPush.stage === 0 && game.sound.bgmName === 'castle_battle'));
    check(`${prefix} generated rock monster and embedded wall images decoded`, await page.evaluate(() => ['assets/props/castle-boulder316.png',
      'assets/enemies/nunusub316.png', 'assets/props/castle-boulder-wall316.png'].every(src => game.propImages[src]?.width > 0)));
    const lineup = await page.evaluate(() => ({ pushers: game.castleBoulder.pushers.map(a => ({ id: a.id, x: a.x, y: a.y })),
      youngcle: { x: game.castleBoulder.youngcle.x, y: game.castleBoulder.youngcle.y },
      helpers: game.entities.filter(e => ['boulder_park', 'boulder_ttuulla'].includes(e.id)).map(e => ({ id: e.id, sprite: e.def.sprite, scale: e.def.visualScale })) }));
    check(`${prefix} eight pushers form one line below hovering Youngcle`, lineup.pushers.length === 8 && !lineup.pushers.some(a => a.id === 'boulder_youngcle')
      && Math.max(...lineup.pushers.map(a => a.y)) - Math.min(...lineup.pushers.map(a => a.y)) <= 2
      && lineup.youngcle.y < Math.min(...lineup.pushers.map(a => a.y)) - 80, JSON.stringify(lineup));
    check(`${prefix} helpers use original costume and requested visual scales`, lineup.helpers.some(a => a.id === 'boulder_park' && a.sprite === 'park_guardian_costume' && a.scale === 2.22)
      && lineup.helpers.some(a => a.id === 'boulder_ttuulla' && a.sprite === 'ttuulla' && a.scale === 1.79), JSON.stringify(lineup.helpers));
    await capture('gauge-lead-hidden');
    await page.keyboard.down('KeyC');
    assert.ok(await until(() => game.castleBoulderPush?.elapsed >= 1.8, 4000));
    check(`${prefix} lead rejects C while gauge is absent`, (await snap()).push.phase === 'intro' && (await snap()).push.stage === 0);
    await capture('gauge-lead-settled');
    await page.waitForFunction(() => game.castleBoulderPush?.elapsed >= 2.18, undefined, { polling: 'raf', timeout: 4000 });
    await capture('gauge-fade-mid');
    assert.ok(await until(() => game.castleBoulderPush?.phase === 'timing', 3000));
    check(`${prefix} held entrance C cannot score at timing start`, (await snap()).push.stage === 0);
    await page.keyboard.up('KeyC'); await page.waitForTimeout(60);
    await capture('timing-start');
    const pixels = await page.evaluate(() => {
      const { width, height } = game.canvas;
      const data = game.canvas.getContext('2d').getImageData(0, 0, width, Math.ceil(height / 3)).data;
      let purple = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i] === 180 && data[i + 1] === 95 && data[i + 2] === 252) purple++;
      return purple;
    });
    check(`${prefix} active gauge renders the requested purple success region`, pixels > 50, String(pixels));
    const entrance = await page.evaluate(() => ({ sounds: boulderSounds.filter(s => s.method !== 'sfx'),
      phases: boulderTimeline.filter(s => s.phase === 'intro' || s.phase === 'timing'),
      instruction: boulderTimeline.find(s => s.text?.includes('타이밍에 맞춰서 c를 눌러')),
      audio: { name: game.sound.bgmName, time: game.sound.bgm?.currentTime, paused: game.sound.bgm?.paused } }));
    const music = entrance.sounds.filter(s => s.method === 'playBgm' && s.name === 'castle_battle');
    const introAt = entrance.phases.find(s => s.phase === 'intro'), activeAt = entrance.phases.find(s => s.phase === 'timing');
    check(`${prefix} music begins after instruction and plays through gauge entrance`, music.length === 1 && music[0].at >= entrance.instruction?.at
      && Math.abs(music[0].at - introAt?.at) < 150 && entrance.audio.name === 'castle_battle' && entrance.audio.time >= 2.6
      && !entrance.audio.paused && music[0].audio?.playingSamples > 0, JSON.stringify(entrance));
    check(`${prefix} timing input activates after two-second lead plus fade`, activeAt?.at - introAt?.at >= 2600 && activeAt.elapsed >= 2.7, JSON.stringify(entrance.phases));
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
  const pushToLaunch = async (deliberate, stopAtInterlude = false) => {
    if (deliberate) {
      await page.keyboard.down('KeyC'); await page.waitForTimeout(120); const one = (await snap()).push.stage;
      await page.waitForTimeout(1600); check('holding C cannot advance multiple timing stages', (await snap()).push.stage === one);
      await page.keyboard.up('KeyC'); await page.waitForTimeout(100);
      while ((await snap()).push.stage < 2) await hit();
      if (phase === 'feedback') {
        assert.ok(await until(() => game.castleBoulderPush.barkShown >= game.castleBoulderPush.bark.length, 1500));
        await capture('timing-success-bark');
      }
      assert.ok(await until(() => game.castleBoulderPush.feedback <= 0 && game.castleBoulderPush.armed && game.castleBoulderPush.marker < 0.1, 5000));
      await key('KeyC');
      check('intentional miss loses exactly one stage', (await snap()).push.stage === 1 && (await snap()).push.result === 'miss', JSON.stringify((await snap()).push));
      if (phase === 'feedback') assert.ok(await until(() => game.castleBoulderPush.barkShown >= game.castleBoulderPush.bark.length, 1500));
      await capture('timing-one-stage-miss'); await responsive('timing-ui');
      if (phase === 'feedback') return;
    }
    while ((await snap()).push?.phase === 'timing') {
      if ((await snap()).push.stage >= 10) break;
      await hit();
    }
    const beforeInterlude = await snap();
    assert.ok(await until(() => game.castleBoulderPush?.phase === 'interlude', 3000));
    await capture('ten-hit-interlude-start');
    check(`${shotPrefix} ten hits enter a non-mash interlude`, (await snap()).push.stage === 10 && (await snap()).push.count === 0);
    if (stopAtInterlude) return;
    const interlude = await advanceStory(() => game.castleBoulderPush?.phase === 'mash', 'ten-hit final sprint', 18000);
    check(`${shotPrefix} Junhee final sprint line precedes mash`, JSON.stringify(interlude) === JSON.stringify([INTERLUDE]), JSON.stringify(interlude));
    check(`${shotPrefix} ten-hit interlude visibly shoves the rock forward`, (await snap()).scene.rockX > beforeInterlude.scene.rockX + 20);
    const transition = await page.evaluate(() => ({ sounds: boulderSounds.filter(s => s.beat === 'surge'),
      phases: boulderTimeline.filter(s => ['surge_pan', 'surge', 'surge_hold', 'surge_return', 'mash'].includes(s.beat)) }));
    const rumble = transition.sounds.find(s => s.name === 'rumble'), roar = transition.sounds.find(s => s.name === 'baron_roar');
    const speech = transition.phases.find(s => s.text?.includes('마지막 스퍼트다'));
    check(`${shotPrefix} interlude rumble then roar then speech precede mash`, rumble && roar && speech && rumble.at < roar.at && roar.at < speech.at
      && transition.phases.some(s => s.phase === 'mash' && s.at >= speech.at), JSON.stringify(transition));
    if (bounded) {
      const pan = transition.phases.find(s => s.beat === 'surge_pan'), surge = transition.phases.find(s => s.beat === 'surge');
      const back = transition.phases.find(s => s.beat === 'surge_return'), mash = await snap();
      check('ten-hit camera pans right before shove and roar, then returns before mash', pan && surge && back && roar
        && surge.at - pan.at >= 1200 && roar.camera.x > beforeInterlude.camera.x + 200
        && back.at >= speech.at && Math.abs(mash.camera.x - beforeInterlude.camera.x) < 20, JSON.stringify({ beforeInterlude, transition, mash }));
      check('interlude rumble and roar have advancing audible playback handles', [rumble, roar].every(s => s?.audio?.playingSamples > 0
        && s.audio.maxTime > 0 && s.audio.volume > 0), JSON.stringify(transition.sounds));
    }
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

  if (phase === 'audio-baseline') {
    await begin('');
    const audio = await page.evaluate(() => boulderSounds);
    check('focused laser has real audible playback before rhythm', audio.some(s => s.name === 'laser_zap' && !s.phase
      && s.audio?.playingSamples > 0 && s.audio.maxTime > 0 && s.audio.volume > 0), JSON.stringify(audio));
    return;
  }

  if (phase === 'audio-cancel') {
    for (const boundary of ['camera-lifecycle', 'surge-keyboard']) {
      await begin('cancel-audio-');
      await pushToLaunch(false, true);
      if (boundary === 'camera-lifecycle') assert.ok(await until(() => game.castleBoulder?.beat === 'surge_pan' && game.castleBoulder.elapsed > 0.25, 3000));
      else assert.ok(await until(() => game.castleBoulder?.beat === 'surge' && !game.zoom.tween, 3000));
      const before = await snap();
      check(`${boundary} cancellation targets the real interlude before mash`, before.scene.beat === (boundary === 'camera-lifecycle' ? 'surge_pan' : 'surge')
        && before.scene.elapsed < 1.2 && before.push.phase === 'interlude' && before.push.count === 0, JSON.stringify(before));
      await fixture('remember-cancelled-pan', 'Keep read-only references to production scene, controller and BGM element; never alter their state. Detect late async pan/phase or audio resurrection after cancellation.', () => {
        window.cancelledBoulderController = game.castleBoulderPush;
        window.cancelledBoulderScene = game.castleBoulder;
        window.cancelledBoulderMusic = game.sound.bgm;
      });
      if (boundary === 'camera-lifecycle') {
        await shot('cancel-surge-pan-before');
        await fixture('mid-pan-title-lifecycle', 'Production toTitle() during an active camera/zoom tests lifecycle teardown, not user keyboard cancellation. Existing global Escape guard intentionally rejects input until zoom ends; that real input is tested separately.', () => game.toTitle());
      } else await escToTitle(page);
      assert.ok(await until(() => game.state === 'title' && !game.castleBoulderPush && !game.castleBoulder, 6000));
      await page.waitForTimeout(2800);
      check(`${boundary} leaves no scene, camera lock, music, dialogue or completed flag`, await page.evaluate(() => !game.flags.castle_boulder_done
        && !game.dialogue.running && !game.castleBoulder && !game.castleBoulderPush && !game.camera.locked
        && !['baron_intro', 'castle_battle'].includes(game.sound.bgmName) && cancelledBoulderMusic.paused));
      await continueTitle();
      check(`${boundary} Continue preserves unfinished party without stale controller resurrection`, await page.evaluate(() => game.mapId === 'gajaeman_castle_boulder'
        && !game.flags.castle_boulder_done && game.party.join() === 'gyeongsub,ppaman' && cancelledBoulderController.settled
        && cancelledBoulderController.phase === 'interlude' && cancelledBoulderController.count === 0
        && game.castleBoulderPush !== cancelledBoulderController && game.castleBoulder !== cancelledBoulderScene));
      if (boundary === 'surge-keyboard') await shot('cancel-surge-keyboard-continued');
    }
    check('no bounded cancellation scene or asset errors', errors.length === 0 && requiredFailures.length === 0, JSON.stringify({ errors, requiredFailures }));
    return;
  }

  if (phase === 'reveal') {
    await open({ qa: 'castle_boulder' });
    assert.ok(await until(() => window.game?.mapId === 'gajaeman_castle_boulder' && !!game.castleBoulder, 30000));
    await advanceStory(() => game.castleBoulder?.beat === 'reveal' && game.castleBoulder.elapsed > 2.55, 'settled threat reveal');
    check('settled reveal retains original encounter before completion', (await snap()).scene.beat === 'reveal' && !(await snap()).flags.done);
    return;
  }

  if (phase === 'cancel') {
    for (const boundary of ['timing', 'interlude', 'launch']) {
      await begin(`cancel-${boundary}-`);
      if (boundary === 'interlude') { await pushToLaunch(false, true); await page.waitForTimeout(350); }
      if (boundary === 'launch') { await pushToLaunch(false); await page.waitForTimeout(1200); }
      assert.ok(await until(() => !game.zoom.tween && !game.transitioning, 6000));
      if (boundary === 'interlude') {
        check('cancellation occurs before mash can begin', (await snap()).push.phase === 'interlude' && (await snap()).push.count === 0);
        await fixture('remember-cancelled-interlude', 'Retain a read-only reference to the current controller to detect any late async resurrection after title/Continue.', () => { window.cancelledBoulderController = game.castleBoulderPush; });
      }
      await shot(`cancel-${boundary}-before`); await escToTitle(page);
      assert.ok(await until(() => game.state === 'title' && !game.castleBoulderPush && !game.castleBoulder, 6000));
      await page.waitForTimeout(900);
      check(`${boundary} cancellation clears scene without false completion`, await page.evaluate(() => !game.flags.castle_boulder_done
        && !game.dialogue.running && !game.castleBoulder && !game.castleBoulderPush && !game.camera.locked && !['baron_intro', 'castle_battle'].includes(game.sound.bgmName)));
      await shot(`cancel-${boundary}-title`);
      await continueTitle();
      check(`${boundary} continue preserves three-person unfinished state`, await page.evaluate(() => game.mapId === 'gajaeman_castle_boulder'
        && !game.flags.castle_boulder_done && game.party.join() === 'gyeongsub,ppaman'));
      if (boundary === 'interlude') check('cancelled async interlude never resurrects mash', await page.evaluate(() => cancelledBoulderController.settled
        && cancelledBoulderController.phase === 'interlude' && cancelledBoulderController.count === 0 && game.castleBoulderPush !== cancelledBoulderController));
      await shot(`cancel-${boundary}-continued`);
    }
    await open({ qa: 'castle_left_orb' }); assert.ok(await field());
    await walk('ArrowUp', () => game.player.probe()?.id === 'castle_seal_orb', 'left orb cancel approach');
    await narrateOrb('cancel-left'); assert.ok(await until(() => game.castleOrb?.beat === 'pan', 12000));
    await shot('cancel-left-pan'); await escToTitle(page);
    assert.ok(await until(() => game.state === 'title' && !game.castleOrb, 6000));
    await page.waitForTimeout(500);
    await continueTitle(); assert.ok(await field());
    check('left pan cancellation preserves existing right seal and does not activate left', await page.evaluate(() => game.flags.castle_right_seal_active && !game.flags.castle_left_seal_active && !game.dialogue.running));
    await shot('cancel-left-continued');
    check('no cancellation scene or asset errors', errors.length === 0 && requiredFailures.length === 0, JSON.stringify({ errors, requiredFailures }));
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

  if (['after', 'wall'].includes(phase)) {
    await open({ qa: 'castle_boulder_after' }); assert.ok(await field());
    await responsive('completed-wall-party');
  }
  else {
    await begin(''); await pushToLaunch(!bounded);
    if (phase === 'feedback') {
      check('feedback capture leaves real unfinished timing state', (await snap()).push.stage === 1 && !(await snap()).flags.done);
      check('no feedback scene errors', errors.length === 0 && requiredFailures.length === 0, JSON.stringify({ errors, requiredFailures }));
      await escToTitle(page); assert.ok(await until(() => game.state === 'title' && !game.castleBoulderPush && !game.castleBoulder, 6000));
      return;
    }
    const launch = await snap();
    check('launch has not prematurely marked the event completed', !launch.flags.done);
    const outro = await advanceStory(() => !!game.flags.castle_boulder_done && !game.dialogue.running, 'launch crash and solo aftermath', 35000);
    assert.ok(await field());
    check('aftermath preserves exact final dialogue', JSON.stringify(outro) === JSON.stringify(OUTRO.slice(1)), JSON.stringify(outro));
    check('rock visibly travels right then crashes before completion', captured.has('rolling-mid') && captured.has('wall-crash') && launch.scene.rockX < 2200);
    check('completion leaves solo player and eight visible waiting allies with real sheets', await page.evaluate(() => game.party.length === 0 && !game.castleBoulderPush && !game.castleBoulder
      && !game.camera.locked && game.entities.filter(e => /^boulder_/.test(e.id) && e.def.type === 'npc' && e.visible).length >= 8
      && game.entities.filter(e => /^boulder_/.test(e.id) && e.visible && e.sprite).every(e => !e.sprite.fallback)));
    if (bounded) await shot('completed-staging');
    else await responsive('completed-wall-party');
    const audio = await page.evaluate(() => boulderSounds);
    check('focused laser is audible but minigame lasers remain silent', audio.some(s => s.name === 'laser_zap' && !s.phase
      && s.audio?.playingSamples > 0 && s.audio.maxTime > 0 && s.audio.volume > 0) && !audio.some(s => s.name === 'laser_zap' && s.phase), JSON.stringify(audio));
    const laser = audio.filter(s => s.name === 'laser_zap');
    check('every audible laser is camera-focused with visible emitter and rock contact', laser.length > 0 && laser.every(s => ['focus', 'talk'].includes(s.beat)
      && s.focus && Object.values(s.focus).every(p => p.x >= 0 && p.x <= 480 && p.y >= 0 && p.y <= 360)), JSON.stringify(laser));
    check('roar rumble and crash cues play', ['rumble', 'baron_roar', 'furnace_blast', 'break1'].every(name => audio.some(s => s.method === 'sfx' && s.name === name)));
    const timingSounds = await page.evaluate(() => boulderSounds.filter(sound => sound.method === 'sfx' && sound.beat === 'push').map(sound => sound.name));
    check('successful timing uses great_shine and never ember', timingSounds.includes('great_shine') && !timingSounds.includes('ember'), JSON.stringify(timingSounds));
    check('push music stops after the crash before completed field control', (await snap()).bgm === null
      && await page.evaluate(() => { const crash = boulderSounds.find(s => s.name === 'furnace_blast');
        return crash && boulderSounds.some(s => s.method === 'stopBgm' && s.at > crash.at); }));
    if (['focus', 'audio-staging'].includes(phase)) {
      check('no focused scene errors', errors.length === 0 && requiredFailures.length === 0, JSON.stringify({ errors, requiredFailures }));
      return;
    }
  }
  if (phase === 'wall') {
    await walk('ArrowDown', () => game.player.y >= 754, 'walk below allies to lower rock face');
    await page.keyboard.down('ArrowRight');
    try { await page.waitForTimeout(1200); }
    finally { await page.keyboard.up('ArrowRight'); }
    const wall = await page.evaluate(() => {
      const p = game.entities.find(e => e.id === 'castle_boulder_wall');
      return { player: game.player.rect, rect: p.rect, solid: p.solid, bottom: p.y + p.h,
        imageBottom: p.def.iy + game.propImages[p.def.image].height * p.def.scale,
        lowerOverlap: p.overlaps({ x: 3150, y: 830, w: 8, h: 8 }) };
    });
    check('real lower-bridge walking stops at embedded rock west face', wall.solid && wall.player.x + wall.player.w <= wall.rect.x + 1
      && wall.player.x + wall.player.w >= wall.rect.x - 8, JSON.stringify(wall));
    check('wall collider reaches full image bottom including below-floor extent', wall.bottom === 844 && wall.bottom === wall.imageBottom && wall.lowerOverlap, JSON.stringify(wall));
    await shot('wall-lower-face-blocked');
    check('wall fixture keeps solo completed scene without replay', (await snap()).party.length === 0 && (await snap()).flags.done && !(await snap()).scene);
    return;
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
  await walk('ArrowRight', () => game.player.x >= 3080, 'pass resting allies on their east side');
  await walk('ArrowUp', () => game.player.y <= 512, 'clear resting allies before approaching north door');
  await walk('ArrowLeft', () => game.player.x <= 2948, 'align relocated north orb approach');
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
