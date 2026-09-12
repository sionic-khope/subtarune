export const maillard_storage_enter = Object.assign([
  { voice: 'narrator', text: '* 강퇴폐기창고입니다.{n}* 들어가시겠습니까?',
    choice: { options: [{ label: '예', goto: 'enter' }, { label: '아니오', goto: 'end' }], cancel: 1 } },
  { label: 'enter' },
  { fade: 'out', duration: 0.25 },
  { map: 'maillard_storage', spawn: 'start' },
  { bgm: 'wind' },
  { fade: 'in', duration: 0.25 },
  { label: 'end' },
  { end: true },
], { silent: true });
