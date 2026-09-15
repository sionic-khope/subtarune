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
import { YONGJUN_SHOP } from '../data/shops.js';
import { SHIP_ASSAULT, isShipPursuitMap } from '../data/ship-assault.js';

export const STAGES = [
  { id: 'start',          desc: '새 게임(타이틀)',                         map: 'room',   spawn: 'bed' },
  { id: 'opening_seen',   desc: '오프닝 끝 — 침대에서 일어남',               map: 'room',   spawn: 'up' },
  { id: 'pc_checked',     desc: '컴퓨터 확인: 코드 없음 → 방문 열림',        map: 'room',   spawn: 'door' },
  { id: 'living_entered', desc: '거실 첫 진입 컷신(엄마 없음)',              map: 'living', spawn: 'from_hall' },
  { id: 'cord_found',     desc: '티비 서랍에서 보라색 코드 ? 획득',           map: 'living', spawn: 'from_hall' },
  { id: 'void_fallen',    desc: '방송 중 코드 에러 → 소용돌이 → 보라색 땅에 추락', map: 'void',   spawn: 'fall' },
  // 다음 비트는 사용자 브리핑 후 여기에 추가 (예: cord_plugged)
];

const INDEX = new Map(STAGES.map((s, i) => [s.id, i]));

/** 납치 뒤 오브제 지역의 추격곡은 맵 이동·이어하기에서도 유지한다. */
export function storyBgm(mapId, flags) {
  if (mapId === 'youngcle1') return flags.youngcle_intro_done ? 'storage_show' : null;
  if ((flags.captain_attack_started || flags.captain_attack_done) && isShipPursuitMap(mapId)) return SHIP_ASSAULT.bgm;
  if (mapId === 'maillard_captain' && (flags.captain_mankatsuki_defeated || flags.captain_aftermath_done)) return null;
  if (mapId === 'maillard_captain' && flags.captain_reveal_done) return 'captain_mankatsuki';
  if (mapId === 'maillard_path' && flags.maillard_cart_done) return 'maillard_sunrise';
  if (mapId === 'obj5' && flags.obj5_chase_cleared) return 'baron_sea_battle';
  if (mapId === 'obj5' && flags.obj5_chase_started) return 'baron_intro';
  if (flags.obj4_abduction_done && ['obj0', 'obj1', 'obj2', 'obj3', 'obj4', 'obj5'].includes(mapId)) return 'baron_intro';
  // 편집노조 소개가 끝나면 무대 곡이 계속 흐른다(컷신 마지막 재큐 뒤 정지 없음). QA 점프·이어하기도 같은 곡, 파크 승리 뒤에는 컷신이 끈 대로 무음
  if (mapId === 'youngcle7' && flags.editor_union_stage_done && !flags.park_guardian_won) return 'editor_union_stage';
  // 비데 방: 입장 연출 전엔 무음, 연출이 시작되면 파크가디언 등장 곡이 깔리고 그 뒤로 계속(사용자 지시 2026-09-15). 보스전 뒤 귀환 연출(비데가 끌려감)부터는 다시 무음
  if (mapId === 'youngcle9' && flags.subrio_after_done) return null;
  if (mapId === 'youngcle9' && flags.bidet_arcade_done) return 'editor_union_stage';
  return undefined;
}

const PURSUIT_EXITS = { obj0: 'obj1', obj1: 'obj2', obj2: 'obj5', obj3: 'obj2', obj4: 'obj3', obj5: null };

/** 납치 추격 중에는 문으로 우회하거나 직전 구역으로 돌아갈 수 없다. */
export function storyExitScript(mapId, destination, flags) {
  if (flags.captain_attack_done && isShipPursuitMap(mapId) && SHIP_ASSAULT.pursuit[mapId] !== destination) return 'ship_pursuit_backtrack';
  if (!flags.obj4_abduction_done || flags.obj5_maillard_done) return undefined;
  if (Object.hasOwn(PURSUIT_EXITS, mapId) && PURSUIT_EXITS[mapId] !== destination) return 'chase_route_block';
  return undefined;
}

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

/**
 * 플래그 → 그 시점까지 실제 플레이로 쌓였을 상태(아이템·돈·버프). QA 지점은 flags 만 적고 나머지는 여기서 유도한다(devJump) —
 * 2026-09-11 사용자 "QA 점프도 바나나 2개·레드블루 버프 같은 상태를 최신화해야 인게임 문제를 놓치지 않는다".
 *   items    그 플래그가 서면 인벤토리에 있는 아이템(획득 순서)   with: 이 플래그도 서 있을 때만(먼지는 빠맨과 함께일 때만)
 *   enemies  그 플래그가 선 컷신 전투에서 잡은 적 → 돈(enemies.js money). 맵 위 몹(unless:'…_defeated')은 맵 데이터에서 자동으로 센다
 *   attack / hpBonus  버프
 * 새 아이템·컷신 전투·버프를 만들면 여기 한 줄 — tests/unit/qa-state.test.mjs 가 스크립트의 inventory.push / battle flag 와 대조한다.
 */
