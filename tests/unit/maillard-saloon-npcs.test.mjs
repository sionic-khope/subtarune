import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Camera, Entity, TileMap } from '../../src/world/world.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { ScriptRunner, TextBox } from '../../src/ui/dialogue.js';

const room = JSON.parse(fs.readFileSync(new URL('../../assets/maps/maillard_saloon.json', import.meta.url), 'utf8'));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

test('test_saloon_wander_zones_leave_entry_and_each_other_clear', () => {
  const tiles = new TileMap(room);
  const npcs = room.entities.filter(e => e.type === 'npc' && e.wander > 0);
  assert.deepEqual(npcs.map(e => e.id).sort(), ['mabaem', 'yakulbeol']);
  const zones = npcs.map(e => ({ x: e.x - e.wander * 2, y: e.y - e.wander * 2, w: 24 + e.wander * 4, h: 16 + e.wander * 4 }));
  for (const zone of zones) {
    assert.equal(tiles.solidRect(zone.x, zone.y, zone.w, zone.h), false);
    assert.equal(overlaps(zone, { x: 204, y: 248, w: 72, h: 150 }), false);
  }
  assert.equal(overlaps(...zones), false);
});

test('test_saloon_pair_shares_event_and_keeps_one_monkey_after_completion', () => {
  const yerim = room.entities.find(e => e.id === 'yerim');
  const variants = room.entities.filter(e => e.id === 'parkwonsung');
  assert.ok(yerim);
  assert.equal(variants.length, 2);
  assert.equal(variants[0].script, yerim.script);
  const flag = variants[0].unless;
  assert.equal(variants[1].requires, flag);
  assert.ok(variants[1].x > variants[0].x && variants[0].x > yerim.x);
  for (const e of [yerim, ...variants]) assert.equal(new TileMap(room).solidRect(e.x, e.y, 24, 16), false);
  assert.ok(SCRIPTS[yerim.script]);
});

function fixture(flags = {}) {
  const game = {
    flags: { ...flags }, inventory: ['바나나'], money: 57, background: [],
    ctx: { measureText: text => ({ width: [...text].length * 16 }) },
    sound: { sfx() {}, blip() {} },
    map: new TileMap(room), camera: new Camera(), entities: [],
    setFlag(key, value) { this.flags[key] = value; },
  };
  const definitions = room.entities.filter(e => e.type === 'npc' && (!e.requires || flags[e.requires]) && (!e.unless || !flags[e.unless]));
  definitions.push({ id: 'player', type: 'player', x: 228, y: 248 });
  definitions.push({ id: 'gyeongsub', type: 'follower', x: 228, y: 296, solid: false });
  definitions.push({ id: 'ppaman', type: 'follower', x: 228, y: 344, solid: false });
  game.entities = definitions.map(def => {
    const entity = new Entity({ ...def }, game);
    entity.setSprite = name => { entity.def.sprite = name; };
    return entity;
  });
  game.player = game.entities.find(e => e.id === 'player');
  game.camera.map = game.map;
  game.camera.target = game.player;
  game.textbox = new TextBox(game.sound, {});
  game.dialogue = new ScriptRunner(game.textbox, game);
  return game;
}

function play(game, script, observe = () => {}) {
  const lines = [];
  const seen = new Set();
  game.dialogue.start(script);
  for (let tick = 0; tick < 3000 && game.dialogue.running; tick++) {
    const input = { just: key => key === 'confirm' && tick % 4 === 0, down: () => false };
    if (game.textbox.isOpen && !seen.has(game.textbox.node)) {
      seen.add(game.textbox.node);
      lines.push([game.textbox.node.speaker, game.textbox.node.text, game.textbox.node.voice]);
    }
    observe(game);
    game.background = game.background.filter(waiter => !waiter.update(0.025, input));
    game.dialogue.update(0.025, input);
  }
  assert.equal(game.dialogue.running, false);
  return lines;
}

