import { BARON_SEA_CHASE as CONFIG } from '../data/baron-sea-chase.js';
import { loadImageOptional, makeCanvas, drawBox, drawHeart } from '../core/gfx.js';
import { characterSprite, drawDimmed, SCREEN_W, SCREEN_H, CHAR_SCALE } from '../world/world.js';
import { FONT } from '../ui/font.js';
import L from '../data/locale/ko.js';

/** Scene-local projectiles, health and explicit tutorial/fight/drift outcomes. */
export class SeaChaseModel {
  constructor({ cleared = false, config = CONFIG } = {}) {
    this.config = config;
    this.phase = cleared ? 'cleared' : 'sail';
    this.phaseTime = 0; this.time = 0; this.fightTime = 0; this.motionTime = 0; this.scroll = 0;
    this.raftY = config.raft.y; this.bossX = config.boss.x; this.bossY = config.boss.baseY;
    this.hits = cleared ? config.hitsToClear : 0;
    this.playerHits = 0; this.invulnerable = 0; this.enraged = false; this.enrageRoar = 0;
    this.cooldown = 0; this.flash = 0; this.recoil = 0;
    this.projectiles = []; this.attacks = []; this.warning = null;
    this.attackClock = config.attacks.firstDelay; this.attackIndex = 0;
    this.lastImpact = null;
    // Conservative fallback follows the visible neck; real sprite alpha replaces it after load.
    this.opaqueAt = (x, y) => x >= 0.38 && x <= 0.7 && y >= 0.38 && y < config.boss.submerged;
  }
  /** Both outcomes release the script waiter; victory keeps the scene on screen. */
  get outcome() { return this.phase === 'cleared' ? 'cleared' : this.phase === 'failed' ? 'failed' : null; }
  get completed() { return this.outcome !== null; }
  /** Dialogue completion is owned by the existing TextBox. */
  setPhase(phase) { this.phase = phase; this.phaseTime = 0; }
  /** Shared pose and transform keep collision aligned with the current rendered frame. */
  frame() { const s = this.config.sheet; return this.phase === 'roar' || this.enrageRoar > 0 || this.warning ? s.roar : this.flash > 0 ? s.hurt : this.phase === 'cleared' ? s.recovery : s.idle; }
  waterline() { return Math.round(this.bossY) + this.config.boss.height * this.config.boss.submerged; }
  mouth() { const b = this.config.boss; return { x: Math.round(this.bossX) + b.width * b.mouth[0], y: Math.round(this.bossY) + b.height * b.mouth[1] }; }
  /** One rounded raft transform drives the character and its only vulnerable point. */
  raftPose(entryX = this.config.raft.x) {
    const c = this.config;
    const sail = this.phase === 'sail' ? 1 - Math.min(1, this.phaseTime / c.sailDuration) : 0;
    const recoil = this.recoil > 0 ? this.recoil / 0.15 * 4 : 0;
    const drift = this.phase === 'sinking' ? Math.pow(this.phaseTime / c.driftDuration, 1.4) * 370 : 0;
    return { x: Math.round(c.raft.x + (entryX - c.raft.x) * sail * sail - recoil), y: Math.round(this.raftY + Math.round(Math.sin(this.time * 5) * 2) + drift) };
  }
  /** The three-pixel-diameter collision circle stays inside the colored heart. */
  playerHeart() {
    const pose = this.raftPose(), heart = this.config.heart;
    return { x: pose.x + heart.x, y: pose.y + heart.y, radius: heart.radius };
  }
  attackInterval() { return this.config.attacks.interval * (this.enraged ? this.config.enrage.attackMultiplier : 1); }
  /** A bolt samples every logical pixel traversed, including the drawn two-pixel core. */
  hitsBoss(shot, oldX) {
    const b = this.config.boss, bx = Math.round(this.bossX), by = Math.round(this.bossY);
    for (let x = Math.max(oldX, bx); x <= Math.min(shot.x, SCREEN_W, bx + b.width); x++) {
      for (const y of [shot.y - 1, shot.y, shot.y + 1]) {
        if (y >= this.waterline()) continue;
        if (this.opaqueAt((x - bx) / b.width, (y - by) / b.height, this.frame())) {
          this.lastImpact = { x, y }; return true;
        }
      }
    }
    return false;
  }
  /** Aimed droplet volleys alternate with a divided fan leaving a broad moving escape. */
  updateAttacks(dt, events) {
    const c = this.config, a = c.attacks, heart = this.playerHeart();
    this.attacks = this.attacks.filter(attack => {
      const speed = Math.hypot(attack.vx, attack.vy) || 1;
      const length = Math.min(attack.length || 0, (4 - attack.life) * speed);
      const oldX = attack.x - attack.vx / speed * length, oldY = attack.y - attack.vy / speed * length;
      attack.x += attack.vx * dt; attack.y += attack.vy * dt; attack.life -= dt;
      const dx = attack.x - oldX, dy = attack.y - oldY;
      const k = Math.max(0, Math.min(1, ((heart.x - oldX) * dx + (heart.y - oldY) * dy) / (dx * dx + dy * dy || 1)));
      const radius = attack.radius * (length > 0 ? 0.55 + 0.45 * k : 1);
      if (this.invulnerable <= 0 && Math.hypot(oldX + dx * k - heart.x, oldY + dy * k - heart.y) < radius + heart.radius) {
        this.playerHits++; this.invulnerable = c.invulnerability; events.push('player-hit');
      }
      return attack.life > 0 && attack.x > -45;
    });
    if (this.playerHits >= c.playerMaxHits) {
      this.setPhase('sinking'); this.attacks = []; this.projectiles = []; this.warning = null; events.push('sinking'); return;
    }
    if (this.enrageRoar > 0) return;
    if (this.warning) {
      this.warning.remaining -= dt;
      if (this.warning.remaining > 0) return;
      const mouth = this.mouth(), warning = this.warning;
      const targets = warning.kind === 'aimed' ? [warning.targetY - 20, warning.targetY, warning.targetY + 20] : a.lanes.filter(y => Math.abs(y - warning.gapY) >= a.gap / 2);
      for (const targetY of targets) {
        const dx = warning.targetX - mouth.x, dy = targetY - mouth.y, distance = Math.hypot(dx, dy);
        this.attacks.push({ x: mouth.x, y: mouth.y, vx: dx / distance * a.speed, vy: dy / distance * a.speed, radius: warning.kind === 'aimed' ? a.blobRadius : a.sweepRadius, length: warning.kind === 'sweep' ? a.plumeLength : 0, life: 4, kind: warning.kind });
      }
      this.warning = null; this.attackClock = this.attackInterval(); events.push('breath');
    } else {
      this.attackClock -= dt;
      if (this.attackClock <= 0) {
        const kind = this.attackIndex % 2 === 0 ? 'aimed' : 'sweep';
        this.warning = { kind, remaining: a.telegraph, targetX: heart.x, targetY: heart.y, gapY: this.attackIndex % 4 === 1 ? 130 : 218 };
        this.attackIndex++;
      }
    }
  }
  /** Emit sounds and presentation beats without depending on the renderer. */
  update(dt, input) {
    const c = this.config, events = [];
    this.time += dt; this.scroll += dt * (this.completed ? c.scrollSpeed * 0.07 : c.scrollSpeed);
    if (this.completed) return events;
    this.phaseTime += dt;
    if (this.phase === 'sinking') { if (this.phaseTime >= c.driftDuration) this.setPhase('failed'); return events; }
    this.cooldown -= dt; this.flash = Math.max(0, this.flash - dt); this.recoil = Math.max(0, this.recoil - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt); this.enrageRoar = Math.max(0, this.enrageRoar - dt);
    if (this.phase === 'sail' && this.phaseTime >= c.sailDuration) { this.setPhase('dialogue-help'); events.push('dialogue-help'); }
    if (this.phase === 'fight') {
      this.fightTime += dt; this.motionTime += dt * (this.enraged ? c.enrage.moveMultiplier : 1);
      this.bossY = c.boss.baseY + c.boss.amplitude * (1 - Math.cos(this.motionTime * Math.PI * 2 / c.boss.period)) / 2;
      this.bossX = c.boss.x + Math.sin(this.motionTime * 0.7) * c.boss.shift;
      this.raftY = Math.max(c.raft.minY, Math.min(c.raft.maxY, this.raftY + (Number(input.down('down')) - Number(input.down('up'))) * c.raft.speed * dt));
    }
    const tutorial = this.phase === 'tutorial';
    if ((tutorial ? input.just('confirm') : this.phase === 'fight' && input.down('confirm')) && this.cooldown <= 0) {
      this.projectiles.push({ x: c.raft.x + c.raft.gunX + c.raft.gunWidth, y: this.raftY + c.raft.gunY });
      this.cooldown = c.fireCooldown; this.recoil = 0.15; events.push('shot');
      if (tutorial) this.setPhase('tutorial-shot');
    }
    this.projectiles = this.projectiles.filter(shot => {
      const oldX = shot.x; shot.x += c.bulletSpeed * dt;
      if (this.hitsBoss(shot, oldX)) {
        this.flash = this.phase === 'tutorial-shot' ? c.hitDuration : c.shotFlashDuration;
        if (this.phase === 'tutorial-shot') { this.setPhase('tutorial-hit'); events.push('tutorial-hit'); }
        else if (this.phase === 'fight') { this.hits++; events.push('hit'); }
        return false;
      }
      return shot.x < SCREEN_W + 20;
    });
    if (this.phase === 'tutorial-hit' && this.phaseTime >= c.hitDuration) { this.setPhase('roar'); events.push('roar'); }
    else if (this.phase === 'roar' && this.phaseTime >= c.roarDuration) { this.setPhase('fight'); events.push('fight'); }
    if (this.phase === 'fight' && this.hits >= c.hitsToClear) {
      this.setPhase('cleared'); this.projectiles = []; this.attacks = []; this.warning = null; this.flash = 0; this.recoil = 0; events.push('clear');
    } else if (this.phase === 'fight') {
      if (!this.enraged && this.hits >= Math.ceil(c.hitsToClear * (1 - c.enrage.remaining))) {
        this.enraged = true; this.enrageRoar = c.enrage.roarDuration;
        this.warning = null; this.attackClock = this.attackInterval(); events.push('enrage');
      }
      this.updateAttacks(dt, events);
    }
    return events;
  }
}

