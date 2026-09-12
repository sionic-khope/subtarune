// ─────────────────────────────────────────────────────────────
// 아이템 레지스트리 (2026-09-10 사용자: "아이템엔 중요 아이템과 그냥 아이템 — 전투에선 그냥 아이템(힐템 등)만 뜬다").
//   kind: 'key'(중요 — 스토리용, 전투·메뉴에서 못 씀) | 'plain'(그냥 — 소모품, 전투·메뉴에서 사용 가능: heal 만큼 HP 회복)
//   game.inventory 는 이름 문자열 배열(획득 순서). 이름은 획득 대사에 뜬 그대로('열쇠?', '보라색 코드 ?' 의 물음표 포함).
//   등록 안 된 이름은 'key' 로 보지만, tests/unit/items.test.mjs 가 스크립트에서 push 하는 이름이 전부 등록됐는지 검사한다.
//   레거시 정리(2026-09-10 사용자 "그 전에 얻을 수 있는 것들도"): 먼지 = HP 1 회복 그냥 아이템, 보라색 코드·열쇠들 = 중요 아이템.
// ─────────────────────────────────────────────────────────────
export const ITEMS = {
  '나무총': { kind: 'key', desc: '해안의 상자에서 챙긴 나무총. 바다에서 C를 눌러 쏜다.' },
  '보라색 코드 ?': { kind: 'key', desc: '방송 중 서랍에서 찾은 보라색 코드. 뭔가 에러가 났었다.' },   // 인트로 티비 서랍(3D) — src/data/scripts.js
  '낡은 열쇠':     { kind: 'key', desc: '상자에서 나온 낡은 열쇠.' },                                    // 인트로 상자 — src/data/scripts.js
  '열쇠?':         { kind: 'key', desc: '억빠맨이 뽑아 온 레버. 열쇠로 쓴다.' },                         // 허공4 잠긴 문 — void4_key.js
  '먼지':          { kind: 'plain', heal: 1, desc: '상자 안에 있던 먼지. HP 1 회복.' },                  // 허공9 빈 상자 — void9_events.js (사용자: 먼지는 hp 1 회복)
  '바나나':        { kind: 'plain', heal: 30, desc: '포타슘. HP 30 회복.' },                              // 청록숲3 상자 2개, 청록숲4 버튼/껍질 — teal3_toolbox.js, teal4_events.js
};
export const itemKind = (name) => ITEMS[name]?.kind || 'key';
export const plainItems = (inventory) => inventory.filter((n) => itemKind(n) === 'plain');
export const keyItems = (inventory) => inventory.filter((n) => itemKind(n) !== 'plain');
