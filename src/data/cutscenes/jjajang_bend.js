// 짜장 굽이 길(jjajang_bend) — 길 위의 돌 (BUILD227 사용자 브리핑 2026-09-18, 원문은 design/narrative/cutscenes/jjajang_bend.md)
//   돌을 조사하면 청소부가 두 마디 하고 돌로 다가가 줍는다 → “돌을 얻었다.”(체력회복 -5 아이템) → 끝
const N = text => ({ voice: 'narrator', text: `* ${text}` });
const C = text => ({ speaker: '청소부', portrait: 'janitor', voice: 'janitor', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const ROCK = 'jjajang_rock';
const JANITOR = 'janitor';

export const jjajang_rock = [
  { if: flags => flags.jjajang_rock_taken || !flags.torii_janitor_joined, goto: 'end' },
  C('허허 볼품없는 돌이라네'),
  C('누군가는 이걸 품어줘야지'),
  close,
  { move: JANITOR, rel: ROCK, at: 'left', by: [-2, 4], speed: 40 },
  { face: JANITOR, dir: 'right' },
  { wait: 0.35 },
  { remove: ROCK },
  { sfx: 'item' },
  { action: game => { game.inventory.push('돌'); } },
  N('{c=yellow}돌{/c}을 얻었다.'),
  { set: { jjajang_rock_taken: true } },
  { regroup: true },
  { label: 'end' },
  { end: true },
];
