// 변신 영클 특별 패턴 4종(BUILD216 사용자 브리핑, 원문 design/narrative/cutscenes/ship_tvform_battle.md “특별 패턴”): 일반(코인) 패턴 → 특별 패턴이 번갈아 온다.
//   공통 도입(사용자 “델타룬 테나 보스전이 좋은 예”): 영클이 가운데로 점프해 앞을 보고 춤추고 → 카메라가 TV 로 확대되며 지지직 → 화면 전체가 게임(파티 HP 띠는 그대로) → 끝나면 지지직 노이즈로 원상복구. 브금은 그대로.
//   1 섭리오(정사각 맵·발판 2단·도트 영클 레이저 → 과부하로 쓰러지면 7초 동안 때리기, 5대마다 1 피해·최대 10)
//   2 리듬(뚜울라 리듬 UI, 지금 흐르는 브금 박자에 맞춰 15초, 틀리면 15 피해, 3회 미만이면 영클이 감동해 울며 10 피해)
//   3 영클의 마녀재판(파크가디언 재판 재구성: 3번 “임금체불은 안했다” → 소레와 오카시요! → 호옥! 망치를 놓쳐 머리에 맞고 10 피해)
//   4 팽이 배틀(영클이 거대한 공, 2~3초마다 돌진, 맞부딪히면 팅!·1초 비빔, 무방비일 때 5번 맞히면 10 피해)
const YC = (text, expression = 'smirk', extra = {}) => ({ speaker: '영클', portrait: `youngcle_tv_${expression}`, voice: 'youngcle', text: '* ' + text, ...extra });

export const YOUNGCLE_SPECIAL = {
  order: ['subrio', 'rhythm', 'trial', 'ball'],
  hp: 200,                                              // 사용자 “영클 피는 200으로”
  // 공통 도입·복귀
  intro: { jump: 0.55, dance: 1.6, zoom: 0.9, center: [240, 236], zoomTo: 4.5 },   // 가운데로 점프 → 춤 → TV 로 확대(4.5배) → 지지직
  outro: { noise: 1.0 },                                // 지지직 노이즈로 원상복구
  sfx: { noise: 'static_burst', noiseLoop: 'static_loop', dance: 'menumove' },
  // 1 섭리오: 30×22 타일(480×352) 정사각 맵 — 바닥 20행, 가운데 발판 2단(15행 8칸·11행 4칸), 양 벽. 영클 도트는 오른쪽 벽 앞
  subrio: {
    rows: [
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#.............====...........#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#..........========..........#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#============================#',
      '#============================#',
    ],
    heroSpawn: 64, ycEnterFrom: 520, ycStand: 424, walkIn: 2.2,
    // 레이저(왼쪽으로): 바닥 높이·발판 1단 높이·2단 높이 중 하나, 예고 0.6초 뒤 0.5초 동안 굵은 빔. 12초 동안
    lasers: { first: 1.0, every: 1.45, warn: 0.6, beam: 0.5, thick: 14, until: 12.0, heights: [16, 96, 160], damage: 15 },
    overload: { at: 12.6, sparks: 1.2 },               // 과부하(불꽃·연기) 1.2초 뒤 쓰러짐
    down: { seconds: 7, hitsPerDamage: 5, maxDamage: 10, hitCooldown: 0.12, arrowText: '공격해라!' },
    getup: 1.0,
    laserSfx: { warn: 'laser_charge', fire: 'laser_zap' },
    overloadSfx: 'static_burst', hitSfx: 'hit', downSfx: 'baron_slam', getupSfx: 'power',
  },
  // 2 리듬: 지금 흐르는 브금(It's Tv Time!, 약 149.5bpm — 스펙트럼 플럭스 자기상관으로 측정, 첫 박 0초) 진행도에 맞춰 15초. 패드 삐용 → 2초 뒤 첫 노트
  rhythm: { bpm: 149.5, offset: 0, lead: 2.0, seconds: 15, missDamage: 15, cryUnder: 3, cryDamage: 10, padSfx: 'bell', missSfx: 'damage', afterHold: 2.0,
    pattern: ['L', 'R', 'L', 'R', 'L', 'L', 'R', 'R', 'L', 'R', 'R', 'L', 'L', 'R', 'L', 'R'], skipEvery: 5,   // 16박 패턴, 5박마다 하나 쉼
    cry: { rise: 0.6, wobble: 1.4, burst: 0.9, image: 'assets/illustrations/youngcle-cry.png' } },
  // 3 마녀재판: 파크가디언 재판(data/park-witch-trial.js) 규칙·타이밍 그대로, 대사·자산만 영클
  trial: {
    speaker: '영클', portrait: 'youngcle_tv_taunt', voice: 'youngcle',
    opening: '자자 영클의 마녀재판 개정하겠습니다.',
    declaration: '영클의 마녀재판 개정합니다!',
    chargeLines: ['피고인 요플래는 피해자 파크가디언에게 강제청소노동 및', '성심당 셔틀 그리고 임금체불을 한걸로 알고있습니다. 맞습니까?'],
    summary: '죄명: 파크가디언 강제청소노동·성심당 셔틀·임금체불',
    highlight: '파크가디언',
    choices: ['내가 잘못했다', '인면견애미창녀새끼이걸 꼰지르니?', '임금체불은 안했다.'],
    shock: YC('호옥!', 'surprise'),
    gavelDamage: 10,
    assets: { judge: 'assets/enemies/youngcle-judge.png', victim: 'assets/illustrations/park-guardian-cry.png' },
    victimFade: 1.2,                                    // 죄목 대사에 맞춰 파크가디언(울고 있음)이 천천히 페이드인
  },
  // 4 팽이 배틀: 영클 거대 공(r 40), 2~3초마다 돌진. 맞부딪히면 팅!(피해 없음) + 1초 티이잉 비빔, 무방비일 때 맞히면 히트. 5히트 → 10 피해
  ball: { arena: { cx: 240, cy: 192, rx: 180, ry: 118 }, hits: 5, damage: 10, maxSeconds: 40,
    yc: { r: 40, speed: 70, dashEvery: [2, 3], dashSpeed: 330, dashTime: 0.5, telegraph: 0.45, image: 'assets/sprites/youngcle_ball.png' },
    ball: { accel: 320, friction: 0.55, maxSpeed: 230, dash: 360, dashTime: 0.26, r: 16 },
    clash: { time: 1.0, push: 60 }, hitKnock: 300, ycHitDamage: 15,
    sfx: { clash: 'orchhit', grind: 'static_loop', hit: 'impact', ycDash: 'heavyswing', done: 'furnace_blast' } },
};
