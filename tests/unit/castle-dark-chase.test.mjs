import test from 'node:test';
import assert from 'node:assert/strict';
import { CastleDarkChase, CASTLE_DARK_CHASE as C } from '../../src/scenes/castle-dark-chase.js';
import { castle_dark_chase_intro, castle_dark_chase_finish } from '../../src/data/cutscenes/castle_dark_chase.js';
import { storyBgm, QA_POINTS, Story } from '../../src/core/story.js';

function fixture(seen = false) {
  const events = [], map = { pxW: 3456, pxH: 1600, def: { meta: { darkChase: { entry: [228, 240], monsterSpawn: [228, 540] } } },
    solidRect() { throw Error('pursuer must ignore walls'); } };
  const game = { map, mapId: 'gajaeman_castle_dark_arrival', flags: { castle_dark_chase_seen: seen },
    player: { x: 228, y: 240, w: 24, h: 16, moving: false, facing: 'up' }, state: 'field', dialogue: { running: false },
    partyHp: { gyeongsub: 88, ppaman: 77 }, transitioning: false, propImages: {},
    sound: { bgmName: null, playBgm(name, options) { this.bgmName = name; events.push(['bgm', name, options]); }, stopBgm() { this.bgmName = null; events.push(['stop']); } },
    fadeTo(to, seconds) { events.push(['fade', to, seconds]); }, spawnParty() { events.push(['party']); },
    camera: { x: 0, y: 0, locked: false, snap() { events.push(['snap']); } },
    setFlag(name) { this.flags[name] = true; },
  };
  const scene = new CastleDarkChase(game); game.castleDarkChase = scene;
  return { game, scene, events };
}

test('dark chase reveals from below then follows through walls at normalized fixed speed', () => {
  const { game, scene } = fixture();
  assert.equal(scene.snapshot.phase, 'dormant'); scene.update(2); assert.equal(scene.snapshot.visible, false);
  scene.reveal(); const before = scene.snapshot.y; scene.update(C.revealSeconds / 2);
  assert.ok(scene.snapshot.y < before && scene.snapshot.y > 540);
  scene.update(C.revealSeconds / 2); assert.equal(scene.snapshot.y, 540);
  assert.equal(scene.snapshot.phase, 'revealed');
  const revealed = scene.snapshot; scene.update(20);
  assert.deepEqual(scene.snapshot, revealed);
  scene.start(); const start = scene.snapshot;
  game.player.x += 100; scene.update(1);
  assert.ok(Math.abs(Math.hypot(scene.snapshot.x - start.x, scene.snapshot.y - start.y) - 35) < 1e-8);
  assert.equal(game.sound.bgmName, 'baron_intro');
});

test('dark chase body contact fades and restarts without HP changes or repeated story', () => {
  const { game, scene, events } = fixture(true); scene.start();
  game.player.x = scene.snapshot.x - game.player.w / 2;
  game.player.y = scene.snapshot.y - game.player.h / 2;
  const hp = { ...game.partyHp }; scene.update(0.01);
  assert.equal(scene.snapshot.phase, 'caught'); assert.equal(game.transitioning, true);
  scene.update(C.fadeOutSeconds + 0.01);
  assert.deepEqual([game.player.x, game.player.y], [228, 240]);
  scene.update(C.fadeInSeconds + 0.01);
  assert.equal(scene.snapshot.phase, 'chase'); assert.equal(game.transitioning, false);
  assert.deepEqual(game.partyHp, hp); assert.equal(game.flags.castle_dark_chase_seen, true);
  assert.equal(events.filter(event => event[0] === 'party').length, 1);
});

test('dark chase contact uses body not glow and pauses while menu or dialogue is open', () => {
  const { game, scene } = fixture(true); scene.start();
  const at = scene.snapshot; game.player.x = at.x + 70; game.player.y = at.y;
  scene.update(0); assert.equal(scene.snapshot.phase, 'chase');
  for (const state of ['menu', 'dialogue']) {
    game.state = state; const before = scene.snapshot; scene.update(2);
    assert.deepEqual([scene.snapshot.x, scene.snapshot.y], [before.x, before.y]);
  }
});

test('dark chase resume uses restored player position and cleanup is idempotent', () => {
  const { game, scene, events } = fixture(true);
  game.player.x = 1200; game.player.y = 500; scene.start();
  assert.equal(scene.snapshot.x, 1212); assert.equal(scene.snapshot.y, 808);
  scene.dispose(); scene.dispose(); scene.update(10);
  assert.equal(game.castleDarkChase, null); assert.equal(events.filter(event => event[0] === 'stop').length, 1);
  const caught = fixture(true); caught.scene.start(); caught.game.player.x = caught.scene.snapshot.x; caught.game.player.y = caught.scene.snapshot.y;
  caught.scene.update(0); caught.scene.dispose(); caught.scene.update(5);
  assert.equal(caught.game.transitioning, false); assert.equal(caught.events.some(event => event[0] === 'party'), false);
});

