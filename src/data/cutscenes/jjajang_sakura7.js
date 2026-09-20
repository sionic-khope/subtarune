// 벚꽃 숲 7(jjajang_sakura7, BUILD278 사용자 브리핑 2026-09-20 네 통, 원문·구현표 design/narrative/cutscenes/jjajang_sakura7.md)
//   무대: 들 맨 위 결혼식 나무 무대(그림 528,96 · 판자 윗면 y 185~263), 무대 아래 관객 가순이 열넷(위를 본다), 일행 자리는 관객 뒤 가운데(708,424).
//   흐름: 들머리 트리거 → 셋 느낌표 → 카메라 천천히(2.4초) 무대로 → 셋이 가운데로 걸어와 위를 봄 → 화면이 점차 어두워짐(dim 2.5초, 맵 브금은 같이 꺼짐) → 치지직 ×2 → 나레이션
//      → 브금 loving_steps 다시 → (천천히) 무대 가운데 스포트라이트 쾅(boom + 흔들림) → 점례(드레스 가순이)가 뒤에서 천천히 어둠 속에서 걸어 나옴 → 한 줄마다 한 걸음(뮤지컬)
//      → 최미스 말풍선만 “아니. 그대여.”(어둠 속, 글 말풍선) → 점례 느낌표·오른쪽 → 가면 최미스가 천천히 걸어 나옴 → 원문 대사(스읍 미스 = 클립 + 가면 seup) → “나랑.. 사귀” 중간에
//      도미조림이 하늘에서 쿵(“흐미!!!!!!! 내 홍어 어디갔당가!!!”) → 닿자마자 가면 벗겨져 점례 뒤에 떨어짐·최미스 뒷모습으로 넘어짐 → 도미조림 통통 튀어 도망 → 점례 뒤 잠깐 봄 → “이게뭐지.” “혹시 땡떙씨”
//      → 브금 끔(불도 켜짐) → 최미스 일어남(뒷모습) → 2초 → 앞모습 + crowd_ooh → “...?” → 카메라 살짝 아래 관객 “....?” → 다시 가운데 → 최미스 ‘...’ 말풍선 → “어 하이.” → 2초 뒤 관객 난동 6초
//      (야유 소리 + 토마토·계란·쓰레기·사과 심 날아와 무대에 떨어짐 + 가순이들 발 동동·양옆·앞) → “아 시발. 점례야” → 점례 ‘...’ → “꺼져 씨발새끼야” → 달려가 박치기 → 최미스 날아감(야유 계속)
//      → 카메라 주인공들 → 원문 넉 줄 → 카메라 오른쪽 길 → 다시 주인공들 → 플래그.
//   규칙: 카메라는 먼저 천천히 움직이고 대사는 그 뒤. 대사는 전부 원문(괄호 지시문은 대사 아님). 자세는 gpt-image 자세 띠(가면 seup, 도미조림 heumi). 브금 끌 때 페이드 ≥ 1초. 어둠·스포트라이트는 연출 끝에 되돌린다.

