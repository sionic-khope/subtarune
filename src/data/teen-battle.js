// BUILD339 청소년 보스전(사용자 2026-09-25 브리핑, .omc/handoffs/teenboss339.md). 대사·표기 원문 그대로, 수치는 전부 여기.
export const TEEN_BATTLE = Object.freeze({
  enemy: 'teen_giant', hp: 999,
  defend: { reduce: 3 },
  // 청소년전 적 공격 한 대 피해: 20~25 무작위(사용자 2026-09-25), 방어한 멤버만 −3
  enemyHit: [20, 25],
  // BUILD342 청소 패턴 두 배 길이(사용자 “지금보다 두배는 더”) → 피한 잔해 하나당 1%
  gauge: { perDodge: 0.7, max: 100 },
  slamEvery: 3,
  downTurns: 3,
  // 주먹 패턴 무피격 낙석도 같은 비율로 35
  rockDamage: 35,
  // 세 번째 청소(그 뒤로 세 번마다)는 C 연타 버티기: 연타마다 하트가 구멍에서 밀려나고, 끝까지 빨려 들어가면 전원 50(사용자 2026-09-25)
  // 아래 방향키로는 못 내려간다(좌우·위만), 아래에서 솟는 돌을 좌우로 피하면서 연타(사용자 “더 어렵게, 피하는 기믹”)
  mash: { every: 3, push: 13, pull: [40, 128], ramp: 0.5, damage: 50, duration: 13, rock: { every: [1.1, 0.55], warn: 0.5, speed: 190 } },
  // 청소 중 가끔(패턴당 1~2개) 천천히 날아오는 초록 1UP 버섯: 하트로 먹으면 일행 전원 +30(사용자 2026-09-25)
  mushroom: { image: 'assets/props/teen346_mushroom.png', heal: 30, second: 0.5, speed: 38 },
  // 쓰러진 동안 일반 공격 한 대 = 35(50 에서 30% 너프, 사용자 2026-09-25) — 한 번 쓰러질 때 9대 = 315, 세 번 945 < 999 → 네 번째 쓰러짐에 잡힌다. 매번 치명타 이펙트 + 릴리즈샷 소리
  downHit: { damage: 35, sfx: 'deltarune_release_shoot', fx: 0.55 },
  /**
   * BUILD342 필드 대치와 전투가 같은 한 화면(사용자 참고: 델타룬 거인전 — 왼쪽 약 35% 끝길 위에 일행, 오른쪽 60% 를 청소년이 채우고 왼쪽을 본다).
   * 모두 화면 좌표(480×360). cam = 그 화면의 월드 왼쪽 위(꼭대기 맵 tools/maps/gajaeman_summit.py 의 VIEW 와 같은 값).
   */
  view: {
    cam: [1592, 188],
    // 끝길 다리·마지막 기둥만 남긴 전경(청소년이 그 뒤에, 일행은 그 앞에)
    front: 'assets/props/summit342_front.png',
    // BUILD346: 사용자가 고른 D안(결전지 거인 디자인, 주인공 쪽을 내려다보는 3/4), 700px — 목 위는 화면 밖(얼굴 없음), 살짝 더 왼쪽.
    // 자세 4종이 같은 캔버스. 주먹·쓰러짐은 몸이 내려가 목 단면이 보이지 않게 그만큼 위로(assets/source/teen345/process.py 의 neckTop)
    // 상체를 더 올려 목이 덜 보이게, 기둥과는 기둥이 앞에 자연스럽게 겹치는 정도(사용자 교정)
    giant: { image: 'assets/props/summit342_teen.png', x: 150, y: -60 },
    down: { image: 'assets/props/teen342_down.png', x: 150, y: -60 },
    // 청소: 손바닥 구멍이 상자 왼쪽 위 대각선(palm)에 오도록 자세를 옮긴다. palmInSprite = 청소 자세 그림 속 구멍 자리
    // approach 동안 손을 가져다 대고, open 동안 구멍이 열리며 충전 → 그 뒤에야 빨아들인다(사용자 “공격준비 시간, 웅장하게”)
    // 손은 기둥과 겹치지 않게 오른쪽 위에서 뻗어, 구멍이 가운데 상자 위쪽에 온다(사용자 “기둥도”, “가운데에 피하는 화면”)
    vacuum: { palm: [304, 40], palmInSprite: [76, 107], approach: 1.2, open: 1.3 },
    // 일행 발 위치: 끝길 위에 대각선으로 붙여 선다
    party: { hyungsub: [125, 176], gyeongsub: [93, 204], ppaman: [61, 232] },
    // 가재맨: 평소엔 아예 안 보인다 → 쓰러질 때만 청소년 오른쪽 아래 어깨 라인(shoulder)에서 나와 천천히 왼쪽으로 날아와 위에 떠 있다
    // → 일어서면 다시 어깨 라인 뒤로 사라진다(사용자 “안 보여야”, “오른쪽 아래 어깨쪽 라인에서 나오게”, “너무 크다”)
    shoulder: [430, 210], hover: [300, 118], gajaemanScale: 1.0,
    // 청소 중 방해: 어깨 라인에서 잠깐 튀어나와 치고 다시 들어간다(독립적으로 나와서 때리는 느낌)
    pop: [396, 104],
    // 방해하러 튀어나올 때 대사(사용자 예시 “쉽게 피하게 둘까보냐 ㅋㅋ”, 두 가지를 번갈아)
    popLines: ['쉽게 피하게 둘까보냐 ㅋㅋ', '어딜 도망가려고 ㅋㅋ'],
  },
  // 쓰러지는 연출: 앞으로 기울며 가라앉고(tilt) → 엎드린 그림으로 바뀌며 쿵(land) → 잠깐 정적(hold) 뒤 대사
  // 과부하: 지지직(스파크) → 퓌시이익(김·연기) → 앞으로 기울며 쓰러짐
  collapse: { overload: 1.8, tilt: 1.5, land: 0.5, hold: 1.2, rise: 1.0 },
  gajaemanFly: { descend: 3.6, radius: [18, 8], speed: 0.9 },
  // 쓰러진 청소년에게 달려갈 자리(엎드린 몸 앞, 끝길 가장자리)
  downSpot: [208, 206],
  images: {
    sword: 'assets/props/cathedral323_sword.png', knee: 'assets/props/teenboss339_knee.png',
    arm: 'assets/props/arena332_arm.png', gajaeman: 'assets/sprites/gajaeman_shadow.png',
    defend: id => `assets/battle/${id}-defend.png`,
  },
  gajaemanPatterns: ['gj_swords', 'gj_knee', 'gj_mouse'],
  // 쓰러졌던 청소년이 일어설 때 가재맨 대사(몇 번째 쓰러짐인지에 따라, 사용자 원문 그대로)
  riseLines: [
    ['의미없는 발버둥을', '아무리 발악해봐야 너희는 곧 죽는다', '이런이런 그릇이 너무 강력해서 섭타룬의 힘을 저항하고 있는건가'],
    ['도대체 왜이렇게 끈질긴거야', '당장 죽어 갈기갈기 찢겨지라고'],
    ['그래 인정해주지 더이상 봐주는건 없다'],
  ],
  // 가재맨이 패턴 들어가기 전에 치는 대사(사용자 원문 그대로)
  gajaemanLines: { gj_mouse: '니애미따라가라', gj_swords: '너검없냐?', gj_knee: '넣을게~' },
  // 전투가 열리면 먼저 “마지막이다.”, C 를 누르면 억빠맨
  intro: [
    { voice: 'narrator', text: '* 마지막이다.' },
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
