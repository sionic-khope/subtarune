// 변신 영클(TV 머리, youngcle_tvform) 전투 — 사용자 브리핑(2026-09-17, 원문 design/narrative/cutscenes/ship_tvform_battle.md) 대사·연출 상수·코인 패턴 설정.
//   흐름: 전투 진입 → “편집노조의 힘을 얕보지마라” → 편집노조 넷(비데·파크가디언·뚜울라·도트마리오)이 각자 색의 유령(하체 없음·잔상)으로 거대하게 나타나 빙글빙글 돌며 영클 TV 얼굴로 빨려 들어감 → 띠리리리링(snd_power) + 오라 휘이잉 + 에너지 차오름(약 6초)
//   → 보통 행동 창([공격하기][아이템]). 적 턴은 코인 패턴 6종 순환 — 탄막 후반에 코인 하나(쉽지 않게), 먹으면 파티 회복(BUILD215 사용자 “승부 지우고 공격만, 코인은 먹으면 회복”).
const YC = (text, expression = 'smirk', extra = {}) => ({ speaker: '영클', portrait: `youngcle_tv_${expression}`, voice: 'youngcle', text: '* ' + text, ...extra });

export const TVFORM_BATTLE = {
  bgm: 'youngcle_tvform_battle',                        // 사용자 지정 ttz22bFLZqQ “It's Tv Time! (From "Deltarune")”
  intro: {
    line: YC('편집노조의 힘을 얕보지마라', 'taunt'),
    // 편집노조 넷: 시트(4방향 걷기 정면 셀)·색(잔상·유령 색). 거대(scale 3)에서 시작해 빙글빙글 돌며 영클 얼굴로
    spirits: [
      { id: 'warm_bidet', sheet: 'assets/sprites/warm_bidet.png', color: '#5fd8ff', at: 0.0 },
      { id: 'park_guardian', sheet: 'assets/sprites/park_guardian_costume.png', color: '#c98bff', at: 0.55 },
      { id: 'ttuulla', sheet: 'assets/sprites/ttuulla.png', color: '#8bff9e', at: 1.1 },
      { id: 'mini_mario', still: 'assets/sprites/mini_mario.png', color: '#ff6b6b', at: 1.65 },
    ],
    spin: { time: 2.4, startScale: 3.0, turns: 3.5, trail: 7, trailGap: 0.045 },   // 각 유령: 2.4초 동안 3.5바퀴 돌며 3배 → 0.15배로 줄어 얼굴로
    charge: { time: 2.2, rings: 5, particles: 40 },       // 다 들어간 뒤: 띠리리리링 + 오라 링 휘이잉 + 에너지 입자 모임
  },
  // 코인 패턴 6종 순환(적 턴마다 하나, 코인은 후반에)
  coinOrder: ['coin_lasers', 'coin_maze_a', 'coin_rain', 'coin_spokes', 'coin_maze_b', 'coin_ships'],
  coin: { r: 7, sfx: 'item', heal: 30 },                // 먹으면 서 있는 동료 모두 +30(BUILD215)
  healed: (n) => `* 코인을 먹었다! 모두 HP ${n} 회복.`,
  lasers: { duration: 11, first: 0.9, every: 0.85, warn: 0.45, speed: 300, thick: 6, coinAt: 7.2, coinSpeed: 22 },          // 사방 레이저 + 중후반 아주 느린 코인
  rain: { duration: 11, first: 0.8, every: 0.16, speed: 140, coinAt: 7.0, coinSpeed: 34 },                                   // 위에서 뭔가 잔뜩 뿌림 + 후반 천천히 떨어지는 코인(가짜 코인 셋 섞임)
  spokes: { duration: 11.5, spokes: 4, rev: 0.22, thick: 5, coinAt: 6.5, orbitR: 62, orbitRev: 0.18 },                        // 회전 레이저 바퀴 + 후반 테두리를 도는 코인
  ships: { duration: 11.5, launches: [0.9, 4.4], speed: 80, turn: 1.6, life: 5.4, coinAt: 6.8, fleeSpeed: 48, coinLife: 4.2 },   // 유도 함선 둘 + 후반 소울에게서 달아나는 코인
  maze: { cols: 12, rows: 10, cell: 20, laserEvery: 3.2, laserWarn: 0.7, laserHit: 0.35, maxSeconds: 24, seedA: 20260917, seedB: 917 },   // 미로 15~20초, 사이사이 가로/세로 레이저
};
