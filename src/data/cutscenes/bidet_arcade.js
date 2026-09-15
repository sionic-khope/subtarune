// 따듯한비데의 게임 스크린 방 (youngcle9) 입장 연출 — 2026-09-15 사용자 브리핑 원문 그대로.
// 콘티: design/narrative/cutscenes/bidet_arcade.md. 맵 `enter` 로 한 번 실행되고 `bidet_arcade_done` 으로 재입장 반복 없음.
// 좌표는 전부 기준물 상대(`rel`): 비데 NPC(warm_bidet, 128×160 시트·발 피벗 64,156)·키오스크·토관 입구(트리거)·스크린.
// BUILD167 재배치(사용자 지시): 스크린은 방 오른쪽의 거대한 2D 화면(흰 테두리·검은 화면), 토관은 컨트롤러 아래에 눕혀져 왼쪽 입구로 걸어 들어간다.
// 브금: 방에 들어올 땐 없고 이 연출이 시작되면 파크가디언 등장 곡(editor_union_stage)이 나온다(사용자 지시).
const BIDET = 'warm_bidet', MARIO = 'mini_mario', PIPE = 'bidet_pipe', SCREEN = 'bidet_screen';
// 토관 입구(그림 x352~376, 몸은 x376 부터). rel 'left' 는 몸 왼쪽에서 24px 앞(x352) → 입구 안은 +12(x364), 입구 앞은 -28(x324)
const MOUTH_IN = { rel: PIPE, at: 'left', by: [12, 0] };
const MOUTH_OUT = { rel: PIPE, at: 'left', by: [-28, 0] };
// 들어가는 동안만 토관 몸의 막힘을 끈다(컷신 move 도 막힌 소품 앞에서 멈춘다)
const pipeSolid = (on) => ({ action: game => { const pipe = game.entities.find(e => e.id === PIPE); if (pipe) pipe.solid = on; } });
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ' + text });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* ' + text });
const B = text => ({ speaker: '따듯한비데', portrait: BIDET, voice: BIDET, text: '* ' + text });
const close = { action: game => game.textbox.close() };
// 대화 카메라: 키오스크 왼쪽의 일행(x~280)부터 비데(x480)·토관·스크린 왼쪽 가장자리까지 (중심 384,480 · 줌 0.75 → x64~704, y240~720)
const talkCamera = { parallel: [{ camera: [12, 15], duration: 0.6 }, { zoom: 0.75, duration: 0.6 }] };
const mushroomThrow = (id, image, label, color) => [
  // 비데 머리 위 도트마리오(발 y423, x480)에서 키오스크 왼쪽의 주인공(~340,496)으로 포물선. 그림 rect 만 있는 소품이라 충돌 없음
  { spawn: { type: 'prop', id, image, x: 492, y: 400, w: 24, h: 24, solid: false } },
  { hop: id, by: [-152, 96], height: 64, duration: 0.55, sfx: false },
  { remove: id },
  { sfx: 'item' },
  { parallel: PARTY.map(actor => ({ emote: actor, kind: 'stamp', labelText: label, size: 12, offsetY: -24, color, duration: 1.2, hold: 0.7 })) },
];

