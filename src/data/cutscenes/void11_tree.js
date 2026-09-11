// ─────────────────────────────────────────────────────────────
// 보라맵11 거대 나무 (사용자 브리핑 2026-09-10, 대사 텍스트 그대로)
//   형섭이 맵에 도착해 보이는 상태(브금 꺼짐)로 잠깐 → 카메라가 오른쪽으로 이동하며 쥰희·경섭을 비춤 → 쥰희 첫 대사에 브금 Lancer 시작 (사용자 도착 컷신 규칙: 검은 화면 아래 컷 금지, 2026-09-10)
//   → 다툼 → (식은땀) → "우리들의 세계 우리들의 월드" 뒤에 (웃음 = junhee laugh 모션; 브리핑의 "테스트룸에 참고하면 될거임" 은 대사가 아니라 지시) → 쥰희가 경섭 바로 눈앞까지(겹치지 않게) 빠르게 다가감, 경섭 식은땀 → "{c=yellow}그것{/c}" → 물러남 → 으하하(웃음) → 통나무를 뺏어 오른쪽으로 달려 사라짐
//   → 경섭 "ㅅㅂ인생" → 뒤돌아보고 느낌표(!) → 카메라가 형섭·억빠맨에게 → 둘이 경섭 앞으로 걸어옴 → 대화 → "뭔가 살짝 수상하지만 {c=yellow}경섭이 동료가 되었다.{/c}" → 합류 → 브금 끔
//   형섭 대사는 없다(보라맵 규칙). 억빠맨은 파티 동료(id ppaman).
// ─────────────────────────────────────────────────────────────
const N = (text, extra = {}) => ({ text, voice: 'narrator', ...extra });
const J = (text, extra = {}) => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text, ...extra });
const G = (text, extra = {}) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text, ...extra });
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });

