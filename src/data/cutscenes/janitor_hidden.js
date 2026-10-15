// 청소부 히든 보스(BUILD468 사용자 브리핑 2026-10-15, 대사 원문 그대로 — 콘티 design/narrative/cutscenes/janitor_hidden.md)
//   최미스 구출 뒤 엄청대박인배 라운지: 상점 건너편 분수(홀로 탁자 lounge_holo) 뒤편에서 아래를 보고 C → 억빠맨·경섭 대사 → “버튼을 눌러볼까?” 예 → 딸깍·정적 → …
//   → 경섭·요플래 발밑이 검게 꺼지고 모두 ‘!’ → 둘이 떨어짐 → 억빠맨 “어 어 형들!!” → 페이드 → 엄청대박인배 지하실(ship_basement, 빈 방)
//   → 둘이 떨어져 넘어짐 → 경섭이 천천히 일어남 → … → ???(청소부 목소리) → 모두 ‘!’·오른쪽 → 카메라가 오른쪽으로, 허약 청소부가 방 안에서 걸어옴(첫 등장 곡 wise_words) → 껄껄
//   → 대사 → 청소부가 붉은 잔상을 남기며 위로 솟아 사라짐 → “어디가셨..”(‘셨’에서 말·곡이 끊김) → 강한 청소부(멸공의 깃발)가 붉은 잔상과 함께 내려찍으며 착지 충격, 둘은 ‘!’·간신히 옆으로
//   → 껄껄 → 대사 → 오른쪽 위로 옮겨 왼쪽을 보고 대치 → 껄껄 → 깃발 공격 → 전투(janitor_hidden, 브금 Hammer of Justice). 이기면 라운지 분수 뒤로 돌아온다(억빠맨 다시 합류).
//   상승·낙하·순간이동·공격은 드럼통 악마전 청소부(drum-devil-rescue.js·janitor-hero-actions.js)의 시간·소리·붉은 잔상을 그대로 쓴다(사용자 2026-10-15 “이미 드럼통의 악마에서 오오라랑 연출과함께”).
import { battleEntry } from './helpers.js';
import { DRUM_DEVIL_RESCUE } from '../drum-devil-rescue.js';
import { JANITOR_HERO_ACTIONS } from '../janitor-hero-actions.js';
import { janitorRedAfterimage } from '../../battle/support/drum-devil-rescue.js';

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
  // 허약 청소부 등장 곡 = 토리이 길 첫 등장(jjajang_torii.js)의 wise_words. 무음에서 켜므로 fadeIn 1.2(2026-09-15 cue-lead-in 회고). 강한 청소부가 내려찍을 때 끊긴다(stop 초)
  weakBgm: Object.freeze({ name: 'wise_words', fadeIn: 1.2, stop: 0.15 }),
  // 허약 청소부는 요플래 오른쪽 88px 까지 걷는다(걸음 46). 시작 자리는 맵 생성기(tools/maps/ship_basement.py x 656, 벽 앞에서 걷던 거리의 절반)
  weakStop: Object.freeze([88, 0]), weakSpeed: 46,
  // 사라짐 = 드럼통 악마전 청소부 상승(spearappear 0.7, rise 초). 높이는 맨 아래 잔상까지 화면 위로 빠지는 값
  rise: Object.freeze({ height: 440, duration: DRUM_DEVIL_RESCUE.rise, sfx: 'spearappear', volume: 0.7 }),
  // 내려찍기 = 드럼통 악마전 낙하(wing 0.9, dive 초) → 착지 impact 0.9·흔들림 0.45초 세기 7
  dive: Object.freeze({ height: 360, duration: DRUM_DEVIL_RESCUE.dive, sfx: 'wing', volume: 0.9 }),
  land: Object.freeze({ sfx: 'impact', volume: 0.9, shake: 0.45, amp: 7 }),
  // 붉은 잔상(오오라): 드럼통 악마전 상승·낙하와 같은 거리 34·70·112px, 투명도 0.24−0.07i
  trail: Object.freeze({ tint: janitorRedAfterimage, steps: Object.freeze([[34, 0.24], [70, 0.17], [112, 0.10]]) }),
  // 착지 먼지·충격파 고리: 드럼통 악마전 착지(drum-devil-rescue.js land)와 같은 개수·속도·중력·색·반지름
  dust: Object.freeze({ count: 12, spread: 72, vx: 240, vy: Object.freeze([80, 140]), gravity: 90, seconds: 0.5, colors: Object.freeze(['#c8b89a', '#7a6a58']) }),
  ring: Object.freeze({ from: 20, to: 90, flat: 0.38, width: 4, alpha: 0.9, fill: 0.18, rgb: '255,160,90', seconds: 0.5 }),
  // 대치(“너희를 계엄해주겠다.” 뒤): 요플래 오른쪽 위로 드럼통 악마전 순간이동처럼(spearappear 0.7·붉은 잔상) 옮겨 왼쪽을 본다 — 둘 다 왼쪽 아래에 두고 마주 본다
  faceoff: Object.freeze({ by: Object.freeze([72, -64]), sfx: JANITOR_HERO_ACTIONS.sounds.teleport, volume: 0.7 }),
  // 깃발 공격: 필드 공격 동작(character-motions janitor_hero.attack)의 내려치기 칸(앞 세 칸 뒤)에 루드 버스터 휘두름 — 전투 지원 공격과 같은 소리·시점
  attack: Object.freeze({ sfx: JANITOR_HERO_ACTIONS.sounds.release, volume: 0.8, at: JANITOR_HERO_ACTIONS.attack.holds.slice(0, 3).reduce((sum, hold) => sum + hold, 0) }),
});
const J = JANITOR_HIDDEN;
const animate = (game, duration, frame) => new Promise(resolve => {
  let elapsed = 0;
  game.background.push({ update(dt) { elapsed = Math.min(duration, elapsed + dt); frame(elapsed / duration); if (elapsed < duration) return false; resolve(); return true; } });
});
const laugh = id => ({ motion: id, name: 'laugh', sfx: 'laugh_janitor' });
/** 착지 먼지(필드 입자 game.sparks)와 충격파 고리(game.ripples ring) — 강한 청소부 발밑에서, 기다리지 않는다 */
function landingImpact(game) {
  const hero = actor(game, J.hero); if (!hero) return;
  const x = hero.x + hero.w / 2, y = hero.y + hero.h, D = J.dust;
  const parts = Array.from({ length: D.count }, () => ({ x: x - D.spread / 2 + Math.random() * D.spread, y: y - 4, vx: (Math.random() - 0.5) * D.vx,
    vy: -D.vy[0] - Math.random() * D.vy[1], a: 1, size: 3, color: D.colors[0] }));
  game.sparks = parts;
  game.ripples.push({ x, y, t: 0, dur: J.ring.seconds, ring: J.ring });
  let t = 0;
  game.background.push({ update(dt) {
    t += dt;
    for (const p of parts) { p.vy += D.gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.size = t < D.seconds / 2 ? 3 : 2; p.color = D.colors[t < D.seconds / 2 ? 0 : 1]; }
    if (t < D.seconds) return false;
    if (game.sparks === parts) game.sparks = null;
    return true;
  } });
}
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
  { action: game => { game.sound.preloadBgm(J.bgm); game.sound.preloadBgm(J.weakBgm.name); } },
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
    game.sound.preloadBgm(J.weakBgm.name);
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
  // 오른쪽으로 카메라가 움직이며 허약 청소부가 방 안 오른쪽에서 왼쪽으로 걸어옴(사용자 “벽에서 나오는느낌인데 걷는시간 반절로” — 시작 자리를 절반 거리로)
  // 첫 등장 곡도 같이(사용자 “청소부 첫 등장했을때 브금도 나오게”)
  { show: J.weak },
  { parallel: [
    { bgm: J.weakBgm.name, fadeIn: J.weakBgm.fadeIn },
    { camera: J.weak },
    { move: J.weak, rel: 'player', at: 'right', by: J.weakStop, speed: J.weakSpeed },
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
  // 청소부가 갑자기 휘익 — 드럼통 악마전처럼 붉은 잔상을 남기며 위로 솟아 사라진다
  { parallel: [{ sfx: J.rise.sfx, volume: J.rise.volume }, { rise: J.weak, height: J.rise.height, duration: J.rise.duration, trail: J.trail }] },
  { hide: J.weak },
  { camera: 'player' }, { wait: 0.6 },
  G('...'),
  // “셨”까지 나오고 말이 끊긴다 → 곡도 끊기고 강한 청소부가 붉은 잔상과 함께 위에서 내려찍으며 등장, 둘은 ‘!’·간신히 옆으로
  { ...G('어디가셨..'), cut: 0.36 }, close,
  { action: game => {
    const p = game.player, g = actor(game, 'gyeongsub'), hero = actor(game, J.hero);
    if (hero) { hero.x = Math.round(((g?.x ?? p.x) + p.x) / 2); hero.y = p.y; hero.facing = 'down'; hero.hopY = 360; hero.visible = true; }
  } },
  { parallel: [
    { bgm: null, fadeOut: J.weakBgm.stop },
    { sfx: J.dive.sfx, volume: J.dive.volume },
    { drop: J.hero, height: J.dive.height, duration: J.dive.duration, sfx: false, land: false, trail: J.trail },
    { async: [{ wait: 0.12 }, { parallel: [
      { emote: 'gyeongsub', kind: '!', duration: 1.0, hold: 0 }, { emote: 'player', kind: '!', duration: 1.0, hold: 0 },
      { hop: 'gyeongsub', by: [-44, 0], height: 10, duration: 0.3, sfx: false },
      { hop: 'player', by: [44, 0], height: 10, duration: 0.3, sfx: false },
    ] }] },
  ] },
  { parallel: [{ sfx: J.land.sfx, volume: J.land.volume }, { shake: J.land.shake, amp: J.land.amp }, { action: landingImpact }] },
  { face: 'gyeongsub', dir: 'toward:janitor_hero' }, { face: 'player', dir: 'toward:janitor_hero' },
  { wait: 0.8 },
  laugh(J.hero), { wait: 0.5 },
  C('어디 한번 놀아볼까?'),
  G('!!!'),
  C('나를 이기지못한다면 너희는 나갈 수 없을 것이네'),
  C('멸공의 깃발.'),
  C('너희를 계엄해주겠다.'), close,
  // 사용자 “상단으로 올라가서 다시 왼쪽 바라보게 주인공들이랑 대치대게 움직인다음에 껄껄 웃고 공격모션 효과음과 함께 공격하고 그 뒤로 배틀”
  { parallel: [{ sfx: J.faceoff.sfx, volume: J.faceoff.volume }, { move: J.hero, rel: 'player', at: 'right', by: J.faceoff.by, dash: true, trail: J.trail }] },
  { wait: 0.3 },
  { face: J.hero, dir: 'left' },
  { face: 'player', dir: 'right' }, { face: 'gyeongsub', dir: 'right' },
  { wait: 0.6 },
  laugh(J.hero), { wait: 0.4 },
  { parallel: [{ motion: J.hero, name: 'attack' }, [{ wait: J.attack.at }, { sfx: J.attack.sfx, volume: J.attack.volume }]] },
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