export const bidet_arcade = [
  { if: flags => flags.bidet_arcade_done, goto: 'end' },
  // 입장: 들어가자마자가 아니라 1.5초 숨 고른 뒤 등장 곡이 1.5초 페이드인으로 깔린다(2026-09-15 사용자: “들어가자마자 나오는 건 아니고” —
  // docs/postmortems/2026-09-15-cue-lead-in.md). 그 사이 카메라가 먼저 잡히고, 곡이 들어오면 비데가 화들짝 놀라 왼쪽(주인공 쪽)을 본다
  talkCamera,
  { wait: 0.9 },
  { bgm: 'editor_union_stage', fadeIn: 1.5 },
  { wait: 0.6 },
  { parallel: [{ emote: BIDET, kind: '!', duration: 1.0, hold: 0.2 }, { hop: BIDET, height: 14, duration: 0.3, sfx: false }] },
  { face: BIDET, dir: 'left' },
  B('오 왔군'),
  close,
  // 주인공들이 걸어와 키오스크 왼쪽에 선다 (키오스크 뒤로 가려지지 않게 키오스크 기준 왼쪽, 64px 간격 삼각)
  { parallel: [
    { move: 'player', rel: 'bidet_kiosk', at: 'left', by: [-24, 0], run: true },
    { move: 'gyeongsub', rel: 'bidet_kiosk', at: 'left', by: [-88, 0], run: true },
    { move: 'ppaman', rel: 'bidet_kiosk', at: 'left', by: [-56, 36], run: true },
  ] },
  ...PARTY.map(id => ({ face: id, dir: 'right' })),
  P('바로 야차까냐?'),
  B('이런이런이런 너무 성격이 급하군'),
  G('비데야'),
  B('네 형'),
  G('복직시켜줄게 와'),
  B('진짜요?'),
  G('ㅇㅇ'),
  B('오 좋아요'),
  G('대신에 요플래채널로 강등이고 일당은 반토막'),
  B('...'),
  B('좆같은사장 씨발 꺼져'),
  G('ㅋㅋ'),
  B('아무튼 큼흠 이걸 보시라 우리 능력자 도트마리오씨!'),
  close,
  // 도트마리오: 눕힌 토관 입구(336,580)에서 튀어나와 비데 머리 위(발 y423 = 비데 발 77px 위)에 착지. 착지 뒤엔 비데보다 앞에 그린다
  { show: MARIO },
  { hop: MARIO, by: [0, -70], height: 40, duration: 0.35, sfx: 'mario_jump' },
  { hop: MARIO, by: [144, -87], height: 110, duration: 0.75, sfx: 'mario_jump' },
  { action: game => { const mario = game.entities.find(actor => actor.id === MARIO); if (mario) mario.def.sortY = 9000; } },
  { face: MARIO, dir: 'left' },
  { wait: 0.3 },
  // 카메라가 줌아웃되며 거대 게임 스크린(576×480)을 통째로 본다 — 토관이 스크린으로 이어진 것까지
  { parallel: [{ camera: SCREEN, duration: 0.8 }, { zoom: 0.5, duration: 0.8 }] },
  B('제가 준비한건 바로 이 거대한 게임스크린입니다!'),
  P('저게 뭔데'),
  B('이거로 말할거같으면 저 마리오 토관같은걸 타면 저 게임세계로 들어갈 수 있다'),
  P('오'),
  B('거기서 너희들! 나와 승부하자'),
  P('어떻게 하는건데?'),
  B('어캐함?'),
  close,
  // 도트마리오 클로즈업 → 두구두구두구 → 잠깐 정적 → 화면 복귀
  { parallel: [{ zoom: 2.2, at: MARIO, duration: 0.45 }, { camera: MARIO, duration: 0.45 }] },
  { bgmPause: 0.2 },
  { sfx: 'drumroll' },
  { wait: 1.7 },
  { wait: 0.8 },
  talkCamera,
  { bgmResume: 0.3 },
  // 초록 버섯(공격력 +1) → 빨강 버섯(체력 +20) 을 일행에게 던진다. 띠링 두 번
  ...mushroomThrow('bidet_mushroom_green', 'assets/props/editor-union-mushroom-green.png', 'ATK +1', '#8ce27a'),
  { action: game => { game.attack = (game.attack || 1) + 1; game.autosave?.(); } },
  ...mushroomThrow('bidet_mushroom_red', 'assets/props/editor-union-mushroom.png', 'HP +20', '#ffe066'),
  { action: game => {
    game.hpBonus = (game.hpBonus || 0) + 20;
    for (const id of ['hyungsub', ...game.party]) game.partyHp[id] = Math.min(game.maxHpOf(id), game.hpOf(id) + 20);
    game.autosave?.();
  } },
  P('오 머야'),
  B('야이 ㅂㅅ새기야'),
  close,
  // 비데가 도트마리오를 역동적으로 날려 버린다 (왼쪽 위로 빙글빙글, 화면 밖). 날리는 소리는 장면마다 다르게 — 여기선 대포 퍽
  { sfx: 'thud' },
  { parallel: [{ fling: MARIO, vx: -680, vup: 860, spin: 16, duration: 1.4, sfx: 'cannon_puff' }, { shake: 0.25, amp: 4 }] },
  B('다 상관없다 들어와라'),
  close,
  // 빠르게 눕힌 토관 입구(왼쪽)로 가서 오른쪽으로 들어간다 — 마리오 토관 소리와 함께 몸이 빨려 들어가듯 줄어든다(사용자 지시)
  { move: BIDET, ...MOUTH_OUT, run: true },
  { face: BIDET, dir: 'right' },
  { sfx: 'mario_pipe' },
  pipeSolid(false),
  { parallel: [{ move: BIDET, ...MOUTH_IN, run: true }, { scale: BIDET, to: 0.12, duration: 0.55 }] },
  { hide: BIDET },
  { scale: BIDET, to: 1, duration: 0 },
  // 숨긴 채 두면 입구 자리에서 C 프로브를 가로채 토관과 상호작용이 안 된다 → 아예 제거(재입장 땐 unless 로 안 생김)
  { remove: BIDET },
  pipeSolid(true),
  { wait: 0.4 },
  P('뭐 일단 부딪혀보는거 아니겠습니까 들어가시죠'),
  close,
  { parallel: [{ camera: 'player', duration: 0.55 }, { zoom: 1, duration: 0.55 }] },
  { regroup: true },
  { set: { bidet_arcade_done: true } },
  { label: 'end' },
];

