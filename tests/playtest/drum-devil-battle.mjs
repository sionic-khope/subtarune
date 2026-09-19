import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'drum-devil-battle', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, check, until, press, shot, fixture }) => {
  const missingAssets = [];
  page.on('response', response => { if (response.status() >= 400 && /drum-devil|janitor-hero|janitor-red|rudebuster|yoplait-(kneel|surprised|lookback)/.test(response.url())) missingAssets.push(response.url()); });
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
  await until(() => game.battle.typed);
  await shot('00-idle');
  await page.evaluate(async () => {
    const b = game.battle, hurt = b.hurtAllParty.bind(b), hit = b.hitEnemy.bind(b), sfx = b.sfx.bind(b), update = b.update.bind(b);
    const { JANITOR_HERO_ACTIONS: { attack } } = await import('/src/data/janitor-hero-actions.js');
    const attackImage = await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = attack.src; });
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
    window.drumEvidence = { penalties: [], flights: [], sounds: [], lastOrdinary: {}, hits: [], actions: [], postheroHazards: [], clippedFrames: [], parryFrames: {} };
    window.drumSnapshot = () => { const snapshot = b.interlude?.snapshot; return snapshot?.inner || snapshot; };
    b.hurtAllParty = amount => { const before = b.members.map(m => m.hp), invuln = b.soul.invuln; hurt(amount); drumEvidence.penalties.push({ amount, before, after: b.members.map(m => m.hp), invuln, t: b.t }); };
    b.hitEnemy = (enemy, by, damage, options) => {
      const before = enemy.hp, result = hit(enemy, by, damage, options);
      drumEvidence.hits.push({ source: options?.source || 'ordinary', damage: before - enemy.hp, hp: enemy.hp, action: b.support.actionSnapshot });
      return result;
    };
    b.sfx = (name, ...args) => { drumEvidence.sounds.push({ name, time: performance.now(), phase: drumSnapshot()?.phase }); return sfx(name, ...args); };
    b.update = (...args) => {
      const result = update(...args);
      if (b.state === 'bullets' && b.bullets.some(bullet => !['drum_mark', 'drum_purple', 'drum_fuse', 'drum_arena_blast'].includes(bullet.shape))) drumEvidence.lastOrdinary[b.enemies[0].patternIdx] = b.t;
      const action = b.support.actionSnapshot;
      const previous = drumEvidence.actions.at(-1);
      if (action && (!previous || previous.kind !== action.kind || previous.phase !== action.phase || action.elapsed < previous.elapsed)) {
        const purple = b.bullets.find(bullet => bullet.shape === 'drum_purple');
        drumEvidence.actions.push({ ...action, turn: b.enemies[0].patternIdx, barrelAge: purple?.age, playerIdle: !b.members[0].action || b.members[0].action.mode === 'idle' });
      }
      if (action?.kind === 'janitor-intercept' && action.phase === 'attack') {
        const box = frameBounds[action.frame], x = Math.round(action.position.x - attack.pivot[0]), y = Math.round(action.position.y - attack.pivot[1]);
        const bounds = { left: x + box.left, top: y + box.top, right: x + box.right, bottom: y + box.bottom };
        const turn = b.enemies[0].patternIdx;
        (drumEvidence.parryFrames[turn] ||= {})[action.frame] = true;
        if (bounds.left < 0 || bounds.top < 0 || bounds.right > 480 || bounds.bottom > 318) drumEvidence.clippedFrames.push({ turn, frame: action.frame, bounds, elapsed: action.elapsed });
      }
      if (b.support.rescued && b.bullets.some(bullet => ['drum_fuse', 'drum_arena_blast'].includes(bullet.shape))) drumEvidence.postheroHazards.push(b.t);
      return result;
    };
  });
  // A scoped support refresh enters the real rescue early without injecting phases.
  const supportOnly = process.env.DRUM_POSTHERO_ONLY === '1';
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
    await page.waitForTimeout(1300);
    const middle = await sample();
    await shot(`${name}-05-purple-mid`);
    await page.waitForFunction(() => game.battle.bullets.some(b => b.shape === 'drum_purple' && b.age >= 2.8));
    const last = await sample();
    await shot(`${name}-06-purple-end`);
    const straightY = first && middle && first.y + (214 - first.y) * (middle.age - first.age) / (3 - first.age);
    check(`${name} purple arcs from hand then reaches center over three seconds`, first?.age < 0.3 && middle?.age > 1.2 && middle.y < straightY - 20 && last?.age >= 2.8 && Math.hypot(last.x - 240, last.y - 214) < Math.hypot(first.x - 240, first.y - 214), JSON.stringify({ first, middle, last }));
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
  check('flag contacts boss', await until(() => drumSnapshot()?.hit));
  await shot('rescue-05-flag-hit');
  const surprise = await phase('surprise');
  check('surprise right-facing pose before camera', surprise.pose === 'surprised' && surprise.camera === 0);
  await shot('rescue-06-surprise-right');
  const lookback = await phase('lookback');
  check('distinct left lookback before camera', lookback.pose === 'lookback' && lookback.camera === 0);
  await shot('rescue-07-lookback-left');
  await phase('reveal');
  await page.waitForTimeout(1250);
  const pan = await page.evaluate(() => drumSnapshot());
  check('slow pan retains standing vertical-flag pose', pan.camera > 0.3 && pan.camera < 0.7 && pan.heroPose === 'stand');
  await shot('rescue-08-pan');
  const focused = await phase('focus');
  check('focus follows completed pan before greeting', focused.camera === 1 && focused.heroPose === 'stand' && focused.zoom <= 0.88);
  await shot('rescue-09-focus');
  const greeting = await phase('greeting');
  check('greeting waits for focus shake to end', greeting.camera === 1 && greeting.shake === 0 && greeting.heroPose === 'stand' && Math.abs(greeting.zoom - 0.88) < 0.001);
  check('hero music starts', await page.evaluate(() => game.sound.bgmName === 'janitor_hero'));
  await line('도움이 필요한가?', 'rescue-10-white-speech');
  const laugh = await phase('laugh');
  check('laugh uses dedicated pose', laugh.heroPose === 'laugh');
  await shot('rescue-11-laugh');
  await phase('introduction');
  await line('옛생각나서 옷을 갈아입었더니 마침 마주치는군', 'rescue-12-old-days');
  await line('붉은 군단의 전사.', 'rescue-13-warrior');
  await line('멸공의 깃발이라고 불렸었지.', 'rescue-14-flag-title');
  await phase('rise');
  await page.waitForTimeout(1000);
  check('rises in stand pose without Cossack', await page.evaluate(() => drumSnapshot().heroPose === 'stand' && drumSnapshot().heroY < 150));
  await shot('rescue-15-rise');
  await phase('return');
  await shot('rescue-16-return-camera');
  await phase('dive');
  check('dive still stand pose', await page.evaluate(() => drumSnapshot().heroPose === 'stand'));
  await shot('rescue-17-dive');
  await phase('land');
  check('Cossack begins only on landing', await page.evaluate(() => drumSnapshot().heroPose === 'hero'));
  await shot('rescue-18-warm-impact');
  await phase('ready');
  await line('자 얼른 저 괴물을 무찔러보게나,', 'rescue-19-ready');
  check('exact support menu returns', await until(() => game.battle.state === 'menu' && game.battle.text === '* 멸공의 깃발이 함께한다.' && game.battle.support.rescued));
  await until(() => game.battle.typed);
  await shot('rescue-20-menu');
  const sounds = await page.evaluate(() => drumEvidence.sounds.filter(s => s.phase));
  check('single flag impact laugh and landing audio calls', sounds.filter(s => s.name === 'hit').length === 1 && sounds.filter(s => s.name === 'laugh_janitor').length === 1 && sounds.filter(s => s.name === 'impact').length === 1, JSON.stringify(sounds));
  for (const name of supportOnly ? ['roll', 'chain', 'cross', 'ring', 'bombard'] : ['cross', 'ring', 'bombard', 'roll', 'chain']) {
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
    check(`${name} red energy releases before contact`, await until(() => game.battle.support.actionSnapshot?.energy && !game.battle.support.actionSnapshot.contacted));
    await shot(`assist-${name}-02-energy-flight`);
    check(`${name} hero contacts boss`, await until(() => game.battle.support.actionSnapshot?.kind === 'janitor-attack' && game.battle.support.actionSnapshot.contacted));
    await shot(`assist-${name}-03-contact`);
    const hits = await page.evaluate(offset => drumEvidence.hits.slice(offset), baseline.hits);
    check(`${name} ordinary damage plus exactlyone60 support hit`, hits.length === 2 && hits[0].source === 'ordinary' && hits[0].damage > 0 && hits[1].source === 'janitor' && hits[1].damage === 60, JSON.stringify(hits));
    check(`${name} hero hit lands after visible energy flight`, hits[1]?.action?.elapsed >= 1.2 && hits[1]?.action?.contacted);
    check(`${name} enemy turn starts after automatic attack`, await until(() => game.battle.state === 'bullets' && !game.battle.gimmick, 8000));
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
    await shot(`intercept-${name}-02-notice`);
    check(`${name} teleport starts`, await until(() => game.battle.support.actionSnapshot?.phase === 'teleport-out'));
    await shot(`intercept-${name}-03-teleport`);
    await page.waitForFunction(() => game.battle.support.actionSnapshot?.kind === 'janitor-intercept' && game.battle.support.actionSnapshot.frame === 2 && !game.battle.support.actionSnapshot.contacted);
    await shot(`intercept-${name}-03b-overhead`);
    check(`${name} actual original barrel deflects`, await until(() => {
      const b = game.battle;
      return b.support.actionSnapshot?.kind === 'janitor-intercept' && b.support.actionSnapshot.contacted
        && b.bullets.includes(observedPurple) && observedPurple.vx === 260 && observedPurple.vy === -170 && !observedPurple.steer;
    }));
    const deflected = await page.evaluate(() => ({ x: observedPurple.x, y: observedPurple.y }));
    await shot(`intercept-${name}-04-deflect`);
    await page.waitForTimeout(120);
    check(`${name} barrel travels up and right after contact`, await page.evaluate(previous => observedPurple.x > previous.x && observedPurple.y < previous.y, deflected));
    check(`${name} hero laughs after deflection`, await until(() => game.battle.support.actionSnapshot?.phase === 'laugh'));
    await shot(`intercept-${name}-05-laugh`);
    check(`${name} hero teleports home`, await until(() => game.battle.support.actionSnapshot?.phase === 'return-out'));
    await shot(`intercept-${name}-06-return`);
    check(`${name} normal C menu returns with clean support`, await until(() => game.battle.state === 'menu' && !game.battle.support.actionSnapshot && !game.battle.gimmick && !game.battle.support.interceptionActive, 6000));
    const evidence = await page.evaluate(base => ({ phases: drumEvidence.actions.slice(base.actions).filter(a => a.kind === 'janitor-intercept').map(a => a.phase),
      penalties: drumEvidence.penalties.length, forbidden: drumEvidence.postheroHazards.length,
      sounds: drumEvidence.sounds.slice(base.sounds).map(s => s.name), hp: game.battle.members[0].hp }), baseline);
    check(`${name} complete notice teleport attack laugh return sequence`, ['notice', 'teleport-out', 'teleport-in', 'attack', 'laugh', 'return-out', 'return-in', 'settle'].every(phase => evidence.phases.includes(phase)), JSON.stringify(evidence.phases));
    check(`${name} zero purple fuse blast or penalty after interception`, evidence.penalties === baseline.penalties && evidence.forbidden === 0 && evidence.hp === beforeHP, JSON.stringify(evidence));
    const geometry = await page.evaluate(() => ({ frames: Object.keys(drumEvidence.parryFrames[game.battle.enemies[0].patternIdx] || {}), clipped: drumEvidence.clippedFrames }));
    check(`${name} all six actual parry frames keep opaque pixels in viewport`, geometry.frames.length === 6 && geometry.clipped.length === 0, JSON.stringify(geometry));
    check(`${name} attack and intercept audio each playonce`, evidence.sounds.filter(s => s === 'rudebuster_swing').length === 2 && evidence.sounds.filter(s => s === 'rudebuster_hit').length === 2 && evidence.sounds.filter(s => s === 'laugh_janitor').length === 1);
    check(`${name} posthero does not repeat rescue`, await page.evaluate(expected => game.battle.support.completedTurns === expected && !game.battle.interlude, supportOnly ? 0 : 8));
    await until(() => game.battle.typed);
    await shot(`intercept-${name}-07-menu`);
  }
  await fixture('hero-lethal-boundary', 'Set enemy HP to exactly one ordinary player hit plus60, then use real C attack to verify automatic hero kill and victory; not a natural full win.', () => {
    game.battle.enemies[0].hp = game.attack + 60;
    window.victoryBattle = game.battle;
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
  await earlyThreshold();
  await earlyThreshold('purple');
  check('all required drum and rescue assets loaded', missingAssets.length === 0, JSON.stringify(missingAssets));
});
