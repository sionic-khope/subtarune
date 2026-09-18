// 영클의 마녀재판 B(2026-09-18 사용자 브리핑): 두 번째 사건은 따뜻한비데 부당 해고, 선택지 3개(3번이 정답 자리), 우는 따뜻한비데 그림이 사건별 피해자로 붙는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { YOUNGCLE_TRIAL } from '../../src/battle/modes/tvform-special.js';
import { YOUNGCLE_SPECIAL } from '../../src/data/youngcle-special.js';

test('test_trial_b_case_is_bidet_dismissal_with_third_choice_and_crying_bidet', () => {
  // Arrange
  const cases = YOUNGCLE_TRIAL.cases;
  // Act
  const b = cases[1];
  // Assert
  assert.equal(cases.length, 2);
  assert.ok(b.chargeLines.join('').includes('따뜻한비데') && b.chargeLines.join('').includes('정당한 해고사유없이'));
  assert.deepEqual(b.choices, ['맞습니다', '비데 애미창년아 그걸꼰지르냐', '너네엄마가 사장이였어도 잘랐을거다 꼬라지를 봐라']);
  assert.equal(b.highlight, '따뜻한비데');
  assert.equal(b.victim, 'assets/illustrations/warm-bidet-cry.png');
  assert.ok(fs.existsSync(b.victim), '우는 따뜻한비데 그림이 있어야 한다');
  assert.ok(YOUNGCLE_SPECIAL.variants.includes('trial') && YOUNGCLE_SPECIAL.variants.includes('subrio'));
});
