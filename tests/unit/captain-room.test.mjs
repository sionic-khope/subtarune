import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runInNewContext } from 'node:vm';
import { clearEditorUnionStage } from '../../src/scenes/editor-union-effects.js';
import { clearChoimisFlowerEffects } from '../../src/data/cutscenes/choimis_flower.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { ScriptRunner, TextBox, parseText } from '../../src/ui/dialogue.js';
import { Camera, Entity, TileMap } from '../../src/world/world.js';
import { QA_POINTS, storyBgm } from '../../src/core/story.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));
const mainSource = fs.readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const Game = runInNewContext(mainSource.slice(mainSource.indexOf('class Game {'), mainSource.indexOf('// ── 부트')) + '\nGame;', {
  MAPS: { maillard_captain: readMap('maillard_captain') }, storyBgm, clearEditorUnionStage, clearChoimisFlowerEffects,
});

function fixture() {
  const game = {
    flags: {}, inventory: ['바나나'], money: 57, hpBonuses: { hyungsub: 5 },
    ctx: { measureText: text => ({ width: [...text].length * 16 }) },
    sound: { sfx() {}, blip() {} },
    setFlag(key, value) { this.flags[key] = value; },
    runMapEnter() {},
  };
  game.map = new TileMap(readMap('maillard_saloon'));
  game.entities = game.map.def.entities.map(def => new Entity(def, game));
  game.player = new Entity({ id: 'player', x: 404, y: 304 }, game);
  game.entities.push(game.player,
    new Entity({ id: 'gyeongsub', x: 356, y: 304 }, game),
    new Entity({ id: 'ppaman', x: 452, y: 304 }, game));
  game.camera = new Camera();
  game.camera.map = game.map;
  game.camera.target = game.player;
  game.camera.snap();
  game.textbox = new TextBox(game.sound, {});
  game.dialogue = new ScriptRunner(game.textbox, game);
  return game;
}

function play(game, script, observe = () => {}) {
  const lines = new Set();
  game.dialogue.start(script);
  assert.equal(game.textbox.isOpen, true);
  for (let tick = 0; tick < 2000 && game.dialogue.running; tick++) {
    if (game.textbox.isOpen) lines.add(game.textbox.node);
    observe(game);
    game.dialogue.update(0.025, { just: key => key === 'confirm' && tick % 4 === 0, down: () => false });
    game.camera.follow(0.05);
  }
  assert.equal(game.dialogue.running, false);
  return [...lines];
}

for (const outcome of ['cancel', 'decline', 'accept']) {
  test(`captain entry ${outcome} follows the real dialogue choice without changing upgrades`, () => {
    const game = fixture();
    const effects = [];
    game.sound.sfx = sound => effects.push(sound);
    game.fadeTo = (alpha, duration, done) => { effects.push(['fade', alpha]); done(); };
    game.changeMap = (id, spawn) => effects.push(['map', id, spawn]);
    game.dialogue.start(SCRIPTS.maillard_captain_enter);
    let selected = false;
    for (let tick = 0; tick < 2000 && game.dialogue.running; tick++) {
      const choosing = game.textbox.state === 'choice' && game.textbox.choiceLock <= 0;
      let key = tick % 4 === 0 ? 'confirm' : '';
      if (choosing) {
        key = outcome === 'cancel' ? 'cancel' : outcome === 'decline' && !selected ? 'right' : 'confirm';
        selected = true;
      } else if (game.textbox.state === 'choice') key = '';
      game.dialogue.update(0.025, { just: action => action === key, down: () => false });
    }
    assert.equal(game.dialogue.running, false);
    assert.equal(selected, true);
    const expected = {
      accept: ['menu', 'confirm', 'plug', ['fade', 1], ['map', 'maillard_captain', 'start'], ['fade', 0]],
      decline: ['menu', 'menu', 'confirm'],
      cancel: ['menu', 'cancel'],
    };
    assert.deepEqual(effects, expected[outcome]);
    assert.deepEqual([game.inventory, game.money, game.hpBonuses], [['바나나'], 57, { hyungsub: 5 }]);
  });
}

for (const completed of [false, true]) {
  test(`test_captain_door_${completed ? 'completed' : 'pending'}_aftermath_uses_silent_story_music_on_exit`, () => {
    const game = fixture();
    const effects = [];
    game.flags = { captain_reveal_started: true, captain_reveal_done: true,
      captain_mankatsuki_defeated: true, captain_aftermath_done: completed };
    game.has = key => !!game.flags[key];
    game.sound.playBgm = id => effects.push(['music', id]);
    game.sound.stopBgm = () => effects.push('stop');
    game.resumeMapBgm = Game.prototype.resumeMapBgm;
    game.runMapEnter = Game.prototype.runMapEnter;
    game.runScript = key => effects.push(key);
    game.fadeTo = (alpha, duration, done) => done();
    game.changeMap = id => { game.mapId = id; };
    game.dialogue.start(SCRIPTS.maillard_captain_enter, () => effects.push('finish'));
    for (let tick = 0; tick < 2000 && game.dialogue.running; tick++) {
      game.dialogue.update(0.025, { just: key => key === 'confirm' && tick % 4 === 0, down: () => false });
    }
    assert.equal(game.dialogue.running, false);
    assert.equal(game.mapId, 'maillard_captain');
    assert.deepEqual(effects, completed ? ['finish', 'stop', 'captain_attack'] : ['finish', 'stop', 'captain_aftermath']);
  });
}

