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
  { id: 'ship_ending_done', desc: '변신 영클 승리 뒤 통로 공개 · 라운지로', map: 'youngcle20', spawn: 'from_lounge' },
  { id: 'ship_castle_done', desc: '가재맨의 성 출현 · 요플래 바다 추락', map: 'ship_lounge', spawn: 'castle_approach' },
  { id: 'ship_sinking_done', desc: '가재맨 기억 회상 뒤 짜장섬 해안에 홀로 도착', map: 'jjajang_shore', spawn: 'washed_up' },
];

const INDEX = new Map(STAGES.map((s, i) => [s.id, i]));

/** 납치 뒤 오브제 지역의 추격곡은 맵 이동·이어하기에서도 유지한다. */
// 짜장섬: 청소부(허약) 합류 컷신이 튼 wise_words 는 토리이 길에 남고, 사용자 지정 곡 my_castle_town(RKQUblO-iCs)은 **다음 맵(검은 소나무 숲)부터**(BUILD226 사용자 “아니다 그냥 다음 맵부터 나게 해줘”).
//   그 뒤 맵들은 같은 이름을 돌려줘 맵을 옮겨도 playBgm 이 다시 틀지 않는다(“다음 맵으로 갔을 때 브금 다시 재생되게 ㄴㄴ”)
export const JJAJANG_AFTER_JOIN_MAPS = ['jjajang_bend', 'jjajang_walk', 'jjajang_pines', 'jjajang_statue', 'jjajang_run', 'jjajang_run2', 'jjajang_drum', 'jjajang_chin1', 'jjajang_chin2', 'jjajang_think', 'jjajang_bend2'];   // 드럼통 길부터는 청소부가 떠난 뒤에도 브금은 이어진다(지정 없음 → 직전 상태 유지)
export function storyBgm(mapId, flags) {
  if (flags.torii_janitor_joined && mapId === 'jjajang_torii') return 'wise_words';
  // 소나무 숲 공터: 아짐키야 연출이 시작되면 무음(컷신이 끈 대로), 이기면 다시 my_castle_town(BUILD227)
  if (mapId === 'jjajang_pines' && flags.pines_center_started && !flags.pines_ajimkiya_won) return null;
  if (flags.torii_janitor_joined && JJAJANG_AFTER_JOIN_MAPS.includes(mapId)) return 'my_castle_town';
  if (mapId === 'youngcle20' && (flags.ship_tvform_won || flags.ship_ending_done)) return null;
  if (mapId === 'youngcle1') return flags.youngcle_intro_done ? 'storage_show' : null;
  // 조종실: 보스전 뒤 연출(가재맨 → 영클 변신)이 끝나면 선장실 변신 뒤와 같은 곡이 흐른다(BUILD211)
  if (mapId === 'youngcle20' && flags.ship_aftermath_done) return 'captain_mankatsuki';
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
  { flag: 'cord_found',     items: ['보라색 코드 ?'], unless: 'ship_castle_cord_stolen' },
  { flag: 'lever_taken',    items: ['열쇠?'] },                                             // 허공4 레버 열쇠 — void4_key.js
  { flag: 'chest9_opened',  items: ['먼지'], with: 'ppaman_joined' },                       // 허공9 빈 상자(빠맨과 함께일 때만) — void9_events.js
  { flag: 'teal3_cs_won',   items: ['바나나', '바나나'], enemies: ['cs_red', 'cs_blue'] },   // 청록숲3 첫 전투 + 상자 바나나 2 — teal3_toolbox.js
  { flag: 'button2_done',   items: ['바나나'] },                                             // 청록숲4 수상한 버튼 2 — teal4_events.js
  { flag: 'teal9_boss_won', enemies: ['red', 'blue'], attack: 2, hpBonus: 20 },             // 청록숲9 문지기 보스전 + 축복 버프 — teal9_boss.js
  { flag: 'obj2_banana_taken', items: ['바나나'] },                                          // 옵젝영역2 광장 바나나 — obj2_events.js
  { flag: 'obj4_baron_won', enemies: ['baron'] },
  { flag: 'obj5_gun_taken', items: ['나무총'] },
  { flag: 'jjajang_rock_taken', items: ['돌'] },
  { flag: 'pines_ajimkiya_won', enemies: ['ajimkiya1', 'ajimkiya2', 'ajimkiya3'] },
  { flag: 'jjajang_chin1_chin_defeated', enemies: ['chinchilla'] },                                                       // 찢칠라 길 1·2 필드 조우(각 18원) — jjajang_chin.js
  { flag: 'jjajang_chin2_mun_defeated', enemies: ['munkorita'] },
  { flag: 'drum_devil_won', enemies: ['drum_devil'] },                                                                   // 드럼통 둥지 보스전(돈 0) — drum_devil.js, 승리 뒤 연출 jjajang_nest_after.js(BUILD254)                                                       // 찢칠라 길 2 의 적은 문코리타(BUILD248 사용자 “두번째 찢칠라를 얘로”)                                       // 소나무 숲 공터 아짐키야 3인조(합 10원) — jjajang_pines.js                                             // 짜장 굽이 길 돌(체력회복 -5) — jjajang_bend.js
  { flag: 'maillard_tarts_given', items: ['에그타르트', '에그타르트'] },
  { flag: 'storage_viewer_defeated', enemies: ['expelled_viewer'] },
  { flag: 'captain_mankatsuki_defeated', enemies: ['mankatsuki_junhee'] },
  { flag: 'park_guardian_won', enemies: ['park_guardian'] },
  { flag: 'ship_tvform_won', enemies: ['youngcle_tvform'] },
  // 비데 방 도트마리오 버섯: 공격 +1(청록숲 축복 2 → 3, 상점 강화는 아래에서 +1), 최대 HP +20 — bidet_arcade.js
  { flag: 'bidet_arcade_done', attack: 3, hpBonus: 20 },
  { flag: 'sakura5_duo_won', enemies: ['domijorim', 'dohyun'] },                                                          // 벚꽃 숲 5 공터 도미조림·도현 전투(각 45원) — jjajang_sakura5.js(BUILD276)
];
/**
 * flags 로 상태 유도. maps: { id: { entities } }(맵 위 몹 unless 플래그 → 돈), enemyMoney(id) → 원.
 * @returns { inventory: string[], money: number, attack: number, hpBonus: number }
 */
