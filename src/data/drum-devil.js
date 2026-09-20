const tuning = {
  bgm: 'drum_devil_battle', playerHpFloor: 1,
  blockedText: '막힘', rescueIdle: '* 멸공의 깃발이 함께한다.',
  warn: 0.5, flight: 0.7, every: 1.6, waves: 4,
  blastRadius: 30, blastHold: 0.35, fragmentSpeed: 115, fragmentLife: 1.25,
  barrelSize: 26, barrelRadius: 10, rollSpeed: 180, rollLife: 1.7,
  finisherQuiet: 0.65, finisherFlight: 2.6, finisherFuse: 0.7, finisherHold: 0.65,
  finisherDamage: 20, finisherSize: 38, arcHeight: 48, hand: [-108, -160],
  attackFrameEnds: [0.25, 0.75, 1, 1.25],
  crossFlight: 1.35, ringCount: 8, ringGap: 2, ringFuse: 0.35, ringStagger: 0.1, ringBlastRadius: 46,
  rescueTurn: 8, tearRamp: 1.2, tearRip: 0.85, tearHold: 0.45, tearBands: 9, tearShift: 110,
  soundCooldown: { drum_throw: 0.25, impact: 0.18, drum_burst: 0.8, wing: 0.25 },   // impact = 델타룬 snd_impact(흰 드럼통 착지, 사용자 2026-09-20 ‘띠링’ 교체; 던지는 소리는 그대로)
  soundVolume: { drum_throw: 0.75, impact: 0.6, drum_burst: 0.95, wing: 1 },
  heroDamage: 60, interceptAfter: 1, deflectVelocity: [480, -310], deflectAcceleration: [220, 280], deflectSpin: 22, deflectLife: 1.1,
  // heroPartyHome x 100: 124 에서 24px 왼쪽(사용자 2026-09-20 "드럼통 악마 살짝 오른쪽으로 … 둘간의 간격 벌리고, 요플래 조금더 왼쪽") — 악마는 오른손이 이미 화면 오른쪽 끝(enemies.js dx 주석)이라 요플래 쪽만 옮겼다. 청소부(x 122)는 깃발이 왼쪽 가장자리까지 닿아 그대로
  heroPartyHome: [100, 164], heroBoardCenter: [312, 214],
};
const finisherAt = (tuning.waves - 1) * tuning.every + tuning.warn + tuning.flight
  + Math.max(tuning.rollLife, tuning.fragmentLife, tuning.blastHold, tuning.crossFlight + tuning.blastHold,
    tuning.ringFuse + (tuning.ringCount - tuning.ringGap - 1) * tuning.ringStagger + tuning.fragmentLife) + tuning.finisherQuiet;
export const DRUM_DEVIL = Object.freeze({ ...tuning, finisherAt,
  duration: finisherAt + tuning.warn + tuning.finisherFlight + tuning.finisherFuse + tuning.finisherHold,
});
