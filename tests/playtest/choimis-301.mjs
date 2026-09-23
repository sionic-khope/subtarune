import { runScenario } from './lib/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

await runScenario({ name: 'choimis-301', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const build304 = process.env.QA_BUILD304 === '1';
  const build303 = process.env.QA_BUILD303 === '1' || build304;
  const scope = process.env.QA_301_SCOPE || 'all';
  const cases = scope === 'all' ? build303 ? ['prism', 'kart', 'blood-later', 'gasuni-drain', 'fashion', 'ordinary-choso'] : ['idle', 'kart', 'blood-first', 'blood-later', 'gasuni-normal', 'gasuni-charge', 'ordinary-choso', 'eating'] : [scope];
  const evidence = { scope, sources: [], rounds: [], captures: [], limitations: 'Direct QA battle, opening skipped and defense boosted. Pattern fixtures resolve actual nextPatternConfig and restore legitimate party HP between rounds only. All movement/shots/eating use physical arrows/C and real-time updates. No hit, clock, invulnerability, projectile, winner or completion field is injected. Automated targeting does not rate human difficulty.' };
  evidence.build = build304 ? 304 : build303 ? 303 : 301;
  const save = () => fs.writeFileSync(path.join(process.env.SHOT_DIR, `build${evidence.build}-evidence.json`), JSON.stringify(evidence, null, 2) + '\n');
  const files = ['src/battle/battle.js', 'src/battle/choimis-pink-rounds.js', 'src/battle/choimis-gasuni.js', 'src/data/choimis-gasuni.js', 'src/battle/modes/choimis-pink-round.js', 'src/battle/modes/choimis-eating-race.js', 'src/battle/choimis-patterns-a.js', 'src/battle/choimis-sky-background.js', 'src/data/enemies.js', 'assets/enemies/choimis-flower-idle.png', 'assets/enemies/choimis-flower-raise.png', 'assets/enemies/choimis-choso.png', 'assets/audio/sfx/choimis_piercing_blood.mp3'];
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  files.push('src/data/build.js', 'assets/props/choimis-dolphin-breach.png');
  if (build303) files.push('src/battle/choimis-patterns-b.js', 'src/battle/modes/choimis-pink-shooter.js', 'assets/props/choimis-fashion303.png');
  for (const relative of files) {
    const response = await page.request.get(new URL(relative, process.env.QA_BASE_URL).href);
    const local = hash(fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, relative))), served = hash(await response.body());
    evidence.sources.push({ relative, local, served }); check(`served source ${relative}`, response.ok() && local === served);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await open({ qa: 'choimis_eating' });
  check('QA intro ready', await until(() => window.game?.battle?.state === 'intro', 30000));
  await fixture('registered-round-observer', 'Skip already-covered opening and activate its defense state. Read full Game.draw, damage/audio and real snapshots; do not alter results or combat time.', () => {
    const b = game.battle; b.openingShown = true; b.enemies[0].defenseBoosted = true;
    const q = window.__qa301 = { name: 'idle', samples: [], frames: {}, sounds: [], hurts: [], sequence: [], boundaries: [] };
    const e = b.enemies[0];
    q.sequence = Array.from({ length: 32 }, (_, index) => ({ index, ...b.nextPatternConfig({ ...e, patternIdx: index }) })).map(s => ({ index: s.index, type: s.config.type, mode: s.config.mode, cycle: s.cycle }));
    const draw = game.draw.bind(game), hurt = b.hurtParty.bind(b), sfx = game.sound.sfx.bind(game.sound);
    b.hurtParty = (...args) => {
      const before = b.members.reduce((sum, m) => sum + m.hp, 0), s = b.gimmick?.snapshot;
      const result = hurt(...args);
      q.hurts.push({ at: performance.now(), damage: args[0], before, after: b.members.reduce((sum, m) => sum + m.hp, 0), scenario: s?.scenario }); return result;
    };
    game.sound.sfx = (name, options) => {
      const handle = sfx(name, options), entry = { name, options, at: performance.now(), elapsed: b.gimmick?.snapshot?.combatElapsed, samples: [] }; q.sounds.push(entry);
      if (name === 'choimis_piercing_blood') for (const delay of [80, 220, 500, 800]) setTimeout(() => entry.samples.push({ delay, time: handle?.currentTime, paused: handle?.paused, duration: handle?.duration, src: handle?.currentSrc }), delay);
      return handle;
    };
    game.draw = (...args) => {
      const result = draw(...args), s = b.gimmick?.snapshot, now = performance.now();
      const capture = label => { if (!q.frames[label]) q.frames[label] = { at: now, phase: s?.phase, elapsed: s?.combatElapsed, data: game.canvas.toDataURL('image/png') }; };
      if (!q.samples.length || now - q.samples.at(-1).at > 65) q.samples.push({ at: now, state: b.state, mode: b.activeEnemyMode, snapshot: s, hp: e.hp, party: b.members.map(m => ({ hp: m.hp, down: m.down })), bubble: b.bubble?.text, bullets: b.bullets.map(p => ({ shape: p.shape, look: p.look, profile: p.profile, age: p.age, warn: p.warn, x: p.x, y: p.y, w: p.w, h: p.h })), enemy: { x: e.x, y: e.y, scale: e.def.scale, scaleY: e.def.scaleY, pivot: e.def.pivot } });
      const phase = s?.phase || b.state;
      if (q.boundaries.at(-1)?.phase !== phase) q.boundaries.push({ phase, at: now, snapshot: s, lastSample: q.samples.at(-1) });
      if (q.name === 'idle' && b.state === 'menu') {
        capture('tall-idle');
        if (game.propImages?.['assets/props/choimis-dolphin-breach.png'] && game.time >= 5 && (game.time - 5) % 8.6 > 0.5 && (game.time - 5) % 8.6 < 1) capture('dolphin-breach');
      }
      if (['combat', 'tail', 'settle'].includes(s?.phase)) {
        if (s.combatElapsed >= 0.3) capture('combat-start');
        if (s.combatElapsed >= 9) capture('combat-mid');
        if (s.combatElapsed >= 17.5) capture('combat-end');
        const sc = s.scenario;
        if (s.phase === 'tail') { capture('tail-start'); if (s.tailElapsed >= 0.4 && s.shots.length) capture('tail-player-shot'); if (s.tailElapsed >= 1) capture('tail-late'); }
        if (s.phase === 'settle') capture('settle');
        if (sc?.kind === 'kart_block') { if (sc.missed === 1) capture('miss-dot-1'); if (sc.missed === 2) capture('miss-dot-2'); if (sc.missFlash > 0) capture('third-miss-damage'); }
        if (sc?.bloodOrbs?.length) capture('blood-orbs-warning');
        if (sc?.destroyedOrbs > 0) capture('blood-orb-destroyed');
        if (sc?.bloodBullets?.length) capture('blood-orb-burst');
        if (sc?.kind === 'gasuni') {
          if (sc.spirits?.length >= 3) capture('gasuni-swirl');
          if (sc.powered) capture('gasuni-powered');
          if (sc.targets?.some(t => t.kind !== 'jeomnye' && t.launched)) capture('gasuni-thrown');
          if (sc.targets?.some(t => t.id.startsWith('gasuni-cross') && t.launched)) capture('gasuni-crosswave');
          if (b.bubble?.text === '점례야!' && b.bubble.shown >= 4) capture('giant-callout');
          const giant = sc.targets?.find(t => t.kind === 'jeomnye');
          if (giant?.hp === 12) capture('giant-full');
          if (giant?.hp < 12) capture('giant-damaged');
          if (sc.giantOutcome === 'destroyed') capture('giant-destroyed');
        }
        if (sc?.kind === 'pink_prism') {
          if (sc.coreBolts?.some(t => t.age < 0.45)) capture('core-warmup-no-guide');
          if (sc.coreBolts?.some(t => t.age > 0.45)) capture('cores-white-fire');
          if (sc.shieldPositions.some(t => t.hp === 1)) capture('core-one-hp');
          if (sc.shields < 3) capture('core-destroyed');
          if (sc.coreBolts?.some(t => !sc.shieldPositions.some(shield => shield.id === t.sourceId))) capture('destroyed-core-fired-bolt-survives');
        }
      }
      if (s?.phase === 'race') capture('eating-race');
      if (s?.phase === 'result') capture('eating-result');
      if (b.state === 'bullets' && b.bullets.some(bullet => bullet.age >= bullet.warn)) capture('ordinary-active');
      if (q.name === 'fashion') for (const bullet of b.bullets.filter(p => p.shape === 'choimis_outfit' && p.age >= p.warn + 0.65)) capture(`fashion-look-${bullet.look}`);
      return result;
    };
  });
  for (let i = 0; i < 25 && !await page.evaluate(() => game.battle.state === 'menu'); i++) { await press('KeyC', { delay: 55 }); await page.waitForTimeout(150); }
  check('real C enters normal party menu', await until(() => game.battle.state === 'menu', 5000));
  if (build303) check('BUILD303 boss starts with250 HP', await page.evaluate(() => game.battle.enemies[0].hp === 250 && game.battle.enemies[0].maxHp === 250));
  const sequence = await page.evaluate(() => window.__qa301.sequence);
  evidence.sequence = sequence;
  check('ninth configured turn is eating', sequence[8].type === 'choimis_eating_race');
  check('ordinary and pink Choso are never adjacent', sequence.every((s, i) => !i || !(new Set([s.type, sequence[i - 1].type]).has('choimis_choso') && new Set([s.type, sequence[i - 1].type]).has('choimis_pink_choso'))));
  check('first pink cycle contains all four distinct scenarios', new Set(sequence.filter(s => s.mode === 'choimis_pink_round' && s.cycle === 0).map(s => s.type)).size === 4);
  const flush = async label => {
    const q = await page.evaluate(() => window.__qa301);
    for (const [name, frame] of Object.entries(q.frames)) { const file = path.join(process.env.SHOT_DIR, `${label}-${name}.png`); fs.writeFileSync(file, Buffer.from(frame.data.split(',')[1], 'base64')); evidence.captures.push({ label, name, file, ...frame, data: undefined }); }
    return { ...q, frames: Object.keys(q.frames) };
  };
  if (cases.includes('idle')) {
    await until(() => window.__qa301.frames['dolphin-breach'], 12000);
    evidence.idle = await flush('idle'); check('idle body and real periodic dolphin render', evidence.idle.frames.includes('tall-idle') && evidence.idle.frames.includes('dolphin-breach'));
  }
  for (const name of cases.filter(name => name !== 'idle')) {
    const type = name === 'prism' ? 'choimis_pink_prism' : name === 'fashion' ? 'choimis_fashion' : name === 'kart' ? 'choimis_pink_kart' : name.startsWith('blood') ? 'choimis_pink_choso' : name.startsWith('gasuni') ? 'choimis_pink_gasuni' : name === 'ordinary-choso' ? 'choimis_choso' : 'choimis_eating_race';
    const selected = await fixture(`select-${name}`, 'Resolve the requested type/cycle through the actual selector and restore normal HP between rounds. No projectile, hit, elapsed-time or outcome state is injected.', ({ name, type }) => {
      const b = game.battle, e = b.enemies[0], cycle = name === 'blood-later' ? 1 : 0;
      e.hp = e.maxHp; e.dead = false; e.dying = 0;
      const index = Array.from({ length: 128 }, (_, index) => ({ index, ...b.nextPatternConfig({ ...e, patternIdx: index }) })).find(value => value.config?.type === type && (value.cycle ?? 0) === cycle)?.index;
      if (index === undefined) throw new Error(`No registered ${type} cycle${cycle}`);
      e.patternIdx = index; b.members.forEach(m => { m.hp = m.maxHp; m.down = false; });
      Object.assign(window.__qa301, { name, samples: [], frames: {}, sounds: [], hurts: [], boundaries: [] });
      return { index, type, cycle };
    }, { name, type });
    for (let member = 0; member < 3; member++) {
      await press('KeyC', { delay: 55 }); if (!await until(() => game.battle.state === 'target', 3000)) throw new Error('Target menu missing');
      await press('KeyC', { delay: 55 });
      if (member < 2 && !await until(() => game.battle.state === 'menu', 3000)) throw new Error('Next party member missing');
    }
    const pink = type.startsWith('choimis_pink_');
    check(`${name}: real attacks enter selected mode`, await until(pink ? () => game.battle.gimmick?.snapshot?.phase === 'combat' : name === 'eating' ? () => game.battle.activeEnemyMode === 'choimis_eating_race' : () => game.battle.state === 'bullets', 15000));
    if (build304 && name === 'prism') {
      for (const width of [375, 768, 1280]) {
        await page.setViewportSize({ width, height: 800 });
        await page.waitForTimeout(180);
        await shot(`prism-viewport-${width}`);
      }
    }
    const start = Date.now(); let held = null, chargeHeld = false, fired = 0, lastFire = 0, tailFired = false;
    while (Date.now() - start < 40000) {
      const state = await page.evaluate(() => ({ state: game.battle.state, s: game.battle.gimmick?.snapshot }));
      if (['menu', 'lose', 'win'].includes(state.state)) break;
      const s = state.s, elapsed = s?.combatElapsed || 0;
      if (name === 'blood-later' && s?.phase === 'combat' && !s.scenario.destroyedOrbs && s.scenario.bloodOrbs?.length) {
        const orb = s.scenario.bloodOrbs[0], delta = orb.y - s.heart.y, next = Math.abs(delta) < 4 ? null : delta > 0 ? 'ArrowDown' : 'ArrowUp';
        if (held && next !== held) await page.keyboard.up(held);
        if (next && next !== held) await page.keyboard.down(next); held = next;
        if (!held && Date.now() - lastFire > 320) { await press('KeyC', { delay: 25 }); lastFire = Date.now(); }
      } else if (name === 'gasuni-drain' && elapsed >= 12.8 && s?.heart.y > 102) {
        if (held !== 'ArrowUp') { if (held) await page.keyboard.up(held); await page.keyboard.down('ArrowUp'); held = 'ArrowUp'; }
      } else if (held) { await page.keyboard.up(held); held = null; }
      if (name === 'gasuni-normal' && elapsed >= 12 && s?.scenario.giantOutcome !== 'destroyed' && fired < 16 && Date.now() - lastFire >= 350) { await press('KeyC', { delay: 55 }); lastFire = Date.now(); fired++; }
      if (name === 'gasuni-charge' && elapsed >= 11 && fired < 4) {
        if (!chargeHeld) { await page.keyboard.down('KeyC'); chargeHeld = true; }
        else if (s.charge.ready) { await page.keyboard.up('KeyC'); chargeHeld = false; fired++; }
      }
      if (name === 'prism' && s?.phase === 'combat') {
        if (elapsed < 4 && Date.now() - lastFire >= 380) { await press('KeyC', { delay: 55 }); lastFire = Date.now(); }
        else if (elapsed >= 4 && s.scenario.shields > 0) {
          if (!chargeHeld) { await page.keyboard.down('KeyC'); chargeHeld = true; }
          else if (s.charge.ready) { await page.keyboard.up('KeyC'); chargeHeld = false; fired++; }
        }
      }
      if (build303 && pink && s?.phase === 'tail' && !tailFired) { await press('KeyC', { delay: 55 }); tailFired = true; }
      if (name === 'eating' && s?.phase === 'race') await press('KeyC', { delay: 20 });
      await page.waitForTimeout(name === 'eating' ? 45 : 50);
    }
    if (held) await page.keyboard.up(held); if (chargeHeld) await page.keyboard.up('KeyC');
    const returned = await until(() => game.battle.state === 'menu' && !game.battle.gimmick && !game.battle.activeEnemyMode, 5000);
    check(`${name}: timed round disposes and returns to menu`, returned);
    const observed = await flush(name), combat = observed.samples.filter(s => s.snapshot?.phase === 'combat');
    evidence.rounds.push({ name, selected, wallMs: Date.now() - start, fired, observed }); save();
    if (pink) check(`${name}: real combat lasts eighteen seconds`, combat.length > 20 && combat.at(-1).snapshot.combatElapsed >= 17.7 && Date.now() - start >= 17700);
    if (build303 && pink) {
      const tail = observed.samples.filter(s => ['tail', 'settle'].includes(s.snapshot?.phase));
      check(`${name}: deadline transitions to live drain before return`, tail.length > 0 && tail.every(s => s.snapshot.combatElapsed === 18) && observed.boundaries.some(s => s.phase === 'tail'), JSON.stringify(observed.boundaries.map(s => ({ phase: s.phase, at: s.at }))));
      if (name === 'blood-later' || name === 'kart' || name === 'prism') check(`${name}: live player shot survives deadline and tail input remains active`, tail.some(s => s.snapshot.shots.length > 0));
      check(`${name}: live hazards visibly advance during drain rather than vanishing at deadline`, tail.some(s => s.snapshot.pending) && tail.at(-1)?.snapshot.tailElapsed >= 0.2 && returned, JSON.stringify(tail.at(-1) && { tailElapsed: tail.at(-1).snapshot.tailElapsed, pendingLastSample: tail.at(-1).snapshot.pending }));
    }
    if (name === 'kart') {
      const states = combat.map(s => s.snapshot.scenario), penalty = observed.hurts.filter(h => h.scenario?.missFlash === 0.35 && h.scenario.escaped % 3 === 0);
      check('kart: three missed vehicles cause ordinary damage and reset the three-dot counter', states.some(s => s.escaped >= 3) && states.some(s => s.missed === 1) && states.some(s => s.missed === 2) && penalty.length >= 1 && penalty.every(h => h.damage > 0 && h.before - h.after === h.damage), JSON.stringify(penalty.map(h => ({ damage: h.damage, before: h.before, after: h.after, escaped: h.scenario.escaped }))));
    }
    if (name.startsWith('blood')) {
      const states = combat.map(s => s.snapshot.scenario);
      if (name === 'blood-first') check('first Choso cycle has no blood orbs', states.length > 0 && states.every(s => !s.bloodOrbs?.length && !s.orbBursts));
      else check('later Choso allows real shot destruction and delayed radial bursts', states.some(s => s.destroyedOrbs >= 1) && states.some(s => s.orbBursts >= 1 && s.bloodBullets.length >= 8) && states.some(s => s.bloodOrbs.some(o => o.age >= 2 && o.age < 2.2)), JSON.stringify({ destroyed: Math.max(...states.map(s => s.destroyedOrbs)), bursts: Math.max(...states.map(s => s.orbBursts)) }));
    }
    if (name.startsWith('gasuni')) {
      const states = combat.map(s => s.snapshot.scenario), hp = states.flatMap(s => s.targets.filter(t => t.kind === 'jeomnye').map(t => t.hp));
      if (name !== 'gasuni-drain') {
        check(`${name}: spirits gather, spin, throw, and giant is destroyed by real shots`, states.some(s => s.spirits.length >= 3) && states.some(s => s.powered && s.absorbed === 6) && states.some(s => s.targets.some(t => t.kind !== 'jeomnye' && t.launched)) && states.some(s => s.giantOutcome === 'destroyed'), JSON.stringify({ fired, hp }));
        check(`${name}: requested hit count preserves giant HP12 accounting`, name === 'gasuni-normal' ? Array.from({ length: 12 }, (_, i) => i + 1).every(value => hp.includes(value)) && combat.every(s => s.snapshot.shots.every(shot => !shot.charged)) : fired === 4 && hp.includes(12) && hp.includes(9) && hp.includes(6) && hp.includes(3));
      }
      if (build303) check('gasuni crosswave and typed giant callout occur at launch', states.some(s => s.targets.some(t => t.id.startsWith('gasuni-cross') && t.launched)) && observed.samples.some(s => s.bubble === '점례야!' && s.snapshot.scenario.targets.some(t => t.kind === 'jeomnye' && t.launched)) && observed.frames.includes('giant-callout'));
    }
    if (name === 'prism') {
      const states = combat.map(s => s.snapshot.scenario), early = combat.filter(s => s.snapshot.combatElapsed < 4);
      check('normal shots cannot remove or damage cores', early.length > 10 && early.every(s => s.snapshot.scenario.shieldPositions.every(shield => shield.hp === 2)) && observed.sounds.some(s => s.name === 'pop' && s.elapsed < 4));
      const ids = states[0].shieldPositions.map(s => s.id);
      check('real charged shots give cores2→1→removed, not one-hit deletion', ids.some(id => states.some(s => s.shieldPositions.find(shield => shield.id === id)?.hp === 1) && states.some(s => !s.shieldPositions.some(shield => shield.id === id))));
      check('all live cores fire white bullets and fired shots survive core destruction', new Set(states.flatMap(s => s.coreBolts.map(b => b.sourceId))).size === 3 && observed.frames.includes('destroyed-core-fired-bolt-survives'));
      if (build304) {
        const births = [...new Map(states.flatMap(s => s.coreBolts).map(bolt => [bolt.id, bolt])).values()].filter(bolt => bolt.born < 4);
        check('white cores repeat every2.4s with six births before4s', births.length === 6 && ids.every((id, index) => {
          const times = births.filter(bolt => bolt.sourceId === id).map(bolt => bolt.born).sort((a, b) => a - b);
          return times.length === 2 && Math.abs(times[0] - (0.65 + index * 0.3)) < 1e-8 && Math.abs(times[1] - times[0] - 2.4) < 1e-8;
        }), JSON.stringify(births.map(({ sourceId, born }) => ({ sourceId, born }))));
        check('warmup and visible white-fire frames captured for guide-removal review', observed.frames.includes('core-warmup-no-guide') && observed.frames.includes('cores-white-fire'));
      }
    }
    if (name === 'fashion') check('all seven different outfits render during the real turn', Array.from({ length: 7 }, (_, i) => `fashion-look-${i}`).every(name => observed.frames.includes(name)) && new Set(observed.samples.flatMap(s => s.bullets.filter(b => b.shape === 'choimis_outfit').map(b => b.profile))).size === 7);
    if (build303 && name.startsWith('blood')) check('pink Choso uses the approved0.44s loaded strong source', observed.sounds.some(s => s.name === 'choimis_piercing_blood' && s.options.volume === 0.85 && s.samples.some(v => v.time > 0 && !v.paused && Math.abs(v.duration - 0.44) < 0.01) && s.samples.some(v => v.delay >= 500 && v.paused)));
    if (name === 'ordinary-choso') check('ordinary Choso uses the new short source and stops promptly', observed.sounds.some(s => s.name === 'choimis_piercing_blood' && s.samples.some(v => v.time > 0 && !v.paused) && s.samples.some(v => v.delay >= 500 && v.paused)), JSON.stringify(observed.sounds.filter(s => s.name === 'choimis_piercing_blood')));
    if (name === 'eating') check('ninth-turn eating route is entered through ordinary party actions', selected.index === 8 && observed.frames.includes('eating-race') && observed.frames.includes('eating-result'));
    if (!returned) break;
  }
  evidence.sourceAfter = files.map(relative => ({ relative, local: hash(fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, relative))) }));
  check('bound301 sources remain stable during execution', evidence.sourceAfter.every(s => evidence.sources.find(before => before.relative === s.relative).local === s.local)); save();
  await shot('final-menu');
});
