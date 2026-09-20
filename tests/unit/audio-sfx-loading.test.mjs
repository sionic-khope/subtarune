// 효과음 파일 로드 회귀 (2026-09-15 github.io 첫 로드 무음): canplaythrough 가 상한 안에 안 와도 파일을 버리지 않고,
// 실제 error 만 합성 폴백으로 남긴다. 새로고침(캐시) 뒤에만 들리던 증상의 원인이 8초 상한 폐기였다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Sound } from '../../src/core/audio.js';
import { BUILD } from '../../src/data/build.js';   // 소리 파일 주소엔 빌드 캐시 키가 붙는다(BUILD280)

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

const withFakeVoiceFetch = async (run) => {
  const RealFetch = globalThis.fetch;
  const RealWindow = globalThis.window;
  const calls = [];
  const decoded = [];
  let decode = async (raw) => ({ raw });
  class FakeAudioContext {
    constructor() { this.state = 'running'; this.destination = {}; }
    createGain() { return { gain: { value: 0 }, connect() {} }; }
    async decodeAudioData(raw) { decoded.push(raw); return decode(raw); }
  }
  globalThis.window = { AudioContext: FakeAudioContext };
  globalThis.fetch = (src) => new Promise((resolve) => calls.push({ src, resolve }));
  try { return await run({ calls, decoded, setDecode: (fn) => { decode = fn; } }); } finally { globalThis.fetch = RealFetch; globalThis.window = RealWindow; }
};

test('test_sfx_probe_timeout_keeps_slow_file_registered_for_later_playback', async () => {
  await withFakeAudio(async (created) => {
    const sound = new Sound();
    const loading = sound.loadSfxFiles(['slow']);
    await loading;
    assert.equal(created.length, 1, 'mp3 만 시도하고 ogg 로 넘어가지 않는다');
    assert.equal(created[0].src, `assets/audio/sfx/slow.mp3?v=${BUILD}`);
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
    assert.equal(created[1].src, `assets/audio/sfx/gone.ogg?v=${BUILD}`);
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

test('test_sfx_concurrent_and_later_calls_share_one_element_per_sound', async () => {
  await withFakeAudio(async (created) => {
    const sound = new Sound();
    const first = sound.loadSfxFiles(['menu']);
    const second = sound.loadSfxFiles(['menu']);
    assert.equal(created.length, 1, '동시에 같은 sfx 를 요청해도 하나의 mp3 요청만 만든다');
    created[0].oncanplaythrough();
    await Promise.all([first, second]);
    await sound.loadSfxFiles(['menu']);
    assert.equal(created.length, 1, '이미 등록한 sfx 는 나중 요청에서도 다시 내려받지 않는다');
  });
});

test('test_sfx_retries_after_late_error_removed_the_registered_element', async () => {
  await withFakeAudio(async (created) => {
    const sound = new Sound();
    await sound.loadSfxFiles(['retry']);
    created[0].onerror();
    const retry = sound.loadSfxFiles(['retry']);
    assert.equal(created.length, 2, '늦은 실제 오류 뒤에는 다음 요청이 새 요소를 만든다');
    created[1].oncanplaythrough();
    await retry;
    assert.equal(sound.files.retry, created[1]);
  });
});

test('test_voice_loads_share_one_fetch_and_decode_when_unlock_happens_first', async () => {
  await withFakeVoiceFetch(async ({ calls }) => {
    const sound = new Sound();
    const first = sound.loadVoiceFiles(['hero']);
    sound.unlock();
    const second = sound.loadVoiceFiles(['hero']);
    assert.equal(calls.length, 1, 'unlock 중 겹친 목소리 요청도 하나의 파일 요청을 공유한다');
    calls[0].resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    await Promise.all([first, second]);
    await tick(0);
    assert.equal(sound.voiceBuf.hero?.raw.byteLength, 8, 'unlock 뒤 늦게 받은 목소리는 자동 디코드된다');
  });
});

test('test_voice_decode_drains_a_later_load_that_arrives_during_unlock', async () => {
  await withFakeVoiceFetch(async ({ calls, decoded, setDecode }) => {
    let releaseFirst;
    const firstDecode = new Promise((resolve) => { releaseFirst = resolve; });
    setDecode(async (raw) => { if (raw.byteLength === 8) await firstDecode; return { raw }; });
    const sound = new Sound();
    sound.unlock();
    const first = sound.loadVoiceFiles(['first']);
    calls[0].resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    await tick(0);
    const second = sound.loadVoiceFiles(['second']);
    calls[1].resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) });
    await tick(0);
    releaseFirst();
    await Promise.all([first, second]);
    assert.deepEqual(decoded.map((raw) => raw.byteLength), [8, 16], 'unlock 중 늦게 도착한 목소리까지 한 번의 디코드 작업이 비운다');
    assert.equal(sound.voiceBuf.second?.raw.byteLength, 16);
  });
});

test('test_preload_bgm_skips_the_currently_playing_track', async () => {
  await withFakeAudio(async (created) => {
    const sound = new Sound();
    sound.bgm = {};
    sound.bgmName = 'jjajang_battle';
    sound.preloadBgm('jjajang_battle');
    assert.equal(created.length, 0, '현재 재생 중인 BGM은 다시 내려받지 않는다');
  });
});
