// 이어하기 목록(BUILD437): 도달한 QA 지점만 보여 준다 — 어떤 지점의 상태에서도 그보다 뒤 지점을 도달로 치면 안 된다(미래 지점 노출).
import test from 'node:test';
import assert from 'node:assert/strict';
import { QA_POINTS, Story, qaProgress } from '../../src/core/story.js';

const MENU = QA_POINTS.filter((p) => !p.hidden);

test('qaProgress never counts a later QA point as reached from any point state', () => {
  const ahead = [];
  MENU.forEach((pt, k) => {
    const flags = { ...(pt.flags || {}) };
    const story = new Story(flags);
    if (pt.stage) story.advance(pt.stage);
    const got = qaProgress(flags, story.stage, pt.map);
    if (got > k) ahead.push(`${pt.id}(${k}) -> ${MENU[got].id}(${got})`);
  });
  assert.deepEqual(ahead, []);
});

test('qaProgress reaches most points exactly and returns -1 off the list', () => {
  let exact = 0;
  MENU.forEach((pt, k) => {
    const flags = { ...(pt.flags || {}) };
    const story = new Story(flags);
    if (pt.stage) story.advance(pt.stage);
    if (qaProgress(flags, story.stage, pt.map) === k) exact++;
  });
  assert.ok(exact >= MENU.length * 0.75, `exact ${exact}/${MENU.length}`);
  assert.equal(qaProgress({}, null, 'no_such_map'), -1);
});
