import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../../src/battle/battle.js';
import { Board, Soul, PATTERNS } from '../../src/battle/bullets.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { PARK_GUARDIAN as C } from '../../src/data/park-guardian.js';
import { createBattleSupport } from '../../src/battle/support/baron-cannon.js';
import { createParkStrip } from '../../src/battle/modes/park-strip.js';
import { drawParkCostume } from '../../src/battle/support/park-guardian.js';
import { getBattleMode } from '../../src/battle/modes.js';

const none = { just: () => false, down: () => false };
const confirm = { just: k => k === 'confirm', down: () => false };
function fixture() {
  const b = Object.create(Battle.prototype), def = ENEMIES.park_guardian;
  b.enemies = [{ id: 'park_guardian', name: def.name, def, hp: def.hp, maxHp: def.hp, dead: false, dying: 0, x: 384, y: 176, patternIdx: 0 }];
  b.members = ['hyungsub', 'gyeongsub', 'ppaman'].map((id, i) => ({ id, name: id, hp: 100, maxHp: 100, down: false, home: [84, 104 + i * 60] }));
  b.game = { attack: 2, inventory: [], partyHp: {}, sound: { sfx() {}, stopBgm() {}, preloadBgm() {}, blip() {} }, fadeTo() {} };
  b.cfg = {}; b.fx = []; b.plans = []; b.rnd = () => 0; b.modes = { attack: 'rush', enemy: 'bullets' };
  b.board = new Board(); b.soul = new Soul(); b.bullets = []; b.support = createBattleSupport(b); b.setText('');
  return b;
}
function intro(b) {
  const interlude = b.support.afterEnemyPhase();
  const seen = [b.text];
  for (let i = 0; i < C.introLines.length; i++) {
    b.shown = b.text.length;
    const ended = interlude.update(0.2, confirm);
    if (!ended) seen.push(b.text);
  }
  assert.deepEqual(seen, C.introLines.map(l => l.text));
  return interlude;
}
function charge(b, count = 9) { for (let i = 0; i < count; i++) b.hitEnemy(b.enemies[0], b.members[0]); }
function expose(b) {
  const plan = b.support.action(); assert.ok(plan);
  const mode = createParkStrip(b, plan);
  mode.update(C.strip.windup + C.strip.rush + 0.01, none);
  mode.update(4, none); mode.dispose();
  return mode;
}

test('test_park_costume_immune_and_first_round_contacts_count_before_intro', () => {
  const b = fixture(), e = b.enemies[0];
  assert.equal(e.hp, 57);
  for (let i = 0; i < 3; i++) assert.equal(b.hitEnemy(e, b.members[i], 999), 0);
  assert.equal(e.hp, 57); assert.equal(b.support.charge, 3); assert.equal(b.support.unlocked, false);
  assert.equal(b.support.action(), null);
  b.afterEnemyPhase(); assert.equal(b.state, 'interlude'); assert.equal(b.support.unlocked, false);
  for (let i = 0; i < C.introLines.length; i++) { b.shown = b.text.length; b.update(0.2, confirm); }
  assert.equal(b.state, 'menu'); assert.equal(b.support.unlocked, true); assert.equal(b.support.charge, 3);
  assert.equal(b.support.afterEnemyPhase(), null);
});

test('test_park_exact_dialogue_unlock_once_and_nonordinary_miss_dead_contacts_ignored', () => {
  const b = fixture(), e = b.enemies[0]; intro(b);
  b.hitEnemy(e, b.members[0], 0); b.hitEnemy(e, b.members[0], -1); b.applyCannonDamage(e, 60);
  assert.equal(e.hp, 57); assert.equal(b.support.charge, 0);
  e.dead = true; b.hitEnemy(e, b.members[0]); e.dead = false;
  e.dying = 0.2; b.hitEnemy(e, b.members[0]); e.dying = 0;
  charge(b, 20); assert.equal(b.support.charge, 9); assert.equal(b.support.afterEnemyPhase(), null);
});

