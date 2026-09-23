import test from 'node:test';
import assert from 'node:assert/strict';
import { CHOIMIS_EATING_RACE as C, createChoimisEatingRace } from '../../src/battle/modes/choimis-eating-race.js';
import { getBattleMode } from '../../src/battle/modes.js';
import { ENEMIES } from '../../src/data/enemies.js';
import L from '../../src/data/locale/ko.js';

const input = down => ({ down: key => key === 'confirm' && down, just: () => true });
const idle = input(false), pressed = input(true);
function fixture(ready = Promise.resolve(true)) {
  const hits = [], hurts = [], sounds = [], syncs = [], drawn = [], bowl = { width: 26, height: 22 };
  const media = { ready, stops: 0, sync(state) { syncs.push(state); }, stop() { this.stops++; }, draw(ctx, bounds) { drawn.push(bounds); } };
  const enemy = { id: 'choimis_flower', name: '최미스', def: ENEMIES.choimis_flower, hp: 200, img: {}, projectiles: { jjajang: bowl } };
  const members = ['hyungsub', 'gyeongsub', 'ppaman'].map((id, index) => ({ id, name: ['형섭', '경섭', '빠맨'][index], frames: {} }));
  const battle = { members, game: { sound: { muted: false, blip() {} } }, drawTextBox() {},
    hitEnemy(target, by, amount, options) { hits.push({ target, by, amount, options }); },
    hurtAllParty(amount) { hurts.push(amount); }, sfx(name) { sounds.push(name); },
    drawMember(ctx, member) { drawn.push(member.id); }, drawEnemy(ctx, actor) { drawn.push(actor.id); } };
  return { battle, enemy, media, hits, hurts, sounds, syncs, drawn, bowl, mode: createChoimisEatingRace(battle, { enemy, media }) };
}
async function ready(f) {
  await Promise.resolve();
  while (['prelude', 'transition'].includes(f.mode.snapshot.phase)) f.mode.update(1 / 120, idle);
  assert.equal(f.mode.snapshot.phase, 'intro');
}
function advance(mode, seconds, controls = idle, step = 1 / 120) {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += step) mode.update(Math.min(step, seconds - elapsed), controls);
}
function tap(mode, rate = 6) {
  mode.update(0.5 / rate, pressed); mode.update(0.5 / rate, idle);
}

test('test_choimis_eating_registry_runs_as_fifth_regular_pattern_before_seup', () => {
  assert.equal(getBattleMode('enemy', 'choimis_eating_race'), createChoimisEatingRace);
  assert.deepEqual(ENEMIES.choimis_flower.patterns.filter(pattern => pattern.mode !== 'choimis_pink_round')[4], { type: 'choimis_eating_race', mode: 'choimis_eating_race', speak: '짜장면 먹방 대결해볼까? 들어와' });
  assert.equal(ENEMIES.choimis_flower.patterns[1].type, 'choimis_choso');
  assert.equal(C.introSeconds, 11); assert.equal(C.bitesPerBowl * C.bowls, 54); assert.equal(C.raceSeconds, 10.2);
  assert.equal(L.battle_choimis_eating_goal, '짜장면을 먹어라! (C 연타)');
  assert.equal(L.battle_choimis_eating_start, '시작!');
});

test('test_choimis_eating_waits_for_video_and_starts_at_eleven_without_intro_bites', async () => {
  let resolve;
  const f = fixture(new Promise(done => { resolve = done; }));
  advance(f.mode, 20, pressed);
  assert.equal(f.mode.snapshot.elapsed, 0); assert.equal(f.mode.snapshot.phase, 'loading');
  resolve(true); await ready(f);
  advance(f.mode, 10.99, pressed);
  assert.equal(f.mode.snapshot.phase, 'intro'); assert.equal(f.mode.snapshot.bites, 0);
  advance(f.mode, 0.01, pressed);
  assert.equal(f.mode.snapshot.phase, 'race'); assert.equal(f.mode.snapshot.started, true);
  assert.deepEqual(f.sounds, ['bell']);
  advance(f.mode, 1, pressed); assert.equal(f.mode.snapshot.bites, 0, 'holding C over START is not a bite');
  f.mode.update(0.01, idle); f.mode.update(0.01, pressed);
  assert.equal(f.mode.snapshot.bites, 1);
  advance(f.mode, 1, pressed); assert.equal(f.mode.snapshot.bites, 1, 'OS repeat cannot produce extra bites');
});

