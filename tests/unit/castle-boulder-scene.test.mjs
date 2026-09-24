import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CASTLE_BOULDER as C, BOULDER_ACTORS as A, CastleBoulderScene,
  finishCastleBoulder, restoreCastleBoulder, separateBoulderParty } from '../../src/scenes/castle-boulder.js';
import { castle_boulder_intro, castle_boulder_left_block, castle_boulder_orb_enter, BOULDER_FINAL_SPURT } from '../../src/data/cutscenes/castle_boulder.js';
import { CHARACTER_MOTIONS } from '../../src/data/character-motions.js';
import { clearCastleBoulderPush } from '../../src/scenes/castle-boulder-push.js';

const mapDef = JSON.parse(readFileSync(new URL('../../assets/maps/gajaeman_castle_boulder.json', import.meta.url), 'utf8'));
function setup() {
  const cues = [], handles = [], booms = [];
  const entities = mapDef.entities.filter(def => def.type === 'npc').map(def => ({ ...def, def: { ...def }, w: 24, h: 16, visible: !def.hidden }));
  const player = { id: 'player', x: 356, y: 1416, w: 24, h: 16, visible: true, def: { type: 'player' } };
  entities.push(player, ...['gyeongsub', 'ppaman'].map((id, i) => ({ id, x: 356, y: 1436 + i * 32, w: 24, h: 16, visible: true, def: { type: 'follower' } })));
  const game = { mapId: C.map, map: { def: mapDef }, dialogue: { script: castle_boulder_intro }, flags: {}, entities, player,
    textbox: { show(node, ctx, done) { this.node = node; this.done = done; }, close() { this.node = null; }, update() {} },
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
  assert.equal(scene.rockX, 3304); assert.equal(settled, false);
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
  assert.ok(lines.indexOf('타이밍에 맞춰서 c를 눌러, 합 맞춰서 미는거야!') < lines.indexOf('히야아ㅏ아아아아아아ㅏㅏ아아아압!'));
  assert.equal(BOULDER_FINAL_SPURT.text, '* 거의다 온거같아 마지막 스퍼트다 밀어!!!!!');
  assert.equal(lines.at(-1), '잘했음 ㅇㅇ');
  const commit = castle_boulder_intro.findIndex(node => node.stage === C.flag);
  assert.ok(commit > castle_boulder_intro.findIndex(node => node.text === '* 잘했음 ㅇㅇ'));
  assert.equal(castle_boulder_intro.filter(node => node.stage).length, 1);
  assert.ok(castle_boulder_intro.some(node => node.bgm === 'baron_intro'));
  const launch = castle_boulder_intro.findIndex(node => node.boulderBeat === 'launch');
  const aftermath = castle_boulder_intro.findIndex(node => node.text === '* 맛이 어떠냐 쓰레기년');
  assert.ok(castle_boulder_intro.slice(launch, aftermath).some(node => node.bgm === null && node.fadeOut === 0.6));
  assert.ok(castle_boulder_left_block.some(node => node.text === '* 빨리 갔다와.'));
  assert.ok(castle_boulder_orb_enter.some(node => node.map === 'gajaeman_castle_left_orb'));
});

test('test_boulder316_junhee_brace_uses_four_real_frames_then_releases_before_laugh', () => {
  const { scene } = setup();
  assert.equal(scene.junhee.motion.loop, true);
  assert.equal(scene.junhee.motion.frames.length, 4);
  assert.equal(scene.junhee.motion.src, 'assets/sprites/junhee-boulder-push316.png');
  assert.equal(scene.junhee.motion.scale, 0.5);
  assert.equal(scene.junhee.x, 1600);
  scene.setBeat('push'); assert.equal(scene.junhee.motion, scene.braceMotion);
  scene.setBeat('launch'); assert.equal(scene.junhee.motion, null);
  const laugh = { name: 'laugh' }; scene.junhee.motion = laugh;
  scene.dispose(); assert.equal(scene.junhee.motion, laugh);
  assert.ok(C.sounds.includes('great_shine') && C.sounds.includes('click') && C.sounds.includes('cancel'));
  assert.equal(C.sounds.includes('ember'), false);
});

