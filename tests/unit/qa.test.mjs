// QA 바로가기·상태 관리 감사 (2026-09-10 사용자 "qa 로 건너뛰었다가 이어하기 누르면 형섭 하나만 나오는 버그 — 상태관리 완벽하게").
//   QA 지점의 party 는 가입 플래그(PARTY_FLAGS)와 일치해야 한다: 플래그가 섰으면 그 동료가 있고, 동료가 있으면 플래그가 서 있다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { QA_POINTS, STAGES, PARTY_FLAGS, partyFromFlags, Story } from '../../src/core/story.js';
import fs from 'node:fs';

test('test_qa_points_party_matches_join_flags', () => {
  for (const pt of QA_POINTS) {
    const derived = partyFromFlags(pt.flags || {});
    const party = pt.party || derived;
    assert.deepEqual([...party].sort(), [...derived].sort(), `QA '${pt.id}': party ${JSON.stringify(party)} vs 가입 플래그로 유도한 ${JSON.stringify(derived)} (flags 에 ${PARTY_FLAGS.map(([f]) => f).join('/')} 확인)`);
  }
});
test('test_qa_points_ids_unique_and_stage_known', () => {
  const ids = new Set();
  for (const pt of QA_POINTS) {
    assert.ok(!ids.has(pt.id), `QA id 중복 ${pt.id}`); ids.add(pt.id);
    assert.ok(Story.isStage(pt.stage), `QA '${pt.id}': 모르는 단계 ${pt.stage}`);
    assert.ok(pt.map && pt.spawn, `QA '${pt.id}': map/spawn`);
  }
  assert.equal(STAGES[0].id, 'start');
});
test('test_party_from_flags_walk_order_gyeongsub_then_ppaman', () => {
  assert.deepEqual(partyFromFlags({}), []);
  assert.deepEqual(partyFromFlags({ ppaman_joined: true }), ['ppaman']);
  assert.deepEqual(partyFromFlags({ void11_done: true, ppaman_joined: true }), ['gyeongsub', 'ppaman']);
});
test('test_qa_points_map_and_spawn_exist_in_json_maps', () => {
  for (const pt of QA_POINTS) {
    const url = new URL(`../../assets/maps/${pt.map}.json`, import.meta.url);
    if (!fs.existsSync(url)) continue;                                            // 코드 맵(방·거실)은 src/data/maps.js
    const m = JSON.parse(fs.readFileSync(url, 'utf8'));
    assert.ok(m.spawns?.[pt.spawn], `QA '${pt.id}': ${pt.map} 에 스폰 '${pt.spawn}' 없음`);
  }
});
