// ─────────────────────────────────────────────────────────────
// 발소리 목록 (2026-09-12 사용자 "그 발소리 다 쓰라는 뜻이었다", "영상 소리 그대로 나오게 개별 파일을 잘 다듬어라").
//   걸음마다 이 중 하나를 골라 그대로 재생한다(타일 `step` 이 배열이면 랜덤 — src/world/tiles.js, Player.footstep). **음높이는 건드리지 않는다.**
//   자른 방식: 온셋을 찾고 **어택 앞까지 되짚어** 시작점을 잡고(그 걸음 피크의 3%), 다음 걸음 직전까지가 끝.
//     앞 1.5ms·뒤 10ms 페이드(클릭만 방지), **세트 전체에 같은 배율 한 번**(걸음마다의 세기 차이는 원본 그대로 — 낱개 정규화는 영상과 다르게 들린다).
//   한 파일 안에서 구간만 재생하는 방식은 금지: 브라우저가 mp3 의 `currentTime` 을 무시해 걸음마다 파일 맨 앞의 같은 소리만 났다("걸음소리 더 이상함").
// ─────────────────────────────────────────────────────────────

/** 물걸음 사운드 33개 — 델타룬 walking 효과음(youtube 1jZCrBnRm88)의 걸음 전부. 길이 98~230ms, 피크 0.11~0.85 */
export const WATER_STEP_SFX = [
  'water_step01', 'water_step02', 'water_step03', 'water_step04', 'water_step05', 'water_step06',
  'water_step07', 'water_step08', 'water_step09', 'water_step10', 'water_step11', 'water_step12',
  'water_step13', 'water_step14', 'water_step15', 'water_step16', 'water_step17', 'water_step18',
  'water_step19', 'water_step20', 'water_step21', 'water_step22', 'water_step23', 'water_step24',
  'water_step25', 'water_step26', 'water_step27', 'water_step28', 'water_step29', 'water_step30',
  'water_step31', 'water_step32', 'water_step33',
];
