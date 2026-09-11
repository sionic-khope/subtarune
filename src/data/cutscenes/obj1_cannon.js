// ─────────────────────────────────────────────────────────────
// 옵젝영역1 — 쥰희·용준 대포 밀기 (사용자 브리핑 2026-09-11, 대사 그대로). 맵 tools/maps/obj1.py (meta.cannon/pushers/push/cam_*).
//   obj1_arrive(맵 도착, obj1_meet_seen 전엔 올 때마다): 브금 Vs. Lancer → 카메라가 가운데 둘에게 → 허이얍/흐이야아압 마다 대포 한 칸(드륵, 둘은 걷기 애니로 민다) ×4
//     → "흐에에 !!!!!" → "그 소리 내면 안되는거 아니에요?" → 브금 일시정지 → 쥰희 머리 위 . . . (대화창 없이, 억빠맨 첫 만남과 같은 연출) → 브금 이어서 + "하이얍!!!!" 한 칸 → 카메라 주인공.
//   obj1_meet(둘 앞 3칸 트리거): 쥰희 느낌표 → 용준 대포 자랑(두구두구 → 대포 줌 → 이름 → 빰빠밤) → 스펠링 개그 → 쥰희 "다 닥쳐!!!"(흔들림, 브금 off) → 요플래 줌 → 계획이 틀어졌어 → 흥 흥 → 웃음
//     → "나를 막을 수 있을거라고 생각하지마라" → 쥰희가 오른쪽으로 달려 맵 밖으로(카메라가 따라감) → 카메라 복귀 → 용준 "미는 것 좀 도와주실 수 있나요?" → 카메라 주인공, 맵 브금(wind) (여기까지).
// ─────────────────────────────────────────────────────────────
const J = (text, extra = {}) => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text, ...extra });
const Y = (text, extra = {}) => ({ speaker: '박용준', portrait: 'yongjun', voice: 'yongjun', text, ...extra });
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });
const G = (text, extra = {}) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text, ...extra });
const N = (text) => ({ text, voice: 'narrator' });
const CAM_GROUP = [27.5, 8.25], CAM_MEET = [26.9, 8.25];   // CAM_GROUP: 밀기 시작 순간 대포(2배, 그림 768~1024)+둘. 그 뒤엔 대포를 따라간다. CAM_MEET: 파티(빠맨 641px)가 왼쪽 가장자리 안 — 대포 포구 끝(1164px)은 40px 쯤 화면 밖(큰 무기라 다 못 담는다, 줌에서 전부 보인다)
// 한 칸 밀기: 대포는 미끄러지고(드륵) 둘은 같은 만큼 천천히 걸어 따라간다(걷기 애니 한 번) — 사용자 "미는 건 둘이 걷기 애니 한 번 싹"
const push = () => [{ parallel: [{ slide: 'cannon', by: [32, 0], duration: 0.6, sfx: 'scrape' }, { move: 'junhee', by: [16, 0], speed: 27 }, { move: 'yongjun', by: [16, 0], speed: 27 }] }, { wait: 0.2 }];   // move.by 는 16px 아트 단위(16 = 한 칸 32px), slide.by 는 픽셀

export const obj1_arrive = [
  { if: (f) => f.obj1_meet_seen, goto: 'skip' },
  { wait: 0.5 },
  { bgm: 'vs_lancer', volume: 0.5 },
  { camera: CAM_GROUP, duration: 1.3 }, { wait: 0.3 },
  { camera: 'cannon' },                                  // 밀리는 대포를 카메라가 따라간다(2배라 고정 카메라엔 다 안 담긴다)
  J('* 허이얍!!'), ...push(),
  Y('* 흐이야아압!!'), ...push(),
  J('* 허이얍!!!!!!{w=0.25} 하아아압!!'), ...push(),
  Y('* 흐이이야압!!!!!!!!!!!!!!!!!!!!!!!!!!!!'), ...push(),
  J('* 흐에에{w=0.2} !!!!!'),
  Y('* 어{w=0.3} 형 그 소리 내면 안되는거 아니에요?'),
  { bgmPause: 0.3 },
  { bubble: 'junhee', dots: 3, gap: 0.4, hold: 0.6 },   // 대화창 없이 머리 위 . . . (억빠맨 첫 만남 연출)
  { bgmResume: 0.2 },                                    // "하이얍" 나올 때 브금 이어서 (사용자)
  J('* 하이얍!!!!'), ...push(),
  { camera: 'player', duration: 0.9 },
  { label: 'skip' }, { end: true },
];

