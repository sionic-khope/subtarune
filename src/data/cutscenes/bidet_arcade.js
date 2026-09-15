// 따듯한비데의 게임 스크린 방 (youngcle9) 입장 연출 — 2026-09-15 사용자 브리핑 원문 그대로.
// 콘티: design/narrative/cutscenes/bidet_arcade.md. 맵 `enter` 로 한 번 실행되고 `bidet_arcade_done` 으로 재입장 반복 없음.
// 좌표는 전부 기준물 상대(`rel`): 비데 NPC(warm_bidet, 128×160 시트·발 피벗 64,156)·키오스크·토관 입구(트리거)·스크린.
// BUILD167 재배치(사용자 지시): 스크린은 방 오른쪽의 거대한 2D 화면(흰 테두리·검은 화면), 토관은 컨트롤러 아래에 눕혀져 왼쪽 입구로 걸어 들어간다.
// 브금: 방에 들어올 땐 없고 이 연출이 시작되면 파크가디언 등장 곡(editor_union_stage)이 나온다(사용자 지시).
import { FX } from '../fx.js';
const BIDET = 'warm_bidet', MARIO = 'mini_mario', PIPE = 'bidet_pipe', SCREEN = 'bidet_screen', GRATE = 'youngcle7_grate';
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

/**
 * 보스 격파 뒤 귀환 연출(2026-09-15 사용자 원문). 결과창이 닫히면 토관에서 셋이 차례로 나온다(브금 꺼진 채) → “별거없네요 ㅋㅋ” → 안 보이는 비데 “... 기 기다려..” →
 * 모두 느낌표·오른쪽을 봄 → 비데가 오른쪽 아래(스크린 아래)에서 걸어와 복직·반값 → 공격 이유(영클형) → “그야.. 가ㅈ..” 말이 끊기며 도트마리오가 비데 머리 위로 떨어짐 →
 * “어 도트마리오” → 마리오가 비데를 번쩍 들어 머리 위에 올리고 왼쪽 문으로 질주 → 연결로(youngcle8)를 가로질러 → 무대(youngcle7) 위 통로로 달려 올라가
 * 길을 막은 **철창(`youngcle7_grate`)을 폭파**(폭발 이펙트 + 폭발음, 철창이 날아감 → `youngcle7_grate_blown`) → 둘 다 뚫린 통로 위로 사라짐 → 카메라 주인공 → “오 뭐지.. 일단 뭐 이어서 가보죠” → 조작.
 * 토관 C 뒤(bidet_pipe_enter)와 QA 진입(bidet_arcade enter, subrio_cleared 만 선 상태) 둘 다 이 노드를 쓴다. 끝나면 subrio_after_done(방 브금은 그 뒤로 무음).
 * 캐릭터 몸은 24×16: 마리오 그림 키 ~30px → 머리 위 = y-30, 비데 머리 위 = y-77(입장 연출과 같은 값). 다른 맵의 마리오·비데는 spawn 으로 새로 만든다.
 */
