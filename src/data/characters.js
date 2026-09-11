// ─────────────────────────────────────────────────────────────
// 캐릭터 레지스트리. 스프라이트 시트(assets/sprites/<id>.png) · 표시 이름 · 음색.
// 시트 규격: 4열(걷기 프레임) x 4행 [down, up, left, right]. 프레임 크기는 이미지에서 자동(폭/4, 높이/4).
// 시트가 없으면 src/data/art.js PALETTES[palette] 의 문자 도트로 대체.
// hp: 전투 최대 HP, hpColor: HP 바 색(형섭 하늘색·경섭 빨강·빠맨 연보라 — 전투·메뉴 공통, 2026-09-10)
// portraitThreshold: 대화창 초상화(흰/검 2톤 변환, gfx.monoPortrait)에서 이 밝기 미만을 검정으로. 기본 0.38.
// ─────────────────────────────────────────────────────────────
export const CHARACTERS = {
  hyungsub:  { name: '형섭', voice: 'hyungsub', palette: 'hero', self: true, hp: 100, hpColor: '#7fd0ff',   // 전투 HP (2026-09-10 브리핑: 형섭 100 / 경섭 120 / 빠맨 90, 경험치·공격력 없음)   // 인트로의 HS() 대사는 이름·초상화·목소리 사용. 보라맵부터는 나레이션
    sideWalk: { legY: 76, legFrames: [1, 3] } },
  gyeongsub: { name: '경섭', voice: 'gyeongsub', palette: 'guard', hp: 120, hpColor: '#ff5c5c', partyName: '경섭', partyDesc: '뭔가 살짝 수상하다.', sideWalk: { legY: 76, legFrames: [1, 3] } },   // 보라맵11 거대 나무에서 합류
  ppaman:    { name: '빠맨', voice: 'ppaman',  palette: 'cat', hp: 90, hpColor: '#c9a3ff', portraitThreshold: 0.3, partyName: '억빠맨', partyDesc: '형 뒤에 붙어 다닌다.', sideWalk: { legY: 82, legFrames: [1, 3] } },     // 파란 털(밝기 0.45)은 흰색으로 남겨야 해서 낮게
  yongjun:   { name: '박용준', voice: 'yongjun', palette: 'ghost', sideWalk: { legY: 70, legFrames: [1, 3] } },   // 청록숲7 — PR #13 뚱뚱한 버전 assets/sprites/yongjun.png(68×88 셀 4×4, 엔진 순서 down/up/left/right, 0 중립·1 발A·2 중립·3 발B; docs/handoffs/junhee-yongjun-walk-v4.md). 목소리 = 유튜브 쇼츠 시작 '어?'. legY 는 옆모습 셀에서 이음새 어긋남이 최소인 줄을 재서 정함(배는 고정, 다리·신발만 바뀐다)
  junhee:    { name: '쥰희', voice: 'junhee',  palette: 'merchant', portraitThreshold: 0.6, sideWalk: { legY: 69, legFrames: [1, 3] } },   // 돼지. PR #13 시트(92×90 셀, 0 중립·1 발A·2 중립·3 발B): 옆걷기는 옛 발 반쪽 밀기(feetY/splitX) 대신 상체 고정 + 시트의 발 프레임. legY 69 = 엉덩이 줄(배 폭 69→다리 폭 50 으로 꺾이는 곳, 이음새 어긋남 8px) — 다리 전체가 움직인다. 분홍 피부(0.85)만 흰색, 이목구비(≤0.6)는 검정. 웃음소리 sfx: laugh_junhee
  cs_red:    { name: '레드 CS', voice: 'cat', palette: 'ghost', still: 'assets/enemies/cs-red-front.png' },    // 청록숲3 미니언 — PR #7 정면 정지 1장(48×48), docs/handoffs/combat-assets.md
  cs_blue:   { name: '블루 CS', voice: 'cat', palette: 'ghost', still: 'assets/enemies/cs-blue-front.png' },
  razorbeak: { name: '칼날부리', voice: 'cat', palette: 'ghost', still: 'assets/enemies/jungle-raptor-front.png' },   // 청록숲6 정글 몹 — PR #10 이미지(docs/handoffs/jungle-enemies-assets.md)
  wolf:      { name: '늑대', voice: 'cat', palette: 'ghost', still: 'assets/enemies/jungle-wolf-front.png' },
  toad:      { name: '두꺼비', voice: 'cat', palette: 'ghost', still: 'assets/enemies/jungle-gromp-front.png' },
  merchant:  { name: '상인', voice: 'low',     palette: 'merchant' },
  cat:       { name: '???',  voice: 'cat',     palette: 'cat' },
  guard:     { name: '경비병', voice: 'robot', palette: 'guard' },
  ghost:     { name: '유령', voice: 'narrator', palette: 'ghost' },
};

/** 동료 걷는 순서(주인공 형섭 바로 뒤부터): 경섭 → 빠맨. 가입 순서와 무관하게 이 순서 (사용자 2026-09-10). 전투 세로 순서도 같다(형섭·경섭·빠맨) */
export const PARTY_ORDER = ['gyeongsub', 'ppaman'];
