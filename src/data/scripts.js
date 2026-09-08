// ─────────────────────────────────────────────────────────────
// 대사 스크립트. 노드 문법은 src/ui/dialogue.js 상단 참고.
// 태그: {s=2} 속도  {w=0.5} 멈춤  {c=red}..{/c} 색  {shake}..{/shake}  {wave}..{/wave}
// voice: src/core/audio.js VOICES 키. portrait: main.js 의 portraits 키.
// ─────────────────────────────────────────────────────────────
import { opening } from './cutscenes/opening.js';

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
    { text: '* (코드가 없다.{w=0.3} 엄마한테 가야 된다.)', voice: 'narrator' },
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
  room_desk2: [{ text: '* 램프가 있는 책상.{w=0.3} 켜져 있다.', voice: 'narrator' }],
  room_wagon: [{ text: '* 수레에 잡동사니가 실려 있다.', voice: 'narrator' }],
  room_door: [
    { if: (f) => f.pc_checked, goto: 'go' },
    { text: '* (방송이 먼저다.{w=0.3} 컴퓨터부터 켜자.)', voice: 'narrator' },
    { end: true },
    { label: 'go' },
    { text: '* (엄마한테 가자.){w=0.5}{n}* (다음 구역은 아직 준비 중이다.)', voice: 'narrator' },
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
