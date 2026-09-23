import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CASTLE_LOBBY as C, CastleLobbyScene, prepareCastleLobby, finishCastleLobby } from '../../src/scenes/castle-lobby.js';
import { castle_lobby_intro, castle_lobby_left_block, castle_lobby_enter, castle_lobby_right_enter } from '../../src/data/cutscenes/castle_lobby.js';
import { SHIP_CASTLE } from '../../src/data/ship-castle.js';
import { CHAR_SCALE } from '../../src/world/world.js';
import { CHARACTERS } from '../../src/data/characters.js';

const lobby = JSON.parse(readFileSync(new URL('../../assets/maps/gajaeman_castle_lobby.json', import.meta.url), 'utf8'));

function setup() {
  const cues = [], handles = [], booms = [];
  const entities = lobby.entities.filter(def => def.type === 'npc' || def.type === 'prop')
    .map(def => ({ ...def, def, w: def.w ?? 24, h: def.h ?? 16, visible: true, flyX: 0, flyY: 0, spin: 0 }));
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
  const originY = scene.gajaemanOrigin[1];
  scene.setBeat('descend');
  assert.equal(scene.gajaeman.y, originY - C.entryHeight);
  game.darkSmoke = { aura: { actor: scene.gajaeman, at: C.gajaeman }, source: {} };
  scene.update(C.duration.descend / 2);
  assert.ok(scene.gajaeman.y > originY - C.entryHeight && scene.gajaeman.y < originY);
  assert.equal(game.darkSmoke.source.y, scene.gajaeman.y + scene.gajaeman.h + scene.gajaeman.flyY - 30);
  assert.equal(scene.done, false);
  scene.update(C.duration.descend / 2);
  assert.equal(scene.gajaeman.y, originY);
  assert.equal(scene.done, true);
});

test('test_castle_lobby_dodge_is_one_shot_and_does_not_damage_the_castle_or_party', () => {
  const { scene, cues, booms } = setup();
  const [originX, originY] = scene.gajaemanOrigin;
  scene.setBeat('dodge'); scene.update(0.1);
  assert.ok(scene.gajaeman.x < originX);
  assert.ok(scene.gajaeman.y < originY);
  assert.equal(booms.length, 0);
  assert.equal(scene.beams.length, 1);
  scene.update(C.duration.dodge);
  assert.equal(scene.gajaeman.x, originX + C.dodgeDistance);
  assert.ok(Math.abs(scene.gajaeman.y - originY) < 0.001);
  assert.equal(cues.filter(cue => cue === 'laser_zap').length, 1);
});

test('test_castle_lobby_gajaeman_matches_canonical_scale_and_hovers_apart_after_dodging', () => {
  const { scene, game } = setup();
  assert.equal(scene.gajaeman.def.visualScale, SHIP_CASTLE.sky.gajaemanCanonicalScale);
  assert.ok(scene.gajaeman.x >= 830);
  assert.ok(scene.gajaeman.y <= 420);
  scene.setBeat('dodge'); scene.update(C.duration.dodge); scene.setBeat('idle');
  const junhee = game.entities.find(entity => entity.id === 'castle_lobby_junhee');
  assert.ok(scene.gajaeman.x - junhee.x >= 150);
  const offsets = [];
  for (let tick = 0; tick < 80; tick++) { scene.update(0.05); offsets.push(scene.gajaeman.flyY); }
  assert.ok(Math.max(...offsets) - Math.min(...offsets) > 10);
  assert.ok(offsets.every(offset => Math.abs(offset) <= 6));
  scene.dispose();
  assert.equal(scene.gajaeman.flyY, 0);
});

test('test_castle_lobby_smoke_draws_behind_actors_while_existing_smoke_stays_in_front', () => {
  const smokeNode = castle_lobby_intro.flatMap(node => node.parallel || []).find(node => node.darkSmoke);
  assert.equal(smokeNode.darkSmoke.behindActors, true);
  const source = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
  const start = source.indexOf('    // y 정렬: 아래 있는 엔티티가 앞에 그려진다');
  const end = source.indexOf('    this.castleLobby?.draw(ctx, cam);', start);
  const draw = new Function('ctx', 'cam', 'drawChoimisFlowerEffects', 'drawChoimisSkyPollen', 'drawDarkSmoke', source.slice(start, end));
  for (const behindActors of [true, false, undefined]) {
    const order = [];
    const game = { darkSmoke: { behindActors }, entities: [{ y: 0, h: 1, draw() { order.push('actor'); } }] };
    draw.call(game, {}, {}, () => {}, () => {}, () => order.push('smoke'));
    assert.deepEqual(order, behindActors ? ['smoke', 'actor'] : ['actor', 'smoke']);
  }
});

test('test_castle_lobby_enlarged_dodge_fits_above_dialogue_and_restores_zoom_after_departure', () => {
  const { scene } = setup();
  const encounter = castle_lobby_intro.find(node => node.parallel?.some(child => child.zoom === 0.8));
  const zoom = encounter.parallel.find(node => node.zoom).zoom;
  const camera = encounter.parallel.find(node => node.camera).camera;
  const cam = { x: camera[0] * 32 + 16 - 240, y: camera[1] * 32 + 16 - 180 };
  const character = CHARACTERS.gajaeman_shadow;
  const png = readFileSync(new URL(`../../${character.sheet}`, import.meta.url));
  const width = png.readUInt32BE(16) / 4, height = png.readUInt32BE(20) / 4;
  const scale = CHAR_SCALE * scene.gajaeman.def.visualScale / 2;
  scene.setBeat('dodge');
  for (let tick = 0; tick <= 70; tick++) {
    scene.update(0.01);
    const actor = scene.gajaeman, angle = actor.spin;
    for (const x of [0, width]) for (const y of [0, height]) {
      const dx = (x - character.stillPivot[0]) * scale;
      const dy = actor.h / 2 + (y - character.stillPivot[1]) * scale;
      const sx = 240 + (actor.x + actor.w / 2 + dx * Math.cos(angle) - dy * Math.sin(angle) - cam.x - 240) * zoom;
      const sy = 180 + (actor.y + actor.h / 2 + dx * Math.sin(angle) + dy * Math.cos(angle) - C.hoverAmplitude - cam.y - 180) * zoom;
      assert.ok(sx >= 0 && sx <= 480 && sy >= 0 && sy <= 230, `sprite corner outside dialogue budget: ${sx},${sy}`);
    }
  }
  const depart = castle_lobby_intro.findIndex(node => node.castleLobbyBeat === 'depart');
  const restore = castle_lobby_intro.findIndex((node, index) => index > depart && node.parallel?.some(child => child.zoom === 1));
  assert.ok(restore > depart && restore < castle_lobby_intro.findIndex(node => node.text === '* 2런'));
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
