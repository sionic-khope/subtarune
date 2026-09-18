// 검은 소나무 숲 공터 — 아짐키야 조우 (BUILD227 사용자 브리핑 2026-09-18, 원문·구현표는 design/narrative/cutscenes/jjajang_pines.md)
//   가운데로 가면 브금 끔 → ???: ~~.. 디짐 → 요플래 ! → 청소부: 허허 이게 무슨소린가. → 아짐키야 넷이 딱 나오며 “가재맨 애미뒤짐”(영상 구간 소리) → 요플래: .. →
//   노래(가재맨 애미 뒤짐)가 흐르며 넷이 제자리에서 빙글빙글 돌며 춤춤(22초, 화면은 안 돈다) → 전투 진입 연출 → 전투(짜장 일반몹 전투 브금). 첫 청소부 턴에 대사 셋, 이번 전투만 청소부 지팡이 던지기 데미지 1
import { battleEntry } from './helpers.js';
const N = text => ({ voice: 'narrator', text: `* ${text}` });
const C = text => ({ speaker: '청소부', portrait: 'janitor', voice: 'janitor', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const PLAYER = 'player';
export const AJIMKIYA = ['ajimkiya1', 'ajimkiya2', 'ajimkiya3'];   // 셋(사용자 “3마리로”)
// 공터(34~41열×7~14행) 둘레 풀숲 네 귀퉁이에서 튀어나오는 자리 — 그림 128×128(사용자 “부족 스프라이트 더 크게”: 요플래의 약 2배), 발 밑동 기준
const FEET = [[34 * 32 + 16, 9 * 32 + 16], [41 * 32 + 16, 9 * 32 + 16], [38 * 32, 14 * 32 + 30]];   // 왼쪽 둘레·오른쪽 둘레(길 윗줄) + 아래 둘레 가운데 — 셋 다 화면 안(위 귀퉁이는 머리가 잘렸다)
const dancer = (id, i) => ({ spawn: { type: 'prop', id, image: `assets/props/${id}-dance.png`, anim: { cols: 4, fps: 6 },
  x: FEET[i][0] - 16, y: FEET[i][1] - 10, w: 32, h: 10, ix: FEET[i][0] - 64, iy: FEET[i][1] - 128, solid: true } });

export const pines_center = [
  { if: flags => flags.pines_ajimkiya_won, goto: 'end' },
  { bgm: null, fadeOut: 0.5 },
  { wait: 0.6 },
  { speaker: '???', voice: 'mystery', text: '* ~~.. 디짐' },
  { emote: PLAYER, kind: '!', duration: 1.0, hold: 0.55 },
  C('허허 이게 무슨소린가.'),
  close,
  // 넷은 숨겨 둔 채 만들고 → 차례로 풀숲에서 점프하며 나타난다(사용자 “바로 나오는 게 아니라 점프 먼저 하고 나타난 뒤에 대사”)
  ...AJIMKIYA.map((id, i) => dancer(id, i)),
  ...AJIMKIYA.map(id => ({ hide: id })),
  { parallel: AJIMKIYA.map((id, i) => [{ wait: i * 0.14 }, { show: id }, { hop: id, by: [0, 0], height: 60, duration: 0.55 }]) },
  { wait: 0.25 },
  { sfx: 'ajimkiya_line' },
  { speaker: '아짐키야', voice: 'none', text: '* 가재맨 애미뒤짐' },
  N('..'),
  close,
  { bgm: 'ajimkiya_song', volume: 0.6, fadeIn: 0.2 },
  // 화면은 돌지 않는다(사용자 “화면이 도는 게 아니고 아짐키야 애들이 도는 거라고”): 넷이 제자리에서 빙글빙글 돌며 22초 춤춘다
  { action: game => { for (const id of AJIMKIYA) { const p = game.entities.find(e => e.id === id && !e.dead); if (p) p.spinRate = 5; } } },
  { wait: 22 },
  { action: game => { for (const id of AJIMKIYA) { const p = game.entities.find(e => e.id === id && !e.dead); if (p) { p.spinRate = 0; p.spin = 0; } } } },
  // 전투 진입 연출(표준 조우와 같은 소리·소용돌이·줌, 사용자 “전투 들어갈 때 이펙트는 왜 안 넣은 거야 소리도”)
  ...battleEntry(AJIMKIYA, 'jjajang_battle'),
  { battle: { enemies: AJIMKIYA, bgm: 'jjajang_battle', flag: 'pines_ajimkiya_won',
    memberDamage: { janitor: 1 },
    memberIntro: { janitor: [C('뭐 뭐라고? 공격을 하라고?'), C('껄껄 난 그런거 잘못한다네'), C('이거라도 던져보겠네 허허')] } } },
  ...AJIMKIYA.map(id => ({ remove: id })),
  { set: { pines_center_done: true } },
  { label: 'end' },
  { end: true },
];
