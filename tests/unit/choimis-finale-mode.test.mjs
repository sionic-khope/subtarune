import test from 'node:test';
import assert from 'node:assert/strict';
import { createChoimisFinale } from '../../src/battle/modes/choimis-finale.js';
import { CHOIMIS_FINALE as C } from '../../src/data/choimis-finale.js';

const input = confirm => ({ just: key => confirm && key === 'confirm', down: () => false });
function fixture() {
  const events = [], handles = [];
  const enemy = { id: 'choimis_flower', hp: 1, dead: false, dying: 0, x: 396, y: 176,
    def: { scale: 0.506, scaleY: 1.2, damage: 15 }, actionImages: {}, projectiles: {} };
  const battle = {
    state: 'enemy-mode', t: 0, cfg: { bg: 'choimis_sky' }, members: [],
    board: { x: 20, y: 246, w: 440, h: 72, target: { w: 440, h: 72 }, get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }, setTarget(w, h, x, y) { this.target = { w, h, x, y }; } },
    soul: { x: 240, y: 156, invuln: 0 }, text: '', shown: 0, rnd: () => 0.5,
    setText(text) { this.text = text; this.shown = 0; },
    showLine(line) { this.setText(line.text); events.push(line.text); },
    get typed() { return this.shown >= this.text.length; },
    cancelPendingBgm() { events.push('cancel-bgm'); }, hurtParty() {},
    sfx(name) { events.push(name); },
    game: { time: 0, propImages: {}, sound: {
      stopBgm() { events.push('stop-bgm'); },
      sfx(name, options) { events.push(name); const handle = { name, options, volume: options.volume, paused: false, pause() { this.paused = true; }, removeAttribute() {}, load() {} }; handles.push(handle); return handle; },
    } },
  };
  return { battle, enemy, events, handles, mode: createChoimisFinale(battle, { enemy }) };
}
function finishTalk(f) { while (f.mode.snapshot.phase.endsWith('talk')) { f.battle.shown = f.battle.text.length; f.mode.update(0.2, input(true)); } }
function advance(f, seconds) { for (let left = seconds; left > 1e-8; left -= 0.05) f.mode.update(Math.min(left, 0.05), input(false)); }
function startAssault(f) {
  finishTalk(f);
  advance(f, 6.5);
  assert.equal(f.mode.snapshot.phase, 'gap-talk');
  finishTalk(f);
  assert.equal(f.mode.snapshot.phase, 'assault');
}
function startCharge(f) { startAssault(f); advance(f, 62); finishTalk(f); }

test('test_finale_requires_full_assault_then_death_dialogue_and_automatic_finisher_before_death', () => {
  const f = fixture();
  startAssault(f);
  assert.deepEqual(f.events.slice(0, 4), ['* 큭.. 형들 대단하시네요', '* 여기까지 온건 칭찬해드리겠습니다.', '* 그렇지만, 전 포기할 수 없어요.', '* 마지막 그녀를 위한 이 힘을 바칠거에요!!']);
  assert.equal(f.mode.snapshot.phase, 'assault');
  advance(f, 59.5);
  assert.equal(f.enemy.hp, 1);
  assert.equal(f.events.includes('stop-bgm'), false);
  advance(f, 2.5);
  assert.equal(f.mode.snapshot.phase, 'death-talk');
  assert.ok(f.events.indexOf('cancel-bgm') < f.events.indexOf('stop-bgm'));
  finishTalk(f);
  assert.ok(f.events.includes('* 아..'));
  assert.ok(f.events.includes('* 난... 이렇게....'));
  assert.ok(f.events.includes('* 점례...야....'));
  assert.equal(f.mode.snapshot.phase, 'autocharge');
  advance(f, 4.8);
  assert.equal(f.enemy.dead, false);
  assert.ok(f.events.includes('yellowheart_shot_big'));
  advance(f, 7);
  assert.equal(f.mode.snapshot.phase, 'done');
  assert.equal(f.enemy.hp, 0);
  assert.equal(f.enemy.dead, true);
  assert.equal(f.enemy.dying, 0);
  assert.equal(f.enemy.finaleComplete, true);
  assert.ok(f.mode.snapshot.boss.y > 420, 'normal Choimis must have visibly fallen below the screen');
});

test('test_finale_dispose_during_charge_stops_owned_audio_and_never_completes', () => {
  const f = fixture(); startCharge(f);
  assert.equal(f.mode.snapshot.phase, 'autocharge');
  f.mode.dispose(); f.mode.dispose(); advance(f, 100);
  assert.ok(f.handles.every(handle => handle.paused));
  assert.equal(f.enemy.hp, 1); assert.equal(f.enemy.dead, false);
  assert.notEqual(f.enemy.finaleComplete, true);
  assert.deepEqual(f.battle.soul, { x: 240, y: 156, invuln: 0 });
  assert.equal(f.mode.update(1, input(true)), false);
});

