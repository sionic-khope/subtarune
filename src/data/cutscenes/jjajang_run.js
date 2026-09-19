// 파란 토리이 길(jjajang_run) — 기둥 사이를 오른쪽으로 지나면 러너 기믹 시작 (BUILD230 사용자 브리핑 2026-09-19, 원문은 design/narrative/cutscenes/jjajang_run.md)
//   컷신 대사는 없다: 상태기계(src/world/runner-core.js)가 준비 동작(땅 짚고 검 뽑기)부터 대시·달리기·제동까지 맡는다. 트리거는 once 가 아니라 “지날 때마다”, 왼쪽으로 되돌아 지날 땐 안 켠다
export const jjajang_run_start = [
  { action: game => { if (!game.runner && game.player.facing === 'right') game.startRunner(); } },
  { end: true },
];
