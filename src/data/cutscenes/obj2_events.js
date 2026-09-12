// ─────────────────────────────────────────────────────────────
// 옵젝영역2 광장 이벤트 (사용자 브리핑 2026-09-12).
//   동상·표지판 대사는 **브리핑 그대로**. 마나샘·귀환 발판·오브젝트 알·바나나 대사는 내가 씀(이 지역 소재로).
//   1) obj2_statue  오른쪽길을 막은 쥰희 나무 동상 — 억빠맨의 뻥 → 경섭이 당황 → "분열이 일어나면 안될텐데"
//   2) obj2_sign    윗길(바론 둥지) 경고 표지판 — 억빠맨이 무서워함 → 용준이 왜 똑똑해졌냐 → "게임적 연출로 똑똑해진건 아닌듯하다"
//   3) obj2_blue    마나샘(회복 쉼터 재사용): 이번엔 억빠맨이 **양보**한다(아직 흙맛이 나서)
//   4) obj2_recall  귀환 발판: 억빠맨이 귀환을 켠다 → 빛에 감싸여 **사라짐** → 정적 → 같은 자리에 돌아옴("집이 없었어요")
//   5) obj2_egg     오브젝트 알: 톡톡 → 부들부들 → 쩍 → 다리가 나와 **도망간다**(자리는 빈다)
//   6) obj2_banana  바나나 1개(힐템)
// ─────────────────────────────────────────────────────────────
import { CHARACTERS } from '../characters.js';
const G = (text, extra = {}) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text, ...extra });
const P = (text, extra = {}) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text, ...extra });
const N = (text) => ({ text, voice: 'narrator' });
const healAll = (g) => { for (const id of ['hyungsub', ...g.party]) g.partyHp[id] = g.maxHpOf ? g.maxHpOf(id) : (CHARACTERS[id]?.hp ?? 100); g.autosave?.(); };

export const obj2_statue = [
  { face: 'ppaman', dir: 'toward:statue2' }, { face: 'gyeongsub', dir: 'toward:statue2' },
  P('* 아 씨발{w=0.3} 또 이 좆같은걸로 막혀있네요'),
  G('* 허허..'),
  P('* 여기 뭐가 적혀있네{w=0.4} {c=yellow}그것{/c}을 만드는 장소?'),
  { emote: 'gyeongsub', kind: '!', hold: 0.35 },
  G('* 뭐{w=0.2} 뭐라고????'),
  P('* 뻥인데요'),
  G('* ...'),
  P('* 뭔가 많이 당황하시네요'),
  G('* 허허{w=0.3} 그런가'),
  { wait: 0.3 },
  N('* 분열이 일어나면 안될텐데'),
  { set: { obj2_statue_seen: true } },
];

export const obj2_sign = [
  N('* {c=yellow}주의 주의 오브젝트 서식지 아주 아주 위험하다{/c}'),
  { face: 'ppaman', dir: 'toward:sign' }, { face: 'gyeongsub', dir: 'toward:sign' },
  { emote: 'ppaman', kind: 'sweat', hold: 0.4 },
  P('* ...{w=0.5} 형 저 무서워요'),
  G('* 아까 그 대포가 있으니까 문제없지않을까?'),
  P('* 형들은 걔네를 믿으세요?{w=0.4} 전 아직도 이상해요{w=0.3} 그 저능한 용준이가 어떻게 그렇게 똑똑해진거지?'),
  G('* 음..'),
  { wait: 0.3 },
  N('* 게임적 연출로 똑똑해진건 아닌듯하다.'),
  { set: { obj2_sign_seen: true } },
];

export const obj2_blue = [
  { if: (f) => f.obj2_blue_done, goto: 'again' },
  { face: 'gyeongsub', dir: 'toward:blue' }, { face: 'ppaman', dir: 'toward:blue' },
  G('* 또 마나샘이네'),
  P('* 형{w=0.3} 이번엔 형이 드세요'),
  G('* 웬일로 양보를 다 하냐'),
  P('* 아까 그 흙맛이 아직 안 빠져서요'),
  { move: 'gyeongsub', rel: 'blue', at: 'bottom', by: [0, 6], run: true }, { face: 'gyeongsub', dir: 'up' }, { wait: 0.25 },
  { hop: 'gyeongsub', by: [0, 0], height: 10, duration: 0.3, sfx: false },
  N('* 경섭이 마나샘 물을 한 모금 마셨다.'),
  G('* 허허{w=0.3} 이건 또 시원하네'),
  P('* ...{w=0.4} 저도 한 입만'),
  { move: 'ppaman', rel: 'blue', at: 'bottom', by: [34, 8], run: true }, { face: 'ppaman', dir: 'up' },
  { move: 'player', rel: 'blue', at: 'bottom', by: [-34, 8], run: true }, { face: 'player', dir: 'up' }, { wait: 0.2 },
  { parallel: [{ hop: 'ppaman', by: [0, 0], height: 10, duration: 0.3, sfx: false }, { hop: 'player', by: [0, 0], height: 10, duration: 0.3, sfx: false }] },
  N('* 결국 셋 다 마셨다.'),
  { label: 'heal' },
  { sfx: 'heal' }, { shake: 0.25, amp: 2 }, { action: healAll },
  N('* {c=yellow}파란 기운이 온몸에 퍼졌다!{/c}{n}* HP가 모두 회복되었다!'),
  { if: (f) => f.obj2_blue_done, goto: 'end' },
  P('* 흙맛 빠졌다'),
  { set: { obj2_blue_done: true } },
  { label: 'end' }, { end: true },
  { label: 'again' },
  N('* 마나샘이 졸졸 흐른다.'),
  { goto: 'heal' },
];

