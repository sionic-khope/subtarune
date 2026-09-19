// 생각 길(BUILD245): 곧은 검은 물길 + 가운데 트리거(한 번) → 요플래 혼잣말 나레이션 10줄(네 번째 “... ... ...” 뒤 느낌표), 문(찢칠라 길 2 ↔ 생각 길 → 굽은 물길), QA.
//   굽은 물길(사용자 “다음맵도 만들고”, 내용 브리핑 없음): 오른쪽 → 아래 → 오른쪽, 사건·소품 없음, 오른쪽 끝은 통로만
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { jjajang_think } from '../../src/data/cutscenes/jjajang_think.js';
import { jjajang_stele1, jjajang_stele2, jjajang_stele3, jjajang_stele4, jjajang_stele5, STELE_SCRIPTS } from '../../src/data/cutscenes/jjajang_stele.js';
import { SCRIPTS } from '../../src/data/scripts.js';
import { QA_POINTS, storyBgm, JJAJANG_AFTER_JOIN_MAPS } from '../../src/core/story.js';

const load = id => JSON.parse(readFileSync(new URL(`../../assets/maps/${id}.json`, import.meta.url), 'utf8'));
const think = load('jjajang_think'), bend = load('jjajang_bend2'), chin2 = load('jjajang_chin2');
const walk = (m, c, r) => m.rows[r]?.[c] === '*' || m.rows[r]?.[c] === '+';

test('test_think_map_is_a_straight_road_with_a_mid_trigger_and_doors', () => {
  const W = think.rows[0].length, [r0, r1] = [8, 9];
  for (let c = 0; c < W; c++) assert.ok(walk(think, c, r0) && walk(think, c, r1), `길 ${c}`);
  assert.ok(!walk(think, 30, r0 - 1) && !walk(think, 30, r1 + 1), '길 밖은 숲');
  const trig = think.entities.find(e => e.id === 'think_trigger');
  assert.deepEqual({ script: trig.script, once: trig.once, flag: trig.flag, unless: trig.unless, y: trig.y, h: trig.h }, { script: 'jjajang_think', once: true, flag: 'think_started', unless: 'think_done', y: r0 * 32, h: 64 });
  assert.ok(Math.abs(trig.x + trig.w / 2 - W * 32 / 2) <= 64, '맵 가운데쯤(오른쪽으로 쭉 걷다가 중간에)');
  assert.ok(think.spawns.before_think.x < trig.x && think.spawns.from_west.x < trig.x, 'QA 스폰은 트리거 앞');
  const west = think.entities.find(e => e.id === 'think_chin2_door'), east = think.entities.find(e => e.id === 'think_bend2_door');
  assert.deepEqual([west.to, west.spawn, west.x], ['jjajang_chin2', 'from_east', 0]);
  assert.deepEqual([east.to, east.spawn, east.x], ['jjajang_bend2', 'from_west', W * 32 - 10]);
  const c2 = chin2.entities.find(e => e.id === 'jjajang_chin2_east_door'); assert.deepEqual([c2.to, c2.spawn], ['jjajang_think', 'from_west']);
  assert.ok(chin2.spawns.from_east && chin2.spawns.from_east.facing === 'left');
  assert.equal(think.bgm, 'my_castle_town');
  for (const id of ['jjajang_think', 'jjajang_bend2']) { assert.ok(JJAJANG_AFTER_JOIN_MAPS.includes(id), id); assert.equal(storyBgm(id, { torii_janitor_joined: true, janitor_left: true }), 'my_castle_town'); }
  assert.ok(!think.entities.some(e => e.type === 'prop' && !/jjajang_pine_/.test(e.image || '')), '소품은 소나무뿐(지어내지 않음)');
});

test('test_think_monologue_follows_the_brief_with_an_exclamation_after_the_fourth_line', () => {
  const s = jjajang_think; assert.equal(SCRIPTS.jjajang_think, s);
  const texts = s.filter(n => n.text).map(n => n.text.replace(/^\* /, ''));
  assert.deepEqual(texts, ['아 근데 난 뭘 하고 있는거지', '궁극적으로는 난 다시 동료들과 합류해야한다.', '나의 위치를 알릴 수 있는 방법이 무엇이 있지?', '... ... ...',
    '짜장숲의 깊은곳으로 들어가는곳을 봉인한 것은 아마도 영클일 것이다.', '그정도 지능이라면, 봉인이 풀렸을때도 감지할 수 있게 만들지 않았을까.', '봉인을 푸는건 위험할수도 있겠지만, 지금 선택지가 그거밖에 없는듯하다.',
    '어떻게하면 그 동상을 부술 수 있을까.', '...청소ㅂ.. 아니 아빠에게 조언을 구해야될 것 같다. 어디계시지', '일단 오른쪽으로 쭉 가보자.'], '나레이션 원문 그대로');
  assert.ok(s.filter(n => n.text).every(n => n.voice === 'narrator' && !n.speaker), '전부 나레이션');
  const ti = s.map((n, i) => (n.text ? i : -1)).filter(i => i >= 0), bang = s.findIndex(n => n.emote === 'player' && n.kind === '!');
  assert.ok(ti[3] < bang && bang < ti[4], '네 번째 줄 뒤, 다섯 번째 줄 앞에 요플래 느낌표');
  assert.ok(s.slice(ti[3] + 1, bang).some(n => n.action), '느낌표 전에 대화창을 닫는다');
  const done = s.findIndex(n => n.set?.think_done); assert.ok(done > ti[9] && !!s[0].if({ think_done: true }) && !s[0].if({}), '끝나면 플래그, 두 번은 안 한다');
  assert.ok(!s.some(n => 'bgm' in n), '브금은 지정 없음 → 그대로');
});

