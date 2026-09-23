import { runScenario } from './lib/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

await runScenario({ name: 'choimis-finale' }, async ({ page, open, until, press, shot, check, fixture }) => {
  const captureOnly = process.env.QA_FINAL_CAPTURE === '1';
  const build301 = process.env.QA_301_FINAL === '1';
  const build303 = process.env.QA_303_FINAL === '1';
  const naturalEntry = build301 || build303;
  if (build301 && build303) throw new Error('Choose QA_301_FINAL or QA_303_FINAL; their assault scopes differ.');
  if (captureOnly && process.env.QA_FINAL_LOSS === '1') throw new Error('Capture preparation cannot be combined with the loss scope.');
  const evidence = { sources: [], captures: [], limitations: 'Direct QA battle; opening skipped and boss HP prepared at 1 before a real party action. No combat HP, clock, outcome, invulnerability or input-state mutation. Survival uses physical ArrowUp/ArrowDown/C and snapshot-guided automated movement; this does not measure human difficulty. Audio state is observed, not human listening.' };
  if (captureOnly) evidence.limitations = 'Targeted current-palette capture only. Disclosed synthetic-update phase fixture advances the previously verified assault to its cinematic ending using simulated directional controls. This is NOT a fresh real-time sixty-second survival test. No HP, invulnerability or completion field is assigned. After the fixture, defeat dialogue uses physical C; charge and finisher run for their real duration with no further C. The original full scope remains the real-time assault proof.';
  if (build301) evidence.limitations = 'BUILD301 natural sky entry, disclosed bossHP1/skip-opening preparation, actual physical aiming/shooting until27 contacts and all three balloons. A subsequent disclosed normal-update phase fixture skips only remaining assault wall time. This is not renewed60s survival proof. The4s charge, contact impact, common victory/C and rescue boundary remain real-time and unforced.';
  if (build303) evidence.limitations = `BUILD303 QA sky shortcut followed by physical walking/dialogue into battle; disclosed boss HP1/skip-opening preparation before a real party action. ${captureOnly ? 'Explicit capture option skips assault wall time with normal updates; this is not sixty-second survival or real-time assault bubble/audio proof.' : 'Actual sixty-second assault uses physical ArrowUp/ArrowDown/C with snapshot-guided movement; this does not measure human difficulty.'} Entry audio, transformation, GAP dialogue, bursts, defeat dialogue, four-second charge and finisher run in real time. Physical victory C reaches rescue. Audio element and decoded voice-buffer observations are not human listening.`;
  evidence.scope = { build301, build303, captureOnly, lossOnly: process.env.QA_FINAL_LOSS === '1' };
  if (evidence.scope.lossOnly) evidence.limitations = 'Loss/retry scope only: disclosed boss HP1, party HP1 and skipped opening, followed by real attack input and actual final hazards. No survival, finisher, victory or rescue completion claim. Physical C must retry to a clean normal battle.';
  const out = path.join(process.env.SHOT_DIR, 'finale-evidence.json');
  const save = () => fs.writeFileSync(out, JSON.stringify(evidence, null, 2) + '\n');
  const sources = ['tests/playtest/choimis-finale.mjs', 'src/battle/battle.js', 'src/battle/modes.js', 'src/battle/modes/choimis-finale.js', 'src/battle/choimis-finale-render.js', 'src/battle/choimis-final-assault.js', 'src/battle/choimis-final-assault-render.js', 'src/data/choimis-finale.js', 'src/data/choimis-final-assault.js', 'src/data/enemies.js', 'src/data/build.js'];
  if (naturalEntry) sources.push('src/main.js', 'src/data/cutscenes/choimis_sky.js', 'src/data/cutscenes/choimis_rescue.js', 'src/scenes/choimis-rescue.js', 'src/scenes/choimis-rescue-render.js', 'assets/enemies/choimis-flower-idle.png', 'assets/enemies/choimis-flower-raise.png', 'assets/enemies/choimis-choso.png');
  sources.push('src/core/audio.js', 'src/battle/support/talk.js', 'src/ui/bubble.js', 'src/ui/font.js', 'src/battle/modes/choimis-pink-shooter.js', 'assets/audio/sfx/choimis_lend_power.mp3', 'assets/audio/sfx/deltarune_release_shoot.mp3', 'assets/audio/sfx/yellowheart_charge.mp3', 'assets/audio/sfx/yellowheart_shot_big.mp3', 'assets/audio/sfx/furnace_blast.mp3', 'assets/audio/sfx/choimis_piercing_blood.mp3', 'assets/audio/voices/choimis_flower.mp3');
  const binding = async when => {
    for (const relative of sources) {
      const response = await page.request.get(new URL(relative, process.env.QA_BASE_URL).href);
      const hash = bytes => createHash('sha256').update(bytes).digest('hex');
      const local = hash(fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, relative))), served = hash(await response.body());
      evidence.sources.push({ when, relative, local, served });
      check(`${when}: served source matches ${relative}`, response.ok() && local === served);
    }
    save();
  };
  sources.push('assets/enemies/choimis-cape-swing.png', 'assets/audio/sfx/choimis_chosouya.mp3');
  await binding('before');
  await page.setViewportSize({ width: 1280, height: 800 });
  await open({ qa: naturalEntry ? 'choimis_sky' : 'choimis_eating' });
  if (naturalEntry) {
    await until(() => window.game?.mapId === 'jjajang_night_cliff' && !game.transitioning, 30000);
    await page.keyboard.down('ArrowRight');
    check('natural sky script starts from real walking', await until(() => game.dialogue.running, 30000));
    await page.keyboard.up('ArrowRight');
    const deadline = Date.now() + 65000;
    while (Date.now() < deadline && !await page.evaluate(() => !!game.battle)) {
      if (await page.evaluate(() => game.textbox.isOpen)) await press('KeyC', { delay: 55 });
      await page.waitForTimeout(140);
    }
  }
  check('direct QA battle enters intro', await until(() => window.game?.battle?.state === 'intro', 30000));
  await fixture('lethal-action-boundary', 'Skip already-covered opening, preserve existing legitimate party stats, prepare boss HP 1 and defense boost before the real three-party attack queue. Loss-only scope additionally prepares party HP 1 before any fight; actual hazards must cause defeat. Observe Game.draw only after its full original draw returns.', lossOnly => {
    const b = game.battle;
    b.openingShown = true; b.enemies[0].defenseBoosted = true; b.enemies[0].hp = 1;
    if (lossOnly) b.members.forEach(member => { member.hp = 1; });
    const q = window.__finalQa = { frames: {}, phases: [], samples: [], texts: [], audio: [], voices: [], talkVoices: [], talkTyping: [], bubbleDraws: [], beamDraws: [], confirms: [], initialMoney: game.money, initialParty: b.members.map(m => ({ id: m.id, hp: m.hp, maxHp: m.maxHp })), canvas: [game.canvas.width, game.canvas.height] };
    const draw = game.draw.bind(game), sound = game.sound.sfx.bind(game.sound), stopBgm = game.sound.stopBgm.bind(game.sound);
    const tracked = [], watched = new Set(['choimis_lend_power', 'deltarune_release_shoot', 'yellowheart_charge', 'yellowheart_shot_big', 'furnace_blast', 'choimis_piercing_blood', 'choimis_chosouya']);
    const audioSample = (entry, handle, event) => entry.samples.push({ event, at: performance.now(), phase: b.gimmick?.snapshot?.phase, paused: handle.paused, time: handle.currentTime, duration: Number.isFinite(handle.duration) ? handle.duration : null, ended: handle.ended, readyState: handle.readyState, rate: handle.playbackRate, volume: handle.volume, muted: handle.muted, src: handle.currentSrc || handle.src, error: handle.error?.code ?? null });
    game.sound.sfx = (name, options) => {
      const result = sound(name, options), entry = { type: 'sfx', name, options, at: performance.now(), phase: b.gimmick?.snapshot?.phase, text: b.text, htmlAudio: result instanceof HTMLAudioElement, samples: [] }; q.audio.push(entry);
      if (watched.has(name) && result instanceof HTMLAudioElement) {
        const record = { entry, handle: result, active: true };
        tracked.push(record); audioSample(entry, result, 'created');
        for (const event of ['loadedmetadata', 'playing', 'ended', 'error']) result.addEventListener(event, () => audioSample(entry, result, event));
        const pause = result.pause.bind(result);
        result.pause = (...args) => { audioSample(entry, result, 'before-pause'); record.active = false; return pause(...args); };
      }
      return result;
    };
    const blip = game.sound.blip.bind(game.sound);
    game.sound.blip = (voice, ...args) => {
      const before = game.sound._lastBlip, result = blip(voice, ...args), s = b.gimmick?.snapshot;
      if (s?.phase.endsWith('talk')) q.talkVoices.push({ voice, text: b.text, phase: s.phase, decoded: !!game.sound.voiceBuf[voice], startedBuffer: game.sound._lastBlip !== before && game.sound._lastBlip?.voice === voice });
      if (s?.phase === 'assault' && s.assault.bubble) q.voices.push({ at: performance.now(), voice, text: s.assault.bubble.text, kind: s.assault.bubble.kind, decoded: !!game.sound.voiceBuf[voice], context: game.sound.ctx?.state, contextTime: game.sound.ctx?.currentTime, startedBuffer: game.sound._lastBlip !== before && game.sound._lastBlip?.voice === voice, muted: game.sound.muted });
      return result;
    };
    const ctx = game.canvas.getContext('2d'), fillText = ctx.fillText.bind(ctx);
    let inDraw = false, renderState = null, bubbleDraws = [], beamDraws = [];
    ctx.fillText = (text, ...args) => {
      const bubble = renderState?.assault?.bubble;
      if (inDraw && bubble && text && text === bubble.text.slice(0, bubble.shown)) bubbleDraws.push({ text, fullText: bubble.text, kind: bubble.kind, font: ctx.font, fontLoaded: document.fonts.check(ctx.font), x: args[0], y: args[1] });
      return fillText(text, ...args);
    };
    const fillRect = ctx.fillRect.bind(ctx);
    ctx.fillRect = (x, y, width, height) => {
      const s = renderState;
      if (inDraw && ['impact', 'beam-fade'].includes(s?.phase) && ctx.fillStyle === '#ff67bd') {
        const transform = ctx.getTransform(), endX = transform.a * (x + width) + transform.c * y + transform.e;
        beamDraws.push({ phase: s.phase, phaseTime: s.phaseTime, endX, width, height, alpha: ctx.globalAlpha });
      }
      return fillRect(x, y, width, height);
    };
    game.sound.stopBgm = (...args) => { q.audio.push({ type: 'stop-bgm', at: performance.now(), phase: b.gimmick?.snapshot?.phase }); return stopBgm(...args); };
    game.draw = (...args) => {
      bubbleDraws = []; beamDraws = []; renderState = b.gimmick?.snapshot; inDraw = true;
      let result;
      try { result = draw(...args); } finally { inDraw = false; }
      const s = b.gimmick?.snapshot;
      if (b.activeEnemyMode !== 'choimis_finale' || !s) return result;
      const now = performance.now();
      if (s.phase.endsWith('talk') && (!q.talkTyping.length || now - q.talkTyping.at(-1).at > 100)) q.talkTyping.push({ at: now, phase: s.phase, text: b.text, shown: b.shown, typed: b.typed, voice: b.voice });
      const changed = q.phases.at(-1)?.phase !== s.phase;
      if (changed) q.phases.push({ phase: s.phase, at: now, time: s.phaseTime, charge: s.chargeProgress });
      for (const { entry, handle, active } of tracked) if (active && (changed || now - entry.samples.at(-1).at >= 100)) audioSample(entry, handle, changed ? 'phase-change' : 'draw');
      for (const record of bubbleDraws) if (record.text === record.fullText && !q.bubbleDraws.some(previous => previous.fullText === record.fullText)) q.bubbleDraws.push({ at: now, phase: s.phase, ...record });
      if (beamDraws.length && (!q.beamDraws.length || now - q.beamDraws.at(-1).at >= 100)) q.beamDraws.push(...beamDraws.map(record => ({ at: now, ...record })));
      if (b.text && q.texts.at(-1)?.text !== b.text) q.texts.push({ phase: s.phase, text: b.text, at: now });
      if (changed || !q.samples.length || now - q.samples.at(-1).at > 100) q.samples.push({ at: now, phase: s.phase, phaseTime: s.phaseTime, charge: s.chargeProgress, transitionWhite: s.transitionWhite, finalWhite: s.finalWhite, beamReach: s.beamReach, beamWidth: s.beamWidth, impactTime: s.impactTime, impactFlash: s.impactFlash, assault: s.assault ? { elapsed: s.assault.elapsed, stage: s.assault.stage, heart: s.assault.heart, contacts: s.assault.contacts, bubblesShown: s.assault.bubblesShown, chatterShown: s.assault.chatterShown, bubble: s.assault.bubble, destroyed: s.assault.destroyed, spawned: s.assault.spawned, shots: s.assault.shots.length, hazards: s.assault.hazards.length } : null, boss: s.boss, normal: s.normal, party: b.members.map(m => ({ hp: m.hp, maxHp: m.maxHp, down: m.down })) });
      const capture = label => { if (!q.frames[label]) q.frames[label] = { at: now, phase: s.phase, phaseTime: s.phaseTime, charge: s.chargeProgress, data: game.canvas.toDataURL('image/png') }; };
      if (s.phase.endsWith('talk') && b.typed) capture(`${s.phase}-${q.texts.length}`);
      if (!s.phase.endsWith('talk') && s.phase !== 'assault' && s.phaseTime >= (['flash', 'impact'].includes(s.phase) ? 0 : 0.12)) capture(s.phase);
      if (s.phase === 'autocharge') { if (s.phaseTime < 0.06) capture('charge-zero'); if (s.phaseTime >= 2) capture('charge-half'); if (s.phaseTime >= 3.8) capture('charge-full'); }
      if (s.phase === 'shot' && s.phaseTime >= 0.35) capture('beam-large');
      if (s.phase === 'impact' && s.phaseTime >= 0.5) capture('impact-slow-recoil');
      if (s.phase === 'impact' && s.beamReach === 1) capture('beam-off-right');
      if (s.phase === 'beam-fade' && s.phaseTime >= 0.7) capture('beam-fade-half');
      if (s.phase === 'beam-fade' && s.phaseTime >= 1.25) capture('beam-fade-tail');
      if (s.phase === 'flash' && s.phaseTime >= 0.68) capture('final-white-full');
      if (s.phase === 'flash' && s.finalWhite >= 0.9 && q.samples.at(-1).finalWhite < 0.9) q.samples.push({ at: now, phase: s.phase, phaseTime: s.phaseTime, finalWhite: s.finalWhite, transitionWhite: s.transitionWhite });
      if (s.phase === 'transform-white' && s.transitionWhite === 1) capture('transform-white-full');
      if (s.phase === 'reveal' && s.phaseTime >= 0.9) capture('reveal-clear');
      if (s.phase === 'fall' && s.phaseTime >= 0.8) capture('normal-fall');
      if (s.phase === 'gather' && s.phaseTime >= 2.7) capture('petals-huge');
      if (s.phase === 'assault') for (const threshold of [0.3, 16, 31, 46, 59]) if (s.assault.elapsed >= threshold) capture(`assault-${threshold}`);
      if (s.phase === 'assault' && s.assault.boss.pose) {
        const pose = s.assault.boss.pose;
        capture(`pose-${pose.sheet}-${pose.frame}`);
        q.samples.at(-1).assault.boss = s.assault.boss;
      }
      if (s.phase === 'assault' && s.assault.bubble && s.assault.bubble.shown === s.assault.bubble.text.length) capture(s.assault.bubble.kind === 'chatter' ? `chatter-${s.assault.chatterShown}` : `resolve-${s.assault.bubblesShown}`);
      return result;
    };
  }, process.env.QA_FINAL_LOSS === '1');
  for (let i = 0; i < 25 && !await page.evaluate(() => game.battle.state === 'menu'); i++) { await press('KeyC', { delay: 60 }); await page.waitForTimeout(180); }
  check('real intro input reaches party menu', await until(() => game.battle?.state === 'menu', 4000));
  for (let member = 0; member < 3; member++) {
    await press('KeyC', { delay: 60 });
    if (!await until(() => game.battle.state === 'target', 3000)) throw new Error('party target menu missing');
    await press('KeyC', { delay: 60 });
    if (member < 2 && !await until(() => game.battle.state === 'menu', 3000)) throw new Error('next party menu missing');
  }
  check('actual lethal action starts finale with boss still HP 1', await until(() => game.battle?.activeEnemyMode === 'choimis_finale' && game.battle.enemies[0].hp === 1, 8000));
  const advanceTalk = async phase => {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline && await page.evaluate(p => game.battle.gimmick?.snapshot?.phase === p, phase)) {
      if (await page.evaluate(() => game.battle.text === '* 마지막 모두의 힘을 합쳐.' && !game.battle.typed)) { await page.waitForTimeout(120); continue; }
      await page.evaluate(() => { const q = window.__finalQa; q.confirms.push({ at: performance.now(), phase: game.battle.gimmick.snapshot.phase, text: game.battle.text, lend: q.audio.find(a => a.name === 'choimis_lend_power')?.samples.at(-1) }); });
      await press('KeyC', { delay: 60 }); await page.waitForTimeout(230);
    }
    check(`${phase} completes through bounded physical C input`, await page.evaluate(p => game.battle.gimmick?.snapshot?.phase !== p, phase));
  };
  await advanceTalk('intro-talk');
  check('raise, gather and white reveal reach GAP announcement', await until(() => game.battle?.gimmick?.snapshot?.phase === 'gap-talk', 11000));
  await page.waitForTimeout(900);
  check('GAP announcement precedes any assault projectiles or elapsed time', await page.evaluate(() => { const s = game.battle.gimmick?.snapshot; return s?.phase === 'gap-talk' && s.assault.elapsed === 0 && s.assault.shots.length === 0 && s.assault.hazards.length === 0; }));
  await advanceTalk('gap-talk');
  check('GAP confirm enters real full-screen assault', await until(() => game.battle?.gimmick?.snapshot?.phase === 'assault', 3000));
  if (process.env.QA_FINAL_LOSS === '1') {
    check('actual final hazards defeat the low-HP fixture', await until(() => game.battle?.state === 'lose', 20000));
    const loss = await page.evaluate(() => ({ mode: game.battle.activeEnemyMode, gimmick: !!game.battle.gimmick, board: game.battle.board.rect, party: game.battle.members.map(m => ({ hp: m.hp, down: m.down })) }));
    check('loss disposes final mode and removes full-screen gimmick', !loss.mode && !loss.gimmick && loss.party.every(m => m.down), JSON.stringify(loss));
    await shot('finale-loss');
    await page.waitForTimeout(2300); await press('KeyC', { delay: 65 });
    check('C retries the lost battle', await until(() => game.battle?.state === 'retry', 3000));
    check('retry reaches clean normal intro', await until(() => game.battle?.state === 'intro', 8000));
    check('retry clears finale gate and restores full boss HP', await page.evaluate(() => { const b = game.battle, e = b.enemies[0]; return !b.gimmick && !b.activeEnemyMode && !e.finaleStarted && !e.finalePending && e.hp === e.maxHp; }));
    await shot('finale-retry-intro'); await binding('after'); return;
  }
  if (captureOnly) evidence.phaseFixture = await fixture('palette-capture-phase-preparation', 'Capture-only fixture: synchronously advance the already-verified assault with normal mode updates and simulated corridor-following directions, stopping at bursts. This deliberately skips wall-clock survival and is never evidence of real sixty-second play. Cinematic charge timing afterward remains real-time.', () => {
    const mode = game.battle.gimmick;
    let steps = 0;
    while (mode.snapshot.phase === 'assault' && steps++ < 3700) {
      const s = mode.snapshot.assault, delta = s.safeY - s.heart.y;
      mode.update(1 / 60, { down: key => key === 'down' ? delta > 1 : key === 'up' && delta < -1, just: () => false });
    }
    return { steps, phase: mode.snapshot.phase, phaseTime: mode.snapshot.phaseTime, party: game.battle.members.map(m => m.hp) };
  });
  if (captureOnly) check('capture preparation stops exactly at burst entry before advancing its audio phase', evidence.phaseFixture.phase === 'bursts' && evidence.phaseFixture.phaseTime === 0, JSON.stringify(evidence.phaseFixture));
  let held = null, shots = 0;
  const wallStart = Date.now();
  while (Date.now() - wallStart < 85000) {
    const state = await page.evaluate(() => ({ state: game.battle.state, s: game.battle.gimmick?.snapshot }));
    if (state.s?.phase !== 'assault') break;
    if (build301 && state.s.assault.contacts >= 27 && state.s.assault.bubblesShown === 3 && state.s.assault.bubble?.shown === state.s.assault.bubble?.text.length) break;
    let targetY = state.s.assault.safeY;
    if (build301) {
      const s = state.s.assault, center = s.box.y + s.box.h / 2, flight = (s.boss.x - s.heart.x - 11) / 410;
      let travel = 0;
      for (let i = 0; i < 3; i++) { targetY = center + 76 * Math.sin((s.elapsed + flight + travel) * 0.63); travel = Math.abs(targetY - s.heart.y) / 126; }
    }
    const delta = targetY - state.s.assault.heart.y;
    const key = Math.abs(delta) < 2 ? null : delta > 0 ? 'ArrowDown' : 'ArrowUp';
    if (held && held !== key) await page.keyboard.up(held);
    if (key && held !== key) await page.keyboard.down(key);
    held = key;
    if (shots++ % 5 === 0 && (!build301 || Math.abs(delta) < 10)) await press('KeyC', { delay: 20 });
    await page.waitForTimeout(70);
  }
  if (held) await page.keyboard.up(held);
  evidence.survivalWallMs = Date.now() - wallStart;
  if (build301) {
    evidence.actualHitBoundary = await page.evaluate(() => game.battle.gimmick?.snapshot?.assault);
    check('real projectiles reach27 contacts before phase preparation', evidence.actualHitBoundary?.contacts >= 27 && evidence.actualHitBoundary?.bubblesShown === 3, JSON.stringify({ contacts: evidence.actualHitBoundary?.contacts, bubbles: evidence.actualHitBoundary?.bubblesShown }));
    await fixture('301-remaining-assault-phase-preparation', 'Only after27 real contacts, synchronously advance the unchanged remaining assault with normal directional updates. This skips wall time, not health or result fields, and is not a sixty-second survival claim.', () => {
      const mode = game.battle.gimmick;
      for (let i = 0; mode?.snapshot.phase === 'assault' && i < 3700; i++) {
        const s = mode.snapshot.assault, delta = s.safeY - s.heart.y;
        mode.update(1 / 60, { down: key => key === 'down' ? delta > 1 : key === 'up' && delta < -1, just: () => false });
      }
    });
  }
  check(captureOnly || build301 ? 'disclosed capture preparation reaches real defeat dialogue' : 'real sixty-second assault survives into defeat dialogue', await until(() => game.battle?.gimmick?.snapshot?.phase === 'death-talk', 4000));
  await advanceTalk('death-talk');
  check('automatic finisher completes without any further confirm input', await until(() => !game.battle || game.battle.state === 'win', 17000));
  const q = await page.evaluate(() => window.__finalQa);
  for (const [label, frame] of Object.entries(q.frames)) {
    const file = path.join(process.env.SHOT_DIR, `${label}.png`);
    fs.writeFileSync(file, Buffer.from(frame.data.split(',')[1], 'base64'));
    evidence.captures.push({ label, file, ...frame, data: undefined });
  }
  evidence.observed = { ...q, frames: undefined }; save();
  const phases = q.phases.map(p => p.phase), phase = name => q.phases.find(p => p.phase === name);
  check('all requested finale phases occur in order', ['intro-talk', 'raise', 'gather', 'transform-white', 'reveal', 'gap-talk', 'assault', 'bursts', 'death-talk', 'autocharge', 'shot', 'impact', 'beam-fade', 'flash', 'smoke', 'revert', 'fall'].every((p, i) => phases[i] === p), JSON.stringify(phases));
  check('intro preserves four original lines and appends the requested unite line', JSON.stringify(q.texts.filter(t => t.phase === 'intro-talk').map(t => t.text)) === JSON.stringify(['* 큭.. 형들 대단하시네요', '* 여기까지 온건 칭찬해드리겠습니다.', '* 그렇지만, 전 포기할 수 없어요.', '* 마지막 그녀를 위한 이 힘을 바칠거에요!!', '* 마지막 모두의 힘을 합쳐.']));
  check('GAP announcement is exact and occurs before assault', JSON.stringify(q.texts.filter(t => t.phase === 'gap-talk').map(t => t.text)) === JSON.stringify(['* 마지막 피날래 GAP 모드!!!']) && phase('gap-talk')?.at < phase('assault')?.at);
  check('BGM stops before three defeat lines', q.audio.some(a => a.type === 'stop-bgm' && a.phase === 'death-talk') && q.texts.filter(t => t.phase === 'death-talk').length === 3);
  check('all three defeat lines remain exact', JSON.stringify(q.texts.filter(t => t.phase === 'death-talk').map(t => t.text)) === JSON.stringify(['* 아..', '* 난... 이렇게....', '* 점례...야....']));
  if (!captureOnly && !build301) check('assault real wall duration reaches sixty seconds', phase('bursts')?.at - phase('assault')?.at >= 59500, String(phase('bursts')?.at - phase('assault')?.at));
  check('automatic charge starts at zero and lasts four real seconds', phase('autocharge')?.charge <= 0.015 && phase('shot')?.at - phase('autocharge')?.at >= 3950 && phase('shot')?.at - phase('autocharge')?.at < 4700, JSON.stringify({ start: phase('autocharge'), duration: phase('shot')?.at - phase('autocharge')?.at }));
  const criticalFrames = ['petals-huge', 'transform-white-full', 'reveal-clear', 'charge-zero', 'charge-half', 'charge-full', 'beam-large', 'impact', 'beam-off-right', 'beam-fade-half', 'beam-fade-tail', 'final-white-full', 'flash', 'smoke', 'revert', 'normal-fall'];
  if (!captureOnly && !build301) criticalFrames.push('assault-0.3', 'assault-31', 'assault-59');
  if (build301) criticalFrames.push('resolve-1', 'resolve-2', 'resolve-3', 'impact-slow-recoil');
  check('full Game.draw captures all critical stages at 960x720', q.canvas[0] === 960 && q.canvas[1] === 720 && criticalFrames.every(p => q.frames[p]), JSON.stringify(Object.keys(q.frames)));
  if (!captureOnly) check('real directional and C inputs move and fire during survival', q.samples.some(s => s.assault?.shots > 0) && Math.max(...q.samples.map(s => s.assault?.heart.y || 0)) - Math.min(...q.samples.filter(s => s.assault).map(s => s.assault.heart.y)) > 120);
  if (build303) {
    const lendTyping = q.talkTyping.filter(s => s.text === '* 마지막 모두의 힘을 합쳐.');
    check('unite line types naturally with explicit none and zero voicefont calls', lendTyping.some(s => !s.typed) && lendTyping.some(s => s.typed) && lendTyping.every(s => s.voice === 'none') && !q.talkVoices.some(s => s.text === '* 마지막 모두의 힘을 합쳐.'), JSON.stringify(lendTyping));
    check('normal GAP voicefont resumes after clip-only unite line', q.talkVoices.some(s => s.phase === 'gap-talk' && s.voice === 'choimis_flower' && s.decoded && s.startedBuffer), JSON.stringify(q.talkVoices.filter(s => s.phase === 'gap-talk')));
    const cue = name => q.audio.filter(a => a.type === 'sfx' && a.name === name);
    const advancing = entry => {
      const samples = entry?.samples.filter(s => s.readyState >= 2 && !s.paused && !s.muted && s.volume > 0 && !s.error && s.time > 0) || [];
      return entry?.htmlAudio && samples.some((sample, index) => samples.slice(0, index).some(before => sample.time - before.time > 0.15));
    };
    const lend = cue('choimis_lend_power')[0], release = cue('deltarune_release_shoot')[0];
    for (const [name, entry, expectedDuration, stopPhase] of [['choimis_lend_power', lend, 5.067755, 'raise'], ['deltarune_release_shoot', release, 1.772018, 'death-talk']]) {
      const ended = entry?.samples.find(s => s.event === 'ended'), stop = entry?.samples.find(s => s.event === 'before-pause');
      check(`${name}: actual HTML audio loads and advances`, advancing(entry) && entry.samples.some(s => new URL(s.src, process.env.QA_BASE_URL).pathname.endsWith(`/assets/audio/sfx/${name}.mp3`) && Math.abs(s.duration - expectedDuration) < 0.08), JSON.stringify(entry));
      check(`${name}: full clip ends before phase cleanup`, !!ended && !!stop && ended.at <= stop.at && stop.ended && Math.abs(stop.time - stop.duration) < 0.08 && stop.phase === stopPhase, JSON.stringify({ ended, stop }));
    }
    check('exact Flowery and release-shoot bytes match accepted sources', evidence.sources.some(s => s.relative === 'assets/audio/sfx/choimis_lend_power.mp3' && s.local === '9a65f94b84affff2876f73e3eefda88bbedf55dddcdb0151a5bfb78a7cadb06e') && evidence.sources.some(s => s.relative === 'assets/audio/sfx/deltarune_release_shoot.mp3' && s.local === '80c13090ee58ce60ecf43c36d314cd5796ce6e7f8b76e23cad33e143a64df571'));
    const guarded = q.confirms.filter(c => c.phase === 'intro-talk' && c.text === '* 마지막 모두의 힘을 합쳐.' && c.lend?.time > 0.3 && c.lend.time < 4.8 && !c.lend.ended && !c.lend.paused);
    check('repeated physical C cannot skip the full Flowery line', cue('choimis_lend_power').length === 1 && lend?.phase === 'intro-talk' && lend.text === '* 마지막 모두의 힘을 합쳐.' && guarded.length >= 3 && phase('raise')?.at - lend.at >= 5000, JSON.stringify({ confirms: guarded.length, elapsed: phase('raise')?.at - lend?.at }));
    check('end-assault release shoot is distinct from the later charged beam', cue('deltarune_release_shoot').length === 1 && release?.phase === 'bursts' && cue('yellowheart_shot_big').some(a => a.phase === 'shot' && advancing(a) && a.at > release.at + 5700) && !cue('deltarune_release_shoot').some(a => a.phase === 'shot'));
    check('four-second automatic charge and contact hit use loaded advancing clips', cue('yellowheart_charge').some(a => a.phase === 'autocharge' && advancing(a)) && cue('furnace_blast').some(a => a.phase === 'impact' && a.options.rate === 0.8 && advancing(a)));
    if (!captureOnly) check('final Choso actual fire uses the same approved0.44s source at0.85', cue('choimis_piercing_blood').some(a => a.phase === 'assault' && a.options.volume === 0.85 && advancing(a) && a.samples.some(s => Math.abs(s.duration - 0.44) < 0.01 && new URL(s.src, process.env.QA_BASE_URL).pathname.endsWith('/choimis_piercing_blood.mp3'))));
    for (const [start, next, seconds] of [['transform-white', 'reveal', 0.85], ['reveal', 'gap-talk', 1.1], ['bursts', 'death-talk', 1.8], ['shot', 'impact', 0.42], ['impact', 'beam-fade', 0.8], ['beam-fade', 'flash', 1.4], ['flash', 'smoke', 0.75]]) {
      const duration = phase(next)?.at - phase(start)?.at;
      check(`${start} lasts ${seconds}s in real time`, duration >= seconds * 1000 - 70 && duration <= seconds * 1000 + 600, String(duration));
    }
    check('drawn beam pierces beyond the right viewport and narrows before white exit', q.beamDraws.some(s => s.phase === 'impact' && s.endX > q.canvas[0]) && q.beamDraws.some(s => s.phase === 'beam-fade' && s.phaseTime > 1.2 && s.height <= 2 && s.alpha < 0.1 && s.endX > q.canvas[0]), JSON.stringify(q.beamDraws));
    check('white reveal and slower white exit are present in full Game.draw observations', q.samples.some(s => s.phase === 'transform-white' && s.transitionWhite === 1) && q.samples.some(s => s.phase === 'reveal' && s.transitionWhite < 0.15) && q.samples.some(s => s.phase === 'flash' && s.finalWhite > 0.85));
    if (!captureOnly) {
      const choso = cue('choimis_chosouya');
      check('three Choso transformations play their existing full clip without voicefont overlap', choso.length === 3 && choso.every(a => advancing(a) && a.samples.some(s => s.event === 'ended')) && !q.voices.some(v => v.text === '내 추구미는 쵸소우야'), JSON.stringify(choso));
      check('Choso speech balloon renders during actual final assault', q.bubbleDraws.some(b => b.fullText === '내 추구미는 쵸소우야' && b.fontLoaded));
      const bosses = q.samples.filter(s => s.assault?.boss).map(s => s.assault.boss);
      check('final boss moves laterally and shows all six cape-swing frames', Math.max(...bosses.map(b => b.x)) - Math.min(...bosses.map(b => b.x)) > 30 && [0,1,2,3,4,5].every(i => q.frames[`pose-capeSwing-${i}`]), JSON.stringify({ minX: Math.min(...bosses.map(b => b.x)), maxX: Math.max(...bosses.map(b => b.x)), frames: Object.keys(q.frames).filter(k => k.startsWith('pose-')) }));
      const chatter = ['형들, 아직 끝난 거 아니에요.', '모두의 힘이 느껴져요.', '마지막까지 버텨볼게요.'];
      check('three additional speech balloons render fully with the loaded game font', chatter.every(text => q.bubbleDraws.some(b => b.fullText === text && b.kind === 'chatter' && b.fontLoaded && b.font.includes('NeoDunggeunmo')) && q.frames[`chatter-${chatter.indexOf(text) + 1}`]), JSON.stringify(q.bubbleDraws));
      check('each additional balloon starts decoded Choimis voice buffers on a running audio clock', chatter.every(text => q.voices.some(v => v.text === text && v.voice === 'choimis_flower' && v.decoded && v.startedBuffer && !v.muted && v.context === 'running')) && Math.max(...q.voices.map(v => v.contextTime)) - Math.min(...q.voices.map(v => v.contextTime)) > 30, JSON.stringify(q.voices.filter(v => v.startedBuffer).slice(0, 10)));
    }
  }
  await shot('after-finale');
  if (build301) {
    const lines = [...new Set(q.samples.filter(s => s.assault?.bubble?.kind === 'resolve').map(s => s.assault.bubble.text))];
    check('actual6/15/27 contacts show the three requested resolve balloons', JSON.stringify(lines) === JSON.stringify(['아직이다.', '아직 쓰러질 수 없어.', '쓰읍 미스']), JSON.stringify(lines));
    check('heavy official hit begins at contact with slowed playback', q.audio.some(a => a.name === 'furnace_blast' && a.phase === 'impact' && a.options.rate === 0.8 && a.samples.some(s => s.time > 0 && !s.paused && s.rate === 0.8)));
  }
  if (naturalEntry) {
    const money = await page.evaluate(() => game.money);
    check('actual common victory awards fifteen million exactly once', money - q.initialMoney === 15000000, JSON.stringify({ before: q.initialMoney, after: money }));
    for (let i = 0; i < 12 && await page.evaluate(() => !!game.battle); i++) { await press('KeyC', { delay: 55 }); await page.waitForTimeout(300); }
    check('physical victory C reaches the first rescue line', await until(() => game.choimisRescue && game.textbox.node?.text?.includes('휴 드디어 잡았네요'), 10000));
    await page.waitForTimeout(1000);
    evidence.rescueBoundary = await page.evaluate(() => ({ fade: game.fade.alpha, money: game.money, text: game.textbox.node?.text, flag: game.flags.choimis_flower_won, battle: !!game.battle }));
    check('full final-mode victory clears black fade and does not award twice', evidence.rescueBoundary.fade === 0 && evidence.rescueBoundary.money === money && !evidence.rescueBoundary.battle, JSON.stringify(evidence.rescueBoundary));
    await shot(build303 ? '303-final-win-to-rescue' : '301-final-win-to-rescue'); save();
  }
  await binding('after');
  const changed = sources.filter(relative => evidence.sources.find(s => s.relative === relative && s.when === 'before').local !== evidence.sources.find(s => s.relative === relative && s.when === 'after').local);
  evidence.changedDuringRun = changed; save();
  check('bound battle sources remain unchanged during this execution', changed.length === 0, JSON.stringify(changed));
});
