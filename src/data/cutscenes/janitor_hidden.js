// 청소부 히든 보스(BUILD468 사용자 브리핑 2026-10-15, 대사 원문 그대로 — 콘티 design/narrative/cutscenes/janitor_hidden.md)
//   최미스 구출 뒤 엄청대박인배 라운지: 상점 건너편 분수(마나샘) 뒤편에서 아래를 보고 C → 억빠맨·경섭 대사 → “버튼을 눌러볼까?” 예 → 딸깍·정적 → …
//   → 경섭·요플래 발밑이 검게 꺼지고 모두 ‘!’ → 둘이 떨어짐 → 억빠맨 “어 어 형들!!” → 페이드 → 엄청대박인배 지하실(ship_basement, 빈 방)
//   → 둘이 떨어져 넘어짐 → 경섭이 천천히 일어남 → … → ???(청소부 목소리) → 모두 ‘!’·오른쪽 → 카메라가 오른쪽으로, 허약 청소부가 오른쪽에서 걸어옴 → 껄껄
//   → 대사 → 청소부가 휘익 사라지고 카메라는 요플래 쪽 → “어디가셨..”(‘셨’에서 끊김) → 강한 청소부(멸공의 깃발)가 위에서 내려찍으며 화면 진동, 둘은 ‘!’·간신히 옆으로
//   → 껄껄 → 대사 → 전투(janitor_hidden, 브금 Hammer of Justice). 이기면 라운지 분수 뒤로 돌아온다(억빠맨 다시 합류).
import { battleEntry } from './helpers.js';

