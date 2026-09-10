// ─────────────────────────────────────────────────────────────
// 적 레지스트리 — 적 하나 = 항목 하나. 여기만 고치면 새 적이 전투에 나온다 (2026-09-10 전투 브리핑: "여러 적이 생길 때 쉽게 커스텀·추가").
//   name        전투 화면 이름
//   hp          체력 (우리 공격은 무조건 1 데미지 → hp = 맞아야 하는 횟수)
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
};
