// 찢칠라 길 1·2(jjajang_chin1, jjajang_chin2) — 파란 토리이 달리기 시작 + 되돌아가기 금지 (BUILD242 사용자 브리핑 2026-09-19, 원문 design/narrative/cutscenes/jjajang_chin.md)
//   토리이를 오른쪽으로 지나면 맵 meta.runs.<id> 설정으로 러너(장애물). 찢칠라는 맵의 enemy 엔티티(표준 조우)라 컷신이 없다.
//   길 1 왼쪽 가장자리(16px 트리거, 매번): “지금은 그럴때가 아닌것같다.” 나레이션 뒤 오른쪽으로 한 칸 — 사용자 “뒤로는 못감 … 채팅으로 … 뒤로 한발짝”
const N = text => ({ voice: 'narrator', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const PLAYER = 'player';
export const NO_RETURN_LINE = '지금은 그럴때가 아닌것같다.';

const startRun = id => ({ action: game => {
  const cfg = game.map?.def?.meta?.runs?.[id];
  if (!cfg || game.runner) return;
  if ((cfg.dir < 0 ? 'left' : 'right') !== game.player.facing) return;
  game.startRunner({ ...cfg, id });
} });

export const jjajang_chin_start_a = [startRun('a'), { end: true }];
export const jjajang_chin_start_b = [startRun('b'), { end: true }];

export const jjajang_no_return = [
  { face: PLAYER, dir: 'left' },
  N(NO_RETURN_LINE),
  close,
  { move: PLAYER, by: [32, 0], speed: 60 },   // by 는 픽셀: 한 칸(32px) 오른쪽
  { face: PLAYER, dir: 'right' },
  { end: true },
];