const CARRY = { id: BIDET, offset: [0, -30], facing: 'down' };
const marioSpawn = (x, y) => ({ spawn: { type: 'npc', id: MARIO, sprite: 'mini_mario', x, y, facing: 'left', wander: 0, solid: false } });
const bidetSpawn = (x, y, facing = 'down') => ({ spawn: { type: 'npc', id: BIDET, sprite: 'warm_bidet', x, y, facing, wander: 0, solid: false } });
// 마리오는 비데보다 앞에(들고 있을 때·머리 위에 탔을 때 둘 다)
const marioFront = { action: game => { const mario = game.entities.find(actor => actor.id === MARIO); if (mario) mario.def.sortY = 9000; } };
// 토관 입구에서 몸이 커지며 걸어 나온다(들어갈 때의 역순, 마리오 토관 소리)
const emerge = (id, by) => [
  { scale: id, to: 0.12, duration: 0 },
  { move: id, ...MOUTH_IN, speed: 4000 },
  { show: id },
  { sfx: 'mario_pipe' },
  { parallel: [{ move: id, rel: PIPE, at: 'left', by, run: true }, { scale: id, to: 1, duration: 0.5 }] },
  { face: id, dir: 'left' },
];
const subrioAfter = () => [
  { bgm: null },
  ...PARTY.map(id => ({ hide: id })),
  pipeSolid(false),
  talkCamera,
  { wait: 0.5 },
  ...emerge('player', [-28, 0]),
  ...emerge('gyeongsub', [-92, -34]),
  ...emerge('ppaman', [-66, 40]),
  pipeSolid(true),
  { wait: 0.5 },
  P('별거없네요 ㅋㅋ'),
  B('... 기 기다려..'),
  close,
  { parallel: PARTY.map((id, i) => ({ emote: id, kind: '!', duration: 1.0, hold: 0.6, ...(i === 0 ? { sfx: 'chime' } : {}) })) },
  ...PARTY.map(id => ({ face: id, dir: 'right' })),
  // 비데가 오른쪽 아래(스크린 아래 바닥)에서 토관 앞 일행의 오른쪽까지 걸어온다(사용자: 오른쪽에서)
  bidetSpawn(1000, 648, 'left'),
  { move: BIDET, rel: 'player', at: 'right', by: [90, 66] },
  { face: BIDET, dir: 'left' },
  B('기 기다려...'),
  P('머야 ㅂㅅ아 꺼저'),
  B('그 그래서 나 복직 시켜주냐 반값 할게'),
  G('ㅗ'),
  B('...'),
  P('근데 우리를 공격하는 이유가 뭐야?'),
  B('그야 영클형이 시켰으니까'),
  P('영클형은 왜 우리를 싫어하는거지?'),
  close,
  // 말을 끊으며 도트마리오가 하늘에서 비데 머리 위로 떨어진다(휘융 → 툭). 미리 하늘에 숨겨 두고 대사 0.45초 뒤 배경에서 떨어뜨린다
  { action: game => { const bidet = game.entities.find(actor => actor.id === BIDET); if (bidet) game.spawn({ type: 'npc', id: MARIO, sprite: 'mini_mario', x: bidet.x, y: bidet.y - 77 - 240, facing: 'left', wander: 0, solid: false, hidden: true }); } },
  marioFront,
  { async: [{ wait: 0.45 }, { show: MARIO }, { hop: MARIO, by: [0, 240], height: 6, duration: 0.42, sfx: 'wing' }, { sfx: 'thud' }, { emote: BIDET, kind: 'sweat', duration: 1.0, hold: 0 }] },
  { ...B('그야.. 가ㅈ..'), cut: 1.05 },
  P('어 도트마리오'),
  close,
  // 마리오가 옆으로 뛰어내려 비데를 번쩍 들어 머리 위에 올리고(퐁·느낌표) 왼쪽 문으로 질주(쿵쿵 흔들림)
  { hop: MARIO, by: [-44, 77], height: 30, duration: 0.35, sfx: 'mario_jump' },
  { face: MARIO, dir: 'right' },
  { wait: 0.25 },
  { sfx: 'pop' },
  { hop: BIDET, by: [-44, -30], height: 26, duration: 0.3, sfx: false },
  { emote: BIDET, kind: '!', duration: 0.8, hold: 0.35, sfx: 'chime' },
  { move: MARIO, rel: 'youngcle9_left', at: 'right', by: [-6, 0], dash: true, carry: CARRY, shake: 2 },
  { remove: MARIO }, { remove: BIDET },
  // 연결로(youngcle8)를 오른쪽에서 왼쪽으로 가로지른다 — 카메라는 마리오
  { fade: 'out', duration: 0.3 },
  { map: 'youngcle8', spawn: 'right' },
  ...PARTY.map(id => ({ hide: id })),
  marioSpawn(760, 200), marioFront, bidetSpawn(760, 170),
  { zoom: 1, duration: 0.01 },
  { camera: MARIO },
  { fade: 'in', duration: 0.3 },
  { move: MARIO, rel: 'youngcle8_left', at: 'right', by: [-4, 0], dash: true, carry: CARRY, shake: 2 },
  // 무대(youngcle7) 오른쪽 통로 → 위 통로 입구 → 철창(x928~1056·y192~288) 바로 아래에 멈춤
  { fade: 'out', duration: 0.3 },
  { map: 'youngcle7', spawn: 'from_corridor' },
  ...PARTY.map(id => ({ hide: id })),
  marioSpawn(1120, 480), marioFront, bidetSpawn(1120, 450),
  { camera: MARIO },
  { fade: 'in', duration: 0.3 },
  { move: MARIO, px: [968, 330], dash: true, carry: CARRY, shake: 2 },
  { move: MARIO, px: [968, 308], dash: true, carry: CARRY, shake: 2 },
  { wait: 0.15 },
  // 철창 폭파(사용자: 문이 아니라 철창): 폭발 이펙트(사용자 지정 델타룬 폭발) + 폭발음 + 흔들림 + 철창이 빙글 날아감. 그 뒤로 맵에 철창이 없다(youngcle7_grate_blown)
  { parallel: [
    { boom: { ...FX.explosion, at: GRATE, scale: 2.0, offset: [0, 0] } },
    { shake: 0.6, amp: 8 },
    { fling: GRATE, vx: 30, vup: 760, spin: 8, duration: 1.3, sfx: false },
  ] },
  { set: { youngcle7_grate_blown: true } },
  // 뚫린 통로를 달려 올라가 위로 사라진다
  { move: MARIO, px: [968, 64], dash: true, carry: CARRY, shake: 2 },
  { parallel: [{ hop: MARIO, by: [0, -140], height: 30, duration: 0.45, sfx: 'mario_jump', keep: true }, { hop: BIDET, by: [0, -140], height: 30, duration: 0.45, sfx: false, keep: true }] },
  { remove: MARIO }, { remove: BIDET },
  { wait: 0.5 },
  // 카메라를 비데 방의 주인공에게 — 셋은 토관 입구 앞에 그대로
  { fade: 'out', duration: 0.35 },
  { map: 'youngcle9', spawn: 'inside' },
  { move: 'player', ...MOUTH_OUT, speed: 4000 },
  { face: 'player', dir: 'left' },
  { regroup: true },
  { zoom: 1, duration: 0.01 },
  { camera: 'player' },
  { fade: 'in', duration: 0.5 },
  { wait: 0.4 },
  P('오 뭐지.. 일단 뭐 이어서 가보죠'),
  close,
  { set: { subrio_after_done: true } },
];

