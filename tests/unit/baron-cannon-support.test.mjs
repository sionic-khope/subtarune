import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../../src/battle/battle.js';
import { BARON_CANNON as C } from '../../src/data/baron-cannon.js';
import { createBattleSupport } from '../../src/battle/support/baron-cannon.js';
import { ENEMIES } from '../../src/data/enemies.js';

const noInput = { just: () => false };
const confirm = { just: (key) => key === 'confirm' };
function fixture() {
  const b = Object.create(Battle.prototype);
  b.enemies = [{ id: 'baron', def: ENEMIES.baron, hp: 250, maxHp: 250, dead: false, dying: 0 }];
  b.members = [{ id: 'hyungsub', name: '형섭', hp: 100, maxHp: 100, down: false }];
  b.game = { attack: 2, inventory: [], sound: { sfx() {}, preloadBgm() {} }, fadeTo() {} };
  b.cfg = {}; b.fx = []; b.plans = []; b.rnd = () => 0; b.support = createBattleSupport(b);
  b.setText('');
  return b;
}
function unlock(b) {
  const intro = b.support.afterEnemyPhase();
  for (let i = 0; i < 200; i++) intro.update(0.02, noInput);
  assert.equal(intro.snapshot.phase, 'talk');
  assert.equal(intro.snapshot.frame, 0);
  for (let i = 0; i < C.introLines.length; i++) {
    b.shown = b.text.length;
    intro.update(0.2, confirm);
  }
  for (let i = 0; i < 200; i++) if (intro.update(0.02, noInput)) break;
  return intro;
}

test('test_cannon_intro_unlocks_only_after_exact_nine_lines_once', () => {
  const b = fixture();
  b.hitEnemy(b.enemies[0], b.members[0]);
  assert.equal(b.support.charge, 0);
  assert.equal(C.introLines.length, 9);
  assert.equal(C.introLines[8].text, '* 대포 스택이 추가되었다.');
  unlock(b);
  assert.equal(b.support.unlocked, true);
  assert.equal(b.support.charge, 0);
  assert.equal(b.support.afterEnemyPhase(), null);
});

test('test_cannon_counts_live_ordinary_hits_not_damage_and_consumes_once', () => {
  const b = fixture(); unlock(b);
  const enemy = b.enemies[0], member = b.members[0];
  b.hitEnemy(enemy, member, 0);
  assert.equal(b.support.charge, 0);
  for (let i = 0; i < 8; i++) b.hitEnemy(enemy, member, 2);
  assert.equal(b.support.charge, 8);
  assert.equal(b.support.action(), null);
  b.hitEnemy(enemy, member, 1);
  assert.equal(b.support.ready, true);
  b.hitEnemy(enemy, member, 2);
  assert.equal(b.support.charge, 9);
  const action = b.support.action();
  assert.equal(action.mode, 'cannon_guard');
  assert.equal(b.support.charge, 0);
  assert.equal(b.support.action(), null);
  const before = enemy.hp, sounds = [];
  b.sfx = (name) => sounds.push(name);
  b.applyCannonDamage(enemy);
  assert.equal(before - enemy.hp, 50);
  assert.equal(b.support.charge, 0);
  assert.deepEqual(sounds, []);
  enemy.dead = true;
  assert.equal(b.hitEnemy(enemy, member, 2), 0);
  assert.equal(b.support.charge, 0);
});

test('test_cannon_whole_party_selection_discards_old_plans_and_retry_resets', () => {
  const b = fixture(); unlock(b);
  for (let i = 0; i < 9; i++) b.hitEnemy(b.enemies[0], b.members[0]);
  b.state = 'menu'; b.memberIdx = 0; b.menuIdx = 2;
  b.plans = [{ type: 'fight', member: b.members[0], target: b.enemies[0] }];
  b.updateMenu(confirm);
  assert.equal(b.state, 'act');
  assert.equal(b.plans.length, 1);
  assert.equal(b.plans[0].type, 'support');
  let disposed = false;
  b.gimmick = { dispose() { disposed = true; } };
  b.beginRetry();
  assert.equal(disposed, true);
  assert.equal(b.support.unlocked, false);
  assert.equal(b.support.charge, 0);
  assert.equal(b.enemies[0].hp, 250);
  assert.equal(b.gimmick, null);
});

test('test_other_enemies_have_no_support_and_nonready_button_cannot_start', () => {
  const b = fixture();
  b.enemies = [{ id: 'cs_red', def: ENEMIES.cs_red }];
  assert.equal(createBattleSupport(b), null);
  const c = fixture(); unlock(c);
  c.state = 'menu'; c.memberIdx = 0; c.menuIdx = 2;
  c.updateMenu(confirm);
  assert.equal(c.state, 'menu');
  assert.equal(c.plans.length, 0);
});

test('test_cannon_hint_tracks_remaining_hits_on_selection_and_unready_confirm', () => {
  const b = fixture(); unlock(b);
  const right = { just: (key) => key === 'right' };
  for (const charge of [0, 5, 9]) {
    while (b.support.charge < charge) b.hitEnemy(b.enemies[0], b.members[0]);
    b.state = 'menu'; b.memberIdx = 0; b.menuIdx = 1;
    b.updateMenu(right);
    const expected = `* 바론을 좀 패고 있으면 용준이가 올 것 같다.\n${9 - charge}대 남았다.`;
    assert.equal(b.text, expected);
    if (charge < 9) {
      b.setText('');
      b.updateMenu(confirm);
      assert.equal(b.text, expected);
      assert.equal(b.state, 'menu');
    }
  }
});

test('test_cannon_intro_descends_faster_and_preserves_exit_speed', () => {
  const b = fixture();
  const intro = b.support.afterEnemyPhase();
  intro.update(1, noInput);
  assert.equal(intro.snapshot.y, C.intro.fromY + 78);
  intro.update(2, noInput);
  assert.equal(intro.snapshot.phase, 'talk');
  assert.equal(intro.snapshot.y, C.intro.toY);
  for (let i = 0; i < C.introLines.length; i++) {
    b.shown = b.text.length;
    intro.update(0.2, confirm);
  }
  intro.update(1, noInput);
  assert.equal(intro.snapshot.phase, 'exit');
  assert.equal(intro.snapshot.y, C.intro.toY - 65);
});
