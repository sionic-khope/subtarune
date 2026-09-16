// 용광로 광장(youngcle18) 도착 연출 — 사용자 2026-09-16 브리핑 원문 그대로(design/narrative/cutscenes/furnace_arena.md).
// 흐름: 브금 꺼짐 → 셋이 천천히 들어와 느낌표 → 용암 앞으로 → 대사 → 영클 ‘후후후’ → 느낌표 → 영클 TV 가 모니터암을 타고 드르르륵 내려오고 셋은 뒷걸음
//   → TV 켜짐·영클 브금(storage_show) → 대사 → 카메라 위로: 밧줄 철창(쥰희·용준) 덜렁 내려와 좌우로 흔들림 → 느낌표 → 대사 → TV 가 올라갔다 철창 왼쪽 옆으로 다시 내려와 조롱
//   → 쥰희가 왼쪽(TV)을 보며 철창을 발로 참 → 대사 → TV 접힘 → 일행 앞으로 다시 내려와 규칙 설명(밧줄로 카메라 갔다 옴) → TV 접히고 살짝 오른쪽에서 대기 → 조작 복귀.
// TV 는 맵 소품 youngcle_tv(방송 앵커) + youngcle_tv_arm 을 slide 로 같이 움직인다(위로 들어갔다 나왔다 자유롭게). 노란 패널 이벤트는 다음 브리핑.
import { TvBroadcast } from '../../world/tv-broadcast.js';
import { YOUNGCLE_TV_ARENA as TV } from '../youngcle-tv.js';

const JID = 'arena_junhee', YID = 'arena_yongjun', CAGE = 'lava_cage', TVID = 'youngcle_tv', ARM = 'youngcle_tv_arm';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
// 맵 좌표(tools/maps/youngcle18.py): TV 홈 = 웅덩이 오른쪽 끝(사용자 “오른쪽 끝에 세워두는 게 맞는 듯” — 인사·규칙·대기 전부 여기), 조롱 때만 철창 왼쪽(쥰희가 왼쪽을 보며 찬다).
// 철창은 웅덩이 오른쪽 부분(x520, 136 폭)에 매달려 화면 오른쪽 위에서 보이며 내려온다. TV 는 0.82 배, 접힌 채(foldX 0.06) 내려와 펼쳐진다(갤럭시 폴드)
const TV_HOME = [672, 110], TV_LEFT = [272, 60], TV_FOLDED = 0.06, ARM_DX = 112, ARM_DY = -298;
const CAGE_DROP = 280;
const J = text => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: '* ' + text });
const Y = text => ({ speaker: '박용준', portrait: 'yongjun', voice: 'yongjun', text: '* ' + text });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ' + text });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* ' + text });
const V = (text, expression = 'smirk') => [
  { action: game => game.tvBroadcast.setExpression(expression) },
  { speaker: '영클', portrait: `youngcle_tv_${expression}`, voice: 'youngcle', text: '* ' + text },
];
const close = { action: game => game.textbox.close() };
const ent = (game, id) => game.entities.find(e => e.id === id && !e.dead);
const bang = ids => ({ parallel: ids.map(id => ({ emote: id, kind: '!', duration: 1.1, hold: 0.45 })) });
const FENCE = 'lava_fence_8';   // 울타리 가운데(살짝 오른쪽) 칸 — 일행 자리의 기준물(오른쪽 끝 TV 와 한 화면에)
const setPos = (e, x, y) => { e.x = x; e.y = y; if (e.def.ix !== undefined) { e.def.ix = x; e.def.iy = y; } };
// TV: (x,y) 최종 자리의 360px 위(화면 밖)에 접힌 프레임·모니터암(프레임 안으로 22px 겹침)을 두고 드르르륵 내려온 뒤 펼쳐진다 / 접혀서 올라간다
const tvPlace = ([x, y]) => ({ action: game => { const tv = ent(game, TVID), arm = ent(game, ARM); setPos(tv, x, y - 360); tv.def.foldX = TV_FOLDED; setPos(arm, x + ARM_DX, y - 360 + ARM_DY); } });
const tvDown = (dur = 2.0) => [
  { parallel: [{ slide: TVID, by: [0, 360], duration: dur, sfx: 'rumble' }, { slide: ARM, by: [0, 360], duration: dur }] },
  { fold: TVID, to: 1, duration: 0.55, sfx: 'plug' },
];
const tvUp = (dur = 1.1) => [
  { fold: TVID, to: TV_FOLDED, duration: 0.45, sfx: 'click' },
  { parallel: [{ slide: TVID, by: [0, -360], duration: dur, sfx: 'rumble' }, { slide: ARM, by: [0, -360], duration: dur }] },
];
const tvOn = [{ action: game => game.tvBroadcast.power(true) }, { wait: TV.powerTime }];
const tvOff = [close, { action: game => game.tvBroadcast.power(false) }, { wait: TV.shutdownTime }];
// 카메라: 일행(왼쪽 아래) + 오른쪽 끝 TV / 철창이 화면 오른쪽 위에서 내려옴 / 철창 + 왼쪽 TV(조롱) / 밧줄
const CAM_PARTY = { camera: [21, 6.6], duration: 0.6 }, CAM_CAGE = { camera: [13.5, 4.8], duration: 0.6 }, CAM_MOCK = { camera: [14.5, 4.5], duration: 0.6 }, CAM_ROPE = { camera: [18.5, 2.4], duration: 0.5 };
// 좌우 데롱데롱: 철창 소품이 흔들리고 carry(쥰희·용준)가 같이 실려 움직인다
const cageSway = { action: game => { const c = ent(game, CAGE); if (c) { c.def.oscillate = { dx: 10, period: 2.4 }; c.base = undefined; } } };

