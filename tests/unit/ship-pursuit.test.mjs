import test from 'node:test';
import assert from 'node:assert/strict';
import { ShipPursuitAmbient } from '../../src/scenes/ship-pursuit-ambient.js';
import { ShipAssault } from '../../src/scenes/ship-assault.js';
import { SHIP_ASSAULT as C } from '../../src/data/ship-assault.js';
import { storyBgm, storyExitScript, QA_POINTS, stateFromFlags } from '../../src/core/story.js';
import { Door } from '../../src/world/world.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { Sound } from '../../src/core/audio.js';
import { TextBox, ScriptRunner } from '../../src/ui/dialogue.js';
import { maillard_captain_enter } from '../../src/data/cutscenes/captain_room.js';
import { shipPursuitBacktrack } from '../../src/data/scripts/ship-pursuit.js';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { captain_attack } from '../../src/data/cutscenes/captain_attack.js';

const mainSource = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const Game = runInNewContext(mainSource.slice(mainSource.indexOf('class Game {'), mainSource.indexOf('// ── 부트')) + '\nGame;');

function fixture() {
  const sounds = [];
  const game = { mapId: 'maillard_captain', flags: { captain_attack_done: true },
    state: 'field', propImages: {}, shake: null, sound: { sfx: id => sounds.push(id) },
    dialogue: { running: false } };
  return { game, sounds, ambient: new ShipPursuitAmbient(game) };
}
const tick = (ambient, seconds) => {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.05) ambient.update(0.05);
};

test('test_ship_pursuit_room_particles_continue_after_cinematic_handoff_without_timer_reset', () => {
  const { game, ambient, sounds } = fixture();
  const cinematic = new ShipAssault(game);
  cinematic.setBeat('return'); cinematic.impact(); cinematic.update(0.3);
  ambient.adopt(cinematic);
  const particle = cinematic.dust[0], y = particle.y;
  ambient.update(0.1);
  assert.equal(ambient.effect, cinematic);
  assert.ok(particle.y > y);
  assert.equal(cinematic.disposed, false);
  assert.ok(Math.abs(cinematic.impactClock - 0.4) < 0.001);
  game.dialogue.running = true;
  tick(ambient, C.room.period);
  assert.ok(sounds.length >= 2);
});

test('test_ship_pursuit_authored_attack_tail_hands_effect_over_after_completion_flag', () => {
  const { game, ambient } = fixture();
  game.flags = {};
  game.camera = {};
  game.player = { id: 'player' };
  game.entities = [game.player];
  game.shipPursuitAmbient = ambient;
  game.shipAssault = new ShipAssault(game);
  game.shipAssault.setBeat('return'); game.shipAssault.impact();
  const cinematic = game.shipAssault;
  game.setFlag = (id, value) => { game.flags[id] = value; };
  game.finishShipAssault = () => Game.prototype.finishShipAssault.call(game);
  game.textbox = new TextBox(game.sound, {});
  game.dialogue = new ScriptRunner(game.textbox, game);
  game.dialogue.start(captain_attack.slice(captain_attack.findLastIndex(node => node.text) + 1));
  for (let i = 0; i < 20 && game.dialogue.running; i++) {
    game.shipAssault?.update(0.05);
    ambient.update(0.05);
    game.dialogue.update(0.05, { just: () => false });
  }
  ambient.update(0.05);
  assert.equal(game.flags.captain_attack_done, true);
  assert.equal(game.shipAssault, null);
  assert.equal(ambient.effect, cinematic);
  assert.equal(cinematic.disposed, false);
  assert.ok(cinematic.dust.length > 0);
});

test('test_ship_pursuit_keeps_one_effect_and_bgm_through_every_map_transition', () => {
  const { game, ambient, sounds } = fixture();
  ambient.resume();
  const effect = ambient.effect;
  for (const map of Object.keys(C.pursuit)) {
    game.mapId = map; game.transitioning = true;
    ambient.resume(); tick(ambient, C.room.period + 0.1);
    assert.equal(ambient.effect, effect);
    assert.equal(storyBgm(map, game.flags), 'youngcle_assault');
  }
  assert.equal(sounds.length, 5);
});

test('test_ship_pursuit_cinematic_is_the_only_effect_owner_and_keeps_its_shake', () => {
  const { game, ambient, sounds } = fixture();
  tick(ambient, C.room.period + 0.05);
  const previous = ambient.effect;
  game.shipAssault = new ShipAssault(game);
  game.shipAssault.impact(true);
  const cinematicShake = game.shake, count = sounds.length;
  tick(ambient, C.room.period);
  assert.equal(ambient.effect, null);
  assert.equal(previous.disposed, true);
  assert.equal(game.shake, cinematicShake);
  assert.equal(sounds.length, count);
});

test('test_ship_pursuit_cleans_for_unrelated_map_battle_title_and_reset_then_restores', () => {
  for (const stop of [game => { game.mapId = 'maillard_lounge'; }, game => { game.battle = {}; },
    game => { game.state = 'title'; }, game => { game.flags = {}; }]) {
    const { game, ambient } = fixture();
    tick(ambient, C.room.period + 0.05);
    const previous = ambient.effect;
    stop(game); ambient.sync();
    assert.equal(ambient.effect, null);
    assert.equal(previous.disposed, true);
    assert.equal(previous.dust.length, 0);
    assert.equal(game.shake, null);
    Object.assign(game, { mapId: 'youngcle_bridge', state: 'field', battle: null,
      flags: { captain_attack_done: true } });
    ambient.resume();
    assert.ok(ambient.effect instanceof ShipAssault);
  }
});

