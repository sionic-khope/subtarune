// 섭리오(스크린 속 2D 플랫포머)의 순수 규칙: 레벨·충돌·이동·점프·앉기·창(탭/차징)·불·시계·적·보스·따라오기. DOM/캔버스 없음 → tests/unit/subrio.test.mjs 가 직접 검사한다.
// 조작(2026-09-15 사용자 브리핑): 좌우 이동, 위 점프, 아래 앉기, C 창(탭 = 짧은 창, 꾹 누르면 차징 → 놓으면 강한 창), X 방패.
// 구성(2026-09-15 사용자 확정): 월드 1 — 1-0 튜토리얼 → 1-1 트위치(보라)·1-2 치지직(청록)·1-3 숲(파랑), 각 3분 분량에 방송 플랫폼 섬의 롤 몬스터들
// (CS·칼날부리·늑대·두꺼비·크루그·바위게·대포 미니언, 1-3 끝엔 레드·블루) → 1-4 따듯한비데 보스전. 깃발은 몬스터를 다 잡은 뒤 C 로 클리어.
// 체력(2026-09-15 사용자 재지시): 맞으면 RPG 체력(game.partyHp)이 깎인다. 0이 되면 게임오버 없이 쓰러졌다가 마지막 자리에서 체력 가득 재낙하. 이 게임 전용 공격력 = 1(창·불·시계·밟기 모두 1). 보스는 12.
export const TILE = 16;
export const VIEW_W = 460;
export const VIEW_H = 340;
export const MOVE_SPEED = 136;
export const JUMP_SPEED = 500;
export const GRAVITY = 1500;
export const MAX_FALL = 560;
export const ATTACK_TIME = 0.28;
export const STAND_H = 32;
export const CROUCH_H = 20;
export const BODY_W = 16;
export const HURT_TIME = 0.35;
export const INVULN_TIME = 1.0;
export const KNOCK_VX = 190;
export const KNOCK_VY = 240;
export const ATTACK_POWER = 1;
// 주인공이 받는 피해(RPG 체력 기준, 최대 150~180): 몬스터 접촉·보스 도끼·보스 몸·물줄기
export const DAMAGE = { touch: 6, bossSwing: 12, bossTouch: 8, water: 6 };
export const SLOW_MOVE = 0.5;
export const SLOW_JUMP = 0.85;
// 판테온 창: 탭이면 짧은 창, chargeMin 이상 누르면 차징(이동 절반) → 놓으면 빠르고 오래 가는 강창
export const SPEAR = { speed: 380, life: 1.1, chargedSpeed: 600, chargedLife: 2.4, chargeMin: 0.28, chargeMax: 1.0, cooldown: 0.42, w: 24, h: 6 };
export const SPEAR_SPEED = SPEAR.speed;
export const SPEAR_LIFE = SPEAR.life;
// 브랜드 불: 적이 앞뒤 range 안·비슷한 높이면 자동, 6초에 한 번. 게이지는 머리 위에서 천천히 찬다(씬)
export const FIRE = { range: 230, dy: 64, cooldown: 6, speed: 260, life: 1.3, w: 12, h: 12 };
// 질리언 시계: 적이 보이면 두 개를 pair 간격으로 포물선으로, 1.2초마다. 같은 적에 둘 다 맞으면(stunWindow 안) 2초 스턴
export const CLOCK = { range: 220, dy: 96, cooldown: 1.2, pair: 0.2, gravity: 720, w: 12, h: 12, stunWindow: 1.6, stun: 2.0, flightMin: 0.45, flightMax: 0.85, burst: 22 };
// 몬스터 공통: 좌우로 걷다 벽·낭떠러지에서 돈다. 밟기·창·불·시계 모두 1씩(시계 둘 = 스턴이 죽음보다 먼저 오게 HP 는 3 이상). 몸에 닿으면 주인공이 튕긴다
export const ENEMY = { w: 16, h: 24, speed: 40, hp: 3, stompBounce: 300, deathTime: 1.1, hitFlash: 0.2, burn: 2.0, throwGravity: 520 };
// 종류별 수치·시트(2×2: 걷기 A·B, 스턴, 쓰러짐). hop: 주기적으로 작게 뛴다(칼날부리). static: 움직이지 않는 표적(토템)
export const MONSTERS = {
  cs_red: { name: '레드 CS', w: 16, h: 24, speed: 40, hp: 3, sheet: 'assets/sprites/subrio_cs_red.png', cell: 48, feet: 44 },
  cs_blue: { name: '블루 CS', w: 16, h: 24, speed: 40, hp: 3, sheet: 'assets/sprites/subrio_cs_blue.png', cell: 48, feet: 44 },
  // 사용자(2026-09-15): 바위게·두꺼비·골렘·레드·블루는 최소한 미니언보다 커야 한다 → 몸 높이 30~76px, 셀 64/96
  raptor: { name: '칼날부리', w: 18, h: 26, speed: 70, hp: 3, hop: 1.1, sheet: 'assets/sprites/subrio_raptor.png', cell: 48, feet: 44 },
  wolf: { name: '늑대', w: 30, h: 24, speed: 92, hp: 3, sheet: 'assets/sprites/subrio_wolf.png', cell: 64, feet: 60 },
  gromp: { name: '두꺼비', w: 32, h: 34, speed: 28, hp: 4, sheet: 'assets/sprites/subrio_gromp.png', cell: 64, feet: 60 },
  krug: { name: '돌거북', w: 30, h: 40, speed: 24, hp: 5, sheet: 'assets/sprites/subrio_krug.png', cell: 64, feet: 60 },
  scuttle: { name: '바위게', w: 36, h: 26, speed: 56, hp: 3, sheet: 'assets/sprites/subrio_scuttle.png', cell: 64, feet: 60 },
  cannon: { name: '대포 미니언', w: 26, h: 36, speed: 34, hp: 4, sheet: 'assets/sprites/subrio_cannon.png', cell: 64, feet: 60 },
  // 레드·블루(사용자: 체력 2배, 던지는 패턴): 주인공이 range 안이면 interval 마다 포물선으로 던진다(레드 불덩이·블루 돌)
  red: { name: '레드', w: 40, h: 60, speed: 46, hp: 12, sheet: 'assets/sprites/subrio_red.png', cell: 96, feet: 90, throw: { interval: 2.2, range: 300, speed: 230, damage: 8 } },
  blue: { name: '블루', w: 44, h: 64, speed: 36, hp: 14, sheet: 'assets/sprites/subrio_blue.png', cell: 96, feet: 90, throw: { interval: 2.6, range: 320, speed: 210, damage: 9 } },
  totem: { name: '훈련 토템', w: 16, h: 32, speed: 0, hp: 8, static: true, sheet: 'assets/props/subrio_totem.png', cell: 32, cellH: 48, feet: 44, frames: 2 },
};
export const WATER_W = 14;
export const WATER_H = 8;
// 따듯한비데 보스 수치(2026-09-15 기본값 — 사용자 지시로 조정). 창 12방, 도끼 내려찍기(예비 0.55초 → 휘두름 0.3초 → 회복 0.45초), 물줄기 3발
// 2026-09-15 사용자: 섭리오 안 비데는 두 배(몸 72×104, 시트 224×192 셀), 에너지파 없음. 거슨 히든보스 참고 패턴 —
//   평타(도끼 내려찍기, 맞으면 슬로우), 팽이 회전(1초 예비 + 주변 빨간 경고 원 → 좌우 한 바퀴), 순간이동 → 영역 표시(띵) → 위에서 미끄러져 내려찍기(휘융).
//   난이도(사용자): 3~4분 싸워야 겨우 깨는 정도 → HP 110(공격력 1 기준), 패턴 피해 8~14
//   리듬(사용자): 계속 때릴 수 있는 게 아니라 패턴을 피한 뒤 때릴 틈이 생긴다 → 예비·회전·낙하 중엔 안 맞고(면역, 땡 소리), 패턴 뒤 회복 틈(recoverAfter)에 맞는다
export const BOSS = { w: 72, h: 104, speed: 70, hp: 110, reach: 120, windup: 0.55, swing: 0.3, recover: 0.5,
  swingDamage: 8, touchDamage: 5, slowTime: 2.5,
  spinWind: 1.0, spinTime: 0.9, spinRadius: 104, spinDamage: 7, spinRange: 170,
  vanish: 0.45, marker: 0.75, diveSpeed: 820, slam: 0.55, slamZoneW: 128, slamDamage: 10, teleFar: 250, teleFarTime: 1.2,
  recoverAfter: { swing: 0.8, spin: 1.6, slam: 1.8 },
  jumpSpeed: 500, roar: 1.4, hitFlash: 0.25, hitCooldown: 0.2, chaseMax: 3.2, deathTime: 2.2, waterLife: 1.7 };
/** 이 상태에서만 창·불·시계가 먹힌다(회복 틈·추격·포효·평타 예비, 착지 뒤). 오프닝(intro)엔 안 맞는다 */
export const BOSS_VULNERABLE = new Set(['chase', 'recover', 'roar', 'windup', 'slam']);