export const bidet_arcade = [
  // 보스를 이긴 채(subrio_cleared) 귀환 연출이 아직이면(QA 점프·이어하기) 그 연출부터
  { if: flags => flags.subrio_cleared && !flags.subrio_after_done, goto: 'after' },
  { if: flags => flags.bidet_arcade_done, goto: 'end' },
  // 입장(2026-09-15 사용자 재지시, docs/postmortems/2026-09-15-cue-lead-in.md): 일행이 문에서 몇 걸음 걸어 들어온 뒤 → 카메라가 비데 쪽으로 돌아가고 →
  // 등장 곡이 3초 페이드인으로 천천히 깔린다 → 비데가 화들짝(느낌표 + chime). 들어가자마자 곡·카메라가 튀지 않는다
  { parallel: [
    { move: 'player', rel: 'youngcle9_left', at: 'right', by: [96, 0] },
    { move: 'gyeongsub', rel: 'youngcle9_left', at: 'right', by: [56, -8] },
    { move: 'ppaman', rel: 'youngcle9_left', at: 'right', by: [24, 8] },
  ] },
  { wait: 0.3 },
  { parallel: [{ camera: [12, 15], duration: 1.1 }, { zoom: 0.75, duration: 1.1 }] },
  { bgm: 'editor_union_stage', fadeIn: 3.0 },
  { wait: 0.8 },
  { parallel: [{ emote: BIDET, kind: '!', duration: 1.0, hold: 0.2, sfx: 'chime' }, { hop: BIDET, height: 14, duration: 0.3, sfx: false }] },
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
  { end: true },
  { label: 'after' },
  ...subrioAfter(),
];

