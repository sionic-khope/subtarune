import { BARON_SEA_CHASE as CONFIG } from '../data/baron-sea-chase.js';
import { loadImageOptional, makeCanvas, drawBox } from '../core/gfx.js';
import { characterSprite, SCREEN_W, SCREEN_H, CHAR_SCALE } from '../world/world.js';
import { FONT } from '../ui/font.js';
import L from '../data/locale/ko.js';

/** Pure simulation. Clear is a count of projectile impacts, never elapsed time. */
export class SeaChaseModel {
  constructor({ cleared = false, config = CONFIG } = {}) {
    this.config = config;
    this.phase = cleared ? 'cleared' : 'sail';
    this.phaseTime = 0;
    this.time = 0;
    this.fightTime = 0;
    this.scroll = 0;
    this.raftY = config.raft.y;
    this.bossX = config.boss.x;
    this.bossY = config.boss.baseY;
    this.hits = cleared ? config.hitsToClear : 0;
    this.cooldown = 0;
    this.flash = 0;
    this.recoil = 0;
    this.projectiles = [];
  }

  /** A cleared scene continues drawing its living actors while its waiter ends. */
  get completed() { return this.phase === 'cleared'; }

  /** Advance an explicit scene beat; dialogue completion is owned by TextBox. */
  setPhase(phase) {
    this.phase = phase; this.phaseTime = 0;
    if (phase === 'fight') this.cooldown = this.config.fireCooldown;
  }

  /** World-space target rectangle uses the same moving boss transform as drawing. */
  targetRect() {
    const b = this.config.boss, [x, y, w, h] = b.target;
    return { x: this.bossX + b.width * x, y: this.bossY + b.height * y, w: b.width * w, h: b.height * h };
  }

