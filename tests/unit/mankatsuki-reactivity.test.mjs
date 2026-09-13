import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../../src/battle/battle.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { Board, Soul, PATTERNS } from '../../src/battle/bullets.js';

const reactive = { maxSpeed: 1.4, afterimages: [{ hp: 0.7, count: 2 }, { hp: 0.5, count: 3 }, { hp: 0.2, count: 4 }], hitSfx: 'mankatsuki_hurt' };

test('only Mankatsuki opts into the requested HP reactivity', () => {
  assert.deepEqual(ENEMIES.mankatsuki_junhee.reactive, reactive);
  assert.equal(ENEMIES.mankatsuki_junhee.enragedAt, 0.5);
  assert.deepEqual(Object.keys(ENEMIES).filter(id => ENEMIES[id].reactive), ['mankatsuki_junhee']);
});

function fixture(hp = 100) {
  const enemy = { def: { ...ENEMIES.mankatsuki_junhee, reactive }, hp, maxHp: 100,
    x: 384, y: 210, img: { width: 512, height: 128 }, patternIdx: 0, animationTime: 0 };
  const sounds = [];
  const battle = Object.assign(Object.create(Battle.prototype), {
    enemies: [enemy], members: [], state: 'load', t: 0, text: '', shown: 0, fx: [],
    board: new Board(), soul: new Soul(), cfg: {}, game: { sound: { sfx: name => sounds.push(name), preloadBgm() {} }, fadeTo() {} },
  });
  return { battle, enemy, sounds };
}
function render(battle, enemy) {
  const calls = [], stack = [];
  const ctx = { globalAlpha: 1, filter: 'none', save() { stack.push([this.globalAlpha, this.filter]); },
    restore() { [this.globalAlpha, this.filter] = stack.pop(); },
    drawImage(...args) { calls.push({ args, alpha: this.globalAlpha }); } };
  battle.drawEnemy(ctx, enemy);
  return calls;
}

for (const [hp, count] of [[100, 0], [71, 0], [70, 2], [51, 2], [50, 3], [21, 3], [20, 4], [1, 4]]) {
  test(`idle at ${hp}% HP draws ${count} afterimages behind one real boss`, () => {
    const { battle, enemy } = fixture(hp);
    const calls = render(battle, enemy);
    assert.equal(calls.length, count + 1);
    const main = calls.at(-1);
    assert.equal(main.alpha, 1);
    for (const ghost of calls.slice(0, -1)) {
      assert.ok(ghost.alpha > 0 && ghost.alpha < 0.3);
      assert.ok(ghost.args[5] > main.args[5]);
      assert.ok(ghost.args[5] + ghost.args[7] <= 480);
      assert.ok(ghost.args[6] >= 0 && ghost.args[6] + ghost.args[8] <= 246);
    }
    assert.equal(battle.living().length, 1);
  });
}

for (const pose of [{ hidden: true }, { sheet: 'attack' }, { x: 90, y: 130, sheet: 'idle', scale: 0.65 }]) {
  test(`pattern pose ${JSON.stringify(pose)} never has idle afterimages`, () => {
    const { battle, enemy } = fixture(20);
    enemy.patternPose = pose;
    enemy.actionImages = { attack: { width: 768, height: 128 } };
    assert.equal(render(battle, enemy).length, pose.hidden ? 0 : 1);
  });
}

test('animation accelerates continuously with missing HP and remains capped at 1.4x', () => {
  const { battle, enemy } = fixture();
  for (const [hp, rate] of [[100, 1], [70, 1.12], [50, 1.2], [20, 1.32], [0, 1.4], [-10, 1.4]]) {
    enemy.hp = hp;
    const before = enemy.animationTime;
    battle.update(0.1, {});
    assert.ok(Math.abs(enemy.animationTime - before - 0.1 * rate) < 1e-10);
  }
});