/**
 * 토관 앞에서 C(토관 소품 script): 연출 뒤에는 ‘들어갈까?’ 선택 → 들어가면 주인공이 입구로 들어가며 몸이 줄어들고 일행이 숨은 뒤
 * 카메라가 거대 스크린으로 잡히며 → 섭리오 오버레이 씬(보스 격파로 끝나면 subrio_cleared). 돌아오면 입구로 나와 등장 곡 복귀. 연출 전에는 토관 설명만.
 */
const FOLLOWERS = ['gyeongsub', 'ppaman'];
export const bidet_pipe_enter = [
  { if: flags => !flags.bidet_arcade_done, goto: 'plain' },
  { if: flags => flags.subrio_cleared, goto: 'cleared' },
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
  // 보스를 이기고 나온 첫 번째면 귀환 연출(결과창 뒤). 그 뒤의 재도전·Esc 는 평범하게 입구로 나온다
  { if: flags => flags.subrio_cleared && !flags.subrio_after_done, goto: 'after' },
  { show: 'player' },
  ...FOLLOWERS.map(id => ({ show: id })),
  { move: 'player', ...MOUTH_OUT, run: true },
  pipeSolid(true),
  { face: 'player', dir: 'left' },
  { regroup: true },
  { parallel: [{ camera: 'player', duration: 0.5 }, { zoom: 1, duration: 0.5 }] },
  // 귀환 연출 뒤의 방은 무음(비데가 끌려간 뒤라 등장 곡을 다시 켜지 않는다 — storyBgm 도 같은 규칙)
  { if: flags => flags.subrio_after_done, goto: 'quiet' },
  { bgm: 'editor_union_stage' },
  { label: 'quiet' },
  { end: true },
  { label: 'after' },
  ...subrioAfter(),
  { end: true },
  { label: 'stay' },
  { text: '* 일단 그만두었다.', voice: 'narrator' },
  { end: true },
  { label: 'cleared' },
  { text: '* 컨트롤러 아래 눕혀진 초록 토관.\n* 스크린 속 승부는 끝났다. 다시 들어갈 이유는 없다.', voice: 'narrator' },
  { end: true },
  { label: 'plain' },
  { text: '* 마리오 게임에 나올 법한 초록 토관이 눕혀져 있다.\n* 왼쪽 입구가 열려 있고 오른쪽은 스크린 안으로 이어진다.', voice: 'narrator' },
];

/** QA `subrio_boss`(Q 메뉴): 비데 방에서 바로 1-4 따듯한비데 보스전. 진입·복귀는 토관 C 와 같고, 이기면 귀환 연출까지 이어진다 */
export const subrio_boss_qa = Object.assign([
  { hide: 'player' },
  ...FOLLOWERS.map(id => ({ hide: id })),
  { bgm: null },
  { parallel: [{ camera: SCREEN, duration: 0.6 }, { zoom: 0.9, duration: 0.6 }] },
  { scene3d: 'subrio', flag: 'subrio_cleared', subrioStage: 4 },
  { if: flags => flags.subrio_cleared && !flags.subrio_after_done, goto: 'after' },
  { show: 'player' },
  ...FOLLOWERS.map(id => ({ show: id })),
  { move: 'player', ...MOUTH_OUT, run: true },
  { face: 'player', dir: 'left' },
  { regroup: true },
  { parallel: [{ camera: 'player', duration: 0.5 }, { zoom: 1, duration: 0.5 }] },
  { end: true },
  { label: 'after' },
  ...subrioAfter(),
], { silent: true });

export const bidet_screen_look = [
  { text: '* 방 오른쪽을 통째로 차지한 거대한 화면.\n* 흰 테두리 안은 아직 새까맣다.', voice: 'narrator' },
];

export const bidet_kiosk_look = [
  { text: '* 조이스틱 하나와 노란 버튼 두 개짜리 컨트롤러다.\n* 아직 아무것도 켜져 있지 않다.', voice: 'narrator' },
];
