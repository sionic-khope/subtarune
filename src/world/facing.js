// 따라가기 방향 안정화(BUILD174 사용자: 대각선으로 걸으면 동료가 좌/위·우/아래로 매 프레임 바뀌며 버벅인다).
// 대각선 발자국은 dx·dy 가 거의 같아 어느 축이 큰지가 프레임마다 뒤집힌다 → 지금 보는 축을 유지하다가 다른 축이 bias 배 이상 커질 때만 바꾼다.
/**
 * @param {'up'|'down'|'left'|'right'} current 지금 보는 방향
 * @param {number} dx 이번 이동 x
 * @param {number} dy 이번 이동 y
 * @param {number} bias 축을 바꾸려면 다른 축이 이만큼 커야 한다(1.5 = 대각선(1:1)에선 절대 안 바뀜)
 */
export function steadyFacing(current, dx, dy, bias = 1.5) {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  const horizontal = current === 'left' || current === 'right';
  const useX = horizontal ? ax * bias >= ay : ax >= ay * bias;
  if (useX) return dx > 0 ? 'right' : dx < 0 ? 'left' : current;
  return dy > 0 ? 'down' : dy < 0 ? 'up' : current;
}
