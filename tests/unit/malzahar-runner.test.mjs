import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunner, stepRunner, RUNNER } from '../../src/world/runner-core.js';
import { createMalzaharRunner } from '../../src/battle/modes/malzahar-runner.js';
import { MALZAHAR_RUNNER as C } from '../../src/data/malzahar-runner.js';

const DT = 1 / 120;
function fixture(state) {
  const sounds = [], hits = [], hurts = [];
  const enemy = { hp: 5, def: { damage: 15 } };
  const battle = { cfg: { runnerState: state }, game: { characterMotions: {}, sound: { walk() {} } }, soul: { invuln: 0 }, sfx: key => sounds.push(key),
    hitEnemy(target, member, damage, opts) { hits.push(opts.source); target.hp -= damage; return damage; }, hurtParty(damage) { hurts.push(damage); } };
  const mode = createMalzaharRunner(battle, { enemy });
  return { mode, battle, enemy, sounds, hits, hurts };
}
function step(mode, seconds, decide = () => ({})) {
  for (let t = 0; t < seconds; t += DT) { const keys = decide(mode.snapshot); mode.update(DT, { just: key => !!keys[key] }); }
}
const counterInput = s => ({ confirm: s.phase === 'dash' && s.boss.x < s.player.x + 75 && !s.runner.attack });

test('test_malzahar_continuation_keeps_runner_jump_and_slash_physics', () => {
  const core = createRunner({ x: 900, endX: Infinity });
  for (let t = 0; t < 3; t += DT) stepRunner(core, DT);
  stepRunner(core, DT, { jump: true });
  const { mode } = fixture(core);
  assert.equal(mode.snapshot.runner.animT, core.animT);
  assert.equal(mode.snapshot.runner.airY, core.airY);
  stepRunner(core, DT, { attack: true });
  mode.update(DT, { just: key => key === 'confirm' });
  assert.equal(mode.snapshot.runner.airY, core.airY);
  assert.equal(mode.snapshot.runner.vy, core.vy);
  assert.equal(mode.snapshot.runner.attack.kind, 'airslash');
  assert.equal(mode.snapshot.runner.attack.t, core.attack.t);
  assert.equal(core.speed, RUNNER.speed);
});

test('test_malzahar_five_distinct_counters_win_in_65_to_100_seconds', () => {
  const f = fixture();
  step(f.mode, 100, counterInput);
  const s = f.mode.snapshot;
  assert.equal(s.counters, C.counters);
  assert.equal(f.hits.length, 5);
  assert.ok(s.elapsed >= 65 && s.elapsed <= 100, s.elapsed);
  assert.equal(s.phase, 'done');
  assert.equal(f.sounds.filter(x => x === C.sfx.dash).length, 5);
  assert.equal(f.sounds.filter(x => x === C.sfx.counter).length, 5);
});

test('test_malzahar_missed_dashes_never_advance_win_and_collisions_respect_invulnerability', () => {
  const f = fixture();
  const hurtTimes = [];
  f.battle.hurtParty = () => hurtTimes.push(f.mode.snapshot.elapsed);
  step(f.mode, 100);
  assert.equal(f.mode.snapshot.counters, 0);
  assert.equal(f.hits.length, 0);
  assert.notEqual(f.mode.snapshot.phase, 'done');
  assert.ok(hurtTimes.length > 5);
  for (let i = 1; i < hurtTimes.length; i++) assert.ok(hurtTimes[i] - hurtTimes[i - 1] >= C.invulnerability - DT);
  assert.ok(f.mode.snapshot.dashes >= 6);
});

test('test_malzahar_warning_precedes_reactable_continuous_dash_and_dispose_is_terminal', () => {
  const f = fixture(); let previous, launchedAt;
  step(f.mode, 20, s => {
    if (s.phase === 'dash' && launchedAt === undefined) launchedAt = s.elapsed;
    if (previous && s.phase === 'dash' && previous.phase === 'dash') assert.ok(Math.hypot(s.boss.x - previous.boss.x, s.boss.y - previous.boss.y) <= C.dash.speed * DT + 0.01);
    previous = s; return {};
  });
  assert.ok(launchedAt >= C.entrySeconds + C.dash.at + C.dash.warn);
  const snapshot = f.mode.snapshot, sounds = f.sounds.length;
  f.mode.dispose(); f.mode.dispose();
  assert.equal(f.mode.update(100, { just: () => true }), true);
  assert.equal(f.mode.snapshot.elapsed, snapshot.elapsed);
  assert.equal(f.sounds.length, sounds);
  assert.equal(f.mode.snapshot.disposed, true);
});

test('test_malzahar_low_orb_pair_is_jumpable_and_three_voidlings_are_slashable', () => {
  const f = fixture(); let jumped = false;
  step(f.mode, 15, s => {
    const orb = s.hazards.find(h => h.kind === 'q');
    const bug = s.hazards.find(h => h.kind === 'w');
    const cancel = !!orb && !jumped && orb.x < s.player.x + 100;
    if (cancel) jumped = true;
    return { cancel, confirm: !!bug && bug.x < s.player.x + 72 && !s.runner.attack };
  });
  assert.ok(jumped);
  assert.equal(f.hurts.length, 0);
  assert.equal(f.sounds.filter(s => s === C.sfx.deflect).length, 3);
  assert.equal(f.sounds.filter(s => s === C.sfx.q).length, 1);
  assert.equal(f.sounds.filter(s => s === C.sfx.w).length, 1);
});