test('test_choimis_eating_types_invitation_before_slow_fade_and_never_runs_video_early', async () => {
  const f = fixture(); await Promise.resolve();
  assert.equal(f.mode.snapshot.phase, 'prelude'); assert.equal(f.mode.fullscreen, false);
  assert.equal(f.battle.bubble.text, '짜장면 먹방 대결해볼까? 들어와');
  const typing = f.battle.bubble.text.length * 0.03;
  advance(f.mode, typing + 0.8, pressed);
  assert.equal(f.mode.snapshot.phase, 'prelude');
  assert.equal(f.battle.bubble.shown, f.battle.bubble.text.length);
  while (f.mode.snapshot.phase === 'prelude') f.mode.update(1 / 120, idle);
  assert.equal(f.battle.bubble, null); assert.equal(f.mode.fullscreen, false);
  advance(f.mode, 0.4);
  assert.equal(f.mode.snapshot.phase, 'transition');
  const fills = [], ctx = { globalAlpha: 1, save() {}, restore() {}, fillRect() { fills.push(this.globalAlpha); } };
  f.mode.draw(ctx); assert.ok(Math.abs(fills[0] - 0.5) < 0.001);
  assert.equal(f.mode.snapshot.elapsed, 0); assert.equal(f.mode.snapshot.bites, 0);
  assert.ok(f.syncs.every(state => state.paused && state.time === 0));
  await ready(f);
  assert.equal(f.mode.fullscreen, true); assert.equal(f.mode.snapshot.elapsed, 0);
  f.mode.update(0.1, idle); assert.equal(f.syncs.at(-1).paused, false);
});

test('test_choimis_eating_six_distinct_presses_per_second_wins_and_hands_each_bowl_to_next_member', async () => {
  const f = fixture(); await ready(f); advance(f.mode, 11);
  for (let index = 0; index < 18; index++) tap(f.mode);
  assert.equal(f.mode.snapshot.activeMember, 'gyeongsub');
  assert.deepEqual(f.mode.snapshot.partyBowls.map(bowl => bowl.eaten), [1, 0, 0]);
  for (let index = 0; index < 18; index++) tap(f.mode);
  assert.equal(f.mode.snapshot.activeMember, 'ppaman');
  assert.deepEqual(f.mode.snapshot.partyBowls.map(bowl => bowl.eaten), [1, 1, 0]);
  for (let index = 0; index < 18; index++) tap(f.mode);
  assert.equal(f.mode.snapshot.winner, 'party');
  assert.ok(f.mode.snapshot.raceElapsed >= 8.8 && f.mode.snapshot.raceElapsed <= 9);
  assert.equal(f.mode.snapshot.phase, 'win-talk');
  assert.equal(f.battle.bubble.text, '앗 이런!');
  assert.equal(f.hits.length, 0, 'finishing the meal does not damage the boss before the bowl lands');
  while (f.mode.snapshot.phase === 'win-talk') f.mode.update(1 / 120, idle);
  assert.equal(f.mode.snapshot.phase, 'windup');
  f.mode.update(C.windupSeconds, idle);
  assert.equal(f.mode.snapshot.phase, 'throw');
  f.mode.update(C.throwSeconds - 0.01, idle); assert.equal(f.hits.length, 0);
  f.mode.update(0.01, idle);
  assert.equal(f.mode.snapshot.phase, 'impact');
  assert.equal(f.mode.snapshot.projectile.x, 411);
  assert.ok(Math.abs(f.mode.snapshot.projectile.y - 123) < 1e-9);
  assert.equal(f.mode.snapshot.projectile.progress, 1);
  assert.equal(f.hits.length, 1); assert.equal(f.hits[0].amount, 10);
  assert.equal(f.hits[0].target, f.enemy); assert.deepEqual(f.hits[0].options, { source: 'choimis-eating-race' });
  assert.equal(f.enemy.hp, 200, 'the mode delegates damage instead of mutating enemy HP');
  assert.deepEqual(f.hurts, []);
  assert.equal(f.mode.update(C.impactSeconds, pressed), false);
  assert.equal(f.mode.update(C.resultSeconds, pressed), true);
  f.mode.update(4, pressed); assert.equal(f.hits.length, 1);
});

