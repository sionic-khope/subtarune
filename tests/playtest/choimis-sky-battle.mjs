import { runScenario } from './lib/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

async function runBuild299({ page, open, until, press, shot, check, fixture }) {
  const opening303 = process.env.QA_BUILD303_OPENING === '1';
  const scope = opening303 ? 'opening' : process.env.QA_BUILD299_SCOPE || 'flow';
  const evidence = { scope, source: [], samples: [], limitations: 'Registered QA battle and named preparation fixtures; real-time updates and physical keys. Critical combat stays at 1280px; real canvas start/mid/end frames are latched while running. Responsive375/768/1280 screenshots use safe waiting menus so capture latency cannot consume the shooting window. No natural story/full-boss-clear or human audio-hearing claim.' };
  const file = path.join(process.env.SHOT_DIR, `build${opening303 ? '303' : '299'}-${scope}.json`);
  const save = () => fs.writeFileSync(file, JSON.stringify(evidence, null, 2) + '\n');
  const files = ['src/battle/battle.js', 'src/battle/choimis-patterns-a.js', 'src/battle/choimis-jjajang.js', 'src/battle/choimis-patterns-b.js', 'src/battle/choimis-pink-rounds.js', 'src/battle/modes/choimis-pink-shooter.js', 'src/battle/modes/choimis-pink-round.js', 'src/data/enemies.js', 'src/data/build.js', 'assets/props/choimis-dao-kart.png', 'assets/props/choimis-bazzi-kart.png'];
  for (const relative of files) {
    const response = await page.request.get(new URL(relative, process.env.QA_BASE_URL).href);
    const hash = bytes => createHash('sha256').update(bytes).digest('hex');
    const local = hash(fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, relative))), served = hash(await response.body());
    evidence.source.push({ relative, local, served }); check(`source binding ${relative}`, response.ok() && local === served);
  }
  await page.addInitScript(() => {
    window.__qa299Videos = [];
    const create = document.createElement.bind(document);
    document.createElement = (...args) => { const element = create(...args); if (args[0] === 'video') window.__qa299Videos.push(element); return element; };
  });
  const state = () => page.evaluate(() => {
    const b = game.battle, v = window.__qa299Videos.at(-1);
    return { state: b?.state, mode: b?.activeEnemyMode, snapshot: b?.gimmick?.snapshot, hp: b?.enemies[0]?.hp,
      index: b?.enemies[0]?.patternIdx, boosted: b?.enemies[0]?.defenseBoosted,
      party: b?.members.map(m => ({ hp: m.hp, maxHp: m.maxHp, down: m.down })),
      patterns: b?.patterns.map(p => ({ type: window.__qa299.activeType, t: p.t })),
      bullets: b?.bullets.map(q => ({ shape: q.shape, text: q.text, order: q.order, age: q.age, x: q.x, y: q.y, warn: q.warn, vx: q.vx, vy: q.vy })),
      media: v ? { time: v.currentTime, duration: v.duration, paused: v.paused, muted: v.muted, volume: v.volume, frames: v.getVideoPlaybackQuality?.().totalVideoFrames, src: v.getAttribute('src') } : null };
  });
  const record = async label => { const value = await state(); evidence.samples.push({ label, value }); save(); return value; };
  const responsive = async label => { for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: width === 375 ? 812 : width === 768 ? 1024 : 800 }); await shot(`${scope}-${label}-${width}`); } };
  await page.setViewportSize({ width: 1280, height: 800 });
  await open({ qa: 'choimis_eating' });
  check('existing direct battle route loaded', await until(() => game.battle?.state === 'intro', 30000));
  await fixture('build299-battle-preparation', 'Reuse existing direct QA battle. Select standard opening for flow/opening; skip only the already-covered opening for isolated pattern scopes. Observe actual damage/audio/render calls without changing game time, HP, projectiles or input.', ({ opening, opening303 }) => {
    const b = game.battle, q = window.__qa299 = { hits: [], sfx: [], samples: [], labels: [], audio: [], frames: {}, canvasSize: [game.canvas.width, game.canvas.height] };
    b.cfg.openingMode = 'choimis_pink_shooter';
    if (!opening) { b.openingShown = true; b.enemies[0].defenseBoosted = true; }
    const hit = b.hitEnemy.bind(b), sfx = b.sfx.bind(b), update = b.update.bind(b);
    const beginBullets = b.beginBullets.bind(b);
    b.beginBullets = (...args) => { q.activeType = b.nextPatternConfig(b.enemies[0]).config.type; return beginBullets(...args); };
    const draw = b.draw.bind(b);
    b.draw = (...args) => {
      const result = draw(...args), s = b.gimmick?.snapshot;
      if (s?.damageIndicators?.length && !q.damageFrame) q.damageFrame = game.canvas.toDataURL('image/png');
      if (s?.scenario?.kind === 'kart_block' && s.scenario.blockers.some(k => k.boosted) && !q.kartFrame) q.kartFrame = game.canvas.toDataURL('image/png');
      const time = s?.phase === 'combat' ? s.combatElapsed : b.state === 'bullets' ? b.patterns[0]?.t : null;
      const duration = s?.phase === 'combat' ? s.duration || 12 : b.patterns[0]?.p.duration;
      if (Number.isFinite(time)) for (const [label, at] of [['start', 0.15], ['mid', duration / 2], ['end', duration - 0.3]]) {
        if (time >= at && !q.frames[label]) q.frames[label] = { time, viewport: [innerWidth, innerHeight], data: game.canvas.toDataURL('image/png') };
      }
      return result;
    };
    b.hitEnemy = (...args) => { const before = args[0].hp, result = hit(...args); q.hits.push({ before, after: args[0].hp, source: args[3]?.source, at: performance.now() }); return result; };
    b.sfx = (name, options) => { const result = sfx(name, options); q.sfx.push({ name, options, at: performance.now() }); return result; };
    const sound = game.sound.sfx.bind(game.sound);
    game.sound.sfx = (name, options) => { const audio = sound(name, options); if (['laser_beam', 'choimis_chosouya', 'pop', 'kart_booster'].includes(name)) { const entry = { name, options, src: audio?.src, at: performance.now(), samples: [] }; q.audio.push(entry); for (const delay of name === 'choimis_chosouya' ? [80, 400, 1400, 1800, 2100] : [80, 180, 400]) setTimeout(() => entry.samples.push({ delay, time: audio?.currentTime, duration: audio?.duration, paused: audio?.paused, ended: audio?.ended, volume: audio?.volume, phase: b.gimmick?.snapshot?.phase }), delay); } return audio; };
    b.update = (...args) => { const result = update(...args); const s = b.gimmick?.snapshot; if (s || b.state === 'bullets') q.samples.push({ at: performance.now(), state: b.state, mode: b.activeEnemyMode, hp: b.enemies[0]?.hp, snapshot: s, patterns: b.patterns.map(p => ({ type: q.activeType, t: p.t })), bullets: b.bullets.map(x => ({ shape: x.shape, text: x.text, order: x.order, x: x.x, y: x.y, age: x.age, warn: x.warn, arcHeight: x.arcHeight })) }); return result; };
    if (opening303) {
      q.openingFrames = {}; q.openingUpdates = [];
      const startMode = b.startEnemyMode.bind(b);
      b.startEnemyMode = (name, ...args) => {
        if (name === 'choimis_pink_shooter') { q.initialBoard = { ...b.board.rect }; q.initialSoul = { x: b.soul.x, y: b.soul.y }; }
        return startMode(name, ...args);
      };
      const observedUpdate = b.update.bind(b), drawGame = game.draw.bind(game);
      b.update = (...args) => {
        const result = observedUpdate(...args);
        if (b.activeEnemyMode === 'choimis_pink_shooter' && b.gimmick !== q.openingMode) {
          q.openingMode = b.gimmick;
          const updateMode = b.gimmick.update.bind(b.gimmick);
          b.gimmick.update = (...args) => {
            const done = updateMode(...args), snapshot = q.openingMode.snapshot;
            q.openingUpdates.push({ at: performance.now(), done, snapshot });
            q.lastOpening = snapshot;
            return done;
          };
        }
        return result;
      };
      game.draw = (...args) => {
        const result = drawGame(...args), s = q.lastOpening;
        if (!s) return result;
        const capture = name => {
          if (!q.openingFrames[name]) q.openingFrames[name] = { at: performance.now(), captureSurface: 'after full Game.draw', state: b.state, mode: b.activeEnemyMode, snapshot: s, hp: b.enemies[0].hp, boosted: b.enemies[0].defenseBoosted, board: { ...b.board.rect }, soul: { x: b.soul.x, y: b.soul.y }, viewport: [innerWidth, innerHeight], dimensions: [game.canvas.width, game.canvas.height], data: game.canvas.toDataURL('image/png') };
        };
        if (s.phase === 'combat' && s.combatElapsed >= 0.15) capture('start');
        if (s.phase === 'tail') capture('deadline');
        if (s.phase === 'tail' && s.shots.length > 0) capture('tail-player-shot');
        if (s.phase === 'settle' && s.shots.length > 0) capture('settle-player-shot');
        if (b.state === 'interlude') capture('interlude');
        if (b.state === 'menu') capture('menu');
        return result;
      };
    }
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, ...args) { if (String(text).startsWith('-')) q.labels.push({ text, x: args[0], y: args[1], hp: b.enemies[0]?.hp, at: performance.now() }); return fill.call(this, text, ...args); };
  }, { opening: scope === 'flow' || scope === 'opening', opening303 });
  for (let i = 0; i < 30 && !await page.evaluate(() => ['menu', 'enemy-mode'].includes(game.battle.state)); i++) { await press('KeyC', { delay: 70 }); await page.waitForTimeout(180); }
  if (opening303) {
    evidence.limitations = 'BUILD303 opening only, 1280px: existing choimis_eating QA entry changes openingMode before real intro C inputs. Real elapsed time and physical direction/C keys; no HP/time/projectile/result injection. No old pattern loops, natural story/full-boss-clear or human audio-hearing claim.';
    check('opening303: actual opening enters combat', await until(() => game.battle?.gimmick?.snapshot?.phase === 'combat', 10000));
    await page.keyboard.down('ArrowUp'); await page.waitForTimeout(600); await page.keyboard.up('ArrowUp');
    check('opening303: twelve-second deadline retains live hazards in tail', await until(() => game.battle?.gimmick?.snapshot?.phase === 'tail', 15000));
    const deadlineState = await record('opening-deadline');
    const s = deadlineState.snapshot;
    if (s?.phase === 'tail' && s.noodles.length) {
      const candidates = Array.from({ length: 125 }, (_, i) => 97 + i);
      const target = candidates.reduce((best, y) => Math.min(...s.noodles.map(n => Math.abs(n.y - y))) > Math.min(...s.noodles.map(n => Math.abs(n.y - best))) ? y : best, candidates[0]);
      const key = target > s.heart.y ? 'ArrowDown' : 'ArrowUp';
      await page.keyboard.down(key); await page.waitForTimeout(Math.abs(target - s.heart.y) / 126 * 1000); await page.keyboard.up(key);
    }
    check('opening303: tail keeps running with late hazards', await until(() => { const s = game.battle?.gimmick?.snapshot; return s?.phase === 'tail' && s.tailElapsed >= 1.5; }, 3000));
    await press('KeyC', { delay: 70 });
    check('opening303: physical tail C release creates a player shot', await until(() => !!window.__qa299.openingFrames['tail-player-shot'], 1500));
    check('opening303: natural cleanup reaches defense dialogue', await until(() => game.battle?.state === 'interlude' && game.battle.typed, 6500));
    await record('opening-interlude');
    await press('KeyC', { delay: 70 });
    check('opening303: defense result is readable', await until(() => game.battle?.interlude?.snapshot?.phase === 'result' && game.battle.typed, 10000));
    await press('KeyC', { delay: 70 });
    check('opening303: real confirmation restores menu', await until(() => game.battle?.state === 'menu' && !!window.__qa299.openingFrames.menu, 5000));
    const menu = await record('opening-menu');
    const observed = await page.evaluate(() => ({ frames: window.__qa299.openingFrames, updates: window.__qa299.openingUpdates, initialBoard: window.__qa299.initialBoard, initialSoul: window.__qa299.initialSoul, hits: window.__qa299.hits, disposed: window.__qa299.openingMode?.snapshot.disposed }));
    evidence.samples.push({ label: 'opening-updates-before-disposal', value: observed.updates });
    const samples = observed.updates.map(entry => entry.snapshot), deadline = samples.find(s => s.phase === 'tail'), done = observed.updates.find(entry => entry.done);
    const tail = samples.filter(s => ['tail', 'settle', 'done'].includes(s.phase));
    check('opening303: combat stops at twelve seconds with outstanding noodles', deadline?.combatElapsed === 12 && deadline.noodles.length > 0);
    check('opening303: deadline forbids new hazards while existing hazards drain', tail.length > 1 && !!deadline && tail.every(s => s.combatElapsed === 12 && s.spawned === deadline.spawned && s.noodles.every(noodle => deadline.noodles.some(original => original.id === noodle.id))) && tail.at(-1).noodles.length === 0);
    check('opening303: settle retains the late player shot after hazards finish', samples.some(s => s.phase === 'settle' && s.noodles.length === 0 && s.shots.length > 0));
    check('opening303: completion waits for shots, hazards and effects to drain naturally', done?.snapshot.phase === 'done' && done.snapshot.shots.length === 0 && done.snapshot.noodles.length === 0 && done.snapshot.effects.length === 0 && observed.disposed);
    check('opening303: defense and menu occur after mode completion', !!done && observed.frames.interlude?.at >= done.at && observed.frames.menu?.at > observed.frames.interlude?.at);
    check('opening303: return preserves boss HP250 and enables defense', menu.hp === 250 && menu.boosted === true && !menu.mode && observed.hits.length === 0);
    const restored = observed.frames.interlude;
    check('opening303: disposal restores original board and soul', !!restored && ['x', 'y', 'w', 'h'].every(key => restored.board[key] === observed.initialBoard[key]) && restored.soul.x === observed.initialSoul.x && restored.soul.y === observed.initialSoul.y);
    for (const name of ['start', 'deadline', 'tail-player-shot', 'settle-player-shot', 'interlude', 'menu']) {
      const frame = observed.frames[name]; check(`opening303: full Game.draw ${name} frame`, !!frame);
      if (!frame) continue;
      const { data, ...metadata } = frame, bytes = Buffer.from(data.split(',')[1], 'base64');
      const capture = path.join(process.env.SHOT_DIR, `opening303-${name}-canvas.png`); fs.writeFileSync(capture, bytes);
      evidence.samples.push({ label: name, canvasCapture: capture, sha256: createHash('sha256').update(bytes).digest('hex'), ...metadata });
    }
    save(); return;
  }
  if (scope === 'flow') {
    check('opening enters standard pink shooter', await until(() => game.battle?.activeEnemyMode === 'choimis_pink_shooter', 5000));
    await shot('flow-opening-start-1280');
    check('opening reaches combat', await until(() => game.battle?.gimmick?.snapshot?.phase === 'combat', 9000));
    const started = Date.now(); await page.waitForTimeout(5500); await shot('flow-opening-mid-1280');
    check('12-second combat reaches defense dialogue', await until(() => game.battle?.state === 'interlude' && game.battle.typed, 16000));
    const samples = await page.evaluate(() => window.__qa299.samples.filter(s => s.snapshot?.phase === 'combat' && s.mode === 'choimis_pink_shooter'));
    check('opening lasts 12 seconds, not 15', samples.length > 0 && Math.max(...samples.map(s => s.snapshot.combatElapsed)) >= 11.8 && Math.max(...samples.map(s => s.snapshot.combatElapsed)) <= 12 && Date.now() - started >= 11500);
    await press('KeyC', { delay: 70 });
    check('defense result becomes fully readable', await until(() => game.battle?.interlude?.snapshot?.phase === 'result' && game.battle.typed, 10000));
    await press('KeyC', { delay: 70 });
    check('defense dialogue real input returns to menu', await until(() => game.battle?.state === 'menu', 5000));
    await responsive('opening-end');
  }
  check('battle ready for real turn inputs', await until(() => game.battle?.state === 'menu', 7000));
  const queue = async () => {
    for (let member = 0; member < 3; member++) {
      await page.evaluate(i => window.__qa299.member = i, member);
      if (!await until(() => game.battle?.state === 'menu' && game.battle.memberIdx === window.__qa299.member, 5000)) throw new Error('member menu missing');
      await press('KeyC', { delay: 70 }); if (!await until(() => game.battle.state === 'target', 3000)) throw new Error('target missing'); await press('KeyC', { delay: 70 });
    }
    if (!await until(() => ['enemy-prep', 'enemy-mode', 'bullets'].includes(game.battle?.state), 8000)) throw new Error('enemy turn missing');
  };
  const select = async type => fixture(`select-${type}`, 'Select a registered config using its current alternating turn bucket; restore party HP only between rounds. No projectile, hit, time or completion injection.', type => {
    const b = game.battle, e = b.enemies[0], config = e.def.patterns.find(p => p.type === type);
    if (!config) throw new Error(`No registered ${type}`);
    e.hp = e.maxHp;
    for (e.patternIdx = 0; e.patternIdx < 128 && b.nextPatternConfig(e).config?.type !== type; e.patternIdx++);
    if (e.patternIdx === 128) throw new Error(`No reachable registered ${type}`);
    b.members.forEach(m => { m.hp = m.maxHp; m.down = false; }); window.__qa299.samples = []; window.__qa299.hits = []; window.__qa299.sfx = []; window.__qa299.labels = [];
  }, type);
  const aimChoso = async () => {
    const current = await state(), s = current.snapshot;
    if (s?.phase !== 'combat') return false;
    const flight = (s.scenario.boss.x - s.heart.x - 11) / 410;
    let travel = 0, target = s.heart.y;
    for (let i = 0; i < 3; i++) { target = 159 + 38 * Math.sin((s.combatElapsed + flight + travel) * Math.PI / 2); travel = Math.abs(target - s.heart.y) / 126; }
    const key = target > s.heart.y ? 'ArrowDown' : 'ArrowUp';
    await page.keyboard.down(key); await page.waitForTimeout(travel * 1000); await page.keyboard.up(key);
    return !!await page.evaluate(() => game.battle?.gimmick?.snapshot?.phase === 'combat');
  };
  const types = scope === 'flow' ? await page.evaluate(() => {
    const b = game.battle, e = b.enemies[0];
    return Array.from({ length: 4 }, (_, offset) => b.nextPatternConfig({ ...e, patternIdx: e.patternIdx + offset }).config.type);
  }) : scope === 'patterns' ? ['choimis_jjajang', 'choimis_choso', 'choimis_rap'] : ['choimis_pink_choso', 'choimis_pink_kart', 'choimis_pink_prism'];
  for (const [index, type] of types.entries()) {
    if (scope !== 'flow') await select(type);
    else if (index > 0) await fixture('between-turn-hp', 'Restore party HP between naturally sequenced turns only, to isolate alternation from accumulated damage; do not change turn index.', () => game.battle.members.forEach(m => { m.hp = m.maxHp; m.down = false; }));
    await page.evaluate(() => { const q = window.__qa299; q.samples = []; q.hits = []; q.sfx = []; q.labels = []; q.audio = []; q.frames = {}; q.damageFrame = null; q.kartFrame = null; });
    const before = await record(`${type}-before`); await queue();
    check(`${type}: normal three party attacks deal 9 total after defense`, (await state()).hp === before.hp - 9);
    const pink = type.includes('_pink_');
    check(`${type}: actual sequential turn matches expected mode`, await until(() => {
      const b = game.battle; return b?.activeEnemyMode === 'choimis_pink_round' || b?.state === 'bullets';
    }, 8000));
    const active = await record(`${type}-active`);
    check(`${type}: expected registered type reached`, pink ? active.mode === 'choimis_pink_round' && active.snapshot?.scenario?.kind === type.replace('choimis_pink_', '').replace('kart', 'kart_block').replace('prism', 'pink_prism') : active.patterns.some(p => p.type === type));
    if (pink) check(`${type}: combat begins`, await until(() => game.battle?.gimmick?.snapshot?.phase === 'combat', 7000));
    const roundStart = Date.now(); let chargedHp = null;
    if (type === 'choimis_pink_choso') {
      await page.keyboard.down('KeyC');
      check('choso: charged shot becomes ready after real hold', await until(() => game.battle?.gimmick?.snapshot?.charge?.ready, 1600));
      const current = await state(); await aimChoso();
      await page.keyboard.up('KeyC'); await page.waitForTimeout(1000);
      const charged = await record('choso-charged-contact');
      check('choso: actual charged boss contact deals exactly one HP', charged.hp === current.hp - 1);
      chargedHp = charged.hp;
    }
    while (Date.now() - roundStart < 25000 && !await page.evaluate(() => ['menu', 'lose'].includes(game.battle?.state))) {
      const sample = await record(`${type}-live`);
      if (pink && sample.snapshot?.scenario?.kind === 'choso' && sample.hp >= chargedHp) {
        if (await aimChoso()) { await press('KeyC', { delay: 70 }); await page.waitForTimeout(1000); }
      } else if (pink && sample.snapshot?.phase === 'combat') {
        const key = Math.floor((Date.now() - roundStart) / 800) % 2 ? 'ArrowUp' : 'ArrowDown';
        await page.keyboard.down(key); await page.waitForTimeout(190); await page.keyboard.up(key);
        if (sample.snapshot.scenario.kind !== 'choso' && await page.evaluate(() => game.battle?.gimmick?.snapshot?.phase === 'combat')) await press('KeyC', { delay: 70 });
      }
      await page.waitForTimeout(150);
    }
    const ended = await record(`${type}-end`); await responsive(`${type}-end`);
    check(`${type}: timed turn cleans up to menu`, ended.state === 'menu' && !ended.mode);
    const observed = await page.evaluate(() => window.__qa299); evidence.samples.push({ label: `${type}-observed`, value: observed }); save();
    for (const [label, frame] of Object.entries(observed.frames)) { const capture = path.join(process.env.SHOT_DIR, `${scope}-${type}-${label}-canvas.png`); fs.writeFileSync(capture, Buffer.from(frame.data.split(',')[1], 'base64')); evidence.samples.push({ label: `${type}-${label}`, canvasCapture: capture, time: frame.time, viewport: frame.viewport, dimensions: observed.canvasSize }); }
    check(`${type}: actual start/mid/end combat frames captured without pausing gameplay`, ['start', 'mid', 'end'].every(label => observed.frames[label]));
    for (const kind of ['damageFrame', 'kartFrame']) if (observed[kind]) { const capture = path.join(process.env.SHOT_DIR, `${scope}-${type}-${kind}-canvas.png`); fs.writeFileSync(capture, Buffer.from(observed[kind].split(',')[1], 'base64')); evidence.samples.push({ label: `${type}-${kind}`, canvasCapture: capture, dimensions: observed.canvasSize }); save(); }
    if (type === 'choimis_jjajang') {
      const bullets = observed.samples.flatMap(s => s.bullets), bowls = bullets.filter(b => b.shape === 'choimis_jjajang_bowl'), sauce = bullets.filter(b => b.shape === 'choimis_jjajang_splash');
      check('jjajang: straight and opposing bowl arcs plus telegraphed sauce droplets render', [0, 22, -22].every(arc => bowls.some(b => b.arcHeight === arc)) && sauce.some(b => b.age < b.warn) && sauce.some(b => b.age >= b.warn));
    }
    if (type === 'choimis_pink_choso') {
      const hits = observed.hits.filter(hit => hit.source === 'pink-shot');
      const pops = observed.sfx.filter(sound => sound.name === 'pop');
      const samples = observed.samples.filter(s => s.snapshot?.phase === 'combat');
      const cycle = samples.some((s, i) => i > 0 && s.hp === samples[i - 1].hp - 1 && samples[i - 1].snapshot.bossHits === 2 && s.snapshot.bossHits === 0);
      check('choso: three normal boss contacts produce exactly one damage after two retained contacts', cycle && hits.length >= 2 && hits.every(h => h.before - h.after === 1));
      const actualContacts = Math.max(...samples.map(s => s.snapshot.scenario.hits));
      check('choso: one Baron pop per actual contact, independent of missed shot attempts', actualContacts >= 4 && pops.length === actualContacts && pops.every(p => p.options?.volume === 0.384 && p.options?.rate === 0.8));
      const indicators = samples.filter(s => s.snapshot.damageIndicators.length);
      check('choso: local -1 indicators only accompany actual damage and track boss vicinity', indicators.length > 0 && indicators.every(s => s.snapshot.damageIndicators.every(d => d.text === '-1' && Math.abs(d.x - s.snapshot.scenario.boss.x) <= 35 && d.y < s.snapshot.scenario.boss.y)) && samples.every((s, i) => i === 0 || !s.snapshot.damageIndicators.length || samples[i - 1].snapshot.damageIndicators.length > 0 || s.hp < samples[i - 1].hp));
      const voice = observed.audio.find(a => a.name === 'choimis_chosouya'), transform = observed.samples.find(s => s.snapshot?.phase === 'transform');
      check('choso: recorded voice actually advances before transformation', voice?.samples.some(s => s.time > 1 && !s.paused && s.phase === 'prep') && transform?.at - voice.at >= 1650);
    }
    if (type === 'choimis_pink_kart') {
      const karts = observed.samples.flatMap(s => s.snapshot?.scenario?.blockers || []);
      check('kart: two vehicle identities roll through overlapping waves and boost', ['dao', 'bazzi'].every(kind => karts.some(k => k.kind === kind && k.boosted)) && observed.samples.some(s => new Set((s.snapshot?.scenario?.blockers || []).map(k => k.wave)).size >= 2));
    }
    if (type === 'choimis_choso') {
      const lasers = observed.audio.filter(a => a.name === 'laser_beam');
      check('choso: actual quieter laser plays briefly and is stopped', lasers.length > 0 && lasers.every(a => a.options.volume === 0.22 && a.options.len === 0.22) && lasers.some(a => a.samples.some(s => s.time > 0 && !s.paused && s.volume === 0.22)) && lasers.every(a => a.samples.some(s => s.delay === 400 && s.paused)));
    }
    if (type === 'choimis_rap') {
      const rap = observed.samples.filter(s => s.patterns.some(p => p.type === 'choimis_rap'));
      const early = rap.filter(s => s.patterns[0].t < 2.95), lyrics = new Map();
      for (const s of rap) for (const b of s.bullets.filter(b => b.shape === 'choimis_lyric')) if (!lyrics.has(b.order)) lyrics.set(b.order, b.text);
      const firstGlyph = rap.flatMap(s => s.bullets).find(b => b.shape === 'choimis_lyric');
      check('rap: telegraphed glyphs stay still until three seconds', early.length > 0 && firstGlyph && early.every(s => s.bullets.filter(b => b.shape === 'choimis_lyric').every(b => b.y === firstGlyph.y)));
      const glyphText = [...lyrics.entries()].sort((a,b) => a[0]-b[0]).map(x => x[1]).join(''), expected = '래퍼딱지를때는중이젠앰씨로예술가의길로!@#!@$!@#@#$포에버포에버';
      check('rap: burst glyphs repeat exact requested sentence with spacing omitted as falling glyphs', glyphText.length >= expected.length && glyphText === expected.repeat(Math.ceil(glyphText.length / expected.length)).slice(0, glyphText.length));
      const media = evidence.samples.filter(s => s.label === `${type}-live`).map(s => s.value.media).filter(Boolean);
      check('rap: actual video advances with audio across 19-second duration', media.some(v => v.time > 16 && !v.paused && !v.muted && v.volume > 0 && v.frames > 0 && Math.abs(v.duration - 19) < 0.2));
    }
    if (ended.state !== 'menu') throw new Error(`${type} did not survive to menu`);
  }
  if (scope === 'flow') {
    await fixture('loss-boundary', 'Inject lethal party damage only to reach retry cleanup after naturally alternating rounds.', () => game.battle.hurtAllParty(999));
    check('defeat reaches lose', await until(() => game.battle?.state === 'lose', 5000)); await page.waitForTimeout(2300); await press('KeyC', { delay: 70 });
    check('real retry key returns to ordinary intro', await until(() => game.battle?.state === 'intro', 9000));
    const retry = await record('retry'); check('retry resets HP and sequence', retry.hp === 200 && retry.index === 0 && retry.party.every(m => m.hp === m.maxHp && !m.down));
    await responsive('retry');
  }
  save();
}

