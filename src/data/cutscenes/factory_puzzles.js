const PP = (text) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text });
const GS = (text) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text });

export const youngcle3_crate_intro = [
  { if: (flags) => flags.youngcle3_crate_solved || flags.youngcle3_crate_intro_seen, goto: 'done' },
  { face: 'ppaman', dir: 'toward:youngcle3_crate' },
  { camera: [6, 8.5], duration: 0.35 },
  PP('* 형 이거 밀어서 저 표시된 데까지\n* 올려야 될 거 같네요.'),
  { face: 'ppaman', dir: 'toward:youngcle3_plate' },
  { camera: [8, 8], duration: 0.4 },
  PP('* 상자 앞에서 상자를 향해 C를 누르면 한 칸씩 밀 수 있어요.'),
  { face: 'ppaman', dir: 'toward:youngcle3_gate' },
  { camera: [14, 8], duration: 0.4 },
  PP('* 저기 올리면 앞문도 열릴 거예요.'),
  { camera: 'player' },
  { set: { youngcle3_crate_intro_seen: true } },
  { end: true },
  { label: 'done' },
  { end: true },
];

export const youngcle3_crate_sign = [
  { text: '* [화물문 안내]\n* 철 상자를 빛나는 표식 위에 올린다.', voice: 'narrator' },
  { text: '* 상자를 향해 C를 누르면 한 칸씩 민다.\n* 막히면 주황색 초기화 장치를 누른다.', voice: 'narrator' },
];

export const youngcle4_crate_sign = [
  { text: '* [우회 운반 구역]\n* 상자는 당길 수 없다.', voice: 'narrator' },
  { text: '* 상자를 향해 C를 눌러 한 칸씩 밀고,\n* 철벽 반대편으로 돌아갈 길을 확보할 것.', voice: 'narrator' },
];

export const youngcle5_crate_sign = [
  { text: '* [복수 화물 검사]\n* 상자 두 개를 표식 두 곳에 하나씩.', voice: 'narrator' },
  { text: '* 상자를 향해 C를 누르면 한 칸씩 민다.\n* 초기화 장치는 두 상자를 함께 되돌린다.', voice: 'narrator' },
];

export const youngcle5_crate_complete = [
  PP('* ...'),
  GS('* 빠맨아 왜?'),
  PP('* 제작자가 김형섭 맞춤 퍼즐난이도 조정 ㅈㄴ 잘한거같아서 감탄중이에요'),
  GS('* 개추 ㅋㅋㅋ'),
  { text: '* ㅅㅂ년들이', voice: 'narrator' },
];

export const youngcle_crate_reset = [
  { text: '* 철 상자를 처음 자리로 돌렸다.', voice: 'narrator' },
];

export const youngcle_crate_done = [
  { text: '* 제어문은 이미 열려 있다.', voice: 'narrator' },
];
