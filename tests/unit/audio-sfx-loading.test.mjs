// 효과음 파일 로드 회귀 (2026-09-15 github.io 첫 로드 무음): canplaythrough 가 상한 안에 안 와도 파일을 버리지 않고,
// 실제 error 만 합성 폴백으로 남긴다. 새로고침(캐시) 뒤에만 들리던 증상의 원인이 8초 상한 폐기였다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Sound } from '../../src/core/audio.js';

const withFakeAudio = async (run) => {
  const created = [];
  const RealAudio = globalThis.Audio;
  globalThis.Audio = class FakeAudio {
    constructor() { this.preload = ''; this.src = ''; this.oncanplaythrough = null; this.onerror = null; created.push(this); }
  };
  const timeout = Sound.SFX_PROBE_TIMEOUT;
  Sound.SFX_PROBE_TIMEOUT = 15;
  try { return await run(created); } finally { Sound.SFX_PROBE_TIMEOUT = timeout; globalThis.Audio = RealAudio; }
};
const tick = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('test_sfx_probe_timeout_keeps_slow_file_registered_for_later_playback', async () => {
  await withFakeAudio(async (created) => {
    const sound = new Sound();
    const loading = sound.loadSfxFiles(['slow']);
    await loading;
    assert.equal(created.length, 1, 'mp3 만 시도하고 ogg 로 넘어가지 않는다');
    assert.equal(created[0].src, 'assets/audio/sfx/slow.mp3');
    assert.equal(sound.files.slow, created[0], '상한을 넘긴 파일도 등록된다');
    created[0].oncanplaythrough?.();
    await tick(5);
    assert.equal(sound.files.slow, created[0], '늦게 도착해도 같은 요소로 재생한다');
  });
});

test('test_sfx_probe_error_falls_back_to_ogg_then_synth', async () => {
  await withFakeAudio(async (created) => {
    const sound = new Sound();
    const loading = sound.loadSfxFiles(['gone']);
    await tick(2);
    created[0].onerror();
    await tick(2);
    assert.equal(created.length, 2, 'mp3 실패 즉시 ogg 를 시도한다');
    assert.equal(created[1].src, 'assets/audio/sfx/gone.ogg');
    created[1].onerror();
    await loading;
    assert.equal(sound.files.gone, undefined, '둘 다 없으면 합성 폴백');
  });
});

test('test_sfx_late_error_after_timeout_unregisters_file', async () => {
  await withFakeAudio(async (created) => {
    const sound = new Sound();
    await sound.loadSfxFiles(['late']);
    assert.equal(sound.files.late, created[0]);
    created[0].onerror();
    assert.equal(sound.files.late, undefined, '상한 뒤 404 는 등록을 풀어 합성으로 돌아간다');
  });
});
