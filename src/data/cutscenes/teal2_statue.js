// ─────────────────────────────────────────────────────────────
// 청록숲 2 — 쥰희 닮은 나무 동상 (사용자 브리핑 2026-09-10, 대사 그대로)
//   길을 막은 동상(statue_w1~5)에서 C:
//   빠맨 "음 이 더러운 동상은 뭐지? 타코 닮았어요" / 경섭 "허허 지나갈 수 가 없네" / 빠맨 "부숴버리면 되는거죠"
//   → 빠맨이 공격을 시도(동상 앞으로 달려가 몸통 박치기 → 쿵·흔들림 → 튕겨 나옴·식은땀)
//   → 빠맨 "아 존나 아프다 씨발 이거 왜이렇게 단단해" / 나레이션 "... 다른 방법을 찾아봐야겠다." → 카메라가 위로 가는 길을 잠깐 보여 준다(위로 유도)
//   깔려 있는 동상(statue_d*)은 나레이션만. 두 동료가 없으면(QA) 나레이션만.
// ─────────────────────────────────────────────────────────────
const N = (text, extra = {}) => ({ text, voice: 'narrator', ...extra });
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });
const G = (text, extra = {}) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text, ...extra });

export const teal2_statue_look = [N('* 나무 동상이다.{w=0.4} 어디서 본 얼굴 같다.')];

export const teal2_statue_wall = [
  { if: (f) => f.statue_hit, goto: 'again' },
  { if: (f) => !f.void11_done, goto: 'alone' },
  P('* 음 이 더러운 동상은 뭐지?{w=0.4} 타코 닮았어요'),
  G('* 허허{w=0.3} 지나갈 수 가 없네'),
  P('* 부숴버리면 되는거죠'),
  { move: 'ppaman', rel: 'statue_w3', at: 'left', by: [-52, 0], run: true },   // 동상 앞으로 (빠맨이 공격을 시도하지만)
  { face: 'ppaman', dir: 'right' }, { wait: 0.35 },
  { hop: 'ppaman', by: [34, 0], height: 8, duration: 0.2, sfx: false },       // 몸통 박치기
  { sfx: 'thud' }, { shake: 0.4, amp: 4 },
  { hop: 'ppaman', by: [-46, 0], height: 20, duration: 0.42, sfx: false },     // 튕겨 나옴
  { face: 'ppaman', dir: 'right' },
  { emote: 'ppaman', kind: 'sweat', duration: 2.2, hold: 0.4 },
  P('* 아 존나 아프다 씨발{w=0.3} 이거 왜이렇게 단단해'),
  N('* ...{w=0.7} 다른 방법을 찾아봐야겠다.'),
  { set: { statue_hit: true } },
  { regroup: true },
  { camera: [36, 5], duration: 1.1 }, { wait: 0.8 },                            // 위로 가는 길을 비춰 유도
  { camera: [37, 21], duration: 0.9 }, { camera: 'player' },
  { end: true },
  { label: 'again' },
  N('* 나무 동상이다.{w=0.3} 아주 단단하다.'),
  P('* 저건 다신 안 건드릴래요'),
  { end: true },
  { label: 'alone' },
  N('* 나무 동상이 길을 막고 있다.{w=0.4} 아주 단단하다.'),
];
