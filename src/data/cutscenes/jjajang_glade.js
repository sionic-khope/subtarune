// 빛 드는 공터 — 풀숲의 최미스(BUILD257, 사용자 브리핑 2026-09-20, 원문·구현표 design/narrative/cutscenes/jjajang_glade.md).
//   공터 아래 입구에 닿으면: 오른쪽 풀숲이 흔들림 → 모두 느낌표·오른쪽 → 억빠맨·경섭 한 줄씩 → 한 번 더 흔들림 → 모두 느낌표, 왼쪽 나무 뒤로 달려가 숨음
//   → 카메라가 풀숲으로 → 흔들리다 ???: 우왁!!! → 디스코드 가면을 쓴 최미스가 튀어나와 자빠짐(기본 스프라이트 90° 눕힘), 가면이 벗겨져 옆에 떨어짐 → 아시발.(브금) … 카메라 잠깐 주인공(… 말풍선) → 다시 최미스
//   → 내이름은 최땡땡 → 가재맨방 최고 고닉(띠링 + 윙크) → 갇히게 → 바로 이!(가면 클로즈업) 이 가면을 획득한뒤로 → 여자들이 … → 하긴 멘트치는건(좌우 꿈틀 춤) 내가 좀 .. 감각적이니까
//   → 큼큼.. 콜록 큼!!!(브금 끔·천천히 클로즈업) → 내 추구미는... 쵸쇼우야.....(유튜브 음성) → 스읍 미스(코 비비기 → 손가락 총 2.7초, 유튜브 음성) → 막이래 어헣헣헣. 여기까지(다음 지시 대기).
//   이어서(같은 날 2부): ???: 땡떙씨~? → 최미스 느낌표, 가면을 위로 던져 씀 → 브금 gasuni 로 바뀌며 가순이1(긴머리)·2(단발)·3(땋은머리)이 위에서 내려옴 → 셋의 한 줄씩(3은 동동 뛰며) → 후훗
//   → 가순이들 오른쪽으로 → 최미스 왼쪽 봄·가순이들도 → 오른쪽 봄 → 내 추구미는 쵸소우야.(음성) → 가순이123 꺄아아악… → 카메라 나무 뒤(억빠맨·경섭) → 다시 → 이따 봐요 → 네 땡떙씨!!(달려 올라감)
//   → ㅋㅋㅋ... 후후..(브금 끔, 얼굴에 손, 가면을 땅에) → 휴우우… / 이렇게해서라도 … / 나는 상관없어!!!!(왼쪽 나무로 돌진, 나무가 날아감 — 사용자 2026-09-20, 순간이동 대신) → 눈 마주침 → 어. → 말풍선 넷 → ... 어 하이 → 억빠맨 ... / 스읍 미스
//   → 아 씨발(점프·진동) → 이거 말하면 진짜 뒤진다.(가면 챙겨 위로 도망) → ㅋㅋ / 근데 경섭이형 / 어 왜 / 왜 돈달라고 안해요? / ... / 아 맞네 씨발 야 쫒아가. 끝.
//   대사는 전부 원문. 최미스 자세는 걷기 시트 참조로 gpt-image 생성(assets/source/choimis-poses-v1), 가면은 디스코드 로고(simple-icons) 그대로. 가순이 셋은 사용자 참조 그림(이라스토야풍 소녀)을 글로 옮겨 gpt-image 걷기 시트.
import { loopCharacterMotion } from '../../world/character-motion.js';

const C = text => ({ speaker: '최미스', portrait: 'choimis', voice: 'choimis', text: `* ${text}` });
const Q = text => ({ speaker: '???', voice: 'choimis', text: `* ${text}` });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const S = (n, text) => ({ speaker: n ? `가순이${n}` : '가순이123', portrait: n ? `gasuni${n}` : undefined, voice: 'gasuni', text: `* ${text}` });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const PLAYER = 'player', PARTY = ['player', 'gyeongsub', 'ppaman'];
const CHOIMIS = 'choimis', MASK = 'discord_mask', BUSH = 'glade_bush_2', TREE = 'glade_hide_tree';
const GIRLS = ['gasuni1', 'gasuni2', 'gasuni3'];
const TREE_VIEW = [12, 15];             // 카메라 목표(숨는 나무 칸)
const BUSH_VIEW = [20, 14];             // 카메라 목표: 풀숲과 빛 드는 가운데가 같이 보이는 자리
const CENTER_VIEW = [18, 15];           // 공터 가운데(빛) — 최미스가 여기서 활동한다(사용자 2026-09-20 “가운데에서 활동하게”)