/**
 * 토관 앞에서 C(토관 소품 script): 연출 뒤에는 ‘들어갈까?’ 선택 → 들어가면 주인공이 입구로 들어가며 몸이 줄어들고 일행이 숨은 뒤
 * 카메라가 거대 스크린으로 잡히며 → 섭리오 오버레이 씬(보스 격파로 끝나면 subrio_cleared). 돌아오면 입구로 나와 등장 곡 복귀. 연출 전에는 토관 설명만.
 */
const FOLLOWERS = ['gyeongsub', 'ppaman'];
export const bidet_pipe_enter = [
  { if: flags => !flags.bidet_arcade_done, goto: 'plain' },
  { text: '* 컨트롤러 아래 눕혀진 초록 토관.\n* 오른쪽 끝이 거대한 스크린 속으로 이어진다.', voice: 'narrator' },
  { text: '* 토관 안으로 들어갈까?', voice: 'narrator',
    choice: { options: [{ label: '들어간다', goto: 'enter' }, { label: '그만둔다', goto: 'stay' }], cancel: 1 } },
  { label: 'enter' },
  { text: '* 토관 안으로 몸을 밀어 넣었다.', voice: 'narrator' },
  close,
  { move: 'player', ...MOUTH_OUT, run: true },
  { face: 'player', dir: 'right' },
  { sfx: 'mario_pipe' },
  pipeSolid(false),
  { parallel: [{ move: 'player', ...MOUTH_IN, run: true }, { scale: 'player', to: 0.12, duration: 0.55 }] },
  { hide: 'player' },
  { scale: 'player', to: 1, duration: 0 },
  ...FOLLOWERS.map(id => ({ hide: id })),
  { bgm: null, fadeOut: 0.8 },
  { parallel: [{ camera: SCREEN, duration: 1.1 }, { zoom: 0.9, duration: 1.1 }] },
  { wait: 0.4 },
  { scene3d: 'subrio', flag: 'subrio_cleared' },
  { show: 'player' },
  ...FOLLOWERS.map(id => ({ show: id })),
  { move: 'player', ...MOUTH_OUT, run: true },
  pipeSolid(true),
  { face: 'player', dir: 'left' },
  { regroup: true },
  { parallel: [{ camera: 'player', duration: 0.5 }, { zoom: 1, duration: 0.5 }] },
  { bgm: 'editor_union_stage' },
  { end: true },
  { label: 'stay' },
  { text: '* 일단 그만두었다.', voice: 'narrator' },
  { end: true },
  { label: 'plain' },
  { text: '* 마리오 게임에 나올 법한 초록 토관이 눕혀져 있다.\n* 왼쪽 입구가 열려 있고 오른쪽은 스크린 안으로 이어진다.', voice: 'narrator' },
];

export const bidet_screen_look = [
  { text: '* 방 오른쪽을 통째로 차지한 거대한 화면.\n* 흰 테두리 안은 아직 새까맣다.', voice: 'narrator' },
];

export const bidet_kiosk_look = [
  { text: '* 조이스틱 하나와 노란 버튼 두 개짜리 컨트롤러다.\n* 아직 아무것도 켜져 있지 않다.', voice: 'narrator' },
];
