// 드럼통 길(jjajang_drum) — 청소부 이별 (BUILD242 사용자 브리핑 2026-09-19, 원문·구현표는 design/narrative/cutscenes/jjajang_drum.md)
//   드럼통 앞(30~31열)에 가면: 청소부 ...(말풍선) → 대사 6줄(“뭐 껄껄 어쩔수없는거 아닌가” 뒤 웃음) → “아 먼저 가보겠나 난 이걸 좀 보다 가야겠으니.” →
//   청소부는 동료에서 빠져 드럼통 아래 NPC 로 남아 위(드럼통)를 본다 → 요플래가 청소부를 좀 바라보다가 혼자 오른쪽으로 걸어 맵 밖으로(카메라는 청소부에 남는다) →
//   혼자 남은 청소부: 전우들이여 / 미안하네 / ...(말풍선) → 페이드 아웃 → 형섭 혼자 다음 맵(jjajang_chin1) 왼쪽 → 페이드 인. 그 뒤로는 되돌아갈 수 없다(jjajang_chin.js no_return)
const C = text => ({ speaker: '청소부', portrait: 'janitor', voice: 'janitor', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const laugh = () => ({ motion: JANITOR, name: 'laugh', sfx: 'laugh_janitor' });
const PLAYER = 'player';
const JANITOR = 'janitor';
const DRUM = 'jjajang_drum';
export const NEXT_MAP = 'jjajang_chin1';
export const LOOK_AT_JANITOR = 1.6;   // 요플래가 청소부를 바라보는 시간(초)

export const jjajang_drum_talk = [
  { if: flags => flags.drum_talk_done || flags.janitor_left || !flags.torii_janitor_joined, goto: 'end' },
  { face: JANITOR, dir: 'toward:player' },
  { face: PLAYER, dir: 'toward:janitor' },
  // 청소부: ... — ‘...’ 은 대사 상자 줄이 아니라 머리 위 말풍선
  { bubble: JANITOR },
  C('그래 자네 검을 다루는법은 조금 익숙해졋는가'),
  C('꼭 쓰러트려야만 하는 누군가가 있는거지?'),
  C('나도 그랬다네'),
  C('그렇지만 그러지 못했다네'),
  C('뭐 껄껄 어쩔수없는거 아닌가'),
  laugh(),
  C('아 먼저 가보겠나 난 이걸 좀 보다 가야겠으니.'),
  close,
  // 동료에서 빠져 같은 자리에 NPC 로 남는다(이 시점의 자동 저장에도 janitor_left 가 실린다). 그 뒤 드럼통 아래로 가 위를 본다
  { action: game => { const f = game.entities.find(e => e.id === JANITOR && !e.dead); game.drumJanitorPos = f ? [f.x, f.y] : [game.player.x - 40, game.player.y]; } },
  { set: { janitor_left: true } },
  { leave: JANITOR },
  { action: game => game.spawn({ type: 'npc', id: JANITOR, sprite: 'janitor', x: game.drumJanitorPos[0], y: game.drumJanitorPos[1], facing: 'right', hidden: false, solid: false, wander: 0 }) },
  // 드럼통 왼쪽 아래(길 위)에 서서 위를 본다 — 바로 아래에 서면 드럼통이 머리에 얹힌 것처럼 겹쳐 보인다(플레이테스트 스크린샷)
  { move: JANITOR, rel: DRUM, at: 'bottom', by: [-30, 16], speed: 60 },
  { face: JANITOR, dir: 'up' },
  // 요플래가 청소부를 좀 바라보다가
  { face: PLAYER, dir: 'toward:janitor' },
  { wait: LOOK_AT_JANITOR },
  { face: PLAYER, dir: 'right' },
  { wait: 0.4 },
  // 혼자 오른쪽 다음 맵으로 걸어간다 — 카메라는 청소부에 남고, 요플래는 맵 밖까지 걸어 나간다
  { camera: JANITOR, duration: 0.6 },
  { move: PLAYER, px: game => [game.map.pxW + 48, game.player.y], speed: 60, footsteps: true },
  { wait: 0.8 },
  // 혼자 남은 청소부
  C('전우들이여'),
  C('미안하네'),
  close,
  { bubble: JANITOR },
  { wait: 0.6 },
  { fade: 'out', duration: 1.0 },
  { set: { drum_talk_done: true } },
  { remove: JANITOR },
  { map: NEXT_MAP, spawn: 'from_west' },
  { camera: 'player' },
  { fade: 'in', duration: 1.0 },
  { label: 'end' },
  { end: true },
];
