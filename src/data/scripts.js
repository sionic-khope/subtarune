// ─────────────────────────────────────────────────────────────
// 대사 스크립트. 노드 문법은 src/ui/dialogue.js 상단 참고.
// 태그: {s=2} 속도  {w=0.5} 멈춤  {c=red}..{/c} 색  {shake}..{/shake}  {wave}..{/wave}
// voice: src/core/audio.js VOICES 키. portrait: main.js 의 portraits 키.
// ─────────────────────────────────────────────────────────────
import { opening } from './cutscenes/opening.js';
import { living_enter } from './cutscenes/living_enter.js';
import { pc_stream } from './cutscenes/pc_stream.js';
import { void4_arrive, void4_lever } from './cutscenes/void4.js';
import { void4_ppaman_talk } from './cutscenes/void4_ppaman.js';
import { void4_door } from './cutscenes/void4_key.js';
import { void8_board, void8_arrive } from './cutscenes/void8.js';
import { rock_flowers, rock_sign, rock_boulder } from './cutscenes/rock_events.js';
import { void9_button, void9_quiz, void9_puddle, void9_chest } from './cutscenes/void9_events.js';
import { void10_intro, void10_sign1, void10_sign2, void10_sign3, void10_sign4, void10_sign5 } from './cutscenes/void10_maze.js';
import { void11_intro, void11_tree_look } from './cutscenes/void11_tree.js';
import { teal2_statue_look, teal2_statue_wall } from './cutscenes/teal2_statue.js';
import { teal2_tree, teal2_banana1 } from './cutscenes/teal2_events.js';
import { teal3_toolbox } from './cutscenes/teal3_toolbox.js';
import { teal4_peel, teal4_button, teal4_flower } from './cutscenes/teal4_events.js';
import { teal5_board, teal5_wall } from './cutscenes/teal5_river.js';
import { teal6_ward, teal6_blue } from './cutscenes/teal6_events.js';
import { teal8_ward, teal8_blue } from './cutscenes/teal8_events.js';
import { obj0_blue } from './cutscenes/obj0_events.js';
import { obj1_arrive, obj1_meet, obj1_push, obj1_cannon_look } from './cutscenes/obj1_cannon.js';
import { obj2_statue, obj2_sign, obj2_blue, obj2_recall, obj2_egg, obj2_banana } from './cutscenes/obj2_events.js';
import { teal9_boss, teal9_lantern, teal9_block, teal9_red_after, teal9_blue_after } from './cutscenes/teal9_boss.js';
import { teal7_hide } from './cutscenes/teal7_hide.js';
import { obj4_baron_intro } from './cutscenes/obj4_baron.js';
import { obj4_baron_abduction } from './cutscenes/obj4_abduction.js';
import { obj5_chase, obj5_resume } from './cutscenes/obj5_chase.js';
import { obj5_maillard } from './cutscenes/obj5_maillard.js';
import { maillard_hold, maillard_hold_stairs, maillard_hold_hatch } from './cutscenes/maillard_hold.js';
import { maillard_chakgeom, maillard_tarts, maillard_wemix } from './cutscenes/maillard_npcs.js';
import { maillard_spring, maillard_shop, maillard_statue_arms_crossed, maillard_statue_laugh, maillard_statue_gesture } from './cutscenes/maillard_lounge.js';
import { maillard_storage_enter } from './cutscenes/maillard_rooms.js';
import { maillard_eunbyeol, maillard_captain_enter } from './cutscenes/captain_room.js';
import { captain_reveal } from './cutscenes/captain_reveal.js';
import { captain_mankatsuki } from './cutscenes/captain_mankatsuki.js';
import { captain_aftermath } from './cutscenes/captain_aftermath.js';
import { captain_attack } from './cutscenes/captain_attack.js';
import { maillard_starboard_gate } from './cutscenes/maillard_starboard.js';
import { maillard_boarding_intro, youngcle_entrance } from './cutscenes/maillard_boarding.js';
import { shipPursuitBacktrack } from './scripts/ship-pursuit.js';
import { youngcle_intro, youngcle_tv_off, youngcle_left_door_locked } from './cutscenes/youngcle_intro.js';
import { youngcle_lounge_plan_b } from './cutscenes/youngcle_lounge.js';
import { editor_union_stage, editor_union_stage_wait, park_guardian_aftermath, park_guardian_aftermath_enter } from './cutscenes/editor_union_stage.js';
import { bidet_arcade, bidet_pipe_enter, bidet_screen_look, bidet_kiosk_look, subrio_boss_qa } from './cutscenes/bidet_arcade.js';
import { stage_hall_intro } from './cutscenes/stage_hall.js';
import { backstage_ttuulla, rhythm_qa, after_show_qa, stage_right_locked } from './cutscenes/stage_rhythm.js';
import { lava_raft_intro } from './cutscenes/stage_lava.js';
import { furnace_arena_intro, furnace_panel, furnace_color_qa } from './cutscenes/furnace_arena.js';
import { ship_gate } from './cutscenes/ship_gate.js';
import { ship_control_intro, ship_battle_qa, ship_tvform_battle_qa } from './cutscenes/ship_control.js';
import { ship_tvform_ending, ship_manhole } from './cutscenes/ship_ending.js';
import { shipLoungeScripts } from './cutscenes/ship_lounge.js';
import { ship_lounge_briefing } from './cutscenes/ship_lounge_briefing.js';
import { ship_invasion } from './cutscenes/ship_invasion.js';
import { castle_lobby_intro, castle_lobby_left_block, castle_lobby_sealed, castle_lobby_enter, castle_lobby_right_enter } from './cutscenes/castle_lobby.js';
import { castle_memory_sign, castle_memory_enter,
  castle_memory_stele1, castle_memory_stele2, castle_memory_stele3,
  castle_memory_stele4, castle_memory_stele5, castle_memory_stele6 } from './cutscenes/castle_memory.js';
