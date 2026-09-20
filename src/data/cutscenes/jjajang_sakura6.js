// 벚꽃 숲 6(jjajang_sakura6, BUILD277 사용자 브리핑 2026-09-20, 원문·구현표 design/narrative/cutscenes/jjajang_sakura6.md)
//   무대: 뗏목에서 내려 오른쪽 뭍 길 → 살짝 동그란 광장(중심 px 1792,384). 가면 쓴 최미스(sprite choimis_masked)가 가운데 옆 꽃 무더기(sakura6_flowers_1~4) 사이에 있다.
//   흐름: 광장 들머리 트리거 → [카메라가 천천히(2.4초) 광장 가운데로 ‖ 일행은 살짝 앞으로(카메라 왼쪽 가장자리 밖) ‖ 최미스는 꽃 1 을 딴다] → 꽃 2·3 으로 옮겨 다니며 따기(pick 자세)
//      → 가운데로 와서 앞을 봄 → 브금 loving_steps → 원문 대사(“헤헤” …) → # 스읍 미스(클립 + 가면 쓴 seup 자세) → “섹스 하는건가!!!!!!!!”(대화창 글자 진동 {shake})
//      → 왼쪽 바라봄 → 카메라 천천히(2.0초) 주인공들 쪽(주인공들과 최미스가 한 화면) → 주인공들 ‘...’ 말풍선 → 원문 대사(“미스야” 뒤 최미스 느낌표, “최미스: ...” 는 말풍선)
//      → “지켜봐줘 나의 무대.” → 최미스 오른쪽으로 걸어 나가 사라짐 → 브금 끄고 억빠맨 “ㅋㅋㅋ 뭔가 재밌을거같은데 가보죠” → 정상(카메라 주인공, 맵 브금 sakura 다시, 플래그)
//   규칙: 카메라는 먼저 천천히 움직이고 대사는 그 뒤. 대사는 전부 원문(지시문 괄호는 대사가 아님). 자세는 character-motions.js 의 gpt-image 자세 띠(가면 쓴 채). 브금 끌 때 페이드 ≥ 1초.

const CHOIMIS = 'choimis';
const PLAYER = 'player', GYEONGSUB = 'gyeongsub', PPAMAN = 'ppaman';
export const PARTY = [PLAYER, GYEONGSUB, PPAMAN];
export const CENTER = [1792, 384];                     // 광장 중심(px) = tools/maps/jjajang_sakura6.py PLAZA (56, 12)
export const CENTER_VIEW = [55.5, 11.5];               // 카메라: 뷰 가운데가 광장 중심 (cam.x = 55.5*32-224 = 1552 → 1552~2032)
export const PARTY_VIEW = [51.3, 11.5];                // 주인공들(왼쪽 1440~1536)과 최미스(가운데 1780)가 함께 보이는 자리 (1418~1898)
export const CAM = { toPlaza: 2.4, toParty: 2.0, back: 1.0 };
export const ROAD_Y = 358;                             // 길 위 발 자리(맵 spawns 의 y)
export const PARTY_SPOTS = { player: [1512, ROAD_Y], gyeongsub: [1476, ROAD_Y], ppaman: [1440, ROAD_Y] };   // 살짝 앞으로(≈64px) — 카메라 왼쪽 가장자리 1552 밖
export const FLOWER_SPOTS = [[1820, 312], [1876, 368], [1828, 432]];   // 꽃 1·2·3 왼쪽 옆(오른쪽을 보고 딴다) — 맵 CHOIMIS_START = 꽃 1 자리
export const CENTER_SPOT = [1780, 376];                // 가운데(발이 광장 중심)
export const PICK = { sfx: 'pop', volume: 0.5 };       // 꽃 따는 소리(델타룬 pop 재사용)
export const SCENE_BGM = 'loving_steps';               // 28. Loving Steps (tLAxahP5scs)
export const MAP_BGM = 'sakura';
export const EXIT_SPOT = [2212, 376];                  // 맵 오른쪽 끝 길(다음 맵으로 사라진다)
export const SAKURA6_SCENE_FLAG = 'sakura6_scene_done';

