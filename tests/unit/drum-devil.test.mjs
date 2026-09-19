import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ENEMIES } from '../../src/data/enemies.js';
import { DRUM_DEVIL as C } from '../../src/data/drum-devil.js';
import { Bullet, PATTERNS, Board, Soul } from '../../src/battle/bullets.js';
import { Battle } from '../../src/battle/battle.js';
import { createDrumDevilSupport } from '../../src/battle/support/drum-devil.js';

const box = { x: 120, y: 134, w: 240, h: 160 };
const input = { down: () => false };
test('all generated boss frames fit the scene including hit shake margin', () => {
  const contract = JSON.parse(fs.readFileSync(new URL('../../assets/source/drum-devil-wings-v2/runtime-contract.json', import.meta.url), 'utf8'));
  const def = ENEMIES.drum_devil, x = 396 + def.dx, y = 176 + def.dy;
  assert.deepEqual(def.pivot, contract.pivot);
  assert.equal(def.scale, 1);
  for (const sheet of [def.sheet, def.actions.attack]) {
    const png = fs.readFileSync(new URL(`../../${sheet.src}`, import.meta.url));
    assert.equal(png.readUInt32BE(16) / sheet.cols, contract.cell[0]);
    assert.equal(png.readUInt32BE(20) / sheet.rows, contract.cell[1]);
  }
  assert.ok(y + C.hand[1] - C.finisherSize / 2 >= 0);
  assert.ok(y + C.hand[1] + C.finisherSize / 2 < box.y);
  for (const action of Object.values(contract.actions)) for (const frame of action.frames) {
    const [left, top, right, bottom] = frame.outputBbox;
    assert.ok(x + (left - def.pivot[0]) * def.scale - 3 >= 0);
    assert.ok(x + (right - def.pivot[0]) * def.scale + 3 <= 480);
    assert.ok(y + (top - def.pivot[1]) * def.scale >= 0);
    assert.ok(y + (bottom - def.pivot[1]) * def.scale <= 246);
  }
});
function battleFixture(hp = 100) {
  const enemy = { id: 'drum_devil', def: ENEMIES.drum_devil, x: 350, y: 242, hp: 300, maxHp: 300, dying: 0, patternIdx: 0 };
  const battle = Object.assign(Object.create(Battle.prototype), {
    enemies: [enemy], members: [{ hp, maxHp: 100, down: false }], soul: new Soul(), board: new Board(),
    state: 'bullets', t: 0, bullets: [], patterns: [], bubble: null, fx: [],
    game: { fadeTo() {}, sound: { stopBgm() {}, preloadBgm() {} } }, cfg: { bgm: C.bgm },
    rnd: () => 0, sfx() {}, setText(text) { this.text = text; },
  });
  Object.assign(battle.board, box); battle.soul.center(box);
  battle.rescueCount = 0;
  battle.support = createDrumDevilSupport(battle, { createRescue(_battle, { onComplete }) {
    battle.rescueCount++; battle.completeRescue = onComplete;
    return { update: () => false, draw() {} };
  } });
  return battle;
}

test('before rescue every attack is blocked for zero damage with the requested popup', () => {
  const battle = battleFixture();
  assert.equal(battle.hitEnemy(battle.enemies[0], null, 500), 0);
  assert.equal(battle.hitEnemy(battle.enemies[0], null, 500), 0);
  assert.equal(battle.enemies[0].hp, 300);
  assert.equal(battle.enemies[0].dying, 0);
  assert.equal(battle.enemies[0].popup.text, '막힘');
});