export const STATE_FROM_FLAGS = [
  { flag: 'cord_found',     items: ['보라색 코드 ?'] },                                     // 인트로 티비 서랍(3D) — scripts.js
  { flag: 'lever_taken',    items: ['열쇠?'] },                                             // 허공4 레버 열쇠 — void4_key.js
  { flag: 'chest9_opened',  items: ['먼지'], with: 'ppaman_joined' },                       // 허공9 빈 상자(빠맨과 함께일 때만) — void9_events.js
  { flag: 'teal3_cs_won',   items: ['바나나', '바나나'], enemies: ['cs_red', 'cs_blue'] },   // 청록숲3 첫 전투 + 상자 바나나 2 — teal3_toolbox.js
  { flag: 'button2_done',   items: ['바나나'] },                                             // 청록숲4 수상한 버튼 2 — teal4_events.js
  { flag: 'teal9_boss_won', enemies: ['red', 'blue'], attack: 2, hpBonus: 20 },             // 청록숲9 문지기 보스전 + 축복 버프 — teal9_boss.js
  { flag: 'obj2_banana_taken', items: ['바나나'] },                                          // 옵젝영역2 광장 바나나 — obj2_events.js
  { flag: 'obj4_baron_won', enemies: ['baron'] },
  { flag: 'obj5_gun_taken', items: ['나무총'] },
  { flag: 'maillard_tarts_given', items: ['에그타르트', '에그타르트'] },
  { flag: 'storage_viewer_defeated', enemies: ['expelled_viewer'] },
  { flag: 'captain_mankatsuki_defeated', enemies: ['mankatsuki_junhee'] },
  { flag: 'park_guardian_won', enemies: ['park_guardian'] },
  // 비데 방 도트마리오 버섯: 공격 +1(청록숲 축복 2 → 3, 상점 강화는 아래에서 +1), 최대 HP +20 — bidet_arcade.js
  { flag: 'bidet_arcade_done', attack: 3, hpBonus: 20 },
];
/**
 * flags 로 상태 유도. maps: { id: { entities } }(맵 위 몹 unless 플래그 → 돈), enemyMoney(id) → 원.
 * @returns { inventory: string[], money: number, attack: number, hpBonus: number }
 */
export function stateFromFlags(flags = {}, { maps = {}, enemyMoney = () => 30 } = {}) {
  const out = { inventory: [], money: 0, attack: 1, hpBonus: 0 };
  for (const r of STATE_FROM_FLAGS) {
    if (!flags[r.flag] || (r.with && !flags[r.with])) continue;
    if (r.items) out.inventory.push(...r.items);
    if (r.enemies) for (const id of r.enemies) out.money += enemyMoney(id);
    if (r.attack !== undefined) out.attack = r.attack;
    if (r.hpBonus) out.hpBonus += r.hpBonus;
  }
  for (const m of Object.values(maps)) for (const e of (m?.entities || [])) if (e.type === 'enemy' && e.unless && flags[e.unless]) for (const id of (e.enemies || [])) out.money += enemyMoney(id);
  for (const item of YONGJUN_SHOP) {
    if (!item.onceFlag || !flags[item.onceFlag]) continue;
    out.attack += item.stat?.attack || 0;
    out.hpBonus += item.stat?.hpBonus || 0;
    out.money -= item.price;
  }
  out.money = Math.max(0, out.money);
  return out;
}

/** 동료 가입 플래그 → 동료 id. QA 지점의 party 가 없으면 flags 에서 유도하고, 있으면 이 규칙과 맞는지 단위 테스트가 검사한다 (2026-09-10 상태 관리) */
export const PARTY_FLAGS = [['void11_done', 'gyeongsub'], ['ppaman_joined', 'ppaman']];   // 순서는 걷는 순서(경섭 → 빠맨)와 같게; 최종 순서는 normalizeParty 가 보장
export const partyFromFlags = (flags) => PARTY_FLAGS.filter(([f]) => flags?.[f]).map(([, id]) => id);

/**
 * QA 바로가기 지점 (URL ?qa=<id> 또는 타이틀에서 Q). 그 지점까지의 스토리 단계를 채우고 맵/스폰으로 보낸다.
 * 새 이벤트를 만들면 "그 이벤트 직전" 지점을 한 줄 추가한다.
 */
