// ─────────────────────────────────────────────────────────────
// 청록숲9: 사원 문지기 레드·블루 (사용자 브리핑 2026-09-11, 대사 그대로). 오른쪽 끝을 막고 선 둘에게 말을 걸면:
//   형섭·경섭·빠맨이 위에서부터 세로로 정렬(간격 36px) → 브금 꺼짐 → "레드랑 블루인데요?" … "여기는 지나갈 수 없다." / "없다." → 셋이 놀라 살짝 점프(공식 점프 소리 ✗, 느낌표 소리만)
//   → "신성한 오브젝트(노랑)들의 영역" / "영역" → "시험을 받아야한다." / "한다" → "쥰희랑 용준이는 지나갔을텐데 ㅂㅅ인가?" → ... / ...
//   → 레드 "침입자 발생 ×3"(쿵쿵 점프 + 사이렌 위잉위잉 + 화면 붉게 번쩍, 브금 alarm 으로) / "침입자" → "제거하라 ×5" / "하라." → "오..." → 처리하라/하라 응수 6쌍(전환이 갈수록 빨라짐, 사용자 추가) → 둘이 달려들어 전투(보스 브금 boss, HP 22×2).
//   전투 뒤(사용자 추가 브리핑): "시험에 통과한자들 지나가도 좋다"/"좋다" … "우리의 힘을 주겠다"/"겠다" → 빨강·파랑 반짝임({aura})이 셋을 감싸고 버프(공격력 2, 최대 HP +20, 합류 효과음) → "지나가라"/"라." → 둘이 위로 비켜 아래를 본다 → 돌문이 열린다(우르릉). 맵 재진입 땐 requires NPC 가 그 자리에.
//   스프라이트 PR #16(2.6배). 목소리: audio.js VOICES.red/blue(언더테일 snd_txt2 를 깊게).
// ─────────────────────────────────────────────────────────────
import { MAPS } from '../maps.js';
import { Battle } from '../../battle/battle.js';
const G = (text, extra = {}) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text, ...extra });
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });
const R = (text, extra = {}) => ({ speaker: '레드', voice: 'red', text, ...extra });
const B = (text, extra = {}) => ({ speaker: '블루', voice: 'blue', text, ...extra });
const N = (text) => ({ text, voice: 'narrator' });
// 자리는 맵 meta(JSON, 부팅 뒤 로드)에서 실행 시점에 읽는다
const at = (k) => ({ px: () => MAPS.teal9.meta.stage[k] });
// 카메라는 말하는 쪽으로(델타룬처럼): 레드·파티 대사 = 위(레드 전신 + 파티), 블루 대사 = 아래(블루 전신), 응수 구간 = 가운데. 대화창 위 230px 에 165px 둘을 다 넣을 수 없어서(포스트모텀 2026-09-11)
const CAM_RED = [48, 6.7], CAM_BLUE = [48, 11], CAM_MID = [48, 8.6], CAM_PARTY = [43, 7.3];   // CAM_PARTY: 힘을 받는 순간은 주인공 쪽(파티 열 42) — 블루에 맞춰 두면 힘 받는 게 안 보인다(2026-09-11 사용자)
const cam = (c) => ({ camera: c, duration: 0.3 });
const stomp = (n) => Array.from({ length: n }, () => [{ hop: 'red', by: [0, 0], height: 14, duration: 0.28, sfx: 'thud' }, { shake: 0.12, amp: 3 }]).flat();   // 레드 쿵쿵
// 처리하라/하라 응수: 레드·블루가 번갈아 외치는데 갈수록 전환이 빨라진다(auto 0.55s → 0.07s, 타자 속도 2 → 9) — 긴박하게 몰아간 뒤 돌진 (사용자 2026-09-11)
const chase = (pairs) => { const out = []; for (let i = 0; i < pairs; i++) { const u = pairs > 1 ? i / (pairs - 1) : 1; const auto = +(0.55 + (0.07 - 0.55) * u).toFixed(3), speed = Math.round(2 + 7 * u); out.push(R('* 처리하라', { auto, speed }), B('* 하라', { auto, speed })); } return out; };

