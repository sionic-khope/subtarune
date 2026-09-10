export class BattleAction {
  constructor(home, target, attackDuration) {
    this.home = [...home];
    this.target = [...target];
    this.attackDuration = attackDuration;
    this.travelDuration = Math.hypot(target[0] - home[0], target[1] - home[1]) / 190;
    this.reset();
  }

  reset() {
    this.mode = 'idle';
    this.elapsed = 0;
    this.position = [...this.home];
  }

  start() {
    if (this.mode !== 'idle') return false;
    this.mode = 'approach';
    this.elapsed = 0;
    return true;
  }

  update(dt) {
    this.elapsed += Math.max(0, dt);
    while (this.mode !== 'idle') {
      const duration = this.mode === 'attack' ? this.attackDuration : this.travelDuration;
      if (this.elapsed < duration) break;
      this.elapsed -= duration;
      switch (this.mode) {
        case 'approach': this.mode = 'attack'; break;
        case 'attack': this.mode = 'return'; break;
        case 'return': this.reset(); return;
      }
    }
    switch (this.mode) {
      case 'idle': this.position = [...this.home]; break;
      case 'attack': this.position = [...this.target]; break;
      case 'approach':
      case 'return': {
        const progress = this.elapsed / this.travelDuration;
        const amount = this.mode === 'return' ? 1 - progress : progress;
        this.position = this.home.map((value, axis) => value + (this.target[axis] - value) * amount);
        break;
      }
    }
  }
}
