import test from 'node:test';
import assert from 'node:assert/strict';
import { createJanitorHeroAttack, createJanitorHeroIntercept } from '../../src/battle/support/janitor-hero-actions.js';
import { createDrumDevilRescue } from '../../src/battle/support/drum-devil-rescue.js';

function context(draws) {
  return new Proxy({ drawImage(image) { draws.push(image.id); }, measureText(text) { return { width: text.length * 14 }; } },
    { get(target, key) { return target[key] ?? (() => {}); } });
}

test('upstage attack body is separate from foreground red energy', () => {
  const draws = [], ctx = context(draws);
  const action = createJanitorHeroAttack({ game: { time: 0 }, sfx() {} }, {
    assets: { heroAttack: { id: 'hero' }, heroEnergy: { id: 'energy' } }, target: { x: 340, y: 240 }, onHit() {},
  });
  action.update(0.7);
  assert.equal(typeof action.drawBody, 'function', 'hero must render behind foreground Yoplait');
  action.drawBody(ctx); draws.push('yoplait'); action.drawEffects(ctx);
  assert.deepEqual(draws, ['hero', 'yoplait', 'energy']);
  draws.length = 0; action.draw(ctx); assert.deepEqual(draws, ['hero', 'energy']);
});

test('landed rescue hero and carried flag render behind foreground Yoplait', () => {
  const draws = [], ctx = context(draws), assets = Object.fromEntries(
    ['hero', 'stand', 'laugh', 'kneel', 'surprised', 'lookback', 'flag'].map(id => [id, { id }]));
  const battle = { cfg: { bg: 'depth-test' }, members: [{ id: 'hyungsub', home: [84, 190] }],
    enemies: [{ id: 'drum_devil', x: 340, y: 240 }], typed: true, shown: 999,
    game: { sound: { stopBgm() {}, preloadBgm() {}, playBgm() {} } },
    sfx() {}, setText(text) { this.text = text; }, showLine(line) { this.text = line.text; },
    drawEnemy() { draws.push('enemy'); }, roundRect() {},
  };
  const scene = createDrumDevilRescue(battle, { assets, onComplete() {} });
  for (let i = 0; i < 300 && scene.snapshot.phase !== 'ready'; i++) scene.update(0.2, { just: () => true });
  assert.equal(scene.snapshot.phase, 'ready'); scene.draw(ctx);
  assert.ok(draws.indexOf('hero') >= 0);
  assert.ok(draws.indexOf('hero') < draws.indexOf('lookback'), `wrong painter order: ${draws.join(', ')}`);
  assert.equal(draws.filter(id => id === 'lookback').length, 1);
});

test('intercept notice puts home body behind Yoplait while keeping exclamation foreground', () => {
  const draws = [], ctx = context(draws); ctx.fillRect = () => draws.push('emote');
  const action = createJanitorHeroIntercept({ game: { time: 0 }, sfx() {} }, {
    assets: { hero: { id: 'hero' } }, barrel: { x: 260, y: 200 }, onDeflect() {},
  });
  assert.equal(action.backgroundBody, true);
  action.drawBody(ctx); assert.deepEqual(draws, ['hero']);
  draws.push('yoplait'); action.drawEffects(ctx);
  assert.ok(draws.indexOf('emote') > draws.indexOf('yoplait'));
  action.update(0.31); assert.equal(action.backgroundBody, false);
  action.update(5); assert.equal(action.backgroundBody, true);
});