test('test_saloon_mabaem_completion_saves_only_after_full_conversation_and_repeat_is_short', () => {
  const game = fixture();
  const lines = play(game, SCRIPTS.maillard_mabaem, g => assert.equal(g.flags.maillard_mabaem_seen, undefined));
  assert.deepEqual(lines.map(line => line[2]), ['mabaem', 'ppaman', 'mabaem', 'ppaman', 'gyeongsub', 'ppaman', 'narrator']);
  assert.equal(lines.at(-1)[1], '* ... 갈길 가야된다');
  assert.equal(game.flags.maillard_mabaem_seen, true);
  assert.deepEqual(play(game, SCRIPTS.maillard_mabaem), [lines[0]]);
  assert.deepEqual([game.inventory, game.money], [['바나나'], 57]);
});

test('test_saloon_roamer_lines_wait_for_safe_spaced_party_at_wander_boundaries', () => {
  for (const id of ['yakulbeol', 'mabaem']) {
    for (const edge of [-36, 36]) {
      const game = fixture();
      const npc = game.entities.find(e => e.id === id);
      npc.x += edge; npc.y += edge;
      for (let visit = 0; visit < 2; visit++) {
        let pages = 0;
        play(game, SCRIPTS[`maillard_${id}`], g => {
          if (!g.textbox.isOpen) return;
          pages++;
          const party = ['gyeongsub', 'player', 'ppaman'].map(member => g.entities.find(e => e.id === member));
          assert.deepEqual(party.map(e => [e.x, e.y]), [[npc.x + 56, npc.y + 64], [npc.x + 120, npc.y + 64], [npc.x + 184, npc.y + 64]]);
          for (const member of party) {
            assert.equal(g.map.solidRect(member.x, member.y, member.w, member.h), false);
            assert.equal(member.overlaps(npc.rect), false);
          }
        });
        assert.ok(pages > 0);
      }
    }
  }
});

test('test_saloon_pair_finishes_motion_restores_idle_and_repeat_skips_the_gag', () => {
  const game = fixture();
  let hop = 0, spin = 0, fly = 0, kick = false;
  const lines = play(game, SCRIPTS.maillard_yerim_pair, g => {
    const monkey = g.entities.find(e => e.id === 'parkwonsung');
    hop = Math.max(hop, monkey.hopY || 0);
    spin = Math.max(spin, monkey.spin || 0);
    fly = Math.max(fly, monkey.flyX || 0);
    kick ||= g.entities.find(e => e.id === 'yerim').def.sprite === 'yerim_kick';
    assert.equal(g.flags.maillard_yerim_pair_seen, undefined);
  });
  assert.equal(lines.length, 11);
  assert.equal(lines.at(-1)[1], '* 아 아니에요');
  assert.ok(hop >= 18 && spin > Math.PI * 2 && fly >= 150 && kick);
  const monkey = game.entities.find(e => e.id === 'parkwonsung');
  assert.deepEqual([monkey.x, monkey.y, monkey.flyX, monkey.hopY, monkey.spin, monkey.dead], [664, 220, 0, 0, 0, false]);
  assert.equal(game.entities.find(e => e.id === 'yerim').def.sprite, 'yerim');
  assert.equal(game.background.length, 0);
  assert.equal(game.camera.locked, false);
  assert.equal(game.camera.target, game.player);
  assert.equal(game.flags.maillard_yerim_pair_seen, true);
  assert.deepEqual(['gyeongsub', 'player', 'ppaman'].map(id => {
    const e = game.entities.find(entity => entity.id === id);
    return [e.x, e.y, e.facing];
  }), [[472, 292, 'up'], [536, 292, 'up'], [600, 292, 'up']]);
  assert.deepEqual(play(game, SCRIPTS.maillard_yerim_pair), [lines[1]]);
  assert.deepEqual([game.inventory, game.money], [['바나나'], 57]);
});
