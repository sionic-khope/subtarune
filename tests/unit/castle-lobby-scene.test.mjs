import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CASTLE_LOBBY as C, CastleLobbyScene, prepareCastleLobby, finishCastleLobby } from '../../src/scenes/castle-lobby.js';
import { castle_lobby_intro, castle_lobby_left_block, castle_lobby_enter, castle_lobby_right_enter } from '../../src/data/cutscenes/castle_lobby.js';

const lobby = JSON.parse(readFileSync(new URL('../../assets/maps/gajaeman_castle_lobby.json', import.meta.url), 'utf8'));

function setup() {
  const cues = [], handles = [], booms = [];
  const entities = lobby.entities.filter(def => def.type === 'npc' || def.type === 'prop')
    .map(def => ({ ...def, w: def.w ?? 24, h: def.h ?? 16, visible: true, flyX: 0, flyY: 0, spin: 0 }));
  const game = { mapId: lobby.id, dialogue: { script: castle_lobby_intro }, entities,
    sound: { preloadBgm() {}, loadSfxFiles: async () => {},
    sfx(name) { cues.push(name); const handle = { pause() { this.paused = true; } }; handles.push(handle); return handle; },
    stopBgm() { this.bgmName = null; },
  }, playBoom: boom => booms.push(boom) };
  game.castleLobby = new CastleLobbyScene(game);
  return { game, scene: game.castleLobby, cues, handles, booms };
}

test('test_castle_lobby_rotation_hits_three_walls_once_before_party_approaches', () => {
  const { scene, cues, booms } = setup();
  scene.setBeat('raid'); scene.update(0.4);
  assert.notEqual(scene.youngcle.flyX, 0);
  assert.equal(scene.shots, 1);
  assert.equal(scene.done, false);
  scene.update(4);
  assert.equal(scene.done, true);
  assert.equal(booms.length, 3);
  assert.equal(scene.scars.length, 3);
  scene.setBeat('raid'); scene.update(3);
  assert.equal(cues.filter(cue => cue === 'laser_zap').length, 3);
  scene.setBeat('idle');
  assert.equal(scene.youngcle.flyX, 0);
  assert.equal(scene.youngcle.spin, 0);
});

test('test_castle_lobby_descent_enters_from_above_and_smoke_tracks_actor_until_arrival', () => {
  const { scene, game } = setup();
  scene.setBeat('descend');
  assert.equal(scene.gajaeman.y, 464 - C.entryHeight);
  game.darkSmoke = { aura: { actor: scene.gajaeman, at: C.gajaeman }, source: {} };
  scene.update(C.duration.descend / 2);
  assert.ok(scene.gajaeman.y > 464 - C.entryHeight && scene.gajaeman.y < 464);
  assert.equal(game.darkSmoke.source.y, scene.gajaeman.y + scene.gajaeman.h - 30);
  assert.equal(scene.done, false);
  scene.update(C.duration.descend / 2);
  assert.equal(scene.gajaeman.y, 464);
  assert.equal(scene.done, true);
});

test('test_castle_lobby_dodge_is_one_shot_and_does_not_damage_the_castle_or_party', () => {
  const { scene, cues, booms } = setup();
  scene.setBeat('dodge'); scene.update(0.1);
  assert.ok(scene.gajaeman.x < 756);
  assert.ok(scene.gajaeman.y < 464);
  assert.equal(booms.length, 0);
  assert.equal(scene.beams.length, 1);
  scene.update(C.duration.dodge);
  assert.equal(scene.gajaeman.x, 756 + C.dodgeDistance);
  assert.ok(Math.abs(scene.gajaeman.y - 464) < 0.001);
  assert.equal(cues.filter(cue => cue === 'laser_zap').length, 1);
});

test('test_castle_lobby_departure_spins_upward_then_hides_before_following_dialogue', () => {
  const { scene } = setup();
  scene.setBeat('depart'); scene.update(C.duration.depart / 2);
  assert.ok(scene.gajaeman.y < 464);
  assert.ok(scene.gajaeman.spin > Math.PI);
  assert.equal(scene.gajaeman.visible, true);
  scene.update(C.duration.depart / 2);
  assert.equal(scene.gajaeman.visible, false);
  assert.equal(scene.done, true);
});

