import { SHIP_CASTLE } from './ship-castle.js';

export const SHIP_INVASION = Object.freeze({
  bgm: 'ship_invasion',
  images: Object.freeze({
    castle: SHIP_CASTLE.images.castle,
    warship: SHIP_CASTLE.images.warship,
    maillard: SHIP_CASTLE.images.maillard,
    explosion: SHIP_CASTLE.images.explosion,
  }),
  timing: Object.freeze({ sail: 3, pan: 2.4, castleHold: 2.5, shadow: 1.6, fall: 1.65, pullback: 2.5, impactHold: 1, teleport: 3 }),
  world: Object.freeze({ castleWidth: 2220, warshipWidth: 360, maillardWidth: 144, closeWidth: 152, wideCastleWidth: 200, waterline: 214, horizon: 88 }),
  sound: Object.freeze({ impact: 'explosion', splash: 'maillard_water_lift', charge: 'spearappear', launch: 'wing' }),
  teleport: Object.freeze({ count: 5, charge: 0.65, stagger: 0.18, flight: 0.48 }),
  debris: Object.freeze({ count: 22, duration: 2.6, gravity: 170 }),
});

export const INVASION_BEATS = Object.freeze(['hidden', 'sail', 'castle-look', 'room-impact', 'room-shadow', 'castle-drop', 'aftermath', 'teleport']);
