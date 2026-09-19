// 드럼통 길(jjajang_drum) — 청소부 이별 (BUILD242 사용자 브리핑 2026-09-19, 원문·구현표는 design/narrative/cutscenes/jjajang_drum.md)
//   BUILD244 개편(사용자 “드럼통 마주쳤을 때 느낌표! 저 드럼통은 .... / 브금도 꺼지고 천천히 드럼통으로 카메라 / 청소부가 앞으로 가고 그 뒤에 요플래가 따라가고 대사 시작 / 연출로서 평가해서 개편”):
//   드럼통 앞(30~31열)에 가면: 청소부 ! → “저 드럼통은 ....” → 브금 페이드아웃 → 카메라가 드럼통으로 천천히 → 청소부가 드럼통 앞까지 천천히 걸어가고 요플래가 뒤따라 서서 잠깐 함께 올려다봄 →
//   마주 보고 ...(말풍선) → 대사 6줄(“뭐 껄껄 어쩔수없는거 아닌가” 뒤 웃음) → “아 먼저 가보겠나 난 이걸 좀 보다 가야겠으니.” →
//   청소부는 동료에서 빠져 그 자리에 NPC 로 남아 드럼통을 본다 → 요플래가 청소부를 좀 바라보다가 혼자 오른쪽으로 걸어 맵 밖으로(카메라는 청소부·드럼통에 남는다) →
//   혼자 남은 청소부: 전우들이여 / 미안하네 / ...(말풍선) → 페이드 아웃 → 형섭 혼자 다음 맵(jjajang_chin1) 왼쪽 → 페이드 인. 그 뒤로는 되돌아갈 수 없다(jjajang_chin.js no_return)
const C = text => ({ speaker: '청소부', portrait: 'janitor', voice: 'janitor', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const laugh = () => ({ motion: JANITOR, name: 'laugh', sfx: 'laugh_janitor' });
const PLAYER = 'player';
const JANITOR = 'janitor';
const DRUM = 'jjajang_drum';
export const NEXT_MAP = 'jjajang_chin1';
export const LOOK_AT_JANITOR = 1.6;   // 요플래가 청소부를 바라보는 시간(초)
export const APPROACH_SPEED = 42;     // 드럼통으로 걸어가는 속도(16px 단위/초 — 걷기 60 보다 느리게)
export const JANITOR_STAND = [-30, 16];   // 드럼통 히트박스 밑변 기준 청소부 자리(왼쪽 아래, 길 위)
export const FOLLOW_GAP = 40;         // 요플래가 청소부 뒤(왼쪽)에 서는 간격

export const jjajang_drum_talk = [
  { if: flags => flags.drum_talk_done || flags.janitor_left || !flags.torii_janitor_joined, goto: 'end' },
  // 1. 마주침: 청소부가 먼저 알아본다
  { face: JANITOR, dir: 'up' },
  { emote: JANITOR, kind: '!', duration: 0.9, hold: 0.5 },
  { face: PLAYER, dir: 'toward:janitor' },
  C('저 드럼통은 ....'),
  close,
  // 2. 브금이 잦아들고 카메라가 드럼통으로 천천히 옮겨 간다
  { bgm: null, fadeOut: 1.2 },
  { camera: DRUM, duration: 1.6 },
  // 3. 청소부가 앞장서 드럼통 앞까지 천천히 걷고, 요플래가 뒤따라 선다. 둘이 잠깐 드럼통을 올려다본다
  { move: JANITOR, rel: DRUM, at: 'bottom', by: JANITOR_STAND, speed: APPROACH_SPEED, footsteps: true },
  { face: JANITOR, dir: 'up' },
  { move: PLAYER, px: game => { const j = game.entities.find(e => e.id === JANITOR && !e.dead); return [(j ? j.x : game.player.x) - FOLLOW_GAP, j ? j.y : game.player.y]; }, exact: true, speed: APPROACH_SPEED, footsteps: true },
  { face: PLAYER, dir: 'up' },
  { wait: 1.0 },
  // 4. 마주 보고 이야기
  { face: JANITOR, dir: 'toward:player' },
  { face: PLAYER, dir: 'toward:janitor' },
  { bubble: JANITOR },
  C('그래 자네 검을 다루는법은 조금 익숙해졋는가'),
  C('꼭 쓰러트려야만 하는 누군가가 있는거지?'),
  C('나도 그랬다네'),
  C('그렇지만 그러지 못했다네'),
  C('뭐 껄껄 어쩔수없는거 아닌가'),
  laugh(),
  C('아 먼저 가보겠나 난 이걸 좀 보다 가야겠으니.'),
  close,
  // 5. 동료에서 빠져 같은 자리에 NPC 로 남는다(이 시점의 자동 저장에도 janitor_left 가 실린다) → 드럼통을 올려다본다
  { action: game => { const f = game.entities.find(e => e.id === JANITOR && !e.dead); game.drumJanitorPos = f ? [f.x, f.y] : [game.player.x - 40, game.player.y]; } },
  { set: { janitor_left: true } },
  { leave: JANITOR },
  { action: game => game.spawn({ type: 'npc', id: JANITOR, sprite: 'janitor', x: game.drumJanitorPos[0], y: game.drumJanitorPos[1], facing: 'up', hidden: false, solid: false, wander: 0 }) },
  { move: JANITOR, rel: DRUM, at: 'bottom', by: JANITOR_STAND, speed: 60 },
  { face: JANITOR, dir: 'up' },
  // 6. 요플래가 청소부를 좀 바라보다가 혼자 오른쪽으로 — 카메라는 청소부·드럼통에 남는다
  { face: PLAYER, dir: 'toward:janitor' },
  { wait: LOOK_AT_JANITOR },
  { face: PLAYER, dir: 'right' },
  { wait: 0.4 },
  { camera: JANITOR, duration: 0.6 },
  { move: PLAYER, px: game => [game.map.pxW + 48, game.player.y], speed: 60, footsteps: true },
  { wait: 0.8 },
  // 7. 혼자 남은 청소부
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
