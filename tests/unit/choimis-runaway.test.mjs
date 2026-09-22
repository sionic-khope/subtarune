import test from 'node:test';
import assert from 'node:assert/strict';
import { CHASE_SEGMENTS, CHOIMIS_CRASH, CHOIMIS_AURA, RUNAWAY, choimis_runaway, consumeRunawayBowl } from '../../src/data/cutscenes/choimis_runaway.js';
import { QA_POINTS, stateFromFlags, storyBgm } from '../../src/core/story.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { CHOIMIS_FLOWER, clearChoimisFlowerEffects, flyChoimisFlower, flowerReaction } from '../../src/data/cutscenes/choimis_flower.js';
import { partyFromFlags } from '../../src/core/story.js';

test('test_runaway_three_ordered_pink_maps_keep_one_chase_music_cue', () => {
  assert.deepEqual(CHASE_SEGMENTS.map(n => n.map), ['jjajang_sakura8', 'jjajang_sakura7', 'jjajang_sakura6']);
  assert.equal(choimis_runaway.filter(n => n.bgm === 'baron_intro').length, 1);
  assert.deepEqual(choimis_runaway.filter(n => n.map).map(n => n.map), ['jjajang_sakura8', 'jjajang_sakura7', 'jjajang_sakura6', 'jjajang_sakura5']);
  assert.ok(choimis_runaway.filter(n => n.map).every(n => !('bgm' in n)), 'map nodes are not swallowed by the BGM dispatcher');
  assert.equal(SCRIPTS.choimis_runaway, choimis_runaway);
});

test('test_crash_dialogue_is_verbatim_and_transformation_remains_outside_combat', () => {
  const greeting = CHOIMIS_CRASH.findIndex(n => n.text?.includes('하핫 ~'));
  assert.deepEqual(CHOIMIS_CRASH.slice(0, greeting).filter(n => n.text).map(n => [n.speaker, n.text.slice(2)]), [
    ['억빠맨', '어 괜 괜찮아요?'], ['경섭', '어 미스야 너 여기까지 튀어온거야?'], ['최미스', '아니 기껏 도망쳤더니 이게 뭐람'],
    ['최미스', '크으윽...'], ['경섭', '미스야 일단 진정하고'], ['최미스', '어라 저건 뭐지'], ['최미스', '짜..장면?'], ['경섭', '저걸 먹으면 안돼!'],
    ['최미스', '네 안먹어요'], ['억빠맨', '...?'], ['경섭', '? 아 그러니'], ['최미스', '네 저 다이어트하려구요.'], ['억빠맨', '오'], ['경섭', '그래 뭐.. 잘됐네'],
    ['도미조림', '아.'], ['억빠맨', '아.'], ['도미조림', '내 짜장면 ㅠㅠㅠ 흐미~~'], ['경섭', '...'], ['최미스', '우걱우걱 우적우적 쓰읍..'],
    ['억빠맨', '진짜 ㅈ된거같은데요'], ['경섭', '어 어떡하지..'], ['억빠맨', '뭘 어떻게해요 족쳐야죠.'],
    ['최미스', '...'], ['최미스', '흐흐흐 이 힘은..'], ['최미스', '뭐야 . 이짜장면 대박이잖아..'], ['최미스', '난 알파메일이 되는거야!!!'],
  ]);
  assert.ok(CHOIMIS_CRASH.every(n => !n.battle && !n.leave));
  const alpha = CHOIMIS_AURA.findIndex(n => n.text?.includes('알파메일'));
  assert.ok(CHOIMIS_AURA.findIndex(n => n.fade === 'white') > alpha);
  assert.ok(CHOIMIS_AURA.findIndex(n => n.set?.choimis_runaway_done) > alpha);
});

