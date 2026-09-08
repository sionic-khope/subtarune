// ─────────────────────────────────────────────────────────────
// 대사 스크립트. 노드 문법은 src/ui/dialogue.js 상단 참고.
// 태그: {s=2} 속도  {w=0.5} 멈춤  {c=red}..{/c} 색  {shake}..{/shake}  {wave}..{/wave}
// voice: src/core/audio.js VOICES 키. portrait: main.js 의 portraits 키.
// ─────────────────────────────────────────────────────────────
import { opening } from './cutscenes/opening.js';

export const SCRIPTS = {
  opening,

  _chest_empty: [{ text: '* 상자는 비어 있다.', voice: 'narrator' }],

  // ── 테스트룸 ──────────────────────────────────────────
  sign_test: [{ text: '* "→ 테스트룸.{w=0.3} 개발용."', voice: 'narrator' }],
  test_help: [
    { text: '* 테스트룸.{w=0.3} 여기서 모든 인터랙션을 시험한다.', voice: 'narrator' },
    { text: '* 팻말: {c=yellow}효과{/c} / {c=yellow}선택지{/c} / {c=yellow}캐릭터 교체{/c}.{n}* 러그를 밟으면 컷신.{w=0.3} 상자·문·NPC 도 있다.', voice: 'narrator' },
    { text: '* URL 에 {c=blue}?map=test{/c} 를 붙이면 바로 여기로 온다.', voice: 'narrator' },
  ],
  test_effects: [
    { text: '* 속도: {s=3}빠르게빠르게빠르게{/s}{w=0.3} {s=0.4}느리게{/s} 보통.', voice: 'narrator' },
    { text: '* 색: {c=red}빨강{/c} {c=yellow}노랑{/c} {c=blue}파랑{/c} {c=green}초록{/c} {c=pink}분홍{/c} {c=purple}보라{/c} {c=gray}회색{/c}', voice: 'narrator' },
    { text: '* {shake}흔들림 흔들림{/shake}{w=0.3} {wave}물결 물결 물결{/wave}', voice: 'narrator' },
    { text: '* 음색 테스트 →', voice: 'narrator' },
    { speaker: 'hero',    text: '* 주인공 음색.', voice: 'hero' },
    { speaker: 'low',     text: '* 낮은 음색.', voice: 'low' },
    { speaker: 'cat',     text: '* 고양이 음색.', voice: 'cat' },
    { speaker: 'robot',   text: '* 로봇 음색.', voice: 'robot' },
    { text: '* 긴 문장은 자동으로 줄바꿈되고 세 줄이 넘으면 다음 페이지로 넘어간다. 이 문장은 그것을 확인하기 위해 일부러 길게 쓴 문장이다. 계속 계속 계속 이어진다.', voice: 'narrator' },
    { style: 'narration', voice: 'none', speed: 0.7, text: '나레이션 모드.{w=0.5}{n}검은 화면에 글자만 나온다.' },
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
    { speaker: '형섭', portrait: 'hyungsub', voice: 'hyungsub', text: '* 안녕,{w=0.3} 나 형섭.' },
    { speaker: '형섭', portrait: 'hyungsub', voice: 'hyungsub', text: '* 흰 티에 반바지.{w=0.3} 이게 내 유니폼이야.' },
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
      { move: 'hyungsub', to: [8, 8] },
    ] },
    { face: 'ppaman', dir: 'toward:player' },
    { face: 'hyungsub', dir: 'toward:player' },
    { shake: 0.3, amp: 3 },
    { speaker: '빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* 러그 밟지 마.' },
    { speaker: '형섭', portrait: 'hyungsub', voice: 'hyungsub', text: '* 그건 빠맨 자리야.' },
    { camera: 'player' },
    { parallel: [
      { move: 'ppaman', to: [16, 7] },
      { move: 'hyungsub', to: [6, 7] },
    ] },
    { text: '* (컷신 데모 끝.{w=0.3} 러그에서 내려갔다 다시 밟으면 반복)', voice: 'narrator' },
  ], { silent: true }),

  intro: [
    { text: '* 낯선 마을이다.{w=0.4} 공기에서 흙냄새가 난다.', voice: 'narrator' },
    { text: '* 뒤에 있는 집 문이 살짝 열려 있다.', voice: 'narrator' },
    { text: '* (마을 사람들에게 말을 걸어 보자.{w=0.3} {c=yellow}C{/c} 로 대화,{w=0.2} {c=yellow}X{/c} 를 누르고 있으면 달릴 수 있다.)', voice: 'narrator' },
  ],

  sign_village: [
    { text: '* 팻말에 이렇게 적혀 있다.', voice: 'narrator' },
    { text: '* "호롱마을에 오신 것을 환영합니다."{n}* "밤에는 호수 근처에 가지 마세요."', voice: 'narrator' },
  ],

  merchant: [
    { speaker: '상인', portrait: 'merchant', voice: 'low', text: '* 어이,{w=0.2} 처음 보는 얼굴이네.' },
    { speaker: '상인', portrait: 'merchant', voice: 'low', text: '* 우리 집에 {c=yellow}상자{/c} 하나 있는데,{w=0.3} 뚜껑이 안 열려서 말이야.' },
    {
      speaker: '상인', portrait: 'merchant', voice: 'low', text: '* 네가 한번 열어볼래?',
      choice: {
        options: [
          { label: '좋아', goto: 'yes' },
          { label: '싫어', goto: 'no' },
        ],
        cancel: 1,
      },
    },
    { label: 'yes' },
    { speaker: '상인', portrait: 'merchant', voice: 'low', text: '* 고맙다!{w=0.3} 집은 바로 저기 위쪽이야.' },
    { set: { quest_chest: true } },
    { end: true },
    { label: 'no' },
    { speaker: '상인', portrait: 'merchant', voice: 'low', text: '* {s=0.6}...{/s}그래.{w=0.4} 마음 바뀌면 말해.' },
  ],
  merchant_after: [
    { speaker: '상인', portrait: 'merchant', voice: 'low', text: '* 열었다고?{w=0.3} {shake}진짜로?{/shake}' },
    { speaker: '상인', portrait: 'merchant', voice: 'low', text: '* {s=0.7}...{/s}뭐,{w=0.2} 안에 별거 없었지?{w=0.3} 그럴 줄 알았어.' },
  ],

  cat: [
    { speaker: '???', portrait: 'cat', voice: 'cat', text: '* 야옹.' },
    { speaker: '???', portrait: 'cat', voice: 'cat', text: '* {wave}야아아옹.{/wave}' },
    { text: '* 고양이가 아니라 고양이 {c=purple}같은 것{/c}이 당신을 응시하고 있다.', voice: 'narrator' },
  ],

  guard: [
    { speaker: '경비병', portrait: 'guard', voice: 'robot', text: '* 정지.{w=0.4} 호수 쪽은 통행 금지다.' },
    { speaker: '경비병', portrait: 'guard', voice: 'robot', text: '* 이유는 묻지 마라.{w=0.3} 나도 모른다.' },
  ],

  chest_house: [
    { text: '* 상자를 열었다.', voice: 'narrator' },
    { text: '* {c=yellow}낡은 열쇠{/c}를 손에 넣었다!', voice: 'narrator' },
    { action: (g) => g.inventory.push('낡은 열쇠') },
  ],

  ghost: [
    { speaker: '유령', portrait: 'ghost', voice: 'narrator', text: '* {s=0.7}{wave}...누구세요?{/wave}{/s}' },
    { speaker: '유령', portrait: 'ghost', voice: 'narrator', text: '* 아,{w=0.3} 저는 신경 쓰지 마세요.{w=0.3} 그냥 여기 사는 사람이에요.' },
    { speaker: '유령', portrait: 'ghost', voice: 'narrator', text: '* {s=0.8}{c=gray}살던 사람이었죠.{/c}{/s}' },
    { set: { ghost_talked: true } },
  ],
  ghost_again: [
    { speaker: '유령', portrait: 'ghost', voice: 'narrator', text: '* {wave}...{/wave}' },
  ],
};