export function stateFromFlags(flags = {}, { maps = {}, enemyMoney = () => 30 } = {}) {
  const out = { inventory: [], money: 0, attack: 1, hpBonus: 0 };
  for (const r of STATE_FROM_FLAGS) {
    if (!flags[r.flag] || (r.with && !flags[r.with]) || (r.unless && flags[r.unless])) continue;
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
// 침몰 뒤 짜장섬은 요플래 단독 → 토리이 길에서 청소부(허약)가 합류하면 청소부만(BUILD226)
export const partyFromFlags = (flags) => flags?.ship_sinking_done
  ? (flags?.sakura8_split_done ? []                                             // 벚꽃 숲 8 갈림목(sakura8_split_done, BUILD282): 경섭 혼자 떠나고 억빠맨은 오른쪽 길 가드 → 다시 요플래 혼자
    : flags?.party_regrouped ? ['gyeongsub', 'ppaman']                          // 드럼통의 악마 뒤 동상 앞에서 억빠맨·경섭 재합류(party_regrouped, BUILD254)
    : flags?.torii_janitor_joined && !flags?.janitor_left ? ['janitor'] : [])   // 드럼통 길에서 이별(janitor_left, BUILD242)하면 다시 요플래 혼자
  : PARTY_FLAGS.filter(([flag]) => flags?.[flag]).map(([, id]) => id);

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
QA_POINTS.push({ ...parkWonCheckpoint, id: 'lava_raft', desc: '용암 수로: 입구 → 뗏목 옆에서 C → 컷신(형섭 걸어서 탑승·빠맨/경섭 용암에) → 오른쪽 구간',
  map: 'youngcle14', spawn: 'left', flags: { ...showDoneFlags }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'lava_raft_up', desc: '용암 수로: 위로 가는 두 번째 뗏목 앞(착지 바닥)',
  map: 'youngcle14', spawn: 'landing', flags: { ...showDoneFlags, lava_raft_intro_done: true, raft14a_boarded: true, double_jump: true, raft_raft14a: 1 }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'lava_raft_top', desc: '용암 수로: 위 착지에서 다시 오른쪽으로 가는 세 번째 뗏목 앞',
  map: 'youngcle14', spawn: 'top', flags: { ...showDoneFlags, lava_raft_intro_done: true, raft14a_boarded: true, double_jump: true, raft_raft14a: 1, raft_raft14b: 1 }, party: [...parkWonCheckpoint.party] });
// 용광로 화물 검사실(BUILD193): 용암 수로를 다 건넌 상태. 3상자 퍼즐 두 방(25회 → 31회)
const lavaDoneFlags = { ...showDoneFlags, lava_raft_intro_done: true, raft14a_boarded: true, double_jump: true, raft_raft14a: 1, raft_raft14b: 1, raft_raft14c: 1 };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'youngcle15', desc: '용광로 화물 검사실 1: 상자 셋 (최소 25회)',
  map: 'youngcle15', spawn: 'left', flags: { ...lavaDoneFlags }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'youngcle16', desc: '용광로 화물 검사실 2: 상자 셋 (최소 31회)',
  map: 'youngcle16', spawn: 'left', flags: { ...lavaDoneFlags, youngcle15_crate_solved: true }, party: [...parkWonCheckpoint.party] });
