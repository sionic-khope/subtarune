import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicCamera, musicCameraPose } from '../../src/ui/music-camera.js';
import { STORAGE_DANCE } from '../../src/data/storage-dance.js';
import { storage_viewer } from '../../src/data/cutscenes/storage_viewer.js';

function fixture() {
  const calls = [];
  const cue = { elapsed: 0, stop: () => calls.push('stop') };
  const previous = { a: { pause() {}, src: 'show' } };
  const game = {
    zoom: { s: 1, fx: 2, fy: 3, smax: 1, tween: null },
    camera: { x: 0, y: 88, locked: true },
    entities: [{ id: 'viewer', x: 228, y: 218, w: 24, h: 16 }],
    textbox: { close: () => calls.push('close') },
    sound: {
      loadCue: async () => ({}), playCue: () => cue,
      pauseBgm() { calls.push('pause'); this.paused = previous; },
      resumeBgm() { calls.push('resume'); this.paused = null; },
    },
  };
  return { game, cue, calls, previous };
}

test('legraise dialogue and music are inserted before the existing Faker dance', () => {
  const texts = storage_viewer.filter(n => n.text).map(n => n.text);
  const first = texts.indexOf('* 이게 무슨 자세로 보이시나요? 헤헤 레그레이즈입니다');
  assert.ok(first > 0);
  assert.equal(texts[first + 1], '* 뮤직 큐 해도될까요? 여긴 유미시티');
  assert.equal(texts[first + 2], '* 야야야 아잠깐만 야 야');
  assert.match(texts[first + 3], /페이커/);
  const cue = storage_viewer.find(n => n.musicCamera).musicCamera;
  assert.equal(cue.duration, 7);
  assert.equal(cue.src, STORAGE_DANCE.src);
});

test('each measured audio beat zooms in then releases without accumulated frame time', () => {
  for (const beat of STORAGE_DANCE.beats) {
    assert.ok(musicCameraPose(STORAGE_DANCE, beat).zoom > musicCameraPose(STORAGE_DANCE, beat + 0.2).zoom);
  }
  assert.equal(musicCameraPose(STORAGE_DANCE, 7).zoom, 1);
  assert.equal(musicCameraPose(STORAGE_DANCE, 7).bounce, 0);
});

test('audio-clock sequence restores camera, zoom and the paused BGM exactly once', async () => {
  const { game, cue, calls } = fixture();
  const before = { ...game.zoom };
  const scene = new MusicCamera(game, { ...STORAGE_DANCE, at: 'viewer' });
  await scene.ready;
  cue.elapsed = 3.5;
  assert.equal(scene.update(1000), false);
  assert.equal(game.zoom.s, STORAGE_DANCE.peakZoom);
  cue.elapsed = 7;
  assert.equal(scene.update(0), true);
  assert.deepEqual(game.zoom, before);
  assert.deepEqual(game.camera, { x: 0, y: 88, locked: true });
  assert.deepEqual(calls, ['close', 'pause', 'stop', 'resume']);
  scene.dispose();
  assert.equal(calls.filter(x => x === 'resume').length, 1);
});

test('title or QA cancellation stops the clip and discards paused music, including pending load', async () => {
  const { game, cue, calls, previous } = fixture();
  const scene = new MusicCamera(game, { ...STORAGE_DANCE, at: 'viewer' });
  await scene.ready;
  cue.elapsed = 4;
  scene.update();
  scene.dispose();
  assert.equal(game.zoom.s, 1);
  assert.equal(game.sound.paused, null);
  assert.equal(previous.a.src, '');
  assert.equal(calls.includes('resume'), false);
  assert.equal(calls.includes('stop'), true);

  const pending = fixture();
  let resolve;
  pending.game.sound.loadCue = () => new Promise(r => { resolve = r; });
  const loading = new MusicCamera(pending.game, { ...STORAGE_DANCE, at: 'viewer' });
  loading.dispose();
  resolve({});
  await loading.ready;
  assert.deepEqual(pending.calls, ['close']);
});
