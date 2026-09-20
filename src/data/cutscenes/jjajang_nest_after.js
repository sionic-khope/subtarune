// 드럼통의 악마 보스전 뒤 연출(BUILD254, 사용자 브리핑 2026-09-20 — 원문·구현표 design/narrative/cutscenes/jjajang_nest_after.md).
//   둥지: 악마가 사라진 자리, 요플래 뒤(왼쪽)에 청소부 영웅 모습(멸공의 깃발, 전투 정지 그림 그대로) → 요플래가 뒤를 봄 → 대사(원문) → 요플래 느낌표 → 청소부가 다가와 함께 승천(흰 화면)
//   석상 앞 숲: 위에서 떨어져 내려옴 → 나레이션 → 동상을 보며 대사(원문, “사실 난 (딜레이)”) → 요플래 느낌표·청소부 쪽 → 마지막 부탁 → 휘이잉 사라짐
//   → 요플래 … → 진동 → 엄청대박인배(흰 도트 전함, 좌우 반전 판)가 오른쪽에서 콰앙! 우르르 → 동상 파괴(폭발·잔해) → 요플래 점프·뒷걸음 → 전함이 동상 자리를 뚫고 들어옴
//   → 바다에서 본 짜장면섬 전경(gpt-image, 전함이 섬 가운데 박힘·깊은 숲은 뒤에) 위로 영클 대사(브금 storage_show) → 다리 내림·보라/검은 점 하강 → 점프 소리와 함께 억빠맨·경섭이 양옆에 낙하
//   → 대사 → 영클 TV 가 오른쪽에 내려와 펼쳐짐(용광로 광장과 같은 TV 방송) → 8줄(“아.” 에서 브금 끔, 어둠의짜장면 보라색) → 접혀 올라감 → 재합류(great_shine) → 흰 화면 → 잔해 깔린 맵(statue_destroyed)
//   대사는 전부 브리핑 원문. 나레이션 “...”·“모두들...” 도 원문. 지어낸 줄 없음.
import { FX } from '../fx.js';
import { TvBroadcast } from '../../world/tv-broadcast.js';
import { YOUNGCLE_TV_ARENA } from '../youngcle-tv.js';
import { STATUE_VIEW } from './jjajang_statue.js';

const C = text => ({ speaker: '청소부', portrait: 'janitor', voice: 'janitor', text: `* ${text}` });
const N = text => ({ voice: 'narrator', text: `* ${text}` });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const V = (text, expression = 'smirk') => [
  { action: game => game.tvBroadcast?.setExpression(expression) },
  { speaker: '영클', portrait: `youngcle_tv_${expression}`, voice: 'youngcle', text: `* ${text}` },
];
const close = { action: game => game.textbox.close() };
const PLAYER = 'player', HERO = 'janitor_hero', SHIP = 'youngcle_warship', TV = 'youngcle_tv', ARM = 'youngcle_tv_arm';
const PPAMAN = 'ppaman', GYEONGSUB = 'gyeongsub';
const ISLAND = 'assets/illustrations/jjajang_island_crash.png';