export const RUSTLE = { first: 1.0, second: 1.1, pop: 1.4, amp: 4, sfx: 'break1', volume: 0.5 };   // 풀숲 흔들림(부들부들 좌우 4px) 길이·소리
export const HIDE = { player: [-44, -2], gyeongsub: [-32, 12], ppaman: [-52, -14] };               // 나무 왼쪽(16px 단위): 잎 가장자리에 반쯤 가려 내다본다(-28px 는 잎에 완전히 묻혔다), 셋이 겹치지 않게 어긋나게
export const POP = { by: [-104, 36], height: 52, duration: 0.6 };                                  // 풀숲(22,14)에서 빛 드는 가운데(18~19열)까지 크게 튀어나오는 포물선(px)
export const MASK_OFF = { by: [-34, 34], height: 30, duration: 0.45, spin: 1 };                    // 벗겨진 가면이 최미스 왼쪽 바닥으로(사용자 2026-09-20 “왼쪽에 튀게”, 오른쪽은 풀숲에 가렸다)
export const SWAY = { steps: 6, dx: 6, height: 3, duration: 0.17 };                                 // 좌우로 꿈틀꿈틀 춤추듯
export const CLOSEUP = { mask: 2.2, choimis: 1.35, slow: 2.4 };                                     // 가면 클로즈업 / 큼큼 뒤 천천히 최미스에게
export const GIRL_SPOTS = [[-40, -28], [-56, 0], [-40, 28]];                                       // 가순이 1·2·3 이 최미스 왼쪽 빈터에 반원으로 서는 자리(16px 단위) — 오른쪽은 풀숲이 막는다
export const GIRL_SHIFT = [12, 0];                                                                 // 가순이들 오른쪽(최미스 쪽)으로 이동(16px 단위 = 24px)
export const RUN_UP = [0, -64];                                                                     // 가순이들·최미스가 위로 달려 나가는 거리(16px 단위 = 128px, 공터 위쪽)
export const BOUNCE = { steps: 5, height: 10, duration: 0.22 };                                    // 동동 뛰기
export const MASK_ON = { by: [34, -34], height: 40, duration: 0.4 };                                // 가면을 위로 던져 씀(왼쪽 땅 → 머리)
export const MASK_DROP = { by: [-30, 36], height: 24, duration: 0.4, spin: 1 };                     // 가면을 왼쪽 땅으로 던짐
// 나는 상관없어!!!! 뒤 왼쪽 나무(일행이 숨은)로 돌진해 나무를 날려 버린다(사용자 2026-09-20 “밑으로 순간이동을 바꾸자 … 왼쪽 나무로 돌진해서 나무를 날려버리는거임 그리고나서 눈마주치고 어.”)
export const CHARGE = { stop: [2, 0], vx: -230, vup: 760, spin: 9, duration: 1.3, shake: 0.5, amp: 6, stare: 0.9 };   // stop: 나무 오른쪽에 멈추는 자리(px), 나무는 왼쪽 위로 빙글 날아가 사라짐, stare: 눈 마주치고 어. 까지
const CHARGE_VIEW = [15, 15];           // 돌진 동안 카메라: 나무(13열)와 최미스가 같이 보이는 자리
export const CAM = { toBush: 1.2, snap: 0.3, toTree: 0.8, back: 0.8, settle: 0.6, charge: 0.45 };   // 카메라 이동 시간(초): 풀숲으로 천천히, 휙 돌아올 땐 짧게, charge: 돌진 따라 왼쪽으로

