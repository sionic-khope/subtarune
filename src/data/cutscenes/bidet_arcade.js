// 따듯한비데의 게임 스크린 방 (youngcle9) 입장 연출 — 2026-09-15 사용자 브리핑 원문 그대로.
// 콘티: design/narrative/cutscenes/bidet_arcade.md. 맵 `enter` 로 한 번 실행되고 `bidet_arcade_done` 으로 재입장 반복 없음.
// 좌표는 전부 기준물 상대(`rel`): 비데 NPC(warm_bidet, 128×160 시트·발 피벗 64,156)·키오스크·토관·스크린.
const BIDET = 'warm_bidet', MARIO = 'mini_mario', PIPE = 'bidet_pipe', SCREEN = 'bidet_screen';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ' + text });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* ' + text });
const B = text => ({ speaker: '따듯한비데', portrait: BIDET, voice: BIDET, text: '* ' + text });
const close = { action: game => game.textbox.close() };
// 대화 카메라: 왼쪽 문 앞 주인공(x48)부터 비데(x488~616)까지 한 화면 (중심 352,416 · 줌 0.75 → x32~672)
const talkCamera = { parallel: [{ camera: [11, 13], duration: 0.6 }, { zoom: 0.75, duration: 0.6 }] };
const mushroomThrow = (id, image, label, color) => [
  // 비데 머리 위 도트마리오(발 y343, x488~512)에서 키오스크 왼쪽의 주인공(356,432)으로 포물선. 그림 rect 만 있는 소품이라 충돌 없음
  { spawn: { type: 'prop', id, image, x: 500, y: 320, w: 24, h: 24, solid: false } },
  { hop: id, by: [-144, 112], height: 64, duration: 0.55, sfx: false },
  { remove: id },
  { sfx: 'item' },
  { parallel: PARTY.map(actor => ({ emote: actor, kind: 'stamp', labelText: label, size: 12, offsetY: -24, color, duration: 1.2, hold: 0.7 })) },
];

export const bidet_arcade = [
  { if: flags => flags.bidet_arcade_done, goto: 'end' },
  // 입장: 비데가 화들짝 놀라 왼쪽(주인공 쪽)을 본다
  talkCamera,
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
  // 도트마리오: 토관에서 튀어나와(756,372→328) 비데 머리 위(발 y343 = 비데 몸체 93px 위)에 착지. 착지 뒤엔 비데보다 앞에 그린다
  { show: MARIO },
  { hop: MARIO, by: [0, -44], height: 34, duration: 0.35, sfx: 'mario_jump' },
  { hop: MARIO, by: [-268, 9], height: 110, duration: 0.75, sfx: 'mario_jump' },
  { action: game => { const mario = game.entities.find(actor => actor.id === MARIO); if (mario) mario.def.sortY = 9000; } },
  { face: MARIO, dir: 'left' },
  { wait: 0.3 },
  // 카메라가 줌아웃되며 거대 게임 스크린을 본다
  { parallel: [{ camera: SCREEN, duration: 0.8 }, { zoom: 0.62, duration: 0.8 }] },
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
  // 비데가 도트마리오를 역동적으로 날려 버린다 (왼쪽 위로 빙글빙글, 화면 밖)
  { sfx: 'thud' },
  { shake: 0.25, amp: 4 },
  { fling: MARIO, vx: -680, vup: 860, spin: 16, duration: 1.4, sfx: 'whoosh' },
  B('다 상관없다 들어와라'),
  close,
  // 빠르게 토관으로 가서 뛰어들어간다 — 마리오 토관 소리
  { move: BIDET, rel: PIPE, at: 'left', by: [-8, 0], run: true },
  { move: BIDET, rel: PIPE, at: 'top', by: [0, 0], run: true },
  { sfx: 'mario_pipe' },
  { hop: BIDET, by: [0, 20], height: 18, duration: 0.45, sfx: false },
  { hide: BIDET },
  { wait: 0.4 },
  P('뭐 일단 부딪혀보는거 아니겠습니까 들어가시죠'),
  close,
  { parallel: [{ camera: 'player', duration: 0.55 }, { zoom: 1, duration: 0.55 }] },
  { regroup: true },
  { set: { bidet_arcade_done: true } },
  { label: 'end' },
];

/** 토관 조사: 연출 뒤에는 섭리오(스크린 속 2D 게임)로 들어간다 — 스크린이 화면 가운데로 잡히며 줌인 → 오버레이 씬. 그 전에는 그냥 토관 */
export const bidet_pipe_enter = [
  { if: flags => !flags.bidet_arcade_done, goto: 'plain' },
  { text: '* 토관 안으로 몸을 밀어 넣었다.', voice: 'narrator' },
  close,
  { sfx: 'mario_pipe' },
  { bgm: null, fadeOut: 0.8 },
  { parallel: [{ camera: SCREEN, duration: 1.1 }, { zoom: 2.3, duration: 1.1 }] },
  { wait: 0.4 },
  { scene3d: 'subrio' },
  { parallel: [{ camera: 'player', duration: 0.5 }, { zoom: 1, duration: 0.5 }] },
  { bgm: 'youngcle_factory' },
  { end: true },
  { label: 'plain' },
  { text: '* 마리오 게임에 나올 법한 초록 토관이다.', voice: 'narrator' },
];

export const bidet_screen_look = [
  { text: '* 거대한 게임 화면. 모래밭과 야자수 사이에서\n* 작은 용사가 붉은 보석을 들어 올리고 있다.', voice: 'narrator' },
];

export const bidet_kiosk_look = [
  { text: '* 조이스틱 하나와 노란 버튼 두 개짜리 컨트롤러다.\n* 아직 아무것도 켜져 있지 않다.', voice: 'narrator' },
];