test('test_eating_bowl_arc_uses_existing_art_and_throw_pose_then_recoils_at_head', async () => {
  const f = fixture(); await ready(f); advance(f.mode, 11);
  for (let i = 0; i < 54; i++) tap(f.mode);
  while (f.mode.snapshot.phase === 'win-talk') f.mode.update(1 / 120, idle);
  const actors = [], images = [];
  f.battle.drawMember = (_ctx, actor) => actors.push(actor);
  f.battle.drawEnemy = (_ctx, actor) => actors.push(actor);
  const ctx = { save() {}, restore() {}, fillRect() {}, strokeRect() {}, translate() {}, scale() {}, rotate() {},
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText() {},
    drawImage(...args) { images.push(args); }, measureText(label) { return { width: label.length * 8 }; } };
  f.mode.draw(ctx);
  assert.equal(actors.find(actor => actor.id === 'ppaman').pose, 0);
  assert.equal(actors.find(actor => actor.id === 'hyungsub').pose, null);
  assert.deepEqual(images.at(-1), [f.bowl, 0, 10, 26, 12, -13, -6, 26, 12]);
  const start = f.mode.snapshot.projectile;
  f.mode.update(C.windupSeconds, idle); f.mode.update(C.throwSeconds / 2, idle);
  const middle = f.mode.snapshot.projectile;
  assert.equal(middle.progress, 0.5); assert.ok(middle.x > start.x && middle.x < 411);
  assert.ok(middle.y < 123, 'the bowl arcs above the head before descending into contact');
  actors.length = 0; f.mode.draw(ctx);
  assert.equal(actors.find(actor => actor.id === 'ppaman').pose, 0.36);
  f.mode.update(C.throwSeconds / 2, idle); assert.equal(f.hits.length, 1);
  f.mode.update(C.impactSeconds / 2, idle); actors.length = 0; f.mode.draw(ctx);
  const recoil = actors.find(actor => actor.id === 'choimis_flower').patternPose;
  assert.equal(recoil.x, 420); assert.equal(recoil.y, 174);
  assert.deepEqual(f.sounds.slice(-2), ['wing', 'ralsei_splat']);
  f.mode.update(C.impactSeconds / 2, idle); actors.length = 0; f.mode.draw(ctx);
  assert.equal(actors.find(actor => actor.id === 'choimis_flower').patternPose.x, 411);
  assert.equal(f.mode.snapshot.projectile, null);
});

test('test_eating_victory_phase_skips_and_disposal_cannot_apply_early_or_duplicate_damage', async () => {
  for (const cancelPhase of ['win-talk', 'windup', 'throw']) {
    const f = fixture(); await ready(f); advance(f.mode, 11);
    for (let i = 0; i < 54; i++) tap(f.mode);
    while (f.mode.snapshot.phase !== cancelPhase) f.mode.update(100, idle);
    assert.equal(f.hits.length, 0);
    f.mode.dispose(); f.mode.update(100, pressed);
    assert.equal(f.hits.length, 0); assert.equal(f.battle.bubble, null);
  }
  const f = fixture(); await ready(f); advance(f.mode, 11);
  for (let i = 0; i < 54; i++) tap(f.mode);
  for (const expected of ['windup', 'throw', 'impact', 'result']) {
    assert.equal(f.mode.update(100, pressed), false);
    assert.equal(f.mode.snapshot.phase, expected, 'large dt keeps each visible beat instead of skipping the throw');
  }
  assert.equal(f.mode.update(100, pressed), true); f.mode.update(100, pressed);
  assert.equal(f.hits.length, 1); assert.deepEqual(f.hurts, []);
});

test('test_choimis_eating_five_presses_per_second_loses_and_charges_one_common_party_penalty', async () => {
  const f = fixture(); await ready(f); advance(f.mode, 11);
  for (let index = 0; index < 54; index++) tap(f.mode, 5);
  assert.equal(f.mode.snapshot.winner, 'choimis'); assert.ok(f.mode.snapshot.bites < 54);
  assert.equal(f.mode.snapshot.rivalBites, 54);
  assert.deepEqual(f.hurts, [15]); assert.deepEqual(f.hits, []);
  advance(f.mode, 5); assert.deepEqual(f.hurts, [15]);
});