// 용광로 마나샘 갈림길·광장(BUILD196): 검사실 둘을 푼 상태
const crateDoneFlags = { ...lavaDoneFlags, youngcle15_crate_solved: true, youngcle16_crate_solved: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'youngcle17', desc: '용광로 마나샘 갈림길 (오른쪽 → 가운데 위, 마나샘)',
  map: 'youngcle17', spawn: 'left', flags: { ...crateDoneFlags }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'youngcle18', desc: '용광로 광장 도착 연출 (영클 TV·밧줄 철창·규칙)',
  map: 'youngcle18', spawn: 'bottom', flags: { ...crateDoneFlags }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'youngcle18_after', desc: '용광로 광장: 연출 뒤 (패널 앞, 철창 매달림)',
  map: 'youngcle18', spawn: 'front', flags: { ...crateDoneFlags, furnace_arena_intro_done: true }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'furnace_color', desc: '색깔 기억 게임 직행 (1인칭 패널 · 영클 TV 색 호출 8판)',
  map: 'youngcle18', spawn: 'front', flags: { ...crateDoneFlags, furnace_arena_intro_done: true }, party: [...parkWonCheckpoint.party], script: 'furnace_color_qa' });
// 색깔 게임·다리 연출 뒤(BUILD201): 광장 위 통로 → 다리길(철문 C → 예/아니오) → 조종실(영클 비행 장치)
const furnaceDoneFlags = { ...crateDoneFlags, furnace_arena_intro_done: true, furnace_color_done: true, furnace_aftermath_done: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'furnace_after', desc: '용광로 광장: 다리 놓인 뒤 (위 통로 앞)',
  map: 'youngcle18', spawn: 'front', flags: { ...furnaceDoneFlags }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'ship_bridge', desc: '엄청대박인배 다리길 (용암 위 다리 → 거대한 철문 C)',
  map: 'youngcle19', spawn: 'bottom', flags: { ...furnaceDoneFlags }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'ship_control', desc: '엄청대박인배 조종실 입장 연출 (대포 → 쥰희·용준 → 영클 → 철창·오방순·나람 → 전투 시작)',
  map: 'youngcle20', spawn: 'gate', flags: { ...furnaceDoneFlags }, party: [...parkWonCheckpoint.party] });
// 조종실 QA 순서 = 실제 진행 순서(2026-09-17 사용자 “영클 전투 끝나고 머리 박힌 이후 그 지점을 넣어야지”): 입장 연출 → 보스전 → 머리 박힌 직후(후속 연출 전부) → 변신 영클 전투.
//   변신 영클과 대치만 하는 상태(아무 대사도 안 걸린다)는 메뉴에서 숨긴다(hidden) — ?qa=ship_control_after 주소와 재입장 플레이테스트에서만 쓴다
QA_POINTS.push({ ...parkWonCheckpoint, id: 'ship_battle', desc: '조종실 보스전 직행 (영클 hp40 피함 · 오방순 광선 · 나람 내려찍기 · 철창 레이저 · 선회 레이저 → 이기면 후속 연출)',
  map: 'youngcle20', spawn: 'gate', flags: { ...furnaceDoneFlags, ship_intro_done: true }, party: [...parkWonCheckpoint.party], script: 'ship_battle_qa' });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'ship_aftermath', desc: '조종실 보스전 끝·영클 머리 박힌 직후 (쥰희 웃음 → 영클 “안돼” → 어둠·가재맨 → 영클 변신 → 변신 영클 전투)',
  map: 'youngcle20', spawn: 'gate', flags: { ...furnaceDoneFlags, ship_intro_done: true }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'ship_tvform_battle', desc: '변신 영클 전투 직행 (편집노조 흡수 인트로 → 코인 패턴 ↔ 특별 4종: 섭리오·리듬·마녀재판·팽이)',
  map: 'youngcle20', spawn: 'gate', flags: { ...furnaceDoneFlags, ship_intro_done: true, ship_aftermath_done: true }, party: [...parkWonCheckpoint.party], script: 'ship_tvform_battle_qa' });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'ship_control_after', desc: '조종실: 후속 연출 다 본 뒤 변신 영클과 대치(재입장 검사용)', hidden: true,
  map: 'youngcle20', spawn: 'gate', flags: { ...furnaceDoneFlags, ship_intro_done: true, ship_aftermath_done: true }, party: [...parkWonCheckpoint.party] });
const shipWonFlags = { ...furnaceDoneFlags, ship_intro_done: true, ship_aftermath_done: true, ship_tvform_won: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'ship_ending', desc: '변신 영클 승리 후 (원래 모습 → 맨홀 → 용준 복귀 → 세 명 내려감)',
  map: 'youngcle20', spawn: 'gate', flags: { ...shipWonFlags }, party: [...parkWonCheckpoint.party], script: 'ship_tvform_ending' });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'ship_manhole', desc: '조종실 열린 맨홀 · C 내려갈까?',
  map: 'youngcle20', spawn: 'from_lounge', flags: { ...shipWonFlags, ship_ending_done: true, ship_manhole_open: true }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'ship_lounge', desc: '엄청대박인배 메인 라운지 · 편집자들과 보라색 문',
  map: 'ship_lounge', spawn: 'from_control', flags: { ...shipWonFlags, ship_ending_done: true, ship_manhole_open: true }, party: [...parkWonCheckpoint.party] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'ship_castle', desc: '라운지 보라색 문 앞 · 실제 접근으로 가재맨 성 연출 시작',
  map: 'ship_lounge', spawn: 'castle_approach', flags: { ...shipWonFlags, ship_ending_done: true, ship_manhole_open: true }, party: [...parkWonCheckpoint.party] });
