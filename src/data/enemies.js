// ─────────────────────────────────────────────────────────────
// 적 레지스트리 — 적 하나 = 항목 하나. 여기만 고치면 새 적이 전투에 나온다 (2026-09-10 전투 브리핑: "여러 적이 생길 때 쉽게 커스텀·추가").
//   name        전투 화면 이름
//   hp          체력 (우리 공격은 무조건 1 데미지 → hp = 맞아야 하는 횟수)
//   image / sheet  그림: image = 단일 PNG(전투 전용, pivot = 발 기준 [x,y], 이미 왼쪽을 보는 그림) | sheet = 오버월드 4x4 시트에서 왼쪽 보는 줄(row 2) 두 프레임을 번갈아
//   scale       그리는 배율
//   damage      탄에 맞았을 때 우리 쪽이 잃는 HP
//   patterns    적 턴에 쓰는 탄막 (src/battle/bullets.js PATTERNS 의 키 + 옵션). 여러 개면 턴마다 돌아가며.
//   board       탄막 상자 크기 [w,h] (없으면 기본 200x150)
//   lines       { appear, idle[], hurt, die }  전투 문구 (나레이션 '* ' 포함해서 그대로 출력)
// ─────────────────────────────────────────────────────────────
export const ENEMIES = {
  // PR #7 전투 이미지(64×64, 이미 왼쪽을 봄, 발 pivot 32,60) — docs/handoffs/combat-assets.md. 색상별 능력치 차이는 아직 없음(브리핑: CS 각 HP 6)
  cs_red: {
    name: '레드 CS', hp: 6,
    image: 'assets/enemies/cs-red-battle-left.png', pivot: [32, 60], scale: 1.4, damage: 8,
    patterns: [
      { type: 'rain', duration: 4.2, rate: 0.16, speed: 95, r: 4 },
      { type: 'aimed', duration: 4.0, every: 0.55, speed: 120, r: 5 },
      { type: 'sweep', duration: 4.4, rows: 3, gap: 34, speed: 80, r: 4 },
    ],
    lines: { appear: '* 레드 CS 가 나타났다!', idle: ['* 레드 CS 가 이쪽을 노려본다.', '* 레드 CS 가 제자리에서 통통 뛴다.'], hurt: '* 레드 CS 가 움찔한다.', die: '* 레드 CS 가 쓰러졌다.' },
  },
  cs_blue: {
    name: '블루 CS', hp: 6,
    image: 'assets/enemies/cs-blue-battle-left.png', pivot: [32, 60], scale: 1.4, damage: 8,
    patterns: [
      { type: 'aimed', duration: 4.0, every: 0.55, speed: 120, r: 5 },
      { type: 'bounce', duration: 4.5, count: 2, speed: 100, r: 7 },
      { type: 'rain', duration: 4.2, rate: 0.16, speed: 95, r: 4 },
    ],
    lines: { appear: '* 블루 CS 가 나타났다!', idle: ['* 블루 CS 에게서 이상한 소리가 난다.', '* 블루 CS 가 이쪽을 노려본다.'], hurt: '* 블루 CS 가 움찔한다.', die: '* 블루 CS 가 쓰러졌다.' },
  },
};
