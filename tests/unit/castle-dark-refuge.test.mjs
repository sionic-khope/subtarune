import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { Camera, Door, Entity, TileMap, Trigger } from '../../src/world/world.js';
import { ScriptRunner } from '../../src/ui/dialogue.js';
import { Story, storyBgm, storyExitScript } from '../../src/core/story.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { CastleDarkChase } from '../../src/scenes/castle-dark-chase.js';
import { CastleDarkPath } from '../../src/scenes/castle-dark-path.js';
import { castle_dark_chase_intro, castle_dark_chase_finish } from '../../src/data/cutscenes/castle_dark_chase.js';

const mapId = 'gajaeman_castle_dark_refuge';
const def = JSON.parse(readFileSync(new URL(`../../assets/maps/${mapId}.json`, import.meta.url)));
const arrival = JSON.parse(readFileSync(new URL('../../assets/maps/gajaeman_castle_dark_arrival.json', import.meta.url)));
const source = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const saved = new Map();
const Game = runInNewContext(source.slice(source.indexOf('class Game {'), source.indexOf('// ── 부트')) + '\nGame;', {
  MAPS: { [mapId]: def, [arrival.id]: arrival }, Story, CastleDarkChase, CastleDarkPath,
  TileMap: class extends TileMap { bake() {} }, createEntity: (entity, game) => new Entity(entity, game),
  MAILLARD_CART: { map: 'maillard_path' },
  ...Object.fromEntries(['finishCastleGate', 'cancelCastlePipe', 'finishCastleOrb', 'finishCastleBoulder',
    'clearCastleBoulderPush', 'finishCastleLobby', 'finishShipInvasion', 'clearShipDeckPoses', 'restoreCastleBoulder'].map(key => [key, () => {}])),
  localStorage: { setItem(key, value) { saved.set(key, value); } },
});

function fixture(flags = {}) {
  const lines = [], cues = [];
  const game = { flags: { ...flags }, mapId, map: new TileMap(def), state: 'field',
    has(key) { return !!this.flags[key]; },
    setFlag(key, value = true) { if (Story.isStage(key)) this.story.advance(key); else this.flags[key] = value; },
    sound: { playBgm(key) { cues.push(key); }, preloadBgm(key) { cues.push(['preload', key]); } },
    zoomTo(scale, focus, duration, done) { this.zoom = scale; done(); },
    textbox: { close() { this.pending = null; }, show(node, ctx, done) { lines.push(node); this.pending = done; }, update() {} },
  };
  game.story = new Story(game.flags);
  game.entities = def.entities.map(entity => new Entity(entity, game));
  game.player = new Entity({ id: 'player', ...def.spawns.start }, game);
  game.entities.push(game.player, ...['gyeongsub', 'ppaman'].map((id, i) => new Entity({ id, x: 372, y: 608 + i * 48 }, game)));
  game.camera = new Camera(); game.camera.map = game.map; game.camera.target = game.player; game.camera.snap();
  game.dialogue = new ScriptRunner(game.textbox, game);
  return { game, lines, cues };
}

function tickToLine(game) {
  for (let i = 0; i < 1000 && game.dialogue.running && !game.textbox.pending; i++) game.dialogue.update(0.02, {});
}

test('refuge entry records escape before starting interruptible dialogue', () => {
  const { game } = fixture({ castle_dark_chase_seen: true });
  saved.clear();
  game.setFlag = Game.prototype.setFlag;
  game.autosave = Game.prototype.autosave;
  game.runScript = function() {
    const data = JSON.parse(saved.get(Game.SAVE_KEY));
    assert.equal(data.flags.castle_dark_chase_done, true);
    assert.equal(data.map, mapId);
    assert.equal(data.flags.castle_dark_refuge_dialogue_done, undefined);
  };
  Game.prototype.runMapEnter.call(game);
  assert.equal(game.flags.castle_dark_chase_done, true);
});

