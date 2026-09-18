import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

class FakeScene {
  constructor(game) { this.game = game; this.disposed = false; }
  dispose() { this.disposed = true; }
}

const mainSource = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const Game = runInNewContext(mainSource.slice(mainSource.indexOf('class Game {'), mainSource.indexOf('// ── 부트')) + '\nGame;', {
  ShipCastle: FakeScene,
  ShipMemory: FakeScene,
});

const makeGame = () => Object.assign(Object.create(Game.prototype), {
  shipCastle: null,
  shipMemory: null,
  shipPursuitAmbient: { clear() {} },
  dialogue: { script: ['active'], wait: { active: true }, onEnd() {} },
  textbox: { closed: false, close() { this.closed = true; } },
  background: [{ active: true }],
});

test('test_ship_castle_to_memory_handoff_preserves_active_script_runner', () => {
  const game = makeGame();
  const castle = game.startShipCastle();
  const script = game.dialogue.script;
  const wait = game.dialogue.wait;
  const memory = game.startShipMemory();
  assert.equal(castle.disposed, true);
  assert.equal(game.shipCastle, null);
  assert.equal(game.shipMemory, memory);
  assert.equal(game.dialogue.script, script);
  assert.equal(game.dialogue.wait, wait);
  assert.equal(game.textbox.closed, false);
});

test('test_ship_castle_and_memory_abort_cancel_runner_and_release_background', () => {
  const game = makeGame();
  game.startShipCastle();
  game.finishShipCastle(true);
  assert.equal(game.dialogue.script, null);
  assert.equal(game.dialogue.wait, null);
  assert.equal(game.dialogue.onEnd, null);
  assert.equal(game.background.length, 0);
  assert.equal(game.textbox.closed, true);

  Object.assign(game.dialogue, { script: ['memory'], wait: { active: true }, onEnd() {} });
  game.textbox.closed = false;
  game.background = [{ active: true }];
  game.startShipMemory();
  game.finishShipMemory(true);
  assert.equal(game.shipMemory, null);
  assert.equal(game.dialogue.script, null);
  assert.equal(game.dialogue.wait, null);
  assert.equal(game.dialogue.onEnd, null);
  assert.equal(game.background.length, 0);
  assert.equal(game.textbox.closed, true);
});