export const obj1_meet = [
  { face: 'junhee', dir: 'left' }, { face: 'yongjun', dir: 'left' }, { face: 'player', dir: 'right' }, { face: 'gyeongsub', dir: 'right' }, { face: 'ppaman', dir: 'right' },
  { camera: CAM_MEET, duration: 0.5 },
  { emote: 'junhee', kind: '!', hold: 0.5 },
  J('* 아{w=0.2} 아닛{w=0.3} 이럴수가{w=0.3} 너{w=0.2} 너희가 어떻게'),
  Y('* 어 경섭이형{w=0.3} 응 빠맨이형도 있네{w=0.3} 그리고..', { auto: 0.5 }),   // 말을 끊으며 — '그리고..' 까지 다 찍힌 뒤 0.5초 있다가 억빠맨(사용자: 다 나오고 끊어야)
  P('* 뭐함 너네?'),
  Y('* 훗훗훗{w=0.3} 저희 바론 사냥하러 갑니다 빠맨이형'),
  P('* 뭔데 이게?'),
  Y('* 이거로 말씀드릴거같으면 바로 ~!!'),
  { async: [{ sfx: 'drumroll' }] },                      // 두구두구두구
  { zoom: 1.45, at: 'cannon', offset: [0, 70], duration: 1.5 },   // 대포로 카메라 이동 + 클로즈업 — 2배 대포(보이는 몸통 216×158)가 대화창 위 영역(480×248)에 다 들어오는 최대 배율. at 은 그림 중심(iy+128)이라 +70 으로 초점을 내려 몸통(그림 y80~238)이 위 영역 가운데(화면 y124)에 오게
  Y('* 저의 역작 울트라 슈퍼 하이퍼 초 미라클 레전더리 어메이징 바주카 용준짱 대포!!!!'),
  { sfx: 'fanfare' }, { wait: 1.1 },                     // 빰빠밤~~~
  P('* 울트라 스펠링 머임?'),                              // 카메라 그대로, 대화창만
  { zoom: 1, duration: 0.5 },
  Y('* ...{w=0.4} 네?{w=0.4} 아..{w=0.3} ㅋㅋ{w=0.3} 아 형 그게 무슨상관', { auto: 0.5 }),
  P('* 머냐고'),
  Y('* ...{w=0.5} ...{w=0.5} ...{w=0.5} ourtla ?'),
  P('* 느금마'),
  { bgm: null, fadeOut: 0.15 },                          // 여기서 브금 꺼짐 (사용자)
  { async: [{ shake: 0.7, amp: 4 }] },
  J('* {shake}다 닥쳐!!!{/shake}'),
  { zoom: 1.7, at: 'player', duration: 0.4 },            // 요플래 클로즈업
  J('* 네{w=0.2} 네녀석이 어떻게 여기있는거야!!!'),
  { zoom: 1, duration: 0.4 },
  J('* 이런{w=0.3} 이런{w=0.3} 내 계획이 틀어졌어.'),
  Y('* 형 그게 무슨소리에요'),
  J('* 용준아{w=0.3} 솔바론은 포기해야할거같다.{w=0.4} 일단 난 {c=yellow}그것{/c}을 손보러 가야될 것 같아.'),
  Y('* 네?'),
  J('* 흥{w=0.3} 흥!!!!'),
  { motion: 'junhee', name: 'laugh', sfx: 'laugh_junhee' },   // (웃음)
  J('* 나를 막을 수 있을거라고 생각하지마라.'),
  // 쥰희가 빠르게 오른쪽으로 쭉 달려 맵 밖(옆 포탈)으로 — 카메라가 따라갔다가 돌아온다
  { camera: 'junhee', duration: 0.3 },
  { move: 'junhee', px: (g) => [g.map.pxW + 48, g.entities.find((e) => e.id === 'junhee')?.y ?? 270], dash: true },
  { remove: 'junhee' }, { set: { obj1_junhee_gone: true } },
  { camera: CAM_MEET, duration: 0.9 },
  Y('* 형 어쩔수없네요{w=0.3} 뭐 저새긴 원래부터 필요없었어요'),
  Y('* 그래서 말인데요 형님들{w=0.3} 저 이거 미는것좀 도와주실 수 있나요?'),
  { camera: 'player', duration: 0.6 },
  { bgm: 'wind', volume: 0.45 },                          // 맵 브금(옵젝영역0 과 같은 바람) 복귀
  // 이 자리에 있던 '연출 전' 엔티티를 그대로 '연출 후'(requires obj1_meet_seen) 것으로 바꾼다 — 맵을 다시 들어오지 않아도 바로 말을 걸 수 있게(2026-09-11 "말걸어도 이벤트가 발생 안 해")
  { action: (g) => {
    const y = g.entities.find((e) => e.id === 'yongjun' && !e.dead); if (y) { y.id = 'yongjun_after'; y.def = { ...y.def, id: 'yongjun_after', script: 'obj1_push' }; }
    const c = g.entities.find((e) => e.id === 'cannon' && !e.dead); if (c) { c.id = 'cannon_after'; c.def = { ...c.def, id: 'cannon_after', script: 'obj1_cannon_look' }; }
  } },
  { set: { obj1_meet_seen: true } },
];