export const HERO_BEHIND = 88;          // 둥지: 청소부가 요플래 뒤(왼쪽)에 서는 거리(px)
export const HERO_BESIDE = 64;          // 석상 앞: 둘이 나란히(청소부는 오른쪽) — 48 이면 깃발이 요플래 뒤에 겹쳤다(스크린샷)
export const STAND_BELOW_STATUE = 12;   // 석상 앞: 착지 자리는 석상 밑변(맵 meta.statue 행) 바로 아래 — 대화창(230px) 위에 둘이 보이도록 공터 첫 행에 선다
export const DROP_HEIGHT = 380;         // 위에서 떨어지는 높이(px)
export const RISE_HEIGHT = 380;         // 함께 승천하는 높이(px)
export const SHIP_HIT_DX = -910;        // 전함: 맵 오른쪽 밖(1920)에서 뱃머리가 석상 오른쪽 가장자리(1010)에 닿기까지
export const SHIP_THROUGH_DX = -320;    // 동상 자리를 뚫고 더 들어오는 거리(거대한 선체가 앞으로 싹 쓸고 들어온다)
export const TV_DROP = 420;             // 영클 TV·모니터암이 내려오는 거리(맵 생성기 tv_y - 420 에서 tv_y 로)
export const PARTY_SIDE = 44;           // 억빠맨(왼쪽)·경섭(오른쪽)이 떨어지는 자리
export const PARTY_DROP = { duration: 1.0, gap: 0.45, after: 0.6 };   // 억빠맨 착지 → gap → 경섭 착지 → after → 대사. 천천히 내려온다(사용자 2026-09-20 “좀 더 천천히”)
export const ISLAND_ZOOM = { from: [400, 135, 520, 390], to: [0, 0, 960, 720], duration: 5.5 };   // 전함 클로즈업 → 섬 전체(“화면 축소”)
export const RAMP = { top: [600, 395], foot: [520, 452], lower: 0.8, walkAt: 0.9, walk: 1.2 };   // 전경 그림 px: 전함 옆구리 → 섬 땅

// 필드의 청소부 영웅은 서 있는 정지 그림(janitor-hero-stand) 그대로 — 깃발 흔드는 대기 시트는 전투 스프라이트라 안 돌린다(사용자 2026-09-20). 웃음(껄껄)만 동작으로, 끝나면 정지 그림으로 돌아온다
const laugh = () => ({ motion: HERO, name: 'laugh', sfx: 'laugh_janitor' });
const heroLaughs = [{ async: [laugh()] }];

/** 전경 그림 위 덧그림: 다리가 내려오고(lower 초) 보라·검은 점이 다리를 따라 내려온다(walkAt 부터 walk 초) — 원문 “(다리를 내림) 보라색하고 검은색점이 내려오는 연출” */
export function rampAndDots() {
  let t0 = null;
  return (ctx, t, rect) => {
    if (t0 === null) t0 = t;
    const k = t - t0, [sx, sy, sw, sh] = rect, X = x => (x - sx) * 480 / sw, Y = y => (y - sy) * 360 / sh;
    const lower = Math.min(1, k / RAMP.lower);
    const end = [RAMP.top[0] + (RAMP.foot[0] - RAMP.top[0]) * lower, RAMP.top[1] + (RAMP.foot[1] - RAMP.top[1]) * lower];
    ctx.save();
    ctx.strokeStyle = '#9aa7b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(RAMP.top[0]), Y(RAMP.top[1])); ctx.lineTo(X(end[0]), Y(end[1])); ctx.stroke();
    for (const [color, delay] of [['#b48cff', 0], ['#1a1a22', 0.28]]) {
      const w = Math.min(1, Math.max(0, (k - RAMP.walkAt - delay) / RAMP.walk));
      if (w <= 0) continue;
      const x = RAMP.top[0] + (RAMP.foot[0] - RAMP.top[0]) * w, y = RAMP.top[1] + (RAMP.foot[1] - RAMP.top[1]) * w;
      ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(X(x)) - 3, Math.round(Y(y)) - 3, 6, 6);
      ctx.fillStyle = color; ctx.fillRect(Math.round(X(x)) - 2, Math.round(Y(y)) - 2, 4, 4);
    }
    ctx.restore();
  };
}

