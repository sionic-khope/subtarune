const J = text => ({ speaker: '청소부', portrait: 'janitor', voice: 'janitor', text });
const HERO_SCALE = 0.92;
export const DRUM_DEVIL_RESCUE = Object.freeze({
  bgm: 'janitor_hero_intro', fade: 1.2, silence: 2, flight: 0.72, surpriseHold: 0.65, lookbackHold: 0.65, reveal: 4.8,
  focusSeconds: 0.75, revealZoom: 0.8, focusZoom: 0.88, revealPan: 500, revealCenterX: 208, focusShake: 1.2,
  flagImpact: { duration: 0.45, recoil: 4, heldRecoil: 10, lean: 0.08, frame: 2, flash: 0.14, shake: 0.32, amp: 7, rightShakeLimit: 2, sound: 'deltarune_release_shoot' },
  speech: { width: 250, pad: 10, lineHeight: 18, fontSize: 14, headOffset: 64, postLanding: { x: 12, width: 100, fontSize: 12, lineHeight: 16 } },
  laughHold: 1.4, rise: 0.52, returnCamera: 1.28, diveHold: 0.18, dive: 0.34, landHold: 0.8,
  heal: { raise: 0.45, brace: 0.15, hold: 1.05, sound: 'heal' },
  hero: { src: 'assets/battle/janitor-hero-idle.png', cell: 192, cols: 2, pivot: [138, 180], scale: HERO_SCALE, frameHolds: [0.1, 0.12, 0.28, 0.14, 0.1, 0.12, 0.28, 0.14], home: [122, 238], attackHome: [138, 238], reveal: [-260, 206] },
  stand: { src: 'assets/battle/janitor-hero-stand.png', cell: 192, cols: 1, pivot: [138, 180], scale: HERO_SCALE },
  laugh: { src: 'assets/battle/janitor-hero-laugh.png', cell: 192, cols: 1, pivot: [138, 180], scale: HERO_SCALE },
  kneel: { src: 'assets/battle/yoplait-kneel.png', cell: 96, cols: 1, pivot: [48, 89], scale: 0.8 },
  surprised: { src: 'assets/battle/yoplait-surprised.png', cell: 96, cols: 1, pivot: [48, 89], scale: 0.8 },
  lookback: { src: 'assets/battle/yoplait-lookback.png', cell: 96, cols: 1, pivot: [48, 89], scale: 0.8 },
  flag: { src: 'assets/props/janitor-hero-flag.png', cell: 192, cols: 1, pivot: [96, 96] },
  narration: [
    { voice: 'narrator', text: '... 너무나도 강력하다' },
    { voice: 'narrator', text: '저녀석을 쓰러트릴 방법은 아무래도 없는 것 같다.' },
    { voice: 'narrator', text: '이렇게 나의 운명은 끝나는 것일까.' },
  ],
  greeting: [J('도움이 필요한가?')],
  introduction: [J('옛생각나서 옷을 갈아입었더니 마침 마주치는군'), J('붉은 군단의 전사.'), J('멸공의 깃발이라고 불렸었지.')],
  healLines: [J('많이 힘들어보이네?')],
  ready: [J('자 얼른 저 괴물을 무찔러보게나,')],
});
