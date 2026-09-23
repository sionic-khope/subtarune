import { runScenario } from './lib/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

await runScenario({ name: 'choimis-finale' }, async ({ page, open, until, press, shot, check, fixture }) => {
  const captureOnly = process.env.QA_FINAL_CAPTURE === '1';
  const build301 = process.env.QA_301_FINAL === '1';
  const evidence = { sources: [], captures: [], limitations: 'Direct QA battle; opening skipped and boss HP prepared at 1 before a real party action. No combat HP, clock, outcome, invulnerability or input-state mutation. Survival uses physical ArrowUp/ArrowDown/C and snapshot-guided automated movement; this does not measure human difficulty. Audio state is observed, not human listening.' };
  if (captureOnly) evidence.limitations = 'Targeted current-palette capture only. Disclosed synthetic-update phase fixture advances the previously verified assault to its cinematic ending using simulated directional controls. This is NOT a fresh real-time sixty-second survival test. No HP, invulnerability or completion field is assigned. After the fixture, defeat dialogue uses physical C; charge and finisher run for their real duration with no further C. The original full scope remains the real-time assault proof.';
  if (build301) evidence.limitations = 'BUILD301 natural sky entry, disclosed bossHP1/skip-opening preparation, actual physical aiming/shooting until27 contacts and all three balloons. A subsequent disclosed normal-update phase fixture skips only remaining assault wall time. This is not renewed60s survival proof. The4s charge, contact impact, common victory/C and rescue boundary remain real-time and unforced.';
  const out = path.join(process.env.SHOT_DIR, 'finale-evidence.json');
  const save = () => fs.writeFileSync(out, JSON.stringify(evidence, null, 2) + '\n');
  const sources = ['src/battle/battle.js', 'src/battle/modes.js', 'src/battle/modes/choimis-finale.js', 'src/battle/choimis-finale-render.js', 'src/battle/choimis-final-assault.js', 'src/battle/choimis-final-assault-render.js', 'src/data/choimis-finale.js', 'src/data/choimis-final-assault.js', 'src/data/enemies.js', 'src/data/build.js'];
  if (build301) sources.push('src/main.js', 'src/data/cutscenes/choimis_sky.js', 'src/data/cutscenes/choimis_rescue.js', 'src/scenes/choimis-rescue.js', 'src/scenes/choimis-rescue-render.js', 'assets/enemies/choimis-flower-idle.png', 'assets/enemies/choimis-flower-raise.png', 'assets/enemies/choimis-choso.png');
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
  await binding('before');
  await page.setViewportSize({ width: 1280, height: 800 });
  await open({ qa: build301 ? 'choimis_sky' : 'choimis_eating' });
  if (build301) {
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
    const q = window.__finalQa = { frames: {}, phases: [], samples: [], texts: [], audio: [], initialMoney: game.money, initialParty: b.members.map(m => ({ id: m.id, hp: m.hp, maxHp: m.maxHp })), canvas: [game.canvas.width, game.canvas.height] };
    const draw = game.draw.bind(game), sound = game.sound.sfx.bind(game.sound), stopBgm = game.sound.stopBgm.bind(game.sound);
    game.sound.sfx = (name, options) => {
      const result = sound(name, options), entry = { type: 'sfx', name, options, at: performance.now(), phase: b.gimmick?.snapshot?.phase, samples: [] }; q.audio.push(entry);
      if (name === 'furnace_blast') for (const delay of [80, 400, 1200, 2400]) setTimeout(() => entry.samples.push({ delay, paused: result?.paused, time: result?.currentTime, rate: result?.playbackRate, src: result?.currentSrc }), delay);
      return result;
    };
    game.sound.stopBgm = (...args) => { q.audio.push({ type: 'stop-bgm', at: performance.now(), phase: b.gimmick?.snapshot?.phase }); return stopBgm(...args); };
    game.draw = (...args) => {
      const result = draw(...args), s = b.gimmick?.snapshot;
      if (b.activeEnemyMode !== 'choimis_finale' || !s) return result;
      const now = performance.now();
      if (q.phases.at(-1)?.phase !== s.phase) q.phases.push({ phase: s.phase, at: now, time: s.phaseTime, charge: s.chargeProgress });
      if (b.text && q.texts.at(-1)?.text !== b.text) q.texts.push({ phase: s.phase, text: b.text, at: now });
      if (!q.samples.length || now - q.samples.at(-1).at > 100) q.samples.push({ at: now, phase: s.phase, phaseTime: s.phaseTime, charge: s.chargeProgress, impactTime: s.impactTime, impactFlash: s.impactFlash, assault: s.assault ? { elapsed: s.assault.elapsed, stage: s.assault.stage, heart: s.assault.heart, contacts: s.assault.contacts, bubblesShown: s.assault.bubblesShown, bubble: s.assault.bubble, destroyed: s.assault.destroyed, spawned: s.assault.spawned, shots: s.assault.shots.length, hazards: s.assault.hazards.length } : null, boss: s.boss, normal: s.normal, party: b.members.map(m => ({ hp: m.hp, maxHp: m.maxHp, down: m.down })) });
      const capture = label => { if (!q.frames[label]) q.frames[label] = { at: now, phase: s.phase, phaseTime: s.phaseTime, charge: s.chargeProgress, data: game.canvas.toDataURL('image/png') }; };
      if (s.phase.endsWith('talk') && b.typed) capture(`${s.phase}-${q.texts.length}`);
      if (!s.phase.endsWith('talk') && s.phase !== 'assault' && s.phaseTime >= (['flash', 'impact'].includes(s.phase) ? 0 : 0.12)) capture(s.phase);
      if (s.phase === 'autocharge') { if (s.phaseTime < 0.06) capture('charge-zero'); if (s.phaseTime >= 2) capture('charge-half'); if (s.phaseTime >= 3.8) capture('charge-full'); }
      if (s.phase === 'shot' && s.phaseTime >= 0.35) capture('beam-large');
      if (s.phase === 'impact' && s.phaseTime >= 0.5) capture('impact-slow-recoil');
      if (s.phase === 'fall' && s.phaseTime >= 0.8) capture('normal-fall');
      if (s.phase === 'gather' && s.phaseTime >= 2.7) capture('petals-huge');
      if (s.phase === 'assault') for (const threshold of [0.3, 16, 31, 46, 59]) if (s.assault.elapsed >= threshold) capture(`assault-${threshold}`);
      if (s.phase === 'assault' && s.assault.bubble?.shown === s.assault.bubble?.text.length) capture(`resolve-${s.assault.bubblesShown}`);
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
    for (let i = 0; i < 20 && await page.evaluate(p => game.battle.gimmick?.snapshot?.phase === p, phase); i++) {
      await press('KeyC', { delay: 60 }); await page.waitForTimeout(230);
    }
  };
  await advanceTalk('intro-talk');
  check('raise and gather enter real full-screen assault', await until(() => game.battle?.gimmick?.snapshot?.phase === 'assault', 9000));
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
    return { steps, phase: mode.snapshot.phase, party: game.battle.members.map(m => m.hp) };
  });
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
  check('automatic finisher completes without any further confirm input', await until(() => !game.battle || game.battle.state === 'win', 14000));
  const q = await page.evaluate(() => window.__finalQa);
  for (const [label, frame] of Object.entries(q.frames)) {
    const file = path.join(process.env.SHOT_DIR, `${label}.png`);
    fs.writeFileSync(file, Buffer.from(frame.data.split(',')[1], 'base64'));
    evidence.captures.push({ label, file, ...frame, data: undefined });
  }
  evidence.observed = { ...q, frames: undefined }; save();
  const phases = q.phases.map(p => p.phase), phase = name => q.phases.find(p => p.phase === name);
  check('all requested finale phases occur in order', ['intro-talk', 'raise', 'gather', 'assault', 'bursts', 'death-talk', 'autocharge', 'shot', 'impact', 'flash', 'smoke', 'revert', 'fall'].every((p, i) => phases[i] === p), JSON.stringify(phases));
  check('intro contains exactly the four requested lines', JSON.stringify(q.texts.filter(t => t.phase === 'intro-talk').map(t => t.text)) === JSON.stringify(['* 큭.. 형들 대단하시네요', '* 여기까지 온건 칭찬해드리겠습니다.', '* 그렇지만, 전 포기할 수 없어요.', '* 마지막 그녀를 위한 이 힘을 바칠거에요!!']));
  check('BGM stops before three defeat lines', q.audio.some(a => a.type === 'stop-bgm' && a.phase === 'death-talk') && q.texts.filter(t => t.phase === 'death-talk').length === 3);
  if (!captureOnly && !build301) check('assault real wall duration reaches sixty seconds', phase('bursts')?.at - phase('assault')?.at >= 59500, String(phase('bursts')?.at - phase('assault')?.at));
  check('automatic charge starts at zero and lasts four real seconds', phase('autocharge')?.charge <= 0.015 && phase('shot')?.at - phase('autocharge')?.at >= 3950 && phase('shot')?.at - phase('autocharge')?.at < 4700, JSON.stringify({ start: phase('autocharge'), duration: phase('shot')?.at - phase('autocharge')?.at }));
  const criticalFrames = ['petals-huge', 'charge-zero', 'charge-half', 'charge-full', 'beam-large', 'impact', 'flash', 'smoke', 'revert', 'normal-fall'];
  if (!captureOnly && !build301) criticalFrames.push('assault-0.3', 'assault-31', 'assault-59');
  if (build301) criticalFrames.push('resolve-1', 'resolve-2', 'resolve-3', 'impact-slow-recoil');
  check('full Game.draw captures all critical stages at 960x720', q.canvas[0] === 960 && q.canvas[1] === 720 && criticalFrames.every(p => q.frames[p]), JSON.stringify(Object.keys(q.frames)));
  if (!captureOnly) check('real directional and C inputs move and fire during survival', q.samples.some(s => s.assault?.shots > 0) && Math.max(...q.samples.map(s => s.assault?.heart.y || 0)) - Math.min(...q.samples.filter(s => s.assault).map(s => s.assault.heart.y)) > 120);
  await shot('after-finale');
  if (build301) {
    const lines = [...new Set(q.samples.map(s => s.assault?.bubble?.text).filter(Boolean))];
    check('actual6/15/27 contacts show the three requested resolve balloons', JSON.stringify(lines) === JSON.stringify(['아직이다.', '아직 쓰러질 수 없어.', '쓰읍 미스']), JSON.stringify(lines));
    check('heavy official hit begins at contact with slowed playback', q.audio.some(a => a.name === 'furnace_blast' && a.phase === 'impact' && a.options.rate === 0.8 && a.samples.some(s => s.time > 0 && !s.paused && s.rate === 0.8)));
    const money = await page.evaluate(() => game.money);
    check('actual common victory awards fifteen million exactly once', money - q.initialMoney === 15000000, JSON.stringify({ before: q.initialMoney, after: money }));
    for (let i = 0; i < 12 && await page.evaluate(() => !!game.battle); i++) { await press('KeyC', { delay: 55 }); await page.waitForTimeout(300); }
    check('physical victory C reaches the first rescue line', await until(() => game.choimisRescue && game.textbox.node?.text?.includes('휴 드디어 잡았네요'), 10000));
    await page.waitForTimeout(1000);
    evidence.rescueBoundary = await page.evaluate(() => ({ fade: game.fade.alpha, money: game.money, text: game.textbox.node?.text, flag: game.flags.choimis_flower_won, battle: !!game.battle }));
    check('full final-mode victory clears black fade and does not award twice', evidence.rescueBoundary.fade === 0 && evidence.rescueBoundary.money === money && !evidence.rescueBoundary.battle, JSON.stringify(evidence.rescueBoundary));
    await shot('301-final-win-to-rescue'); save();
  }
  await binding('after');
  const changed = sources.filter(relative => evidence.sources.find(s => s.relative === relative && s.when === 'before').local !== evidence.sources.find(s => s.relative === relative && s.when === 'after').local);
  evidence.changedDuringRun = changed; save();
  check('bound battle sources remain unchanged during this execution', changed.length === 0, JSON.stringify(changed));
});
