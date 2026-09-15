// 동료 따라가기 방향 안정화(BUILD174): 대각선 발자국(dx≈dy)에서 축이 프레임마다 뒤집혀 좌/위·우/아래로 떨리던 버그
import test from 'node:test';
import assert from 'node:assert/strict';
import { steadyFacing } from '../../src/world/facing.js';

test('test_steadyFacing_keeps_the_current_axis_on_a_diagonal_and_flips_only_when_the_other_axis_dominates', () => {
  // 대각선(1:1)에선 어느 축을 보고 있든 그대로
  assert.equal(steadyFacing('right', 5, 5), 'right'); assert.equal(steadyFacing('down', 5, 5), 'down');
  assert.equal(steadyFacing('left', -5.1, 4.9), 'left'); assert.equal(steadyFacing('up', 4.9, -5.1), 'up');
  // 프레임마다 dx/dy 가 살짝 엇갈려도 흔들리지 않는다
  let facing = 'right';
  const deltas = [[5, 5.2], [5.2, 5], [4.9, 5.3], [5.1, 4.8], [5, 5.4], [5.3, 5]];
  for (const [dx, dy] of deltas) facing = steadyFacing(facing, dx, dy);
  assert.equal(facing, 'right');
  // 다른 축이 1.5배 이상 커지면 바뀐다
  assert.equal(steadyFacing('right', 3, 8), 'down'); assert.equal(steadyFacing('down', 8, -3), 'right'); assert.equal(steadyFacing('up', -9, 2), 'left');
  // 같은 축 안에서는 부호를 바로 따른다
  assert.equal(steadyFacing('right', -4, 1), 'left'); assert.equal(steadyFacing('up', 1, 4), 'down');
  // 멈춤(0,0)은 그대로
  assert.equal(steadyFacing('left', 0, 0), 'left');
});
