// ─────────────────────────────────────────────────────────────
// 청록숲9: 사원 문지기 레드·블루 (사용자 브리핑 2026-09-11, 대사 그대로). 오른쪽 끝을 막고 선 둘에게 말을 걸면:
//   형섭·경섭·빠맨이 위에서부터 세로로 정렬(간격 36px) → 브금 꺼짐 → "레드랑 블루인데요?" … "여기는 지나갈 수 없다." / "없다." → 셋이 놀라 살짝 점프(공식 점프 소리 ✗, 느낌표 소리만)
//   → "신성한 오브젝트(노랑)들의 영역" / "영역" → "시험을 받아야한다." / "한다" → "쥰희랑 용준이는 지나갔을텐데 ㅂㅅ인가?" → ... / ...
//   → 레드 "침입자 발생 ×3"(쿵쿵 점프 + 사이렌 위잉위잉 + 화면 붉게 번쩍, 브금 alarm 으로) / "침입자" → "제거하라 ×5" / "하라." → "오..." → 처리하라/하라 응수 6쌍(전환이 갈수록 빨라짐, 사용자 추가) → 둘이 달려들어 전투(보스 브금 boss, HP 22×2).
//   전투 뒤: 둘 제거·플래그·맵 브금 복귀·재정렬. 스프라이트는 PR 예정(그때까지 CS 그림). 목소리: audio.js VOICES.red/blue(낮고 드문).
// ─────────────────────────────────────────────────────────────
import { MAPS } from '../maps.js';
const G = (text, extra = {}) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text, ...extra });
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });
const R = (text, extra = {}) => ({ speaker: '레드', voice: 'red', text, ...extra });
const B = (text, extra = {}) => ({ speaker: '블루', voice: 'blue', text, ...extra });
const N = (text) => ({ text, voice: 'narrator' });
// 자리는 맵 meta(JSON, 부팅 뒤 로드)에서 실행 시점에 읽는다
const at = (k) => ({ px: () => MAPS.teal9.meta.stage[k] });
const stomp = (n) => Array.from({ length: n }, () => [{ hop: 'red', by: [0, 0], height: 14, duration: 0.28, sfx: 'thud' }, { shake: 0.12, amp: 3 }]).flat();   // 레드 쿵쿵
// 처리하라/하라 응수: 레드·블루가 번갈아 외치는데 갈수록 전환이 빨라진다(auto 0.55s → 0.07s, 타자 속도 2 → 9) — 긴박하게 몰아간 뒤 돌진 (사용자 2026-09-11)
const chase = (pairs) => { const out = []; for (let i = 0; i < pairs; i++) { const u = pairs > 1 ? i / (pairs - 1) : 1; const auto = +(0.55 + (0.07 - 0.55) * u).toFixed(3), speed = Math.round(2 + 7 * u); out.push(R('* 처리하라', { auto, speed }), B('* 하라', { auto, speed })); } return out; };

export const teal9_boss = [
  { if: (f) => f.teal9_boss_won, goto: 'done' },
  // 형섭·경섭·빠맨: 레드·블루 앞 5칸에서 위에서부터 세로 정렬, 모두 오른쪽을 본다 / 레드·블루는 왼쪽을 본다
  { parallel: [{ move: 'player', ...at('h'), run: true }, { move: 'gyeongsub', ...at('g'), run: true }, { move: 'ppaman', ...at('p'), run: true }] },
  { face: 'player', dir: 'right' }, { face: 'gyeongsub', dir: 'right' }, { face: 'ppaman', dir: 'right' }, { face: 'red', dir: 'left' }, { face: 'blue', dir: 'left' },
  { bgm: null, fadeOut: 0.6 },
  P('* ...{w=0.5} ...{w=0.5} 레드랑 블루인데요?'),
  G('* 응{w=0.3} 그렇네'),
  R('* 여기는 지나갈 수 없다.'),
  B('* 없다.'),
  // 셋이 놀라서 살짝 점프 — 우리 공식 점프 소리는 쓰지 않고 느낌표 소리(chime)만 (사용자)
  { parallel: [{ emote: 'player', kind: '!', duration: 1.0, hold: 0.05, sfx: 'chime' }, { emote: 'gyeongsub', kind: '!', duration: 1.0, hold: 0.05 }, { emote: 'ppaman', kind: '!', duration: 1.0, hold: 0.05 },
               { hop: 'player', by: [0, 0], height: 12, duration: 0.3, sfx: false }, { hop: 'gyeongsub', by: [0, 0], height: 12, duration: 0.3, sfx: false }, { hop: 'ppaman', by: [0, 0], height: 12, duration: 0.3, sfx: false }] },
  { wait: 0.45 },
  P('* 마{w=0.25} 말을 했어?'),
  R('* 여기는 신성한 {c=yellow}오브젝트{/c}들의 영역'),
  B('* 영역'),
  R('* 여기를 지나가기 위해서는 시험을 받아야한다.'),
  B('* 한다'),
  P('* 이미 쥰희랑 용준이는 지나갔을텐데{w=0.3} ㅂㅅ인가?'),
  R('* ...'),
  B('* ...'),
  // 침입자 발생: 브금 alarm 으로 전환, 레드가 쿵쿵 뛰고 몸에서 사이렌 위잉위잉, 화면이 붉게 번쩍 — 대사와 동시에(async)
  { bgm: 'alarm', volume: 0.55 },
  { sfx: 'siren' },
  { async: stomp(3) },
  { async: [{ pulse: 'red', times: 4, every: 0.45 }] },
  R('* 침입자 발생{w=0.2} 침입자 발생{w=0.2} 침입자 발생'),
  B('* 침입자'),
  { sfx: 'siren' },
  { async: stomp(2) },
  { async: [{ pulse: 'red', times: 4, every: 0.45 }] },
  R('* 제거하라{w=0.12} 제거하라{w=0.12} 제거하라{w=0.12} 제거하라{w=0.12} 제거하라'),
  B('* 하라.'),
  P('* 오...'),
  // 처리하라 ×6 응수(가속) + 쿵쿵·붉은 번쩍 — 긴박하게 몰아간 뒤 돌진
  { sfx: 'siren' }, { async: stomp(4) }, { async: [{ pulse: 'red', times: 8, every: 0.32 }] },
  ...chase(6),
  { shake: 0.35, amp: 4 },
  // 레드·블루가 달려든다 → 전투 (보스 브금은 사용자 지정 'boss')
  { parallel: [{ move: 'red', rel: 'player', at: 'right', by: [40, 0], dash: true }, { move: 'blue', rel: 'ppaman', at: 'right', by: [40, 0], dash: true }] },
  { battle: { enemies: ['red', 'blue'], bgm: 'boss', bg: 'teal', flag: 'teal9_boss_won', intro: ['* 레드와 블루가 덤벼들었다!'] } },
  { fade: 'in', duration: 0.5 },
  { remove: 'red' }, { remove: 'blue' },
  { bgm: 'hopes', volume: 0.45 },
  N('* 시험이 끝났다.{w=0.4} 사원으로 가는 길이 열렸다.'),
  { regroup: true },
  { set: { teal9_boss_won: true } },
  { label: 'done' },
];

// 사원 소품 한 줄 (요청 없는 소품에도 대사 한 줄 규칙)
export const teal9_lantern = [N('* 석등이다.{w=0.4} 불이 아직 켜져 있다.{w=0.3} 누가 관리하는 걸까.')];
export const teal9_block = [N('* 무너진 돌덩이.{w=0.4} 이끼가 두껍다.{w=0.3} 아주 오래된 것 같다.')];