import { ship_castle } from './cutscenes/ship_castle.js';
import { castle_malzahar_intro, castle_malzahar_north_block, castle_malzahar_backtrack, castle_malzahar_end_door } from './cutscenes/gajaeman_malzahar.js';
import { castle_orb_touch, castle_orb_return, castle_left_orb_touch, castle_left_orb_return } from './cutscenes/castle_orb.js';
import { castle_pipe_emerge, castle_pipe_board } from './cutscenes/castle_pipe.js';
import { castle_lobby_left_enter, castle_regret_sign, castle_regret_enter,
  castle_regret_stele1, castle_regret_stele2, castle_regret_stele3,
  castle_regret_stele4, castle_regret_stele5, castle_regret_stele6 } from './cutscenes/castle_regret.js';
import { castle_boulder_intro, castle_boulder_left_block, castle_boulder_waiting, castle_boulder_orb_enter } from './cutscenes/castle_boulder.js';
import { castle_gate_reunion, castle_gate_enter, castle_dark_path_intro } from './cutscenes/castle_gate.js';
import { castle_dark_chase_intro, castle_dark_chase_finish, castle_dark_refuge_locked } from './cutscenes/castle_dark_chase.js';
import { castle_cathedral_intro, castle_cathedral_rescue } from './cutscenes/castle_cathedral.js';
import { castle_spire_intro, castle_spire_back } from './cutscenes/castle_spire.js';
import { castle_prophecy_door } from './cutscenes/castle_prophecy.js';
import { castle_arena_intro } from './cutscenes/castle_arena.js';
import { castle_stairs_monsters, castle_stairs_nunu } from './cutscenes/castle_stairs.js';
import { shipSinkingScripts } from './cutscenes/ship_sinking.js';
import { jjajangShoreScripts } from './cutscenes/jjajang_shore.js';
import { torii_janitor } from './cutscenes/jjajang_torii.js';
import { jjajang_rock } from './cutscenes/jjajang_bend.js';
import { jjajang_walk_pause } from './cutscenes/jjajang_walk.js';
import { pines_center } from './cutscenes/jjajang_pines.js';
import { jjajang_statue_talk, jjajang_statue_hint } from './cutscenes/jjajang_statue.js';
import { jjajang_run_start, jjajang_run_intro, jjajang_run_outro } from './cutscenes/jjajang_run.js';
import { jjajang_run2_enter, jjajang_run2_start_a, jjajang_run2_start_b, jjajang_run2_start_c, jjajang_run2_outro } from './cutscenes/jjajang_run2.js';
import { jjajang_drum_talk } from './cutscenes/jjajang_drum.js';
import { jjajang_chin_start_a, jjajang_chin_start_b, jjajang_no_return } from './cutscenes/jjajang_chin.js';
import { jjajang_think } from './cutscenes/jjajang_think.js';
import { jjajang_stele1, jjajang_stele2, jjajang_stele3, jjajang_stele4, jjajang_stele5 } from './cutscenes/jjajang_stele.js';
import { jjajang_nest_drum } from './cutscenes/drum_devil.js';
import { jjajang_nest_after, jjajang_statue_return, jjajang_statue_no_return } from './cutscenes/jjajang_nest_after.js';
import { jjajang_sakura_bloom } from './cutscenes/jjajang_sakura.js';   // 벚꽃 숲 번짐(BUILD261)
import { jjajang_sakura2_bridge } from './cutscenes/jjajang_sakura2.js';
import { jjajang_sakura6_scene } from './cutscenes/jjajang_sakura6.js';   // 벚꽃 숲 6 광장 최미스 고백 연습 연출(BUILD277)
import { jjajang_sakura7_scene } from './cutscenes/jjajang_sakura7.js';   // 벚꽃 숲 7 나무 무대 — 그 남자와 그 여자의 무대(BUILD278)
import { jjajang_sakura8_split, jjajang_sakura8_no_right, jjajang_sakura9_start } from './cutscenes/jjajang_sakura8.js';   // 벚꽃 숲 8 갈림길(경섭 이탈·억빠맨 가드)·벚꽃 숲 9 파란 토리이 달리기(BUILD282)
import { jjajang_sakura10_start, jjajang_sakura10_outro, jjajang_sakura11_hush, jjajang_sakura11_unhush } from './cutscenes/jjajang_sakura10.js';   // 벚꽃 숲 10 파란 토리이 10초 달리기·절벽 도약 → 벚꽃 숲 11 착지(BUILD283) · 위쪽 길 브금 끄기/되살리기(BUILD285)
import { jjajang_sakura12_bowl } from './cutscenes/jjajang_sakura12.js';   // 벚꽃 숲 12 제단: 짜장면과 대화 → 획득 → 눈을 감는다(BUILD288)
import { jjajang_night_cliff_scene } from './cutscenes/jjajang_night_cliff.js';
import { choimis_sky } from './cutscenes/choimis_sky.js';
import { choimis_rescue } from './cutscenes/choimis_rescue.js';
import { NIGHT_COAST_SCRIPTS } from './cutscenes/jjajang_night_coast.js';
import { choimis_runaway, choimis_runaway_crash, choimis_runaway_aura, choimis_runaway_restore } from './cutscenes/choimis_runaway.js';
import { jjajang_sakura5_scene, jjajang_sakura5_clearing, jjajang_sakura5_no_right, sakura5_duo_battle_qa, sakura5_after_battle_qa } from './cutscenes/jjajang_sakura5.js';   // 벚꽃 숲 5 공터 연출·오른쪽 길 막기(BUILD271)   // 벚꽃 숲 2 벚꽃다리(BUILD264)   // 드럼통의 악마 뒤 연출(BUILD254), 동상 뒤 왼쪽 되돌아가기 방지(BUILD260)
import { jjajang_glade_intro } from './cutscenes/jjajang_glade.js';   // 빛 드는 공터 풀숲의 최미스(BUILD257)
import { storage_viewer, storage_viewer_defeated } from './cutscenes/storage_viewer.js';
import { maillard_yakulbeol, maillard_mabaem, maillard_yerim_pair } from './cutscenes/maillard_saloon_npcs.js';
import {
  youngcle3_crate_intro,
  youngcle3_crate_sign,
  youngcle4_crate_sign,
  youngcle5_crate_sign,
  youngcle5_crate_complete,
  youngcle15_crate_sign,
  youngcle16_crate_sign,
  youngcle_crate_done,
  youngcle_crate_reset,
} from './cutscenes/factory_puzzles.js';

