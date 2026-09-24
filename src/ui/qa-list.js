/** QA 목록 커서 이동(순수): wrap=한 칸씩 누를 때 끝에서 반대쪽으로, 연속·페이지 이동은 끝에서 멈춘다. */
export function qaStep(i, n, delta, wrap) {
  if (n <= 0) return 0;
  if (wrap) return ((i + delta) % n + n) % n;
  return Math.max(0, Math.min(n - 1, i + delta));
}
