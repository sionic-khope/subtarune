// 드럼통 길(BUILD242): 곧은 검은 물길 + 가운데 드럼통(길 위 칸) + 드럼통 앞 트리거(한 번), 청소부 이별 컷신(말풍선 → 6줄 → 껄껄 뒤 웃음 → 이탈·NPC → 바라봄 → 혼자 맵 밖으로 → 2줄 + 말풍선 → 페이드 → 다음 맵),
//   굽이 길 동쪽 문, 이별 뒤 파티(janitor_left), QA 지점
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { jjajang_drum_talk, NEXT_MAP, LOOK_AT_JANITOR } from '../../src/data/cutscenes/jjajang_drum.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { QA_POINTS, storyBgm, JJAJANG_AFTER_JOIN_MAPS, partyFromFlags } from '../../src/core/story.js';

const map = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_drum.json', import.meta.url), 'utf8'));
const run2 = JSON.parse(readFileSync(new URL('../../assets/maps/jjajang_run2.json', import.meta.url), 'utf8'));
const rows = map.rows, W = rows[0].length, [r0, r1] = [8, 9];
const t = id => map.entities.find(e => e.id === id);
const textIdx = s => s.map((n, i) => (n.text ? i : -1)).filter(i => i >= 0);

test('test_drum_map_has_the_drum_above_the_road_middle_and_a_once_trigger_before_it', () => {
  for (let c = 0; c < W; c++) assert.ok(rows[r0][c] !== '@' && rows[r1][c] !== '@', `길 ${c}`);
  assert.equal(rows[r0][0], '+'); assert.equal(rows[r0][W - 1], '+');
  const drum = t('jjajang_drum');
  assert.ok(existsSync(new URL('../../' + drum.image, import.meta.url)), '드럼통 그림');
  assert.ok(Math.abs((drum.x + drum.w / 2) - W * 32 / 2) <= 48, '맵 가운데쯤');
  assert.ok(drum.y + drum.h <= r0 * 32 && drum.y + drum.h > (r0 - 1) * 32 && drum.solid, '밑동은 길 바로 위 칸(막힘)');
  assert.ok(drum.ix <= drum.x && drum.ix + 33 >= drum.x + drum.w && drum.iy + 56 === drum.y + drum.h, '히트박스는 그림 x 안, 그림 밑변 = 히트박스 밑변');
  const trig = t('drum_talk_trigger');
  assert.deepEqual({ script: trig.script, once: trig.once, flag: trig.flag, unless: trig.unless }, { script: 'jjajang_drum_talk', once: true, flag: 'drum_talk_started', unless: 'drum_talk_done' });
  assert.ok(trig.x + trig.w <= drum.x + drum.w / 2 && trig.y === r0 * 32 && trig.h === 64, '드럼통 앞(가운데)');
  assert.ok(map.spawns.before_drum.x < trig.x && map.spawns.from_west.x < trig.x, 'QA 스폰은 트리거 앞');
  const west = t('drum_run2_door'), east = t('drum_chin1_door');
  assert.deepEqual([west.to, west.spawn, west.x], ['jjajang_run2', 'from_east', 0]);
  assert.deepEqual([east.to, east.spawn, east.x], ['jjajang_chin1', 'from_west', W * 32 - 10]);
  const r2door = run2.entities.find(e => e.id === 'run2_drum_door');
  assert.deepEqual([r2door.to, r2door.spawn, r2door.x], ['jjajang_drum', 'from_west', run2.rows[0].length * 32 - 10], '굽이 길 오른쪽 끝 → 드럼통 길');
  assert.ok(run2.spawns.from_east && run2.spawns.from_east.facing === 'left');
  assert.equal(map.bgm, 'my_castle_town');
  for (const id of ['jjajang_drum', 'jjajang_chin1', 'jjajang_chin2']) assert.ok(JJAJANG_AFTER_JOIN_MAPS.includes(id), id);
  assert.equal(storyBgm('jjajang_drum', { torii_janitor_joined: true, janitor_left: true }), 'my_castle_town', '이별 뒤에도 브금은 이어진다(지정 없음)');
});

