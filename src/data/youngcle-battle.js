// 엄청대박인배 조종실 전투 — 사용자 브리핑(2026-09-17) 대사·퀴즈·상수. 원문 design/narrative/cutscenes/ship_battle.md
//   영클 hp 10. 아이디어(억빠맨 얼굴+전구 버튼)는 영클을 9대 때릴 때마다 한 번. 1 나람 볼(3 피해) → 2 오방순 트라우마 퀴즈(3 피해, 틀리면 스택 9→6) → 3 보지(방심: 3대 × 1 피해 → hp 1) → 피날레(쥰희 마이야르 점프슬램).
const YC = (text, expression = 'smirk', extra = {}) => ({ speaker: '영클', portrait: `youngcle_tv_${expression}`, voice: 'youngcle', text: '* ' + text, ...extra });
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ' + text, ...extra });
const G = (text, extra = {}) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* ' + text, ...extra });
const H = (text) => ({ speaker: '요플래', portrait: 'hyungsub', voice: 'hyungsub', text: '* ' + text });
const O = (text) => ({ speaker: '오방순', portrait: 'obangsun', voice: 'obangsun', text: '* ' + text });
const NA = (text) => ({ speaker: '나람이', portrait: 'naram', voice: 'naram', text: '* ' + text });
const J = (text) => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: '* ' + text });

export const YOUNGCLE_BATTLE = {
  hp: 10, ideaHits: 9, ideaRollback: 6, ideaDamage: 3, distractedDamage: 1, distractedHits: 3, damageStep: 10,
  sfx: { kieek: 'queen_hoot', punch: 'punch', boom: 'furnace_blast' },   // 놀람 = 델타룬 snd_queen_hoot_0(사용자 “퀸 호오”), 충돌 = snd_punchmed, 쿠와아아앙 = snd_punchheavythunder
  intro: [
    YC('후후후 안맞는다 게이들아', 'laugh'), YC('평생 공격들 피해주면서'), YC('나람이의 몸통박치기와 방순이의 음.. 그냥 사나운공격들 맞으면서'), YC('두려움에 떨다 죽어라 악당들', 'taunt'),
    P('... 뭔가 나람이랑 방순이의 공격을 이용하면'), P('어떻게든 뭘 할수있지않을까요..?'), G('어떻게??'), P('생각을 해봐야할거같아요'),
  ],
  ideaAdded: '* 억빠맨의 아이디어가 추가되었다.',
  idea1: {
    before: [P('나람이의 구르기는 강력하지만'), P('저걸 틩겨낼수있을거같아요'), G('어떻게?')],
    tada: [P('짜잔!'), G('...?'), P('자 나람아 들어와라')],
    ready: [P('저를 방향키로 조정해주세요 c를 누르면돌진하고 돌진을 맞춰서 나람이를 노려봐요!!'), '* 팽이 굴리듯 c로 나람이를 돌진해 맞추자.'],   // 나람이 들어온 뒤, 게임 시작 전(준비 시간)
    hits: 5, maxSeconds: 30,
    ball: { accel: 320, friction: 0.55, maxSpeed: 230, dash: 360, dashTime: 0.26, r: 16 },
    naram: { speed: 120, r: 22, knock: 280 },
  },
  idea2: {
    before: [P('방순이를 잘 이용해볼 수 있을거같아요.'), G('어떻게 그게 가능하지?'), P('야 오방순!'), O('흐어어 네???'), P('오방순의 트라우마를 건들만한 말을 해야될거같아요.'), P('각각의 선택지들중에 알맞는답들을 골라야할거같아요'), '* 오방순의 트라우마를 고르자.'],
    quiz: [
      { q: '1. 돈과 관련된건 뭐지?', a: ['컴퓨터 사기', '닌텐도 스위치 사기'], answer: 0 },   // 정답 컴퓨터 사기(사용자 정정 2026-09-17 — 폭언 대사 “컴퓨터 300주고 사기당한”과 일치)
      { q: '2. 그녀가 열등감을 갖고있는 여자는?', a: ['김디삼', '구블루'], answer: 0 },
      { q: '3. 그녀와 탐내는 남자는?', a: ['행복맨', '육북이'], answer: 0 },
      { q: '4. 그녀이 업적을 비판하려면?', a: ['똥이든성배 부정선거', '완벽한 우승'], answer: 0 },
    ],
    insult: [P('야 컴퓨터 300주고 사기당한 김디삼보다 훨 못생긴 행복맨 여자친구 똥이든성배 부정선거 븅신새끼!')],
    dots: ['hyungsub', 'gyeongsub', 'youngcle_hover', 'naram_giant'],   // 말풍선 ‘...’(대사 아님) — 억빠맨 빼고 모두
    berserk: [O('흐어어어 억빠맨 이 이중인격 싸이코 흐어어'), O('흐어어어어어어 싸이코야 싸이코')],
    after: [YC('소녀의 마음을 이용하다니', 'glare'), P('느금ㅋ'), YC('니앰', 'glare')],
  },
  idea3: {
    lines: [P('영클형이 방심할만한 주제가 뭐가있을까요?'), G('음.....'), G('보지?', { mosaic: { text: '지', block: 2 } }), P('오.'), P('영클형'), YC('ㅇㅇ?', 'question'), P('저기 보지')],
    look: YC('어디???', 'surprise'),
  },
  finale: {
    lines: [YC('ㅋㅋ 이럴줄알고 뒤통수에 피해절감 방어막을 달아뒀지 게이들아', 'laugh'), YC('공격을 피할수있다면 체력1로도 거뜬하다 이거야', 'taunt')],
    slam: J('마이야르 점프슬램!!!!!!!!!!!!'),
    crawlSteps: 5, crawlStep: -34, crawlSeconds: 0.5, crawlPause: 0.65, ground: 300, startX: 510,   // 오른쪽(영클 뒤통수 쪽)에서 왼쪽으로 기어온다
    junhee: 'assets/sprites/junhee_slam.png',
  },
};
