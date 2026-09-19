import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createJanitorHeroAttack, createJanitorHeroIntercept, loadJanitorHeroActions } from '../../src/battle/support/janitor-hero-actions.js';
import { JANITOR_HERO_ACTIONS as C } from '../../src/data/janitor-hero-actions.js';
import { DRUM_DEVIL_RESCUE as R } from '../../src/data/drum-devil-rescue.js';
import { Bullet, PATTERNS } from '../../src/battle/bullets.js';
import { ENEMIES } from '../../src/data/enemies.js';

const makeBattle = () => {
  const sounds = [];
  return { sounds, game: { time: 10 }, sfx(name) { sounds.push(name); } };
};
const release = C.attack.holds.slice(0, 3).reduce((sum, hold) => sum + hold, 0);

test('assist has deep windup, one three-layer wave, and one damage callback at enemy contact', () => {
  const battle = makeBattle(), target = { x: 340, y: 240, hp: 300 };
  let hits = 0;
  const action = createJanitorHeroAttack(battle, { assets: {}, target, onHit() { hits++; } });
  action.update(0.3); assert.equal(action.snapshot.frame, 1); assert.equal(action.snapshot.released, false);
  action.update(0.3); assert.equal(action.snapshot.frame, 2); assert.equal(hits, 0);
  action.update(0.09); assert.equal(action.snapshot.frame, 3); assert.equal(action.snapshot.energy.layers, 3);
  assert.deepEqual(battle.sounds, ['rudebuster_swing']);
  action.update(release + C.energy.flight - 0.7); assert.equal(hits, 0);
  action.update(0.02); assert.equal(hits, 1);
  assert.deepEqual(action.snapshot.contact, { x: target.x, y: target.y - 100 });
  action.update(10); action.update(10); assert.equal(hits, 1); assert.equal(target.hp, 300);
  assert.deepEqual(battle.sounds, ['rudebuster_swing', 'rudebuster_hit']);
});

test('intercept tracks the actual moving barrel, deflects only on downslam, laughs, and returns home', () => {
  const battle = makeBattle(), barrel = { x: 270, y: 230, intercepted: true };
  let deflects = 0;
  const action = createJanitorHeroIntercept(battle, { assets: {}, barrel, onDeflect() { deflects++; } });
  assert.equal(action.snapshot.phase, 'notice'); assert.deepEqual(battle.sounds, ['chime']);
  action.update(0.31); assert.equal(action.snapshot.phase, 'teleport-out');
  action.update(0.2); assert.equal(action.snapshot.phase, 'teleport-in');
  barrel.x = 250; barrel.y = 250;
  action.update(0.3); assert.equal(action.snapshot.phase, 'attack');
  assert.deepEqual(action.snapshot.position, { x: 250 - C.attack.contactOffset[0], y: 250 - C.attack.contactOffset[1] });
  assert.equal(deflects, 0);
  barrel.x = 244; barrel.y = 268;
  action.update(0.54); assert.equal(deflects, 1);
  assert.deepEqual(action.snapshot.contact, { x: 244, y: 268 });
  const impactPosition = action.snapshot.position;
  barrel.x = 400; barrel.y = 100;
  action.update(0.6); assert.equal(action.snapshot.phase, 'laugh');
  assert.deepEqual(action.snapshot.position, impactPosition);
  assert.ok(battle.sounds.includes('laugh_janitor'));
  assert.equal(action.update(2), true);
  assert.deepEqual(action.snapshot.position, { x: R.hero.home[0], y: R.hero.home[1] });
  action.update(1); assert.equal(deflects, 1);
  assert.equal(battle.sounds.filter(name => name === 'rudebuster_hit').length, 1);
});

test('cancellation prevents pending damage, deflection, and later audio', () => {
  for (const kind of ['assist', 'intercept']) {
    const battle = makeBattle(); let callbacks = 0;
    const options = { assets: {}, target: { x: 340, y: 240 }, barrel: { x: 250, y: 240 },
      onHit() { callbacks++; }, onDeflect() { callbacks++; } };
    const action = kind === 'assist' ? createJanitorHeroAttack(battle, options) : createJanitorHeroIntercept(battle, options);
    action.dispose(); const before = battle.sounds.length;
    assert.equal(action.update(10), true); assert.equal(callbacks, 0); assert.equal(battle.sounds.length, before);
  }
});

