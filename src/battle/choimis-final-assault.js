import { CHOIMIS_FINAL_ASSAULT as C } from '../data/choimis-final-assault.js';
import { createFinalAssaultRenderer } from './choimis-final-assault-render.js';
import { TextBalloon } from '../ui/bubble.js';
import { CHOIMIS_PINK_SHOOTER as P, createPinkFireControl, createPinkShot, createPinkShotAudio,
  registerPinkTargetHit, sweptCirclesHit } from './modes/choimis-pink-shooter.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const held = (input, key) => input.down?.(key) ?? input.held?.(key) ?? input.held?.[key] ?? false;
const previous = item => ({ x: item.oldX, y: item.oldY });
const hit = (a, b) => sweptCirclesHit(previous(a), a, a.r, previous(b), b, b.r);

/** Full-screen sixty-second survival assault. HP and victory remain owned by Battle. */
export function createChoimisFinalAssault(battle, enemy, { box = C.box } = {}) {
  const soul = battle.soul, originalSoul = { x: soul.x, y: soul.y, invuln: soul.invuln };
  const fireControl = createPinkFireControl(P), audio = createPinkShotAudio(battle);
  const renderer = createFinalAssaultRenderer(enemy);
  const balloon = new TextBalloon(), bubbleTarget = { x: 0, y: 0, w: 0, h: 0 };
  let bubblesShown = 0, chatterShown = 0, nextSpeech = 0, bubbleKind = null;
  let transformed = false, transformations = 0, speechHandle = null, transformStarted = 0, waveStarted = -Infinity, waveWarning = C.warn;
  const centerY = box.y + box.h / 2, amplitude = Math.min(C.corridorAmplitude, box.h / 2 - 45);
  const corridor = time => centerY + Math.sin(time * C.corridorFrequency) * amplitude;
  const corridorSpeed = amplitude * C.corridorFrequency;
  const boss = { id: 'final-boss', x: box.x + box.w - C.bossInset, y: centerY, r: C.bossRadius, flash: 0 };
  let elapsed = 0, nextWave = C.firstWave, nextBeam = C.beamFirst, sequence = 0, wave = 0;
  let shots = [], hazards = [], effects = [], contacts = 0, destroyed = 0, spawned = 0, disposed = false;
  soul.x = P.heartX; soul.y = centerY; soul.invuln = 0;
  const stage = () => Math.min(3, Math.floor(elapsed / C.stageSeconds));
  const stopSpeech = () => {
    if (!speechHandle) return;
    speechHandle.pause?.(); speechHandle.removeAttribute?.('src'); speechHandle.load?.(); speechHandle = null;
  };
  const transform = () => {
    stopSpeech(); transformed = true; transformations++; transformStarted = elapsed; bubbleKind = 'transform';
    balloon.start(bubbleTarget, { text: C.transform.text, hold: C.transform.duration });
    balloon.shown = balloon.text.length; balloon.phase = 'hold'; balloon.timer = C.transform.duration;
    speechHandle = battle.game.sound.sfx?.(C.transform.sfx, { volume: 0.9 }) || null;
    nextSpeech = elapsed + C.speech.startGap;
  };
  const poseAt = () => {
    const beam = hazards.findLast(hazard => hazard.kind === 'beam' && hazard.age < hazard.life);
    const age = beam ? beam.age : elapsed - waveStarted, warn = beam?.warn ?? waveWarning;
    const swing = beam ? C.beamHit : C.motion.swing;
    let motion = 'idle', progress = 0, frame = 0, offset = 0;
    if (age >= 0 && age < warn) {
      motion = 'windup'; progress = age / warn; frame = progress < 0.5 ? 0 : 1;
      offset = C.motion.windupBack * Math.sin(progress * Math.PI / 2);
    } else if (age < warn + swing) {
      motion = 'swing'; progress = (age - warn) / swing;
      frame = transformed ? 2 : progress < 0.5 ? 2 : 3;
      offset = C.motion.windupBack - (C.motion.windupBack + C.motion.lunge) * Math.sin(progress * Math.PI / 2);
    } else if (age < warn + swing + C.motion.recover) {
      motion = 'recover'; progress = (age - warn - swing) / C.motion.recover;
      frame = transformed ? 3 : progress < 0.5 ? 4 : 5;
      offset = -C.motion.lunge * (1 - progress) ** 2;
    }
    return { sheet: transformed ? 'choso' : motion === 'idle' ? 'idle' : 'capeSwing', frame, motion, progress, offset, beam };
  };
  const moveBoss = dt => {
    const pose = poseAt();
    boss.oldX = boss.x; boss.oldY = boss.y;
    const blend = 1 - Math.exp(-dt * C.motion.response);
    const targetX = box.x + box.w - C.bossInset + Math.sin(elapsed * C.motion.xFrequency) * C.motion.xAmplitude + pose.offset;
    const targetY = centerY + Math.sin(elapsed * C.bossFrequency) * Math.min(C.bossAmplitude, box.h / 2 - 55);
    const distance = Math.hypot(targetX - boss.x, targetY - boss.y);
    const travel = Math.min(blend, C.motion.maxSpeed * dt / (distance || 1));
    boss.x = pose.beam ? pose.beam.from.x + 14 : boss.x + (targetX - boss.x) * travel;
    boss.y = pose.beam ? pose.beam.from.y + 10 : boss.y + (targetY - boss.y) * travel;
    boss.pose = { sheet: pose.sheet, frame: pose.frame, motion: pose.motion, progress: pose.progress };
  };
  const burst = (x, y) => {
    for (let i = 0; i < 6 && effects.length < C.maxEffects; i++) effects.push({ x, y, vx: (i - 2.5) * 25, vy: -24 + i * 9, life: 0.32 });
  };
  const hurt = () => {
    if (soul.invuln > 0 || disposed) return;
    battle.hurtParty(enemy.def.damage ?? 15);
    if (!disposed) { soul.invuln = P.invulnerability; burst(soul.x, soul.y); }
  };
  const spawnWave = () => {
    const phase = stage(), speed = C.speeds[phase], x = box.x + box.w + 20;
    const kinds = phase < 2 ? ['noodle', 'petal', 'noodle'] : ['noodle', 'money', 'daoKart', 'petal', 'bazziKart'];
    const kind = kinds[wave % kinds.length], kart = kind.endsWith('Kart');
    const r = kart ? 17 : kind === 'noodle' ? 9 : 6, warn = kart ? C.kartWarn : C.warn;
    if (elapsed >= waveStarted + waveWarning + C.motion.swing + C.motion.recover) {
      waveStarted = elapsed; waveWarning = warn;
    }
    const arrival = elapsed + warn + (x - soul.x) / speed;
    const safe = corridor(arrival), guard = C.corridorHalfWidth + r + soul.r + corridorSpeed * (r + soul.r) / speed;
    for (let row = 0, y = box.y + C.rowMargin; y < box.y + box.h - C.rowMargin; row++, y += C.rowSpacing) {
      if (Math.abs(y - safe) < guard || hazards.length >= C.maxHazards) continue;
      hazards.push({ id: `final-hazard-${sequence++}`, kind, x, y, oldX: x, oldY: y, r, age: 0, warn, speed,
        safeY: safe, arrival, row, dead: false }); spawned++;
    }
    wave++; nextWave += C.waveEvery[phase];
  };
  const spawnBeam = () => {
    const safe = corridor(elapsed + C.beamWarn + C.beamHit / 2);
    const gap = C.corridorHalfWidth + C.beamRadius + soul.r + corridorSpeed * C.beamHit / 2;
    const prefer = wave % 2 ? box.y + 35 : box.y + box.h - 35;
    const lockedY = Math.abs(prefer - safe) > gap ? prefer : (prefer < centerY ? box.y + box.h - 35 : box.y + 35);
    const from = { x: boss.x - 14, y: boss.y - 10 }, toX = box.x - 16;
    const toY = from.y + (lockedY - from.y) * (toX - from.x) / (soul.x - from.x);
    hazards.push({ id: `final-beam-${sequence++}`, kind: 'beam', x: from.x, y: from.y, from, to: { x: toX, y: toY },
      r: C.beamRadius, age: 0, warn: C.beamWarn, life: C.beamWarn + C.beamHit, fired: false, lockedY });
    spawned++; nextBeam += C.beamEvery[stage()];
  };
  const updateHazards = dt => {
    for (const hazard of hazards) {
      const before = hazard.age; hazard.age += dt;
      if (hazard.kind === 'beam') {
        if (hazard.age < hazard.warn || hazard.age >= hazard.life) continue;
        if (!hazard.fired) { hazard.fired = true; battle.sfx('choimis_piercing_blood', { volume: 0.85 }); }
        const dx = hazard.to.x - hazard.from.x, dy = hazard.to.y - hazard.from.y;
        const u = clamp(((soul.x - hazard.from.x) * dx + (soul.y - hazard.from.y) * dy) / (dx * dx + dy * dy), 0, 1);
        if (Math.hypot(soul.x - hazard.from.x - dx * u, soul.y - hazard.from.y - dy * u) <= soul.r + hazard.r) hurt();
      } else {
        hazard.oldX = hazard.x; hazard.oldY = hazard.y;
        hazard.x -= hazard.speed * Math.max(0, hazard.age - Math.max(before, hazard.warn));
      }
      if (disposed) return;
    }
  };
  const contactShots = () => {
    for (const shot of shots) {
      for (const hazard of hazards) {
        if (shot.dead) break;
        if (hazard.kind === 'beam' || hazard.dead || hazard.age < hazard.warn || !hit(shot, hazard)) continue;
        if (!registerPinkTargetHit(shot, hazard.id)) continue;
        shot.contacts++; burst(hazard.x, hazard.y);
        if (!hazard.kind.endsWith('Kart') || shot.charged) { hazard.dead = true; destroyed++; }
        battle.sfx('pop', { volume: 0.18, rate: 0.8 });
      }
      if (shot.dead || !hit(shot, boss) || !registerPinkTargetHit(shot, boss.id)) continue;
      shot.contacts++; contacts++; boss.flash = 0.12; burst(boss.x - 14, shot.y);
      battle.sfx('pop', { volume: 0.384, rate: 0.8 });
    }
  };
  const step = (dt, input) => {
    elapsed = Math.min(C.seconds, elapsed + dt);
    const previousShown = balloon.shown;
    balloon.update(dt);
    if (bubbleKind !== 'transform' && balloon.shown > previousShown && /\S/.test(balloon.text.slice(previousShown, balloon.shown))) battle.game.sound.blip?.(C.speech.voice);
    const chosoWindow = elapsed >= C.transform.at && elapsed < C.seconds && elapsed % C.stageSeconds < C.transform.window;
    if (!transformed && chosoWindow) {
      transform(); nextBeam = elapsed + Math.max(C.transform.duration, C.beamFirst - C.transform.at);
    } else if (transformed && !chosoWindow) transformed = false;
    if (speechHandle && elapsed - transformStarted >= C.transform.duration) {
      if (speechHandle.ended === false && speechHandle.paused === false) {
        balloon.done = false; balloon.target = bubbleTarget; balloon.phase = 'hold'; balloon.timer = C.step;
      } else stopSpeech();
    }
    soul.oldX = soul.x; soul.oldY = soul.y; soul.x = P.heartX;
    soul.invuln = Math.max(0, soul.invuln - dt);
    soul.y = clamp(soul.y + (Number(held(input, 'down')) - Number(held(input, 'up'))) * P.heartSpeed * dt,
      box.y + C.heartMargin, box.y + box.h - C.heartMargin);
    moveBoss(dt);
    boss.flash = Math.max(0, boss.flash - dt);
    for (const event of fireControl.update(dt, input)) {
      if (event.type === 'charge') audio.charge();
      else if (shots.length < C.maxShots) {
        shots.push({ ...createPinkShot(soul.x + 11, soul.y, event.charged), id: `final-shot-${sequence++}`, contacts: 0 });
        audio.fire(event.charged);
      }
    }
    if (elapsed >= nextWave && elapsed < C.seconds - 1) spawnWave();
    if (transformed && !speechHandle && elapsed >= nextBeam && elapsed % C.stageSeconds < C.transform.window - C.beamWarn - C.beamHit
      && hazards.length < C.maxHazards) spawnBeam();
    for (const shot of shots) { shot.oldX = shot.x; shot.oldY = shot.y; shot.x += P.shotSpeed * dt; }
    updateHazards(dt);
    if (disposed) return;
    contactShots();
    const line = C.resolveLines[bubblesShown];
    const chatter = C.chatterLines[chatterShown];
    if (balloon.done && elapsed >= nextSpeech) {
      const resolve = line && contacts >= line.contacts;
      const speech = resolve ? line : chatter && elapsed >= chatter.at ? chatter : null;
      if (speech) {
        balloon.start(bubbleTarget, { text: speech.text, hold: C.speech.hold, cps: C.speech.cps });
        if (resolve) bubblesShown++; else chatterShown++;
        bubbleKind = resolve ? 'resolve' : 'chatter'; nextSpeech = elapsed + C.speech.startGap;
      }
    }
    bubbleTarget.x = boss.x;
    bubbleTarget.y = Math.max(80, boss.y - 80 * (enemy.def.scale ?? 1) * (enemy.def.scaleY ?? 1) + 48);
    for (const hazard of hazards) {
      if (hazard.kind !== 'beam' && !hazard.dead && hazard.age >= hazard.warn && hit(hazard, soul)) {
        hurt(); if (disposed) return;
      }
    }
    for (const effect of effects) { effect.x += effect.vx * dt; effect.y += effect.vy * dt; effect.life -= dt; }
    shots = shots.filter(shot => !shot.dead && shot.x < box.x + box.w + 20);
    hazards = hazards.filter(hazard => !hazard.dead && (hazard.kind === 'beam' ? hazard.age < hazard.life : hazard.x > box.x - 30));
    effects = effects.filter(effect => effect.life > 0);
  };
  const snapshot = () => ({ elapsed: Math.round(elapsed * 1000) / 1000, duration: C.seconds, stage: stage(),
    boss: { ...boss }, heart: { x: soul.x, y: soul.y, invuln: soul.invuln }, box: { ...box },
    shots: shots.map(shot => ({ ...shot })), hazards: hazards.map(hazard => ({ ...hazard })), effects: effects.map(effect => ({ ...effect })),
    charge: fireControl.snapshot, safeY: corridor(elapsed), contacts, destroyed, spawned, disposed,
    bubblesShown, chatterShown, transformed, transformations,
    bubble: balloon.done ? null : { text: balloon.text, shown: balloon.shown, kind: bubbleKind } });
  return {
    get snapshot() { return snapshot(); },
    update(dt, input) {
      if (disposed) return elapsed + 1e-9 >= C.seconds;
      let remaining = Math.min(Math.max(0, dt), C.seconds - elapsed);
      while (remaining > 1e-9 && !disposed) { const delta = Math.min(C.step, remaining); step(delta, input); remaining -= delta; }
      if (elapsed + 1e-9 < C.seconds) return false;
      elapsed = C.seconds; fireControl.dispose(); audio.stop(); stopSpeech(); return true;
    },
    draw(ctx) { if (!disposed) { renderer.draw(ctx, snapshot()); balloon.draw(ctx, { x: 0, y: 0 }); } },
    dispose() {
      if (disposed) return;
      disposed = true; shots = []; hazards = []; effects = []; fireControl.dispose(); audio.dispose(); stopSpeech();
      balloon.done = true; balloon.target = null;
      Object.assign(soul, originalSoul);
    },
  };
}
