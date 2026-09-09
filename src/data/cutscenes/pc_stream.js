// ─────────────────────────────────────────────────────────────
// 방송 시작 → 보라색 코드 에러 → 소용돌이 → 보라색 땅으로 추락 (사용자 브리핑 2026-09-09, 텍스트 그대로·띄어쓰기만)
// 트리거: 코드를 챙긴 뒤(cord_found) 컴퓨터 C (scripts.js room_computer 에서 spread).
// 연출: 오른쪽에 트위치식 채팅창(100명) — 왜 늦었냐/엄준식 → 극·락·ㅋㅋㅋ 도배 → ?? → 정적 속 물음표 → 패닉.
//       윈도우 오류창 "보라색 코드에서 에러가 발생했습니다." [해결하기] → 딸깍 → 브금 꺼짐 → 소용돌이가 컴퓨터에서 커짐
//       → 흰색 → 검은 배경·보라 땅·꽃 위에 쓰러진 채 도착 (stage void_fallen).
// ─────────────────────────────────────────────────────────────
const H = (text, extra = {}) => ({ text, voice: 'narrator', ...extra });   // 형섭 = 나레이션 스타일
const M = (text, extra = {}) => ({ style: 'narration', voice: 'mystery', speed: 0.55, text, ...extra });   // 검은 화면 가운데, 정체불명 목소리, 천천히

export const pc_stream = Object.assign([
  { sfx: 'plug' },
  H('* 철컥..', { auto: 0.9 }),
  H('* 큼큼..{w=0.5} 방송 세팅을 좀 하자.'),
  H('* 헤이{w=0.3} 헤이유{w=0.3} 예아 유 ~'),
  H('* ...{w=0.9}', { auto: 0.4 }),
  { chat: 'open' }, { chat: 'late' },                     // 채팅창 등장: 왜 늦었냐 + 엄/준/식
  { wait: 3.6 },
  H('* 아 여러분 알았어요{w=0.4} 죄송합니다.'),
  H('* 대신~{w=0.5} 제가 일요일 방송 키겠습니다'),
  { chat: 'spam' },                                       // 극 / 락 / ㅋㅋㅋㅋ 도배
  { wait: 2.8 },
  { chat: 'idle' },
  H('* 아 여러분들 그리고 이제 오늘 떡밥으로 굴려볼 건 네..{w=0.7} 음?{w=0.6} 이게 뭐지?'),
  { sfx: 'error' },
  { dialog: { title: '오류', text: '보라색 코드에서 에러가 발생했습니다.', button: '해결하기' } },
  { chat: 'question' },                                   // ?? 류
  { wait: 0.8 },
  H('* 뭐지 여러분들{w=0.4} 눌러볼게요~'),
  { dialog: 'press' }, { sfx: 'click' },
  H('* 딸깍..', { auto: 0.7 }),
  { bgm: null, fadeOut: 0.25 },                           // 브금 꺼지고 정적
  { dialog: null },
  { chat: 'silence' },                                    // 무수한 물음표 + 엄/준/식
  { wait: 2.6 },
  { vortex: { at: 'pc', size: 70, grow: 1.1 } }, { shake: 0.5, amp: 3 },
  H('* 으악 뭐야???'),
  { chat: 'panic' },                                      // ?? 으아악 뭐야?
  { vortex: { size: 170, grow: 2.2 } },
  H('* 어{w=0.5} 어{w=0.5} 어...'),
  { vortex: { size: 320, grow: 1.8 } }, { async: [{ shake: 1.6, amp: 5 }] },
  H('* 어 어어 안된다{w=0.3} {shake}으아아아악!!{/shake}'),
  { vortex: { size: 900, grow: 1.5 } }, { sfx: 'whoosh' }, { async: [{ shake: 1.6, amp: 9 }] },
  { wait: 0.7 },
  { fade: 'white', duration: 0.9 },                       // 하얀 클로즈업 쉬이익
  { curtain: 'white' },
  { chat: 'close' }, { vortex: null },
  { wait: 1.0 },
  { fade: 'out', duration: 1.4 },                         // 흰색 → 검은 화면
  { curtain: 'black' }, { fade: 'in', duration: 0 },
  { wait: 1.2 },
  // 검은 화면의 목소리 (사용자 브리핑 2026-09-09, 텍스트 그대로). 화자 미지정 → 정체불명 목소리(mystery) 하나로
  M('...{w=0.7} 일어..{w=0.8} 일어나..'),
  M('이제 너 차례야'),
  M('야 일어나라고 ...'),
  M('...{w=0.6}가재맨?'),
  M('응{w=0.4} 잘 알았어'),
  M('이제 너의 시간이니까'),
  M('그리고 한가지만 더...'),
  M('절대...{w=0.7}ㄹ..{w=0.5}', { auto: 0.3 }),           // 말이 끊기고 보라맵으로
  { map: 'void', spawn: 'fall' },
  { pose: 'player', to: 'lying' },
  { stage: 'void_fallen' },
  { fade: 'out', duration: 0 },
  { curtain: null },
  { wait: 0.6 },
  { bgm: 'wind', volume: 0.28 },                          // 여기서부턴 브금 없이 잔잔한 바람 소리 (void.json bgm 도 wind)
  { fade: 'in', duration: 2.4 },
  { wait: 2.0 },
  { pose: 'player', to: 'stand' },                        // 일어난다 (다음 비트는 브리핑 대기)
  { face: 'player', dir: 'down' },
], { silent: true });