/** Full-screen Canvas scene; owns presentation and uses the existing Input/TextBox. */
export class BaronSeaChase {
  constructor(game) {
    this.game = game;
    this.model = new SeaChaseModel({ cleared: !!game.flags.obj5_chase_cleared });
    this.particles = [];
    this.disposed = false;
    this.sheet = null;
    this.redSheet = null;
    this.gun = null;
    this.raft = game.ride || game.entities.find((entity) => entity.id === 'obj5_raft');
    this.entryRaftX = game.ride ? this.raft.x + this.raft.w / 2 - game.camera.x : CONFIG.raft.x;
    if (this.raft) this.raft.hold = true;
    this.playerSprite = game.player.sprite;
    this.swimmers = (game.party || []).map((id) => ({ id, sprite: characterSprite(id, game.spriteOverrides[id]) }));
    this.yongjun = characterSprite('yongjun', game.spriteOverrides.yongjun);
    game.textbox.close();
    game.setFlag('obj5_chase_started');
    game.sound.preloadBgm(CONFIG.bgm);
    if (this.completed) game.sound.playBgm(CONFIG.bgm, { volume: 0.6 });
    this.loadAssets();
  }

  /** Load optional sprite art without making input or fallback rendering dependent on it. */
  async loadAssets() {
    const [sheet, gun] = await Promise.all([loadImageOptional(CONFIG.sheet.src), loadImageOptional('assets/props/wooden_gun.png')]);
    if (this.disposed) return;
    this.gun = gun;
    if (!sheet) return;
    this.sheet = sheet;
    this.redSheet = makeCanvas(sheet.width, sheet.height);
    const ctx = this.redSheet.getContext('2d');
    ctx.drawImage(sheet, 0, 0);
    const pixels = ctx.getImageData(0, 0, sheet.width, sheet.height).data;
    const fw = sheet.width / CONFIG.sheet.cols, fh = sheet.height / CONFIG.sheet.rows;
    this.model.opaqueAt = (x, y, frame) => {
      if (x < 0 || x >= 1 || y < 0 || y >= 1) return false;
      const sx = Math.floor(x * fw) + frame % CONFIG.sheet.cols * fw;
      const sy = Math.floor(y * fh) + Math.floor(frame / CONFIG.sheet.cols) * fh;
      return pixels[(sy * sheet.width + sx) * 4 + 3] >= 128;
    };
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#ff314f'; ctx.fillRect(0, 0, sheet.width, sheet.height);
  }

