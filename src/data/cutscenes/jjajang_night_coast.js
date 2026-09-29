const bridge = (flag, camera) => Object.assign([
  { if: flags => flags[flag], goto: 'done' },
  { sfx: 'click' },
  { action: game => {
    const lever = game.entities.find(entity => entity.id === `${flag}_off`);
    if (lever) lever.image = game.propImages['assets/props/lever_on.png'];
  } },
  { camera, duration: 0.7 },
  { sfx: 'rumble' },
  { tiles: flag },
  { set: { [flag]: true } },
  { shake: 0.25, amp: 2 },
  { camera: 'player', duration: 0.7 },
  { label: 'done' },
  { end: true },
], { silent: true });

export const NIGHT_COAST_SCRIPTS = Object.fromEntries([
  // BUILD405: 해안마다 레버 하나(사용자 “퍼즐도 몇 개 빼고”)
  ['night_coast1_a', [63, 9]], ['night_coast2_a', [65, 9]], ['night_coast3_a', [56, 9]],
].map(([flag, camera]) => [flag, bridge(flag, camera)]));

NIGHT_COAST_SCRIPTS.night_coast_entry = Object.assign([
  { speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* 뭔가 좆같아지긴했는데 뭐랄까 떨리네요' },
  { speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* 난 모르게겠고 1500을.. 받아야겠어' },
  { speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ... 그렇죠' },
], { silent: true });

const P = (at, text) => ({ at, speaker: '억빠맨', voice: 'ppaman', text: `* ${text}` });
const K = (at, text) => ({ at, speaker: '경섭', voice: 'gyeongsub', text: `* ${text}` });
export const NIGHT_COAST_CHAT = {
  jjajang_night_coast1: [
    // BUILD410(사용자 “대사 간격이 너무 짧다, 두 개 정도 더”): 길 전체에 고르게 + 두 줄 추가(형 배 / 1500 국밥)
    P(0.025, '와 달 지리네요'), K(0.08, '나도 처음에 와서 놀랐어'),
    P(0.22, '바람이 시원해요'), K(0.36, '미스는 어쩌다 그렇게 된걸까'),
    P(0.42, '저도 잘..'), K(0.56, '걱정하지마 어떻게든 될거야'),
    P(0.72, '형 근데 배는 안고파요?'), K(0.8, '1500 받으면 국밥 먹자'),
  ],
  jjajang_night_coast2: [
    P(0.025, '뭔가 좆같음은 늘었는데 살짝 떨리네요'), K(0.09, '무슨뜻이야?'),
    P(0.28, '뭐랄까 그냥 쉽지않은 싸움이 될거같은.'), K(0.4, '허허 걱정하지마라'),
    P(0.62, '근데 이 레버들은 누가 다 만들어둔거에요'), K(0.72, '몰라 친절한 사람이겠지'),
  ],
  jjajang_night_coast3: [
    P(0.025, '뭔가 여행의 끝이 보이는거같네요'), K(0.08, '허허 어찌저찌 여기까지 왔네'),
    P(0.22, '아 물론 최미스 족친다고 끝은 아니죠'), K(0.3, '그렇긴하지'),
    P(0.46, '그냥 뭐랄까 즐거웠어요'), K(0.53, '허허 나도'),
    K(0.72, '끝나면 다같이 고기나 먹으러 가자'), P(0.8, '형이 사는거죠?'), P(0.97, '치료하고가죠'),
  ],
};