test('test_finale_lose_state_cannot_advance_to_finisher_or_win', () => {
  const f = fixture(); startAssault(f);
  f.battle.state = 'lose'; advance(f, 100);
  assert.equal(f.enemy.hp, 1); assert.equal(f.enemy.dead, false);
  assert.equal(f.events.includes('yellowheart_shot_big'), false);
  assert.equal(f.mode.snapshot.disposed, true);
});

test('test_finale_automatic_charge_starts_empty_and_fires_once_only_after_four_seconds', () => {
  const f = fixture(); startCharge(f);
  assert.equal(f.mode.snapshot.chargeProgress, 0);
  const charge = f.handles.at(-1);
  assert.equal(charge.loop, true); assert.equal(charge.volume, 0.18);
  for (const progress of [0.25, 0.5, 0.75]) {
    advance(f, 1);
    assert.ok(Math.abs(f.mode.snapshot.chargeProgress - progress) < 1e-8);
    assert.ok(Math.abs(charge.volume - (0.18 + 0.42 * progress)) < 1e-8);
    assert.equal(f.events.includes('yellowheart_shot_big'), false);
  }
  advance(f, 0.9);
  assert.equal(f.events.includes('yellowheart_shot_big'), false);
  advance(f, 0.1);
  assert.equal(f.mode.snapshot.phase, 'shot');
  assert.equal(charge.paused, true);
  advance(f, 10);
  assert.equal(f.events.filter(event => event === 'yellowheart_shot_big').length, 1);
});

test('test_finale_contact_sound_flash_and_local_slow_motion_stay_synchronized', () => {
  const f = fixture(); startCharge(f); advance(f, 4);
  f.mode.update(C.seconds.shot - 0.001, input(false));
  assert.equal(f.mode.snapshot.phase, 'shot');
  assert.equal(f.mode.snapshot.impactFlash, false);
  f.mode.update(0.001, input(false));
  assert.equal(f.mode.snapshot.phase, 'impact');
  assert.equal(f.mode.snapshot.impactFlash, true);
  assert.equal(f.events.filter(event => event === 'furnace_blast').length, 1);
  assert.equal(f.events.includes('energetic_powershot'), false);
  const impact = f.handles.at(-1);
  assert.ok(impact.options.rate < 1);
  assert.equal(impact.options.pitch, true);
  f.mode.update(0.2, input(false));
  assert.ok(f.mode.snapshot.impactTime < 0.06);
  assert.equal(f.mode.snapshot.impactFlash, false);
  assert.equal(f.battle.game.time, 0);
  f.mode.update(C.seconds.impact - 0.2, input(false));
  assert.equal(f.mode.snapshot.phase, 'beam-fade');
  assert.equal(f.mode.snapshot.beamReach, 1);
  assert.equal(f.mode.snapshot.beamWidth, 1);
  f.mode.update(C.seconds['beam-fade'] / 2, input(false));
  assert.equal(f.mode.snapshot.beamWidth, 0.25);
  f.mode.update(C.seconds['beam-fade'] / 2, input(false));
  assert.equal(f.mode.snapshot.phase, 'flash');
  assert.equal(f.mode.snapshot.finalWhite, 0);
  f.mode.update(C.seconds.flash / 2, input(false));
  assert.equal(f.mode.snapshot.finalWhite, 0.5);
  f.mode.update(C.seconds.flash / 2, input(false));
  assert.equal(f.mode.snapshot.phase, 'smoke');
  assert.equal(f.mode.snapshot.finalWhite, 1);
  f.mode.update(C.seconds.smoke, input(false));
  assert.equal(f.mode.snapshot.phase, 'revert');
  assert.equal(impact.paused, true);
});

test('test_finale_assault_exit_keeps_the_new_sprite_pivot_at_the_same_cell_center', () => {
  const f = fixture();
  f.enemy.def.pivot = [72, 152]; f.enemy.def.scale = 0.714; f.enemy.def.scaleY = 1;
  startAssault(f); advance(f, 60);
  const state = f.mode.snapshot;
  assert.equal(state.phase, 'bursts');
  assert.equal(state.boss.x - (72 - 80) * 0.714, state.assault.boss.x);
  assert.equal(state.boss.y - (152 - 80) * 0.714, state.assault.boss.y);
});

