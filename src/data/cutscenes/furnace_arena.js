// 용광로 광장(youngcle18) 도착 연출 — 사용자 2026-09-16 브리핑 원문 그대로(design/narrative/cutscenes/furnace_arena.md).
// 흐름: 브금 꺼짐 → 셋이 천천히 들어와 느낌표 → 용암 앞으로 → 대사 → 영클 ‘후후후’ → 느낌표 → 영클 TV 가 모니터암을 타고 드르르륵 내려오고 셋은 뒷걸음
//   → TV 켜짐·영클 브금(storage_show) → 대사 → 카메라 위로: 밧줄 철창(쥰희·용준) 덜렁 내려와 좌우로 흔들림 → 느낌표 → 대사 → TV 가 올라갔다 철창 왼쪽 옆으로 다시 내려와 조롱
//   → 쥰희가 왼쪽(TV)을 보며 철창을 발로 참 → 대사 → TV 접힘 → 일행 앞으로 다시 내려와 규칙 설명(밧줄로 카메라 갔다 옴) → TV 접히고 살짝 오른쪽에서 대기 → 조작 복귀.
// TV 는 맵 소품 youngcle_tv(방송 앵커) + youngcle_tv_arm 을 slide 로 같이 움직인다(위로 들어갔다 나왔다 자유롭게). 노란 패널 이벤트는 다음 브리핑.
import { TvBroadcast } from '../../world/tv-broadcast.js';
import { YOUNGCLE_TV_ARENA as TV } from '../youngcle-tv.js';
import { FX } from '../fx.js';

