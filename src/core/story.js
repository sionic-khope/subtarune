// ─────────────────────────────────────────────────────────────
// 스토리 진행 상태 (단일 진실 원천).
//
// 규칙
//  1. 스토리는 STAGES 순서대로만 나아간다. 뒤 단계에 도달하면 앞 단계 플래그가 전부 자동으로 선다(backfill).
//     → "코드를 얻었는데 컴퓨터가 '코드 어딨지' 초기 대사를 다시 한다" 같은 순서 꼬임이 구조적으로 불가능.
//  2. 단계 id 는 그대로 flags 의 키다. 스크립트·문·소품은 flags 만 보면 된다 (`game.has('pc_checked')`).
//  3. 단계를 올리는 유일한 통로는 `game.setFlag(id)` (스크립트 `{stage:'id'}` / `{set:{id:true}}`, 트리거 flag,
//     맵 enter.flag, scene3d flag, 개발용 ?map= / ?stage=). 직접 `flags[x]=true` 로 쓰지 않는다.
//  4. 단계 외의 작은 상태(에그타르트 먹음, 바세린)는 그냥 플래그(side flag) — 순서와 무관.
//
// 새 스토리 비트 추가: STAGES 에 한 줄(id, 설명, 그 시점의 맵/스폰) → 스크립트에서 `{ stage:'id' }`.
// ─────────────────────────────────────────────────────────────
export const STAGES = [
  { id: 'start',          desc: '새 게임(타이틀)',                         map: 'room',   spawn: 'bed' },
  { id: 'opening_seen',   desc: '오프닝 끝 — 침대에서 일어남',               map: 'room',   spawn: 'up' },
  { id: 'pc_checked',     desc: '컴퓨터 확인: 코드 없음 → 방문 열림',        map: 'room',   spawn: 'door' },
  { id: 'living_entered', desc: '거실 첫 진입 컷신(엄마 없음)',              map: 'living', spawn: 'from_hall' },
  { id: 'cord_found',     desc: '티비 서랍에서 보라색 코드 ? 획득',           map: 'living', spawn: 'from_hall' },
  // 다음 비트는 사용자 브리핑 후 여기에 추가 (예: cord_plugged)
];
const INDEX = new Map(STAGES.map((s, i) => [s.id, i]));

/** 스토리 단계. flags 객체를 공유해서 단계 도달 = 플래그 세팅. */
export class Story {
  constructor(flags) { this.flags = flags; this.index = 0; }
  static isStage(id) { return INDEX.has(id); }
  static stageOf(id) { return STAGES[INDEX.get(id)]; }
  get stage() { return STAGES[this.index].id; }
  get def() { return STAGES[this.index]; }
  indexOf(id) { const i = INDEX.get(id); if (i === undefined) console.warn('[story] 모르는 단계', id); return i ?? -1; }
  atLeast(id) { return this.index >= this.indexOf(id); }
  before(id) { return this.index < this.indexOf(id); }
  is(id) { return this.stage === id; }
  /** 단계 도달. 앞 단계 플래그를 전부 채우고, 이미 지난 단계면 아무것도 안 한다(되돌아가지 않음). 올라갔으면 true */
  advance(id) {
    const i = this.indexOf(id); if (i < 0) return false;
    const up = i > this.index;
    if (up) this.index = i;
    for (let k = 0; k <= this.index; k++) this.flags[STAGES[k].id] = true;
    return up;
  }
  /** 저장/불러오기용 */
  toJSON() { return { stage: this.stage }; }
  load(data) { this.index = 0; if (data?.stage) this.advance(data.stage); }
  reset() { this.index = 0; }
}
