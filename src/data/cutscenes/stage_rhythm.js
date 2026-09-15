// 무대 뒷편 대기실(youngcle12) 뚜울라 → 리듬 게임 진입 → 공연 뒤 연출 — 2026-09-15 사용자 브리핑 원문. 콘티: design/narrative/cutscenes/stage_rhythm.md
// 리듬 게임 자체는 src/scenes/rhythm.js(오버레이 씬, scene3d 'rhythm'). 끝나면 rhythm_stage_done → 검은 화면 나레이션 → 무대 위 연출(오른쪽 길 뚫림, 뚜울라 땅 파고 퇴장) → stage_show_done.
import { FX } from '../fx.js';

const MOUSE = 'ttuulla_back';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
// 대기실 위쪽 무대 입구(커튼 문) — “음악으로!!!” 뒤 뚜울라와 셋이 이 문으로 들어간다(사용자: 바로 화면 전환이 아니라 문으로 들어가고 페이드)
const DOOR = 'backstage_curtain_door';
const SHOW_MOUSE = 'ttuulla_show';
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ' + text });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* ' + text });
const T = text => ({ speaker: '뚜울라알라', portrait: 'ttuulla', voice: 'ttuulla', text: '* ' + text });
const close = { action: game => game.textbox.close() };
// 문 아래까지 뛰어가 문 안으로 걸어 올라가며 사라진다(by 는 2px 단위: -12 = 24px 위)
const enterDoor = id => [{ move: id, rel: DOOR, at: 'bottom', by: [0, 2], run: true }, { move: id, by: [0, -12] }, { hide: id }];

/** 공연 뒤(사용자 원문): 검은 화면 나레이션 → 무대 위 → 대사 → 오른쪽 벽이 뚫림 → 뚜울라 땅 파고 퇴장 */
export const AFTER_SHOW = [
  { curtain: 'black' },
  { fade: 'in', duration: 0 },
  { wait: 0.8 },
  { text: '* 그렇게 우리 가재맨 밴드는', voice: 'narrator' },
  { text: '* 성공적으로 공연을 마쳤다.', voice: 'narrator' },
  close,
  { map: 'youngcle11', spawn: 'on_stage' },
  { spawn: { type: 'npc', id: SHOW_MOUSE, sprite: 'ttuulla', x: 416, y: 112, facing: 'down', wander: 0, visualScale: 1.79, solid: false } },
  ...PARTY.map(id => ({ face: id, dir: 'up' })),
  { fade: 'out', duration: 0 },
  { curtain: null },
  { camera: 'player' },
  { fade: 'in', duration: 1.2 },
  T('정말 멋진 무대였습니다'),
  P('재밌네 ㅋㅋ'),
  T('뭐 저희를 다 이기셨으니 여러분들이 이긴신겁니다.'),
  G('어 그럼 어떡하면 되는걸까?'),
  T('자 저기 오른쪽 문이 있을겁니다'),
  close,
  // 무대 오른쪽 벽이 뚫린다(카메라가 오른쪽 끝으로 → 폭발 → 벽 소품 제거 → 돌아옴)
  ...PARTY.map(id => ({ face: id, dir: 'right' })),
  { camera: [22, 5], duration: 0.7 },
  { wait: 0.3 },
  { shake: 0.5, amp: 5 },
  { boom: { ...FX.explosion, at: 'stage11_right_gate', scale: 1.6, offset: [0, 0] } },
  { remove: 'stage11_right_wall' },
  { wait: 0.6 },
  { camera: 'player', duration: 0.7 },
  ...PARTY.map(id => ({ face: id, dir: `toward:${SHOW_MOUSE}` })),
  T('저기로 쭉따라 가시면 영클형을 만날 수 있을겁니다.'),
  P('그래 수고했다.'),
  T('편집노조 애들은 그냥 영클형이 시켜서 형들을 공격하고있는건데'),
  T('사실 저도 잘 이해가 되지는 않습니다.'),
  P('그게 무슨?'),
  T('모르겠어요 영클형뿐만 아니라 누군가 뒷배후가 존재하는거같아요'),
  T('뭐 근데 이제부턴 제 알바아닙니다 ㅂㅇ'),
  close,
  // 뚜울라가 땅을 파서 사라진다: 부르르 떨며 흙먼지, 점점 작아져 땅속으로
  { async: [{ tremble: SHOW_MOUSE, duration: 1.4, amp: 3 }] },
  { sfx: 'scrape', volume: 0.8 },
  { async: [{ puff: SHOW_MOUSE, offset: [0, 4], duration: 1.2 }] },
  { scale: SHOW_MOUSE, to: 0.05, duration: 1.1 },
  { remove: SHOW_MOUSE },
  { sfx: 'thud', volume: 0.5 },
  { set: { stage_show_done: true } },
  { end: true },
];

export const backstage_ttuulla = [
  { if: flags => flags.rhythm_stage_done, goto: 'done' },
  ...PARTY.map(id => ({ face: id, dir: `toward:${MOUSE}` })),
  { face: MOUSE, dir: 'toward:player' },
  T('준비 되셨습니까?'),
  P('ㅇㅇ'),
  G('어'),
  T('저희는 정정당당하게 승부해보죠!!!!!!'),
  close,
  // 진동을 일으키면서 “음악으로!!!!!!!!!!” → 뚜울라가 먼저 위 문(무대 입구)으로, 셋이 차례로 따라 들어간다 → 페이드 아웃 → 리듬 게임(씬이 페이드인)
  { async: [{ tremble: MOUSE, duration: 1.6, amp: 3 }] },
  { shake: 1.2, amp: 5 },
  T('음악으로!!!!!!!!!!'),
  close,
  { bgm: null },
  ...enterDoor(MOUSE),
  ...PARTY.flatMap(enterDoor),
  { fade: 'out', duration: 1.0 },
  { scene3d: 'rhythm', flag: 'rhythm_stage_done' },
  ...AFTER_SHOW,
  { label: 'done' },
  { text: '* 뚜울라알라는 아직 무대의 여운에 잠겨 있다.', voice: 'narrator' },
];

/** QA `rhythm_stage`: 대기실에 서자마자 리듬 게임 씬으로(대사 없이) → 공연 뒤 연출까지 */
export const rhythm_qa = Object.assign([
  { fade: 'out', duration: 0.3 },
  { scene3d: 'rhythm', flag: 'rhythm_stage_done' },
  ...AFTER_SHOW,
], { silent: true });

/** QA `stage_after_show`: 리듬 게임 뒤 연출만(검은 화면 나레이션부터) */
export const after_show_qa = Object.assign([{ fade: 'out', duration: 0.3 }, ...AFTER_SHOW], { silent: true });

/** 무대 오른쪽 문이 아직 벽일 때(공연 전) */
export const stage_right_locked = [{ text: '* 무대 오른쪽은 벽으로 막혀 있다.', voice: 'narrator' }];
