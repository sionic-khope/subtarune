// 무대 뒷편 대기실(youngcle12) 뚜울라 → 리듬 게임 진입 — 2026-09-15 사용자 브리핑 원문. 콘티: design/narrative/cutscenes/stage_rhythm.md
// 리듬 게임 자체는 src/scenes/rhythm.js(오버레이 씬, scene3d 'rhythm'). 끝나면 rhythm_stage_done.
const MOUSE = 'ttuulla_back';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ' + text });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* ' + text });
const T = text => ({ speaker: '뚜울라알라', portrait: 'ttuulla', voice: 'ttuulla', text: '* ' + text });
const close = { action: game => game.textbox.close() };

export const backstage_ttuulla = [
  { if: flags => flags.rhythm_stage_done, goto: 'done' },
  ...PARTY.map(id => ({ face: id, dir: `toward:${MOUSE}` })),
  { face: MOUSE, dir: 'toward:player' },
  T('준비 되셨습니까?'),
  P('ㅇㅇ'),
  G('어'),
  T('저희는 정정당당하게 승부해보죠!!!!!!'),
  close,
  // 진동을 일으키면서 “음악으로!!!!!!!!!!” → 화면이 천천히 어두워지고 리듬 게임 무대가 서서히 밝아진다(씬이 페이드인)
  { async: [{ tremble: MOUSE, duration: 1.6, amp: 3 }] },
  { shake: 1.2, amp: 5 },
  T('음악으로!!!!!!!!!!'),
  close,
  { bgm: null },
  { fade: 'out', duration: 1.4 },
  { scene3d: 'rhythm', flag: 'rhythm_stage_done' },
  { fade: 'in', duration: 0.8 },
  { end: true },
  { label: 'done' },
  { text: '* 뚜울라알라는 아직 무대의 여운에 잠겨 있다.', voice: 'narrator' },
];

/** QA `rhythm_stage`: 대기실에 서자마자 리듬 게임 씬으로(대사 없이) */
export const rhythm_qa = Object.assign([
  { fade: 'out', duration: 0.3 },
  { scene3d: 'rhythm', flag: 'rhythm_stage_done' },
  { fade: 'in', duration: 0.5 },
], { silent: true });
