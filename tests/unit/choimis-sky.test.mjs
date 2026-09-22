import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { QA_POINTS } from '../../src/core/story.js';
import { MAP_RUNTIME_ASSETS } from '../../src/data/map-runtime-assets.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { CHOIMIS_SKY, choimis_sky } from '../../src/data/cutscenes/choimis_sky.js';
import { CHOIMIS_CAPE_REVEAL, CHOIMIS_SKY_ASCENT, CHOIMIS_SKY_SCALE, ascendChoimisSky, clearChoimisSky, drawChoimisSkyPollen, gatherChoimisSkyPollen, panChoimisSkyReveal, playChoimisSkyCue, readyChoimisSkyBattle, revealChoimisCape, riseChoimisFromBelow, startChoimisSkyGather, waitForChoimisSkyGather } from '../../src/scenes/choimis-sky-intro.js';
import { CHAR_SCALE, Character } from '../../src/world/world.js';

test('test_choimis_sky_supplied_dialogue_enters_seamless_battle_after_ascent', () => {
  assert.equal(SCRIPTS.choimis_sky, choimis_sky);
  assert.deepEqual(choimis_sky.filter(node => node.text).map(node => [node.speaker, node.text.slice(2), node.voice]), [
    ['최미스', '하이', 'choimis_flower'],
    ['억빠맨', '빨리 내려와라 씨발색끼', 'ppaman'],
    ['최미스', '어휴 하여간 다들 날 싫어하는이유가뭐야?', 'choimis_flower'],
    ['최미스', '어쨋든 곧 나는 점례에게 돌아갈거야', 'choimis_flower'],
    ['최미스', '너희들의 동기가 어떻게 됐든 난 상관없어', 'choimis_flower'],
    ['최미스', '나를 막을 순 없을것이다.', 'choimis_flower'],
    ['최미스', "형들이 무슨 대의를 위해 날 막는건진 모르겠지만. 난 '순애'다.", 'choimis_flower'],
    ['최미스', '순수한 나의 사랑을', 'choimis_flower'],
    ['최미스', '그리고. 이젠 달라진 나의 모습을.', 'choimis_flower'],
    ['최미스', '점례야.. 곧 해치우고 너에게 갈게', 'choimis_flower'],
    ['최미스', '내 힘을 받아라', 'none'],
  ]);
  const rise = choimis_sky.findIndex(node => node.action === riseChoimisFromBelow);
  const pan = choimis_sky.findIndex(node => node.action === panChoimisSkyReveal);
  const approach = choimis_sky.findIndex(node => node.parallel?.every(step => ['player', 'gyeongsub', 'ppaman'].includes(step.move)));
  const hello = choimis_sky.findIndex(node => node.text === '* 하이');
  const promise = choimis_sky.findIndex(node => node.text === '* 점례야.. 곧 해치우고 너에게 갈게');
  const closeIndex = choimis_sky.findIndex(node => node.action && node.action !== playChoimisSkyCue && node === choimis_sky[promise + 1]);
  const cue = choimis_sky.findIndex(node => node.action === playChoimisSkyCue);
  const gather = choimis_sky.findIndex(node => node.action === startChoimisSkyGather);
  const gatherLine = choimis_sky.findIndex(node => node.text === '* 내 힘을 받아라');
  const gatherWait = choimis_sky.findIndex(node => node.action === waitForChoimisSkyGather);
  const ascent = choimis_sky.findIndex(node => node.action === ascendChoimisSky);
  const cape = choimis_sky.findIndex(node => node.action === revealChoimisCape);
  const ready = choimis_sky.findIndex(node => node.action === readyChoimisSkyBattle);
  const battle = choimis_sky.findIndex(node => node.battle);
  assert.ok(approach >= 0 && approach < pan && pan < rise && rise < hello && choimis_sky[rise + 1].wait === 0.5);
  assert.ok(promise > hello && closeIndex === promise + 1 && cue === promise + 2);
  assert.deepEqual(choimis_sky[approach].parallel.map(step => [step.move, step.rel, step.at, step.by, step.speed]), [
    ['player', 'night_edge', 'left', [-20, 0], 70],
    ['gyeongsub', 'night_edge', 'left', [-84, 0], 70],
    ['ppaman', 'night_edge', 'left', [-148, 0], 70],
  ]);
  assert.ok(hello < gather && gather < gatherLine && gatherLine < gatherWait && gatherWait < ascent && ascent < cape && cape < ready && ready < battle);
  assert.deepEqual(choimis_sky[battle].battle, {
    enemies: ['choimis_flower'], bgm: 'choimis_battle', bg: 'choimis_sky',
    flag: 'choimis_flower_won', seamlessIntro: 'choimis_sky',
  });
  assert.equal(choimis_sky.some(node => node.sfx === 'battle_start' || node.vortex), false);
  assert.equal(choimis_sky.findIndex(node => node.fade === 'out'), battle + 1);
  assert.deepEqual(choimis_sky.find(node => 'bgm' in node), { bgm: 'wind', volume: 0.45 });
});