const DIALOGUE = [
  '하이',
  '빨리 내려와라 씨발색끼',
  '어휴 하여간 다들 날 싫어하는이유가뭐야?',
  '어쨋든 곧 나는 점례에게 돌아갈거야',
  '너희들의 동기가 어떻게 됐든 난 상관없어',
  '나를 막을 순 없을것이다.',
  "형들이 무슨 대의를 위해 날 막는건진 모르겠지만. 난 '순애'다.",
  '순수한 나의 사랑을',
  '그리고. 이젠 달라진 나의 모습을.',
  '점례야.. 곧 해치우고 너에게 갈게',
  '내 힘을 받아라',
];

const PATTERNS = [
  { name: 'jjajang', index: 0, type: 'choimis_jjajang', source: 'A', shapes: ['choimis_jjajang_bowl'], warning: true },
  { name: 'choso', index: 2, type: 'choimis_choso', source: 'A', shapes: ['choimis_blood_beam'], warning: true },
  { name: 'money', index: 6, type: 'choimis_money', source: 'A', shapes: ['choimis_money_note'], warning: true },
  { name: 'rap', index: 4, type: 'choimis_rap', source: 'B', shapes: ['choimis_mic', 'choimis_lyric'], warning: true },
  { name: 'seup', index: 8, type: 'choimis_seup', source: 'B', shapes: ['choimis_miss'], warning: true },
  { name: 'fashion', index: 10, type: 'choimis_fashion', source: 'B', shapes: ['choimis_outfit'], warning: true },
];

const json = value => JSON.stringify(value, (key, item) => key === 'data' ? undefined : typeof item === 'number' ? Math.round(item * 1000) / 1000 : item);
const BUILD298 = process.env.QA_BUILD298 === '1';