/** 석상 앞 숲 부분(QA jjajang_statue_return 은 여기서 시작: 스폰 after_crash, 배우들은 맵에 숨어 있다) */
export const jjajang_statue_return = [
  { action: game => {
    const p = game.player, hero = game.entities.find(e => e.id === HERO);
    const base = game.map?.def?.meta?.statue; if (base) p.y = base[1] * 32 + STAND_BELOW_STATUE;
    p.facing = 'up'; p.hopY = DROP_HEIGHT;
    if (hero) { hero.x = p.x + HERO_BESIDE; hero.y = p.y; hero.facing = 'up'; }
  } },
  { camera: STATUE_VIEW, duration: 0.05 },
  { fade: 'in', duration: 0.9 },
  { wait: 0.2 },
  // 위에서 아래로 떨어짐
  { drop: [PLAYER, HERO], height: DROP_HEIGHT, duration: 0.6, sfx: 'wing', land: 'thud', quake: 3 },
  { wait: 0.7 },
  N('동상쪽으로 온것같다 뭐지'),
  close,
  // (그리고 다시 둘이 동상을 바라보며 얘기시작)
  { face: PLAYER, dir: 'up' },
  { wait: 0.4 },
  C('뭐 앞으로의 싸움에서'),
  C('꼭 너 혼자만의 힘으로 적을 쓰러트리려고 할 필요 없네'),
  C('때론 누군가에게 도움을 받는것도 상책이니'),
  C('... 사실 난 {w=1.0}기억같은거 잃은적 없다네, 자네'),
  close,
  // 요플래 느낌표하며 청소부쪽을 바라봄
  { emote: PLAYER, kind: '!', duration: 1, hold: 0.5, sfx: 'chime' },
  { face: PLAYER, dir: `toward:${HERO}` },
  { wait: 0.3 },
  C('자식을 구분하지못하는 부모가 어디있겠는가'),
  C('첫눈에 너가 누군지 바로 알아봤다네,'),
  C('꼭 좀 구해줬으면 좋겠네 우리아들을, 젊은이.'),
  close,
  // (이러고 청소부가 휘이잉 하고 사라짐) — 굽이 길 입구와 같은 휘리릭
  { wait: 0.4 },
  { parallel: [{ sfx: 'wing' }, { slide: HERO, by: [-36, -14], duration: 0.14 }] },
  { remove: HERO },
  { wait: 0.9 },
  // 그 뒤에 요플래 ... 말풍선
  { face: PLAYER, dir: 'up' },
  { bubble: PLAYER },
  { wait: 0.5 },
  // 갑자기 화면이 진동함
  { parallel: [{ sfx: 'rumble' }, { shake: 1.4, amp: 3 }] },
  { wait: 0.5 },
  // 엄청대박인배 전함이 오른쪽에서 왼쪽으로 콰앙! 우르르
  { show: SHIP },
  { parallel: [{ slide: SHIP, by: [SHIP_HIT_DX, 0], duration: 0.9, sfx: 'rocket' }, { shake: 0.9, amp: 4 }, { sfx: 'rumble' }] },
  // 동상 파괴!! 요플래는 잠깐 점프
  { parallel: [
    { boom: { ...FX.explosion, at: 'jjajang_statue', scale: 3, offset: [0, -30] } },
    { sfx: 'boom' }, { shake: 0.9, amp: 11 },
    { async: [{ wait: 0.1 }, { remove: 'jjajang_statue' }] },
    { hop: PLAYER, by: [-6, 6], height: 18, duration: 0.35, sfx: false },
  ] },
  // 뒷걸음 천천히 쭈우우욱, 전함은 그 동상 진영 자체를 뚫어버리면서 들어옴
  { parallel: [
    { slide: SHIP, by: [SHIP_THROUGH_DX, 0], duration: 1.8 },
    { sfx: 'rumble' }, { shake: 1.8, amp: 4 },
    { move: PLAYER, by: [-20, 12], speed: 18, facing: 'up' },
  ] },
  { wait: 0.5 },
  // 다시 화면 축소: 바다에서 본 짜장면섬 가운데 전함이 뚫려 박힌 전경, 깊숙한 숲은 뒤에 남아 있다
  { fade: 'out', duration: 0.5 },
  { picture: { src: ISLAND, ...ISLAND_ZOOM } },
  { fade: 'in', duration: 0.6 },
  { wait: 2.4 },
  // 영클: ㅋㅋ (영클 브금 나옴)
  { bgm: 'storage_show', volume: 0.5, fadeIn: 0.4 },
  ...V('ㅋㅋ', 'laugh'),
  ...V('저 동상엔 파괴후 감지장치가아니라', 'smirk'),
  ...V('애초에 카메라를 달아뒀다 게이야', 'taunt'),
  ...V('요플래 너가 이 카메라에 비춰진순간', 'read'),
  ...V('바로 여기로 좌표찍고 존나달려왔음 ㅇㅇ', 'yes'),
  close,
  // (다리를 내림) 보라색하고 검은색점이 내려오는 연출
  { action: game => { if (game.picture) game.picture.extra = rampAndDots(); } },
  { sfx: 'chain_extend' },
  { wait: RAMP.walkAt + RAMP.walk + 0.28 + 0.5 },
  // (점프소리가 나며 요플래옆에 억빠맨과 김경섭이 양옆에서 떨어짐) — 화면 전환
  { fade: 'out', duration: 0.4 },
  { picture: null },
  { action: game => {
    const p = game.player;
    for (const [id, dx, facing] of [[PPAMAN, -PARTY_SIDE, 'right'], [GYEONGSUB, PARTY_SIDE, 'left']]) {
      const e = game.entities.find(x => x.id === id); if (!e) continue;
      e.x = p.x + dx; e.y = p.y; e.facing = facing; e.hopY = DROP_HEIGHT;
    }
  } },
  { fade: 'in', duration: 0.4 },
  // 억빠맨 점프 착지 → 경섭 점프 착지 → 대사(사용자 2026-09-20 “억빠맨 점프착지 그다음에 경섭 점프착지후 대사, 좀 더 천천히 내려오게”)
  { drop: PPAMAN, height: DROP_HEIGHT, duration: PARTY_DROP.duration, sfx: 'jump', land: 'thud', quake: 3 },
  { wait: PARTY_DROP.gap },
  { drop: GYEONGSUB, height: DROP_HEIGHT, duration: PARTY_DROP.duration, sfx: 'jump', land: 'thud', quake: 3 },
  { wait: PARTY_DROP.after },
  { face: PPAMAN, dir: `toward:${PLAYER}` }, { face: GYEONGSUB, dir: `toward:${PLAYER}` },
  P('요플래 괜찮아요?'),
  G('허허 무사해서 다행이네'),
  N('모두들...'),
  ...V('ㅋㅋ', 'laugh'),
  close,
  // (영클 티비가 내려와서 펼쳐짐) 오른쪽 옆에
  { camera: [30, 9], duration: 0.8 },
  { action: game => { game.finishTvBroadcast(); game.tvBroadcast = new TvBroadcast(game, YOUNGCLE_TV_ARENA); } },
  { show: TV }, { show: ARM },
  { parallel: [{ slide: TV, by: [0, TV_DROP], duration: 0.9, sfx: 'chain_extend' }, { slide: ARM, by: [0, TV_DROP], duration: 0.9 }] },
  { fold: TV, to: 1, duration: 0.55, sfx: 'plug' },
  { action: game => game.tvBroadcast.power(true) },
  { wait: YOUNGCLE_TV_ARENA.powerTime },
  ...V('방해해서 미안하노', 'shrug'),
  ...V('뭐 어쨋든 다시 모였으니 다행이네', 'smirk'),
  ...V('지금 쥰희랑 용준이는 그 기괴한 성 침공을 위해 무기개발들에 투입되고있음', 'read'),
  ...V('니도 알겠지만 그 미친 성을 공략하려면 준비가 필요함 ㅇㅇ 그래서 시간좀 걸릴듯', 'taunt'),
  ...V('그래서 말인데, 저 짜장숲 깊이에 살고있는 어떠한 그릇의 재앙급의 인물이 살고있음', 'glare'),
  ...V('기다리는동안 수련겸 토벌하고 오던가 ㅇㅇ', 'smirk'),
  ...V('아.', 'oh'),
  // (브금꺼짐)
  { bgm: null, fadeOut: 0.6 },
  ...V('그래도 그 {c=purple}어둠의짜장면{/c}을 먹게해선 안돼.', 'glare'),
  ...V('뭐 알아서 잘 할거라고 믿음 ㅇㅇ', 'yes'),
  close,
  // 영클 티비가 접히고 올라간다
  { action: game => game.tvBroadcast.power(false) },
  { wait: YOUNGCLE_TV_ARENA.shutdownTime + 0.2 },
  { fold: TV, to: 0.06, duration: 0.45, sfx: 'click' },
  { parallel: [{ slide: TV, by: [0, -TV_DROP], duration: 0.9, sfx: 'chain_extend' }, { slide: ARM, by: [0, -TV_DROP], duration: 0.9 }] },
  { action: game => game.finishTvBroadcast() },
  P('다행이네요 형.'),
  G('우리 파티가 다시 복귀되었군 한번 가볼까?'),
  // 동료 시스템·전투 복귀 — 효과음은 사용자 링크(myinstants deltarune-great-shrine)와 같은 델타룬 snd_great_shine 파일(great_shine)
  { sfx: 'great_shine' },
  N('{c=yellow}억빠맨{/c}과 {c=yellow}경섭{/c}이 다시 동료가 되었다'),
  close,
  // (화면이 하얘졌다가 엄청 대박인배가 사라지고 잔해물들로 길이 깔려 깊은숲 입구가 열려있는 맵으로)
  { fade: 'white', duration: 1.0 },
  { set: { statue_destroyed: true, party_regrouped: true } },
  { join: GYEONGSUB }, { join: PPAMAN },
  { map: 'jjajang_statue', spawn: 'after_crash' },
  { wait: 0.3 },
  { fade: 'in', duration: 1.2 },
];

