// 벚꽃 숲(jjajang_sakura, BUILD261 사용자 브리핑 2026-09-20, 원문 design/narrative/cutscenes/jjajang_sakura.md)
//   넓은 풀숲 초입 트리거(한 번) → 플래그 sakura_bloom → game.bloom(): 꽃잎이 한꺼번에 쏟아지고 주인공이 선 행에서부터 땅('(' → ')')과 소나무(벚꽃 판)가 번지듯 바뀐다.
//   "딱히 막 뭐 정지할필요없고 맵 자체가 조건부로 변하는느낌" — 대사·정지 없이 바로 끝난다(end). 재진입 땐 changeMap 이 플래그로 처음부터 핀 상태.
export const SAKURA_BLOOM_FLAG = 'sakura_bloom';

export const jjajang_sakura_bloom = [
  { set: { [SAKURA_BLOOM_FLAG]: true } },
  { action: game => game.bloom() },
  { end: true },
];
