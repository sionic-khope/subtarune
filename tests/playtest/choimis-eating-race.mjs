import { runScenario } from './lib/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

await runScenario({ name: 'choimis-eating-race', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, check, fixture }) => {
  const evidence = { scope: 'QA opening override after normal intro; not natural tenth-turn or whole boss clear', source: [], rounds: [] };
  const file = path.join(process.env.SHOT_DIR, 'eating-runtime.json');
  const save = () => fs.writeFileSync(file, JSON.stringify(evidence, null, 2) + '\n');
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
      bgm: { name: game.sound.bgmName, time: game.sound.bgm?.currentTime, paused: game.sound.bgm?.paused },
      media: v ? { time: v.currentTime, duration: v.duration, paused: v.paused, muted: v.muted, volume: v.volume, src: v.getAttribute('src'), frames: v.getVideoPlaybackQuality?.().totalVideoFrames, ready: v.readyState } : null,
      hits: q?.hits, hurts: q?.hurts, labels: q?.labels, biteDraws: q?.biteDraws, boundary: q?.boundary };
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
      const q = window.__eatingQa = { hits: [], hurts: [], labels: [], biteDraws: 0, boundary: [], mode: null };
      if (options.boosted) b.enemies[0].defenseBoosted = true;
      if (options.bossHp !== undefined) b.enemies[0].hp = options.bossHp;
      if (options.partyHp !== undefined) for (const member of b.members) { member.hp = options.partyHp; member.down = false; }
      const hit = b.hitEnemy.bind(b), hurt = b.hurtAllParty.bind(b), update = b.update.bind(b);
      b.hitEnemy = (...args) => { const before = args[0]?.hp, result = hit(...args); q.hits.push({ before, after: args[0]?.hp, requested: args[2], source: args[3]?.source }); return result; };
      b.hurtAllParty = (...args) => { const before = b.members.map(m => m.hp), result = hurt(...args); q.hurts.push({ before, after: b.members.map(m => m.hp), requested: args[0] }); return result; };
      b.update = (...args) => { const result = update(...args); if (b.activeEnemyMode === 'choimis_eating_race' && b.gimmick) { q.mode = b.gimmick; const s = q.mode.snapshot; if (s.elapsed > 10.85 && s.elapsed < 11.15) q.boundary.push({ phase: s.phase, elapsed: s.elapsed, bites: s.bites }); } return result; };
      const fillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, ...args) { if (b.activeEnemyMode === 'choimis_eating_race' && !q.labels.includes(text)) q.labels.push(text); return fillText.call(this, text, ...args); };
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (...args) { if (b.activeEnemyMode === 'choimis_eating_race' && args[0] === b.enemies[0].projectiles?.jjajang && args[1] === 9 && args[2] === 3 && args[3] === 8) q.biteDraws++; return draw.apply(this, args); };
    }, setup);
    for (let i = 0; i < 30; i++) {
      if (await page.evaluate(() => game.battle?.gimmick?.snapshot?.phase === 'intro')) break;
      await press('KeyC', { delay: 70 }); await page.waitForTimeout(180);
    }
    const intro = await until(() => game.battle?.gimmick?.snapshot?.phase === 'intro', 8000);
    check(`${label}: ordinary intro keys enter eating video intro`, intro);
    if (!intro) throw new Error('eating intro missing');
    return record(`${label}-intro`);
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
  for (const width of [375, 768, 1280]) {
    const label = `win-${width}`, before = await enter(label, width, { boosted: width !== 375 });
    await shot(`${label}-intro`);
    await press('KeyC', { delay: 70 });
    check(`${label}: intro C does not eat`, (await snapshot()).mode.bites === 0);
    const firstMedia = await snapshot(); await page.waitForTimeout(700); const secondMedia = await snapshot();
    check(`${label}: video decodes moving frames with audio while BGM continues`, secondMedia.media.frames > firstMedia.media.frames && secondMedia.media.time > firstMedia.media.time && !secondMedia.media.paused && !secondMedia.media.muted && secondMedia.media.volume > 0 && secondMedia.bgm.time > firstMedia.bgm.time && !secondMedia.bgm.paused);
    await start(label); await shot(`${label}-start`);
    await taps(9); await shot(`${label}-midbite`);
    await taps(9); const first = await record(`${label}-first-bowl`);
    check(`${label}: 18 presses finish hyungsub then select gyeongsub`, first.mode.bites === 18 && first.mode.activeMember === 'gyeongsub' && first.mode.partyBowls[0].eaten === 1 && first.mode.partyBowls[1].eaten === 0);
    await taps(18); const second = await record(`${label}-second-bowl`);
    check(`${label}: 36 presses finish gyeongsub then select ppaman`, second.mode.bites === 36 && second.mode.activeMember === 'ppaman' && second.mode.partyBowls[1].eaten === 1 && second.mode.partyBowls[2].eaten === 0);
    await taps(18); const result = await record(`${label}-result`); await shot(`${label}-result`);
    check(`${label}: 54 physical presses win before 10.2 seconds`, result.mode.winner === 'party' && result.mode.bites === 54 && result.mode.raceElapsed < 10.2 && result.mode.partyBowls.every(b => b.eaten === 1));
    check(`${label}: exactly one common boss hit deals 10 and party stays intact`, result.hits.length === 1 && result.hits[0].source === 'choimis-eating-race' && before.hp - result.hp === 10 && result.hurts.length === 0 && result.party.every((m, i) => m.hp === before.party[i].hp));
    check(`${label}: live actor sprites, bite render and START label exist`, result.party.every(m => m.loaded) && result.biteDraws > 0 && result.labels.includes('시작!'));
    check(`${label}: pre-11 intro and post-11 race recorded without early bites`, result.boundary.some(s => s.elapsed < 11 && s.phase === 'intro' && s.bites === 0) && result.boundary.some(s => s.elapsed >= 11 && s.phase === 'race'));
    check(`${label}: menu returns after result`, await until(() => game.battle?.state === 'menu', 4000));
    const after = await record(`${label}-menu`);
    check(`${label}: damage once and video disposed; BGM persists`, after.hits.length === 1 && after.mode.disposed && after.media.paused && after.media.src === null && after.bgm.name === before.bgm.name && !after.bgm.paused);
  }
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
  await press('Escape', { delay: 70 });
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