const C = text => ({ speaker: '청소부', portrait: 'janitor', voice: 'janitor', text: `* ${text}` });
const Q = text => ({ speaker: '???', voice: 'janitor', text: `* ${text}` });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const N = text => ({ voice: 'narrator', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const actor = (game, id) => id === 'player' ? game.player : game.entities.find(e => e.id === id && !e.dead);
export const JANITOR_HIDDEN = Object.freeze({
  pit: 'assets/props/floor_pit.png', pitW: 48, pitH: 20, fall: 0.65, fallDepth: 96,
  weak: 'basement_janitor', hero: 'janitor_hero', basementParty: Object.freeze(['gyeongsub']), loungeParty: Object.freeze(['gyeongsub', 'ppaman']),
  bgm: 'janitor_hidden', flag: 'janitor_hidden_won',
});
const J = JANITOR_HIDDEN;
const animate = (game, duration, frame) => new Promise(resolve => {
  let elapsed = 0;
  game.background.push({ update(dt) { elapsed = Math.min(duration, elapsed + dt); frame(elapsed / duration); if (elapsed < duration) return false; resolve(); return true; } });
});
const laugh = id => ({ motion: id, name: 'laugh', sfx: 'laugh_janitor' });
const surprise = ids => ({ parallel: ids.map(id => ({ emote: id, kind: '!', duration: 1.0, hold: 0.5 })) });

/** 발밑 구멍: 경섭·요플래 발 아래 바닥이 검게 꺼진다(tools/art/floor_pit_set.py) */
function openPits(game) {
  for (const id of ['gyeongsub', 'player']) {
    const e = actor(game, id); if (!e) continue;
    game.spawn({ type: 'prop', id: `pit_${id}`, image: J.pit, x: Math.round(e.x + e.w / 2 - J.pitW / 2), y: Math.round(e.y + e.h - J.pitH / 2 - 4), w: J.pitW, h: J.pitH, solid: false, sortY: -50 });
  }
}
/** 둘이 구멍 속으로 빨려 내려간다(구멍 가운데 선 아래는 잘려 안 보인다) */
function fallIntoPits(game) {
  const list = ['gyeongsub', 'player'].map(id => [actor(game, id), actor(game, `pit_${id}`)]).filter(([e, pit]) => e && pit);
  for (const [e, pit] of list) { e.moving = false; e.facing = 'down'; e.doorTransit = { offsetY: 0, clip: [pit.x - 16, pit.y - 220, J.pitW + 32, 220 + J.pitH / 2] }; }
  game.sound.sfx('wing', { volume: 0.6 });
  return animate(game, J.fall, k => { for (const [e] of list) e.doorTransit.offsetY = J.fallDepth * k * k; })
    .then(() => { for (const [e] of list) { e.doorTransit = null; e.visible = false; } });
}

export const ship_fountain_button = Object.assign([
  { if: f => !!f[J.flag], goto: 'done' },
  { face: 'ppaman', dir: 'toward:player' },
  P('응? 왜요 형?'),
  { face: 'gyeongsub', dir: 'toward:player' },
  G('여기에 버튼이 있어'),
  { text: '* 버튼을 눌러볼까?', voice: 'narrator', choice: { options: [{ label: '예', goto: 'press' }, { label: '아니요', goto: 'done' }], cancel: 1 } },
  { label: 'press' }, close,
  { action: game => { game.sound.preloadBgm(J.bgm); } },
  { sfx: 'click' }, { wait: 1.4 },
  P('...'),
  G('허허 뭐지'),
  P('아무 반응도 없는데요.'), close,
  { action: openPits }, { sfx: 'scrape', volume: 0.5 },
  surprise(['ppaman', 'gyeongsub', 'player']),
  { wait: 0.25 },
  { action: fallIntoPits },
  { face: 'ppaman', dir: 'down' },
  P('어 어 형들!!'), close,
  { fade: 'out', duration: 0.8 },
  { action: game => { game.party = [...J.basementParty]; for (const id of ['gyeongsub', 'player']) { const e = actor(game, id); if (e) e.visible = true; } } },
  { action: game => { for (const e of game.entities) if (e.id === 'pit_gyeongsub' || e.id === 'pit_player') e.dead = true; } },
  { map: 'ship_basement', spawn: 'fall', enter: true },
  { label: 'done' }, { end: true },
], { silent: true });

export const ship_basement_janitor = Object.assign([
  { if: f => !!f[J.flag], goto: 'after' },
  { action: game => {
    game.party = [...J.basementParty];
    const p = game.player, g = actor(game, 'gyeongsub');
    p.facing = 'down'; p.hopY = 300;
    if (g) { g.x = p.x - 52; g.y = p.y; g.facing = 'down'; g.hopY = 300; }
    game.sound.stopBgm(0.3);
    if (game.camera) { game.camera.target = p; game.camera.locked = false; game.camera.snap?.(); }
  } },
  { wait: 0.4 },
  { fade: 'in', duration: 0.6 },
  // 경섭과 요플래가 떨어지고 넘어짐
  { drop: ['gyeongsub', 'player'], height: 300, duration: 0.55, sfx: false, land: 'thud', quake: 4 },
  { pose: 'gyeongsub', to: 'lying' }, { pose: 'player', to: 'lying' },
  { wait: 1.2 },
  // 경섭이 천천히 일어나서
  { tremble: 'gyeongsub', duration: 0.8, amp: 1 }, { wait: 0.8 },
  { pose: 'gyeongsub', to: 'stand' }, { face: 'gyeongsub', dir: 'right' }, { wait: 0.5 },
  G('어 괜찮아?'),
  G('아니 이런곳에 무슨 함정이...'), close,
  // 요플래도 이어서 일어나고
  { pose: 'player', to: 'stand' }, { face: 'player', dir: 'left' }, { wait: 0.5 },
  Q('도움이필요한가?'), close,
  { face: 'gyeongsub', dir: 'right' }, { face: 'player', dir: 'right' },
  surprise(['gyeongsub', 'player']),
  G('아니 저건...!'), close,
  // 오른쪽으로 카메라가 움직이며 허약 청소부가 오른쪽에서 왼쪽으로 걸어옴
  { show: J.weak },
  { parallel: [
    { camera: J.weak },
    { move: J.weak, rel: 'player', at: 'right', by: [88, 0], speed: 46 },
  ] },
  { face: J.weak, dir: 'left' },
  { camera: 'player' },
  laugh(J.weak), { wait: 0.3 },
  G('아..아빠?'),
  C('뭐? 처음듣는 소리라네, 지금 나는 기억이 안나서말이야'),
  G('...'),
  C('지금 곤경에 처한 것 같구만.. 음 그래 익숙한 얼굴이군'),
  C('여기서 나가고싶나?'),
  G('네'),
  C('...그래 뭐 너희앞에 큰 곤경이 처해져있을때는'),
  C('누군가의 도움을 받는것도 좋지만'),
  C('앞으로 해쳐나아가야 하는 것 아니겠나'),
  G('...'),
  C('껄껄 미안하네 말이 너무 많았지'),
  C('굳이굳이 여기까지 찾아와줬으니'),
  C('한번쯤 말로만하지말고 직접 알려주는것도 괜찮겠지'),
  G('...?'), close,
  // 청소부가 갑자기 휘익 하고 없어지며 주인공 쪽 가운데로
  { sfx: 'wing', volume: 0.7 }, { hide: J.weak },
  { camera: 'player' }, { wait: 0.6 },
  G('...'),
  // “셨”까지 나오고 말이 끊긴다 → 강한 청소부가 위에서 내려찍으며 등장, 둘은 ‘!’·간신히 옆으로
  { ...G('어디가셨..'), cut: 0.36 }, close,
  { action: game => {
    const p = game.player, g = actor(game, 'gyeongsub'), hero = actor(game, J.hero);
    if (hero) { hero.x = Math.round(((g?.x ?? p.x) + p.x) / 2); hero.y = p.y; hero.facing = 'down'; hero.hopY = 360; hero.visible = true; }
  } },
  { parallel: [
    { drop: J.hero, height: 360, duration: 0.3, sfx: 'wing', land: 'impact', quake: 7 },
    { async: [{ wait: 0.12 }, { parallel: [
      { emote: 'gyeongsub', kind: '!', duration: 1.0, hold: 0 }, { emote: 'player', kind: '!', duration: 1.0, hold: 0 },
      { hop: 'gyeongsub', by: [-44, 0], height: 10, duration: 0.3, sfx: false },
      { hop: 'player', by: [44, 0], height: 10, duration: 0.3, sfx: false },
    ] }] },
  ] },
  { face: 'gyeongsub', dir: 'toward:janitor_hero' }, { face: 'player', dir: 'toward:janitor_hero' },
  { wait: 0.4 },
  laugh(J.hero), { wait: 0.3 },
  C('어디 한번 놀아볼까?'),
  G('!!!'),
  C('나를 이기지못한다면 너희는 나갈 수 없을 것이네'),
  C('멸공의 깃발.'),
  C('너희를 계엄해주겠다.'), close,
  ...battleEntry(['janitor_hidden'], J.bgm),
  { battle: { enemies: ['janitor_hidden'], bgm: J.bgm, bg: 'janitor_basement', flag: J.flag } },
  // 이기면(사용자 브리핑): 요플래·경섭 오른쪽에 청소부 → 껄껄 → 대사 → 둘이 다가감 → 멸공의 깃발이 무기에 감긴다(팀 공격력 +1) → … → 잘 컸구나 → 경섭 ‘!’ → 들어 올려져 분수 앞으로
  { label: 'after' },
  { if: f => !!f.janitor_flag_wrapped, goto: 'leave' },
  { action: game => {
    game.party = [...J.basementParty];
    const p = game.player, g = actor(game, 'gyeongsub'), hero = actor(game, J.hero), weak = actor(game, J.weak);
    if (weak) weak.visible = false;
    p.pose = null; p.facing = 'right';
    if (g) { g.pose = null; g.x = p.x - 52; g.y = p.y; g.facing = 'right'; g.visible = true; }
    if (hero) { hero.x = p.x + 96; hero.y = p.y; hero.facing = 'left'; hero.visible = true; hero.hopY = 0; }
    game.sound.stopBgm(0.2);
    if (game.camera) { game.camera.target = p; game.camera.locked = false; game.camera.snap?.(); }
  } },
  { zoom: 1, duration: 0 },
  { fade: 'in', duration: 0.6 },
  laugh(J.hero), { wait: 0.3 },
  C('껄껄 간만에 즐거웠네'),
  C('뭐... 이정도라면 충분히 해쳐나갈 수 있겠지'),
  C('아 물론 약속은 지켜야지 이리 와보게'),
  G('네'), close,
  // 요플래와 경섭이 앞으로 다가온다
  { parallel: [
    { move: 'player', rel: J.hero, at: 'left', by: [-14, 0], speed: 40 },
    { move: 'gyeongsub', rel: J.hero, at: 'left', by: [-52, 6], speed: 40 },
  ] },
  { face: 'player', dir: 'toward:janitor_hero' }, { face: 'gyeongsub', dir: 'toward:janitor_hero' },
  { wait: 0.3 },
  // 공격력은 팀 공통(game.attack) — “요플래와 경섭의 공격력이 증가했다(1씩)”를 팀 공격력 +1 로
  { action: game => { game.attack += 1; game.setFlag('janitor_flag_wrapped'); game.sound.sfx('item'); } },
  N('멸공의 깃발이 무기에 감긴다.{n}* {c=yellow}요플래와 경섭의 공격력이 증가했다.{/c}'),
  G('...'),
  C('이제 올라가보새'),
  C('뭐 내가 잡아서 올려주면 되는거 아닌가.'),
  C('...'),
  C('잘 컸구나.'), close,
  { emote: 'gyeongsub', kind: '!', duration: 0.8, hold: 0.4 },
  { sfx: 'wing', volume: 0.7 },
  { fade: 'white', duration: 0.45 },
  { label: 'leave' },
  { action: game => { game.party = [...J.loungeParty]; } },
  { zoom: 1, duration: 0 },
  { fade: 'out', duration: 0 },
  { map: 'ship_lounge', spawn: 'fountain_back' },
  { if: f => !!f.janitor_reunion_done, goto: 'reunited' },
  // 분수 앞: 억빠맨이 두세 칸 위에 있다가 ‘!’ → 달려옴 → 대사 → 다시 합류
  { action: game => {
    const p = game.player, g = actor(game, 'gyeongsub'), pp = actor(game, 'ppaman');
    p.facing = 'up';
    if (g) { g.x = p.x - 40; g.y = p.y; g.facing = 'up'; }
    if (pp) { pp.x = p.x + 24; pp.y = p.y - 84; pp.facing = 'down'; }
    if (game.camera) { game.camera.target = p; game.camera.locked = false; game.camera.snap?.(); }
  } },
  { bgm: 'ship_lounge', fadeIn: 1.0 },
  { fade: 'in', duration: 0.6 },
  { emote: 'ppaman', kind: '!', duration: 0.9, hold: 0.4 },
  { move: 'ppaman', rel: 'player', at: 'right', by: [14, -8], run: true },
  { face: 'ppaman', dir: 'toward:player' }, { face: 'player', dir: 'toward:ppaman' }, { face: 'gyeongsub', dir: 'toward:ppaman' },
  P('형들 괜찮으세요 ? 무슨일 있으셨어요?'),
  G('...'),
  G('아니 아무일도 없었어.'),
  P('어휴 다행이네요 형님들 걱정했잖아요'),
  G('그래 미안하다 ㅋㅋ'), close,
  { set: { janitor_reunion_done: true } },
  { regroup: true },
  { end: true },
  { label: 'reunited' },
  { bgm: 'ship_lounge', fadeIn: 1.0 },
  { camera: 'player' },
  { fade: 'in', duration: 0.6 },
  { regroup: true },
], { silent: true });
