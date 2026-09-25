// BUILD339 청소년 보스전(사용자 2026-09-25 브리핑, .omc/handoffs/teenboss339.md). 대사·표기 원문 그대로, 수치는 전부 여기.
export const TEEN_BATTLE = Object.freeze({
  enemy: 'teen_giant', hp: 999,
  defend: { reduce: 3 },
  // BUILD342 청소 패턴 두 배 길이(사용자 “지금보다 두배는 더”) → 피한 잔해 하나당 1%
  gauge: { perDodge: 1.0, max: 100 },
  slamEvery: 3,
  downTurns: 3,
  rockDamage: 50,
  /**
   * BUILD342 필드 대치와 전투가 같은 한 화면(사용자 참고: 델타룬 거인전 — 왼쪽 약 35% 끝길 위에 일행, 오른쪽 60% 를 청소년이 채우고 왼쪽을 본다).
   * 모두 화면 좌표(480×360). cam = 그 화면의 월드 왼쪽 위(꼭대기 맵 tools/maps/gajaeman_summit.py 의 VIEW 와 같은 값).
   */
  view: {
    cam: [1592, 188],
    giant: { image: 'assets/props/summit342_teen.png', x: 175, y: 2 },
    down: { image: 'assets/props/teen342_down.png', x: 165, y: 30 },
    // 일행 발 위치: 끝길 위에 대각선으로 붙여 선다
    party: { hyungsub: [125, 176], gyeongsub: [93, 204], ppaman: [61, 232] },
    // 가재맨이 앉는 앞 어깨, 쓰러진 뒤 맴도는 곳(쓰러진 몸 뒤)
    shoulder: [285, 97], hover: [372, 104],
  },
  // 쓰러지는 연출: 앞으로 기울며 가라앉고(tilt) → 엎드린 그림으로 바뀌며 쿵(land) → 잠깐 정적(hold) 뒤 대사
  collapse: { tilt: 1.5, land: 0.5, hold: 1.2, rise: 1.0 },
  gajaemanFly: { descend: 3.2, radius: [34, 14], speed: 0.9 },
  // 쓰러진 청소년에게 달려갈 자리(엎드린 몸 앞, 끝길 가장자리)
  downSpot: [214, 196],
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
  // 행동 창 문구(사용자 2026-09-25 “마지막이다. 끝이다. 이런류”) — 턴마다 돌아가며
  idle: { guard: ['* 마지막이다.', '* 끝이다.', '* 이것이 마지막 싸움이다.', '* 모든 것의 끝이 다가온다.'], down: '* 청소년이 쓰러져 있다!' },
  defendText: '* 모두 팔을 교차해 막을 준비를 했다.',
});
