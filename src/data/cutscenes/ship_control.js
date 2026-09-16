// 엄청대박인배 조종실 입장 연출(youngcle20, BUILD202 사용자 브리핑 원문 design/narrative/cutscenes/ship_control.md, BUILD203 페이싱·대포 정정).
//   입장(느낌표) → 카메라가 천천히 콘솔 한가운데(바닥 로고)로 → 쥰희·용준이 앞을 보고 “어서 나와라 …” → 검게 → 왼쪽 벽 클로즈업(확대) → 밝아지며 대포가 드르르륵 천천히 나온다(카메라도 천천히)
//   → 확대 풀림 → 발사(큰 연기) → 쥰희 몸보다 큰 검은 포탄이 보이게 날아가 쥰희를 오른쪽 벽까지 쭉 → 쾅(진동) “꾸엑” 기절 → 용준 “어?! 형 !!!” → 가운데서 날아온 포탄에 용준도 쥰희 옆에 쓰러짐
//   → 주인공 셋 가운데로 → 영클 “ㅋㅋ”(브금) 천천히 내려와 착지 훙훙훙, 일행 뒷걸음 → 대사 → 영클이 하늘로 쭉 → 일행 중앙 살짝 왼쪽에서 오른쪽을 봄 → 영클이 오른쪽에서 천천히 세 단 내려와 훙훙훙(불·엔진)
//   → 대사 → “나와라”: 버튼 → 철창이 데롱데롱 내려와 착지 → 문 열림 → 오방순(위)·나람(아래, 거대) 천천히 걸어 나옴 → 대사 → “즐” → 전투 시작 연출(전투 자체는 다음 명령).
//   페이싱 원칙(사용자 2026-09-16 “인간이 읽을 때 너무 진행이 빠른 것들 안 된다”): 동작 뒤엔 반드시 숨 고르기(wait ≥0.5), 이동은 느리게, 큰 동작 앞뒤엔 페이드.
const YC = 'ship_youngcle', JID = 'ship_junhee', YID = 'ship_yongjun', OB = 'ship_obangsun', NR = 'ship_naram';
const CAGE = 'ship_cage', CAGE_OPEN = 'ship_cage_open', CANNON = 'ship_cannon', BALL1 = 'ship_ball1', BALL2 = 'ship_ball2';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
// 자리 상수는 tools/maps/youngcle20.py(JUNHEE·YONGJUN·YC_ENTER·YC_STAND) 와 같은 값 — 맵 JSON 은 비동기 로드라 여기서 직접 둔다(tests/unit/ship-control.test.mjs 가 대조)
const SPOT = { junhee: [486, 278], yongjun: [436, 334], ycEnter: [470, 236], ycStand: [556, 300], cageDrop: 396 };
const M = () => SPOT;
const LOGO_CAM = [14.5, 8.9];                              // 바닥 로고(480,300)가 화면 가운데
const WALL_X = 900;                                        // 오른쪽 벽 앞(히트박스 x, 벽 928)
const BALL = 64;                                           // 포탄 지름(쥰희 몸 46px 보다 크게 — 사용자 “타코 몸보다 커야 해”)
const MUZZLE = [8 + 176 - 28, 274];                        // 대포(176×69)가 다 나왔을 때 포구(x 156, 포구 가운데 y274)
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
const ball = (id, cx, cy) => ({ spawn: { type: 'prop', id, image: 'assets/props/ship_cannonball.png', x: cx - BALL / 2, y: cy - BALL / 2, w: BALL, h: BALL, solid: false, sortY: 1000000000 } });
const smoke = at => ({ boom: { sheet: 'assets/fx/cannon_smoke.png', at, cols: 6, count: 6, fps: 12, scale: 2.2, sfx: 'cannon_puff' } });
/** 착지 훙 훙 훙: 비행 장치가 제자리에서 세 번 작게 떴다 내려앉는다(사용자 “착지 훙 훙 훙 정도 모션”) */
const settle = id => [
  { parallel: [{ hop: id, by: [0, 0], height: 10, duration: 0.42, sfx: false }, { sfx: 'whoosh', volume: 0.5 }] }, { wait: 0.12 },
  { parallel: [{ hop: id, by: [0, 0], height: 6, duration: 0.36, sfx: false }, { sfx: 'whoosh', volume: 0.4 }] }, { wait: 0.12 },
  { parallel: [{ hop: id, by: [0, 0], height: 3, duration: 0.3, sfx: false }, { sfx: 'whoosh', volume: 0.3 }] },
];
/** 포탄이 보이게 날아가(카메라가 포탄을 따라감) 맞는 순간 사람을 밀고 오른쪽 벽까지 쭉 — 벽에서 진동·충격음, 포탄은 사라진다 */
const shoot = (ballId, targetId, fromCx, targetCx, toY) => [
  { camera: ballId },
  { slide: ballId, by: [targetCx - fromCx, 0], duration: 0.6 },
  { parallel: [{ sfx: 'hit' }, { shake: 0.12, amp: 3 }] },
  { wait: 0.1 },
  { camera: targetId },
  { parallel: [
    { hop: targetId, by: [WALL_X - (targetCx - 12), toY], height: 22, duration: 0.55, sfx: false },
    { slide: ballId, by: [WALL_X - (targetCx - 12) + 24, toY], duration: 0.55 },
  ] },
  { remove: ballId },
  { parallel: [{ shake: 0.5, amp: 8 }, { sfx: 'impact' }, { tremble: targetId, duration: 0.45, amp: 3 }] },
  { wait: 0.6 },
];
const partyTo = (spots, opts = {}) => ({ parallel: PARTY.map((id, i) => ({ move: id, px: spots[i], exact: true, ...opts })) });

