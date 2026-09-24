import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CASTLE_BOULDER as C, BOULDER_ACTORS as A, CastleBoulderScene,
  finishCastleBoulder, restoreCastleBoulder, separateBoulderParty } from '../../src/scenes/castle-boulder.js';
import { castle_boulder_intro, castle_boulder_left_block, castle_boulder_orb_enter } from '../../src/data/cutscenes/castle_boulder.js';
import { CHARACTER_MOTIONS } from '../../src/data/character-motions.js';

const mapDef = JSON.parse(readFileSync(new URL('../../assets/maps/gajaeman_castle_boulder.json', import.meta.url), 'utf8'));
function setup() {
  const cues = [], handles = [], booms = [];
  const entities = mapDef.entities.filter(def => def.type === 'npc').map(def => ({ ...def, def: { ...def }, w: 24, h: 16, visible: !def.hidden }));
  const player = { id: 'player', x: 356, y: 1416, w: 24, h: 16, visible: true, def: { type: 'player' } };
  entities.push(player, ...['gyeongsub', 'ppaman'].map((id, i) => ({ id, x: 356, y: 1436 + i * 32, w: 24, h: 16, visible: true, def: { type: 'follower' } })));
  const game = { mapId: C.map, map: { def: mapDef }, dialogue: { script: castle_boulder_intro }, flags: {}, entities, player,
    characterMotions: { junhee: { boulder_push: CHARACTER_MOTIONS.junhee.boulder_push } },
    sound: { sfx(key) { cues.push(key); const handle = { pause() { this.paused = true; } }; handles.push(handle); return handle; },
      stopBgm() { this.bgmName = null; } }, playBoom: data => booms.push(data), spawn(def) { entities.push({ ...def, def }); } };
  const scene = new CastleBoulderScene(game); game.castleBoulder = scene;
  return { game, scene, cues, handles, booms };
}

test('test_boulder316_reveal_rolls_left_and_roar_owns_one_pressure_wave', () => {
  const { scene, cues, game } = setup();
  scene.setBeat('reveal'); scene.update(0.01);
  const initial = scene.rockX;
  scene.update(2.3);
  assert.ok(initial > scene.rockX + 45);
  scene.setBeat('roar'); scene.setBeat('roar');
  assert.equal(cues.filter(key => key === 'baron_roar').length, 1);
  assert.equal(scene.waves.length, 1);
  assert.equal(game.shake.amp, 5);
});

test('test_boulder316_push_preserves_actor_contact_on_success_and_failure', () => {
  const { scene, game } = setup();
  scene.setBeat('push');
  const before = game.player.x;
  scene.stage(7); scene.update(0.1);
  assert.equal(game.player.x, before + 21);
  assert.equal(scene.rockX, C.rockCenter[0] + 21);
  assert.equal(scene.monsterX, C.monsterFeet[0] + 21);
  scene.stage(6); scene.update(0.1);
  assert.equal(game.player.x, before + 18);
  assert.equal(scene.rockX, C.rockCenter[0] + 18);
  assert.equal(game.flags.castle_boulder_done, undefined);
});

test('test_boulder316_launch_waits_for_contact_then_crashes_once', async () => {
  const { scene, cues, booms } = setup();
  scene.setBeat('push'); scene.stage(10); scene.update(0.1); scene.setBeat('launch');
  let settled = false; scene.wait().then(() => { settled = true; });
  scene.update(2.5);
  assert.equal(scene.crashed, false); assert.equal(booms.length, 0);
  assert.ok(scene.rockX > 2200 && scene.rockX < C.wallX);
  scene.update(1.65);
  assert.equal(scene.crashed, true); assert.equal(booms.length, 1);
  assert.equal(scene.rockX, 3344); assert.equal(settled, false);
  scene.update(1.5); await Promise.resolve();
  assert.equal(settled, true);
  scene.update(10);
  assert.equal(booms.length, 1);
  assert.equal(cues.filter(key => key === 'furnace_blast').length, 1);
});