test('test_malzahar_retry_recreates_counters_and_continuity_without_mutating_the_saved_state', () => {
  const core = createRunner({ x: 850, endX: 9000 });
  core.phase = 'run'; core.vx = core.speed; core.anim = 'run'; core.animT = 13.2;
  const before = structuredClone(core), f = fixture(core);
  step(f.mode, 23, counterInput);
  assert.equal(f.mode.snapshot.counters, 1);
  f.mode.dispose();
  const retry = fixture(core);
  assert.deepEqual(core, before);
  assert.equal(retry.mode.snapshot.counters, 0);
  assert.equal(retry.mode.snapshot.runner.animT, 13.2);
  assert.equal(retry.mode.snapshot.phase, 'enter');
});

test('test_malzahar_lethal_party_damage_disposes_immediately_without_later_audio_or_hits', () => {
  const f = fixture();
  f.battle.hurtParty = () => f.mode.dispose();
  step(f.mode, 30);
  assert.equal(f.mode.snapshot.disposed, true);
  assert.equal(f.hits.length, 0);
  assert.equal(f.sounds.filter(s => s === C.sfx.w).length, 0);
  assert.equal(f.mode.snapshot.hazards.length, 0);
  assert.equal(f.mode.snapshot.particles, 0);
});

test('test_malzahar_uncountered_dash_crosses_the_visible_runner_body_and_hits_once', () => {
  const f = fixture(), dashHits = [];
  f.battle.hurtParty = () => { const s = f.mode.snapshot; if (s.phase === 'dash') dashHits.push(s); };
  step(f.mode, 21);
  assert.equal(dashHits.length, 1);
  const hit = dashHits[0];
  assert.ok(Math.abs(hit.boss.x - hit.player.x) <= C.boss.radius + C.player.halfWidth);
  assert.ok(hit.boss.y + C.boss.radius > hit.player.groundY - C.player.height);
});

test('test_malzahar_two_visible_charging_orbs_launch_from_their_telegraphed_positions', () => {
  const f = fixture();
  step(f.mode, C.entrySeconds + C.q.at + C.q.warn / 2);
  const charge = f.mode.snapshot.chargingOrbs;
  assert.equal(charge.length, 2);
  assert.equal(f.mode.snapshot.hazards.length, 0);
  assert.equal(f.hurts.length, 0);
  assert.deepEqual(charge.map(orb => orb.x), [400, 452]);
  step(f.mode, C.q.warn / 2 + DT * 2);
  const launched = f.mode.snapshot.hazards;
  assert.equal(launched.length, 2);
  for (let i = 0; i < launched.length; i++) assert.ok(Math.abs(launched[i].x - charge[i].x) < C.q.speed * DT * 4);
  assert.ok((C.q.x - C.player.x) / C.q.speed > 1);
});

test('test_malzahar_dash_trail_tracks_real_motion_and_disposes_with_the_mode', () => {
  const f = fixture();
  step(f.mode, C.entrySeconds + C.dash.at + C.dash.warn + 0.4);
  const s = f.mode.snapshot;
  assert.equal(s.phase, 'dash');
  assert.ok(s.dashTrail.length > 3);
  assert.ok(s.dashTrail.every(point => point.x >= s.boss.x && point.y <= s.boss.y));
  f.mode.dispose();
  assert.equal(f.mode.snapshot.dashTrail.length, 0);
});

test('test_malzahar_hp_hud_reads_remaining_health_and_drains_with_a_delayed_damage_strip', () => {
  const f = fixture();
  assert.equal(f.mode.snapshot.hp, 5);
  assert.equal(f.mode.snapshot.hpMax, 5);
  assert.equal(f.mode.snapshot.hpDisplay, 5);
  while (f.mode.snapshot.counters < 1 && f.mode.snapshot.elapsed < 25) step(f.mode, DT, counterInput);
  assert.equal(f.mode.snapshot.hp, 4);
  step(f.mode, C.hpHud.drainSeconds / 2);
  assert.ok(f.mode.snapshot.hpDisplay > 4 && f.mode.snapshot.hpDisplay < 5);
  assert.equal(f.mode.snapshot.hpTrail, 5);
  step(f.mode, C.hpHud.trailHold + 1);
  assert.equal(f.mode.snapshot.hpDisplay, 4);
  assert.equal(f.mode.snapshot.hpTrail, 4);
});

test('test_malzahar_fifth_counter_uses_runner_braking_then_settles_before_final_frame_handoff', () => {
  const f = fixture(), phases = new Set(); let lastSpeed, lastX, hitAt, stoppedAt;
  step(f.mode, 100, s => {
    if (s.counters === 5) {
      hitAt ??= s.elapsed;
      phases.add(s.phase); phases.add(s.runner.phase);
      if (lastSpeed !== undefined) assert.ok(s.runner.vx <= lastSpeed + 1e-9);
      if (lastX !== undefined) assert.ok(s.runner.x >= lastX);
      lastSpeed = s.runner.vx; lastX = s.runner.x;
      if (s.runner.vx === 0) stoppedAt ??= s.elapsed;
      return { cancel: true, confirm: true };
    }
    return counterInput(s);
  });
  assert.ok(phases.has('victory') && phases.has('stopping') && phases.has('brake') && phases.has('settle') && phases.has('done'));
  assert.ok(stoppedAt - hitAt > 1, 'deceleration is visible rather than an instant stop');
  assert.equal(f.mode.snapshot.runner.vx, 0);
  assert.equal(f.mode.snapshot.runner.grounded, true);
  assert.equal(f.mode.snapshot.runner.anim, 'prep');
  assert.equal(f.mode.snapshot.hp, 0);
  assert.equal(f.mode.preserveFinalFrame, true);
  assert.equal(f.sounds.filter(sound => sound === C.sfx.skid).length, 1);
  assert.equal(f.mode.snapshot.runner.x, f.mode.snapshot.runner.endX);
});