const JID = 'arena_junhee', YID = 'arena_yongjun', CAGE = 'lava_cage', TVID = 'youngcle_tv', ARM = 'youngcle_tv_arm';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
// 맵 좌표(tools/maps/youngcle18.py): 인사·규칙은 TV 가 **일행 앞 가운데**(TV_FRONT, 사용자 2026-09-16 “이때는 가운데에 뜨는 게 맞지”)로 내려오고,
// 조롱 때만 철창 왼쪽(TV_LEFT, 쥰희가 왼쪽을 보며 찬다), 마지막 팔짱 대기만 오른쪽 끝(TV_HOME, 사용자 “살짝 오른쪽에서 대기”).
// 일행은 울타리 5번 칸(x432) 앞에 서고 철창은 웅덩이 오른쪽 끝(x552, 136 폭)에 매달려 TV_FRONT 와 겹치지 않는다. TV 는 0.82 배, 접힌 채(foldX 0.06) 내려와 펼쳐진다(갤럭시 폴드)
// TV 그림 폭 236(0.82 배). 일행은 울타리 3번 칸(x352~384, 가운데 368) 앞 — 앞자리 TV 250~486 은 그 위, 조롱 TV 316~552 는 철창(552~)에 붙어 더 높이(사용자 “움직이는 곳 차이가 별로 없다” → 자리를 66px·56px 벌림), 대기 690 은 철창 오른쪽
const TV_FRONT = [250, 100], TV_HOME = [704, 110], TV_LEFT = [316, 44], TV_FOLDED = 0.06, ARM_DX = 112, ARM_DY = -298;
// 색깔 게임 뒤(사용자 브리핑): TV 가 웅덩이 가운데(x480)로 내려오고 모두 그 아래 모여 본다. 쥰희·용준은 폭발로 철창에서 튀어나와 울타리 앞 바닥에 선다
const TV_CENTER = [383, 96], GATHER_Y = 40;
// 주인공은 아래 문 기둥(x448~544) 안(468)에 서야 연출 뒤 그대로 내려가 나갈 수 있다
const GATHER = { player: 36, gyeongsub: -8, ppaman: 80, [JID]: -60, [YID]: 124 };
const CAM_GATHER = { camera: [15, 6.4], duration: 0.7 };
// 철창 낙하·탈출: 둘이 내려앉는 울타리 앞 바닥(y≈284)이 대화창 위 230px 안에 들어오게 카메라를 아래로(레이아웃 예산)
const CAM_DROP = { camera: [17.5, 10.2], duration: 0.6 };
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
const FENCE = 'lava_fence_5';   // 울타리 5번 칸(x416~448) — 게임 뒤 모임 자리의 기준물(주인공이 아래 문 기둥 안에 서게)
const STAND = 'lava_fence_3';   // 울타리 3번 칸(x352~384) — 도착 연출에서 일행이 서는 자리(앞에 TV, 오른쪽에 철창이 한 화면에)
const setPos = (e, x, y) => { e.x = x; e.y = y; if (e.def.ix !== undefined) { e.def.ix = x; e.def.iy = y; } };
// TV: (x,y) 최종 자리의 360px 위(화면 밖)에 접힌 프레임·모니터암(프레임 안으로 22px 겹침)을 두고 드르르륵 내려온 뒤 펼쳐진다 / 접혀서 올라간다
const tvPlace = ([x, y]) => ({ action: game => { const tv = ent(game, TVID), arm = ent(game, ARM); setPos(tv, x, y - 360); tv.def.foldX = TV_FOLDED; setPos(arm, x + ARM_DX, y - 360 + ARM_DY); } });
const tvDown = (dur = 1.6) => [
  { parallel: [{ slide: TVID, by: [0, 360], duration: dur, sfx: 'rumble' }, { slide: ARM, by: [0, 360], duration: dur }] },
  { fold: TVID, to: 1, duration: 0.55, sfx: 'plug' },
];
const tvUp = (dur = 0.9) => [
  { fold: TVID, to: TV_FOLDED, duration: 0.45, sfx: 'click' },
  { parallel: [{ slide: TVID, by: [0, -360], duration: dur, sfx: 'rumble' }, { slide: ARM, by: [0, -360], duration: dur }] },
];
const tvOn = [{ action: game => game.tvBroadcast.power(true) }, { wait: TV.powerTime }];
const tvOff = [close, { action: game => game.tvBroadcast.power(false) }, { wait: TV.shutdownTime }];
// 카메라: 일행(왼쪽 아래) + 오른쪽 끝 TV / 철창이 화면 오른쪽 위에서 내려옴 / 철창 + 왼쪽 TV(조롱) / 밧줄
const CAM_PARTY = { camera: [15, 6.6], duration: 0.6 }, CAM_CAGE = { camera: [15.5, 4.8], duration: 0.6 }, CAM_MOCK = { camera: [16.6, 4.2], duration: 0.6 }, CAM_ROPE = { camera: [19.4, 2.4], duration: 0.5 }, CAM_PARK = { camera: [20.4, 6.6], duration: 0.6 };
// 좌우 데롱데롱: 철창 소품이 흔들리고 carry(쥰희·용준)가 같이 실려 움직인다
const cageSway = { action: game => { const c = ent(game, CAGE); if (c) { c.def.oscillate = { dx: 10, period: 2.4 }; c.base = undefined; } } };

