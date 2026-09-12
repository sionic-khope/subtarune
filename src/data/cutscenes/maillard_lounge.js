export const maillard_spring = Object.assign([
  { action: (g) => {
    for (const id of ['hyungsub', ...g.party]) g.partyHp[id] = g.maxHpOf(id);
  } },
  { sfx: 'heal' },
  { voice: 'narrator', text: '* {c=yellow}파란 기운이 온몸에 퍼졌다!{/c}{n}* HP가 모두 회복되었다!' },
], { silent: true });

export const maillard_statue_arms_crossed = [
  { voice: 'narrator', text: '* 팔짱을 낀 쥰희의 목조 동상이다.' },
];
export const maillard_statue_laugh = [
  { voice: 'narrator', text: '* 활짝 웃는 쥰희의 목조 동상이다.' },
];
export const maillard_statue_gesture = [
  { voice: 'narrator', text: '* 손짓하는 쥰희의 목조 동상이다.' },
];

export const maillard_shop = Object.assign([
  { action: (g) => g.openShop() },
], { silent: true });
