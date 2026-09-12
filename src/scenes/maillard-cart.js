import { CHAR_SCALE, SCREEN_W } from '../world/world.js';
import { MAILLARD_CART, MAILLARD_SUNRISE } from '../data/maillard-sunrise.js';

const clamp = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => { const k = clamp(value); return k * k * (3 - 2 * k); };

/** Return one passenger's visible boarding or disembark progress. */
export function cartPassengerProgress(phase, phaseTime, index, config = MAILLARD_CART) {
  const duration = phase === 'boarding' ? config.boardingSeconds : config.disembarkSeconds;
  const staggered = phaseTime / duration * config.order.length - index;
  return smooth(staggered);
}

export class MaillardCart {
  constructor(game) {
    this.game = game;
    this.config = MAILLARD_CART;
    this.phase = 'boarding';
    this.phaseTime = 0;
    this.rideTime = 0;
    this.finishing = false;
    this.disposed = false;
    this.cart = game.propImages[this.config.asset];
    this.members = this.config.order.map((id) => id === 'player'
      ? game.player
      : game.entities.find((entity) => entity.def?.sprite === id));
    game.sound.preloadBgm(MAILLARD_SUNRISE.bgm);
    game.sunrise.enter({
      sound: game.sound,
      images: game.propImages,
      animated: true,
      seen: false,
      onComplete: () => game.setFlag(MAILLARD_SUNRISE.completionFlag),
    });
  }

  /** Advance boarding locally, then let only the playing media clock advance the ride and sunrise. */
  update(dt) {
    if (this.disposed || this.finishing) return;
    this.phaseTime += dt;
    if (this.phase === 'boarding' && this.phaseTime >= this.config.boardingSeconds) {
      this.phase = 'ride'; this.phaseTime = 0;
      this.game.sound.playBgm(MAILLARD_SUNRISE.bgm, { volume: 0.4, fadeIn: 0 });
      this.game.sunrise.enter({
        sound: this.game.sound,
        images: this.game.propImages,
        animated: true,
        seen: false,
        restart: true,
        onComplete: () => this.game.setFlag(MAILLARD_SUNRISE.completionFlag),
      });
    }
    if (this.phase === 'ride') {
      this.rideTime = this.game.sound.bgmName === MAILLARD_SUNRISE.bgm && this.game.sound.bgm
        ? this.game.sound.bgm.currentTime
        : this.rideTime;
      if (this.rideTime >= this.config.rideSeconds) { this.phase = 'disembark'; this.phaseTime = 0; }
    } else if (this.phase === 'disembark' && this.phaseTime >= this.config.disembarkSeconds) {
      this.finishing = true;
      this.game.finishMaillardCart();
    }
  }

  /** Draw the side-view leftbound train while track and timber markers scroll to the right. */
  draw(ctx) {
    this.game.sunrise.drawBackdrop(ctx);
    const moving = this.phase === 'ride';
    const scroll = moving ? this.rideTime * 156 : 0;
    ctx.fillStyle = '#2b1a20'; ctx.fillRect(0, 260, SCREEN_W, 100);
    ctx.fillStyle = '#8a5338'; ctx.fillRect(0, 259, SCREEN_W, 5); ctx.fillRect(0, 286, SCREEN_W, 5);
    for (let x = -64 + scroll % 64; x < SCREEN_W + 64; x += 64) {
      ctx.fillStyle = '#4b2b29'; ctx.fillRect(Math.round(x), 256, 9, 48);
      ctx.fillStyle = '#bc7650'; ctx.fillRect(Math.round(x + 2), 259, 3, 40);
    }
    for (let x = -120 + (scroll * 0.35) % 120; x < SCREEN_W + 120; x += 120) {
      ctx.fillStyle = '#30202b'; ctx.fillRect(Math.round(x), 130, 8, 129);
      ctx.fillStyle = '#705044'; ctx.fillRect(Math.round(x + 2), 130, 3, 129);
    }
    this.drawShadows(ctx, scroll);
    for (let i = 0; i < this.config.cartCenters.length; i++) this.drawUnit(ctx, i);
    this.game.sunrise.drawWorldLight(ctx);
  }

  drawUnit(ctx, index) {
    const [centerX, centerY] = this.config.cartCenters[index];
    const bob = this.phase === 'ride' ? Math.round(Math.sin(this.rideTime * 8 + index) * 1.5) : 0;
    const passenger = this.members[index];
    let passengerX = centerX, passengerY = centerY - 4 + bob;
    if (this.phase === 'boarding') {
      const k = cartPassengerProgress('boarding', this.phaseTime, index, this.config);
      passengerX += Math.round((1 - k) * 76); passengerY += Math.round((1 - k) * 72);
    } else if (this.phase === 'disembark') {
      const k = cartPassengerProgress('disembark', this.phaseTime, index, this.config);
      passengerX -= Math.round(k * 58); passengerY += Math.round(k * 66);
    }
    this.drawPassenger(ctx, passenger, passengerX, passengerY);
    if (this.cart) {
      const [width, height] = this.config.displaySize;
      ctx.drawImage(this.cart, ...this.config.assetCrop, Math.round(centerX - width / 2), Math.round(centerY - height / 2 + bob), width, height);
      const wheelPhase = Math.floor(this.rideTime * 12) % 2;
      ctx.fillStyle = wheelPhase ? '#bc7650' : '#6f493a';
      ctx.fillRect(centerX - 27, centerY + 6 + bob, 3, 3); ctx.fillRect(centerX + 24, centerY + 6 + bob, 3, 3);
    }
    if (index < this.config.cartCenters.length - 1) {
      ctx.fillStyle = '#20151c'; ctx.fillRect(centerX + 38, centerY + 3 + bob, 44, 5);
      ctx.fillStyle = '#9a6448'; ctx.fillRect(centerX + 39, centerY + 4 + bob, 42, 2);
    }
  }

  drawPassenger(ctx, passenger, centerX, footY) {
    if (!passenger?.sprite?.left?.[0]) return;
    const sprite = passenger.sprite;
    const width = Math.round(sprite.fw / sprite.px * CHAR_SCALE);
    const height = Math.round(sprite.fh / sprite.px * CHAR_SCALE);
    ctx.drawImage(sprite.left[0], Math.round(centerX - width / 2), Math.round(footY - height), width, height);
  }

  drawShadows(ctx, scroll) {
    const p = this.game.sunrise.frame.progress;
    if (p <= 0) return;
    const length = Math.round(96 * p);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 250, SCREEN_W, 110); ctx.clip();
    ctx.fillStyle = MAILLARD_SUNRISE.colors.shadow; ctx.globalAlpha = 0.16 + p * 0.38;
    for (let x = -120 + (scroll * 0.35) % 120; x < SCREEN_W + 120; x += 120) {
      ctx.beginPath(); ctx.moveTo(x, 250); ctx.lineTo(x + 8, 250); ctx.lineTo(x + length + 18, 326); ctx.lineTo(x + length, 326); ctx.closePath(); ctx.fill();
    }
    for (const [centerX, centerY] of this.config.cartCenters) {
      ctx.beginPath(); ctx.moveTo(centerX - 39, centerY + 8); ctx.lineTo(centerX + 39, centerY + 8);
      ctx.lineTo(centerX + 39 + length, centerY + 32); ctx.lineTo(centerX - 39 + length, centerY + 32); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  /** Prevent title or map teardown from allowing a late scene completion. */
  dispose() { this.disposed = true; }
}
