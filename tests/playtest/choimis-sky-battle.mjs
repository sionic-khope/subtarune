import { runScenario } from './lib/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';

const DIALOGUE = [
  '하이',
  '빨리 내려와라 씨발색끼',
  '어휴 하여간 다들 날 싫어하는이유가뭐야?',
  '어쨋든 곧 나는 점례에게 돌아갈거야',
  '너희들의 동기가 어떻게 됐든 난 상관없어',
  '나를 막을 순 없을것이다.',
  '순수한 나의 사랑을',
  '그리고. 이젠 달라진 나의 모습을.',
];

const PATTERNS = [
  { name: 'jjajang', index: 0, type: 'choimis_jjajang', source: 'A', shapes: ['choimis_jjajang_bowl'], warning: true },
  { name: 'choso', index: 1, type: 'choimis_choso', source: 'A', shapes: ['choimis_blood_beam'], warning: true },
  { name: 'money', index: 3, type: 'choimis_money', source: 'A', shapes: ['choimis_money_note'], warning: true },
  { name: 'rap', index: 2, type: 'choimis_rap', source: 'B', shapes: ['choimis_mic', 'choimis_lyric'], warning: true },
  { name: 'seup', index: 4, type: 'choimis_seup', source: 'B', shapes: ['choimis_breath', 'choimis_finger_beam'], warning: true },
  { name: 'fashion', index: 5, type: 'choimis_fashion', source: 'B', shapes: ['choimis_outfit'], warning: true },
];

const json = value => JSON.stringify(value, (_key, item) => typeof item === 'number' ? Math.round(item * 1000) / 1000 : item);