export const QA_POINTS = [
  { id: 'opening',   desc: '오프닝 끝, 방',                 stage: 'opening_seen',   map: 'room',   spawn: 'up' },
  { id: 'living',    desc: '거실 첫 진입',               stage: 'pc_checked',     map: 'living', spawn: 'from_hall' },
  { id: 'tv',        desc: '거실 티비 앞 (C→3D)',             stage: 'living_entered', map: 'living', spawn: 'tv' },
  { id: 'pc_stream', desc: '코드 획득 후 컴퓨터 앞 (C→방송)', stage: 'cord_found',     map: 'room',   spawn: 'pc' },
  { id: 'void',      desc: '보라맵1 도착',                          stage: 'void_fallen',    map: 'void',   spawn: 'fall' },
  { id: 'raft',      desc: '보라맵2, 뗏목 앞',                      stage: 'void_fallen',    map: 'void2',  spawn: 'dock' },
  { id: 'void3',     desc: '보라맵3 뗏목 퍼즐 입구',                  stage: 'void_fallen',    map: 'void3',  spawn: 'from_void2' },
  { id: 'void4',     desc: '보라맵4 긴 뗏목 입구',                    stage: 'void_fallen',    map: 'void4',  spawn: 'from_void3' },
  { id: 'void4_end', desc: '보라맵4 도착지(레버)',                    stage: 'void_fallen',    map: 'void4',  spawn: 'landing', flags: { void4_arrived: true } },
  { id: 'ppaman',    desc: '억빠맨 앞 (다리 내려옴, C→대화)',           stage: 'void_fallen',    map: 'void4',  spawn: 'pillar', flags: { void4_arrived: true, bridge_down: true } },
  { id: 'key',       desc: '억빠맨 동료, 잠긴 문 앞 (→레버 열쇠)',   stage: 'void_fallen',    map: 'void4',  spawn: 'landing', flags: { void4_arrived: true, bridge_down: true, ppaman_greeted: true, ppaman_joined: true }, party: ['ppaman'] },
  { id: 'rock1',     desc: '낙석 맵1 (3개)',                        stage: 'void_fallen',    map: 'void5',  spawn: 'from_void4', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true }, party: ['ppaman'] },
  { id: 'rock2',     desc: '낙석 맵2 (6개)',                        stage: 'void_fallen',    map: 'void6',  spawn: 'from_top', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true }, party: ['ppaman'] },
  { id: 'rock3',     desc: '낙석 맵3 (9개)',                        stage: 'void_fallen',    map: 'void7',  spawn: 'from_top', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true }, party: ['ppaman'] },
  { id: 'raft8',     desc: '보라맵8 점프 뗏목(억빠맨 수영)',          stage: 'void_fallen',    map: 'void8',  spawn: 'dock', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true }, party: ['ppaman'] },
  { id: 'void9',     desc: '보라맵9 뱀길(점프 뗏목 5개·움직이는 벽)',    stage: 'void_fallen',    map: 'void9',  spawn: 'dock', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true, void8_intro: true, void8_arrived: true, void8_done: true }, party: ['ppaman'] },
  { id: 'void10',    desc: '보라맵10 미로(쥰희·경섭 포탈 컷신, 표지판 5)',   stage: 'void_fallen',    map: 'void10', spawn: 'start', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true, void8_intro: true, void8_arrived: true, void8_done: true }, party: ['ppaman'] },
  { id: 'void11',    desc: '보라맵11 거대 나무(쥰희·경섭 → 경섭 합류)',      stage: 'void_fallen',    map: 'void11', spawn: 'start', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true, void8_intro: true, void8_arrived: true, void8_done: true, void10_intro: true }, party: ['ppaman'] },
  { id: 'teal1',     desc: '청록숲1 오른쪽 길(경섭 합류 후)',               stage: 'void_fallen',    map: 'teal1',  spawn: 'from_left', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true, void8_intro: true, void8_arrived: true, void8_done: true, void10_intro: true, void11_intro: true, void11_done: true }, party: ['gyeongsub', 'ppaman'] },
  { id: 'teal2',     desc: '청록숲2 나무 동상 벽·위로 가는 길',           stage: 'void_fallen',    map: 'teal2',  spawn: 'from_left', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true, void8_intro: true, void8_arrived: true, void8_done: true, void10_intro: true, void11_intro: true, void11_done: true }, party: ['gyeongsub', 'ppaman'] },
  { id: 'teal3',     desc: '청록숲3 숲 공터·공구상자(CS 등장)',            stage: 'void_fallen',    map: 'teal3',  spawn: 'from_bottom', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true, void8_intro: true, void8_arrived: true, void8_done: true, void10_intro: true, void11_intro: true, void11_done: true, statue_hit: true }, party: ['gyeongsub', 'ppaman'] },
  { id: 'teal4',     desc: '청록숲4 긴 길(이벤트 3·걸어다니는 CS)',           stage: 'void_fallen',    map: 'teal_east', spawn: 'from_left', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true, void8_intro: true, void8_arrived: true, void8_done: true, void10_intro: true, void11_intro: true, void11_done: true, statue_hit: true, teal3_battle_pending: true, teal3_cs_won: true, statues_cleared: true }, party: ['gyeongsub', 'ppaman'] },
  { id: 'teal5',     desc: '청록숲5 물길(뗏목·이단폭포 협동 2단 점프)',           stage: 'void_fallen',    map: 'teal5', spawn: 'from_left', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true, void8_intro: true, void8_arrived: true, void8_done: true, void10_intro: true, void11_intro: true, void11_done: true, statue_hit: true, teal3_battle_pending: true, teal3_cs_won: true, statues_cleared: true }, party: ['gyeongsub', 'ppaman'] },
  { id: 'teal6',     desc: '청록숲6 정글(칼날부리·늑대·두꺼비)',                  stage: 'void_fallen',    map: 'teal6', spawn: 'from_left', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true, void8_intro: true, void8_arrived: true, void8_done: true, void10_intro: true, void11_intro: true, void11_done: true, statue_hit: true, teal3_battle_pending: true, teal3_cs_won: true, statues_cleared: true, teal5_wall_seen: true, double_jump: true }, party: ['gyeongsub', 'ppaman'] },
  { id: 'teal7',     desc: '청록숲7 숨어서 엿듣기(쥰희·경섭·용준)',                stage: 'void_fallen',    map: 'teal7', spawn: 'from_left', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true, void8_intro: true, void8_arrived: true, void8_done: true, void10_intro: true, void11_intro: true, void11_done: true, statue_hit: true, teal3_battle_pending: true, teal3_cs_won: true, statues_cleared: true, teal5_wall_seen: true, double_jump: true }, party: ['gyeongsub', 'ppaman'] },
  { id: 'teal8',     desc: '청록숲8 정글 2(돌거북·바위게·대포미니언)',              stage: 'void_fallen',    map: 'teal8', spawn: 'from_left', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true, void8_intro: true, void8_arrived: true, void8_done: true, void10_intro: true, void11_intro: true, void11_done: true, statue_hit: true, teal3_battle_pending: true, teal3_cs_won: true, statues_cleared: true, teal5_wall_seen: true, double_jump: true, teal7_hide_seen: true, teal7_hide_done: true }, party: ['gyeongsub', 'ppaman'] },
  { id: 'teal9',     desc: '청록숲9 고대 사원 길(레드·블루 문지기 보스전)',           stage: 'void_fallen',    map: 'teal9', spawn: 'from_left', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true, void8_intro: true, void8_arrived: true, void8_done: true, void10_intro: true, void11_intro: true, void11_done: true, statue_hit: true, teal3_battle_pending: true, teal3_cs_won: true, statues_cleared: true, teal5_wall_seen: true, double_jump: true, teal7_hide_seen: true, teal7_hide_done: true }, party: ['gyeongsub', 'ppaman'] },
  { id: 'obj0',      desc: '옵젝영역0 얕은 물 일직선 길(문지기 통과 후, 발소리)',           stage: 'void_fallen',    map: 'obj0', spawn: 'from_left', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true, void8_intro: true, void8_arrived: true, void8_done: true, void10_intro: true, void11_intro: true, void11_done: true, statue_hit: true, teal3_battle_pending: true, teal3_cs_won: true, statues_cleared: true, teal5_wall_seen: true, double_jump: true, teal7_hide_seen: true, teal7_hide_done: true, teal9_boss_seen: true, teal9_boss_won: true }, party: ['gyeongsub', 'ppaman'] },
  { id: 'obj1',      desc: '옵젝영역1 쥰희·용준 대포 밀기 연출(도착 → 만남)',           stage: 'void_fallen',    map: 'obj1', spawn: 'from_left', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true, void8_intro: true, void8_arrived: true, void8_done: true, void10_intro: true, void11_intro: true, void11_done: true, statue_hit: true, teal3_battle_pending: true, teal3_cs_won: true, statues_cleared: true, teal5_wall_seen: true, double_jump: true, teal7_hide_seen: true, teal7_hide_done: true, teal9_boss_seen: true, teal9_boss_won: true, obj0_blue_done: true }, party: ['gyeongsub', 'ppaman'] },
  { id: 'obj1_push', desc: '옵젝영역1 만남 뒤 — 용준에게 말 걸면 C 연타 → 로켓 발사',       stage: 'void_fallen',    map: 'obj1', spawn: 'meet', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true, void8_intro: true, void8_arrived: true, void8_done: true, void10_intro: true, void11_intro: true, void11_done: true, statue_hit: true, teal3_battle_pending: true, teal3_cs_won: true, statues_cleared: true, teal5_wall_seen: true, double_jump: true, teal7_hide_seen: true, teal7_hide_done: true, teal9_boss_seen: true, teal9_boss_won: true, obj0_blue_done: true, obj1_meet_seen: true, obj1_junhee_gone: true }, party: ['gyeongsub', 'ppaman'] },
  { id: 'obj2',      desc: '옵젝영역2 광장(마나샘·귀환 발판·알·바나나, 동상 벽·바론 표지판)',   stage: 'void_fallen',    map: 'obj2', spawn: 'from_left', flags: { void4_arrived: true, bridge_down: true, ppaman_joined: true, lever_taken: true, door_open: true, void8_intro: true, void8_arrived: true, void8_done: true, void10_intro: true, void11_intro: true, void11_done: true, statue_hit: true, teal3_battle_pending: true, teal3_cs_won: true, statues_cleared: true, teal5_wall_seen: true, double_jump: true, teal7_hide_seen: true, teal7_hide_done: true, teal9_boss_seen: true, teal9_boss_won: true, obj0_blue_done: true, obj1_meet_seen: true, obj1_junhee_gone: true, obj1_launched: true }, party: ['gyeongsub', 'ppaman'] },
  { id: 'party',     desc: '억빠맨 동료 상태로 보라맵4',                stage: 'void_fallen',    map: 'void4',  spawn: 'pillar', flags: { void4_arrived: true, bridge_down: true, ppaman_greeted: true, ppaman_joined: true }, party: ['ppaman'] },
];

