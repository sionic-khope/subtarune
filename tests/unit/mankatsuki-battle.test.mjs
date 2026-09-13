import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Battle } from '../../src/battle/battle.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { Board, Soul } from '../../src/battle/bullets.js';

test('mankatsuki has independent idle and attack sheets, 130 HP and the requested 500 reward', () => {
  const boss = ENEMIES.mankatsuki_junhee;
  assert.equal(boss?.hp, 130);
  assert.equal(boss.money, 500);
  assert.equal(boss.sheet.count, 4);
  assert.equal(boss.actions.attack.count, 6);
  assert.deepEqual(boss.board, [240, 160]);
});

test('pattern presentation overrides idle pose without changing enemy home and resets at phase end', () => {
  const enemy = { x: 360, y: 210, def: { scale: 1.45 }, patternPose: null };
  const battle = Object.assign(Object.create(Battle.prototype), {
    enemies: [enemy], board: new Board(), soul: new Soul(), bullets: [], t: 0,
    rnd: () => 0.5, sfx() {},
    patterns: [{ enemy, dmg: 11, t: 0, p: { duration: 1, update(t, dt, api) {
      assert.deepEqual(api.actor, { x: 360, y: 210, scale: 1.45 });
      api.present({ x: 90, y: 300, scale: 0.65, sheet: 'attack', frame: 3 });
    } } }],
  });
  const input = { down: () => false };
  battle.updateBullets(0.1, input);
  assert.deepEqual(enemy.patternPose, { x: 90, y: 300, scale: 0.65, sheet: 'attack', frame: 3 });
  assert.deepEqual([enemy.x, enemy.y], [360, 210]);
  battle.patterns[0].t = 1;
  battle.updateBullets(0.1, input);
  assert.equal(enemy.patternPose, null);
});

test('battle renderer honors hidden pose and action frames with a separate scale', () => {
  const idle = { width: 512, height: 128 }, attack = { width: 768, height: 128 };
  const enemy = {
    def: { sheet: { cols: 4, rows: 1, count: 4, px: 1 }, actions: { attack: { cols: 6, rows: 1, count: 6, px: 1 } }, scale: 1.45, pivot: [64, 119] },
    img: idle, actionImages: { attack }, x: 360, y: 210, ox: 99, oy: 99,
    patternPose: { x: 90, y: 300, scale: 0.65, sheet: 'attack', frame: 3 },
  };
  const calls = [];
  const ctx = { save() {}, restore() {}, drawImage(...args) { calls.push(args); } };
  Battle.prototype.drawEnemy.call({ t: 0 }, ctx, enemy);
  assert.deepEqual(calls[0], [attack, 384, 0, 128, 128, 48, 223, 83, 83]);
  enemy.patternPose = { hidden: true };
  Battle.prototype.drawEnemy.call({ t: 0 }, ctx, enemy);
  assert.equal(calls.length, 1);
});

test('completed reveal can start the shared fight and defeated captain cannot start it again', () => {
  const room = JSON.parse(fs.readFileSync('assets/maps/maillard_captain.json', 'utf8'));
  const boss = room.entities.find(entity => entity.id === 'captain_mankatsuki');
  assert.equal(boss.script, 'captain_mankatsuki');
  assert.equal(boss.unless, 'captain_aftermath_done');
  const nodes = SCRIPTS.captain_mankatsuki;
  assert.equal(nodes[0].if({ captain_aftermath_done: true }), true);
  assert.equal(nodes[1].if({ captain_mankatsuki_defeated: true }), true);
  assert.equal(nodes[1].goto, 'aftermath');
  assert.equal(nodes[0].if({ captain_reveal_done: true }), false);
  const fight = nodes.find(node => node.battle).battle;
  assert.deepEqual(fight.enemies, ['mankatsuki_junhee']);
  assert.equal(fight.flag, 'captain_mankatsuki_defeated');
  assert.equal(fight.bgm, 'mankatsuki_battle');
  assert.equal(fight.bg, 'mankatsuki_vortex');
  assert.equal(nodes.some(node => node.text), false);
});

test('losing and retrying clear staged boss poses and restore its ordinary home', () => {
  const enemy = { x: 360, y: 210, maxHp: 100, hp: 40, patternPose: { hidden: true }, patternIdx: 3 };
  const member = { hp: 1, maxHp: 100, down: false };
  const battle = Object.assign(Object.create(Battle.prototype), {
    enemies: [enemy], members: [member], board: new Board(), soul: new Soul(), bullets: [], fx: [],
    cfg: { bgm: 'mankatsuki_battle' }, rnd: () => 0,
    game: { sound: { sfx() {}, stopBgm() {}, preloadBgm() {} }, fadeTo() {} },
  });
  battle.hurtParty(11);
  assert.equal(battle.state, 'lose');
  assert.equal(enemy.patternPose, null);
  enemy.patternPose = { x: 90, y: 300, scale: 0.65 };
  battle.beginRetry();
  assert.equal(battle.state, 'retry');
  assert.equal(enemy.patternPose, null);
  assert.deepEqual([enemy.x, enemy.y, enemy.hp, enemy.patternIdx], [360, 210, 100, 0]);
});