const PLAYER = 'player', GYEONGSUB = 'gyeongsub', PPAMAN = 'ppaman';
const JEOMNYE = 'jeomnye', CHOIMIS = 'choimis', CHOIMIS_BARE = 'choimis_bare', DOMI = 'domijorim', MASK = 'discord_mask';
export const PARTY = [PLAYER, GYEONGSUB, PPAMAN];
export const CROWD = Array.from({ length: 14 }, (_, i) => `crowd_${i + 1}`);
export const THROWS = Array.from({ length: 14 }, (_, i) => `throw_${i + 1}`);
export const STAGE_VIEW = [22, 8.2];                   // 카메라: 무대(판자 185~263)·관객·일행 자리(발 440)가 한 화면 (cam 480, 98 → y 98~458). 대화 중 보이는 230px 안에 무대·배우
export const CROWD_VIEW = [22, 9.7];                   // “가순이들로 카메라가 살짝 밑으로” (y 146~506)
export const RIGHT_ROAD_VIEW = [34, 21.5];             // “오른쪽에 길이 있네” (x 는 맵 끝 736 으로 클램프 → 오른쪽 길이 화면 오른쪽)
export const CAM = { toStage: 2.4, down: 1.2, back: 1.2, toParty: 1.4, toRoad: 1.4 };
export const DARK = { dim: 0.88, duration: 2.5 };      // 화면이 점차 어두워짐
export const SPOT = { x: 720, y: 254, rx: 76, ry: 42, alpha: 0.35 };   // 무대 가운데 앞 스포트라이트 = 맵 meta.sakura7.spot
export const PARTY_SPOTS = { player: [708, 424], gyeongsub: [668, 428], ppaman: [748, 428] };
export const JEOMNYE_SPOT = [708, 236];
export const JEOMNYE_STEPS = [[694, 236], [680, 236], [694, 236], [708, 236], [694, 236]];   // 한 줄마다 한 걸음(14px) — 스포트라이트 안에서 왔다 갔다
export const CHOIMIS_SPOT = [764, 236];
export const SLOW = { jeomnye: 20, choimis: 22 };      // move speed(16px 단위): 40·44px/s — “천천히 걸어 나옴”
export const FALL = { from: -380, duration: 0.45 };    // 도미조림: 하늘(위 380px)에서 쿵
export const BOUNCE = [{ by: [56, -8], height: 40, duration: 0.32 }, { by: [64, 4], height: 34, duration: 0.3 }, { by: [72, 0], height: 28, duration: 0.28 }];   // 통통 튀어 도망(오른쪽)
export const MASK_OFF = { by: [-60, -4], height: 30, duration: 0.45, spin: 1 };   // 최미스 머리(776,196)에서 점례 바로 뒤(716,192 — 점례보다 위, 몸에 살짝 가려진다)로
export const RIOT = { seconds: 6.0, throwEvery: 0.37, first: 0.3, hop: { duration: 0.55, heightMin: 56, heightMax: 92 } };
export const HEADBUTT = { dash: true, bump: { by: [10, 0], height: 8, duration: 0.15, sfx: 'punch' }, fling: { vx: 560, vup: 520, spin: 14, sfx: 'hit' } };
export const SCENE_BGM = 'loving_steps';
export const MAP_BGM = 'sakura';
export const SAKURA7_SCENE_FLAG = 'sakura7_scene_done';

