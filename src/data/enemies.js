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
    patterns: [
      { type: 'rain', duration: 4.2, rate: 0.16, speed: 95, r: 4 },
      { type: 'aimed', duration: 4.0, every: 0.55, speed: 120, r: 5 },
      { type: 'sweep', duration: 4.4, rows: 3, gap: 34, speed: 80, r: 4 },
    ],
    lines: { appear: '* 레드 CS 가 나타났다!', idle: ['* 억빠맨이 CS 막타를 노리고 있는 듯 하다..{w=0.3} (신경쓸 필욘 없다)', '* 레드 CS 가 방패를 닦고 있다.{w=0.3} 왜인지 뿌듯해 보인다.', '* 레드 CS 가 이쪽을 노려본다.{w=0.3} 눈이 마주쳐서 좀 민망하다.', '* 경섭이 허허 하고 웃었다.{w=0.3} (별 뜻은 없다)'], die: '* 레드 CS 가 쓰러졌다.',
      speak: ['막타는 내 거다.', '방패 좀 닦고 때릴게요.', '어 잠깐 잠깐, 아직 준비 안 됐는데.', '허허 우리도 월급은 받아야지.', '이거 진짜 무거운데요..'] },   // 적 턴 말풍선(1인칭, 델타룬식) — 다른 적 언급 금지
  },
  cs_blue: {
    name: '블루 CS', hp: 6,
    image: 'assets/enemies/cs-blue-battle-left.png', pivot: [32, 60], scale: 1.4, damage: 8, money: 30, idle: { swayX: 8, swayY: 2, period: 3.1 },
    patterns: [
      { type: 'aimed', duration: 4.0, every: 0.55, speed: 120, r: 5 },
      { type: 'bounce', duration: 4.5, count: 2, speed: 100, r: 7 },
      { type: 'rain', duration: 4.2, rate: 0.16, speed: 95, r: 4 },
    ],
    lines: { appear: '* 블루 CS 가 나타났다!', idle: ['* 억빠맨이 CS 막타를 노리고 있는 듯 하다..{w=0.3} (신경쓸 필욘 없다)', '* 블루 CS 가 망치를 만지작거린다.{w=0.3} 어디에 쓰는지는 모른다.', '* 요플래는 아무 생각이 없다.', '* 블루 CS 가 콧노래를 흥얼거린다.{w=0.3} 음정이 하나도 안 맞는다.'], die: '* 블루 CS 가 쓰러졌다.',
      speak: ['이 망치 어디에 쓰는 거지?', '흥얼흥얼~ 음 음~', '블루가 진짜 최고인 거 알지?', '이 게임 브금 좋네요.', '잠깐만요 신발끈 좀..'] },
  },
};
