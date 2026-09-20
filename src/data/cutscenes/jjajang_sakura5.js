// 벚꽃 숲 5(jjajang_sakura5, BUILD271~272 사용자 브리핑 2026-09-20, 원문·구현표 design/narrative/cutscenes/jjajang_sakura5.md)
//   무대(2차 재배치): 거대 벚꽃 나무(768×762, 위쪽은 맵 밖 — 카메라에 맨 위가 안 보인다) 밑동 오른쪽 땅에 가순이 4·5·6 → 도현 → 도미조림, 밑동 왼쪽이 일행 자리.
//   ① 갈림목 연출(sakura5_scene): [브금 페이드아웃] → 카메라가 천천히(2.4초) 공터로 → 잠깐 멈춤 → 도미조림 “흐미!!”(두 팔 번쩍 자세 + 점프 + 가재맨 클립) → 가순이들 놀람(느낌표+살짝 점프)
//      → 원문 대사 → 카메라 천천히 주인공.
//   ② 윗길 연출(sakura5_clearing): 브금 telling → 일행이 ㄱ자로 달려 올라와 밑동 왼쪽에 → 카메라 천천히 → 도미조림 느낌표(일행 쪽) → 원문 대사(도현 손 들어 인사 자세, 카메라 살짝 위 → 돌아옴, 일행 모두 느낌표,
//      가순이들로 천천히 줌인 → 나레이션 → 줌아웃) → 맞붙는 대사 → 둘이 양옆으로 뛰어 착지(leap 자세, 홍어·횃불 뽑음) → “내꺼랑께요 흐미!!!!” → 공통 전투 진입(battleEntry) → 전투.
//   규칙: 카메라는 먼저 천천히 움직이고 대사는 그 뒤(사용자 “확 넘어가는 거 별로”). 대사는 전부 원문. 브금 끌 때 페이드 ≥ 1초. 느낌표 놀람은 hop 12 + emote. 자세는 character-motions.js 의 gpt-image 자세 띠.
import { battleEntry } from './helpers.js';
import { loopCharacterMotion } from '../../world/character-motion.js';

