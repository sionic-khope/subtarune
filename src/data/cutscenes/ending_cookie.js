// ─────────────────────────────────────────────────────────────
// 엔딩 쿠키(BUILD373, 사용자 2026-09-26, 대사 원문 — 띄어쓰기·멈춤만 조정)
//   엔딩 크레딧 곡이 끝나고 3초 뒤 → 처음 집(방) — 침대 위에서 일어서는 김형섭 → 컴퓨터 C: 코드가 또 없다
//   → 거실 TV 서랍 이벤트 재사용(이번엔 검은 코드, flag cookie_cord) → 컴퓨터 C: 철컥 → 사진 메시지 → 딸깍
//   → 천천히 사진 뷰어(영클 전함 라운지 단체 사진, src/scenes/cookie-photo.js) + Good Night → C·곡 끝 → 메인 메뉴.
// ─────────────────────────────────────────────────────────────
import { CookiePhoto } from '../../scenes/cookie-photo.js';

const HS = (text, extra = {}) => ({ speaker: '형섭', portrait: 'hyungsub', voice: 'hyungsub', text, ...extra });

/** 크레딧 뒤 방으로: 동료 없이 형섭 혼자, 침대 위에서 일어나 세 마디 */
export const ending_cookie_wake = [
  { fade: 'out', duration: 0.01 },
  { set: { ending_cookie: true } },
  { action: game => { game.party = []; game.playerSprite = 'hyungsub'; } },
  { map: 'room', spawn: 'bed', bgm: false },
  // 작별 라운지에서 잠가 둔 카메라·확대를 풀고 형섭을 따라간다(방 구도가 라운지 좌표로 고정되던 버그)
  { zoom: 1, duration: 0.01 },
  { camera: 'player' },
  { action: game => game.camera.snap() },
  { pose: 'player', to: 'lying' },
  { wait: 1.2 },
  { bgm: 'room', volume: 0.3 },
  { fade: 'in', duration: 2.0 },
  { wait: 1.2 },
  // 침대 위에서 일어선다
  { pose: 'player', to: 'stand' },
  { wait: 0.6 },
  HS('* 아'),
  HS('* 뭔가 긴 꿈을 꾼거같은데{w=0.4} 시간 몇시지.'),
  HS('* 아 미친{w=0.3} 빨리 방송 켜야겠다!!'),
  { move: 'player', px: [332, 190] },
  { face: 'player', dir: 'left' },
];

/** 컴퓨터(코드 없음) */
export const cookie_pc_nocord = [
  HS('* ?!{w=0.4} 아 코드 또없네 시바'),
];

/** 거실 TV 서랍: 처음 코드 찾기와 같은 이벤트, 이번엔 평범한 검은 코드 */
export const cookie_tv = [
  { if: f => f.cookie_cord, goto: 'cookie_done' },
  HS('* 빈 코드를 뒤져봐야겠다.'),
  { zoom: 2.8, at: 'tv', offset: [0, -10], duration: 0.9 },
  { scene3d: 'drawer', cord: 'black', flag: 'cookie_cord' },
  { zoom: 1, duration: 0.7 },
  { if: f => !f.cookie_cord, goto: 'cookie_later' },
  { text: '* {c=yellow}검은색 코드{/c}를 획득했다!', voice: 'narrator' },
  HS('* 아 여깄다 코드.{w=0.3} 색깔이..{w=0.5} 음...{w=0.5} 정상적이네 가야겠당'),
  { end: true },
  { label: 'cookie_later' },
  { text: '* (나중에 다시 뒤지자.)', voice: 'narrator' },
  { end: true },
  { label: 'cookie_done' },
  { text: '* 코드는 챙겼다.', voice: 'narrator' },
  { end: true },
];

/** 컴퓨터(코드 꽂음): 철컥 → 사진 메시지 → 딸깍 → 사진 뷰어(끝나면 메인 메뉴) */
export const cookie_photo = [
  { bgm: null, fadeOut: 1.5 },
  { sfx: 'plug' },
  { wait: 1.0 },
  { dialog: { title: '새 메시지', text: '두고 간 사진 보내드립니다.', button: '열기', icon: 'info' } },
  { wait: 0.6 },
  HS('* 응?{w=0.3} 이건 뭐지?'),
  HS('* 두고..{w=0.5} 간 사진..{w=0.5} 보내드립니다..?'),
  { dialog: 'press' }, { sfx: 'click' },
  { wait: 0.4 },
  { dialog: null },
  { action: game => { game.cookiePhoto = new CookiePhoto(game); } },
  // 사진 화면이 C·곡 끝에서 메인 메뉴로 보낸다
  { wait: 3600 },
];
