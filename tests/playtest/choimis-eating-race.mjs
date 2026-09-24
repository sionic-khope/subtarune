import { runScenario } from './lib/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { escToTitle } from './lib/esc.mjs';

await runScenario({ name: 'choimis-eating-race', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot: rawShot, check, fixture }) => {
  const build303 = process.env.QA_BUILD303 === '1';
  const evidence = { scope: 'QA opening override after normal intro; not natural tenth-turn or whole boss clear', source: [], rounds: [], captures: [] };
  const file = path.join(process.env.SHOT_DIR, 'eating-runtime.json');
  const save = () => fs.writeFileSync(file, JSON.stringify(evidence, null, 2) + '\n');
  const shot = async name => {
    if (process.env.QA_BUILD299 !== '1' || name.endsWith('-menu')) return rawShot(name);
    const frame = await page.evaluate(() => ({ data: game.canvas.toDataURL('image/png'), dimensions: [game.canvas.width, game.canvas.height], viewport: [innerWidth, innerHeight], phase: game.battle?.gimmick?.snapshot?.phase, elapsed: game.battle?.gimmick?.snapshot?.elapsed }));
    const capture = path.join(process.env.SHOT_DIR, `${name}-canvas.png`);
    fs.writeFileSync(capture, Buffer.from(frame.data.split(',')[1], 'base64'));
    evidence.captures.push({ file: capture, ...frame, data: undefined }); save(); return capture;
  };
  const sourceRoot = process.env.QA_SOURCE_ROOT;
  if (!sourceRoot) throw new Error('QA_SOURCE_ROOT must identify the independently verified serving worktree');
  for (const relative of ['src/battle/modes/choimis-eating-race.js', 'src/battle/choimis-rap-video.js', 'src/battle/battle.js', 'src/battle/modes.js', 'src/data/enemies.js', 'src/core/story.js', 'src/data/scripts.js', 'src/data/locale/ko.js', 'src/data/build.js', 'assets/video/choimis-eating-race.mp4']) {
    const response = await page.request.get(new URL(relative, process.env.QA_BASE_URL).href);
    const digest = data => createHash('sha256').update(data).digest('hex');
    const local = digest(fs.readFileSync(path.join(sourceRoot, relative))), served = digest(await response.body());
    evidence.source.push({ relative, local, served, status: response.status() });
    check(`HTTP source binding: ${relative}`, response.ok() && local === served);
  }
  save();
  await page.addInitScript(() => {
    window.__eatingVideos = [];
    const create = document.createElement.bind(document);
    document.createElement = (...args) => {
      const element = create(...args);
      if (String(args[0]).toLowerCase() === 'video') window.__eatingVideos.push(element);
      return element;
    };
  });
  const snapshot = () => page.evaluate(() => {
    const b = game.battle, q = window.__eatingQa, v = window.__eatingVideos.at(-1);
    return { state: game.state, battle: b?.state, mode: b?.gimmick?.snapshot || q?.mode?.snapshot,
      hp: b?.enemies[0]?.hp, boosted: b?.enemies[0]?.defenseBoosted,
      party: b?.members.map(m => ({ id: m.id, hp: m.hp, maxHp: m.maxHp, down: m.down, loaded: !!m.frames?.idle?.length })),
      bgm: { name: game.sound.bgmName, time: game.sound.bgm?.currentTime, paused: game.sound.bgm?.paused, ready: game.sound.bgm?.readyState, src: game.sound.bgm?.currentSrc, volume: game.sound.bgm?.volume, muted: game.sound.bgm?.muted },
      media: v ? { time: v.currentTime, duration: v.duration, paused: v.paused, muted: v.muted, volume: v.volume, src: v.getAttribute('src'), currentSrc: v.currentSrc, frames: v.getVideoPlaybackQuality?.().totalVideoFrames, ready: v.readyState, audioDecodedBytes: v.webkitAudioDecodedByteCount ?? null, width: v.videoWidth, height: v.videoHeight, error: v.error?.message || null } : null,
      bubble: b?.bubble ? { text: b.bubble.text, shown: b.bubble.shown } : null,
      hits: q?.hits, hurts: q?.hurts, labels: q?.labels, allLabels: q?.allLabels, biteDraws: q?.biteDraws, boundary: q?.boundary, transition: q?.transition };
  });
  const record = async label => { const state = await snapshot(); evidence.rounds.push({ label, ...state }); save(); return state; };
  const enter = async (label, width = 1280, setup = {}) => {
    await page.setViewportSize({ width, height: width === 375 ? 812 : width === 768 ? 1024 : 800 });
    await open({ qa: 'choimis_eating' });
    const loaded = await until(() => !!window.game?.battle && game.battle.state !== 'load', 30000);
    check(`${label}: QA battle loaded`, loaded);
    if (!loaded) throw new Error('QA battle missing');
    await fixture(`${label}-preparation`, 'Observe common damage/render calls; optionally prepare defense/HP boundaries. The QA route replaces openingMode and is not natural tenth-turn entry. No clock, result, or bite count injection.', options => {
      const b = game.battle;
      const q = window.__eatingQa = { hits: [], hurts: [], labels: [], allLabels: [], biteDraws: 0, boundary: [], transition: [], mode: null, frames: {}, phaseHistory: [], enemyPose: null };
      if (options.boosted) b.enemies[0].defenseBoosted = true;
      if (options.bossHp !== undefined) b.enemies[0].hp = options.bossHp;
      if (options.partyHp !== undefined) for (const member of b.members) { member.hp = options.partyHp; member.down = false; }
      const hit = b.hitEnemy.bind(b), hurt = b.hurtAllParty.bind(b), update = b.update.bind(b);
      b.hitEnemy = (...args) => { const before = args[0]?.hp, phase = q.mode?.snapshot.phase, result = hit(...args); q.hits.push({ before, after: args[0]?.hp, requested: args[2], source: args[3]?.source, phase, at: performance.now() }); return result; };
      b.hurtAllParty = (...args) => { const before = b.members.map(m => m.hp), result = hurt(...args); q.hurts.push({ before, after: b.members.map(m => m.hp), requested: args[0] }); return result; };
      b.update = (...args) => { const result = update(...args); if (b.activeEnemyMode === 'choimis_eating_race' && b.gimmick) { q.mode = b.gimmick; const s = q.mode.snapshot; if (s.elapsed > 10.85 && s.elapsed < 11.15) q.boundary.push({ phase: s.phase, elapsed: s.elapsed, bites: s.bites }); if (['prelude', 'transition'].includes(s.phase)) q.transition.push({ phase: s.phase, phaseElapsed: s.phaseElapsed, elapsed: s.elapsed, at: performance.now() }); } return result; };
      const fillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
        if (b.activeEnemyMode === 'choimis_eating_race') {
          if (!q.labels.includes(text)) q.labels.push(text);
          if (!q.allLabels.includes(text)) q.allLabels.push(text);
        }
        return fillText.call(this, text, ...args);
      };
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (...args) { if (b.activeEnemyMode === 'choimis_eating_race' && args[0] === b.enemies[0].projectiles?.jjajang && args[1] === 9 && args[2] === 3 && args[3] === 8) q.biteDraws++; return draw.apply(this, args); };
      const drawEnemy = b.drawEnemy.bind(b);
      b.drawEnemy = (ctx, enemy, ...args) => {
        if (enemy.patternPose && b.activeEnemyMode === 'choimis_eating_race') q.enemyPose = { ...enemy.patternPose };
        return drawEnemy(ctx, enemy, ...args);
      };
      const drawGame = game.draw.bind(game);
      game.draw = (...args) => {
        q.enemyPose = null;
        const result = drawGame(...args), s = q.mode?.snapshot;
        if (!s) return result;
        const phase = b.state === 'menu' ? 'menu' : s.phase;
        if (q.phaseHistory.at(-1)?.phase !== phase) q.phaseHistory.push({ phase, at: performance.now(), hp: b.enemies[0].hp, hits: q.hits.length });
        const capture = name => {
          if (q.frames[name]) return;
          q.frames[name] = { at: performance.now(), captureSurface: 'after full Game.draw', dimensions: [game.canvas.width, game.canvas.height], viewport: [innerWidth, innerHeight], battle: b.state, mode: s, hp: b.enemies[0].hp, hits: q.hits.map(hit => ({ ...hit })), enemyPose: q.enemyPose,
            bubble: b.bubble ? { text: b.bubble.text, shown: b.bubble.shown } : null, data: game.canvas.toDataURL('image/png') };
        };
        if (phase === 'win-talk' && b.bubble?.shown >= b.bubble?.text.length) capture('win-talk');
        if (phase === 'windup' && s.phaseElapsed >= 0.15) capture('windup');
        if (phase === 'throw' && s.projectile.progress >= 0.45 && s.projectile.progress <= 0.6) capture('mid-throw');
        if (phase === 'impact') capture('impact');
        if (phase === 'impact' && s.phaseElapsed >= 0.38 && s.phaseElapsed <= 0.45) capture('recoil');
        if (phase === 'result' && s.winner === 'party') capture('result');
        if (phase === 'menu' && s.winner === 'party') capture('menu');
        return result;
      };
    }, setup);
    for (let i = 0; i < 30; i++) {
      if (await page.evaluate(() => ['prelude', 'intro'].includes(game.battle?.gimmick?.snapshot?.phase))) break;
      await press('KeyC', { delay: 70 }); await page.waitForTimeout(180);
    }
    if (process.env.QA_BUILD299 === '1' || build303) {
      const prelude = await until(() => game.battle?.gimmick?.snapshot?.phase === 'prelude' && game.battle.bubble?.shown >= game.battle.bubble?.text.length, 8000);
      const before = await record(`${label}-preamble`); await shot(`${label}-preamble`);
      check(`${label}: exact preamble is completely visible before video clock`, prelude && before.bubble?.text === '짜장면 먹방 대결해볼까? 들어와' && before.mode.elapsed === 0 && before.media.paused && before.media.time === 0);
      check(`${label}: slower fade reaches intermediate state`, await until(() => game.battle?.gimmick?.snapshot?.phase === 'transition' && game.battle.gimmick.snapshot.phaseElapsed >= 0.3, 3000));
      const middle = await record(`${label}-transition-mid`); await shot(`${label}-transition-mid`);
      check(`${label}: fade does not consume the eleven-second media clock`, middle.mode.elapsed === 0 && middle.media.paused && middle.media.time === 0);
    }
    const intro = await until(() => game.battle?.gimmick?.snapshot?.phase === 'intro', 8000);
    check(`${label}: ordinary intro keys enter eating video intro`, intro);
    if (!intro) throw new Error('eating intro missing');
    const introState = await record(`${label}-intro`);
    if (process.env.QA_BUILD299 === '1' || build303) {
      const fade = introState.transition.filter(s => s.phase === 'transition');
      check(`${label}: transition lasts 0.8 seconds`, fade.length > 0 && Math.max(...fade.map(s => s.phaseElapsed)) >= 0.75 && Math.max(...fade.map(s => s.phaseElapsed)) <= 0.8);
    }
    return introState;
  };
  const start = async label => {
    const ready = await until(() => game.battle?.gimmick?.snapshot?.phase === 'race', 14000);
    check(`${label}: real-time race begins`, ready);
    if (!ready) throw new Error('race start missing');
    const state = await record(`${label}-start`);
    check(`${label}: starts at video eleven with 0 bites`, state.mode.elapsed >= 11 && state.mode.elapsed < 11.4 && state.mode.bites === 0 && Math.abs(state.media.time - 11) < 0.5);
    return state;
  };
  const taps = async count => {
    for (let i = 0; i < count; i++) { await press('KeyC', { delay: 45 }); await page.waitForTimeout(45); }
  };
  const instructionLabels = state => state.labels.filter(label => /먹어라|연타|피해|한 입|눌렀다|\d+ \/ 54/.test(label));
  for (const width of build303 ? [1280] : [375, 768, 1280]) {
    const label = `win-${width}`, before = await enter(label, width, { boosted: width !== 375 });
    check(`${label}: intro renders only the single eating guide`, JSON.stringify(instructionLabels(before)) === JSON.stringify(['짜장면을 먹어라! (C 연타)']));
    await shot(`${label}-intro-a`);
    await press('KeyC', { delay: 70 });
    check(`${label}: intro C does not eat`, (await snapshot()).mode.bites === 0);
    const firstMedia = await snapshot(); await page.waitForTimeout(700); const secondMedia = await snapshot();
    evidence.rounds.push({ label: `${label}-media-playback`, first: firstMedia, second: secondMedia }); save();
    await shot(`${label}-intro-b`);
    check(`${label}: video decodes moving frames with audio while BGM continues`, secondMedia.media.frames > firstMedia.media.frames && secondMedia.media.time > firstMedia.media.time && !secondMedia.media.paused && !secondMedia.media.muted && secondMedia.media.volume > 0 && secondMedia.bgm.time > firstMedia.bgm.time && !secondMedia.bgm.paused);
    check(`${label}: actual video and BGM media loaded without errors`, secondMedia.media.ready >= 2 && secondMedia.media.width > 0 && secondMedia.media.height > 0 && !secondMedia.media.error && secondMedia.media.currentSrc.includes('/assets/video/choimis-eating-race.mp4') && secondMedia.bgm.ready >= 2 && !!secondMedia.bgm.src && secondMedia.bgm.volume > 0 && !secondMedia.bgm.muted);
    if (secondMedia.media.audioDecodedBytes !== null) check(`${label}: browser decoded the video audio track`, secondMedia.media.audioDecodedBytes > 0);
    await start(label); await shot(`${label}-start`);
    check(`${label}: START retains only the single eating guide`, JSON.stringify(instructionLabels(await snapshot())) === JSON.stringify(['짜장면을 먹어라! (C 연타)']));
    check(`${label}: race advances beyond the guide window`, await until(() => window.__eatingQa.mode?.snapshot.raceElapsed >= 0.95, 2500));
    await page.evaluate(() => { window.__eatingQa.labels = []; });
    await page.waitForTimeout(100);
    const progress = await record(`${label}-race-progress`); await shot(`${label}-race-progress`);
    check(`${label}: active race has visual food progress without redundant instructions`, progress.mode.rivalBites > 0 && instructionLabels(progress).length === 0);
    await taps(9); await shot(`${label}-midbite`);
    await taps(9); const first = await record(`${label}-first-bowl`);
    check(`${label}: 18 presses finish hyungsub then select gyeongsub`, first.mode.bites === 18 && first.mode.activeMember === 'gyeongsub' && first.mode.partyBowls[0].eaten === 1 && first.mode.partyBowls[1].eaten === 0);
    await taps(18); const second = await record(`${label}-second-bowl`);
    check(`${label}: 36 presses finish gyeongsub then select ppaman`, second.mode.bites === 36 && second.mode.activeMember === 'ppaman' && second.mode.partyBowls[1].eaten === 1 && second.mode.partyBowls[2].eaten === 0);
    await taps(18); const result = await record(`${label}-54-taps`);
    check(`${label}: 54 physical presses win before 10.2 seconds`, result.mode.winner === 'party' && result.mode.bites === 54 && result.mode.raceElapsed < 10.2 && result.mode.partyBowls.every(b => b.eaten === 1));
    check(`${label}: win starts with surprise dialogue and no early damage`, result.mode.phase === 'win-talk' && result.bubble?.text === '앗 이런!' && result.hits.length === 0 && result.hp === before.hp);
    check(`${label}: live actor sprites, bite render and START label exist`, result.party.every(m => m.loaded) && result.biteDraws > 0 && result.allLabels.includes('시작!'));
    check(`${label}: pre-11 intro and post-11 race recorded without early bites`, result.boundary.some(s => s.elapsed < 11 && s.phase === 'intro' && s.bites === 0) && result.boundary.some(s => s.elapsed >= 11 && s.phase === 'race'));
    check(`${label}: menu returns after complete throw and result`, await until(() => game.battle?.state === 'menu' && !!window.__eatingQa.frames.menu, 6500));
    const after = await record(`${label}-menu`);
    await shot(`${label}-menu`);
    const latched = await page.evaluate(() => ({ frames: window.__eatingQa.frames, history: window.__eatingQa.phaseHistory }));
    evidence.rounds.push({ label: `${label}-phase-history`, history: latched.history });
    for (const name of ['win-talk', 'windup', 'mid-throw', 'impact', 'recoil', 'result', 'menu']) {
      const frame = latched.frames[name];
      check(`${label}: full Game.draw frame latched for ${name}`, !!frame);
      if (!frame) continue;
      const { data, ...metadata } = frame, bytes = Buffer.from(data.split(',')[1], 'base64');
      const capture = path.join(process.env.SHOT_DIR, `${label}-${name}-canvas.png`);
      fs.writeFileSync(capture, bytes);
      evidence.captures.push({ file: capture, sha256: createHash('sha256').update(bytes).digest('hex'), ...metadata });
    }
    save();
    const { 'win-talk': talk, windup, 'mid-throw': flying, impact, recoil, result: settled } = latched.frames;
    check(`${label}: typed surprise and windup precede any damage`, talk?.bubble?.text === '앗 이런!' && talk.bubble.shown >= talk.bubble.text.length && [talk, windup, flying].every(frame => frame?.hp === before.hp && frame.hits.length === 0));
    check(`${label}: bowl travels and rotates from windup through mid-throw`, windup?.mode.projectile?.x === 64 && windup.mode.projectile.y === 200 && flying?.mode.projectile?.x > 64 && flying.mode.projectile.x < 411 && flying.mode.projectile.y < 123 && flying.mode.projectile.rotation > 0);
    check(`${label}: impact first frame reaches boss at 411,123 and applies exactly ten`, impact?.mode.projectile?.progress === 1 && Math.abs(impact.mode.projectile.x - 411) <= 1e-6 && Math.abs(impact.mode.projectile.y - 123) <= 1e-6 && impact.hits.length === 1 && impact.hits[0].phase === 'impact' && impact.hits[0].requested === 10 && before.hp - impact.hp === 10);
    check(`${label}: rendered boss recoils then returns to rest`, impact?.enemyPose?.x === 411 && recoil?.enemyPose?.x > 419.7 && recoil.enemyPose.y < 174.2 && settled?.enemyPose?.x === 411 && settled.enemyPose.y === 178);
    const phaseNames = latched.history.map(item => item.phase);
    check(`${label}: observed win phases retain order`, ['win-talk', 'windup', 'throw', 'impact', 'result', 'menu'].every((phase, i, order) => phaseNames.includes(phase) && (!i || phaseNames.indexOf(phase) > phaseNames.indexOf(order[i - 1]))));
    for (const [phase, seconds] of [['windup', 0.45], ['throw', 0.65], ['impact', 0.8], ['result', 1.2]]) {
      const index = latched.history.findIndex(entry => entry.phase === phase);
      const duration = index >= 0 && latched.history[index + 1] ? (latched.history[index + 1].at - latched.history[index].at) / 1000 : NaN;
      check(`${label}: ${phase} real-time duration approximately ${seconds}s`, duration >= seconds - 0.07 && duration <= seconds + 0.35, `observed=${duration}`);
    }
    check(`${label}: exactly one common boss hit deals 10 and party stays intact`, after.hits.length === 1 && after.hits[0].source === 'choimis-eating-race' && before.hp - after.hp === 10 && after.hurts.length === 0 && after.party.every((m, i) => m.hp === before.party[i].hp));
    check(`${label}: damage once and video disposed; BGM persists`, after.hits.length === 1 && after.mode.disposed && after.media.paused && after.media.src === null && after.bgm.name === before.bgm.name && !after.bgm.paused);
  }
  if (build303) { evidence.scope = 'BUILD303 finite 1280px eating win: QA opening override and defense-boost starting boundary; real C54, unaccelerated media, full Game.draw win-talk/windup/throw/impact/recoil/result/menu PNGs and hashes. No time/result/bite/HP injection. No human audio listening, natural tenth-turn, loss, HP1 finale, or whole-boss clear claim.'; save(); return; }
  if (process.env.QA_BUILD299 === '1') { evidence.scope = 'BUILD299 responsive preamble, 0.8-second fade, media-clock eleven-second start, physical 54-press win and menu cleanup; older loss/hold/bossdeath scopes not repeated'; save(); return; }
  for (const held of [false, true]) {
    const label = held ? 'held-repeat-loss' : 'noinput-loss';
    const before = await enter(label);
    if (held) await page.keyboard.down('KeyC');
    await start(label);
    if (held) {
      for (let i = 0; i < 20; i++) { await page.keyboard.down('KeyC'); await page.waitForTimeout(40); }
      check(`${label}: hold crossing START and OS repeats yield zero bites`, (await snapshot()).mode.bites === 0);
      await page.keyboard.up('KeyC'); await page.waitForTimeout(70); await page.keyboard.down('KeyC');
      await page.waitForTimeout(700);
      check(`${label}: fresh press counts once while held`, (await snapshot()).mode.bites === 1);
    }
    check(`${label}: timeout result`, await until(() => window.__eatingQa.mode?.snapshot.phase === 'result', 12000));
    const result = await record(`${label}-result`); await shot(`${label}-result`);
    if (held) await page.keyboard.up('KeyC');
    check(`${label}: choimis finishes all 54 at 10.2`, result.mode.winner === 'choimis' && result.mode.rivalBites === 54 && Math.abs(result.mode.raceElapsed - 10.2) < 0.001);
    check(`${label}: all three receive exactly 15 via common damage once`, result.hits.length === 0 && result.hurts.length === 1 && result.party.every((m, i) => before.party[i].hp - m.hp === 15));
    await until(() => game.battle?.state === 'menu', 4000);
    const after = await record(`${label}-menu`);
    check(`${label}: cleanup causes no repeated penalty`, after.hurts.length === 1 && after.mode.disposed && after.media.src === null);
  }
  await enter('defeat-retry', 1280, { partyHp: 15 }); await start('defeat-retry');
  check('defeat: timeout reaches game over', await until(() => game.battle?.state === 'lose', 13000));
  const lost = await record('defeat-game-over'); await shot('defeat-game-over');
  check('defeat: all zero and mode/video disposed', lost.party.every(m => m.hp === 0 && m.down) && lost.mode.disposed && lost.media.src === null && lost.hurts.length === 1);
  await page.waitForTimeout(2300); await press('KeyC', { delay: 70 });
  check('retry: real C reopens battle intro', await until(() => game.battle?.state === 'intro', 9000));
  const retry = await record('retry-intro');
  check('retry: party and boss HP restored', retry.party.every(m => m.hp === m.maxHp && !m.down) && retry.hp === 200);
  for (let i = 0; i < 30 && !await page.evaluate(() => game.battle?.gimmick?.snapshot?.phase === 'intro'); i++) { await press('KeyC', { delay: 70 }); await page.waitForTimeout(180); }
  check('retry: fresh video begins at zero without duplicate result', (await snapshot()).mode.bites === 0 && (await snapshot()).media.time < 2);
  await escToTitle(page, { delay: 70 });
  check('escape: real title input cancels active video', await until(() => game.state === 'title', 5000));
  const cancelled = await record('escape-cleanup');
  check('escape: mode disposed and video silent', cancelled.mode.disposed && cancelled.media.paused && cancelled.media.src === null);
  await enter('bossdeath', 1280, { bossHp: 10, boosted: true }); await start('bossdeath'); await taps(54);
  check('bossdeath: 54 real keys reach battle victory', await until(() => game.battle?.state === 'win', 5000));
  const dead = await record('bossdeath-win'); await shot('bossdeath-win');
  check('bossdeath: one hit kills exact 10HP boundary and disposes', dead.hp === 0 && dead.hits.length === 1 && dead.mode.disposed && dead.media.src === null);
  await page.waitForTimeout(1000); await press('KeyC', { delay: 70 }); await page.waitForTimeout(300); await press('KeyC', { delay: 70 });
  check('bossdeath: real C returns from victory to field', await until(() => game.state === 'field' && !game.battle, 8000));
  await record('bossdeath-field');
});