export const furnace_arena_intro = Object.assign([
  { if: flags => flags.furnace_arena_intro_done, goto: 'seen' },
  { action: game => { game.finishTvBroadcast(); game.tvBroadcast = new TvBroadcast(game, TV); game.sound.preloadBgm(TV.bgm); } },
  { bgm: null, fadeOut: 0.2 },
  // 캐릭터들이 천천히 들어오고 느낌표
  { parallel: PARTY.map((id, i) => ({ move: id, rel: FENCE, at: 'bottom', by: [[0, -44, 44][i], 136], speed: 35 })) },
  ...PARTY.map(id => ({ face: id, dir: 'up' })),
  bang(PARTY),
  // 후에 용암쪽 앞으로 온다
  { parallel: PARTY.map((id, i) => ({ move: id, rel: FENCE, at: 'bottom', by: [[0, -44, 44][i], 40], speed: 60 })) },
  ...PARTY.map(id => ({ face: id, dir: 'up' })),
  P('와 ㅈㄴ 무섭네요'),
  G('그렇네..'),
  { speaker: '영클', voice: 'youngcle', text: '* 후후후' },
  close,
  bang(PARTY),
  // 위에서 티비가 천천히 드르르륵 모니터암처럼 내려오고(접힌 채) — 캐릭터들은 뒷걸음(위를 본 채 미끄러져 물러남) — 내려온 뒤 펼쳐진다
  CAM_PARTY,
  tvPlace(TV_HOME),
  { parallel: [tvDown(2.2)[0], ...PARTY.map(id => ({ slide: id, by: [0, 36], duration: 1.3 }))] },
  tvDown()[1],
  ...PARTY.map(id => ({ face: id, dir: 'up' })),
  ...tvOn,
  { bgm: TV.bgm },
  ...V('반갑노 게이들아', 'greet'),
  ...V('편집노조를 이겨내다니 칭찬드림 굿굿', 'laugh'),
  P('다 들었어요 저희를 왜 죽이려고 하시는거죠?'),
  ...V('ㅋㅋ', 'laugh'),
  ...V('그냥 죽이고싶어서ㅋㅋ', 'taunt'),
  P('...'),
  ...V('그걸 말해주기전에 먼저 이걸 보시라!', 'smirk'),
  close,
  // 뒤로 카메라 이동하고 새장 철창에 갇힌 쥰희·용준이 밧줄에 매달려 화면 오른쪽 위에서 덜렁 내려온다 → 좌우로 주렁주렁
  CAM_CAGE,
  { action: game => { for (const id of [CAGE, JID, YID]) { const e = ent(game, id); setPos(e, e.x, e.y - CAGE_DROP); e.visible = true; } } },
  { parallel: [CAGE, JID, YID].map(id => ({ slide: id, by: [0, CAGE_DROP], duration: 0.85, sfx: id === CAGE ? 'chain_extend' : undefined })) },
  { parallel: [...[CAGE, JID, YID].map(id => ({ slide: id, by: [0, -10], duration: 0.16 })), { sfx: 'thud' }, { shake: 0.25, amp: 3 }] },
  { parallel: [CAGE, JID, YID].map(id => ({ slide: id, by: [0, 10], duration: 0.14 })) },
  cageSway,
  { wait: 0.4 },
  // 모두가 느낌표(카메라 다시 주인공 쪽)
  CAM_PARTY,
  bang(PARTY),
  G('쥰희야 용준아!'),
  P('탈출못했구나 ㅂㅅ들'),
  close,
  CAM_CAGE,
  J('살려줘 씨발'),
  Y('혀어어엉 살려줘요...'),
  close,
  // 티비가 올라갔다가 철창 왼쪽 옆에 다시 드르륵 내려와서 켜지고 조롱
  ...tvOff, ...tvUp(),
  tvPlace(TV_LEFT),
  CAM_MOCK,
  ...tvDown(1.6),
  ...tvOn,
  ...V('혀어엉 살려줘요홍홍홍홍', 'taunt'),
  ...V('불쌍한 우리 친구들', 'smirk'),
  ...V('그렇지만 여러분들에게 기회를 드리겠습니다 홍홍', 'laugh'),
  J('이 좆같은 영클'),
  close,
  // 쥰희가 왼쪽(티비 있는 곳)을 보며 철창을 발로 찬다
  { face: JID, dir: 'left' },
  { parallel: [{ hop: JID, by: [-8, 0], height: 8, duration: 0.28, sfx: false }, { tremble: CAGE, duration: 0.5, amp: 3 }, { sfx: 'thud' }, { shake: 0.2, amp: 2 }] },
  { hop: JID, by: [8, 0], height: 4, duration: 0.22, sfx: false },
  J('젠장 아무렇지도 않네'),
  ...V('당연하지 돼지색끼야 너네 두명무게 견디는 철창 만드느라 얼마나 고생했는지 아냐', 'taunt'),
  ...V('인간 뚱땡이 새끼들 나람이까지 거기 들어갔으면 아마 이미 너네 통구이 됏을듯 ㅇㅇ', 'laugh'),
  close,
  { bubble: [JID, YID], dots: 3, gap: 0.3, hold: 0.7 },
  J('느금마'),
  ...V('자 그럼 이제 너희에게 규칙을 알려주겠다.', 'smirk'),
  // 티비가 접히고 다시 주인공쪽으로 카메라, 티비가 오른쪽 끝(홈)으로 다시 내려온다
  ...tvOff, ...tvUp(),
  CAM_PARTY,
  tvPlace(TV_HOME),
  ...tvDown(1.6),
  ...tvOn,
  ...V('옆에 조작 패널이 보이는가? 나랑 게임하나 할거다'),
  ...V('바로 색깔을 기억해라 ~~ 파피플레이타임2 해봤으면 기억날거임 ㅇㅇ', 'laugh'),
  ...V('내가 색깔을 불러줄거고 그거에 맞는 색깔을 기억해뒀다가 제한시간안에 누르면 된다'),
  ...V('시간이 지날수록 저 밧줄은 내려갈거고'),
  close,
  CAM_ROPE, { wait: 0.9 }, CAM_PARTY,
  ...V('타임오버되면 저 둘은 죽고 너네도 죽는다.', 'taunt'),
  P('걍 죽이샘 ㄱㅊ 우리만 살려줘 니네편할게'),
  ...V('오 ㄹㅇ?', 'oh'),
  G('빠맨아'),
  P('..네'),
  ...V('ㅋㅋ', 'laugh'),
  ...V('그럼 준비가 되면 패널을 잡으렴 게이들아 오홍홍홍', 'taunt'),
  // 영클 티비가 접히고 살짝 오른쪽에서 팔짱 끼고 대기(smirk = 팔짱 포즈), 주인공으로 돌아옴
  ...tvOff, ...tvUp(),
  tvPlace(TV_HOME),
  { action: game => game.tvBroadcast.setExpression('smirk') },
  ...tvDown(1.4),
  ...tvOn,
  { camera: 'player' },
  { set: { furnace_arena_intro_done: true } },
  { regroup: true },
  { end: true },
  // 다시 들어올 때: 철창·쥰희·용준은 그대로 매달려 있고 TV 는 오른쪽에서 켜진 채 대기, 영클 브금
  { label: 'seen' },
  { action: game => {
    for (const id of [CAGE, JID, YID]) { const e = ent(game, id); if (e) e.visible = true; }
    const c = ent(game, CAGE); if (c) { c.def.oscillate = { dx: 10, period: 2.4 }; c.base = undefined; }
    game.finishTvBroadcast(); game.tvBroadcast = new TvBroadcast(game, TV);
    const tv = ent(game, TVID), arm = ent(game, ARM);
    if (tv) { setPos(tv, TV_HOME[0], TV_HOME[1]); tv.def.foldX = 1; } if (arm) setPos(arm, TV_HOME[0] + ARM_DX, TV_HOME[1] + ARM_DY);
    game.tvBroadcast.setExpression('smirk'); game.tvBroadcast.phase = 'on';
  } },
  { bgm: TV.bgm },
  { end: true },
], { silent: true });
