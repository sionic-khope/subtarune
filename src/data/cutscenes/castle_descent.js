// BUILD358 사용자 브리핑(2026-09-26): 꼭대기에서 뛰어내린 뒤 — 끝없는 길(섭 몬스터·편집노조·영클 레이저) → 뗏목 웅덩이(벽 타고 상승). 대사·표기 원문 그대로.
import { RISE } from '../../scenes/castle-rise.js';
import { GJ_RUNNER as GJ } from '../gajaeman-runner.js';
import { CREDITS } from '../credits.js';
import { ending_cookie_wake } from './ending_cookie.js';

const A = text => ({ speaker: '가재맨', voice: 'gajaeman_shadow', text: `* ${text}` });

const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const YC = (text, face = 'smirk') => ({ speaker: '영클', portrait: `youngcle_tv_${face}`, voice: 'youngcle', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const scene = fn => ({ action: game => (game.castleDescent ? fn(game.castleDescent, game) : undefined) });
const at = (x, y) => [(x - 16) / 32, (y - 16) / 32];
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const FRIENDS = ['gyeongsub', 'ppaman', 'sunset_youngcle'];
const N = text => ({ voice: 'narrator', text: '* ' + text });
const faceAll = dir => PARTY.map(id => ({ face: id, dir }));

/** 꼭대기 부서진 끝에서 일행이 차례로 뛰어내린다 → 페이드 → 끝없는 길(격파 연출 끝·다시 끝에 닿았을 때 공용). */
export const SUMMIT_LEAP = [
  close,
  ...faceAll('right'),
  { parallel: PARTY.map((id, i) => [{ wait: i * 0.35 }, { move: id, px: [1726, 380], run: true, facing: 'right' },
    { action: game => game.castleSummit?.leapOff(id) }]) },
  { fade: 'out', duration: 0.8 },
  { map: 'gajaeman_castle_skyroad', spawn: 'start', enter: true, bgm: false },
];
export const castle_summit_leap = Object.assign([...SUMMIT_LEAP, { end: true }], { silent: true });

// 끝없는 길: 착지 자리(발) — 맨 왼쪽 위
const LAND = { player: [104, 176], gyeongsub: [70, 204], ppaman: [42, 232] };
export const castle_road_intro = Object.assign([
  { if: flags => !!flags.castle_road_landed, goto: 'end' },
  close,
  ...PARTY.map(id => ({ hide: id })),
  scene(s => { for (const [id, [x, y]] of Object.entries(LAND)) { const e = s.ent(id); if (e) s.setFeet(e, x, y); } }),
  { camera: at(240, 200), duration: 0.01 },
  { fade: 'in', duration: 0.8 }, { wait: 0.3 },
  // 먼저 가재맨이 오오라와 함께 오른쪽으로 도망간다
  scene(s => s.gajaemanDash([-80, 250], [640, 200], 2.2)), scene(s => s.hideGajaeman()), { wait: 0.5 },
  // 이어서 주인공들이 맨 왼쪽 위에 착지
  { parallel: PARTY.map((id, i) => [{ wait: i * 0.22 }, { drop: id, height: 320, duration: 0.55, quake: 3 }]) },
  { wait: 0.4 }, ...faceAll('right'),
  { set: { castle_road_landed: true } },
  { camera: 'player' },
  { label: 'end' }, { end: true },
], { silent: true });

// BUILD366: 구간 셋(비데 · 파크가디언 · 뚜울라·도트마리오)은 컷신이 아니라 걷는 동안의 장면(src/scenes/castle-descent.js ambient)

/** 길 끝: 검 네 자루가 날아오고 영클이 세 번 쏴서 지켜 준다 → “빨리 가샘” → 뗏목 웅덩이로. */
export const castle_road_end = Object.assign([
  { if: flags => !!flags.castle_road_done, goto: 'leave' },
  close, ...faceAll('right'),
  scene(s => s.summonSwords()),
  { parallel: PARTY.map(id => ({ emote: id, kind: '!', duration: 0.8, hold: 0.4 })) },
  { parallel: [scene(s => s.youngcleIn()), [{ wait: 0.3 }, { sfx: 'laser_charge', volume: 0.6 }]] },
  scene(s => s.volley()),
  { wait: 0.7 },
  ...faceAll('left'), { wait: 0.3 },
  YC('빨리 가샘 가서 족치고오샘 ㅇㅇ'), close,
  { set: { castle_road_done: true } },
  { label: 'leave' },
  close, ...faceAll('right'),
  { parallel: PARTY.map((id, i) => [{ wait: i * 0.15 }, { move: id, px: game => [2520, (id === 'player' ? game.player : game.entities.find(e => e.id === id)).y], run: true, facing: 'right' }]) },
  { fade: 'out', duration: 0.8 },
  { map: 'gajaeman_castle_raft', spawn: 'start', enter: true, bgm: false },
  { end: true },
], { silent: true });

/** 뗏목 웅덩이: 가재맨이 벽 앞에서 위로 → 일행이 물 옆으로 → 대사 → 요플래 뗏목, 둘은 물 속에서 기를 모아 동시에 점프. */
export const castle_raft_intro = Object.assign([
  { if: flags => !!flags.castle_raft_launched, goto: 'end' },
  close,
  { action: game => game.sound.preloadBgm?.(RISE.bgm) },
  { camera: at(470, 1250), duration: 0.01 },
  { fade: 'in', duration: 0.8 }, { wait: 0.2 },
  // 가재맨이 쭉 앞으로 가다가 벽 앞에서 위로 상승
  scene(s => s.gajaemanDash([180, 1300], [480, 1250], 1.8)), { wait: 0.3 },
  { parallel: [scene(s => s.gajaemanRise(1000, 2.0)), [{ wait: 0.3 }, { camera: at(470, 900), duration: 1.6 }]] },
  { wait: 0.5 },
  { camera: at(430, 1290), duration: 1.4 },
  // 주인공들이 뗏목엔 타지 않고 물 바로 옆으로 뛰어온다
  { parallel: PARTY.map((id, i) => [{ wait: i * 0.12 }, { move: id, rel: `raft_stand_${id}`, at: 'bottom', by: [0, 0], run: true, facing: 'right' }]) },
  ...faceAll('up'), { wait: 0.5 },
  P('올라갔어요!'), K('윽.'),
  { face: 'ppaman', dir: 'up' }, P('경섭이형'),
  { face: 'gyeongsub', dir: 'down' }, K('응'),
  P('지금 저랑 같은생각 하고 계시죠'), K('그런것같다.'),
  { face: 'gyeongsub', dir: 'right' }, { face: 'ppaman', dir: 'right' },
  P('갈까요!!! 요플래형 부탁해요'), close,
  { wait: 0.4 },
  // 둘은 물에 들어가고 요플래는 점프해서 가운데 뗏목에
  { parallel: [scene(s => s.board()), [{ wait: 0.25 }, scene(s => s.dive('gyeongsub', -1))], [{ wait: 0.45 }, scene(s => s.dive('ppaman', 1))]] },
  { wait: 0.5 },
  // 물 아래에서 2초 동안 진동하며 가라앉아 기를 모은다 → 동시에 점프! 뗏목과 요플래가 벽을 따라 위로
  scene(s => s.gather()),
  // 동시에 점프! 브금이 잠깐 꺼지고 뗏목이 빠르게 솟는다 → 페이드 아웃·인 → 화면 전체 상승과 함께 곡(원곡 42.7초부터)
  { bgm: null, fadeOut: 1.2 },
  scene(s => s.launch()),
  // 하늘로 넘어가는 페이드 아웃·인 약 1.5초 → 그 뒤 곡(원곡 42.7~63.9초 한 번)
  { fade: 'out', duration: 0.75 },
  scene(s => { s.ascend(); }),
  { fade: 'in', duration: 0.75 },
  // 페이드가 걷히면 곧바로 빙글빙글 + 곡(뗏목은 페이드 전에 이미 떨어져 나갔다)
  { action: game => { game.riseT = 0; game.sound.playBgm(RISE.bgm, { volume: 0.7, fadeIn: 0.9, loop: false, then: GJ.bgmLoop }); } },
  scene(s => s.waitRise(RISE.flash)),
  // 원곡 58초: 흰 번쩍임과 함께 노을 땅으로
  { fade: 'white', duration: 0.3 },
  { set: { castle_raft_launched: true } },
  { map: 'gajaeman_castle_sunset', spawn: 'arrive', enter: true, bgm: false },
  { end: true },
  { label: 'end' }, { end: true },
], { silent: true });

/** 노을 땅 도착: 가재맨이 먼저 올라와 있다가 오른쪽으로 도망 → 요플래가 땅 앞에서 동그랗게 앞덤블링하며 올라와 원곡 64초에 무릎 꿇고 착지(챱). */
export const castle_sunset_arrival = Object.assign([
  { if: flags => !!flags.castle_epilogue_done, goto: 'end' },
  { if: flags => !!flags.castle_gajaeman_clash, goto: 'epilogue' },
  { if: flags => !!flags.castle_sunset_arrived, goto: 'button' },
  close,
  // QA 로 바로 온 경우: 곡을 원곡 55초 자리부터
  { action: game => { if (game.riseT == null) { game.riseT = RISE.mapAt; game.sound.stopBgm(0); game.sound.playBgm(RISE.bgm, { volume: 0.7, fadeIn: 0.3, at: RISE.mapAt, loop: false, then: GJ.bgmLoop }); } } },
  { camera: at(300, 204), duration: 0.01 },
  { parallel: [{ fade: 'in', duration: 0.7 }, scene(s => s.arrive())] },
  { set: { castle_sunset_arrived: true } },
  // BUILD376 착지 뒤(사용자 “눌러서가 아니라 브금 타이밍 맞춰 착지하자마자 바로, 브금 하나로”): 곡이 끊기지 않고 흐르는 채
  //   착지 직후 박에 SAVE THE WORLD 가 저절로 눌리고 흰 빛이 다음 마디까지 감싼다 → 그림자 준비 동작 → 그다음 마디에 출발
  { label: 'button' },
  close,
  scene(s => { if (!s.tumble) s.kneelHold(); }),
  // 이어하기·QA 로 여기부터 오면 곡을 착지 1초 전 자리부터
  { action: game => { if (game.sound.bgmName !== RISE.bgm) { game.riseT = RISE.land - 1; game.sound.stopBgm(0); game.sound.playBgm(RISE.bgm, { volume: 0.7, fadeIn: 0.2, at: RISE.land - 1, loop: false, then: GJ.bgmLoop }); } } },
  { parallel: [scene(s => s.autoSave()), { zoom: 1.3, at: 'player', offset: [30, -14], duration: 0.8 }] },
  { zoom: 1, duration: 0.01 },
  scene(s => s.startRun()),
  scene(s => s.gajaemanRunIn()),
  A('요플래..'), A('꼭 그렇게 나를 막고싶다면'), A('여기서 끝을 보자.'), close,
  scene(s => s.auraBurst()),
  { battle: { enemies: ['gajaeman_runner'], bgm: GJ.bgm, seamlessIntro: true, skipVictoryText: true, flag: 'castle_gajaeman_clash' } },
  // 벤 뒤(사용자 2026-09-26): 그림자가 걷히며 하늘에 멈춘 가재맨 디디디딕 · 요플래는 뒤돌아 땅을 본다
  // 보스 승리 전환이 화면을 덮어 둔 채라 곧바로 걷는다(달리기 화면의 흰 그림자가 그대로 보인다)
  { fade: 'in', duration: 0.01 },
  scene(s => s.afterSlash()), { wait: 0.8 },
  A('...'), A('...그.. 그래..'), A('...'), A('... ... ...'), A('뭐...'), A('롤..이나 하러.. 가야겠군'), close,
  scene(s => s.farewell()),
  scene(s => s.kneelDown()),
  { label: 'epilogue' },
  // BUILD364 결말(사용자 2026-09-26): 페이드 아웃·인 → 일반 화면. 요플래는 무릎 꿇고 힘들어한다
  { fade: 'out', duration: 0.8 },
  scene(s => s.epilogueStart()),
  { camera: at(300, 204), duration: 0.01 },
  { fade: 'in', duration: 0.8 }, { wait: 0.5 },
  // 억빠맨과 경섭, 영클이 왼쪽에서 달려온다
  { parallel: [['ppaman', 0, [334, 292]], ['gyeongsub', 0.12, [346, 262]], ['sunset_youngcle', 0.24, [314, 244]]].map(([id, d, px]) => [{ wait: d }, { move: id, px, run: true, facing: 'right' }]) },
  { wait: 0.4 },
  P('요 요플래형!!'), K('괜찮아?!'), close,
  // 좌우를 살피는 영클·경섭·억빠맨
  { parallel: FRIENDS.map((id, i) => [{ wait: i * 0.12 }, { face: id, dir: 'left' }, { wait: 0.55 }, { face: id, dir: 'right' }, { wait: 0.55 }, { face: id, dir: 'left' }, { wait: 0.45 }, { face: id, dir: 'right' }]) },
  { wait: 0.3 },
  P('쓰 쓰러트린건가?!'), K('그.. 그런거같아..'), close,
  // 요플래 몸에서 밝은 빛이 돌기 시작 — 동료들 ! 하며 바라보고, 요플래가 화면 가운데로
  { parallel: [scene(s => s.lightUp()), [{ wait: 0.3 }, { parallel: FRIENDS.map(id => ({ emote: id, kind: '!', duration: 0.8, hold: 0.4 })) }], { zoom: 1.25, at: 'player', offset: [0, -24], duration: 1.8 }] },
  P('저 저건..'), close,
  // 하트가 몸에서 올라와 하늘로(곡 heart_rise) — 8초 세로 빛의 파장, 끝날 즈음 정상화·경섭이 달려가 받는다(김형섭으로 돌아옴) → 바람
  // BUILD373: 곡 앞 무음 1.6초를 잘라 하트가 나오는 순간 곡이 들어온다(타이밍 전부 1.6초 당김)
  { parallel: [scene(s => s.heartSeq()), [{ wait: 17.2 }, { zoom: 1, duration: 1.6 }]] },
  { wait: 0.8 },
  K('...'), K('돌아왔구나 형섭아.'), close,
  // 오른쪽에서 다시 하트가 천천히
  scene(s => s.heartReturn()),
  { parallel: FRIENDS.map(id => ({ emote: id, kind: '!', duration: 0.8, hold: 0.4 })) },
  N('가재맨과 요플래는 다시 하나가 되었습니다.'), N('저를 도와주셔서 고마웠습니다.'), N('가재맨은.. 그저 상처만 가지고 있었을 뿐이에요.'),
  N('모두가 김형섭을 구하기위해 달리는 모습을 보고'), N('다시 한번 사랑받고 있음을.'), N('느낀것같습니다.'),
  K('... 요플래'),
  N('이제 집에 갈 시간입니다.'), close,
  // 보라색 코드를 천천히 빙글빙글 소환 → 경섭 주머니 속으로
  scene(s => s.codeSummon()),
  K('...'), close,
  // 하트에 오오라가 빨려 들어오더니 빛의 형상을 띤 김형섭(요플래)으로 땅에 내려온다
  scene(s => s.heartToLight()),
  { parallel: FRIENDS.map(id => ({ emote: id, kind: '!', duration: 0.8, hold: 0.4 })) },
  N('뭐.. 집에 가려면 일단 저 배부터 고쳐야하니까'), N('같이 가시죠.'),
  YC('ㅇㅈ'), close,
  // 영클이 앞으로 날아와 경섭과 요플래 사이에 서서 아래를 보고, 요플래·경섭은 위를 본다
  scene(s => s.youngcleBetween()),
  { face: 'gyeongsub', dir: 'up' }, scene(s => { if (s.lightForm) s.lightForm.facing = 'up'; }),
  YC('ㅅㅂ 내가어떻게만든 전함인데'), YC('수리를 빨리 도와라'), YC('그리고'), YC('요플래 니도 우리 엄청대박인배 동료임 ㅇㅇ'),
  K('하하하'), K('가자. 집에'), close,
  // 모두 왼쪽으로 걸어가며 페이드
  { parallel: [scene(s => s.walkAwayLeft()), [{ wait: 1.6 }, { fade: 'out', duration: 1.4 }]] },
  { bgm: null, fadeOut: 1.0 },
  // 검은 화면이 천천히 — 2초 뒤 가운데 나레이션
  scene(s => { s.card = { text: '', alpha: 0, black: 1 }; }),
  { fade: 'in', duration: 0.01 },
  scene(s => s.blackCard(['...', '그렇게 우리는, 김형섭과 세상을 구했다.', '요플래와 우리는 엄청대박인배를 고치고', '모두를 모았으며, 집에 갈 준비를 마쳤다.'], { skipBlack: true })),
  { fade: 'out', duration: 0.01 },
  { set: { castle_epilogue_done: true } },
  { map: 'ship_lounge_epilogue', spawn: 'start', enter: true, bgm: false },
  { end: true },
  { label: 'end' }, { end: true },
], { silent: true });

/** 라운지 결말 퍼레이드(사용자 2026-09-26): 대사 없이 곡(lounge_parade, P89rxnT7lKw)과 함께 — 한쪽 열린 보라 문 너머 빛으로 모두가 나간다.
 *  영클 오른쪽 · 경섭이 김형섭을 어깨동무 · 억빠맨. 페이드 아웃·인으로 다섯 장면. */
const DOOR_FRONT = [384, 244];
const walkOut = (id, wait = 0, extra = {}) => [{ wait }, { show: id }, { move: id, px: DOOR_FRONT, facing: 'up', ...extra }, scene(s => s.enterDoor(id))];
const vignette = (...branches) => [{ fade: 'in', duration: 0.9 }, { parallel: branches }, { wait: 0.9 }, { fade: 'out', duration: 0.9 }, { wait: 0.3 }];
export const ship_lounge_epilogue = Object.assign([
  { if: flags => !!flags.ship_lounge_epilogue_seen, goto: 'end' },
  close,
  scene(s => s.loungeSetup()),
  { camera: at(384, 226), duration: 0.01 }, { zoom: 0.86, at: [384, 226], duration: 0.01 },
  // 곡(lost girl, P89rxnT7lKw)은 반복 없이 끝까지 — 끝나면 갑판으로
  { action: game => game.sound.playBgm('lounge_parade', { volume: 0.6, fadeIn: 0.8, loop: false }) },
  // 1. 따듯한비데와 도트마리오
  ...vignette(walkOut('epi_bidet', 0.6), walkOut('epi_mario', 1.3)),
  // 2. 파크가디언: 문 앞에서 돌아서 인사하고 들어간다 · 뚜울라가 뒤따른다
  ...vignette([{ wait: 0.5 }, { show: 'epi_park' }, { move: 'epi_park', px: DOOR_FRONT, facing: 'up' }, { face: 'epi_park', dir: 'down' }, { wait: 0.3 }, { motion: 'epi_park', name: 'bow' }, { face: 'epi_park', dir: 'up' }, scene(s => s.enterDoor('epi_park'))],
    walkOut('epi_ttuulla', 2.2)),
  // 3. 오방순과 나람, 김은별컴퍼니와 김예림
  ...vignette(walkOut('epi_obangsun', 0.4), walkOut('epi_naram', 0.9), walkOut('epi_eunbyeol', 1.8), walkOut('epi_yerim', 2.4)),
  // 4. 미니언들과 정글 몹들(바위게·돌거북·두꺼비·늑대·칼날부리·레드·블루 — 가재맨 버전 챔피언은 나가지 않는다)
  ...vignette(walkOut('epi_cs_red', 0.3), walkOut('epi_cs_blue', 0.7), walkOut('epi_cannon', 1.1),
    walkOut('epi_scuttle', 0.5), walkOut('epi_wolf', 0.9), walkOut('epi_krug', 1.4), walkOut('epi_razorbeak', 1.8),
    walkOut('epi_toad', 2.2), walkOut('epi_blue', 2.6), walkOut('epi_red', 3.0)),
  // 5. 용준이 먼저 쌩 — 쥰희는 점프해 가다가 뒤돌아 한 번 웃고 들어간다
  ...vignette([{ wait: 0.5 }, { show: 'epi_yongjun' }, { sfx: 'whoosh', volume: 0.7 }, { move: 'epi_yongjun', px: DOOR_FRONT, dash: true, facing: 'up' }, scene(s => s.enterDoor('epi_yongjun', 0.3))],
    [{ wait: 1.8 }, { show: 'epi_junhee' }, { hop: 'epi_junhee', by: [100, -60], height: 30, duration: 0.55 }, { hop: 'epi_junhee', by: [100, -50], height: 30, duration: 0.55 }, { move: 'epi_junhee', px: DOOR_FRONT, run: true, facing: 'up' },
      { face: 'epi_junhee', dir: 'down' }, { wait: 0.4 }, { motion: 'epi_junhee', name: 'laugh', sfx: 'laugh_junhee' }, { wait: 0.3 }, { face: 'epi_junhee', dir: 'up' }, scene(s => s.enterDoor('epi_junhee'))]),
  // 6. 점례가 최미스를 문 밖으로 역동적으로 차낸 뒤, 문가에 올라가 아래를 잠깐 보고 다시 들어간다
  ...vignette([{ wait: 0.4 }, { show: 'epi_choimis' }, { show: 'epi_jeomnye' }, { move: 'epi_choimis', px: [350, 262], facing: 'up' },
    { hop: 'epi_jeomnye', by: [150, -70], height: 26, duration: 0.6 }, scene(s => s.kickInto('epi_choimis')), { wait: 0.4 },
    { move: 'epi_jeomnye', px: DOOR_FRONT, facing: 'up' }, { face: 'epi_jeomnye', dir: 'down' }, { wait: 1.0 }, { face: 'epi_jeomnye', dir: 'up' }, scene(s => s.enterDoor('epi_jeomnye'))]),
  // 7. 억빠맨과 경섭이 마주 보고 통통 튀며 수다 떠는 사이(영클은 뒤돌아 있음), 청소부가 몰래 살금살금 나간다
  //    — 문가에서 뒤돌아보면 일행 머리 위에 ? 가 뜨고 문 쪽을 돌아본다
  ...vignette([{ wait: 0.4 }, scene(s => s.partyFace('down')), scene(s => s.chatter(true)), { wait: 0.6 }, { show: 'epi_janitor' }, { move: 'epi_janitor', px: DOOR_FRONT, speed: 40, facing: 'up' },
    { face: 'epi_janitor', dir: 'down' }, { wait: 0.6 }, scene(s => s.chatter(false)),
    { parallel: [{ emote: 'epi_ppaman', kind: '?', sfx: false, duration: 1.4, hold: 0.6 }, { emote: 'epi_youngcle', kind: '?', sfx: false, duration: 1.4, hold: 0.6 }, scene(s => s.pairEmoteShow('?', 1.4))] },
    scene(s => s.partyFace('up')), { wait: 0.3 }, { face: 'epi_janitor', dir: 'up' },
    scene(s => s.enterDoor('epi_janitor', 0.6)), { wait: 0.5 }]),
  // 8. 지켜보는 일행 — 곡이 끝날 때까지 빛을 바라본다
  { zoom: 1.25, at: [384, 330], duration: 0.01 },
  { fade: 'in', duration: 1.2 },
  scene(s => s.waitBgmEnd('lounge_parade', 4)),
  { set: { ship_lounge_epilogue_seen: true } },
  // 페이드 인·아웃 연출이 끝나면 갑판의 노을로
  { fade: 'out', duration: 1.4 }, { zoom: 1, duration: 0.01 },
  { map: 'ship_deck_epilogue', spawn: 'start', enter: true, bgm: false },
  { label: 'end' }, { end: true },
], { silent: true });

/** 갑판 노을(사용자 2026-09-26): 바람만 — 요플래(빛)가 노을을 보다가 경섭·억빠맨이 온다. 대사 원문. 끝나면 천천히 페이드 아웃. */
export const ship_deck_epilogue = Object.assign([
  { if: flags => !!flags.ship_deck_epilogue_seen, goto: 'end' },
  close,
  scene(s => s.deckSetup()),
  { bgm: 'wind', volume: 0.35, fadeIn: 1.5 },
  { fade: 'in', duration: 2.0 }, { wait: 2.0 },
  P('뭐해요?'), close,
  // 경섭·억빠맨이 왼쪽에서 다가오고 요플래가 왼쪽을 본다
  { parallel: [scene(s => s.deckFriendsIn()), [{ wait: 1.2 }, scene(s => { if (s.lightForm) s.lightForm.facing = 'left'; })]] },
  { wait: 0.4 },
  P('여기계셨네요'), K('슬슬 우리도 갈 예정이야.'),
  N('...'), N('나는 고맙다는 말을 전했다.'),
  K('ㅋㅋㅋ 새삼스럽게'),
  P('뭔가 일들이 많았고 위기도 많았지만'), P('즐거웠던거같아요.'),
  K('응 나도 즐거웠어.'), K('요플래 넌 어쩔셈이야?'),
  N('나는 이 세상을 지울 수 없다고 말했다.'),
  K('그게 무슨소리야?'),
  N('가재맨은 아직 내 안에 살아있고'), N('나와 함께 공존해 나가야한다고 말했다.'), N('그리고'), N('누군가는 김형섭의 컴퓨터를 지켜야한다고 말했다.'),
  K('...'), K('그렇지 허허'),
  P('그럼 언젠간 저희 다시 만날 수 있는건가요?'),
  N('...'), N('나는 긍정했다.'),
  P('언젠가 또 봤으면 좋겠어요'),
  K('그치'), K('... 요플래 그리고 가재맨'), K('둘다 우리에게는 멋진 방송인일거야.'),
  P('멋진 사장님이기도 하구요'),
  N('...'),
  K('자 이제 돌아가볼까?'),
  P('집에 가요, 편집 밀린거 해야해요.'), close,
  // 왼쪽으로 걸어가고 천천히 페이드 아웃
  { parallel: [scene(s => s.deckFriendsLeave()), [{ wait: 1.5 }, { fade: 'out', duration: 3.5 }]] },
  { set: { ship_deck_epilogue_seen: true } },
  // 브금 없이 — 문 닫힌 라운지의 마지막 작별로
  { bgm: null, fadeOut: 1.0 },
  { map: 'ship_lounge_farewell', spawn: 'start', enter: true, bgm: false },
  { label: 'end' }, { end: true },
], { silent: true });

/** 마지막 작별(사용자 2026-09-26): 브금 없이, 문 닫힌 라운지 — 아래에서 억빠맨·어깨동무한 경섭과 김형섭·요플래가 올라와 문 앞에 세로로, 왼쪽엔 영클.
 *  영클·억빠맨이 한쪽 문을 철컥 열고 나가고, 경섭은 김형섭을 들여보낸 뒤 뒤돌아본다(역광). 문이 닫히고 0.8초 뒤 엔딩 크레딧. 대사 원문. */
export const ship_lounge_farewell = Object.assign([
  { if: flags => !!flags.ship_lounge_farewell_seen, goto: 'credits' },
  close,
  scene(s => s.farewellSetup()),
  { camera: at(384, 250), duration: 0.01 }, { zoom: 1.15, at: [384, 280], duration: 0.01 },
  // 브금 대신 아주 작게 깔리는 잔잔한 바람(크레딧 곡이 시작되면 바로 바뀐다)
  { bgm: 'wind', volume: 0.08, fadeIn: 2.5 },
  { fade: 'in', duration: 1.5 },
  scene(s => s.comeUp()), { wait: 0.8 },
  YC('...'), YC('그럼 ㅅㄱ'), YC('...'), YC('즐거웠음'), close,
  // 영클이 한쪽 문만 철컥 열고 나간다
  scene(s => s.exitDoor('fw_youngcle')), { wait: 0.6 },
  // 억빠맨이 뒤를 본다
  { face: 'fw_ppaman', dir: 'down' }, { wait: 0.5 },
  P('요플래형. 고마웠어요.'), P('...'), P('뭐 또 볼 날이 있겠죠'), close,
  { face: 'fw_ppaman', dir: 'up' }, { wait: 0.3 },
  scene(s => s.exitDoor('fw_ppaman')),
  // 1~2초 뜸 → 경섭과 김형섭이 앞으로 걸어가 문에 — 김형섭을 먼저 들여보내고 경섭이 뒤를 돌아본다
  { wait: 1.5 },
  scene(s => s.pairIntoDoor()), { wait: 0.4 },
  K('요플래'), K('아니'), K('가재맨'), close,
  // “가재맨” 뒤에야 웃으며 뒤돌아본다 — 대사 창 없이 잠깐 보여 준 뒤 마지막 한 마디
  { wait: 0.5 }, scene(s => s.gyeongsubLookBack()), { wait: 1.4 },
  { ...K('우리의 밤을 지켜줘서 고마워.'), hold: 2 }, close,
  // 경섭이 돌아서 문 밖으로 — 문이 철컥 닫힌다
  scene(s => s.gyeongsubLeave()),
  scene(s => s.setDoor(false)),
  { set: { ship_lounge_farewell_seen: true } },
  { label: 'credits' },
  scene(s => s.creditsRoll()),
  // 크레딧 곡이 끝나면 The End 에 3초 머문 뒤 엔딩 쿠키(처음 집)로
  scene(s => s.waitBgmEnd(CREDITS.bgm, 4)),
  { wait: 3.0 },
  ...ending_cookie_wake,
  { label: 'end' }, { end: true },
], { silent: true });