const pose = name => ({ pose: name, action: game => { const e = game.entities.find(x => x.id === CHOIMIS); if (e) loopCharacterMotion(e, game.characterMotions.choimis?.[name]); } });   // pose: 검사용 표식
const standing = { action: game => { const e = game.entities.find(x => x.id === CHOIMIS); if (e) { e.motion = null; e.spin = 0; e.facing = 'down'; } } };
// 넘어짐: 자세 그림을 따로 두지 않고 기본 걷기 스프라이트를 90° 눕힌다(사용자 2026-09-20 “넘어진건 스프라이트 만들지말고 기본 최미스 스프라이트에서 각도만 눕힌걸로”)
// 가면 소품은 hop(keep) 뒤 그림 위치가 flyX/flyY 오프셋에 남는다 → 다음 hop·zoom 이 옛 자리를 기준 삼지 않게 히트박스·그림 좌표에 굳힌다
const settleMask = { action: game => { const m = game.entities.find(x => x.id === MASK); if (!m) return; m.def.ix = (m.def.ix ?? m.x) + (m.flyX || 0); m.def.iy = (m.def.iy ?? m.y) + (m.flyY || 0); m.flyX = 0; m.flyY = 0; m.hopY = 0; m.spin = 0; } };
const lieDown = { lie: true, action: game => { const e = game.entities.find(x => x.id === CHOIMIS); if (e) { e.motion = null; e.facing = 'down'; e.spin = -Math.PI / 2; } } };
const everyone = (node) => ({ parallel: PARTY.map(id => ({ ...node, [Object.keys(node)[0]]: id })) });
const alarm = () => everyone({ emote: '', kind: '!', duration: 1, hold: 0.6, sfx: 'chime' });
const lookRight = () => everyone({ face: '', dir: 'right' });
const sway = Array.from({ length: SWAY.steps }, (_, i) => ({ hop: CHOIMIS, by: [i % 2 ? -SWAY.dx : SWAY.dx, 0], height: SWAY.height, duration: SWAY.duration, sfx: false }));
const bounce = id => Array.from({ length: BOUNCE.steps }, () => ({ hop: id, by: [0, 0], height: BOUNCE.height, duration: BOUNCE.duration, sfx: false }));
const girlsFace = dir => ({ parallel: GIRLS.map(id => ({ face: id, dir })) });