test('test_boulder317_giants_keep_native_proportions_and_nunu_is_offscreen_at_first_reveal', () => {
  assert.equal(C.radius * 2, 384);
  assert.equal(C.monsterScale, 1.3);
  const firstReveal = castle_boulder_intro.findIndex(node => node.boulderBeat === 'reveal');
  const shot = castle_boulder_intro[firstReveal + 1].parallel;
  const centerX = shot[0].camera[0] * 32 + 16;
  assert.equal(shot[1].zoom, 1);
  assert.ok(C.monsterFeet[0] + (35 - C.monsterPivot[0]) * C.monsterScale > centerX + 240);
  const wall = mapDef.entities.find(entity => entity.id === 'castle_boulder_wall');
  assert.equal(wall.ix + 144 * wall.scale, C.wallRockX);
  assert.equal(wall.iy + 176 * wall.scale, C.rockCenter[1]);
});

test('test_boulder317_visual_lasers_continue_during_push_without_repeated_audio', () => {
  const { scene, cues } = setup();
  scene.setBeat('push'); scene.update(0.7);
  assert.equal(scene.beams.length, 1);
  assert.equal(cues.includes('laser_zap'), false);
  assert.equal(C.sounds.includes('laser_zap'), true);
  assert.ok(scene.youngcle.y < scene.junhee.y - 80);
});

test('test_boulder319_focused_laser_has_sound_but_offscreen_and_minigame_shots_stay_silent', () => {
  const { scene, cues } = setup();
  scene.update(0.7);
  assert.equal(cues.includes('laser_zap'), false);
  scene.setBeat('focus'); scene.update(0.05);
  assert.equal(cues.filter(key => key === 'laser_zap').length, 1);
  scene.setBeat('holding'); scene.update(3);
  scene.setBeat('push'); scene.update(3);
  assert.equal(cues.filter(key => key === 'laser_zap').length, 1);
  assert.ok(scene.beams.length > 0);
});

test('test_boulder319_reveal_uses_tension_then_timing_uses_from_now_on', () => {
  const music = castle_boulder_intro.filter(node => node.bgm);
  assert.deepEqual(music.map(node => node.bgm), ['baron_intro', 'castle_battle']);
  const reveal = castle_boulder_intro.findIndex(node => node.boulderBeat === 'reveal');
  const firstTalk = castle_boulder_intro.findIndex(node => node.text === '* 어 ㅎ2');
  assert.ok(castle_boulder_intro.indexOf(music[0]) > reveal && castle_boulder_intro.indexOf(music[0]) < firstTalk);
  const instruction = castle_boulder_intro.findIndex(node => node.text === '* 타이밍에 맞춰서 c를 눌러, 합 맞춰서 미는거야!');
  assert.ok(castle_boulder_intro.indexOf(music[1]) > instruction);
  const { game } = setup(); game.sound.bgmName = 'castle_battle';
  finishCastleBoulder(game, true); assert.equal(game.sound.bgmName, null);
});

test('test_boulder319_spectators_wait_left_of_junhee_until_invited_to_push', () => {
  const { game, scene } = setup();
  const arrival = castle_boulder_intro.findIndex(node => node.fade === 'out');
  castle_boulder_intro[arrival + 1].action(game);
  for (const id of ['player', 'gyeongsub', 'ppaman', A.bidet, A.mario]) {
    const actor = id === 'player' ? game.player : game.entities.find(e => e.id === id);
    assert.ok(actor.x + actor.w <= scene.junhee.x - 90, `${id} must watch from behind, not stand beside Junhee`);
  }
  const invitation = castle_boulder_intro.findIndex(node => node.text === '* 다들 붙으시죠');
  assert.ok(invitation < castle_boulder_intro.findIndex(node => node.boulderBeat === 'push'));
});