await runScenario({ name: 'choimis-sky-battle', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async context => {
  const { page, open, until: rawUntil, press: rawPress, shot: rawShot, check: rawCheck, fixture } = context;
  page.setDefaultNavigationTimeout(30000);
  const evidencePath = path.join(process.env.SHOT_DIR, 'choimis-sky-runtime.json');
  const trace = { scenario: 'choimis-sky-battle', dialogue: [], phases: [], patterns: [], fixtures: [], observations: [] };
  fs.writeFileSync(evidencePath, JSON.stringify(trace, null, 2) + '\n');
  const save = () => fs.writeFileSync(evidencePath, JSON.stringify(trace, null, 2) + '\n');
  const check = (label, ok, detail = '') => rawCheck(label, ok, `${detail}${detail ? ' ' : ''}artifact=${evidencePath}`);
  const shot = async name => { const file = await rawShot(name); trace.observations.push({ shot: file }); save(); return file; };
  const until = async (predicate, timeout = 10000) => rawUntil(predicate, timeout);
  const press = async key => rawPress(key, { delay: 70 });

  const snapshot = () => page.evaluate(() => {
    const g = window.game;
    const actor = id => {
      const e = id === 'player' ? g.player : g.entities.find(item => item.id === id && !item.dead);
      return e ? { id: e.id, x: e.x, y: e.y, w: e.w, h: e.h, visible: e.visible, facing: e.facing,
        hopY: e.hopY || 0, flyX: e.flyX || 0, flyY: e.flyY || 0, moving: e.moving, fallback: !!e.sprite?.fallback,
        frame: e.frame, motion: e.motion ? { scale: e.motion.scale, index: e.motion.index, loop: e.motion.loop } : null } : null;
    };
    const b = g.battle;
    return {
      state: g.state, map: g.mapId, x: g.player?.x, y: g.player?.y, facing: g.player?.facing,
      fade: g.fade.alpha, zoom: { ...g.zoom }, bgm: g.sound.bgmName, bgmTime: g.sound.bgm?.currentTime, bgmPaused: g.sound.bgm?.paused,
      dialogue: g.dialogue.running, dialogueIndex: g.dialogue.i, text: g.textbox.node?.text, textState: g.textbox.state,
      party: [...g.party], partyHp: { ...g.partyHp }, inventory: [...g.inventory], money: g.money, flags: { ...g.flags },
      camera: { x: g.camera.x, y: g.camera.y, locked: g.camera.locked },
      actors: Object.fromEntries(['player', 'gyeongsub', 'ppaman', 'choimis_sky_boss', 'choimis'].map(id => [id, actor(id)])),
      sky: g.choimisSky ? { phase: g.choimisSky.phase, progress: g.choimisSky.progress, pollen: g.choimisSky.pollen?.length || 0,
        loosePetals: g.choimisSky.loosePetals?.length || 0, windTime: g.choimisSky.windTime || 0,
        actors: g.choimisSky.actors?.map(e => e.id), ghosts: g.choimisFlower?.ghosts?.length || 0 } : null,
      battle: b ? { state: b.state, t: b.t, text: b.text, typed: b.typed, memberIdx: b.memberIdx, menuIdx: b.menuIdx,
        intro: [...(b.introLines || [])], board: { ...b.board.rect }, soul: { x: b.soul.x, y: b.soul.y, r: b.soul.r, hits: b.soul.hits },
        opening: b.gimmick?.snapshot ? b.gimmick.snapshot : null,
        members: b.members.map(m => ({ id: m.id, hp: m.hp, maxHp: m.maxHp, down: m.down, home: [...m.home], loaded: !!m.frames?.idle?.length })),
        enemies: b.enemies.map(e => ({ id: e.id, hp: e.hp, maxHp: e.maxHp, x: e.x, y: e.y, dead: e.dead, loaded: !!e.img, src: e.img?.src,
          actionLoaded: Object.fromEntries(Object.entries(e.actionImages || {}).map(([k, v]) => [k, !!v])), pose: e.patternPose ? { ...e.patternPose } : null,
          bullets: b.bullets?.map(q => ({ shape: q.shape, age: q.age, warn: q.warn, text: q.text, denomination: q.denomination, look: q.look, x: q.x, y: q.y })) || [] })),
        patterns: b.patterns?.map(p => ({ type: p?.type || null, elapsed: p?.t, duration: p?.p?.duration })) || [],
        bg: b.cfg.bg, cfgBgm: b.cfg.bgm } : null,
    };
  });
  const record = async label => { const value = await snapshot(); trace.observations.push({ label, value }); if (value.sky?.phase && !trace.phases.includes(value.sky.phase)) trace.phases.push(value.sky.phase); save(); return value; };

  // The draw/audio observer records rendered intermediate states and actual calls without altering time, input, or battle durations.
  await open({ qa: 'choimis_sky' });
  check('real QA point loads the night cliff before any trigger input', await until(() => window.game?.mapId === 'jjajang_night_cliff' && !window.game.transitioning && !!window.game.player, 30000));
  await fixture('render-and-audio-observer', 'Observe the live canvas, sky phases, audio calls, BGM-clocked karaoke, and bullet render state. This does not fast-forward, change state, or replace input.', async () => {
    const g = window.game;
    const { choimisLyricAt } = await import('/src/battle/choimis-karaoke.js');
    window.__choimisQa = {
      sfx: [], bgm: [], phases: [], frames: [], draws: 0, lyricAt: choimisLyricAt,
      temporalCaptures: [42.214, 42.264, 42.334, 42.384, 42.484, 42.584].map(time => ({ time, data: null, actual: null, frame: null })),
    };
    const sound = g.sound;
    const sfx = sound.sfx.bind(sound), playBgm = sound.playBgm.bind(sound);
    sound.sfx = (name, options) => { window.__choimisQa.sfx.push({ name, at: performance.now() }); return sfx(name, options); };
    sound.playBgm = (name, options) => { window.__choimisQa.bgm.push({ name, at: performance.now(), options }); return playBgm(name, options); };
    const draw = g.draw.bind(g);
    let nextQaBulletId = 1;
    g.draw = (...args) => {
      const result = draw(...args); const b = g.battle, sky = g.choimisSky;
      if (b?.state === 'intro' && window.__choimisQa.introAt === undefined) window.__choimisQa.introAt = performance.now();
      if (b?.state === 'bullets') {
        for (const shape of ['choimis_breath', 'choimis_finger_beam']) {
          const visible = b.bullets.some(q => q.shape === shape && q.age >= q.warn + (shape === 'choimis_finger_beam' ? 0.1 : 0.4) && (shape === 'choimis_finger_beam' || (q.x > b.board.x + 12 && q.x < b.board.x + b.board.w - 12 && q.y > b.board.y + 12 && q.y < b.board.y + b.board.h - 12)));
          if (visible && !window.__choimisQa[shape]) window.__choimisQa[shape] = g.canvas.toDataURL('image/png');
        }
      }
      for (const bullet of b?.bullets || []) if (!bullet.__qaId) bullet.__qaId = nextQaBulletId++;
      if (sky?.phase && !window.__choimisQa.phases.includes(sky.phase)) window.__choimisQa.phases.push(sky.phase);
      if (sky?.phase === 'rise' || b?.state === 'bullets' || b?.state === 'enemy-prep' || b?.state === 'board-close' || window.__choimisQa.temporalCaptures?.some(target => !target.data)) {
        const bgmTime = g.sound.bgm?.currentTime;
        const cue = window.__choimisQa.lyricAt(bgmTime);
        const lyricFade = cue ? Math.min(1, Math.max(0, (bgmTime - cue.start) / 0.28)) : 0;
        const lyricEchoChars = cue ? cue.chars.filter(char => bgmTime >= char.at && bgmTime - char.at < 0.26 && char.char.trim()).length : 0;
        window.__choimisQa.frames.push({ phase: sky?.phase || null, progress: sky?.progress || 0, battle: b?.state || null,
          bgmTime, lyric: window.__choimisQa.lyricAt(bgmTime)?.text || null,
          lyricFade, lyricEchoChars, lyricDim: ['enemy-mode', 'enemy-prep', 'bullets', 'board-close'].includes(b?.state),
          ghosts: g.choimisFlower?.ghosts?.length || 0, alpha: ['bullets', 'enemy-prep', 'board-close'].includes(b?.state) ? 0.68 : 1,
          bullets: b?.bullets?.map(q => ({ id: q.__qaId, shape: q.shape, age: q.age, warn: q.warn, text: q.text, denomination: q.denomination, look: q.look })) || [], pose: b?.enemies?.[0]?.patternPose || null });
        for (const target of window.__choimisQa.temporalCaptures || []) {
          if (!target.data && Number.isFinite(bgmTime) && bgmTime >= target.time && bgmTime < target.time + 0.14) {
            target.actual = bgmTime;
            target.frame = window.__choimisQa.frames.at(-1);
            target.data = g.canvas.toDataURL('image/png');
          }
        }
      }
      window.__choimisQa.draws++;
      return result;
    };
  });

  const before = await record('approach-before');
  await shot('01_approach_before_invisible_boss');
  check('approach starts at real west QA spawn and boss is invisible', before.x >= 30 && before.x <= 50 && before.actors['choimis_sky_boss']?.visible === false,
    json({ x: before.x, boss: before.actors['choimis_sky_boss'] }));
  check('approach keeps the original party, HP override map, and inventory state', before.party.join(',') === 'gyeongsub,ppaman' && before.partyHp && Number.isFinite(before.money),
    json({ party: before.party, partyHp: before.partyHp, inventory: before.inventory, money: before.money }));
  await fixture('intro-save-boundary', 'Save the real pre-trigger field boundary so Continue can verify that intro HP, party, money, and inventory survive an abort.', () => window.game.autosave());
  const savedIntro = await page.evaluate(() => JSON.parse(localStorage.getItem('subtarune.save.v1')));
  trace.observations.push({ label: 'saved-intro-boundary', value: savedIntro }); save();
  const runRecoveryLifecycle = async () => {
    await fixture('explicit-death-setup', 'Force all battle members down through the battle defeat path to exercise retry cleanup. This is injected and does not claim natural boss completion.', () => game.battle.hurtAllParty(999));
    const lost = await until(() => window.game.battle?.state === 'lose', 3000);
    const lostState = await snapshot();
    check('explicitly injected death reaches the real GAME OVER state', !!lost && lostState.battle?.members?.every(m => m.down && m.hp === 0), json(lostState));
    await shot('18_game_over');
    await page.waitForTimeout(2300); await press('KeyC');
    const retry = await until(() => window.game.battle?.state === 'retry', 3000);
    check('C on GAME OVER enters retry cleanup', !!retry, json(await snapshot()));
    const retried = await until(() => window.game.battle?.state === 'intro', 7000);
    const retryState = await record('retry-intro');
    check('retry restores full HP, enemy HP 200, and standing party', !!retried && retryState.battle?.enemies?.[0]?.hp === 200 && retryState.battle?.members?.every(m => !m.down && m.hp === m.maxHp), json(retryState.battle));
    await shot('19_retry_intro_restored');

    await press('Escape');
    const titleLoaded = await until(() => window.game?.state === 'title' && window.game.fade.alpha === 0 && !window.game.transitioning, 60000);
    if (!titleLoaded) {
      check('Escape reaches a stable title surface before title input', false, json(await snapshot()));
      return false;
    }
    await press('KeyC');
    const title = await until(() => window.game?.state === 'title' && window.game.title?.phase === 'locked' && window.game.title.time > 3.2 && window.game.fade.alpha === 0 && !window.game.transitioning, 60000);
    if (!title) {
      check('title reaches the locked Continue menu before title input', false, json(await snapshot()));
      return false;
    }
    const aborted = await record('escape-title-cleanup');
    await shot('20_escape_title_cleanup');
    check('Q/title abort disposes battle, BGM, sky, afterimages, background, and zoom', !aborted.battle && aborted.bgm !== 'choimis_battle' && aborted.sky === null && aborted.zoom.s === 1, json(aborted));
    const continueReady = await until(() => window.game?.state === 'title' && window.game.title?.phase === 'locked' && window.game.title.time > 3.2 && window.game.fade.alpha === 0 && !window.game.transitioning, 60000);
    if (!continueReady) {
      check('Continue input is sent only after a stable locked title menu', false, json(await snapshot()));
      return false;
    }
    await press('KeyC');
    const continued = await until(() => window.game?.mapId === 'jjajang_night_cliff' && !window.game.transitioning, 15000);
    const afterContinue = await record('continue-intro-save');
    check('Continue restores the saved intro map, party, HP, money, and inventory', !!continued && afterContinue.map === savedIntro.map && json(afterContinue.party) === json(savedIntro.party) && json(afterContinue.partyHp) === json(savedIntro.partyHp) && afterContinue.money === savedIntro.money && json(afterContinue.inventory) === json(savedIntro.inventory), json({ saved: savedIntro, current: afterContinue }));
    check('Continue does not retrigger the old night-cliff story scene', !!continued && !afterContinue.dialogue && !afterContinue.text?.includes('형 저는 왜 항상 이런식일까요'), json(afterContinue));
    await shot('21_continue_saved_intro_boundary');
    await fixture('completed-sky-reentry', 'Prepare the explicit completed-boss QA boundary to verify the old cliff story and sky trigger remain one-shot after completion; this does not claim a natural boss win.', async flags => {
      await game.devJump({ map: 'jjajang_night_cliff', spawn: 'from_west', flags: { ...flags, choimis_flower_won: true }, party: ['gyeongsub', 'ppaman'] });
    }, savedIntro.flags);
    const completed = await until(() => window.game.mapId === 'jjajang_night_cliff' && !window.game.transitioning && !window.game.dialogue.running, 10000);
    const post = await record('completed-reentry');
    check('completed re-entry leaves no old cliff dialogue or retriggered sky boss', !!completed && !post.dialogue && !post.actors.choimis_sky_boss?.visible && post.flags.choimis_flower_won === true, json(post));
    await shot('22_completed_reentry_no_retrigger');
    return true;
  };

  await page.keyboard.down('ArrowRight');
  try {
    const rising = await until(() => {
      const g = window.game, b = g.entities.find(e => e.id === 'choimis_sky_boss' && !e.dead);
      return b?.visible && b.hopY < -12 && (g.choimisFlower?.ghosts?.length || 0) > 0;
    }, 30000);
    check('rightward approach triggers the sky intro and catches an invisible-boss rise with afterimages', !!rising, json(await snapshot()));
    if (rising) { await record('rise-afterimages'); await shot('02_boss_rise_afterimages'); }
  } finally { await page.keyboard.up('ArrowRight'); }
  const settled = await until(() => window.game.choimisSky?.phase === undefined && window.game.dialogue.running && window.game.textbox.node?.text === '* 하이', 30000);
  check('boss stays airborne before the first 하이 line', !!settled && (await snapshot()).actors.choimis_sky_boss?.hopY > 20, json(await snapshot()));
  await shot('03_boss_hover_before_hi');

  for (const [index, expected] of DIALOGUE.entries()) {
    const exact = `* ${expected}`;
    const line = await until(() => {
      const g = window.game;
      return g.dialogue.running && typeof g.textbox.node?.text === 'string' ? { text: g.textbox.node.text, state: g.textbox.state, index: g.dialogue.i } : null;
    }, 15000);
    const reached = line?.text === exact;
    check(`dialogue ${index + 1}/8 is exact`, reached, json({ expected: exact, actual: line?.text }));
    trace.dialogue.push({ index: index + 1, expected: exact, actual: line?.text, reached }); save();
    if (!reached) return;
    await page.evaluate(expectedText => { window.__choimisQa.expectedDialogueText = expectedText; }, exact);
    const fullLine = await until(() => window.game.dialogue.running && window.game.textbox.node?.text === window.__choimisQa.expectedDialogueText && window.game.textbox.state === 'waiting', 10000);
    check(`dialogue ${index + 1}/8 is fully displayed before advancing`, !!fullLine);
    if (!fullLine) return;
    check(`dialogue ${index + 1}/8 preserves Choimis hover`, (await snapshot()).actors.choimis_sky_boss?.hopY > 20);
    if (reached) await shot(`04_dialogue_${String(index + 1).padStart(2, '0')}`);
    await press('KeyC');
    await until(() => window.game.textbox.node?.text !== window.__choimisQa.expectedDialogueText || window.game.textbox.state === 'closed', 3000);
  }
  const beforePose = await record('before-pollen-pose');
  await shot('12_before_hand_raise_pose');
  check('boundary rects are captured before the hand-raise pose', !!beforePose.actors.player && !!beforePose.actors.choimis_sky_boss,
    json({ player: beforePose.actors.player, boss: beforePose.actors.choimis_sky_boss, camera: beforePose.camera }));

  const gathering = await until(() => window.game.choimisSky?.phase === 'gather' && window.game.choimisSky.progress > 0.45, 15000);
  check('C advance closes dialogue and starts the dense 224-petal platform gathering', !!gathering && (await snapshot()).sky.actors?.length === 4 && (await snapshot()).sky.pollen === 224 && (await snapshot()).sky.loosePetals === 36,
    json((await snapshot()).sky));
  await shot('13_pollen_gathering_under_four_actors');
  const cloud = await until(() => window.game.choimisSky?.phase === 'cloud', 6000);
  const gatheredIntoRise = await page.evaluate(() => window.game.choimisSky?.phase === 'rise' && window.game.choimisSky?.pollen?.length === 224);
  check('pollen gathers into a cloud for all four actors before ascent', (!!cloud || gatheredIntoRise || (await page.evaluate(() => window.__choimisQa?.phases || [])).includes('cloud')) && (await snapshot()).sky.pollen === 224,
    json(await snapshot()));
  const ascent = await until(() => window.game.choimisSky?.phase === 'rise' && window.game.choimisSky.progress > 0.25, 15000);
  check('continuous ascent keeps all 224 platform petals and 36 loose sea petals moving', !!ascent && (await snapshot()).sky.pollen === 224 && (await snapshot()).sky.loosePetals === 36 && (await snapshot()).sky.windTime > 0, json(await snapshot()));
  if (ascent) { await record('ascent-mid'); await shot('14_continuous_cliff_sea_ascent_mid'); }
  const battleReady = await until(() => window.game.battle?.state === 'intro', 30000);
  const handoff = await record('battle-handoff');
  await shot('15_battle_handoff_boundary');
  const audioAtHandoff = await page.evaluate(() => window.__choimisQa);
  if (!battleReady || !handoff.battle) {
    check('battle handoff reaches a readable battle snapshot before dependent checks', false, json({ battleReady, battle: handoff.battle }));
    return;
  }
  check('battle handoff preserves moon-sky background and music configuration without battle_start', !!battleReady && handoff.battle?.bg === 'choimis_sky' && handoff.battle?.cfgBgm === 'choimis_battle' && !audioAtHandoff?.sfx?.some(x => x.name === 'battle_start'), json({ battle: handoff.battle, bgm: handoff.bgm, sfx: audioAtHandoff?.sfx?.slice(-12) }));
  check('weapon-ready SFX is present at handoff', audioAtHandoff?.sfx?.some(x => x.name === 'weaponpull'), json(audioAtHandoff?.sfx?.slice(-12)));
  const bgmReady = await until(() => {
    const g = window.game, audio = g.sound.bgm;
    return g.sound.bgmName === 'choimis_battle' && audio && !audio.paused && Number.isFinite(audio.currentTime) && audio.currentTime > 0.01 ? true : null;
  }, 2000);
  const handoffBgmReady = await page.evaluate(() => ({ introAt: window.__choimisQa.introAt, bgm: game.sound.bgmName, time: game.sound.bgm?.currentTime, paused: game.sound.bgm?.paused, callAt: window.__choimisQa.bgm.find(call => call.name === 'choimis_battle')?.at }));
  const handoffBgmElapsed = handoffBgmReady.callAt - handoffBgmReady.introAt;
  trace.observations.push({ label: 'battle-handoff-bgm-ready', value: { ...handoffBgmReady, elapsedMs: handoffBgmElapsed } }); save();
  check('battle handoff starts the actual choimis_battle BGM within one second', !!bgmReady && handoffBgmReady.bgm === 'choimis_battle' && handoffBgmReady.paused === false && handoffBgmReady.time > 0.01 && handoffBgmElapsed >= -100 && handoffBgmElapsed <= 1000, json({ ...handoffBgmReady, elapsedMs: handoffBgmElapsed }));
  if (process.env.QA_HANDOFF_ONLY === '1') return;
  check('battle starts with HP 200 and all three natural party members loaded', !!battleReady && handoff.battle.enemies[0].hp === 200 && handoff.battle.members.length === 3 && handoff.battle.members.every(m => m.loaded), json(handoff.battle));
  check('battle handoff rects preserve matching party poses and moon scene actor placement', !!battleReady && handoff.battle.members.every((m, i) => i === 0 || m.home[1] > handoff.battle.members[i - 1].home[1]) && handoff.battle.enemies[0].x > 300, json({ members: handoff.battle.members, enemy: handoff.battle.enemies[0] }));
  check('no character or battle art fallback is active', !!battleReady && !handoff.actors.player?.fallback && !handoff.actors.gyeongsub?.fallback && !handoff.actors.ppaman?.fallback && handoff.battle.members.every(m => m.loaded) && handoff.battle.enemies.every(e => e.loaded), json({ actors: handoff.actors, members: handoff.battle.members, enemies: handoff.battle.enemies }));

  const battleIntro = [
    '* 형들 꼭 그렇게 저를 막으셔야겠다면',
    '* 여러분들의 마음을 핑크로 물들여보세요.',
  ];
  await fixture('deterministic-opening-seed', 'Seed only the natural pink-shooter random lane to center for reliable held-C collision evidence; no projectile or HP state is injected, and the original RNG is restored before normal patterns.', () => {
    const b = game.battle;
    b.__choimisQaOriginalRnd = b.rnd;
    b.rnd = () => 0.5;
  });
  for (let i = 0; i < battleIntro.length; i++) {
    const expected = battleIntro[i];
    await page.evaluate(value => { window.__choimisQa.expectedBattleLine = value; }, expected);
    const line = await until(() => window.game.battle?.state === 'intro' && window.game.battle.text === window.__choimisQa.expectedBattleLine ? window.game.battle.text : null, 6000);
    check(`Choimis opening line ${i + 1}/2 is exact`, line === expected, json({ expected, actual: line }));
    if (line !== expected) return;
    const settled = await until(() => window.game.battle?.state === 'intro' && window.game.battle.text === window.__choimisQa.expectedBattleLine && window.game.battle.typed && window.game.battle.t > 1.5, 10000);
    check(`Choimis opening line ${i + 1}/2 is fully displayed`, !!settled);
    if (settled) await shot(`opening_dialogue_${i + 1}_settled`);
    if (!settled) return;
    await press('KeyC');
    await until(() => window.game.battle?.text !== window.__choimisQa.expectedBattleLine || window.game.battle?.state !== 'intro', 3000);
  }
  const openingMode = await until(() => window.game.battle?.state === 'enemy-mode', 6000);
  check('pink opening strike starts once after the complete in-battle dialogue and before the menu', !!openingMode, json(await snapshot()));
  const pinkFill = await until(() => { const s = window.game.battle?.gimmick?.snapshot; return s?.phase === 'fill' ? s : null; }, 5000);
  check('pink shooter begins with a compact flooded arena and red downward heart', !!pinkFill && pinkFill.heart.color === 'red' && pinkFill.heart.facing === 'down', json(pinkFill));
  if (pinkFill) await shot('16_pink_shooter_fill_red_heart');
  const pinkDrain = await until(() => { const s = window.game.battle?.gimmick?.snapshot; return s?.phase === 'drain' ? s : null; }, 4000);
  check('pink shooter reaches the drain phase before launch', !!pinkDrain && pinkDrain.water > 0, json(pinkDrain));
  if (pinkDrain) await shot('17_pink_shooter_drain');
  const pinkCombat = await until(() => { const s = window.game.battle?.gimmick?.snapshot; return s?.phase === 'combat' ? s : null; }, 6000);
  const pinkCombatStartedAt = Date.now();
  check('pink shooter transforms to a wide arena with a right-facing pink heart', !!pinkCombat && pinkCombat.heart.color === 'pink' && pinkCombat.heart.facing === 'right' && pinkCombat.board.w >= 400, json(pinkCombat));
  if (pinkCombat) await shot('18_pink_shooter_combat_wide');
  if (!pinkCombat) {
    check('pink shooter exposes a combat snapshot before input-dependent checks', false, json({ openingMode, pinkFill, pinkDrain, pinkCombat }));
    return;
  }
  const battleHp = () => page.evaluate(() => Object.fromEntries(game.battle.members.map(member => [member.id, member.hp])));
  const beforePinkHp = await battleHp();
  const fireNoodle = await until(() => window.game.battle?.gimmick?.snapshot?.noodles?.find(n => !n.telegraph) || null, 5000);
  // Seeded opening lanes center the first noodle on the initial soul y=159;
  // hold C without a blind movement overshoot so collision remains a real render/input path.
  await page.keyboard.down('KeyC'); await page.waitForTimeout(1800); await page.keyboard.up('KeyC');
  const pinkFire = await page.evaluate(() => ({ ...(game.battle?.gimmick?.snapshot || {}), hp: Object.fromEntries(game.battle.members.map(member => [member.id, member.hp])) }));
  check('actual C fire destroys at least one incoming noodle during pink combat', !!fireNoodle && pinkFire.destroyed >= 1, json({ fireNoodle, ...pinkFire }));
  if (pinkFire.destroyed >= 1) await shot('18_pink_shooter_projectile_hit');
  const activeNoodle = await until(() => window.game.battle?.gimmick?.snapshot?.noodles?.find(n => !n.telegraph && n.x > 80 && n.x < 320) || null, 5000);
  const beforePinkHurt = await battleHp();
  await page.evaluate(() => { window.__choimisQa.hurtHpSum = game.battle.members.reduce((sum, member) => sum + member.hp, 0); });
  if (activeNoodle) {
    const y = activeNoodle.y, heartY = await page.evaluate(() => game.battle.gimmick.snapshot.heart.y);
    const key = y < heartY ? 'ArrowUp' : 'ArrowDown';
    await page.evaluate(({ targetY, direction }) => { window.__choimisQa.targetHeartY = targetY; window.__choimisQa.targetHeartDirection = direction; }, { targetY: y, direction: key });
    await page.keyboard.down(key);
    await until(() => {
      const currentY = window.game.battle?.gimmick?.snapshot?.heart?.y, targetY = window.__choimisQa.targetHeartY;
      return window.__choimisQa.targetHeartDirection === 'ArrowUp' ? currentY <= targetY + 1 : currentY >= targetY - 1;
    }, 1500);
    await page.keyboard.up(key);
    await until(() => game.battle.members.reduce((sum, member) => sum + member.hp, 0) < window.__choimisQa.hurtHpSum, 4500);
  }
  const afterPinkHurt = await page.evaluate(() => ({ ...(game.battle?.gimmick?.snapshot || {}), hp: Object.fromEntries(game.battle.members.map(member => [member.id, member.hp])) }));
  const didHurt = Object.keys(beforePinkHurt).some(id => afterPinkHurt.hp[id] < beforePinkHurt[id]);
  check('actual active noodle collision hurts one natural party member', !!activeNoodle && didHurt, json({ activeNoodle, before: beforePinkHurt, after: afterPinkHurt }));
  const dodgeNoodle = await until(() => window.game.battle?.gimmick?.snapshot?.noodles?.find(n => !n.telegraph) || null, 5000);
  const beforePinkDodge = await battleHp();
  if (dodgeNoodle) {
    const y = dodgeNoodle.y, heartY = await page.evaluate(() => game.battle.gimmick.snapshot.heart.y);
    const key = y <= heartY ? 'ArrowDown' : 'ArrowUp';
    const targetY = Math.max(96, Math.min(222, y + (key === 'ArrowDown' ? 40 : -40)));
    await page.evaluate(({ targetY: target, direction }) => { window.__choimisQa.targetHeartY = target; window.__choimisQa.targetHeartDirection = direction; }, { targetY, direction: key });
    await page.keyboard.down(key);
    await until(() => {
      const currentY = window.game.battle?.gimmick?.snapshot?.heart?.y, targetY = window.__choimisQa.targetHeartY;
      return window.__choimisQa.targetHeartDirection === 'ArrowUp' ? currentY <= targetY + 1 : currentY >= targetY - 1;
    }, 1500);
    await page.keyboard.up(key);
    await page.waitForTimeout(900);
  }
  const afterDodge = await page.evaluate(() => ({ ...(game.battle?.gimmick?.snapshot || {}), hp: Object.fromEntries(game.battle.members.map(member => [member.id, member.hp])) }));
  check('actual up/down movement can dodge a subsequent active noodle without a forced state change', !!dodgeNoodle && Object.keys(beforePinkDodge).every(id => afterDodge.hp[id] === beforePinkDodge[id]), json({ dodgeNoodle, before: beforePinkDodge, after: afterDodge }));
  if (process.env.QA_STOP_AFTER_SHOOTER === '1') {
    await shot('recovery_opening_after_dodge');
    trace.observations.push({ label: 'bounded-recovery-stop', reason: 'QA_STOP_AFTER_SHOOTER requested after real opening fire/hurt/dodge; no completion claim.' }); save();
    return;
  }
  const menu = await until(() => window.game.battle?.state === 'menu', 25000);
  const menuRestored = await until(() => { const b = window.game.battle; return b?.state === 'menu' && !b.gimmick && b.board.w > 0 && b.board.h > 0 ? true : null; }, 3000);
  const returnedMenu = await snapshot(), pinkElapsedMs = Date.now() - pinkCombatStartedAt;
  check('20-second pink combat transitions to the normal HP/menu state', !!menu && !!menuRestored && pinkElapsedMs >= 19000, json({ elapsedMs: pinkElapsedMs, menu: !!menu, restored: !!menuRestored, state: returnedMenu.battle?.state, board: returnedMenu.battle?.board }));
  if (process.env.QA_RECOVERY_ONLY === '1') {
    await fixture('restore-opening-rng', 'Restore the original battle RNG before the bounded recovery lifecycle; no natural boss completion is claimed.', () => {
      if (game.battle?.__choimisQaOriginalRnd) { game.battle.rnd = game.battle.__choimisQaOriginalRnd; delete game.battle.__choimisQaOriginalRnd; }
    });
    await runRecoveryLifecycle();
    return;
  }
  await fixture('restore-opening-rng', 'Restore the original battle RNG after the natural opening shooter so the six pattern fixtures use their normal runtime randomness.', () => {
    if (game.battle?.__choimisQaOriginalRnd) { game.battle.rnd = game.battle.__choimisQaOriginalRnd; delete game.battle.__choimisQaOriginalRnd; }
  });
  await shot('19_battle_menu_hp200');
  const idleFrames = [];
  for (let i = 0; i < 8; i++) { idleFrames.push(await page.evaluate(() => { const b = game.battle, e = b?.enemies?.[0]; return b && e ? { t: b.t, frame: Math.floor(b.t * (e.def.sheet?.fps || 5.5)) % (e.def.sheet?.count || 4), pose: e.patternPose, ox: e.ox, oy: e.oy } : null; })); await page.waitForTimeout(180); }
  check('floating boss idle visibly cycles cape/idle frames while remaining at the stable home pose', new Set(idleFrames.filter(Boolean).map(f => f.frame)).size >= 2 && idleFrames.every(f => !f?.pose), json(idleFrames));
  await shot('20_boss_idle_cape_flap');

  const waitForLyric = async (text, start, end, image, timeout = 45000) => {
    // Poll the interior of each cue window so screenshot overhead cannot cross a short
    // boundary (the actual assertion still checks the requested full range below).
    await page.evaluate(({ lo, hi }) => { window.__choimisQa.waitRange = [lo, hi]; }, { lo: start + 0.2, hi: end - 0.2 });
    const reached = await until(() => {
      const g = window.game, time = g.sound.bgm?.currentTime;
      const [lo, hi] = window.__choimisQa.waitRange || [Infinity, -Infinity];
      return g.battle?.state && g.sound.bgmName === 'choimis_battle' && !g.sound.bgm?.paused && time >= lo && time < hi ? true : null;
    }, timeout);
    const cue = await page.evaluate(({ start: lo, end: hi }) => {
      const time = game.sound.bgm?.currentTime;
      return { time, paused: game.sound.bgm?.paused, cue: window.__choimisQa.lyricAt(time)?.text || null, alpha: game.battle?.state === 'menu' ? 1 : 0.68, range: time >= lo && time < hi };
    }, { start, end });
    const file = await shot(image);
    check(`karaoke ${text} is driven by the actual choimis_battle BGM clock`, !!reached && cue.cue === text && cue.range && cue.paused === false, json({ cue, file }));
    trace.observations.push({ label: `karaoke-${text}`, cue, file }); save();
    return cue;
  };
  const temporalNames = [
    'karaoke_verse_char_echo_03', 'karaoke_verse_fade_08', 'karaoke_verse_char_echo_15',
    'karaoke_verse_fade_20', 'karaoke_verse_char_echo_30', 'karaoke_verse_fade_40',
  ];
  const temporalReady = await until(() => window.__choimisQa.temporalCaptures?.every(target => !!target.data) ? true : null, 30000);
  const temporalDetails = await page.evaluate(() => window.__choimisQa.temporalCaptures);
  for (const [index, details] of (temporalDetails || []).entries()) {
    const name = temporalNames[index], file = await shot(name);
    if (details?.data) fs.writeFileSync(file, Buffer.from(details.data.split(',')[1], 'base64'));
    trace.observations.push({ label: `karaoke-temporal-${name}`, target: details?.time, captured: !!details?.data, actual: details?.actual, frame: details?.frame, file }); save();
    check(`karaoke temporal ${name} is captured from an onDraw frame at the natural BGM clock`, !!temporalReady && !!details?.data && Number.isFinite(details?.actual) && Math.abs(details.actual - details.time) < 0.14, json({ target: details?.time, actual: details?.actual, frame: details?.frame, file }));
  }
  await waitForLyric('쟤들은 날 이해 하지 못해', 42.184, 44.809, 'karaoke_verse_under_menu');
  await waitForLyric('오늘도 스읍 미스', 44.809, 46.121, 'karaoke_verse_last_line');
  await waitForLyric('최미스! 최미스! 가재맨! 방고닉!', 46.121, 52.215, 'karaoke_chant_first');
  const mediaReady = await until(() => {
    const a = window.game.sound.bgm, b = window.game.battle;
    return a && window.game.sound.bgmName === 'choimis_battle' && a.readyState >= 2 && Number.isFinite(a.duration) && a.duration > 160 && !a.seeking && b?.bgmWait === undefined && a.currentTime > 5 ? true : null;
  }, 10000);
  const mediaCaps = await page.evaluate(() => {
    const a = game.sound.bgm, b = game.battle;
    const seekable = a && Number.isFinite(a.duration) ? Array.from({ length: a.seekable.length }, (_, i) => [a.seekable.start(i), a.seekable.end(i)]) : [];
    return { readyState: a?.readyState, duration: a?.duration, currentTime: a?.currentTime, seeking: a?.seeking, paused: a?.paused, seekable, bgmName: game.sound.bgmName, bgmWait: b?.bgmWait };
  });
  check('real BGM media is ready for repeat-pass observation', !!mediaReady, json(mediaCaps));
  if (mediaCaps.seekable.some(([, end]) => end >= 144.2)) {
    await fixture('karaoke-seek-pause-loop-boundary', 'Explicitly seek the real battle audio element to the repeat-pass cue, pause it, and leave gameplay state and pattern timers untouched. This checks the renderer recomputes from currentTime rather than retaining stale lyric state.', () => {
      const audio = game.sound.bgm;
      window.__choimisQa.seekProbe = { before: audio?.currentTime, pausedBefore: audio?.paused, readyState: audio?.readyState, duration: audio?.duration };
      if (audio) { audio.currentTime = 144.2; audio.pause(); }
    });
    await page.waitForTimeout(250);
    const repeatPaused = await page.evaluate(() => {
      const a = game.sound.bgm, time = a?.currentTime;
      return { time, paused: a?.paused, cue: window.__choimisQa.lyricAt(time)?.text || null, battle: game.battle?.state, readyState: a?.readyState, duration: a?.duration, probe: window.__choimisQa.seekProbe };
    });
    await shot('karaoke_repeat_pass_paused_seek');
    check('karaoke recomputes the repeat-pass lyric after an explicit pause/seek boundary', repeatPaused.cue === '가재맨 방 고닉 최미스' && repeatPaused.paused === true && repeatPaused.battle === 'menu', json(repeatPaused));
  } else {
    trace.observations.push({ label: 'karaoke-seek-unavailable-natural-repeat-required', mediaCaps }); save();
    await waitForLyric('가재맨 방 고닉 최미스', 144.184, 147.184, 'karaoke_repeat_pass_natural', 120000);
  }
  const resetProbe = await fixture('karaoke-loop-reset', 'Reset only the real BGM element to the start of its loop and resume it; no battle state or timers are injected.', async () => {
    const audio = game.sound.bgm;
    if (audio) { audio.currentTime = 0; await audio.play().catch(() => {}); }
  });
  const loopReset = await page.evaluate(() => ({ time: game.sound.bgm?.currentTime, paused: game.sound.bgm?.paused, cue: window.__choimisQa.lyricAt(game.sound.bgm?.currentTime)?.text || null }));
  check('karaoke loop reset returns to audio time zero without retaining the repeat lyric', loopReset.time < 1 && loopReset.cue === null, json(loopReset));
  await until(() => window.game.sound.bgm?.currentTime >= 18 ? true : null, 30000);

  const queueRound = async () => {
    for (let i = 0; i < 3; i++) {
      await page.evaluate(memberIndex => { window.__choimisQa.waitMemberIdx = memberIndex; }, i);
      const ready = await until(() => { const b = window.game.battle; return b?.state === 'menu' && b.memberIdx === window.__choimisQa.waitMemberIdx ? true : null; }, 6000);
      if (!ready) return false;
      await press('KeyC');
      if (!await until(() => window.game.battle?.state === 'target', 3000)) return false;
      await press('KeyC');
    }
    return !!(await until(() => window.game.battle?.state === 'act' || window.game.battle?.state === 'enemy-prep', 6000));
  };
  for (const pattern of PATTERNS) {
    await fixture(`pattern-select-${pattern.name}`, `Explicitly select ${pattern.type} by setting only the enemy pattern index before using the real attack/menu input. This is not a natural boss-completion claim.`, ({ index }) => {
      const b = game.battle, e = b.enemies[0]; e.patternIdx = index; e.hp = e.maxHp; b.members.forEach(m => { m.down = false; m.hp = m.maxHp; });
    }, { index: pattern.index });
    await page.evaluate(() => { window.__choimisQa.frames = []; });
    const queued = await queueRound();
    check(`${pattern.name}: real menu/attack input queues a full party turn`, queued, json(await snapshot()));
    const telegraph = await until(() => window.__choimisQa.frames?.some(f => f.battle === 'bullets' && f.bullets.some(b => b.warn !== undefined && b.age < b.warn)) ? true : null, 10000);
    if (telegraph) await shot(`pattern_${pattern.name}_telegraph`);
    const teleFrame = await page.evaluate(() => [...(window.__choimisQa.frames || [])].reverse().find(f => f.battle === 'bullets' && f.bullets.some(b => b.warn !== undefined && b.age < b.warn)) || null);
    check(`${pattern.name}: actual rendered telegraph is present`, !!telegraph && (teleFrame?.bullets?.length || 0) > 0, json({ pattern, bullets: teleFrame?.bullets || [] }));
    const active = await until(() => window.__choimisQa.frames?.some(f => f.battle === 'bullets' && f.bullets.some(b => b.warn !== undefined && b.age >= b.warn)) ? true : null, 4000);
    if (active) await shot(`pattern_${pattern.name}_active`);
    const activeFrame = await page.evaluate(() => [...(window.__choimisQa.frames || [])].reverse().find(f => f.battle === 'bullets' && f.bullets.some(b => b.warn !== undefined && b.age >= b.warn)) || null);
    check(`${pattern.name}: actual rendered active hazard follows its warning`, !!active && (activeFrame?.bullets || []).some(b => b.age >= b.warn), json(activeFrame?.bullets || []));
    if (pattern.name === 'jjajang' && active) {
      const dimFrame = await page.evaluate(() => [...(window.__choimisQa.frames || [])].reverse().find(frame => frame.battle === 'bullets' && frame.lyric) || null);
      await shot('karaoke_enemy_attack_dim');
      check('karaoke remains rendered and uses the dim attack state during active enemy bullets', dimFrame?.battle === 'bullets' && dimFrame.alpha < 1 && !!dimFrame.lyric, json(dimFrame));
    }
    const observed = [];
    const endAt = Date.now() + 14000;
    while (Date.now() < endAt) {
      const q = await page.evaluate(() => { const b = game.battle; return b ? { state: b.state, bullets: (b.bullets || []).map(x => ({ id: x.__qaId, shape: x.shape, text: x.text, denomination: x.denomination, look: x.look, age: x.age, warn: x.warn, x: x.x, y: x.y })), pose: b.enemies[0]?.patternPose || null } : null; });
      if (!q) break; observed.push(q); if (q.state === 'board-close' || q.state === 'menu') break; await page.waitForTimeout(90);
    }
    const ended = await until(() => window.game.battle?.state === 'menu', 5000);
    const endState = await record(`pattern-${pattern.name}-end`);
    await shot(`pattern_${pattern.name}_end`);
    const shapes = [...new Set(observed.flatMap(q => q.bullets.map(b => b.shape)))];
    const hasExpectedShape = pattern.shapes.every(shape => shapes.includes(shape));
    check(`${pattern.name}: source pattern ${pattern.source} renders expected hazard shapes and ends cleanly`, !!ended && hasExpectedShape && (endState.battle?.bullets?.length || 0) === 0, json({ pattern, shapes, ended, final: endState.battle }));
    trace.patterns.push({ ...pattern, shapes, frames: observed.length, ended: !!ended }); save();
    if (pattern.name === 'choso') {
      check('choso: temporary model/pose is used only during choso pattern', observed.some(q => q.pose?.sheet === 'choso') && observed.at(-1)?.pose == null, json(observed.map(q => q.pose)));
    }
    if (pattern.name === 'rap') {
      const orderedLyrics = [], seenLyricBullets = new Set();
      for (const bullet of observed.flatMap(q => q.bullets.filter(b => b.shape === 'choimis_lyric')).filter(b => b.text)) {
        if (seenLyricBullets.has(bullet.id)) continue;
        seenLyricBullets.add(bullet.id); orderedLyrics.push(bullet.text);
      }
      const lyrics = orderedLyrics.join('');
      const mic = observed.flatMap(q => q.bullets).find(b => b.shape === 'choimis_mic');
      check('rap: centered MIC and exact lyric sequence render in the active turn', lyrics === '요최미스래퍼딱지를때이젠앰씨로포에버포에버' && !!mic, json({ lyrics, mic }));
    }
    if (pattern.name === 'money') check('money: rendered notes announce the 1500만원 denomination', observed.flatMap(q => q.bullets).some(b => b.shape === 'choimis_money_note' && b.denomination === '1500'), json(observed.flatMap(q => q.bullets).filter(b => b.shape === 'choimis_money_note').slice(0, 8)));
    if (pattern.name === 'seup') {
      const sfx = await page.evaluate(() => window.__choimisQa.sfx.map(x => x.name));
      check('seup: existing voice/SFX clip is emitted once for the pattern', sfx.filter(name => name === 'choimis_seup_miss').length === 1, json(sfx.filter(name => name === 'choimis_seup_miss')));
      const breathBody = observed.some(q => q.bullets.some(b => b.shape === 'choimis_breath' && b.age >= b.warn + 0.4));
      const fingerBody = observed.some(q => q.bullets.some(b => b.shape === 'choimis_finger_beam' && b.age >= b.warn + 0.1));
      check('seup: white breath and finger beam remain rendered as active bodies after warning', breathBody && fingerBody, json({ breathBody, fingerBody, active: observed.flatMap(q => q.bullets).filter(b => ['choimis_breath', 'choimis_finger_beam'].includes(b.shape)).slice(-12) }));
      for (const shape of ['choimis_breath', 'choimis_finger_beam']) {
        const captured = await page.evaluate(name => window.__choimisQa[name], shape);
        check(`seup: ${shape} has an actual visible active-body canvas capture`, !!captured);
        if (captured) {
          const file = await shot(`pattern_${shape}_active_body`);
          fs.writeFileSync(file, Buffer.from(captured.split(',')[1], 'base64'));
        }
      }
    }
    if (pattern.name === 'fashion') {
      const looks = [...new Set(observed.flatMap(q => q.bullets.filter(b => b.shape === 'choimis_outfit').map(b => b.look)).filter(look => look !== undefined))];
      check('fashion: four pink outfit looks render in sequence', json(looks) === json([0, 1, 2, 3]), json(looks));
    }
  }

  await runRecoveryLifecycle();
});