  /** Emit scene events so audio, saving and visual effects stay outside simulation. */
  update(dt, input) {
    const c = this.config, events = [];
    this.time += dt;
    this.scroll += dt * (this.completed ? c.scrollSpeed * 0.07 : c.scrollSpeed);
    if (this.completed) return events;
    this.phaseTime += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.recoil = Math.max(0, this.recoil - dt);
    if (this.phase === 'sail' && this.phaseTime >= c.sailDuration) { this.setPhase('dialogue-help'); events.push('dialogue-help'); }
    if (this.phase === 'fight') {
      this.fightTime += dt;
      this.bossY = c.boss.baseY + c.boss.amplitude * (1 - Math.cos(this.fightTime * Math.PI * 2 / c.boss.period)) / 2;
      this.bossX = c.boss.x + Math.sin(this.fightTime * 0.7) * c.boss.shift;
      const direction = Number(input.down('down')) - Number(input.down('up'));
      this.raftY = Math.max(c.raft.minY, Math.min(c.raft.maxY, this.raftY + direction * c.raft.speed * dt));
    }
    const tutorial = this.phase === 'tutorial';
    if ((tutorial ? input.just('confirm') : this.phase === 'fight' && input.down('confirm')) && this.cooldown <= 0) {
      this.projectiles.push({ x: c.raft.x + c.raft.gunX + c.raft.gunWidth, y: this.raftY + c.raft.gunY });
      this.cooldown = c.fireCooldown;
      this.recoil = 0.15;
      events.push('shot');
      if (tutorial) this.setPhase('tutorial-shot');
    }
    const target = this.targetRect();
    this.projectiles = this.projectiles.filter((shot) => {
      const oldX = shot.x;
      shot.x += c.bulletSpeed * dt;
      if (shot.x >= target.x && oldX <= target.x + target.w && shot.y >= target.y && shot.y <= target.y + target.h) {
        this.flash = c.hitDuration;
        if (this.phase === 'tutorial-shot') { this.setPhase('tutorial-hit'); events.push('tutorial-hit'); }
        else if (this.phase === 'fight') { this.hits++; events.push('hit'); }
        return false;
      }
      return shot.x < SCREEN_W + 20;
    });
    if (this.phase === 'tutorial-hit' && this.phaseTime >= c.hitDuration) { this.setPhase('roar'); events.push('roar'); }
    else if (this.phase === 'roar' && this.phaseTime >= c.roarDuration) { this.setPhase('fight'); events.push('fight'); }
    if (this.phase === 'fight' && this.hits >= c.hitsToClear) {
      this.setPhase('cleared'); this.projectiles = []; this.flash = 0; this.recoil = 0;
      events.push('clear');
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
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#ff314f'; ctx.fillRect(0, 0, sheet.width, sheet.height);
  }

  /** The cutscene runner can finish while the cleared standoff remains on screen. */
  get completed() { return this.model.completed; }

  /** Release transient effects and stale async asset work on title/reset/map changes. */
  dispose() { this.disposed = true; this.particles = []; this.model.projectiles = []; this.game.textbox.close(); }

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
        const t = this.model.targetRect(); this.burst(t.x, t.y + t.h / 2, '#ffcb77', 12);
      }
      if (event === 'roar') this.game.sound.sfx('baron_roar', { volume: 0.9 });
      if (event === 'fight') this.game.sound.playBgm(CONFIG.bgm, { volume: 0.6 });
      if (event === 'clear') { this.game.setFlag('obj5_chase_cleared'); this.particles = []; }
    }
    if (dialogueAtStart) this.game.textbox.update(dt, input);
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
    this.drawRaft(ctx);
    for (const shot of m.projectiles) {
      ctx.fillStyle = '#66401f'; ctx.fillRect(Math.round(shot.x) - 9, Math.round(shot.y) - 2, 10, 4);
      ctx.fillStyle = '#ffe8a6'; ctx.fillRect(Math.round(shot.x) - 10, Math.round(shot.y) - 1, 11, 2);
    }
    for (const p of this.particles) { ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 3); }
    ctx.restore();
    if (m.phase === 'tutorial') {
      drawBox(ctx, 144, 286, 192, 42);
      ctx.font = FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe69a';
      ctx.fillText(L.sea_chase_prompt, SCREEN_W / 2, 307); ctx.textAlign = 'left';
    }
    if (m.phase === 'fight') {
      ctx.fillStyle = '#092c46'; ctx.fillRect(0, 0, SCREEN_W, 32);
      ctx.font = FONT; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.fillText(L.sea_chase_controls, 12, 17);
      ctx.textAlign = 'right'; ctx.fillStyle = '#ffe6a6'; ctx.fillText(`${L.sea_chase_progress} ${m.hits}/${CONFIG.hitsToClear}`, SCREEN_W - 12, 17); ctx.textAlign = 'left';
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
    const bob = m.completed ? 0 : Math.round(Math.sin(m.time * 5) * 2);
    const sail = m.phase === 'sail' ? 1 - Math.min(1, m.phaseTime / CONFIG.sailDuration) : 0;
    const x = Math.round(r.x + (this.entryRaftX - r.x) * sail * sail - (m.recoil > 0 ? m.recoil / 0.15 * 4 : 0));
    const y = Math.round(m.raftY + bob);
    ctx.fillStyle = '#a2dddd';
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 16 - i * 13, y + 21 + i % 2 * 5, 16, 2);
    const image = this.raft?.image;
    if (image) ctx.drawImage(image, x - r.width / 2, y - 9, r.width, r.height);
    else {
      ctx.fillStyle = '#754425'; ctx.fillRect(x - 40, y, 86, 29);
      ctx.fillStyle = '#bd8b46';
      for (let i = 0; i < 5; i++) ctx.fillRect(x - 39, y + 2 + i * 5, 82, 3);
    }
    this.drawCharacter(ctx, this.playerSprite, x, y + 8, CHAR_SCALE);
    const gunX = x + r.gunX, gunY = Math.round(m.raftY + r.gunY);
    if (this.gun) {
      const height = Math.round(r.gunWidth * this.gun.height / this.gun.width);
      ctx.drawImage(this.gun, gunX, Math.round(gunY - height / 2 + 2), r.gunWidth, height);
    }
    this.swimmers.forEach(({ sprite }, index) => {
      const sx = x - 24 + index * 47, water = y + r.swimmerY + (m.completed ? 0 : Math.round(Math.sin(m.time * 7 + index) * 2));
      ctx.save(); ctx.beginPath(); ctx.rect(sx - 25, water - 33, 50, 33); ctx.clip();
      this.drawCharacter(ctx, sprite, sx, water + 30, CHAR_SCALE); ctx.restore();
      ctx.fillStyle = '#b2e8e3'; ctx.fillRect(sx - 20, water, 38, 2);
    });
  }

  /** Draw a pre-sliced original walking sprite with its native cell proportions. */
  drawCharacter(ctx, sprite, x, bottom, scale) {
    const image = sprite.right[0];
    const w = Math.round(sprite.fw / sprite.px * scale), h = Math.round(sprite.fh / sprite.px * scale);
    ctx.drawImage(image, Math.round(x - w / 2), Math.round(bottom - h), w, h);
  }

  /** The four generated poses share a normalized mouth anchor for the original Yongjun. */
  drawBoss(ctx) {
    const m = this.model, b = CONFIG.boss, sheet = CONFIG.sheet;
    const enter = m.phase === 'sail' ? (1 - Math.min(1, m.phaseTime / CONFIG.sailDuration)) * 180 : 0;
    const x = Math.round(m.bossX + enter), y = Math.round(m.bossY);
    const frame = m.phase === 'roar' ? sheet.roar : m.flash > 0 ? sheet.hurt : m.completed ? sheet.recovery : sheet.idle;
    ctx.fillStyle = '#76cbd0'; ctx.fillRect(x + 24, y + b.height - 9, b.width - 36, 3);
    if (this.sheet) {
      const sw = this.sheet.width / sheet.cols, sh = this.sheet.height / sheet.rows;
      ctx.drawImage(this.sheet, frame % sheet.cols * sw, Math.floor(frame / sheet.cols) * sh, sw, sh, x, y, b.width, b.height);
      if (m.flash > 0) {
        ctx.globalAlpha = 0.72;
        ctx.drawImage(this.redSheet, frame % sheet.cols * sw, Math.floor(frame / sheet.cols) * sh, sw, sh, x, y, b.width, b.height);
        ctx.globalAlpha = 1;
      }
    } else {
      const fallback = this.game.spriteOverrides.baron;
      if (fallback) ctx.drawImage(fallback, x, y, b.width, b.height);
    }
    const sprite = this.yongjun, img = sprite.down[0];
    const width = Math.round(sprite.fw / sprite.px * CHAR_SCALE), height = Math.round(sprite.fh / sprite.px * CHAR_SCALE);
    ctx.save();
    ctx.translate(Math.round(x + b.width * b.mouth[0]), Math.round(y + b.height * b.mouth[1]));
    ctx.rotate(-Math.PI / 2 + (m.completed ? 0 : Math.sin(m.time * 9) * 0.045));
    ctx.drawImage(img, -width / 2, -height * 0.6, width, height);
    ctx.restore();
  }
}
