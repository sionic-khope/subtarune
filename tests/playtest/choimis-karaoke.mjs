import { runScenario } from './lib/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

await runScenario({ name: 'choimis-karaoke', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, check, fixture }) => {
  const evidence = { sources: [], frames: [], limitations: 'Direct QA battle with opening skipped. One short segment plays on the real audio clock; other cues use explicitly disclosed pause/seeks of that same HTMLAudioElement. Real C queues the enemy turn; no battle result, clock, drawing, HP, or lyric data is injected. Canvas instrumentation only records calls and full Game.draw frames. This is lyric-effect QA, not full battle or human-listening evidence.' };
  const files = ['src/battle/choimis-karaoke.js', 'src/data/choimis-lyrics.js', 'src/battle/battle.js', 'src/ui/font.js', 'src/data/build.js', 'assets/audio/bgm/choimis_battle.mp3'];
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  const save = () => fs.writeFileSync(path.join(process.env.SHOT_DIR, 'karaoke-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
  for (const file of files) {
    const response = await page.request.get(new URL(file, process.env.QA_BASE_URL).href), local = digest(fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, file))), served = digest(await response.body());
    evidence.sources.push({ file, local, served }); check(`served lyric source ${file}`, response.ok() && local === served);
  }
  await page.setViewportSize({ width: 1280, height: 900 }); await open({ qa: 'choimis_eating' });
  check('QA battle reaches intro', await until(() => game.battle?.state === 'intro', 20000));
  await fixture('skip-covered-opening', 'Skip the already-covered battle opening, retain normal party and enemy HP, and use real C to enter the menu.', () => { game.battle.openingShown = true; game.battle.enemies[0].defenseBoosted = true; });
  for (let i = 0; i < 25 && !await page.evaluate(() => game.battle.state === 'menu'); i++) { await press('KeyC', { delay: 55 }); await page.waitForTimeout(150); }
  check('real C opens party menu', await until(() => game.battle.state === 'menu', 5000));
  const mediaReady = await until(() => { const a = game.sound.bgm; return game.sound.bgmName === 'choimis_battle' && !a.paused && a.currentTime > 0 && a.readyState >= 2 && Number.isFinite(a.duration); }, 10000);
  const mediaCaps = () => page.evaluate(() => { const a = game.sound.bgm; return { name: game.sound.bgmName, src: a?.currentSrc, time: a?.currentTime, duration: a?.duration, paused: a?.paused, seeking: a?.seeking, readyState: a?.readyState, error: a?.error?.code, seekable: a ? Array.from({ length: a.seekable.length }, (_, i) => [a.seekable.start(i), a.seekable.end(i)]) : [] }; });
  evidence.mediaBefore = await mediaCaps(); save();
  check('real battle BGM is genuinely playing and decoded', mediaReady, JSON.stringify(evidence.mediaBefore));
  if (!mediaReady) throw new Error('BGM prerequisite failed; no lyric seeks attempted');
  if (!evidence.mediaBefore.seekable.some(([, end]) => end > 190)) {
    evidence.mediaTransport = await fixture('same-byte-seekable-media-transport', 'Static HTTP did not expose a complete seek range. Fetch the exact already-playing MP3 into a Blob on the same HTMLAudioElement; only transport changes. Keep the real audio clock/playback and record its before/after metadata. No synthetic clock or lyric state is installed.', async () => {
      const a = game.sound.bgm, source = a.currentSrc, at = a.currentTime, response = await fetch(source), blob = await response.blob();
      a.pause(); const url = URL.createObjectURL(blob); window.__qaLyricMediaUrl = url; a.src = url; a.load();
      await new Promise((resolve, reject) => { a.addEventListener('loadedmetadata', resolve, { once: true }); a.addEventListener('error', () => reject(new Error('Same-byte MP3 decode failed')), { once: true }); });
      a.currentTime = at; await a.play(); return { source, bytes: blob.size, type: blob.type, previousTime: at };
    });
  }
  check('real audio transport exposes complete cue seek range', await until(() => { const a = game.sound.bgm; return a.seekable.length && a.seekable.end(a.seekable.length - 1) > 190; }, 5000));
  evidence.mediaAfter = await mediaCaps(); save();
  if (!evidence.mediaAfter.seekable.some(([, end]) => end > 190)) throw new Error('Seekability prerequisite failed; no lyric seeks attempted');
  await fixture('full-frame-call-observer', 'Read original canvas text/clip calls and full Game.draw after production rendering; do not replace any pixels or renderer function.', async () => {
    const { choimisLyricAt } = await import('./src/battle/choimis-karaoke.js');
    const q = window.__lyricsQa = { frames: {}, targets: [], calls: [], stack: [], clips: [], path: [], recording: false, pending: null };
    const ctx = game.ctx, draw = game.draw.bind(game);
    for (const method of ['save', 'restore', 'beginPath', 'rect', 'clip', 'fillText', 'strokeText']) {
      const original = ctx[method].bind(ctx);
      ctx[method] = (...args) => {
        if (q.recording) {
          if (method === 'save') q.stack.push([...q.clips]);
          else if (method === 'restore') q.clips = q.stack.pop() || [];
          else if (method === 'beginPath') q.path = [];
          else if (method === 'rect') q.path.push(args);
          else if (method === 'clip') q.clips = [...q.clips, ...q.path];
          else if ((method === 'fillText' || method === 'strokeText') && args[2] === 10) q.calls.push({ method, text: args[0], x: args[1], y: args[2], style: method === 'fillText' ? ctx.fillStyle : ctx.strokeStyle, alpha: ctx.globalAlpha, lineWidth: ctx.lineWidth, clips: [...q.clips], filter: ctx.filter });
        }
        return original(...args);
      };
    }
    game.draw = (...args) => {
      q.calls = []; q.stack = []; q.clips = []; q.path = []; q.recording = true;
      const result = draw(...args); q.recording = false;
      const audio = game.sound.bgm, time = audio?.currentTime;
      const capture = name => { if (!q.frames[name]) q.frames[name] = { name, time, at: performance.now(), paused: audio?.paused, seeking: audio?.seeking, bgm: game.sound.bgmName, src: audio?.currentSrc, battle: game.battle?.state || null, state: game.state, cue: choimisLyricAt(time)?.text || null, calls: q.calls, data: game.canvas.toDataURL('image/png') }; };
      for (const target of q.targets) if (!audio?.paused && time >= target.time && time < target.time + 0.12) capture(target.name);
      if (q.pending && !audio?.seeking && (q.requestedTime === null || Math.abs(time - q.requestedTime) < 0.03)) { capture(q.pending); q.pending = null; }
      return result;
    };
  });
  const capture = async (name, time) => {
    await fixture(`audio-seek-${name}`, 'Pause and seek only the real battle audio element to inspect a cue. No battle timer, state, cue, or rendering is changed.', ({ name, time }) => { const a = game.sound.bgm; a.pause(); a.currentTime = time; window.__lyricsQa.requestedTime = time; window.__lyricsQa.pending = name; }, { name, time });
    await page.evaluate(name => { window.__lyricsQa.awaitName = name; }, name);
    const reached = await until(() => !!window.__lyricsQa.frames[window.__lyricsQa.awaitName], 5000);
    check(`${name}: actual audio seek reaches rendered frame`, reached);
    if (!reached) { evidence.failedSeek = { name, target: time, media: await mediaCaps() }; save(); throw new Error(`Real audio seek failed: ${name}`); }
    return page.evaluate(name => window.__lyricsQa.frames[name], name);
  };
  await fixture('natural-lyric-segment', 'Seek once just before the first cue, then let the actual BGM play normally through onset/middle/tail/expiry. Frame timestamps are read from the media clock.', async () => {
    const q = window.__lyricsQa;
    q.targets = [{ name: 'natural-onset', time: 24.30 }, { name: 'natural-mid', time: 24.48 }, { name: 'natural-tail', time: 24.70 }, { name: 'natural-expired-first-glyph', time: 24.82 }];
    game.sound.bgm.currentTime = 24.18; await game.sound.bgm.play();
  });
  check('onset middle tail and expiry are captured during real playback', await until(() => window.__lyricsQa.targets.every(t => !!window.__lyricsQa.frames[t.name]), 6000));
  await page.evaluate(() => game.sound.bgm.pause());
  const natural = await page.evaluate(() => window.__lyricsQa.frames);
  const ghosts = frame => frame?.calls.filter(c => c.method === 'strokeText' && c.style === '#ff9dca' && c.text === '가') || [];
  const onset = ghosts(natural['natural-onset']), mid = ghosts(natural['natural-mid']), tail = ghosts(natural['natural-tail']);
  check('multiple horizontal ghosts remain behind the foreground during natural playback', onset.length === 10 && mid.length === 10 && tail.length === 10 && new Set(mid.map(c => c.x)).size === 10 && mid.every(c => c.y === 10 && c.filter === 'none'));
  check('ghost opacity decays and expires instead of retaining history', Math.max(...tail.map(c => c.alpha)) < Math.max(...mid.map(c => c.alpha)) && ghosts(natural['natural-expired-first-glyph']).length === 0);
  for (const frame of Object.values(natural)) {
    const firstForeground = frame.calls.findIndex(c => c.method === 'strokeText' && c.style === '#ececf5'), lastGhost = frame.calls.findLastIndex(c => c.style === '#ff9dca');
    check(`${frame.name}: ghosts draw before crisp strokes without glyph-width clipping`, lastGhost < firstForeground && frame.calls.filter(c => c.style === '#ff9dca').every(c => c.clips.some(r => r[0] === 12 && r[2] === 456) && !c.clips.some(r => r[2] < 30)));
  }
  const menuFrame = await capture('menu-verse-mid', 24.48);
  await capture('chorus-mid', 48.56); await capture('1500-mid', 59.08); await capture('1500-repeat120-mid', 179.08);
  if (process.env.QA_BUILD303 === '1') {
    for (const offset of [0, 120]) {
      const before = await capture(`303-chorus-${offset}-before`, 46.62 + offset);
      const after = await capture(`303-chorus-${offset}-after`, 46.70 + offset);
      check(`chorus${offset}: container waits until46.646 plus repeat offset`, before.cue === '오늘도 스읍 미스' && after.cue === '최미스! 최미스! 가재맨! 방고닉!');
    }
    const timing = await page.evaluate(async () => {
      const { CHOIMIS_LYRICS } = await import('./src/data/choimis-lyrics.js');
      return CHOIMIS_LYRICS.filter(c => c.text === '최미스! 최미스! 가재맨! 방고닉!').map(c => ({ start: c.start, chars: c.chars.map(char => char.at) }));
    });
    check('chorus syllable timing stays unchanged while only its container onset moves', timing.length === 2 && Math.abs(timing[0].start - 46.646) < 0.001 && Math.abs(timing[1].start - 166.646) < 0.001 && timing[0].chars.slice(0, 3).every((at, i) => Math.abs(at - [46.646, 46.985, 47.303][i]) < 0.001) && timing[1].chars.every((at, i) => Math.abs(at - timing[0].chars[i] - 120) < 0.001));
    evidence.chorus303 = timing;
  }
  const repeat = await capture('verse-repeat120-mid', 144.48);
  check('repeat seeks choose current cue with no prior-chorus ghosts', repeat.cue === '가재맨 방 고닉 최미스' && repeat.calls.filter(c => c.style === '#ff9dca').every(c => repeat.cue.includes(c.text)));
  await capture('cue-transition-before', 27.30); const transition = await capture('cue-transition-after', 27.39);
  check('new cue replaces old glyph ghosts immediately after seek', transition.cue === '오늘도 닉언 당하네' && transition.calls.filter(c => c.style === '#ff9dca').every(c => transition.cue.includes(c.text)));
  for (const [name, time] of [['empty-gap', 72], ['reset-before-lyrics', 0]]) { const frame = await capture(name, time); check(`${name}: no retained lyric text or ghosts`, frame.cue === null && frame.calls.length === 0); }
  for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); await capture(`responsive-${width}`, 48.56); await shot(`responsive-${width}`); }
  await capture('before-real-round', 24.48);
  for (let i = 0; i < 3; i++) { await press('KeyC', { delay: 55 }); if (!await until(() => game.battle.state === 'target', 3000)) throw new Error('Target menu missing'); await press('KeyC', { delay: 55 }); if (i < 2 && !await until(() => game.battle.state === 'menu', 3000)) throw new Error('Next party menu missing'); }
  check('actual queued party actions enter enemy bullets', await until(() => game.battle.state === 'bullets', 10000));
  const attack = await capture('attack-dim', 24.48);
  const frontAlpha = frame => frame.calls.find(c => c.method === 'fillText' && c.style === '#ff78b8')?.alpha;
  check('attack dims foreground and echoes together to0.68 of menu', attack.battle === 'bullets' && Math.abs(frontAlpha(attack) / frontAlpha(menuFrame) - 0.68) < 0.005 && Math.abs(ghosts(attack)[0].alpha / ghosts(menuFrame)[0].alpha - 0.68) < 0.005);
  check('enemy turn returns to menu without lyric state leakage', await until(() => game.battle.state === 'menu', 15000));
  await press('Escape', { delay: 55 }); check('physical Escape reaches title', await until(() => game.state === 'title', 5000));
  await page.evaluate(() => { window.__lyricsQa.pending = 'title-after-abort'; window.__lyricsQa.requestedTime = null; });
  check('end state has no retained karaoke draw calls', await until(() => window.__lyricsQa.frames['title-after-abort']?.calls.length === 0, 3000));
  const frames = await page.evaluate(() => window.__lyricsQa.frames);
  for (const [name, frame] of Object.entries(frames)) { const file = path.join(process.env.SHOT_DIR, `${name}-canvas.png`); fs.writeFileSync(file, Buffer.from(frame.data.split(',')[1], 'base64')); evidence.frames.push({ ...frame, data: undefined, file }); }
  evidence.sourcesAfter = files.map(file => ({ file, local: digest(fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, file))) }));
  check('all lyric-bound sources remain unchanged', evidence.sourcesAfter.every(s => evidence.sources.find(before => before.file === s.file).local === s.local)); save();
});