export const obj2_recall = [
  { if: (f) => f.obj2_recall_done, goto: 'again' },
  { face: 'ppaman', dir: 'toward:recall' }, { face: 'gyeongsub', dir: 'toward:recall' },
  P('* 어{w=0.3} 형 이거 귀환진 아니에요?'),
  G('* 그런 게 왜 여기 있냐'),
  P('* 저 잠깐만 집 좀 갔다 올게요'),
  G('* 야'),
  { move: 'ppaman', rel: 'recall', at: 'bottom', by: [0, -14], run: true }, { face: 'ppaman', dir: 'down' }, { wait: 0.3 },
  { sfx: 'chime' },
  { aura: { from: ['recall'], to: ['ppaman'], colors: ['#3b7fe0', '#9fe0ff', '#c9a6f0'], n: 30, duration: 1.6 } },
  N('* 억빠맨이 귀환을 시작했다.'),
  { aura: { from: ['recall'], to: ['ppaman'], colors: ['#9fe0ff', '#ffffff'], n: 40, duration: 1.2 } },
  { sfx: 'whoosh' }, { hide: 'ppaman' }, { shake: 0.25, amp: 2 },
  { wait: 1.4 },
  N('* ......'),
  G('* ...진짜 갔네'),
  { wait: 1.0 },
  { sfx: 'whoosh' }, { show: 'ppaman' }, { aura: { from: ['recall'], to: ['ppaman'], colors: ['#3b7fe0', '#9fe0ff'], n: 20, duration: 0.9 } },
  { emote: 'ppaman', kind: '!', hold: 0.4 },
  P('* 형'),
  G('* 왜'),
  P('* 저 집이 없었어요'),
  G('* ...'),
  N('* 억빠맨은 잠시 조용해졌다.'),
  { set: { obj2_recall_done: true } },
  { end: true },
  { label: 'again' },
  N('* 귀환진이 천천히 돌고 있다.{w=0.4} 억빠맨은 쳐다보지 않는다.'),
];

export const obj2_egg = [
  { if: (f) => f.obj2_egg_hatched, goto: 'again' },
  { face: 'ppaman', dir: 'toward:egg' }, { face: 'gyeongsub', dir: 'toward:egg' },
  N('* 커다란 알이다.{w=0.4} 미지근하다.'),
  P('* 이거 오브젝트 알인가요?'),
  G('* 만지지 마라'),
  P('* 톡'),
  { sfx: 'knock' }, { tremble: 'egg', duration: 0.5, amp: 2 }, { wait: 0.6 },
  G('* 야'),
  P('* 톡 톡'),
  { sfx: 'knock' }, { tremble: 'egg', duration: 0.9, amp: 3 }, { wait: 0.5 },
  { sfx: 'pop' }, { shake: 0.3, amp: 3 },
  N('* {c=yellow}쩍{/c}'),
  // 다리가 나와 광장 오른쪽으로 도망간다(자리는 빈다)
  { remove: 'egg' },
  { spawn: { type: 'prop', id: 'egg_run', image: 'assets/props/obj_egg_legs.png', x: 28 * 32 + 4, y: 16 * 32 + 10, w: 16, h: 8, ix: 28 * 32 - 2, iy: 16 * 32 - 16, solid: false, sortY: 0 } },
  { wait: 0.4 },
  { slide: 'egg_run', by: [240, 40], duration: 1.1, sfx: 'pop' },
  { slide: 'egg_run', by: [300, 0], duration: 0.9 },
  { remove: 'egg_run' },
  { wait: 0.3 },
  P('* ... 도망갔어요'),
  G('* 다리가 있었네'),
  N('* 알에 다리가 있는 건 처음 본다.'),
  { set: { obj2_egg_hatched: true } },
  { end: true },
  { label: 'again' },
  N('* 알이 있던 자리다.{w=0.4} 껍데기 부스러기만 남았다.'),
];

export const obj2_banana = [
  { sfx: 'item' }, { action: (g) => { g.inventory.push('바나나'); } }, { remove: 'banana' },
  N('* 물 위에 {c=yellow}바나나{/c}가 떠 있었다.{w=0.3} 챙겼다.'),
  P('* 젖은 바나나는 좀'),
  { set: { obj2_banana_taken: true } },
];
