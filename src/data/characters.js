// ─────────────────────────────────────────────────────────────
// 캐릭터 레지스트리. 스프라이트 시트(assets/sprites/<id>.png) · 표시 이름 · 음색.
// 시트 규격: 4열(걷기 프레임) x 4행 [down, up, left, right]. 프레임 크기는 이미지에서 자동(폭/4, 높이/4).
// 시트가 없으면 src/data/art.js PALETTES[palette] 의 문자 도트로 대체.
// portraitThreshold: 대화창 초상화(흰/검 2톤 변환, gfx.monoPortrait)에서 이 밝기 미만을 검정으로. 기본 0.38.
// ─────────────────────────────────────────────────────────────
export const CHARACTERS = {
  hyungsub:  { name: '형섭', voice: 'hyungsub', palette: 'hero', self: true,   // 인트로의 HS() 대사는 이름·초상화·목소리 사용. 보라맵부터는 나레이션
    sideWalk: { legY: 76, legFrames: [1, 3] } },
  gyeongsub: { name: '경섭', voice: 'gyeongsub', palette: 'guard', sideWalk: { legY: 76, legFrames: [1, 3] } },
  ppaman:    { name: '빠맨', voice: 'ppaman',  palette: 'cat', portraitThreshold: 0.3, partyName: '억빠맨', partyDesc: '형 뒤에 붙어 다닌다.', sideWalk: { legY: 82, legFrames: [1, 3] } },     // 파란 털(밝기 0.45)은 흰색으로 남겨야 해서 낮게
  junhee:    { name: '쥰희', voice: 'junhee',  palette: 'merchant', portraitThreshold: 0.6, sideWalk: { feetY: 74, splitX: 46, stride: 2 } },   // 돼지. 분홍 피부(0.85)만 흰색, 이목구비(≤0.6)는 검정. 웃음소리 sfx: laugh_junhee
  merchant:  { name: '상인', voice: 'low',     palette: 'merchant' },
  cat:       { name: '???',  voice: 'cat',     palette: 'cat' },
  guard:     { name: '경비병', voice: 'robot', palette: 'guard' },
  ghost:     { name: '유령', voice: 'narrator', palette: 'ghost' },
};