// 연출 뒤 용준에게 말 걸면 (사용자 브리핑 2026-09-11 대사 그대로): 한 줄로 서기 → "그리고... 준비 ~~~"(브금 off) → 쿵! "밀어!!!" → C 연타 100(브금 Rude Buster, 불씨 게이지)
//   → "어어어.. 어?" 용준 등에 불(파티는 물러나 바라봄) → "뜨거운 느끼.." → 쌩!(브금 off, 화르르륵, 흔들림) 용준+대포가 로켓처럼 오른쪽으로 쏘아져 맵 밖(카메라 추적) → 3초 뒤 쿠구구궁 → 카메라 복귀 → 셋 . . . → 6줄 → 브금 wind
const CAM_PUSH = [29.8, 8.25], CAM_AFTER = [26.2, 8.25];   // 한 줄로 선 파티(빠맨 ~768px)부터 대포(1164px)까지 / 발사 뒤 물러선 파티
export const obj1_push = [
  { face: 'yongjun_after', dir: 'toward:player' },
  Y('* 형들 자{w=0.3} 제 뒤에 이렇게 딱 맞춰서 서봐요'),
  { face: 'yongjun_after', dir: 'right' },
  { parallel: [{ move: 'player', rel: 'yongjun_after', at: 'left', by: [-24, 0], run: true }, { move: 'gyeongsub', rel: 'yongjun_after', at: 'left', by: [-72, 0], run: true }, { move: 'ppaman', rel: 'yongjun_after', at: 'left', by: [-120, 0], run: true }] },   // 용준 뒤에 48px 간격 한 줄
  { face: 'player', dir: 'right' }, { face: 'gyeongsub', dir: 'right' }, { face: 'ppaman', dir: 'right' },
  { camera: CAM_PUSH, duration: 0.5 },
  { bgm: null, fadeOut: 0 },                             // 이 줄이 뜨는 순간 브금이 뚝 (사용자 2026-09-11 "나오자마자 꺼져야"). "그리고.." 는 이 줄 하나로
  Y('* 그리고...{w=0.5} 준비{w=0.3} ~~~~~~~~~~~~~~~'),
  { sfx: 'thud' }, { shake: 0.3, amp: 4 },               // (쿵!)
  Y('* {shake}밀어!!!!!!!!!!!!!!!!!!!!!{/shake}'),
  { bgm: 'rude_buster', volume: 0.45 },                  // C 연타 들어가는 순간 일반 전투 브금
  { mash: { target: 100, push: ['player', 'gyeongsub', 'ppaman', 'yongjun_after'], tremble: 'cannon_after' } },
  // 불은 작게 붙어서 점점 강렬해진다(grow 로 초당 입자 수가 계속 늘어남) — 바로 뿅 날아가지 않고 타오르다가 말이 끊기며 발사 (사용자 2026-09-11)
  { fire: { at: 'yongjun_after', dx: -10, dy: -20, spread: 9, rate: 7, grow: 2.6 } },   // 작게 붙어서 점점 거세진다(초당 입자 = rate × (1 + grow × 지난 시간))
  { sfx: 'ember', volume: 0.5 },
  Y('* 어어어..{w=0.4} 어?'),
  { parallel: [{ move: 'player', by: [-14, 0], run: true }, { move: 'gyeongsub', by: [-14, 0], run: true }, { move: 'ppaman', by: [-14, 0], run: true }] },   // 밀기를 멈추고 뒤로 물러나 바라봄
  { face: 'player', dir: 'right' }, { face: 'gyeongsub', dir: 'right' }, { face: 'ppaman', dir: 'right' },
  { async: [{ shake: 1.1, amp: 1 }, { shake: 1.1, amp: 2 }, { shake: 1.4, amp: 3 }] },    // 진동도 점점 크게(대사와 겹쳐서)
  { async: [{ wait: 0.9 }, { sfx: 'ember' }, { wait: 0.8 }, { sfx: 'ember' }, { wait: 0.6 }, { sfx: 'ember' }] },   // 타닥… 타닥.. 타닥
  Y('* 뭐{w=0.3} 뭐지{w=0.4} 뭔가 등이...{w=0.5} 뜨거운 느끼..', { cut: 3.6 }),   // 말하다가 끊긴다(찍히는 중에 닫힘) → 그대로 발사
  { bgm: null, fadeOut: 0 },                             // 날아가는 연출엔 브금 없음
  { sfx: 'rocket' },
  { rocket: { ids: ['yongjun_after', 'cannon_after'], speed: 1100, camera: 'cannon_after', amp: 5 } },   // 쌩!!! 화르르륵 — 맵 밖(옆 포탈)으로
  { set: { obj1_launched: true } },
  { wait: 3.0 }, { sfx: 'boom' }, { shake: 0.9, amp: 6 }, { wait: 0.7 },   // 3초 뒤 쿠구구궁!!!
  { camera: CAM_AFTER, duration: 1.0 },                  // 따라간 카메라가 주인공 쪽으로
  { bubble: 'player', dots: 3, gap: 0.3, hold: 0.3 }, { bubble: 'gyeongsub', dots: 3, gap: 0.3, hold: 0.3 }, { bubble: 'ppaman', dots: 3, gap: 0.3, hold: 0.5 },
  G('* 허허{w=0.3} 가버렸네'),
  P('* 신경쓰지말고 갈길가죠.{w=0.4} 근데 {c=yellow}그것{/c}이 도대체 뭘까요?'),
  G('* 허허{w=0.3} 그러게'),
  P('* 뭐냐고 씨발년아'),
  G('* 응?'),
  P('* 아니에요{w=0.3} 가시죠'),
  { camera: 'player', duration: 0.6 },
  { bgm: 'wind', volume: 0.45 },
  { regroup: true },
];
export const obj1_cannon_look = [N('* 나무로 만든 대포다.{w=0.4} 포구가 돼지코처럼 둘이다.')];