test('test_contact_orders_tree_drop_arrivals_splat_and_consumption', () => {
  const impact = CHOIMIS_CRASH.findIndex(n => n.move === RUNAWAY.choimis && n.rel === 'crash_impact');
  const tree = CHOIMIS_CRASH.findIndex(n => n.parallel?.some(b => b.fling === 'sakura5_giant_tree'));
  const reunion = CHOIMIS_CRASH.findIndex(n => n.spawn?.id === RUNAWAY.gyeongsub);
  const splat = CHOIMIS_CRASH.findIndex(n => n.sfx === 'ralsei_splat');
  const eat = CHOIMIS_CRASH.findIndex(n => n.action === consumeRunawayBowl);
  assert.ok(impact < tree && tree < reunion && reunion < splat && splat < eat);
  assert.ok(CHOIMIS_CRASH[tree].parallel.some(n => Array.isArray(n) && n.some(s => s.drop === 'player')));
  const contact = CHOIMIS_CRASH.findIndex(n => n.drop === RUNAWAY.domi);
  assert.equal(CHOIMIS_CRASH[contact].height, 520);
  assert.ok(CHOIMIS_CRASH[contact + 1].parallel, 'impact immediately follows physical arrival, not a camera wait');
  const recoil = CHOIMIS_CRASH.find(n => n.hop === RUNAWAY.domi && n.by);
  assert.deepEqual(recoil.by, [-156, -64], 'Domi rebounds to visible clear space above-left of Yop');
  const farewell = CHOIMIS_CRASH.findIndex(n => n.text?.includes('내 짜장면'));
  assert.deepEqual(CHOIMIS_CRASH[farewell + 2].by, [192, 0], 'escape crosses the upper lane before moving down to exit');
});

test('test_bowl_eating_consumes_one_key_item_only_and_survives_qa_restore', () => {
  const bowl = { id: RUNAWAY.bowl, visible: true, dead: false };
  const game = { entities: [bowl], inventory: ['바나나', '어둠의 짜장면', '열쇠?'], partyHp: { hyungsub: 57 }, money: 330 };
  consumeRunawayBowl(game);
  assert.equal(bowl.dead, true);
  assert.deepEqual(game.inventory, ['바나나', '열쇠?']);
  assert.deepEqual(game.partyHp, { hyungsub: 57 }); assert.equal(game.money, 330);
  assert.throws(() => consumeRunawayBowl(game), /visible bowl/);
  assert.ok(stateFromFlags({ dark_jjajang_taken: true }).inventory.includes('어둠의 짜장면'));
  assert.equal(stateFromFlags({ dark_jjajang_taken: true, choimis_jjajang_eaten: true }).inventory.includes('어둠의 짜장면'), false);
  const after = QA_POINTS.find(q => q.id === 'choimis_runaway_after');
  assert.ok(after.flags.choimis_tree_crashed && after.flags.choimis_jjajang_eaten && after.flags.choimis_runaway_done);
  assert.deepEqual(after.party, ['gyeongsub', 'ppaman']);
  assert.deepEqual(partyFromFlags(after.flags), ['gyeongsub', 'ppaman']);
  assert.equal(storyBgm('jjajang_sakura5', after.flags), null);
});

test('test_flower_dialogue_preserves_user_sequence_and_joins_only_after_follow_line', () => {
  assert.deepEqual(CHOIMIS_FLOWER.filter(n => n.text).map(n => n.text.slice(2)), [
    '하핫 ~ 형님들 안녕하세요 미스에요~!!', '뭐지 씨2발 뭐랄까 더 좆같아졌네요', '하하핫~ 드디어 깨달았어요 고닉의 핵심!!',
    '(내 추구미는 쵸소우야)', '스읍 미스', '그래 내가 지금까지 나의 모습을 너무 감춰왔던거같아.',
    '디스코드같은 가면빼고 나 자체가 섹시해지면 되는거였어.', '나는.. 옷을 잘 입으니까!!', '...',
    '어이구 어이구 형님들. 뭐 질투나십니까?', '하하하...', '...', '장난은 여기까지만 하도록 하죠',
    '이제 이 모습으로 다시 점례에게 고백할건데', '분명 또 방해를 하시겠죠', '아까 그 장소에서 다시 기다리겠습니다.',
    '핫핫핫핫핫 이제 여자친구를... 진짜사귈수있을거같아 으핫핫핫!!!', '...', '쫒아가죠 형.',
  ]);
  const follow = CHOIMIS_FLOWER.findIndex(n => n.text?.includes('쫒아가죠'));
  assert.ok(CHOIMIS_FLOWER.findIndex(n => n.join) > follow);
  const chew = CHOIMIS_CRASH.findIndex(n => n.text?.includes('우걱우걱'));
  const aura = CHOIMIS_CRASH.findIndex(n => n.bgm === 'captain_reveal');
  assert.ok(chew > 0 && chew < aura);
});