test('damage and turn-clock resets do not jump the reactive sprite frame', () => {
  const { battle, enemy } = fixture();
  battle.update(0.21, {});
  const before = render(battle, enemy).at(-1).args[1];
  enemy.hp = 20;
  battle.t = 0;
  assert.equal(render(battle, enemy).at(-1).args[1], before);
  battle.update(0.15, {});
  assert.equal(render(battle, enemy).at(-1).args[1], 256);
});

test('normal enemies keep their ordinary turn-clock animation and no ghosts', () => {
  const { battle, enemy } = fixture(20);
  enemy.def = { ...enemy.def, reactive: undefined };
  battle.t = 0.4;
  const calls = render(battle, enemy);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].args[1], 256);
});

test('half HP switches to the first alternate attack and retry restores the normal pool', () => {
  const { battle, enemy } = fixture(51);
  const selected = [];
  const record = token => options => { selected.push(token); return { duration: 1, update() {} }; };
  PATTERNS.reactivity_normal = record('normal');
  PATTERNS.reactivity_first = record('first');
  PATTERNS.reactivity_second = record('second');
  try {
    enemy.def = { ...enemy.def, patterns: [{ type: 'reactivity_normal' }], enragedAt: 0.5,
      enragedPatterns: [{ type: 'reactivity_first' }, { type: 'reactivity_second' }] };
    battle.beginBullets();
    enemy.hp = 50;
    battle.beginBullets();
    battle.beginBullets();
    battle.beginBullets();
    enemy.animationTime = 20;
    battle.beginRetry();
    assert.equal(enemy.animationTime, 0);
    battle.beginBullets();
    assert.deepEqual(selected, ['normal', 'first', 'second', 'first', 'normal']);
  } finally {
    delete PATTERNS.reactivity_normal;
    delete PATTERNS.reactivity_first;
    delete PATTERNS.reactivity_second;
  }
});

for (const cannon of [false, true]) {
  test(`${cannon ? 'cannon' : 'ordinary'} positive hit plays the boss hurt echo exactly once`, () => {
    const { battle, enemy, sounds } = fixture();
    if (cannon) battle.applyCannonDamage(enemy, 2); else battle.hitEnemy(enemy, null, 2);
    assert.deepEqual(sounds, cannon ? ['mankatsuki_hurt'] : ['hit', 'damage', 'mankatsuki_hurt']);
  });
}

test('boss speech uses every line before repeating and never repeats across bag boundaries', () => {
  const { battle, enemy } = fixture();
  battle.modes = { enemy: 'bullets' };
  battle.rnd = () => 0.61;
  enemy.def = { ...enemy.def, lines: { ...enemy.def.lines, speakShuffle: true } };
  const spoken = [];
  const count = enemy.def.lines.speak.length;
  for (let i = 0; i < count * 4; i++) {
    battle.beginEnemyTurn();
    spoken.push(battle.bubble.text);
  }
  for (let i = 1; i < spoken.length; i++) assert.notEqual(spoken[i], spoken[i - 1]);
  for (let i = 0; i < spoken.length; i += count) assert.equal(new Set(spoken.slice(i, i + count)).size, count);
  battle.beginRetry();
  assert.deepEqual(enemy.speechBag, []);
  assert.equal(enemy.lastSpeech, null);
});

test('zero damage and dead or dying enemies never play a hurt echo', () => {
  const { battle, enemy, sounds } = fixture();
  battle.hitEnemy(enemy, null, 0);
  enemy.dead = true;
  battle.hitEnemy(enemy, null, 2);
  enemy.dead = false; enemy.dying = 0.5;
  battle.hitEnemy(enemy, null, 2);
  enemy.dying = 0; enemy.hp = 0;
  battle.hitEnemy(enemy, null, 2);
  assert.deepEqual(sounds, []);
});

test('unconfigured enemy hit sounds retain the ordinary and cannon contracts', () => {
  const { battle, enemy, sounds } = fixture();
  enemy.def = { ...enemy.def, reactive: undefined };
  battle.hitEnemy(enemy, null, 2);
  assert.deepEqual(sounds, ['hit', 'damage']);
  sounds.length = 0;
  battle.applyCannonDamage(enemy, 2);
  assert.deepEqual(sounds, []);
});