test('test_boulder319_tenth_hit_pans_to_nunu_before_shove_and_returns_before_mash', async () => {
  const { game, scene } = setup();
  game.map.pxW = 3584; game.map.pxH = 1536;
  game.camera = { x: 1320, y: 440, locked: true };
  game.zoomTo = (zoom, focus, duration, done) => { game.zoom = zoom; done(); };
  scene.setBeat('push'); scene.stage(10); scene.update(0.1);
  const battle = castle_boulder_intro.findIndex(node => node.bgm === 'castle_battle');
  const minigame = castle_boulder_intro[battle + 1].action(game);
  const interlude = game.castleBoulderPush.config.onTimingComplete();
  assert.equal(scene.beat, 'surge_pan');
  scene.update(0.7);
  assert.ok(game.camera.x > 1320 && game.camera.x < 1860);
  assert.equal(scene.rockX, 1840);
  scene.update(0.7); await Promise.resolve();
  assert.equal(scene.beat, 'surge'); assert.equal(game.camera.x, 1860);
  scene.update(2.2); await Promise.resolve();
  assert.equal(scene.beat, 'surge_hold'); assert.equal(scene.rockX, 1940);
  assert.equal(game.textbox.node.text, BOULDER_FINAL_SPURT.text);
  game.textbox.done(); await Promise.resolve();
  assert.equal(scene.beat, 'surge_return');
  scene.update(1.4); await interlude;
  assert.equal(scene.beat, 'mash'); assert.equal(game.camera.x, 1320);
  clearCastleBoulderPush(game); await minigame;
});

test('test_boulder319_cancelling_right_pan_cannot_move_camera_or_restart_mash', async () => {
  const { game, scene } = setup();
  game.map.pxW = 3584; game.map.pxH = 1536;
  game.camera = { x: 1320, y: 440, locked: true };
  game.zoomTo = (zoom, focus, duration, done) => done();
  scene.setBeat('push'); scene.stage(10);
  const battle = castle_boulder_intro.findIndex(node => node.bgm === 'castle_battle');
  const minigame = castle_boulder_intro[battle + 1].action(game);
  const interlude = game.castleBoulderPush.config.onTimingComplete();
  scene.update(0.4);
  finishCastleBoulder(game, true); clearCastleBoulderPush(game);
  const x = game.camera.x;
  await interlude; await minigame; scene.update(5);
  assert.equal(scene.pan, null); assert.equal(game.camera.x, x);
  assert.equal(scene.beat, 'surge_pan'); assert.equal(game.castleBoulderPush, null);
  assert.equal(game.flags.castle_boulder_done, undefined);
});

test('test_boulder317_timing_completion_shoves_everyone_then_roars_and_cleans_owned_dialogue', async () => {
  const { scene, game, cues } = setup();
  scene.setBeat('push'); const before = scene.pushers.map(actor => actor.x);
  scene.stage(10); scene.setBeat('surge');
  const wait = scene.wait(); scene.update(2.2); await wait;
  scene.pushers.forEach((actor, i) => assert.equal(actor.x, before[i] + 130));
  assert.equal(scene.rockX, C.rockCenter[0] + 130);
  assert.equal(scene.monsterX, C.monsterFeet[0] + 130);
  assert.equal(cues.filter(key => key === 'rumble').length, 1);
  assert.equal(cues.filter(key => key === 'baron_roar').length, 1);
  scene.setBeat('surge_hold');
  const speech = scene.say(BOULDER_FINAL_SPURT);
  assert.equal(game.textbox.node.text, BOULDER_FINAL_SPURT.text);
  scene.dispose(); await speech;
  assert.equal(game.textbox.node, null);
  assert.equal(game.flags.castle_boulder_done, undefined);
});
