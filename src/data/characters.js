// ─────────────────────────────────────────────────────────────
// 캐릭터 레지스트리. 스프라이트 시트(assets/sprites/<id>.png) · 표시 이름 · 음색.
// 시트 규격: 4열(걷기 프레임) x 4행 [down, up, left, right]. 프레임 크기는 이미지에서 자동(폭/4, 높이/4).
// 시트가 없으면 src/data/art.js PALETTES[palette] 의 문자 도트로 대체.
// ─────────────────────────────────────────────────────────────
export const CHARACTERS = {
  hyungsub:  { name: '형섭', voice: 'hyungsub', palette: 'hero' },   // 기본 주인공
  gyeongsub: { name: '경섭', voice: 'gyeongsub', palette: 'guard' },
  ppaman:    { name: '빠맨', voice: 'ppaman',  palette: 'cat' },
  junhee:    { name: '쥰희', voice: 'junhee',  palette: 'merchant' },   // 돼지. 웃음소리 sfx: laugh_junhee
  merchant:  { name: '상인', voice: 'low',     palette: 'merchant' },
  cat:       { name: '???',  voice: 'cat',     palette: 'cat' },
  guard:     { name: '경비병', voice: 'robot', palette: 'guard' },
  ghost:     { name: '유령', voice: 'narrator', palette: 'ghost' },
};
