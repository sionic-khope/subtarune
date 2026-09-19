// 파란 토리이 길(jjajang_run) — 기둥 사이를 오른쪽으로 지나면 러너 기믹 시작 (BUILD230 사용자 브리핑 2026-09-19, 원문은 design/narrative/cutscenes/jjajang_run.md)
//   컷신 대사는 없다: 상태기계(src/world/runner-core.js)가 준비 동작(땅 짚고 검 뽑기)부터 대시·달리기·제동까지 맡는다. 트리거는 once 가 아니라 “지날 때마다”, 왼쪽으로 되돌아 지날 땐 안 켠다
//   BUILD235: 토리이 앞 청소부 연출(jjajang_run_intro: 대사 10줄 → 껄껄 뒤 웃음 → 휘리릭 사라짐) + 달리기 끝 연출(jjajang_run_outro: 오른쪽에서 천천히 걸어와 대사 3줄 → 동료 복귀)
const C = text => ({ speaker: '청소부', portrait: 'janitor', voice: 'janitor', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const laugh = () => ({ motion: JANITOR, name: 'laugh', sfx: 'laugh_janitor' });
const PLAYER = 'player';
const JANITOR = 'janitor';
// 달리기 끝 연출: 청소부가 오른쪽(화면 밖)에서 요플래 오른쪽 한 칸 반까지 천천히 걸어온다
export const OUTRO_WALK_FROM = 300;
export const OUTRO_STOP_GAP = 48;
export const OUTRO_WALK_SPEED = 40;

export const jjajang_run_start = [
  { action: game => { if (!game.runner && game.player.facing === 'right') game.startRunner(); } },
  { end: true },
];

// 토리이 앞(사용자 브리핑 2026-09-19): 대사 그대로, “껄껄 이런느낌일새..” 뒤 웃음 → 마지막 줄 “이따보게”(BUILD239 사용자 정정: 이따보게를 마지막에) → (청소부가 갑자기 휘리릭 하고 사라진다)
export const jjajang_run_intro = [
  { if: flags => flags.run_intro_done || !flags.torii_janitor_joined, goto: 'end' },
  { face: JANITOR, dir: 'toward:player' },
  { face: PLAYER, dir: 'toward:janitor' },
  C('파란 토리이'),
  C('토리이는 신과 인간의 세계를 나누는 경계, 뭐 대강 경계의 표시일새'),
  C('영적 결계의 의미를 담고있지만, 빠르게 달린다면'),
  C('그 결계의 효과를 뚫는다나 뭐라나'),
  C('사실 별볼일없는 전설일뿐이고 그냥 지나가면 되는거지만'),
  C('한번 아까 말했던 검을 너무 크게 경직되게 휘두른다를 생각해보세'),
  C('몸놀림을 더 가볍게, 검을 가볍게 움직여보는건 어떻겠는가'),
  C('그렇게되면, 도착지까지 더욱 빨리 가는 방법을 배울수있을지도 모르지'),
  C('말이 너무 어렵다고? 껄껄 이런느낌일새..'),
  laugh(),
  C('기억하게, 호리이를 지나면, 결계를 뚫는다는 느낌으로 빠르게 달려보는거라네'),
  C('이따보게'),
  close,
  // 휘리릭: 휘융 소리와 함께 왼쪽 위로 확 밀리며 사라진다(러너가 끝나면 outro 가 다시 데려온다)
  { parallel: [{ sfx: 'wing' }, { slide: JANITOR, by: [-36, -14], duration: 0.14 }] },
  { hide: JANITOR },
  { set: { run_intro_done: true } },
  { face: PLAYER, dir: 'right' },
  { label: 'end' },
  { end: true },
];

// 달리기가 멈춘 뒤(runner.finish → meta.run.outro): 청소부가 오른쪽에서 왼쪽으로 천천히 걸어온다 → 대사 그대로(“껄껄” 두 곳 뒤 웃음) → (다시 청소부 뒤로 동료 합류)
export const jjajang_run_outro = [
  { if: flags => flags.run_outro_done || !flags.torii_janitor_joined, goto: 'end' },
  { hide: JANITOR },
  { move: JANITOR, px: game => [game.player.x + OUTRO_WALK_FROM, game.player.y], exact: true, speed: 4000 },
  { face: JANITOR, dir: 'left' },
  { face: PLAYER, dir: 'right' },
  { show: JANITOR },
  { move: JANITOR, px: game => [game.player.x + OUTRO_STOP_GAP, game.player.y], exact: true, speed: OUTRO_WALK_SPEED, footsteps: true },
  { face: JANITOR, dir: 'left' },
  { wait: 0.3 },
  C('껄껄'),
  laugh(),
  C('어떤가 무슨 느낌인지 알았나?'),
  C('c로 검을 휘두르고 x로 점프를하면 된다네,'),
  C('껄껄 점프하면서 공격할수도 있겠지. 뭐 일단 이어서 가보새'),
  laugh(),
  close,
  { set: { run_outro_done: true } },
  { regroup: true },
  { label: 'end' },
  { end: true },
];
