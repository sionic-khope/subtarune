// 변신 영클 특별 패턴 4종(BUILD216 사용자 브리핑, 원문 design/narrative/cutscenes/ship_tvform_battle.md “특별 패턴”): 일반(코인) 패턴 → 특별 패턴이 번갈아 온다.
//   공통 도입(사용자 “델타룬 테나 보스전이 좋은 예”): 영클이 가운데로 점프해 앞을 보고 춤추고 → 카메라가 TV 로 확대되며 지지직 → 화면 전체가 게임(파티 HP 띠는 그대로) → 끝나면 지지직 노이즈로 원상복구. 브금은 그대로.
//   1 섭리오(정사각 맵·발판 2단·도트 영클 레이저 → 과부하로 쓰러지면 7초 동안 때리기, 5대마다 1 피해·최대 10)
//   2 리듬(뚜울라 리듬 UI, 지금 흐르는 브금 박자에 맞춰 15초, 틀리면 15 피해, 3회 미만이면 영클이 감동해 울며 10 피해)
//   3 영클의 마녀재판(파크가디언 재판 재구성: 3번 “임금체불은 안했다” → 소레와 오카시요! → 호옥! 망치를 놓쳐 머리에 맞고 10 피해)
//   4 팽이 배틀(영클이 거대한 공, 1.2~2초마다 예고 뒤 돌진·페인트·연속 돌진·벽 리코셰, 맞부딪히면 팅!·1초 비빔, 무방비일 때 10번 맞히면 10 피해)
const YC = (text, expression = 'smirk', extra = {}) => ({ speaker: '영클', portrait: `youngcle_tv_${expression}`, voice: 'youngcle', text: '* ' + text, ...extra });