test('dark chase draw only uses approved monster sprite and no ground revealing geometry', () => {
  const { game, scene } = fixture(); const calls = [];
  const ctx = new Proxy({}, { get: (target, name) => target[name] ?? ((...args) => calls.push([name, ...args])), set: (target, name, value) => { target[name] = value; return true; } });
  scene.reveal(); scene.draw(ctx, { x: 0, y: 0 }); assert.equal(calls.length, 0);
  game.propImages[C.image] = { width: 256, height: 256 }; scene.draw(ctx, { x: 0, y: 0 });
  assert.equal(calls.filter(call => call[0] === 'drawImage').length, 1);
  assert.equal(calls.some(call => ['fillRect', 'createRadialGradient', 'arc'].includes(call[0])), false);
});

test('dark chase exact dialogue order and saved-state routes preserve music and nonlethal replay', () => {
  assert.deepEqual(castle_dark_chase_intro.filter(node => node.text).map(node => node.text), [
    '* 형들,,', '* 왜 빠맨아?', '* 아까부터느낀건데,,,', '* 뒤에서 뭔가가 따라오는 기분이..', '* 오 씨발 도망가요 빨리',
  ]);
  const emotes = castle_dark_chase_intro.flatMap(node => node.parallel || []).filter(node => node.emote);
  assert.deepEqual(emotes.map(node => node.emote), ['player', 'gyeongsub', 'ppaman']);
  assert.ok(emotes.every(node => node.sfx === 'chime'));
  assert.ok(castle_dark_chase_intro.some(node => node.sfx === 'baron_roar'));
  assert.ok(castle_dark_chase_finish.some(node => node.stage === 'castle_dark_chase_done'));
  assert.equal(storyBgm('gajaeman_castle_dark_arrival', { castle_dark_chase_seen: true }), 'baron_intro');
  assert.equal(storyBgm('gajaeman_castle_dark_refuge', {}), 'castle_dark_path');
  assert.ok(Story.isStage('castle_dark_chase_seen') && Story.isStage('castle_dark_chase_done'));
  assert.ok(QA_POINTS.some(point => point.id === 'castle_dark_chase') && QA_POINTS.some(point => point.id === 'castle_dark_refuge'));
});

test('dark chase reveal keeps the physical threat visible below the party before the escape line', () => {
  const { scene, game } = fixture(); scene.reveal(); scene.update(C.revealSeconds);
  const zoom = castle_dark_chase_intro.find(node => node.zoom < 1).zoom;
  const screenY = y => 180 + (y - game.camera.y - 180) * zoom;
  assert.ok(screenY(game.player.y + game.player.h - 92) > 0);
  assert.ok(screenY(scene.snapshot.y) < 248);
  assert.ok(screenY(scene.snapshot.y) > screenY(game.player.y) + 150);
  const roar = castle_dark_chase_intro.findIndex(node => node.sfx === 'baron_roar');
  const wait = castle_dark_chase_intro.findIndex(node => node.wait === C.revealSeconds);
  const escape = castle_dark_chase_intro.findIndex(node => node.text === '* 오 씨발 도망가요 빨리');
  assert.ok(roar < wait && wait < escape);
});

test('dark chase map/title cancellation cannot perform a delayed catch reset', () => {
  for (const cancel of [game => { game.map = {}; }, game => { game.state = 'title'; }]) {
    const { game, scene, events } = fixture(true); scene.start();
    game.player.x = scene.snapshot.x; game.player.y = scene.snapshot.y;
    scene.update(0); cancel(game); scene.update(2);
    assert.equal(scene.disposed, true); assert.equal(game.transitioning, false);
    assert.equal(events.some(event => event[0] === 'party'), false);
  }
});

test('dark chase intro owns the roar handle and cancellation immediately stops only that sound', () => {
  const { game, scene } = fixture(), handles = [];
  game.sound.sfx = name => {
    const handle = { name, src: `${name}.ogg`, paused: false, pauses: 0,
      pause() { this.paused = true; this.pauses++; } };
    handles.push(handle); return handle;
  };
  const unrelated = game.sound.sfx('chime');
  const roar = castle_dark_chase_intro.find(node => node.sfx === 'baron_roar');
  assert.equal(typeof roar.action, 'function', 'preloaded roar node must transfer playback ownership to the scene');
  roar.action(game);
  assert.equal(handles.length, 2); assert.equal(handles[1].paused, false);
  scene.reveal(); scene.update(0.1); scene.dispose(); scene.dispose();
  assert.equal(handles[1].paused, true); assert.equal(handles[1].pauses, 1);
  assert.equal(handles[1].src, ''); assert.equal(unrelated.paused, false);
  roar.action(game); assert.equal(handles.length, 2, 'disposed scene cannot start a late roar');
});