export const furnace_arena_intro = Object.assign([
  { if: flags => flags.furnace_arena_intro_done, goto: 'seen' },
  { action: game => { game.finishTvBroadcast(); game.tvBroadcast = new TvBroadcast(game, TV); game.sound.preloadBgm(TV.bgm); } },
  { bgm: null, fadeOut: 0.2 },
  // 캐릭터들이 천천히 들어오고 느낌표
  { parallel: PARTY.map((id, i) => ({ move: id, rel: STAND, at: 'bottom', by: [[0, -44, 44][i], 136], speed: 35 })) },
  ...PARTY.map(id => ({ face: id, dir: 'up' })),
  bang(PARTY),
  // 후에 용암쪽 앞으로 온다
  { parallel: PARTY.map((id, i) => ({ move: id, rel: STAND, at: 'bottom', by: [[0, -44, 44][i], 40], speed: 60 })) },
  ...PARTY.map(id => ({ face: id, dir: 'up' })),
  P('와 ㅈㄴ 무섭네요'),
  G('그렇네..'),
  { speaker: '영클', voice: 'youngcle', text: '* 후후후' },
  close,
  bang(PARTY),
  // 위에서 티비가 천천히 드르르륵 모니터암처럼 내려오고(접힌 채) — 캐릭터들은 뒷걸음(위를 본 채 미끄러져 물러남) — 내려온 뒤 펼쳐진다
  CAM_PARTY,
  tvPlace(TV_FRONT),
  { parallel: [tvDown(1.8)[0], ...PARTY.map(id => ({ slide: id, by: [0, 36], duration: 1.3 }))] },
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
  ...tvDown(1.3),
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
  // 티비가 접히고 다시 주인공쪽으로 카메라, 티비가 일행 앞으로 다시 내려온다
  ...tvOff, ...tvUp(),
  CAM_PARTY,
  tvPlace(TV_FRONT),
  ...tvDown(1.3),
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
  // 영클 티비가 접히고 살짝 오른쪽(오른쪽 끝)에서 팔짱 끼고 대기(smirk = 팔짱 포즈) — 카메라가 따라갔다가 주인공으로 돌아옴
  ...tvOff, ...tvUp(),
  tvPlace(TV_HOME),
  CAM_PARK,
  { action: game => game.tvBroadcast.setExpression('smirk') },
  ...tvDown(1.2),
  ...tvOn,
  { wait: 0.4 },
  { camera: 'player' },
  { set: { furnace_arena_intro_done: true } },
  { regroup: true },
  { end: true },
  // 다시 들어올 때: 철창·쥰희·용준은 그대로 매달려 있고 TV 는 오른쪽에서 켜진 채 대기, 영클 브금. 색깔 게임까지 끝났으면 철창은 없고 둘은 울타리 앞, TV 는 떠났다
  { label: 'seen' },
  { if: flags => flags.furnace_aftermath_done, goto: 'after' },
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
  { label: 'after' },
  { remove: CAGE },
  { action: game => {
    const f = ent(game, FENCE);
    for (const id of [JID, YID]) { const e = ent(game, id); if (e) { e.visible = true; setPos(e, f.x + f.w / 2 + GATHER[id] - e.w / 2, f.y + f.h + GATHER_Y); e.facing = 'down'; } }
    game.finishTvBroadcast();
  } },
  { end: true },
], { silent: true });

