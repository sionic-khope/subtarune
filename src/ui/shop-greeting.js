import { ScriptRunner, TextBox } from './dialogue.js';
import { shop_greeting } from '../data/cutscenes/shop_greeting.js';

/** Routes the existing dialogue runner to a merchant panel or the party textbox. */
export class ShopGreeting {
  constructor(game, rect) {
    this.game = game;
    this.merchant = new TextBox(game.sound, game.portraits, { rect, speakerInside: true, textTop: 40 });
    this.active = null;
    this.runner = new ScriptRunner(this, game);
  }

  /** Start the six-line exchange using normal script completion semantics. */
  start(onEnd) { this.runner.start(shop_greeting, onEnd); }

  /** ScriptRunner textbox interface: only the current speaker's surface is open. */
  show(node, ctx, onDone) {
    this.close();
    this.active = node.voice === 'yongjun' ? this.merchant : this.game.textbox;
    this.active.show(node, ctx, onDone);
  }

  /** Close the current surface without advancing its script. */
  close() { this.active?.close(); }

  /** Forward shared keyboard/gamepad input and typewriter timing. */
  update(dt, input) {
    this.merchant.charDelay = this.game.textbox.charDelay;
    this.active?.update(dt, input);
  }

  /** Draw only the speaker's current dialogue surface over the shop. */
  draw(ctx) { this.active?.draw(ctx); }

  /** Discard an interrupted greeting without its completion flag or autosave. */
  dispose() {
    this.runner.script = null;
    this.runner.onEnd = null;
    this.close();
  }
}
