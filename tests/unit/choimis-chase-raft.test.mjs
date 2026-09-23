import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as story from '../../src/core/story.js';
import { Raft } from '../../src/world/world.js';

const main = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const Game = runInNewContext(main.slice(main.indexOf('class Game {'), main.indexOf('// ── 부트')) + '\nGame;', { ...story, MAPS: {} });
const setup = (x, flags = {}) => {
  const game = { mapId: 'jjajang_sakura6', flags: { raft_sakura6_raft: 1, choimis_flower_done: true, ...flags }, dialogue: { running: false }, player: { x, y: 358 }, entities: [], has(key) { return !!this.flags[key]; }, setFlag(key, value = true) { this.flags[key] = value; }, autosave() { this.saved = { ...this.flags }; } };
  const raft = Object.assign(Object.create(Raft.prototype), { id: 'sakura6_raft', def: {}, route: [[324, 348], [1164, 348]], at: 1 });
  raft.setPos(raft.route[raft.at]); game.entities.push(raft);
  return { game, raft };
};

test('post-transformation west-bank entry recalls the outbound raft and persists repair', () => {
  const { game, raft } = setup(278);
  Game.prototype.runMapEnter.call(game);
  assert.equal(raft.x, 324, 'raft must be reachable from the chase west dock');
  assert.equal(raft.at, 0);
  assert.equal(game.flags.raft_sakura6_raft, 0);
  assert.equal(game.saved.choimis_chase_raft_ready, true);
  assert.equal(raft.def.ix, 324, 'the rendered raft moves together with collision');
});

test('legacy east-bank save retains its reachable raft and subsequent crossings are not reset', () => {
  const { game, raft } = setup(1260);
  Game.prototype.runMapEnter.call(game);
  assert.equal(raft.at, 1);
  game.player.x = 278;
  Game.prototype.runMapEnter.call(game);
  assert.equal(raft.at, 1, 'one-time repair must not teleport an already initialized raft');
});

test('outbound story, remote montage, and other maps do not recall the raft', () => {
  for (const variant of ['before', 'montage', 'other']) {
    const { game, raft } = setup(278);
    if (variant === 'before') game.flags.choimis_flower_done = false;
    if (variant === 'montage') game.dialogue.running = true;
    if (variant === 'other') game.mapId = 'jjajang_sakura3';
    Game.prototype.runMapEnter.call(game);
    assert.equal(raft.at, 1, variant);
    assert.equal(game.flags.choimis_chase_raft_ready, undefined, variant);
  }
});