const shipCastleDoneFlags = { ...shipWonFlags, ship_ending_done: true, ship_manhole_open: true,
  ship_castle_started: true, ship_castle_cord_stolen: true, ship_castle_done: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'ship_sinking', desc: '요플래 수중 침강 · 가재맨 기억 5장면 · 짜장섬 해안 도착',
  map: 'ship_lounge', spawn: 'castle_approach', flags: { ...shipCastleDoneFlags }, party: [...parkWonCheckpoint.party], script: 'ship_sinking' });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_shore', desc: '짜장섬 해안 · 요플래 단독 조작 · 위쪽 숲 입구',
  map: 'jjajang_shore', spawn: 'washed_up', flags: { ...shipCastleDoneFlags, ship_sinking_done: true }, party: [] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_forest', desc: '짜장숲 세로 통로 (해안 위, 초록숲0 브금) · 위로 가면 토리이 길',
  map: 'jjajang_forest', spawn: 'from_shore', flags: { ...shipCastleDoneFlags, ship_sinking_done: true }, party: [] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_torii', desc: '짜장 토리이 길 (두 칸 위 → 오른쪽, 토리이 3개, 원형 시야) · 오른쪽 끝 다음 맵 브리핑 대기',
  map: 'jjajang_torii', spawn: 'from_forest', flags: { ...shipCastleDoneFlags, ship_sinking_done: true }, party: [] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_torii_event', desc: '토리이 길 · 두 번째 토리이 직전 (오른쪽으로 걸으면 청소부 이벤트)',
  map: 'jjajang_torii', spawn: 'before_janitor', flags: { ...shipCastleDoneFlags, ship_sinking_done: true }, party: [] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_torii_joined', desc: '토리이 길 · 청소부(허약) 합류 뒤 (오른쪽 끝 → 검은 소나무 숲)',
  map: 'jjajang_torii', spawn: 'after_janitor', flags: { ...shipCastleDoneFlags, ship_sinking_done: true, torii_janitor_started: true, torii_janitor_joined: true }, party: ['janitor'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_bend', desc: '짜장 굽이 길 (위→오른쪽→아래→오른쪽→위) · 길 위의 돌(청소부가 줍는다)',
  map: 'jjajang_bend', spawn: 'from_west', flags: { ...shipCastleDoneFlags, ship_sinking_done: true, torii_janitor_started: true, torii_janitor_joined: true }, party: ['janitor'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_walk', desc: '짜장 곧은 길 · 청소부 “천천히 걷기” 연출 직전 (오른쪽으로 걸으면 시작)',
  map: 'jjajang_walk', spawn: 'before_pause', flags: { ...shipCastleDoneFlags, ship_sinking_done: true, torii_janitor_started: true, torii_janitor_joined: true, jjajang_rock_taken: true }, party: ['janitor'] });
const pinesFlags = { ...shipCastleDoneFlags, ship_sinking_done: true, torii_janitor_started: true, torii_janitor_joined: true, jjajang_rock_taken: true, jjajang_walk_started: true, jjajang_walk_done: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_pines', desc: '검은 소나무 숲 (왼쪽 입구 → 굽이 길 → 가운데 공터 → 오른쪽)',
  map: 'jjajang_pines', spawn: 'from_west', flags: pinesFlags, party: ['janitor'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_pines_center', desc: '소나무 숲 공터 직전 (가운데로 가면 아짐키야 조우 → 전투)',
  map: 'jjajang_pines', spawn: 'before_center', flags: pinesFlags, party: ['janitor'] });
const statueFlags = { ...pinesFlags, pines_center_started: true, pines_ajimkiya_won: true, pines_center_done: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_statue', desc: '석상 앞 숲 (왼쪽 입구 → 곧은 길, 가운데 위 공터의 석상 · 오른쪽 끝 다음 맵 브리핑 대기)',
  map: 'jjajang_statue', spawn: 'from_west', flags: statueFlags, party: ['janitor'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_statue_front', desc: '석상 바로 아래 (위로 가서 C → 청소부 짜장숲 이야기)',
  map: 'jjajang_statue', spawn: 'before_statue', flags: statueFlags, party: ['janitor'] });
const runFlags = { ...statueFlags, jjajang_statue_hint_started: true, jjajang_statue_hint_done: true, jjajang_statue_told: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_run', desc: '파란 토리이 길 (왼쪽 입구 → 곧은 검은 물길 → 파란 토리이를 지나면 러너 기믹)',
  map: 'jjajang_run', spawn: 'from_west', flags: runFlags, party: ['janitor'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_run_torii', desc: '파란 토리이 직전 (오른쪽으로 지나면 검 뽑기 → 달리기 · X 점프 · C 베기 · 공중 C 회전 베기, 약 10초 뒤 오른쪽 끝)',
  map: 'jjajang_run', spawn: 'before_torii', flags: runFlags, party: ['janitor'] });
