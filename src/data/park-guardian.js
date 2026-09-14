const line = (speaker, portrait, text) => ({ speaker, portrait, voice: portrait, text: `* ${text}` });

export const PARK_GUARDIAN = {
  requiredHits: 9, exposedTurns: 2,
  costumeSchedule: { trialTurn: 5, razmaEvery: 4 },
  strip: { windup: 0.55, rush: 0.42, impact: 0.1, flight: 0.85, offscreenHold: 0.15, return: 0.95, settle: 0.25,
    exitX: 550, flightLift: 100, flightSpin: Math.PI * 3, stepSeconds: 0.14 },
  rewearSeconds: 1.5,
  shell: { landingDx: 196, landingDy: 4, turn: Math.PI * 3, lift: 48 },
  emptyCostume: 'assets/enemies/park-guardian-empty-costume.png',
  introLines: [
    line('억빠맨', 'ppaman', '아시발 저새끼 저게 본체가 아니라서 딜이 안들어가요'),
    line('경섭', 'gyeongsub', '그렇네 어떻게 해야할까'),
    line('파크가디언', 'park_guardian_costume', '꺜 꺄르륵 꺄르륵 꼴받지 못잡겠쥐'),
    line('억빠맨', 'ppaman', '근데 아까 때리다보니까 알겠어 존나 치다보면 인형탈이 헝클어져서'),
    line('억빠맨', 'ppaman', '쟤가 인형탈 재조정할 타이밍에 박치기해서 날려버릴게요'),
    { voice: 'narrator', text: '* 벗기기 버튼이 추가되었다' },
  ],
};
