import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { QA_POINTS } from '../../src/core/story.js';
import { MAP_RUNTIME_ASSETS } from '../../src/data/map-runtime-assets.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { CHOIMIS_SKY, choimis_sky } from '../../src/data/cutscenes/choimis_sky.js';
import { CHOIMIS_SKY_SCALE, ascendChoimisSky, clearChoimisSky, gatherChoimisSkyPollen, riseChoimisFromBelow } from '../../src/scenes/choimis-sky-intro.js';

test('test_choimis_sky_supplied_dialogue_enters_seamless_battle_after_ascent', () => {
  assert.equal(SCRIPTS.choimis_sky, choimis_sky);
  assert.deepEqual(choimis_sky.filter(node => node.text).map(node => [node.speaker, node.text.slice(2), node.voice]), [
    ['최미스', '하이', 'choimis_flower'],
    ['억빠맨', '빨리 내려와라 씨발색끼', 'ppaman'],
    ['최미스', '어휴 하여간 다들 날 싫어하는이유가뭐야?', 'choimis_flower'],
    ['최미스', '어쨋든 곧 나는 점례에게 돌아갈거야', 'choimis_flower'],
    ['최미스', '너희들의 동기가 어떻게 됐든 난 상관없어', 'choimis_flower'],
    ['최미스', '나를 막을 순 없을것이다.', 'choimis_flower'],
    ['최미스', '순수한 나의 사랑을', 'choimis_flower'],
    ['최미스', '그리고. 이젠 달라진 나의 모습을.', 'choimis_flower'],
  ]);
  const rise = choimis_sky.findIndex(node => node.action === riseChoimisFromBelow);
  const hello = choimis_sky.findIndex(node => node.text === '* 하이');
  const gather = choimis_sky.findIndex(node => node.action === gatherChoimisSkyPollen);
  const ascent = choimis_sky.findIndex(node => node.action === ascendChoimisSky);
  const battle = choimis_sky.findIndex(node => node.battle);
  assert.ok(rise < hello && choimis_sky[rise + 1].wait === 0.5);
  assert.ok(hello < gather && gather < ascent && ascent < battle);
  assert.deepEqual(choimis_sky[battle].battle, {
    enemies: ['choimis_flower'], bgm: 'choimis_battle', bg: 'choimis_sky',
    flag: 'choimis_flower_won', seamlessIntro: 'choimis_sky',
  });
  assert.equal(choimis_sky.some(node => node.sfx === 'battle_start' || node.vortex), false);
  assert.equal(choimis_sky.findIndex(node => node.fade === 'out'), battle + 1);
});

test('test_night_cliff_retryable_trigger_preloads_raised_hand_contract', () => {
  const map = JSON.parse(fs.readFileSync('assets/maps/jjajang_night_cliff.json', 'utf8'));
  const trigger = map.entities.find(entity => entity.id === 'choimis_sky_trigger');
  const boss = map.entities.find(entity => entity.id === CHOIMIS_SKY.boss);
  assert.deepEqual([trigger.x, trigger.y, trigger.w, trigger.h], [560, 176, 96, 64]);
  assert.equal(trigger.script, 'choimis_sky');
  assert.equal(trigger.requires, 'choimis_flower_done');
  assert.equal(trigger.unless, CHOIMIS_SKY.winFlag);
  assert.equal(trigger.once, undefined);
  assert.equal(trigger.flag, undefined);
  assert.equal(boss.hidden, true);
  assert.equal(boss.sprite, 'choimis_flower');
  assert.ok(MAP_RUNTIME_ASSETS.jjajang_night_cliff.images.includes('assets/enemies/choimis-flower-raise.png'));
  const qa = QA_POINTS.find(point => point.id === 'choimis_sky_after');
  assert.equal(qa.flags.choimis_flower_won, true);
  assert.deepEqual(qa.party, ['gyeongsub', 'ppaman']);
});

