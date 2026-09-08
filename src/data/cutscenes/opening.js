// ─────────────────────────────────────────────────────────────
// 오프닝 컷신. 타이틀에서 C → 여기 → 반지하 방에서 플레이 시작.
// 컷신 작성법: .claude/skills/cutscene/SKILL.md  /  템플릿: src/data/cutscenes/_template.js
// ─────────────────────────────────────────────────────────────
const N = (text, extra = {}) => ({ style: 'narration', voice: 'none', speed: 0.6, text, ...extra });

export const opening = Object.assign([
  { fade: 'in', duration: 0 },                       // 타이틀의 검은 화면을 그대로 이어받음
  { wait: 0.8 },

  N('20XX년.'),
  N('평화로운 우이동,{w=0.5}{n}한 반지하에서...'),
  N('{s=0.7}...{/s}{w=0.6}'),
  N('아무 일도 일어나지 않을 것 같은{w=0.4}{n}그런 날이었다.'),

  { fade: 'out', duration: 0 },
  { map: 'room', spawn: 'bed' },
  { face: 'player', dir: 'right' },
  { wait: 0.6 },
  { fade: 'in', duration: 1.6 },
  { wait: 0.8 },

  { text: '* ......', voice: 'narrator' },
  { text: '* 눈을 떴다.{w=0.5} 오늘도.', voice: 'narrator' },
  { move: 'player', by: [0, 16] },
  { wait: 0.4 },
  { face: 'player', dir: 'down' },
  { text: '* 창밖에서 발소리가 들린다.', voice: 'narrator' },
  { shake: 0.25, amp: 2 },
  { sfx: 'door' },
  { spawn: { type: 'npc', id: 'opening_cat', sprite: 'cat', x: 6 * 16 + 2, y: 7 * 16 + 4, facing: 'up', script: 'cat' } },
  { move: 'opening_cat', to: [6, 5] },
  { move: 'opening_cat', to: [3, 3], run: true },
  { face: 'player', dir: 'toward:opening_cat' },
  { face: 'opening_cat', dir: 'toward:player' },
  { wait: 0.5 },
  { speaker: '???', portrait: 'cat', voice: 'cat', text: '* 야옹.' },
  { speaker: '???', portrait: 'cat', voice: 'cat', text: '* {wave}야아옹.{/wave}' },
  { text: '* 문이 잠겨 있었을 텐데.', voice: 'narrator' },
  { text: '* 고양이가 문 쪽을 바라본다.{w=0.4} {c=yellow}따라오라는 뜻{/c} 같다.', voice: 'narrator' },
  { move: 'opening_cat', to: [6, 6] },
  { face: 'opening_cat', dir: 'down' },
  { set: { opening_seen: true } },
], { silent: true });   // 컷신은 대화창 열림/닫힘 효과음 없이
