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
  // ── 청록숲8 정글 2 (사용자 2026-09-11: HP 9/10/11, 70/80/100원, 패턴 어렵게). 이미지 PR #14(docs/handoffs/krug-scuttle-cannon-sprites.md): 전투는 64×64 셀 2×2 대기 4프레임(180ms), pivot 32,60 / 필드 정면 48×48
  krug: {
    name: '돌거북', hp: 9,
    sheet: { src: 'assets/enemies/jungle-krug-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 180, px: 1 }, pivot: [32, 60], scale: 1.4, damage: 12, money: 70, idle: { swayX: 2, swayY: 3, period: 3.6 },
    patterns: [                                                                    // 돌·등껍질: 느리지만 크고 무겁게 — 낙석(예고) + 자갈 비, 튕기는 바위 5, 위아래 바위 + 조준 등껍질
      { type: 'combo', parts: [{ type: 'slam', duration: 5.0, every: 0.7, warn: 0.4, speed: 340, from: 'top', r: 9, shape: 'rock', kind: 'white' }, { type: 'rain', duration: 5.0, rate: 0.2, speed: 120, r: 5, shape: 'rock', kind: 'white', spin: 3 }] },
      { type: 'combo', parts: [{ type: 'bounce', duration: 5.0, count: 5, speed: 130, r: 9, shape: 'rock', kind: 'white', spin: 2 }, { type: 'sweep', duration: 5.0, rows: 3, gap: 28, speed: 125, r: 5, every: 0.9, shape: 'rock', kind: 'white' }] },
      { type: 'combo', parts: [{ type: 'slam', duration: 4.8, every: 0.55, warn: 0.35, speed: 360, from: 'updown', r: 8, shape: 'rock', kind: 'white' }, { type: 'aimed', duration: 4.8, every: 0.8, speed: 160, r: 9, shape: 'rock', kind: 'white', spin: 5 }] },
    ],
    lines: { appear: '* 돌거북이 나타났다!', idle: ['* 돌거북이 등껍질 속으로 들어갔다.{w=0.3} 나올 생각이 없어 보인다.', '* 돌거북 등에 이끼가 끼어 있다.', '* 요플래가 돌거북을 두드려 봤다.{w=0.3} 돌 소리가 난다.', '* 억빠맨은 거북이가 느린 줄 알았다.'], die: '* 돌거북이 부서졌다.',
      speak: ['...쿵.', '천천히 가자.', '등껍질은 안 판다.', '돌 맞아 봤어?'] },
  },
  scuttle: {
    name: '바위게', hp: 10,
    sheet: { src: 'assets/enemies/jungle-scuttle-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 180, px: 1 }, pivot: [32, 60], scale: 1.4, damage: 13, money: 80, idle: { swayX: 12, swayY: 1, period: 1.4 },
    patterns: [                                                                    // 옆으로 잽싸게: 좌우 집게 돌진(예고 0.3) + 물방울 비, 집게 줄 5(한 줄만 빔) + 조준 방울, 튕기는 집게 6 + 좌우 돌진
      { type: 'combo', parts: [{ type: 'slam', duration: 4.8, every: 0.5, warn: 0.3, speed: 400, from: 'sides', r: 7, shape: 'pincer', kind: 'white' }, { type: 'rain', duration: 4.8, rate: 0.22, speed: 110, r: 6, shape: 'bubble', kind: 'blue' }] },
      { type: 'combo', parts: [{ type: 'sweep', duration: 4.8, rows: 5, gap: 20, speed: 165, r: 5, every: 0.65, shape: 'pincer', kind: 'white' }, { type: 'aimed', duration: 4.8, every: 0.55, speed: 200, r: 6, shape: 'bubble', kind: 'blue' }] },
      { type: 'combo', parts: [{ type: 'bounce', duration: 4.8, count: 6, speed: 160, r: 6, shape: 'pincer', kind: 'white', spin: 8 }, { type: 'slam', duration: 4.8, every: 0.8, warn: 0.35, speed: 380, from: 'sides', r: 7, shape: 'pincer', kind: 'white' }] },
    ],
    lines: { appear: '* 바위게가 나타났다!', idle: ['* 바위게가 옆으로 잽싸게 움직인다.', '* 바위게가 집게를 딱딱거린다.', '* 경섭이 게장이 먹고 싶다고 했다.', '* 요플래는 게가 왜 옆으로만 걷는지 궁금해졌다.'], die: '* 바위게가 뒤집혔다.',
      speak: ['딱딱딱.', '옆으로만 갈 수 있어.', '잡으면 시야 줄게.', '거품 좀 물게.'] },
  },
  cannon: {
    name: '대포미니언', hp: 11,
    sheet: { src: 'assets/enemies/jungle-cannon-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 180, px: 1 }, pivot: [32, 60], scale: 1.4, damage: 14, money: 100, idle: { swayX: 4, swayY: 2, period: 2.6 },
    patterns: [                                                                    // 대포: 큰 포탄(조준·박격·튕김) + 불티(작고 빠름) 동시
      { type: 'combo', parts: [{ type: 'aimed', duration: 5.0, every: 0.5, speed: 210, r: 10, shape: 'cannonball', kind: 'white' }, { type: 'rain', duration: 5.0, rate: 0.16, speed: 150, r: 4, shape: 'circle', kind: 'orange' }] },
      { type: 'combo', parts: [{ type: 'slam', duration: 5.0, every: 0.6, warn: 0.4, speed: 380, from: 'top', r: 10, shape: 'cannonball', kind: 'white' }, { type: 'sweep', duration: 5.0, rows: 4, gap: 24, speed: 140, r: 4, every: 0.8, shape: 'circle', kind: 'orange' }] },
      { type: 'combo', parts: [{ type: 'bounce', duration: 5.0, count: 4, speed: 150, r: 10, shape: 'cannonball', kind: 'white', spin: 3 }, { type: 'slam', duration: 5.0, every: 0.7, warn: 0.35, speed: 400, from: 'sides', r: 6, shape: 'circle', kind: 'orange' }] },
    ],
    lines: { appear: '* 대포미니언이 나타났다!', idle: ['* 대포미니언이 대포를 재장전한다.', '* 대포미니언은 여기가 정글인 줄 모르는 것 같다.', '* 억빠맨이 귀를 막았다.', '* 요플래는 미니언을 마지막으로 잡아 본 게 언제인지 떠올렸다.'], die: '* 대포미니언이 폭발했다.',
      speak: ['장전 완료.', '라인이 어디죠?', '펑.', '포탑 어디 갔어.'] },
  },
};
