import { SCREEN_W, SCREEN_H } from '../core/layout.js';

export const CASTLE_DARK_CHASE = Object.freeze({ image: 'assets/enemies/castle-dark-pursuer.png',
  speed: 35, lead: 300, bodyRadius: 40, size: 192, revealRise: 120, revealSeconds: 2.2,
  fadeOutSeconds: 0.3, fadeInSeconds: 0.4, cameraSeconds: 0.7, cameraBelow: 65 });

/** Map-local wall-ignoring pursuit; contacts restart the entrance without touching combat HP. */
export class CastleDarkChase {
  constructor(game) {
    this.game = game; this.map = game.map; this.meta = game.map.def.meta.darkChase;
    this.phase = 'dormant'; this.elapsed = 0; this.disposed = false;
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
      this.x = this.game.player.x + this.game.player.w / 2;
      this.y = this.game.player.y + this.game.player.h / 2 + CASTLE_DARK_CHASE.lead;
    }
    this.phase = 'chase'; this.elapsed = 0;
    this.game.camera.locked = false; this.game.camera.target = this.game.player;
    this.game.sound.playBgm('baron_intro', { volume: 0.4 });
  }
  update(dt) {
    if (this.disposed) return;
    const g = this.game, c = CASTLE_DARK_CHASE;
    if (g.map !== this.map || g.state === 'title') { this.dispose(); return; }
    this.elapsed += Math.max(0, dt);
    if (this.phase === 'reveal') {
      this.y = this.meta.monsterSpawn[1] + c.revealRise * (1 - Math.min(1, this.elapsed / c.revealSeconds));
      const k = 1 - (1 - Math.min(1, this.elapsed / c.cameraSeconds)) ** 3;
      g.camera.x = this.cameraStart[0] + (this.cameraEnd[0] - this.cameraStart[0]) * k;
      g.camera.y = this.cameraStart[1] + (this.cameraEnd[1] - this.cameraStart[1]) * k;
      if (this.elapsed >= c.revealSeconds) this.phase = 'revealed';
      return;
    }
    if (this.phase === 'caught' && this.elapsed >= c.fadeOutSeconds) {
      [g.player.x, g.player.y] = this.meta.entry;
      g.player.facing = 'up'; g.player.moving = false;
      g.spawnParty(); g.camera.snap();
      [this.x, this.y] = this.meta.monsterSpawn;
      this.phase = 'recover'; this.elapsed = 0; g.fadeTo(0, c.fadeInSeconds);
      return;
    }
    if (this.phase === 'recover' && this.elapsed >= c.fadeInSeconds) {
      this.phase = 'chase'; g.transitioning = false; this.ownsTransition = false;
      return;
    }
    if (this.phase !== 'chase' || g.state !== 'field' || g.dialogue.running || g.transitioning) return;
    const px = g.player.x + g.player.w / 2, py = g.player.y + g.player.h / 2;
    const dx = px - this.x, dy = py - this.y, distance = Math.hypot(dx, dy);
    const step = Math.min(distance, c.speed * Math.max(0, dt));
    if (distance) { this.x += dx / distance * step; this.y += dy / distance * step; }
    if (distance - step <= c.bodyRadius) {
      this.phase = 'caught'; this.elapsed = 0; this.ownsTransition = true;
      g.transitioning = true; g.player.moving = false; g.fadeTo(1, c.fadeOutSeconds);
    }
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
    if (this.roarHandle) { this.roarHandle.pause(); this.roarHandle.src = ''; this.roarHandle = null; }
    if (this.ownsTransition) { this.game.transitioning = false; this.ownsTransition = false; }
    if (this.phase === 'reveal' || this.phase === 'revealed') this.game.camera.locked = false;
    if (this.game.sound.bgmName === 'baron_intro') this.game.sound.stopBgm(0.3);
    if (this.game.castleDarkChase === this) this.game.castleDarkChase = null;
  }
}
