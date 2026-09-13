import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { ScriptRunner, TextBox } from '../../src/ui/dialogue.js';
import { TileMap } from '../../src/world/world.js';
import { QA_POINTS } from '../../src/core/story.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

function fixture() {
  const game = {
    flags: {}, inventory: ['바나나'], money: 57, hpBonuses: { hyungsub: 5 },
    ctx: { measureText: text => ({ width: [...text].length * 16 }) },
    sound: { sfx() {}, blip() {} },
    setFlag(key, value) { this.flags[key] = value; },
  };
  game.textbox = new TextBox(game.sound, {});
  game.dialogue = new ScriptRunner(game.textbox, game);
  return game;
}

function play(game, script) {
  const lines = new Set();
  game.dialogue.start(script);
  assert.equal(game.textbox.isOpen, true);
  for (let tick = 0; tick < 2000 && game.dialogue.running; tick++) {
    if (game.textbox.isOpen) lines.add(game.textbox.node);
    game.dialogue.update(0.025, { just: key => key === 'confirm' && tick % 4 === 0, down: () => false });
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

test('eunbyeol is in the captain path and talks once without staging or rewards', () => {
  const npcs = readMap('maillard_saloon').entities.filter(e => e.type === 'npc');
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

test('captain confirmation cancels safely and only accepted entry has a black transition', () => {
  const nodes = SCRIPTS.maillard_captain_enter;
  assert.ok(nodes);
  assert.equal(nodes.filter(node => node.text).length, 3);
  const choice = nodes.find(node => node.choice).choice;
  assert.equal(choice.cancel, 1);
  assert.deepEqual(choice.options.map(option => option.label), ['네', '아니오']);
  const declined = nodes.slice(nodes.findIndex(node => node.label === choice.options[1].goto));
  assert.equal(declined.some(node => node.map || node.sfx), false);
  assert.deepEqual(nodes.filter(node => node.fade).map(node => node.fade), ['out', 'in']);
  assert.equal(nodes.find(node => node.map).map, 'maillard_captain');
  assert.equal(nodes.some(node => node.battle || node.bgm), false);
});

test('captain room keeps timber floors, broad clear center and one return to the path', () => {
  const room = readMap('maillard_captain');
  const tiles = new TileMap(room);
  assert.deepEqual([tiles.pxW, tiles.pxH], [864, 576]);
  assert.equal(room.bgm, 'maillard_lounge');
  assert.equal(room.backdrop, undefined);
  assert.equal(room.enter, undefined);
  assert.equal(room.meta.connected, true);
  const exit = room.entities.find(e => e.type === 'door');
  assert.equal(exit.to, 'maillard_saloon');
  assert.equal(readMap('maillard_saloon').spawns[exit.spawn].facing, 'down');
  for (const y of [376, 424, 472]) assert.equal(tiles.solidRect(420, y, 24, 16), false);
  for (const e of room.entities.filter(e => e.solid)) assert.ok(e.y + e.h <= 256 || e.x >= 672 || e.x + e.w <= 192);
  const qa = QA_POINTS.filter(point => point.map === room.id);
  assert.equal(qa.length, 1);
  assert.equal(qa[0].flags.maillard_sunrise_seen, true);
});