test('completed chase chooses peaceful music even for legacy completion flags', () => {
  for (const flags of [{ castle_dark_chase_done: true }, { castle_dark_chase_seen: true, castle_dark_chase_done: true }]) {
    assert.equal(storyBgm('gajaeman_castle_dark_arrival', flags), 'castle_dark_path');
  }
  assert.equal(storyBgm('gajaeman_castle_dark_arrival', { castle_dark_chase_seen: true }), 'baron_intro');
});

test('map creation omits escaped pursuer while unfinished saves keep their scene', () => {
  for (const completed of [false, true]) {
    const { game } = fixture({ castle_dark_chase_seen: true, castle_dark_chase_done: completed });
    Object.assign(game, { party: [], preparedMaps: new Set([arrival.id]), preparedCharacters: new Set(['hyungsub']),
      spawnParty() {}, finishTvBroadcast() {}, finishShipAssault() {}, finishShipCastle() {}, finishShipMemory() {},
      sunrise: { dispose() {} } });
    Game.prototype.changeMap.call(game, arrival.id, 'from_refuge', true, { bgm: false, enter: false });
    assert.equal(game.castleDarkChase instanceof CastleDarkChase, !completed);
    if (completed) assert.equal(game.castleDarkChase, null);
  }
});

test('completed chase skips every intro cue and leaves current party positions intact', () => {
  const { game, lines, cues } = fixture({ castle_dark_chase_done: true });
  const before = game.entities.map(entity => [entity.x, entity.y]);
  game.dialogue.start(castle_dark_chase_intro);
  tickToLine(game);
  assert.equal(game.dialogue.running, false);
  assert.deepEqual(lines, []); assert.deepEqual(cues, []);
  assert.deepEqual(game.entities.map(entity => [entity.x, entity.y]), before);
});

test('refuge dialogue finishes once and reentry preserves positions without replay', () => {
  const { game, lines } = fixture({ castle_dark_chase_done: true });
  game.dialogue.start(castle_dark_chase_finish);
  for (let i = 0; i < 4 && game.dialogue.running; i++) {
    tickToLine(game);
    if (game.textbox.pending) { const done = game.textbox.pending; game.textbox.pending = null; done(null); }
  }
  tickToLine(game);
  assert.deepEqual(lines.map(line => [line.speaker, line.text]), [
    ['억빠맨', '* 와 겨우 나왔네요 ㅈ될뻔'], ['경섭', '* 후.. 저 앞에 문이 있네'], ['억빠맨', '* 얼른 가보죠'],
  ]);
  assert.equal(game.flags.castle_dark_refuge_dialogue_done, true);
  game.player.x = 510; game.player.y = 480;
  const before = game.entities.map(entity => [entity.x, entity.y]);
  game.dialogue.start(castle_dark_chase_finish); tickToLine(game);
  assert.equal(lines.length, 3); assert.equal(game.dialogue.running, false);
  assert.deepEqual(game.entities.map(entity => [entity.x, entity.y]), before);
});

test('interrupted refuge dialogue retains escaped safety and remains replayable', () => {
  const { game, lines } = fixture({ castle_dark_chase_done: true });
  game.dialogue.start(castle_dark_chase_finish); tickToLine(game);
  assert.equal(lines.length, 1);
  game.dialogue._finish();
  assert.equal(game.flags.castle_dark_chase_done, true);
  assert.equal(game.flags.castle_dark_refuge_dialogue_done, undefined);
  game.dialogue.start(castle_dark_chase_finish); tickToLine(game);
  assert.equal(lines.length, 2);
  assert.equal(lines[1].text, lines[0].text);
});

test('refuge relief precedes a visible northward walk and fanout behind the spring', () => {
  const { game, lines } = fixture({ castle_dark_chase_done: true });
  const party = [game.player, ...game.entities.filter(entity => ['gyeongsub', 'ppaman'].includes(entity.id))];
  const entry = party.map(actor => [actor.x, actor.y]);
  game.dialogue.start(castle_dark_chase_finish); tickToLine(game);
  assert.deepEqual(party.map(actor => [actor.x, actor.y]), entry);
  const done = game.textbox.pending; game.textbox.pending = null; done(null);
  let walked = false, spread = false;
  for (let i = 0; i < 1000 && !game.textbox.pending; i++) {
    game.dialogue.update(0.02, {});
    if (game.player.y < entry[0][1] && party.every(actor => actor.x === 372)) walked = true;
    if (party[1].x < 372 && party[1].x > 304 && party[2].x > 372 && party[2].x < 440) spread = true;
  }
  assert.equal(walked, true); assert.equal(spread, true);
  assert.equal(lines[1].speaker, '경섭');
  const spring = game.entities.find(entity => entity.id === 'castle_dark_refuge_spring');
  assert.ok(party.every(actor => actor.y + actor.h < spring.y));
  assert.deepEqual(party.map(actor => [actor.x, actor.y]), [[372, 416], [304, 416], [440, 416]]);
});

