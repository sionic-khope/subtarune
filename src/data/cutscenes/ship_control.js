// 엄청대박인배 조종실 입장 연출(youngcle20, BUILD202 사용자 브리핑 원문 design/narrative/cutscenes/ship_control.md, BUILD203 페이싱·대포 정정).
//   입장(느낌표) → 카메라가 천천히 콘솔 한가운데(바닥 로고)로 → 쥰희·용준이 앞을 보고 “어서 나와라 …” → 검게 → 왼쪽 벽 클로즈업(확대) → 밝아지며 대포가 드르르륵 천천히 나온다(카메라도 천천히)
//   → 확대 풀림 → 발사(큰 연기) → 쥰희 몸보다 큰 검은 포탄이 보이게 날아가 쥰희를 오른쪽 벽까지 쭉 → 쾅(진동) “꾸엑” 기절 → 용준 “어?! 형 !!!” → 가운데서 날아온 포탄에 용준도 쥰희 옆에 쓰러짐
//   → 주인공 셋 가운데로 → 영클 “ㅋㅋ”(브금) 천천히 내려와 착지 훙훙훙, 일행 뒷걸음 → 대사 → 영클이 하늘로 쭉 → 일행 중앙 살짝 왼쪽에서 오른쪽을 봄 → 영클이 오른쪽에서 천천히 세 단 내려와 훙훙훙(불·엔진)
//   → 대사 → “나와라”: 버튼 → 철창이 데롱데롱 내려와 착지 → 문 열림 → 오방순(위)·나람(아래, 거대) 천천히 걸어 나옴 → 대사 → “즐” → 전투 시작 연출(전투 자체는 다음 명령).
//   페이싱 원칙(사용자 2026-09-16 “인간이 읽을 때 너무 진행이 빠른 것들 안 된다”): 동작 뒤엔 반드시 숨 고르기(wait ≥0.5), 이동은 느리게, 큰 동작 앞뒤엔 페이드.
import { battleEntry } from './helpers.js';
import { CAPTAIN_AURA_COLORS, CAPTAIN_REVEAL_VEIL } from './captain_reveal.js';
import { FX } from '../fx.js';
import { loopCharacterMotion } from '../../world/character-motion.js';
import { TVFORM_BATTLE as TV } from '../youngcle-tvform-battle.js';