test('eunbyeol is in the captain path and talks once without staging or rewards', () => {
  const npcs = readMap('maillard_saloon').entities.filter(e => e.type === 'npc' && !e.requires);
  assert.deepEqual(npcs.map(e => e.id), ['eunbyeol']);
  assert.equal(readMap('maillard_lounge').entities.some(e => e.id === 'eunbyeol'), false);
  const game = fixture();
  const lines = play(game, SCRIPTS[npcs[0].script]);
  assert.equal(lines.length, 10);
  assert.equal(game.flags.maillard_eunbyeol_seen, true);
  assert.deepEqual(play(game, SCRIPTS[npcs[0].script]), [lines[8]]);
  assert.deepEqual([game.inventory, game.money, game.hpBonuses], [['바나나'], 57, { hyungsub: 5 }]);
});

test('grand door sits inside the widened upper-right wall and accepts an up-facing wall probe', () => {
  const room = readMap('maillard_saloon');
  const door = room.entities.find(e => e.id === 'captain_door_image');
  const probe = room.entities.find(e => e.id === 'captain_door');
  assert.equal(room.rows[0].length * 32, 864);
  assert.ok(door.x > 864 / 2 && door.x + door.w <= 864 - 96);
  assert.ok(probe.y < 160 && probe.y + probe.h > 160 - 19.2);
  assert.equal(new TileMap(room).solidRect(628, 160, 24, 16), false);
});

test('eunbyeol guidance frames the door and restores player tracking for the following line', () => {
  const game = fixture();
  const lines = SCRIPTS.maillard_eunbyeol.filter(node => node.text);
  const positions = game.entities.map(entity => [entity.x, entity.y]);
  const door = game.entities.find(entity => entity.id === 'captain_door_image');
  const targets = new Set();
  play(game, SCRIPTS.maillard_eunbyeol, state => {
    assert.deepEqual(state.entities.map(entity => [entity.x, entity.y]), positions);
    if (!state.textbox.isOpen) return;
    if (state.textbox.node === lines[4]) {
      assert.equal(state.camera.target, door);
      assert.equal(state.camera.locked, false);
      targets.add('door');
    }
    if (state.textbox.node === lines[5]) {
      assert.equal(state.camera.target, state.player);
      assert.equal(state.camera.locked, false);
      targets.add('player');
    }
  });
  assert.deepEqual([...targets], ['door', 'player']);
  assert.equal(game.camera.target, game.player);
});

test('captain confirmation cancels safely and only accepted entry has a black transition', () => {
  const script = SCRIPTS.maillard_captain_enter;
  assert.ok(script);
  const nodes = script.slice(1, script.findIndex(node => node.label === script[0].goto));
  assert.equal(nodes.filter(node => node.text).length, 4);
  assert.equal(nodes[0].text, '* 선장실 문이다.');
  const tokens = parseText(nodes[2].text);
  assert.equal(tokens.filter(token => token.color === '#ffe066').map(token => token.ch).join(''), '공격력/체력 증가 아이템');
  assert.equal(tokens.at(-1).color, null);
  const choice = nodes.find(node => node.choice).choice;
  assert.equal(choice.cancel, 1);
  assert.deepEqual(choice.options.map(option => option.label), ['네', '아니오']);
  const declined = nodes.slice(nodes.findIndex(node => node.label === choice.options[1].goto));
  assert.equal(declined.some(node => node.map || node.sfx), false);
  assert.deepEqual(nodes.filter(node => node.fade).map(node => node.fade), ['out', 'in']);
  assert.equal(nodes.find(node => node.map).map, 'maillard_captain');
  assert.equal(nodes.some(node => node.battle || node.bgm), false);
});

test('captain pursuit guard activates only after attack completion and selects the shared warning', () => {
  const script = SCRIPTS.maillard_captain_enter;
  const guard = script[0];
  assert.equal(Boolean(guard.if({})), false);
  assert.equal(Boolean(guard.if({ captain_attack_started: true })), false);
  assert.equal(guard.if({ captain_attack_done: true }), true);
  const branch = script.slice(script.findIndex(node => node.label === guard.goto) + 1);
  assert.deepEqual(branch, [...SCRIPTS.ship_pursuit_backtrack, { end: true }]);
  const game = fixture();
  game.flags.captain_attack_done = true;
  game.changeMap = () => assert.fail('Pursuit guard must not enter the captain room');
  assert.deepEqual(play(game, script), [...SCRIPTS.ship_pursuit_backtrack]);
});

test('captain room keeps timber floors, broad clear center and one return to the path', () => {
  const room = readMap('maillard_captain');
  const tiles = new TileMap(room);
  assert.deepEqual([tiles.pxW, tiles.pxH], [864, 576]);
  assert.equal(room.bgm, 'maillard_lounge');
  assert.equal(room.backdrop, undefined);
  assert.equal(room.enter.script, 'captain_reveal');
  assert.equal(room.meta.connected, true);
  const exit = room.entities.find(e => e.type === 'door');
  assert.equal(exit.to, 'maillard_saloon');
  assert.equal(readMap('maillard_saloon').spawns[exit.spawn].facing, 'down');
  for (const y of [376, 424, 472]) assert.equal(tiles.solidRect(420, y, 24, 16), false);
  for (const e of room.entities.filter(e => e.solid)) assert.ok(e.y + e.h <= 256 || e.x >= 672 || e.x + e.w <= 192);
  const qa = QA_POINTS.filter(point => point.map === room.id);
  assert.deepEqual(qa.map(point => point.id), ['maillard_captain', 'captain_aftermath', 'captain_attack']);
  assert.equal(qa[0].flags.maillard_sunrise_seen, true);
});