/** 행동 순서(seq 로 순환): 평타·평타·회전·내려찍기·평타·회전·내려찍기 */
export const BOSS_PATTERN = ['swing', 'swing', 'spin', 'slam', 'swing', 'spin', 'slam'];
/** 격노(체력 절반, 사용자): 붉어지고 더 어려운 패턴 — 특수기 비중↑, 예비·회복 짧아짐, 걸음·낙하 빨라짐 */
export const BOSS_PATTERN_ENRAGED = ['swing', 'spin', 'slam', 'spin', 'slam', 'swing', 'slam'];
export const BOSS_ENRAGE = { at: 0.5, windup: 0.35, spinWind: 0.65, marker: 0.5, recoverScale: 0.6, speed: 95, diveSpeed: 1000, line: { who: 'ppaman', text: '거의 다 왔어요 족쳐' } };
// 회복 샘물(스테이지 중간·끝): 근처에서 C → 체력 가득. 도트마리오 버섯(보스전): 40초마다 오른쪽 벽 위에 나타나 던진다, 30 회복
export const SPRING = { reach: 26 };
export const MARIO_HEAL = { interval: 40, first: 32, heal: 30, walkIn: 1.6, hold: 0.7, walkOut: 1.4, mushroomGravity: 720 };
// 타일 문자: '.' 빈칸, '=' 바닥 윗면, '#' 바닥 속, 'B' 떠 있는 블록, '[' 블록 왼쪽 끝, ']' 블록 오른쪽 끝, '|' 깃발 기둥(통과), 'F' 깃발 천(통과·목표)
export const SOLID = new Set(['=', '#', 'B', '[', ']']);
export const ATLAS_COLUMN = { '=': 0, '#': 1, B: 2, '[': 3, ']': 4, '|': 5, F: 6 };

const PURPLE = { tiles: 'assets/props/subrio_tiles.png', sky: ['#0c0416', '#2a1048', '#120620', '#05020a'], wave: ['rgba(98,44,170,0.55)', 'rgba(190,130,255,0.5)', 'rgba(150,90,230,0.22)'], fallback: ['#3e1c6e', '#6030a0', '#804cc4'] };
const TEAL = { tiles: 'assets/props/subrio_tiles_teal.png', sky: ['#02100f', '#0b3d3a', '#06201e', '#020908'], wave: ['rgba(30,140,130,0.55)', 'rgba(120,235,215,0.5)', 'rgba(60,180,170,0.22)'], fallback: ['#145a56', '#248c82', '#3caaa0'] };
const BLUE = { tiles: 'assets/props/subrio_tiles_blue.png', sky: ['#030818', '#0e2a6a', '#071638', '#02050f'], wave: ['rgba(40,90,210,0.55)', 'rgba(140,180,255,0.5)', 'rgba(80,120,230,0.22)'], fallback: ['#1a2e78', '#3054be', '#466ed7'] };
/** 스테이지 목록: 순서대로 진행. 이름은 사용자 확정(1-1 트위치·1-2 치지직·1-3 숲). kinds: 그 섬에 나오는 몬스터(빌더의 A/B 자리에 순서대로) */
export const STAGES = [
  { id: 'tutorial', title: '1-0', name: '튜토리얼', ...PURPLE, tutorial: true, kinds: ['cs_red'] },
  { id: 'purple', title: '1-1', name: '트위치', ...PURPLE, kinds: ['cs_red', 'raptor', 'gromp'] },
  { id: 'teal', title: '1-2', name: '치지직', ...TEAL, kinds: ['cs_blue', 'wolf', 'scuttle'] },
  { id: 'blue', title: '1-3', name: '숲', ...BLUE, kinds: ['krug', 'cannon', 'cs_red', 'cs_blue'] },
  // 1-4(사용자): 회색 쿠파성 — 회색 돌 타일, 검붉은 하늘, 아래엔 용암빛 물결. 들어가면 브금이 꺼지고 오프닝 연출 뒤 START!! 로 시작
  { id: 'boss', title: '1-4', name: '따듯한비데', tiles: 'assets/props/subrio_tiles_castle.png', sky: ['#0a0608', '#2a1014', '#150709', '#050203'],
    wave: ['rgba(150,40,30,0.5)', 'rgba(255,130,60,0.45)', 'rgba(200,70,40,0.22)'], fallback: ['#3e3e4a', '#6c6c7a', '#78788a'], boss: true, kinds: [] },
];

/**
 * 위치 대사(사용자 2026-09-15): 주인공이 열(at) 을 지나면 아래 상자에 화자별로 뜨고 시간이 지나면 다음 줄로 넘어간다(C 불필요).
 * who: ppaman(억빠맨)·gyeongsub(경섭)·hyungsub(요플래)·narrator. 1-0 은 튜토리얼 대본, 1-1~1-3 은 자유 대사
 */
const PP = (text) => ({ who: 'ppaman', text });
const GS = (text) => ({ who: 'gyeongsub', text });
export const CHATTER = {
  0: [
    { id: 'land', at: 0, lines: [PP('오 이게머야 ㅋㅋㅋ'), GS('ㅋㅋ 저기로 가야되는거같은데'), PP('와 개쩔어요 개재밌다 ㅋㅋ')] },
    { id: 'jump', at: 30, lines: [PP('점프해서 넘어가시죠')] },
    { id: 'totem', at: 78, lines: [PP('형섭이형 저거 한번 때려보세요')] },
    { id: 'cleared', when: 'cleared', lines: [PP('다 잡았으면 깃발 앞에서 C 누르면 넘어간대요'), GS('가자')] },
  ],
  1: [
    { id: 'start', at: 4, lines: [PP('오 미니언이네요'), GS('오 대박이다'), PP('다 뒤져라 ㅋㅋㅋ')] },
    { id: 'stun', at: 60, lines: [GS('내가 스턴 넣을게')] },
    { id: 'aim', at: 110, lines: [PP('경섭이형 시계좀 잘맞춰봐요'), GS('... 노력하고있어')] },
    { id: 'charge', at: 160, lines: [PP('형 창 꾹 누르면 세게 나가요')] },
    { id: 'brand', at: 215, lines: [PP('브랜드 성능좋네요')] },
    { id: 'raptor', see: ['raptor'], lines: [GS('저 새 뭐야 ㅋㅋ 칼날부리네')] },
    { id: 'spear', at: 300, lines: [PP('창던져서 창녀만들죠 창녀요플래')] },
    { id: 'flag', at: 350, lines: [PP('깃발 보이네요 다 잡아야 넘어간대요')] },
  ],
  2: [
    { id: 'start', at: 4, lines: [GS('여긴 치지직이네'), PP('늑대 조심하세요 빨라요')] },
    { id: 'invite', at: 70, lines: [PP('시크큐티kr 1초대좀')] },
    { id: 'scuttle', see: ['scuttle'], lines: [PP('바위게 ㅋㅋㅋ 귀엽네')] },
    { id: 'fun', at: 190, lines: [GS('허허 재밌다')] },
    { id: 'stun', at: 260, lines: [GS('시계 두 개 맞으면 멈춰 그때 때려')] },
    { id: 'flag', at: 390, lines: [PP('거의 다 왔어요')] },
  ],
  3: [
    { id: 'start', at: 4, lines: [PP('숲이다 ㅋㅋ 돌거북 단단해요'), GS('대포 미니언은 좀 세네')] },
    { id: 'stun', at: 200, lines: [GS('오 나 스턴 개잘넣지 않냐')] },
    { id: 'aim2', at: 300, lines: [PP('경섭이형 시계 좀 ㅋㅋ'), GS('허허 재밌다')] },
    { id: 'redblue', see: ['red', 'blue'], lines: [PP('레드 블루다!! 저거 잡으면 끝이에요')] },
    { id: 'flag', when: 'cleared', lines: [GS('ㅋㅋ 다 잡았다 깃발 가자')] },
  ],
  4: [],
};
/** 1-0 조작 안내 팻말: 월드 x(열) 위에 큰 노란 글씨 */
export const PROMPTS = { 0: [{ at: 8, text: '← → 움직여라!' }, { at: 34, text: '↑ 점프해라!' }, { at: 72, text: 'C 적을 공격해라!  (꾹 누르면 차징)' }] };
/** 1-0 밟기 시범: 주인공이 열 at 을 지나면 모두 멈추고 억빠맨이 혼자 나가 약한 미니언(HP1)을 밟아 죽인다 */
export const STOMP_DEMO = { at: 50, enemyCol: 56, before: [PP('잠깐 저거 한번 밟아볼게요')], after: [PP('오 밟아서도 죽일수있네요 ㅋㅋ'), GS('ㅋㅋ 개웃기네')] };
/** 1-0 토템을 주인공이 처음 때린 뒤: 동료 공격 해제 + 대사 */
export const TOTEM_HIT_LINES = [PP('나도 때려야지 씨발롬 다뒤저라 ㅋㅋㅋ'), GS('ㅋㅋ 내꺼 두번 맞추면 스턴도됨')];
/** 1-4 오프닝 대본(사용자 원문). 낙하 → 두 줄 → 비데 목소리 → 가운데 내려찍기(모두 양옆으로) → 좌우 둘러봄 → 세 줄 → ‘보스전’ → 1초 뒤 START!! */
const BD = (text) => ({ who: 'bidet', text });
export const BOSS_INTRO = {
  before: [PP('오 보스맵인가.'), GS('그런거 같아')],
  voice: [BD('후후후..')],
  after: [BD('편집노조 두번째 시험 도트마리오, 따뜻한비데 vs 요빠억이다 이새끼들아'), PP('들어와라 뚜벅이새끼야'), BD('날 이길수있을거라 생각하지마라')],
  // 갈라지는 자리(발 x): 요플래·억빠맨 오른쪽, 경섭 왼쪽
  split: { hyungsub: 336, ppaman: 372, gyeongsub: 104 },
  lookHold: 0.55, bannerHold: 1.0, startHold: 0.7,
};