test('large frame steps still apply one contact and finish at home', () => {
  const battle = makeBattle(); let hits = 0;
  const action = createJanitorHeroIntercept(battle, { assets: {}, barrel: { x: 260, y: 270 }, onDeflect() { hits++; } });
  assert.equal(action.update(5), true); assert.equal(hits, 1);
  assert.deepEqual(action.snapshot.position, { x: R.hero.home[0], y: R.hero.home[1] });
  action.update(5); assert.equal(hits, 1);
});

test('loader uses separate attack-body and red three-layer effect assets', async () => {
  const assets = await loadJanitorHeroActions(async src => ({ src }));
  assert.equal(assets.heroAttack.src, C.attack.src); assert.equal(assets.heroEnergy.src, C.energy.src);
});

test('final attack contract keeps full windup and downslam in view at home and at the purple barrel', () => {
  const metadata = JSON.parse(readFileSync(new URL('../../assets/source/janitor-hero-v4-flag-only/attack/metadata.json', import.meta.url)));
  assert.deepEqual(metadata.pivot, C.attack.pivot);
  assert.deepEqual(metadata.cell, [C.attack.cell, C.attack.cell]);
  assert.equal(metadata.records.length, C.attack.count);
  const positions = [R.hero.home, [240 - C.attack.contactOffset[0], 190 - C.attack.contactOffset[1]],
    [248 - C.attack.contactOffset[0], 280 - C.attack.contactOffset[1]]];
  for (const [x, y] of positions) {
    for (const frame of metadata.records) {
      const [left, top, right, bottom] = frame.visible_bounds;
      assert.ok(x + left - C.attack.pivot[0] >= 0, `frame ${frame.frame} left`);
      assert.ok(x + right - C.attack.pivot[0] <= 480, `frame ${frame.frame} right`);
      assert.ok(y + top - C.attack.pivot[1] >= 0, `frame ${frame.frame} top`);
      assert.ok(y + bottom - C.attack.pivot[1] <= 318, `frame ${frame.frame} HUD`);
    }
  }
  assert.deepEqual(C.energy.origin, C.attack.contactOffset);
});

test('actual purple arcs keep every parry frame visible and hit the real cloth point before expiry', () => {
  const metadata = JSON.parse(readFileSync(new URL('../../assets/source/janitor-hero-v4-flag-only/attack/metadata.json', import.meta.url)));
  const box = { x: 120, y: 134, w: 240, h: 160 };
  for (const { type } of ENEMIES.drum_devil.patterns) for (const dt of [1 / 60, 0.17]) {
    let barrel, action, contacts = 0;
    const pattern = PATTERNS[type](), api = { box, soul: { x: 240, y: 214 }, actor: { x: 340, y: 240, scale: 1 },
      emit(options) { const bullet = new Bullet(options); if (bullet.purple && bullet.shape === 'drum_purple') barrel = bullet; return bullet; }, penalty() {} };
    for (let t = 0; !barrel && t < 30; t += dt) pattern.update(t, dt, api);
    assert.ok(barrel);
    while (!action || action.snapshot.phase !== 'done') {
      if (!action?.snapshot.contacted) barrel.update(dt, box);
      if (!action && barrel.age >= 1) action = createJanitorHeroIntercept(makeBattle(), { assets: {}, barrel, onDeflect() {
        contacts++; assert.ok(barrel.age < barrel.life, `${type} contact before expiry`);
        assert.ok(Math.abs(action.snapshot.position.y + C.attack.contactOffset[1] - barrel.y) < 0.001);
        assert.ok(Math.abs(action.snapshot.position.x + C.attack.contactOffset[0] - barrel.x) < 0.001);
      } });
      if (!action) continue;
      action.update(dt);
      const s = action.snapshot;
      if (s.phase === 'attack') {
        const [left, top, right, bottom] = metadata.records[s.frame].visible_bounds;
        assert.ok(s.position.y + top - C.attack.pivot[1] >= 0, `${type} dt=${dt} frame=${s.frame} top clipped at barrel age ${barrel.age}`);
        assert.ok(s.position.x + left - C.attack.pivot[0] >= 0);
        assert.ok(s.position.x + right - C.attack.pivot[0] <= 480);
        assert.ok(s.position.y + bottom - C.attack.pivot[1] <= 318);
      }
      assert.ok(barrel.age < 4, 'intercept must not hang');
    }
    assert.equal(contacts, 1);
    assert.ok(action.snapshot.anticipation > 0, 'real arc needs a brief raised-pose hold');
    assert.deepEqual(action.snapshot.contact, { x: barrel.x, y: barrel.y });
    assert.deepEqual(action.snapshot.position, { x: R.hero.home[0], y: R.hero.home[1] });
  }
});