const run2Flags = { ...runFlags, run_intro_started: true, run_intro_done: true, run_outro_done: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_run2', desc: '토리이 굽이 길 입구 (청소부 한마디 → 토리이 a 오른쪽 달리기, 장애물)',
  map: 'jjajang_run2', spawn: 'from_west', flags: run2Flags, party: ['janitor'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_run2_b', desc: '토리이 굽이 길 · 토리이 b 직전 (왼쪽으로 지나면 왼쪽 달리기)',
  map: 'jjajang_run2', spawn: 'before_b', flags: { ...run2Flags, run2_enter_started: true, run2_enter_done: true, party_hidden: true }, party: ['janitor'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_run2_c', desc: '토리이 굽이 길 · 토리이 c 직전 (오른쪽 달리기 → 끝에서 청소부 합류)',
  map: 'jjajang_run2', spawn: 'before_c', flags: { ...run2Flags, run2_enter_started: true, run2_enter_done: true, party_hidden: true }, party: ['janitor'] });
const drumFlags = { ...run2Flags, run2_enter_started: true, run2_enter_done: true, run2_outro_done: true, run_leaf_tutorial_done: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_drum', desc: '드럼통 길 입구 (곧은 검은 물길 → 가운데 드럼통 앞에서 청소부 이별 연출)',
  map: 'jjajang_drum', spawn: 'from_west', flags: drumFlags, party: ['janitor'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_drum_center', desc: '드럼통 바로 앞 (오른쪽으로 걸으면 청소부 이별 → 요플래 혼자 다음 맵)',
  map: 'jjajang_drum', spawn: 'before_drum', flags: drumFlags, party: ['janitor'] });
const chinFlags = { ...drumFlags, drum_talk_started: true, drum_talk_done: true, janitor_left: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_chin1', desc: '찢칠라 길 1 입구 · 요플래 혼자 (왼쪽으로는 못 감 → 파란 토리이 → 달리기 → 중후반 찢칠라)',
  map: 'jjajang_chin1', spawn: 'from_west', flags: chinFlags, party: [] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_chin1_chin', desc: '찢칠라 길 1 · 찢칠라 직전 (오른쪽으로 가면 표준 조우 → 전투: 찢기·드럼통)',
  map: 'jjajang_chin1', spawn: 'before_chin', flags: chinFlags, party: [] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_chin2', desc: '찢칠라 길 2 입구 (파란 토리이 둘 → 달리기 두 번 → 중후반 찢칠라 → 오른쪽 끝 다음 맵 대기)',
  map: 'jjajang_chin2', spawn: 'from_west', flags: { ...chinFlags, jjajang_chin1_chin_defeated: true }, party: [] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_chin2_spring', desc: '찢칠라 길 2 · 아래 샛길 (오른쪽 끝 마나샘, C 로 전체 회복)',
  map: 'jjajang_chin2', spawn: 'before_spring', flags: { ...chinFlags, jjajang_chin1_chin_defeated: true }, party: [] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_chin2_mun', desc: '찢칠라 길 2 · 문코리타 직전 (덩굴 채찍·소리지르기)',
  map: 'jjajang_chin2', spawn: 'before_chin', flags: { ...chinFlags, jjajang_chin1_chin_defeated: true }, party: [] });
const thinkFlags = { ...chinFlags, jjajang_chin1_chin_defeated: true, jjajang_chin2_mun_defeated: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_think', desc: '생각 길 입구 (오른쪽으로 쭉 걷다가 가운데에서 요플래 혼잣말 나레이션)',
  map: 'jjajang_think', spawn: 'from_west', flags: thinkFlags, party: [] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_think_mid', desc: '생각 길 · 혼잣말 직전 (오른쪽으로 걸으면 시작, 끝은 다음 맵 브리핑 대기)',
  map: 'jjajang_think', spawn: 'before_think', flags: thinkFlags, party: [] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_bend2', desc: '굽은 물길 (오른쪽 → 아래 → 오른쪽, 길 위 비석 다섯 · 오른쪽 문 → 드럼통 둥지)',
  map: 'jjajang_bend2', spawn: 'from_west', flags: { ...thinkFlags, think_started: true, think_done: true }, party: [] });
const nestFlags = { ...thinkFlags, think_started: true, think_done: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_nest', desc: '드럼통 둥지 입구 (오른쪽으로 1초 걸으면 드럼통 더미가 두른 동그란 공간 · 브금 없음)',
  map: 'jjajang_nest', spawn: 'from_west', flags: nestFlags, party: [] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_nest_center', desc: '드럼통 둥지 가운데 (오른쪽 드럼통에 C · 두드리면 드럼통의 악마 등장·전투)',
  map: 'jjajang_nest', spawn: 'before_drum', flags: nestFlags, party: [] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_nest_battle', desc: '드럼통의 악마 전투 직행 (요플래 혼자 · HP 1에서 청소부 구출)',
  map: 'jjajang_nest', spawn: 'before_drum', flags: nestFlags, party: [], script: 'drum_devil_battle_qa' });