/**
 * 레벨 빌더: 커서를 오른쪽으로 옮기며 땅·틈·블록·적·깃발을 놓는다.
 * 지형 규칙(점프 83px·체공 0.67초·이동 136px/s): 같은 높이 틈 4칸까지, 내려가는 틈 5칸까지, 오르막 단차 4칸까지.
 */
function makeBuilder(cols, rows, kinds = ['cs_red']) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill('.'));
  const enemies = [], springs = [];
  let cursor = 0, lastTop = 18, lastStart = 0, kindIndex = 0;
  // 'A'/'B' 자리표시자는 그 섬의 kinds 를 순서대로 돈다(균등 배분). 구체 종류를 적으면 그대로
  const resolve = (type) => (type === 'A' || type === 'B') ? kinds[kindIndex++ % kinds.length] : type;
  const put = (type, col, top, extra = {}) => enemies.push({ type: resolve(type), x: col * TILE + 8, y: top * TILE, ...extra });
  const b = {
    grid, enemies, springs,
    get cursor() { return cursor; },
    /** 땅 len 칸(윗면 top). walkers: 땅 시작 기준 열에 몬스터 [type, at, extra?] */
    ground(len, top, walkers = []) {
      for (let c = cursor; c < cursor + len && c < cols; c++) { grid[top][c] = '='; for (let r = top + 1; r < rows; r++) grid[r][c] = '#'; }
      for (const [type, at, extra] of walkers) put(type, cursor + at, top, extra);
      lastStart = cursor; lastTop = top; cursor += len; return b;
    },
    gap(len) { cursor += len; return b; },
    /** 마지막 땅 시작 기준 offset 열부터 len 칸의 떠 있는 블록. walkers 는 블록 위 */
    blocks(offset, len, row, walkers = []) {
      const from = lastStart + offset, to = from + len;
      for (let c = from; c < to && c < cols; c++) grid[row][c] = c === from ? '[' : c === to - 1 ? ']' : 'B';
      for (const [type, at, extra] of walkers) put(type, from + at, row, extra);
      return b;
    },
    wall(from, to, top) { for (let c = from; c < to; c++) for (let r = top; r < rows; r++) grid[r][c] = '#'; return b; },
    /** 마지막 땅 시작 기준 offset 열에 회복 샘물(발 기준) */
    spring(offset) { springs.push({ x: (lastStart + offset) * TILE + 8, y: lastTop * TILE }); return b; },
    /** 마지막 땅 위 offset 열에 깃발(기둥 4 + 천) */
    flag(offset) {
      const col = lastStart + offset, top = lastTop;
      for (let r = top - 1; r >= top - 4; r--) grid[r][col] = '|';
      grid[top - 5][col] = 'F';
      return { col, x: col * TILE + 8, y: (top - 5) * TILE };
    },
  };
  return b;
}

const R = 'A', U = 'B';

function stageTutorial(b) {
  // 1-0: 착지 평지(움직여라) → 3칸 틈(점프해라) → 밟기 시범용 약한 미니언(HP1) → 훈련 토템(공격해라) → 깃발
  b.ground(40, 18);
  b.gap(3).ground(52, 18, [['cs_red', STOMP_DEMO.enemyCol - 43, { hp: 1, demo: true }], ['totem', 82 - 43]]);
  return b.flag(48);
}

function stagePurple(b) {
  // 1-1: 평지 위주, 미니언은 한 마리씩. 틈은 2~3칸, 단차 1~2
  b.ground(30, 18, [[R, 16], [R, 24]]);
  b.ground(6, 17).ground(6, 16).ground(14, 15, [[U, 6]]);
  b.gap(3).ground(26, 18, [[R, 8], [R, 18]]).blocks(6, 4, 14).blocks(14, 5, 12, [[U, 2]]);
  b.gap(3).ground(22, 18, [[R, 10]]).blocks(6, 3, 14);
  b.ground(8, 16).gap(3).ground(30, 18, [[R, 6], [U, 14], [R, 22]]).blocks(10, 5, 13).blocks(20, 4, 11);
  b.gap(2).ground(18, 18, [[R, 9]]).blocks(4, 3, 15).blocks(11, 3, 13);
  b.ground(6, 17).ground(6, 16).ground(6, 15).gap(3).ground(20, 15, [[U, 5], [R, 14]]);
  b.gap(4).ground(28, 18, [[R, 8], [R, 20]]).blocks(6, 4, 14, [[U, 1]]).blocks(16, 4, 12).spring(14);
  b.gap(3).ground(24, 18, [[R, 6], [U, 12], [R, 18]]).blocks(8, 6, 14);
  b.ground(6, 17).ground(6, 16).gap(3).ground(26, 16, [[R, 8], [R, 18]]).blocks(10, 4, 12);
  b.gap(3).ground(30, 18, [[R, 6], [U, 12], [R, 20], [U, 26]]).blocks(8, 5, 14).blocks(18, 5, 12, [[R, 2]]);
  b.gap(4).ground(34, 18, [[R, 8], [R, 16]]).spring(22);
  return b.flag(26);
}

function stageTeal(b) {
  // 1-2: 틈 3~4칸, 오르내리는 계단, 블록 징검다리, 블록 위 미니언
  b.ground(22, 18, [[R, 12]]);
  b.ground(6, 16).gap(3).ground(14, 18).blocks(5, 3, 14);
  b.gap(4).ground(6, 18).ground(6, 17).ground(6, 16).ground(6, 15).gap(3).ground(18, 15, [[U, 4], [R, 12]]).blocks(5, 4, 12, [[R, 1]]);
  b.gap(4).ground(20, 18, [[R, 5]]).blocks(4, 3, 15).blocks(10, 4, 13);
  b.ground(6, 16).gap(3).ground(14, 16);
  // 블록 징검다리: 땅 끝(offset 14)에서 틈 3 → 블록 3칸(같은 높이) → 틈 3 → 블록 3칸(한 칸 위) → 틈 3 → 블록 3칸 → 틈 3 → 땅(내려감)
  b.blocks(17, 3, 16).blocks(23, 3, 15).blocks(29, 3, 15);
  b.gap(21).ground(24, 18, [[U, 6], [R, 14], [R, 20]]).blocks(8, 5, 14, [[U, 2]]);
  b.gap(3).ground(8, 17).ground(6, 15).ground(6, 13).gap(4).ground(20, 18, [[R, 4], [U, 10], [R, 16]]).blocks(6, 4, 14).blocks(13, 4, 12).spring(2);
  b.gap(4).ground(28, 18, [[R, 6], [R, 12], [U, 20]]).blocks(4, 3, 15).blocks(11, 3, 13).blocks(18, 3, 11, [[R, 1]]);
  b.gap(3).ground(6, 16).gap(3).ground(6, 16).gap(3).ground(22, 18, [[U, 8], [R, 16]]).blocks(10, 4, 14);
  b.ground(6, 17).ground(6, 16).ground(6, 15).ground(6, 14).gap(4).ground(24, 18, [[R, 6], [U, 12], [R, 18]]).blocks(8, 6, 14, [[U, 2]]);
  b.gap(4).ground(30, 18, [[R, 8], [R, 14], [U, 22]]).blocks(6, 5, 14).blocks(16, 5, 12).blocks(24, 3, 15);
  b.gap(3).ground(34, 18, [[R, 8]]).spring(22);
  return b.flag(26);
}