test('test_choimis_sky_reveal_pans_right_before_the_hidden_boss_rises', async () => {
  const boss = { id: 'choimis_sky_boss', x: 632, y: 199, w: 24, h: 16, visible: false, dead: false, def: {} };
  const player = { id: 'player', x: 560, y: 199, w: 24, h: 16 };
  const game = {
    player, entities: [boss], background: [], camera: { x: 224, y: 0, target: player, locked: false },
    zoom: {}, choimisSky: {}, choimisFlower: null,
  };
  const panning = panChoimisSkyReveal(game);
  assert.equal(game.camera.locked, true);
  assert.equal(boss.visible, false);
  assert.equal(boss.hopY, -230);
  assert.equal(boss.x, 722);
  assert.equal(game.background[0].update(1), false);
  assert.equal(game.camera.x, 256);
  assert.equal(boss.visible, false);
  assert.equal(game.background[0].update(1), true);
  await panning;
  assert.equal(game.camera.x, 288);
  assert.equal(704 - game.camera.x, 416);
  assert.equal(boss.x + boss.w / 2 - game.camera.x, 446);
  assert.ok(boss.x + boss.w / 2 >= 704 + 30);
  assert.deepEqual([600 - game.camera.x, 536 - game.camera.x, 472 - game.camera.x], [312, 248, 184]);
  assert.ok(600 + player.w <= 704 - 64);
  const framedX = game.camera.x;
  const rising = riseChoimisFromBelow(game);
  assert.equal(game.camera.x, framedX);
  assert.equal(boss.visible, true);
  assert.equal(game.background[1].update(3), true);
  await rising;
});

