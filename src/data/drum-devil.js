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
  soundCooldown: { drum_throw: 0.25, drum_impact: 0.18, drum_burst: 0.8, wing: 0.25 },
  soundVolume: { drum_throw: 0.75, drum_impact: 0.5, drum_burst: 0.95, wing: 1 },
  heroDamage: 60, interceptAfter: 1, deflectVelocity: [480, -310], deflectAcceleration: [220, 280], deflectSpin: 22, deflectLife: 1.1,
  heroPartyHome: [204, 150], heroBoardCenter: [312, 214],
};
const finisherAt = (tuning.waves - 1) * tuning.every + tuning.warn + tuning.flight
  + Math.max(tuning.rollLife, tuning.fragmentLife, tuning.blastHold, tuning.crossFlight + tuning.blastHold,
    tuning.ringFuse + (tuning.ringCount - tuning.ringGap - 1) * tuning.ringStagger + tuning.fragmentLife) + tuning.finisherQuiet;
export const DRUM_DEVIL = Object.freeze({ ...tuning, finisherAt,
  duration: finisherAt + tuning.warn + tuning.finisherFlight + tuning.finisherFuse + tuning.finisherHold,
});
