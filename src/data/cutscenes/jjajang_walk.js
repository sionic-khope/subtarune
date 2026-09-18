// 짜장 곧은 길(jjajang_walk) — 중간에서 청소부가 천천히 걷기를 권한다 (BUILD227 사용자 브리핑 2026-09-18, 원문은 design/narrative/cutscenes/jjajang_walk.md)
//   청소부: 어이 잠깐 (청소부가 멈추고 요플래가 한 발짝 앞으로 가서 간격이 벌어지고 뒤를 바로 봄) → 대사 넷(껄껄 뒤 웃음) → 끝
const C = text => ({ speaker: '청소부', portrait: 'janitor', voice: 'janitor', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const PLAYER = 'player';
const JANITOR = 'janitor';

export const jjajang_walk_pause = [
  { if: flags => flags.jjajang_walk_done || !flags.torii_janitor_joined, goto: 'end' },
  { face: JANITOR, dir: 'right' },
  C('어이 잠깐'),
  close,
  // 청소부는 그 자리에 멈춰 있고(컷신 중 동료는 따라오지 않는다) 요플래만 한 발짝(한 칸) 앞으로 → 간격이 벌어진다 → 뒤를 돌아본다
  { move: PLAYER, by: [16, 0], speed: 60 },   // by 는 16px 아트 단위(×2) → 16 = 한 칸 32px
  { face: PLAYER, dir: 'left' },
  { wait: 0.25 },
  C('너무 빠르네 조금 천천히 걸어보는건 어떤가?'),
  C('시프트를 누르면 천천히 걸을 수 있네'),
  C('싫다고 ? 껄껄 알겠네'),
  { motion: JANITOR, name: 'laugh', sfx: 'laugh_janitor' },
  C('때로는 천천히 가는것도 좋을 수 있다네.'),
  close,
  { set: { jjajang_walk_done: true } },
  { face: PLAYER, dir: 'right' },
  { regroup: true },
  { label: 'end' },
  { end: true },
];