function stageBlue(b) {
  // 1-3: 틈 4칸, 내려가는 틈 5칸, 높은 블록 탑, 미니언 촘촘
  b.ground(20, 18, [[R, 8]]);
  b.gap(4).ground(14, 18).blocks(4, 3, 14).blocks(9, 3, 12);
  b.ground(6, 16).ground(6, 14).gap(3).ground(12, 14, [[U, 5]]);
  b.gap(5).ground(18, 17, [[R, 4]]).blocks(4, 4, 13).blocks(11, 4, 11);
  b.gap(3).ground(8, 17).ground(6, 15).gap(4).ground(20, 18, [[R, 5], [R, 16]]).blocks(4, 3, 15).blocks(10, 3, 12).blocks(15, 3, 9);
  b.ground(6, 16).gap(4).ground(12, 16, [[U, 6]]);
  b.gap(4).blocks(12 + 4, 3, 16).blocks(12 + 10, 3, 15).blocks(12 + 16, 3, 15).blocks(12 + 22, 3, 14);
  b.gap(21).ground(22, 18, [[R, 4], [R, 10], [U, 16]]).blocks(6, 5, 14, [[R, 2]]).blocks(14, 4, 11);
  b.gap(4).ground(6, 17).ground(6, 15).ground(6, 13).gap(5).ground(24, 18, [[U, 4], [R, 10], [R, 16], [U, 20]]).blocks(6, 4, 14).blocks(14, 4, 12).blocks(19, 3, 9).spring(1);
  b.gap(4).ground(26, 18, [[R, 5], [U, 11], [R, 17], [R, 22]]).blocks(4, 3, 15).blocks(10, 3, 13).blocks(16, 3, 11, [[U, 1]]).blocks(21, 3, 9);
  b.gap(4).ground(6, 16).gap(4).ground(6, 16).gap(4).ground(6, 16).gap(3).ground(22, 18, [[R, 6], [R, 18]]).blocks(8, 5, 14);
  b.ground(6, 17).ground(6, 16).ground(6, 15).ground(6, 14).ground(6, 13).gap(5).ground(26, 18, [[R, 4], [U, 10], [R, 16], [U, 22]]).blocks(8, 6, 14, [[U, 2]]).blocks(18, 4, 11);
  b.gap(4).ground(30, 18, [[R, 6], [R, 12], [U, 18], [R, 24]]).blocks(5, 4, 14).blocks(13, 4, 12).blocks(21, 4, 10, [[R, 1]]);
  // 마지막 평지: 레드·블루(사용자: 1-3 마지막 쪽) + 깃발 앞 샘물
  b.gap(4).ground(34, 18, [['red', 6], ['blue', 16]]).spring(22);
  return b.flag(26);
}

/**
 * 스테이지 레벨. 0 보라 · 1 청록 · 2 파랑(각 ~400열, 미니언 포함) · 3 보스 무대(파랑, 양쪽 벽).
 * enemies: [{type, x(발 중심), y(발)}]
 */
export function buildLevel(stage = 0) {
  const rows = 21;
  const def = STAGES[stage] || STAGES[0];
  let cols, goal = null, spawnX = 64, bossSpawnX = 0, b;
  if (stage === 0) { cols = 100; b = makeBuilder(cols, rows, def.kinds); goal = stageTutorial(b); }
  else if (stage === 1) { cols = 420; b = makeBuilder(cols, rows, def.kinds); goal = stagePurple(b); }
  else if (stage === 2) { cols = 440; b = makeBuilder(cols, rows, def.kinds); goal = stageTeal(b); }
  else if (stage === 3) { cols = 470; b = makeBuilder(cols, rows, def.kinds); goal = stageBlue(b); }
  else {
    // 1-4(사용자 2026-09-15): 마리오 쿠파성처럼 한 화면 안(29열 = 464px, 카메라 고정)에 발판. 양쪽 벽, 바닥 18행,
    // 양옆 발판 14행(2~6·22~26열, 바닥에서 점프해 오름), 가운데 발판 10행(10~19열: 양옆 발판 끝(x112/x352)에서 틈 48px·높이 64px → 점프 83px 로 양쪽에서 건너뜀. 12~16열이던 땐 틈 80px 라 못 올라갔다 — 사용자 지적).
    // 보스(몸 72×104, 머리 y184)는 가운데 발판 아래(y176)를 지나고 양옆 발판엔 막혀 x112~352 안에서만 움직인다. 보스 낙하 자리 x312 는 발판이 없는 열
    cols = 29; b = makeBuilder(cols, rows, []);
    b.ground(29, 18).wall(0, 1, 5).wall(28, 29, 5);
    b.blocks(2, 5, 14).blocks(22, 5, 14).blocks(10, 10, 10);
    // 보스 낙하 자리는 가운데(오프닝이 가운데 내려찍기로 등장시킨다; 하늘 낙하면 가운데 발판 위에 선다)
    spawnX = 40; bossSpawnX = 232;
  }
  const { grid, enemies, springs } = b;
  const tiles = grid.map(row => row.join(''));
  // 레벨 아래는 뚫려 있다(구덩이에 빠지면 낙사 → 마지막 자리 위 하늘에서 재낙하). 양옆 밖은 빈칸
  return { stage, def, cols, rows, tiles, width: cols * TILE, height: rows * TILE, goal, spawnX, bossSpawnX, enemies, springs,
    chatter: CHATTER[stage] || [], prompts: PROMPTS[stage] || [], stompDemo: def.tutorial ? STOMP_DEMO : null,
    solidAt: (tx, ty) => (ty < 0 || ty >= rows || tx < 0 || tx >= cols) ? false : SOLID.has(grid[ty][tx]) };
}

/** 주인공 몸 중심이 깃발 기둥을 지나면(또는 그 근처 ±24px) — 클리어는 몬스터를 다 잡고 C */
export function reachedGoal(level, actor) {
  return !!level.goal && actor.x + actor.w / 2 >= level.goal.x;
}
export function atGoal(level, actor) {
  return !!level.goal && Math.abs(actor.x + actor.w / 2 - level.goal.x) <= 24;
}
/** 남은 몬스터 수(살아 있는 것) */
export function remainingEnemies(enemies) { return enemies.filter(e => !e.dead).length; }
/** 주인공 근처의 회복 샘물(없으면 null) */
export function springNear(level, actor) {
  const cx = actor.x + actor.w / 2, feet = actor.y + actor.h;
  return level.springs.find(sp => Math.abs(sp.x - cx) <= SPRING.reach && Math.abs(sp.y - feet) <= 20) || null;
}

/** 사각형이 막힌 타일과 겹치는가 */
export function overlapsSolid(level, x, y, w, h) {
  const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.01) / TILE);
  const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.01) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (level.solidAt(tx, ty)) return true;
  return false;
}

/** 축별로 밀어 넣어 막힌 곳에서 멈춘다. 지나가는 타일을 전부 훑으므로(sweep) 한 프레임에 여러 칸을 움직여도 뚫고 지나가지 않는다. 막히면 타일 경계에 딱 맞춰 선다. 반환: 접촉 */
export function moveBody(level, body, dx, dy) {
  const hit = { x: false, floor: false, ceiling: false };
  if (dx !== 0) {
    const nx = body.x + dx;
    const y0 = Math.floor(body.y / TILE), y1 = Math.floor((body.y + body.h - 0.01) / TILE);
    if (dx > 0) {
      const last = Math.floor((nx + body.w - 0.01) / TILE);
      for (let col = Math.floor((body.x + body.w - 0.01) / TILE) + 1; col <= last; col++) if (rowsSolid(level, col, y0, y1)) { hit.x = true; body.x = col * TILE - body.w; break; }
    } else {
      const last = Math.floor(nx / TILE);
      for (let col = Math.floor(body.x / TILE) - 1; col >= last; col--) if (rowsSolid(level, col, y0, y1)) { hit.x = true; body.x = (col + 1) * TILE; break; }
    }
    if (!hit.x) body.x = nx;
  }
  if (dy !== 0) {
    const ny = body.y + dy;
    const x0 = Math.floor(body.x / TILE), x1 = Math.floor((body.x + body.w - 0.01) / TILE);
    if (dy > 0) {
      const last = Math.floor((ny + body.h - 0.01) / TILE);
      for (let row = Math.floor((body.y + body.h - 0.01) / TILE) + 1; row <= last; row++) if (colsSolid(level, row, x0, x1)) { hit.floor = true; body.y = row * TILE - body.h; break; }
      if (!hit.floor) body.y = ny;
    } else {
      const last = Math.floor(ny / TILE);
      for (let row = Math.floor(body.y / TILE) - 1; row >= last; row--) if (colsSolid(level, row, x0, x1)) { hit.ceiling = true; body.y = (row + 1) * TILE; break; }
      if (!hit.ceiling) body.y = ny;
    }
  }
  return hit;
}

function rowsSolid(level, col, y0, y1) { for (let ty = y0; ty <= y1; ty++) if (level.solidAt(col, ty)) return true; return false; }
function colsSolid(level, row, x0, x1) { for (let tx = x0; tx <= x1; tx++) if (level.solidAt(tx, row)) return true; return false; }

/** 몸 앞(dir 쪽) 바로 아래 3칸 안에 바닥이 없으면 낭떠러지 */
export function pitAhead(level, body, dir, lookahead = 6) {
  const footRow = Math.floor((body.y + body.h) / TILE);
  const aheadX = dir > 0 ? body.x + body.w + lookahead : body.x - lookahead;
  const col = Math.floor(aheadX / TILE);
  for (let r = footRow; r <= footRow + 3; r++) if (level.solidAt(col, r)) return false;
  return true;
}

export const NO_INTENT = { left: false, right: false, jump: false, jumpHeld: false, crouch: false, attack: false, attackHeld: false, guard: false };

