// BUILD339 청소년 보스전(사용자 2026-09-25 브리핑, .omc/handoffs/teenboss339.md). 대사·표기 원문 그대로, 수치는 전부 여기.
export const TEEN_BATTLE = Object.freeze({
  enemy: 'teen_giant', hp: 999,
  defend: { reduce: 3 },
  gauge: { perDodge: 1.6, max: 100 },
  slamEvery: 3,
  downTurns: 3,
  rockDamage: 50,
  sheet: 'assets/enemies/teenboss339.png',
  frames: { idle: 0, breathe: 1, punch: 2, slam: 3, vacuum: 4, down: 5 },
  // 쓰러진 청소년에게 달려갈 자리(엎드려 낮아진 몸 앞)
  downSpot: [262, 214],
  images: {
    sword: 'assets/props/cathedral323_sword.png', knee: 'assets/props/teenboss339_knee.png',
    arm: 'assets/props/arena332_arm.png', gajaeman: 'assets/sprites/gajaeman_shadow.png',
    defend: id => `assets/battle/${id}-defend.png`,
  },
  gajaemanPatterns: ['gj_swords', 'gj_knee', 'gj_mouse'],
  intro: [
    { speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* 형들 일단 여기서 공격하는건 자살행위에요' },
    { speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* 그렇지 그럼 어떻게 할까???' },
    { speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* 기회를 노려야죠,,' },
    { voice: 'narrator', text: '* (공격하기가 비활성화 되었다.)' },
    { voice: 'narrator', text: '* (방어하기 버튼이 생겼다.)' },
  ],
  downLine: { speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* 지금이에요 공격해요!!' },
  labels: { fight: '공격하기', item: '아이템', defend: '방어하기', gauge: '청소 용량' },
  idle: { guard: '* 청소년이 거칠게 숨을 쉰다.', down: '* 청소년이 쓰러져 있다!' },
  defendText: '* 모두 팔을 교차해 막을 준비를 했다.',
});