  /** The cutscene runner can finish while the cleared standoff remains on screen. */
  get completed() { return this.model.completed; }
  get outcome() { return this.model.outcome; }

  /** Release transient effects and stale async asset work on title/reset/map changes. */
  dispose() { this.disposed = true; this.particles = []; this.model.projectiles = []; this.model.attacks = []; this.model.warning = null; this.game.textbox.close(); }

  /** Show the exact supplied dialogue, continuing the scene only when it closes. */
  showLine(index) {
    this.game.textbox.show(CONFIG.dialogue[index], this.game.ctx, () => {
      if (this.disposed) return;
      if (index === 0) { this.model.setPhase('dialogue-gun'); this.showLine(1); }
      else this.model.setPhase('tutorial');
    });
  }

  /** Advance scene-local input, sounds and particles; the field remains suspended. */
  update(dt, input) {
    if (this.disposed) return;
    const dialogueAtStart = this.model.phase.startsWith('dialogue');
    const events = this.model.update(dt, input);
    for (const event of events) {
      if (event === 'dialogue-help') this.showLine(0);
      if (event === 'shot') {
        this.game.sound.sfx('cannon_puff', { volume: 0.5, rate: 1.45 });
        this.burst(CONFIG.raft.x + CONFIG.raft.gunX + CONFIG.raft.gunWidth, this.model.raftY + CONFIG.raft.gunY, '#fff5cf', 7);
      }
      if (event === 'hit' || event === 'tutorial-hit') {
        this.game.sound.sfx('pop', { volume: 0.48, rate: 0.8 });
        const impact = this.model.lastImpact; this.burst(impact.x, impact.y, '#ffcb77', 7);
      }
      if (event === 'roar') this.game.sound.sfx('baron_roar', { volume: 0.9 });
      if (event === 'enrage') this.game.sound.sfx('baron_roar', { volume: 0.9 });
      if (event === 'breath') this.game.sound.sfx('cannon_guard_breath', { volume: 0.72 });
      if (event === 'player-hit') {
        this.game.sound.sfx('hurt', { volume: 0.7 });
        const heart = this.model.playerHeart();
        this.burst(heart.x, heart.y, '#e5ff9b', 14);
      }
      if (event === 'sinking') {
        this.game.sound.sfx('splash', { volume: 0.8 });
        this.game.textbox.show({ text: L.sea_chase_scream, voice: 'narrator', auto: 0.8 }, this.game.ctx, () => {});
      }
      if (event === 'fight') this.game.sound.playBgm(CONFIG.bgm, { volume: 0.6 });
      if (event === 'clear') { this.game.setFlag('obj5_chase_cleared'); this.particles = []; }
    }
    if (dialogueAtStart || this.model.phase === 'sinking') this.game.textbox.update(dt, input);
    for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  /** Short deterministic radial bursts make recoil and actual impacts visible. */
  burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count;
      this.particles.push({ x, y, vx: Math.cos(angle) * (35 + i * 3), vy: Math.sin(angle) * 55, life: 0.22 + i * 0.017, color });
    }
  }

  /** Render the forward ocean flow, living boss and party in logical pixels. */
  draw(ctx) {
    const m = this.model;
    this.drawOcean(ctx);
    ctx.save();
    if (m.phase === 'roar') ctx.translate(Math.round(Math.sin(m.phaseTime * 63) * 3), Math.round(Math.sin(m.phaseTime * 47) * 2));
    this.drawBoss(ctx);
    this.drawAttacks(ctx);
    this.drawRaft(ctx);
    for (const shot of m.projectiles) {
      ctx.fillStyle = '#66401f'; ctx.fillRect(Math.round(shot.x) - 9, Math.round(shot.y) - 2, 10, 4);
      ctx.fillStyle = '#ffe8a6'; ctx.fillRect(Math.round(shot.x) - 10, Math.round(shot.y) - 1, 11, 2);
    }
    for (const p of this.particles) { ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 3); }
    if (m.phase === 'fight') this.drawPlayerHeart(ctx);
    ctx.restore();
    if (m.phase === 'tutorial') {
      drawBox(ctx, 144, 286, 192, 42);
      ctx.font = FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe69a';
      ctx.fillText(L.sea_chase_prompt, SCREEN_W / 2, 307); ctx.textAlign = 'left';
    }
    if (m.phase === 'fight') {
      for (let i = 0; i < CONFIG.playerMaxHits; i++) drawHeart(ctx, 15 + i * 17, 15, i < CONFIG.playerMaxHits - m.playerHits ? '#ff526a' : '#23495d');
      ctx.fillStyle = '#123349'; ctx.fillRect(304, 14, 160, 5);
      ctx.fillStyle = m.enraged ? '#ff875e' : '#bf8bf6'; ctx.fillRect(304, 14, Math.ceil(160 * (1 - m.hits / CONFIG.hitsToClear)), 5);
      if (m.fightTime < 4) {
        ctx.font = FONT; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
        ctx.fillText(L.sea_chase_controls, 12, 342);
      }
    }
    this.game.textbox.draw(ctx);
  }

  /** Several speeds of sparse foam convey rightward travel without a land horizon. */
  drawOcean(ctx) {
    const m = this.model;
    ctx.fillStyle = '#146a9a'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    for (let i = 0; i < 34; i++) {
      const speed = 0.45 + (i % 5) * 0.2;
      const x = ((i * 97 - m.scroll * speed) % 560 + 560) % 560 - 40;
      const y = (i * 71) % SCREEN_H;
      ctx.fillStyle = i % 3 === 0 ? '#278eb2' : '#197aa6';
      ctx.fillRect(Math.round(x), y, 24 + i % 4 * 13, 3);
      ctx.fillStyle = '#409fba'; ctx.fillRect(Math.round(x + 4), y - 2, 10 + i % 3 * 7, 2);
    }
    const travel = m.completed ? 0 : Math.min(1, m.phaseTime / CONFIG.sailDuration);
    if (m.phase === 'sail') {
      ctx.fillStyle = '#a3e0df';
      for (let i = 0; i < 7; i++) ctx.fillRect(Math.round(40 - travel * 150 - i * 18), 146 + i * 18, 55, 2);
    }
  }

  /** Original raft and right-facing party sprites keep the boarding scene continuous. */
  drawRaft(ctx) {
    const m = this.model, r = CONFIG.raft;
    const { x, y } = m.raftPose(this.entryRaftX);
    ctx.fillStyle = '#a2dddd';
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 16 - i * 13, y + 21 + i % 2 * 5, 16, 2);
    const image = this.raft?.image;
    if (image) ctx.drawImage(image, x - r.width / 2, y - 9, r.width, r.height);
    else {
      ctx.fillStyle = '#754425'; ctx.fillRect(x - 40, y, 86, 29);
      ctx.fillStyle = '#bd8b46';
      for (let i = 0; i < 5; i++) ctx.fillRect(x - 39, y + 2 + i * 5, 82, 3);
    }
    if (m.invulnerable <= 0 || Math.floor(m.invulnerable * 14) % 2 === 0) this.drawCharacter(ctx, this.playerSprite, x, y + 8, CHAR_SCALE, m.phase === 'fight' ? m.config.heart.bodyDim : 0);
    const gunX = x + r.gunX, gunY = y + r.gunY;
    if (this.gun && !m.completed) {
      const height = Math.round(r.gunWidth * this.gun.height / this.gun.width);
      ctx.drawImage(this.gun, gunX, Math.round(gunY - height / 2 + 2), r.gunWidth, height);
    }
    this.swimmers.forEach(({ sprite }, index) => {
      const sx = x - 24 + index * 47, water = y + r.swimmerY + Math.round(Math.sin(m.time * 7 + index) * 2);
      ctx.save(); ctx.beginPath(); ctx.rect(sx - 25, water - 33, 50, 33); ctx.clip();
      this.drawCharacter(ctx, sprite, sx, water + 30, CHAR_SCALE); ctx.restore();
      ctx.fillStyle = '#b2e8e3'; ctx.fillRect(sx - 20, water, 38, 2);
    });
  }

  /** The outline is only contrast; invulnerability changes color, never visibility. */
  drawPlayerHeart(ctx) {
    const m = this.model, heart = m.playerHeart(), scale = m.config.heart.renderScale;
    const edge = 1 / scale;
    ctx.save();
    ctx.translate(Math.round(heart.x - 3.5 * scale), Math.round(heart.y - 3 * scale));
    ctx.scale(scale, scale);
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [-1, 1], [1, -1], [1, 1]]) drawHeart(ctx, dx * edge, dy * edge, '#101527');
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawHeart(ctx, dx * edge, dy * edge, '#ffffff');
    drawHeart(ctx, 0, 0, m.invulnerable > 0 && Math.floor(m.invulnerable * 14) % 2 ? '#ffffff' : '#ff2b4a');
    ctx.restore();
  }

  /** Draw a pre-sliced original walking sprite with its native cell proportions. */
  drawCharacter(ctx, sprite, x, bottom, scale, dim = 0) {
    const image = sprite.right[0];
    const w = Math.round(sprite.fw / sprite.px * scale), h = Math.round(sprite.fh / sprite.px * scale);
    const left = Math.round(x - w / 2), top = Math.round(bottom - h);
    if (dim) drawDimmed(ctx, image, left, top, w, h, dim);
    else ctx.drawImage(image, left, top, w, h);
  }

  /** The four generated poses share a normalized mouth anchor for the original Yongjun. */
  drawBoss(ctx, frameOverride = null) {
    const m = this.model, b = CONFIG.boss, sheet = CONFIG.sheet;
    const enter = m.phase === 'sail' ? (1 - Math.min(1, m.phaseTime / CONFIG.sailDuration)) * 180 : 0;
    const x = Math.round(m.bossX + enter), y = Math.round(m.bossY);
    const frame = frameOverride ?? m.frame(), water = Math.round(m.waterline());
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, b.width, water - y); ctx.clip();
    if (this.sheet) {
      const sw = this.sheet.width / sheet.cols, sh = this.sheet.height / sheet.rows;
      ctx.drawImage(this.sheet, frame % sheet.cols * sw, Math.floor(frame / sheet.cols) * sh, sw, sh, x, y, b.width, b.height);
      if (m.flash > 0) {
        ctx.globalAlpha = Math.min(0.62, m.flash * 7);
        ctx.drawImage(this.redSheet, frame % sheet.cols * sw, Math.floor(frame / sheet.cols) * sh, sw, sh, x, y, b.width, b.height);
        ctx.globalAlpha = 1;
      }
    } else {
      const fallback = this.game.spriteOverrides.baron;
      if (fallback) ctx.drawImage(fallback, x, y, b.width, b.height);
    }
    ctx.restore();
    ctx.fillStyle = '#115b84'; ctx.fillRect(x + 80, water, b.width - 95, 7);
    for (let i = 0; i < 9; i++) {
      const waveX = x + 58 + i * 20, waveY = water + Math.round(Math.sin(m.time * 4 + i) * 3);
      ctx.fillStyle = i % 2 ? '#9de9e4' : '#53bdd1'; ctx.fillRect(waveX, waveY, 25, 3);
      ctx.fillStyle = '#258cad'; ctx.fillRect(waveX - 8, waveY + 7, 29, 3);
    }
    const sprite = this.yongjun, img = sprite.down[0];
    const width = Math.round(sprite.fw / sprite.px * CHAR_SCALE), height = Math.round(sprite.fh / sprite.px * CHAR_SCALE);
    ctx.save();
    ctx.translate(Math.round(x + b.width * b.mouth[0]), Math.round(y + b.height * b.mouth[1]));
    ctx.rotate(-Math.PI / 2 + (m.completed ? 0 : Math.sin(m.time * 9) * 0.045));
    ctx.drawImage(img, -width / 2, -height * 0.6, width, height);
    ctx.restore();
  }

  /** Hollow mouth trails preview the same trajectories that the acid follows. */
  drawAttacks(ctx) {
    const m = this.model, mouth = m.mouth(), a = CONFIG.attacks;
    if (m.warning) {
      const w = m.warning;
      const targets = w.kind === 'aimed' ? [w.targetY] : a.lanes.filter(y => Math.abs(y - w.gapY) >= a.gap / 2);
      ctx.strokeStyle = '#edcaff'; ctx.lineWidth = 1;
      for (const y of targets) {
        ctx.setLineDash([4, 9]); ctx.beginPath(); ctx.moveTo(mouth.x, mouth.y); ctx.lineTo(w.targetX, y); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.strokeRect(Math.round(mouth.x - 9), Math.round(mouth.y - 7), 18, 14);
    }
    for (const attack of m.attacks) {
      const x = Math.round(attack.x), y = Math.round(attack.y), r = attack.radius;
      if (attack.kind === 'sweep') {
        const speed = Math.hypot(attack.vx, attack.vy);
        const length = Math.min(attack.length, (4 - attack.life) * speed);
        for (let i = 0; i <= length; i += 6) {
          const sx = Math.round(x - attack.vx / speed * i), sy = Math.round(y - attack.vy / speed * i);
          const breadth = Math.round(r * (1 - i / attack.length * 0.45));
          ctx.fillStyle = '#562574'; ctx.fillRect(sx - 4, sy - breadth, 9, breadth * 2);
          ctx.fillStyle = '#b267d9'; ctx.fillRect(sx - 4, sy - breadth + 2, 8, breadth * 2 - 4);
          ctx.fillStyle = '#f1d1ff'; ctx.fillRect(sx - 3, sy - 2 + Math.round(Math.sin(i + m.time * 22) * 2), 7, 3);
        }
      }
      ctx.fillStyle = '#562574';
      ctx.fillRect(x - r + 4, y - r, r * 2 - 8, r * 2);
      ctx.fillRect(x - r, y - r + 5, r * 2, r * 2 - 10);
      ctx.fillStyle = '#b267d9'; ctx.fillRect(x - r + 3, y - r + 4, r * 2 - 6, r * 2 - 8);
      ctx.fillStyle = '#f1d1ff'; ctx.fillRect(x - r + 5, y - 3, r - 2, 5);
      ctx.fillStyle = '#9954ba'; ctx.fillRect(x + r + 3, y - 1, 7, 3);
    }
  }
}