test('test_castle_lobby_map_and_script_cancellation_clear_owned_effects_without_completion', () => {
  for (const interruption of ['map', 'script']) {
    const { game, scene, handles } = setup();
    scene.setBeat('raid'); scene.update(0.5);
    game.sound.bgmName = C.bgm;
    game.darkSmoke = { aura: { at: C.gajaeman } };
    if (interruption === 'map') game.mapId = 'room';
    else game.dialogue.script = [];
    scene.update(0.05);
    assert.equal(game.castleLobby, null);
    assert.equal(game.darkSmoke, null);
    assert.equal(game.sound.bgmName, null);
    assert.equal(scene.youngcle.spin, 0);
    assert.equal(scene.beams.length, 0);
    assert.ok(handles.every(handle => handle.paused));
    assert.equal(game.flags, undefined);
    finishCastleLobby(game, true);
  }
});

test('test_castle_lobby_cancelled_preload_cannot_revive_scene', async () => {
  const { game } = setup();
  let release;
  game.sound.loadSfxFiles = () => new Promise(resolve => { release = resolve; });
  const preparing = prepareCastleLobby(game), scene = game.castleLobby;
  finishCastleLobby(game, true); release(); await preparing;
  assert.equal(scene.disposed, true);
  assert.equal(game.castleLobby, null);
});

test('test_castle_lobby_dialogue_preserves_requested_sequence_and_only_completes_at_end', () => {
  const lines = castle_lobby_intro.filter(node => node.text).map(node => node.text);
  for (const line of ['* 흠.', '* 다들 반갑..', '* 니애미', '* ... 용준이빼고', '* 2런', '* 가자.']) assert.ok(lines.includes(line));
  assert.equal(castle_lobby_intro.find(node => node.text === '* 다들 반갑..').cut, 999);
  const stage = castle_lobby_intro.findIndex(node => node.stage === 'castle_lobby_seen');
  assert.ok(stage > castle_lobby_intro.findIndex(node => node.text === '* 가자.'));
  assert.equal(castle_lobby_intro[0].if({ castle_lobby_seen: true }), true);
  assert.equal(castle_lobby_intro[0].if({}), false);
  assert.equal(castle_lobby_intro.filter(node => node.stage).length, 1);
});

test('test_castle_lobby_doors_chain_enter_and_left_guard_returns_to_safe_anchor', () => {
  assert.equal(castle_lobby_enter.find(node => node.map).enter, true);
  assert.equal(castle_lobby_enter.find(node => node.map).bgm, false);
  assert.equal(castle_lobby_right_enter.find(node => node.map).map, 'gajaeman_castle_right1');
  const rightMap = JSON.parse(readFileSync(new URL('../../assets/maps/gajaeman_castle_right1.json', import.meta.url), 'utf8'));
  assert.equal(castle_lobby_right_enter.find(node => node.bgm).bgm, rightMap.bgm);
  assert.ok(castle_lobby_right_enter.some(node => node.sfx === 'locker'));
  assert.ok(castle_lobby_left_block.some(node => node.text === '* 형 여기가 아니에요.'));
  assert.equal(castle_lobby_left_block.find(node => node.move === 'player').rel, 'lobby_left_block_return');
});

test('test_castle_lobby_gate_reveal_frames_the_actual_complete_sealed_door_before_dialogue', () => {
  const gate = lobby.entities.find(entity => entity.id === 'castle_lobby_sealed_door');
  const bytes = readFileSync(new URL(`../../${gate.image}`, import.meta.url));
  const width = bytes.readUInt32BE(16) * gate.scale, height = bytes.readUInt32BE(20) * gate.scale;
  const raid = castle_lobby_intro.findIndex(node => node.castleLobbyBeat === 'raid');
  const camera = castle_lobby_intro.slice(raid + 1).find(node => Array.isArray(node.camera)).camera;
  const x = camera[0] * 32 - 240 + 16, y = camera[1] * 32 - 180 + 16;
  assert.ok(gate.ix >= x && gate.ix + width <= x + 480);
  assert.ok(gate.iy >= y && gate.iy + height <= y + 360);
});