test('test_finale_white_transition_fully_reveals_before_gap_declaration_and_first_projectile', () => {
  const f = fixture(); finishTalk(f);
  assert.ok(f.events.includes('* 마지막 모두의 힘을 합쳐.'));
  advance(f, 4.45);
  assert.equal(f.mode.snapshot.phase, 'transform-white');
  assert.equal(f.mode.snapshot.assault, null);
  advance(f, 0.4);
  assert.ok(f.mode.snapshot.transitionWhite > 0.999);
  assert.equal(f.events.includes('* 마지막 피날래 GAP 모드!!!'), false);
  advance(f, 0.45);
  assert.equal(f.mode.snapshot.phase, 'reveal');
  assert.equal(f.mode.snapshot.assault.elapsed, 0);
  assert.equal(f.mode.snapshot.transitionWhite, 1);
  advance(f, 1.05);
  assert.equal(f.events.includes('* 마지막 피날래 GAP 모드!!!'), false);
  advance(f, 0.05);
  assert.equal(f.mode.snapshot.phase, 'gap-talk');
  assert.equal(f.mode.snapshot.transitionWhite, 0);
  assert.equal(f.battle.text, '* 마지막 피날래 GAP 모드!!!');
  advance(f, 10);
  assert.equal(f.mode.snapshot.assault.elapsed, 0);
  assert.equal(f.mode.snapshot.assault.spawned, 0);
  finishTalk(f);
  advance(f, 0.6);
  assert.equal(f.mode.snapshot.assault.spawned, 0);
  advance(f, 0.06);
  assert.ok(f.mode.snapshot.assault.spawned > 0);
  assert.equal(f.enemy.hp, 1);
});

test('test_finale_flowery_clip_finishes_before_transition_and_release_shoot_belongs_to_assault_climax', () => {
  const f = fixture();
  while (f.battle.text !== '* 마지막 모두의 힘을 합쳐.') {
    f.battle.shown = f.battle.text.length; f.mode.update(0.2, input(true));
  }
  const clip = f.handles.find(handle => handle.name === 'choimis_lend_power');
  assert.equal(C.intro.at(-1).voice, 'none');
  clip.ended = false; f.battle.shown = f.battle.text.length;
  f.mode.update(6, input(true));
  assert.equal(f.mode.snapshot.phase, 'intro-talk');
  clip.ended = true;
  f.mode.update(0.2, input(true));
  assert.equal(f.mode.snapshot.phase, 'raise');
  assert.equal(clip.paused, true);
  advance(f, 6.5); finishTalk(f);
  advance(f, 59.99);
  assert.equal(f.events.includes('deltarune_release_shoot'), false);
  advance(f, 0.01);
  assert.equal(f.mode.snapshot.phase, 'bursts');
  assert.equal(f.events.filter(event => event === 'deltarune_release_shoot').length, 1);
  assert.equal(f.events.includes('furnace_blast'), false);
  advance(f, 1.8); finishTalk(f); advance(f, 5);
  assert.equal(f.events.filter(event => event === 'deltarune_release_shoot').length, 1);
  assert.equal(f.events.filter(event => event === 'furnace_blast').length, 1);
});

test('test_finale_release_clip_delayed_start_finishes_before_death_dialogue', () => {
  const f = fixture(); startAssault(f); advance(f, 60);
  const release = f.handles.find(handle => handle.name === 'deltarune_release_shoot');
  Object.assign(release, { ended: false, currentTime: 1.759509, duration: 1.772018, error: null });
  advance(f, 1.8);
  assert.equal(f.mode.snapshot.phase, 'bursts', 'minimum animation time must not cut the still-playing audio tail');
  assert.equal(release.paused, false);
  assert.equal(f.events.includes('* 아..'), false);
  advance(f, 0.1);
  assert.equal(f.mode.snapshot.phase, 'bursts', 'phase time alone cannot stand in for actual audio completion');
  release.currentTime = release.duration; release.ended = true;
  f.mode.update(0.001, input(false));
  assert.equal(f.mode.snapshot.phase, 'death-talk');
  assert.equal(release.paused, true);
});

test('test_finale_release_clip_muted_failed_or_finished_does_not_hang_or_skip_minimum_burst_time', () => {
  for (const state of ['muted', 'error', 'rejected', 'ended']) {
    const f = fixture(); startAssault(f); advance(f, 60);
    const release = f.handles.find(handle => handle.name === 'deltarune_release_shoot');
    release.ended = state === 'ended'; release.paused = state === 'rejected';
    release.error = state === 'error' ? { code: 3 } : null;
    f.battle.game.sound.muted = state === 'muted';
    advance(f, 1.79);
    assert.equal(f.mode.snapshot.phase, 'bursts', `${state} preserves the minimum animation`);
    advance(f, 0.01);
    assert.equal(f.mode.snapshot.phase, 'death-talk', `${state} must not block progression`);
  }
});
