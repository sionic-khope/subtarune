// 벚꽃 숲 5(jjajang_sakura5, BUILD271 사용자 브리핑 2026-09-20, 원문 design/narrative/cutscenes/jjajang_sakura5.md)
//   갈림목(다리 건너자마자) 트리거 → [브금 꺼지면서] → 카메라 위 공터(거대 벚꽃 나무 아래 도미조림·가순이 4·5·6·도현)
//   도미조림: 흐미!! (점프, 효과음 domijorim_heumi) / 가순이들: 깜짝이야! / 도미조림: 아따 전라도 홍어가 최고랑께 / 도현: 어ㅋㅋ 가순이분들 괜찮으세요?
//   가순이들: 도미조림형이 악역을 자처해서.. / 가순이들: 하.. 땡땡이 오빠 어딨지.. → 카메라 다시 주인공 → 끝(플래그 sakura5_scene_done)
//   공터에 가기 전 오른쪽 길로 가면 억빠맨: 위로 먼저 가볼까요? → 한 칸 왼쪽으로 밀린다(공터 트리거가 sakura5_clearing_visited 를 세우면 풀림)
//   윗길로 좀 올라가면(공터 밑 트리거) 두 번째 연출(같은 날 브리핑): 브금 telling(“26. I'm Telling!”) → 카메라 배우 눈높이 → 도미조림 느낌표·아래 쳐다봄
//   도미조림: 어 형님? / 억빠맨: ㅋㅋ뭐냐 너네 / 도현: 안녕하세요 형들(도현도 아래) / 억빠맨: 여기서 뭐하고있어? / 도현: 그게요 저 이 벚꽃나무 보이세요? / 억빠맨: ㅇㅇ
//   (카메라 살짝 위로 갔다가 다시 돌아옴) / 도현: 사실 저기 벚꽃나무 맨 위에 / 도현: 이상한 짜장면? 같은게 있는데 가순이들이 자꾸 최미스그새끼 준다고 가져와달라는거에요
//   → 주인공 일행 모두 느낌표 → 억빠맨·경섭·도현·도미조림 대사(원문) → (가순이들로 카메라가 이동) → 가순이들·나레이션·도미조림·도현(원문) → 카메라 다시 넓게(판단) → 억빠맨 “뭐? 너 뒤질래?” … 도현 “훗.. 악역을 자처하시겠다.”
//   → 도미조림 “내꺼랑께요 흐미!!!!!!!!!!!!”(점프+흐미) → 전투(도미조림·도현 체력 50, 브금 petal_dance = 사용자 지정 RsAu3BDaAp8) → 카메라 주인공
//   무대: 트리거에서 일행이 나무 밑까지 걸어 올라간 뒤(판단 — 배우와 일행이 한 화면에 들어오게) 카메라가 배우 눈높이로.
//   대사는 전부 원문. 브금은 연출 뒤에도 지정이 없어 그대로 꺼 둔다(잠정).
const D = text => ({ speaker: '도미조림', portrait: 'domijorim', voice: 'domijorim', text: `* ${text}` });
const H = text => ({ speaker: '도현', portrait: 'dohyun', voice: 'dohyun', text: `* ${text}` });
const G = text => ({ speaker: '가순이들', portrait: 'gasuni4', voice: 'gasuni', text: `* ${text}` });   // 셋이 함께 — 초상화는 가순이4(잠정)
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const N = text => ({ voice: 'narrator', text: `* ${text}` });
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const close = { action: game => game.textbox.close() };
export const CLEARING_VIEW = [54, 5];    // 카메라 목표(칸): 공터 가운데(x) · 위쪽(맵 0행에 걸려 0 으로 잘림 — 거대 나무가 통째로 보인다)
export const CAM = { toClearing: 1.6, back: 1.0 };
export const HEUMI = { height: 30, duration: 0.5, sfx: 'domijorim_heumi' };   // “흐미!!” 점프 + 가재맨 “흐미~” 1.7초
export const SAKURA5_SCENE_FLAG = 'sakura5_scene_done';
export const SAKURA5_CLEARING_FLAG = 'sakura5_clearing_visited';
export const SAKURA5_CLEARING_SCENE_FLAG = 'sakura5_clearing_scene_done';
export const CLEARING_NEAR_VIEW = [54, 10];   // 두 번째 연출: 배우 눈높이(카메라 y 156 — 위쪽 배우 다섯, 아래쪽 나무 밑 일행이 대화창 위 한 화면에)
export const GIRLS_VIEW = [55, 7];             // (가순이들로 카메라가 이동): 가순이 셋 가운데·위(카메라 y 60)
export const PARTY_STAND_Y = 364;              // 일행이 걸어 올라가 서는 자리(발 380 = 나무 밑동 바로 아래, 카메라 156 에서 대화창 위)
export const PARTY_SIDE = 40;                  // 경섭(왼쪽)·억빠맨(오른쪽)이 주인공 양옆에 서는 거리(px) — 동료는 컷신 이동을 따라오지 않아 같이 옮긴다
export const CAM2 = { walk: 1.0, up: 1.0, peek: 0.8, peekHold: 0.6, backDown: 0.8, toGirls: 1.0, back: 1.0 };   // 걸어 올라감 → 위로 → (살짝 위 나무 맨 위 → 돌아옴) → 가순이들 → 넓게 → 주인공
export const DUO_BATTLE = { enemies: ['domijorim', 'dohyun'], bgm: 'petal_dance', bg: 'sakura', flag: 'sakura5_duo_won' };
export const CLEARING_BGM = 'telling';
export const NO_RIGHT_LINE = '위로 먼저 가볼까요?';