// 보스전 뒤 연출(BUILD254): 둥지 → 동상 앞 → 전함·영클 TV → 재합류 → 잔해 길 → 깊은숲 입구
const afterFlags = { ...nestFlags, drum_devil_won: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_nest_after', desc: '드럼통의 악마 승리 직후 연출 (청소부 영웅 → 함께 승천 → 동상 앞 → 전함 → 영클 TV → 재합류)',
  map: 'jjajang_nest', spawn: 'before_drum', flags: afterFlags, party: [], script: 'jjajang_nest_after' });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_statue_return', desc: '동상 앞 낙하부터 (청소부 마지막 대사 → 휘이잉 → 전함 콰앙 → 섬 전경 → 영클 TV → 재합류)',
  map: 'jjajang_statue', spawn: 'after_crash', flags: afterFlags, party: [], script: 'jjajang_statue_return' });
const regroupFlags = { ...afterFlags, statue_destroyed: true, party_regrouped: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_statue_after', desc: '동상 파괴 뒤 석상 앞 숲 (잔해 길 · 통로 위 문 → 깊은숲 입구 · 억빠맨·경섭 동료)',
  map: 'jjajang_statue', spawn: 'after_crash', flags: regroupFlags, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_deep', desc: '깊은숲 입구 (어두운 짜장숲 · 위로 가는 길 · 오른쪽 나들목 마법의샘 · 브금 wind)',
  map: 'jjajang_deep', spawn: 'from_south', flags: regroupFlags, party: ['gyeongsub', 'ppaman'] });
// 빛 드는 공터(BUILD257): 풀숲의 최미스
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_glade', desc: '빛 드는 공터 입구 (오른쪽으로 비스듬히 오르면 원형 공터 · 풀숲 셋 · 최미스 등장 연출)',
  map: 'jjajang_glade', spawn: 'from_south', flags: regroupFlags, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_glade_bush', desc: '빛 드는 공터 · 풀숲 연출 직전 (위로 한 걸음이면 풀숲이 흔들린다)',
  map: 'jjajang_glade', spawn: 'before_bush', flags: regroupFlags, party: ['gyeongsub', 'ppaman'] });
// 벚꽃 숲(BUILD261): 공터 연출을 끝낸 상태(glade_done)로, 검은 풀숲 땅·꽃잎 조금 → 넓은 풀숲 초입에서 벚꽃이 번진다
const sakuraFlags = { ...regroupFlags, glade_started: true, glade_done: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura', desc: '벚꽃 숲 입구 (검은 풀숲 땅 · 꽃잎 조금씩 · 위로 8초쯤 걸으면 넓은 풀숲에서 벚꽃이 번진다)',
  map: 'jjajang_sakura', spawn: 'from_south', flags: sakuraFlags, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura_bloom', desc: '벚꽃 숲 · 벚꽃 번짐 직전 (위로 세 걸음이면 넓은 풀숲 트리거)',
  map: 'jjajang_sakura', spawn: 'before_bloom', flags: sakuraFlags, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura_bloomed', desc: '벚꽃 숲 · 이미 핀 뒤 (분홍 땅·벚꽃 나무 · 위로 가서 오른쪽으로)',
  map: 'jjajang_sakura', spawn: 'meadow', flags: { ...sakuraFlags, sakura_bloom_started: true, sakura_bloom: true }, party: ['gyeongsub', 'ppaman'] });
// 벚꽃 숲 2·3(BUILD264): 벚꽃이 다 핀 뒤. 2 = 오른쪽·위·빙글빙글 → 위로 가기 전 오른쪽 샛길 끝 벚꽃다리 연출, 3 = 위·오른쪽 → 뗏목(파란 물길 오른쪽 → 아래)
const sakuraBloomedFlags = { ...sakuraFlags, sakura_bloom_started: true, sakura_bloom: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura2', desc: '벚꽃 숲 2 입구 (왼쪽에서 들어와 오른쪽 → 위 → 빙글빙글)',
  map: 'jjajang_sakura2', spawn: 'from_west', flags: sakuraBloomedFlags, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura2_bridge', desc: '벚꽃 숲 2 · 갈림목 (오른쪽 샛길 끝에서 벚꽃다리 연출, 위로 가면 3)',
  map: 'jjajang_sakura2', spawn: 'junction', flags: sakuraBloomedFlags, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura3', desc: '벚꽃 숲 3 입구 (위로 → 오른쪽 → 뗏목)',
  map: 'jjajang_sakura3', spawn: 'from_south', flags: { ...sakuraBloomedFlags, sakura2_bridge_done: true }, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura3_dock', desc: '벚꽃 숲 3 · 뗏목 앞 (C → 오른쪽으로 8초, 4초쯤 꽃잎 → 아래로)',
  map: 'jjajang_sakura3', spawn: 'dock', flags: { ...sakuraBloomedFlags, sakura2_bridge_done: true }, party: ['gyeongsub', 'ppaman'] });