const obj2Checkpoint = QA_POINTS.find((point) => point.id === 'obj2');
for (const [id, desc, done, won] of [
  ['obj3', '옵젝영역3: 바론 둥지로 올라가는 짧은 물길', false, false],
  ['obj4', '옵젝영역4: 용준 대포 실패·바론 등장과 전투', false, false],
  ['obj4_battle', '옵젝영역4: 바론 전투 직전(위로 걸어 진입)', true, false],
  ['obj4_abduction', '옵젝영역4: 바론 처치 직후 용준 납치', true, true],
  ['obj4_after', '옵젝영역4: 바론 처치 후', true, true],
]) {
  QA_POINTS.push({ ...obj2Checkpoint, id, desc, map: id === 'obj3' ? 'obj3' : 'obj4', spawn: id === 'obj4_battle' ? 'scene' : 'from_bottom',
    flags: { ...obj2Checkpoint.flags, ...(done ? { obj4_baron_seen: true, obj4_baron_done: true } : {}), ...(won ? { obj4_baron_won: true } : {}), ...(id === 'obj4_after' ? { obj4_abduction_done: true, obj2_statues_cleared: true } : {}) }, party: [...obj2Checkpoint.party] });
}

const chaseCheckpoint = QA_POINTS.find((point) => point.id === 'obj4_after');
for (const [id, desc, started, cleared] of [
  ['obj5', '옵젝영역5: 해안 풀숲길·나무총 상자·뗏목 승선', false, false],
  ['obj5_sea', '바론 바다 추격: 용준·나무총 사격', true, false],
  ['obj5_after', '바론 바다 추격: 마이야르호 등장 직전', true, true],
]) {
  QA_POINTS.push({ ...chaseCheckpoint, id, desc, map: 'obj5', spawn: 'from_left',
    flags: { ...chaseCheckpoint.flags, ...(started ? { obj5_gun_taken: true, obj5_boarding_seen: true, obj5_chase_started: true } : {}), ...(cleared ? { obj5_chase_cleared: true } : {}) },
    party: [...chaseCheckpoint.party] });
}

