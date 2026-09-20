import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'drum-devil-battle', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, check, until, press, shot, fixture }) => {
  const missingAssets = [];
  page.on('response', response => { if (response.status() >= 400 && /drum[-_]devil|janitor[-_]hero|janitor-red|rudebuster|asgore_spear_swing|deltarune_release_shoot|yoplait-(kneel|surprised|lookback)/.test(response.url())) missingAssets.push(response.url()); });
  const earlyThreshold = async (kind = 'normal') => {
    await open({ qa: 'jjajang_nest_battle' });
    check('direct battle QA intro', await until(() => window.game?.battle?.state === 'intro' && game.battle.typed, 30000));
    await fixture(`${kind}-hit-boundary`, `Fresh solo battle at HP${kind === 'normal' ? 5 : 20} tests early ${kind} rescue separately from the forced eighth turn; not a full playthrough.`, hp => { game.battle.members[0].hp = hp; }, kind === 'normal' ? 5 : 20);
    await press('KeyC', { delay: 70 });
    check(`${kind} threshold menu`, await until(() => game.battle.state === 'menu'));
    await press('KeyC', { delay: 70 });
    check(`${kind} threshold target`, await until(() => game.battle.state === 'target'));
    await press('KeyC', { delay: 70 });
    check(`${kind} threshold real enemy turn`, await until(() => game.battle.state === 'bullets', 12000));
    if (kind === 'purple') await fixture('early-purple-isolation', 'Keep soul invulnerable to ordinary hazards while waiting for the first real purple finisher.', () => { game.battle.soul.invuln = 100; });
    const bulletsAt = Date.now();
    check(`${kind} collision clampsHP1 and starts same rescue`, await until(() => game.battle.state === 'interlude' && game.battle.members[0].hp === 1 && !game.battle.members[0].down, kind === 'normal' ? 6000 : 18000));
    check(`${kind} rescue timing`, kind === 'normal' ? Date.now() - bulletsAt < 6000 : Date.now() - bulletsAt > 10000);
    check(`${kind} early rescue skips eighth-turn red attack`, await page.evaluate(() => game.battle.support.completedTurns < 8 && game.battle.interlude.snapshot.phase === 'narration'));
    await shot(`${kind}-hit-rescue`);
  };
  if (process.env.DRUM_NORMAL_ONLY === '1') { await earlyThreshold(); return; }
  await open({ qa: 'jjajang_nest_center' });
  check('solo nest ready', await until(() => window.game?.mapId === 'jjajang_nest' && !game.dialogue.running, 30000));
  await fixture('start-solo-battle', 'Start actual cutscene battle configuration from normal solo nest progress; introduction interaction is covered separately.', async () => {
    const { jjajang_nest_drum } = await import('/src/data/cutscenes/drum_devil.js');
    game.startBattle(jjajang_nest_drum.find(node => node.battle).battle);
  });
  check('battle intro loaded', await until(() => game.battle?.state === 'intro' && game.battle.typed, 15000));
  await press('KeyC', { delay: 70 });
  check('menu opens', await until(() => game.battle?.state === 'menu'));
  check('HP300 solo and correct music', await page.evaluate(() => game.battle.enemies[0].hp === 300 && game.battle.members.length === 1 && game.sound.bgmName === 'drum_devil_battle'));
  check('drum region background is configured', await page.evaluate(() => game.battle.cfg.bg === 'drum_nest'));
  const dimensions = await page.evaluate(() => {
    const e = game.battle.enemies[0];
    return [e.img, e.actionImages.attack].map(img => img && { width: img.width, height: img.height });
  });
  check('both winged sheets loaded with matching384 cells', dimensions.every(d => d?.width === 768 && d?.height === 768), JSON.stringify(dimensions));
  check('long-arm boss uses requested1.2 scale', await page.evaluate(() => game.battle.enemies[0].def.scale === 1.2));
  await until(() => game.battle.typed);
  await shot('00-idle');
  if (process.env.DRUM_BOSS_POSES_ONLY === '1') {
    for (const sheet of ['idle', 'attack']) for (let frame = 0; frame < 4; frame++) {
      await fixture(`boss-${sheet}-${frame}`, 'Hold one native boss animation pose in the real menu to inspect artwork against the actual menu edge. Root, scale, pivot, art and UI are unchanged; this is not an attack-timing test.', pose => {
        game.battle.enemies[0].patternPose = pose;
      }, { sheet, frame });
      const bounds = await page.evaluate(async () => {
        const b = game.battle, e = b.enemies[0], surface = document.createElement('canvas');
        surface.width = 480; surface.height = 360;
        const context = surface.getContext('2d'); b.drawEnemy(context, e);
        const pixels = context.getImageData(0, 0, 480, 360).data;
        let left = 480, top = 360, right = 0, bottom = 0;
        for (let y = 0; y < 360; y++) for (let x = 0; x < 480; x++) if (pixels[(y * 480 + x) * 4 + 3]) {
          left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
        }
        const contract = await fetch('/assets/source/drum-devil-raisedhands-v4/runtime-contract.json').then(response => response.json());
        const regions = contract.actions[e.patternPose.sheet].frames[e.patternPose.frame].fullHandReviewRegions;
        const drawScale = Math.round(384 * e.def.scale) / 384;
        const origin = [Math.round(e.x - e.def.pivot[0] * e.def.scale), Math.round(e.y - e.def.pivot[1] * e.def.scale)];
        const hands = regions.map(region => {
          const rect = [origin[0] + Math.floor(region[0] * drawScale), origin[1] + Math.floor(region[1] * drawScale), origin[0] + Math.ceil(region[2] * drawScale), origin[1] + Math.ceil(region[3] * drawScale)];
          let count = 0, bottom = 0;
          for (let y = Math.max(0, rect[1]); y < Math.min(360, rect[3]); y++) for (let x = Math.max(0, rect[0]); x < Math.min(480, rect[2]); x++) if (pixels[(y * 480 + x) * 4 + 3]) { count++; bottom = Math.max(bottom, y + 1); }
          return { reviewedSourceRegion: region, renderedRegion: rect, opaquePixels: count, bottom };
        });
        return { left, top, right, bottom, root: [e.x, e.y], scale: e.def.scale, pose: e.patternPose, hands };
      });
      check(`${sheet}${frame} actual menu pose stays within battle viewport`, bounds.left > 0 && bounds.top > 0 && bounds.right < 480 && bounds.bottom < 318, JSON.stringify(bounds));
      check(`${sheet}${frame} both reviewed full-hand regions retain opaque pixels above menu246`, bounds.hands.length === 2 && bounds.hands.every(hand => hand.opaquePixels > 0 && hand.bottom < 246 && hand.renderedRegion[3] < 246), JSON.stringify(bounds.hands));
      await shot(`boss-menu-${sheet}-${frame}`);
    }
    check('boss refresh required assets loaded', missingAssets.length === 0, JSON.stringify(missingAssets));
    return;
  }
  await page.evaluate(async () => {
    const b = game.battle, hurt = b.hurtAllParty.bind(b), hit = b.hitEnemy.bind(b), sfx = b.sfx.bind(b), update = b.update.bind(b);
    const { JANITOR_HERO_ACTIONS: { attack } } = await import('/src/data/janitor-hero-actions.js');
    const { DRUM_DEVIL_RESCUE: rescue } = await import('/src/data/drum-devil-rescue.js');
    const bodyScale = rescue.hero.scale ?? 1, renderedScale = Math.round(attack.cell * bodyScale) / attack.cell;
    const attackImage = await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = attack.src; });
    const heroImage = await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = rescue.hero.src; });
    const { drawDrumDevilHero } = await import('/src/battle/support/drum-devil-rescue.js');
    const heroSurface = document.createElement('canvas'); heroSurface.width = 480; heroSurface.height = 360;
    const heroContext = heroSurface.getContext('2d');
    let heroTick = 0, heroRight = 0;
    for (const hold of rescue.hero.frameHolds) {
      heroContext.clearRect(0, 0, 480, 360);
      drawDrumDevilHero(heroContext, { hero: heroImage }, heroTick + hold / 2);
      const pixels = heroContext.getImageData(0, 0, 480, 360).data;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3]) heroRight = Math.max(heroRight, (i / 4) % 480 + 1);
      heroTick += hold;
    }
    window.drumHeroNoticeClearance = () => ({ heroRight, boardLeft: b.board.rect.x, margin: b.board.rect.x - heroRight });
    const canvas = document.createElement('canvas'); canvas.width = attackImage.width; canvas.height = attackImage.height;
    const context = canvas.getContext('2d'); context.drawImage(attackImage, 0, 0);
    const frameBounds = Array.from({ length: attack.count }, (_, frame) => {
      const pixels = context.getImageData(frame % attack.cols * attack.cell, Math.floor(frame / attack.cols) * attack.cell, attack.cell, attack.cell).data;
      let left = attack.cell, top = attack.cell, right = 0, bottom = 0;
      for (let y = 0; y < attack.cell; y++) for (let x = 0; x < attack.cell; x++) if (pixels[(y * attack.cell + x) * 4 + 3]) {
        left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
      }
      return { left, top, right, bottom };
    });
    window.drumEvidence = { penalties: [], flights: [], sounds: [], heals: [], lastOrdinary: {}, hits: [], actions: [], postheroHazards: [], clippedFrames: [], parryFrames: {}, music: [], cue: null };
    window.drumDanceFrame = () => {
      let time = b.game.time % rescue.hero.frameHolds.reduce((sum, hold) => sum + hold, 0), frame = 0;
      while (frame < rescue.hero.frameHolds.length - 1 && time >= rescue.hero.frameHolds[frame]) time -= rescue.hero.frameHolds[frame++];
      return frame;
    };
    const sound = b.game.sound, playBgm = sound.playBgm.bind(sound);
    sound.playBgm = (name, options) => {
      const result = playBgm(name, options), audio = sound.bgm;
      drumEvidence.music.push({ name, time: performance.now(), fadeIn: options?.fadeIn, currentTime: audio?.currentTime });
      if (name === 'janitor_hero_intro' && audio) {
        const cue = { startedAt: performance.now(), loop: audio.loop, rate: audio.playbackRate, samples: [] };
        drumEvidence.cue = cue; window.observedHeroCue = audio;
        audio.addEventListener('timeupdate', () => cue.samples.push({ wall: performance.now(), time: audio.currentTime, rate: audio.playbackRate }));
        audio.addEventListener('ended', event => { cue.ended = { wall: performance.now(), time: audio.currentTime, duration: audio.duration, trusted: event.isTrusted }; }, { once: true });
      }
      return result;
    };
    window.drumSnapshot = () => { const snapshot = b.interlude?.snapshot; return snapshot?.inner || snapshot; };
    b.hurtAllParty = amount => { const before = b.members.map(m => m.hp), invuln = b.soul.invuln; hurt(amount); drumEvidence.penalties.push({ amount, before, after: b.members.map(m => m.hp), invuln, t: b.t }); };
    b.hitEnemy = (enemy, by, damage, options) => {
      let renderedContact = null;
      if (options?.source === 'janitor') {
        const point = b.support.actionSnapshot?.contact;
        if (point) {
          const surface = document.createElement('canvas'); surface.width = 480; surface.height = 360;
          const context = surface.getContext('2d');
          b.drawEnemy(context, { ...enemy, popup: null, blink: 0, shake: 0 });
          const x = Math.max(0, Math.min(478, Math.round(point.x) - 1)), y = Math.max(0, Math.min(358, Math.round(point.y) - 1));
          const pixels = context.getImageData(x, y, 3, 3).data;
          renderedContact = Array.from({ length: 9 }, (_, i) => pixels[i * 4 + 3]).some(alpha => alpha > 0);
        }
      }
      const before = enemy.hp, result = hit(enemy, by, damage, options);
      drumEvidence.hits.push({ source: options?.source || 'ordinary', damage: before - enemy.hp, hp: enemy.hp, action: b.support.actionSnapshot, renderedContact });
      return result;
    };
    b.sfx = (name, ...args) => { drumEvidence.sounds.push({ name, time: performance.now(), phase: drumSnapshot()?.phase }); return sfx(name, ...args); };
    b.update = (...args) => {
      const hpBefore = b.members[0].hp;
      const result = update(...args);
      if (b.members[0].hp > hpBefore) drumEvidence.heals.push({ before: hpBefore, after: b.members[0].hp, phase: drumSnapshot()?.phase });
      if (b.state === 'bullets' && b.bullets.some(bullet => !['drum_mark', 'drum_purple', 'drum_fuse', 'drum_arena_blast'].includes(bullet.shape))) drumEvidence.lastOrdinary[b.enemies[0].patternIdx] = b.t;
      const action = b.support.actionSnapshot;
      const previous = drumEvidence.actions.at(-1);
      if (action && (!previous || previous.kind !== action.kind || previous.phase !== action.phase || action.elapsed < previous.elapsed)) {
        const purple = b.bullets.find(bullet => bullet.shape === 'drum_purple');
        drumEvidence.actions.push({ ...action, turn: b.enemies[0].patternIdx, barrelAge: purple?.age, playerIdle: !b.members[0].action || b.members[0].action.mode === 'idle' });
      }
      if (action?.kind === 'janitor-intercept' && action.phase === 'attack') {
        const box = frameBounds[action.frame], x = Math.round(action.position.x - attack.pivot[0] * bodyScale), y = Math.round(action.position.y - attack.pivot[1] * bodyScale);
        const bounds = { left: x + Math.floor(box.left * renderedScale), top: y + Math.floor(box.top * renderedScale), right: x + Math.ceil(box.right * renderedScale), bottom: y + Math.ceil(box.bottom * renderedScale) };
        const turn = b.enemies[0].patternIdx;
        (drumEvidence.parryFrames[turn] ||= {})[action.frame] = true;
        if (bounds.left < 0 || bounds.top < 0 || bounds.right > 480 || bounds.bottom > 318) drumEvidence.clippedFrames.push({ turn, frame: action.frame, bounds, elapsed: action.elapsed });
      }
      if (b.support.rescued && b.bullets.some(bullet => ['drum_fuse', 'drum_arena_blast'].includes(bullet.shape))) drumEvidence.postheroHazards.push(b.t);
      return result;
    };
  });
  // A scoped support refresh enters the real rescue early without injecting phases.
  if (process.env.DRUM_HERO_BOARD_ONLY === '1') {
    const clearance = await page.evaluate(async () => {
      const { DRUM_DEVIL: config } = await import('/src/data/drum-devil.js');
      const heroRight = drumHeroNoticeClearance().heroRight;
      const width = game.battle.enemies[0].def.board[0], boardLeft = config.heroBoardCenter[0] - width / 2;
      return { heroRight, boardLeft, boardRight: boardLeft + width, margin: boardLeft - heroRight };
    });
    check('configured rescued board clears every actual hero idle frame', clearance.margin >= 3 && clearance.boardRight < 480, JSON.stringify(clearance));
    check('hero board preflight assets loaded', missingAssets.length === 0, JSON.stringify(missingAssets));
    return;
  }
  const rescueOnly = process.env.DRUM_RESCUE_ONLY === '1';
  const assistOnly = process.env.DRUM_ASSIST_ONLY === '1';
  const supportOnly = process.env.DRUM_POSTHERO_ONLY === '1' || rescueOnly || assistOnly;
  const initialHome = await page.evaluate(() => [...game.battle.members[0].home]);
  const expectedHome = await page.evaluate(async () => (await import('/src/data/drum-devil.js')).DRUM_DEVIL.heroPartyHome);
  check('Yoplait uses the rescue-safe formation from battle start', initialHome[0] === expectedHome[0] && initialHome[1] === expectedHome[1], JSON.stringify(initialHome));
  if (supportOnly) {
    await fixture('early-rescue-support-refresh', 'Set HP5 before real C attack and ordinary collision to reach rescue quickly for support visuals and behavior; no rescue flags or phases are injected.', () => { game.battle.members[0].hp = 5; });
    await press('KeyC', { delay: 70 });
    await until(() => game.battle.state === 'target');
    await press('KeyC', { delay: 70 });
    check('scoped support entry reaches realHP1 rescue', await until(() => game.battle.state === 'interlude' && game.battle.members[0].hp === 1, 15000));
  }
  const patterns = supportOnly ? [] : process.env.DRUM_CAPTURE_ONLY === '1' ? ['bombard'] : ['bombard', 'roll', 'chain', 'cross', 'ring', 'bombard-6', 'roll-7', 'chain-8'];
  for (const [index, name] of patterns.entries()) {
    await fixture(`restore-${name}`, 'Restore solo HP between isolated rounds; no claim of natural full fight.', () => { for (const m of game.battle.members) { m.hp = m.maxHp; m.down = false; } });
    await press('KeyC', { delay: 70 });
    check(`${name} attack target menu`, await until(() => game.battle.state === 'target'));
    await press('KeyC', { delay: 70 });
    check(`${name} real attack displays 막힘`, await until(() => game.battle.enemies[0].popup?.text === '막힘', 12000));
    await shot(`${name}-00-blocked`);
    check(`${name} blocked attack deals zero`, await page.evaluate(() => game.battle.enemies[0].hp === 300));
    check(`${name} bullets begin`, await until(() => game.battle.state === 'bullets'));
    await fixture(`isolate-${name}-penalty`, 'Set soul invulnerability for ordinary hazards only to measure unavoidable finisher separately; pattern time and rendering remain real-time.', () => { game.battle.soul.invuln = 100; });
    check(`${name} natural pattern order`, await page.evaluate(i => game.battle.enemies[0].patternIdx === i + 1, index));
    check(`${name} selected expected pattern`, await page.evaluate(expected => {
      const e = game.battle.enemies[0]; return e.def.patterns[(e.patternIdx - 1) % e.def.patterns.length].type === expected;
    }, ['drum_bombard', 'drum_roll', 'drum_chain', 'drum_cross', 'drum_ring'][index % 5]));
    await shot(`${name}-01-warning`);
    check(`${name} visible lob`, await until(() => game.battle.bullets.some(b => b.shape === 'drum_lob')));
    await shot(`${name}-02-ordinary-lob`);
    if (name === 'cross') {
      check('cross barrels travel in opposing directions', await until(() => {
        const barrels = game.battle.bullets.filter(b => b.shape === 'drum_cross');
        return barrels.some(b => b.vx > 0) && barrels.some(b => b.vx < 0);
      }));
      await shot('cross-diagonal-barrels');
    }
    if (name === 'ring') {
      check('encirclement leaves two gaps in eight positions', await until(() => game.battle.bullets.filter(b => b.shape === 'drum_ring_fuse').length === 6));
      await shot('ring-encirclement-fuses');
    }
    check(`${name} ordinary resolution`, await until(() => game.battle.bullets.some(b => ['drum_roll', 'drum_blast'].includes(b.shape))));
    await shot(`${name}-03-ordinary-hit`);
    check(`${name} purple begins`, await until(() => game.battle.bullets.some(b => b.shape === 'drum_purple'), 12000));
    const sample = () => page.evaluate(() => {
      const b = game.battle, p = b.bullets.find(p => p.shape === 'drum_purple');
      const value = p && { age: p.age, x: p.x, y: p.y, t: b.t, box: b.board.rect, lastOrdinary: drumEvidence.lastOrdinary[b.enemies[0].patternIdx] };
      if (value) drumEvidence.flights.push(value);
      return value;
    });
    const first = await sample();
    check(`${name} ordinary hazards finish before quiet gap and purple`, Number.isFinite(first?.lastOrdinary) && first.t - first.age - first.lastOrdinary >= 1, JSON.stringify(first));
    await shot(`${name}-04-purple-start`);
    await page.waitForTimeout(1100);
    const middle = await sample();
    await shot(`${name}-05-purple-mid`);
    await page.waitForFunction(() => game.battle.bullets.some(b => b.shape === 'drum_purple' && b.age >= 2.4));
    const last = await sample();
    await shot(`${name}-06-purple-end`);
    const straightY = first && middle && first.y + (214 - first.y) * (middle.age - first.age) / (2.6 - first.age);
    check(`${name} purple arcs from hand then reaches center over2.6 seconds`, first?.age < 0.3 && middle?.age > 1 && middle.y < straightY - 20 && last?.age >= 2.4 && Math.hypot(last.x - 240, last.y - 214) < Math.hypot(first.x - 240, first.y - 214), JSON.stringify({ first, middle, last }));
    check(`${name} center fuse`, await until(() => game.battle.bullets.some(b => b.shape === 'drum_fuse')));
    await shot(`${name}-07-fuse`);
    check(`${name} blast or rescue interruption`, await until(() => game.battle.bullets.some(b => b.shape === 'drum_arena_blast') || game.battle.state === 'interlude'));
    await shot(`${name}-08-blast`);
    if (index === 7) {
      check('eighth actual enemy turn enters forced red scene withHPabove1', await until(() => game.battle.state === 'interlude' && game.battle.members[0].hp > 1 && game.battle.support.completedTurns === 8));
      const penalties = await page.evaluate(() => drumEvidence.penalties);
      check('eighth normal turn also ends with one20 penalty', penalties.length === 8 && penalties[7].amount === 20 && penalties[7].before[0] - penalties[7].after[0] === 20, JSON.stringify(penalties.at(-1)));
      await page.waitForFunction(() => game.battle.interlude.snapshot.phase === 'red-ramp' && game.battle.interlude.snapshot.time > 0.65);
      await shot('eighth-red-charge');
      check('eighth screen rip follows red charge', await until(() => game.battle.interlude.snapshot.phase === 'screen-rip'));
      await page.waitForTimeout(300);
      await shot('eighth-screen-tear');
      check('eighth screen rip reduces exactlyHP1 without down', await until(() => game.battle.interlude.snapshot.hit && game.battle.members[0].hp === 1 && !game.battle.members[0].down));
      await shot('eighth-hp1');
      break;
    }
    check(`${name} turn returns`, await until(() => game.battle.state === 'menu', 5000));
    const penalties = await page.evaluate(() => drumEvidence.penalties);
    check(`${name} exactly20 once despite invulnerability`, penalties.length === index + 1 && penalties[index].amount === 20 && penalties[index].invuln > 0 && penalties[index].before.every((h, i) => h - penalties[index].after[i] === 20), JSON.stringify(penalties.at(-1)));
    check(`${name} presentation and hazards clear`, await page.evaluate(() => !game.battle.enemies[0].patternPose && !game.battle.bullets.length));
    check(`${name} completed enemy turn counted once and no premature rescue`, await page.evaluate(turn => game.battle.support.completedTurns === turn && !game.battle.interlude && !game.battle.support.rescued, index + 1));
    await until(() => game.battle.typed);
    await shot(`${name}-09-return`);
  }
  if (process.env.DRUM_CAPTURE_ONLY === '1') return;
  const phase = async name => {
    check(`rescue ${name}`, await page.waitForFunction(value => drumSnapshot()?.phase === value, name, { timeout: 12000 }).then(() => true));
    return page.evaluate(() => drumSnapshot());
  };
  const line = async (text, capture) => {
    await page.waitForFunction(value => game.battle.text === value && game.battle.typed, text);
    if (capture) await shot(capture);
    await press('KeyC', { delay: 70 });
  };
  await phase('narration');
  check('rescue narration does not advance Yoplait home', await page.evaluate(home => game.battle.members[0].home.every((value, index) => value === home[index]), initialHome));
  const bodyHeights = await page.evaluate(async () => {
    const { DRUM_DEVIL_RESCUE: R } = await import('/src/data/drum-devil-rescue.js');
    const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 246;
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    const height = () => {
      const pixels = ctx.getImageData(0, 0, 480, 246).data;
      let top = 246, bottom = 0;
      for (let y = 0; y < 246; y++) for (let x = 0; x < 480; x++) if (pixels[(y * 480 + x) * 4 + 3] > 10) { top = Math.min(top, y); bottom = Math.max(bottom, y + 1); }
      return bottom - top;
    };
    const member = { ...game.battle.members[0], action: null, popup: null };
    game.battle.drawMember(ctx, member); const regular = height();
    const poses = {};
    for (const key of ['kneel', 'surprised', 'lookback']) {
      const def = R[key], image = await new Promise((resolve, reject) => {
        const asset = new Image(); asset.onload = () => resolve(asset); asset.onerror = reject; asset.src = def.src;
      });
      ctx.clearRect(0, 0, 480, 246);
      ctx.drawImage(image, 0, 0, def.cell, def.cell,
        Math.round(game.battle.members[0].home[0] - def.pivot[0] * def.scale), Math.round(game.battle.members[0].home[1] - def.pivot[1] * def.scale),
        Math.round(def.cell * def.scale), Math.round(def.cell * def.scale));
      poses[key] = height();
    }
    return { regular, ...poses };
  });
  check('rescue body poses match regular Yoplait scale', bodyHeights.regular >= bodyHeights.surprised - 2
    && bodyHeights.regular >= bodyHeights.lookback - 2 && bodyHeights.regular - bodyHeights.kneel <= 13
    && Math.abs(bodyHeights.regular - bodyHeights.surprised) <= 8
    && Math.abs(bodyHeights.regular - bodyHeights.lookback) <= 8, JSON.stringify(bodyHeights));
  check('kneel at HP1 and battle music stops', await page.evaluate(() => drumSnapshot().pose === 'kneel' && game.battle.members[0].hp === 1 && !game.sound.bgmName));
  await line('... 너무나도 강력하다', 'rescue-01-kneel');
  await line('저녀석을 쓰러트릴 방법은 아무래도 없는 것 같다.', 'rescue-02-narration');
  await line('이렇게 나의 운명은 끝나는 것일까.', 'rescue-03-fate');
  await phase('silence');
  const silentAt = Date.now();
  await page.waitForTimeout(1500);
  check('two-second silence keeps camera fixed', await page.evaluate(() => drumSnapshot().phase === 'silence' && drumSnapshot().camera === 0));
  await phase('flag');
  check('flag begins after two seconds', Date.now() - silentAt >= 1850);
  await shot('rescue-04-flag-start');
  await page.waitForFunction(() => drumSnapshot()?.flagImpact?.flash > 0.25);
  check('flag contact starts white flash', await page.evaluate(() => drumSnapshot().hit && drumSnapshot().flagImpact.flash > 0));
  await shot('rescue-05-flag-hit');
  check('flag hit recoils and shakes the boss', await until(() => drumSnapshot()?.flagImpact?.recoil > 1 && Math.abs(drumSnapshot().flagImpact.shake) > 0.1));
  const bossHitBounds = await page.evaluate(async () => {
    const { DRUM_DEVIL_RESCUE: R } = await import('/src/data/drum-devil-rescue.js');
    const battle = game.battle, enemy = battle.enemies[0], canvas = document.createElement('canvas');
    canvas.width = 480; canvas.height = 246;
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.translate(R.flagImpact.heldRecoil + R.flagImpact.recoil + R.flagImpact.rightShakeLimit, 0);
    ctx.translate(enemy.x, enemy.y - 110); ctx.rotate(R.flagImpact.lean); ctx.translate(-enemy.x, -enemy.y + 110);
    battle.drawEnemy(ctx, { ...enemy, patternPose: { sheet: 'idle', frame: R.flagImpact.frame }, popup: null });
    const pixels = ctx.getImageData(0, 0, 480, 246).data;
    let left = 480, top = 246, right = 0, bottom = 0;
    for (let y = 0; y < 246; y++) for (let x = 0; x < 480; x++) if (pixels[(y * 480 + x) * 4 + 3] > 10) {
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
    }
    return { left, top, right, bottom };
  });
  check('strongest flag recoil and right shake keep boss inside viewport', bossHitBounds.left > 0 && bossHitBounds.top > 0 && bossHitBounds.right < 480, JSON.stringify(bossHitBounds));
  await shot('rescue-05b-recoil');
  const surprise = await phase('surprise');
  check('surprise right-facing pose before camera', surprise.pose === 'surprised' && surprise.camera === 0);
  await shot('rescue-06-surprise-right');
  const lookback = await phase('lookback');
  check('distinct left lookback before camera', lookback.pose === 'lookback' && lookback.camera === 0);
  await shot('rescue-07-lookback-left');
  const greeting = await phase('greeting');
  check('greeting bubble comes before the camera pan while the janitor is still offscreen', greeting.camera === 0 && greeting.zoom === 1 && greeting.heroScreenX < 0 && greeting.pose === 'lookback');
  await page.waitForTimeout(400);
  const greetingBubble = await page.evaluate(() => {
    const g = document.querySelector('canvas').getContext('2d'), data = g.getImageData(0, 0, 480 * (game.renderScale ?? 2), 246 * (game.renderScale ?? 2)).data, scale = game.renderScale ?? 2;
    let leftWhite = 0, rightWhite = 0;
    for (let y = 0; y < 246 * scale; y += 2) for (let x = 0; x < 480 * scale; x += 2) {
      const i = (y * 480 * scale + x) * 4;
      if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) { if (x < 200 * scale) leftWhite++; else rightWhite++; }
    }
    return { leftWhite, rightWhite };
  });
  check('greeting bubble sits at the left edge of the screen', greetingBubble.leftWhite > 400 && greetingBubble.leftWhite > greetingBubble.rightWhite * 3, JSON.stringify(greetingBubble));
  await line('도움이 필요한가?', 'rescue-07b-offscreen-greeting');
  await phase('reveal');
  await page.waitForTimeout(1150);
  check('far-left hero remains offscreen during early reveal', await page.evaluate(() => drumSnapshot().heroScreenX < 0));
  await shot('rescue-08a-far-offscreen');
  await page.waitForTimeout(1200);
  const pan = await page.evaluate(() => drumSnapshot());
  check('far-left slow reveal retains standing vertical-flag pose', pan.camera > 0.3 && pan.camera < 0.7 && pan.heroPose === 'stand');
  await shot('rescue-08-pan');
  const focused = await phase('focus');
  check('focus follows completed pan before the laugh', focused.camera === 1 && focused.heroPose === 'stand' && focused.zoom <= 0.88);
  const revealFeet = await page.evaluate(async () => { const { DRUM_DEVIL_RESCUE: R } = await import('/src/data/drum-devil-rescue.js'); return Math.round(R.revealZoom * R.hero.reveal[1]); });
  check('pulled-back camera shows the janitor about 20% lower than before (feet 165 → ~200) and inside the 246 panel', revealFeet >= 195 && revealFeet <= 210 && revealFeet + 12 < 246, String(revealFeet));
  await shot('rescue-09-focus');
  const laugh = await phase('laugh');
  check('laugh waits for focus shake to end', laugh.camera === 1 && laugh.shake === 0 && laugh.heroPose === 'laugh' && Math.abs(laugh.zoom - 0.88) < 0.001);
  check('hero theme starts as a loop', await page.evaluate(() => game.sound.bgmName === 'janitor_hero_intro' && game.sound.bgm.loop === true && game.sound.bgm.playbackRate === 1));
  await shot('rescue-11-laugh');
  await phase('introduction');
  await line('옛생각나서 옷을 갈아입었더니 마침 마주치는군', 'rescue-12-old-days');
  await line('붉은 군단의 전사.', 'rescue-13-warrior');
  await line('멸공의 깃발이라고 불렸었지.', 'rescue-14-flag-title');
  await phase('rise');
  check('introduction and ascent leave Yoplait in the same battle-start formation', await page.evaluate(home => game.battle.members[0].home.every((value, index) => value === home[index]), initialHome));
  await page.waitForFunction(() => drumSnapshot()?.phase === 'rise' && drumSnapshot().time >= 0.22);
  check('fast rise uses stand pose and moving camera', await page.evaluate(async () => { const { DRUM_DEVIL_RESCUE: R } = await import('/src/data/drum-devil-rescue.js'); return drumSnapshot().heroPose === 'stand' && drumSnapshot().heroY < R.hero.reveal[1] - 40 && drumSnapshot().camera < 1; }));
  await shot('rescue-15-rise');
  const returned = await phase('return');
  check('ascent completes in about half a second', returned.heroY <= -100);
  await shot('rescue-16-return-camera');
  await phase('hang');
  await shot('rescue-16b-dive-hold');
  await phase('dive');
  check('dive still stand pose', await page.evaluate(() => drumSnapshot().heroPose === 'stand'));
  await shot('rescue-17-dive');
  await phase('land');
  check('Cossack begins only on landing', await page.evaluate(() => drumSnapshot().heroPose === 'hero'));
  await shot('rescue-18-warm-impact');
  await phase('heal-talk');
  check('healing waits for its dialogue C while player remainsHP1', await page.evaluate(() => game.battle.members[0].hp === 1 && !drumSnapshot().healed));
  await line('많이 힘들어보이네?', 'rescue-18a-heal-offer');
  await phase('heal-raise');
  check('flag raise precedes actual healing', await page.evaluate(() => game.battle.members[0].hp === 1 && !drumSnapshot().healed));
  await page.waitForTimeout(180);
  await shot('rescue-18b-heal-flag');
  await phase('healing');
  check('flag heals to maximum and restores standing pose', await page.evaluate(() => {
    const member = game.battle.members[0];
    return member.hp === member.maxHp && !member.down && drumSnapshot().healed && drumSnapshot().pose === 'standing';
  }));
  await shot('rescue-18c-heal-effect');
  await phase('ready');
  const readyWrap = await page.evaluate(async () => {
    const { menuTextLines } = await import('/src/ui/menu-layout.js');
    const { FONT } = await import('/src/ui/font.js');
    const { DRUM_DEVIL_RESCUE: R } = await import('/src/data/drum-devil-rescue.js');
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = FONT.replace(/^\d+px/, `${R.speech.postLanding.fontSize}px`);
    return menuTextLines(ctx, R.ready[0].text, R.speech.postLanding.width - R.speech.pad * 2, 5);
  });
  check('compact ready bubble keeps Korean final punctuation attached', readyWrap.every(line => line.trim() !== ',' && !line.endsWith('…'))
    && readyWrap.join('').replaceAll(' ', '') === '자얼른저괴물을무찔러보게나,', JSON.stringify(readyWrap));
  check('landing heal happens exactlyonce without damage', await page.evaluate(() => drumEvidence.heals.length === 1 && drumEvidence.heals[0].before === 1 && drumEvidence.heals[0].after === game.battle.members[0].maxHp && drumEvidence.hits.every(hit => hit.damage === 0)), JSON.stringify(await page.evaluate(() => drumEvidence.heals)));
  await line('자 얼른 저 괴물을 무찔러보게나,', 'rescue-19-ready');
  check('exact support menu returns', await until(() => game.battle.state === 'menu' && game.battle.text === '* 멸공의 깃발이 함께한다.' && game.battle.support.rescued));
  check('rescued menu still uses unchanged battle-start formation', await page.evaluate(home => game.battle.members[0].home.every((value, index) => value === home[index]), initialHome));
  await until(() => game.battle.typed);
  await shot('rescue-20-menu');
  const formation = await page.evaluate(async () => {
    const { DRUM_DEVIL_RESCUE: R } = await import('/src/data/drum-devil-rescue.js');
    return { hero: R.hero.home, scale: R.hero.scale, player: game.battle.members[0].home, frames: R.hero.frameHolds.length };
  });
  // 2026-09-20 사용자: 요플래를 왼쪽으로(100) — 청소부(122)는 깃발이 왼쪽 가장자리(7px)라 못 옮겨 요플래 앞·같은 열(±32)에 선다
  // 2026-09-20 사용자: 대기(깃발 흔드는)·공격 몸은 20% 작게(0.736), 자리 x 112, 공격은 제자리(attackHome = home)
  check('hero formation stands in front of Yoplait within the party column at74percent scale', Math.abs(formation.hero[0] - formation.player[0]) <= 32 && formation.hero[1] > formation.player[1] && Math.abs(formation.scale - 0.92 * 0.8) < 1e-9, JSON.stringify(formation));
  await page.evaluate(x => { window.__heroHome = x; }, formation.hero[0]);
  check('eight dance frames configured', formation.frames === 8);
  for (let frame = 0; frame < formation.frames; frame++) {
    await page.waitForFunction(expected => drumDanceFrame() === expected, frame);
    await shot(`dance-leg-phase-${frame}`);
  }
  const sounds = await page.evaluate(() => drumEvidence.sounds.filter(s => s.phase));
  check('single flag impact laugh and landing audio calls', sounds.filter(s => s.phase === 'flag').length === 1 && sounds.filter(s => s.name === 'laugh_janitor').length === 1 && sounds.filter(s => s.name === 'impact').length === 1, JSON.stringify(sounds));
  for (const name of rescueOnly ? [] : assistOnly ? ['roll'] : supportOnly ? ['roll', 'chain', 'cross', 'ring', 'bombard'] : ['cross', 'ring', 'bombard', 'roll', 'chain']) {
    await fixture(`assist-${name}-isolation`, 'Restore bossHP300 and soloHP before testing each real posthero pattern; avoids killing the boss before all five interception paths are observed.', () => {
      game.battle.enemies[0].hp = 300;
      game.battle.members[0].hp = game.battle.members[0].maxHp;
    });
    const baseline = await page.evaluate(() => ({ hits: drumEvidence.hits.length, actions: drumEvidence.actions.length, sounds: drumEvidence.sounds.length, penalties: drumEvidence.penalties.length }));
    await press('KeyC', { delay: 70 });
    check(`${name} posthero C target menu`, await until(() => game.battle.state === 'target'));
    await press('KeyC', { delay: 70 });
    check(`${name} automatic hero attack begins`, await until(() => game.battle.support.actionSnapshot?.kind === 'janitor-attack', 10000));
    check(`${name} hero waits for player animation to finish`, await page.evaluate(() => !game.battle.members[0].action || game.battle.members[0].action.mode === 'idle'));
    await shot(`assist-${name}-01-windup`);
    check(`${name} hero windup attacks in place at home without stepping forward`, await until(() => game.battle.support.actionSnapshot?.frame === 1
      && game.battle.support.actionSnapshot.position.x === window.__heroHome));
    check(`${name} red energy releases before contact`, await until(() => game.battle.support.actionSnapshot?.energy && !game.battle.support.actionSnapshot.contacted));
    await shot(`assist-${name}-02-energy-flight`);
    check(`${name} hero contacts boss`, await until(() => game.battle.support.actionSnapshot?.kind === 'janitor-attack' && game.battle.support.actionSnapshot.contacted));
    await shot(`assist-${name}-03-contact`);
    const hits = await page.evaluate(offset => drumEvidence.hits.slice(offset), baseline.hits);
    check(`${name} ordinary damage plus exactlyone60 support hit`, hits.length === 2 && hits[0].source === 'ordinary' && hits[0].damage > 0 && hits[1].source === 'janitor' && hits[1].damage === 60, JSON.stringify(hits));
    check(`${name} hero hit lands after visible energy flight`, hits[1]?.action?.elapsed >= 1.2 && hits[1]?.action?.contacted);
    check(`${name} ranged contact reaches rendered enlarged boss pixels`, hits[1]?.renderedContact === true);
    check(`${name} enemy turn starts after automatic attack`, await until(() => game.battle.state === 'bullets' && !game.battle.gimmick, 8000));
    if (assistOnly) {
      check('assist returns to idle root without a lingering action', await page.evaluate(() => !game.battle.support.actionSnapshot));
      await shot('assist-settled-after-lunge');
      check('assist-only assets loaded', missingAssets.length === 0, JSON.stringify(missingAssets));
      return;
    }
    check(`${name} posthero selected expected pattern`, await page.evaluate(expected => {
      const e = game.battle.enemies[0]; return e.def.patterns[(e.patternIdx - 1) % 5].type === expected;
    }, `drum_${name}`));
    await fixture(`intercept-${name}-isolation`, 'Ordinary invulnerability isolates the automatic purple interception. No timer, projectile, hero action or support flags are changed.', () => { game.battle.soul.invuln = 100; });
    const beforeHP = await page.evaluate(() => game.battle.members[0].hp);
    check(`${name} real purple launch`, await until(() => game.battle.bullets.some(bullet => bullet.shape === 'drum_purple'), 12000));
    await page.evaluate(() => { window.observedPurple = game.battle.bullets.find(bullet => bullet.shape === 'drum_purple'); });
    await shot(`intercept-${name}-01-launch`);
    check(`${name} exclamation begins after one-second flight`, await until(() => game.battle.support.actionSnapshot?.phase === 'notice'));
    check(`${name} claim timing`, await page.evaluate(() => observedPurple.age >= 1 && observedPurple.age < 1.3 && observedPurple.intercepted && game.battle.support.interceptionActive));
    const noticeClearance = await page.evaluate(() => drumHeroNoticeClearance());
    check(`${name} all eight rendered notice hero frames clear opaque board`, noticeClearance.margin >= 3, JSON.stringify(noticeClearance));
    await shot(`intercept-${name}-02-notice`);
    check(`${name} teleport starts`, await until(() => game.battle.support.actionSnapshot?.phase === 'teleport-out'));
    await page.waitForFunction(() => game.battle.support.actionSnapshot?.elapsed >= 0.47);
    await shot(`intercept-${name}-03-teleport`);
    await page.waitForFunction(() => game.battle.support.actionSnapshot?.kind === 'janitor-intercept' && game.battle.support.actionSnapshot.frame === 2 && !game.battle.support.actionSnapshot.contacted);
    await shot(`intercept-${name}-03b-overhead`);
    check(`${name} actual original barrel deflects`, await until(() => {
      const b = game.battle;
      return b.support.actionSnapshot?.kind === 'janitor-intercept' && b.support.actionSnapshot.contacted
        && b.bullets.includes(observedPurple) && observedPurple.vx >= 480 && observedPurple.vy < -200
        && observedPurple.ax === 220 && observedPurple.ay === 280 && observedPurple.spin === 22 && !observedPurple.steer;
    }));
    const deflected = await page.evaluate(() => ({ x: observedPurple.x, y: observedPurple.y }));
    check(`${name} actual cloth contact aligns with original barrel`, await page.evaluate(async () => {
      const { JANITOR_HERO_ACTIONS: C } = await import('/src/data/janitor-hero-actions.js');
      const { DRUM_DEVIL_RESCUE: R } = await import('/src/data/drum-devil-rescue.js');
      const action = game.battle.support.actionSnapshot, scale = R.hero.scale ?? 1;
      return Math.abs(action.position.x + C.attack.contactOffset[0] * scale - action.contact.x) < 1
        && Math.abs(action.position.y + C.attack.contactOffset[1] * scale - action.contact.y) < 1;
    }));
    await shot(`intercept-${name}-04-deflect`);
    await page.waitForTimeout(120);
    check(`${name} barrel travels up and right after contact`, await page.evaluate(previous => observedPurple.x > previous.x && observedPurple.y < previous.y, deflected));
    check(`${name} hero laughs after deflection`, await until(() => game.battle.support.actionSnapshot?.phase === 'laugh'));
    await shot(`intercept-${name}-05-laugh`);
    check(`${name} hero teleports home`, await until(() => game.battle.support.actionSnapshot?.phase === 'return-out'));
    await page.waitForTimeout(80);
    await shot(`intercept-${name}-06-return`);
    check(`${name} normal C menu returns with clean support`, await until(() => game.battle.state === 'menu' && !game.battle.support.actionSnapshot && !game.battle.gimmick && !game.battle.support.interceptionActive, 6000));
    const evidence = await page.evaluate(base => ({ phases: drumEvidence.actions.slice(base.actions).filter(a => a.kind === 'janitor-intercept').map(a => a.phase),
      penalties: drumEvidence.penalties.length, forbidden: drumEvidence.postheroHazards.length,
      sounds: drumEvidence.sounds.slice(base.sounds).map(s => s.name), hp: game.battle.members[0].hp }), baseline);
    check(`${name} complete notice teleport attack laugh return sequence`, ['notice', 'teleport-out', 'teleport-in', 'attack', 'laugh', 'return-out', 'return-in', 'settle'].every(phase => evidence.phases.includes(phase)), JSON.stringify(evidence.phases));
    check(`${name} zero purple fuse blast or penalty after interception`, evidence.penalties === baseline.penalties && evidence.forbidden === 0 && evidence.hp === beforeHP, JSON.stringify(evidence));
    const geometry = await page.evaluate(() => ({ frames: Object.keys(drumEvidence.parryFrames[game.battle.enemies[0].patternIdx] || {}), clipped: drumEvidence.clippedFrames }));
    check(`${name} all six actual parry frames keep opaque pixels in viewport`, geometry.frames.length === 6 && geometry.clipped.length === 0, JSON.stringify(geometry));
    check(`${name} ranged swing and Asgore parry audio each playonce`, evidence.sounds.filter(s => s === 'rudebuster_swing').length === 1 && evidence.sounds.filter(s => s === 'asgore_spear_swing').length === 1 && evidence.sounds.filter(s => s === 'rudebuster_hit').length === 2 && evidence.sounds.filter(s => s === 'laugh_janitor').length === 1 && evidence.sounds.filter(s => s === 'spearappear').length === 2);
    check(`${name} posthero does not repeat rescue`, await page.evaluate(expected => game.battle.support.completedTurns === expected && !game.battle.interlude, supportOnly ? 0 : 8));
    await until(() => game.battle.typed);
    await shot(`intercept-${name}-07-menu`);
  }
  check('hero theme naturally wraps after46.760 seconds', await until(() => {
    const samples = drumEvidence.cue?.samples || [];
    return samples.some((sample, index) => index > 0 && samples[index - 1].time > 45 && sample.time < 2);
  }, 52000));
  const cuePlayback = await page.evaluate(() => {
    const cue = drumEvidence.cue;
    return { cue, current: game.sound.bgmName, currentTime: game.sound.bgm?.currentTime,
      stillSameAudio: game.sound.bgm === observedHeroCue,
      battleCues: drumEvidence.music.filter(event => event.name === 'drum_devil_battle' && event.time >= cue.startedAt) };
  });
  check('hero cue continues without restarting boss theme or audio object', cuePlayback.cue?.ended === undefined
    && cuePlayback.cue.loop === true && cuePlayback.cue.samples.length > 100
    && cuePlayback.cue.samples.every(sample => sample.rate === 1), JSON.stringify(cuePlayback));
  check('hero theme remains audible after natural wrap', cuePlayback.stillSameAudio
    && cuePlayback.battleCues.length === 0 && cuePlayback.current === 'janitor_hero_intro' && cuePlayback.currentTime > 0);
  await fixture('hero-lethal-boundary', 'Set enemy HP to exactly one ordinary player hit plus60, then use real C attack to verify automatic hero kill and victory; not a natural full win.', () => {
    game.battle.enemies[0].hp = game.attack + 60;
    window.victoryBattle = game.battle;
  });
  await fixture('pending-cue-before-victory', 'Retain the looping hero cue to probe stale ended callbacks after the upcoming real victory. A natural wrap was observed separately.', () => {
    game.battle.support.playHeroCue(); window.victoryCue = game.sound.bgm;
  });
  const lethalHits = await page.evaluate(() => drumEvidence.hits.length);
  await press('KeyC', { delay: 70 });
  await until(() => game.battle.state === 'target');
  await press('KeyC', { delay: 70 });
  check('automatic hero lethal hit reaches win rather than another enemy turn', await until(() => game.battle.state === 'win', 10000));
  const victoryHits = await page.evaluate(offset => drumEvidence.hits.slice(offset), lethalHits);
  check('lethal support applies exactly60 once', victoryHits.length === 2 && victoryHits[1].source === 'janitor' && victoryHits[1].damage === 60 && victoryHits[1].hp === 0, JSON.stringify(victoryHits));
  check('victory clears support action and gimmick', await page.evaluate(() => !game.battle.support.actionSnapshot && !game.battle.gimmick));
  await until(() => game.battle.typed && game.battle.t > 0.6);
  await shot('assist-lethal-victory');
  await press('KeyC', { delay: 70 });
  check('victory C returns to field', await until(() => !game.battle && game.lastBattle?.win, 8000));
  check('victory leaves no transient hero action', await page.evaluate(() => !victoryBattle.support.actionSnapshot && !victoryBattle.gimmick && !victoryBattle.interlude));
  const staleVictory = await fixture('late-ended-after-finish', 'Dispatch a deliberately synthetic late ended event on the canceled cue after real victory; this is an adversarial cleanup probe, not natural playback evidence.', () => {
    const before = drumEvidence.music.length; victoryCue.dispatchEvent(new Event('ended')); return drumEvidence.music.length === before;
  });
  check('finished battle cannot restart combat music from stale cue', staleVictory);
  await fixture('fresh-battle-for-reset-probe', 'Prepare a fresh ordinary battle to test reset cancellation independently from victory.', async () => {
    const { jjajang_nest_drum } = await import('/src/data/cutscenes/drum_devil.js');
    game.startBattle(jjajang_nest_drum.find(node => node.battle).battle);
  });
  await until(() => game.battle?.state === 'intro', 15000);
  const staleReset = await fixture('late-ended-after-reset', 'Start the cue, reset game state through its public reset handler, then dispatch a synthetic late ended event. No clock is accelerated.', () => {
    const battle = game.battle; battle.support.playHeroCue();
    const cue = game.sound.bgm; game.resetState(); const before = drumEvidence.music.length;
    cue.dispatchEvent(new Event('ended'));
    return !game.battle && !battle.support.actionSnapshot && drumEvidence.music.length === before;
  });
  check('reset cancels pending cue and transient action without BGM restart', staleReset);
  if (!rescueOnly) {
    await earlyThreshold();
    await earlyThreshold('purple');
  }
  check('all required drum and rescue assets loaded', missingAssets.length === 0, JSON.stringify(missingAssets));
});
