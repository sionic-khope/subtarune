import test from 'node:test';
import assert from 'node:assert/strict';
import { createChoimisFinale } from '../../src/battle/modes/choimis-finale.js';

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
      sfx(name, options) { events.push(name); const handle = { volume: options.volume, paused: false, pause() { this.paused = true; }, removeAttribute() {}, load() {} }; handles.push(handle); return handle; },
    } },
  };
  return { battle, enemy, events, handles, mode: createChoimisFinale(battle, { enemy }) };
}
function finishTalk(f) { while (f.mode.snapshot.phase.endsWith('talk')) { f.battle.shown = f.battle.text.length; f.mode.update(0.2, input(true)); } }
function advance(f, seconds) { for (let left = seconds; left > 1e-8; left -= 0.05) f.mode.update(Math.min(left, 0.05), input(false)); }

test('test_finale_requires_full_assault_then_death_dialogue_and_automatic_finisher_before_death', () => {
  const f = fixture();
  finishTalk(f);
  assert.deepEqual(f.events.slice(0, 4), ['* 큭.. 형들 대단하시네요', '* 여기까지 온건 칭찬해드리겠습니다.', '* 그렇지만, 전 포기할 수 없어요.', '* 마지막 그녀를 위한 이 힘을 바칠거에요!!']);
  advance(f, 4.5);
  assert.equal(f.mode.snapshot.phase, 'assault');
  advance(f, 59.5);
  assert.equal(f.enemy.hp, 1);
  assert.equal(f.events.includes('stop-bgm'), false);
  advance(f, 2);
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
  const f = fixture(); finishTalk(f); advance(f, 66); finishTalk(f);
  assert.equal(f.mode.snapshot.phase, 'autocharge');
  f.mode.dispose(); f.mode.dispose(); advance(f, 100);
  assert.ok(f.handles.every(handle => handle.paused));
  assert.equal(f.enemy.hp, 1); assert.equal(f.enemy.dead, false);
  assert.notEqual(f.enemy.finaleComplete, true);
  assert.deepEqual(f.battle.soul, { x: 240, y: 156, invuln: 0 });
  assert.equal(f.mode.update(1, input(true)), false);
});

test('test_finale_lose_state_cannot_advance_to_finisher_or_win', () => {
  const f = fixture(); finishTalk(f); advance(f, 4.5);
  f.battle.state = 'lose'; advance(f, 100);
  assert.equal(f.enemy.hp, 1); assert.equal(f.enemy.dead, false);
  assert.equal(f.events.includes('yellowheart_shot_big'), false);
  assert.equal(f.mode.snapshot.disposed, true);
});

test('test_finale_automatic_charge_starts_empty_and_fires_once_only_after_four_seconds', () => {
  const f = fixture(); finishTalk(f); advance(f, 66); finishTalk(f);
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
