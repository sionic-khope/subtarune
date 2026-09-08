// ─────────────────────────────────────────────────────────────
// 오프닝 (시작 스토리). 타이틀에서 C → 검은 화면 나레이션 → 하얗게 → 인게임(반지하).
// BGM: assets/audio/bgm/opening.mp3 (나레이션 내내), 하얘질 때 페이드아웃.
// 작성법: .claude/skills/cutscene/SKILL.md
// ─────────────────────────────────────────────────────────────
const N = (text, extra = {}) => ({ style: 'narration', voice: 'narrator', speed: 0.7, text, ...extra });

export const opening = Object.assign([
  { fade: 'in', duration: 0 },
  { bgm: 'opening', volume: 0.55 },
  { wait: 1.2 },

  N('20XX년{w=0.4} 평화롭던 우이동{w=0.4} 어느날'),
  N('그저..{w=0.6} 다른 날들과 딱히 다를일 없을 것 같았던'),
  N('아주 평범하고도{w=0.3} 평범한 날이었다.'),
  N('그런날일수록{w=0.4} 뭐랄까{w=0.5} 묘한 감정이'),
  N('알 수 없는 불안감과{w=0.4} 조여오는 위가.'),
  N('{s=0.8}강하게 느껴지는것같았다.{/s}'),
  {
    ...N('당신은 누구인가요?'),
    choice: { options: [{ label: '요플래', goto: 'named' }] },   // 선택지 하나
  },
  { label: 'named' },
  { set: { player_name: '요플래' } },
  N('{s=0.35}…{/s}{w=0.9}{s=0.35}…{/s}{w=0.9}{s=0.35}…{/s}{w=0.6}'),
  N('환영합니다{w=0.3} {c=yellow}요플래{/c} 님'),
  N('그럼..{w=0.7} 당신의 이야기를 들어볼까요'),
  N('{s=0.22}아 제 이 름 은 . .{/s}{w=1.2}', { auto: 0.4 }),   // 천천히 → 자동으로 하얘짐

  { bgm: null, fade: 2.2 },
  { fade: 'white', duration: 2.4 },
  { map: 'room', spawn: 'bed' },
  { face: 'player', dir: 'down' },
  { wait: 0.6 },
  { fade: 'in', duration: 1.6 },
  { set: { opening_seen: true } },
], { silent: true });