export const jjajang_sakura5_scene = [
  { bgm: null },
  { face: 'player', dir: 'up' },
  // (카메라 위로 — 동그란 공터·거대한 벚꽃 나무 아래 다섯)
  { camera: CLEARING_VIEW, duration: CAM.toClearing },
  { wait: 0.3 },
  { hop: 'domijorim', by: [0, 0], height: HEUMI.height, duration: HEUMI.duration, sfx: HEUMI.sfx },
  D('흐미!!'),
  G('깜짝이야!'),
  D('아따 전라도 홍어가 최고랑께'),
  H('어ㅋㅋ 가순이분들 괜찮으세요?'),
  G('도미조림형이 악역을 자처해서..'),
  G('하.. 땡땡이 오빠 어딨지..'),
  close,
  // (카메라 다시 주인공)
  { camera: 'player' },
  { wait: CAM.back },
  { set: { [SAKURA5_SCENE_FLAG]: true } },
  { camera: 'player' },
];

export const jjajang_sakura5_clearing = [
  { set: { [SAKURA5_CLEARING_FLAG]: true } },
  { bgm: CLEARING_BGM, volume: 0.5, fadeIn: 0.4 },
  // 일행이 나무 밑까지 걸어 올라간다(카메라는 주인공을 따라감) → 카메라가 위로 한 칸 더(배우 눈높이)
  { parallel: [
    { move: 'player', px: game => [game.player.x, PARTY_STAND_Y], run: true, facing: 'up' },
    { move: 'gyeongsub', px: game => [game.player.x - PARTY_SIDE, PARTY_STAND_Y + 4], run: true, facing: 'up' },
    { move: 'ppaman', px: game => [game.player.x + PARTY_SIDE, PARTY_STAND_Y + 4], run: true, facing: 'up' },
  ] },
  { face: 'player', dir: 'up' },
  { camera: CLEARING_NEAR_VIEW, duration: CAM2.up },
  // 도미조림 느낌표 뜨면서 아래 쳐다봄
  { face: 'domijorim', dir: 'down' },
  { emote: 'domijorim', kind: '!', duration: 1.1, hold: 0.7 },
  D('어 형님?'),
  P('ㅋㅋ뭐냐 너네'),
  // (도현이도 아래를 쳐다봄)
  { face: 'dohyun', dir: 'down' },
  H('안녕하세요 형들'),
  P('여기서 뭐하고있어?'),
  H('그게요 저 이 벚꽃나무 보이세요?'),
  P('ㅇㅇ'),
  close,
  // (카메라 살짝 위로 갔다가 다시 돌아옴)
  { camera: CLEARING_VIEW, duration: CAM2.peek },
  { wait: CAM2.peekHold },
  { camera: CLEARING_NEAR_VIEW, duration: CAM2.backDown },
  H('사실 저기 벚꽃나무 맨 위에'),
  H('이상한 짜장면? 같은게 있는데 가순이들이 자꾸 최미스그새끼 준다고 가져와달라는거에요'),
  close,
  // 주인공 일행 모두가 느낌표
  { parallel: PARTY.map((id, i) => ({ emote: id, kind: '!', duration: 1.2, hold: 0.7, ...(i ? { sfx: false } : {}) })) },
  P('형들 이거 설마'),
  K('아마 그런거같다.'),
  H('알고계셨어요?'),
  P('도현아'),
  H('네'),
  P('저 짜장면은 우리가 가져가야될듯 ㅇㅇ'),
  H('네? 왜요?'),
  D('아따 행님들 그건 아니지라'),
  close,
  // (가순이들로 카메라가 이동)
  { camera: GIRLS_VIEW, duration: CAM2.toGirls },
  { wait: 0.2 },
  G('수근수근 뭐야?'),
  N('아무래도 저 둘은 가순이들의 시선을 의식중인 것 같다.'),
  D('저 짜장면은 제가 먼저 찾았당깨'),
  N('아무래도 도미조림은 가순이들의 시선보다 지가 처먹는게 더 중요한거같다.'),
  H('형님들 아무리 그래도 그건아니죠 .'),
  // 도현이가 슬금슬금 가순이들의 눈치를 본다(가순이들은 도현 왼쪽)
  { face: 'dohyun', dir: 'left' },
  N('도현이가 슬금슬금 가순이들의 눈치를 본다.'),
  close,
  // 카메라 다시 넓게(배우·일행 한 화면 — 판단) → 맞붙는 대사
  { camera: CLEARING_NEAR_VIEW, duration: CAM2.backDown },
  { face: 'dohyun', dir: 'down' },
  P('뭐? 너 뒤질래?'),
  H('형님들 아무리 그러시면 저희가'),
  P('응 느금마 걍 꺼지샘'),
  P('걍 족치고 가져가죠'),
  H('훗.. 악역을 자처하시겠다.'),
  close,
  { hop: 'domijorim', by: [0, 0], height: HEUMI.height, duration: HEUMI.duration, sfx: HEUMI.sfx },
  D('내꺼랑께요 흐미!!!!!!!!!!!!'),
  close,
  // (이러고 전투시작)
  { battle: DUO_BATTLE },
  { camera: 'player' },
  { wait: CAM2.back },
  { set: { [SAKURA5_CLEARING_SCENE_FLAG]: true } },
  { camera: 'player' },
];

export const jjajang_sakura5_no_right = [
  { face: 'player', dir: 'left' },
  { face: 'ppaman', dir: 'toward:player' },
  P(NO_RIGHT_LINE),
  close,
  { move: 'player', by: [-32, 0], speed: 60 },   // by 는 픽셀: 한 칸(32px) 왼쪽
  { face: 'player', dir: 'right' },
  { end: true },
];
