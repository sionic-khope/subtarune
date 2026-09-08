// ─────────────────────────────────────────────────────────────
// 오프닝 (시작 스토리). 타이틀에서 C → 검은 화면 나레이션 → 하얗게 → 인게임(반지하).
// BGM: assets/audio/bgm/opening.mp3 (나레이션 내내), 하얘질 때 페이드아웃.
// 작성법: .claude/skills/cutscene/SKILL.md
// ─────────────────────────────────────────────────────────────
const N = (text, extra = {}) => ({ style: 'narration', voice: 'narrator', speed: 0.7, text, ...extra });

export const opening = Object.assign([
  // 타이틀의 검은 화면(fade 1)을 유지한 채 브금 시작 → 첫 나레이션 직전에 걷음 (맵이 깜빡 보이는 것 방지)
  { curtain: 'black' },                              // 나레이션 동안 맵은 절대 안 보임
  { bgm: 'opening', volume: 0.35 },
  { wait: 1.2 },
  { fade: 'in', duration: 0 },

  N('20XX년{w=0.4} 평화롭던 우이동{w=0.4} 어느날'),
  N('그저..{w=0.6} 다른 날들과 딱히 다를일 없을 것 같았던'),
  N('아주 평범하고도{w=0.3} 평범한 날이었다.'),
  N('그런날일수록{w=0.4} 뭐랄까{w=0.5} 묘한 감정이'),
  N('알 수 없는 불안감과{w=0.4} 조여오는 위가.'),
  N('{s=0.8}강하게 느껴지는것같았다.{/s}'),
  {
    ...N('{s=0.45}당신은 누구인가요?{/s}'),                           // 천천히
    choice: { options: [{ label: '요플래', goto: 'named' }], delay: 1.6 },   // 선택지 하나, 1.6초 뒤에 뜸
  },
  { label: 'named' },
  { set: { player_name: '요플래' } },
  N('{s=0.35}…{/s}{w=0.9}{s=0.35}…{/s}{w=0.9}{s=0.35}…{/s}{w=0.6}'),
  N('환영합니다{w=0.3} {c=yellow}요플래{/c} 님'),
  N('그럼..{w=0.7} 당신의 이야기를 들어볼까요'),
  // 마지막 줄: "내 이름은 ㄱ.." 이 다 나온 직후부터 흰색이 서서히 덮어온다 (텍스트 ≈ 3.2초, 흰색은 2.6초 뒤 시작해 3초간)
  { async: [{ wait: 2.6 }, { sfx: 'white' }, { fade: 'white', duration: 3.0 }] },
  { bgm: null, fadeOut: 5.0 },
  N('{s=0.3}내 이름은 {w=0.7}ㄱ{w=0.7}.{w=0.7}.{/s}{w=2.0}', { auto: 0.1 }),
  { fade: 'white', duration: 0 },                    // 텍스트가 끝나는 순간 흰색 100%
  { curtain: 'white' },
  { wait: 0.6 },
  { map: 'room', spawn: 'bed' },
  { pose: 'player', to: 'lying' },
  { wait: 1.6 },
  { bgm: 'room', volume: 0.3 },                     // 방 브금 (mANXrxS5SPg)
  { curtain: null },
  { fade: 'in', duration: 2.0 },                     // 흰색이 걷히며 방이 드러남
  { caption: '평화롭던 우이동', duration: 3.4 },     // 지역 이름 떴다 사라짐
  { wait: 2.6 },
  { text: '* …{w=0.6} …{w=0.6} 아 맞다 ㅅㅂ', voice: 'narrator' },
  { text: '* 방송 켜야지{w=0.3} 아 8시 35분이네{w=0.3} 후딱 켜야겠다.', voice: 'narrator' },
  { pose: 'player', to: 'stand' },
  { move: 'player', px: [340, 246] },                // 침대 옆으로 내려옴 (수레 피해서)
  { face: 'player', dir: 'left' },
  { text: '* (컴퓨터가 있는 곳으로 가야 할 거 같다)', voice: 'narrator' },
  { set: { opening_seen: true } },
], { silent: true });
