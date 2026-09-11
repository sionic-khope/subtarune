// ─────────────────────────────────────────────────────────────
// 청록숲7: 숨어서 엿듣기 (사용자 브리핑 2026-09-11, 대사 그대로). 입구에서 3초쯤 걸으면 시작.
//   쥰희 "아 경섭이형 어딨어!" → 형섭·빠맨 느낌표 → 위 그림자 나무 사이로 뛰어가 양옆에 나란히 숨고 아래(앞)를 본다. 그 바로 아래 경섭, 오른쪽에서 쥰희가 다가옴 → 쥰희 느낌표.
//   (웃음) 형 여깄었구나 … 그것(노란색) … 쥰희 클로즈업 두둥 "그냥 존나 센게 멋지잖아!" … ???: 형 → 쥰희 "나좀 숨겨줘" → 쥰희가 위로 올라가 형섭·빠맨 사이에 서서 아래를 본다(둘은 양옆으로 살짝 비켜 식은땀)
//   → 용준이 오른쪽에서 걸어옴 → 대화(그것의 정체는 경섭이 말을 끊어 숨김) → 용준 오른쪽 퇴장 → 쥰희 내려와 "... ... ..." / "뭐 ㅅㅂ 이따봐 형" → 퇴장 → 형섭·빠맨 천천히 내려옴 → 억빠맨 "형 뭐 숨기고있어요?" … "구경가보죠" / "그 그려".
//   브금: 쥰희 등장부터 Lancer(사전 준비 요청), 끝나면 맵 브금(hopes). 용준 스프라이트는 PR #12(assets/sprites/yongjun.png), 목소리는 유튜브 쇼츠 '어?'.
//   은신처: 나무에 둘러싸인 어두운 주머니(맵 shade 엔티티가 그 안을 덮는다) — 숨은 둘은 어둠 속에서 흐릿하게 보인다.
// ─────────────────────────────────────────────────────────────
import { MAPS } from '../maps.js';
const G = (text, extra = {}) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text, ...extra });
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });
const J = (text, extra = {}) => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text, ...extra });
const Y = (text, extra = {}) => ({ speaker: '박용준', portrait: 'yongjun', voice: 'yongjun', text, ...extra });
const Q = (text, voice = 'mystery') => ({ speaker: '???', voice, text });   // 화면 밖 목소리: 이름은 ??? 지만 목소리는 그 사람 것(사용자 2026-09-11 '경섭이형 어딨어 도 쥰희 목소리로')
const N = (text) => ({ text, voice: 'narrator' });
// 좌표는 맵 meta(JSON, 부팅 뒤 로드)에서 실행 시점에 읽는다 — 모듈 로드 때 MAPS.teal7 은 아직 없다
const at = (k) => ({ px: () => MAPS.teal7.meta.hide[k] || MAPS.teal7.meta.stage[k] });
const spawnAtEdge = (id, sprite) => ({ action: (g) => { const [x, y] = MAPS.teal7.meta.stage.edge; g.spawn({ type: 'npc', id, sprite, x, y, facing: 'left', wander: 0, solid: false }); } });

