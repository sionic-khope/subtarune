// 석상 앞 숲(jjajang_statue) — 석상에 C: 청소부의 짜장숲 이야기 (BUILD228 사용자 브리핑 2026-09-19, 원문·구현표는 design/narrative/cutscenes/jjajang_statue.md)
//   (석상은 막혀 있다) 브금 끔 → 둘 다 뒤로 한 칸 → 위를 본다 → 카메라를 위로 올려 석상 전체가 대화창 위에 들어온다 → 대사(껄껄 두 곳 뒤 웃음) → 카메라·브금 복귀
const C = text => ({ speaker: '청소부', portrait: 'janitor', voice: 'janitor', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const laugh = () => ({ motion: JANITOR, name: 'laugh', sfx: 'laugh_janitor' });
const PLAYER = 'player';
const JANITOR = 'janitor';
// 카메라 목표(타일 단위, cutscene camera 노드: 카메라 위 = ty*32-164): 석상 그림(맵 jjajang_statue: 밑변 224, 높이 177 → 위 47)의 위쪽 6px 여유 → 카메라 위 41.
// 요플래(한 칸 물러선 뒤 발 286)는 머리부터 발까지 대화창(248) 위에 남는다
export const STATUE_VIEW = [28.5, 205 / 32];

export const jjajang_statue_talk = [
  { if: flags => flags.jjajang_statue_told || !flags.torii_janitor_joined, goto: 'end' },
  { bgm: null, fadeOut: 0.5 },
  // 둘 다 뒤로(아래로) 한 칸 물러선다 — by 는 16px 아트 단위(×2) → 16 = 한 칸 32px
  { parallel: [{ move: PLAYER, by: [0, 16], speed: 60 }, { move: JANITOR, by: [0, 16], speed: 60 }] },
  { face: PLAYER, dir: 'up' },
  { face: JANITOR, dir: 'up' },
  { camera: STATUE_VIEW, duration: 0.8 },
  { wait: 0.3 },
  C('여기 숲은'),
  C('{c=yellow}짜장숲{/c} 이라고 하네'),
  C('그리고 짜장숲 깊은곳에는'),
  C('누군가의 {c=purple}어둠의 힘{/c}에 잠식당하면'),
  C('아주 강력해지는 괴물이 될수있는 그릇의 인간이 살고있다는 말이 있네'),
  C('그래서 어떤 눈이 하나인 똑똑한 친구가 여기에'),
  C('그를 봉인하고 이 동상을 깔아뒀다하지'),
  C('껄껄'),
  laugh(),
  C('아마 그는 안에서 자기혼자 왕국을 구축하려는 카더라도 있던거같던데 흠'),
  C('그런데 문제가 하나 있네'),
  C('그 어둠의 힘은 누군가가 부여하는것인데'),
  C('그것은 꼭 다른 방식으로도 전달될수있다네 받거나, 뭐 먹거나, 마시거나'),
  C('그리고 문제는'),
  C('이 숲 어딘가에 그 힘을 받은 짜장면이 존재한다고하네'),
  C('그 힘을 그 위험인물이 받게되면'),
  C('껄껄 너무 지나친 생각이였나.'),
  laugh(),
  C('문제가 하나 더 있네'),
  C('이 동상을 깔게 된 순간 바다에 잠식해있던'),
  C('어떠한 악마가.'),
  C('이 숲에서 활동하기 시작했네'),
  C('... 드럼통의 악마라고 하지'),
  C('조심하게 그는 잔혹하고 강력하네'),
  C('내가 유일하게 제대로 기억하는'),
  C('미안하네 뭐 말이 너무 많았지 일단 이 동상때문에 지나갈 수 없으니'),
  C('오른쪽으로 가보는건 어떻겠나'),
  close,
  { set: { jjajang_statue_told: true } },
  { camera: 'player' },
  { action: game => game.resumeMapBgm() },
  { regroup: true },
  { label: 'end' },
  { end: true },
];
