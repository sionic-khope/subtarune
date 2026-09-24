import { MALZAHAR_RUNNER as C } from '../../data/malzahar-runner.js';
import { RUNNER, SLASH_BOX, createRunner, stepRunner } from '../../world/runner-core.js';
import { drawRunnerFrame, drawRunnerAura } from '../../world/runner-render.js';
import { CHAR_SCALE } from '../../world/world.js';
import { FONT } from '../../ui/font.js';
import { drawMalzaharBackground } from './malzahar-background.js';

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { const k = Math.max(0, Math.min(1, t)); return k * k * (3 - 2 * k); };
const rectangleOverlap = (x, y, w, h, left, top, right, bottom) => x + w > left && x - w < right && y + h > top && y - h < bottom;

/** Fullscreen runner mode using the field runner's simulation, frames and input edges. */
export function createMalzaharRunner(battle, { enemy }) {
  const g = battle.game, view = battle.cfg.runnerView || {};
  const run = g.map?.def?.meta?.run;
  const runner = battle.cfg.runnerState ? structuredClone(battle.cfg.runnerState) : createRunner({ x: 0, endX: Infinity });
  runner.phase = 'run'; runner.endX = Infinity; runner.vx = runner.speed;
  runner.obstacles = null; runner.finale = null; runner.tutorial = null;
  if (!battle.cfg.runnerState) { runner.anim = 'run'; runner.frame = 0; }
  const startX = runner.x;
  let elapsed = 0, cycleTime = 0, cycle = 0, counters = 0, dashes = 0, phase = 'enter', phaseTime = 0;
  let disposed = false, invulnerability = 0, flash = 0, hurtFlash = 0, particles = [], hazards = [], slashEffects = [];
  let dashTrail = [], trailClock = 0;
  let victoryAt = null, hpTarget = enemy.hp, hpDisplay = enemy.hp, hpTrail = enemy.hp, hpTrailHold = 0;
  const hpMax = enemy.maxHp ?? enemy.def.hp ?? C.counters;
  let firedQ = false, spawnedW = 0, firedW = false, firedDash = false, dash = null, returnFrom = null;
  const boss = { x: C.boss.from[0], y: C.boss.from[1] };
  const playerPosition = () => ({ x: lerp(view.x ?? C.player.x, C.player.x, smooth(elapsed / C.entrySeconds)), groundY: lerp(view.groundY ?? C.player.groundY, C.player.groundY, smooth(elapsed / C.entrySeconds)) });
  const chargingOrbs = () => phase !== 'enter' && cycleTime >= C.q.at && cycleTime < C.q.at + C.q.warn
    ? Array.from({ length: C.q.count }, (_, index) => ({ x: C.q.x + index * C.q.spacing, y: playerPosition().groundY - C.q.height, progress: (cycleTime - C.q.at) / C.q.warn })) : [];
  const playerScale = () => lerp(1, C.player.scale, smooth(elapsed / C.entrySeconds));
  const entryProgress = () => smooth(elapsed / C.entrySeconds);
  const sound = (key, volume = 1) => battle.sfx(C.sfx[key] || key, { volume });
  const change = next => { phase = next; phaseTime = 0; };
  const burst = (x, y, count = C.effects.particles) => {
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2, speed = 65 + (i % 5) * 27;
      particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, t: 0, life: C.effects.life, color: C.colors.particles[i % C.colors.particles.length] });
    }
  };
  const slashBox = () => {
    const attack = runner.attack;
    if (!attack || attack.t < C.slash.from || attack.t > (attack.kind === 'slash' ? RUNNER.slashTime : RUNNER.airSlashTime) * C.slash.until) return null;
    const p = playerPosition(), box = SLASH_BOX[attack.kind === 'slash' ? 'ground' : 'air'].map(value => value * C.player.scale);
    const height = attack.kind === 'slash' ? 0 : runner.airY;
    return [p.x + box[0], p.groundY - height - box[3], p.x + box[1], p.groundY - height - box[2]];
  };
  const hurt = () => {
    if (invulnerability > 0 || disposed) return;
    invulnerability = C.invulnerability; hurtFlash = C.effects.hurtFlash;
    battle.hurtParty(enemy.def.damage ?? C.damage);
  };
  const beginReturn = () => { returnFrom = { ...boss }; change('return'); };
  const counter = () => {
    if (dash.countered || disposed) return;
    dash.countered = true;
    const applied = battle.hitEnemy(enemy, null, C.counterDamage, { source: 'malzahar_counter', sound: false });
    if (!(applied > 0) || disposed) return;
    counters++; sound('counter'); flash = C.effects.flash; g.shake = { ...C.effects.shake };
    burst(boss.x, boss.y); returnFrom = { ...boss };
    if (counters === C.counters) { hazards = []; victoryAt = elapsed; change('victory'); }
    else change('recoil');
  };
  const launchDash = () => {
    const p = playerPosition(), dx = p.x - boss.x, dy = p.groundY - C.dash.height - boss.y, distance = Math.hypot(dx, dy);
    dash = { vx: dx / distance * C.dash.speed, vy: dy / distance * C.dash.speed, countered: false, hit: false };
    dashes++; firedDash = true; sound('dash', 0.9); change('dash');
  };
  const resetCycle = () => {
    cycle++; cycleTime = 0; firedQ = false; spawnedW = 0; firedW = false; firedDash = false; dash = null;
    change('hover');
  };
  function tick(dt, keys) {
    elapsed += dt; phaseTime += dt;
    if (hpTarget !== enemy.hp) { hpTarget = enemy.hp; hpTrailHold = C.hpHud.trailHold; }
    hpDisplay = Math.max(hpTarget, hpDisplay - dt * C.counterDamage / C.hpHud.drainSeconds);
    hpTrailHold = Math.max(0, hpTrailHold - dt);
    if (hpTrailHold === 0) hpTrail = Math.max(hpDisplay, hpTrail - dt * C.hpHud.trailRate);
    invulnerability = Math.max(0, invulnerability - dt); flash = Math.max(0, flash - dt); hurtFlash = Math.max(0, hurtFlash - dt);
    const events = stepRunner(runner, dt, victoryAt === null ? keys : {});
    for (const event of events) {
      if (['jump', 'slash', 'airslash', 'skid'].includes(event)) sound(event);
      if (event === 'slash' || event === 'airslash') slashEffects.push({ kind: event, up: !!runner.attack?.up, t: 0, dur: event === 'slash' ? 0.26 : RUNNER.airSlashTime });
    }
    for (const effect of slashEffects) effect.t += dt;
    slashEffects = slashEffects.filter(effect => effect.t < effect.dur);
    for (const bit of particles) { bit.t += dt; bit.x += bit.vx * dt; bit.y += bit.vy * dt; bit.vy += 180 * dt; }
    particles = particles.filter(bit => bit.t < bit.life);
    for (const point of dashTrail) point.age += dt;
    dashTrail = dashTrail.filter(point => point.age < C.dashTrail.life);
    if (phase === 'enter') {
      const k = smooth(phaseTime / C.entrySeconds);
      boss.x = lerp(C.boss.from[0], C.boss.home[0], k); boss.y = lerp(C.boss.from[1], C.boss.home[1], k);
      if (phaseTime >= C.entrySeconds) change('hover');
      return;
    }
    if (victoryAt !== null) {
      const age = elapsed - victoryAt;
      boss.x = returnFrom.x + age * 80; boss.y = returnFrom.y - age * 55;
      if (phase === 'victory' && age >= C.victoryBrakeDelay && runner.grounded && !runner.attack) {
        runner.endX = runner.x + RUNNER.brakeDist;
        change('stopping');
      }
      if (phase === 'stopping' && runner.phase === 'done') change('done');
      return;
    }
    cycleTime += dt;
    const p = playerPosition();
    if (!firedQ && cycleTime >= C.q.at + C.q.warn) {
      firedQ = true; sound('q', 0.8);
      for (let i = 0; i < C.q.count; i++) hazards.push({ kind: 'q', x: C.q.x + C.q.spacing * i, y: p.groundY - C.q.height, w: C.q.radius, h: C.q.radius, vx: -C.q.speed, age: 0 });
    }
    if (!firedW && cycleTime >= C.w.at + C.w.warn) { firedW = true; sound('w', 0.85); }
    while (spawnedW < C.w.count && cycleTime >= C.w.at + C.w.warn + C.w.every * spawnedW) {
      hazards.push({ kind: 'w', x: C.w.x, y: p.groundY - C.w.height / 2, w: C.w.halfWidth, h: C.w.height / 2, vx: -C.w.speed, age: 0 }); spawnedW++;
    }
    if (!firedDash && cycleTime >= C.dash.at && phase === 'hover') change('warn');
    if (phase === 'warn' && phaseTime >= C.dash.warn) launchDash();
    if (phase === 'dash') {
      boss.x += dash.vx * dt; boss.y += dash.vy * dt;
      trailClock += dt;
      if (trailClock >= C.dashTrail.every) { trailClock %= C.dashTrail.every; dashTrail.push({ x: boss.x, y: boss.y, age: 0 }); }
      const slash = slashBox();
      if (slash && rectangleOverlap(boss.x, boss.y, C.boss.radius, C.boss.radius, ...slash)) counter();
      else if (!dash.hit && rectangleOverlap(boss.x, boss.y, C.boss.radius, C.boss.radius, p.x - C.player.halfWidth, p.groundY - runner.airY - C.player.height, p.x + C.player.halfWidth, p.groundY - runner.airY)) { dash.hit = true; hurt(); }
      if (disposed) return;
      if (phase === 'dash' && boss.x <= C.dash.endX) beginReturn();
    } else if (phase === 'recoil') {
      boss.x = returnFrom.x + Math.sin(Math.min(1, phaseTime / C.dash.recoil) * Math.PI / 2) * 65;
      boss.y = returnFrom.y - Math.sin(Math.min(1, phaseTime / C.dash.recoil) * Math.PI / 2) * 35;
      if (phaseTime >= C.dash.recoil) beginReturn();
    } else if (phase === 'return') {
      const k = smooth(phaseTime / C.dash.returnSeconds);
      boss.x = lerp(returnFrom.x, C.boss.home[0], k); boss.y = lerp(returnFrom.y, C.boss.home[1], k);
      if (phaseTime >= C.dash.returnSeconds) change('hover');
    }
    if (disposed) return;
    const slash = slashBox();
    for (const hazard of hazards) {
      hazard.age += dt; hazard.x += hazard.vx * dt;
      if (hazard.kind === 'w' && slash && rectangleOverlap(hazard.x, hazard.y, hazard.w, hazard.h, ...slash)) { hazard.dead = true; sound('deflect', 0.7); burst(hazard.x, hazard.y, 10); }
      else if (rectangleOverlap(hazard.x, hazard.y, hazard.w, hazard.h, p.x - C.player.halfWidth, p.groundY - runner.airY - C.player.height, p.x + C.player.halfWidth, p.groundY - runner.airY)) { hazard.dead = true; hurt(); }
      if (disposed) return;
    }
    hazards = hazards.filter(hazard => !hazard.dead && hazard.x > -C.w.size);
    if (cycleTime >= C.cycleSeconds && phase === 'hover') resetCycle();
  }
  function drawSheet(ctx, image, meta, x, y, size, pivot = [0.5, 0.5], time = elapsed, once = false) {
    if (!image) return;
    const cols = meta?.cols ?? 2, rows = meta?.rows ?? 2, count = meta?.count ?? 4;
    const raw = Math.floor(time * (meta?.fps ?? C.boss.fps)), frame = once ? Math.min(count - 1, raw) : raw % count;
    const fw = image.width / cols, fh = image.height / rows;
    ctx.drawImage(image, frame % cols * fw, Math.floor(frame / cols) * fh, fw, fh, Math.round(x - size * pivot[0]), Math.round(y - size * pivot[1]), size, size);
  }
  function drawPlayer(ctx, p) {
    const frameOf = (anim, index) => {
      const sheet = g.characterMotions?.hyungsub?.[`runner_${anim}`];
      return sheet?.frames?.length ? { frame: sheet.frames[Math.min(index, sheet.frames.length - 1)], scale: sheet.scale * CHAR_SCALE * playerScale() } : null;
    };
    ctx.save();
    for (const [i, trail] of runner.trail.entries()) {
      const fr = frameOf(trail.anim, trail.frame); if (!fr) continue;
      ctx.globalAlpha = 0.12 * (i + 1) / runner.trail.length;
      drawRunnerFrame(ctx, fr.frame.image, fr.frame, fr.scale, p.x + trail.x - runner.x, p.groundY - trail.airY, trail.angle, runner.dir);
    }
    ctx.globalAlpha = invulnerability > 0 && Math.floor(invulnerability * 16) % 2 ? 0.38 : lerp(1, C.player.alpha, entryProgress());
    const fr = frameOf(runner.anim, runner.frame);
    if (fr) drawRunnerFrame(ctx, fr.frame.image, fr.frame, fr.scale, p.x, p.groundY - runner.airY, runner.tilt, runner.dir);
    ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(p.x, p.groundY - runner.airY); ctx.scale(playerScale(), playerScale()); ctx.translate(-p.x, -(p.groundY - runner.airY));
    for (const effect of slashEffects) {
      const k = effect.t / effect.dur;
      if (effect.kind === 'slash') {
        const from = effect.up ? Math.PI * 0.55 : -Math.PI * 0.55;
        drawRunnerAura(ctx, p.x + 24, p.groundY - runner.airY - 24, 40, from, from + (effect.up ? -1 : 1) * Math.PI * 1.1 * Math.min(1, k * 1.6), 1 - k * k);
      } else drawRunnerAura(ctx, p.x + 18, p.groundY - runner.airY - 26, 44, -Math.PI * 0.95, -Math.PI * 0.95 + Math.PI * 1.25 * Math.min(1, k * 1.5), 1 - k * k);
    }
    ctx.restore();
    ctx.globalAlpha = entryProgress();
    if (invulnerability <= 0 || Math.floor(invulnerability * 16) % 2 === 0) battle.heart(ctx, Math.round(p.x + 3), Math.round(p.groundY - runner.airY - C.player.heartHeight * playerScale() / C.player.scale));
    ctx.restore();
  }
  function drawVoidOrb(ctx, x, y, progress, moving) {
    const radius = C.q.radius * (0.25 + progress * 0.75), clock = Math.floor(elapsed * 12);
    const lobe = (cx, cy, r, color) => {
      const size = Math.max(2, Math.round(r / 2) * 2), px = Math.round(cx / 2) * 2, py = Math.round(cy / 2) * 2;
      ctx.fillStyle = color; ctx.fillRect(px - size, py - size / 2, size * 2, size);
      ctx.fillRect(px - size / 2, py - size, size, size * 2);
      ctx.fillRect(px - size + 2, py - size + 2, size * 2 - 4, size * 2 - 4);
    };
    ctx.save(); ctx.globalAlpha = 0.3 + progress * 0.7;
    if (moving) for (let i = C.q.wisps; i > 0; i--) {
      const drift = Math.sin(clock * 0.7 + i * 1.8 + x * 0.02);
      lobe(x + radius + i * 9, y + drift * (4 + i * 2), Math.max(2, radius * (0.75 - i * 0.13)), i % 2 ? '#0b0514' : C.colors.dark);
    }
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4, flutter = ((clock + i * 3) % 5) - 2;
      const distance = radius + C.q.aura / 2 + flutter;
      lobe(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, C.q.aura / 2 + (i + clock) % 3, i % 3 ? '#09050f' : C.colors.dark);
    }
    lobe(x, y, radius + 3, C.colors.dark);
    lobe(x, y, radius, C.colors.aura);
    for (let i = 0; i < 5; i++) {
      const angle = i * 1.256 + clock * 0.35;
      lobe(x + Math.cos(angle) * radius * 0.62, y + Math.sin(angle) * radius * 0.62, 3 + i % 2, i % 2 ? C.colors.dark : C.colors.core);
    }
    lobe(x - 2, y - 2, radius * 0.35, C.colors.core);
    ctx.restore();
  }
  return {
    fullscreen: true, hpStrip: true, preserveFinalFrame: true,
    get hudAlpha() { return entryProgress(); },
    get snapshot() { return { phase, phaseTime, elapsed, cycle, cycleTime, counters, dashes, disposed, invulnerability, hp: enemy.hp, hpMax, hpDisplay, hpTrail, boss: { ...boss }, player: playerPosition(), runner: { ...runner, attack: runner.attack && { ...runner.attack }, trail: runner.trail.map(t => ({ ...t })) }, hazards: hazards.map(h => ({ ...h })), chargingOrbs: chargingOrbs(), dashTrail: dashTrail.map(point => ({ ...point })), flash, hurtFlash, particles: particles.length }; },
    update(dt, input) {
      if (disposed || phase === 'done') return true;
      const keys = { jump: input.just('cancel'), attack: input.just('confirm') };
      for (let remaining = Math.max(0, dt); remaining > 1e-9 && !disposed && phase !== 'done';) {
        const part = Math.min(remaining, 1 / 120); tick(part, keys); keys.jump = false; keys.attack = false; remaining -= part;
      }
      return disposed || phase === 'done';
    },
    draw(ctx) {
      const p = playerPosition(), travel = runner.x - startX, bossAlpha = victoryAt === null ? 1 : Math.max(0, 1 - (elapsed - victoryAt) / C.victorySeconds);
      ctx.save(); ctx.fillStyle = '#12101e'; ctx.fillRect(0, 0, 480, 360);
      const backdrop = g.propImages?.[`assets/backdrops/${g.map?.def?.backdrop}.png`];
      if (backdrop) ctx.drawImage(backdrop, 0, 0, 480, 360);
      if (g.map?.draw) {
        const y = Math.round((view.cameraY ?? 0) - (p.groundY - (view.groundY ?? C.player.groundY)));
        if (run) {
          if (!g.map.canvas) g.map.bake();
          const width = run.endX - run.startX;
          const offset = (((view.cameraX ?? run.startX) + travel - run.startX) % width + width) % width;
          ctx.drawImage(g.map.canvas, run.startX, 0, width, g.map.pxH, -Math.round(offset), -y, width, g.map.pxH);
          if (offset + 480 > width) ctx.drawImage(g.map.canvas, run.startX, 0, width, g.map.pxH, width - Math.round(offset), -y, width, g.map.pxH);
        } else g.map.draw(ctx, { x: Math.min(g.map.pxW - 480, (view.cameraX ?? 0) + travel), y });
      }
      ctx.fillStyle = `rgba(14,4,27,${0.28 * entryProgress()})`; ctx.fillRect(0, 0, 480, 320);
      drawMalzaharBackground(ctx, elapsed, battle);
      for (let i = 0; i < 10; i++) { ctx.fillStyle = `rgba(232,232,255,${0.16 * runner.vx / runner.speed})`; const x = 480 - ((elapsed * (230 + i * 14) + i * 49) % 550); ctx.fillRect(Math.round(x), 25 + i * 25, 32 + i % 3 * 8, 1); }
      ctx.save();
      for (let i = 0; i < C.smoke.count; i++) {
        const age = (elapsed / C.smoke.period + i / C.smoke.count) % 1, angle = i * 2.399963 + elapsed * 0.3;
        const x = Math.round((boss.x + Math.cos(angle) * C.smoke.width) / 2) * 2;
        const y = Math.round((boss.y + Math.sin(angle) * C.smoke.height - age * C.smoke.rise) / 2) * 2;
        const radius = Math.round(C.smoke.radius * (0.65 + age * 0.6) / 2) * 2;
        ctx.globalAlpha = C.smoke.alpha * Math.sin(Math.PI * age) * bossAlpha;
        ctx.fillStyle = C.smoke.colors[i % C.smoke.colors.length];
        ctx.fillRect(x - radius, y - radius + 2, radius * 2, radius * 2 - 4);
        ctx.fillRect(x - radius + 2, y - radius, radius * 2 - 4, radius * 2);
      }
      for (const point of dashTrail) {
        const age = point.age / C.dashTrail.life, bow = Math.sin(age * Math.PI) * C.dashTrail.arc;
        const width = C.dashTrail.width * (1 - age);
        const smokeWidth = C.dashTrail.smokeWidth * (1 - age * 0.6);
        ctx.globalAlpha = C.dashTrail.smokeAlpha * (1 - age); ctx.fillStyle = '#030207';
        ctx.fillRect(Math.round(point.x - smokeWidth / 2 + bow), Math.round(point.y - smokeWidth / 3 - bow), Math.round(smokeWidth), Math.round(smokeWidth * 0.66));
        ctx.fillRect(Math.round(point.x - smokeWidth / 3 + bow), Math.round(point.y - smokeWidth / 2 - bow), Math.round(smokeWidth * 0.66), Math.round(smokeWidth));
        ctx.globalAlpha = C.dashTrail.alpha * (1 - age); ctx.fillStyle = C.colors.aura;
        ctx.fillRect(Math.round(point.x - width / 2 + bow), Math.round(point.y - width / 2 - bow), Math.round(width), Math.round(width));
      }
      ctx.restore();
      const charging = phase === 'warn' || phase === 'dash';
      if (charging) {
        ctx.fillStyle = 'rgba(156,52,248,0.25)'; ctx.beginPath(); ctx.arc(boss.x, boss.y, C.boss.radius + 13 + Math.sin(elapsed * 22) * 3, 0, Math.PI * 2); ctx.fill();
        if (phase === 'warn') { ctx.strokeStyle = C.colors.aura; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(boss.x, boss.y); ctx.lineTo(p.x, p.groundY - C.dash.height); ctx.stroke(); ctx.setLineDash([]); }
      }
      ctx.globalAlpha = bossAlpha;
      const castingQ = cycleTime >= C.q.at && cycleTime < C.q.at + C.q.warn;
      const castingW = cycleTime >= C.w.at && cycleTime < C.w.at + C.w.warn;
      const action = phase === 'recoil' || victoryAt !== null ? 'hit' : phase === 'dash' ? 'dash' : charging || castingQ || castingW ? 'cast' : 'hover';
      const actionTime = victoryAt !== null ? elapsed - victoryAt : castingQ ? cycleTime - C.q.at : castingW ? cycleTime - C.w.at : phaseTime;
      drawSheet(ctx, enemy.actionImages?.[action] || enemy.img, enemy.def.actions?.[action] || enemy.def.sheet, boss.x, boss.y, C.boss.size, [0.5, 0.5], action === 'hover' ? elapsed : actionTime, action !== 'hover');
      ctx.globalAlpha = 1;
      for (const orb of chargingOrbs()) {
        drawVoidOrb(ctx, orb.x, orb.y, orb.progress, false);
      }
      if (castingW) { ctx.strokeStyle = C.colors.aura; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(452, p.groundY - 20, 14, 28, 0, 0, Math.PI * 2); ctx.stroke(); }
      for (const hazard of hazards) {
        if (hazard.kind === 'q') {
          drawVoidOrb(ctx, hazard.x, hazard.y, 1, true);
        } else drawSheet(ctx, enemy.projectiles?.voidling, { cols: 2, rows: 2, count: 4, fps: C.w.fps }, hazard.x, hazard.y, C.w.size, C.w.pivot.map(v => v / C.w.size));
      }
      drawPlayer(ctx, p);
      for (const bit of particles) { ctx.globalAlpha = 1 - bit.t / bit.life; ctx.fillStyle = bit.color; ctx.fillRect(Math.round(bit.x), Math.round(bit.y), 3, 3); }
      ctx.globalAlpha = 1;
      if (flash > 0) { ctx.fillStyle = `rgba(245,232,255,${flash / C.effects.flash * 0.65})`; ctx.fillRect(0, 0, 480, 320); }
      if (hurtFlash > 0) { ctx.fillStyle = `rgba(220,15,40,${hurtFlash / C.effects.hurtFlash * 0.25})`; ctx.fillRect(0, 0, 480, 320); }
      ctx.globalAlpha = entryProgress();
      ctx.font = FONT.replace(/^\d+px/, '12px'); ctx.textBaseline = 'top'; ctx.fillStyle = '#fff';
      ctx.fillText(`${C.text.title}  ${Math.max(0, enemy.hp)}/${hpMax}`, 18, 22);
      ctx.fillStyle = '#100817'; ctx.fillRect(C.hpHud.x, C.hpHud.y, C.hpHud.width, C.hpHud.height);
      ctx.fillStyle = C.hpHud.trailColor; ctx.fillRect(C.hpHud.x, C.hpHud.y, Math.round(C.hpHud.width * hpTrail / hpMax), C.hpHud.height);
      ctx.fillStyle = C.hpHud.color; ctx.fillRect(C.hpHud.x, C.hpHud.y, Math.round(C.hpHud.width * hpDisplay / hpMax), C.hpHud.height);
      ctx.strokeStyle = '#e9def4'; ctx.lineWidth = 1; ctx.strokeRect(C.hpHud.x - 0.5, C.hpHud.y - 0.5, C.hpHud.width + 1, C.hpHud.height + 1);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right'; ctx.fillText(C.text.controls, 462, 22);
      ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.fillRect(12, 12, 456, 1); ctx.fillRect(12, 320, 456, 1);
      ctx.restore();
    },
    dispose() { if (disposed) return; disposed = true; hazards = []; particles = []; slashEffects = []; dashTrail = []; g.sound?.walk?.(null); },
  };
}
