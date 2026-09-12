// ─────────────────────────────────────────────────────────────
// 발소리 목록 (2026-09-12 사용자 "발소리 다 쓰라", "영상 소리 그대로", "각각의 발소리가 에코가 있는데 끊긴다").
//   걸음마다 이 중 하나를 골라 **그대로** 재생한다(타일 `step` 이 배열이면 랜덤 — src/world/tiles.js, Player.footstep). 음높이·세기 안 건드림.
//   원본은 걸음이 0.10~0.23초 간격으로 이어져 **모든 걸음의 잔향이 다음 걸음에 가려져 있다**(온전한 건 마지막 하나뿐).
//   그래서 각 걸음은 [다음 걸음 직전까지의 진짜 소리] + [같은 방의 잔향을 이어 붙인 꼬리] 로 만든다:
//     잔향 조각은 **마지막 걸음의 잔향 구간**(같은 녹음·같은 방), 감쇠는 거기서 잰 -109dB/s(RT60 0.55초), -52dB 까지.
//   한 파일 안에서 구간만 재생하는 방식은 금지(브라우저가 mp3 `currentTime` 을 무시한다).
// ─────────────────────────────────────────────────────────────

/** 물걸음 사운드 33개 — 델타룬 walking 효과음(youtube 1jZCrBnRm88)의 걸음 전부. 잔향까지 292~498ms */
export const WATER_STEP_SFX = [
  'water_step01', 'water_step02', 'water_step03', 'water_step04', 'water_step05', 'water_step06',
  'water_step07', 'water_step08', 'water_step09', 'water_step10', 'water_step11', 'water_step12',
  'water_step13', 'water_step14', 'water_step15', 'water_step16', 'water_step17', 'water_step18',
  'water_step19', 'water_step20', 'water_step21', 'water_step22', 'water_step23', 'water_step24',
  'water_step25', 'water_step26', 'water_step27', 'water_step28', 'water_step29', 'water_step30',
  'water_step31', 'water_step32', 'water_step33',
];
