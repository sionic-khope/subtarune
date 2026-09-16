// 엄청대박인배 조종실 입장 연출(youngcle20, BUILD202 사용자 브리핑 원문 design/narrative/cutscenes/ship_control.md).
//   입장(느낌표) → 카메라가 콘솔 한가운데(바닥 로고)로 → 쥰희·용준이 앞을 보고 “어서 나와라 …” → 카메라 왼쪽 벽: 대포가 드르르륵 나와 발사(연기)
//   → 포탄이 쥰희를 맞혀 오른쪽 벽까지 쭉 → 쾅(진동) “꾸엑” 기절 → 용준 “어?! 형 !!!” → 가운데서 날아온 포탄에 용준도 쥰희 옆에 쓰러짐(포탄은 벽에서 사라짐)
//   → 주인공 셋 가운데로 → 영클 “ㅋㅋ”(브금) 앞으로 내려오고 일행 뒷걸음 → 대사 → 영클이 하늘로 쭉 → 일행 중앙 살짝 왼쪽에서 오른쪽을 봄 → 영클이 오른쪽에서 훅훅훅 내려옴(불·엔진 소리)
//   → 대사 → “나와라”: 버튼 → 철창이 데롱데롱 내려와 영클 뒤에 착지 → 문 열림 → 오방순(위)·나람(아래, 거대) 천천히 걸어 나옴 → 대사 → “즐” → 전투 시작 연출(전투 자체는 다음 명령).
const YC = 'ship_youngcle', JID = 'ship_junhee', YID = 'ship_yongjun', OB = 'ship_obangsun', NR = 'ship_naram';
const CAGE = 'ship_cage', CAGE_OPEN = 'ship_cage_open', CANNON = 'ship_cannon', BALL1 = 'ship_ball1', BALL2 = 'ship_ball2';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
// 자리 상수는 tools/maps/youngcle20.py(JUNHEE·YONGJUN·YC_ENTER·YC_STAND) 와 같은 값 — 맵 JSON 은 비동기 로드라 여기서 직접 둔다(tests/unit/ship-control.test.mjs 가 대조)
const SPOT = { junhee: [486, 262], yongjun: [436, 318], ycEnter: [470, 236], ycStand: [556, 300] };
const M = () => SPOT;
const LOGO_CAM = [14.5, 8.9];                              // 바닥 로고(480,300)가 화면 가운데
const WALL_X = 900;                                        // 오른쪽 벽 앞(히트박스 x, 벽 928)
const J = text => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: '* ' + text });
const Y = text => ({ speaker: '박용준', portrait: 'yongjun', voice: 'yongjun', text: '* ' + text });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ' + text });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* ' + text });
const O = text => ({ speaker: '오방순', portrait: 'obangsun', voice: 'obangsun', text: '* ' + text });
const NA = text => ({ speaker: '나람이', portrait: 'naram', voice: 'naram', text: '* ' + text });
const N = text => ({ text: '* ' + text, voice: 'narrator' });
const V = (text, expression = 'smirk') => ({ speaker: '영클', portrait: `youngcle_tv_${expression}`, voice: 'youngcle', text: '* ' + text });
const close = { action: game => game.textbox.close() };
const bang = ids => ({ parallel: ids.map(id => ({ emote: id, kind: '!', duration: 1.1, hold: 0.45 })) });
const face = (ids, dir) => ids.map(id => ({ face: id, dir }));
const ball = (id, x, y) => ({ spawn: { type: 'prop', id, image: 'assets/props/ship_cannonball.png', x, y, w: 28, h: 28, solid: false, sortY: 1000000000 } });
const smoke = at => ({ boom: { sheet: 'assets/fx/cannon_smoke.png', at, cols: 6, count: 6, fps: 14, scale: 1, sfx: 'cannon_puff' } });
/** 포탄에 맞아 오른쪽 벽까지 쭉 날아가 쾅: 카메라가 맞은 사람을 따라간다(속도감), 벽에서 진동·충격음, 포탄은 사라진다 */
const knockToWall = (id, ballId, fromX, toY) => [
  { camera: id },
  { parallel: [
    { hop: id, by: [WALL_X - fromX, toY], height: 18, duration: 0.42, sfx: false },
    { slide: ballId, by: [WALL_X - fromX + 20, toY], duration: 0.42 },
  ] },
  { remove: ballId },
  { parallel: [{ shake: 0.45, amp: 7 }, { sfx: 'impact' }, { tremble: id, duration: 0.4, amp: 3 }] },
];
const partyTo = (spots, opts = {}) => ({ parallel: PARTY.map((id, i) => ({ move: id, px: spots[i], exact: true, ...opts })) });

