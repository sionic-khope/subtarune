// ─────────────────────────────────────────────────────────────
// 파티(동료) 구성 — 어떤 조합이든(형섭만 / 형섭+경섭 / 형섭+빠맨 / 셋) 이 한 곳을 거쳐 같은 모양이 된다 (사용자 2026-09-10 "상태관리 유연하게").
//   game.party 는 동료 id 배열(주인공 형섭은 넣지 않는다). 세이브·QA·가입/이탈·이어하기 전부 normalizeParty 를 통과한다.
//   순서 = characters.js PARTY_ORDER (걷는 순서: 경섭 → 빠맨). 모르는 id·중복·주인공은 버린다.
// ─────────────────────────────────────────────────────────────
import { CHARACTERS, PARTY_ORDER } from '../data/characters.js';

const rank = (id) => { const i = PARTY_ORDER.indexOf(id); return i < 0 ? 99 : i; };

/** 아는 동료만, 중복 없이, 걷는 순서로 */
export function normalizeParty(list, leader = 'hyungsub') {
  const seen = new Set();
  return (list || []).filter((id) => typeof id === 'string' && id !== leader && !!CHARACTERS[id] && !seen.has(id) && seen.add(id)).sort((a, b) => rank(a) - rank(b));
}
/** 주인공 + 동료 (메뉴·전투 세로 순서) */
export const fullParty = (party, leader = 'hyungsub') => [leader, ...normalizeParty(party, leader)];