const seaVictoryCheckpoint = QA_POINTS.find((point) => point.id === 'obj5_after');
QA_POINTS.push({ ...seaVictoryCheckpoint, id: 'maillard_deck', desc: '마이야르호: 선창 도착·용준과 대화',
  map: 'maillard_deck', spawn: 'arrival',
  flags: { ...seaVictoryCheckpoint.flags, obj5_maillard_done: true }, party: [...seaVictoryCheckpoint.party] });

const maillardDeckCheckpoint = QA_POINTS.find((point) => point.id === 'maillard_deck');
QA_POINTS.push({ ...maillardDeckCheckpoint, id: 'maillard_path', desc: '마이야르호: 일출 갑판 길',
  map: 'maillard_path', spawn: 'from_hold',
  flags: { ...maillardDeckCheckpoint.flags, maillard_hold_done: true }, party: [...maillardDeckCheckpoint.party] });

const maillardPathCheckpoint = QA_POINTS.find((point) => point.id === 'maillard_path');
QA_POINTS.push({ ...maillardPathCheckpoint, id: 'maillard_lounge', desc: '마이야르호: 라운지 입구',
  map: 'maillard_lounge', spawn: 'from_path',
  flags: { ...maillardPathCheckpoint.flags, maillard_cart_done: true, maillard_sunrise_seen: true },
  party: [...maillardPathCheckpoint.party] });