test('refuge walk camera keeps every actor in frame throughout zoom and fanout', () => {
  const { game } = fixture({ castle_dark_chase_done: true });
  const party = [game.player, ...game.entities.filter(entity => ['gyeongsub', 'ppaman'].includes(entity.id))];
  const advanceZoom = runInNewContext('(function(dt) {' + source.slice(source.indexOf('    if (this.zoom.tween) {'), source.indexOf('    if (this.caption) {')) + '})');
  game.zoom = { s: 1, fx: 0, fy: 0, smax: 1, tween: null };
  game.zoomTo = Game.prototype.zoomTo;
  const frame = () => { advanceZoom.call(game, 0.02); game.dialogue.update(0.02, {}); game.camera.follow(0.15); };
  game.dialogue.start(castle_dark_chase_finish);
  for (let i = 0; i < 1000 && !game.textbox.pending; i++) frame();
  const done = game.textbox.pending; game.textbox.pending = null; done(null);
  let frames = 0;
  for (; frames < 1000 && !game.textbox.pending; frames++) {
    frame();
    const z = game.zoom, cameraY = Math.round(game.camera.y);
    const screenY = y => {
      if (z.s < 0.9999) return 180 + (y - cameraY - 180) * z.s;
      if (z.s <= 1.0001) return y - cameraY;
      const focus = z.fy - cameraY, k = z.smax > 1 ? Math.min(1, (z.s - 1) / (z.smax - 1)) : 1;
      return focus + (180 - focus) * k + (y - cameraY - focus) * z.s;
    };
    for (const actor of party) {
      assert.ok(screenY(actor.y + actor.h - 92) >= 0, `${actor.id} head at frame ${frames}`);
      assert.ok(screenY(actor.y + actor.h) <= 360, `${actor.id} feet at frame ${frames}`);
    }
  }
  assert.ok(frames > 0 && frames < 1000);
});

test('escaped refuge south exit narrates locked without transition or standing replay', () => {
  const { game, lines } = fixture({ castle_dark_chase_done: true });
  const transitions = [];
  game.changeMap = (...args) => transitions.push(args);
  game.runScript = (key, done) => game.dialogue.start(SCRIPTS[key], done);
  const door = new Door(def.entities.find(entity => entity.id === 'castle_dark_refuge_return'), game);
  game.player.x = 372; game.player.y = 686;
  door.update(0.02);
  assert.deepEqual(transitions, []);
  assert.deepEqual(lines.map(line => [line.voice, line.speaker, line.portrait, line.text]), [
    ['narrator', undefined, undefined, '* 잠긴 것 같다.'],
  ]);
  const done = game.textbox.pending; game.textbox.pending = null; done(null);
  assert.equal(door.running, false); assert.equal(door.cooldown, Trigger.COOLDOWN);
  door.update(2); door.update(2);
  assert.equal(lines.length, 1);
  game.player.y = 640; door.update(0.02);
  game.player.y = 686; door.update(0.02);
  assert.equal(lines.length, 2);
  assert.deepEqual(transitions, []);
});

test('refuge exit lock is limited to escaped south return', () => {
  assert.equal(storyExitScript(mapId, arrival.id, {}), undefined);
  assert.equal(storyExitScript(mapId, 'gajaeman_castle_cathedral', { castle_dark_chase_done: true }), undefined);
  assert.equal(storyExitScript(arrival.id, mapId, { castle_dark_chase_done: true }), undefined);
});
