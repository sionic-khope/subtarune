// 엄청대박인배 다리길 끝의 거대한 철문(youngcle19, BUILD201 사용자 브리핑 “C 누르면 ‘엄청대박인배 조종실 이라고 적혀있다, 들어갈까?’ 예/아니오 나오게”).
//   문은 소품(script) — 예를 고르면 철컥(locker) → 검게 → 조종실(youngcle20) 철문 앞 스폰 → 밝아짐 → 이 스크립트가 끝나면 조종실 도착 스크립트(입장 연출)가 이어진다(enter:true). 아니오/X 는 그대로.
export const ship_gate = [
  { text: '* 엄청대박인배 조종실 이라고 적혀있다.{w=0.4} 들어갈까?', voice: 'narrator',
    choice: { options: [{ label: '예', goto: 'yes' }, { label: '아니오', goto: 'no' }], cancel: 1 } },
  { label: 'yes' },
  { action: game => game.textbox.close() },
  { sfx: 'locker' },
  { fade: 'out', duration: 0.5 },
  { map: 'youngcle20', spawn: 'gate', enter: true },
  { fade: 'in', duration: 0.5 },
  { end: true },
  { label: 'no' },
  { end: true },
];
