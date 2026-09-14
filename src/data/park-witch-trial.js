export const PARK_WITCH_TRIAL = {
  seconds: 15, damage: 30,
  timing: { enter: 0.8, declaration: 0.65, verdict: 0.8, sword: 0.75, impact: 0.9, objection: 1.38, shatter: 0.65, leave: 0.45, character: 0.035 },
  board: { x: 8, y: 8, w: 464, h: 344 },
  start: { x: 240, y: 330 },
  choices: [
    { x: 20, y: 244, w: 132, h: 58, text: '내가 잘못했다' },
    { x: 174, y: 244, w: 132, h: 58, text: '욕을 하지 않았다.' },
    { x: 328, y: 244, w: 132, h: 58, text: '애초에 노애미라 괜찮다' },
  ],
  text: {
    speaker: '파크가디언',
    opening: '자 자 젠인 모도레... 당신들을 심판할 마녀재판을 개정하겠습니다.',
    declaration: '파크가디언의 마녀재판 개정합니다!',
    question: '피고인 김형섭은 쇼츠편집자 박용준에게 심한 엄마욕에 마음의 상처를 입었다고 합니다. 사실입니까?',
    highlight: '박용준',
    verdicts: ['길티 !', '컨비스케이션', '데스 패널티!'],
    defeated: '용.. 용준이는 원래 엄마가없어서 괜찮다니.. 윽 내가졌다...',
    controls: '방향키로 반론에 이동 · C 확인', next: 'C 계속',
  },
  assets: {
    judge: 'assets/enemies/park-guardian-judge.png',
    objection: 'assets/illustrations/park-trial-objection.png',
    glass: 'assets/illustrations/park-trial-glass.png',
    sword: 'assets/projectiles/park-trial-sword.png',
  },
  objectionAudio: 'assets/audio/sfx/park_trial_objection.mp3',
};
