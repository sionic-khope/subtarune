/** Sample authored zoom accents against the audio clock, independent of frame rate. */
export function musicCameraPose(config, elapsed) {
  if (elapsed >= config.duration) return { zoom: 1, bounce: 0 };
  const keys = [[0, 1], [config.beats[0] - 0.25, config.introZoom]];
  for (const beat of config.beats) keys.push([beat, config.peakZoom], [beat + config.beatRelease, config.lowZoom]);
  keys.push([config.duration, 1]);
  let zoom = 1;
  for (let i = 1; i < keys.length; i++) {
    if (elapsed > keys[i][0]) continue;
    const [start, from] = keys[i - 1], [end, to] = keys[i];
    const p = Math.max(0, Math.min(1, (elapsed - start) / (end - start)));
    zoom = from + (to - from) * (p * p * (3 - 2 * p));
    break;
  }
  const beat = config.beats.find(time => elapsed >= time && elapsed < time + config.beatRelease);
  const bounce = beat === undefined ? 0 : Math.sin(Math.PI * (elapsed - beat) / config.beatRelease) * config.bounce;
  return { zoom, bounce };
}

/** A music-clock waiter; normal completion resumes BGM, cancellation never does. */
export class MusicCamera {
  constructor(game, config) {
    this.game = game;
    this.config = config;
    this.finished = false;
    this.zoom = { ...game.zoom };
    this.camera = { x: game.camera.x, y: game.camera.y, locked: game.camera.locked };
    this.actor = game.entities.find(entity => entity.id === config.at);
    game.textbox.close();
    game.musicCamera = this;
    this.ready = this.start().catch(error => {
      console.warn('[music-camera] cue failed', error);
      this.dispose(true);
    });
  }

  async start() {
    const buffer = await this.game.sound.loadCue(this.config.src);
    if (this.finished) return;
    this.game.sound.pauseBgm(0);
    this.paused = this.game.sound.paused;
    this.cue = this.game.sound.playCue(buffer, { volume: this.config.volume });
    this.game.camera.locked = true;
  }

  update() {
    if (this.finished) return true;
    if (!this.cue) return false;
    const elapsed = this.cue.elapsed;
    if (elapsed >= this.config.duration) { this.dispose(true); return true; }
    const pose = musicCameraPose(this.config, elapsed);
    const [dx, dy] = this.config.offset;
    const actor = this.actor;
    this.game.zoom = {
      s: pose.zoom, fx: actor.x + actor.w / 2 + dx, fy: actor.y + actor.h + dy + pose.bounce,
      smax: this.config.peakZoom, tween: null,
    };
    return false;
  }

  dispose(resume = false) {
    if (this.finished) return;
    this.finished = true;
    this.cue?.stop();
    this.game.zoom = { ...this.zoom };
    Object.assign(this.game.camera, this.camera);
    if (this.paused && this.game.sound.paused === this.paused) {
      if (resume) this.game.sound.resumeBgm(0.08);
      else {
        this.paused.a.pause(); this.paused.a.src = '';
        this.game.sound.paused = null;
      }
    }
    if (this.game.musicCamera === this) this.game.musicCamera = null;
  }
}