const C = text => ({ speaker: '최미스', portrait: 'choimis', voice: 'choimis', text: `* ${text}` });
const J = text => ({ speaker: '점례', portrait: 'jeomnye', voice: 'gasuni', text: `* ${text}` });
const D = text => ({ speaker: '도미조림', portrait: 'domijorim', voice: 'domijorim', text: `* ${text}` });
const G = text => ({ speaker: '가순이들', portrait: 'gasuni1', voice: 'gasuni', text: `* ${text}` });   // 관객 가순이들 — 초상화는 가순이1(잠정)
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const N = text => ({ voice: 'narrator', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const actor = (game, id) => game.entities.find(e => e.id === id);
/** 놀라서 살짝 점프 + 느낌표(소리는 첫 사람만) */
const startle = ids => ({ parallel: ids.flatMap((id, i) => [{ hop: id, height: 12, duration: 0.3, sfx: false }, { emote: id, kind: '!', duration: 1.1, hold: 0.7, ...(i ? { sfx: false } : { sfx: 'chime' }) }]) });
/** 한 줄마다 한 걸음: 천천히 14px 걷고(걷기 모션) 대사 */
const step = (i, line) => [{ move: JEOMNYE, px: JEOMNYE_STEPS[i], speed: SLOW.jeomnye, exact: true }, { face: JEOMNYE, dir: 'down' }, line];
/** 도미조림을 하늘 위에 세우고 보이게 */
const placeAbove = { action: game => { const d = actor(game, DOMI), c = actor(game, CHOIMIS); if (d && c) { d.x = c.x - 4; d.y = c.y + FALL.from; d.visible = true; } } };
/** 가면 벗겨짐: 가면 소품을 최미스 머리에 세우고 보이게, 가면 최미스 → 가면 벗은 최미스(뒷모습으로 넘어짐) */
const maskOff = { action: game => {
  const c = actor(game, CHOIMIS), b = actor(game, CHOIMIS_BARE), m = actor(game, MASK);
  if (c && m) { m.x = c.x + 12; m.y = c.y - 40; m.def.ix = c.x - 11; m.def.iy = c.y - 52; m.visible = true; }
  if (c && b) { b.x = c.x; b.y = c.y; b.visible = true; b.facing = 'up'; b.motion = null; b.spin = -Math.PI / 2; c.visible = false; c.solid = false; }
} };
const settleMask = { action: game => { const m = actor(game, MASK); if (!m) return; m.def.ix = (m.def.ix ?? m.x) + (m.flyX || 0); m.def.iy = (m.def.iy ?? m.y) + (m.flyY || 0); m.x += (m.flyX || 0); m.y += (m.flyY || 0); m.flyX = 0; m.flyY = 0; m.spin = 0; } };
const standUpBack = { action: game => { const b = actor(game, CHOIMIS_BARE); if (b) { b.spin = 0; b.facing = 'up'; } } };
const lightsOn = [{ spotlight: null }, { dim: 0, duration: 1.5 }];
/** 관객 난동 6초: 야유 + 던지기(관객 자리에 숨긴 것들이 무대 최미스 쪽으로 날아와 떨어진다) + 가순이들 발 동동·양옆·앞 */
const riot = () => {
  // 던지기: 관객 자리에 숨긴 것들이 무대 최미스 근처(앞 가운데 오른쪽)로 포물선 → 떨어져 그대로 남는다. hop 의 by(px)는 실행 때 최미스 자리로 계산한다(action 이 hop 노드의 by 를 채운 뒤 hop 실행)
  const aimed = THROWS.map((id, i) => {
    const hop = { hop: id, by: [0, 0], height: RIOT.hop.heightMin + ((i * 37) % (RIOT.hop.heightMax - RIOT.hop.heightMin)), duration: RIOT.hop.duration, sfx: false, keep: true };
    const aim = { action: game => { const t = actor(game, id), b = actor(game, CHOIMIS_BARE); if (t && b) hop.by = [b.x + 12 - 20 + ((i * 53) % 41) - t.x, b.y + 4 + ((i * 31) % 17) - t.y]; } };
    return [{ wait: RIOT.first + i * RIOT.throwEvery }, { show: id }, aim, hop, { sfx: i % 4 >= 2 ? 'thud' : 'splash', volume: 0.5 }];
  });
  // 가순이들: 발 동동(살짝 두 번 뛰기)·양옆 봤다가 앞(위) — 세 번 되풀이 ≈ 6초, 시작은 조금씩 어긋나게
  const stomps = CROWD.map((id, i) => [{ wait: (i * 0.13) % 0.9 }, ...Array.from({ length: 3 }, () => [
    { face: id, dir: 'left' }, { wait: 0.35 }, { face: id, dir: 'right' }, { wait: 0.35 }, { face: id, dir: 'up' },
    { hop: id, by: [0, 0], height: 5, duration: 0.2, sfx: false }, { hop: id, by: [0, 0], height: 5, duration: 0.2, sfx: false }, { wait: 0.3 },
  ]).flat()]);
  const boos = [{ sfx: 'crowd_roar', volume: 0.9 }, { wait: 2.6 }, { sfx: 'crowd_roar_2', volume: 0.9 }, { wait: 2.4 }, { sfx: 'crowd_roar', volume: 0.8 }];
  return { parallel: [boos, ...aimed, ...stomps, [{ wait: RIOT.seconds }]] };
};

export const jjajang_sakura7_scene = [
  // 오른쪽으로 어느 정도 가면 주인공들이 느낌표 → 카메라가 천천히 무대 쪽으로 → 가운데에 주인공들 세 명이 걸어온다(위를 본다)
  startle(PARTY),
  { camera: STAGE_VIEW, duration: CAM.toStage },
  { parallel: PARTY.map(id => ({ move: id, px: PARTY_SPOTS[id], run: true })) },
  { parallel: PARTY.map(id => ({ face: id, dir: 'up' })) },
  { wait: 0.6 },
  // 그리고 나서 화면이 점차 어두워짐(맵 브금도 같이 잦아든다)
  { parallel: [{ dim: DARK.dim, duration: DARK.duration }, { bgm: null, fadeOut: 2.0 }] },
  { wait: 0.4 },
  // 치지직. 치지직.
  { sfx: 'static_burst', volume: 0.7 }, { wait: 0.8 }, { sfx: 'static_burst', volume: 0.7 }, { wait: 0.9 },
  N('지금부터 그남자와 그여자의 무대를 시작하겠습니다.'),
  close,
  // 이 브금 다시 나오면서
  { bgm: SCENE_BGM, volume: 0.5, fadeIn: 1.0 },
  { wait: 1.4 },
  // 천천히 … 무대 가운데에 스포트라이트 동그랗게 쾅 하고 켜짐
  { parallel: [{ spotlight: SPOT }, { sfx: 'boom', volume: 0.8 }, { shake: 0.25, amp: 3 }] },
  { wait: 1.0 },
  // 뒤에서 천천히 어둠 속에서 걸어 나오는 한 여자(드레스 입은 가순이 = 점례)
  { show: JEOMNYE },
  { move: JEOMNYE, px: JEOMNYE_SPOT, speed: SLOW.jeomnye, exact: true }, { face: JEOMNYE, dir: 'down' }, { wait: 0.6 },
  // 대사를 칠 때마다 한 걸음씩(뮤지컬)
  ...step(0, J('아 외로워')),
  ...step(1, J('나의 외로움을 달래줄 어떤이가 없는것인가')),
  ...step(2, J('흑흑흑')),
  ...step(3, J('오늘도 나는 천천히')),
  ...step(4, J('하루를 보내다 잠에 들겠지.')),
  close,
  // 최미스 말풍선만: 아니. 그대여. (무대 오른쪽 어둠 속 — 글 말풍선만 보인다)
  { show: CHOIMIS },
  { balloon: CHOIMIS, say: '아니. 그대여.' },
  // 점례 느낌표 그리고 오른쪽을 바라봄
  { emote: JEOMNYE, kind: '!', duration: 0.8, hold: 0.4, sfx: 'chime' }, { face: JEOMNYE, dir: 'right' },
  // 최미스가 천천히 걸어 나옴(가면 쓴 채)
  { move: CHOIMIS, px: CHOIMIS_SPOT, speed: SLOW.choimis, exact: true }, { face: CHOIMIS, dir: 'left' }, { wait: 0.5 },
  C('안녕.'),
  C('나 가재맨방 고닉. 최미스'),
  J('헐 가재맨 방 고닉???'),
  close,
  // 최미스: 스읍 미스 — 클립 + 가면 쓴 seup 자세, 대사는 목소리 없이
  { async: [{ sfx: 'choimis_seup_miss' }, { motion: CHOIMIS, name: 'seup' }] },
  { ...C('스읍 미스'), voice: 'none' },
  C('혹시 너 뭐해?'),
  J('나? 나 그냥.. 아무것도.'),
  C('혹시'),
  C('난 너가 마음에 들어.'),
  J('헉!'),
  C('스읍..'),
  C('나랑 진지하게...'),
  C('..후훗.. 이런말 부끄럽군'),
  J('두근두근..'),
  // 최미스: 나랑.. 사귀 (이때 중간에 갑자기 치고 들어오면서) — 다 찍히고 곧바로
  { ...C('나랑.. 사귀'), auto: 0.35 },
  close,
  // 도미조림: 하늘에서 쿵 → 닿자마자 가면 벗겨짐·최미스 뒷모습으로 넘어짐·가면은 점례 뒤로
  placeAbove,
  { parallel: [
    { hop: DOMI, by: [0, -FALL.from], height: 0, duration: FALL.duration, sfx: false },
    [{ wait: FALL.duration - 0.05 }, { sfx: 'thud', volume: 0.9 }, { shake: 0.3, amp: 4 }],
  ] },
  maskOff,
  { parallel: [
    { hop: MASK, by: MASK_OFF.by, height: MASK_OFF.height, duration: MASK_OFF.duration, spin: MASK_OFF.spin, sfx: false, keep: true },
    { motion: DOMI, name: 'heumi', sfx: 'domijorim_heumi' },
  ] },
  settleMask,
  D('흐미!!!!!!! 내 홍어 어디갔당가!!!'),
  close,
  // 바로 다시 다른 곳으로 통통 튀어서 도망감
  ...BOUNCE.map(b => ({ hop: DOMI, by: b.by, height: b.height, duration: b.duration, sfx: 'jump' })),
  { remove: DOMI },
  // 점례가 뒤를 잠깐 보다가
  { face: JEOMNYE, dir: 'up' }, { wait: 0.8 }, { face: JEOMNYE, dir: 'down' }, { wait: 0.3 },
  J('이게뭐지.'),
  J('혹시 땡떙씨'),
  close,
  // (브금이 꺼지고 최미스가 일어나고 뒷모습이었다가 2초쯤 지나고 앞모습이 됨 — 이때 효과음 crowd_ooh) 불도 다시 켜진다
  { parallel: [{ bgm: null, fadeOut: 1.0 }, ...lightsOn] },
  standUpBack,
  { wait: 2.0 },
  { parallel: [{ face: CHOIMIS_BARE, dir: 'down' }, { sfx: 'crowd_ooh', volume: 0.9 }] },
  { wait: 1.2 },
  J('...?'),
  close,
  // # 가순이들로 카메라가 살짝 밑으로
  { camera: CROWD_VIEW, duration: CAM.down }, { wait: 0.3 },
  G('....?'),
  close,
  // # 다시 미스 쪽으로 가운데로
  { camera: STAGE_VIEW, duration: CAM.back }, { wait: 0.2 },
  { bubble: CHOIMIS_BARE },
  C('어 하이.'),
  close,
  // 2초쯤 뒤 관객들의 함성·야유·난동: 토마토·쓰레기·계란 등이 무대로 날아오고 가순이들은 발 동동·양옆·앞 (6초)
  { wait: 2.0 },
  riot(),
  C('아 시발. 점례야'),
  close,
  { bubble: JEOMNYE },
  J('꺼져 씨발새끼야'),
  close,
  // 점례가 최미스한테 달려가 박치기 → 최미스는 역동적으로 날아감(야유는 계속)
  { move: JEOMNYE, rel: CHOIMIS_BARE, at: 'left', by: [-2, 0], dash: HEADBUTT.dash, exact: true }, { face: JEOMNYE, dir: 'right' },
  { parallel: [{ hop: JEOMNYE, ...HEADBUTT.bump }, { shake: 0.2, amp: 4 }] },
  { parallel: [{ fling: CHOIMIS_BARE, ...HEADBUTT.fling }, { sfx: 'crowd_roar_2', volume: 0.9 }] },
  { wait: 0.4 },
  // 다시 주인공들로 카메라
  { camera: 'player', duration: CAM.toParty },
  P('ㅋㅋㅋ'),
  K('아이고 저런'),
  P('ㅈㄴ웃긴데요 ㅋㅋ'),
  K('일단 뭐.. 가볼까? 오른쪽에 길이 있네.'),
  close,
  // (오른쪽 카메라 비추고 다시 주인공들 포커스)
  { camera: RIGHT_ROAD_VIEW, duration: CAM.toRoad }, { wait: 0.8 },
  { camera: 'player', duration: CAM.toParty },
  { bgm: MAP_BGM, volume: 0.45, fadeIn: 0.8 },
  { set: { [SAKURA7_SCENE_FLAG]: true } },
];