test('test_bend2_is_a_right_down_right_water_road_with_no_events', () => {
  const W = bend.rows[0].length, { downCols: [d0, d1], lowerRows: [l0, l1] } = bend.meta.bend, [u0, u1] = [6, 7];
  for (let c = 0; c <= d1; c++) assert.ok(walk(bend, c, u0) && walk(bend, c, u1), `윗길 ${c}`);
  for (let r = u0; r <= l1; r++) assert.ok(walk(bend, d0, r) && walk(bend, d1, r), `내려가는 길 ${r}`);
  for (let c = d0; c < W; c++) assert.ok(walk(bend, c, l0) && walk(bend, c, l1), `아랫길 ${c}`);
  assert.ok(!walk(bend, d1 + 2, u0) && !walk(bend, d0 - 2, l0) && !walk(bend, 20, u1 + 1), '길 밖은 숲');
  assert.equal(bend.rows[u0][0], '+'); assert.equal(bend.rows[l0][W - 1], '+');
  const west = bend.entities.find(e => e.type === 'door'); assert.deepEqual([west.to, west.spawn, west.x], ['jjajang_think', 'from_east', 0]);
  assert.equal(bend.entities.filter(e => e.type === 'door').length, 1, '오른쪽은 통로만(다음 맵 브리핑 대기)');
  assert.ok(!bend.entities.some(e => e.type === 'trigger' || e.type === 'enemy' || e.type === 'npc'), '적·트리거는 지어내지 않는다');
  assert.ok(Math.floor(bend.spawns.from_east.y / 32) === l0 && Math.floor(bend.spawns.from_west.y / 32) === u0);
  const qa = id => QA_POINTS.find(p => p.id === id);
  assert.deepEqual(qa('jjajang_think').party, []); assert.equal(qa('jjajang_think_mid').spawn, 'before_think'); assert.ok(qa('jjajang_bend2').flags.think_done);
});

test('test_bend2_has_five_readable_steles_evenly_spaced_above_the_road', () => {
  const steles = bend.entities.filter(e => /^jjajang_stele\d$/.test(e.id || ''));
  assert.equal(steles.length, 5, '비석 다섯');
  const [u0, u1] = [6, 7], { lowerRows: [l0] } = bend.meta.bend;
  const cols = steles.map(e => Math.floor((e.x + 12) / 32));
  assert.deepEqual(cols, bend.meta.steles, '맵 meta 와 같은 자리');
  const upper = steles.slice(0, 3), lower = steles.slice(3);
  for (const e of upper) assert.equal(Math.floor((e.y + 6) / 32), u0 - 1, '윗길 바로 위 칸');
  for (const e of lower) assert.equal(Math.floor((e.y + 6) / 32), l0 - 1, '아랫길 바로 위 칸');
  const gaps = [...upper, ...lower].slice(1).map((e, i) => cols[i + 1] - cols[i]).filter((g, i) => i !== 2);
  assert.ok(gaps.every(g => g === gaps[0]), `간격이 같다 ${gaps}`);
  for (const e of steles) {
    assert.ok(e.solid && e.script === e.id && existsSync(new URL('../../' + e.image, import.meta.url)), `${e.id}: 막히고 C 로 읽는다`);
    const img = bend.meta.steleSize || [43, 92];
    assert.ok(e.ix <= e.x && e.ix + img[0] >= e.x + e.w && e.iy + img[1] === e.y + e.h, `${e.id}: 히트박스는 그림 폭 안, 그림 밑변 = 히트박스 밑변`);
    assert.ok(img[1] > 60, '비석은 주인공보다 크다(가려지지 않게)');
    assert.ok(bend.rows[Math.floor((e.y + 6) / 32) + 1][Math.floor((e.x + 12) / 32)] === '*', `${e.id}: 바로 아래가 길이라 읽을 수 있다`);
  }
  for (const name of STELE_SCRIPTS) assert.ok(SCRIPTS[name], name);
  const texts = arr => arr.map(n => n.text.replace(/^\* /, ''));
  assert.deepEqual(texts(jjajang_stele1), ['과거 붉은군단과 파란악마가 격돌했다', '붉은 군단은 혁명을 일으켰지만 결국 실패하고 말았다']);
  assert.deepEqual(texts(jjajang_stele2), ['드럼통의 악마는 더욱 강해져갔다', '그를 막을 방법은 아무도 없었다']);
  assert.deepEqual(texts(jjajang_stele3), ['전설의 붉은 깃발의 용사가 있었다.', '그가 마지막 영웅이였으며 모두의 희망이였다.']);
  assert.deepEqual(texts(jjajang_stele4), ['그러나 결국 실패하고 말았다.', '계엄을 실패한 것이다.']);
  assert.deepEqual(texts(jjajang_stele5), ['...', '야이씨발년아 씹구멍쑤ㅅ..', '... 그 뒤에 내용이 갈기갈기 찢어져있다 .'], '다섯 번째는 찢어진 뒤 나레이션 한 줄 더');
  for (const arr of [jjajang_stele1, jjajang_stele2, jjajang_stele3, jjajang_stele4, jjajang_stele5]) assert.ok(arr.every(n => n.voice === 'narrator' && !n.speaker), '비석 글은 나레이션');
});