/**
 * 형섭 대사 vs 나레이션 (2026-09-10 확정)
 *  - HS(): 형섭이 "입으로 말하는" 줄 — 인트로 맵(방·복도·거실, void_fallen 전)에서만 이름 '형섭' + 흰검 초상화 + 가재맨 톤 목소리.
 *  - narrator: 사물 설명("창문이다"), 괄호 속 생각("(엄마한테 가야 된다)"), 상태("기분이 안좋아졌다"), 의성어("철컥..").
 *  - 보라맵(void_fallen)부터는 자아가 바뀐 컨셉 → 형섭 대사도 이름·초상화 없이 나레이션처럼(narrator). HS() 를 쓰지 않는다.
 */
export const HS = (text, extra = {}) => ({ speaker: '형섭', portrait: 'hyungsub', voice: 'hyungsub', text, ...extra });

export const SCRIPTS = {
  opening,
  ship_castle,
  ...shipSinkingScripts,
  ...jjajangShoreScripts,
  ...NIGHT_COAST_SCRIPTS,
  torii_janitor,
  jjajang_rock,
  jjajang_walk_pause,
  pines_center,
  jjajang_statue_talk,
  jjajang_statue_hint,
  jjajang_run_start,
  jjajang_run_intro,
  jjajang_run_outro,
  jjajang_run2_enter, jjajang_run2_start_a, jjajang_run2_start_b, jjajang_run2_start_c, jjajang_run2_outro,
  jjajang_drum_talk, jjajang_chin_start_a, jjajang_chin_start_b, jjajang_no_return,
  jjajang_spring: maillard_spring,
  jjajang_think,
  jjajang_stele1, jjajang_stele2, jjajang_stele3, jjajang_stele4, jjajang_stele5, jjajang_nest_drum, jjajang_nest_after, jjajang_statue_return, jjajang_statue_no_return, jjajang_glade_intro, jjajang_sakura_bloom, jjajang_sakura2_bridge, jjajang_sakura5_scene, jjajang_sakura5_clearing, jjajang_sakura5_no_right,   // 찢칠라 길 2 아래 샛길 마나샘(BUILD244) — 마이야르 샘물과 같은 전체 회복
  drum_devil_battle_qa: [jjajang_nest_drum.find(node => node.battle), ...jjajang_nest_after],   // 전투 직행 QA 도 승리 뒤 연출까지(BUILD254)
  jjajang_sakura8_split, jjajang_sakura8_no_right, jjajang_sakura9_start,   // 벚꽃 숲 8 갈림길 연출·오른쪽 길 막기 / 벚꽃 숲 9 러너 시작(BUILD282)
  jjajang_sakura10_start, jjajang_sakura10_outro,   // 벚꽃 숲 10 러너 시작 / 절벽 도약 낙하 뒤 나무 정상 착지(BUILD283)
  jjajang_sakura11_hush, jjajang_sakura11_unhush,   // 벚꽃 숲 11 위쪽 길: 브금 끄기 / 내려오면 sakura 다시(BUILD285)
  jjajang_sakura12_bowl,   // 벚꽃 숲 12 제단 짜장면 연출(BUILD288)
  jjajang_night_cliff_scene,
  choimis_sky,
  choimis_rescue,
  choimis_eating_qa: [{ battle: { enemies: ['choimis_flower'], bgm: 'choimis_battle', bg: 'choimis_sky', openingMode: 'choimis_eating_race' } }, { end: true }],
  choimis_runaway, choimis_runaway_crash, choimis_runaway_aura, choimis_runaway_restore,
  jjajang_sakura7_scene,   // 벚꽃 숲 7 무대 연출: 어둠·스포트라이트·점례(드레스 가순이)·가면 최미스·도미조림 난입·관객 난동·박치기(BUILD278)
  jjajang_sakura6_scene,   // 벚꽃 숲 6 광장 연출: 뗏목 뒤 둥근 광장에서 가면 쓴 최미스의 고백 연습 → 주인공들과 대화 → 오른쪽으로 떠남(BUILD277)
  sakura5_duo_battle_qa, sakura5_after_battle_qa,   // 도미조림·도현 전투 직행 QA(진입 연출·전투·승리 뒤 연출까지) / 승리 직후 QA(BUILD275)
  obj4_baron_intro,
  obj4_baron_abduction,
  obj5_chase,
  obj5_resume,
  obj5_maillard,
  maillard_hold, maillard_hold_stairs, maillard_hold_hatch,
  maillard_chakgeom, maillard_tarts, maillard_wemix,
  maillard_spring, maillard_shop, maillard_statue_arms_crossed, maillard_statue_laugh, maillard_statue_gesture,
  maillard_storage_enter,
  maillard_eunbyeol, maillard_captain_enter,
  captain_reveal,
  captain_mankatsuki,
  captain_aftermath,
  captain_attack,
  maillard_starboard_gate,
  maillard_boarding_intro, youngcle_entrance,
  ship_pursuit_backtrack: shipPursuitBacktrack,
  ship_tvform_ending, ship_manhole, ship_lounge_briefing, ship_invasion, ...shipLoungeScripts,
  castle_lobby_intro, castle_lobby_left_block, castle_lobby_sealed, castle_lobby_enter, castle_lobby_right_enter,
  castle_memory_sign, castle_memory_enter,
  castle_memory_stele1, castle_memory_stele2, castle_memory_stele3,
  castle_memory_stele4, castle_memory_stele5, castle_memory_stele6,
  castle_malzahar_intro, castle_malzahar_north_block, castle_malzahar_backtrack, castle_malzahar_end_door,
  castle_orb_touch, castle_orb_return, castle_left_orb_touch, castle_left_orb_return,
  castle_pipe_emerge, castle_pipe_board,
  castle_lobby_left_enter, castle_regret_sign, castle_regret_enter,
  castle_regret_stele1, castle_regret_stele2, castle_regret_stele3,
  castle_regret_stele4, castle_regret_stele5, castle_regret_stele6,
  castle_boulder_intro, castle_boulder_back: castle_boulder_left_block,
  castle_boulder_left_block, castle_boulder_waiting, castle_boulder_orb_enter,
  castle_gate_reunion, castle_gate_enter, castle_dark_path_intro,
  castle_dark_chase_intro, castle_dark_chase_finish, castle_dark_refuge_locked,
  castle_cathedral_intro, castle_cathedral_rescue, castle_spire_intro, castle_spire_back, castle_prophecy_door, castle_arena_intro, castle_stairs_monsters, castle_stairs_nunu,
  youngcle_intro, youngcle_tv_off, youngcle_left_door_locked,
  youngcle_lounge_plan_b,
  editor_union_stage, editor_union_stage_wait, park_guardian_aftermath, park_guardian_aftermath_enter,
  bidet_arcade, bidet_pipe_enter, bidet_screen_look, bidet_kiosk_look, subrio_boss_qa,
  stage_hall_intro, backstage_ttuulla, rhythm_qa, after_show_qa, stage_right_locked, lava_raft_intro, furnace_arena_intro, furnace_panel, furnace_color_qa, ship_gate, ship_control_intro, ship_battle_qa, ship_tvform_battle_qa,
  storage_viewer,
  storage_viewer_defeated,
  maillard_yakulbeol, maillard_mabaem, maillard_yerim_pair,
  chase_route_block: Object.assign([{ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* 형 지금 이럴때가 아니에요.' }], { silent: true }),
  // 무대 위 통로 꼭대기 문(윗길 youngcle10): 철창이 폭파되기 전엔 잠김(철창이 길도 막고 있어 보통은 닿지 못한다)
  youngcle7_up_locked: Object.assign([{ voice: 'narrator', text: '* 위 통로는 철창으로 막혀 있다.' }], { silent: true }),

  youngcle3_crate_intro,
  youngcle3_crate_sign,
  youngcle4_crate_sign,
  youngcle5_crate_sign,
  youngcle5_crate_complete,
  youngcle15_crate_sign,
  youngcle16_crate_sign,
  youngcle_crate_done,
  youngcle_crate_reset,

  _chest_empty: [{ text: '* 상자는 비어 있다.', voice: 'narrator' }],

  // ── 형섭의 방 (우이동) ──────────────────────────────────
  room_computer: [
    { if: (f) => f.cord_found, goto: 'stream' },     // 코드를 챙긴 뒤: 꽂고 방송 시작 (컷신)
    { if: (f) => f.pc_checked, goto: 'again' },
    HS('* ???{w=0.4} 어 뭐야'),
    HS('* ㅅㅂ 코드 어디 갔어{w=0.3} 컴퓨터가 안 켜지는데'),
    HS('* 아 엄마가 뭐 청소하다가 빼셨나'),
    { text: '* (청소ㄴ…{w=0.5} 아니 엄마한테 가야 될 것 같다.)', voice: 'narrator' },
    { stage: 'pc_checked' },
    { end: true },
    { label: 'again' },
    { text: '* (코드가 없다.{w=0.3} 엄마한테 가야 된다.)', voice: 'narrator' },
    { end: true },
    { label: 'stream' },
    ...pc_stream,
  ],
  void_door: [
    { text: '* 거대한 검은 문이다.', voice: 'narrator' },   // 다음 비트 브리핑 대기 (임시 한 줄)
  ],
  // 보라맵2 뗏목 표지판 (사용자 지정 텍스트 그대로)
  void2_sign: [
    { text: '* 앞으로만 가는 땟목이다.', voice: 'narrator' },
    { text: '* 아 물론!{w=0.4} 뒤로도 갈수있다.', voice: 'narrator' },
    { text: '* 반대편에서 탄다면~{w=0.5} 껄껄.', voice: 'narrator' },
  ],
  // 보라맵4: 긴 뗏목 길 · 억빠맨 · 레버 다리
  void4_arrive, void4_lever,
  void4_ppaman: void4_ppaman_talk,   // 인사 → 질문 루프 → 동행 (src/data/cutscenes/void4_ppaman.js)
  void4_door,                        // 잠긴 문 → 레버 열쇠 → 철컥 (src/data/cutscenes/void4_key.js)
  void8_board, void8_arrive,         // 점프 뗏목: 억빠맨 수영 → 벽 쿵 → C 점프 / 도착 물 털기 (src/data/cutscenes/void8.js)
  void9_button, void9_quiz, void9_puddle, void9_chest,   // 보라맵9 뱀길 체크포인트 이벤트 4종 (src/data/cutscenes/void9_events.js)
  void10_intro, void10_sign1, void10_sign2, void10_sign3, void10_sign4, void10_sign5,   // 보라맵10 미로: 포탈 컷신 + 표지판 5 (src/data/cutscenes/void10_maze.js)
  void11_intro, void11_tree_look,   // 보라맵11 거대 나무: 쥰희·경섭 컷신 → 경섭 합류, 나무 조사 (src/data/cutscenes/void11_tree.js)
  teal2_statue_look, teal2_statue_wall,   // 청록숲2 나무 동상: 조사 / 길 막은 동상(빠맨 공격 시도) (src/data/cutscenes/teal2_statue.js)
  teal2_tree, teal2_banana1,   // 청록숲2 광장: 똑똑 나무 / 바나나 포타슘
  teal3_toolbox,   // 청록숲3 공구상자 → CS 미니언 등장 → 전투 시작 연출 (src/data/cutscenes/teal3_toolbox.js)
  teal7_hide,   // 청록숲7: 나무 뒤에 숨어 쥰희·경섭·용준 엿듣기 (src/data/cutscenes/teal7_hide.js)
  teal6_ward, teal6_blue,   // 청록숲6 정글: 와드 정찰(카메라 투어) / 파란 돌(경섭 핥기 → 전원 HP 회복 쉼터) (src/data/cutscenes/teal6_events.js)
  teal8_ward, teal8_blue,   // 청록숲8 정글 2: 같은 소품, 역할 바꾼 대사(경섭이 와드 박기 / 억빠맨이 먼저 마심) (src/data/cutscenes/teal8_events.js)
  obj1_arrive, obj1_meet, obj1_push, obj1_cannon_look,   // 옵젝영역1 쥰희·용준 대포 밀기 → 만남 → 쥰희 퇴장 → C 연타 로켓 발사 (src/data/cutscenes/obj1_cannon.js)
  obj2_statue, obj2_sign, obj2_blue, obj2_recall, obj2_egg, obj2_banana,   // 옵젝영역2 광장: 쥰희 동상 벽·바론 둥지 표지판·마나샘·귀환 발판·오브젝트 알·바나나 (src/data/cutscenes/obj2_events.js)
  obj0_blue,   // 옵젝영역0 마나샘: 억빠맨이 발밑 물을 먼저 떠 마심(흙맛) → 마나샘 → 전원 회복 (src/data/cutscenes/obj0_events.js)
  teal9_boss, teal9_lantern, teal9_block, teal9_red_after, teal9_blue_after,   // 청록숲9 고대 사원 길: 레드·블루 문지기(대화 → 사이렌 → 보스전) + 석등·돌덩이 한 줄 (src/data/cutscenes/teal9_boss.js)
  teal5_board, teal5_wall,   // 청록숲5 물길: 승선 컷신(경섭 선택지 끊김·둘 다 헤엄) / 이단폭포 협동 2단 점프 튜토리얼 (src/data/cutscenes/teal5_river.js)
  teal4_peel, teal4_button, teal4_flower,   // 청록숲4: 바나나 껍질·수상한 버튼2·검은 꽃 (src/data/cutscenes/teal4_events.js) (src/data/cutscenes/teal2_events.js)
  rock_flowers, rock_sign, rock_boulder,   // 낙석 맵 꼬리 길 이벤트 3개: 꽃 냄새 / 표지판 / 떨어진 바위 (src/data/cutscenes/rock_events.js)
  // 보라맵3 뗏목 퍼즐 표지판
  void3_sign_a: [
    { text: '* 땟목이 갈리는 곳이다.', voice: 'narrator' },
    { text: '* 나가는 길은 하나뿐.{w=0.4} 껄껄.', voice: 'narrator' },
  ],
  void3_sign_e: [
    { text: '* 막다른 길이다.{w=0.4} 껄껄.', voice: 'narrator' },   // 위 경로(C→F→E) 끝
  ],
  void3_sign_d: [
    { text: '* 막다른 길이다.', voice: 'narrator' },
    { text: '* 내려온 땟목을 다시 타면 돌아간다.{w=0.4} 껄껄.', voice: 'narrator' },
  ],
  void3_sign_g: [
    { text: '* 오 이걸 찾았노{w=0.4} ㅊㅋㅊㅋ', voice: 'narrator' },   // 사용자 지정 (2026-09-10)
  ],
  room_bed: [
    { text: '* 내 침대다.{w=0.3} 위에 선반이 있다.', voice: 'narrator',
      choice: { options: [{ label: '이불', goto: 'blanket' }, { label: '선반', goto: 'shelf' }] } },
    { label: 'blanket' },
    { text: '* 이불을 어질러 놔야 혹시나 누가 정리하라고 돈을 쏠 거 같다.', voice: 'narrator' },
    { end: true },
    { label: 'shelf' },
    { text: '* 팬미팅 때 쌓아 뒀던 여분의 향수와 약들이 보인다.', voice: 'narrator' },
    { text: '* ...{w=0.5} 바세린도 보인다.', voice: 'narrator' },
    { text: '* 쓸까?', voice: 'narrator', choice: { options: [{ label: '예', goto: 'yes' }, { label: '아니오', goto: 'end' }], cancel: 1 } },
    { label: 'yes' },
    { text: '* 바세린을 밑에 발랐다.{w=0.4} 촉촉해진 기분이다.', voice: 'narrator' },
    { set: { vaseline: true } },
    { label: 'end' },
  ],
  room_poster: [{ text: '* 방송 포스터다.{w=0.3} 내 얼굴이 크게 박혀 있다.', voice: 'narrator' }],
  room_window: [
    { text: '* 반지하 창문이다.{w=0.3} 창밖에 반밖에 안 보인다.', voice: 'narrator' },
    { text: '* 지나가는 사람 발만 보인다.', voice: 'narrator' },
  ],
  corridor_shovel: [
    { text: '* 삽이다.{w=0.3} 집 밖으로 나갈 때 써야 한다.', voice: 'narrator' },
  ],
  corridor_frame: [
    { text: '* 어릴 때 사진이다.{w=0.4} 그때도 이 얼굴이었네.', voice: 'narrator' },
  ],
  // 방문: 컴퓨터 확인 전엔 잠김 (room.json door 의 requires:'pc_checked' + lockedScript). 확인 후엔 복도로 이동
  room_door: [
    { text: '* (방송이 먼저다.{w=0.3} 컴퓨터부터 켜자.)', voice: 'narrator' },
  ],

  // ── 거실/부엌 ──────────────────────────────────────────
  living_enter,
  living_table: [
    { if: (f) => f.tart_eaten, goto: 'empty' },
    { text: '* 에그타르트가 있다.', voice: 'narrator' },
    { text: '* 먹을까?', voice: 'narrator', choice: { options: [{ label: '예', goto: 'eat' }, { label: '아니오', goto: 'no' }], cancel: 1 } },
    { label: 'eat' },
    { remove: 'tart' },
    { set: { tart_eaten: true } },
    { text: '* 살짝 눅눅하고 차갑지만 맛은 있었다.', voice: 'narrator' },
    { end: true },
    { label: 'no' },
    { end: true },
    { label: 'empty' },
    { text: '* 빈 접시만 남았다.', voice: 'narrator' },
  ],
  living_fridge: [
    HS('* 음{w=0.4} 냉장고에 뭐 없나..'),
    HS('* 후추?{w=0.5} 이건 왜 있지 ㅅㅂ'),
    HS('* 아 진짜 씨발{w=0.3} 왠지 어제 사골곰탕 먹는데 아프더라{w=0.3} 아오'),
    { text: '* 기분이 안좋아졌다.', voice: 'narrator' },
    { set: { fridge_checked: true } },
  ],
  // 티비: 서랍 3D 씬에서 보라색 코드를 찾는다 (src/scenes/drawer.js). 2D 줌인 → 3D 크로스페이드 → 획득 → 줌아웃
  living_tv: [
    { if: (f) => f.cord_found, goto: 'done' },
    HS('* 빈 코드를 뒤져봐야겠다.'),
    { zoom: 2.8, at: 'tv', offset: [0, -10], duration: 0.9 },
    { scene3d: 'drawer', flag: 'cord_found' },
    { zoom: 1, duration: 0.7 },
    { if: (f) => !f.cord_found, goto: 'later' },
    { text: '* {c=yellow}보라색 코드 ?{/c}를 획득했다!', voice: 'narrator' },
    // 획득 직후 형섭 독백 (사용자 브리핑 2026-09-09, 띄어쓰기만 조정)
    HS('* 코드 색깔이 왤캐 이상하지?{w=0.4} 뭐 상관 없나'),
    HS('* 아 지각이네 ㅅㅂ{w=0.3} 걍 뭐 대충 위 아팠다고 하지 뭐'),
    HS('* 개돼지들 대강 비위 맞춰주고 미안하다고 하다가'),
    HS('* 근첩 한 명 잡아서 고로시하면 거기로 다 여론몰이 될꺼니까{w=0.4} 뭐 상관없나'),
    HS('* ㅋㅋ{w=0.3} 일단 방송하러 가자.'),
    { text: '* 보라색 코드를 주머니에 넣었다.', voice: 'narrator' },
    { action: (g) => { if (!g.inventory.includes('보라색 코드 ?')) g.inventory.push('보라색 코드 ?'); } },
    { end: true },
    { label: 'later' },
    { text: '* (나중에 다시 뒤지자.)', voice: 'narrator' },
    { end: true },
    { label: 'done' },
    { text: '* 코드는 챙겼다.', voice: 'narrator' },
  ],
  living_sofa: [
    { text: '* 소파다.{w=0.3} 쿠션 사이에 리모컨이 껴 있다.', voice: 'narrator' },
    { text: '* 앉으면 방송 늦는다.{w=0.3} 참자.', voice: 'narrator' },
  ],
  living_plant: [
    { text: '* 화분이다.{w=0.4} 언제 물 줬는지 모르겠다.', voice: 'narrator' },
  ],
  living_cabinet: [
    { text: '* 장식장이다.{w=0.3} 액자 속에서 내가 웃고 있다.', voice: 'narrator' },
    { text: '* 화병 꽃은 시들었다.', voice: 'narrator' },
  ],
  living_sink: [
    { text: '* 싱크대다.{w=0.3} 설거지가 쌓여 있다.', voice: 'narrator' },
    { text: '* 밥솥은 비어 있다.{w=0.5} ...{w=0.3}아 배고파', voice: 'narrator' },
  ],
  living_stove: [
    { text: '* 냄비에 어제 그 사골곰탕이 남아 있다.', voice: 'narrator' },
    { text: '* ...{w=0.5}안 먹는다.', voice: 'narrator' },
  ],
  living_window: [
    { text: '* 반지하라{w=0.3} 창밖에 반밖에 안 보인다.', voice: 'narrator' },
  ],
  living_clock: [
    { text: '* 벽시계다.{w=0.3} 8시 35분.', voice: 'narrator' },
    { text: '* 후딱 하자.', voice: 'narrator' },
  ],
  living_calendar: [
    { text: '* 달력이다.{w=0.3} 이번 달은 아무 표시도 없다.', voice: 'narrator' },
  ],
  chest_test: [
    { text: '* 상자를 열었다.{w=0.3} {c=yellow}낡은 열쇠{/c}를 손에 넣었다!', voice: 'narrator' },
    { action: (g) => g.inventory.push('낡은 열쇠') },
  ],

  test_choice: [
    {
      text: '* 선택지 테스트.{w=0.3} 뭘 고를래?', voice: 'narrator',
      choice: { options: [{ label: '하나', goto: 'one' }, { label: '둘', goto: 'two' }, { label: '셋', goto: 'three' }, { label: '취소', goto: 'cancel' }], cancel: 3 },
    },
    { label: 'one' },   { text: '* 하나를 골랐다.', voice: 'narrator' }, { end: true },
    { label: 'two' },   { text: '* 둘을 골랐다.', voice: 'narrator' }, { end: true },
    { label: 'three' }, { text: '* 셋을 골랐다.', voice: 'narrator' }, { end: true },
    { label: 'cancel' }, { text: '* (X 로 취소했다.)', voice: 'narrator' },
  ],
  // 선택지 연출 테스트: 하나씩 천천히 드러남
  test_choice_slow: [
    {
      text: '* 셋 중 하나만 고를 수 있다.', voice: 'narrator',
      choice: { options: [{ label: '하나', goto: 'one' }, { label: '둘', goto: 'two' }, { label: '셋', goto: 'three' }], delay: 0.6, stagger: 0.7 },
    },
    { label: 'one' },   { text: '* 하나를 골랐다.', voice: 'narrator' }, { end: true },
    { label: 'two' },   { text: '* 둘을 골랐다.', voice: 'narrator' }, { end: true },
    { label: 'three' }, { text: '* 셋을 골랐다.', voice: 'narrator' },
  ],
  // 선택지 연출 테스트: 뜨긴 하는데 고를 수 없고, 대사가 끊고 들어온다
  test_choice_locked: [
    {
      text: '* 뭘 먹을까?', voice: 'narrator',
      choice: { options: [{ label: '에그타르트' }, { label: '사골곰탕' }, { label: '후추' }], delay: 0.5, stagger: 0.5, locked: true, auto: 1.2 },
    },
    { text: '* 아니야!{w=0.3} 고를 수 없어{w=0.3} 다 하자.', voice: 'narrator' },
  ],
  test_switch: [
    {
      text: '* 플레이어 스프라이트를 바꾼다.', voice: 'narrator',
      choice: { options: [{ label: '형섭', goto: 'a' }, { label: '경섭', goto: 'b' }, { label: '빠맨', goto: 'c' }, { label: '취소', goto: 'd' }], cancel: 3 },
    },
    { label: 'a' }, { action: (g) => g.setPlayerSprite('hyungsub') }, { end: true },
    { label: 'b' }, { action: (g) => g.setPlayerSprite('gyeongsub') }, { end: true },
    { label: 'c' }, { action: (g) => g.setPlayerSprite('ppaman') }, { end: true },
    { label: 'd' },
  ],
  test_battle_preview: [
    { action: (game) => game.openBattlePreview() },
  ],
  test_hyungsub: [
    { text: '* (거울이다.){w=0.4} 흰 티에 반바지.', voice: 'narrator' },
    { text: '* 오늘도 멀쩡하군.', voice: 'narrator' },
  ],
  test_gyeongsub: [
    { speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* ...{w=0.5}경섭이다.' },
    { speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* 머리 좀 길었지.{w=0.3} 자를 생각은 없어.' },
  ],
  test_ppaman: [
    { speaker: '빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* {wave}빠아아맨.{/wave}' },
    { speaker: '빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* 곰 아니야.{w=0.4} {shake}곰 아니라고.{/shake}' },
  ],
  test_junhee: [
    { speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: '* 뭘 봐.' },
    { speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: '* ...{w=0.4}{shake}꿀꿀{/shake}이라고 하면 죽는다.' },
    { motion: 'junhee', name: 'laugh', sfx: 'laugh_junhee' },
    { speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: '* {wave}크크크.{/wave}' },
  ],
  test_cutscene: Object.assign([
    { text: '* (컷신 데모 시작)', voice: 'narrator', auto: 0.6 },
    { camera: [16, 7], duration: 0.8 },
    { parallel: [
      { move: 'ppaman', to: [14, 8], run: true },
    ] },
    { face: 'ppaman', dir: 'toward:player' },
    { shake: 0.3, amp: 3 },
    { speaker: '빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* 러그 밟지 마.' },
    { text: '* ...그건 빠맨 자리다.', voice: 'narrator' },
    { camera: 'player' },
    { parallel: [
      { move: 'ppaman', to: [16, 7] },
    ] },
    { text: '* (컷신 데모 끝.{w=0.3} 러그에서 내려갔다 다시 밟으면 반복)', voice: 'narrator' },
  ], { silent: true }),







};
