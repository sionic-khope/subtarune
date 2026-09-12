// ─────────────────────────────────────────────────────────────
// 발소리 목록 (2026-09-12 사용자 "발소리 다 쓰라", "영상 소리 그대로", "각각의 발소리가 에코가 있는데 끊긴다").
//   걸음마다 이 중 하나를 골라 **그대로** 재생한다(타일 `step` 이 배열이면 랜덤 — src/world/tiles.js, Player.footstep). 음높이·세기 안 건드림.
//   원본은 걸음이 0.07~0.27초 간격으로 이어져 **어느 걸음도 울림이 온전하지 않다**(다음 걸음에 가려짐). 잘라 붙인 꼬리는 세 번 "끊긴다".
//   사용자 "그냥 이거처럼 새로 만들면 안 되나" → 걸음마다 **영상 소리를 본떠 새로 렌더링**(생성기 tools/audio/water_steps.py):
//     그 걸음의 첫 찰싹(영상 그대로, ~100ms) ⊛ 방 임펄스 응답(영상에서 잰 감쇠 -43dB/s·음색·50ms 차오름, 울림 세기는 원본 레벨로 걸음마다 보정).
//     원본과 포락선 오차 평균 2.2dB. -72dBFS 까지 0.95~1.04초.
//   한 파일 안에서 구간만 재생하는 방식은 금지(브라우저가 mp3 `currentTime` 을 무시한다).
// ─────────────────────────────────────────────────────────────

/** 물걸음 사운드 33개 — 델타룬 walking 효과음(youtube 1jZCrBnRm88)의 걸음 전부를 새로 렌더링. 울림까지 0.95~1.04초 */
export const WATER_STEP_SFX = [
  'water_step01', 'water_step02', 'water_step03', 'water_step04', 'water_step05', 'water_step06',
  'water_step07', 'water_step08', 'water_step09', 'water_step10', 'water_step11', 'water_step12',
  'water_step13', 'water_step14', 'water_step15', 'water_step16', 'water_step17', 'water_step18',
  'water_step19', 'water_step20', 'water_step21', 'water_step22', 'water_step23', 'water_step24',
  'water_step25', 'water_step26', 'water_step27', 'water_step28', 'water_step29', 'water_step30',
  'water_step31', 'water_step32', 'water_step33',
];