const gather = (id) => ({ move: id, rel: FENCE, at: 'bottom', by: [GATHER[id], GATHER_Y], speed: 70 });
const AFTERMATH = [
  // 돌아온 광장: 철창은 날아가 위에(안 보임), TV 도 올라가 있다(꺼짐). 브금 없음
  { action: game => {
    for (const id of [CAGE, JID, YID]) { const e = ent(game, id); if (e) { setPos(e, e.x, e.y - 360); e.visible = true; } }
    const c = ent(game, CAGE); if (c) { c.def.oscillate = null; c.base = undefined; }
    game.finishTvBroadcast(); game.tvBroadcast = new TvBroadcast(game, TV); game.sound.preloadBgm(TV.bgm);
  } },
  tvPlace(TV_CENTER),
  { bgm: null },
  { fade: 'in', duration: 0.6 },
  P('...'),
  close,
  { face: 'ppaman', dir: 'right' },
  { wait: 0.5 },
  CAM_DROP,
  // 철창이 떨어지며 폭발(꾸와아앙) — 철창은 날아가 사라지고 둘은 바깥(울타리 앞 바닥)으로 튀어나온다
  { parallel: [CAGE, JID, YID].map(id => ({ slide: id, by: [0, 360], duration: 0.4 })) },
  { async: [{ boom: { ...FX.explosion, at: CAGE, scale: 2.2, offset: [0, 170], sfx: 'furnace_blast' } }] },
  { parallel: [{ shake: 0.7, amp: 7 }, { sfx: 'explosion', volume: 0.5 }, { wait: 0.25 }] },
  { parallel: [
    { fling: CAGE, vx: 30, vup: 420, spin: 4, duration: 1.1, sfx: false },
    { hop: JID, by: [-6, 70], height: 44, duration: 0.55, sfx: false },
    { hop: YID, by: [42, 70], height: 44, duration: 0.55, sfx: false },
  ] },
  { face: JID, dir: 'down' }, { face: YID, dir: 'down' },
  { wait: 0.4 },
  Y('어? 살 살았다!!!'),
  close,
  { motion: JID, name: 'laugh', sfx: 'laugh_junhee' },
  J('으하하 이몸 부활이다.'),
  close,
  // 천천히 영클 TV 가 가운데로 내려오고 모두 그쪽으로 모여서 본다
  CAM_GATHER,
  { parallel: [tvDown(3.0)[0], ...[...PARTY, JID, YID].map(gather)] },
  ...[...PARTY, JID, YID].map(id => ({ face: id, dir: 'up' })),
  tvDown()[1],
  ...tvOn,
  { bgm: TV.bgm },
  ...V('큭.. 그래 인정하마', 'facepalm'),
  ...V('뭐 일단 이제 얼굴보면 되겠군', 'smirk'),
  ...V('왼쪽으로갔다가 올라오면 됨 이따보자 ㅂㅇ', 'bye'),
  // 나간다: 꺼지고 접혀 올라감, 브금도 꺼짐
  ...tvOff, { bgm: null, fadeOut: 0.8 }, ...tvUp(),
  { camera: 'player' },
  { set: { furnace_aftermath_done: true } },
  { regroup: true },
];
// 조작 패널(C) → 색깔 기억 게임(1인칭 씬 src/scenes/colorgame.js, BUILD198 사용자 브리핑 “패널 상호작용하면 페이드인되면서 바로 시작”).
// 검게 → 씬이 스스로 페이드인(용광로 1인칭·TV 가 천천히 가운데로 내려옴) → 끝나면 맵으로 페이드인. 게임 뒤 연출·튜토리얼은 다음 브리핑.
// 게임을 통과(폭발)하면 — 사용자 브리핑 원문: 페이드아웃되며 화면이 돌아옴 → 억빠맨 “...” → 오른쪽 보고 카메라 전환 → 철창이 떨어지며 폭발, 용준·쥰희가 바깥으로
//   → 용준 “어? 살 살았다!!!” → 쥰희 “으하하 이몸 부활이다.”(쥰희 웃음) → 영클 TV 가 천천히 가운데로 내려오고 모두 모여 봄 → “큭.. 그래 인정하마 / 뭐 일단 이제 얼굴보면 되겠군 / 왼쪽으로갔다가 올라오면 됨 이따보자 ㅂㅇ” → 나감.
export const furnace_panel = Object.assign([
  { sfx: 'click' },
  { fade: 'out', duration: 0.5 },
  { scene3d: 'colorgame', flag: 'furnace_color_done' },
  { if: flags => !flags.furnace_color_done || flags.furnace_aftermath_done, goto: 'back' },
  ...AFTERMATH,
  { end: true },
  { label: 'back' },
  { fade: 'in', duration: 0.5 },
], { silent: true });
/** QA `furnace_color`: 패널 앞에 서자마자 색깔 게임 씬으로(뒤 연출도 그대로) */
export const furnace_color_qa = Object.assign([
  { fade: 'out', duration: 0.3 },
  { scene3d: 'colorgame', flag: 'furnace_color_done' },
  { if: flags => !flags.furnace_color_done || flags.furnace_aftermath_done, goto: 'back' },
  ...AFTERMATH,
  { end: true },
  { label: 'back' },
  { fade: 'in', duration: 0.5 },
], { silent: true });