export const ship_control_intro = Object.assign([
  { if: flags => flags.ship_intro_done, goto: 'after' },
  { action: game => { game.sound.preloadBgm('storage_show'); } },
  // ① 입장: 조금 걸어 들어와 느낌표, 숨 고르기
  { wait: 0.5 },
  { move: 'player', px: [468, 440], exact: true },
  { wait: 0.3 },
  bang(PARTY),
  { wait: 0.6 },
  // ② 카메라가 천천히 콘솔 한가운데(바닥 로고)로 — 쥰희·용준이 거리를 두고 앞을 보고 서 있다
  { camera: LOGO_CAM, duration: 1.8 },
  { wait: 0.7 },
  J('어서 나와라 시발롬아'),
  J('맞짱이다 개새끼'),
  J('...'),
  J('...?'),
  close,
  { wait: 0.7 },
  // ③ 검게 → 왼쪽 벽 클로즈업 → 밝아지며 대포가 드르르륵 천천히 나온다(카메라도 천천히 따라 흐름) → 확대 풀림 → 발사
  { fade: 'out', duration: 0.5 },
  { wait: 0.3 },
  { camera: [6, 8.6], duration: 0.01 },
  { zoom: 1.7, at: [150, 274], duration: 0.01 },   // 줌은 초점을 화면 가운데에 둔다 → 초점 x 는 480/1.7/2 ≈ 141 이상이어야 맵 왼쪽 밖(검정)이 안 보인다
  { show: CANNON },
  { fade: 'in', duration: 0.7 },
  { wait: 0.5 },
  { parallel: [
    { slide: CANNON, by: [152, 0], duration: 2.6, sfx: 'scrape' },
    { camera: [7.2, 8.6], duration: 2.4 },
  ] },
  { wait: 0.7 },
  { parallel: [{ zoom: 1, duration: 0.9 }, { camera: [8, 8.6], duration: 0.9 }] },
  { wait: 0.4 },
  { async: [smoke(MUZZLE)] }, { async: [{ shake: 0.35, amp: 5 }] }, { sfx: 'boom' },
  ball(BALL1, MUZZLE[0] + 10, MUZZLE[1]),
  { wait: 0.15 },
  ...shoot(BALL1, JID, MUZZLE[0] + 10, M().junhee[0] + 12, 0),
  J('꾸엑'),
  close,
  { wait: 0.3 },
  { pose: JID, to: 'lying' },
  { wait: 0.9 },
  // ④ 용준: 카메라 가운데로 → “어?! 형 !!!” → 가운데서 날아온 포탄(대포 연출 없이)에 맞아 쥰희 옆에 쓰러짐
  { camera: LOGO_CAM, duration: 0.9 },
  { wait: 0.4 },
  Y('어?! 형 !!!'),
  close,
  { wait: 0.5 },
  ball(BALL2, 200, M().yongjun[1] + 8 - 16),
  ...shoot(BALL2, YID, 200, M().yongjun[0] + 12, -4),
  { wait: 0.3 },
  { pose: YID, to: 'lying' },
  { wait: 1.0 },
  // ⑤ 주인공 셋이 가운데로 → 영클 “ㅋㅋ”(브금) → 천천히 내려와 착지 훙훙훙, 일행은 뒷걸음
  { camera: LOGO_CAM, duration: 0.9 },
  { wait: 0.3 },
  partyTo([[468, 330], [420, 352], [516, 352]], { run: true }),
  ...face(PARTY, 'up'),
  { wait: 0.7 },
  V('ㅋㅋ', 'laugh'),
  close,
  { wait: 0.4 },
  { bgm: 'storage_show' },
  { show: YC },
  { parallel: [
    { move: YC, px: M().ycEnter, exact: true, speed: 95 },
    [{ wait: 1.6 }, { parallel: PARTY.map(id => ({ move: id, by: [0, 20], speed: 60 })) }],   // by 는 16px 단위 → 40px 뒷걸음
    { sfx: 'ember' },
  ] },
  ...face(PARTY, 'up'),
  { face: YC, dir: 'down' },
  ...settle(YC),
  { wait: 0.9 },
  V('반갑노 게이들아'),
  P('영클형..'),
  V('ㅇㅇ'),
  G('왜 우리를 공격하는지 이유를 알려줄수있나.'),
  V('...'),
  V('나는'),
  V('이 세상에서 나가는 출구를 알고있다.'),
  close,
  { wait: 0.3 },
  bang(PARTY),
  { wait: 0.4 },
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
  { wait: 0.3 },
  bang(PARTY),
  { wait: 0.4 },
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
  { wait: 0.3 },
  { emote: 'player', kind: '!', duration: 1.1, hold: 0.45 },
  { wait: 0.4 },
  V('갖고있나보군 역시'),
  close,
  { wait: 0.6 },
  // ⑥ 영클이 하늘로 쭉 올라가 사라지고, 일행은 중앙 살짝 왼쪽에서 오른쪽을 봄 → 영클이 오른쪽에서 천천히 세 단 내려와 착지 훙훙훙(불·엔진 소리)
  { parallel: [{ move: YC, px: [M().ycEnter[0], -140], exact: true, speed: 420 }, { sfx: 'rocket' }] },
  { hide: YC },
  { wait: 0.6 },
  partyTo([[400, 292], [348, 268], [348, 324]]),
  ...face(PARTY, 'right'),
  { wait: 0.6 },
  { action: game => { const e = game.entities.find(x => x.id === YC); if (e) { e.x = M().ycStand[0]; e.y = -110; e.facing = 'left'; e.visible = true; } } },
  { parallel: [
    { move: YC, px: M().ycStand, exact: true, speed: 85 },
    [{ sfx: 'ember' }, { wait: 1.2 }, { sfx: 'whoosh', volume: 0.5 }, { wait: 1.2 }, { sfx: 'ember' }, { wait: 1.2 }, { sfx: 'whoosh', volume: 0.5 }],
  ] },
  { face: YC, dir: 'left' },
  ...settle(YC),
  { wait: 0.9 },
  V('뭐 나혼자 싸우진 않을거임'),
  { ...V('이미 너네 전투패턴은 편집노조 애들과의 전투에서 다 배웠다 이거야'), mosaic: { text: '노', block: 4 } },   // ‘노’만 모자이크(악질맨 말풍선과 같은 text-mosaic)
  V('그리고 나의 실험체 두명하고 같이 싸울거임 ㅇㅇ'),
  P('???'),
  V('나와라', 'taunt'),
  close,
  { wait: 0.5 },
  // ⑦ 버튼 → 하늘에서 철창이 천천히 데롱데롱 내려와 영클 뒤에 착지 → 문이 열리고 오방순(위)·나람(아래)이 천천히 걸어 나온다
  { sfx: 'click' },
  { wait: 0.6 },
  { show: CAGE },
  // 사슬에 매달려 내려온다: 처음엔 좀 빠르게 흔들리며(데롱데롱), 바닥 가까이선 느려지고, 닿으면 살짝 튀었다 가라앉는다(사용자 “철창 내려오는 것도 부자연스럽다”)
  { action: game => { const c = game.entities.find(x => x.id === CAGE); if (c) c.def.oscillate = { dx: 5, period: 1.9 }; } },
  { slide: CAGE, by: [0, Math.round(M().cageDrop * 0.62)], duration: 1.7, sfx: 'chain_extend' },
  { action: game => { const c = game.entities.find(x => x.id === CAGE); if (c) c.def.oscillate = { dx: 2, period: 1.9 }; } },
  { slide: CAGE, by: [0, M().cageDrop - Math.round(M().cageDrop * 0.62)], duration: 1.9 },
  { action: game => { const c = game.entities.find(x => x.id === CAGE); if (c) delete c.def.oscillate; } },
  { parallel: [{ sfx: 'thud' }, { shake: 0.22, amp: 3 }, { hop: CAGE, by: [0, 0], height: 5, duration: 0.3, sfx: false, keep: true }] },
  { wait: 0.9 },
  { hide: CAGE }, { show: CAGE_OPEN }, { sfx: 'locker' },
  { show: OB }, { show: NR },
  { wait: 0.6 },
  { parallel: [
    [{ move: OB, px: [614, 392], exact: true, speed: 40 }, { move: OB, px: [600, 392], exact: true, speed: 40 }, { move: OB, px: [600, 236], exact: true, speed: 40 }, { move: OB, px: [556, 236], exact: true, speed: 40 }],
    [{ wait: 0.6 }, { move: NR, px: [660, 392], exact: true, speed: 40 }, { move: NR, px: [556, 392], exact: true, speed: 40 }, { move: NR, px: [556, 364], exact: true, speed: 40 }],
  ] },
  ...face([OB, NR, YC], 'left'),
  { wait: 0.8 },
  V('자 방순아 나람아. 갈까'),
  O('흐어어어, 이 이중인격 씨발롬들 흐어어어 \\ _ / !!!!'),
  NA('아이구 형님들 잘 좀 부탁드리겠습니다 히요오오옹'),
  P('싸울수밖에 없겠네요.'),
  G('영클아 우리가 이기면 우리 얘기를 들어주는거다'),
  V('즐', 'taunt'),
  close,
  { wait: 0.5 },
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