test('test_choimis_sky_boss_rises_with_afterimages_before_stabilizing', async () => {
  const boss = { id: 'choimis_sky_boss', x: 632, y: 199, w: 24, h: 16, visible: false, dead: false, def: {}, draw() {} };
  const game = {
    entities: [boss], background: [], camera: { target: null, locked: true }, choimisSky: {}, choimisFlower: null,
  };
  let finished = false;
  const rising = riseChoimisFromBelow(game).then(() => { finished = true; });
  assert.equal(boss.visible, true);
  assert.equal(boss.hopY, -230);
  assert.equal(game.background.length, 1);
  assert.equal(game.background[0].update(0.08), false);
  assert.ok(boss.hopY < -200);
  assert.ok(game.choimisFlower.ghosts.length > 0);
  assert.equal(finished, false);
  assert.equal(game.background[0].update(3), true);
  await rising;
  assert.equal(boss.hopY, 0);
  assert.deepEqual(game.choimisFlower.ghosts, []);
});

test('test_choimis_sky_abort_cancels_rise_without_touching_a_fresh_scene', async () => {
  const boss = { id: 'choimis_sky_boss', x: 632, y: 199, w: 24, h: 16, visible: false, dead: false, def: {}, draw() {} };
  const player = { id: 'player', x: 0, y: 0, w: 24, h: 16 };
  const game = {
    player, entities: [boss], background: [], camera: { target: null, locked: true }, zoom: {},
    choimisSky: {}, choimisFlower: null,
  };
  const rising = riseChoimisFromBelow(game);
  const staleWaiter = game.background[0];
  let resolved = false; rising.then(() => { resolved = true; });
  clearChoimisSky(game);
  const fresh = { fresh: true }; game.choimisSky = fresh;
  await rising;
  assert.equal(resolved, true);
  assert.deepEqual(game.background, []);
  assert.equal(staleWaiter.update(3), true);
  assert.equal(game.choimisSky, fresh);
  assert.equal(fresh.boss, undefined);
});

test('test_choimis_sky_abort_cancels_gather_without_advancing_a_fresh_scene', async () => {
  const player = { id: 'player', x: 0, y: 0, w: 24, h: 16, motion: null };
  const game = {
    player, entities: [], background: [], camera: { target: player, locked: true }, zoom: {}, choimisSky: {},
  };
  const gathering = gatherChoimisSkyPollen(game);
  const staleWaiter = game.background[0];
  let resolved = false; gathering.then(() => { resolved = true; });
  clearChoimisSky(game);
  const fresh = { fresh: true }; game.choimisSky = fresh;
  await gathering;
  assert.equal(resolved, true);
  assert.deepEqual(game.background, []);
  assert.equal(staleWaiter.update(3), true);
  assert.equal(game.choimisSky, fresh);
  assert.equal(fresh.phase, undefined);
});

test('test_choimis_sky_abort_cancels_ascent_without_advancing_a_fresh_scene', async () => {
  const actor = id => ({ id, x: 560, y: 199, w: 24, h: 16, dead: false, hopY: 0, motion: null });
  const player = actor('player'), gyeongsub = actor('gyeongsub'), ppaman = actor('ppaman');
  const boss = { ...actor('choimis_sky_boss'), motion: { scale: CHOIMIS_SKY_SCALE.raisedHand } };
  const motion = id => ({ scale: CHOIMIS_SKY_SCALE.battleReady[id], frames: [{ duration: 1 }] });
  const game = {
    player, playerSprite: 'hyungsub', entities: [gyeongsub, ppaman, boss], background: [],
    camera: { x: 320, y: 0, target: boss, locked: false }, zoom: { s: 1, smax: 1 },
    choimisSky: { actors: [player, gyeongsub, ppaman, boss], motions: { hyungsub: motion('hyungsub'), gyeongsub: motion('gyeongsub'), ppaman: motion('ppaman') }, boss },
    sound: { sfx() {} },
  };
  const ascent = ascendChoimisSky(game);
  const staleWaiter = game.background[0];
  let resolved = false; ascent.then(() => { resolved = true; });
  clearChoimisSky(game);
  const fresh = { fresh: true }; game.choimisSky = fresh;
  await ascent;
  assert.equal(resolved, true);
  assert.deepEqual(game.background, []);
  assert.equal(staleWaiter.update(6), true);
  assert.equal(game.choimisSky, fresh);
  assert.equal(fresh.progress, undefined);
});

