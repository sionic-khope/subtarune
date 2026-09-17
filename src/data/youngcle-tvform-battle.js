// 변신 영클(TV 머리, youngcle_tvform) 전투 — 사용자 브리핑(2026-09-17, 원문 design/narrative/cutscenes/ship_tvform_battle.md) 대사·연출 상수·코인 패턴 설정.
//   흐름: 전투 진입 → “편집노조의 힘을 얕보지마라” → 편집노조 넷(비데·파크가디언·뚜울라·도트마리오)이 각자 색의 유령(하체 없음·잔상)으로 거대하게 나타나 빙글빙글 돌며 영클 TV 얼굴로 빨려 들어감 → 띠리리리링(snd_power) + 오라 휘이잉 + 에너지 차오름(약 6초)
//   → “공격도 하지마라.” → 행동 선택 창이 뜨면 영클이 땅을 내리쳐(진동) [공격하기]가 사라짐 → “ㅋㅋ 대신 이거드림.” → VS 로고 [승부하기] 버튼을 던져 패널에 안착 → 나레이션 → [승부하기][코인벌기][아이템].
//   코인벌기: 적 턴마다 공격 패턴 속에 코인 하나(후반, 쉽지 않게) — 먹으면 코인 +1. 승부하기 규칙은 다음 브리핑(지금은 “승부를 하려면 코인이 필요하다. N코인 남았다.”).
const YC = (text, expression = 'smirk', extra = {}) => ({ speaker: '영클', portrait: `youngcle_tv_${expression}`, voice: 'youngcle', text: '* ' + text, ...extra });

export const TVFORM_BATTLE = {
  bgm: 'youngcle_tvform_battle',                        // 사용자 지정 ttz22bFLZqQ “It's Tv Time! (From "Deltarune")”
  coinsStart: 3,
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
    afterLine: YC('공격도 하지마라.', 'glare'),
    slam: { wait: 0.9, shake: 0.5, amp: 8 },               // 행동 창이 뜨고 0.9초 뒤 땅을 내리침 → [공격하기] 사라짐
    giveLine: YC('ㅋㅋ 대신 이거드림.', 'laugh'),
    throwTime: 0.75,                                      // VS 버튼 포물선(영클 → 패널 자리)
    made: ['* 승부하기 버튼이 만들어졌다.', '* 승부를 하려면 코인이 필요하다.\n3코인 남았다.'],
  },
  duelNeed: (n) => `* 승부를 하려면 코인이 필요하다.\n${n}코인 남았다.`,
  coinGot: (n) => `* 코인을 얻었다! ${n}코인.`,
  coinMiss: '* 코인을 놓쳤다.',
  // 코인 패턴 6종 순환(코인벌기를 고른 턴에만 코인이 나온다)
  coinOrder: ['coin_lasers', 'coin_maze_a', 'coin_rain', 'coin_spokes', 'coin_maze_b', 'coin_ships'],
  coin: { r: 7, sfx: 'item' },
  lasers: { duration: 11, first: 0.9, every: 0.85, warn: 0.45, speed: 300, thick: 6, coinAt: 7.2, coinSpeed: 22 },          // 사방 레이저 + 중후반 아주 느린 코인
  rain: { duration: 11, first: 0.8, every: 0.16, speed: 140, coinAt: 7.0, coinSpeed: 34 },                                   // 위에서 뭔가 잔뜩 뿌림 + 후반 천천히 떨어지는 코인(가짜 코인 셋 섞임)
  spokes: { duration: 11.5, spokes: 4, rev: 0.22, thick: 5, coinAt: 6.5, orbitR: 62, orbitRev: 0.18 },                        // 회전 레이저 바퀴 + 후반 테두리를 도는 코인
  ships: { duration: 11.5, launches: [0.9, 4.4], speed: 80, turn: 1.6, life: 5.4, coinAt: 6.8, fleeSpeed: 48, coinLife: 4.2 },   // 유도 함선 둘 + 후반 소울에게서 달아나는 코인
  maze: { cols: 12, rows: 10, cell: 20, laserEvery: 3.2, laserWarn: 0.7, laserHit: 0.35, maxSeconds: 24, seedA: 20260917, seedB: 917 },   // 미로 15~20초, 사이사이 가로/세로 레이저
};