export const teal9_boss = [
  { if: (f) => f.teal9_boss_won, goto: 'done' },
  // 형섭·경섭·빠맨: 레드·블루 앞 5칸에서 위에서부터 세로 정렬, 모두 오른쪽을 본다 / 레드·블루는 왼쪽을 본다
  { parallel: [{ move: 'player', ...at('h'), run: true }, { move: 'gyeongsub', ...at('g'), run: true }, { move: 'ppaman', ...at('p'), run: true }] },
  { face: 'player', dir: 'right' }, { face: 'gyeongsub', dir: 'right' }, { face: 'ppaman', dir: 'right' }, { face: 'red', dir: 'left' }, { face: 'blue', dir: 'left' },
  cam(CAM_RED),                                                                            // 정렬 순간: 레드 전신 + 파티가 대화창 위에
  { bgm: null, fadeOut: 0.6 },
  P('* ...{w=0.5} ...{w=0.5} 레드랑 블루인데요?'),
  G('* 응{w=0.3} 그렇네'),
  R('* 여기는 지나갈 수 없다.'),
  cam(CAM_BLUE),
  B('* 없다.'),
  // 셋이 놀라서 살짝 점프 — 우리 공식 점프 소리는 쓰지 않고 느낌표 소리(chime)만 (사용자)
  { parallel: [{ emote: 'player', kind: '!', duration: 1.0, hold: 0.05, sfx: 'chime' }, { emote: 'gyeongsub', kind: '!', duration: 1.0, hold: 0.05 }, { emote: 'ppaman', kind: '!', duration: 1.0, hold: 0.05 },
               { hop: 'player', by: [0, 0], height: 12, duration: 0.3, sfx: false }, { hop: 'gyeongsub', by: [0, 0], height: 12, duration: 0.3, sfx: false }, { hop: 'ppaman', by: [0, 0], height: 12, duration: 0.3, sfx: false }] },
  { wait: 0.45 },
  cam(CAM_RED),
  P('* 마{w=0.25} 말을 했어?'),
  R('* 여기는 신성한 {c=yellow}오브젝트{/c}들의 영역'),
  cam(CAM_BLUE),
  B('* 영역'),
  cam(CAM_RED),
  R('* 여기를 지나가기 위해서는 시험을 받아야한다.'),
  cam(CAM_BLUE),
  B('* 한다'),
  cam(CAM_RED),
  P('* 이미 쥰희랑 용준이는 지나갔을텐데{w=0.3} ㅂㅅ인가?'),
  R('* ...'),
  cam(CAM_BLUE),
  B('* ...'),
  // 침입자 발생: 브금 alarm 으로 전환, 레드가 쿵쿵 뛰고 몸에서 사이렌 위잉위잉, 화면이 붉게 번쩍 — 대사와 동시에(async)
  { bgm: 'alarm', volume: 0.55 },
  { sfx: 'siren' },
  { async: stomp(3) },
  { async: [{ pulse: 'red', times: 4, every: 0.45 }] },
  cam(CAM_RED),
  R('* 침입자 발생{w=0.2} 침입자 발생{w=0.2} 침입자 발생'),
  cam(CAM_BLUE),
  B('* 침입자'),
  { sfx: 'siren' },
  { async: stomp(2) },
  { async: [{ pulse: 'red', times: 4, every: 0.45 }] },
  cam(CAM_RED),
  R('* 제거하라{w=0.12} 제거하라{w=0.12} 제거하라{w=0.12} 제거하라{w=0.12} 제거하라'),
  cam(CAM_BLUE),
  B('* 하라.'),
  cam(CAM_RED),
  P('* 오...'),
  // 처리하라 ×6 응수(가속) + 쿵쿵·붉은 번쩍 — 긴박하게 몰아간 뒤 돌진
  { sfx: 'siren' }, { async: stomp(4) }, { async: [{ pulse: 'red', times: 8, every: 0.32 }] },
  cam(CAM_MID),
  ...chase(6),
  { shake: 0.35, amp: 4 },
  // 레드·블루가 달려든다 → 전투 (보스 브금은 사용자 지정 'boss')
  { parallel: [{ move: 'red', rel: 'player', at: 'right', by: [70, -10], dash: true }, { move: 'blue', rel: 'ppaman', at: 'right', by: [70, 10], dash: true }] },
  // 전투 진입 연출은 표준 조우(main.js startEncounter)와 똑같이: 징글 → 흔들림 → 소용돌이·줌 → 검게 (사용자 2026-09-11 "시작 연출 왜 없앴어")
  { action: (g) => { g.sound.preloadBgm('boss'); Battle.preload(g, ['red', 'blue']); } },
  { sfx: 'battle_start' }, { bgm: null, fadeOut: 0.2 }, { shake: 0.45, amp: 3 },
  { vortex: { at: 'center', size: 40, grow: 0.9 } }, { zoom: 1.9, at: 'center', duration: 0.55 }, { vortex: { size: 900, grow: 0.5 } },
  { fade: 'out', duration: 0.25 }, { wait: 0.15 }, { vortex: null },
  { battle: { enemies: ['red', 'blue'], bgm: 'boss', bg: 'temple', flag: 'teal9_boss_won', intro: ['* 레드와 블루가 덤벼들었다!'] } },   // 배경: 고대 사원 광장 무대(src/battle/backgrounds.js 'temple', 델타룬 왕 전투 참고)
  { bgm: null }, { zoom: 1 },
  // 전투 뒤(사용자 브리핑 2026-09-11, 대사 그대로): 둘은 제자리로 돌아가 있고 파티는 다시 세로 정렬
  { parallel: [{ move: 'red', ...at('red') }, { move: 'blue', ...at('blue') }, { move: 'player', ...at('h') }, { move: 'gyeongsub', ...at('g') }, { move: 'ppaman', ...at('p') }] },
  { face: 'red', dir: 'left' }, { face: 'blue', dir: 'left' }, { face: 'player', dir: 'right' }, { face: 'gyeongsub', dir: 'right' }, { face: 'ppaman', dir: 'right' },
  { fade: 'in', duration: 0.5 },
  cam(CAM_RED),
  R('* ...'),
  cam(CAM_BLUE),
  B('* ...'),
  cam(CAM_RED),
  R('* 시험에 통과한자들{w=0.3} 지나가도 좋다.'),
  cam(CAM_BLUE),
  B('* 좋다'),
  cam(CAM_RED),
  P('* 와{w=0.3} ㅈㄴ 세네 시발'),
  G('* 어서 지나가자.'),
  R('* 잠깐'),
  cam(CAM_BLUE),
  B('* 깐'),
  cam(CAM_RED),
  P('* ?'),
  R('* 오브젝트님들의 영역은 신성한 곳'),
  cam(CAM_BLUE),
  B('* 신성한 곳'),
  cam(CAM_RED),
  R('* 시험에 통과했으니 우리의 힘을 주겠다.'),
  cam(CAM_BLUE),
  B('* 겠다.'),
  // 레드·블루에서 빨강·파랑 반짝임이 날아와 셋을 감싸 돈다 → 버프: 공격력 1→2, 최대 HP 각 +20 (현재 HP 도 +20). 합류 효과음('item')과 같은 소리. 카메라는 힘을 받는 주인공 쪽으로
  { camera: CAM_PARTY, duration: 0.5 },
  { aura: { from: ['red', 'blue'], to: ['player', 'gyeongsub', 'ppaman'], colors: ['#ff5c5c', '#ff9a8a', '#4fa8ff', '#9fd0ff'], n: 42, duration: 1.8 } },
  { action: (g) => { g.attack = 2; g.hpBonus = (g.hpBonus || 0) + 20; for (const id of ['hyungsub', ...g.party]) g.partyHp[id] = Math.min(g.maxHpOf(id), g.hpOf(id) + 20); g.autosave?.(); } },
  { sfx: 'item' },
  N('* {c=yellow}레드와 블루 버프를 획득했다.{/c}{n}* 공격력과 체력이 증가하였다.'),
  cam(CAM_RED),
  R('* 지나가라'),
  cam(CAM_BLUE),
  B('* 라.'),
  // 둘이 위로 길을 비켜 주고 아래를 본다 → 돌문이 열린다(우르릉)
  { parallel: [{ move: 'red', ...at('red_aside'), run: true }, { move: 'blue', ...at('blue_aside'), run: true }] },
  // NPC.interact 는 스크립트가 끝나면 baseFacing 으로 되돌리므로 기본 방향도 아래로 바꿔 둔다
  { action: (g) => { for (const id of ['red', 'blue']) { const e = g.entities.find((x) => x.id === id); if (e) e.baseFacing = 'down'; } } },
  { face: 'red', dir: 'down' }, { face: 'blue', dir: 'down' },
  { sfx: 'rumble' }, { shake: 0.7, amp: 4 }, { remove: 'door_closed' }, { wait: 0.4 },
  { bgm: 'hopes', volume: 0.45 },
  { camera: 'player', duration: 0.6 },
  { regroup: true },
  { set: { teal9_boss_won: true } },
  { label: 'done' },
];

// 시험 뒤 다시 말을 걸면(맵 재진입 시 requires 로 위에 서 있는 둘)
export const teal9_red_after = [R('* 지나가라.')];
export const teal9_blue_after = [B('* ...라.')];

// 사원 소품 한 줄 (요청 없는 소품에도 대사 한 줄 규칙)
export const teal9_lantern = [N('* 석등이다.{w=0.4} 불이 아직 켜져 있다.{w=0.3} 누가 관리하는 걸까.')];
export const teal9_block = [N('* 무너진 돌덩이.{w=0.4} 이끼가 두껍다.{w=0.3} 아주 오래된 것 같다.')];