test('test_choimis_sky_ascent_moves_cliff_down_while_actors_remain_camera_relative', async () => {
  assert.ok(Math.abs(CHOIMIS_SKY_SCALE.battleReady.hyungsub * 349 - 101 / 2) < 0.0001);
  assert.ok(Math.abs(CHOIMIS_SKY_SCALE.battleReady.gyeongsub * 359 - 98 / 2) < 0.0001);
  assert.ok(Math.abs(CHOIMIS_SKY_SCALE.battleReady.ppaman * 305 - 99 / 2) < 0.0001);
  assert.ok(Math.abs(CHOIMIS_SKY_SCALE.raisedHand * 123 - 103 / 2) < 0.0001);
  const actor = id => ({ id, x: 560, y: 199, w: 24, h: 16, dead: false, hopY: 0, motion: null });
  const player = actor('player');
  const gyeongsub = actor('gyeongsub');
  const ppaman = actor('ppaman');
  const boss = { ...actor('choimis_sky_boss'), motion: { scale: CHOIMIS_SKY_SCALE.raisedHand } };
  const motion = id => ({ scale: CHOIMIS_SKY_SCALE.battleReady[id], frames: [{ duration: 1 }] });
  const game = {
    player, playerSprite: 'hyungsub', entities: [gyeongsub, ppaman, boss], background: [],
    camera: { x: 320, y: 0, locked: false }, zoom: { s: 1, smax: 1 },
    choimisSky: { motions: { hyungsub: motion('hyungsub'), gyeongsub: motion('gyeongsub'), ppaman: motion('ppaman') }, boss },
    sound: { sfx() {} },
  };
  const gathering = gatherChoimisSkyPollen(game);
  assert.equal(game.choimisSky.pollen.length, 224);
  assert.equal(game.choimisSky.loosePetals.length, 36);
  assert.ok(game.choimisSky.pollen.every(particle => particle.color.startsWith('#ff')));
  assert.ok(game.choimisSky.loosePetals.every(petal => petal.color.startsWith('#ff')));
  assert.equal(game.background[0].update(3), true);
  await gathering;
  const ascent = ascendChoimisSky(game);
  assert.equal(game.camera.locked, true);
  assert.equal(game.background[1].update(6), true);
  await ascent;
  assert.equal(game.camera.y, -470);
  assert.equal(player.hopY, 470);
  assert.equal(boss.hopY, 470);
  assert.equal(game.zoom.s, 0.84);
  const screenFoot = current => [
    240 + (current.x + current.w / 2 - game.camera.x + current.flyX - 240) * game.zoom.s,
    180 + (current.y + current.h - current.hopY - game.camera.y + current.flyY - 180) * game.zoom.s,
  ];
  assert.deepEqual(screenFoot(player).map(Math.round), [84, 104]);
  assert.deepEqual(screenFoot(gyeongsub).map(Math.round), [84, 164]);
  assert.deepEqual(screenFoot(ppaman).map(Math.round), [84, 224]);
  assert.deepEqual(screenFoot(boss).map(Math.round), [396, 176]);
  assert.ok(Math.abs(player.motion.scale * 1.43 * game.zoom.s - 0.165) < 0.0001);
  const playerBodyHeight = player.motion.scale * 1.43 * game.zoom.s * 349;
  const bossBodyHeight = boss.motion.scale * 1.43 * game.zoom.s * 131;
  assert.ok(Math.abs(bossBodyHeight - 123 * ENEMIES.choimis_flower.scale) < 0.0001);
  assert.ok(bossBodyHeight / playerBodyHeight >= 1.05 && bossBodyHeight / playerBodyHeight <= 1.12);
});