/** 배우 생성. 발 위치(x 중심, y 바닥) 기준. 체력 없음(사용자 지시) */
export function makeActor(id, footX, footY, facing = 1) {
  return { id, x: Math.round(footX - BODY_W / 2), y: footY - STAND_H, w: BODY_W, h: STAND_H, vx: 0, vy: 0, facing,
    grounded: false, crouch: false, state: 'idle', stateT: 0, cooldown: 0, animT: 0, jumpCut: false, landed: false,
    invuln: 0, hurtT: 0, charge: 0, fireCool: 0, clockCool: 0, secondClock: 0, safeX: footX, slowT: 0 };
}

/**
 * 한 배우를 입력 의도로 한 프레임 진행시킨다.
 * intent: { left, right, jump(눌린 순간), jumpHeld, crouch, attack(눌린 순간), attackHeld, guard }
 * 반환 events: jump / land / attack{charged} / chargeStart / fall
 */
export function stepActor(level, actor, intent, dt, events = []) {
  const wasGrounded = actor.grounded;
  actor.cooldown = Math.max(0, actor.cooldown - dt);
  actor.stateT += dt;
  actor.invuln = Math.max(0, (actor.invuln || 0) - dt);
  actor.slowT = Math.max(0, (actor.slowT || 0) - dt);
  const slow = actor.slowT > 0 ? SLOW_MOVE : 1;
  // 맞은 직후에는 조작이 먹지 않는다(넉백만 물리로 진행)
  if (actor.hurtT > 0) { actor.hurtT = Math.max(0, actor.hurtT - dt); intent = NO_INTENT; actor.charge = 0; }
  const guarding = intent.guard && actor.grounded;
  const crouching = !guarding && intent.crouch && actor.grounded;
  const targetH = crouching ? CROUCH_H : STAND_H;
  if (targetH !== actor.h) {
    const bottom = actor.y + actor.h;
    if (targetH < actor.h || !overlapsSolid(level, actor.x, bottom - targetH, actor.w, targetH)) { actor.y = bottom - targetH; actor.h = targetH; }
  }
  actor.crouch = actor.h === CROUCH_H;
  // 창 차징: 누르는 동안 charge 가 쌓이고(chargeMin 넘으면 자세), 놓으면 던진다
  let attackNow = null;
  if (!guarding && !actor.crouch) {
    if (intent.attack && actor.cooldown === 0 && actor.charge === 0) actor.charge = 0.0001;
    if (actor.charge > 0 && intent.attackHeld) {
      const before = actor.charge;
      actor.charge = Math.min(SPEAR.chargeMax, actor.charge + dt);
      if (before < SPEAR.chargeMin && actor.charge >= SPEAR.chargeMin) events.push({ type: 'chargeStart', id: actor.id });
    } else if (actor.charge > 0) { attackNow = actor.charge >= SPEAR.chargeMin ? 'charged' : 'tap'; actor.charge = 0; }
  } else actor.charge = 0;
  const charging = actor.charge >= SPEAR.chargeMin;
  const canMove = !guarding && !actor.crouch;
  const dir = canMove ? (intent.right ? 1 : 0) - (intent.left ? 1 : 0) : 0;
  if (dir && !charging) actor.facing = dir;
  const target = dir * MOVE_SPEED * (charging ? 0.5 : 1) * slow;
  actor.vx += (target - actor.vx) * Math.min(1, dt * (actor.grounded ? 14 : 7));
  if (Math.abs(actor.vx) < 2 && !dir) actor.vx = 0;
  if (intent.jump && actor.grounded && !guarding) { actor.vy = -JUMP_SPEED * (actor.slowT > 0 ? SLOW_JUMP : 1); actor.grounded = false; actor.jumpCut = false; events.push({ type: 'jump', id: actor.id }); }
  if (!intent.jumpHeld && actor.vy < -120 && !actor.jumpCut) { actor.vy *= 0.55; actor.jumpCut = true; }
  actor.vy = Math.min(MAX_FALL, actor.vy + GRAVITY * dt);
  const hit = moveBody(level, actor, actor.vx * dt, actor.vy * dt);
  if (hit.x) actor.vx = 0;
  if (hit.floor) { actor.grounded = true; actor.vy = 0; }
  else if (hit.ceiling) actor.vy = 0;
  else actor.grounded = false;
  if (!wasGrounded && actor.grounded) events.push({ type: 'land', id: actor.id });
  if (actor.grounded && actor.hurtT <= 0) actor.safeX = actor.x + actor.w / 2;
  if (attackNow) {
    actor.cooldown = SPEAR.cooldown; actor.state = 'attack'; actor.stateT = 0;
    events.push({ type: 'attack', id: actor.id, charged: attackNow === 'charged', x: actor.x + (actor.facing > 0 ? actor.w : -SPEAR.w), y: actor.y + 10, facing: actor.facing });
  } else if (actor.state === 'attack' && actor.stateT < ATTACK_TIME) {
    actor.state = 'attack';
  } else if (actor.hurtT > 0) actor.state = 'hurt';
  else if (charging) actor.state = 'charge';
  else if (guarding) actor.state = 'guard';
  else if (actor.crouch) actor.state = 'crouch';
  else if (!actor.grounded) actor.state = 'jump';
  else if (dir) { actor.state = 'walk'; actor.animT += dt; }
  else { actor.state = 'idle'; actor.animT = 0; }
  // 낙사: 마지막으로 서 있던 자리 위 하늘에서 다시 떨어진다
  if (actor.y > level.height + 80) { actor.y = -60; actor.x = Math.round(Math.max(16, actor.safeX - 40) - actor.w / 2); actor.vy = 0; actor.vx = 0; actor.charge = 0; events.push({ type: 'fall', id: actor.id }); }
  return events;
}

/** 시트 2×4(+판테온 5행) 프레임 번호: 0 idle, 1~3 walk, 4 jump, 5 crouch, 6 attack, 7 guard, 8 charge(창을 뒤로 든 자세, 판테온만). 맞으면 점프 프레임 */
export function frameOf(actor) {
  if (actor.state === 'charge') return actor.classId === 'pantheon' || !actor.classId ? 8 : 6;
  if (actor.state === 'attack') return 6;
  if (actor.state === 'guard') return 7;
  if (actor.state === 'crouch') return 5;
  if (actor.state === 'jump' || actor.state === 'hurt') return 4;
  if (actor.state === 'walk') return 1 + Math.floor(actor.animT * 9) % 3;
  return 0;
}

/**
 * 동료 따라오기: 주인공의 과거 위치(reaction 초 전)를 목표로 삼아 사람이 조종하듯 늦게 반응하고,
 * 목표보다 낮은 곳에서 막히거나 주인공이 그때 뛰었으면 같이 뛴다. level 을 주면 가는 방향 앞이 낭떠러지일 때 스스로 뛴다(빠지지 않게).
 * trail: 주인공 기록 [{t, x, y, jumped}] (오래된 것 → 최신)
 */
export function followerIntent(follower, trail, now, { reaction = 0.35, spacing = 34, level = null } = {}) {
  const intent = { ...NO_INTENT };
  if (!trail.length) return intent;
  const wantT = now - reaction;
  let sample = trail[0];
  for (const entry of trail) { if (entry.t <= wantT) sample = entry; else break; }
  const targetX = sample.x - spacing * Math.sign(sample.facing || 1);
  const dx = targetX - follower.x;
  if (Math.abs(dx) > 6) { intent.right = dx > 0; intent.left = dx < 0; }
  const higher = sample.y < follower.y - 12;
  const dir = intent.right ? 1 : intent.left ? -1 : 0;
  const cliff = !!level && dir !== 0 && follower.grounded && pitAhead(level, follower, dir);
  if (follower.grounded && (sample.jumped || cliff || (higher && Math.abs(dx) < 90) || (follower.blockedT > 0.12 && Math.abs(dx) > 6))) intent.jump = true;
  intent.jumpHeld = intent.jump || (!follower.grounded && follower.vy < 0);
  return intent;
}

/** 투사체 진행(창 24×6, 물줄기 14×8, 불 12×12). gravity 를 주면 포물선(시계). 막힌 타일에 박히거나 수명이 끝나면 제거 */
export function updateProjectiles(level, list, dt, w, h, gravity = 0) {
  for (const p of list) {
    p.life -= dt;
    if (gravity) { p.vy = (p.vy || 0) + gravity * dt; p.y += p.vy * dt; }
    p.x += p.vx * dt;
    if (overlapsSolid(level, p.x, p.y, w, h)) { p.dead = true; p.hitSolid = true; }
    else if (p.life <= 0 || p.x + w < 0 || p.x > level.width || p.y > level.height) p.dead = true;
  }
  return list.filter(p => !p.dead);
}
export function updateSpears(level, spears, dt) { return updateProjectiles(level, spears, dt, SPEAR.w, SPEAR.h); }

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * 주인공 피격(체력 없음 → 튕겨나기만). fromX: 피해가 온 쪽의 x(가드 방향 판정). 방패로 그쪽을 보고 있으면 막고 살짝 밀린다.
 * 무적 시간 안이면 무시. 반환: 실제로 맞았는가
 */