export const teal7_hide = [
  { face: 'player', dir: 'right' }, { face: 'ppaman', dir: 'right' }, { face: 'gyeongsub', dir: 'right' },
  Q('* 아 경섭이형 어딨어!', 'junhee'),
  { parallel: [{ emote: 'player', kind: '!', duration: 1.0, hold: 0.5, sfx: 'chime' }, { emote: 'ppaman', kind: '!', duration: 1.0, hold: 0.5 }] },
  // 형섭·빠맨: 위 그림자 나무 사이로 (양옆에 나란히, 앞을 본다) / 경섭: 그 바로 아래 길
  { parallel: [{ move: 'player', ...at('left'), run: true }, { move: 'ppaman', ...at('right'), run: true }, { move: 'gyeongsub', ...at('gyeongsub'), run: true }] },
  { face: 'player', dir: 'down' }, { face: 'ppaman', dir: 'down' }, { face: 'gyeongsub', dir: 'right' },
  { camera: [27, 10.2], duration: 0.5 },                                                   // 숨은 둘은 화면 위, 바로 아래 길의 경섭·쥰희가 대화창 위에 보이게 카메라를 조금 내린다
  spawnAtEdge('junhee', 'junhee'),
  { bgm: 'lancer', volume: 0.5 },
  { move: 'junhee', ...at('guest') },
  { emote: 'junhee', kind: '!', duration: 1.0, hold: 0.6, sfx: 'chime' },
  { motion: 'junhee', name: 'laugh', sfx: 'laugh_junhee' },   // (웃음)
  J('* 형 여깄었구나'),
  G('* 어 그치{w=0.3} 나 여기있었어'),
  J('* 내가 엄청난녀석을 발견했어{w=0.4} 저기 뒤로가면 바론있음'),
  G('* 응?'),
  J('* 내가 만든 무기를 시험해 볼때가 온거야{w=0.3} 으하하하'),
  G('* 허허{w=0.3} 바론은 좀 힘들지 않을까?'),
  J('* 솔바론 씹가능이라구여{w=0.3} 진짜로 형 나 믿어봐'),
  G('* 응 그러면 바로 걔랑 싸우러 갈거야?'),
  J('* 아니 아직 부족해{w=0.3} 일단 우리가 만든 {c=yellow}그것{/c}이 목표잖아?{w=0.4} 바론 잡는건 사실 아무 상관없어{w=0.3} 그렇지만..'),
  G('* 그렇지만?'),
  { zoom: 1.6, at: 'junhee', duration: 0.2 }, { sfx: 'thud' }, { shake: 0.3, amp: 4 },   // 살짝 클로즈업 두둥!
  J('* 그냥 존나 센게 멋지잖아!'),
  { zoom: 1, duration: 0.4 },                                                              // 카메라 다시 쥰희·경섭
  G('* 허허..'),
  J('* 일단은 잘 준비하고 따라와보라고{w=0.3} 으하하'),
  Q('* 형', 'yongjun'),
  J('* 오 이런{w=0.3} 나좀 숨겨줘'),
  // 쥰희가 그냥 바로 위로 올라가 형섭·빠맨 사이에 서서 아래를 본다. 둘은 양옆으로 살짝 비켜 아래를 보고 식은땀
  { parallel: [{ move: 'junhee', ...at('center'), run: true, speed: 190 }, { move: 'player', ...at('left_wide') }, { move: 'ppaman', ...at('right_wide') }] },   // 쥰희는 전력 질주(380px/s, 사용자 2026-09-11 '숨으러 달려가는 속도 빨라야 됨')
  { face: 'junhee', dir: 'down' }, { face: 'player', dir: 'down' }, { face: 'ppaman', dir: 'down' },
  { parallel: [{ emote: 'player', kind: 'sweat', duration: 2.4, hold: 0.3 }, { emote: 'ppaman', kind: 'sweat', duration: 2.4, hold: 0.3 }] },
  G('* 어 ?'),
  spawnAtEdge('yongjun', 'yongjun'),
  { move: 'yongjun', ...at('guest'), run: true }, { face: 'gyeongsub', dir: 'right' },                    // 쥰희를 잡으러 뛰어온다(걷기 120px/s 는 4.5초 — 사용자 2026-09-11 '너무 느린 듯')
  Y('* 어 형 안녕하세요'),
  G('* 어 용준아 안녕'),
  Y('* 쥰희형 못보셨어요?'),
  G('* 어?{w=0.3} 응 아직 못봤어'),
  Y('* 에잉ㅉ{w=0.3} 형 제가 쥰희형이랑 만든거 꼭 구경하셔야해요{w=0.3} 옆에 바론이 있는데 잡으려구요'),
  G('* 오 그렇구나{w=0.3} 근데 쥰희는 왜 찾니?'),
  Y('* 아니 쥰희형은 ㅅㅂ 하이퍼 초 로케트 슈퍼 펀치 울트라 미라클 개쩌는 무기를 만들생각을 안하고'),
  Y('* 자꾸 그것이라고 하는 그 ㅂ..', { auto: 0.05 }),                                        // 경섭이 끊는다 — 그것의 정체를 숨긴다
  G('* 어어어{w=0.2} 용준아 그렇구나'),
  Y('* 어쨋든 그래서 제가 강제노동을 조금시켰거든요?{w=0.3} 바론잡기 먼저하자고'),
  Y('* 근데 갑자기 처 도망가서는{w=0.3} 어휴 잡으러 왔는데 안계시더라구요'),
  G('* 아 그렇구나'),
  Y('* 쥰희형은 또 지가 만든거 아니면서 자기가 만들었다고 꺼드럭거리는거 아니겠죠?'),
  G('* 허허{w=0.3} 아닐거야'),
  Y('* 형 일단 전 먼저 가볼게요{w=0.3} 이따봐요 ㅎㅎ'),
  G('* 어 그래'),
  { move: 'yongjun', ...at('edge'), run: true }, { remove: 'yongjun' },                      // 용준 오른쪽으로 달려가며 퇴장
  { move: 'junhee', ...at('guest') }, { face: 'junhee', dir: 'left' }, { face: 'gyeongsub', dir: 'right' },   // 쥰희가 다시 내려와 경섭을 본다
  { parallel: [{ move: 'player', ...at('left') }, { move: 'ppaman', ...at('right') }] },
  J('* ...{w=0.5} ...{w=0.5} ...'),
  G('* ...{w=0.5} ...{w=0.5} ...'),
  J('* 뭐 ㅅㅂ{w=0.3} 이따봐 형'),
  { move: 'junhee', ...at('edge'), run: true }, { remove: 'junhee' },                        // 쥰희도 오른쪽 퇴장
  { parallel: [{ move: 'player', ...at('back_h'), speed: 60 }, { move: 'ppaman', ...at('back_p'), speed: 60 }] },   // 억빠맨·형섭이 천천히 내려옴
  { face: 'player', dir: 'right' }, { face: 'ppaman', dir: 'right' }, { face: 'gyeongsub', dir: 'left' },
  P('* 아까 본게 쥰희였구나.{w=0.4} 형 뭐 숨기고있어요?'),
  G('* 응?{w=0.3} 아니{w=0.3} 아 아니야..'),
  P('* (...{w=0.4} 있는거같은데{w=0.3} 걍 묻지말자)'),
  P('* 흠 일단 형 옆에 바론?{w=0.3} 잡자고 했으니까 저희도 한번 구경가보죠'),
  G('* 그 그려'),
  { bgm: 'hopes', volume: 0.45 },
  { camera: 'player', duration: 0.5 },
  { regroup: true },
  { set: { teal7_hide_done: true } },
];