const maillardLoungeCheckpoint = QA_POINTS.find((point) => point.id === 'maillard_lounge');
for (const [id, desc] of [
  ['maillard_storage', '강퇴폐기창고'],
  ['maillard_saloon', '선장실로 가는 길'],
  ['maillard_captain', '마이야르호 선장실'],
]) {
  QA_POINTS.push({ ...maillardLoungeCheckpoint, id, desc, map: id, spawn: 'start',
    flags: { ...maillardLoungeCheckpoint.flags, ...((id === 'maillard_saloon' || id === 'maillard_captain') ? { shop_yongjun_cialis: true, shop_yongjun_vaseline: true } : {}),
      ...(id === 'maillard_captain' ? { maillard_eunbyeol_seen: true } : {}) }, party: [...maillardLoungeCheckpoint.party] });
}

const captainCheckpoint = QA_POINTS.find(point => point.id === 'maillard_captain');
QA_POINTS.push({ ...captainCheckpoint, id: 'captain_aftermath', desc: '만카츠키 승리 직후: 쥰희 회복·요플래의 과거',
  flags: { ...captainCheckpoint.flags, captain_reveal_started: true, captain_reveal_done: true, captain_mankatsuki_defeated: true },
  party: [...captainCheckpoint.party] });

const aftermathCheckpoint = QA_POINTS.find(point => point.id === 'captain_aftermath');
QA_POINTS.push({ ...aftermathCheckpoint, id: 'captain_attack', desc: '마이야르호 습격: 철 전함 등장',
  flags: { ...aftermathCheckpoint.flags, captain_aftermath_done: true }, party: [...aftermathCheckpoint.party] });
QA_POINTS.push({ ...aftermathCheckpoint, id: 'maillard_starboard_gate', desc: '습격 직후: 쥰희의 갑판 문 공사',
  map: 'maillard_saloon', spawn: 'from_captain',
  flags: { ...aftermathCheckpoint.flags, captain_aftermath_done: true, captain_attack_started: true, captain_attack_done: true },
  party: [...aftermathCheckpoint.party] });
QA_POINTS.push({ ...aftermathCheckpoint, id: 'maillard_starboard', desc: '마이야르호 오른쪽 갑판',
  map: 'maillard_starboard', spawn: 'from_saloon',
  flags: { ...aftermathCheckpoint.flags, captain_aftermath_done: true, captain_attack_started: true,
    captain_attack_done: true, maillard_starboard_open: true }, party: [...aftermathCheckpoint.party] });

const starboardCheckpoint = QA_POINTS.find(point => point.id === 'maillard_starboard');
QA_POINTS.push({ ...starboardCheckpoint, id: 'maillard_boarding', desc: '접현 광장: 쥰희·용준의 출발',
  map: 'maillard_boarding', spawn: 'from_starboard',
  flags: { ...starboardCheckpoint.flags }, party: [...starboardCheckpoint.party] });
QA_POINTS.push({ ...starboardCheckpoint, id: 'youngcle_bridge', desc: '엄청 대박인 배로 이어지는 철교',
  map: 'youngcle_bridge', spawn: 'from_boarding',
  flags: { ...starboardCheckpoint.flags, maillard_boarding_departed: true }, party: [...starboardCheckpoint.party] });

const bridgeCheckpoint = QA_POINTS.find(point => point.id === 'youngcle_bridge');
QA_POINTS.push({ ...bridgeCheckpoint, id: 'youngcle1', desc: '엄청 대박인 배: TV 첫 방송',
  map: 'youngcle1', spawn: 'from_bridge', flags: { ...bridgeCheckpoint.flags }, party: [...bridgeCheckpoint.party] });

const youngcleCheckpoint = QA_POINTS.find(point => point.id === 'youngcle1');
QA_POINTS.push({ ...youngcleCheckpoint, id: 'youngcle2', desc: '영클 공장: 꺾인 철제 연결로',
  map: 'youngcle2', spawn: 'left',
  flags: { ...youngcleCheckpoint.flags, youngcle_intro_done: true }, party: [...youngcleCheckpoint.party] });
QA_POINTS.push({ ...youngcleCheckpoint, id: 'youngcle3', desc: '영클 공장: 상자 밀기 튜토리얼',
  map: 'youngcle3', spawn: 'left',
  flags: { ...youngcleCheckpoint.flags, youngcle_intro_done: true }, party: [...youngcleCheckpoint.party] });