test('test_drum_talk_follows_the_brief_and_leaves_the_janitor_behind', () => {
  const s = jjajang_drum_talk; const idx = pred => s.findIndex(pred);
  assert.equal(SCRIPTS.jjajang_drum_talk, s);
  const texts = s.filter(n => n.text).map(n => n.text.replace(/^\* /, ''));
  assert.deepEqual(texts, ['그래 자네 검을 다루는법은 조금 익숙해졋는가', '꼭 쓰러트려야만 하는 누군가가 있는거지?', '나도 그랬다네', '그렇지만 그러지 못했다네', '뭐 껄껄 어쩔수없는거 아닌가', '아 먼저 가보겠나 난 이걸 좀 보다 가야겠으니.', '전우들이여', '미안하네'], '대사 원문 그대로');
  assert.ok(s.filter(n => n.text).every(n => n.speaker === '청소부' && n.voice === 'janitor'));
  const ti = textIdx(s), bubbles = s.map((n, i) => (n.bubble === 'janitor' ? i : -1)).filter(i => i >= 0);
  assert.equal(bubbles.length, 2, '...은 말풍선 둘(처음·마지막)'); assert.ok(bubbles[0] < ti[0] && bubbles[1] > ti[7]);
  const li = s.map((n, i) => (n.motion === 'janitor' && n.name === 'laugh' ? i : -1)).filter(i => i >= 0);
  assert.equal(li.length, 1); assert.ok(s[li[0] - 1].text.includes('껄껄'), '껄껄 뒤에만 웃음');
  const leave = idx(n => n.leave === 'janitor'), lookWait = idx(n => n.wait === LOOK_AT_JANITOR), cam = idx(n => n.camera === 'janitor'), walkOff = idx(n => n.move === 'player' && typeof n.px === 'function');
  assert.ok(ti[5] < leave && leave < lookWait && lookWait < cam && cam < walkOff && walkOff < ti[6], '마지막 당부 → 이탈 → 바라봄 → 카메라 청소부 → 혼자 걸어감 → 혼자 남은 청소부 대사');
  assert.ok(s[leave - 1]?.set?.janitor_left === true, '이탈 직전에 플래그(자동 저장에 실린다)');
  assert.ok(s[leave + 1]?.action && s.slice(leave + 1, lookWait).some(n => n.move === 'janitor' && n.rel === 'jjajang_drum' && n.at === 'bottom') && s.slice(leave + 1, lookWait).some(n => n.face === 'janitor' && n.dir === 'up'), 'NPC 로 남아 드럼통 아래에서 위를 본다');
  const px = s[walkOff].px({ map: { pxW: 2048 }, player: { x: 1000, y: 262 } }); assert.ok(px[0] > 2048 && px[1] === 262 && s[walkOff].footsteps, '맵 밖까지 걸어 나간다');
  const fadeOut = idx(n => n.fade === 'out'), mapNode = idx(n => n.map === NEXT_MAP), fadeIn = idx(n => n.fade === 'in'), done = idx(n => n.set?.drum_talk_done);
  assert.ok(bubbles[1] < fadeOut && fadeOut < done && done < mapNode && mapNode < fadeIn && s[mapNode].spawn === 'from_west', '말풍선 → 페이드 아웃 → 플래그 → 맵 교체(왼쪽 스폰) → 페이드 인');
  assert.equal(s[0].if({ drum_talk_done: true, torii_janitor_joined: true }), true); assert.equal(s[0].if({ janitor_left: true, torii_janitor_joined: true }), true); assert.equal(s[0].if({ torii_janitor_joined: true }), false);
});

test('test_party_and_qa_after_the_janitor_leaves', () => {
  assert.deepEqual(partyFromFlags({ ship_sinking_done: true, torii_janitor_joined: true }), ['janitor']);
  assert.deepEqual(partyFromFlags({ ship_sinking_done: true, torii_janitor_joined: true, janitor_left: true }), [], '이별 뒤엔 요플래 혼자');
  const qa = id => QA_POINTS.find(p => p.id === id);
  assert.deepEqual(qa('jjajang_drum').party, ['janitor']); assert.equal(qa('jjajang_drum_center').spawn, 'before_drum');
  for (const id of ['jjajang_chin1', 'jjajang_chin1_chin', 'jjajang_chin2', 'jjajang_chin2_chin']) { assert.deepEqual(qa(id).party, [], id); assert.ok(qa(id).flags.janitor_left && qa(id).flags.drum_talk_done, id); }
});
