import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../../src/battle/battle.js';
import { ENEMIES } from '../../src/data/enemies.js';

function damageResolvedForFirstPattern(id) {
  const def = ENEMIES[id];
  const enemy = { def, hp: def.hp, maxHp: def.hp, patternIdx: 0 };
  const battle = Object.assign(Object.create(Battle.prototype), {
    living: () => [enemy],
    boardSize: Battle.prototype.boardSize,
    clearPatternPresentation() {},
    setText() {},
    rnd: () => 0.5,
    board: { setTarget() {}, snap() {} },
    soul: { invuln: 0 },
    bullets: [],
  });

  battle.beginBullets();
  return battle.patterns[0].dmg;
}

test('test_mankatsuki_and_current_later_cat_encounters_add_five_damage_through_battle_pattern_resolution', () => {
  const patched = { mankatsuki_junhee: 16, seopnyang: 16, gyeongnyang: 17 };
  for (const [id, damage] of Object.entries(patched)) {
    assert.equal(ENEMIES[id].damage, damage, `${id}: configured damage`);
    assert.ok(ENEMIES[id].patterns.every(pattern => pattern.damage === undefined), `${id}: no per-pattern override`);
    assert.equal(damageResolvedForFirstPattern(id), damage, `${id}: emitted bullet damage`);
  }
});

test('test_prior_current_encounters_keep_their_existing_damage', () => {
  assert.deepEqual(Object.fromEntries([
    'cs_red', 'cs_blue', 'razorbeak', 'wolf', 'toad', 'krug', 'scuttle', 'cannon',
    'red', 'blue', 'baron', 'expelled_viewer',
  ].map(id => [id, ENEMIES[id].damage])), {
    cs_red: 8, cs_blue: 8, razorbeak: 10, wolf: 12, toad: 14, krug: 12,
    scuttle: 13, cannon: 14, red: 13, blue: 13, baron: 12, expelled_viewer: 11,
  });
});
