// 생각 길(jjajang_think) — 요플래 혼잣말 (BUILD245 사용자 브리핑 2026-09-19, 원문·구현표는 design/narrative/cutscenes/jjajang_think.md)
//   오른쪽으로 쭉 걷다가 가운데(34~35열)에서: 나레이션 4줄 → 요플래 느낌표 → 나레이션 6줄(“일단 오른쪽으로 쭉 가보자.”) → 끝. 한 번만. 브금은 지정 없음(그대로)
const N = text => ({ voice: 'narrator', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const PLAYER = 'player';

export const jjajang_think = [
  { if: flags => flags.think_done, goto: 'end' },
  N('아 근데 난 뭘 하고 있는거지'),
  N('궁극적으로는 난 다시 동료들과 합류해야한다.'),
  N('나의 위치를 알릴 수 있는 방법이 무엇이 있지?'),
  N('... ... ...'),
  close,
  // 요플래 느낌표 후
  { emote: PLAYER, kind: '!', duration: 1.0, hold: 0.55 },
  N('짜장숲의 깊은곳으로 들어가는곳을 봉인한 것은 아마도 영클일 것이다.'),
  N('그정도 지능이라면, 봉인이 풀렸을때도 감지할 수 있게 만들지 않았을까.'),
  N('봉인을 푸는건 위험할수도 있겠지만, 지금 선택지가 그거밖에 없는듯하다.'),
  N('어떻게하면 그 동상을 부술 수 있을까.'),
  N('...청소ㅂ.. 아니 아빠에게 조언을 구해야될 것 같다. 어디계시지'),
  N('일단 오른쪽으로 쭉 가보자.'),
  close,
  { set: { think_done: true } },
  { face: PLAYER, dir: 'right' },
  { label: 'end' },
  { end: true },
];
