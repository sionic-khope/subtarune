// 벚꽃 숲 10(jjajang_sakura10) 파란 토리이 10초 달리기(장애물 없음) + 절벽 오르막 도약 → 벚꽃 숲 11 나무 정상 착지(BUILD283 사용자 브리핑 2026-09-21, 원문·구현표 design/narrative/cutscenes/jjajang_sakura10.md)
//   달리기·오르막·도약(점프 소리)·잔상 슬로우 6초(꽃잎)·낙하는 러너(src/world/runner-core.js finale, 맵 meta.runs.a.finale)가 하고,
//   낙하가 끝나면 맵 meta.runs.a.outro 로 이 outro 가 이어진다: 어둡게 → 벚꽃 숲 11 → 밝아지며 위에서 떨어져 착지(쿵·살짝 흔들림) → 조작 복귀.
//   규칙: 대사 없음(브리핑에 없음). 착지 연출은 “떨어져서 다음 맵으로 전환”의 이어지는 반쪽으로 잠정(대사·추가 연출 없이 착지만).
export const LANDING = { height: 240, duration: 0.6, land: 'thud', quake: 3 };   // 240: 화면 위 끝(카메라 가운데 기준 발 −180)에서 바로 보이며 떨어진다(340 이면 대부분 화면 밖에서 떨어져 마지막만 보였다)
export const FADE_OUT = 0.35;
export const FADE_IN = 0.3;

/** 파란 토리이를 왼쪽으로 지나면 러너 시작(맵 meta.runs.a: dir −1, 장애물 없음, finale 절벽 도약, outro 이 파일) */
const startRun = id => ({ action: game => {
  const cfg = game.map?.def?.meta?.runs?.[id];
  if (!cfg || game.runner) return;
  game.startRunner({ ...cfg, id });
} });
export const jjajang_sakura10_start = [startRun('a'), { end: true }];

/** 낙하 뒤(러너 finish → cfg.outro): 어둡게 → 나무 정상 → 위에서 떨어져 착지 */
export const jjajang_sakura10_outro = [
  { fade: 'out', duration: FADE_OUT },
  { map: 'jjajang_sakura11', spawn: 'landing' },
  // 밝아지는 동안 이미 위에서 떨어지고 있다(“떨어져서 다음 맵으로 전환”의 이어지는 반쪽) — {map} 은 instant 라 밝히기는 여기서
  { parallel: [{ fade: 'in', duration: FADE_IN }, { drop: 'player', height: LANDING.height, duration: LANDING.duration, sfx: false, land: LANDING.land, quake: LANDING.quake }] },
  { wait: 0.25 },
  { end: true },
];