const BATTLE = { enemies: ['obangsun', 'youngcle_hover', 'naram_giant'], bgm: 'youngcle_battle', bg: 'youngcle_bridge' };   // 사용자 지정 브금 XR2QQMfeJbg
const TVFORM = { enemies: ['youngcle_tvform'], bgm: TV.bgm, bg: 'youngcle_bridge', intro: [TV.intro.line] };   // 변신 영클 전투(BUILD214): 사용자 지정 브금 ttz22bFLZqQ, 첫 대사 “편집노조의 힘을 얕보지마라” 뒤 편집노조 흡수 인트로
const YC = 'ship_youngcle', JID = 'ship_junhee', YID = 'ship_yongjun', OB = 'ship_obangsun', NR = 'ship_naram', YC_DOWN = 'ship_youngcle_down', GJ = 'ship_gajaeman';
const CAGE = 'ship_cage', CAGE_OPEN = 'ship_cage_open', CANNON = 'ship_cannon', BALL1 = 'ship_ball1', BALL2 = 'ship_ball2';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
// 자리 상수는 tools/maps/youngcle20.py(JUNHEE·YONGJUN·YC_ENTER·YC_STAND) 와 같은 값 — 맵 JSON 은 비동기 로드라 여기서 직접 둔다(tests/unit/ship-control.test.mjs 가 대조)
const SPOT = { junhee: [486, 278], yongjun: [436, 334], ycEnter: [470, 236], ycStand: [556, 300], cageDrop: 396 };
const M = () => SPOT;
// 보스전 뒤 연출(BUILD211, 사용자 브리핑 design/narrative/cutscenes/ship_aftermath.md) 자리: 일행은 전투 전 자리(로고 왼쪽), 쥰희는 얼굴 박힌 영클 옆, 가재맨은 앞 벽 대형 화면 앞(맵 meta.gajaeman 과 같은 값)
const AFTER = { party: [[400, 292], [348, 268], [348, 324]], junhee: [484, 316], junheeBack: [300, 300], gajaeman: [468, 118] };
const LOGO_CAM = [14.5, 8.9];                              // 바닥 로고(480,300)가 화면 가운데
const CAGE_CAM = [15.5, 8.9];                              // 일행(348~424)과 철창(600~700)이 한 화면에(x256~736) — 철창이 화면 밖에서 내려오면 ‘갑자기 생기는’ 느낌(사용자)
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
const ball = (id, cx, cy) => ({ spawn: { type: 'prop', id, image: 'assets/props/ship_cannonball.png', x: cx - BALL / 2, y: cy - BALL / 2, w: BALL, h: BALL, ix: cx - BALL / 2, iy: cy - BALL / 2, solid: false, sortY: 1000000000 } });   // ix/iy 필수 — 없으면 slide 가 그림을 못 옮긴다(BUILD205 사용자 지적)
const smoke = at => ({ boom: { sheet: 'assets/fx/cannon_smoke.png', at, cols: 6, count: 6, fps: 12, scale: 2.2, sfx: 'cannon_puff' } });
/** 착지 훙 훙 훙: 비행 장치가 제자리에서 세 번 작게 떴다 내려앉는다(사용자 “착지 훙 훙 훙 정도 모션”) */
const settle = id => [
  { parallel: [{ hop: id, by: [0, 0], height: 10, duration: 0.42, sfx: false }, { sfx: 'whoosh', volume: 0.5 }] }, { wait: 0.12 },
  { parallel: [{ hop: id, by: [0, 0], height: 6, duration: 0.36, sfx: false }, { sfx: 'whoosh', volume: 0.4 }] }, { wait: 0.12 },
  { parallel: [{ hop: id, by: [0, 0], height: 3, duration: 0.3, sfx: false }, { sfx: 'whoosh', volume: 0.3 }] },
];
/** 포탄이 보이게 날아가(카메라가 포탄을 따라감) 맞는 순간 사람을 밀고 오른쪽 벽까지 쭉 — 포탄은 벽(x928)에 닿는 자리(864)에서 사람과 같이 부딪히고(진동·충격음), 튕겨 날아가 사라진다(사용자 “벽을 뚫냐”) */
const shoot = (ballId, targetId, ballX0, targetX, toY) => {
  const hitX = targetX - BALL + 8;                       // 포탄이 사람 왼쪽에 닿는 자리(8px 겹침) — 위에 덮이지 않고 옆에서 민다
  return [
  { camera: ballId },
  { slide: ballId, by: [hitX - ballX0, 0], duration: 0.6 },
  { parallel: [{ sfx: 'thud' }, { shake: 0.12, amp: 3 }] },
  { wait: 0.1 },
  { camera: targetId },
  { parallel: [                                          // 둘이 같은 거리만큼 같이 밀려간다: 사람은 벽 앞(900), 포탄은 그 왼쪽(844~908, 벽 928 안)
    { hop: targetId, by: [WALL_X - targetX, toY], height: 4, duration: 0.55, sfx: false },
    { slide: ballId, by: [WALL_X - targetX, toY], duration: 0.55 },
  ] },
  { parallel: [{ shake: 0.5, amp: 8 }, { sfx: 'impact' }, { tremble: targetId, duration: 0.45, amp: 3 },
    { fling: ballId, vx: -320, vup: 460, spin: 5, duration: 0.9, sfx: false }] },                 // 벽에 맞고 튕겨 위로 날아가 사라짐
  { face: targetId, dir: 'down' },
  { wait: 0.4 },
]; };
const partyTo = (spots, opts = {}) => ({ parallel: PARTY.map((id, i) => ({ move: id, px: spots[i], exact: true, ...opts })) });


