import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../../src/battle/battle.js';
import { BATTLE_SPRITES } from '../../src/data/battle-sprites.js';

class LayoutBattle extends Battle {
  load() {}
}

function battleFor(party = ['gyeongsub', 'ppaman']) {
  return new LayoutBattle({
    party, partyHp: {}, inventory: [], has: () => true, fadeTo() {},
    sound: { sfx() {}, stopBgm() {}, preloadBgm() {} },
  }, { enemies: ['mankatsuki_junhee'] });
}

function recorder() {
  const calls = { ellipses: [], translates: [], images: [] };
  return {
    calls, save() {}, restore() {}, beginPath() {}, fill() {}, scale() {},
    ellipse(...args) { calls.ellipses.push(args); },
    translate(...args) { calls.translates.push(args); },
    drawImage(...args) { calls.images.push(args); },
  };
}

function framesFor(member) {
  const def = BATTLE_SPRITES[member.id];
  member.frames = Object.fromEntries(['idle', 'run', 'attack'].map(mode => {
    const frames = mode === 'run' ? def.run.frames : def[mode];
    return [mode, frames.map(frame => ({ ...frame, image: { width: frame.rect[2], height: frame.rect[3] } }))];
  }));
}

test('one, two and three person battles use the same compact grounded homes', () => {
  for (const [party, ys] of [[[], [190]], [['gyeongsub'], [164, 224]], [['ppaman'], [164, 224]], [['gyeongsub', 'ppaman'], [104, 164, 224]]]) {
    assert.deepEqual(battleFor(party).members.map(member => member.home), ys.map(y => [84, y]));
  }
});

test('every ordinary rush approaches the same enemy and returns exactly to its compact home', () => {
  const battle = battleFor();
  for (const member of battle.members) {
    const home = [...member.home], enemy = battle.enemies[0];
    battle.plans = [{ type: 'fight', member, target: enemy }];
    battle.beginAct(); battle.updateAct(0, {});
    const action = member.action;
    assert.deepEqual(action.position, home);
    action.update(action.approachT);
    assert.equal(action.mode, 'attack');
    assert.deepEqual(action.position, [enemy.x - 44, enemy.y + 6]);
    action.update(action.attackDuration + action.returnT + 0.01);
    assert.equal(action.mode, 'idle');
    assert.deepEqual(action.position, home);
    assert.deepEqual(member.home, home);
  }
});

test('standing, selecting and running ground shadows follow the rendered feet without scaling the body', () => {
  const battle = battleFor();
  for (const member of battle.members) {
    framesFor(member);
    battle.state = 'menu'; battle.memberIdx = battle.members.indexOf(member);
    const selected = recorder(); battle.drawMember(selected, member);
    assert.deepEqual(selected.calls.translates[0], [member.home[0] + 10, member.home[1]]);
    assert.deepEqual(selected.calls.ellipses[0].slice(0, 4), [member.home[0] + 10, member.home[1] + 2, 15, 3]);
    assert.deepEqual(selected.calls.images[0].slice(-2), [63, 84]);
    member.action = { mode: 'return', elapsed: 0, position: [155, 180] };
    const running = recorder(); battle.drawMember(running, member);
    assert.deepEqual(running.calls.translates[0], [155, 180]);
    assert.deepEqual(running.calls.ellipses[0].slice(0, 2), [155, 182]);
  }
});

test('knockdown, three round revival and retry preserve all homes and stay above the panel', () => {
  const battle = battleFor(), homes = battle.members.map(member => [...member.home]);
  for (const member of battle.members) {
    framesFor(member); member.downImg = { width: 96, height: 96 };
    member.down = true; member.hp = 0;
    const ctx = recorder(); battle.drawMember(ctx, member);
    const [, x, y, width, height] = ctx.calls.images[0];
    assert.equal(x, member.home[0] - 48);
    assert.equal(y, member.home[1] - 89);
    assert.ok(x >= 0 && x + width <= 480 && y + height < 246);
    assert.ok(ctx.calls.ellipses[0][1] + ctx.calls.ellipses[0][3] < 246);
  }
  for (let round = 0; round < 3; round++) battle.afterEnemyPhase();
  assert.ok(battle.members.every(member => !member.down && member.hp === Math.ceil(member.maxHp / 2)));
  assert.deepEqual(battle.members.map(member => member.home), homes);
  battle.beginRetry();
  assert.deepEqual(battle.members.map(member => member.home), homes);
});