export const YOUNGCLE_SPECIAL = {
  order: ['subrio', 'rhythm', 'trial', 'ball'],
  hp: 200,                                              // 사용자 “영클 피는 200으로”
  // 공통 도입·복귀
  // 도입(테나 보스전 참고): 가운데로 점프 → 춤추며 한마디(말풍선) → 춤추는 그대로 TV 얼굴로 확대(face = 패턴 자세 기준 TV 화면 가운데, screenR = 화면 반지름) → TV 화면 안에서 지지직 → 가로선에서 펼쳐지며 켜짐(on)
  intro: { jump: 0.55, dance: 2.2, zoom: 1.0, on: 0.45, center: [240, 236], face: [-2, -176], screenR: [36, 28], zoomTo: 8.5 },
  // 마무리: 게임 화면이 가로선으로 접히며 꺼짐(off) → 지지직 걷히며 축소(zoomout) → 제자리로 점프(back)
  outro: { off: 0.35, zoomout: 0.7, back: 0.45 },
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
    heroSpawn: 64, ycStand: 424,
    // 원작 섭리오처럼 셋이 하늘에서 0.55초 간격으로 떨어진다(spacing = 서로 벌어진 거리). 대장이 착지하고 wait 초 뒤 조작이 열린다
    drop: { from: -40, spacing: 44, delay: 0.55, wait: 1.9, sfx: 'item' },
    follow: { reaction: 0.32, base: 0.1, spacing: 34 },
    // 도트 영클: 걸어오지 않고 오른쪽 하늘에서 쿵(사용자 “맵 뚫고 밖에서 나오는 기분”). 착지 뒤 wait 초 있다가 레이저
    ycDrop: { from: -90, gravity: 2000, wait: 0.5, sfx: 'thud', shake: { time: 0.4, amp: 6 } },
    // 그리기 배율 1.9배(내용 높이 약 95px — 원작 1-4 보스 104px 급). muzzleDx = 총구(주먹) x 오프셋, bodyDx/bodyDy = 쓰러진 몸통 반너비·높이(셀 단위, 배율이 곱해진다)
    //   fistX/fistY = 시트 안 주먹 위치(셀 좌표), flashCut = 시트에 그려진 총구 불꽃을 잘라 낼 x(레이저 높이가 매번 달라 손 위치의 불꽃과 어긋나 보였다 — 섬광은 코드로 그린다)
    yc: { scale: 1.9, muzzleDx: 14, bodyDx: 29, bodyDy: 35, fistX: 28, fistY: 31, flashCut: 23 },
    // 레이저(왼쪽으로): 바닥 높이·발판 1단 높이·2단 높이 중 하나. 예고 0.6초 → 0.12초 동안 총구에서 왼쪽 벽까지 뻗고 → 0.5초 유지·페이드. 12초 동안(레이저 단계 기준)
    lasers: { first: 1.0, every: 1.45, warn: 0.6, fire: 0.12, beam: 0.5, thick: 14, until: 12.0, heights: [16, 96, 160], damage: 15 },
    overload: { at: 12.6, sparks: 1.2 },               // 과부하(불꽃·연기) 1.2초 뒤 쓰러짐
    down: { seconds: 7, hitsPerDamage: 5, maxDamage: 10, hitCooldown: 0.12, arrowText: '공격해라!' },
    getup: 1.0,
    laserSfx: { warn: 'laser_charge', fire: 'laser_zap' },
    overloadSfx: 'static_burst', hitSfx: 'hit', downSfx: 'baron_slam', getupSfx: 'power',
    // 쓰러진 동안 동료가 때리는 소리(억빠맨 불·경섭 시계) — 원작 섭리오와 같은 이름
    mateSfx: { fire: 'ember', clock: 'zilean_q_throw' },
  },
  // 2 리듬(BUILD217 사용자 “뚜울라 리듬게임이랑 똑같은 화면”·“지금 전혀 안 맞아, 멜로디에 맞게 떨어지는 거야”): 무대 화면 그대로 띄우고,
  //   지금 흐르는 브금(It's Tv Time!)의 멜로디 차트(assets/rhythm/tvtime.json, chart.py --player melody)에서 현재 시각 + lead 부터 seconds 만큼 잘라 떨군다.
  //   패드 삐용 → 2초 뒤 첫 노트 → 15초 → 2초 멈춤 → 틀린 게 3회 미만이면 “영클이 감동한다!” 문구 뒤 우는 그림(원본의 70% 크기)이 올라와 10 피해
  rhythm: { chart: 'assets/rhythm/tvtime.json', title: "It's Tv Time!", artist: 'Deltarune',
    lead: 2.0, seconds: 15, missDamage: 15, cryUnder: 3, cryDamage: 10, afterHold: 2.0,
    padSfx: 'bell', missSfx: 'damage', emptySfx: 'guitar_scratch',
    movedText: '* 영클이 감동한다!', movedHold: 1.6, sourText: '* 영클은 시큰둥하다.', sourHold: 1.6,
    // 매달린 스크린에 비치는 것(사용자 “뒤에 있는 TV를 영클 TV로 바꾸면 되지 않을까”): 전투 아이들 시트에서 TV 머리만 잘라 화면에 채운다
    face: { src: 'assets/enemies/youngcle-tvform-battle-idle.png', cols: 2, rows: 2, cell: 256, fps: 6.25, crop: [45, 6, 160, 94], glow: 0.08 },
    // 차트를 못 읽었을 때만 쓰는 예비 격자(16박 패턴, 5박마다 하나 쉼)
    chartWait: 3.0, minNotes: 6, bpm: 149.5, offset: 0,
    pattern: ['L', 'R', 'L', 'R', 'L', 'L', 'R', 'R', 'L', 'R', 'R', 'L', 'L', 'R', 'L', 'R'], skipEvery: 5,
    cry: { rise: 0.6, wobble: 1.4, burst: 0.9, scale: 0.7, flash: 0.45, image: 'assets/illustrations/youngcle-cry.png' } },
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
  // 4 팽이 배틀(BUILD218 사용자 '너무 쉽다 · 10대는 때려야 · 경기장을 화면 전체로'): 영클 거대 공(r 40)이 빠르게 따라오다
  //   1.2~2초마다 짧은 예고(0.26초) 뒤 돌진 — 페인트(가짜 짧은 돌진)·연속 돌진·벽 리코셰가 섞인다. 경기장 타원은 y 28~316(파티 HP 띠 322~ 는 비운다).
  //   맞부딪히면 팅!(피해 없음) + 1초 티이잉 비빔, 무방비일 때 맞히면 히트. 10히트 → 10 피해. 50초가 지나면 그냥 끝
  ball: { arena: { cx: 240, cy: 172, rx: 236, ry: 144 }, hits: 10, damage: 10, maxSeconds: 50,
    yc: { r: 40, speed: 118, dashEvery: [1.2, 2.0], dashSpeed: 470, dashTime: 0.46, telegraph: 0.26,
      ricochet: 0.34, comboTele: 0.18, doubleChance: 0.38, feint: { chance: 0.3, time: 0.14, speed: 0.5, tele: 0.16 },
      hitPause: 0.6, rageGap: 0.4, rageSpeed: 0.35,
      image: 'assets/sprites/youngcle_ball.png' },
    ball: { accel: 420, friction: 0.55, maxSpeed: 262, dash: 430, dashTime: 0.28, r: 16 },
    clash: { time: 1.0, push: 60 }, hitKnock: 300, ycHitDamage: 15,
    sfx: { clash: 'orchhit', grind: 'static_loop', hit: 'impact', ycDash: 'heavyswing', done: 'furnace_blast', ric: 'thud', warn: 'laser_charge' } },
};