const C = text => ({ speaker: '최미스', portrait: 'choimis', voice: 'choimis', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
// 꽃 따기: 허리 굽혀 따기 → 꽃 들어 보기(pick 자세 1.05초) + pop
const pick = () => ({ parallel: [{ sfx: PICK.sfx, volume: PICK.volume }, { motion: CHOIMIS, name: 'pick' }] });

export const jjajang_sakura6_scene = [
  // 광장 들머리: 카메라가 천천히 광장 가운데로 — 그동안 일행은 살짝 앞으로(카메라에 안 잡히는 왼쪽 밖까지), 최미스는 꽃 1 을 따고 있다
  { parallel: [
    { camera: CENTER_VIEW, duration: CAM.toPlaza },
    { move: PLAYER, px: PARTY_SPOTS.player },
    { move: GYEONGSUB, px: PARTY_SPOTS.gyeongsub },
    { move: PPAMAN, px: PARTY_SPOTS.ppaman },
    [{ face: CHOIMIS, dir: 'right' }, pick(), { wait: 0.4 }],
  ] },
  // 꽃 2 → 꽃 3 으로 옮겨 다니며 따는 느낌
  { move: CHOIMIS, px: FLOWER_SPOTS[1] }, { face: CHOIMIS, dir: 'right' }, pick(), { wait: 0.3 },
  { move: CHOIMIS, px: FLOWER_SPOTS[2] }, { face: CHOIMIS, dir: 'right' }, pick(), { wait: 0.4 },
  // 그리고 최미스가 가운데로 와서 앞을 봄
  { move: CHOIMIS, px: CENTER_SPOT }, { face: CHOIMIS, dir: 'down' }, { wait: 0.6 },
  // 브금
  { bgm: SCENE_BGM, volume: 0.5, fadeIn: 0.8 }, { wait: 0.4 },
  C('헤헤'),
  C('곧 그녀에게... 고백을 할거야'),
  C('점례야..'),
  C('나랑 사귀..'),
  C('아 이런건 너무 담백한가'),
  C('어이 너 나랑 사귈래 죽을래'),
  C('허허허 막이래 ㅋㅋㅋ 큼큼'),
  C('점례야 처음본순간부터 난 너를 좋아했어'),
  C('오우 쉣 손발이 다 오그라들어'),
  close,
  // # 최미스 스읍 미스 — 2.7초 클립 + 코(가면) 비비기 → 손가락 총 자세
  { parallel: [{ sfx: 'choimis_seup_miss' }, { motion: CHOIMIS, name: 'seup' }] },
  C('이젠 나 진짜 여자친구가 생기는건가'),
  // (채팅창 진동하면서)
  { ...C(''), text: '* {shake}나 진짜 이제섹스 하는건가!!!!!!!!{/shake}' },
  close,
  // 그리고 왼쪽 바라보고 천천히 주인공들 쪽으로 — 주인공들은 카메라 왼쪽 밖에 있다가 카메라가 오면서 다시 잡힌다
  { face: CHOIMIS, dir: 'left' }, { wait: 0.5 },
  { camera: PARTY_VIEW, duration: CAM.toParty }, { wait: 0.3 },
  // 주인공들 ... 말풍선
  { bubble: PARTY },
  C('엇 이녀석들 또 여기!!'),
  K('미스야'),
  close,
  // # 최미스 느낌표
  { emote: CHOIMIS, kind: '!', duration: 0.8, hold: 0.4, sfx: 'chime' },
  K('내 돈 갚아 씨2발새끼야'),
  close,
  // 최미스: ... (말풍선)
  { bubble: CHOIMIS },
  C('형 제가 지금 당장 돈이'),
  K('씨발년아 그럼 난 지금당장 돈 있냐'),
  C('형 그럼 제 부탁하나만 들어주세요'),
  K('뭔데'),
  C('제가 곧 고백을 하는데'),
  C('이거까지만 기다려주시면 안될까요'),
  C('제발요 부탁할게요'),
  K('하아 언제하는데'),
  C('곧이요 제가 바로 옆에 이제 무대를 차려놨어요'),
  C('그녀가 무대위에 올라가있겠다고 했어요'),
  C('그럼 제가 옆에서 나타나 고백하는거에요 바로 이후에!!'),
  K('잠깐'),
  P('잠깐 이렇게 바로 그다음맵에서 고백한다고?'),
  C('ㅇㅇ'),
  P('오 씨발.'),
  C('지켜봐줘 나의 무대.'),
  close,
  // (이러고 오른쪽으로 이동함) — 오른쪽 끝 길로 걸어 나가 사라진다(카메라는 그대로, 화면 밖으로 나간 뒤)
  { face: CHOIMIS, dir: 'right' },
  { async: [{ move: CHOIMIS, px: EXIT_SPOT }, { remove: CHOIMIS }] },
  { wait: 1.2 },
  // 억빠맨: (브금꺼지고) ㅋㅋㅋ 뭔가 재밌을거같은데 가보죠
  { bgm: null, fadeOut: 1.0 },
  P('ㅋㅋㅋ 뭔가 재밌을거같은데 가보죠'),
  close,
  // 이러고 정상 — 카메라 주인공, 맵 브금 다시
  { camera: 'player', duration: CAM.back },
  { bgm: MAP_BGM, volume: 0.45, fadeIn: 0.8 },
  { set: { [SAKURA6_SCENE_FLAG]: true } },
];
