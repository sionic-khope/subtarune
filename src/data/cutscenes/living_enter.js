// ─────────────────────────────────────────────────────────────
// 거실 첫 진입 (living.json `enter` → 도착 페이드 인 직후 1회, flag living_entered).
// 형섭 대사 = 나레이션 스타일(이름·초상화 없음). 사용자 지정 텍스트 그대로, 띄어쓰기/멈춤만 조정.
// ─────────────────────────────────────────────────────────────
export const living_enter = Object.assign([
  { wait: 0.5 },
  { text: '* 엄마', voice: 'narrator' },
  { wait: 0.3 },
  { text: '* 엄마{w=0.6} ???', voice: 'narrator' },
  { wait: 0.4 },
  { text: '* 안계시나보다{w=0.4} 코드를 찾아봐야겠네', voice: 'narrator' },
  { text: '* 티비쪽에 있으려나{w=0.3} 일단{w=0.4} 아 배고파', voice: 'narrator' },
  { text: '* 이것저것 더 챙기면 좋겠다,{w=0.3} 밥상에 뭐 없나...', voice: 'narrator' },
], { silent: true });
