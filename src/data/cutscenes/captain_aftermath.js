import { CAPTAIN_AURA_COLORS, CAPTAIN_REVEAL_VEIL } from './captain_reveal.js';

export const CAPTAIN_MEMORY_TIMING = Object.freeze({
  enterFade: 2.6,
  blackHold: 1.2,
  musicFadeIn: 2.5,
  returnHold: 0.6,
  returnFade: 2,
  musicFadeOut: 2,
});

const J = text => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: '* ' + text });
const M = text => ({ speaker: '만카츠키 쥰희', portrait: 'junhee_mankatsuki', voice: 'junhee', text: '* ' + text });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ' + text });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* ' + text });
const N = text => ({ voice: 'narrator', text: '* ' + text });
const memory = (image, lines) => lines.map(text => ({ style: 'illustrated', image, voice: 'narrator', text }));
const PARTY = ['ppaman', 'player', 'gyeongsub'];
const facePlayer = ['ppaman', 'gyeongsub', 'captain_mankatsuki'].map(id => ({ face: id, dir: 'toward:player' }));

export const captain_aftermath = Object.assign([
  { if: flags => !flags.captain_mankatsuki_defeated || flags.captain_aftermath_done, goto: 'end' },
  { fade: 'out', duration: 0.35 },
  { bgm: null, fadeOut: 0.3 },
  { action: game => { game.sound.preloadBgm('captain_memories'); } },
  { zoom: 1, duration: 0 },
  { action: game => {
    const actor = game.entities.find(entity => entity.id === 'captain_mankatsuki');
    actor.setSprite('junhee_mankatsuki'); actor.def.visualScale = 1.5;
    actor.jitter = null; actor.def.script = 'captain_aftermath';
  } },
  { move: 'captain_mankatsuki', rel: 'captain_carpet', at: 'top', by: [4, -2], run: true },
  { parallel: PARTY.map((id, index) => ({
    move: id, rel: 'captain_mankatsuki', at: 'bottom', by: [(index - 1) * 64, 90], run: true,
  })) },
  ...PARTY.map(id => ({ face: id, dir: 'up' })),
  { face: 'captain_mankatsuki', dir: 'down' },
  { camera: 'player' },
  { darkSmoke: { mode: 'veil', duration: 0.01, veil: CAPTAIN_REVEAL_VEIL,
    aura: { at: 'captain_mankatsuki', colors: CAPTAIN_AURA_COLORS } } },
  { fade: 'in', duration: 0.7 },
  M('윽 으윽 으으으윽...'),
  { darkSmoke: { mode: 'dissipate', from: 'captain_mankatsuki', duration: 3, veil: 0 } },
  { darkSmoke: null },
  { action: game => {
    const actor = game.entities.find(entity => entity.id === 'captain_mankatsuki');
    actor.setSprite('junhee'); actor.def.visualScale = 1; actor.jitter = null;
  } },
  { wait: 0.4 },
  P('ㄱㅊ?'),
  J('허억 허억.. 헉..'),
  G('쥰희야 괜찮냐.'),
  J('네 어느정도는.. 아 존나 힘들다.'),
  ...facePlayer,
  P('... 그래서 당신은 누구죠'),
  N('나는.. 요플래다.'),
  P('?'),
  N('나는 이 가재맨이 만든 세계를 없애고, 너희들을 돌려보내야한다. 그리고'),
  P('그리고?'),
  N('김형섭을 되찾아야한다.'),
  P('???'),
  { fade: 'out', duration: CAPTAIN_MEMORY_TIMING.enterFade },
  { curtain: 'black' },
  { wait: CAPTAIN_MEMORY_TIMING.blackHold },
  { bgm: 'captain_memories', fadeIn: CAPTAIN_MEMORY_TIMING.musicFadeIn },
  { fade: 'in', duration: 0 },
  ...memory('origin', [
    '과거에 김형섭이라는 인간은 방송을 하기 시작했고',
    '난 그때 태어난 요플래라는 자아다.',
  ]),
  ...memory('split', [
    '그러던 어느날 김형섭은 불의의 사건이 터지고 많은 논란에 휩싸이게 된다.',
    '그 뒤 요플래라는 자아를 버리고 가재맨이라는 새로운 자아로 활동하기 시작했지.',
  ]),
  ...memory('demon', [
    '하지만 가재맨이라는 자아는 점차 타락하게 되었고',
    '수금의 악마라는 이명과 함께{n}점차 힘이 강력해져갔지.',
    '그리고 결국엔 수많은 스트레스로 인해{n}김형섭이라는 인간 자체를{n}집어 삼키려고 하기 시작한거야',
    '처음엔 몸이 뻐근해지게 만들고,{n}눈이 침침해지게 만들고,{n}위염을 발생시키기도 했지.',
  ]),
  ...memory('hack', [
    '그리고 결국 점차 이 힘이 강력해졌고{n}가재맨이라는 자아는',
    '천천히 그의 컴퓨터를 해킹하기 시작했어',
  ]),
  { style: 'illustrated', image: 'hack', voice: 'narrator', imageExit: true,
    text: '그리고 만들어진 세상이 이거지.{n}그리고 김형섭이라는 인간은 지금{n}잠식되어서 사고가 멈춘 상황.' },
  { fade: 'out', duration: 0 },
  { bgm: null, fadeOut: CAPTAIN_MEMORY_TIMING.musicFadeOut },
  { wait: CAPTAIN_MEMORY_TIMING.returnHold },
  { curtain: null },
  { camera: 'player' },
  { fade: 'in', duration: CAPTAIN_MEMORY_TIMING.returnFade },
  { parallel: [
    { sfx: 'chime' },
    ...['ppaman', 'gyeongsub', 'captain_mankatsuki'].flatMap(id => [
      { emote: id, kind: '!', duration: 1.1, hold: 0.7 },
      { hop: id, height: 13, duration: 0.35, sfx: false },
    ]),
  ] },
  N('그래서 제가 여기에 오게 된겁니다'),
  P('그 그렇구나..'),
  J('... 난 처음부터{n}너가 김형섭이 아니란걸 알고있었어'),
  G('그러면 어떻게 해야하지'),
  P('간단하죠 가재맨 그씨발새끼 족치고{n}집가면 되는거아닌가요?'),
  G('허허 그런가...'),
  J('아무튼, 킁 그런거였다니.{n}어쨋든 난 그새끼를 찾아야겠군'),
  P('어디로갔을까?'),
  J('어딘진 모르겠지만, 걔의 목적이{n}김형섭을 지배하는거라면'),
  J('이 세계에 들어온 모든 이들을 아까 나를 만카츠키처럼 만든것처럼 하려고 하겠지'),
  P('그렇다는건'),
  J('일단 모두를 내 전함에 옮겨담아{n}구해야겠어 그 뒤면 알아서 찾아오겠지'),
  G('오..'),
  J('{shake}{c=yellow}그리고 족치는거다!{/c}{/shake}'),
  { motion: 'captain_mankatsuki', name: 'laugh', sfx: 'laugh_junhee' },
  J('야 요플래 넌 우리 동료로 받아주겠다.'),
  { ...P('그렇구만 그럼 다음 목적지가 있..'), auto: 0.5 },
  { set: { captain_aftermath_done: true } },
  { action: game => {
    const actor = game.entities.find(entity => entity.id === 'captain_mankatsuki');
    actor.id = 'captain_junhee_restored'; actor.def.script = 'captain_aftermath';
  } },
  { camera: 'player' },
  { label: 'end' },
  { end: true },
], { silent: true });