export function hurtActor(actor, fromX, events = [], damage = 0, slow = 0) {
  if (actor.invuln > 0) return false;
  const cx = actor.x + actor.w / 2;
  const dir = Math.sign(fromX - cx) || actor.facing;
  if (actor.state === 'guard' && dir === actor.facing) {
    actor.vx = -dir * 90;
    events.push({ type: 'block', id: actor.id });
    return false;
  }
  actor.invuln = INVULN_TIME; actor.hurtT = HURT_TIME; actor.charge = 0;
  actor.vx = -dir * KNOCK_VX; actor.vy = -KNOCK_VY; actor.grounded = false;
  actor.h = STAND_H; actor.crouch = false;
  actor.state = 'hurt'; actor.stateT = 0;
  if (slow > 0) { actor.slowT = slow; events.push({ type: 'slowed', id: actor.id }); }
  events.push({ type: 'hurt', id: actor.id, damage });
  return true;
}

/** 표적 찾기: 배우 기준 앞뒤 range·높이차 dy 안의 살아 있는(스턴 아닌 것 포함) 적/보스 중 가장 가까운 것 */
export function nearestTarget(actor, targets, range, dy) {
  const cx = actor.x + actor.w / 2, cy = actor.y + actor.h;
  let best = null, bestD = Infinity;
  for (const t of targets) {
    if (!t || t.dead) continue;
    const d = Math.abs(t.x + t.w / 2 - cx);
    if (d <= range && Math.abs(t.y + t.h - cy) <= dy && d < bestD) { best = t; bestD = d; }
  }
  return best;
}

/** 브랜드(억빠맨) 자동 불: 표적이 보이면 그쪽을 보고 불덩이. 6초 쿨타임(fireCool 이 게이지) */
export function brandThink(actor, targets, dt, events = []) {
  actor.fireCool = Math.max(0, (actor.fireCool || 0) - dt);
  if (actor.fireCool > 0 || actor.hurtT > 0) return null;
  const target = nearestTarget(actor, targets, FIRE.range, FIRE.dy);
  if (!target) return null;
  actor.facing = Math.sign(target.x + target.w / 2 - (actor.x + actor.w / 2)) || actor.facing;
  actor.fireCool = FIRE.cooldown; actor.state = 'attack'; actor.stateT = 0;
  events.push({ type: 'fire', id: actor.id, x: actor.x + (actor.facing > 0 ? actor.w : -FIRE.w), y: actor.y + 8, vx: actor.facing * FIRE.speed, facing: actor.facing });
  return target;
}

/** 시계가 바닥·블록에 닿아 터졌을 때 반경 burst 안의 적에 시계 피해 */
export function burstClocks(removed, enemies, now, events = []) {
  for (const clock of removed) {
    if (!clock.hitSolid) continue;
    const cx = clock.x + CLOCK.w / 2, cy = clock.y + CLOCK.h / 2;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const ex = Math.max(enemy.x, Math.min(cx, enemy.x + enemy.w)), ey = Math.max(enemy.y, Math.min(cy, enemy.y + enemy.h));
      if ((ex - cx) ** 2 + (ey - cy) ** 2 <= CLOCK.burst ** 2) { damageEnemy(enemy, ATTACK_POWER, 'clock', now, events); events.push({ type: 'projectileHit', source: 'clock' }); }
    }
  }
}

/** 시계 포물선 초기 속도: dx, dy(양수 = 아래) 를 flight 초에 맞춘다 */
export function clockVelocity(dx, dy) {
  const flight = Math.max(CLOCK.flightMin, Math.min(CLOCK.flightMax, Math.abs(dx) / 260));
  return { vx: dx / flight, vy: (dy - 0.5 * CLOCK.gravity * flight * flight) / flight };
}

/** 질리언(경섭) 자동 시계: 표적이 보이면 두 개(pair 간격), 1.2초 쿨타임. 손으로 던지지 않으므로 몸 옆에서 떠오르듯 시작 */
export function zileanThink(actor, targets, dt, events = []) {
  actor.clockCool = Math.max(0, (actor.clockCool || 0) - dt);
  if (actor.secondClock > 0) {
    actor.secondClock -= dt;
    if (actor.secondClock <= 0 && actor.clockTarget && !actor.clockTarget.dead) { actor.secondClock = 0; emitClock(actor, actor.clockTarget, events, 1); }
    else if (actor.secondClock <= 0) actor.secondClock = 0;
  }
  if (actor.clockCool > 0 || actor.hurtT > 0) return null;
  const target = nearestTarget(actor, targets, CLOCK.range, CLOCK.dy);
  if (!target) return null;
  actor.facing = Math.sign(target.x + target.w / 2 - (actor.x + actor.w / 2)) || actor.facing;
  actor.clockCool = CLOCK.cooldown; actor.clockTarget = target; actor.secondClock = CLOCK.pair; actor.state = 'attack'; actor.stateT = 0;
  emitClock(actor, target, events, 0);
  return target;
}
function emitClock(actor, target, events, index) {
  const sx = actor.x + actor.w / 2 + actor.facing * 10, sy = actor.y + 6;
  // 걷는 적은 비행 시간만큼 앞을 겨냥한다(예측 사격)
  const dx0 = target.x + target.w / 2 - sx, dy = target.y + target.h / 2 - sy;
  const flight = Math.max(CLOCK.flightMin, Math.min(CLOCK.flightMax, Math.abs(dx0) / 260));
  const dx = dx0 + (target.vx || 0) * flight;
  const v = clockVelocity(dx, dy);
  events.push({ type: 'clock', id: actor.id, index, x: sx - CLOCK.w / 2, y: sy - CLOCK.h / 2, vx: v.vx, vy: v.vy });
}

/** 몬스터 생성(발 기준). 종류별 크기·속도·HP(spec.hp 로 덮어쓰기 가능). 왼쪽으로 걷기 시작 */
export function makeEnemy(type, footX, footY, dir = -1, extra = {}) {
  const kind = MONSTERS[type] || MONSTERS.cs_red;
  return { id: `${type}_${Math.round(footX)}`, type, kind, x: Math.round(footX - kind.w / 2), y: footY - kind.h, w: kind.w, h: kind.h, vx: 0, vy: 0, dir, facing: dir,
    hp: extra.hp ?? kind.hp, maxHp: extra.hp ?? kind.hp, grounded: false, stunT: 0, flash: 0, burnT: 0, animT: 0, hopT: 0, dead: false, deadT: 0, clockHits: [], demo: !!extra.demo };
}

/** 몬스터 한 프레임: 걷다 벽·낭떠러지에서 돌고(칼날부리는 주기적으로 작게 뛴다), 스턴이면 서 있고, 토템은 제자리, 죽으면 통과하며 떨어진다.
 * target 이 있고 kind.throw 가 있으면(레드·블루) 사거리 안에서 interval 마다 포물선 투사체를 던진다(events: enemyThrow) */
export function stepEnemy(level, enemy, dt, events = [], target = null) {
  const kind = enemy.kind || MONSTERS[enemy.type] || MONSTERS.cs_red;
  enemy.flash = Math.max(0, enemy.flash - dt);
  enemy.burnT = Math.max(0, (enemy.burnT || 0) - dt);
  enemy.animT += dt;
  if (enemy.dead) { enemy.deadT += dt; enemy.vy += GRAVITY * dt; enemy.y += enemy.vy * dt; enemy.x += enemy.vx * dt; return events; }
  if (enemy.stunT > 0) { enemy.stunT = Math.max(0, enemy.stunT - dt); if (enemy.stunT === 0) events.push({ type: 'stunEnd', id: enemy.id }); }
  if (kind.throw && target && enemy.stunT === 0) {
    enemy.throwT = (enemy.throwT || 0) + dt;
    const dx = target.x + target.w / 2 - (enemy.x + enemy.w / 2), dy = target.y + target.h / 2 - (enemy.y + 10);
    if (Math.abs(dx) <= kind.throw.range && enemy.throwT >= kind.throw.interval) {
      enemy.throwT = 0; enemy.dir = Math.sign(dx) || enemy.dir;
      const flight = Math.max(0.5, Math.min(1.0, Math.abs(dx) / kind.throw.speed));
      events.push({ type: 'enemyThrow', id: enemy.id, kind: enemy.type, x: enemy.x + enemy.w / 2 - 7, y: enemy.y + 4, vx: dx / flight, vy: (dy - 0.5 * ENEMY.throwGravity * flight * flight) / flight, w: 14, h: 14, damage: kind.throw.damage });
    }
  }
  // 시범용 미니언(demo)은 제자리(걸어서 화면 밖으로 나가 버리던 문제 — 2026-09-15)
  const walking = !kind.static && !enemy.demo && enemy.stunT === 0 && enemy.grounded;
  if (walking && pitAhead(level, enemy, enemy.dir, 2)) enemy.dir = -enemy.dir;
  enemy.vx = walking ? enemy.dir * kind.speed : 0;
  enemy.facing = enemy.dir;
  if (kind.hop && walking) { enemy.hopT += dt; if (enemy.hopT >= kind.hop) { enemy.hopT = 0; enemy.vy = -260; enemy.grounded = false; } }
  enemy.vy = Math.min(MAX_FALL, enemy.vy + GRAVITY * dt);
  const hit = moveBody(level, enemy, enemy.vx * dt, enemy.vy * dt);
  if (hit.x) enemy.dir = -enemy.dir;
  if (hit.floor) { enemy.grounded = true; enemy.vy = 0; } else if (hit.ceiling) enemy.vy = 0; else enemy.grounded = false;
  return events;
}

