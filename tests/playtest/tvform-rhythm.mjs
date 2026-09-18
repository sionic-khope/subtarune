// Real-time browser regression with synthetic auto-input, not human rhythm/difficulty QA.
// QA_CAPTURE_AUDIO=1 optionally records BGM + WebAudio master for subsequent listening.
import fs from 'node:fs';
import path from 'node:path';
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'tvform-rhythm', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, check, until, open, press, fixture, shot }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const state = () => page.evaluate(() => {
    const b = window.game.battle;
    return { state: b.state, text: b.text, special: b.support?.specialKind, phase: b.gimmick?.snapshot?.phase,
      game: b.gimmick?.snapshot?.game, ycHp: b.enemies[0]?.hp, members: b.members.map(m => m.hp) };
  });
  const tap = async (key, delay = 260) => { await press(key); await page.waitForTimeout(delay); };
  const prepare = async (nearLoop, reference = null) => {
    await open({ qa: 'ship_tvform_battle' });
    if (!await until(() => window.game?.battle?.state === 'intro', 30000)) throw new Error('QA battle intro unavailable');
    for (let i = 0; i < 12 && (await state()).state === 'intro'; i++) await tap('KeyC');
    if (!await until(() => window.game.battle.state === 'menu', 20000)) throw new Error('battle menu unavailable');
    await fixture(nearLoop ? 'near-loop-start' : 'rhythm-first-turn',
      'Prepare specialIdx=1 and refill party HP once. Optional seek is setup only; later progression uses the real BGM clock. This is not natural story progression.', async (nearLoop) => {
        const b = window.game.battle, snd = window.game.sound;
        b.support.turn = 0; b.support.specialIdx = 1;
        for (const m of b.members) { m.hp = m.maxHp; m.down = false; }
        if (nearLoop) {
          if (!Number.isFinite(snd.bgm.duration)) throw new Error('BGM duration unavailable');
          snd.bgm.currentTime = snd.bgm.duration - 16;
          await new Promise(resolve => snd.bgm.addEventListener('seeked', resolve, { once: true }));
        }
      }, nearLoop);
    await fixture('observe-audio-nodes',
      'Observe actual WebAudio buffer starts and BGM events without replacing output. For the reference phrase also record real center-pad draw coordinates; this is not human listening evidence.', async (reference) => {
        const snd = window.game.sound, ctx = snd.ctx, bgm = snd.bgm;
        const q = window.__rhythmQA = { bgm, startTime: bgm.currentTime, duration: bgm.duration, starts: [], sfx: [], events: [] };
        q.draws = [];
        if (reference) {
          const stage = await import('/src/scenes/rhythm-stage.js');
          const canvasContext = window.game.ctx, fillRect = canvasContext.fillRect.bind(canvasContext);
          canvasContext.fillRect = (x, y, w, h) => {
            if (w === stage.HALF.L.w - 10 && h === 10 && y >= stage.LANE_TOP - 5 && y <= stage.RECEPTOR_Y + 8 &&
                String(canvasContext.fillStyle).replaceAll(' ', '').startsWith(`rgba(${stage.NOTE_RGB},`)) {
              q.draws.push({ raw: bgm.currentTime, lane: x < stage.HALF.R.x ? 'L' : 'R', y: y + 5 });
            }
            return fillRect(x, y, w, h);
          };
        }
        q.sourceHeads = (await (await fetch('assets/rhythm/tvtime.json')).json()).notes.map(note => note.t);
        for (const event of ['playing', 'pause', 'seeking', 'ended', 'emptied']) bgm.addEventListener(event, () => q.events.push({ event, time: bgm.currentTime }));
        const sfx = snd.sfx.bind(snd);
        snd.sfx = (name, options) => { q.sfx.push(name); return sfx(name, options); };
        const create = ctx.createBufferSource.bind(ctx);
        ctx.createBufferSource = (...args) => {
          const source = create(...args), start = source.start.bind(source), stop = source.stop.bind(source);
          let record = null;
          source.start = (...startArgs) => {
            const buffer = source.buffer, offset = startArgs[1] ?? 0, duration = startArgs[2] ?? buffer?.duration;
            let peak = 0;
            if (buffer) {
              const channel = buffer.getChannelData(0), begin = Math.floor(offset * buffer.sampleRate);
              const end = Math.min(channel.length, begin + Math.ceil(Math.min(duration, 0.25) * buffer.sampleRate));
              for (let i = begin; i < end; i += 31) peak = Math.max(peak, Math.abs(channel[i]));
            }
            record = { when: startArgs[0] ?? 0, offset, duration, bufferDuration: buffer?.duration, peak, ended: false, contextState: ctx.state,
              contextTime: ctx.currentTime, outputLatency: (ctx.baseLatency || 0) + (ctx.outputLatency || 0), rate: snd.bgm.playbackRate,
              bgmTime: snd.bgm.currentTime, mediaDuration: snd.bgm.duration };
            q.starts.push(record);
            source.addEventListener('ended', () => { record.ended = true; }, { once: true });
            return start(...startArgs);
          };
          source.stop = (when = 0) => { if (record && when > record.when) record.duration = when - record.when; return stop(when); };
          return source;
        };
      }, reference);
    for (let m = 0; m < 3; m++) { await tap('KeyC', 300); await tap('KeyC', 350); }
    if (reference) await fixture('independent-score-phrase-start',
      'After attack keys and before rhythm builds its window, pause and seek to the frozen score phrase. Resume actual BGM before rhythm inputs; no chart or note state is injected.', async (start) => {
        const { YOUNGCLE_SPECIAL } = await import('/src/data/youngcle-special.js');
        const bgm = window.game.sound.bgm;
        bgm.pause(); bgm.currentTime = start - YOUNGCLE_SPECIAL.rhythm.lead;
        await new Promise(resolve => bgm.addEventListener('seeked', resolve, { once: true }));
      }, reference.start);
    const entered = await until(() => window.game.battle.gimmick?.snapshot?.game?.kind === 'rhythm', 20000);
    check('special 2 enters rhythm through attack inputs', !!entered && (await state()).special === 'rhythm');
    if (!entered) throw new Error('rhythm entry failed');
    await until(() => window.game.battle.gimmick?.snapshot?.phase === 'game', 6000);
  };

  const startRecording = async () => {
    if (process.env.QA_CAPTURE_AUDIO !== '1') return;
    await fixture('optional-mixed-audio-recording',
      'Capture existing BGM stream and a parallel WebAudio master connection. Playback is not replaced or permanently rerouted; this is machine output, not human listening proof.', () => {
        const snd = window.game.sound, ctx = snd.ctx, q = window.__rhythmQA;
        if (!snd.bgm.captureStream || typeof MediaRecorder === 'undefined') { q.recordingError = 'captureStream/MediaRecorder unavailable'; return; }
        try {
          const stream = snd.bgm.captureStream();
          if (!stream.getAudioTracks().length) throw new Error('BGM capture stream has no audio track');
          const destination = ctx.createMediaStreamDestination(), bgmSource = ctx.createMediaStreamSource(stream), bgmGain = ctx.createGain();
          // captureStream omits element volume/mute: https://www.w3.org/TR/mediacapture-fromelement/
          const syncVolume = () => { bgmGain.gain.value = snd.bgm.muted ? 0 : snd.bgm.volume; };
          syncVolume(); snd.bgm.addEventListener('volumechange', syncVolume);
          bgmSource.connect(bgmGain); bgmGain.connect(destination); snd.master.connect(destination);
          const chunks = [], recorder = new MediaRecorder(destination.stream, { mimeType: 'audio/webm;codecs=opus' });
          recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
          q.stopRecording = () => new Promise(resolve => {
            recorder.onstop = async () => {
              snd.master.disconnect(destination); bgmSource.disconnect(); bgmGain.disconnect();
              snd.bgm.removeEventListener('volumechange', syncVolume);
              for (const track of [...stream.getTracks(), ...destination.stream.getTracks()]) track.stop();
              const bytes = new Uint8Array(await new Blob(chunks, { type: recorder.mimeType }).arrayBuffer());
              let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
              resolve({ base64: btoa(binary), mimeType: recorder.mimeType });
            };
            recorder.stop();
          });
          recorder.start(1000);
        } catch (error) { q.recordingError = error.message; }
      });
  };

  const autoPlay = (skip = 0, reference = null) => page.evaluate(({ skip, reference }) => new Promise(resolve => {
    const q = window.__rhythmQA, started = performance.now(), samples = [], layers = [];
    let lastNote = null, lastLayer = null, pressed = 0, skipped = 0, previousRaw = q.bgm.currentTime, wraps = 0, refIndex = 0;
    const referenceChecks = [];
    const tick = () => {
      const g = window.game.battle.gimmick?.snapshot?.game, raw = q.bgm.currentTime;
      if (raw < previousRaw - 1) wraps += 1;
      previousRaw = raw;
      if (g?.instrument?.last && g.instrument.last.when !== lastLayer) { lastLayer = g.instrument.last.when; layers.push({ ...g.instrument.last, active: g.instrument.active }); }
      if (!samples.length || performance.now() - samples.at(-1).wall >= 80) samples.push({ wall: performance.now(), raw, mediaDuration: q.bgm.duration, time: g?.time, clockSource: g?.clockSource, latency: g?.latency, sameBgm: window.game.sound.bgm === q.bgm, paused: q.bgm.paused, wraps });
      const expected = reference?.notes[refIndex];
      const nextTime = reference ? expected?.t : g?.next;
      const lane = reference ? expected?.lane : g?.nextLane;
      const lead = nextTime - (reference ? raw : g?.time);
      if (g?.phase === 'play' && nextTime != null && nextTime !== lastNote && lead <= (reference ? 0.025 : 0.04) && lead > -0.12) {
        lastNote = nextTime;
        if (reference) {
          referenceChecks.push({ expected: nextTime, pitch: expected.pitch, actual: g.next, actualPitch: g.nextPitch, actualLane: g.nextLane, lane, raw });
          refIndex += 1;
        }
        if (skipped < skip) skipped += 1;
        else {
          const code = lane === 'L' ? 'ArrowLeft' : 'ArrowRight';
          window.dispatchEvent(new KeyboardEvent('keydown', { key: code, code, bubbles: true }));
          window.dispatchEvent(new KeyboardEvent('keyup', { key: code, code, bubbles: true }));
          pressed += 1;
        }
      }
      if (g && g.phase !== 'play' || performance.now() - started > 28000) resolve({ pressed, skipped, referenceChecks, draws: q.draws, layers, samples, wraps, mediaDuration: q.duration, sourceHeads: q.sourceHeads, final: g, starts: q.starts, events: q.events, elapsed: (performance.now() - started) / 1000 });
      else requestAnimationFrame(tick);
    };
    tick();
  }), { skip, reference });

  const assertPlayback = (result, nearLoop) => {
    const { samples, layers, starts } = result;
    check('auto-input reaches after phase in real time', result.final?.phase === 'after' && result.elapsed >= 14, `phase=${result.final?.phase}, seconds=${result.elapsed.toFixed(2)}, synthetic presses=${result.pressed}`);
    check('BGM element remains playing without replacement', samples.every(s => s.sameBgm && !s.paused) && !result.events.some(e => ['pause', 'ended', 'emptied'].includes(e.event)), JSON.stringify(result.events));
    check('default clock follows actual BGM with zero manual offset', samples.every(s => s.clockSource === 'bgm' && s.latency === 0), JSON.stringify(samples[0]));
    const beforeLoop = samples.filter(s => s.wraps === 0);
    check('snapshot.time matches BGM currentTime within 35ms before loop', beforeLoop.length > 5 && beforeLoop.every(s => Math.abs(s.time - s.raw) < 0.035), `max=${Math.max(...beforeLoop.map(s => Math.abs(s.time - s.raw))).toFixed(4)}s`);
    check('rhythm advances monotonically across play', samples.every((s, i) => i === 0 || s.time >= samples[i - 1].time - 0.035), `wraps=${result.wraps}`);
    check('decoded melody layer ready and error-free', result.final?.instrument?.ready && !result.final.instrument.error, JSON.stringify(result.final?.instrument));
    const matched = layers.map(layer => ({ layer, node: starts.find(node => Math.abs(node.when - layer.when) < 0.0001 && Math.abs(node.offset - layer.offset) < 0.001 && Math.abs(node.duration - layer.duration) < 0.001) }));
    check('GREATs create real non-silent source-aligned buffer playback', layers.length >= 10 && matched.every(({ node }) => node && node.bufferDuration > 60 && node.peak > 0.00001 && node.contextState === 'running'), `layers=${layers.length}, matches=${matched.filter(m => m.node).length}`);
    check('observed melody nodes complete playback', matched.filter(({ node }) => node?.ended).length >= 8, `completed=${matched.filter(m => m.node?.ended).length}`);
    check('melody segments align to audible song position and finite musical durations', matched.every(({ layer, node }) => {
      if (!node) return false;
      const audible = Math.max(layer.targetTime, layer.songTime + node.outputLatency * node.rate);
      const expectedOffset = ((audible % node.mediaDuration) + node.mediaDuration) % node.mediaDuration;
      return Math.abs(layer.offset - expectedOffset) < 0.002 && layer.duration > 0 && layer.duration <= 2;
    }), JSON.stringify(layers.slice(0, 3)));
    check('keyed melody matches independently observed BGM audible position', matched.every(({ layer, node }) => {
      if (!node) return false;
      const audible = node.bgmTime + (Math.max(0, node.when - node.contextTime) + node.outputLatency) * node.rate;
      const expectedOffset = audible % node.mediaDuration;
      return Math.abs(layer.offset - expectedOffset) < 0.035;
    }));
    check('target note heads retain original chart positions across the real media loop', matched.every(({ layer, node }) => node && result.sourceHeads.some(head => Math.abs(head - layer.targetTime % node.mediaDuration) < 0.002)));
    if (nearLoop) {
      const afterLoop = samples.filter(s => s.wraps === 1);
      check('near-loop fixture crosses one real media loop', result.wraps === 1 && afterLoop.length > 10, `wraps=${result.wraps}, samples after=${afterLoop.length}`);
      check('unwrapped clock offset stays constant after loop', afterLoop.length > 10 && Math.max(...afterLoop.map(s => s.time - s.raw)) - Math.min(...afterLoop.map(s => s.time - s.raw)) < 0.035);
      check('unwrapped loop uses live media duration including MP3 padding', afterLoop.length > 10 && afterLoop.every(s => Math.abs(s.time - s.raw - s.mediaDuration) < 0.035), `initialDuration=${result.mediaDuration}, liveDuration=${afterLoop[0]?.mediaDuration}, offset=${afterLoop[0]?.time - afterLoop[0]?.raw}`);
      check('loop does not become a BGM restart', afterLoop.every(s => s.sameBgm) && result.events.filter(e => e.event === 'seeking').length <= 1);
    } else check('ordinary play has no seeks/restarts', result.wraps === 0 && !result.events.some(e => e.event === 'seeking'));
  };

  await prepare(false);
  const artifactDir = path.dirname(await shot('tvrh_01_stage'));
  let s = await state();
  check('stage appears during pads before notes start', s.game?.phase === 'pads', JSON.stringify([s.game?.phase, s.game?.notes]));
  check('pad bell played', await page.evaluate(() => window.__rhythmQA.sfx.includes('bell')));
  if (!await until(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'play', 6000)) throw new Error('play phase unavailable');
  s = await state();
  check('full song melody chart loaded', s.game.chartLoaded && s.game.melody);
  const expectedWindow = await page.evaluate(() => {
    const game = window.game.battle.gimmick.snapshot.game;
    return window.__rhythmQA.sourceHeads.filter(t => t >= game.start - 0.005 && t <= game.start + 15 + 0.005).length;
  });
  check('15 second window preserves source phrase count without density filling', s.game.notes === expectedWindow && expectedWindow > 0,
    `notes=${s.game.notes}, source=${expectedWindow}`);
  const hp0 = s.ycHp;
  await startRecording();
  console.log('AUTO-INPUT: rAF synthetic ArrowLeft/ArrowRight events from snapshot next times; not human rhythm or difficulty evidence. No frame acceleration.');
  const bot = autoPlay();
  await page.waitForTimeout(4500); await shot('tvrh_02_play');
  s = await state();
  check('GREAT and combo accumulate during play', s.game.greats >= 5 && s.game.combo >= 5, JSON.stringify([s.game.greats, s.game.combo]));
  const played = await bot;
  fs.writeFileSync(path.join(artifactDir, 'tvrh_playback.json'), JSON.stringify(played, null, 2) + '\n');
  assertPlayback(played, false);
  const crowd = await page.evaluate(() => window.__rhythmQA.sfx.filter(n => ['crowd_cheer', 'crowd_cheer_2', 'crowd_roar', 'crowd_roar_2', 'applause', 'applause_2'].includes(n)));
  check('crowd cheering preserved', crowd.length > 0, JSON.stringify(crowd));
  const moved = await until(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'moved', 8000);
  await page.waitForTimeout(600); await shot('tvrh_03_moved');
  s = await state(); check('under three misses moves Youngcle emotionally', !!moved && s.text.includes('감동') && s.game.misses < 3, JSON.stringify([s.text, s.game.misses]));
  const cried = await until(() => window.game.battle.gimmick?.snapshot?.game?.cried, 8000);
  await page.waitForTimeout(160); await shot('tvrh_04_cry');
  s = await state(); check('cry burst deals exactly 10 enemy damage', !!cried && s.ycHp === hp0 - 10, `hp ${hp0} -> ${s.ycHp}`);
  check('returns to battle menu', !!await until(() => window.game.battle.state === 'menu', 15000));
  check('melody sources ended on return and original BGM continues', await page.evaluate(() => {
    const q = window.__rhythmQA;
    return window.game.sound.bgm === q.bgm && !q.bgm.paused && q.starts.filter(n => n.bufferDuration > 60).every(n => n.ended);
  }));
  await shot('tvrh_05_back');
  if (process.env.QA_CAPTURE_AUDIO === '1') {
    const recording = await page.evaluate(async () => window.__rhythmQA.stopRecording ? window.__rhythmQA.stopRecording() : { error: window.__rhythmQA.recordingError });
    check('optional mixed recording produced audio artifact', !!recording.base64, recording.error || recording.mimeType);
    if (recording.base64) {
      const file = path.join(artifactDir, 'tvrh_mixed_audio.webm');
      fs.writeFileSync(file, Buffer.from(recording.base64, 'base64'));
      console.log(`AUDIO ARTIFACT ${file} — actual BGM capture + WebAudio master, unreviewed by human`);
    }
  }

  await prepare(true);
  if (!await until(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'play', 6000)) throw new Error('near-loop play unavailable');
  const beforeMisses = await state();
  console.log('AUTO-INPUT near-loop: deliberately skip first three notes for MISS damage and sour return; remaining notes use synthetic keys.');
  const loopPlay = await autoPlay(3);
  fs.writeFileSync(path.join(artifactDir, 'tvrh_loop_playback.json'), JSON.stringify(loopPlay, null, 2) + '\n');
  assertPlayback(loopPlay, true);
  const afterMisses = await state();
  check('three omitted notes cause three MISS and 45 total party damage', loopPlay.final?.misses === 3 && beforeMisses.members.reduce((a, b) => a + b, 0) - afterMisses.members.reduce((a, b) => a + b, 0) === 45, JSON.stringify([loopPlay.final?.misses, beforeMisses.members, afterMisses.members]));
  check('three misses choose sour outcome', !!await until(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'sour', 8000));
  await page.waitForTimeout(600);
  await shot('tvrh_06_loop_sour');
  s = await state(); check('sour outcome does not cry or damage enemy', !s.game.cried && s.ycHp === beforeMisses.ycHp && s.text.includes('시큰둥'));
  check('near-loop MISS path returns to battle menu', !!await until(() => window.game.battle.state === 'menu', 15000));
  check('near-loop melody sources ended and BGM continues after return', await page.evaluate(() => {
    const q = window.__rhythmQA;
    return window.game.sound.bgm === q.bgm && !q.bgm.paused && q.starts.filter(n => n.bufferDuration > 60).every(n => n.ended);
  }));
  await shot('tvrh_07_loop_back');

  const reference = await page.evaluate(async () => {
    const response = await fetch('/assets/source/tvtime-rhythm/reference-lead.json');
    if (!response.ok) throw new Error(`Independent score fixture unavailable: ${response.status}`);
    return response.json();
  });
  await prepare(false, reference);
  if (!await until(() => window.game.battle.gimmick?.snapshot?.game?.phase === 'play', 6000)) throw new Error('reference play unavailable');
  check('reference phrase entered while source clock is paused', await page.evaluate(() => window.game.sound.bgm.paused));
  const referenceStart = await state();
  check('center phrase contains all independently scored melody heads', referenceStart.game.notes === reference.notes.length,
    `center=${referenceStart.game.notes}, score=${reference.notes.length}`);
  await fixture('resume-reference-phrase', 'Resume the unchanged BGM; all following note inputs are timed from the frozen score fixture, never snapshot.next.', async () => {
    await window.game.sound.bgm.play();
  });
  await startRecording();
  const referenceBot = autoPlay(0, reference);
  await page.waitForTimeout(5000); await shot('tvrh_08_reference_play');
  const referencePlay = await referenceBot;
  fs.writeFileSync(path.join(artifactDir, 'tvrh_reference_playback.json'), JSON.stringify(referencePlay, null, 2) + '\n');
  check('independent score inputs hit every center melody note without misses', referencePlay.pressed === reference.notes.length &&
    referencePlay.final?.greats === reference.notes.length && referencePlay.final.misses === 0,
    JSON.stringify({ pressed: referencePlay.pressed, greats: referencePlay.final?.greats, misses: referencePlay.final?.misses }));
  check('center upcoming note pitch and lane agree with independent score', referencePlay.referenceChecks.length === reference.notes.length &&
    referencePlay.referenceChecks.every(n => n.actualPitch === n.pitch && n.actualLane === n.lane && Math.abs(n.actual - n.expected) <= 0.04));
  const { RECEPTOR_Y, LANE_TOP, approach } = await page.evaluate(async () => {
    const stage = await import('/src/scenes/rhythm-stage.js');
    const { RHYTHM } = await import('/src/scenes/rhythm-core.js');
    return { RECEPTOR_Y: stage.RECEPTOR_Y, LANE_TOP: stage.LANE_TOP, approach: RHYTHM.approach };
  });
  const arrivals = reference.notes.map(note => {
    const draws = referencePlay.draws.filter(d => d.lane === note.lane && d.raw >= note.t - 0.3 && d.raw <= note.t - 0.06);
    return Math.min(...draws.map(d => Math.abs(d.raw + (RECEPTOR_Y - d.y) * approach / (RECEPTOR_Y - LANE_TOP) - note.t)));
  });
  check('actual center-pad drawing arrives on the score attacks within 40ms', arrivals.every(error => error <= 0.04),
    `max=${Math.max(...arrivals).toFixed(4)}s`);
  check('score-driven phrase returns to the battle menu', !!await until(() => window.game.battle.state === 'menu', 15000));
  await shot('tvrh_09_reference_back');
  if (process.env.QA_CAPTURE_AUDIO === '1') {
    const recording = await page.evaluate(async () => window.__rhythmQA.stopRecording ? window.__rhythmQA.stopRecording() : { error: window.__rhythmQA.recordingError });
    check('independent phrase audio recording exists', !!recording.base64, recording.error || '');
    if (recording.base64) fs.writeFileSync(path.join(artifactDir, 'tvrh_reference_audio.webm'), Buffer.from(recording.base64, 'base64'));
  }
});