for (const { type } of ENEMIES.drum_devil.patterns) {
  test(`${type}: normal attacks finish before a quiet beat and one slow unavoidable 20-damage barrel`, () => {
    const pattern = PATTERNS[type](), emitted = [], penalties = [], poses = [];
    let clock = 0, lastNormalEnd = 0, purpleAt = null;
    const api = { box, soul: { x: 240, y: 214 }, actor: { x: 350, y: 242, scale: 1 },
      emit(o) {
        if (o.shape === 'drum_purple') { purpleAt = clock; assert.deepEqual(poses.at(-1), { sheet: 'attack', frame: 1 }); }
        if (!o.harmless) lastNormalEnd = Math.max(lastNormalEnd, clock + o.life);
        const bullet = new Bullet(o); emitted.push(bullet); return bullet;
      },
      present(pose) { poses.push(pose); }, clearHazards() { assert.fail('ordinary hazards must expire naturally'); }, penalty(damage) { penalties.push(damage); },
    };
    for (clock = 0; clock < pattern.duration; clock += 1 / 60) pattern.update(clock, 1 / 60, api);
    assert.deepEqual(penalties, [20]);
    assert.ok(purpleAt - lastNormalEnd >= C.finisherQuiet + C.warn - 0.001);
    const purple = emitted.filter(b => b.shape === 'drum_purple');
    assert.equal(purple.length, 1); assert.equal(purple[0].x, 300); assert.equal(purple[0].y, 26);
    assert.ok(purple[0].y - C.finisherSize / 2 >= 0);
    assert.ok(purple[0].y + C.finisherSize / 2 < box.y);
    assert.equal(purple[0].life, 3); assert.equal(purple[0].harmless, true);
    purple[0].update(1.5, box); assert.ok(purple[0].y < 173); assert.equal(purple[0].out(box), false);
    purple[0].update(1.5, box); assert.equal(purple[0].x, 240); assert.equal(purple[0].y, 214);
    assert.ok(poses.some(p => p?.sheet === 'attack' && p.frame === 2));
    assert.ok(emitted.some(b => !b.harmless));
    assert.ok(emitted.every(b => b.life > 0 && Number.isFinite(b.life)));
  });
}

test('penalty bypasses invulnerability and clears same-frame ordinary collision', () => {
  const battle = battleFixture(); battle.soul.invuln = 99;
  battle.patterns = [{ enemy: battle.enemies[0], t: 0, dmg: 15, p: { duration: 1, update(t, dt, api) {
    api.emit({ x: battle.soul.x, y: battle.soul.y, r: 50, life: 1 }); api.penalty(C.finisherDamage);
  } } }];
  battle.updateBullets(1 / 60, input);
  assert.equal(battle.members[0].hp, 80); assert.equal(battle.soul.hits, 1); assert.equal(battle.bullets.length, 0);
});

test('ordinary and purple lethal hits stop at one HP and interrupt into rescue exactly once', () => {
  for (const kind of ['ordinary', 'purple']) {
    const battle = battleFixture(10);
    battle.patterns = [{ enemy: battle.enemies[0], t: 0, dmg: 15, p: { duration: 1, update(t, dt, api) {
      if (kind === 'purple') api.penalty(C.finisherDamage);
      else api.emit({ x: battle.soul.x, y: battle.soul.y, r: 50, life: 1 });
    } } }];
    battle.updateBullets(1 / 60, input);
    assert.equal(battle.state, 'interlude'); assert.equal(battle.members[0].down, false); assert.equal(battle.members[0].hp, 1);
    assert.equal(battle.rescueCount, 1); assert.equal(battle.bullets.length, 0); assert.equal(battle.patterns.length, 0);
    assert.equal(battle.support.afterEnemyPhase(), null);
    battle.completeRescue(); battle.interlude = null; battle.beginMenu();
    assert.equal(battle.text, '* 멸공의 깃발이 함께한다.');
    assert.equal(battle.hitEnemy(battle.enemies[0], null, 10), 10);
    assert.equal(battle.enemies[0].hp, 290); assert.equal(battle.members[0].hp, 1);
    for (let turn = 0; turn < 10; turn++) assert.equal(battle.support.afterEnemyPhase(), null);
    assert.equal(battle.rescueCount, 1);
    battle.support.reset();
    assert.equal(battle.hitEnemy(battle.enemies[0], null, 10), 0);
  }
});