test('test_park_dance_loosen_slip_adjust_thresholds_and_retry_restore_dance', () => {
  const b = fixture(), e = b.enemies[0];
  for (let i = 0; i <= 9; i++) {
    assert.equal(b.support.poseFor(e).sheet, i >= 9 ? 'adjust' : i >= 6 ? 'slipping' : i >= 3 ? 'loose' : 'dance');
    b.hitEnemy(e, b.members[0]);
  }
  b.beginRetry(); assert.equal(b.support.poseFor(e).sheet, 'dance'); assert.equal(e.hp, 57);
});

test('test_park_disabled_when_ppaman_down_no_charge_or_action_consumption', () => {
  const b = fixture(); intro(b); charge(b); b.members[2].down = true;
  b.state = 'menu'; b.memberIdx = 0; b.menuIdx = 2; b.updateMenu(confirm);
  assert.equal(b.support.ready, false); assert.equal(b.support.charge, 9); assert.equal(b.state, 'menu'); assert.equal(b.plans.length, 0);
  assert.match(b.text, /억빠맨이 일어나야/);
  b.members[2].down = false; assert.equal(b.support.ready, true);
  b.plans = [{ type: 'fight', member: b.members[0] }]; b.updateMenu(confirm);
  assert.equal(b.state, 'act'); assert.equal(b.plans.length, 1); assert.equal(b.plans[0].mode, 'park_strip');
  assert.equal(b.plans[0].member.id, 'ppaman'); assert.equal(b.support.charge, 0); assert.equal(b.support.action(), null);
});

test('test_park_collision_exposes_only_at_contact_and_returns_member_home', () => {
  const b = fixture(), e = b.enemies[0]; intro(b); charge(b);
  const plan = b.support.action(), m = plan.member, mode = createParkStrip(b, plan);
  mode.update(C.strip.windup / 2, none); assert.ok(m.action.position[0] < m.home[0]); assert.equal(b.support.phase, 'stripping');
  mode.update(C.strip.windup / 2 + C.strip.rush / 2, none); assert.ok(m.action.position[0] > m.home[0]); assert.equal(b.support.phase, 'stripping');
  mode.update(C.strip.rush / 2 + 0.001, none); assert.equal(b.support.phase, 'dog'); assert.equal(e.hp, 57);
  assert.equal(e.formDef, e.def.forms.dog); assert.equal(b.support.poseFor(e), null);
  assert.equal(mode.update(3, none), true); assert.deepEqual(m.action.position, m.home);
  mode.dispose(); assert.equal(m.action, null);
});

test('test_park_two_complete_player_rounds_then_visible_rewear_and_repeat', () => {
  const b = fixture(), e = b.enemies[0]; intro(b); charge(b); expose(b);
  assert.equal(b.support.turns, 2); assert.equal(b.support.patternsFor(e)[0].type, 'park_dog_scratch');
  assert.equal(b.support.afterEnemyPhase(), null); assert.equal(b.support.turns, 2);
  b.hitEnemy(e, b.members[0], 2); assert.equal(b.support.afterEnemyPhase(), null); assert.equal(b.support.turns, 1);
  b.hitEnemy(e, b.members[0], 2); const rewear = b.support.afterEnemyPhase();
  assert.ok(rewear); assert.equal(b.support.phase, 'rewearing'); assert.equal(e.hp, 53);
  assert.equal(rewear.update(0.4, none), false); assert.equal(e.formDef, e.def.forms.dog);
  assert.equal(rewear.update(0.6, none), false); assert.equal(e.formDef, null); assert.equal(e.patternPose.sheet, 'adjust');
  assert.equal(rewear.update(0.6, none), true); assert.equal(b.support.phase, 'costume'); assert.equal(b.support.charge, 0);
  assert.equal(b.hitEnemy(e, b.members[0], 99), 0); assert.equal(e.hp, 53);
  charge(b, 8); expose(b); assert.equal(b.support.turns, 2); assert.equal(e.hp, 53);
});