export const jjajang_glade_intro = [
  // 어느정도 올라가면 풀숲이 보일텐데 거기서 풀숲이 흔들려서 모두가 느낌표 하고 오른쪽을 바라봄
  { parallel: [{ tremble: BUSH, duration: RUSTLE.first, amp: RUSTLE.amp }, { sfx: RUSTLE.sfx, volume: RUSTLE.volume }] },
  { wait: RUSTLE.first },
  alarm(),
  lookRight(),
  P('?? 뭐죠'),
  G('흔..들린거같은데'),
  close,
  // (한번 더 흔들리고) 모두가 느낌표 놀라서 왼쪽으로 쭉가서 나무뒤에 숨어서 바라보는 느낌으로
  { parallel: [{ tremble: BUSH, duration: RUSTLE.second, amp: RUSTLE.amp }, { sfx: RUSTLE.sfx, volume: RUSTLE.volume }] },
  { wait: RUSTLE.second * 0.6 },
  alarm(),
  { parallel: PARTY.map(id => ({ move: id, rel: TREE, at: 'left', by: HIDE[id], run: true })) },
  everyone({ face: '', dir: 'right' }),
  { wait: 0.4 },
  // 그리고 다시 풀숲쪽으로 카메라가 이동됨 → (흔들거리다가 최미스가) ???: 우왁!!!
  { camera: BUSH_VIEW, duration: CAM.toBush },
  { parallel: [{ tremble: BUSH, duration: RUSTLE.pop, amp: RUSTLE.amp + 1 }, { sfx: RUSTLE.sfx, volume: RUSTLE.volume }] },
  { wait: RUSTLE.pop * 0.5 },
  Q('우왁!!!'),
  close,
  // 최미스가 풀숲에서 튀어나와 자빠지고 디스코드 가면이 벗겨짐 그리고 최미스가 넘어짐
  { show: CHOIMIS }, pose('masked'),
  { parallel: [{ hop: CHOIMIS, by: POP.by, height: POP.height, duration: POP.duration, sfx: 'jump' }, { camera: CENTER_VIEW, duration: CAM.settle }] },
  { action: game => { const c = game.entities.find(x => x.id === CHOIMIS), m = game.entities.find(x => x.id === MASK); if (c && m) { m.x = c.x - 11; m.y = c.y - 52; m.def.ix = m.x; m.def.iy = m.y; m.visible = true; } } },
  lieDown,
  { parallel: [
    { sfx: 'thud', volume: 0.8 },
    { hop: MASK, by: MASK_OFF.by, height: MASK_OFF.height, duration: MASK_OFF.duration, spin: MASK_OFF.spin, sfx: false, keep: true },
  ] },
  settleMask,
  { wait: 0.5 },
  // 최미스: 아시발. (이때부터 브금)
  { bgm: 'choimis', volume: 0.5, fadeIn: 0.3 },
  C('아시발.'),
  C('후욱 후욱 아 존나 덥다 시발.'),
  close,
  // (주인공쪽으로 카메라 잠깐 이동해서 ... 말풍선 이후에 다시 최미스쪽으로 휙 카메라 이동)
  { camera: 'player' },
  { wait: 0.9 },
  { bubble: PLAYER },
  { camera: CENTER_VIEW, duration: CAM.snap },
  standing,
  C('내이름은 최땡땡'),
  // 가재맨방 최고 고닉 (띠링 소리와 함께 윙크)
  { async: [{ sfx: 'chime' }, { motion: CHOIMIS, name: 'wink' }] },
  C('가재맨방 최고 고닉'),
  C('어쩐 이유에선가 여기에 갇히게 되었는데'),
  C('바로 이!'),
  close,
  // (디스코드 가면 떨어진거 옆에있는쪽으로 카메라 클로즈업)
  { zoom: CLOSEUP.mask, at: MASK, duration: 0.6 },
  C('이 가면을 획득한뒤로'),
  close,
  { zoom: 1, duration: 0.6 },
  C('여자들이 나를 좋아해준단말이지ㅎㅎㅎㅎㅎ'),
  // 하긴 멘트치는건 (이때 좌우로 꿈틀꿈틀 춤추듯) 내가 좀 .. 감각적이니까
  { async: sway },
  C('하긴 멘트치는건 내가 좀 .. 감각적이니까'),
  C('큼큼.. 콜록 큼!!!'),
  // (브금 꺼지고 천천히 최미스에게 살짝 클로즈업)
  { bgm: null, fadeOut: 0.8 },
  { async: [{ zoom: CLOSEUP.choimis, at: CHOIMIS, offset: [0, -14], duration: CLOSEUP.slow }] },
  // 내 추구미는... 쵸쇼우야..... (유튜브 OGMmX4AvedA 19:50 음성)
  { sfx: 'choimis_chosouya' },
  { ...C('내 추구미는... 쵸쇼우야.....'), voice: 'none' },
  // 스읍 미스 (코를 비비고 → 엄지·검지로 앞을 가리키는 2.7초 동작, 유튜브 X3qvIeLPkMI 8~10초 음성)
  { async: [{ sfx: 'choimis_seup_miss' }, { motion: CHOIMIS, name: 'seup' }] },
  { ...C('스읍 미스'), voice: 'none' },
  C('막이래 어헣헣헣'),
  close,
  { zoom: 1, duration: 0.5 },
  // ── 2부: ???: 땡떙씨~? → 최미스 느낌표, 후다닥 디스코드 가면을 위로 던져서 쓴다
  { ...S(0, '땡떙씨~?'), speaker: '???' },
  close,
  { emote: CHOIMIS, kind: '!', duration: 0.8, hold: 0.4, sfx: 'chime' },
  { hop: MASK, by: MASK_ON.by, height: MASK_ON.height, duration: MASK_ON.duration, sfx: 'whoosh', keep: true },
  { hide: MASK },
  pose('masked'),
  // 위에서 캐릭터가 내려옴(가순이1·2·3), 이때 브금이 바뀜
  { bgm: 'gasuni', volume: 0.5, fadeIn: 0.4 },
  ...GIRLS.map(id => ({ show: id })),
  { parallel: GIRLS.map((id, i) => ({ move: id, rel: CHOIMIS, at: 'left', by: GIRL_SPOTS[i], run: true })) },
  girlsFace('right'),
  { face: CHOIMIS, dir: 'left' },
  S(1, '꺅 땡땡오빠 여깄었군요'),
  S(2, '오늘도 멋져요!!'),
  { async: bounce('gasuni3') },
  S(3, '패션 대박대박'),
  C('후훗'),
  close,
  // 가순이 1 2 3 오른쪽으로 이동함 그리고 왼쪽 바라보고 가순이들도 따라서봄 오른쪽봄
  { parallel: GIRLS.map(id => ({ move: id, by: GIRL_SHIFT })) },
  { face: CHOIMIS, dir: 'left' },
  { wait: 0.5 },
  girlsFace('left'),
  { wait: 0.7 },
  girlsFace('right'),
  { wait: 0.3 },
  { sfx: 'choimis_chosouya' },
  { ...C('내 추구미는 쵸소우야.'), voice: 'none' },
  { async: GIRLS.flatMap(id => bounce(id)) },
  S(0, '꺄아아악 꺄아아악 섹시해, 고닉... 하...'),
  close,
  // (카메라가 주인공 나무 뒤쪽으로 이동)
  { camera: TREE_VIEW, duration: CAM.toTree },
  P('형저새끼 씨발 칼로찔러죽일테니까 제발 나가게해주세요'),
  G('참아 빠맨아'),
  close,
  // 다시 카메라 이동
  { camera: CENTER_VIEW, duration: CAM.back },
  C('후후 이따 봐요 아가씨들 먼저 올라가있어.'),
  S(0, '네 땡떙씨!!'),
  close,
  // (세명 다 달려서 올라감)
  { parallel: GIRLS.map(id => ({ move: id, by: RUN_UP, run: true })) },
  ...GIRLS.map(id => ({ remove: id })),
  C('ㅋㅋㅋ... 후후..'),
  close,
  // (브금이 꺼지고 천천히 얼굴에 손을 짚었다가 가면을 땅으로 던짐)
  { bgm: null, fadeOut: 1.0 },
  { wait: 0.6 },
  pose('facepalm'),
  { wait: 1.4 },
  standing,
  { action: game => { const c = game.entities.find(x => x.id === CHOIMIS), m = game.entities.find(x => x.id === MASK); if (c && m) { m.x = c.x - 11; m.y = c.y - 52; m.def.ix = m.x; m.def.iy = m.y; m.visible = true; } } },
  { hop: MASK, by: MASK_DROP.by, height: MASK_DROP.height, duration: MASK_DROP.duration, spin: MASK_DROP.spin, sfx: 'thud', keep: true },
  settleMask,
  C('휴우우우ㅜ우우 후우우우ㅜㅜ 아 다행이다. 시발 아 진짜 ㅈㄴ힘들다.'),
  C('이렇게해서라도 ... 넣... 넣을수만 있다면'),
  // 나는 상관없어!!!! — 하면서 왼쪽 나무(일행이 숨은 나무)로 돌진해 나무를 날려 버린다 → 일행이 드러나 눈이 마주침 → 어.
  C('나는 상관없어!!!!'),
  close,
  { async: [{ camera: CHARGE_VIEW, duration: CAM.charge }] },
  { move: CHOIMIS, rel: TREE, at: 'right', by: CHARGE.stop, dash: true },
  { parallel: [
    { fling: TREE, vx: CHARGE.vx, vup: CHARGE.vup, spin: CHARGE.spin, duration: CHARGE.duration, sfx: 'break1' },
    { sfx: 'boom', volume: 0.7 },
    { shake: CHARGE.shake, amp: CHARGE.amp },
    { hop: CHOIMIS, by: [0, 0], height: 14, duration: 0.3, sfx: false },
  ] },
  { wait: 0.4 },
  // 눈이 마주침: 최미스는 왼쪽(일행), 일행은 오른쪽(최미스)
  { face: CHOIMIS, dir: 'left' },
  everyone({ face: '', dir: 'right' }),
  { wait: CHARGE.stare },
  C('어.'),
  close,
  // (요플래 억빠맨 김경섭 순으로 ... 말풍선 후 최미스 말풍선)
  { bubble: PLAYER }, { bubble: 'ppaman' }, { bubble: 'gyeongsub' }, { bubble: CHOIMIS },
  C('... 어 하이'),
  P('...'),
  P('스읍 미스'),
  close,
  // 최미스: 아 씨발 (점프하면서 화면진동)
  { parallel: [{ hop: CHOIMIS, by: [0, 0], height: 26, duration: 0.4, sfx: 'jump' }, { shake: 0.4, amp: 4 }] },
  C('아 씨발'),
  C('이거 말하면 진짜 뒤진다.'),
  close,
  // (이러고 가면 챙겨서 위로 후딲 도망감) — 나무 앞에서 땅에 던져 둔 가면까지 달려가 챙긴 뒤 위로
  { move: CHOIMIS, rel: MASK, at: 'right', by: [-6, 0], dash: true },
  { hide: MASK },
  { move: CHOIMIS, by: RUN_UP, dash: true },
  { remove: CHOIMIS },
  P('ㅋㅋ'),
  P('근데 경섭이형'),
  G('어 왜'),
  P('왜 돈달라고 안해요?'),
  G('...'),
  G('아 맞네 씨발 야 쫒아가.'),
  close,
  { set: { glade_done: true } },
  { camera: 'player' },
];