QA_POINTS.push({ ...youngcleCheckpoint, id: 'youngcle4', desc: '영클 공장: 우회 상자 밀기',
  map: 'youngcle4', spawn: 'left',
  flags: { ...youngcleCheckpoint.flags, youngcle_intro_done: true, youngcle3_crate_solved: true },
  party: [...youngcleCheckpoint.party] });

QA_POINTS.push({ ...youngcleCheckpoint, id: 'youngcle5', desc: '영클 공장: 두 상자 순서 퍼즐',
  map: 'youngcle5', spawn: 'left',
  flags: { ...youngcleCheckpoint.flags, youngcle_intro_done: true, youngcle3_crate_solved: true,
    youngcle4_circuit_solved: true },
  party: [...youngcleCheckpoint.party] });

const finalFactoryCheckpoint = QA_POINTS.find(point => point.id === 'youngcle5');
QA_POINTS.push({ ...finalFactoryCheckpoint, id: 'youngcle_cats', desc: '영클 공장: 섭냥이·경냥이와 마나샘',
  map: 'youngcle_cats', spawn: 'left',
  flags: { ...finalFactoryCheckpoint.flags, youngcle5_crate_solved: true },
  party: [...finalFactoryCheckpoint.party] });

const catsCheckpoint = QA_POINTS.find(point => point.id === 'youngcle_cats');
QA_POINTS.push({ ...catsCheckpoint, id: 'youngcle6', desc: '엄청 대박인 배: 중앙 TV 휴게실',
  map: 'youngcle6', spawn: 'left', flags: { ...catsCheckpoint.flags },
  party: [...catsCheckpoint.party] });
QA_POINTS.push({ ...catsCheckpoint, id: 'youngcle6_after_plan_b', desc: '엄청 대박인 배: 플랜B 납치 이후',
  map: 'youngcle6', spawn: 'left',
  flags: { ...catsCheckpoint.flags, youngcle_lounge_plan_b_done: true },
  party: [...catsCheckpoint.party] });

const planBCheckpoint = QA_POINTS.find(point => point.id === 'youngcle6_after_plan_b');
QA_POINTS.push({ ...planBCheckpoint, id: 'youngcle7', desc: '엄청 대박인 배: 편집노조 스테이지 진입',
  map: 'youngcle7', spawn: 'left', flags: { ...planBCheckpoint.flags },
  party: [...planBCheckpoint.party] });
QA_POINTS.push({ ...planBCheckpoint, id: 'youngcle7_after_intro', desc: '엄청 대박인 배: 편집노조 소개 이후',
  map: 'youngcle7', spawn: 'after_intro',
  flags: { ...planBCheckpoint.flags, editor_union_stage_done: true },
  party: [...planBCheckpoint.party] });
QA_POINTS.push({ ...planBCheckpoint, id: 'park_guardian_battle', desc: '편집노조: 파크가디언 전투 직전 (C)',
  map: 'youngcle7', spawn: 'battle_ready',
  flags: { ...planBCheckpoint.flags, editor_union_stage_done: true },
  party: [...planBCheckpoint.party] });

// 파크가디언 승리 후 연출 이후 (철창 닫힘, 오른쪽 통로 → youngcle8 → 비데 방 youngcle9)
const parkWonCheckpoint = QA_POINTS.find(point => point.id === 'park_guardian_battle');
const afterParkFlags = { ...parkWonCheckpoint.flags, park_guardian_won: true, park_guardian_aftermath_done: true };
// 승리 직후: 맵 enter(park_guardian_aftermath_enter)가 박치기·철창 연출을 바로 튼다
QA_POINTS.push({ ...parkWonCheckpoint, id: 'park_guardian_after', desc: '편집노조: 파크가디언 승리 후 연출 (박치기·철창)',
  map: 'youngcle7', spawn: 'battle_ready', flags: { ...parkWonCheckpoint.flags, park_guardian_won: true }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'park_guardian_after_grate', desc: '편집노조: 철창 닫힌 뒤 (오른쪽 통로)',
  map: 'youngcle7', spawn: 'after_intro', flags: { ...afterParkFlags }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'youngcle8', desc: '엄청 대박인 배: 무대 뒤 연결로 (마나샘)',
  map: 'youngcle8', spawn: 'left', flags: { ...afterParkFlags }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'youngcle9', desc: '엄청 대박인 배: 비데 게임 스크린 방 (입장 연출)',
  map: 'youngcle9', spawn: 'left', flags: { ...afterParkFlags }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'youngcle9_after', desc: '엄청 대박인 배: 비데가 토관에 들어간 뒤',
  map: 'youngcle9', spawn: 'inside', flags: { ...afterParkFlags, bidet_arcade_done: true }, party: [...parkWonCheckpoint.party] });
