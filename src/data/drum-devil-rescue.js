const J = text => ({ speaker: '청소부', portrait: 'janitor', voice: 'janitor', text });
export const DRUM_DEVIL_RESCUE = Object.freeze({
  bgm: 'janitor_hero', fade: 1.2, silence: 2, flight: 1.1, surpriseHold: 0.65, lookbackHold: 0.65, reveal: 2.8,
  focusSeconds: 0.75, revealZoom: 0.8, focusZoom: 0.88, revealPan: 310, revealCenterX: 208, focusShake: 1.2,
  speech: { width: 250, pad: 10, lineHeight: 18, fontSize: 14, headOffset: 64 },
  laughHold: 1.4, rise: 3.2, returnCamera: 1.6, dive: 0.42, landHold: 0.8,
  hero: { src: 'assets/battle/janitor-hero-idle.png', cell: 192, cols: 2, pivot: [138, 180], frameHolds: [0.38, 0.26, 0.38, 0.26], home: [140, 150], reveal: [-70, 206] },
  stand: { src: 'assets/battle/janitor-hero-stand.png', cell: 192, cols: 1, pivot: [138, 180] },
  laugh: { src: 'assets/battle/janitor-hero-laugh.png', cell: 192, cols: 1, pivot: [138, 180] },
  kneel: { src: 'assets/battle/yoplait-kneel.png', cell: 96, cols: 1, pivot: [48, 89] },
  surprised: { src: 'assets/battle/yoplait-surprised.png', cell: 96, cols: 1, pivot: [48, 89] },
  lookback: { src: 'assets/battle/yoplait-lookback.png', cell: 96, cols: 1, pivot: [48, 89] },
  flag: { src: 'assets/props/janitor-hero-flag.png', cell: 192, cols: 1, pivot: [96, 96] },
  narration: [
    { voice: 'narrator', text: '... 너무나도 강력하다' },
    { voice: 'narrator', text: '저녀석을 쓰러트릴 방법은 아무래도 없는 것 같다.' },
    { voice: 'narrator', text: '이렇게 나의 운명은 끝나는 것일까.' },
  ],
  greeting: [J('도움이 필요한가?')],
  introduction: [J('옛생각나서 옷을 갈아입었더니 마침 마주치는군'), J('붉은 군단의 전사.'), J('멸공의 깃발이라고 불렸었지.')],
  ready: [J('자 얼른 저 괴물을 무찔러보게나,')],
});
