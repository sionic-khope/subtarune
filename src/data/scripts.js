// ─────────────────────────────────────────────────────────────
// 대사 스크립트. 노드 문법은 src/ui/dialogue.js 상단 참고.
// 태그: {s=2} 속도  {w=0.5} 멈춤  {c=red}..{/c} 색  {shake}..{/shake}  {wave}..{/wave}
// voice: src/core/audio.js VOICES 키. portrait: main.js 의 portraits 키.
// ─────────────────────────────────────────────────────────────
import { opening } from './cutscenes/opening.js';
import { living_enter } from './cutscenes/living_enter.js';

export const SCRIPTS = {
  opening,

  _chest_empty: [{ text: '* 상자는 비어 있다.', voice: 'narrator' }],

  // ── 형섭의 방 (우이동) ──────────────────────────────────
  room_computer: [
    { if: (f) => f.pc_checked, goto: 'again' },
    { text: '* ???{w=0.4} 어 뭐야', voice: 'narrator' },
    { text: '* ㅅㅂ 코드 어디 갔어{w=0.3} 컴퓨터가 안 켜지는데', voice: 'narrator' },
    { text: '* 아 엄마가 뭐 청소하다가 빼셨나', voice: 'narrator' },
    { text: '* (청소ㄴ…{w=0.5} 아니 엄마한테 가야 될 것 같다.)', voice: 'narrator' },
    { set: { pc_checked: true } },
    { end: true },
    { label: 'again' },
    { if: (f) => f.cord_found, goto: 'have' },
    { text: '* (코드가 없다.{w=0.3} 엄마한테 가야 된다.)', voice: 'narrator' },
    { end: true },
    { label: 'have' },
    { text: '* (코드는 챙겼다.)', voice: 'narrator' },   // 다음 이벤트(꽂기) 브리핑 대기
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
    { text: '* 음{w=0.4} 냉장고에 뭐 없나..', voice: 'narrator' },
    { text: '* 후추?{w=0.5} 이건 왜 있지 ㅅㅂ', voice: 'narrator' },
    { text: '* 아 진짜 씨발{w=0.3} 왠지 어제 사골곰탕 먹는데 아프더라{w=0.3} 아오', voice: 'narrator' },
    { text: '* 기분이 안좋아졌다.', voice: 'narrator' },
    { set: { fridge_checked: true } },
  ],
  // 티비: 서랍 3D 씬에서 보라색 코드를 찾는다 (src/scenes/drawer.js). 2D 줌인 → 3D 크로스페이드 → 획득 → 줌아웃
  living_tv: [
    { if: (f) => f.cord_found, goto: 'done' },
    { text: '* 빈 코드를 뒤져봐야겠다.', voice: 'narrator' },
    { zoom: 2.8, at: 'tv', offset: [0, -10], duration: 0.9 },
    { scene3d: 'drawer', flag: 'cord_found' },
    { zoom: 1, duration: 0.7 },
    { if: (f) => !f.cord_found, goto: 'later' },
    { text: '* {c=yellow}보라색 코드 ?{/c}를 획득했다!', voice: 'narrator' },
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
    { sfx: 'laugh_junhee' },
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