/** 미니언 피해. source: 'spear' | 'fire' | 'clock' | 'stomp'. 시계는 같은 적에 stunWindow 안에 둘 맞으면 스턴 */
export function damageEnemy(enemy, amount, source, now, events = []) {
  if (enemy.dead) return false;
  enemy.hp -= amount; enemy.flash = ENEMY.hitFlash;
  if (source === 'fire') enemy.burnT = ENEMY.burn;
  if (source === 'clock') {
    enemy.clockHits = enemy.clockHits.filter(t => now - t <= CLOCK.stunWindow);
    enemy.clockHits.push(now);
    if (enemy.clockHits.length >= 2 && enemy.stunT === 0 && enemy.hp > 0) { enemy.stunT = CLOCK.stun; enemy.clockHits = []; events.push({ type: 'stun', id: enemy.id }); }
  }
  if (enemy.hp <= 0) { enemy.dead = true; enemy.deadT = 0; enemy.vy = -220; enemy.vx = 0; events.push({ type: 'enemyDead', id: enemy.id, source }); }
  else events.push({ type: 'enemyHit', id: enemy.id, source });
  return true;
}

/** 주인공과 미니언 접촉: 위에서 떨어지며 밟으면 밟기(피해 1·튀어오름), 아니면 주인공이 튕긴다. 스턴 중인 적은 밟기만 */
export function heroTouchesEnemy(hero, enemy, now, events = []) {
  if (enemy.dead || !rectsOverlap(hero, enemy)) return false;
  const stomp = hero.vy > 0 && hero.y + hero.h < enemy.y + enemy.h * 0.6;
  if (stomp) { damageEnemy(enemy, ATTACK_POWER, 'stomp', now, events); hero.vy = -ENEMY.stompBounce; hero.grounded = false; events.push({ type: 'stomp', id: enemy.id }); return true; }
  if (enemy.stunT > 0) return false;
  return hurtActor(hero, enemy.x + enemy.w / 2, events, DAMAGE.touch);
}

/** 몬스터 시트 2×2: 0~1 걷기, 2 스턴, 3 쓰러짐. 토템(2칸): 0 서 있음, 1 맞은 직후 */
export function enemyFrame(enemy) {
  const kind = enemy.kind || MONSTERS[enemy.type];
  if (kind?.static) return enemy.flash > 0 ? 1 : 0;
  if (enemy.dead) return 3;
  if (enemy.stunT > 0) return 2;
  return Math.floor(enemy.animT * 6) % 2;
}

/** 보스 생성(발 기준). 하늘에서 떨어져 착지하면 포효 → 추격 */
export function makeBoss(footX, footY) {
  return { id: 'bidet', x: Math.round(footX - BOSS.w / 2), y: footY - BOSS.h, w: BOSS.w, h: BOSS.h, vx: 0, vy: 0, facing: -1, grounded: false,
    hp: BOSS.hp, maxHp: BOSS.hp, state: 'enter', stateT: 0, seq: 0, flash: 0, hitCooldown: 0, animT: 0, dead: false, deadT: 0,
    hidden: false, markerX: null, farT: 0, spinHit: false, slamHit: false, swingHit: false, lastAction: 'swing', recoverFor: 0.5, immuneT: 0, enraged: false };
}
/** 격노 여부에 따른 타이밍 */
export function bossTiming(boss) {
  if (!boss.enraged) return { windup: BOSS.windup, spinWind: BOSS.spinWind, marker: BOSS.marker, speed: BOSS.speed, diveSpeed: BOSS.diveSpeed, recoverScale: 1, pattern: BOSS_PATTERN };
  return { windup: BOSS_ENRAGE.windup, spinWind: BOSS_ENRAGE.spinWind, marker: BOSS_ENRAGE.marker, speed: BOSS_ENRAGE.speed, diveSpeed: BOSS_ENRAGE.diveSpeed, recoverScale: BOSS_ENRAGE.recoverScale, pattern: BOSS_PATTERN_ENRAGED };
}

/** 휘두르는 동안 도끼 판정 사각형(앞쪽 100px). 그 외엔 null */
export function bossHitbox(boss) {
  if (boss.state !== 'swing') return null;
  return { x: boss.facing > 0 ? boss.x + boss.w - 10 : boss.x - 90, y: boss.y + 16, w: 100, h: boss.h - 16 };
}
/** 회전 공격(spin) 판정: 보스 중심 원. 경고(spinWind) 중에도 같은 원을 빨갛게 그린다 */
export function bossSpinCircle(boss) {
  return { x: boss.x + boss.w / 2, y: boss.y + boss.h * 0.55, r: BOSS.spinRadius };
}
/** 내려찍기 영역(marker 부터 slam 까지): 착지면(markerY, 발판 위면 발판) 위 빨간 띠 */
export function bossSlamZone(boss) {
  if (boss.markerX === null) return null;
  return { x: boss.markerX - BOSS.slamZoneW / 2, w: BOSS.slamZoneW, y: boss.markerY ?? 0 };
}
/** x 구간 아래에서 처음 만나는 막힌 행의 윗면 y(보스가 떨어져 닿을 면). 없으면 레벨 바닥 */
export function landingY(level, x0, x1) {
  const c0 = Math.floor(x0 / TILE), c1 = Math.floor((x1 - 0.01) / TILE);
  for (let r = 0; r < level.rows; r++) for (let c = c0; c <= c1; c++) if (level.solidAt(c, r)) return r * TILE;
  return level.height;
}
function circleHits(circle, rect) {
  const nx = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w)), ny = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  return (nx - circle.x) ** 2 + (ny - circle.y) ** 2 <= circle.r * circle.r;
}

/**
 * 보스 한 프레임. target: 주인공.
 * enter(낙하) → roar → chase → [BOSS_PATTERN 순] swing: 사거리 안이면 windup → swing(맞으면 슬로우) → recover
 *   spin: 170px 안이면 spinWind(1초, 빨간 원 경고) → spin(0.9초, 원 안 판정) → recover
 *   slam: vanish(0.45초, 사라짐) → marker(0.75초, 주인공 머리 위로 순간이동 + 바닥 빨간 띠 + 띵) → dive(위에서 미끄러져 내려옴, 휘융) → slam(0.55초, 띠 안 판정·쿵) → recover
 * 추격 중 주인공이 250px 넘게 1.2초 떨어져 있으면 바로 slam 패턴. dead 는 서 있기만.
 * events: bossLand/bossJump/swing/bossSpinWind/bossSpin/bossVanish/bossMarker/bossDive/bossSlam
 */