test('test_choimis_eating_visibility_audio_pause_and_mute_preserve_the_race_clock', async () => {
  const f = fixture(); await ready(f); advance(f.mode, 11);
  const before = f.mode.snapshot.elapsed;
  f.battle.game.sound.ctx = { state: 'suspended' };
  f.mode.update(5, pressed);
  assert.equal(f.mode.snapshot.elapsed, before); assert.equal(f.syncs.at(-1).paused, true);
  f.battle.game.sound.ctx.state = 'running'; f.battle.game.sound.muted = true;
  f.mode.update(0.1, idle);
  assert.equal(f.syncs.at(-1).muted, true); assert.equal(f.syncs.at(-1).paused, false);
});

test('test_choimis_eating_dispose_during_load_or_race_prevents_late_damage_and_stops_media', async () => {
  let resolve;
  const loading = fixture(new Promise(done => { resolve = done; }));
  loading.mode.dispose(); loading.mode.dispose(); resolve(true); await Promise.resolve();
  assert.equal(loading.mode.snapshot.disposed, true); assert.equal(loading.mode.snapshot.phase, 'prelude');
  assert.equal(loading.battle.bubble, null);
  assert.equal(loading.media.stops, 1); assert.equal(loading.mode.update(40, pressed), true);
  const playing = fixture(); await ready(playing); advance(playing.mode, 11); tap(playing.mode);
  playing.mode.dispose(); advance(playing.mode, 30, pressed);
  assert.equal(playing.media.stops, 1); assert.deepEqual(playing.hits, []); assert.deepEqual(playing.hurts, []);
  const retry = fixture(); await ready(retry); assert.equal(retry.mode.snapshot.bites, 0);
});

test('test_choimis_eating_media_failure_exits_without_awarding_or_penalizing', async () => {
  const f = fixture(Promise.resolve(false)); await Promise.resolve();
  while (['prelude', 'transition'].includes(f.mode.snapshot.phase)) f.mode.update(1 / 120, idle);
  assert.equal(f.mode.snapshot.phase, 'error');
  assert.equal(f.mode.update(C.resultSeconds, idle), true);
  assert.deepEqual(f.hits, []); assert.deepEqual(f.hurts, []);
});

test('test_choimis_eating_frame_skip_stays_inside_source_duration_and_resolves_once', async () => {
  const f = fixture(); await ready(f);
  f.mode.update(40, pressed);
  assert.equal(f.mode.snapshot.elapsed, 21.2);
  assert.equal(f.mode.snapshot.winner, 'choimis');
  assert.ok(f.syncs.every(sync => sync.time <= 21.2));
  f.mode.update(40, pressed);
  assert.deepEqual(f.hurts, [15]); assert.deepEqual(f.hits, []);
});

test('test_choimis_eating_draw_uses_approved_actors_bowls_and_centered_video_with_visible_bites', async () => {
  const f = fixture(); await ready(f); advance(f.mode, 11);
  const images = [], labels = [];
  const ctx = { save() {}, restore() {}, fillRect() {}, strokeRect() {}, translate() {}, scale() {},
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    drawImage(...args) { images.push(args); }, measureText(label) { return { width: label.length * 8 }; },
    fillText(label) { labels.push(label); } };
  f.mode.draw(ctx);
  assert.ok(labels.includes('시작!')); assert.equal(labels.filter(label => label === '짜장면을 먹어라! (C 연타)').length, 1);
  assert.ok(labels.includes('요플래')); assert.ok(labels.includes('억빠맨'));
  assert.deepEqual(f.drawn.slice(0, 5), [C.video, 'hyungsub', 'gyeongsub', 'ppaman', 'choimis_flower']);
  assert.ok(images.every(args => args[0] === f.bowl));
  assert.equal(images[0][8], 10);
  for (let index = 0; index < 9; index++) tap(f.mode);
  images.length = 0; labels.length = 0; f.mode.draw(ctx);
  assert.ok(!labels.includes(L.battle_choimis_eating_goal), 'the single start cue clears while the food communicates progress');
  assert.ok(!labels.some(label => /피해|한 입|눌렀다|먹어라|9 \/ 54/.test(label)), 'no redundant instructions or numeric bite target');
  assert.equal(images[0][8], 5, 'half the bites visibly removes half of the food while retaining the bowl');
  assert.equal(images[1][8], 12, 'approved bowl base is preserved');
  assert.ok(images.some(args => args[1] === 9 && args[2] === 3 && args[3] === 8), 'each real bite moves a fragment of approved food toward the mouth');
  advance(f.mode, 0.02);
  assert.ok(f.mode.snapshot.rivalBites > 0);
});