// 벚꽃 숲 4(BUILD266): 다오·배찌 표준 조우
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura4', desc: '벚꽃 숲 4 입구 (지그재그 길, 다오 → 배찌)',
  map: 'jjajang_sakura4', spawn: 'from_north', flags: { ...sakuraBloomedFlags, sakura2_bridge_done: true }, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura4_dao', desc: '벚꽃 숲 4 · 다오 앞 (오른쪽 길, 카트라이더 미사일·부스터·바나나)',
  map: 'jjajang_sakura4', spawn: 'before_dao', flags: { ...sakuraBloomedFlags, sakura2_bridge_done: true }, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura4_bazzi', desc: '벚꽃 숲 4 · 배찌 앞 (왼쪽 길, 물폭탄·자석·물파리)',
  map: 'jjajang_sakura4', spawn: 'before_bazzi', flags: { ...sakuraBloomedFlags, sakura2_bridge_done: true, jjajang_sakura4_dao_defeated: true }, party: ['gyeongsub', 'ppaman'] });
const sakura5Flags = { ...sakuraBloomedFlags, sakura2_bridge_done: true, jjajang_sakura4_dao_defeated: true, jjajang_sakura4_bazzi_defeated: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura5', desc: '벚꽃 숲 5 입구 (아래로 살짝 → 오른쪽 3초 → 나무다리 3초 → 갈림목 연출)',
  map: 'jjajang_sakura5', spawn: 'from_north', flags: sakura5Flags, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura5_bridge', desc: '벚꽃 숲 5 · 나무다리 끝 (오른쪽 한 걸음이면 갈림목 연출 — 브금 끄고 카메라 위 공터)',
  map: 'jjajang_sakura5', spawn: 'bridge_end', flags: sakura5Flags, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura5_fork', desc: '벚꽃 숲 5 · 갈림목 (첫 연출 뒤 · 위로 좀 올라가면 두 번째 연출 — 브금 telling·도미조림 느낌표·짜장면 얘기)',
  map: 'jjajang_sakura5', spawn: 'fork', flags: { ...sakura5Flags, sakura5_scene_started: true, sakura5_scene_done: true }, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura5_battle', desc: '벚꽃 숲 5 · 도미조림·도현 전투 직행 (진입 연출 → 전투 → 승리 뒤 연출까지 이어짐)',
  map: 'jjajang_sakura5', spawn: 'clearing', flags: { ...sakura5Flags, sakura5_scene_started: true, sakura5_scene_done: true, sakura5_clearing_visited: true }, party: ['gyeongsub', 'ppaman'], script: 'sakura5_duo_battle_qa' });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura5_after_battle', desc: '벚꽃 숲 5 · 전투 승리 직후 (승리 뒤 연출부터: 둘 눕힘 → 나대 씨바 → … → 가순이 퇴장 → 오른쪽으로)',
  map: 'jjajang_sakura5', spawn: 'clearing', flags: { ...sakura5Flags, sakura5_scene_started: true, sakura5_scene_done: true, sakura5_clearing_visited: true }, party: ['gyeongsub', 'ppaman'], script: 'sakura5_after_battle_qa' });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura5_clearing', desc: '벚꽃 숲 5 · 전부 끝난 뒤 (가순이들은 떠남 · 오른쪽 길 앞)',
  map: 'jjajang_sakura5', spawn: 'east', flags: { ...sakura5Flags, sakura5_scene_started: true, sakura5_scene_done: true, sakura5_clearing_visited: true, sakura5_clearing_scene_done: true, sakura5_duo_won: true, sakura5_girls_left: true }, party: ['gyeongsub', 'ppaman'] });
// 벚꽃 숲 6(BUILD277): 벚꽃 숲 5 전부 끝난 뒤 — 오른쪽 끝 문 → 뗏목 5초 → 둥근 광장(가면 쓴 최미스 고백 연습 연출) → 오른쪽 길
const sakura6Flags = { ...sakura5Flags, sakura5_scene_started: true, sakura5_scene_done: true, sakura5_clearing_visited: true, sakura5_clearing_scene_done: true, sakura5_duo_won: true, sakura5_girls_left: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura6', desc: '벚꽃 숲 6 입구 (오른쪽으로 → 뗏목 5초 → 뭍 → 둥근 광장 연출)',
  map: 'jjajang_sakura6', spawn: 'from_west', flags: sakura6Flags, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura6_dock', desc: '벚꽃 숲 6 · 뗏목 앞 (C → 오른쪽으로 5초 → 뭍)',
  map: 'jjajang_sakura6', spawn: 'dock', flags: sakura6Flags, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura6_plaza', desc: '벚꽃 숲 6 · 광장 앞 (오른쪽 한 걸음이면 최미스 고백 연습 연출 — 카메라 천천히 오른쪽·꽃 따기·헤헤)',
  map: 'jjajang_sakura6', spawn: 'plaza', flags: sakura6Flags, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura6_east', desc: '벚꽃 숲 6 · 연출 끝난 뒤 (최미스는 떠남 · 오른쪽 길 앞, 다음 맵 없음)',
  map: 'jjajang_sakura6', spawn: 'east', flags: { ...sakura6Flags, sakura6_scene_started: true, sakura6_scene_done: true }, party: ['gyeongsub', 'ppaman'] });
