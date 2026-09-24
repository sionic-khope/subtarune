import { SCREEN_W, SCREEN_H } from '../core/layout.js';

export const CASTLE_DARK_CHASE = Object.freeze({ image: 'assets/enemies/castle-dark-pursuer.png',
  speed: 35, catchupSpeed: 285, nearDistance: 100, farDistance: 240, lead: 300,
  bodyRadius: 40, size: 192, damage: 15, recoilDistance: 150, recoilSeconds: 0.5,
  contactCooldown: 1.1, rearmDistance: 64, cameraWeight: 0.4, cameraMaxOffset: 96,
  revealRise: 120, revealSeconds: 2.2, cameraSeconds: 0.7, cameraBelow: 65 });

/** Map-local pursuit owns its camera and orb recoil; contact never relocates or knocks the party. */
export class CastleDarkChase {
  constructor(game) {
    this.game = game; this.map = game.map; this.meta = game.map.def.meta.darkChase;
    this.phase = 'dormant'; this.elapsed = 0; this.disposed = false;
    this.contactArmed = true; this.cooldown = 0; this.lastDirection = { x: 0, y: -1 };
    this.focus = { x: 0, y: 0, w: 0, h: 0 };
    [this.x, this.y] = this.meta.monsterSpawn;
  }
  get snapshot() { return { phase: this.phase, x: this.x, y: this.y, visible: !this.disposed && this.phase !== 'dormant' }; }
  playRoar() {
    if (this.disposed || this.roarHandle) return;
    this.roarHandle = this.game.sound.sfx('baron_roar');
  }
  /** Freeze the threat while the camera shows its slow rise below the party. */
  reveal() {
    if (this.disposed) return;
    this.phase = 'reveal'; this.elapsed = 0;
    [this.x, this.y] = this.meta.monsterSpawn; this.y += CASTLE_DARK_CHASE.revealRise;
    const { camera, player } = this.game;
    this.cameraStart = [camera.x, camera.y]; camera.locked = true;
    this.cameraEnd = [Math.max(0, Math.min(this.map.pxW - SCREEN_W, (player.x + this.x) / 2 - SCREEN_W / 2)),
      Math.max(0, Math.min(this.map.pxH - SCREEN_H, (player.y + this.meta.monsterSpawn[1]) / 2 + CASTLE_DARK_CHASE.cameraBelow - SCREEN_H / 2))];
  }
  /** Seen saves resume from the restored position with a fresh, fair lead. */
  start() {
    if (this.disposed) return;
    if (this.phase === 'dormant') {
      const p = this.game.player;
      const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.facing] || [0, -1];
      this.x = p.x + p.w / 2 - dx * CASTLE_DARK_CHASE.lead;
      this.y = p.y + p.h / 2 - dy * CASTLE_DARK_CHASE.lead;
      this.lastDirection = { x: dx, y: dy };
    }
    this.phase = 'chase'; this.elapsed = 0;
    this.game.camera.locked = false; this.updateFocus(); this.game.camera.target = this.focus;
    this.game.sound.playBgm('baron_intro', { volume: 0.4 });
  }
  update(dt) {
    if (this.disposed) return;
    const g = this.game, c = CASTLE_DARK_CHASE;
    if (g.map !== this.map || g.state === 'title') { this.dispose(); return; }
    const seconds = Math.max(0, dt);
    if (this.phase === 'reveal') {
      this.elapsed += seconds;
      this.y = this.meta.monsterSpawn[1] + c.revealRise * (1 - Math.min(1, this.elapsed / c.revealSeconds));
      const k = 1 - (1 - Math.min(1, this.elapsed / c.cameraSeconds)) ** 3;
      g.camera.x = this.cameraStart[0] + (this.cameraEnd[0] - this.cameraStart[0]) * k;
      g.camera.y = this.cameraStart[1] + (this.cameraEnd[1] - this.cameraStart[1]) * k;
      if (this.elapsed >= c.revealSeconds) this.phase = 'revealed';
      return;
    }
    if (!['chase', 'recoil'].includes(this.phase) || g.state !== 'field' || g.dialogue.running || g.transitioning) return;
    this.cooldown = Math.max(0, this.cooldown - seconds);
    if (this.phase === 'recoil') {
      this.elapsed = Math.min(c.recoilSeconds, this.elapsed + seconds);
      const progress = this.elapsed / c.recoilSeconds, distance = c.recoilDistance * (1 - (1 - progress) ** 2);
      this.x = this.recoil.x + this.recoil.dx * distance;
      this.y = this.recoil.y + this.recoil.dy * distance;
      if (progress === 1) this.phase = 'chase';
      this.updateFocus(); return;
    }
    const px = g.player.x + g.player.w / 2, py = g.player.y + g.player.h / 2;
    if (!this.contactArmed && !this.cooldown && Math.hypot(px - this.x, py - this.y) > c.rearmDistance) this.contactArmed = true;
    let left = seconds;
    do {
      const slice = Math.min(left, 1 / 60), dx = px - this.x, dy = py - this.y, distance = Math.hypot(dx, dy);
      const mix = Math.max(0, Math.min(1, (distance - c.nearDistance) / (c.farDistance - c.nearDistance)));
      const speed = c.speed + (c.catchupSpeed - c.speed) * mix * mix * (3 - 2 * mix);
      const step = Math.min(distance, speed * slice);
      if (distance) {
        this.lastDirection = { x: dx / distance, y: dy / distance };
        this.x += this.lastDirection.x * step; this.y += this.lastDirection.y * step;
      }
      if (distance - step <= c.bodyRadius && this.contactArmed && !(g.invuln > 0)) {
        this.contactArmed = false; this.cooldown = c.contactCooldown;
        g.damageParty('hyungsub', c.damage); g.invuln = 0.9; g.hurt = 0.32; g.shake = { time: 0.25, amp: 3 };
        this.hitHandle = g.sound.sfx('damage', { volume: 0.8 });
        this.recoil = { x: this.x, y: this.y, dx: -this.lastDirection.x, dy: -this.lastDirection.y };
        this.phase = 'recoil'; this.elapsed = 0; break;
      }
      left -= slice;
    } while (left > 1e-8);
    this.updateFocus();
  }
  updateFocus() {
    const p = this.game.player, c = CASTLE_DARK_CHASE;
    const px = p.x + p.w / 2, py = p.y + p.h / 2, dx = this.x - px, dy = this.y - py;
    const distance = Math.hypot(dx, dy), weight = Math.min(c.cameraWeight, c.cameraMaxOffset / (distance || 1));
    this.focus.x = px + dx * weight; this.focus.y = py + dy * weight;
  }
  /** The approved sprite contains its glow; no light is projected onto hidden floor. */
  draw(ctx, cam) {
    const image = this.game.propImages[CASTLE_DARK_CHASE.image];
    if (!this.snapshot.visible || !image) return;
    const size = CASTLE_DARK_CHASE.size;
    ctx.drawImage(image, Math.round(this.x - cam.x - size / 2), Math.round(this.y - cam.y - size / 2), size, size);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const handle of [this.roarHandle, this.hitHandle]) if (handle) { handle.pause(); handle.src = ''; }
    this.roarHandle = null; this.hitHandle = null;
    this.game.camera.locked = false;
    if (this.game.camera.target === this.focus) this.game.camera.target = this.game.player;
    if (this.game.sound.bgmName === 'baron_intro') this.game.sound.stopBgm(0.3);
    if (this.game.castleDarkChase === this) this.game.castleDarkChase = null;
  }
}
