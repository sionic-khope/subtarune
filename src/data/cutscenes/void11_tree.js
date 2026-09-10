// ─────────────────────────────────────────────────────────────
// 보라맵11 거대 나무 (사용자 브리핑 2026-09-10, 대사 텍스트 그대로)
//   검은 화면 아래에서 카메라가 나무 오른쪽의 쥰희·경섭에게 (enter.early) → 쥰희 첫 대사에 브금 Lancer 시작 (맵 bgmFlag)
//   → 다툼 → (식은땀) → (웃음 = junhee laugh 모션) → 쥰희가 경섭에게 빠르게 다가감 → "{c=yellow}그것{/c}" → 물러남 → 으하하(웃음) → 통나무를 뺏어 오른쪽으로 달려 사라짐
//   → 경섭 "ㅅㅂ인생" → 뒤돌아보고 느낌표(!) → 카메라가 형섭·억빠맨에게 → 둘이 경섭 앞으로 걸어옴 → 대화 → "뭔가 살짝 수상하지만 경섭이 동료가 되었다." → 합류
//   형섭 대사는 없다(보라맵 규칙). 억빠맨은 파티 동료(id ppaman).
// ─────────────────────────────────────────────────────────────
const N = (text, extra = {}) => ({ text, voice: 'narrator', ...extra });
const J = (text, extra = {}) => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text, ...extra });
const G = (text, extra = {}) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text, ...extra });
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });

export const void11_intro = [
  { camera: [26, 10], duration: 0.01 },          // 검은 화면 아래에서 컷: 나무 오른쪽의 두 사람
  { wait: 0.6 },
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
  { motion: 'junhee', name: 'laugh', sfx: 'laugh_junhee' },
  J('* 테스트룸에 참고하면 될거임'),
  J('* 형 이제 코앞이야{w=0.3} 우리들의 세계{w=0.3} 우리들의 월드'),
  J('* 더러운 김형섭따위 없는 세상이 왔어.'),
  J('* 나의 마이야르 슈퍼 페이스츄리 어쩌고 타코마스터 세상이 온거라고!!!!!'),
  G('* 허허'),
  J('* 그렇기에'),
  { move: 'junhee', rel: 'gyeongsub', at: 'right', by: [4, 0], run: true, speed: 150 },   // 경섭에게 빠르게 다가감
  { face: 'junhee', dir: 'left' },
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
  N('* 뭔가 살짝 수상하지만{w=0.4} 경섭이 동료가 되었다.'),
  { join: 'gyeongsub' },
  { regroup: true },
  { set: { void11_done: true } },
];
