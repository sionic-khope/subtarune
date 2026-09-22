const bridge = (flag, camera) => Object.assign([
  { if: flags => flags[flag], goto: 'done' },
  { sfx: 'click' },
  { action: game => {
    const lever = game.entities.find(entity => entity.id === `${flag}_off`);
    if (lever) lever.image = game.propImages['assets/props/lever_on.png'];
  } },
  { camera, duration: 0.7 },
  { sfx: 'rumble' },
  { tiles: flag },
  { set: { [flag]: true } },
  { shake: 0.25, amp: 2 },
  { camera: 'player', duration: 0.7 },
  { label: 'done' },
  { end: true },
], { silent: true });

export const NIGHT_COAST_SCRIPTS = Object.fromEntries([
  ['night_coast1_a', [97, 10]], ['night_coast1_b', [69, 34]],
  ['night_coast2_a', [42, 10]], ['night_coast2_b', [89, 54]],
  ['night_coast2_c', [70, 78]], ['night_coast3_a', [103, 10]],
  ['night_coast3_b', [74, 36]],
].map(([flag, camera]) => [flag, bridge(flag, camera)]));
