import test from 'node:test';
import assert from 'node:assert/strict';
import { SCRIPTS } from '../../src/data/scripts.js';
import { QA_POINTS } from '../../src/core/story.js';
import { jjajang_night_cliff_scene as scene, NIGHT_CLIFF } from '../../src/data/cutscenes/jjajang_night_cliff.js';
import { jjajang_sakura12_bowl as bowl } from '../../src/data/cutscenes/jjajang_sakura12.js';
import { MAP_RUNTIME_ASSETS } from '../../src/data/map-runtime-assets.js';

test('test_night_cliff_preserves_exact_dialogue_order_and_censors_only_requested_word', () => {
  assert.equal(SCRIPTS.jjajang_night_cliff_scene, scene);
  const prefix = scene.slice(0, scene.findIndex(n => n.text === '* 아 씨발년 이럴줄알았어') + 1);
  assert.deepEqual(prefix.filter(n => n.text).map(n => [n.speaker, n.text.slice(2)]), [
    ['경섭', '..'], ['경섭', '어 미스야'], ['최미스', '어 형. 안녕하세요'], ['경섭', '... 그 내 ㄷ..'],
    ['최미스', '형 저는 왜 항상 이런식일까요'], ['경섭', '그게 무슨말이야'],
    ['최미스', '저는요 그냥 순수하게 보지를 보고싶었을뿐이에요'],
    ['최미스', '옷도 여러벌 사봤고요, 완장도 달아봤고, 디스코드도 돌았고, 카트라이더 소개팅도 다녀봤어요'],
    ['최미스', '근데 결국.. 항상 이런식으로 끝이나더라구요'], ['경섭', '그게 미스야'],
    ['최미스', '그냥 힘듭니다 이제'], ['최미스', '저는 어떻게 해야하는걸까요'], ['경섭', '미스야'],
    ['최미스', '....'], ['경섭', '그건 모르겠고 1500만원은 언제 갚을거니..?'], ['최미스', '...'], ['경섭', '...'],
    ['경섭', '아 씨발년 이럴줄알았어'],
  ]);
  assert.deepEqual(scene.filter(n => n.mosaic).map(n => n.mosaic), [{ text: '보지', block: 2 }]);
  for (const n of prefix.filter(n => n.text)) assert.equal(n.voice, n.speaker === '경섭' ? 'gyeongsub' : 'choimis');
});

test('test_night_cliff_music_camera_and_escape_are_cued_by_the_requested_beats', () => {
  const interruption = scene.findIndex(n => n.text === '* ... 그 내 ㄷ..');
  const confession = scene.findIndex(n => n.text === '* 형 저는 왜 항상 이런식일까요');
  const cue = scene.findIndex(n => n.bgm === 'ship_sinking');
  assert.ok(scene[interruption].cut > 0 && scene[interruption].auto <= 0.1);
  assert.ok(cue > interruption && cue < confession);
  assert.deepEqual(scene[confession - 1].async[0].camera, NIGHT_CLIFF.vistaCamera);
  assert.ok(scene[confession - 1].async[0].duration >= 1.2);
  const lastSilence = scene.findIndex((n, i) => i > confession && n.speaker === '경섭' && n.text === '* ...');
  const leap = scene.findIndex(n => n.hop === 'choimis');
  const reaction = scene.findIndex(n => n.text === '* 아 씨발년 이럴줄알았어');
  assert.ok(lastSilence < leap && leap < reaction && scene[leap].by[0] > 0 && scene[leap].by[1] > 0 && scene[leap].keep);
  assert.ok(199 + scene[leap].by[1] + 16 - 40 - 80 > 360, 'even an 80px tall actor clears the viewport before removal');
  assert.equal(scene.findIndex(n => n.battle), -1);
});

test('test_camera_barrier_waits_for_visible_frame_even_if_confirm_skips_typing', async () => {
  const i = scene.findIndex(n => n.text === '* 형 저는 왜 항상 이런식일까요');
  const game = { camera: { x: 416, y: 40 }, background: [] };
  let ready = false;
  const promise = scene[i + 1].action(game).then(() => { ready = true; });
  assert.equal(game.background.length, 1);
  assert.equal(game.background[0].update(), false);
  await Promise.resolve();
  assert.equal(ready, false);
  game.camera.x = 560;
  assert.equal(game.background[0].update(), true);
  await promise;
  assert.equal(ready, true);
});

test('test_old_item_save_resumes_new_view_without_repeating_reward', () => {
  assert.equal(bowl[0].goto, 'after_item');
  const resume = bowl.findIndex(n => n.label === 'after_item');
  assert.equal(bowl[resume + 1].if({ dark_jjajang_taken: true, sakura12_eyes_closed: true }), true);
  assert.equal(bowl[resume + 1].if({ dark_jjajang_taken: true, sakura12_eyes_closed: true, night_cliff_scene_done: true }), false);
  const qa = QA_POINTS.find(q => q.id === 'jjajang_night_cliff_after');
  assert.equal(qa.flags.sakura8_right_open, true);
  assert.equal(qa.flags.choimis_flower_done, true);
  assert.deepEqual(qa.party, ['gyeongsub', 'ppaman']);
  assert.deepEqual(MAP_RUNTIME_ASSETS.jjajang_night_cliff.sprites, ['gyeongsub', 'choimis']);
  assert.equal(scene.find(n => n.map === 'jjajang_sakura5').spawn, 'chase_crash');
  assert.equal(scene.some(n => n.map === 'jjajang_sakura12'), false);
});
