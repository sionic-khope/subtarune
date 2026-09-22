import test from 'node:test';
import assert from 'node:assert/strict';
import { CHASE_SEGMENTS, CHOIMIS_CRASH, CHOIMIS_AURA, RUNAWAY, choimis_runaway, consumeRunawayBowl } from '../../src/data/cutscenes/choimis_runaway.js';
import { QA_POINTS, stateFromFlags, storyBgm } from '../../src/core/story.js';
import { SCRIPTS } from '../../src/data/scripts.js';

test('test_runaway_three_ordered_pink_maps_keep_one_chase_music_cue', () => {
  assert.deepEqual(CHASE_SEGMENTS.map(n => n.map), ['jjajang_sakura8', 'jjajang_sakura7', 'jjajang_sakura6']);
  assert.equal(choimis_runaway.filter(n => n.bgm === 'baron_intro').length, 1);
  assert.deepEqual(choimis_runaway.filter(n => n.map).map(n => n.map), ['jjajang_sakura8', 'jjajang_sakura7', 'jjajang_sakura6', 'jjajang_sakura5']);
  assert.ok(choimis_runaway.filter(n => n.map).every(n => !('bgm' in n)), 'map nodes are not swallowed by the BGM dispatcher');
  assert.equal(SCRIPTS.choimis_runaway, choimis_runaway);
});

test('test_crash_dialogue_is_verbatim_and_no_unrequested_transformation_or_battle_is_added', () => {
  assert.deepEqual(CHOIMIS_CRASH.filter(n => n.text).map(n => [n.speaker, n.text.slice(2)]), [
    ['억빠맨', '어 괜 괜찮아요?'], ['경섭', '어 미스야 너 여기까지 튀어온거야?'], ['최미스', '아니 기껏 도망쳤더니 이게 뭐람'],
    ['최미스', '크으윽...'], ['경섭', '미스야 일단 진정하고'], ['최미스', '어라 저건 뭐지'], ['최미스', '짜..장면?'], ['경섭', '저걸 먹으면 안돼!'],
    ['최미스', '네 안먹어요'], ['억빠맨', '...?'], ['경섭', '? 아 그러니'], ['최미스', '네 저 다이어트하려구요.'], ['억빠맨', '오'], ['경섭', '그래 뭐.. 잘됐네'],
    ['도미조림', '아.'], ['억빠맨', '아.'], ['도미조림', '내 짜장면 ㅠㅠㅠ 흐미~~'], ['경섭', '...'],
    ['억빠맨', '진짜 ㅈ된거같은데요'], ['경섭', '어 어떡하지..'], ['억빠맨', '뭘 어떻게해요 족쳐야죠.'],
    ['최미스', '...'], ['최미스', '흐흐흐 이 힘은..'], ['최미스', '뭐야 . 이짜장면 대박이잖아..'], ['최미스', '난 알파메일이 되는거야!!!'],
  ]);
  assert.ok(CHOIMIS_CRASH.every(n => !n.battle && !n.join && !n.leave));
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
  const contact = CHOIMIS_CRASH.findIndex(n => n.move === RUNAWAY.domi && n.rel === RUNAWAY.choimis);
  assert.ok(CHOIMIS_CRASH[contact + 1].parallel, 'impact immediately follows physical arrival, not a camera wait');
  const recoil = CHOIMIS_CRASH.find(n => n.hop === RUNAWAY.domi && n.by);
  assert.deepEqual(recoil.by, [-156, -64], 'Domi rebounds to clear space above-left of Yop, not onto him');
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
  assert.deepEqual(after.party, []);
  assert.equal(storyBgm('jjajang_sakura5', after.flags), 'captain_reveal');
});