/** 둥지 부분: drum_devil.js 의 battle 노드(flag drum_devil_won) 바로 뒤에 이어진다. QA jjajang_nest_after 는 승리 플래그를 켠 채 여기서 시작 */
export const jjajang_nest_after = [
  { if: flags => !flags.drum_devil_won, goto: 'nest_after_end' },
  { zoom: 1 },
  { remove: 'drum_devil' },
  // 뒤에 청소부(영웅 모습)가 있음
  { action: game => {
    const p = game.player, hero = game.entities.find(e => e.id === HERO);
    if (hero) { hero.x = p.x - HERO_BEHIND; hero.y = p.y; hero.facing = 'right'; hero.visible = true; }
    p.facing = 'right';
  } },
  { fade: 'in', duration: 0.6 },
  { wait: 0.5 },
  // 요플래가 뒤를 바라봄
  { face: PLAYER, dir: 'left' },
  { wait: 0.6 },
  ...heroLaughs, C('껄껄'),
  C('드디어 쓰러트렸구만'),
  C('고맙네 자네가 아니였으면 기습을 못했을거였고 쓰러트리지도 못했을거라네'),
  N('...'),
  C('할말이 많은 표정이구먼, 뭐 어떤가'),
  C('멸공의 깃발'),
  C('그게 나의 이명이라네,'),
  ...heroLaughs, C('껄껄'),
  C('그리고 좋은일은 연속으로 일어나는 것 아니겠나.'),
  close,
  // 요플래 느낌표
  { emote: PLAYER, kind: '!', duration: 1, hold: 0.7, sfx: 'chime' },
  // 청소부가 요플래에게 다가가 함께 승천 — 화면이 하얘지며 동상 앞으로
  { move: HERO, rel: PLAYER, at: 'left', by: [-6, 0], speed: 40 },
  { wait: 0.4 },
  { parallel: [{ rise: [HERO, PLAYER], height: RISE_HEIGHT, duration: 2.2, sfx: 'wing' }, { fade: 'white', duration: 2.2 }] },
  { wait: 0.3 },
  { map: 'jjajang_statue', spawn: 'after_crash' },
  ...jjajang_statue_return,
  { label: 'nest_after_end' },
];