test('test_park_retry_clears_exposure_unlock_charge_and_disposes_mode', () => {
  const b = fixture(), e = b.enemies[0]; intro(b); charge(b); expose(b);
  b.hitEnemy(e, b.members[0], 10); let disposed = false;
  b.gimmick = { dispose() { disposed = true; } }; b.beginRetry();
  assert.equal(disposed, true); assert.equal(b.support.phase, 'costume'); assert.equal(b.support.turns, 0);
  assert.equal(b.support.unlocked, false); assert.equal(b.support.charge, 0); assert.equal(e.hp, 57);
  assert.equal(e.formDef, null); assert.equal(e.formImage, null); assert.equal(e.patternIdx, 0);
  assert.ok(b.support.afterEnemyPhase());
});

test('test_park_exposed_victory_and_all_down_keep_common_lifecycle', () => {
  const b = fixture(), e = b.enemies[0]; intro(b); charge(b); expose(b);
  b.hitEnemy(e, b.members[0], 100); assert.equal(e.hp, 0); assert.equal(e.dying, 0.5);
  e.dead = true; assert.equal(b.support.afterEnemyPhase(), null);
  b.actIdx = 0; b.actWait = 0; b.cur = null; b.plans = []; b.updateAct(0.1, none);
  assert.equal(b.state, 'win'); assert.equal(b.game.money, 0);
  const c = fixture(); intro(c); charge(c); expose(c);
  for (let i = 0; i < 3; i++) c.hurtParty(1000);
  assert.equal(c.state, 'lose'); assert.equal(c.interlude, null); assert.equal(c.gimmick, null);
  c.beginRetry(); assert.equal(c.support.phase, 'costume'); assert.equal(c.enemies[0].hp, 57);
});

test('test_park_native_enemy_turn_routes_only_dog_scratch_during_exposure', () => {
  const b = fixture(), e = b.enemies[0], calls = [], old = new Map();
  const names = [...e.def.patterns, ...e.def.forms.dog.patterns].map(p => p.type);
  for (const name of names) { old.set(name, PATTERNS[name]); PATTERNS[name] = () => { calls.push(name); return { duration: 1, update() {} }; }; }
  try {
    assert.equal(getBattleMode('attack', 'park_strip'), createParkStrip);
    b.beginBullets(); b.beginBullets(); b.beginBullets();
    assert.deepEqual(calls, ['park_rabbit_ears', 'park_obsessive_hearts', 'park_pirate_fans']);
    intro(b); charge(b); expose(b);
    b.beginEnemyTurn(); assert.equal(b.bubble.voice, 'park_guardian');
    b.beginBullets(); b.beginBullets();
    assert.deepEqual(calls.slice(3), ['park_dog_scratch', 'park_dog_scratch']);
    b.beginMenu(); assert.match(b.text, /2턴/);
  } finally { for (const [name, pattern] of old) { if (pattern) PATTERNS[name] = pattern; else delete PATTERNS[name]; } }
});

test('test_park_shell_arc_flies_right_offscreen_continuously_and_can_be_retrieved', () => {
  const b = fixture(), e = b.enemies[0], image = {}, poses = [];
  let x, y, angle;
  const ctx = { save() {}, restore() {}, translate(px, py) { x = px; y = py; }, rotate(a) { angle = a; }, drawImage(im, dx, dy, w, h) {
    assert.equal(im, image); assert.equal(dx, -w / 2); assert.equal(dy, -h / 2);
    assert.ok([x, y, angle, w, h].every(Number.isFinite));
    poses.push({ x, y, angle });
  } };
  for (let i = 0; i <= 20; i++) drawParkCostume(ctx, image, e, i / 20);
  assert.equal(poses[0].x, e.x); assert.ok(poses[10].x > poses[0].x); assert.ok(poses[10].y < poses.at(-1).y);
  assert.equal(poses.at(-1).x, 580); assert.equal(poses.at(-1).y, 180); assert.equal(poses.at(-1).angle, C.shell.turn);
  assert.ok(poses.at(-1).x - 48 * e.def.scale > 480);
  for (let i = 1; i < poses.length; i++) { assert.ok(poses[i].x > poses[i - 1].x); assert.ok(poses[i].x - poses[i - 1].x <= 10); assert.ok(poses[i].angle > poses[i - 1].angle); }
  const outward = [...poses]; poses.length = 0;
  for (let i = 20; i >= 0; i--) drawParkCostume(ctx, image, e, i / 20);
  assert.deepEqual(poses, outward.reverse());
});