test('test_ship_pursuit_title_fade_stays_silent_until_map_load_resume', () => {
  const { ambient, sounds } = fixture();
  tick(ambient, C.room.period + 0.05);
  ambient.stop();
  const count = sounds.length;
  tick(ambient, C.room.period * 2);
  assert.equal(ambient.effect, null);
  assert.equal(sounds.length, count);
  ambient.resume(); tick(ambient, C.room.period + 0.05);
  assert.equal(sounds.length, count + 1);
});

test('test_ship_pursuit_exits_only_allow_next_map_and_preserve_preattack_and_baron_rules', () => {
  for (const [map, next] of Object.entries(C.pursuit)) {
    if (next) assert.equal(storyExitScript(map, next, { captain_attack_done: true }), undefined);
    for (const destination of [...Object.keys(C.pursuit), 'maillard_lounge', 'obj0']) {
      if (destination === next) continue;
      assert.equal(storyExitScript(map, destination, { captain_attack_done: true }), 'ship_pursuit_backtrack');
      assert.equal(storyExitScript(map, destination, {}), undefined);
    }
  }
  assert.equal(storyExitScript('obj2', 'obj1', { obj4_abduction_done: true }), 'chase_route_block');
  assert.equal(storyExitScript('obj2', 'obj1', { obj4_abduction_done: true, obj5_maillard_done: true }), undefined);
});

test('test_ship_pursuit_backward_portal_warns_once_until_exit_and_cooldown', () => {
  let calls = 0, done;
  const game = { mapId: 'maillard_starboard', flags: { captain_attack_done: true },
    dialogue: { running: false }, has: () => false,
    player: { overlaps: () => true },
    runScript(script, cb) { assert.equal(script, 'ship_pursuit_backtrack'); calls++; done = cb; },
    changeMap() { assert.fail('backward transition'); } };
  const door = new Door({ type: 'door', x: 0, y: 0, to: 'maillard_saloon' }, game);
  door.update(0.05); done();
  for (let i = 0; i < 100; i++) door.update(0.05);
  assert.equal(calls, 1);
  game.player.overlaps = () => false; door.update(0.05);
  game.player.overlaps = () => true; door.update(0.05);
  assert.equal(calls, 2);
});

test('test_ship_pursuit_Q_checkpoints_inherit_upgrades_party_and_earned_money', () => {
  const previous = QA_POINTS.find(point => point.id === 'maillard_starboard');
  for (const id of ['maillard_boarding', 'youngcle_bridge']) {
    const point = QA_POINTS.find(point => point.id === id);
    assert.ok(point);
    assert.deepEqual(point.party, ['gyeongsub', 'ppaman']);
    assert.equal(point.flags.captain_attack_done, true);
    assert.equal(point.flags.maillard_starboard_open, true);
    assert.equal(point.flags.maillard_eunbyeol_seen, true);
    const index = JSON.parse(readFileSync(new URL('../../assets/maps/index.json', import.meta.url))).maps;
    const maps = Object.fromEntries(index.map(map => [map, JSON.parse(readFileSync(new URL(`../../assets/maps/${map}.json`, import.meta.url)))]));
    const options = { maps, enemyMoney: id => ENEMIES[id]?.money ?? 30 };
    const derived = stateFromFlags(point.flags, options);
    assert.equal(derived.attack, 3);
    assert.equal(derived.hpBonus, 40);
    assert.equal(derived.money, 1140);
    assert.deepEqual(derived, stateFromFlags(previous.flags, options));
    assert.equal(Boolean(point.flags.maillard_boarding_departed), id === 'youngcle_bridge');
  }
});

test('test_ship_pursuit_existing_audio_keeps_playback_position_between_maps', () => {
  const audio = { currentTime: 17.5 };
  const sound = { bgm: audio, bgmName: 'youngcle_assault', stopBgm() { assert.fail('BGM restarted'); } };
  for (const map of Object.keys(C.pursuit)) Sound.prototype.playBgm.call(sound, storyBgm(map, { captain_attack_done: true }));
  assert.equal(sound.bgm, audio);
  assert.equal(audio.currentTime, 17.5);
});

test('test_ship_pursuit_captain_sign_uses_same_warning_without_returning_to_captain', () => {
  const { game } = fixture();
  game.ctx = { measureText: text => ({ width: [...text].length * 16 }) };
  game.sound.blip = () => {};
  game.textbox = new TextBox(game.sound, {});
  game.dialogue = new ScriptRunner(game.textbox, game);
  game.changeMap = () => assert.fail('captain reentry');
  game.dialogue.start(maillard_captain_enter);
  const lines = new Set();
  for (let tick = 0; tick < 200 && game.dialogue.running; tick++) {
    game.dialogue.update(0.05, { just: key => key === 'confirm' && tick % 5 === 0 });
    if (game.textbox.isOpen) lines.add(game.textbox.node);
  }
  assert.equal(game.dialogue.running, false);
  assert.deepEqual([...lines], [shipPursuitBacktrack[0]]);
});
