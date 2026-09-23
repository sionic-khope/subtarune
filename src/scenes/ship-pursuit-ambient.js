import { isShipPursuitMap } from '../data/ship-assault.js';
import { ShipAssault } from './ship-assault.js';

/** Field atmosphere owns no actors or script runner; it reuses the attack's room effects. */
export class ShipPursuitAmbient {
  constructor(game) {
    this.game = game;
    this.effect = null;
    this.shake = null;
    this.stopped = false;
  }

  /** Hand off the final room particles without restarting the cinematic or its timer. */
  adopt(effect) {
    this.clear();
    this.effect = effect;
    this.shake = this.game.shake;
    this.stopped = false;
  }

  /** Reconcile saved flags/map eligibility, preserving the clock between pursuit maps. */
  sync() {
    const game = this.game;
    if (this.stopped || game.flags.choimis_rescued || !game.flags.captain_attack_done || !isShipPursuitMap(game.mapId)
      || !['field', 'menu'].includes(game.state) || game.battle || game.shipAssault) {
      this.clear();
      return;
    }
    this.effect ??= new ShipAssault(game);
  }

  /** Update even during dialogue and fades; the cinematic remains the sole effects owner while active. */
  update(dt) {
    this.sync();
    if (!this.effect) return;
    const previous = this.game.shake;
    this.effect.update(dt);
    if (this.game.shake !== previous) this.shake = this.game.shake;
  }

  /** Draw after the world and before dialogue, using the existing ceiling dust renderer. */
  draw(ctx) { this.effect?.drawDust(ctx); }

  /** Release only this controller's shake, preserving a newer battle or scripted impact. */
  clear() {
    if (!this.effect) return;
    const shake = this.game.shake;
    this.effect.dispose();
    if (shake !== this.shake) this.game.shake = shake;
    this.effect = null;
    this.shake = null;
  }

  /** Title/reset fades must not recreate effects while their old map and flags remain live. */
  stop() { this.stopped = true; this.clear(); }

  /** Map load restores atmosphere from flags after QA/continue, without actor reconstruction. */
  resume() { this.stopped = false; this.sync(); }
}