// ── ⑨ 보스전 뒤 연출(BUILD211) ────────────────────────────────────────────────────────
const SCENE_CAM = [14.5, 8.0];                            // 일행(348~424)·쥰희(484)·얼굴 박힌 영클(530~666)이 한 화면(x240~720), 위로 조금(y92~452) — 변신 영클(229px)의 TV 머리까지 보이게
const GJ_CAM = [14.5, 5.6];                               // 가재맨(가운데 위, y≈90~134)과 일행(y268~340)이 한 화면(y15~375)
const GJV = text => ({ speaker: '가재맨', voice: 'gajaeman_shadow', text: '* ' + text });   // 선장실과 같이 초상화 없음
const ALL = [...PARTY, JID];
const surprise = (ids, jump = false) => ({ parallel: [
  ...ids.map(id => ({ emote: id, kind: '!', duration: 1.1, hold: 0.7 })),
  ...(jump ? ids.map(id => ({ hop: id, height: 13, duration: 0.35, sfx: false })) : []),
] });
/** 전투 뒤 자리: 오방순·나람 없음, 얼굴 박힌 영클 소품, 그 옆에 쥰희(서 있음), 일행은 전투 전 자리, 용준은 벽 앞에 누운 채, 가재맨은 숨긴 채 자리만 */
const placeAftermath = game => {
  const e = id => game.entities.find(x => x.id === id && !x.dead);
  const put = (a, [x, y], dir, extra = {}) => { if (!a) return; a.x = x; a.y = y; a.facing = dir; a.visible = true; a.pose = null; Object.assign(a, extra); };
  put(game.player, AFTER.party[0], 'right'); put(e('gyeongsub'), AFTER.party[1], 'right'); put(e('ppaman'), AFTER.party[2], 'right');
  put(e(JID), AFTER.junhee, 'right'); put(e(YID), [WALL_X, M().yongjun[1] - 4], 'left', { pose: 'lying' });
  for (const id of [YC, OB, NR]) { const a = e(id); if (a) a.visible = false; }
  const down = e(YC_DOWN); if (down) down.visible = true;
  const cage = e(CAGE); if (cage) cage.dead = true; const open = e(CAGE_OPEN); if (open) open.visible = true; const cannon = e(CANNON); if (cannon) cannon.dead = true;
  const gj = e(GJ); if (gj) { gj.x = AFTER.gajaeman[0]; gj.y = AFTER.gajaeman[1]; gj.facing = 'down'; gj.visible = false; }
};
/** 얼굴 박힌 소품 → 힘 받는 영클(포드 없이 바닥에 웅크림) 교체. 연기(cloak)로 가린 채 부른다 */
const riseForm = game => {
  const e = id => game.entities.find(x => x.id === id && !x.dead);
  const down = e(YC_DOWN); if (down) down.visible = false;
  const yc = e(YC); if (!yc) return;
  yc.x = M().ycStand[0]; yc.y = M().ycStand[1]; yc.facing = 'down'; yc.setSprite('youngcle_powerup'); yc.visible = true; yc.jitter = null;
};
/** 힘 받는 단계: [프레임, 초] 목록을 루프 동작으로(떨림 = 두 프레임을 빠르게 번갈아). 0 웅크림 · 1 무릎·주먹 · 2 노려봄 · 3 포효 */
const rise = steps => ({ action: game => {
  const yc = game.entities.find(x => x.id === YC && !x.dead), def = game.characterMotions?.youngcle_powerup?.rise;
  if (!yc || !def) return;
  loopCharacterMotion(yc, { ...def, frames: steps.map(([frame, duration]) => ({ ...def.frames[frame], duration })) });
} });
/** 변신: TV 머리·긴 팔다리 영클(youngcle_tvform, 테나는 질감 참고만) + 테나 전투 대기 같은 팔 원 그리기 루프 */
const tennaForm = game => {
  const yc = game.entities.find(x => x.id === YC && !x.dead); if (!yc) return;
  yc.setSprite('youngcle_tvform'); yc.def.visualScale = 1; yc.facing = 'down'; yc.jitter = null; yc.visible = true;
  const idle = game.characterMotions?.youngcle_tvform?.idle; if (idle) loopCharacterMotion(yc, idle); else yc.motion = null;
};
const AFTERMATH = [
  { action: placeAftermath },   // 재입장·QA(after 라벨)로 들어와도 같은 자리에서 시작한다
  { zoom: 1, duration: 0.01 },
  { darkSmoke: null },
  { camera: SCENE_CAM, duration: 0.01 },
  { action: game => { game.sound.preloadBgm('storage_show'); game.sound.preloadBgm('captain_reveal'); game.sound.preloadBgm('captain_mankatsuki'); } },
  { fade: 'in', duration: 0.8 },
  { wait: 0.9 },
  // (쥰희웃음) — 흰 화면에서 돌아온 뒤 숨 고르고 웃음, 조종실 곡은 그 뒤에 천천히(무음에서 켜는 브금은 1.5초 준비 + 1.2초 페이드인)
  { motion: JID, name: 'laugh', sfx: 'laugh_junhee' },
  { bgm: 'storage_show', fadeIn: 1.2 },
  J('ㅋㅋㅋㅋ어떠냐 븅신새끼ㅋㅋ'),
  J('고작 대포따위로 나의 지방층을 뚫을 수 있을거라고 생각한 너의 지능을 탓해라ㅋㅋ'),
  J('껄껄껄'),
  close,
  { wait: 0.6 },
  P('... 근데 영클형이 우리 적은 아닌거같아요'),
  { face: JID, dir: 'left' },
  J('뭐야?'),
  P('여기서 나갈 수 있는 문? 을 가지고있다고 했어요'),
  close,
  { wait: 0.3 },
  { emote: JID, kind: '!', duration: 1.1, hold: 0.7 },   // 쥰희(느낌표)
  { wait: 0.3 },
  J('그렇군 역시 그 문이 나가는 문이 맞았었군'),
  P('그리고 열쇠도 저희한테 있는거같고 이제 나가면 되는거겠죠?'),
  J('음 그렇지.. 근데 이렇게 쉽다고?'),
  G('근데 그러면... 형섭이는?'),
  J('...'),
  G('요플래에게 모든것을 맡길수는 없어.'),
  P('그래도 형섭이형은 구하고 가야할까요'),
  J('그럼 이렇게하자, 일단 우리들빼고 전부다 돌려보내는거야'),
  J('그 뒤에 김형섭을 구하고 우리까지 나가는거지 어때?'),
  P('네 그게 맞는거같아요.'),
  close,
  { wait: 0.5 },
  { bgm: null, fadeOut: 1.0 },
  { wait: 0.7 },
  V('...안돼', 'glare'),
  close,
  // (쥰희가 화들짝 놀라서 앞으로 점프하고 영클 쪽을 바라봄)
  { parallel: [{ emote: JID, kind: '!', duration: 1.0, hold: 0.1 }, { hop: JID, by: [-28, 14], height: 16, duration: 0.36, sfx: false }] },
  { face: JID, dir: 'right' },
  { wait: 0.6 },
  J('아직살아있었나.'),
  V('아직 끝낼수없다. 악당들에게 문을 넘겨줄순없음', 'glare'),
  P('영클형 뭔가 오해가 있는거같아요 실상은'),
  close,
  // 어둠의 힘(선장실 만카츠키 연출 재사용): 천둥 → ANOTHER HIM → 영클에게서 검은 연기가 번지며 화면이 보라색으로, 연기가 천천히 둘러싼다
  { wait: 0.4 },
  { sfx: 'captain_thunder' },
  { bgm: 'captain_reveal', fadeIn: 1.2 },
  { async: [{ darkSmoke: { mode: 'swell', from: YC_DOWN, duration: 4.8, veil: CAPTAIN_REVEAL_VEIL } }] },
  { wait: 2.2 },
  surprise(ALL, true),   // # 쥰희랑 주인공들 느낌표
  { wait: 0.5 },
  P('어라 이 이건..'),
  G('가재맨이야.'),
  close,
  // 엄청난 소용돌이와 검은 연기 — 연기가 가운데 위로 모이고 카메라가 따라가면 가재맨이 나타난다
  { parallel: [
    { boom: { ...FX.mankatsuki_vortex, at: [AFTER.gajaeman[0] + 12, AFTER.gajaeman[1] + 4], scale: 0.18, endScale: 1.0, grow: 3.2, duration: 4.4, sfx: 'whoosh' } },
    { darkSmoke: { mode: 'gather', from: YC_DOWN, to: GJ, duration: 3.4, veil: CAPTAIN_REVEAL_VEIL } },
    [{ wait: 0.4 }, { camera: GJ_CAM, duration: 2.6 }],
    { async: [{ sfx: 'rumble' }, { shake: 2.6, amp: 2 }, { wait: 0.6 }, { shake: 1.4, amp: 4 }] },
  ] },
  { show: GJ },
  { face: GJ, dir: 'down' },
  { darkSmoke: { mode: 'veil', duration: 0.45, veil: 0.3 } },
  ...ALL.map(id => ({ face: id, dir: 'up' })),   // 모두가 놀라서 위를 바라본다
  { wait: 0.5 },
  P('가 가재맨!!'),
  GJV('ㅋㅋ 용캐도 영클을 이겼구나'),
  GJV('영클에게 그런 초지능을 부여해준것도 나임'),
  GJV('뭐 결과적으론 너희한테 졌지만 그래도 내 가설검증에는 도움이 됐음'),
  J('너의 목적이 뭐야.'),
  GJV('너희 모두를 이렇게 만들거임 ㅇㅇ 그리고 여기서 내 군단을 만들어서'),
  GJV('모든 컴퓨터들을 이어서 해킹하고. 모든 스트리머들 모든 방송세계들을 내가 지배한뒤에'),
  GJV('지구를 파괴시켜버릴거임'),
  P('도대체 왜 그러시는거죠?'),
  GJV('...'),
  GJV('모두가 나를 이렇게 만들었으니까.'),
  P('그게 무슨..'),
  close,
  // 가재맨이 힘을 주고(떨림·연기화) → 마지막 말 → 연기가 되어 영클에게 빨려 들어간다
  { tremble: GJ, duration: 4, amp: 2 },
  { darkSmoke: { mode: 'cloak', from: GJ, duration: 1.4 } },
  GJV('ㅋㅋ알아서 잘 처리해봐라'),
  close,
  { parallel: [
    { darkSmoke: { mode: 'transfer', from: GJ, to: YC_DOWN, duration: 3.8, aura: { at: YC_DOWN, colors: CAPTAIN_AURA_COLORS } } },
    [{ wait: 0.5 }, { hide: GJ }],
    [{ wait: 0.9 }, { camera: SCENE_CAM, duration: 2.2 }],
    { async: [{ sfx: 'whoosh' }, { wait: 1.9 }, { sfx: 'rumble' }] },
  ] },
  // 주인공들이 다시 영클을 바라봄. 쥰희는 놀라서 주인공들 뒤로 빠르게 달려간 뒤 영클을 바라봄
  ...face(PARTY, 'right'),
  { parallel: [{ emote: JID, kind: '!', duration: 1.0, hold: 0.2 }, { hop: JID, height: 10, duration: 0.3, sfx: false }] },
  { move: JID, px: AFTER.junheeBack, exact: true, dash: true },
  { face: JID, dir: 'right' },
  { wait: 0.5 },
  // 영클이 연기 속에서 몸을 일으킨다(힘 받는 자세) — 오라는 이제 영클 몸에
  { darkSmoke: { mode: 'cloak', from: YC_DOWN, duration: 1.0 } },
  { action: riseForm },
  rise([[0, 0.55], [1, 0.55]]),
  { darkSmoke: { mode: 'veil', duration: 0.01, veil: CAPTAIN_REVEAL_VEIL, aura: { at: YC, colors: CAPTAIN_AURA_COLORS } } },
  { wait: 0.6 },
  V('으으으 후후후 후후후후', 'laugh'),
  P('이게 끝이 아니였군요'),
  rise([[1, 0.4], [2, 0.4]]),
  V('느껴진다. 모든이들의 성원, 모든 편집노조 친구들의 힘까지!!!', 'taunt'),
  P('이거 좀 힘든 싸움이 될거같은데요.'),
  close,
  // 변신(마이야르처럼 천천히): 브금 끊김 → 변신음 → 몇 초 동안 힘을 받으며 떨림·진동이 세지고 → 쿠와아앙 → 흰 화면 → TV 머리 영클
  { bgm: null, fadeOut: 0.15 },
  { sfx: 'captain_transform' },
  rise([[2, 0.12], [3, 0.12]]),
  { parallel: [
    { darkSmoke: { mode: 'cloak', from: YC, duration: 4.0, veil: CAPTAIN_REVEAL_VEIL } },
    { async: [{ shake: 1.4, amp: 1.5 }, { wait: 1.4 }, { shake: 1.3, amp: 3 }, { sfx: 'rumble' }, { wait: 1.3 }, { shake: 1.3, amp: 5 }] },
  ] },
  rise([[3, 1]]),
  { parallel: [{ sfx: 'furnace_blast' }, { shake: 0.9, amp: 8 }] },   // 쿠와아앙(snd_punchheavythunder)
  { wait: 0.4 },
  { fade: 'white', duration: 0.5 },
  { action: tennaForm },
  { darkSmoke: { mode: 'veil', duration: 0.01, veil: CAPTAIN_REVEAL_VEIL, aura: { at: YC, colors: CAPTAIN_AURA_COLORS } } },
  { wait: 0.7 },
  { fade: 'in', duration: 1 },
  { wait: 0.6 },
  { bgm: 'captain_mankatsuki', fadeIn: 1.2 },
  V('너희를 족치고 난 집에가겠음', 'taunt'),
  P('느금마'),
  close,
  { wait: 0.5 },
  // (전투 시작 연출!) → 변신 영클 전투(BUILD214: 편집노조 흡수 인트로 → [승부하기][코인벌기]). 승부하기 규칙은 다음 브리핑 — 전투에서 돌아오면 대치 상태
  { set: { ship_aftermath_done: true } },
  ...battleEntry(TVFORM.enemies, TVFORM.bgm),
  { darkSmoke: null },
  { battle: TVFORM },
  { zoom: 1, duration: 0.01 },
  { darkSmoke: { mode: 'veil', duration: 0.01, veil: CAPTAIN_REVEAL_VEIL, aura: { at: YC, colors: CAPTAIN_AURA_COLORS } } },
  { camera: 'player' },
  { bgm: 'captain_mankatsuki', fadeIn: 1.2 },
  { fade: 'in', duration: 0.6 },
];

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
  { async: [smoke(MUZZLE)] }, { async: [{ shake: 0.35, amp: 5 }] }, { sfx: 'cannon_guard_fire' }, { sfx: 'boom', volume: 0.7 },
  ball(BALL1, MUZZLE[0] + 10, MUZZLE[1]),
  { wait: 0.15 },
  ...shoot(BALL1, JID, MUZZLE[0] + 10 - BALL / 2, M().junhee[0], 0),
  J('꾸엑'),
  close,
  { wait: 0.3 },
  { pose: JID, to: 'lying' },
  { wait: 0.9 },
  // ④ 용준: 카메라 가운데로 → “어?! 형 !!!” → 가운데서 날아온 포탄(대포 연출 없이, 발사 소리는 쥰희 때와 같이 — 2026-09-17 사용자 “용준이 대포 쏠 때도 효과음”)에 맞아 쥰희 옆에 쓰러짐
  { camera: LOGO_CAM, duration: 0.9 },
  { wait: 0.4 },
  Y('어?! 형 !!!'),
  close,
  { wait: 0.5 },
  { sfx: 'cannon_guard_fire' }, { sfx: 'boom', volume: 0.7 },
  ball(BALL2, 200, M().yongjun[1] + 8 - 16),
  ...shoot(BALL2, YID, 200 - BALL / 2, M().yongjun[0], -4),
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
  V('그리고 그분이 자기는 김형섭에서 파생된 착한 자아고 나쁜 자아가 열쇠를 갖고있다했음'),
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
  { ...V('이미 너네 전투패턴은 편집노조 애들과의 전투에서 다 배웠다 이거야'), mosaic: { text: '노', block: 2 } },   // ‘노’만 모자이크(악질맨 말풍선과 같은 text-mosaic; 대화창 글꼴엔 block 4 가 너무 강해 2)
  V('그리고 나의 실험체 두명하고 같이 싸울거임 ㅇㅇ'),
  P('???'),
  V('나와라', 'taunt'),
  close,
  { wait: 0.5 },
  // ⑦ 버튼 → 하늘에서 철창이 천천히 데롱데롱 내려와 영클 뒤에 착지 → 문이 열리고 오방순(위)·나람(아래)이 천천히 걸어 나온다
  { sfx: 'click' },
  { camera: CAGE_CAM, duration: 1.0 },
  { wait: 0.3 },
  // 오방순·나람은 철창 안에 탄 채(carry) 함께 내려온다 — 문이 열린 뒤 갑자기 나타나는 게 아니라(사용자)
  { show: OB }, { show: NR }, { show: CAGE },
  // 사슬에 매달려 내려온다: 처음엔 좀 빠르게 흔들리며(데롱데롱), 바닥 가까이선 느려지고, 닿으면 살짝 튀었다 가라앉는다(사용자 “철창 내려오는 것도 부자연스럽다”)
  { action: game => { const c = game.entities.find(x => x.id === CAGE); if (c) c.def.oscillate = { dx: 5, period: 1.9 }; } },
  { slide: CAGE, by: [0, Math.round(M().cageDrop * 0.62)], duration: 1.7, sfx: 'chain_extend' },
  { action: game => { const c = game.entities.find(x => x.id === CAGE); if (c) c.def.oscillate = { dx: 2, period: 1.9 }; } },
  { slide: CAGE, by: [0, M().cageDrop - Math.round(M().cageDrop * 0.62)], duration: 1.9 },
  { action: game => { const c = game.entities.find(x => x.id === CAGE); if (c) delete c.def.oscillate; } },
  { parallel: [{ sfx: 'thud' }, { shake: 0.22, amp: 3 }, { hop: CAGE, by: [0, 0], height: 5, duration: 0.3, sfx: false, keep: true }] },
  { wait: 0.9 },
  { hide: CAGE }, { show: CAGE_OPEN }, { sfx: 'locker' },
  { wait: 0.8 },
  { parallel: [
    [{ move: OB, px: [614, 392], exact: true, speed: 40 }, { move: OB, px: [600, 392], exact: true, speed: 40 }, { move: OB, px: [600, 236], exact: true, speed: 40 }, { move: OB, px: [556, 236], exact: true, speed: 40 }],
    [{ wait: 0.6 }, { move: NR, px: [660, 392], exact: true, speed: 40 }, { move: NR, px: [556, 392], exact: true, speed: 40 }, { move: NR, px: [556, 364], exact: true, speed: 40 }],
  ] },
  ...face([OB, NR, YC], 'left'),
  { wait: 0.8 },
  V('자 방순아 나람아. 갈까'),
  O('흐어어어, 이 이중인격 씨발롬들 흐어어어{n}\\ _ / !!!!'),   // \ _ / 는 잘리지 않게 아랫줄에(사용자)
  NA('아이구 형님들 잘 좀 부탁드리겠습니다 히요오오옹'),
  P('싸울수밖에 없겠네요.'),
  G('영클아 우리가 이기면 우리 얘기를 들어주는거다'),
  V('즐', 'taunt'),
  close,
  { wait: 0.5 },
  // ⑧ 전투(BUILD207): 표준 조우 진입 → 영클(hp 40, 피함) + 오방순·나람(공격 전용). 이기는 기믹은 다음 명령 — 끝나면 대치 상태로
  ...battleEntry(BATTLE.enemies, BATTLE.bgm),
  { battle: BATTLE },
  { set: { ship_intro_done: true } },
  // ⑨ 보스전 뒤 연출(BUILD211 사용자 브리핑): 오방순·나람은 없고, 얼굴 박힌 영클 옆에 쥰희 → 대사 → 영클 “...안돼” → 어둠의 힘(선장실 연출·브금 재사용) → 가재맨 → 영클 변신(TV 머리) → 전투 시작 연출(전투 자체는 다음 명령)
  { label: 'aftermath' },
  ...AFTERMATH,
  { label: 'end' },
  { end: true },
  // 재입장: 전투 전이면 대치 상태 그대로(쥰희·용준은 벽 앞에 쓰러져 있고, 영클·오방순·나람은 로고 오른쪽, 철창은 열린 채)
  //   전투 뒤인데 보스전 뒤 연출을 아직 안 봤으면(이어하기·QA ship_aftermath) 그 연출부터, 다 봤으면 변신 영클과 대치(QA ship_control_after)
  { label: 'after' },
  { action: game => {
    const e = id => game.entities.find(x => x.id === id && !x.dead);
    const put = (id, x, y, dir, extra = {}) => { const a = e(id); if (!a) return; a.x = x; a.y = y; a.facing = dir; a.visible = true; Object.assign(a, extra); };
    put(JID, WALL_X, M().junhee[1], 'left', { pose: 'lying' }); put(YID, WALL_X, M().yongjun[1] - 4, 'left', { pose: 'lying' });
    put(NR, 632, 380, 'left'); const yc = e(YC); if (yc) yc.visible = false; const ob = e(OB); if (ob) ob.visible = false; const down = e(YC_DOWN); if (down) down.visible = true;   // 영클 얼굴 박힘 소품, 오방순 탈주
    const cage = e(CAGE); if (cage) cage.dead = true;
    const open = e(CAGE_OPEN); if (open) open.visible = true;
    const cannon = e(CANNON); if (cannon) cannon.dead = true;
  } },
  { if: flags => !flags.ship_aftermath_done, goto: 'aftermath' },
  { action: game => { placeAftermath(game); const e = id => game.entities.find(x => x.id === id && !x.dead); const j = e(JID); if (j) { j.x = AFTER.junheeBack[0]; j.y = AFTER.junheeBack[1]; j.facing = 'right'; } const down = e(YC_DOWN); if (down) down.visible = false; riseForm(game); tennaForm(game); } },
  { darkSmoke: { mode: 'veil', duration: 0.01, veil: CAPTAIN_REVEAL_VEIL, aura: { at: YC, colors: CAPTAIN_AURA_COLORS } } },
  { bgm: 'captain_mankatsuki' },
], { silent: true });
/** QA `ship_tvform_battle`: 변신 영클 전투 직행(인트로 대사 → 편집노조 흡수 → 승부하기·코인벌기) */
export const ship_tvform_battle_qa = Object.assign([
  { fade: 'out', duration: 0.2 },
  { darkSmoke: null },
  { battle: TVFORM },
  { fade: 'in', duration: 0.4 },
], { silent: true });
/** QA `ship_battle`: 조종실에 서자마자 바로 전투 → 이어서 보스전 뒤 연출(ship_control_intro 의 after 라벨이 이어 돌린다) */
export const ship_battle_qa = Object.assign([
  { fade: 'out', duration: 0.2 },
  { battle: BATTLE },
  { action: placeAftermath },
  { fade: 'in', duration: 0.4 },
  { action: game => { const finishBattle = game.dialogue.onEnd; game.dialogue.onEnd = () => { finishBattle?.(); game.runScript('ship_control_intro'); }; } },
], { silent: true });