// 벚꽃 숲 7(BUILD278): 벚꽃 숲 6 연출까지 끝난 뒤 — 오른쪽 끝 문 → 오른쪽 2초 → 넓은 들 · 맨 위 결혼식 나무 무대 · 관객 가순이들 → 들머리 연출(그 남자와 그 여자의 무대)
const sakura7Flags = { ...sakura6Flags, sakura6_scene_started: true, sakura6_scene_done: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura7', desc: '벚꽃 숲 7 입구 (오른쪽으로 2초 → 넓은 들 · 무대 · 관객)',
  map: 'jjajang_sakura7', spawn: 'from_west', flags: sakura7Flags, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura7_stage', desc: '벚꽃 숲 7 · 들머리 앞 (오른쪽 한 걸음이면 무대 연출 — 느낌표·카메라 무대·어둠·치지직·스포트라이트·점례·최미스·도미조림·관객 난동·박치기)',
  map: 'jjajang_sakura7', spawn: 'before_scene', flags: sakura7Flags, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura7_after', desc: '벚꽃 숲 7 · 연출 끝난 뒤 (관객 뒤 가운데, 오른쪽에 길 — 다음 맵 없음)',
  map: 'jjajang_sakura7', spawn: 'after', flags: { ...sakura7Flags, sakura7_scene_started: true, sakura7_scene_done: true }, party: ['gyeongsub', 'ppaman'] });
// 벚꽃 숲 8·9(BUILD282): 갈림길 연출 뒤 경섭은 혼자 오른쪽으로, 억빠맨은 오른쪽 길 가드 → 요플래 혼자(party []) 윗길 → 파란 토리이 달리기
const sakura8Flags = { ...sakura7Flags, sakura7_scene_started: true, sakura7_scene_done: true };
const sakura8DoneFlags = { ...sakura8Flags, sakura8_split_started: true, sakura8_split_done: true };
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura8', desc: '벚꽃 숲 8 입구 (오른쪽 3초 → 갈림길 연출: 경섭 이탈·억빠맨 가드)',
  map: 'jjajang_sakura8', spawn: 'from_west', flags: sakura8Flags, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura8_fork', desc: '벚꽃 숲 8 · 갈림목 앞 (오른쪽 한 걸음이면 연출)',
  map: 'jjajang_sakura8', spawn: 'fork', flags: sakura8Flags, party: ['gyeongsub', 'ppaman'] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura8_after', desc: '벚꽃 숲 8 · 연출 뒤 요플래 혼자 (오른쪽 길은 억빠맨이 막음 · 윗길 → 벚꽃 숲 9)',
  map: 'jjajang_sakura8', spawn: 'after', flags: sakura8DoneFlags, party: [] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura9', desc: '벚꽃 숲 9 입구 (위로 살짝 → 왼쪽 → 파란 토리이 → 왼쪽으로 15초 달리기)',
  map: 'jjajang_sakura9', spawn: 'from_south', flags: sakura8DoneFlags, party: [] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura9_torii', desc: '벚꽃 숲 9 · 파란 토리이 앞 (왼쪽으로 지나면 달리기: X 점프·C 베기, 분홍 나뭇잎·꽃가지)',
  map: 'jjajang_sakura9', spawn: 'torii', flags: sakura8DoneFlags, party: [] });
// 벚꽃 숲 10·11(BUILD283): 파란 토리이 10초 달리기(장애물 없음) → 절벽 오르막 도약·잔상 슬로우 6초·낙하 → 나무 정상 착지
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura10', desc: '벚꽃 숲 10 입구 (왼쪽으로 조금 → 파란 토리이 → 10초 달리기 → 절벽 도약)',
  map: 'jjajang_sakura10', spawn: 'from_east', flags: sakura8DoneFlags, party: [] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura10_torii', desc: '벚꽃 숲 10 · 파란 토리이 앞 (왼쪽으로 지나면 달리기 10초 → 절벽 오르막 → 점프·슬로우·낙하 → 나무 정상)',
  map: 'jjajang_sakura10', spawn: 'torii', flags: sakura8DoneFlags, party: [] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura11', desc: '벚꽃 숲 11 나무 정상 (낙하 착지 자리 · 위쪽 길 → 제단)',
  map: 'jjajang_sakura11', spawn: 'landing', flags: sakura8DoneFlags, party: [] });
QA_POINTS.push({ ...parkWonCheckpoint, id: 'jjajang_sakura12', desc: '벚꽃 숲 12 제단 (브금 꺼짐 · 잘린 나무 제단 위 어둠의 짜장면·보라 오라, 다음 없음)',
  map: 'jjajang_sakura12', spawn: 'from_south', flags: sakura8DoneFlags, party: [] });