test('test_choimis_sky_reveal_pan_cancels_without_resetting_a_fresh_scene', async () => {
  const boss = { id: 'choimis_sky_boss', x: 632, y: 199, w: 24, h: 16, visible: false, dead: false, def: {} };
  const player = { id: 'player', x: 560, y: 199, w: 24, h: 16 };
  const game = {
    player, entities: [boss], background: [], camera: { x: 224, y: 0, target: player, locked: false },
    zoom: {}, choimisSky: {}, choimisFlower: null,
  };
  const panning = panChoimisSkyReveal(game);
  const stalePan = game.background[0];
  assert.equal(stalePan.update(0.5), false);
  clearChoimisSky(game);
  const fresh = { fresh: true }; game.choimisSky = fresh;
  await panning;
  assert.deepEqual(game.background, []);
  assert.equal(stalePan.update(2), true);
  assert.equal(game.choimisSky, fresh);
  assert.equal(fresh.revealComplete, undefined);
  assert.equal(game.camera.target, player);
  assert.equal(game.camera.locked, false);
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

test('test_choimis_sky_pollen_draws_above_the_cliff_floor_and_below_supported_actors', () => {
  const map = JSON.parse(fs.readFileSync('assets/maps/jjajang_night_cliff.json', 'utf8'));
  assert.equal(map.entities.find(entity => entity.id === 'night_cliff_floor').sortY, -100);

  const main = fs.readFileSync('src/main.js', 'utf8');
  const entityLayer = main.slice(main.indexOf('const sorted = [...this.entities]'), main.indexOf("this.runner?.drawAir"));
  assert.match(entityLayer, /this\.choimisSky\.actors\.includes\(e\)[\s\S]*drawChoimisSkyPollen\(ctx, this, cam\)[\s\S]*e\.draw\(ctx, cam\)/);
  const beforeEntityLayer = main.slice(main.indexOf('drawCoastWake('), main.indexOf('const sorted = [...this.entities]'));
  assert.equal(beforeEntityLayer.includes('drawChoimisSkyPollen'), false);
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
  assert.ok(boss.hopY >= 45 && boss.hopY <= 51);
  assert.equal(game.background.length, 2);
  const hoverStart = boss.hopY;
  assert.equal(game.background[1].update(0.6), false);
  assert.equal(boss.hopY, hoverStart);
  assert.equal(boss.hopY, 48);
  assert.equal(game.choimisSky.phase, undefined);
  game.choimisSky.raise = { scale: 1, frames: [{ duration: 1 }] };
  game.sound = { muted: true, sfx() {} };
  const beforeHandRaise = boss.hopY;
  await playChoimisSkyCue(game);
  assert.equal(boss.hopY, beforeHandRaise);
  assert.equal(game.choimisSky.phase, undefined);
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

test('test_choimis_sky_abort_removes_an_active_hover_without_touching_a_fresh_scene', async () => {
  const boss = { id: 'choimis_sky_boss', x: 632, y: 199, w: 24, h: 16, visible: false, dead: false, def: {}, draw() {} };
  const player = { id: 'player', x: 0, y: 0, w: 24, h: 16 };
  const game = {
    player, entities: [boss], background: [], camera: { target: null, locked: true }, zoom: {},
    choimisSky: {}, choimisFlower: null,
  };
  const rising = riseChoimisFromBelow(game);
  assert.equal(game.background[0].update(3), true);
  await rising;
  const staleHover = game.background[1];
  assert.equal(staleHover.update(0.4), false);
  clearChoimisSky(game);
  const fresh = { fresh: true }; game.choimisSky = fresh;
  assert.deepEqual(game.background, []);
  assert.equal(staleHover.update(0.6), true);
  assert.equal(game.choimisSky, fresh);
  assert.equal(fresh.hoverTime, undefined);
  assert.equal(boss.hopY, 0);
});

test('test_choimis_sky_abort_cancels_gather_without_advancing_a_fresh_scene', async () => {
  const player = { id: 'player', x: 0, y: 0, w: 24, h: 16, motion: null };
  const game = {
    player, entities: [], background: [], camera: { target: player, locked: true }, zoom: {}, choimisSky: {},
    sound: { muted: true, files: {}, sfx() {} },
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
  const boss = { ...actor('choimis_sky_boss'), hopY: 48, motion: { scale: CHOIMIS_SKY_SCALE.raisedHand } };
  const motion = id => ({ scale: CHOIMIS_SKY_SCALE.battleReady[id], frames: [{ duration: 1 }] });
  const ascentWind = { volume: -1, loop: false, pauses: 0, src: 'whoosh', pause() { this.pauses++; } };
  const game = {
    player, playerSprite: 'hyungsub', entities: [gyeongsub, ppaman, boss], background: [],
    camera: { x: 320, y: 0, target: boss, locked: false }, zoom: { s: 1, smax: 1 },
    choimisSky: { actors: [player, gyeongsub, ppaman, boss], motions: { hyungsub: motion('hyungsub'), gyeongsub: motion('gyeongsub'), ppaman: motion('ppaman') }, boss },
    sound: { sfx: name => name === 'whoosh' ? ascentWind : undefined },
  };
  const ascent = ascendChoimisSky(game);
  const staleWaiter = game.background[0];
  assert.equal(ascentWind.loop, true);
  assert.deepEqual([player.motion, gyeongsub.motion, ppaman.motion], [null, null, null]);
  assert.equal(staleWaiter.update(2.6), false);
  assert.deepEqual([player.motion, gyeongsub.motion, ppaman.motion], [null, null, null]);
  let resolved = false; ascent.then(() => { resolved = true; });
  clearChoimisSky(game);
  assert.equal(ascentWind.pauses, 1);
  assert.equal(ascentWind.src, '');
  const fresh = { fresh: true }; game.choimisSky = fresh;
  await ascent;
  assert.equal(resolved, true);
  assert.deepEqual(game.background, []);
  assert.equal(staleWaiter.update(6), true);
  assert.equal(game.choimisSky, fresh);
  assert.equal(fresh.progress, undefined);
  assert.deepEqual([player.motion, gyeongsub.motion, ppaman.motion], [null, null, null]);
});

test('test_choimis_gather_sexy_voice_yields_to_one_ascent_seup_and_clear_stops_it', async () => {
  const actor = id => ({ id, x: 560, y: 199, w: 24, h: 16, dead: false, hopY: 0, motion: null });
  const player = actor('player'), gyeongsub = actor('gyeongsub'), ppaman = actor('ppaman');
  const boss = { ...actor('choimis_sky_boss'), hopY: 48, motion: { scale: CHOIMIS_SKY_SCALE.raisedHand } };
  const clip = key => {
    const value = new EventTarget();
    value.key = key; value.plays = 0; value.pauses = 0;
    value.play = () => { value.plays++; return Promise.resolve(); };
    value.pause = () => { value.pauses++; };
    return value;
  };
  const sexy = clip('sexy'), seup = clip('seup');
  const sounds = [];
  const motion = id => ({ scale: CHOIMIS_SKY_SCALE.battleReady[id], frames: [{ duration: 1 }] });
  const game = {
    player, playerSprite: 'hyungsub', entities: [gyeongsub, ppaman, boss], background: [],
    camera: { x: 320, y: 0, target: boss, locked: false }, zoom: { s: 1, smax: 1 },
    choimisSky: {
      boss, actors: [player, gyeongsub, ppaman, boss], raise: { scale: 1, frames: [{ duration: 1 }] },
      motions: { hyungsub: motion('hyungsub'), gyeongsub: motion('gyeongsub'), ppaman: motion('ppaman') },
    },
    sound: {
      muted: false, files: {
        choimis_flower_sexy: { cloneNode: () => { sexy.phaseAtClone = game.choimisSky.phase; return sexy; } },
        choimis_flower_seup: { cloneNode: () => seup },
      },
      sfx: name => sounds.push(name),
    },
  };
  assert.equal(playChoimisSkyCue(game), undefined);
  assert.deepEqual(sounds, []);
  assert.deepEqual([sexy.plays, seup.plays], [0, 0]);
  const gathering = gatherChoimisSkyPollen(game);
  assert.equal(sexy.phaseAtClone, 'gather');
  assert.deepEqual(sounds, ['great_shine']);
  assert.deepEqual([sexy.plays, seup.plays], [1, 0]);
  assert.equal(game.background[0].update(3), true);
  await gathering;
  const ascent = ascendChoimisSky(game);
  assert.deepEqual([sexy.plays, sexy.pauses, seup.plays], [1, 1, 1]);
  assert.equal(game.choimisSky.clip, seup);
  assert.equal(game.background[1].update(6), true);
  await ascent;
  assert.equal(seup.plays, 1);
  assert.equal(game.choimisSky.clip, seup);
  const ownedState = game.choimisSky;
  clearChoimisSky(game);
  assert.equal(seup.pauses, 1);
  assert.equal(ownedState.clip, null);
  assert.equal(ownedState.finishClip, null);
  assert.equal(game.choimisSky, null);
});

test('test_choimis_sky_unfurls_cape_after_ascent_then_plays_weapon_ready', async () => {
  const frame = index => ({ image: { index }, pivot: [80, 152], duration: index < 4 ? 0.28 : CHOIMIS_CAPE_REVEAL.durations[index - 4] });
  const party = id => ({ id, x: 560, y: 199, w: 24, h: 16, hopY: 1080, flyX: 0, flyY: 0, dead: false, motion: { scale: CHOIMIS_SKY_SCALE.battleReady[id], frames: [{ duration: 1 }] } });
  const player = party('hyungsub'), gyeongsub = party('gyeongsub'), ppaman = party('ppaman');
  const boss = { id: 'choimis_sky_boss', x: 722, y: 199, w: 24, h: 16, hopY: 1128, dead: false, motion: { raised: true } };
  const sounds = [];
  const game = {
    player, playerSprite: 'hyungsub', entities: [gyeongsub, ppaman, boss], background: [], camera: { locked: true }, zoom: { s: 0.84 },
    choimisSky: {
      boss, actors: [player, gyeongsub, ppaman, boss], phase: 'rise', progress: 1, windTime: 5.2,
      cape: { frames: [0, 1, 2, 3].map(frame), revealFrames: CHOIMIS_CAPE_REVEAL.durations.map((duration, index) => ({ ...frame(index + 4), duration })) },
    },
    sound: { sfx: (name) => sounds.push(name) },
  };
  const partyFeet = [player, gyeongsub, ppaman].map(actor => [actor.x + actor.w / 2 + actor.flyX, actor.y + actor.h - actor.hopY + actor.flyY]);
  const revealing = revealChoimisCape(game);
  assert.equal(game.choimisSky.phase, 'cape');
  assert.equal(game.choimisSky.capeProgress, 0);
  assert.equal(boss.motion.index, 0);
  assert.equal(boss.motion.scaleY, 1.2);
  assert.equal(player.motion.scale, CHOIMIS_SKY_SCALE.battleReady.hyungsub);
  assert.equal(game.background[0].update(0.12), false);
  assert.deepEqual(sounds, []);
  assert.equal(game.background[0].update(0.12), false);
  assert.equal(boss.motion.index, 1);
  assert.deepEqual(sounds, ['wing']);
  assert.equal(game.background[0].update(1), true);
  await revealing;
  assert.equal(game.choimisSky.capeProgress, 1);
  assert.equal(boss.motion.loop, true);
  assert.equal(boss.motion.index, 0);
  assert.equal(boss.motion.frames.length, 4);
  assert.equal(boss.motion.scaleY, 1.2);
  assert.deepEqual([player, gyeongsub, ppaman].map(actor => [actor.x + actor.w / 2 + actor.flyX, actor.y + actor.h - actor.hopY + actor.flyY]), partyFeet);
  assert.ok([player, gyeongsub, ppaman].every((actor, index) =>
    Math.abs(actor.motion.scale * CHAR_SCALE * game.zoom.s - [0.25, 0.25, 0.25][index] * 0.66) < 0.0001));
  readyChoimisSkyBattle(game);
  assert.deepEqual(sounds, ['wing', 'weaponpull']);
});

test('test_choimis_cape_world_motion_stretches_only_y_above_the_same_foot', () => {
  const image = { width: 160, height: 160 };
  const actor = Object.assign(Object.create(Character.prototype), {
    id: 'choimis_sky_boss', x: 100, y: 200, w: 24, h: 16, facing: 'down', def: {}, game: { entities: [] },
  });
  const draws = [];
  const ctx = {
    fillStyle: '', save() {}, restore() {}, translate() {}, scale() {}, fillRect() {},
    drawImage: (...args) => draws.push(args),
  };
  actor.motion = { scale: 0.5, scaleY: 1.2, index: 0, frames: [{ image, pivot: [80, 152] }] };
  actor.drawSprite(ctx, { x: 0, y: 0 });
  const [, left, top, width, height] = draws.at(-1);
  const sx = 0.5 * CHAR_SCALE, sy = sx * 1.2;
  assert.equal(width, Math.round(160 * sx));
  assert.equal(height, Math.round(160 * sy));
  assert.equal(left + Math.round(80 * sx), actor.x + actor.w / 2);
  assert.equal(top + Math.round(152 * sy), actor.y + actor.h);

  draws.length = 0;
  actor.motion = { scale: 0.5, index: 0, frames: [{ image, pivot: [80, 152] }] };
  actor.drawSprite(ctx, { x: 0, y: 0 });
  const ordinary = draws.at(-1);
  assert.equal(ordinary[3], Math.round(160 * sx));
  assert.equal(ordinary[4], Math.round(160 * sx));
  assert.equal(ordinary[2] + Math.round(152 * sx), actor.y + actor.h);
});

test('test_choimis_sky_cape_abort_is_inert_and_removes_its_waiter', async () => {
  const frames = Array.from({ length: 4 }, (_, index) => ({ image: { index }, pivot: [80, 152], duration: 0.28 }));
  const boss = { id: 'choimis_sky_boss', x: 722, y: 199, w: 24, h: 16, hopY: 1128, dead: false, motion: { raised: true } };
  const player = { id: 'player', x: 0, y: 0, w: 24, h: 16 };
  const game = {
    player, entities: [boss], background: [], camera: { target: boss, locked: true }, zoom: { s: 0.84 },
    choimisSky: { boss, actors: [boss], windTime: 5.2, cape: { frames, revealFrames: CHOIMIS_CAPE_REVEAL.durations.map((duration, index) => ({ ...frames[index % 4], duration })) } },
    sound: { sfx() {} },
  };
  const revealing = revealChoimisCape(game);
  const staleWaiter = game.background[0];
  assert.equal(staleWaiter.update(0.3), false);
  clearChoimisSky(game);
  const fresh = { fresh: true }; game.choimisSky = fresh;
  await revealing;
  assert.deepEqual(game.background, []);
  assert.equal(staleWaiter.update(1), true);
  assert.equal(game.choimisSky, fresh);
  assert.equal(fresh.capeProgress, undefined);
  assert.equal(boss.motion, null);
});

test('test_choimis_sky_cape_reveal_keeps_foot_and_scale_for_point_nine_seconds_before_weapon_ready', async () => {
  const frames = Array.from({ length: 4 }, (_, index) => ({ image: { index }, pivot: [80, 152], duration: 0.28 }));
  const revealFrames = CHOIMIS_CAPE_REVEAL.durations.map((duration, index) => ({ ...frames[index % 4], duration }));
  const boss = { id: 'choimis_sky_boss', x: 722, y: 199, w: 24, h: 16, hopY: 1128, flyX: -8, flyY: 5, dead: false, motion: { raised: true } };
  const sounds = [];
  const game = {
    player: { id: 'player' }, entities: [boss], background: [], camera: { x: 288, y: -1080, locked: true }, zoom: { s: 0.84 },
    choimisSky: { boss, actors: [boss], phase: 'rise', progress: 1, windTime: 5.2, cape: { frames, revealFrames } },
    sound: { sfx: name => sounds.push(name) },
  };
  const foot = () => [boss.x + boss.w / 2 - game.camera.x + boss.flyX, boss.y + boss.h - boss.hopY - game.camera.y + boss.flyY];
  const beforeFoot = foot();
  const revealing = revealChoimisCape(game);
  assert.ok(Math.abs(CHOIMIS_CAPE_REVEAL.durations.reduce((sum, value) => sum + value, 0) - 0.9) < 1e-9);
  assert.deepEqual(foot(), beforeFoot);
  assert.equal(boss.motion.scale, ENEMIES.choimis_flower.scale / (1.43 * 0.84));
  assert.equal(boss.motion.scaleY, 1.2);
  assert.equal(game.background[0].update(0.21), false);
  assert.deepEqual(sounds, []);
  assert.equal(game.background[0].update(0.01), false);
  assert.deepEqual(sounds, ['wing']);
  assert.equal(game.background[0].update(0.4), false);
  assert.deepEqual(sounds, ['wing']);
  assert.equal(sounds.includes('weaponpull'), false);
  assert.equal(game.background[0].update(0.28), true);
  await revealing;
  assert.deepEqual(foot(), beforeFoot);
  assert.equal(boss.motion.scale, ENEMIES.choimis_flower.scale / (1.43 * 0.84));
  assert.equal(boss.motion.scaleY, 1.2);
  assert.equal(sounds.includes('weaponpull'), false);
  readyChoimisSkyBattle(game);
  assert.deepEqual(sounds, ['wing', 'weaponpull']);
});

test('test_choimis_sky_mid_cape_clear_prevents_stale_loop_restore_on_fresh_state', async () => {
  const frames = Array.from({ length: 4 }, (_, index) => ({ image: { index }, pivot: [80, 152], duration: 0.28 }));
  const revealFrames = CHOIMIS_CAPE_REVEAL.durations.map((duration, index) => ({ ...frames[index % 4], duration }));
  const boss = { id: 'choimis_sky_boss', x: 722, y: 199, w: 24, h: 16, hopY: 1128, dead: false, motion: { raised: true } };
  const player = { id: 'player', x: 0, y: 0, w: 24, h: 16 };
  const game = {
    player, entities: [boss], background: [], camera: { target: boss, locked: true }, zoom: { s: 0.84 },
    choimisSky: { boss, actors: [boss], windTime: 5.2, cape: { frames, revealFrames } },
    sound: { sfx() {} },
  };
  const revealing = revealChoimisCape(game);
  const staleWaiter = game.background[0];
  assert.equal(staleWaiter.update(0.3), false);
  clearChoimisSky(game);
  const freshMotion = { fresh: true };
  const fresh = { fresh: true, boss: { motion: freshMotion } };
  game.choimisSky = fresh;
  await revealing;
  assert.deepEqual(game.background, []);
  assert.equal(staleWaiter.update(1), true);
  assert.equal(game.choimisSky, fresh);
  assert.equal(fresh.boss.motion, freshMotion);
  assert.equal(fresh.capeProgress, undefined);
  assert.equal(boss.motion, null);
});

test('test_choimis_sky_loose_petals_fall_during_rise_and_cape', () => {
  const actor = { x: 0, y: 0, w: 24, h: 16, hopY: 0 };
  const state = {
    phase: 'rise', progress: 0, windTime: 0, actors: [actor], pollen: [],
    loosePetals: [{ x: 12, y: 10, speed: 20, phase: 0, size: 2, color: '#ff86b7' }],
  };
  const calls = [];
  const ctx = { globalAlpha: 1, fillStyle: '', save() {}, restore() {}, fillRect: (...args) => calls.push(args) };
  drawChoimisSkyPollen(ctx, { choimisSky: state }, { x: 0, y: 0 });
  const startY = calls[0][1];
  calls.length = 0;
  state.phase = 'cape'; state.progress = 0.25;
  drawChoimisSkyPollen(ctx, { choimisSky: state }, { x: 0, y: 0 });
  assert.ok(calls[0][1] >= startY + 90, `${startY} -> ${calls[0][1]}`);
});

test('test_choimis_sky_ascent_moves_cliff_down_while_actors_remain_camera_relative', async () => {
  assert.deepEqual(CHOIMIS_SKY_ASCENT, { distance: 1080, duration: 5.2, petalFall: 0.55 });
  assert.ok(Math.abs(CHOIMIS_SKY_SCALE.battleReady.hyungsub * 349 - 101 / 2) < 0.0001);
  assert.ok(Math.abs(CHOIMIS_SKY_SCALE.battleReady.gyeongsub * 359 - 98 / 2) < 0.0001);
  assert.ok(Math.abs(CHOIMIS_SKY_SCALE.battleReady.ppaman * 305 - 99 / 2) < 0.0001);
  assert.ok(Math.abs(CHOIMIS_SKY_SCALE.raisedHand * 123 - 103 / 2) < 0.0001);
  const actor = id => ({ id, x: 560, y: 199, w: 24, h: 16, dead: false, hopY: 0, motion: null });
  const player = actor('player');
  const gyeongsub = actor('gyeongsub');
  const ppaman = actor('ppaman');
  const boss = { ...actor('choimis_sky_boss'), hopY: 48, motion: { scale: CHOIMIS_SKY_SCALE.raisedHand } };
  const motion = id => ({ scale: CHOIMIS_SKY_SCALE.battleReady[id], frames: [{ duration: 1 }] });
  const game = {
    player, playerSprite: 'hyungsub', entities: [gyeongsub, ppaman, boss], background: [],
    camera: { x: 320, y: 0, locked: false }, zoom: { s: 1, smax: 1 },
    choimisSky: { motions: { hyungsub: motion('hyungsub'), gyeongsub: motion('gyeongsub'), ppaman: motion('ppaman') }, boss },
    sound: { sfx() {} },
  };
  const gathering = gatherChoimisSkyPollen(game);
  assert.equal(game.choimisSky.pollen.length, 168);
  assert.deepEqual([...new Set(game.choimisSky.pollen.map(particle => particle.actor.id))], ['player', 'gyeongsub', 'ppaman']);
  assert.equal(game.choimisSky.loosePetals.length, 36);
  assert.ok(game.choimisSky.pollen.every(particle => particle.color.startsWith('#ff')));
  assert.ok(game.choimisSky.loosePetals.every(petal => petal.color.startsWith('#ff')));
  assert.equal(game.background[0].update(3), true);
  await gathering;
  let hoverCancelled = false;
  const sounds = [];
  const ascentWind = { volume: -1, loop: false, pauses: 0, src: 'whoosh', pause() { this.pauses++; } };
  game.sound.sfx = (name, options = {}) => {
    sounds.push(name);
    if (name !== 'whoosh') return undefined;
    ascentWind.volume = options.volume;
    return ascentWind;
  };
  game.choimisSky.hoverWaiter = { cancel() { hoverCancelled = true; } };
  const bossFootBeforeAscent = boss.y + boss.h - boss.hopY - game.camera.y;
  const raisedHandMotion = boss.motion;
  const ascent = ascendChoimisSky(game);
  assert.equal(game.choimisSky.progress, 0);
  assert.equal(ascentWind.loop, true);
  assert.equal(ascentWind.volume, 0);
  assert.deepEqual([player.motion, gyeongsub.motion, ppaman.motion], [null, null, null]);
  assert.equal(boss.motion, raisedHandMotion);
  assert.equal(sounds.includes('weaponpull'), false);
  assert.equal(hoverCancelled, true);
  assert.equal(game.camera.locked, true);
  assert.equal(game.background[1].update(0), false);
  assert.equal(boss.y + boss.h - boss.hopY - game.camera.y + boss.flyY, bossFootBeforeAscent);
  assert.equal(game.background[1].update(2.6), false);
  assert.equal(game.choimisSky.progress, 0.5);
  assert.equal(ascentWind.volume, 0.24);
  assert.deepEqual([player.motion, gyeongsub.motion, ppaman.motion], [null, null, null]);
  assert.equal(boss.motion, raisedHandMotion);
  assert.equal(game.camera.y, -540);
  assert.equal(game.background[1].update(2.6), true);
  assert.equal(ascentWind.volume, 0);
  assert.deepEqual([player.motion, gyeongsub.motion, ppaman.motion], [null, null, null]);
  assert.equal(boss.motion, raisedHandMotion);
  const screenFoot = current => [
    240 + (current.x + current.w / 2 - game.camera.x + current.flyX - 240) * game.zoom.s,
    180 + (current.y + current.h - current.hopY - game.camera.y + current.flyY - 180) * game.zoom.s,
  ];
  const fieldFeetAtAscentEnd = [player, gyeongsub, ppaman].map(screenFoot);
  await ascent;
  assert.equal(ascentWind.pauses, 1);
  assert.equal(ascentWind.src, '');
  assert.equal(game.camera.y, -1080);
  assert.equal(player.hopY, 1080);
  assert.equal(boss.hopY, 1128);
  assert.equal(game.zoom.s, 0.84);
  assert.deepEqual([player, gyeongsub, ppaman].map(screenFoot), fieldFeetAtAscentEnd);
  assert.deepEqual(screenFoot(player).map(Math.round), [84, 104]);
  assert.deepEqual(screenFoot(gyeongsub).map(Math.round), [84, 164]);
  assert.deepEqual(screenFoot(ppaman).map(Math.round), [84, 224]);
  assert.deepEqual(screenFoot(boss).map(Math.round), [396, 176]);
  assert.ok([player.motion, gyeongsub.motion, ppaman.motion].every(current => current?.loop));
  assert.equal(player.motion.frames, game.choimisSky.motions.hyungsub.frames);
  assert.equal(gyeongsub.motion.frames, game.choimisSky.motions.gyeongsub.frames);
  assert.equal(ppaman.motion.frames, game.choimisSky.motions.ppaman.frames);
  assert.equal(boss.motion, raisedHandMotion);
  const fieldBodyHeights = [101, 98, 99].map(height => height / 2 * CHAR_SCALE * game.zoom.s);
  const battleBodyHeights = [player, gyeongsub, ppaman].map((current, index) =>
    current.motion.scale * CHAR_SCALE * game.zoom.s * [349, 359, 305][index]);
  battleBodyHeights.forEach((height, index) => assert.ok(Math.abs(height - fieldBodyHeights[index]) < 0.0001));
  const playerBodyHeight = player.motion.scale * 1.43 * game.zoom.s * 349;
  const bossBodyHeight = boss.motion.scale * 1.43 * game.zoom.s * 131;
  const expectedBossRatio = 117.5 * ENEMIES.choimis_flower.scale / (101 / 2 * CHAR_SCALE * game.zoom.s);
  assert.ok(Math.abs(bossBodyHeight - 117.5 * ENEMIES.choimis_flower.scale) < 0.0001);
  assert.ok(Math.abs(bossBodyHeight / playerBodyHeight - expectedBossRatio) < 0.0001);
  assert.ok(expectedBossRatio >= 0.95 && expectedBossRatio <= 1.05);
});
