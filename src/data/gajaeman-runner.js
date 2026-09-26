/**
 * BUILD363 노을 땅 가재맨 달리기 결전(사용자 2026-09-26 브리핑) 수치. 화면 좌표(480×360).
 * 흐름: SAVE THE WORLD 버튼 → 흰 화면 속 요플래 그림자 준비 동작 → 달리기(무지개 레터박스, 곡 원곡 1분 3초부터)
 *   → 가재맨 오른쪽에서 천천히 등장·대사 → 오오라 폭발 → 전투: 검 날리기(점프로 피하거나 베어 쳐냄) → “니애미 따라가라” 누워 돌진(C 로 쳐냄) 반복
 *   → 다섯 번 쳐내면 마지막: 엄청난 기운 → 콰앙 뒤로 → 두두두둥 폭죽과 함께 천천히 따라오는 돌진 → 맞붙기 직전 C.
 */
export const GJ_RUNNER = Object.freeze({
  bgm: 'save_the_world_run', hum: 'sunset_hum',
  counters: 5, damage: 20, invulnerability: 0.9,
  // 무대(노을 땅 맵과 같은 비율): 수평선·땅 윗면·앞 테두리, 달리는 발 높이, 요플래 x, 마지막 결전이라 인물은 작게
  stage: { horizonY: 168, groundTop: 190, edgeY: 288, groundY: 252, playerX: 118, scale: 0.72, sunX: 300 },
  player: { halfWidth: 8, height: 32, heartHeight: 26 },
  white: { hold: 0.55, reveal: 0.7 },
  boss: { enterAt: 2.6, enter: 2.6, from: [560, 150], home: [372, 150], scale: 1.36, bob: 5 },
  aura: { gather: 2.2, burst: 0.5 },
  cycle: { first: 1.2, rest: 1.1 },
  sword: { count: 3, every: 0.72, warn: 0.55, speed: 360, aimAhead: 26, aimHeight: 14, halfW: 20, halfH: 7, w: 34, h: 136 },
  dash: { warn: 1.25, speed: 330, height: 20, halfW: 30, halfH: 12, recoil: 0.7, returnSeconds: 1.0, endX: -120 },
  final: { gather: 2.4, back: [520, 206], backSeconds: 0.6, speed: 150, homing: 2.4, pop: 0.22, clashDist: 72, slow: 0.08, clashHold: 1.4 },
  slash: { from: 0.04, until: 0.85 },
  // 마지막 맞받아치기(사용자 참고 델타룬 영상 6:24~6:31): 칼 경합 — C 연타 약 6초면 가득(누를 때 소리 없음, 인물만 흔들림) → 큰 릴리즈샷 → 흰 화면 그림자·거대 검기 슬로우 베기
  lock: { playerX: 196, gap: 44, presses: 40, decay: 0.035, shake: 0.08, pose: 'assets/sprites/hyungsub-clash.png' },
  release: { white: 0.35, slash: 2.6, endPlayerX: 336, bossTo: [190, 104] },
  // 벤 뒤: 가재맨은 하늘에 멈춰 디디디딕, 요플래는 검을 든 채 뒤돌아 땅을 본다 → 대사 → 검은 연기가 모여 쾅 쿠와아앙 → 연기는 하늘로
  after: { lift: 1.1, smoke: 2.6, rise: 3.2 },
  sfx: { draw: 'wing', dash: 'weaponpull', jump: 'jump', slash: 'swing', airslash: 'criticalswing', skid: 'scrape',
    sword: 'spearappear', swordFly: 'heavyswing', deflect: 'deflect', kickVoice: 'gajaeman_kick', dashGo: 'ultraswing',
    counter: 'deltarune_release_shoot', counterHit: 'impact', gather: 'power', charge: 'laser_charge', burst: 'deltarune_release_shoot',
    back: 'baron_slam', pop: 'cannon_puff', popBig: 'drum_burst', clash: 'great_shine', hurt: 'hurt_dr' },
  rainbow: ['#ff5a5a', '#ffae3c', '#ffe45a', '#6ee66e', '#5ac8ff', '#7a7aff', '#d27aff'],
  colors: { aura: '#a851ff', dark: '#1a0830', core: '#ecbeff' },
  text: { controls: 'X 점프  ·  C 베기', title: '가재맨', button: 'SAVE THE WORLD', press: 'C' },
});
