// ─────────────────────────────────────────────────────────────
// 아이템 레지스트리 (2026-09-10 전투 브리핑: "아이템엔 중요 아이템과 그냥 아이템 — 전투에선 그냥 아이템(힐템 등)만 뜬다. 지금은 아무것도 없음").
//   kind: 'key'(중요 — 스토리용, 전투에서 안 보임) | 'plain'(그냥 — 소모품, 전투에서 사용 가능)
//   game.inventory 는 아직 이름 문자열 배열. 등록 안 된 이름은 'key' 로 본다. (아이템 시스템 전체 손질은 다음 브리핑)
// ─────────────────────────────────────────────────────────────
export const ITEMS = {
  '열쇠?': { kind: 'key', desc: '억빠맨이 뽑아 온 레버. 열쇠로 쓴다.' },
  '먼지':  { kind: 'key', desc: '상자 안에 있던 먼지.' },
  // 예) '바나나': { kind: 'plain', heal: 20, desc: '포타슘.' }
};
export const itemKind = (name) => ITEMS[name]?.kind || 'key';
export const plainItems = (inventory) => inventory.filter((n) => itemKind(n) === 'plain');