test('eighth completed enemy turn retains its purple tail then forces red-rip rescue once despite healing', () => {
  const battle = battleFixture(1000), hpAfterPurple = [];
  assert.equal(ENEMIES.drum_devil.patterns.length, 5);
  for (let turn = 1; turn <= C.rescueTurn; turn++) {
    battle.members[0].hp = 1000;
    battle.beginBullets();
    while (battle.state === 'bullets' && battle.t < C.duration + 2) {
      battle.soul.invuln = 99;
      battle.updateBullets(1 / 60, input); battle.t += 1 / 60;
    }
    assert.equal(battle.state, 'board-close');
    hpAfterPurple.push(battle.members[0].hp);
    battle.afterEnemyPhase();
    assert.equal(battle.support.completedTurns, turn);
    assert.equal(battle.state, turn < 8 ? 'menu' : 'interlude');
  }
  assert.deepEqual(hpAfterPurple, Array(8).fill(980));
  const tear = battle.interlude;
  assert.equal(tear.snapshot.phase, 'red-ramp'); assert.equal(battle.rescueCount, 0);
  tear.update(C.tearRamp, input); assert.equal(tear.snapshot.phase, 'screen-rip'); assert.equal(battle.members[0].hp, 980);
  tear.update(C.tearRip, input); assert.equal(battle.members[0].hp, 1); assert.equal(battle.members[0].down, false);
  tear.update(C.tearHold + 0.001, input); assert.equal(battle.rescueCount, 1);
  battle.completeRescue();
  for (let turn = 0; turn < 10; turn++) assert.equal(battle.support.afterEnemyPhase(), null);
  assert.equal(battle.support.completedTurns, 8); assert.equal(battle.rescueCount, 1);
  battle.support.reset(); assert.equal(battle.support.completedTurns, 0);
});

test('barrel effects play once per volley and respect individual gains and cooldowns', () => {
  for (const { type } of ENEMIES.drum_devil.patterns) {
    let clock = 0; const sounds = [], pattern = PATTERNS[type]();
    const api = { box, soul: { x: 240, y: 214 }, actor: { x: 340, y: 240, scale: 1 }, emit: o => new Bullet(o),
      penalty() {}, sfx(name, options) { sounds.push({ name, ...options, at: clock }); } };
    for (clock = 0; clock < pattern.duration; clock += 1 / 60) pattern.update(clock, 1 / 60, api);
    assert.equal(sounds.filter(s => s.name === 'drum_throw').length, C.waves + 1);
    assert.equal(sounds.filter(s => s.name === 'drum_burst').length, 1);
    const last = new Map();
    for (const sound of sounds) {
      assert.equal(sound.volume, C.soundVolume[sound.name]);
      assert.ok(sound.at - (last.get(sound.name) ?? -Infinity) >= C.soundCooldown[sound.name]);
      last.set(sound.name, sound.at);
    }
  }
});

test('unrelated battles retain the ordinary defeat and retry path', () => {
  const battle = battleFixture(30); battle.support = null;
  battle.hurtAllParty(30);
  assert.equal(battle.state, 'lose'); assert.equal(battle.members[0].down, true);
  battle.beginRetry(); assert.equal(battle.state, 'retry'); assert.equal(battle.members[0].hp, 100);
});

test('all patterns isolate finisher hazards and apply its damage once with coarse frames', () => {
  for (const { type } of ENEMIES.drum_devil.patterns) for (const dt of [1 / 60, 0.17]) {
    const battle = battleFixture(1000); const enemy = battle.enemies[0];
    const pattern = { enemy, t: 0, dmg: 15, p: PATTERNS[type]() }; battle.patterns = [pattern];
    let before = null;
    while (battle.state === 'bullets' && battle.t < C.duration + 2) {
      battle.soul.invuln = 99;
      battle.updateBullets(dt, input); battle.t += dt;
      if (pattern.t > C.finisherAt + dt && before === null) before = battle.members[0].hp;
      if (pattern.t > C.finisherAt + dt) assert.ok(battle.bullets.every(b => b.harmless));
    }
    assert.equal(before - battle.members[0].hp, 20, `${type} dt=${dt}`);
    assert.equal(battle.state, 'board-close');
    battle.afterEnemyPhase();
    assert.equal(battle.state, 'menu');
  }
});
