// 짜장 토리이 길 청소부 합류(BUILD226): 대사 원문·순서, 실루엣 → 청소부 교체, 합류 플래그·파티 규칙, 맵 트리거 자리, 시야 노이즈
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { torii_janitor } from '../../src/data/cutscenes/jjajang_torii.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { QA_POINTS, partyFromFlags, storyBgm } from '../../src/core/story.js';
import { CHARACTERS, PARTY_ORDER } from '../../src/data/characters.js';

const map = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_torii.json', import.meta.url), 'utf8'));
const texts = torii_janitor.filter(n => n.text).map(n => n.text.replace(/^\* /, ''));

test('test_torii_janitor_lines_are_verbatim_and_ordered', () => {
  assert.deepEqual(texts, [
    '거기 너', '지금 뭐하는 짓 인가', '당장 나를..',
    '어이', '젊은이 안녕한가', '아 아빠..?', '뭐? 잘안들린다네, 내가 지금 기억이 잘 안나서말이야',
    '분명 뭔가 폰으로 아들...인가 누군가 방..쉉? 라이부? 유투브? 이런걸 보고있었는데', '아 그뒤로 정신을 차려보니 아무 기억도 안난단 말일새',
    '나이가 들어서 그런가 어이구 힘들구먼', '...', '젊은이 반갑네', '나는 인사했다.', '뭔가 익숙한 얼굴인데', '나랑도 좀 닮은거 같구려 껄껄',
    '됐고 여기엔 어떻게 오게됐당가?', '아 모르겠지물론 껄껄 나도 모르니까.', '일단 이 늙은이 저기까지만 좀 데려다 줄 수 있는가?', '응? 저기가 어디냐고? 뭐 저기~까지 저기~',
    '영문은 모르겠지만 {c=yellow}청소부가 동료가 되었다{/c}',
  ]);
  const speakers = torii_janitor.filter(n => n.text).map(n => n.speaker || 'N');
  assert.deepEqual(speakers.slice(0, 3), ['N', 'N', 'N'], '실루엣의 세 줄은 나레이션 목소리');
  assert.ok(torii_janitor.filter(n => n.speaker === '청소부').every(n => n.voice === 'janitor' && n.portrait === 'janitor'));
  assert.equal(SCRIPTS.torii_janitor, torii_janitor);
});

test('test_torii_janitor_beats_in_order_bgm_off_footsteps_question_shadow_fade_swap_bgm_join', () => {
  const idx = pred => torii_janitor.findIndex(pred);
  const bgmOff = idx(n => 'bgm' in n && n.bgm === null);
  const steps = idx(n => n.footsteps !== undefined && !n.move);
  const question = idx(n => n.emote === 'player' && n.kind === '?');
  const shadowIn = idx(n => n.spawn?.id === 'janitor_shadow');
  const shadowWalk = idx(n => n.move === 'janitor_shadow');
  const firstLine = idx(n => n.text?.includes('거기 너'));
  const bang = idx(n => n.emote === 'player' && n.kind === '!');
  const turn = idx(n => n.face === 'player' && n.dir === 'left');
  const fadeOut = idx(n => n.fade === 'out');
  const janitorIn = idx(n => n.spawn?.id === 'janitor');
  const fadeIn = idx(n => n.fade === 'in');
  const bgmOn = idx(n => n.bgm === 'wise_words');
  const hello = idx(n => n.text?.includes('어이'));
  const join = idx(n => n.join === 'janitor');
  const flag = idx(n => n.set?.torii_janitor_joined);
  assert.ok(bgmOff >= 0 && bgmOff < steps && steps < question && question < shadowIn && shadowIn < shadowWalk && shadowWalk < firstLine);
  assert.equal(torii_janitor[bgmOff + 2].wait, 1, '멈추고 1초 뒤');
  assert.equal(torii_janitor[question].sfx, false, '물음표는 무음');
  assert.ok(torii_janitor[shadowWalk].footsteps === true, '실루엣은 발소리를 내며 걸어온다');
  assert.ok(firstLine < bang && bang < turn && turn < fadeOut && fadeOut < janitorIn && janitorIn < fadeIn && fadeIn < bgmOn && bgmOn < hello && hello < join && join < flag);
  assert.equal(torii_janitor[0].if({ torii_janitor_joined: true }), true, '합류 뒤엔 다시 돌지 않는다');
  const after = idx(n => n.bgm === 'my_castle_town');
  assert.ok(after > flag, '동료가 된 뒤부터 My Castle Town');
});

test('test_torii_janitor_party_rules_and_qa_points', () => {
  assert.ok(PARTY_ORDER.includes('janitor'));
  assert.deepEqual(partyFromFlags({ ship_sinking_done: true }), []);
  assert.deepEqual(partyFromFlags({ ship_sinking_done: true, torii_janitor_joined: true }), ['janitor']);
  assert.deepEqual(partyFromFlags({ void11_done: true, ppaman_joined: true, torii_janitor_joined: true }), ['gyeongsub', 'ppaman'], '침몰 전엔 청소부가 없다');
  assert.equal(CHARACTERS.janitor.hpColor, '#ffd84a');
  assert.equal(storyBgm('jjajang_torii', { torii_janitor_joined: true }), 'my_castle_town', '합류 뒤 토리이 길 브금');
  assert.equal(storyBgm('jjajang_torii', {}), undefined, '합류 전엔 맵 기본(wind)');
  assert.equal(storyBgm('jjajang_forest', { torii_janitor_joined: true }), undefined, '이전 맵(숲)은 그대로');
  assert.ok(CHARACTERS.janitor.hp > 0 && CHARACTERS.janitor.sheet && CHARACTERS.janitor_shadow.sheet);
  const before = QA_POINTS.find(p => p.id === 'jjajang_torii_event'), after = QA_POINTS.find(p => p.id === 'jjajang_torii_joined');
  assert.deepEqual(before.party, []); assert.deepEqual(after.party, ['janitor']);
  assert.ok(after.flags.torii_janitor_joined && !before.flags.torii_janitor_joined);
});

test('test_torii_map_trigger_sits_just_past_the_second_gate_and_noise_is_softer', () => {
  const trigger = map.entities.find(e => e.type === 'trigger');
  assert.deepEqual({ script: trigger.script, once: trigger.once, flag: trigger.flag, unless: trigger.unless },
    { script: 'torii_janitor', once: true, flag: 'torii_janitor_started', unless: 'torii_janitor_joined' });
  const second = map.meta.torii[1];
  assert.ok(trigger.x >= second.nearBase[0] + 189 && trigger.x < map.meta.torii[2].nearBase[0] - 57, '두 번째 토리이 그림 끝과 세 번째 사이');
  assert.equal(map.vision.noise, 0.5);
  assert.ok(map.spawns.before_janitor.x < trigger.x && map.spawns.after_janitor.x > trigger.x + trigger.w);
});
