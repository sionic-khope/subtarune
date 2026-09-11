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
import { teal9_boss, teal9_lantern, teal9_block, teal9_red_after, teal9_blue_after } from './cutscenes/teal9_boss.js';
import { teal7_hide } from './cutscenes/teal7_hide.js';

/**
 * 형섭 대사 vs 나레이션 (2026-09-10 확정)
 *  - HS(): 형섭이 "입으로 말하는" 줄 — 인트로 맵(방·복도·거실, void_fallen 전)에서만 이름 '형섭' + 흰검 초상화 + 가재맨 톤 목소리.
 *  - narrator: 사물 설명("창문이다"), 괄호 속 생각("(엄마한테 가야 된다)"), 상태("기분이 안좋아졌다"), 의성어("철컥..").
 *  - 보라맵(void_fallen)부터는 자아가 바뀐 컨셉 → 형섭 대사도 이름·초상화 없이 나레이션처럼(narrator). HS() 를 쓰지 않는다.
 */
export const HS = (text, extra = {}) => ({ speaker: '형섭', portrait: 'hyungsub', voice: 'hyungsub', text, ...extra });

export const SCRIPTS = {
  opening,

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