await runScenario({ name: 'choimis-sky-battle', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async context => {
  if (process.env.QA_BUILD299 === '1' || process.env.QA_BUILD303_OPENING === '1') return runBuild299(context);
  const { page, open, until: rawUntil, press: rawPress, shot: rawShot, check: rawCheck, fixture } = context;
  page.setDefaultNavigationTimeout(30000);
  const evidencePath = path.join(process.env.SHOT_DIR, 'choimis-sky-runtime.json');
  const trace = { scenario: 'choimis-sky-battle', dialogue: [], phases: [], patterns: [], fixtures: [], observations: [] };
  fs.writeFileSync(evidencePath, JSON.stringify(trace, null, 2) + '\n');
  const save = () => fs.writeFileSync(evidencePath, JSON.stringify(trace, null, 2) + '\n');
  const check = (label, ok, detail = '') => rawCheck(label, ok, `${detail}${detail ? ' ' : ''}artifact=${evidencePath}`);
  if (process.env.QA_BUILD303_FIELD === '1') {
    trace.fieldSources = [];
    for (const relative of ['src/scenes/choimis-sky-intro.js', 'src/data/characters.js', 'src/data/build.js', 'assets/sprites/choimis_flower.png', 'assets/sprites/choimis.png', 'assets/portraits/choimis_flower.png', 'assets/enemies/choimis-flower-idle.png', 'assets/enemies/choimis-flower-raise.png']) {
      const response = await page.request.get(new URL(relative, process.env.QA_BASE_URL).href);
      const local = createHash('sha256').update(fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, relative))).digest('hex'), served = createHash('sha256').update(await response.body()).digest('hex');
      trace.fieldSources.push({ relative, local, served }); check(`BUILD303 field source ${relative}`, response.ok() && local === served);
    }
    save();
  }
  const shot = async name => { const file = await rawShot(name); trace.observations.push({ shot: file }); save(); return file; };
  const until = async (predicate, timeout = 10000) => rawUntil(predicate, timeout);
  const press = async key => rawPress(key, { delay: 70 });

  const snapshot = () => page.evaluate(() => {
    const g = window.game;
    const actor = id => {
      const e = id === 'player' ? g.player : g.entities.find(item => item.id === id && !item.dead);
      return e ? { id: e.id, x: e.x, y: e.y, w: e.w, h: e.h, visible: e.visible, facing: e.facing,
        hopY: e.hopY || 0, flyX: e.flyX || 0, flyY: e.flyY || 0, moving: e.moving, fallback: !!e.sprite?.fallback,
        frame: e.frame, motion: e.motion ? { scale: e.motion.scale, scaleY: e.motion.scaleY, index: e.motion.index, loop: e.motion.loop } : null } : null;
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
        enemies: b.enemies.map(e => ({ id: e.id, hp: e.hp, maxHp: e.maxHp, x: e.x, y: e.y, dead: e.dead, defenseBoosted: !!e.defenseBoosted, loaded: !!e.img, src: e.img?.src,
          actionLoaded: Object.fromEntries(Object.entries(e.actionImages || {}).map(([k, v]) => [k, !!v])), pose: e.patternPose ? { ...e.patternPose } : null,
          bullets: b.bullets?.map(q => ({ shape: q.shape, age: q.age, warn: q.warn, text: q.text, denomination: q.denomination, look: q.look, x: q.x, y: q.y })) || [] })),
        patterns: b.patterns?.map(p => ({ type: p?.type || null, elapsed: p?.t, duration: p?.p?.duration })) || [],
        bg: b.cfg.bg, cfgBgm: b.cfg.bgm } : null,
    };
  });
  const record = async label => { const value = await snapshot(); trace.observations.push({ label, value }); if (value.sky?.phase && !trace.phases.includes(value.sky.phase)) trace.phases.push(value.sky.phase); save(); return value; };


  const movePinkHeart = async target => {
    const y = await page.evaluate(() => window.game.battle?.gimmick?.snapshot?.heart?.y);
    if (!Number.isFinite(y)) return false;
    if (Math.abs(y - target) <= 2) return true;
    const up = target < y, key = up ? 'ArrowUp' : 'ArrowDown';
    await page.keyboard.down(key);
    await page.evaluate(({ target, up }) => { window.__choimisQa.moveTarget = { target, up }; }, { target, up });
    let reached = false;
    try {
      reached = !!(await until(() => {
        const y = window.game.battle?.gimmick?.snapshot?.heart?.y, move = window.__choimisQa.moveTarget;
        return Number.isFinite(y) && move && (move.up ? y <= move.target + 2 : y >= move.target - 2) ? true : null;
      }, 1800));
    } finally { await page.keyboard.up(key); }
    return reached;
  };
  const readPinkScenario = name => page.evaluate(name =>
    window.game.battle?.gimmick?.snapshot?.scenario?.kind === name
      ? window.game.battle.gimmick.snapshot.scenario : window.__choimisQa.roundLatches[name], name);
  const hitChoso = async () => {
    await movePinkHeart(159);
    let hits = 0, attempts = 0;
    while (hits < 6 && attempts < 60) {
      await press('KeyC'); await page.waitForTimeout(290); attempts++;
      hits = (await readPinkScenario('choso'))?.hits ?? hits;
    }
    return { hits, attempts };
  };
  const tapPinkBossCenter = async () => {
    await movePinkHeart(159);
    await press('KeyC');
    await page.waitForTimeout(380);
  };
  const fireKartCenterShots = async () => {
    const start = await page.evaluate(() => {
      const b = window.game.battle, mode = b?.gimmick, scenario = mode?.snapshot?.scenario;
      return { enemyHp: b?.enemies?.[0]?.hp, bossHits: mode?.snapshot?.bossHits ?? 0, hitSfx: window.__choimisQa.sfx.filter(sound => sound.name === 'hit').length, heartY: mode?.snapshot?.heart?.y, phase: mode?.snapshot?.phase, scenarioKind: scenario?.kind };
    });
    const shotTimes = [];
    await movePinkHeart(159);
    for (let index = 0; index < 3; index++) {
      shotTimes.push(await page.evaluate(() => performance.now()));
      await press('KeyC');
      await page.waitForTimeout(380);
    }
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => {
      const b = window.game.battle, mode = b?.gimmick, scenario = mode?.snapshot?.scenario;
      return { enemyHp: b?.enemies?.[0]?.hp, bossHits: mode?.snapshot?.bossHits ?? window.__choimisQa.roundLatches.kart_block?.bossHits ?? 0, hitSfx: window.__choimisQa.sfx.filter(sound => sound.name === 'hit').length, heartY: mode?.snapshot?.heart?.y, phase: mode?.snapshot?.phase, scenarioKind: scenario?.kind, blockers: scenario?.blockers?.length ?? window.__choimisQa.roundLatches.kart_block?.blockers?.length ?? 0 };
    });
    return {
      start,
      after,
      hpDrop: Number.isFinite(start.enemyHp) && Number.isFinite(after.enemyHp) && after.enemyHp < start.enemyHp,
      contactSfx: after.hitSfx - start.hitSfx,
      remainder: after.bossHits === 0,
      spacingMs: shotTimes.slice(1).map((time, index) => time - shotTimes[index]),
      flightWaitMs: 700,
    };
  };
  const checkKartCenterShots = async (shots, label) => {
    await shot(label);
    check('kart: three real center-lane normal shots contact the far-right boss before blocker movement', shots.start.scenarioKind === 'kart_block' && shots.start.phase === 'combat' && shots.start.heartY === 159 && shots.hpDrop && shots.contactSfx === 3 && shots.remainder && shots.spacingMs.every(value => value >= 300), json(shots));
    return shots;
  };
  const clearPrism = async () => {
    await movePinkHeart(159);
    let shields = 3, chargeShots = 0;
    while (shields > 0 && chargeShots < 12) {
      await page.keyboard.down('KeyC');
      try {
        const ready = await until(() => !!window.game.battle?.gimmick?.snapshot?.charge?.ready, 2400);
        if (!ready) break;
        const aligned = await until(() => {
          const state = window.game.battle?.gimmick?.snapshot, scenario = state?.scenario;
          if (!scenario?.shieldPositions?.length) return false;
          const flight = (scenario.core.x - 37 - (state.heart.x + 11)) / 410;
          return scenario.shieldPositions.some(point => {
            const angle = Math.atan2(point.y - scenario.core.y, point.x - scenario.core.x) + flight * 1.4 - Math.PI;
            return Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) < 0.18;
          });
        }, 5200);
        if (!aligned) break;
      } finally { await page.keyboard.up('KeyC'); }
      chargeShots++;
      await page.waitForTimeout(850);
      shields = (await readPinkScenario('pink_prism'))?.shields ?? shields;
    }
    let coreHits = 0, coreAttempts = 0;
    if (shields === 0) {
      await movePinkHeart(159);
      while (coreHits < 3 && coreAttempts < 12) {
        await press('KeyC'); await page.waitForTimeout(350); coreAttempts++;
        coreHits = (await readPinkScenario('pink_prism'))?.coreHits ?? coreHits;
      }
    }
    return { shields, coreHits, chargeShots, coreAttempts };
  };
  const saveRoundCapture = async key => {
    const capture = await page.evaluate(key => window.__choimisQa.roundCaptures[key], key);
    if (!capture?.data) { check(`actual rendered frame exists: ${key}`, false); return; }
    const file = path.join(process.env.SHOT_DIR, `${key}.png`);
    fs.writeFileSync(file, Buffer.from(capture.data.split(',')[1], 'base64'));
    trace.observations.push({ shot: file, label: key, snapshot: capture.snapshot }); save();
  };
  const saveDataUrl = async (name, frame) => {
    if (!frame?.data) { check(`actual rendered transition frame exists: ${name}`, false, json(frame)); return null; }
    const file = path.join(process.env.SHOT_DIR, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(frame.data.split(',')[1], 'base64'));
    trace.observations.push({ shot: file, label: name, frame: { ...frame, data: undefined } }); save();
    return file;
  };

  // The draw/audio observer records rendered intermediate states and actual calls without altering time, input, or battle durations.
  await open({ qa: 'choimis_sky' });
  check('real QA point loads the night cliff before any trigger input', await until(() => window.game?.mapId === 'jjajang_night_cliff' && !window.game.transitioning && !!window.game.player, 30000));
  await fixture('render-and-audio-observer', 'Observe the live canvas, sky phases, audio calls, BGM-clocked karaoke, and bullet render state. This does not fast-forward, change state, or replace input.', async () => {
    const g = window.game;
    const { choimisLyricAt } = await import('/src/battle/choimis-karaoke.js');
    window.__choimisQa = {
      sfx: [], bgm: [], phases: [], frames: [], draws: 0, lyricAt: choimisLyricAt,
      rapVideo: { starts: [], stops: [], frames: [] }, fashionFrames: {}, missActiveFrame: null,
      prepanSamples: [], chargeSamples: [], roundCaptures: {}, hintDraws: [], chargeFrames: {}, defenseFrames: {}, capeFrames: {}, roundLatches: {}, roundHistory: {},
      skyTransition: { rise: {}, risePending: {}, cape: {}, gatherLate: null, windHi: [], windAudio: { calls: [], samples: [] }, phaseFrames: {}, phasePending: {} }, audioTimeline: [], sceneVoices: { sexy: [], seup: [] },
      temporalCaptures: [42.364, 42.414, 42.484, 42.534, 42.634, 42.734].map(time => ({ time, data: null, actual: null, frame: null })),
      audioBoundaryCaptures: [58.121, 58.271, 58.421, 178.121, 178.271, 178.421].map(time => ({ time, data: null, actual: null, frame: null })),
    };
    const sound = g.sound;
    const sfx = sound.sfx.bind(sound), playBgm = sound.playBgm.bind(sound);
    sound.sfx = (name, options) => { const event = { name, at: performance.now(), options }; const result = sfx(name, options); window.__choimisQa.sfx.push(event); window.__choimisQa.audioTimeline.push({ kind: 'sfx', ...event }); if (name === 'whoosh') { window.__choimisQa.skyTransition.windAudio.calls.push(event); window.__choimisQa.skyTransition.windAudio.audio = result; } return result; };
    sound.playBgm = (name, options) => { const event = { name, at: performance.now(), options }; window.__choimisQa.bgm.push(event); window.__choimisQa.audioTimeline.push({ kind: 'bgm', ...event }); return playBgm(name, options); };
    const wrappedVoiceSources = new WeakSet();
    const wrapSceneVoices = () => {
      for (const [bucket, name] of [['sexy', 'choimis_flower_sexy'], ['seup', 'choimis_flower_seup']]) {
        const source = g.sound.files?.[name];
        if (!source || wrappedVoiceSources.has(source) || typeof source.cloneNode !== 'function') continue;
        const cloneNode = source.cloneNode.bind(source);
        source.cloneNode = (...cloneArgs) => {
          const clip = cloneNode(...cloneArgs);
          const event = { name, at: performance.now(), phase: g.choimisSky?.phase || null };
          window.__choimisQa.sceneVoices[bucket].push(event); window.__choimisQa.audioTimeline.push({ kind: 'voice', ...event });
          if (typeof clip.play === 'function') {
            const play = clip.play.bind(clip);
            clip.play = (...playArgs) => { event.playAt = performance.now(); return play(...playArgs); };
          }
          return clip;
        };
        wrappedVoiceSources.add(source);
      }
    };
    const originalGameUpdate = g.update.bind(g);
    g.update = (...args) => {
      wrapSceneVoices();
      const b = g.battle;
      if (b && !b.__choimisQaUpdateWrapped) {
        const originalBattleUpdate = b.update.bind(b);
        b.update = (...updateArgs) => {
          const mode = b.gimmick, modeName = b.activeEnemyMode;
          const result = originalBattleUpdate(...updateArgs);
          if (modeName === 'choimis_pink_round' && mode?.snapshot) {
            const scenario = mode.snapshot.scenario;
            if (scenario?.kind) {
              const enemy = b.enemies?.[0];
              const entry = { ...scenario, phase: mode.snapshot.phase, combatElapsed: mode.snapshot.combatElapsed, duration: mode.snapshot.duration, modeDone: !!mode.done, bossHits: mode.snapshot.bossHits ?? null,
                enemyHp: enemy?.hp, enemyDying: enemy?.dying, enemyDead: enemy?.dead };
              window.__choimisQa.roundLatches[scenario.kind] = entry;
              (window.__choimisQa.roundHistory[scenario.kind] ||= []).push(entry);
            }
          }
          return result;
        };
        b.__choimisQaUpdateWrapped = true;
      }
      if (b && !b.__choimisQaRapVideoWrapped) {
        const startRapVideo = b.startRapVideo.bind(b), stopRapVideo = b.stopRapVideo.bind(b);
        b.startRapVideo = (...videoArgs) => {
          const handle = startRapVideo(...videoArgs);
          if (handle?.draw && !handle.__choimisQaDrawWrapped) {
            const drawVideo = handle.draw.bind(handle);
            handle.draw = (...drawArgs) => {
              const drawn = drawVideo(...drawArgs);
              if (drawn) handle.__choimisQaLastDrawAt = performance.now();
              return drawn;
            };
            handle.__choimisQaDrawWrapped = true;
          }
          window.__choimisQa.rapVideo.starts.push({ at: performance.now(), options: videoArgs[0] || null, handle: !!handle });
          return handle;
        };
        b.stopRapVideo = (...videoArgs) => {
          if (videoArgs[0] || b.rapVideo) window.__choimisQa.rapVideo.stops.push({ at: performance.now(), hadHandle: true });
          return stopRapVideo(...videoArgs);
        };
        b.__choimisQaRapVideoWrapped = true;
      }
      const result = originalGameUpdate(...args);
      const sky = g.choimisSky, phase = sky?.phase, progress = Number(sky?.progress);
      const windAudio = window.__choimisQa.skyTransition.windAudio.audio;
      if (windAudio && (phase === 'rise' || phase === 'cape' || phase === 'weaponpull')) window.__choimisQa.skyTransition.windAudio.samples.push({ at: performance.now(), phase, progress, volume: Number(windAudio.volume), paused: !!windAudio.paused, src: windAudio.src || '' });
      if (phase && ['gather', 'cloud', 'rise'].includes(phase) && !window.__choimisQa.skyTransition.phasePending[phase]) {
        window.__choimisQa.skyTransition.phasePending[phase] = { at: performance.now(), phase, progress, pollen: sky.pollen?.length || 0, loosePetals: sky.loosePetals?.length || 0, windTime: sky.windTime || 0, camera: { x: g.camera.x, y: g.camera.y }, bossHopY: g.entities.find(entity => entity.id === 'choimis_sky_boss' && !entity.dead)?.hopY };
      }
      if (phase === 'rise' && Number.isFinite(progress)) {
        for (const [label, threshold] of [['start', 0.05], ['mid', 0.5], ['end', 0.98]]) if (!window.__choimisQa.skyTransition.risePending[label] && progress >= threshold) {
          window.__choimisQa.skyTransition.risePending[label] = { at: performance.now(), progress, camera: { x: g.camera.x, y: g.camera.y }, windTime: sky.windTime || 0, bossHopY: g.entities.find(entity => entity.id === 'choimis_sky_boss' && !entity.dead)?.hopY,
            party: ['player', 'gyeongsub', 'ppaman'].map(id => { const actor = id === 'player' ? g.player : g.entities.find(entity => entity.id === id && !entity.dead); return actor ? { id, x: actor.x, y: actor.y, flyX: actor.flyX || 0, flyY: actor.flyY || 0, hopY: actor.hopY || 0 } : null; }) };
        }
        if (progress >= 0.98 && !window.__choimisQa.skyTransition.risePending.endAt) window.__choimisQa.skyTransition.risePending.endAt = performance.now();
      }
      return result;
    };
    const draw = g.draw.bind(g);
    let nextQaBulletId = 1;
    g.draw = (...args) => {
      const ctx = g.ctx, originalFillText = ctx?.fillText;
      if (ctx && originalFillText) {
        ctx.fillText = function qaFillText(text, x, y, ...rest) {
          const result = originalFillText.call(this, text, x, y, ...rest);
          if (text === '↑↓ 이동 · C 탭 발사 / 길게 눌러 충전') {
            let pixels = null;
            try {
              const image = this.getImageData(68, 536, Math.min(812, this.canvas.width - 68), Math.min(60, this.canvas.height - 536)).data;
              pixels = 0;
              for (let i = 0; i < image.length; i += 4) if (image[i + 3] > 0 && image[i] + image[i + 1] + image[i + 2] > 90) pixels++;
            } catch {}
            const transform = this.getTransform ? this.getTransform() : null;
            window.__choimisQa.hintDraws.push({ when: 'after-fillText', text, x, y, alpha: this.globalAlpha,
              font: this.font, composite: this.globalCompositeOperation,
              transform: transform ? [transform.a, transform.d, transform.e, transform.f] : null,
              pixels, battle: window.game.battle?.state || null, phase: window.game.battle?.gimmick?.snapshot?.phase || null });
          }
          return result;
        };
      }
      const result = draw(...args); const b = g.battle, sky = g.choimisSky;
      if (b?.rapVideo?.__choimisQaLastDrawAt && !window.__choimisQa.rapVideo.frames.length) {
        window.__choimisQa.rapVideo.frames.push({ at: performance.now(), data: g.canvas.toDataURL('image/png'), battleTime: b.t, handle: true, drawnAt: b.rapVideo.__choimisQaLastDrawAt });
      }
      for (const event of [...(window.__choimisQa.sceneVoices.sexy || []), ...(window.__choimisQa.sceneVoices.seup || [])]) {
        if (event.phaseAtDraw == null && sky?.phase) event.phaseAtDraw = sky.phase;
      }
      if (sky?.phase === 'gather' && Number(sky.progress) >= 0.95 && !window.__choimisQa.skyTransition.gatherLate) {
        window.__choimisQa.skyTransition.gatherLate = { at: performance.now(), phase: sky.phase, progress: Number(sky.progress), pollen: sky.pollen?.length || 0, loosePetals: sky.loosePetals?.length || 0, data: g.canvas.toDataURL('image/png') };
      }
      const phasePending = window.__choimisQa.skyTransition.phasePending;
      for (const phase of Object.keys(phasePending)) if (!window.__choimisQa.skyTransition.phaseFrames[phase]) {
        window.__choimisQa.skyTransition.phaseFrames[phase] = { ...phasePending[phase], data: g.canvas.toDataURL('image/png') };
        delete phasePending[phase];
      }
      const risePending = window.__choimisQa.skyTransition.risePending;
      for (const label of ['start', 'mid', 'end']) if (risePending[label] && !window.__choimisQa.skyTransition.rise[label]) {
        window.__choimisQa.skyTransition.rise[label] = { ...risePending[label], data: g.canvas.toDataURL('image/png') };
        delete risePending[label];
      }
      if (risePending.endAt && !window.__choimisQa.skyTransition.rise.endAt) window.__choimisQa.skyTransition.rise.endAt = risePending.endAt;
      if (ctx && originalFillText) {
        ctx.fillText = originalFillText;
        const last = window.__choimisQa.hintDraws.at(-1);
        if (last && last.endDraw === undefined) {
          let pixels = null;
          try {
            const image = ctx.getImageData(68, 536, Math.min(812, ctx.canvas.width - 68), Math.min(60, ctx.canvas.height - 536)).data;
            pixels = 0;
            for (let i = 0; i < image.length; i += 4) if (image[i + 3] > 0 && image[i] + image[i + 1] + image[i + 2] > 90) pixels++;
          } catch {}
          last.endDraw = { pixels, battle: b?.state || null, phase: b?.gimmick?.snapshot?.phase || null };
        }
      }
      if (b?.state === 'intro' && window.__choimisQa.introAt === undefined) window.__choimisQa.introAt = performance.now();
      const boss = g.entities.find(entity => entity.id === 'choimis_sky_boss' && !entity.dead);
      if (boss && !boss.visible && g.camera.locked) window.__choimisQa.prepanSamples.push({ at: performance.now(), x: g.camera.x, y: g.camera.y, visible: boss.visible });
      const skyTransition = window.__choimisQa.skyTransition;
      const skyProgress = Number(sky?.progress);
      if (sky?.phase === 'rise' && Number.isFinite(skyProgress)) {
        for (const [label, threshold] of [['start', 0.05], ['mid', 0.5], ['end', 0.98]]) {
          if (!skyTransition.rise[label] && skyProgress >= threshold) skyTransition.rise[label] = { at: performance.now(), progress: skyProgress, camera: { x: g.camera.x, y: g.camera.y }, windTime: sky.windTime || 0, bossHopY: boss?.hopY,
            party: ['player', 'gyeongsub', 'ppaman'].map(id => { const actor = id === 'player' ? g.player : g.entities.find(entity => entity.id === id && !entity.dead); return actor ? { id, x: actor.x, y: actor.y, flyX: actor.flyX || 0, flyY: actor.flyY || 0, hopY: actor.hopY || 0 } : null; }), data: g.canvas.toDataURL('image/png') };
        }
        if (skyProgress >= 0.98 && !skyTransition.rise.endAt) skyTransition.rise.endAt = performance.now();
      }
      const capePhase = sky?.phase === 'cape' && Number.isFinite(Number(sky?.capeProgress));
      if (capePhase && !skyTransition.capeStartAt) skyTransition.capeStartAt = performance.now();
      const capeProgress = Number(sky?.capeProgress), capeElapsed = Number.isFinite(skyTransition.capeStartAt) ? performance.now() - skyTransition.capeStartAt : -1;
      if (capePhase) {
        for (const [label, progressThreshold, elapsedThreshold] of [['start', 0, 0], ['mid', 0.45, 405], ['end', 0.98, 882]]) {
          const reached = Number.isFinite(capeProgress) ? capeProgress >= progressThreshold : capeElapsed >= elapsedThreshold;
          if (!skyTransition.cape[label] && reached) skyTransition.cape[label] = { at: performance.now(), elapsed: Math.max(0, capeElapsed), progress: Number.isFinite(capeProgress) ? capeProgress : null, phase: sky?.phase || null, capePhase: sky?.capePhase || null, bossHopY: boss?.hopY, bossFrame: boss?.frame, bossMotionIndex: boss?.motion?.index, bossMotionElapsed: boss?.motion?.elapsed, bossMotionFrames: boss?.motion?.frames?.length, data: g.canvas.toDataURL('image/png') };
        }
      }
      if (g.dialogue.running && g.textbox.node?.text === '* 하이' && skyTransition.windHi.length < 4) {
        const last = skyTransition.windHi.at(-1);
        if (!last || performance.now() - last.at >= 220) skyTransition.windHi.push({ at: performance.now(), windTime: sky?.windTime || 0, bgmName: g.sound.bgmName, bgmTime: g.sound.bgm?.currentTime, bgmPaused: g.sound.bgm?.paused, bossHopY: boss?.hopY, camera: { x: g.camera.x, y: g.camera.y }, data: g.canvas.toDataURL('image/png') });
      }
      const opening = b?.gimmick?.snapshot;
      if (opening?.charge?.active) window.__choimisQa.chargeSamples.push({ at: performance.now(), ...opening.charge });
      if (opening?.charge?.active && opening.charge.progress >= 0.3 && opening.charge.progress <= 0.6 && !window.__choimisQa.chargeFrames.mid) {
        window.__choimisQa.chargeFrames.mid = { at: performance.now(), progress: opening.charge.progress, data: g.canvas.toDataURL('image/png') };
      }
      const defense = b?.interlude?.snapshot;
      for (const target of [1.4, 2.5]) if (defense?.phase === 'charge' && defense.phaseTime >= target && !window.__choimisQa.defenseFrames[target]) {
        window.__choimisQa.defenseFrames[target] = { at: performance.now(), phaseTime: defense.phaseTime, data: g.canvas.toDataURL('image/png') };
      }
      for (const target of [1, 2, 3, 4]) if (b?.state === 'menu' && !b.enemies?.[0]?.patternPose && b.t >= target && !window.__choimisQa.capeFrames[target]) {
        window.__choimisQa.capeFrames[target] = { at: performance.now(), battleTime: b.t, data: g.canvas.toDataURL('image/png') };
      }
      if (b?.activeEnemyMode === 'choimis_pink_round' && opening?.scenario?.kind) {
        const kind = opening.scenario.kind;
        const phase = opening.phase || 'unknown';
        for (const key of [`${kind}-prep`, `${kind}-${phase}`]) {
          if (!window.__choimisQa.roundCaptures[key]) window.__choimisQa.roundCaptures[key] = { at: performance.now(), phase, snapshot: opening, data: g.canvas.toDataURL('image/png') };
        }
        const captures = [];
        if (kind === 'kart_block') for (const blocker of opening.scenario.blockers || []) {
          if (blocker.age > 0.5 && blocker.x > 130 && blocker.x < 360) captures.push(`kart_block-${blocker.kind}`);
        }
        if (kind === 'pink_prism') {
          if (opening.scenario.shields < 3 && opening.scenario.shields > 0) captures.push('pink_prism-shield-active');
          if (opening.scenario.shields === 0) captures.push('pink_prism-core-active');
          if (opening.charge.ready) captures.push('pink_prism-charge');
        }
        for (const key of captures) if (!window.__choimisQa.roundCaptures[key]) {
          window.__choimisQa.roundCaptures[key] = { at: performance.now(), phase, snapshot: opening, data: g.canvas.toDataURL('image/png') };
        }
      }
      if (b?.state === 'bullets') {
        for (const shape of ['choimis_miss']) {
          const visible = b.bullets.some(q => q.shape === shape && q.age >= q.warn && q.x > b.board.x - 12 && q.x < b.board.x + b.board.w + 12 && q.y > b.board.y + 12 && q.y < b.board.y + b.board.h - 12);
          if (visible && !window.__choimisQa[shape]) window.__choimisQa[shape] = g.canvas.toDataURL('image/png');
        }
        for (const bullet of b.bullets) {
          if (bullet.shape === 'choimis_outfit' && bullet.age >= bullet.warn && bullet.x > b.board.x + 30 && bullet.x < b.board.x + b.board.w - 30 && !window.__choimisQa.fashionFrames[bullet.look]) window.__choimisQa.fashionFrames[bullet.look] = { at: performance.now(), look: bullet.look, x: bullet.x, y: bullet.y, data: g.canvas.toDataURL('image/png') };
          if (bullet.shape === 'choimis_miss' && bullet.age >= bullet.warn + 0.5 && bullet.x - bullet.w / 2 > b.board.x + 8 && bullet.x + bullet.w / 2 < b.board.x + b.board.w - 8 && !window.__choimisQa.missActiveFrame) window.__choimisQa.missActiveFrame = { at: performance.now(), x: bullet.x, y: bullet.y, age: bullet.age, data: g.canvas.toDataURL('image/png') };
        }
      }
      for (const bullet of b?.bullets || []) if (!bullet.__qaId) bullet.__qaId = nextQaBulletId++;
      if (sky?.phase && !window.__choimisQa.phases.includes(sky.phase)) window.__choimisQa.phases.push(sky.phase);
      if (sky?.phase === 'rise' || b?.state === 'bullets' || b?.state === 'enemy-prep' || b?.state === 'board-close' || b?.activeEnemyMode === 'choimis_pink_round' || window.__choimisQa.temporalCaptures?.some(target => !target.data) || window.__choimisQa.audioBoundaryCaptures?.some(target => !target.data)) {
        const bgmTime = g.sound.bgm?.currentTime;
        const cue = window.__choimisQa.lyricAt(bgmTime);
        const lyricFade = cue ? Math.min(1, Math.max(0, (bgmTime - cue.start) / 0.28)) : 0;
        const lyricEchoChars = cue ? cue.chars.filter(char => bgmTime >= char.at && bgmTime - char.at < 0.26 && char.char.trim()).length : 0;
        window.__choimisQa.frames.push({ phase: sky?.phase || null, progress: sky?.progress || 0, battle: b?.state || null,
          bgmTime, lyric: window.__choimisQa.lyricAt(bgmTime)?.text || null,
          lyricFade, lyricEchoChars, lyricDim: ['enemy-mode', 'enemy-prep', 'bullets', 'board-close'].includes(b?.state),
          ghosts: g.choimisFlower?.ghosts?.length || 0, alpha: ['bullets', 'enemy-prep', 'board-close'].includes(b?.state) ? 0.68 : 1,
          bullets: b?.bullets?.map(q => ({ id: q.__qaId, shape: q.shape, age: q.age, warn: q.warn, text: q.text, denomination: q.denomination, look: q.look })) || [],
          opening: b?.activeEnemyMode === 'choimis_pink_round' ? b.gimmick?.snapshot || null : null,
          pose: b?.enemies?.[0]?.patternPose || null });
        for (const target of window.__choimisQa.temporalCaptures || []) {
          if (!target.data && Number.isFinite(bgmTime) && bgmTime >= target.time && bgmTime < target.time + 0.14) {
            target.actual = bgmTime;
            target.frame = window.__choimisQa.frames.at(-1);
            target.data = g.canvas.toDataURL('image/png');
          }
        }
        for (const target of window.__choimisQa.audioBoundaryCaptures || []) {
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
    const prepan = await page.evaluate(() => window.__choimisQa.prepanSamples || []);
    const prepanXs = prepan.map(sample => sample.x);
    check('rightward approach visibly pans for two seconds while the boss remains hidden', prepan.length >= 2 && Math.max(...prepanXs) - Math.min(...prepanXs) > 10 && prepan.every(sample => sample.visible === false), json({ samples: prepan.slice(-8), span: prepanXs.length ? Math.max(...prepanXs) - Math.min(...prepanXs) : 0 }));
    check('rightward approach triggers the sky intro and catches an invisible-boss rise with afterimages', !!rising, json(await snapshot()));
    if (rising) { await record('rise-afterimages'); await shot('02_boss_rise_afterimages'); }
  } finally { await page.keyboard.up('ArrowRight'); }
  const settled = await until(() => window.game.choimisSky?.phase === undefined && window.game.dialogue.running && window.game.textbox.node?.text === '* 하이', 30000);
  check('boss stays airborne before the first 하이 line', !!settled && (await snapshot()).actors.choimis_sky_boss?.hopY > 20, json(await snapshot()));
  if (BUILD298 || process.env.QA_BUILD303_FIELD === '1') {
    const hiWaiting = await until(() => window.game.dialogue.running && window.game.textbox.node?.text === '* 하이' && window.game.textbox.state === 'waiting', 5000);
    if (hiWaiting) await page.waitForTimeout(500);
  }
  await shot('03_boss_hover_before_hi');

  for (const [index, expected] of DIALOGUE.entries()) {
    const exact = `* ${expected}`;
    const line = await until(() => {
      const g = window.game;
      return g.dialogue.running && typeof g.textbox.node?.text === 'string' ? { text: g.textbox.node.text, state: g.textbox.state, index: g.dialogue.i } : null;
    }, 15000);
    const reached = line?.text === exact;
    check(`dialogue ${index + 1}/${DIALOGUE.length} is exact`, reached, json({ expected: exact, actual: line?.text }));
    trace.dialogue.push({ index: index + 1, expected: exact, actual: line?.text, reached }); save();
    if (!reached) return;
    await page.evaluate(expectedText => { window.__choimisQa.expectedDialogueText = expectedText; }, exact);
    const fullLine = await until(() => window.game.dialogue.running && window.game.textbox.node?.text === window.__choimisQa.expectedDialogueText && window.game.textbox.state === 'waiting', 10000);
    check(`dialogue ${index + 1}/${DIALOGUE.length} is fully displayed before advancing`, !!fullLine);
    if (!fullLine) return;
    check(`dialogue ${index + 1}/${DIALOGUE.length} preserves Choimis hover`, (await snapshot()).actors.choimis_sky_boss?.hopY > 20);
    if (reached) await shot(`04_dialogue_${String(index + 1).padStart(2, '0')}`);
    await press('KeyC');
    await until(() => window.game.textbox.node?.text !== window.__choimisQa.expectedDialogueText || window.game.textbox.state === 'closed', 3000);
  }
  const beforePose = await record('before-pollen-pose');
  await shot('12_before_hand_raise_pose');
  check('boundary rects are captured before the hand-raise pose', !!beforePose.actors.player && !!beforePose.actors.choimis_sky_boss,
    json({ player: beforePose.actors.player, boss: beforePose.actors.choimis_sky_boss, camera: beforePose.camera }));

  const gathering = await until(() => window.game.choimisSky?.phase === 'gather' && window.game.choimisSky.progress > 0.45, 15000);
  const gatheredFrame = await page.evaluate(() => window.__choimisQa.skyTransition.phaseFrames.gather || null);
  const gatheredState = await snapshot();
  check('C advance closes dialogue and starts the dense 168-petal platform gathering', (!!gathering || !!gatheredFrame) && gatheredFrame?.pollen === 168 && gatheredFrame?.loosePetals === 36,
    json({ gathering: !!gathering, frame: gatheredFrame, sky: gatheredState.sky }));
  await shot('13_pollen_gathering_under_four_actors');
  const gatherLateReady = await until(() => !!window.__choimisQa.skyTransition.gatherLate, 6000);
  const gatherLate = await page.evaluate(() => {
    const frame = window.__choimisQa.skyTransition.gatherLate;
    if (!frame) return null;
    const { data, ...metadata } = frame;
    return metadata;
  });
  check('pollen gathering completes at the three-party platform before ascent', !!gatherLateReady && !!gatherLate && gatherLate.phase === 'gather' && gatherLate.progress >= 0.95 && gatherLate.pollen === 168 && gatherLate.loosePetals === 36,
    json({ ready: !!gatherLateReady, frame: gatherLate }));
  const ascent = await until(() => window.game.choimisSky?.phase === 'rise' && window.game.choimisSky.progress > 0.25, 15000);
  const riseFrame = await page.evaluate(() => window.__choimisQa.skyTransition.phaseFrames.rise || null);
  const ascentState = await snapshot();
  check('continuous ascent keeps all 168 platform petals and 36 loose sea petals moving', (!!ascent || !!riseFrame) && (riseFrame?.pollen === 168 || ascentState.sky.pollen === 168) && (riseFrame?.loosePetals === 36 || ascentState.sky.loosePetals === 36) && ((riseFrame?.windTime || 0) > 0 || (ascentState.sky.windTime || 0) > 0), json({ ascent: !!ascent, frame: riseFrame, sky: ascentState.sky }));
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
  const audioTimeline = await page.evaluate(() => window.__choimisQa.audioTimeline || []);
  const sceneVoices = await page.evaluate(() => window.__choimisQa.sceneVoices || { sexy: [], seup: [] });
  const weaponAt = audioTimeline.find(event => event.kind === 'sfx' && event.name === 'weaponpull')?.at;
  const wingEvents = audioTimeline.filter(event => event.kind === 'sfx' && event.name === 'wing');
  const wingAt = wingEvents[0]?.at;
  const battleBgmAt = audioTimeline.find(event => event.kind === 'bgm' && event.name === 'choimis_battle')?.at;
  const skyTransition = await page.evaluate(() => window.__choimisQa.skyTransition);
  const stripFrame = frame => frame ? { ...frame, data: undefined } : frame;
  const transitionSummary = {
    rise: Object.fromEntries(Object.entries(skyTransition.rise || {}).map(([key, frame]) => [key, stripFrame(frame)])),
    cape: Object.fromEntries(Object.entries(skyTransition.cape || {}).map(([key, frame]) => [key, stripFrame(frame)])),
    gatherLate: stripFrame(skyTransition.gatherLate),
    phaseFrames: Object.fromEntries(Object.entries(skyTransition.phaseFrames || {}).map(([key, frame]) => [key, stripFrame(frame)])),
    windHi: (skyTransition.windHi || []).map(stripFrame),
    sceneVoices,
  };
  trace.observations.push({ label: 'sky-transition-latches', value: { ...transitionSummary, audioTimeline: audioTimeline.filter(event => event.name === 'weaponpull' || event.name === 'choimis_battle') } }); save();
  for (const label of ['start', 'mid', 'end']) await saveDataUrl(`sky_rise_${label}`, skyTransition.rise?.[label]);
  await saveDataUrl('sky_gather_late', skyTransition.gatherLate);
  for (const phase of ['gather', 'rise']) await saveDataUrl(`sky_phase_${phase}`, skyTransition.phaseFrames?.[phase]);
  for (const label of ['start', 'mid', 'end']) await saveDataUrl(`sky_cape_${label}`, skyTransition.cape?.[label]);
  await saveDataUrl('sky_hi_wind', skyTransition.windHi?.[Math.min(2, (skyTransition.windHi?.length || 1) - 1)]);
  check('sky rise captures start/mid/end with moving wind and camera state', !!skyTransition.rise?.start && !!skyTransition.rise?.mid && !!skyTransition.rise?.end && skyTransition.rise.mid.windTime >= skyTransition.rise.start.windTime, json(transitionSummary.rise));
  if (BUILD298) {
    const riseStart = skyTransition.rise?.start || null, riseEnd = skyTransition.rise?.end || null;
    const cameraRise = Number.isFinite(riseStart?.camera?.y) && Number.isFinite(riseEnd?.camera?.y) ? riseStart.camera.y - riseEnd.camera.y : NaN;
    check('BUILD298 ascent covers 1080px while the three party actors remain in the moving field', Number.isFinite(cameraRise) && cameraRise >= 1000 && cameraRise <= 1120 && riseEnd?.party?.filter(Boolean).length === 3, json({ cameraRise, riseStart, riseEnd }));
  }
  check('gather sexy voice and shine cue start once before the concurrent gather line', sceneVoices.sexy.length === 1 && sceneVoices.sexy[0].phaseAtDraw === 'gather' && Number.isFinite(sceneVoices.sexy[0].at) && Number.isFinite(skyTransition.gatherLate?.at) && sceneVoices.sexy[0].at <= skyTransition.gatherLate.at && audioTimeline.filter(event => event.kind === 'sfx' && event.name === 'great_shine').length === 1, json({ sexy: sceneVoices.sexy, gatherLateAt: skyTransition.gatherLate?.at, shine: audioTimeline.filter(event => event.kind === 'sfx' && event.name === 'great_shine') }));
  check('ascent seup voice starts once at the actual rise phase without blocking the ascent', sceneVoices.seup.length === 1 && sceneVoices.seup[0].phaseAtDraw === 'rise' && Number.isFinite(sceneVoices.seup[0].at) && Number.isFinite(skyTransition.rise?.start?.at) && sceneVoices.seup[0].at <= skyTransition.rise.start.at + 250, json({ seup: sceneVoices.seup, riseStartAt: skyTransition.rise?.start?.at }));
  const windAudioSamples = skyTransition.windAudio?.samples || [], riseWind = windAudioSamples.filter(sample => sample.phase === 'rise' && Number.isFinite(sample.volume));
  check('ascent rushing-wind audio starts during rise, fades through the envelope, and is stopped before cape/weapon handoff', skyTransition.windAudio?.calls?.length === 1 && riseWind.some(sample => sample.volume > 0.05) && Math.max(...riseWind.map(sample => sample.volume), 0) <= 0.8 && windAudioSamples.some(sample => ['cape', 'weaponpull'].includes(sample.phase) && sample.paused), json({ calls: skyTransition.windAudio?.calls?.map(call => ({ name: call.name, at: call.at, options: call.options })), samples: windAudioSamples.filter(sample => sample.phase !== 'rise' || sample.at === riseWind.at(-1)?.at).slice(-8) }));
  const hiClock = (skyTransition.windHi || []).map(sample => sample.bgmTime).filter(Number.isFinite);
  check('sky encounter captures wind samples during the current 하이 line', (skyTransition.windHi?.length || 0) >= 2 && (hiClock.length < 2 || hiClock.at(-1) > hiClock[0]), json(transitionSummary.windHi));
  check('cape unfurl captures start/mid/end before handoff', !!skyTransition.cape?.start && !!skyTransition.cape?.mid && !!skyTransition.cape?.end, json(transitionSummary.cape));
  check('cape settles before weaponpull and battle audio', Number.isFinite(skyTransition.cape?.end?.at) && Number.isFinite(weaponAt) && weaponAt >= skyTransition.cape.end.at, json({ capeEndAt: skyTransition.cape?.end?.at, weaponAt }));
  check('battle handoff starts the actual choimis_battle BGM within one second', !!bgmReady && handoffBgmReady.bgm === 'choimis_battle' && handoffBgmReady.paused === false && handoffBgmReady.time > 0.01 && handoffBgmElapsed >= -100 && handoffBgmElapsed <= 1000, json({ ...handoffBgmReady, elapsedMs: handoffBgmElapsed }));
  check('cape wing cue fires once before weaponpull', wingEvents.length === 1 && Number.isFinite(wingAt) && Number.isFinite(weaponAt) && wingAt <= weaponAt, json({ wingEvents, weaponAt }));
  check('weaponpull precedes immediate choimis_battle BGM', Number.isFinite(weaponAt) && Number.isFinite(battleBgmAt) && weaponAt <= battleBgmAt && battleBgmAt - weaponAt <= 1000, json({ weaponAt, battleBgmAt, elapsedMs: battleBgmAt - weaponAt }));
  if (process.env.QA_HANDOFF_ONLY === '1' || process.env.QA_BUILD303_FIELD === '1') {
    const readySettled = await until(() => window.game.battle?.state === 'intro' && window.game.battle.typed && window.game.battle.t > 1.5, 5000);
    check('settled battle handoff is ready before responsive captures', !!readySettled, json(await snapshot()));
    for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 720 }); await page.waitForTimeout(120); await shot(`settled_battle_viewport_${width}`); }
    await page.setViewportSize({ width: 960, height: 720 });
    if (process.env.QA_BUILD303_FIELD === '1') {
      check('BUILD303 natural field handoff reaches HP250 battle', handoff.battle.enemies[0].hp === 250);
      trace.fieldSourcesAfter = trace.fieldSources.map(s => ({ relative: s.relative, local: createHash('sha256').update(fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, s.relative))).digest('hex') }));
      check('BUILD303 field sources stay unchanged throughout natural handoff', trace.fieldSourcesAfter.every(s => trace.fieldSources.find(before => before.relative === s.relative).local === s.local)); save();
    }
    return;
  }
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
  if (pinkCombat) {
    await shot('18_pink_shooter_combat_wide');
    if (BUILD298) {
      await shot('18b_pink_shooter_forwardflow_t0');
      await page.waitForTimeout(1000);
      await shot('18c_pink_shooter_forwardflow_t1');
    }
  }
  if (!pinkCombat) {
    check('pink shooter exposes a combat snapshot before input-dependent checks', false, json({ openingMode, pinkFill, pinkDrain, pinkCombat }));
    return;
  }
  const battleHp = () => page.evaluate(() => Object.fromEntries(game.battle.members.map(member => [member.id, member.hp])));
  const beforePinkHp = await battleHp();
  const fireNoodle = await until(() => window.game.battle?.gimmick?.snapshot?.noodles?.find(n => !n.telegraph) || null, 5000);
  // Seeded opening lanes center the first noodle on the initial soul y=159.
  // A tap must fire once; a separate bounded hold/release checks the three-strand capped charge.
  await page.waitForTimeout(180);
  const initialHeartCueCount = await page.evaluate(() => window.__choimisQa.sfx.filter(sound => ['yellowheart_charge', 'yellowheart_shot', 'yellowheart_shot_big'].includes(sound.name)).length);
  const tapSfxBefore = await page.evaluate(() => window.__choimisQa.sfx.filter(sound => sound.name === 'yellowheart_shot').length);
  await page.evaluate(value => { window.__choimisQa.tapSfxBefore = value; }, tapSfxBefore);
  await press('KeyC');
  const tapFired = await until(() => window.__choimisQa.sfx.filter(sound => sound.name === 'yellowheart_shot').length > window.__choimisQa.tapSfxBefore ? true : null, 1500);
  const tapResult = await page.evaluate(() => ({ ...(game.battle?.gimmick?.snapshot || {}), shotSfx: window.__choimisQa.sfx.filter(sound => sound.name === 'yellowheart_shot').length }));
  check('C tap/release fires exactly one natural pink projectile', !!tapFired && tapResult.shotSfx === tapSfxBefore + 1, json({ fireNoodle, tapResult }));
  check('opening has no initial heart cue before the first real C input', initialHeartCueCount === 0, json({ initialHeartCueCount, tapSfxBefore }));
  const chargeStart = await page.evaluate(() => window.__choimisQa.sfx.filter(sound => sound.name === 'yellowheart_shot_big').length);
  await page.keyboard.down('KeyC');
  const chargeReady = await until(() => {
    const charge = window.game.battle?.gimmick?.snapshot?.charge;
    return charge?.active && charge.ready ? charge : null;
  }, 2200);
  await page.waitForTimeout(180);
  const chargeFrame = await page.evaluate(() => ({ ...(game.battle?.gimmick?.snapshot || {}), samples: window.__choimisQa.chargeSamples.slice(-12) }));
  await shot('19_pink_shooter_three_strand_charge');
  await page.keyboard.up('KeyC');
  await page.evaluate(value => { window.__choimisQa.chargeSfxBefore = value; }, chargeStart);
  const chargedReleased = await until(() => {
    const snapshot = window.game.battle?.gimmick?.snapshot, count = window.__choimisQa.sfx.filter(sound => sound.name === 'yellowheart_shot_big').length;
    return snapshot && snapshot.charge?.active === false && count > window.__choimisQa.chargeSfxBefore ? true : null;
  }, 2000);
  const pinkFire = await page.evaluate(() => ({ ...(game.battle?.gimmick?.snapshot || {}), hp: Object.fromEntries(game.battle.members.map(member => [member.id, member.hp])), chargedShotSfx: window.__choimisQa.sfx.filter(sound => sound.name === 'yellowheart_shot_big').length }));
  const chargeFloor = 0.6;
  check('held C reaches the fixed .6-second three-strand charge cap before release', !!chargeReady && chargeFrame.charge?.ready === true && chargeFrame.charge?.elapsed >= chargeFloor && chargeFrame.charge?.aura?.length === 3 && !!chargedReleased && pinkFire.chargedShotSfx === chargeStart + 1, json({ chargeFloor, chargeReady, charge: chargeFrame.charge, samples: chargeFrame.samples, afterRelease: pinkFire.charge, released: chargedReleased }));
  check('actual C tap fire destroys at least one incoming noodle during pink combat', !!fireNoodle && pinkFire.destroyed >= 1, json({ fireNoodle, ...pinkFire }));
  await page.evaluate(value => { window.__choimisQa.beforeChargeDestroyed = value; }, tapResult.destroyed || 0);
  const chargedNoodles = await until(() => {
    const current = window.game.battle?.gimmick?.snapshot;
    return current && current.destroyed >= window.__choimisQa.beforeChargeDestroyed + 2 ? current : null;
  }, 3500);
  const openingShotAudio = await page.evaluate(() => window.__choimisQa.sfx.filter(sound => ['yellowheart_charge', 'yellowheart_shot', 'yellowheart_shot_big'].includes(sound.name)).map(sound => sound.name));
  check('charged C projectile penetrates multiple natural noodles without a second target injection', !!chargedNoodles && chargedNoodles.destroyed >= (tapResult.destroyed || 0) + 2, json({ beforeCharge: tapResult.destroyed, afterCharge: chargedNoodles?.destroyed, shots: chargedNoodles?.shots }));
  check('pink shooter emits the official charge and charged/tap release audio cues', openingShotAudio.includes('yellowheart_charge') && openingShotAudio.includes('yellowheart_shot') && openingShotAudio.includes('yellowheart_shot_big'), json(openingShotAudio));
  if (pinkFire.destroyed >= 1) await shot('20_pink_shooter_projectile_hit');
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
  const defenseLine = await until(() => {
    const b = window.game.battle;
    return b?.state === 'interlude' && b.interlude?.snapshot?.phase === 'boss-line' ? { text: b.text, typed: b.typed } : null;
  }, 30000);
  check('pink opening routes into the defense cinematic boss talk before returning to menu', !!defenseLine && defenseLine.text === '* 분홍의 힘이 나를 감싼다.', json(defenseLine));
  const defenseTyped = await until(() => window.game.battle?.state === 'interlude' && window.game.battle.interlude?.snapshot?.phase === 'boss-line' && window.game.battle.typed, 10000);
  if (defenseTyped) await shot('23_defense_boss_line');
  check('defense boss line is fully typed before its flowers transition', !!defenseTyped);
  if (defenseTyped) await press('KeyC');
  const flowers = await until(() => window.game.battle?.state === 'interlude' && window.game.battle.interlude?.snapshot?.phase === 'charge' ? window.game.battle.interlude.snapshot : null, 5000);
  check('defense cinematic renders the flower charge phase after the boss line', !!flowers && flowers.flowers >= 32 && flowers.defenseBoosted === false, json(flowers));
  if (flowers) await shot('24_defense_flowers_charge');
  const narrator = await until(() => window.game.battle?.state === 'interlude' && window.game.battle.interlude?.snapshot?.phase === 'result' ? { text: window.game.battle.text, typed: window.game.battle.typed } : null, 5000);
  check('defense cinematic reaches its narrator result line before menu', !!narrator && narrator.text === '* 최미스의 방어력이 강화되었다.', json(narrator));
  const narratorTyped = await until(() => window.game.battle?.state === 'interlude' && window.game.battle.interlude?.snapshot?.phase === 'result' && window.game.battle.typed, 10000);
  if (narratorTyped) await shot('25_defense_narrator_result');
  if (narratorTyped) await press('KeyC');
  const menu = await until(() => window.game.battle?.state === 'menu', 25000);
  const menuRestored = await until(() => { const b = window.game.battle; return b?.state === 'menu' && !b.gimmick && b.board.w > 0 && b.board.h > 0 ? true : null; }, 3000);
  const returnedMenu = await snapshot(), pinkElapsedMs = Date.now() - pinkCombatStartedAt;
  check('12-second pink combat plus defense cinematic transitions to the normal HP/menu state', !!menu && !!menuRestored && returnedMenu.battle?.enemies?.[0]?.hp === 200 && returnedMenu.battle?.enemies?.[0]?.defenseBoosted === true && pinkElapsedMs >= 11500, json({ elapsedMs: pinkElapsedMs, minimumMs: 11500, menu: !!menu, restored: !!menuRestored, defenseBoosted: returnedMenu.battle?.enemies?.[0]?.defenseBoosted, state: returnedMenu.battle?.state, board: returnedMenu.battle?.board }));
  if (process.env.QA_PINK_SUPPLEMENT === '1') {
    const hintDraws = await page.evaluate(() => window.__choimisQa.hintDraws || []);
    const visibleHints = hintDraws.filter(draw => draw.pixels > 0 && draw.endDraw?.pixels > 0);
    const hintStates = new Set(hintDraws.map(draw => `${draw.battle}:${draw.phase}`));
    trace.observations.push({ label: 'pink-guide-fillText-instrumentation', value: { count: hintDraws.length, visible: visibleHints.length, hintStates, samples: hintDraws.slice(-8) } }); save();
    check('pink guide uses an actual fillText call with visible pixels in open and combat states', hintDraws.length > 0 && visibleHints.length === hintDraws.length && [...hintStates].some(state => state.startsWith('enemy-mode:')), json({ count: hintDraws.length, visible: visibleHints.length, states: [...hintStates], samples: hintDraws.slice(-8) }));
    await shot('pink_supplement_sea_menu_t0');
    await page.waitForTimeout(1000); await shot('pink_supplement_sea_menu_t1');
    await page.waitForTimeout(1000); await shot('pink_supplement_sea_menu_t2');
    await page.waitForTimeout(2600);
    const saveLatched = async (name, data) => {
      if (!data) return null;
      const file = await shot(name);
      fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
      return file;
    };
    const latched = await page.evaluate(() => ({ charge: window.__choimisQa.chargeFrames, defense: window.__choimisQa.defenseFrames, cape: window.__choimisQa.capeFrames }));
    const midChargeFile = await saveLatched('pink_supplement_charge_progress_03_06', latched.charge?.mid?.data);
    const defenseFiles = [];
    for (const target of ['1.4', '2.5']) defenseFiles.push(await saveLatched(`pink_supplement_defense_peak_${target.replace('.', '_')}`, latched.defense?.[target]?.data));
    const capeFiles = [];
    for (const target of ['1', '2', '3', '4']) capeFiles.push(await saveLatched(`pink_supplement_cape_idle_${target}s`, latched.cape?.[target]?.data));
    check('supplement captures actual mid-charge, defense peaks, and four cape idle frames', !!midChargeFile && defenseFiles.every(Boolean) && capeFiles.every(Boolean), json({ midCharge: latched.charge?.mid ? { at: latched.charge.mid.at, progress: latched.charge.mid.progress } : null, defense: Object.fromEntries(Object.entries(latched.defense || {}).map(([key, value]) => [key, { at: value.at, phaseTime: value.phaseTime }])), cape: Object.fromEntries(Object.entries(latched.cape || {}).map(([key, value]) => [key, { at: value.at, battleTime: value.battleTime }])) }));
    const viewportSizes = [375, 768, 1280];
    for (const width of viewportSizes) { await page.setViewportSize({ width, height: 720 }); await page.waitForTimeout(100); await shot(`pink_supplement_menu_viewport_${width}`); }
    await page.setViewportSize({ width: 960, height: 720 });
    const selectSupplement = async scenario => {
      const selected = await fixture(`pink-supplement-select-${scenario}`, `Select only the registered ${scenario} target-local pink round for bounded supplemental QA; no shots, HP, or completion state are injected.`, ({ scenario: expected }) => {
        const b = game.battle, e = b?.enemies?.[0];
        const index = e?.def?.patterns?.findIndex(pattern => pattern?.mode === 'choimis_pink_round' && pattern.scenario === expected) ?? -1;
        window.__choimisQa.pinkRoundFixture = { scenario: expected, index, found: index >= 0 };
        if (index < 0) return false;
        e.hp = e.maxHp;
        for (e.patternIdx = 0; e.patternIdx < 128 && b.nextPatternConfig(e).config?.scenario !== expected; e.patternIdx++);
        if (e.patternIdx === 128) throw new Error(`No reachable pink ${expected}`);
        e.dead = false; e.dying = 0;
        b.members.forEach(member => { member.down = false; member.hp = member.maxHp; });
        return true;
      }, { scenario });
      check(`pink supplement ${scenario}: registered route is available`, selected === true, json(await page.evaluate(() => window.__choimisQa.pinkRoundFixture)));
      await page.evaluate(() => { const scenario = window.__choimisQa.pinkRoundFixture?.scenario; window.__choimisQa.pinkSupplementHits = 0; window.__choimisQa.pinkSupplementCleared = 0; if (scenario) { delete window.__choimisQa.roundLatches[scenario]; delete window.__choimisQa.roundHistory[scenario]; } });
      return selected === true;
    };
    const queueSupplement = async scenario => {
      await page.evaluate(value => { window.__choimisQa.pinkSupplementScenario = value; }, scenario);
      for (let memberIndex = 0; memberIndex < 3; memberIndex++) {
        await page.evaluate(index => { window.__choimisQa.waitMemberIdx = index; }, memberIndex);
        if (!await until(() => window.game.battle?.state === 'menu' && window.game.battle.memberIdx === window.__choimisQa.waitMemberIdx, 6000)) return false;
        await press('KeyC');
        if (!await until(() => window.game.battle?.state === 'target', 3000)) return false;
        await press('KeyC');
      }
      const started = await until(() => {
        const b = window.game.battle, opening = b?.gimmick?.snapshot;
        return b?.state === 'enemy-mode' && b.activeEnemyMode === 'choimis_pink_round' && opening?.scenario?.kind === window.__choimisQa.pinkSupplementScenario ? opening : null;
      }, 8000);
      check(`pink supplement ${scenario}: real menu input enters target-local round`, !!started, json(started || await snapshot()));
      if (!started) return false;
      await shot(`pink_supplement_${scenario}_prep`);
      const combat = await until(() => window.game.battle?.gimmick?.snapshot?.phase === 'combat' ? window.game.battle.gimmick.snapshot : null, 5000);
      check(`pink supplement ${scenario}: prep opens lower-panel combat`, !!combat, json(combat));
      if (combat) {
        await shot(`pink_supplement_${scenario}_combat`);
        if (scenario === 'choso') {
          for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 720 }); await page.waitForTimeout(100); await shot(`pink_supplement_${scenario}_guide_viewport_${width}`); }
          await page.setViewportSize({ width: 960, height: 720 });
        }
      }
      return !!combat;
    };
    const moveHeart = movePinkHeart;
    const cleanupSupplementRound = async (scenario, passed, detail) => {
      const ended = await until(() => window.game.battle?.state === 'menu' && !window.game.battle?.gimmick && !window.game.battle?.activeEnemyMode, 8000);
      check(`pink supplement ${scenario}: cleanup returns to normal menu`, !!ended && passed, json({ ended, ...detail }));
      trace.observations.push({ label: `pink-supplement-${scenario}`, ended: !!ended, passed, detail }); save();
      return !!ended && passed;
    };
    if (BUILD298) {
      const readBuild298Round = () => page.evaluate(() => {
        const b = game.battle, mode = b?.gimmick, s = mode?.snapshot;
        return { state: b?.state, active: b?.activeEnemyMode, mode: s || null, board: b?.board?.rect ? { ...b.board.rect } : null, enemyHp: b?.enemies?.[0]?.hp,
          partyHp: Object.fromEntries((b?.members || []).map(member => [member.id, member.hp])) };
      });
      const waitBuild298RoundEnd = async (scenario, detail = {}) => {
        await page.evaluate(name => { window.__choimisQa.build298Scenario = name; }, scenario);
        const aliveHistory = await page.evaluate(name => (window.__choimisQa.roundHistory[name] || []).some(entry => Number(entry.combatElapsed) >= 4 && entry.phase === 'combat'), scenario);
        const ended = await until(() => window.game.battle?.state === 'menu' && !window.game.battle?.gimmick && !window.game.battle?.activeEnemyMode, 24000);
        const history = await page.evaluate(name => window.__choimisQa.roundHistory[name] || [], scenario);
        const maxCombatElapsed = Math.max(0, ...history.map(entry => Number(entry.combatElapsed) || 0));
        const stayedCombat = history.some(entry => Number(entry.combatElapsed) >= 4 && Number(entry.combatElapsed) < 17.9 && entry.phase === 'combat');
        const passed = aliveHistory && !!ended && maxCombatElapsed >= 17.9 && stayedCombat;
        check(`BUILD298 ${scenario}: remains in combat through the timed 18-second round before cleanup`, passed, json({ aliveHistory, ended: !!ended, maxCombatElapsed, stayedCombat, ...detail }));
        trace.observations.push({ label: `BUILD298-${scenario}-timed-round`, value: { aliveHistory, ended: !!ended, maxCombatElapsed, stayedCombat, ...detail }, history: history.slice(-5) }); save();
        return passed;
      };
      const dodgeBuild298 = async (scenario, durationMs = 12000) => {
        const stopAt = Date.now() + durationMs;
        while (Date.now() < stopAt) {
          const state = await readBuild298Round();
          const s = state.mode?.scenario;
          if (!s || state.mode?.phase !== 'combat') { await page.waitForTimeout(180); continue; }
          const heartY = state.mode.heart?.y || 159;
          const hazards = scenario === 'choso'
            ? (s.beams || []).filter(beam => beam.age < beam.life).map(beam => ({ y: beam.locked?.y, age: beam.age, warn: beam.warned }))
            : (s.bolts || []).filter(bolt => !bolt.hit).map(bolt => ({ y: bolt.y, age: bolt.age, warn: bolt.warn }));
          const danger = hazards.filter(item => Number.isFinite(item.y) && (item.age >= item.warn || item.warn - item.age < 0.28));
          if (danger.some(item => Math.abs(item.y - heartY) < 28)) {
            const candidates = [96, 159, 222];
            const target = candidates.sort((a, b) => Math.min(...danger.map(item => Math.abs(b - item.y))) - Math.min(...danger.map(item => Math.abs(a - item.y))))[0];
            await moveHeart(target);
          }
          await page.waitForTimeout(180);
        }
      };
      const targetBoss = async () => {
        const current = await readBuild298Round(), boss = current.mode?.scenario?.boss;
        if (Number.isFinite(boss?.y)) {
          const velocityPerFrame = Number.isFinite(boss.oldY) ? boss.y - boss.oldY : 0;
          const flightFrames = Math.max(1, ((boss.x || 423) - ((current.mode?.heart?.x || 64) + 11)) / 410 * 60);
          const movingChoso = current.mode?.scenario?.kind === 'choso';
          const predicted = movingChoso
            ? 159 + 38 * Math.sin(Math.atan2((boss.y - 159) / 38, Math.max(-1, Math.min(1, velocityPerFrame * 60 / (38 * Math.PI / 2)))) + Math.PI / 2 * (flightFrames / 60))
            : boss.y;
          await moveHeart(Math.max(96, Math.min(222, predicted)));
        }
      };
      const normalBossContacts = async (count = 3) => {
        for (let index = 0; index < count; index++) { await targetBoss(); await press('KeyC'); await page.waitForTimeout(850); }
      };
      const chargedBossContact = async () => {
        await targetBoss(); await page.keyboard.down('KeyC');
        const ready = await until(() => window.game.battle?.gimmick?.snapshot?.charge?.ready === true, 1600);
        if (ready) await targetBoss();
        await page.waitForTimeout(120); await page.keyboard.up('KeyC'); await page.waitForTimeout(950);
        return ready;
      };
      const checkRoundContract = async (scenario, label) => {
        const current = await readBuild298Round();
        check(`BUILD298 ${scenario}: wide 430 board and forward-flow 18-second snapshot`, current.mode?.duration === 18 && current.mode?.scenario?.kind === scenario && current.mode?.heart?.x === 64 && current.board?.w >= 400 && current.mode?.scenario?.boss?.x > 400, json({ label, mode: current.mode, board: current.board }));
        return current;
      };
      const runBuild298Choso = async () => {
        if (!await selectSupplement('choso') || !await queueSupplement('choso')) return false;
        await checkRoundContract('choso', 'prep'); await shot('pink298_choso_prep');
        const combat = await until(() => window.game.battle?.gimmick?.snapshot?.phase === 'combat' ? window.game.battle.gimmick.snapshot : null, 6000);
        check('BUILD298 choso: real input reaches moving-boss combat', !!combat && combat.duration === 18, json(combat));
        if (!combat) return false;
        await shot('pink298_choso_combat_forwardflow');
        const warning = await until(() => window.game.battle?.gimmick?.snapshot?.scenario?.beams?.some(beam => beam.age < beam.warned) ? true : null, 3000);
        if (warning) await shot('pink298_choso_beam_warning');
        const active = await until(() => window.game.battle?.gimmick?.snapshot?.scenario?.beams?.some(beam => beam.age >= beam.warned) ? true : null, 3000);
        if (active) await shot('pink298_choso_beam_active');
        const beforeCharged = await readBuild298Round(), chargeReady = await chargedBossContact(), afterCharged = await readBuild298Round();
        check('BUILD298 choso: charged boss contact deals exactly one HP without ending the round', chargeReady && Number.isFinite(beforeCharged.enemyHp) && afterCharged.enemyHp === beforeCharged.enemyHp - 1 && afterCharged.mode?.phase === 'combat', json({ chargeReady, before: beforeCharged, after: afterCharged }));
        const beforeNormal = await readBuild298Round(); await normalBossContacts(3); const afterNormal = await readBuild298Round();
        check('BUILD298 choso: three normal boss contacts deal one HP and preserve remainder zero', afterNormal.enemyHp === beforeNormal.enemyHp - 1 && afterNormal.mode?.bossHits === 0, json({ before: beforeNormal, after: afterNormal }));
        await dodgeBuild298('choso', 10500); await shot('pink298_choso_avoided_moving_beams');
        return waitBuild298RoundEnd('choso', { warning: !!warning, active: !!active, chargeReady, normalContacts: 3, partyHp: (await readBuild298Round()).partyHp });
      };
      const runBuild298Kart = async () => {
        if (!await selectSupplement('kart_block') || !await queueSupplement('kart_block')) return false;
        const combat = await until(() => window.game.battle?.gimmick?.snapshot?.phase === 'combat' ? window.game.battle.gimmick.snapshot : null, 6000);
        if (!combat) return false; await shot('pink298_kart_combat_forwardflow');
        const center = await checkKartCenterShots(await fireKartCenterShots(), 'pink298_kart_three_normal_contacts');
        let cleared = 0, attempts = 0, kinds = new Set();
        while (cleared < 4 && attempts++ < 12) {
          const blocker = await until(() => window.game.battle?.gimmick?.snapshot?.scenario?.blockers?.find(item => item.age >= 0.5) || null, 3500);
          if (!blocker) break; kinds.add(blocker.kind); await moveHeart(blocker.y); await press('KeyC');
          await page.evaluate(value => { window.__choimisQa.build298Cleared = value; }, cleared);
          const next = await until(() => { const value = window.game.battle?.gimmick?.snapshot?.scenario?.cleared; return Number.isFinite(value) && value > window.__choimisQa.build298Cleared ? value : null; }, 3500); if (next) cleared = next;
        }
        for (const key of ['kart_block-dao', 'kart_block-bazzi']) await saveRoundCapture(key);
        await dodgeBuild298('kart_block', 8500); await shot('pink298_kart_blockers_forwardflow');
        return waitBuild298RoundEnd('kart_block', { cleared, kinds: [...kinds], contactSfx: center.contactSfx, bossHpDrop: center.hpDrop, remainder: center.remainder });
      };
      const runBuild298Prism = async () => {
        if (!await selectSupplement('pink_prism') || !await queueSupplement('pink_prism')) return false;
        const combat = await until(() => window.game.battle?.gimmick?.snapshot?.phase === 'combat' ? window.game.battle.gimmick.snapshot : null, 6000);
        if (!combat) return false; await shot('pink298_prism_combat_forwardflow');
        const prism = await clearPrism();
        for (const key of ['pink_prism-shield-active', 'pink_prism-core-active', 'pink_prism-charge']) await saveRoundCapture(key);
        check('BUILD298 prism: real charged input breaks shields and exposes the core without ending the round', prism.shields === 0 && prism.chargeShots >= 3, json(prism));
        await dodgeBuild298('pink_prism', 10500); await shot('pink298_prism_core_forwardflow');
        return waitBuild298RoundEnd('pink_prism', prism);
      };
      if (!await runBuild298Choso() || !await runBuild298Kart() || !await runBuild298Prism()) return;
      await selectSupplement('choso');
      if (!await queueSupplement('choso')) return;
      await fixture('pink298-explicit-loss', 'Inject only party defeat in a registered timed pink round to verify retry cleanup; this is an explicit miss fixture, not natural completion.', () => game.battle.hurtAllParty(999));
      const miss298 = await until(() => window.game.battle?.state === 'lose', 3000), missState298 = await snapshot();
      check('BUILD298 pink explicit miss disposes round state', !!miss298 && !missState298.battle?.opening && missState298.battle?.state === 'lose', json(missState298));
      await shot('pink298_explicit_miss'); await page.waitForTimeout(2300); await press('KeyC');
      const retry298 = await until(() => window.game.battle?.state === 'retry', 3000), retryIntro298 = await until(() => window.game.battle?.state === 'intro', 8000);
      check('BUILD298 pink retry restores ordinary intro cleanup', !!retry298 && !!retryIntro298 && (await snapshot()).battle?.opening === null, json({ retry298, retryIntro298, state: await snapshot() }));
      await runRecoveryLifecycle(); return;
    }
    if (!await selectSupplement('choso') || !await queueSupplement('choso')) return;
    const chosoWarning = await until(() => window.game.battle?.gimmick?.snapshot?.scenario?.beams?.some(beam => beam.age < beam.warned), 4000);
    if (chosoWarning) await shot('pink_supplement_choso_beam_warning');
    const chosoActive = await until(() => window.game.battle?.gimmick?.snapshot?.scenario?.beams?.some(beam => beam.age >= beam.warned), 3000);
    if (chosoActive) await shot('pink_supplement_choso_beam_active');
    const { hits: chosoHits, attempts: chosoAttempts } = await hitChoso();
    check('pink supplement choso: six actual projectiles stop six moving blood beams', chosoHits === 6, json({ hits: chosoHits, attempts: chosoAttempts, warning: !!chosoWarning, active: !!chosoActive }));
    if (!await cleanupSupplementRound('choso', chosoHits === 6, { hits: chosoHits, attempts: chosoAttempts })) return;
    if (!await selectSupplement('kart_block') || !await queueSupplement('kart_block')) return;
    // The first Kart wave leaves the center lane open. Fire three real normal
    // shots there before moving for blockers; this also drives the standard
    // pink-round branch through the same deterministic-but-natural contact.
    const kartCenter = await checkKartCenterShots(await fireKartCenterShots(), 'pink_supplement_kart_boss_center_shots');
    let kartCleared = 0, kartAttempts = 0; const kartKinds = new Set();
    while (kartCleared < 4 && kartAttempts++ < 16) {
      const blocker = await until(() => window.game.battle?.gimmick?.snapshot?.scenario?.blockers?.find(item => item.age >= 0.5) || null, 5000);
      if (!blocker) break;
      kartKinds.add(blocker.kind); await moveHeart(blocker.y); await press('KeyC');
      await page.evaluate(value => { window.__choimisQa.pinkSupplementCleared = value; }, kartCleared);
      const next = await until(() => { const value = window.game.battle?.gimmick?.snapshot?.scenario?.cleared ?? window.__choimisQa.roundLatches.kart_block?.cleared; return Number.isFinite(value) && value > window.__choimisQa.pinkSupplementCleared ? value : null; }, 5000);
      kartCleared = next || kartCleared;
    }
    for (const key of ['kart_block-dao', 'kart_block-bazzi']) await saveRoundCapture(key);
    if (!await cleanupSupplementRound('kart_block', kartCleared === 4 && kartKinds.has('dao') && kartKinds.has('bazzi') && kartCenter.hpDrop && kartCenter.contactSfx === 3 && kartCenter.remainder, { cleared: kartCleared, kinds: [...kartKinds], ...kartCenter })) return;
    if (!await selectSupplement('pink_prism') || !await queueSupplement('pink_prism')) return;
    const prism = await clearPrism();
    for (const key of ['pink_prism-shield-active', 'pink_prism-core-active', 'pink_prism-charge']) await saveRoundCapture(key);
    check('pink supplement prism: charged shots break three shields and three real shots hit the exposed core',
      prism.shields === 0 && prism.coreHits === 3 && prism.chargeShots >= 3, json(prism));
    if (!await cleanupSupplementRound('pink_prism', prism.shields === 0 && prism.coreHits === 3, prism)) return;
    if (!await selectSupplement('choso') || !await queueSupplement('choso')) return;
    await fixture('pink-supplement-explicit-loss', 'Inject party defeat in the target-local pink round to verify disposal; this is an explicit miss fixture and makes no natural completion claim.', () => game.battle.hurtAllParty(999));
    const lostRound = await until(() => window.game.battle?.state === 'lose', 3000);
    const lostRoundState = await snapshot();
    check('pink supplement explicit miss disposes gimmick', !!lostRound && !lostRoundState.battle?.opening && lostRoundState.battle?.state === 'lose', json(lostRoundState));
    await shot('pink_supplement_explicit_miss'); await page.waitForTimeout(2300); await press('KeyC');
    const retryRound = await until(() => window.game.battle?.state === 'retry', 3000);
    const retryIntroRound = await until(() => window.game.battle?.state === 'intro', 8000);
    check('pink supplement retry restores the ordinary intro state', !!retryRound && !!retryIntroRound && (await snapshot()).battle?.opening === null, json({ retryRound, retryIntroRound, state: await snapshot() }));
    await runRecoveryLifecycle();
    return;
  }
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
  await shot('21_battle_menu_hp200');
  const idleFrames = [];
  for (let i = 0; i < 8; i++) { idleFrames.push(await page.evaluate(() => { const b = game.battle, e = b?.enemies?.[0]; return b && e ? { t: b.t, frame: Math.floor(b.t * (e.def.sheet?.fps || 5.5)) % (e.def.sheet?.count || 4), pose: e.patternPose, ox: e.ox, oy: e.oy } : null; })); await page.waitForTimeout(180); }
  check('floating boss idle visibly cycles cape/idle frames while remaining at the stable home pose', new Set(idleFrames.filter(Boolean).map(f => f.frame)).size >= 2 && idleFrames.every(f => !f?.pose), json(idleFrames));
  await shot('22_boss_idle_cape_flap');

  if (process.env.QA_SKIP_KARAOKE !== '1') {
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
  const saveAudioBoundary = async (target, name) => {
    const details = await page.evaluate(time => window.__choimisQa.audioBoundaryCaptures?.find(capture => capture.time === time) || null, target);
    const file = await shot(name);
    if (details?.data) fs.writeFileSync(file, Buffer.from(details.data.split(',')[1], 'base64'));
    const cue = Number.isFinite(details?.actual) ? await page.evaluate(time => window.__choimisQa.lyricAt(time)?.text || null, details.actual) : null;
    trace.observations.push({ label: `karaoke-boundary-${name}`, target, actual: details?.actual, cue, captured: !!details?.data, file }); save();
    return { details, cue, file };
  };
  await waitForLyric('쟤들은 날 이해 하지 못해', 42.334, 44.959, 'karaoke_verse_under_menu');
  await waitForLyric('오늘도 스읍 미스', 44.959, 46.271, 'karaoke_verse_last_line');
  await waitForLyric('최미스! 최미스! 가재맨! 방고닉!', 46.271, 52.365, 'karaoke_chant_first');
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
  if (mediaCaps.seekable.some(([, end]) => end >= 144.334)) {
    await fixture('karaoke-seek-pause-loop-boundary', 'Explicitly seek the real battle audio element to the repeat-pass cue, pause it, and leave gameplay state and pattern timers untouched. This checks the renderer recomputes from currentTime rather than retaining stale lyric state.', () => {
      const audio = game.sound.bgm;
      window.__choimisQa.seekProbe = { before: audio?.currentTime, pausedBefore: audio?.paused, readyState: audio?.readyState, duration: audio?.duration };
      if (audio) { audio.currentTime = 144.334; audio.pause(); }
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
    await waitForLyric('가재맨 방 고닉 최미스', 144.334, 147.334, 'karaoke_repeat_pass_natural', 120000);
  }
  await fixture('karaoke-resume-after-boundary-observation', 'Resume the same real battle audio element after the paused repeat-boundary probe; no battle state or timer is injected.', async () => {
    const audio = game.sound.bgm;
    if (audio?.paused) await audio.play().catch(() => {});
  });
  await waitForLyric('1500, 1500, 경섭이 1500', 178.271, 184.365, 'karaoke_1500_repeat_boundary', 120000);
  const boundaryFrames = {};
  for (const [time, name] of [[58.121, 'karaoke_1500_before'], [58.271, 'karaoke_1500_after'], [58.421, 'karaoke_1500_after_150ms'], [178.121, 'karaoke_1500_repeat_before'], [178.271, 'karaoke_1500_repeat_after'], [178.421, 'karaoke_1500_repeat_after_150ms']]) boundaryFrames[name] = await saveAudioBoundary(time, name);
  check('1500 cue begins at the delayed first-pass audio boundary with before/after frames', boundaryFrames.karaoke_1500_before.cue === '최미스! 오늘도 가순이 만나야' && boundaryFrames.karaoke_1500_after.cue === '1500, 1500, 경섭이 1500' && boundaryFrames.karaoke_1500_after_150ms.cue === '1500, 1500, 경섭이 1500', json(Object.fromEntries(Object.entries(boundaryFrames).slice(0, 3).map(([name, value]) => [name, { cue: value.cue, actual: value.details?.actual, captured: !!value.details?.data, file: value.file }]))));
  check('1500 cue repeats at the delayed loop boundary with before/after frames', boundaryFrames.karaoke_1500_repeat_before.cue === '최미스! 오늘도 가순이 만나야' && boundaryFrames.karaoke_1500_repeat_after.cue === '1500, 1500, 경섭이 1500' && boundaryFrames.karaoke_1500_repeat_after_150ms.cue === '1500, 1500, 경섭이 1500', json(Object.fromEntries(Object.entries(boundaryFrames).slice(3).map(([name, value]) => [name, { cue: value.cue, actual: value.details?.actual, captured: !!value.details?.data, file: value.file }]))));
  const resetProbe = await fixture('karaoke-loop-reset', 'Reset only the real BGM element to the start of its loop and resume it; no battle state or timers are injected.', async () => {
    const audio = game.sound.bgm;
    if (audio) { audio.currentTime = 0; await audio.play().catch(() => {}); }
  });
  const loopReset = await page.evaluate(() => ({ time: game.sound.bgm?.currentTime, paused: game.sound.bgm?.paused, cue: window.__choimisQa.lyricAt(game.sound.bgm?.currentTime)?.text || null }));
  check('karaoke loop reset returns to audio time zero without retaining the repeat lyric', loopReset.time < 1 && loopReset.cue === null, json(loopReset));
  await until(() => window.game.sound.bgm?.currentTime >= 18 ? true : null, 30000);
  }

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
  const activePatterns = process.env.QA_PATTERN_SOURCE === 'B' ? PATTERNS.filter(pattern => pattern.source === 'B') : PATTERNS;
  for (const pattern of activePatterns) {
    await fixture(`pattern-select-${pattern.name}`, `Explicitly resolve ${pattern.type} through nextPatternConfig before using the real attack/menu input. This is not a natural boss-completion claim.`, ({ type }) => {
      const b = game.battle, e = b.enemies[0]; e.hp = e.maxHp;
      for (e.patternIdx = 0; e.patternIdx < 128 && b.nextPatternConfig(e).config?.type !== type; e.patternIdx++);
      if (e.patternIdx === 128) throw new Error(`No reachable registered ${type}`);
      b.members.forEach(m => { m.down = false; m.hp = m.maxHp; });
    }, { type: pattern.type });
    await page.evaluate(() => { window.__choimisQa.frames = []; });
    const queued = await queueRound();
    await until(() => ['enemy-prep', 'bullets', 'board-close'].includes(window.game.battle?.state) ? true : null, 7000);
    const queuedState = await snapshot();
    check(`${pattern.name}: real menu/attack input queues a full party turn`, queued, json(queuedState));
    check(`${pattern.name}: boosted Choimis takes exactly three damage from each party attack`, queued && queuedState.battle?.enemies?.[0]?.hp === 191 && queuedState.battle?.enemies?.[0]?.defenseBoosted === true, json({ hp: queuedState.battle?.enemies?.[0]?.hp, defenseBoosted: queuedState.battle?.enemies?.[0]?.defenseBoosted }));
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
    const endAt = Date.now() + (pattern.name === 'rap' ? 24000 : 14000);
    while (Date.now() < endAt) {
      const q = await page.evaluate(() => { const b = game.battle; return b ? { state: b.state, bubble: b.bubble?.text || null, bullets: (b.bullets || []).map(x => ({ id: x.__qaId, shape: x.shape, text: x.text, denomination: x.denomination, look: x.look, age: x.age, warn: x.warn, x: x.x, y: x.y })), pose: b.enemies[0]?.patternPose || null } : null; });
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
      const renderedFrames = await page.evaluate(() => window.__choimisQa.frames || []);
      for (const bullet of renderedFrames.flatMap(q => q.bullets.filter(b => b.shape === 'choimis_lyric')).filter(b => b.text)) {
        if (seenLyricBullets.has(bullet.id)) continue;
        seenLyricBullets.add(bullet.id); orderedLyrics.push(bullet.text);
      }
      const expectedText = '래퍼딱지를때는중이젠앰씨로예술가의길로!@#!@$!@#@#$포에버포에버';
      const expectedChunks = Array.from(expectedText.repeat(Math.ceil(orderedLyrics.length / expectedText.length)).slice(0, orderedLyrics.length));
      const lyrics = orderedLyrics.join('');
      const mic = observed.flatMap(q => q.bullets).find(b => b.shape === 'choimis_mic');
      const rapVideo = await page.evaluate(() => window.__choimisQa.rapVideo);
      if (rapVideo?.frames?.[0]?.data) {
        const file = await shot('pattern_rap_video_active');
        fs.writeFileSync(file, Buffer.from(rapVideo.frames[0].data.split(',')[1], 'base64'));
        trace.observations.push({ shot: file, label: 'pattern_rap_video_active', frame: { ...rapVideo.frames[0], data: undefined } }); save();
      }
      check('rap: centered MIC and exact repeated single-glyph lyric sequence render in the active turn', orderedLyrics.length >= expectedText.length && json(orderedLyrics) === json(expectedChunks) && !!mic, json({ orderedLyrics, mic, renderedFrameCount: renderedFrames.length }));
      check('rap: 19-second source video starts once, renders an actual frame, and stops once', rapVideo?.starts?.length === 1 && rapVideo.starts[0].options?.src === 'assets/video/choimis-forever-22-41.mp4' && rapVideo?.frames?.length >= 1 && rapVideo?.stops?.length === 1, json({ starts: rapVideo?.starts, stops: rapVideo?.stops, frames: rapVideo?.frames?.map(frame => ({ ...frame, data: undefined })) }));
    }
    if (pattern.name === 'money') check('money: rendered notes announce the 1500만원 denomination', observed.flatMap(q => q.bullets).some(b => b.shape === 'choimis_money_note' && b.denomination === '1500'), json(observed.flatMap(q => q.bullets).filter(b => b.shape === 'choimis_money_note').slice(0, 8)));
    if (pattern.name === 'seup') {
      const sfx = await page.evaluate(() => window.__choimisQa.sfx.map(x => x.name));
      check('seup: existing voice/SFX clip is emitted once for the pattern', sfx.filter(name => name === 'choimis_seup_miss').length === 1, json(sfx.filter(name => name === 'choimis_seup_miss')));
      const missBody = observed.some(q => q.bullets.some(b => b.shape === 'choimis_miss' && b.age >= b.warn));
      const missWarnings = observed.some(q => q.bullets.some(b => b.shape === 'choimis_miss' && b.age < b.warn));
      check('seup: MISS warnings become active rendered bodies after warning', missWarnings && missBody, json({ missWarnings, missBody, active: observed.flatMap(q => q.bullets).filter(b => b.shape === 'choimis_miss').slice(-12) }));
      for (const shape of ['choimis_miss']) {
        const captured = await page.evaluate(name => window.__choimisQa[name], shape);
        check(`seup: ${shape} has an actual visible active-body canvas capture`, !!captured);
        if (captured) {
          const file = await shot(`pattern_${shape}_active_body`);
          fs.writeFileSync(file, Buffer.from(captured.split(',')[1], 'base64'));
        }
      }
      const missWord = await page.evaluate(() => window.__choimisQa.missActiveFrame || null);
      const missWordFile = await saveDataUrl('pattern_choimis_miss_word_active', missWord);
      check('seup: active MISS word is captured inside the board after warning', !!missWordFile && missWord.x > 120 && missWord.x < 350, json({ x: missWord?.x, age: missWord?.age, file: missWordFile }));
    }
    if (pattern.name === 'fashion') {
      const looks = [...new Set(observed.flatMap(q => q.bullets.filter(b => b.shape === 'choimis_outfit').map(b => b.look)).filter(look => look !== undefined))];
      check('fashion: seven pink outfit looks render in sequence', json(looks) === json([0, 1, 2, 3, 4, 5, 6]), json(looks));
      const bubbles = [...new Set(observed.map(q => q.bubble).filter(Boolean))];
      check('fashion: four configured outfit bubbles appear during the actual pattern', bubbles.length === 4, json({ bubbles, expected: 4 }));
      const fashionFrames = await page.evaluate(() => window.__choimisQa.fashionFrames || {});
      const fashionFiles = [];
      for (const look of [0, 1, 2, 3, 4, 5, 6]) fashionFiles.push(await saveDataUrl(`pattern_fashion_look_${look}_active`, fashionFrames[look]));
      check('fashion: each configured outfit has an actual settled active-body canvas capture', fashionFiles.every(Boolean), json({ looks: Object.keys(fashionFrames), files: fashionFiles }));
    }
  }

  if (process.env.QA_PATTERN_ONLY === '1') {
    trace.observations.push({ label: 'bounded-pattern-stop', source: process.env.QA_PATTERN_SOURCE || 'all', reason: 'QA_PATTERN_ONLY requested after real pattern render checks; pink rounds and natural full completion are not claimed.' }); save();
    return;
  }

  if (process.env.QA_PINK_SUPPLEMENT !== '1') {
    trace.observations.push({ label: 'scoped-pink-rounds-required', reason: 'Current timed 18-second pink-round QA is exercised by the explicit QA_PINK_SUPPLEMENT=1 command; no obsolete target-count completion claim is made in the ordinary pattern route.' }); save();
    return;
  }

  // Target-local pink rounds are a separate registry route from the six
  // ordinary source patterns above.  Every round below is selected by fixture
  // index only, then driven through the real menu/input/update/render path.
  const PINK_ROUNDS = [
    { name: 'choso', label: 'Choso blood-beam round', required: 6 },
    { name: 'kart_block', label: 'Kart blocker round', required: 4 },
    { name: 'pink_prism', label: 'Pink prism charged-break round', required: 3 },
  ];
  const selectPinkRound = async scenario => {
    const selected = await fixture(`pink-round-select-${scenario}`, `Select only the registered ${scenario} target-local pink round for real menu/input QA; no shots, HP, or completion state are injected.`, ({ scenario: expected }) => {
      const b = game.battle, e = b?.enemies?.[0];
      const index = e?.def?.patterns?.findIndex(pattern => pattern?.mode === 'choimis_pink_round' && pattern.scenario === expected) ?? -1;
      window.__choimisQa.pinkRoundFixture = { scenario: expected, index, found: index >= 0 };
      if (index < 0) return false;
      e.hp = e.maxHp;
      for (e.patternIdx = 0; e.patternIdx < 128 && b.nextPatternConfig(e).config?.scenario !== expected; e.patternIdx++);
      if (e.patternIdx === 128) throw new Error(`No reachable pink ${expected}`);
      e.dead = false; e.dying = 0;
      b.memberIdx = 0; b.menuIdx = 0;
      b.members.forEach(member => { member.down = false; member.hp = member.maxHp; });
      return true;
    }, { scenario });
    check(`${scenario}: registered pink-round route is available`, selected === true, json(await page.evaluate(() => window.__choimisQa.pinkRoundFixture)));
    await page.evaluate(scenario => { window.__choimisQa.pinkRoundHits = 0; window.__choimisQa.kartCleared = 0; window.__choimisQa.prismCoreHits = 0; delete window.__choimisQa.roundLatches[scenario]; delete window.__choimisQa.roundHistory[scenario]; }, scenario);
    return selected === true;
  };
  const startPinkRound = async scenario => {
    const queued = await queueRound();
    check(`${scenario}: real menu/attack input queues the target-local pink round`, queued, json(await snapshot()));
    const started = await until(() => {
      const b = window.game.battle, opening = b?.gimmick?.snapshot;
      return b?.state === 'enemy-mode' && b.activeEnemyMode === 'choimis_pink_round' && opening?.scenario?.kind === window.__choimisQa.pinkRoundFixture?.scenario ? opening : null;
    }, 8000);
    check(`${scenario}: pink round starts through the registered enemy mode`, !!started, json(started || await snapshot()));
    if (!started) return null;
    await shot(`pink_round_${scenario}_prep`);
    const combat = await until(() => {
      const b = window.game.battle, opening = b?.gimmick?.snapshot;
      return b?.activeEnemyMode === 'choimis_pink_round' && opening?.phase === 'combat' ? opening : null;
    }, 5000);
    check(`${scenario}: black lower panel leaves prep and opens its combat board`, !!combat, json(combat));
    if (combat) {
      await page.evaluate(() => { window.__choimisQa.roundSfxBefore = Object.fromEntries(window.__choimisQa.sfx.map(sound => [sound.name, (window.__choimisQa.sfx.filter(item => item.name === sound.name).length)])); });
      await shot(`pink_round_${scenario}_combat`);
    }
    return combat;
  };
  const finishPinkRound = async (scenario, passed, detail) => {
    const ended = await until(() => window.game.battle?.state === 'menu' && !window.game.battle?.gimmick && !window.game.battle?.activeEnemyMode, 8000);
    check(`${scenario}: round cleanup returns to normal menu after its target condition`, !!ended && passed, json({ ended, ...detail }));
    trace.observations.push({ label: `pink-round-${scenario}`, ended: !!ended, passed, detail }); save();
    return !!ended && passed;
  };
  const inspectPinkBoss = async scenario => {
    const history = await page.evaluate(name => window.__choimisQa.roundHistory[name] || [], scenario);
    const bossSamples = history.map(entry => entry.boss).filter(boss => Number.isFinite(boss?.x));
    const hpSamples = history.map(entry => entry.enemyHp).filter(Number.isFinite);
    const hpDrop = hpSamples.some((hp, index) => index > 0 && hp < hpSamples[index - 1]);
    const maxRemainder = history.reduce((max, entry) => Math.max(max, Number(entry.bossHits) || 0), 0);
    const cycleDamage = history.some((entry, index) => index > 0 && Number.isFinite(entry.enemyHp) && entry.enemyHp < history[index - 1].enemyHp && entry.bossHits === 0);
    const farRight = bossSamples.length > 0 && bossSamples.every(boss => boss.x > 300 && boss.x < 410 && boss.y > 80 && boss.y < 240);
    trace.observations.push({ label: `pink-round-${scenario}-boss-history`, value: { samples: history.length, farRight, hpDrop, cycleDamage, maxRemainder, first: history[0], last: history.at(-1) } }); save();
    check(`${scenario}: actual white Choimis target remains far-right inside the pink board`, farRight, json({ samples: bossSamples.slice(0, 4), count: bossSamples.length }));
    check(`${scenario}: three unique projectile contacts deal one HP and never overcount the same boss target`, hpDrop && cycleDamage && maxRemainder <= 2, json({ hpSamples, hpDrop, cycleDamage, maxRemainder }));
    return { history, hpDrop, cycleDamage, maxRemainder, farRight };
  };
  for (const pink of PINK_ROUNDS) {
    if (!await selectPinkRound(pink.name)) return;
    const combat = await startPinkRound(pink.name);
    if (!combat) return;
    if (pink.name === 'choso') {
      const warning = await until(() => window.game.battle?.gimmick?.snapshot?.scenario?.beams?.some(beam => beam.age < beam.warned) ? true : null, 4000);
      if (warning) await shot('pink_round_choso_beam_warning');
      const active = await until(() => window.game.battle?.gimmick?.snapshot?.scenario?.beams?.some(beam => beam.age >= beam.warned) ? true : null, 3000);
      if (active) await shot('pink_round_choso_beam_active');
      const { hits, attempts } = await hitChoso();
      const hitSfx = await page.evaluate(() => window.__choimisQa.sfx.filter(sound => sound.name === 'hit').length - (window.__choimisQa.roundSfxBefore?.hit || 0));
      if (hits < pink.required) check(`choso: actual projectile reaches all six beam-stop hits`, false, json({ hits, attempts, required: pink.required, warning, active }));
      const boss = await inspectPinkBoss('choso');
      if (!await finishPinkRound('choso', hits === pink.required && boss.hpDrop && boss.cycleDamage && boss.maxRemainder <= 2, { hits, hitSfx, attempts, required: pink.required, warning: !!warning, active: !!active, boss })) return;
    } else if (pink.name === 'kart_block') {
      const kartCenter = await checkKartCenterShots(await fireKartCenterShots(), 'pink_round_kart_boss_center_shots');
      let cleared = 0; const kinds = new Set();
      let roundAttempts = 0;
      while (cleared < pink.required && roundAttempts < pink.required * 4) {
        roundAttempts++;
        const blocker = await until(() => {
          const value = window.game.battle?.gimmick?.snapshot?.scenario?.blockers?.find(item => item.age >= 0.5);
          if (value) window.__choimisQa.kartTarget = value;
          return value || null;
        }, 5000);
        if (!blocker) break;
        kinds.add(blocker.kind);
        if (!await movePinkHeart(blocker.y)) break;
        await press('KeyC');
        const next = await until(() => {
          const value = window.game.battle?.gimmick?.snapshot?.scenario?.cleared ?? window.__choimisQa.roundLatches.kart_block?.cleared;
          return Number.isFinite(value) && value > window.__choimisQa.kartCleared ? value : null;
        }, 5000);
        await page.evaluate(value => { window.__choimisQa.kartCleared = value; }, next || cleared);
        cleared = next || cleared;
        check(`kart block: actual sprite blocker cleared ${cleared}/${pink.required}`, !!next, json({ blocker, cleared }));
        if (!next) break;
      }
      const kartSfx = await page.evaluate(() => window.__choimisQa.sfx.filter(sound => sound.name === 'kart_booster').length - (window.__choimisQa.roundSfxBefore?.kart_booster || 0));
      for (const key of ['kart_block-dao', 'kart_block-bazzi']) await saveRoundCapture(key);
      const boss = await inspectPinkBoss('kart_block');
      if (!await finishPinkRound('kart_block', cleared === pink.required && kartSfx >= pink.required && kinds.has('dao') && kinds.has('bazzi') && kartCenter.hpDrop && kartCenter.contactSfx === 3 && kartCenter.remainder && boss.hpDrop && boss.cycleDamage && boss.maxRemainder <= 2, { cleared, kartSfx, required: pink.required, kinds: [...kinds], kartCenter, boss })) return;
    } else {
      const { shields, coreHits, chargeShots, coreAttempts } = await clearPrism();
      for (const key of ['pink_prism-shield-active', 'pink_prism-core-active', 'pink_prism-charge']) await saveRoundCapture(key);
      check('pink prism: charged shots break all rotating shields', shields === 0 && chargeShots >= 3, json({ shields, chargeShots }));
      const boss = await inspectPinkBoss('pink_prism');
      if (!await finishPinkRound('pink_prism', shields === 0 && coreHits === 3 && boss.hpDrop && boss.cycleDamage && boss.maxRemainder <= 2, { shields, chargeShots, coreHits, coreAttempts, boss })) return;
    }
  }

  await selectPinkRound('choso');
  const missQueued = await startPinkRound('choso');
  if (!missQueued) return;
  await fixture('pink-round-explicit-loss', 'Inject party defeat while the target-local round is active to verify mode disposal; this is an explicit miss fixture and does not claim natural boss completion.', () => game.battle.hurtAllParty(999));
  const miss = await until(() => window.game.battle?.state === 'lose', 3000);
  const missState = await snapshot();
  check('pink round explicit miss disposes gimmick and restores battle cleanup state', !!miss && !missState.battle?.opening && missState.battle?.state === 'lose', json(missState));
  await shot('pink_round_explicit_miss_game_over');
  await page.waitForTimeout(2300); await press('KeyC');
  const retry = await until(() => window.game.battle?.state === 'retry', 3000);
  const retryIntro = await until(() => window.game.battle?.state === 'intro', 8000);
  check('pink round retry clears the miss and reloads its ordinary intro state', !!retry && !!retryIntro && (await snapshot()).battle?.opening === null, json({ retry, retryIntro, state: await snapshot() }));

  await runRecoveryLifecycle();
});