// 섭리오 보스 격파 뒤 귀환 연출: 맵 enter(bidet_arcade)가 subrio_cleared 만 선 상태면 토관 귀환 → 비데 복직 요구 → 도트마리오가 비데를 들고 무대 철문 폭파
QA_POINTS.push({ ...parkWonCheckpoint, id: 'subrio_after', desc: '엄청 대박인 배: 섭리오 보스 격파 뒤 귀환 연출 (도트마리오 철창 폭파)',
  map: 'youngcle9', spawn: 'inside', flags: { ...afterParkFlags, bidet_arcade_done: true, subrio_cleared: true }, party: [...parkWonCheckpoint.party] });
// 섭리오 1-4 따듯한비데 보스전 직행(사용자: Q 메뉴에서 바로): 방에 서자마자 지점 스크립트가 토관 진입 흐름으로 4스테이지를 연다
QA_POINTS.push({ ...parkWonCheckpoint, id: 'subrio_boss', desc: '섭리오: 1-4 따듯한비데 보스전 직행',
  map: 'youngcle9', spawn: 'inside', flags: { ...afterParkFlags, bidet_arcade_done: true }, party: [...parkWonCheckpoint.party], script: 'subrio_boss_qa' });
// 귀환 연출 뒤: 철창이 뚫린 무대 위 통로 → 윗길(마나샘). 다음 지역은 다음 브리핑
const afterSubrioFlags = { ...afterParkFlags, bidet_arcade_done: true, subrio_cleared: true, subrio_after_done: true, youngcle7_grate_blown: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'youngcle7_after_subrio', desc: '편집노조 무대: 철창 폭파 뒤 (위 통로 열림)',
  map: 'youngcle7', spawn: 'from_corridor', flags: { ...afterSubrioFlags }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'youngcle10', desc: '엄청 대박인 배: 무대 위 윗길 (마나샘)',
  map: 'youngcle10', spawn: 'from_stage', flags: { ...afterSubrioFlags }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'youngcle11', desc: '엄청 대박인 배: 무대 홀 입장 연출 (뚜울라 등장·불 켜짐)',
  map: 'youngcle11', spawn: 'from_below', flags: { ...afterSubrioFlags }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'stage_hall_after', desc: '엄청 대박인 배: 무대 홀 연출 뒤 (불 켜진 무대, 뚜울라 대기)',
  map: 'youngcle11', spawn: 'from_below', flags: { ...afterSubrioFlags, stage_hall_intro_done: true, stage_hall_lit: true }, party: [...parkWonCheckpoint.party] });
const hallDoneFlags = { ...afterSubrioFlags, stage_hall_intro_done: true, stage_hall_lit: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'backstage', desc: '엄청 대박인 배: 무대 뒷편 대기실 (뚜울라에게 C → 리듬 게임)',
  map: 'youngcle12', spawn: 'from_stairs', flags: { ...hallDoneFlags }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'rhythm_stage', desc: '리듬 게임 직행 (밴드 낙하 → 사운드 체크 → 방가방가 노앰토리 → 보X팜)',
  map: 'youngcle12', spawn: 'from_stairs', flags: { ...hallDoneFlags }, party: [...parkWonCheckpoint.party], script: 'rhythm_qa' });
// 공연 뒤 연출(검은 화면 나레이션 → 무대 위 대사 → 오른쪽 벽 뚫림 → 뚜울라 땅 파고 퇴장) / 뚫린 오른쪽 복도
QA_POINTS.push({ ...parkWonCheckpoint, id: 'stage_after_show', desc: '엄청 대박인 배: 공연 뒤 연출 (나레이션 → 무대 위 → 오른쪽 길)',
  map: 'youngcle12', spawn: 'from_stairs', flags: { ...hallDoneFlags, rhythm_stage_done: true }, party: [...parkWonCheckpoint.party], script: 'after_show_qa' });
const showDoneFlags = { ...hallDoneFlags, rhythm_stage_done: true, stage_show_done: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'youngcle13', desc: '용광로 복도 (무대 오른쪽 → 오른쪽 → 위 → 오른쪽 → 입구)',
  map: 'youngcle13', spawn: 'left', flags: { ...showDoneFlags }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'lava_raft', desc: '용암 수로: 입구 → 뗏목 옆에서 C → 컷신(형섭 걸어서 탑승·빠맨/경섭 용암에) → 한 줄 오른쪽',
  map: 'youngcle14', spawn: 'left', flags: { ...showDoneFlags }, party: [...parkWonCheckpoint.party] });