export const void11_intro = [
  { wait: 0.7 },                                  // 형섭이 보이는 상태로 잠깐(브금 없음)
  { camera: [26, 10], duration: 1.6 },            // 카메라가 오른쪽으로 이동하며 나무 오른쪽의 두 사람을 비춘다
  { wait: 0.3 },
  { face: 'junhee', dir: 'left' }, { face: 'gyeongsub', dir: 'right' },
  { bgm: 'lancer', volume: 0.5 },
  J('* 형 빨리 형 옮겨야해'),
  G('* 헉{w=0.3} 헉{w=0.3} 헉..{w=0.5} 나무 다 캤어.'),
  J('* 아 진짜!!{w=0.3} 빨리좀 해 느려 터졌네'),
  G('* 미안해'),
  J('* 형이 그래서 안되는거야'),
  G('* 응'),
  J('* 1500 뜯긴새끼 ㅋㅋ'),
  G('* 야.'),
  { emote: 'junhee', kind: 'sweat', duration: 2.2, hold: 0.4 },
  J('* 어 미안 장난이였는데'),
  G('* 어쨋든 조금만 쉬면 안될까{w=0.3} 형 너무 힘들다'),
  J('* 형 이제 코앞이야{w=0.3} 우리들의 세계{w=0.3} 우리들의 월드'),
  { motion: 'junhee', name: 'laugh', sfx: 'laugh_junhee' },   // (웃음) — 브리핑 순서대로 '우리들의 월드' 뒤
  J('* 더러운 김형섭따위 없는 세상이 왔어.'),
  J('* 나의 마이야르 슈퍼 페이스츄리 어쩌고 타코마스터 세상이 온거라고!!!!!'),
  G('* 허허'),
  J('* 그렇기에'),
  { move: 'junhee', rel: 'gyeongsub', at: 'right', by: [46, 0], run: true, speed: 150 },   // 경섭 바로 눈앞까지(중심 거리 70px — 스프라이트가 겹치지 않는다) 빠르게 다가감
  { face: 'junhee', dir: 'left' },
  { emote: 'gyeongsub', kind: 'sweat', duration: 2.4, hold: 0.3 },                         // 붙으니 경섭 식은땀
  J('* 우리는 빨리 {c=yellow}그것{/c} 을 완성시켜야해'),
  G('* 응 그럴게'),
  { move: 'junhee', by: [34, 0] },                // 뒤로 물러난다 (by 는 16px 단위 → 68px)
  { face: 'junhee', dir: 'left' },
  { motion: 'junhee', name: 'laugh', sfx: 'laugh_junhee' },
  J('* 으하하 으하하{w=0.3} 내 야망은 곧 실현될거야'),
  J('* 어서 김형섭이 오기전에 후딱 만들자고{w=0.3} 나무줘'),
  { move: 'junhee', rel: 'logs', at: 'right', by: [2, 2], run: true, speed: 150 },      // 나무를 경섭에게서 뺏고
  { remove: 'logs' }, { sfx: 'item' },
  { wait: 0.15 },
  { move: 'junhee', px: [1440, 336], run: true, speed: 190 },                              // 오른쪽으로 빠르게 이동해 사라짐
  { remove: 'junhee' },
  { wait: 0.4 },
  G('* ㅅㅂ인생'),
  { wait: 0.6 },
  { face: 'gyeongsub', dir: 'left' },             // 뒤를 돌아본다
  { emote: 'gyeongsub', kind: '!', duration: 1.0, hold: 0.7, sfx: 'chime' },
  G('* 어 빠맨아{w=0.3} 어 ?{w=0.4} 너희들 여기'),
  { camera: [10, 10], duration: 1.0 },            // 카메라가 형섭·억빠맨에게
  { camera: 'player' },
  { parallel: [
    { move: 'player', rel: 'gyeongsub', at: 'left', by: [-44, 0], run: true },
    { move: 'ppaman', rel: 'gyeongsub', at: 'left', by: [-96, 0], run: true },
  ] },
  { face: 'player', dir: 'right' }, { face: 'ppaman', dir: 'right' },
  P('* 경섭이형 여기 계셨네요{w=0.3} 다행이네요 무사하셔서'),
  G('* 어 그래'),
  P('* 형 여기서 뭐하고계셨어요?'),
  G('* 응 아니 뭐 그냥 뭐 이것저것..{w=0.5} 그냥'),
  P('* 음 그렇군요{w=0.3} 아까 다른애도 있던거같던데 누구에요?'),
  G('* 응?{w=0.4} 글쎄 허허{w=0.4} 있었나?'),
  P('* 형 일단 저희 같이 다니실까요?{w=0.3} 여기서 얼른 나가려구요'),
  G('* 응?{w=0.3} 어 그래야지{w=0.3} 그래 그래야지.'),
  { sfx: 'item' },                                 // 동료 합류 효과음 — 억빠맨 합류(void4_ppaman)와 같은 소리, 빠져 있었다(사용자 2026-09-11)
  N('* 뭔가 살짝 수상하지만{w=0.4} {c=yellow}경섭이 동료가 되었다.{/c}'),
  { join: 'gyeongsub' },
  { regroup: true },
  { bgm: null, fadeOut: 1.2 },                    // 동료가 된 뒤 브금 끔
  { set: { void11_done: true } },
];

/** 거대 나무에서 C (사용자 2026-09-10): "나무다 베인 흔적이 있다." → 경섭이 동료가 된 뒤엔 빠맨 "형 이 나무 캐셨어요?" / 경섭 "응? 허허 아니 ?" / 빠맨 "흠.. 네" */
export const void11_tree_look = [
  N('* 나무다{w=0.4} 베인 흔적이 있다.'),
  { if: (f) => !f.void11_done, goto: 'end' },
  P('* 형 이 나무 캐셨어요?'),
  G('* 응?{w=0.4} 허허{w=0.3} 아니 ?'),
  P('* 흠..{w=0.5} 네'),
  { label: 'end' },
];
