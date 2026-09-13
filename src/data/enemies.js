// ─────────────────────────────────────────────────────────────
// 적 레지스트리 — 적 하나 = 항목 하나. 여기만 고치면 새 적이 전투에 나온다 (2026-09-10 전투 브리핑: "여러 적이 생길 때 쉽게 커스텀·추가").
//   name        전투 화면 이름
//   hp          체력 (기본 공격 1, 레드·블루 버프 뒤 2 데미지)
//   image / sheet  그림: image = 단일 PNG(전투 전용, pivot = 발 기준 [x,y], 이미 왼쪽을 보는 그림) | sheet = 오버월드 4x4 시트에서 왼쪽 보는 줄(row 2) 두 프레임을 번갈아
//   scale       그리는 배율
//   damage      탄에 맞았을 때 우리 쪽이 잃는 HP
//   patterns    적 턴에 쓰는 탄막 (src/battle/bullets.js PATTERNS 의 키 + 옵션). 여러 개면 턴마다 돌아가며.
//   board       탄막 상자 크기 [w,h] (없으면 기본 200x150)
//   money       잡으면 얻는 돈(원). 없으면 30
//   idle        기본 모션 { swayX, swayY, period } — 좌우로 천천히 흔들리며 살짝 위아래 (없으면 7px / 2px / 2.8초)
//   lines       { appear, idle[], die, speak[] }  speak = 적 턴 말풍선(1인칭, 흰 풍선·작은 글씨, 델타룬 전투 참고) — 탄막 전에 뜨고 준비 시간을 준다.  전투 문구 (나레이션 '* ' 포함, 행동 선택 화면에 idle 중 하나가 [공격하기][아이템] 과 같이 뜬다 — 다른 적을 가리키는 문구 금지(그 적이 죽은 뒤에도 뜸) — 언더테일식 잡담 톤: "억빠맨이 CS 막타를 노리고 있는 듯 하다.. (신경쓸 필욘 없다)"). 맞았을 때 문구는 없음
// ─────────────────────────────────────────────────────────────
export const ENEMIES = {
  expelled_viewer: {
    name: '악질맨', hp: 66, voice: 'expelled_viewer', money: 666, damage: 11,
    sheet: { src: 'assets/sprites/expelled-viewer-dance.png', cols: 2, rows: 4, count: 8, fps: 5, px: 1 },
    pivot: [48, 88], scale: 1.4, dx: 16, dy: 0, board: [216, 156], idle: { swayX: 0, swayY: 0, period: 2 },
    projectiles: {
      chicken: 'assets/battle/expelled-viewer-chicken.png', timeout: 'assets/battle/expelled-viewer-timeout.png',
      rock: 'assets/battle/expelled-viewer-rock.png', shard: 'assets/battle/expelled-viewer-shard.png',
    },
    patterns: [
      { type: 'viewer_eom', duration: 7.5, warn: 0.6, every: 0.95, size: 52, speed: 164 },
      { type: 'viewer_names', duration: 10.7, warn: 0.55, speed: 148, letterTime: 0.14 },
      { type: 'viewer_rock', duration: 6.6, flight: 0.7, fuse: 3 },
      { type: 'viewer_explain', duration: 6.8, warn: 0.4, speed: 108 },
      { type: 'viewer_chicken', duration: 6.8, warn: 0.55, speed: 115 },
      { type: 'viewer_breath', duration: 7.5, warn: 0.55, speed: 132 },
      { type: 'viewer_timeout', duration: 7.8, warn: 0.65, speed: 86, life: 3.4, turn: 2.2 },
    ],
    lines: {
      appear: '* 악질맨이 양팔을 벌렸다.',
      idle: ['* 악질맨이 혼자 춤추고 있다.'],
      speak: ['샬케랑왕코랑쥰희어디감?', '이고역어디감?onep어디감?', '행복맨어디감? 어라 행복맨이 누구지', '노',
        '엄준식엄준식엄준식엄준식', '형섭앜ㅋㅋ나는 니 순살ㅂㅈ가 좋더라 귀두키듴ㅋㅋㅋ', 'ㅍㅇㅋ한테 ㅍㄷ립해명좀해주시죠',
        '이이이이잉 기분좋다', '나는 악질 꿀잼 시청자~', '씹섭아 화장실 언제가ㅋㅋㅋ'],
      die: '* 악질맨의 춤이 멈췄다.',
    },
  },
  // 256px 셀 × 0.9 = 230px. 기본 발(396,176)에 dx/dy를 더해 그림 전체를 (233,8)~(463,238)에 둔다.
  baron: {
    name: '바론', hp: 250, support: 'baron_cannon',
    sheet: { src: 'assets/enemies/baron-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 240, px: 1 },
    pivot: [128, 238], scale: 0.9, dx: -48, dy: 46, damage: 12, money: 300,
    idle: { swayX: 0, swayY: 0, period: 2.4 },
    patterns: [
      { type: 'baron_acid_spit', duration: 6.6, warn: 0.55, poolHold: 1.45, flight: 1.8, streams: 5, weave: 0.09, every: 0.82, volleys: 6 },
      { type: 'baron_tentacle_rake', duration: 6.8, warn: 0.55, hold: 1.65, segments: 17, reach: 1.04, bend: 14, every: 1.48, waves: 4 },
      { type: 'baron_spine_fault', duration: 6.6, warn: 0.55, hold: 1.6, columns: 9, drift: 22, every: 1.4, waves: 4 },
      { type: 'baron_maw_breath', duration: 6.8, warn: 0.6, hold: 2.15, rows: 7, spread: 10, every: 3.15, waves: 2 },
      { type: 'baron_tendril_cage', duration: 6.8, warn: 0.6, hold: 1.45, segments: 30, rotation: 1.35, gapAngle: 0.6, every: 2.15, waves: 3 },
      { type: 'baron_predatory_surge', duration: 6.9, warn: 0.55, hold: 1.65, segments: 15, reach: 1.02, bend: 12, poolHold: 1.1, flight: 1.7, streams: 4, weave: 0.06, columns: 9, drift: 18, rows: 7, spread: 9 },
    ],
    lines: {
      appear: '* 바론이 거대한 몸을 일으킨다!',
      idle: ['* 바론의 입에서 산성 방울이 떨어진다.', '* 바론의 촉수가 바닥을 훑는다.', '* 둥지 바닥이 낮게 울린다.'],
      speak: ['크르르르…', '크아아아!'],
      die: '* 바론이 쓰러졌다.',
    },
  },
  // PR #7 전투 이미지(64×64, 이미 왼쪽을 봄, 발 pivot 32,60) — docs/handoffs/combat-assets.md. 색상별 능력치 차이는 아직 없음(브리핑: CS 각 HP 6)
  cs_red: {
    name: '레드 CS', hp: 6,
    image: 'assets/enemies/cs-red-battle-left.png', pivot: [32, 60], scale: 1.4, damage: 8, money: 30, idle: { swayX: 8, swayY: 2, period: 2.6 },
    patterns: [                                                                    // 레드 = 방패 기사: 방패 벽 → 망치 내리찍기(예고선) → 방패 조준탄
      { type: 'shield_wall', duration: 4.6, rows: 3, speed: 70, every: 1.3, kind: 'red' },
      { type: 'hammer_slam', duration: 4.4, every: 1.1, warn: 0.55, speed: 250, kind: 'red' },
      { type: 'aimed', duration: 4.0, every: 0.6, speed: 115, r: 6, shape: 'shield', kind: 'red', spin: 3 },
    ],
    lines: { appear: '* 레드 CS 가 나타났다!', idle: ['* 억빠맨이 CS 막타를 노리고 있는 듯 하다..{w=0.3} (신경쓸 필욘 없다)', '* 레드 CS 가 방패를 닦고 있다.{w=0.3} 왜인지 뿌듯해 보인다.', '* 레드 CS 가 이쪽을 노려본다.{w=0.3} 눈이 마주쳐서 좀 민망하다.', '* 경섭이 허허 하고 웃었다.{w=0.3} (별 뜻은 없다)'], die: '* 레드 CS 가 쓰러졌다.',
      speak: ['막타는 내 거다.', '방패 좀 닦고 때릴게요.', '어 잠깐 잠깐, 아직 준비 안 됐는데.', '허허 우리도 월급은 받아야지.', '이거 진짜 무거운데요..'] },   // 적 턴 말풍선(1인칭, 델타룬식) — 다른 적 언급 금지
  },
  cs_blue: {
    name: '블루 CS', hp: 6,
    image: 'assets/enemies/cs-blue-battle-left.png', pivot: [32, 60], scale: 1.4, damage: 8, money: 30, idle: { swayX: 8, swayY: 2, period: 3.1 },
    patterns: [                                                                    // 블루 = 망치 기사: 던지는 망치 포물선 → 망치 내리찍기(예고선) → 위에서 쏟아지는 작은 망치
      { type: 'hammer_arc', duration: 4.4, every: 0.7, speed: 150, kind: 'blue' },
      { type: 'hammer_slam', duration: 4.4, every: 1.0, warn: 0.5, speed: 260, kind: 'blue' },
      { type: 'rain', duration: 4.2, rate: 0.3, speed: 110, r: 7, shape: 'hammer', kind: 'blue', spin: 6 },
    ],
    lines: { appear: '* 블루 CS 가 나타났다!', idle: ['* 억빠맨이 CS 막타를 노리고 있는 듯 하다..{w=0.3} (신경쓸 필욘 없다)', '* 블루 CS 가 망치를 만지작거린다.{w=0.3} 어디에 쓰는지는 모른다.', '* 요플래는 아무 생각이 없다.', '* 블루 CS 가 콧노래를 흥얼거린다.{w=0.3} 음정이 하나도 안 맞는다.'], die: '* 블루 CS 가 쓰러졌다.',
      speak: ['이 망치 어디에 쓰는 거지?', '흥얼흥얼~ 음 음~', '블루가 진짜 최고인 거 알지?', '이 게임 브금 좋네요.', '잠깐만요 신발끈 좀..'] },
  },
  // ── 청록숲6 정글 몹 (사용자 브리핑 2026-09-11: 칼날부리·늑대·두꺼비, 40/50/60원). 이미지 = PR #10(docs/handoffs/jungle-enemies-assets.md, 필드 48×48 pivot 24,44 / 전투 64×64 pivot 32,60). 소지품·성격이 탄: 칼날 깃털 / 발톱·도약 / 방울·혀 ──
  razorbeak: {
    name: '칼날부리', hp: 6,
    image: 'assets/enemies/jungle-raptor-battle-left.png', pivot: [32, 60], scale: 1.4, damage: 10, money: 40, idle: { swayX: 6, swayY: 3, period: 2.2 },
    patterns: [                                                                    // 난이도 상향(2026-09-11): 빠르고 촘촘하게 + 두 패턴 동시(combo)
      { type: 'sweep', duration: 4.8, rows: 4, gap: 24, speed: 135, r: 5, every: 0.7, shape: 'feather', kind: 'white' },                       // 깃털 칼날 4줄, 한 줄만 비어 있다
      { type: 'combo', parts: [{ type: 'aimed', duration: 4.6, every: 0.38, speed: 175, r: 5, shape: 'feather', kind: 'white', spin: 7 }, { type: 'rain', duration: 4.6, rate: 0.28, speed: 130, r: 5, shape: 'feather', kind: 'white', spin: 4 }] },   // 조준 깃털 + 깃털 비
      { type: 'combo', parts: [{ type: 'sweep', duration: 4.6, rows: 3, gap: 26, speed: 120, r: 5, every: 0.9, shape: 'feather', kind: 'white' }, { type: 'slam', duration: 4.6, every: 0.9, warn: 0.4, speed: 330, from: 'updown', r: 6, shape: 'feather', kind: 'white' }] },   // 줄 + 위아래 급강하
    ],
    lines: { appear: '* 칼날부리가 나타났다!', idle: ['* 칼날부리가 부리를 갈고 있다.{w=0.3} 소름 돋는 소리다.', '* 칼날부리가 고개를 갸웃한다.', '* 억빠맨은 새를 무서워하는 것 같다.', '* 요플래는 치킨이 먹고 싶어졌다.'], die: '* 칼날부리가 쓰러졌다.',
      speak: ['꾸엑!', '부리 갈아 놨다.', '눈 감아라.', '깃털 값은 따로 받는다.'] },
  },
  wolf: {
    name: '늑대', hp: 7,
    image: 'assets/enemies/jungle-wolf-battle-left.png', pivot: [32, 60], scale: 1.4, damage: 12, money: 50, idle: { swayX: 9, swayY: 1, period: 1.9 },
    patterns: [                                                                    // 난이도 상향: 좌우 번갈아 도약 + 발톱 줄 동시, 튕기는 발톱 4개
      { type: 'combo', parts: [{ type: 'sweep', duration: 4.8, rows: 4, gap: 22, speed: 150, r: 5, every: 0.75, shape: 'claw', kind: 'white' }, { type: 'slam', duration: 4.8, every: 0.8, warn: 0.35, speed: 360, from: 'sides', shape: 'fang', kind: 'white' }] },   // 할큄 줄 + 좌우 도약
      { type: 'combo', parts: [{ type: 'bounce', duration: 4.8, count: 4, speed: 140, r: 6, shape: 'claw', kind: 'white', spin: 6 }, { type: 'aimed', duration: 4.8, every: 0.6, speed: 190, r: 5, shape: 'fang', kind: 'white' }] },   // 튕기는 발톱 + 송곳니 조준
      { type: 'slam', duration: 4.6, every: 0.55, warn: 0.35, speed: 380, from: 'sides', shape: 'fang', kind: 'white' },                                                            // 연속 도약(예고 0.35s)
    ],
    lines: { appear: '* 늑대가 나타났다!', idle: ['* 늑대가 으르렁거린다.', '* 늑대가 꼬리를 흔든다.{w=0.3} 반가운 건 아닌 것 같다.', '* 경섭이 개인 줄 알고 손을 내밀었다.', '* 억빠맨이 늑대를 보며 침을 삼켰다.{w=0.3} 왜?'], die: '* 늑대가 쓰러졌다.',
      speak: ['아우우우—', '간식 시간이다.', '킁킁..{w=0.3} 바나나 냄새?', '도망치면 더 재밌는데.'] },
  },
  toad: {
    name: '두꺼비', hp: 8,
    image: 'assets/enemies/jungle-gromp-battle-left.png', pivot: [32, 60], scale: 1.4, damage: 14, money: 60, idle: { swayX: 3, swayY: 4, period: 3.4 },
    patterns: [                                                                    // 난이도 상향: 방울 5개 + 혀 동시, 방울 비 촘촘
      { type: 'combo', parts: [{ type: 'bounce', duration: 5.0, count: 5, speed: 125, r: 8, shape: 'bubble', kind: 'blue' }, { type: 'slam', duration: 5.0, every: 1.0, warn: 0.45, speed: 300, from: 'bottom', shape: 'tongue', kind: 'red' }] },   // 튕기는 방울 5 + 아래서 혀
      { type: 'combo', parts: [{ type: 'rain', duration: 4.8, rate: 0.13, speed: 115, r: 7, shape: 'bubble', kind: 'blue' }, { type: 'aimed', duration: 4.8, every: 0.7, speed: 150, r: 8, shape: 'bubble', kind: 'blue' }] },   // 방울 비 + 조준 방울
      { type: 'slam', duration: 4.6, every: 0.6, warn: 0.4, speed: 320, from: 'updown', r: 7, shape: 'tongue', kind: 'red' },                                                       // 위아래 번갈아 혀
    ],
    lines: { appear: '* 두꺼비가 나타났다!', idle: ['* 두꺼비가 숨을 크게 들이쉰다.', '* 두꺼비 등에 사마귀가 많다.{w=0.3} 세다가 포기했다.', '* 요플래는 두꺼비를 만지고 싶어졌다.', '* 경섭이 허허 하고 웃었다.{w=0.3} (별 뜻은 없다)'], die: '* 두꺼비가 쓰러졌다.',
      speak: ['개굴.', '.........', '침 좀 튀길게.', '나 원래 안 움직여.'] },
  },
  // ── 청록숲8 정글 2 (사용자 2026-09-11: HP 9/10/11, 70/80/100원, 패턴 어렵게). 이미지 PR #14(docs/handoffs/krug-scuttle-cannon-sprites.md): 전투는 64×64 셀 2×2 대기 4프레임(180ms), pivot 32,60 / 필드 정면 48×48
  krug: {
    name: '돌거북', hp: 9,
    sheet: { src: 'assets/enemies/jungle-krug-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 180, px: 1 }, pivot: [32, 60], scale: 1.4, damage: 12, money: 70, idle: { swayX: 0, swayY: 0, period: 3.6 },
    patterns: [                                                                    // 돌·등껍질: 영역 예고(내리찍기) / 거대 바위 / 튕기는 바위 / 위아래 바위 + 조준 — 시트에 대기 모션이 있어 흔들림(sway)은 0 (사용자 2026-09-11)
      { type: 'zone', cols: 3, rows: 2, count: 3, warn: 0.9, hit: 0.3, every: 1.5, duration: 5.0 },                                                                                        // 바닥 내리찍기: 빨간 칸 예고 → 그 자리에 돌 폭발. 빈 칸으로
      { type: 'giant', from: 'sides', r: 34, speed: 150, warn: 0.8, every: 2.1, shape: 'rock', kind: 'white', spin: 3, duration: 5.0 },                                                       // 거대 바위가 옆에서 굴러온다(띠 예고). 띠 밖으로
      { type: 'combo', parts: [{ type: 'bounce', duration: 5.0, count: 5, speed: 130, r: 9, shape: 'rock', kind: 'white', spin: 2 }, { type: 'sweep', duration: 5.0, rows: 3, gap: 28, speed: 125, r: 5, every: 0.9, shape: 'rock', kind: 'white' }] },   // 튕기는 큰 바위 5 + 자갈 줄
      { type: 'combo', parts: [{ type: 'slam', duration: 4.8, every: 0.55, warn: 0.35, speed: 360, from: 'updown', r: 8, shape: 'rock', kind: 'white' }, { type: 'aimed', duration: 4.8, every: 0.8, speed: 160, r: 9, shape: 'rock', kind: 'white', spin: 5 }] },   // 위아래 바위 + 조준 등껍질
    ],
    lines: { appear: '* 돌거북이 나타났다!', idle: ['* 돌거북이 등껍질 속으로 들어갔다.{w=0.3} 나올 생각이 없어 보인다.', '* 돌거북 등에 이끼가 끼어 있다.', '* 요플래가 돌거북을 두드려 봤다.{w=0.3} 돌 소리가 난다.', '* 억빠맨은 거북이가 느린 줄 알았다.'], die: '* 돌거북이 부서졌다.',
      speak: ['...쿵.', '천천히 가자.', '등껍질은 안 판다.', '돌 맞아 봤어?'] },
  },
  scuttle: {
    name: '바위게', hp: 10,
    sheet: { src: 'assets/enemies/jungle-scuttle-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 180, px: 1 }, pivot: [32, 60], scale: 1.4, damage: 13, money: 80, idle: { swayX: 0, swayY: 0, period: 1.4 },
    patterns: [                                                                    // 옆으로 잽싸게: 빔(집게 궤적) / 따라오는 물방울 / 좌우 집게 돌진 + 물방울 비 / 집게 줄 5 + 조준 방울 — sway 0(시트 대기 모션)
      { type: 'beam', dir: 'h', count: 2, thick: 26, warn: 0.7, hit: 0.25, every: 1.3, duration: 4.8 },                                                                                      // 옆으로 긋는 집게 궤적: 가는 선 예고 → 굵은 빔. 빔 사이로
      { type: 'homing', count: 2, speed: 95, turn: 2.4, life: 2.6, every: 1.6, r: 6, shape: 'bubble', kind: 'blue', duration: 4.8 },                                                          // 따라오는 물방울 — 계속 움직여 따돌린다
      { type: 'combo', parts: [{ type: 'slam', duration: 4.8, every: 0.5, warn: 0.3, speed: 400, from: 'sides', r: 7, shape: 'pincer', kind: 'white' }, { type: 'rain', duration: 4.8, rate: 0.22, speed: 110, r: 6, shape: 'bubble', kind: 'blue' }] },   // 좌우 집게 돌진(예고 0.3) + 물방울 비
      { type: 'combo', parts: [{ type: 'sweep', duration: 4.8, rows: 5, gap: 20, speed: 165, r: 5, every: 0.65, shape: 'pincer', kind: 'white' }, { type: 'aimed', duration: 4.8, every: 0.55, speed: 200, r: 6, shape: 'bubble', kind: 'blue' }] },   // 집게 줄 5(한 줄만 빔) + 조준 방울
    ],
    lines: { appear: '* 바위게가 나타났다!', idle: ['* 바위게가 옆으로 잽싸게 움직인다.', '* 바위게가 집게를 딱딱거린다.', '* 경섭이 게장이 먹고 싶다고 했다.', '* 요플래는 게가 왜 옆으로만 걷는지 궁금해졌다.'], die: '* 바위게가 뒤집혔다.',
      speak: ['딱딱딱.', '옆으로만 갈 수 있어.', '잡으면 시야 줄게.', '거품 좀 물게.'] },
  },
  cannon: {
    name: '대포미니언', hp: 11,
    sheet: { src: 'assets/enemies/jungle-cannon-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 180, px: 1 }, pivot: [32, 60], scale: 1.4, damage: 14, money: 100, idle: { swayX: 0, swayY: 0, period: 2.6 },
    patterns: [                                                                    // 대포: 포탄 낙하(파편) / 광역 포격(한 칸만 안전) / 산탄 / 조준 포탄 + 불티 — sway 0(시트 대기 모션)
      { type: 'bomb', every: 1.3, warn: 0.7, frags: 8, fragSpeed: 130, r: 9, shape: 'cannonball', fragKind: 'orange', duration: 5.0 },                                                       // 포탄 낙하(고리 예고) → 파편 8. 고리에서 멀리
      { type: 'zone', cols: 3, rows: 2, safe: 1, warn: 1.0, hit: 0.35, every: 1.9, duration: 5.2 },                                                                                         // 광역 포격: 한 칸만 안전. 그 칸으로
      { type: 'burst', at: 'top', n: 14, speed: 120, every: 0.9, r: 5, shape: 'cannonball', kind: 'white', duration: 4.6 },                                                                // 산탄(작은 포탄 14발 방사형) — 틈으로
      { type: 'combo', parts: [{ type: 'aimed', duration: 5.0, every: 0.5, speed: 210, r: 10, shape: 'cannonball', kind: 'white' }, { type: 'rain', duration: 5.0, rate: 0.16, speed: 150, r: 4, shape: 'circle', kind: 'orange' }] },   // 조준 포탄 + 불티 비
    ],
    lines: { appear: '* 대포미니언이 나타났다!', idle: ['* 대포미니언이 대포를 재장전한다.', '* 대포미니언은 여기가 정글인 줄 모르는 것 같다.', '* 억빠맨이 귀를 막았다.', '* 요플래는 미니언을 마지막으로 잡아 본 게 언제인지 떠올렸다.'], die: '* 대포미니언이 폭발했다.',
      speak: ['장전 완료.', '라인이 어디죠?', '펑.', '포탑 어디 갔어.'] },
  },
  // ── 청록숲9 사원 문지기 보스 레드·블루 (사용자 2026-09-11: HP 22 씩, 꽤 어렵게, 대사 다채롭게). 둘이 한 전투 — 턴마다 각자 패턴이 동시에 온다.
  //    이미지 PR #16(docs/handoffs/red-blue-buff-sprites.md): 전투 대기 192×192 시트(96×96 셀 2×2, 220ms, 발 pivot 48,89) / 필드 정면 64×64(pivot 32,60). 롤 레드 브램블백·블루 센티넬 모티브
  //    크기 규칙(2026-09-11 포스트모텀): 전투 그림은 화면 480×360 안, 패널 윗선(y 246) 위에 **전부** 들어와야 한다 — 둘이면 각 ≤ 144px(1.5배), 발 144/246 에 가로 40px 엇갈림. tests/playtest/enemy.mjs 가 잰다
  red: {
    name: '레드', hp: 22, voice: 'red',
    sheet: { src: 'assets/enemies/red-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 220, px: 1 }, pivot: [48, 89], scale: 1.5, dx: 10, dy: 24, damage: 13, money: 150, idle: { swayX: 0, swayY: 0, period: 2.4 },
    patterns: [                                                                    // 방패 기사 = 신성한 영역: 한 칸만 안전 / 십자 성광 / 방패 벽 + 조준 방패 / 거대 방패 + 붉은 비
      { type: 'zone', cols: 3, rows: 2, safe: 1, warn: 1.0, hit: 0.35, every: 1.9, duration: 5.2 },                                                                                         // (2026-09-11 약 10% 완화: 예고 +0.1, 간격·속도 10%)
      { type: 'beam', dir: 'both', count: 1, thick: 26, warn: 0.85, hit: 0.3, every: 1.65, duration: 5.0 },
      { type: 'combo', parts: [{ type: 'shield_wall', duration: 5.0, rows: 4, speed: 86, every: 1.2, kind: 'red' }, { type: 'aimed', duration: 5.0, every: 0.8, speed: 153, r: 7, shape: 'shield', kind: 'red' }] },
      { type: 'combo', parts: [{ type: 'giant', duration: 5.0, from: 'sides', r: 30, speed: 145, warn: 0.9, every: 2.2, kind: 'red' }, { type: 'rain', duration: 5.0, rate: 0.34, speed: 100, r: 4, kind: 'red' }] },
    ],
    lines: { appear: '* 레드가 시험을 시작한다!',
      idle: ['* 레드가 방패를 고쳐 잡는다.', '* 레드의 눈이 붉게 깜빡인다.{w=0.3} 사이렌 소리가 아직 귀에 남아 있다.', '* 억빠맨은 레드가 말을 한다는 게 아직도 안 믿긴다.', '* 요플래는 오브젝트가 대체 뭔지 궁금해졌다.', '* 경섭이 허허 하고 웃었다.{w=0.3} 긴장한 것 같다.', '* 레드가 "침입자" 라고 작게 중얼거린다.'],
      die: '* 레드가 무릎을 꿇었다.{w=0.3} 시험 종료.',
      speak: ['시험 시작.', '침입자 확인.', '신성한 영역이다.', '통과 불가.', '제거하라.', '방패는 뚫리지 않는다.', '경고는 끝났다.', '오브젝트를 지켜라.', '판정. 판정. 판정.', '물러나라.'] },
  },
  blue: {
    name: '블루', hp: 22, voice: 'blue',
    sheet: { src: 'assets/enemies/blue-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 220, px: 1 }, pivot: [48, 89], scale: 1.5, dx: -30, dy: 10, damage: 13, money: 150, idle: { swayX: 0, swayY: 0, period: 3.0 },
    patterns: [                                                                    // 망치 기사: 망치 낙하(파편) / 위아래 망치 + 방사형 망치 / 포물선 망치 + 따라오는 망치 / 내리찍기 자리 4곳
      { type: 'bomb', every: 1.35, warn: 0.8, frags: 8, fragSpeed: 126, r: 8, shape: 'hammer', fragKind: 'blue', duration: 5.0 },                                                        // (2026-09-11 약 10% 완화)
      { type: 'combo', parts: [{ type: 'slam', duration: 5.0, every: 0.56, warn: 0.4, speed: 345, from: 'updown', shape: 'hammer', rot: Math.PI }, { type: 'burst', duration: 5.0, at: 'random', n: 8, speed: 108, every: 1.2, r: 6, shape: 'hammer', kind: 'blue', spin: 8 }] },
      { type: 'combo', parts: [{ type: 'hammer_arc', duration: 5.0, every: 0.62, speed: 150 }, { type: 'homing', duration: 5.0, count: 1, speed: 90, turn: 2.4, life: 2.4, every: 1.65, r: 6, shape: 'hammer', kind: 'blue', spin: 6 }] },
      { type: 'zone', cols: 4, rows: 2, count: 3, warn: 0.9, hit: 0.3, every: 1.45, duration: 5.0 },
    ],
    lines: { appear: '* 블루도.',
      idle: ['* 블루가 망치를 어깨에 걸쳤다.', '* 블루는 말을 아낀다.{w=0.3} 아니면 못 하는 걸지도.', '* 억빠맨은 블루가 따라 하는 게 웃긴 모양이다.', '* 요플래는 블루의 망치가 몇 kg 인지 궁금해졌다.', '* 블루가 "...하라." 하고 혼자 중얼거렸다.', '* 블루의 눈이 파랗게 깜빡인다.'],
      die: '* 블루가 쓰러졌다.{w=0.3} ...졌다.',
      speak: ['...없다.', '하라.', '영역.', '시험.', '쿵.', '망치 간다.', '한다.', '제거.', '...따라 하는 거 아니다.', '침입자.'] },
  },
};
