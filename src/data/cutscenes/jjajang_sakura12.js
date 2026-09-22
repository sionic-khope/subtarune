// 벚꽃 숲 12 제단(jjajang_sakura12) — 짜장면과 상호작용(C)하면 시작하는 연출(BUILD288 사용자 브리핑 2026-09-21, 원문·구현표 design/narrative/cutscenes/jjajang_sakura12.md)
//   대사는 전부 원문. 짜장면 목소리는 나레이션과 같이(voice narrator). “요플래 느낌표”는 주인공 머리 위 !. “짜장면을 획득했다.” 에서 그릇이 제단에서 사라지고 중요 아이템 ‘어둠의 짜장면’이 들어온다.
//   “나는 눈을 감는다.” → 검은 전환 → 오른쪽 밤 절벽의 경섭·최미스 장면.
export const DARK_JJAJANG_ITEM = '어둠의 짜장면';
export const DARK_JJAJANG_FLAG = 'dark_jjajang_taken';
export const EYES_CLOSED_FLAG = 'sakura12_eyes_closed';
export const EYES = { fadeOut: 1.6, hold: 1.2, fadeIn: 0.9 };
export const BOWL_ID = 'sakura12_dark_jjajang';

const J = text => ({ speaker: '짜장면', portrait: 'dark_jjajang', voice: 'narrator', text: `* ${text}` });
const N = text => ({ voice: 'narrator', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const exclaim = { emote: 'player', kind: '!', duration: 1.0, hold: 0.55 };

export const jjajang_sakura12_bowl = [
  // 이미 얻었으면 아무 일 없음 — 같은 방문에서 다시 C 를 눌러도 연출이 반복되거나 짜장면이 또 들어오지 않게(플래그 unless 는 맵 재진입 때만 적용된다)
  { if: flags => !!flags[DARK_JJAJANG_FLAG], goto: 'after_item' },
  { face: 'player', dir: 'up' },
  J('안녕하세요'),
  close, exclaim,
  J('왜요 짜장면이 말하면 안되는건가요? 프하하'),
  J('저는 짜장면이지만 어떠한 힘이 깃들어 있어서 말을 할 수 있어요'),
  J('저를 먹으면 강한 힘을 얻을 수 있을거에요'),
  J('...'),
  J('네? 가재맨이요? 전 그런거 몰라요~'),
  J('흠 어쨋든 저를 먹으실건가요?'),
  J('미안하지만 당신은 절 드실수 없을거에요'),
  J('저는 고춧가루가 들어가있거든요'),
  J('위염갖고계신분한테는 힘들거에요'),
  J('네? 저를 먹으려고 하는 나쁜사람이 있고'),
  J('그 사람이 절 먹으면 큰일난다구요?'),
  J('네 그래서 제가 지금 여기 있는거잖아요'),
  J('더 안전한 곳으로 데려다주신다구요? 알겠어요'),
  J('흥. 이번 한번만이에요'),
  close,
  // 짜장면을 획득했다: 그릇(오라째)이 제단에서 사라지고 아이템으로
  { remove: BOWL_ID },
  { sfx: 'item' },
  { action: game => { game.inventory.push('어둠의 짜장면'); } },
  { set: { [DARK_JJAJANG_FLAG]: true } },
  N('{c=yellow}짜장면{/c}을 획득했다.'),
  // (이후에)
  J('근데 여기서 어떻게 나가실거에요?'),
  close, exclaim,
  N('아 맞다.'),
  J('이럴땐 편한하게 다른사람들이 어디서 무엇을 하고있는지'),
  J('천천히 생각해보시는걸 추천해요'),
  N('...'),
  N('나는 눈을 감는다.'),
  close,
  { label: 'night_view' },
  { bgm: null, fadeOut: 0.8 },
  { fade: 'out', duration: EYES.fadeOut },
  { wait: EYES.hold },
  { set: { [EYES_CLOSED_FLAG]: true } },
  { map: 'jjajang_night_cliff', spawn: 'scene', enter: true },
  { goto: 'end' },
  // BUILD288 saves already hold the item. Resume the added scene without giving it twice.
  { label: 'after_item' },
  { if: flags => !!flags[EYES_CLOSED_FLAG] && !flags.night_cliff_scene_done, goto: 'night_view' },
  { label: 'end' },
  { end: true },
];