test('test_park_scratch_rectangular_action_uses_its_own_stable_foot_pivot', () => {
  const b = fixture(), e = b.enemies[0], draws = [];
  e.patternPose = { sheet: 'scratch', frame: 2 }; e.actionImages = { scratch: { width: 256, height: 192 } };
  const ctx = { save() {}, restore() {}, drawImage(...args) { draws.push(args); } };
  b.drawEnemy(ctx, e);
  assert.equal(draws.length, 1);
  assert.deepEqual(draws[0].slice(1, 5), [0, 96, 128, 96]);
  assert.equal(draws[0][5], Math.round(e.x - 64 * e.def.scale));
  assert.equal(draws[0][6], Math.round(e.y - 90 * e.def.scale));
});

test('test_park_ppaman_and_shell_fly_together_then_return_from_offscreen_with_synced_sfx', () => {
  const b = fixture(), sounds = []; intro(b); charge(b);
  b.sfx = (name) => sounds.push(name);
  const plan = b.support.action(), m = plan.member, mode = createParkStrip(b, plan), t = C.strip;
  mode.update(t.windup + t.rush + t.impact + t.flight * 0.4, none);
  assert.equal(mode.snapshot.phase, 'flight'); assert.ok(mode.snapshot.spin > Math.PI);
  assert.ok(mode.snapshot.x > plan.target.x); assert.ok(mode.snapshot.y < plan.target.y - 30);
  assert.ok(mode.snapshot.shellProgress > 0 && mode.snapshot.shellProgress < 1);
  assert.equal(m.action.airborne, true); assert.equal(b.support.phase, 'dog');
  assert.equal(b.text, '* 인형탈이 날아갔다!');
  assert.equal(Math.round(plan.target.x + C.shell.landingDx * mode.snapshot.shellProgress - mode.snapshot.x), 30);
  assert.deepEqual(sounds, ['scrape', 'hit', 'whoosh']);
  mode.update(t.flight * 0.6 + t.offscreenHold / 2, none);
  assert.equal(mode.snapshot.phase, 'offscreen'); assert.equal(mode.snapshot.hidden, true); assert.equal(mode.snapshot.x, t.exitX);
  assert.equal(sounds.at(-1), 'thud');
  mode.update(t.offscreenHold / 2 + t.return * 0.1, none);
  assert.equal(mode.snapshot.phase, 'return'); assert.equal(mode.snapshot.hidden, false); assert.equal(mode.snapshot.spin, 0);
  assert.equal(b.text, '');
  assert.ok(mode.snapshot.x > 480); assert.equal(m.action.mode, 'return');
  mode.update(t.return + t.settle, none);
  assert.deepEqual(m.action.position, m.home); assert.equal(mode.snapshot.phase, 'settle');
  const count = sounds.length; mode.update(1, none); assert.equal(sounds.length, count);
  assert.equal(sounds.filter(s => s === 'hit').length, 1); assert.equal(sounds.filter(s => s === 'whoosh').length, 1);
  assert.ok(sounds.includes('iron_step_1') && sounds.includes('iron_step_2'));
  mode.dispose(); assert.equal(m.action, null); assert.equal(m.pose, null);
});

test('test_park_interrupted_flight_clears_transforms_and_disposed_mode_cannot_emit_again', () => {
  const b = fixture(); intro(b); charge(b);
  const plan = b.support.action(), mode = createParkStrip(b, plan), action = plan.member.action;
  mode.update(C.strip.windup + C.strip.rush + C.strip.impact + 0.3, none);
  assert.notEqual(action.rotation, 0); assert.equal(action.airborne, true);
  b.gimmick = mode; b.beginRetry();
  assert.equal(plan.member.action, null); assert.equal(action.rotation, 0); assert.equal(action.hidden, false); assert.equal(action.airborne, false);
  assert.equal(mode.update(5, none), true); assert.equal(b.support.phase, 'costume');
});
