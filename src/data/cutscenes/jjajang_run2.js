// 토리이 굽이 길(jjajang_run2) — 세 토리이 달리기 + 장애물 (BUILD236 사용자 브리핑 2026-09-19, 원문은 design/narrative/cutscenes/jjajang_run2.md)
//   들어서면 청소부: 껄껄 이번에도 한번 잘 해보게 그럼 이따보게 → 휘리릭 사라짐. 토리이 a(오른쪽)·b(왼쪽)·c(오른쪽)를 지나면 그 방향으로 러너(장애물 있음).
//   c 달리기가 끝나면 청소부가 오른쪽에서 걸어와 다시 뒤에 합류(대사 없음 — 브리핑에 없음)
const C = text => ({ speaker: '청소부', portrait: 'janitor', voice: 'janitor', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const laugh = () => ({ motion: JANITOR, name: 'laugh', sfx: 'laugh_janitor' });
const PLAYER = 'player';
const JANITOR = 'janitor';
const OUTRO_WALK_FROM = 300;
const OUTRO_STOP_GAP = 48;
const OUTRO_WALK_SPEED = 40;

const startRun = id => ({ action: game => {
  const cfg = game.map?.def?.meta?.runs?.[id];
  if (!cfg || game.runner) return;
  if ((cfg.dir < 0 ? 'left' : 'right') !== game.player.facing) return;   // 그 토리이를 그 방향으로 지날 때만
  game.startRunner({ ...cfg, id });
} });

export const jjajang_run2_enter = [
  { if: flags => flags.run2_enter_done || !flags.torii_janitor_joined, goto: 'end' },
  { face: JANITOR, dir: 'toward:player' },
  { face: PLAYER, dir: 'toward:janitor' },
  C('껄껄 이번에도 한번 잘 해보게 그럼 이따보게'),
  laugh(),
  close,
  { parallel: [{ sfx: 'wing' }, { slide: JANITOR, by: [-36, -14], duration: 0.14 }] },
  { hide: JANITOR },
  { set: { run2_enter_done: true } },
  { face: PLAYER, dir: 'right' },
  { label: 'end' },
  { end: true },
];

export const jjajang_run2_start_a = [startRun('a'), { end: true }];
export const jjajang_run2_start_b = [startRun('b'), { end: true }];
export const jjajang_run2_start_c = [startRun('c'), { end: true }];

// 맵 끝(c 달리기 뒤): 청소부가 오른쪽 화면 밖에서 천천히 걸어와 요플래 앞에 선 뒤 다시 동료로
export const jjajang_run2_outro = [
  { if: flags => flags.run2_outro_done || !flags.torii_janitor_joined, goto: 'end' },
  { hide: JANITOR },
  { move: JANITOR, px: game => [game.player.x + OUTRO_WALK_FROM, game.player.y], exact: true, speed: 4000 },
  { face: JANITOR, dir: 'left' },
  { face: PLAYER, dir: 'right' },
  { show: JANITOR },
  { move: JANITOR, px: game => [game.player.x + OUTRO_STOP_GAP, game.player.y], exact: true, speed: OUTRO_WALK_SPEED, footsteps: true },
  { face: JANITOR, dir: 'left' },
  { wait: 0.4 },
  { set: { run2_outro_done: true } },
  { regroup: true },
  { label: 'end' },
  { end: true },
];