const D = text => ({ speaker: '도미조림', portrait: 'domijorim', voice: 'domijorim', text: `* ${text}` });
const H = text => ({ speaker: '도현', portrait: 'dohyun', voice: 'dohyun', text: `* ${text}` });
const G = text => ({ speaker: '가순이들', portrait: 'gasuni4', voice: 'gasuni', text: `* ${text}` });   // 셋이 함께 — 초상화는 가순이4(잠정)
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const N = text => ({ voice: 'narrator', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const GIRLS = ['gasuni4', 'gasuni5', 'gasuni6'];
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const actor = (game, id) => (id === 'player' ? game.player : game.entities.find(e => e.id === id));
const pose = (id, name) => ({ action: game => { const e = actor(game, id); if (e) loopCharacterMotion(e, game.characterMotions[e.def.sprite]?.[name]); } });
const unpose = ids => ({ action: game => { for (const id of ids) { const e = actor(game, id); if (e) e.motion = null; } } });
/** 놀라서 살짝 점프(공식 점프 소리 ✗) + 느낌표 — cutscene 스킬 표 그대로. 소리는 첫 사람만 */
const startle = ids => ({ parallel: ids.flatMap((id, i) => [{ hop: id, height: 12, duration: 0.3, sfx: false }, { emote: id, kind: '!', duration: 1.1, hold: 0.7, ...(i ? { sfx: false } : { sfx: 'chime' }) }]) });

export const CLEARING_VIEW = [55, 9];        // 카메라 목표(칸): 밑동 양쪽(왼쪽 일행 자리 ~ 오른쪽 도미조림)이 한 화면, y 124 — 배우 발(314)이 대화창(230) 위 190, 수관 아래(176)가 위쪽 52px
export const PEEK_VIEW = [55, 5];            // “카메라 살짝 위로”: y 0 — 수관만 보이고 맨 위(-412)는 여전히 밖
export const CAM = { toClearing: 2.4, settle: 0.6, peek: 1.6, peekHold: 0.7, peekBack: 1.4, back: 1.4 };   // 카메라가 먼저 천천히 가고 대사는 그 뒤
export const GIRLS_ZOOM = { zoom: 1.6, at: [1838, 296], duration: 1.4 };   // (가순이들로 카메라가 이동): 가순이 셋 가운데(맵 meta girlsFocus)로 천천히 줌인
export const HEUMI = { height: 30, duration: 0.5, sfx: 'domijorim_heumi' };   // “흐미!!” 점프 + 가재맨 1:14:46.8 “흐미이이이!” 1.05초
export const PARTY_SPOTS = { player: [1704, 364], gyeongsub: [1660, 368], ppaman: [1748, 368] };   // 윗길 그대로 올라와 밑동 바로 아래 가운데(발 380, 사용자 “왼쪽으로 오지 말고 그냥 가운데”) — 경섭 왼쪽·억빠맨 오른쪽 나란히
export const PARTY_WALK = { followerY: 392 };   // 동료는 위로 올라온 뒤 옆으로 한 걸음(44px)만
export const LEAP = { domijorim: { by: [-402, 66], height: 80 }, dohyun: { by: [-120, 66], height: 56 }, duration: 0.8 };   // 둘이 뛰어 내려와 일행 양옆(같은 높이 발 380): 도미조림 x 1580(경섭 왼쪽), 도현 1812(억빠맨 오른쪽) → 일행을 본다
export const LEAP_VIEW = [55, 10];          // 윗길 연출 카메라(y 156): 배우(발 314 → 158)·일행(발 380 → 224)·착지한 둘까지 대화창 위에
export const DUO_BATTLE = { enemies: ['domijorim', 'dohyun'], bgm: 'petal_dance', bg: 'sakura', flag: 'sakura5_duo_won' };
export const SAKURA5_SCENE_FLAG = 'sakura5_scene_done';
export const SAKURA5_CLEARING_FLAG = 'sakura5_clearing_visited';
export const SAKURA5_CLEARING_SCENE_FLAG = 'sakura5_clearing_scene_done';
export const CLEARING_BGM = 'telling';
export const NO_RIGHT_LINE = '위로 먼저 가볼까요?';

export const jjajang_sakura5_scene = [
  { bgm: null, fadeOut: 1.0 },
  { face: 'player', dir: 'up' },
  // (카메라가 천천히 위 공터로 — 거대한 벚꽃 나무 밑동 오른쪽의 다섯) → 멈춘 뒤 연출
  { camera: CLEARING_VIEW, duration: CAM.toClearing },
  { wait: CAM.settle },
  // 도미조림 “흐미!!”: 두 팔 번쩍 자세(heumi 띠) + 점프 + 클립
  { parallel: [{ motion: 'domijorim', name: 'heumi', sfx: HEUMI.sfx }, { hop: 'domijorim', by: [0, 0], height: HEUMI.height, duration: HEUMI.duration, sfx: false }] },
  D('흐미!!'),
  // 가순이들 놀람(살짝 점프 + 느낌표) → 도미조림 쪽을 본다
  ...GIRLS.map(id => ({ face: id, dir: 'right' })),
  startle(GIRLS),
  G('깜짝이야!'),
  D('아따 전라도 홍어가 최고랑께'),
  { face: 'dohyun', dir: 'left' },
  H('어ㅋㅋ 가순이분들 괜찮으세요?'),
  // 사용자 정정: “도미조림형이 악역을 자처해서..” 는 도현 대사
  H('도미조림형이 악역을 자처해서..'),
  ...GIRLS.map(id => ({ face: id, dir: 'right' })),
  G('하.. 땡땡이 오빠 어딨지..'),
  close,
  // (카메라 천천히 다시 주인공)
  { camera: 'player' },
  { wait: CAM.back },
  { set: { [SAKURA5_SCENE_FLAG]: true } },
  { camera: 'player' },
];

export const jjajang_sakura5_clearing = [
  { set: { [SAKURA5_CLEARING_FLAG]: true } },
  { bgm: CLEARING_BGM, volume: 0.5, fadeIn: 0.6 },
  // 일행이 윗길 그대로 달려 올라와 밑동 바로 아래 가운데에(주인공은 곧장 위로, 동료는 올라온 뒤 옆으로 한 걸음)
  { parallel: [
    [{ move: 'player', px: PARTY_SPOTS.player, run: true, facing: 'up' }],
    [{ move: 'gyeongsub', px: [PARTY_SPOTS.gyeongsub[0], PARTY_WALK.followerY], run: true, facing: 'up' }, { move: 'gyeongsub', px: PARTY_SPOTS.gyeongsub, run: true, facing: 'up' }],
    [{ move: 'ppaman', px: [PARTY_SPOTS.ppaman[0], PARTY_WALK.followerY], run: true, facing: 'up' }, { move: 'ppaman', px: PARTY_SPOTS.ppaman, run: true, facing: 'up' }],
  ] },
  ...PARTY.map(id => ({ face: id, dir: 'right' })),
  // (카메라 천천히 — 일행과 다섯이 한 화면) → 멈춘 뒤 도미조림 느낌표, 일행 쪽을 본다
  { camera: LEAP_VIEW, duration: CAM.toClearing },
  { wait: CAM.settle },
  { face: 'domijorim', dir: 'toward:player' },
  startle(['domijorim']),
  D('어 형님?'),
  P('ㅋㅋ뭐냐 너네'),
  // (도현이도 일행 쪽을 본다) 손 들어 인사 자세로 “안녕하세요 형들”
  { face: 'dohyun', dir: 'toward:player' },
  { motion: 'dohyun', name: 'wave' },
  pose('dohyun', 'hello'),
  H('안녕하세요 형들'),
  unpose(['dohyun']),
  P('여기서 뭐하고있어?'),
  H('그게요 저 이 벚꽃나무 보이세요?'),
  P('ㅇㅇ'),
  close,
  // (카메라 살짝 위로 갔다가 다시 돌아옴 — 천천히, 나무 맨 위는 화면 밖)
  { camera: PEEK_VIEW, duration: CAM.peek },
  { wait: CAM.peekHold },
  { camera: LEAP_VIEW, duration: CAM.peekBack },
  { wait: 0.4 },
  H('사실 저기 벚꽃나무 맨 위에'),
  H('이상한 짜장면? 같은게 있는데 가순이들이 자꾸 최미스그새끼 준다고 가져와달라는거에요'),
  close,
  // 주인공 일행 모두가 느낌표(살짝 점프)
  startle(PARTY),
  P('형들 이거 설마'),
  K('아마 그런거같다.'),
  H('알고계셨어요?'),
  P('도현아'),
  H('네'),
  P('저 짜장면은 우리가 가져가야될듯 ㅇㅇ'),
  H('네? 왜요?'),
  D('아따 행님들 그건 아니지라'),
  close,
  // (가순이들로 카메라가 이동 — 천천히 줌인) → 멈춘 뒤 대사
  { zoom: GIRLS_ZOOM.zoom, at: GIRLS_ZOOM.at, duration: GIRLS_ZOOM.duration },
  { wait: 0.5 },
  G('수근수근 뭐야?'),
  N('아무래도 저 둘은 가순이들의 시선을 의식중인 것 같다.'),
  D('저 짜장면은 제가 먼저 찾았당깨'),
  N('아무래도 도미조림은 가순이들의 시선보다 지가 처먹는게 더 중요한거같다.'),
  H('형님들 아무리 그래도 그건아니죠 .'),
  // 도현이가 슬금슬금 가순이들의 눈치를 본다(가순이들은 도현 왼쪽)
  { face: 'dohyun', dir: 'left' },
  N('도현이가 슬금슬금 가순이들의 눈치를 본다.'),
  close,
  // 줌아웃(천천히) → 맞붙는 대사
  { zoom: 1, duration: 1.0 },
  { wait: 0.4 },
  { face: 'dohyun', dir: 'toward:player' },
  P('뭐? 너 뒤질래?'),
  H('형님들 아무리 그러시면 저희가'),
  P('응 느금마 걍 꺼지샘'),
  P('걍 족치고 가져가죠'),
  H('훗.. 악역을 자처하시겠다.'),
  close,
  // 둘이 뛰어 내려와 일행 양옆(같은 높이)에 서서 일행을 바라본다 — 뛰는 자세(leap 띠: 웅크림 → 공중에서 홍어 뽑음 → 착지 → 전투 자세), 착지음
  { async: [{ wait: LEAP.duration }, { sfx: 'thud' }] },
  { parallel: [
    { motion: 'domijorim', name: 'leap', sfx: 'jump' }, { hop: 'domijorim', by: LEAP.domijorim.by, height: LEAP.domijorim.height, duration: LEAP.duration, sfx: false },
    { motion: 'dohyun', name: 'leap' }, { hop: 'dohyun', by: LEAP.dohyun.by, height: LEAP.dohyun.height, duration: LEAP.duration, sfx: false },
  ] },
  pose('domijorim', 'ready'), pose('dohyun', 'ready'),
  { face: 'domijorim', dir: 'right' }, { face: 'dohyun', dir: 'left' },
  { face: 'player', dir: 'left' }, { face: 'gyeongsub', dir: 'left' }, { face: 'ppaman', dir: 'right' },
  { hop: 'domijorim', by: [0, 0], height: HEUMI.height, duration: HEUMI.duration, sfx: HEUMI.sfx },
  D('내꺼랑께요 흐미!!!!!!!!!!!!'),
  close,
  // (이러고 전투시작) — 공통 진입(battle_start·흔들림·소용돌이·줌·페이드)
  ...battleEntry(DUO_BATTLE.enemies, DUO_BATTLE.bgm),
  { battle: DUO_BATTLE },
  // 전투 뒤 복귀(battleEntry 의 줌·페이드아웃은 장면이 되돌린다 — teal3_toolbox 와 같은 순서): 줌 1 → 공터 카메라 → 페이드인 → 공터 브금 이어서(장면이 소유) → 천천히 주인공
  unpose(['domijorim', 'dohyun']),
  { zoom: 1 }, { camera: LEAP_VIEW, duration: 0.01 },
  { fade: 'in', duration: 0.5 },
  { bgm: CLEARING_BGM, volume: 0.5, fadeIn: 0.8 },
  { wait: 0.6 },
  { camera: 'player' },
  { wait: CAM.back },
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
