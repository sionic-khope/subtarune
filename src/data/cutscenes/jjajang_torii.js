// 짜장 토리이 길 — 두 번째 토리이를 지나면 청소부(허약) 합류 이벤트 (BUILD226 사용자 브리핑 2026-09-18, 원문·구현표는 design/narrative/cutscenes/jjajang_torii.md)
//   브금 끔 → 멈춘 뒤 1초 → 뒤에서 또 다른 걸음소리 → 요플래 머리 위 ? → 청소부 검은 실루엣이 발소리 내며 요플래 뒤까지 걸어옴 → 나레이션 3줄 → 요플래 ! → 뒤돌아봄
//   → 페이드아웃/인 사이에 실루엣이 청소부로 바뀜 → 브금 wise_words → 대사 → “영문은 모르겠지만 청소부가 동료가 되었다” → 합류(wise_words 유지, my_castle_town 은 다음 맵부터)
const N = text => ({ voice: 'narrator', text: `* ${text}` });
const C = text => ({ speaker: '청소부', portrait: 'janitor', voice: 'janitor', text: `* ${text}` });
const PLAYER = 'player';
const SHADOW = 'janitor_shadow';
const JANITOR = 'janitor';
const close = { action: game => game.textbox.close() };
const find = (game, id) => game.entities.find(e => e.id === id && !e.dead);

export const torii_janitor = [
  { if: flags => flags.torii_janitor_joined, goto: 'end' },
  { bgm: null, fadeOut: 0.6 },
  { face: PLAYER, dir: 'right' },
  { wait: 1 },
  // 뒤에서 또 다른 걸음소리(이 구역 발소리 루프) — 요플래는 서 있다
  { footsteps: 1.2 },
  { emote: PLAYER, kind: '?', sfx: false, duration: 1.4, hold: 0.9 },
  // 그 뒤로 다시: 검은 실루엣이 발소리를 내며 길을 따라 요플래 뒤까지
  { spawn: { type: 'npc', id: SHADOW, sprite: 'janitor_shadow', x: 760, y: 294, facing: 'right', hidden: false, solid: false, wander: 0 } },
  { action: game => { const s = find(game, SHADOW); if (s) { s.x = game.player.x - 330; s.y = game.player.y; } } },
  // 지팡이를 짚은 검은 형체가 천천히(사용자 “걸음 좀만 더 천천히”): 걷기(60)보다 느린 44
  { move: SHADOW, px: game => [game.player.x - 44, game.player.y], exact: true, speed: 44, footsteps: true },
  { face: SHADOW, dir: 'right' },
  N('거기 너'),
  N('지금 뭐하는 짓 인가'),
  N('당장 나를..'),
  close,
  { emote: PLAYER, kind: '!', duration: 1.0, hold: 0.55 },
  { face: PLAYER, dir: 'left' },
  { wait: 0.35 },
  { fade: 'out', duration: 0.6 },
  { spawn: { type: 'npc', id: JANITOR, sprite: 'janitor', x: 760, y: 294, facing: 'right', hidden: false, solid: false, wander: 0 } },
  { action: game => { const s = find(game, SHADOW), j = find(game, JANITOR); if (s && j) { j.x = s.x; j.y = s.y; j.facing = 'right'; s.dead = true; } } },
  { wait: 0.3 },
  { fade: 'in', duration: 0.6 },
  { bgm: 'wise_words' },
  C('어이'),
  C('젊은이 안녕한가'),
  N('아 아빠..?'),
  C('뭐? 잘안들린다네, 내가 지금 기억이 잘 안나서말이야'),
  C('분명 뭔가 폰으로 아들...인가 누군가 방..쉉? 라이부? 유투브? 이런걸 보고있었는데'),
  C('아 그뒤로 정신을 차려보니 아무 기억도 안난단 말일새'),
  C('나이가 들어서 그런가 어이구 힘들구먼'),
  N('...'),
  C('젊은이 반갑네'),
  N('나는 인사했다.'),
  C('뭔가 익숙한 얼굴인데'),
  C('나랑도 좀 닮은거 같구려 껄껄'),
  C('됐고 여기엔 어떻게 오게됐당가?'),
  C('아 모르겠지물론 껄껄 나도 모르니까.'),
  C('일단 이 늙은이 저기까지만 좀 데려다 줄 수 있는가?'),
  C('응? 저기가 어디냐고? 뭐 저기~까지 저기~'),
  // 동료 합류 효과음 — 억빠맨·경섭 합류와 같은 소리(사용자 “동료가 되었습니다일 때 효과음도 넣고”)
  { sfx: 'item' },
  N('영문은 모르겠지만 {c=yellow}청소부가 동료가 되었다{/c}'),
  { join: JANITOR },
  { set: { torii_janitor_joined: true } },
  // wise_words 는 토리이 길에 그대로 남는다. my_castle_town(RKQUblO-iCs)은 다음 맵부터(storyBgm, 사용자 “그냥 다음 맵부터 나게 해줘”)
  { face: PLAYER, dir: 'right' },
  { label: 'end' },
  { end: true },
];