export const ship_control_intro = Object.assign([
  { if: flags => flags.ship_intro_done, goto: 'after' },
  { action: game => { game.sound.preloadBgm('storage_show'); } },
  // ① 입장: 조금 걸어 들어와 느낌표
  { wait: 0.3 },
  { move: 'player', px: [468, 440], exact: true },
  bang(PARTY),
  // ② 카메라가 콘솔 한가운데(바닥 로고)로 — 쥰희·용준이 거리를 두고 앞을 보고 서 있다
  { camera: LOGO_CAM, duration: 1.2 },
  { wait: 0.3 },
  J('어서 나와라 시발롬아'),
  J('맞짱이다 개새끼'),
  J('...'),
  J('...?'),
  close,
  // ③ 왼쪽 벽: 대포가 드르르륵 나와 발사(연기) → 포탄이 쥰희를 맞혀 오른쪽 벽으로 쭉 → 쾅 “꾸엑” 기절
  { camera: [6, 8.2], duration: 0.7 },
  { show: CANNON },
  { slide: CANNON, by: [72, 0], duration: 0.8, sfx: 'scrape' },
  { wait: 0.35 },
  // 발사: 연기·진동은 기다리지 않고(async) 포탄이 곧장 날아간다
  { async: [smoke([116, 270])] }, { async: [{ shake: 0.3, amp: 4 }] }, { sfx: 'boom' },
  ball(BALL1, 96, 256),
  { camera: BALL1 },
  { slide: BALL1, by: [M().junhee[0] - 96 - 20, 0], duration: 0.26 },
  ...knockToWall(JID, BALL1, M().junhee[0], 0),
  J('꾸엑'),
  close,
  { pose: JID, to: 'lying' },
  { wait: 0.4 },
  // ④ 용준: 카메라 가운데로 → “어?! 형 !!!” → 가운데서 날아온 포탄(대포 연출 없이)에 맞아 쥰희 옆에 쓰러짐
  { camera: LOGO_CAM, duration: 0.5 },
  Y('어?! 형 !!!'),
  close,
  ball(BALL2, 200, 312),
  { camera: BALL2 },
  { slide: BALL2, by: [M().yongjun[0] - 200 - 20, 0], duration: 0.22 },
  ...knockToWall(YID, BALL2, M().yongjun[0], -4),
  { pose: YID, to: 'lying' },
  { wait: 0.5 },
  // ⑤ 주인공 셋이 가운데로 → 영클 “ㅋㅋ”(브금) 앞으로 내려오고 일행은 뒷걸음
  { camera: LOGO_CAM, duration: 0.6 },
  partyTo([[468, 330], [420, 352], [516, 352]], { run: true }),
  ...face(PARTY, 'up'),
  V('ㅋㅋ', 'laugh'),
  close,
  { bgm: 'storage_show' },
  { show: YC },
  { parallel: [
    { move: YC, px: M().ycEnter, exact: true, speed: 260 },
    [{ wait: 0.25 }, { parallel: PARTY.map(id => ({ move: id, by: [0, 20], speed: 90 })) }],   // by 는 16px 단위 → 40px 뒷걸음
    { sfx: 'whoosh' },
  ] },
  ...face(PARTY, 'up'),
  { face: YC, dir: 'down' },
  V('반갑노 게이들아'),
  P('영클형..'),
  V('ㅇㅇ'),
  G('왜 우리를 공격하는지 이유를 알려줄수있나.'),
  V('...'),
  V('나는'),
  V('이 세상에서 나가는 출구를 알고있다.'),
  close,
  bang(PARTY),
  P('정 정말이에요..?'),
  V('그리고 그 문은 내가 가져왔다.'),
  V('내 뒤에 우리 전함의 메인 라운지에 존재하지'),
  P('그럼 가면 되는거아니에요?'),
  V('...그러려면 열쇠가 필요하다.'),
  V('그리고 그 열쇠를 가지고있는자를 알고있지.'),
  P('정말요?'),
  V('...'),
  V('너 김형섭 아니지?', 'glare'),
  close,
  bang(PARTY),
  N('...'),
  V('훗훗훗', 'laugh'),
  V('이미 알고있었다 게이야'),
  V('너가 이 세상을 만든 {c=red}악당{/c} 이란걸.'),
  P('자 잠깐 영클형 뭔가 잘못 알고계신것 같..'),
  V('따까리새끼는 닥치샘 ㅇㅇ 내말이맞음', 'glare'),
  V('나에게 이러한 지능을 부여해주시고, 모두를 여기로 모을수있게 도와준 사람이 있음.'),
  V('그리고 그분이 자기는 형섭이형에게 파생된 착한 자아고 나쁜 자아가 열쇠를 갖고있다했음'),
  P('애초에 그 열쇠란게 뭔데요?'),
  V('보라색 코드'),
  close,
  { emote: 'player', kind: '!', duration: 1.1, hold: 0.45 },
  V('갖고있나보군 역시'),
  close,
  // ⑥ 영클이 하늘로 쭉 올라가 사라지고, 일행은 중앙 살짝 왼쪽에서 오른쪽을 봄 → 영클이 오른쪽에서 왼쪽을 보며 훅훅훅 내려옴(불·엔진 소리)
  { parallel: [{ move: YC, px: [M().ycEnter[0], -140], exact: true, speed: 520 }, { sfx: 'rocket' }] },
  { hide: YC },
  partyTo([[400, 292], [348, 268], [348, 324]]),
  ...face(PARTY, 'right'),
  { action: game => { const e = game.entities.find(x => x.id === YC); if (e) { e.x = M().ycStand[0]; e.y = -110; e.facing = 'left'; e.visible = true; } } },
  ...[40, 170, M().ycStand[1]].flatMap(y => [
    { parallel: [{ move: YC, px: [M().ycStand[0], y], exact: true, speed: 300 }, { sfx: 'ember' }, { sfx: 'whoosh', volume: 0.6 }] },
    { wait: 0.28 },
  ]),
  { face: YC, dir: 'left' },
  V('뭐 나혼자 싸우진 않을거임'),
  V('이미 너네 전투패턴은 편집▩조 애들과의 전투에서 다 배웠다 이거야'),
  V('그리고 나의 실험체 두명하고 같이 싸울거임 ㅇㅇ'),
  P('???'),
  V('나와라', 'taunt'),
  close,
  // ⑦ 버튼 → 하늘에서 철창이 천천히 데롱데롱 내려와 영클 뒤에 착지 → 문이 열리고 오방순(위)·나람(아래)이 천천히 걸어 나온다
  { sfx: 'click' },
  { wait: 0.3 },
  { show: CAGE },
  { action: game => { const c = game.entities.find(x => x.id === CAGE); if (c) c.def.oscillate = { dx: 7, period: 1.7 }; } },
  { slide: CAGE, by: [0, 412], duration: 2.6, sfx: 'chain_extend' },
  { action: game => { const c = game.entities.find(x => x.id === CAGE); if (c) delete c.def.oscillate; } },
  { parallel: [{ sfx: 'thud' }, { shake: 0.25, amp: 3 }, { tremble: CAGE, duration: 0.4, amp: 2 }] },
  { wait: 0.5 },
  { hide: CAGE }, { show: CAGE_OPEN }, { sfx: 'locker' },
  { show: OB }, { show: NR },
  { wait: 0.4 },
  { parallel: [
    [{ move: OB, px: [636, 392], exact: true, speed: 42 }, { move: OB, px: [600, 392], exact: true, speed: 42 }, { move: OB, px: [600, 236], exact: true, speed: 42 }, { move: OB, px: [556, 236], exact: true, speed: 42 }],
    [{ wait: 0.5 }, { move: NR, px: [682, 392], exact: true, speed: 42 }, { move: NR, px: [556, 392], exact: true, speed: 42 }, { move: NR, px: [556, 364], exact: true, speed: 42 }],
  ] },
  ...face([OB, NR, YC], 'left'),
  V('자 방순아 나람아. 갈까'),
  O('흐어어어, 이 이중인격 씨발롬들 흐어어어 \\ _ / !!!!'),
  NA('아이구 형님들 잘 좀 부탁드리겠습니다 히요오오옹'),
  P('싸울수밖에 없겠네요.'),
  G('영클아 우리가 이기면 우리 얘기를 들어주는거다'),
  V('즐', 'taunt'),
  close,
  // ⑧ 전투 시작 연출(표준 조우 진입과 같은 그림) — 전투 자체는 다음 명령. 지금은 화면이 돌아오고 대치 상태로 남는다
  { sfx: 'battle_start' }, { bgm: null, fadeOut: 0.2 }, { shake: 0.45, amp: 3 },
  { vortex: { at: 'center', size: 40, grow: 0.9 } },
  { zoom: 1.9, at: 'center', duration: 0.55 },
  { vortex: { size: 900, grow: 0.5 } },
  { fade: 'out', duration: 0.25 }, { wait: 0.15 }, { vortex: null },
  { zoom: 1, duration: 0.01 },
  { set: { ship_intro_done: true } },
  { camera: 'player' },
  { bgm: 'storage_show' },
  { fade: 'in', duration: 0.5 },
  { end: true },
  // 재입장(연출 뒤): 대치 상태 그대로 — 쥰희·용준은 벽 앞에 쓰러져 있고, 영클·오방순·나람은 로고 오른쪽, 철창은 열린 채
  { label: 'after' },
  { action: game => {
    const e = id => game.entities.find(x => x.id === id && !x.dead);
    const put = (id, x, y, dir, extra = {}) => { const a = e(id); if (!a) return; a.x = x; a.y = y; a.facing = dir; a.visible = true; Object.assign(a, extra); };
    put(JID, WALL_X, M().junhee[1], 'left', { pose: 'lying' }); put(YID, WALL_X, M().yongjun[1] - 4, 'left', { pose: 'lying' });
    put(YC, M().ycStand[0], M().ycStand[1], 'left'); put(OB, 556, 236, 'left'); put(NR, 556, 364, 'left');
    const cage = e(CAGE); if (cage) cage.dead = true;
    const open = e(CAGE_OPEN); if (open) open.visible = true;
    const cannon = e(CANNON); if (cannon) cannon.dead = true;
  } },
  { bgm: 'storage_show' },
], { silent: true });