export function stepBoss(level, boss, target, dt, events = []) {
  boss.stateT += dt; boss.animT += dt;
  boss.flash = Math.max(0, boss.flash - dt); boss.hitCooldown = Math.max(0, boss.hitCooldown - dt); boss.immuneT = Math.max(0, (boss.immuneT || 0) - dt);
  const cx = boss.x + boss.w / 2, tx = target.x + target.w / 2;
  const dx = tx - cx, dist = Math.abs(dx);
  const sameLevel = target.y + target.h > boss.y + 8 && target.y < boss.y + boss.h;
  let move = 0, physics = true;
  const tm = bossTiming(boss);
  const go = (state) => { boss.state = state; boss.stateT = 0; if (state === 'recover') boss.recoverFor = (BOSS.recoverAfter[boss.lastAction] ?? BOSS.recover) * tm.recoverScale; };
  const nextAction = () => tm.pattern[boss.seq % tm.pattern.length];
  const startSlam = () => { boss.lastAction = 'slam'; go('vanish'); boss.farT = 0; events.push({ type: 'bossVanish' }); };
  if (boss.dead) { boss.deadT += dt; }
  else if (boss.state === 'intro') { /* 오프닝: 서서 대사 중(씬이 facing 을 바꾼다) */ }
  else if (boss.state === 'enter') { if (boss.grounded) { go('roar'); events.push({ type: 'bossLand' }); } }
  else if (boss.state === 'roar') { if (boss.stateT >= BOSS.roar) go('chase'); }
  else if (boss.state === 'chase') {
    boss.facing = Math.sign(dx) || boss.facing;
    move = boss.facing;
    const action = nextAction();
    boss.farT = dist > BOSS.teleFar ? boss.farT + dt : 0;
    if (action === 'slam') startSlam();
    else if (boss.farT >= BOSS.teleFarTime) startSlam();
    else if (action === 'spin' && dist <= BOSS.spinRange && boss.grounded) { boss.lastAction = 'spin'; go('spinWind'); boss.spinHit = false; events.push({ type: 'bossSpinWind' }); }
    else if (action === 'swing' && dist <= BOSS.reach && sameLevel) { boss.lastAction = 'swing'; go('windup'); }
    else if (boss.grounded && target.y + target.h < boss.y + boss.h - 40 && dist < 200 && boss.stateT > 0.4) { boss.vy = -BOSS.jumpSpeed; boss.grounded = false; events.push({ type: 'bossJump' }); }
    else if (boss.stateT > BOSS.chaseMax) startSlam();
  }
  else if (boss.state === 'windup') { if (boss.stateT >= tm.windup) { go('swing'); boss.swingHit = false; events.push({ type: 'swing', facing: boss.facing }); } }
  else if (boss.state === 'swing') { if (boss.stateT >= BOSS.swing) go('recover'); }
  else if (boss.state === 'spinWind') { if (boss.stateT >= tm.spinWind) { go('spin'); events.push({ type: 'bossSpin' }); } }
  else if (boss.state === 'spin') { if (boss.stateT >= BOSS.spinTime) go('recover'); }
  else if (boss.state === 'vanish') {
    physics = false;
    if (boss.stateT >= BOSS.vanish) {
      // 영역은 주인공 머리 위, 착지면은 주인공이 선 면(발 y). 발판을 통과해 그 면까지 미끄러져 내려온다(발판 위 주인공은 발판 위에서 맞는다).
      // 바닥이면 양옆 발판 아래(머리가 걸림)를 피해 x112~352 안으로, 벽 안쪽으로도 조인다
      const feetY = target.grounded ? target.y + target.h : landingY(level, target.x, target.x + target.w);
      let minX = TILE + boss.w / 2 + 4, maxX = level.width - TILE - boss.w / 2 - 4;
      if (feetY >= level.height - 3 * TILE) { minX = Math.max(minX, 7 * TILE + boss.w / 2); maxX = Math.min(maxX, 22 * TILE - boss.w / 2); }
      boss.hidden = true; boss.markerX = Math.round(Math.max(minX, Math.min(maxX, tx))); boss.markerY = feetY;
      boss.x = Math.round(boss.markerX - boss.w / 2); boss.y = -BOSS.h - 40; boss.vx = 0; boss.vy = 0;
      go('marker'); events.push({ type: 'bossMarker', x: boss.markerX, y: boss.markerY });
    }
  }
  else if (boss.state === 'marker') { physics = false; if (boss.stateT >= tm.marker) { boss.hidden = false; boss.facing = Math.sign(dx) || boss.facing; boss.slamHit = false; go('dive'); events.push({ type: 'bossDive' }); } }
  else if (boss.state === 'dive') {
    physics = false;
    boss.vy = tm.diveSpeed; boss.vx = 0;
    boss.y += boss.vy * dt;
    if (boss.y + boss.h >= boss.markerY) { boss.y = boss.markerY - boss.h; boss.grounded = true; boss.vy = 0; go('slam'); events.push({ type: 'bossSlam', x: boss.markerX }); }
  }
  else if (boss.state === 'slam') { if (boss.stateT >= BOSS.slam) { boss.markerX = null; go('recover'); } }
  else if (boss.state === 'recover') { if (boss.stateT >= (boss.recoverFor ?? BOSS.recover)) { boss.seq += 1; go('chase'); } }
  if (physics) {
    const targetVx = move * tm.speed;
    boss.vx += (targetVx - boss.vx) * Math.min(1, dt * (boss.grounded ? 12 : 5));
    if (!move && Math.abs(boss.vx) < 2) boss.vx = 0;
    boss.vy = Math.min(MAX_FALL, boss.vy + GRAVITY * dt);
    const hit = moveBody(level, boss, boss.vx * dt, boss.vy * dt);
    if (hit.x) boss.vx = 0;
    if (hit.floor) { boss.grounded = true; boss.vy = 0; }
    else if (hit.ceiling) boss.vy = 0;
    else boss.grounded = false;
  }
  return events;
}

/**
 * 보스 공격이 배우에 닿는가(한 동작에 배우마다 한 번, boss.hitIds). swing: 도끼 사각형(슬로우), spin: 원, slam: 착지 순간 띠 안, 접촉.
 * follower: 동료는 체력이 깎이지 않고(피해 0) 어떤 공격에 맞아도 슬로우가 묻는다(사용자 2026-09-15). 닿으면 hurtActor 호출
 */
export function bossAttackHero(boss, hero, events = [], follower = false) {
  if (boss.dead || boss.hidden) return false;
  const bcx = boss.x + boss.w / 2;
  if (!boss.hitIds || boss.hitState !== boss.state || boss.hitStateT > boss.stateT) { boss.hitIds = new Set(); boss.hitState = boss.state; }
  boss.hitStateT = boss.stateT;
  const dmg = (amount) => follower ? 0 : amount;
  const slow = (amount) => follower ? BOSS.slowTime : amount;
  const once = (fn) => { if (boss.hitIds.has(hero.id)) return false; const hit = fn(); if (hit) boss.hitIds.add(hero.id); return hit; };
  if (boss.state === 'swing') {
    const box = bossHitbox(boss);
    if (box && rectsOverlap(box, hero)) return once(() => hurtActor(hero, bcx, events, dmg(BOSS.swingDamage), BOSS.slowTime));
  } else if (boss.state === 'spin') {
    if (circleHits(bossSpinCircle(boss), hero)) return once(() => hurtActor(hero, bcx, events, dmg(BOSS.spinDamage), slow(0)));
  } else if (boss.state === 'slam' && boss.stateT < 0.2) {
    const zone = bossSlamZone(boss);
    const heroCx = hero.x + hero.w / 2, onGround = hero.y + hero.h >= boss.y + boss.h - 24;
    if (zone && heroCx >= zone.x && heroCx <= zone.x + zone.w && onGround) return once(() => hurtActor(hero, bcx, events, dmg(BOSS.slamDamage), slow(0)));
  } else if ((boss.state === 'chase' || boss.state === 'recover' || boss.state === 'windup') && rectsOverlap(boss, hero)) {
    if (hurtActor(hero, bcx, events, dmg(BOSS.touchDamage), slow(0)) && boss.state === 'chase' && !follower) { boss.state = 'recover'; boss.stateT = 0; return true; }
  }
  return false;
}

/** 창·불·시계가 보스에 맞았을 때(공격력 1). 패턴 중(예비·회전·사라짐·낙하)엔 면역(땡, bossImmune) — 피한 뒤 회복 틈에 때린다. 짧은 무적으로 한 투사체에 두 번 안 맞는다 */
export function hitBoss(boss, events = []) {
  if (boss.dead || boss.hidden || boss.hitCooldown > 0) return false;
  if (!BOSS_VULNERABLE.has(boss.state) || (boss.state === 'slam' && boss.stateT < 0.2)) { if (boss.immuneT === 0) { boss.immuneT = 0.25; events.push({ type: 'bossImmune' }); } return false; }
  boss.hp -= ATTACK_POWER; boss.flash = BOSS.hitFlash; boss.hitCooldown = BOSS.hitCooldown;
  events.push({ type: 'bossHit', hp: boss.hp });
  if (!boss.enraged && boss.hp > 0 && boss.hp <= boss.maxHp * BOSS_ENRAGE.at) { boss.enraged = true; events.push({ type: 'bossEnrage' }); }
  if (boss.hp <= 0) { boss.dead = true; boss.state = 'dead'; boss.stateT = 0; boss.deadT = 0; boss.vx = 0; boss.hidden = false; boss.markerX = null; events.push({ type: 'bossDead' }); }
  return true;
}

/**
 * 보스 프레임. 본 시트 2×4(0 idle, 1~2 walk, 3 jump, 4 windup, 5 swing, 6 미사용, 7 hurt)는 0~7,
 * 스킬 시트 2×4(0 dive, 1 slam, 2 spinA, 3 spinB, 4 spinC, 5 vanish, 6 spinWind, 7 overhead)는 100~107 로 돌려준다
 */
export function bossFrame(boss) {
  // 맞을 때 땀방울 hurt 프레임(7)로 바꾸지 않는다 — 물방울처럼 보인다는 지적(2026-09-15). 번쩍임(flash)만. 쓰러지면 무릎 꿇은 slam 프레임
  if (boss.dead) return 101;
  if (boss.state === 'vanish') return 105;
  if (boss.state === 'dive') return 100;
  if (boss.state === 'slam') return 101;
  if (boss.state === 'spinWind') return 106;
  if (boss.state === 'spin') return 102 + Math.floor(boss.stateT / BOSS.spinTime * 6) % 3;
  if (boss.state === 'enter' || (!boss.grounded && boss.state === 'chase')) return 3;
  if (boss.state === 'windup') return 4;
  if (boss.state === 'swing') return 5;
  if (boss.state === 'chase') return [1, 0, 2, 0][Math.floor(boss.animT * 7) % 4];
  return 0;
}
/** 걷는 동안 위아래로 살짝 들썩이는 양(px) — 미끄러지는 느낌을 줄인다 */
export function bossBob(boss) {
  return boss.state === 'chase' && boss.grounded ? Math.round(Math.abs(Math.sin(boss.animT * 7 * Math.PI / 2)) * 3) : 0;
}

/** 카메라 x: 주인공이 화면 40% 지점에 오도록, 레벨 밖으로 나가지 않게 */
export function cameraX(level, actor) {
  return Math.max(0, Math.min(level.width - VIEW_W, Math.round(actor.x + actor.w / 2 - VIEW_W * 0.4)));
}