test('test_old_completed_save_enters_only_postwhite_continuation_once', () => {
  const migration = SCRIPTS.choimis_runaway_restore;
  assert.equal(migration[0].if({ choimis_runaway_done: true }), false);
  assert.equal(migration[0].if({ choimis_runaway_done: true, choimis_flower_done: true }), true);
  assert.equal(migration[0].if({}), true);
  assert.ok(migration.every(n => !n.map && n.action !== consumeRunawayBowl));
  assert.ok(migration.some(n => n.text?.includes('하핫 ~')));
});

test('test_flower_audio_waits_for_real_end_and_cancellation_releases_it', async () => {
  const sound = new EventTarget(); sound.pause = () => { sound.paused = true; }; sound.play = () => Promise.resolve(); sound.duration = 0.62;
  const game = { sound: { files: { choimis_flower_yes: { cloneNode: () => sound } } }, fx: [], textbox: {} };
  const line = { text: '* 그래', voice: 'choimis_flower' };
  const nodes = flowerReaction('choimis_flower_yes', line);
  nodes[0].action(game);
  game.textbox.node = line;
  let ended = false;
  const waiting = nodes[2].action(game).then(() => { ended = true; });
  await Promise.resolve(); assert.equal(ended, false); assert.equal(game.textbox.voice, 'none');
  sound.dispatchEvent(new Event('ended')); await waiting; assert.equal(ended, true);
  assert.equal(game.textbox.voice, 'choimis_flower');
  nodes[0].action(game);
  const cancelled = nodes[2].action(game);
  clearChoimisFlowerEffects(game); await cancelled;
  assert.equal(sound.paused, true); assert.equal(game.choimisFlower, null);
});

test('test_flower_rejected_play_and_muted_audio_never_lock_dialogue', async () => {
  const sound = new EventTarget(); sound.pause = () => {}; sound.play = () => Promise.reject(new Error('autoplay blocked')); sound.duration = 0.62;
  const game = { sound: { files: { choimis_flower_yes: { cloneNode: () => sound } } }, fx: [], textbox: {} };
  const nodes = flowerReaction('choimis_flower_yes', { text: '* 그래', voice: 'choimis_flower' });
  nodes[0].action(game); await nodes[2].action(game);
  assert.equal(game.choimisFlower.finishAudio, null);
  game.sound.muted = true;
  nodes[0].action(game); await nodes[2].action(game);
  assert.equal(game.choimisFlower.audio, null);
});

test('test_flower_flight_has_visible_rise_then_right_exit_and_resolves_on_cancel', async () => {
  const c = { id: RUNAWAY.choimis, x: 1880, y: 409, w: 24, h: 16, def: {}, visible: true };
  const game = { entities: [c], sound: { sfx() {} }, camera: {}, background: [], fx: [], emitDropletsAt() {} };
  const flight = flyChoimisFlower(game);
  game.background[0].update(1.2);
  assert.ok(c.hopY > 60 && c.hopY < 150 && c.spin > 0);
  assert.ok(game.choimisFlower.ghosts.length > 0);
  game.background[0].update(2.3);
  assert.ok(c.x > 2100 && c.hopY >= 150);
  clearChoimisFlowerEffects(game); await flight;
  assert.equal(game.choimisFlower, null);
});