test('test_boulder316_cancellation_clears_offsets_handles_and_wait_without_completion', async () => {
  const { scene, game, handles } = setup();
  scene.setBeat('roar');
  const waiting = scene.wait();
  scene.youngcle.flyX = 5; scene.junhee.spin = 0.3;
  game.map = { def: mapDef }; scene.update(0.1); await waiting;
  assert.equal(game.castleBoulder, null);
  assert.equal(scene.youngcle.flyX, 0); assert.equal(scene.junhee.spin, 0);
  assert.ok(handles.every(handle => handle.paused));
  assert.equal(game.flags.castle_boulder_done, undefined);
  finishCastleBoulder(game, true);
});

test('test_boulder316_completed_restore_keeps_eight_waiters_and_a_single_embedded_wall', () => {
  const { game } = setup();
  separateBoulderParty(game);
  assert.equal(game.entities.find(e => e.id === 'boulder_gyeongsub').y, 1436);
  game.flags.castle_boulder_done = true;
  restoreCastleBoulder(game); restoreCastleBoulder(game);
  assert.equal(game.entities.filter(e => e.id === 'castle_boulder_wall').length, 1);
  for (const id of [...Object.values(A), 'boulder_gyeongsub', 'boulder_ppaman']) {
    const actor = game.entities.find(e => e.id === id);
    assert.equal(actor.visible, true); assert.equal(actor.solid, true);
    assert.ok(actor.x >= 2694 && actor.x <= 3044);
    assert.ok(actor.y >= 580 && actor.y <= 720);
  }
});

test('test_boulder316_script_uses_the_requested_cues_and_only_commits_after_epilogue', () => {
  const lines = castle_boulder_intro.filter(node => node.text).map(node => node.text.slice(2));
  assert.equal(lines[0], '흠.. 영클형이 이쯤에서... 있었던거같은데');
  assert.ok(lines.indexOf('가재맨 모양의 누누와윌럼프가 있음') < lines.indexOf('형님들!'));
  assert.ok(lines.indexOf('밀어!!!!!!') < lines.indexOf('히야아ㅏ아아아아아아ㅏㅏ아아아압!'));
  assert.equal(lines.at(-1), '잘했음 ㅇㅇ');
  const commit = castle_boulder_intro.findIndex(node => node.stage === C.flag);
  assert.ok(commit > castle_boulder_intro.findIndex(node => node.text === '* 잘했음 ㅇㅇ'));
  assert.equal(castle_boulder_intro.filter(node => node.stage).length, 1);
  assert.ok(castle_boulder_intro.some(node => node.bgm === 'baron_intro'));
  assert.ok(castle_boulder_left_block.some(node => node.text === '* 빨리 갔다와.'));
  assert.ok(castle_boulder_orb_enter.some(node => node.map === 'gajaeman_castle_left_orb'));
});

test('test_boulder316_junhee_brace_uses_four_real_frames_then_releases_before_laugh', () => {
  const { scene } = setup();
  assert.equal(scene.junhee.motion.loop, true);
  assert.equal(scene.junhee.motion.frames.length, 4);
  assert.equal(scene.junhee.motion.src, 'assets/sprites/junhee-boulder-push316.png');
  assert.equal(scene.junhee.motion.scale, 0.5);
  assert.equal(scene.junhee.x, 1656);
  scene.setBeat('push'); assert.equal(scene.junhee.motion, scene.braceMotion);
  scene.setBeat('launch'); assert.equal(scene.junhee.motion, null);
  const laugh = { name: 'laugh' }; scene.junhee.motion = laugh;
  scene.dispose(); assert.equal(scene.junhee.motion, laugh);
  assert.ok(C.sounds.includes('great_shine') && C.sounds.includes('click') && C.sounds.includes('cancel'));
  assert.equal(C.sounds.includes('ember'), false);
});
