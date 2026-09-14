export const PARK_WITCH_TRIAL = {
  seconds: 15, damage: 30,
  timing: { enter: 0.8, declaration: 0.65, choiceStagger: 0.2, choiceReadyHold: 0.3, verdict: 0.8, executionBeat: 0.12, executionBeats: 5, sword: 3, impact: 0.9, objection: 1.38, shatter: 0.65, leave: 0.45, character: 0.035 },
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
    instruction: '맞는 영역에 들어가서 C를 눌러라',
    verdicts: ['길티 !', '컨비스케이션', '데스 패널티!'],
    defeated: '용.. 용준이는 원래 엄마가없어서 괜찮다니.. 윽 내가졌다...',
  },
  assets: {
    judge: 'assets/enemies/park-guardian-judge.png',
    objection: 'assets/illustrations/park-trial-objection.png',
    glass: 'assets/illustrations/park-trial-glass.png',
    sword: 'assets/projectiles/park-trial-sword.png',
  },
  objectionAudio: 'assets/audio/sfx/park_trial_objection.mp3',
  cases: [
    {
      summary: '죄명: 박용준에게 심한 엄마욕',
      chargeLines: ['피고인 김형섭은 쇼츠편집자 박용준에게 심한 엄마욕에', '마음의 상처를 입었다고 합니다. 사실입니까?'],
    },
    {
      question: '피고인 김형섭은 오방순(여)를 성희롱한 죄가 있다 맞습니까?',
      summary: '죄명: 오방순(여) 성희롱',
      chargeLines: ['피고인 김형섭은 오방순(여)를 성희롱한 죄가 있다 맞습니까?'],
      choices: ['맞습니다', '오방순은 여자가아니다.', '내가 여자다.'],
      highlight: '',
      defeated: '네.. 네가 여자라니.. 윽 내가졌다...',
    },
  ],
};
