// ─────────────────────────────────────────────────────────────
// 캐릭터 레지스트리. 스프라이트 시트(assets/sprites/<id>.png) · 표시 이름 · 음색.
// 시트 규격: 4열(걷기 프레임) x 4행 [down, up, left, right]. 프레임 크기는 이미지에서 자동(폭/4, 높이/4).
// 시트가 없으면 src/data/art.js PALETTES[palette] 의 문자 도트로 대체.
// hp: 전투 최대 HP, hpColor: HP 바 색(형섭 하늘색·경섭 빨강·빠맨 연보라 — 전투·메뉴 공통, 2026-09-10)
// portraitThreshold: 대화창 초상화(흰/검 2톤 변환, gfx.monoPortrait)에서 이 밝기 미만을 검정으로. 기본 0.38.
// ─────────────────────────────────────────────────────────────
export const CHARACTERS = {
  // 가순이 1·2·3(BUILD257 빛 드는 공터): 사용자 참조(이라스토야풍 소녀)를 글로 옮겨 gpt-image-2.5-sunburst 4×4 걷기 시트(assets/source/gasuni-walk-v1) — 1 긴머리, 2 단발, 3 땋은머리. 목소리는 합성 gasuni(지정 없음)
  gasuni1: { name: '가순이1', voice: 'gasuni', sheet: 'assets/sprites/gasuni1.png', stillPivot: [64, 120] },
  gasuni2: { name: '가순이2', voice: 'gasuni', sheet: 'assets/sprites/gasuni2.png', stillPivot: [64, 120] },
  gasuni3: { name: '가순이3', voice: 'gasuni', sheet: 'assets/sprites/gasuni3.png', stillPivot: [64, 120] },
  // 가순이 4·5·6(BUILD271 벚꽃 숲 5 공터): 1·2·3 시트를 참조로 옷·머리만 바꾼 gpt-image 4×4 걷기 시트(assets/source/sakura5-v1) — 4 파랑 옆머리, 5 초록 단발, 6 보라 양갈래
  gasuni4: { name: '가순이4', voice: 'gasuni', sheet: 'assets/sprites/gasuni4.png', stillPivot: [64, 120] },
  gasuni5: { name: '가순이5', voice: 'gasuni', sheet: 'assets/sprites/gasuni5.png', stillPivot: [64, 120] },
  gasuni6: { name: '가순이6', voice: 'gasuni', sheet: 'assets/sprites/gasuni6.png', stillPivot: [64, 120] },
  // 도현(BUILD271 사용자 선화 “얇고 살짝 길죽하게”): 검은 바가지머리·긴 얼굴, 다른 시트보다 셀을 더 채워(fit 0.92) 키가 크다. 목소리 델타룬 알피스 톤 살짝 올림
  dohyun: { name: '도현', voice: 'dohyun', sheet: 'assets/sprites/dohyun.png', stillPivot: [64, 120] },
  // 도미조림(BUILD271 사용자 사진): 곱슬머리·남색 티. 목소리 거슨(청소부 클립)을 젊게
  domijorim: { name: '도미조림', voice: 'domijorim', sheet: 'assets/sprites/domijorim.png', stillPivot: [64, 120] },
  choimis: { name: '최미스', voice: 'choimis', sheet: 'assets/sprites/choimis.png', stillPivot: [64, 120] },   // 목소리(BUILD258): 델타룬 킹 snd_dadtxt(voices/choimis.mp3), 초상화 assets/portraits/choimis.png(걷기 시트 얼굴)
  // 청소부(BUILD226 사용자 그림 등록: 붉은 두건·안경·수염·붉은 셔츠, “조금만 더 허약한 섭타룬 버전”): gpt-image-2.5-sunburst 4×4 걷기 시트 → 128px 셀(assets/source/janitor-v1). 목소리는 형섭 샘플을 할아버지 느낌으로 낮춘 janitor.mp3(델타룬 거슨 참고)
  // 허약 청소부는 토리이 길 이벤트 뒤 동료(hp 100 = 사용자 “hp는 100으로”, 노란색 = “청소부(노란색)이 동료가 되었다”). 전투 시트 assets/battle/janitor*.png(허약 모습) — 깃발·댄스 시트는 ‘청소부(전투)’용으로 따로 둔다
  // hp 100 그대로(noHpBonus: 앞서 얻은 파티 최대 HP 보너스는 청소부에게 안 붙는다 — 사용자 “청소부 체력 100으로 하라고 했잖아”), attackMode throw = 제자리에서 지팡이 던지기
  janitor: { name: '청소부', voice: 'janitor', sheet: 'assets/sprites/janitor.png', stillPivot: [64, 120], hp: 100, noHpBonus: true, attackMode: 'throw', hpColor: '#ffd84a', partyName: '청소부', partyDesc: '저기~까지 데려다 줘야 한다.' },
  // 청소부 검은 실루엣(같은 걷기 시트를 검게 칠한 것) — 토리이 길에서 요플래 뒤로 걸어오는 형체
  janitor_shadow: { name: '???', sheet: 'assets/sprites/janitor_shadow.png', stillPivot: [64, 120] },
  // 청소부 영웅 모습(멸공의 깃발) 필드용(BUILD254 보스전 뒤): 전투 정지 그림 janitor-hero-stand 그대로(192 셀·발 pivot 138,180). 필드 키 ≈ 요플래 2배(128px 셀 상당). 대기 동작은 CHARACTER_MOTIONS.janitor_hero.idle(전투 idle 시트 8프레임)
  janitor_hero: { name: '청소부', voice: 'janitor', portrait: false, palette: 'ghost', still: 'assets/battle/janitor-hero-stand.png', stillScale: 128 / (192 * 1.43), stillPivot: [138, 180] },
  ttuulla: { name: '뚜울라', voice: 'ttuulla', sheet: 'assets/sprites/ttuulla.png', stillPivot: [32, 60] },
  seopnyang: { name: '섭냥이', voice: 'cat', palette: 'ghost', still: 'assets/enemies/seopnyang_front.png', stillPivot: [24, 44] },
  gyeongnyang: { name: '경냥이', voice: 'cat', palette: 'ghost', still: 'assets/enemies/gyeongnyang_front.png', stillPivot: [24, 44] },
  mini_mario: { name: '마리오', still: 'assets/sprites/mini_mario.png', stillScale: 0.5, stillPivot: [32, 60] },
  warm_bidet: { name: '따듯한비데', voice: 'warm_bidet', sheet: 'assets/sprites/warm_bidet.png', stillPivot: [64, 156], walkBob: true },
  lucky_guy: { name: '럭키가이', voice: 'lucky_guy', sheet: 'assets/sprites/lucky.png', stillPivot: [32, 60] },
  // 나람이(2026-09-14 사용자 명명): 군복·웃는 얼굴·뚱뚱한 체형, OG 생성 4방향 시트(assets/source/naram-walk-v1). 정지 프레임은 앞뒤 0·좌우 1(계약). 아직 맵 배치·대사 없음
  naram: { name: '나람이', voice: 'naram', sheet: 'assets/sprites/naram.png', stillPivot: [32, 60] },
  // 거대·뚱뚱 나람(BUILD202 사용자 “나람 스프라이트 더 거대하고 뚱뚱하게 재구성”): OG gpt-image-2 재생성 4방향 시트(assets/source/naram-giant-v1, 96px 셀 → 필드 48px, 발 y90). 조종실 실험체
  naram_giant: { name: '나람이', voice: 'naram', sheet: 'assets/sprites/naram_giant.png', stillPivot: [48, 90] },
  // 오방순(BUILD149 자산, BUILD202 조종실 실험체로 첫 등장): 큰 얼굴·붉은 장식·땋은 머리 64px 셀(pivot 32,61). 목소리 = Yuna 낮춘 ‘흐에에에’ voices/obangsun.mp3
  //   BUILD203 “오방순 너무 작고” → 같은 raw(assets/source/obangsun149/raw-sheet.png)를 96px 셀로 다시 뽑은 obangsun_big.png(필드 48px, 발 y90). 64px 원본은 보존
  //   raw 행 순서는 down/left/right/up(BUILD205 사용자 “걸음거리 좌우 구분 못함” — 엔진 기본 down/up/left/right 로 읽어 옆·뒤가 뒤섞였다)
  obangsun: { name: '오방순', voice: 'obangsun', sheet: 'assets/sprites/obangsun_big.png', rowOrder: ['down', 'left', 'right', 'up'], stillPivot: [48, 90] },
  park_guardian_costume: { name: '파크가디언', voice: 'park_guardian_costume', sheet: 'assets/sprites/park_guardian_costume.png', stillPivot: [32, 60] },
  park_guardian: { name: '파크가디언', voice: 'park_guardian', sheet: 'assets/sprites/park_guardian.png', stillPivot: [32, 60] },
  youngcle: { name: '영클', voice: 'youngcle', sheet: 'assets/sprites/youngcle.png' },
  // 영클 비행 장치(BUILD203, gpt-image-2 재생성 4방향 시트 assets/source/youngcle-hover-v2 — 승인 걷기 시트 + 사용자 참고 이미지 탈것; 112px 셀 = 필드 56px, 발(꼭지) y104).
  //   hover: 서 있어도 불꽃·번개 프레임이 돌고 6px 떠서 2px 오르내린다(world.js Character). 손으로 그린 v1(tools/art/youngcle_hover_set.py)은 사용자 반려로 폐기(postmortem 2026-09-16-ship-control-intro)
  //   기본 모션은 차분하게(사용자 “너무 역동적”): 서 있을 땐 중립·불꽃 두 프레임만 2.5fps, 1px 오르내림 2.6초 주기
  youngcle_hover: { name: '영클', voice: 'youngcle', sheet: 'assets/sprites/youngcle_hover.png', stillPivot: [56, 104], hover: { fps: 2.5, frames: [0, 1], lift: 6, bob: 1, period: 2.6 } },
  // 영클 변신형(BUILD211 보스전 뒤 연출, gpt-image-2.5-sunburst youngcle-tvform-v2): 영클 옷·색 그대로(파란 티·초록 배지·남색 반바지)에 팔다리만 길어지고 TV 머리(화면에 영클 얼굴), 3D 풍 음영(델타룬 테나는 질감 참고만 — 사용자 “테나랑 너무 똑같다”).
  //   크기는 보이는 영역(대화 중 230px) 안 최대치 ≈ 파티 5배(사용자 “두 배는 거대해야”): 320px 셀 = 필드 160px(발 y312). 서 있는 동작은 character-motions.js youngcle_tvform.idle(테나 전투 대기처럼 앞으로 뻗은 팔이 작은 원을 그림) — 컷신이 loopCharacterMotion 으로 건다. 시트 4행은 같은 4프레임
  youngcle_tvform: { name: '영클', voice: 'youngcle', sheet: 'assets/sprites/youngcle_tvform.png', stillPivot: [160, 312] },
  // 영클 힘 받는 자세(BUILD211, gpt youngcle-powerup-v1): 포드 없이 바닥에 웅크림 → 무릎 → 노려봄 → 포효, 4단계(128px 셀 = 필드 64px, 발 y122). 단계는 character-motions.js youngcle_powerup.rise 프레임을 컷신이 골라 건다
  youngcle_powerup: { name: '영클', voice: 'youngcle', sheet: 'assets/sprites/youngcle_powerup.png', stillPivot: [64, 122] },
  gajaeman_shadow: { name: '가재맨', voice: 'gajaeman_shadow', palette: 'hero', sheet: 'assets/sprites/gajaeman_shadow.png', stillPivot: [32, 61] },
  junhee_mankatsuki: { name: '만카츠키 쥰희', voice: 'junhee', palette: 'merchant', sheet: 'assets/sprites/junhee_mankatsuki.png', stillPivot: [32, 61] },
  junhee_point: { name: '쥰희', voice: 'junhee', still: 'assets/sprites/junhee_point.png', stillScale: 0.77, stillPivot: [32, 61] },
  eunbyeol: { name: '김은별컴퍼니', voice: 'eunbyeol', sheet: 'assets/sprites/eunbyeol.png' },
  expelled_viewer: { name: '악질맨', voice: 'expelled_viewer', still: 'assets/sprites/expelled-viewer.png', stillScale: 0.8, stillPivot: [48, 88] },
  expelled_viewer_down: { name: '악질맨', voice: 'expelled_viewer', still: 'assets/sprites/expelled-viewer-down.png', stillScale: 0.8, stillPivot: [48, 88] },
  yakulbeol: { name: '야꿀벌', voice: 'yakulbeol', sheet: 'assets/sprites/yakulbeol.png' },
  mabaem: { name: '마뱀이', voice: 'mabaem', sheet: 'assets/sprites/mabaem.png' },
  parkwonsung: { name: '박원숭', voice: 'parkwonsung', sheet: 'assets/sprites/parkwonsung.png' },
  yerim: { name: '예림', voice: 'yerim', still: 'assets/sprites/yerim.png', stillScale: 0.348, stillPivot: [160, 300] },
  yerim_kick: { name: '예림', voice: 'yerim', still: 'assets/sprites/yerim-kick.png', stillScale: 0.348, stillPivot: [160, 300] },
  chakgeom: { name: '착검하고검사로살기', voice: 'narrator', sheet: 'assets/sprites/chakgeom.png' },
  parang: { name: '파랑이', voice: 'narrator', still: 'assets/props/parang.png' },
  norang: { name: '노랑이', voice: 'narrator', still: 'assets/props/norang.png' },
  wemix: { name: '위믹스', voice: 'narrator', sheet: 'assets/sprites/wemix.png' },
  drum_devil: { name: '드럼통의 악마', voice: 'mystery', portrait: false, palette: 'ghost', still: 'assets/enemies/drum-devil-field.png', stillScale: 220 / (232 * 1.43), stillPivot: [142, 226] },
  baron_intro: { name: '바론', voice: 'mystery', palette: 'ghost', still: 'assets/enemies/baron-roar-idle.png', stillScale: 0.625, stillPivot: [128, 240] },
  baron_chase: { name: '바론', voice: 'mystery', palette: 'ghost', sheet: 'assets/sprites/baron-chase.png', rowOrder: ['down', 'left', 'right', 'up'], stillPivot: [256, 256] },
  voidgrub: { name: '공허유충', voice: 'mystery', palette: 'ghost', still: 'assets/enemies/voidgrub-front.png' },
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
  dao: { name: '다오', voice: 'dao', palette: 'ghost', still: 'assets/enemies/dao-front.png' },   // 벚꽃 숲 4 필드 적(BUILD266) — 사용자가 붙인 카트라이더 도트 그림 축소 52×56
  bazzi: { name: '배찌', voice: 'bazzi', palette: 'ghost', still: 'assets/enemies/bazzi-front.png' },   // 벚꽃 숲 4 필드 적(BUILD266) — 44×56
  munkorita: { name: '문코리타', voice: 'cat', palette: 'ghost', still: 'assets/enemies/munkorita-front.png' },   // 찢칠라 길 2 필드 적(BUILD248) — gpt-image 정면 64×64(assets/source/munkorita-v1)
  chinchilla: { name: '찢칠라', voice: 'cat', palette: 'ghost', still: 'assets/enemies/chinchilla-front.png' },   // 찢칠라 길 필드 적(BUILD242) — gpt-image 정면 64×64(assets/source/chinchilla-v1)
  toad:      { name: '두꺼비', voice: 'cat', palette: 'ghost', still: 'assets/enemies/jungle-gromp-front.png' },
  krug:      { name: '돌거북', voice: 'cat', palette: 'ghost', still: 'assets/enemies/jungle-krug-front.png' },      // 청록숲8 정글 2 — PR #14 이미지(assets/source/krug-scuttle-cannon-v1, docs/handoffs/krug-scuttle-cannon-sprites.md)
  scuttle:   { name: '바위게', voice: 'cat', palette: 'ghost', still: 'assets/enemies/jungle-scuttle-front.png' },
  cannon:    { name: '대포미니언', voice: 'cat', palette: 'ghost', still: 'assets/enemies/jungle-cannon-front.png' },
  red:       { name: '레드', voice: 'red', palette: 'ghost', still: 'assets/enemies/red-front.png', stillScale: 1.8 },        // 청록숲9 사원 문지기(NPC → 전투). PR #16 정면 64×64(레드 브램블백 모티브). 목소리 낮고 드문 합성(audio.js VOICES.red)
  blue:      { name: '블루', voice: 'blue', palette: 'ghost', still: 'assets/enemies/blue-front.png', stillScale: 1.8 },
  baron:     { name: '바론', voice: 'mystery', palette: 'ghost', still: 'assets/enemies/baron-front.png' },                    // PR #15 바론(LoL 모티브 보스) 필드 정면 160×160(바닥 앵커 80,148) → 1.43배 229px = 대화 중 보이는 높이(230) 꽉 참. 전투 시트 assets/enemies/baron-battle-idle.png 512×512 2×2 셀 256, 240ms, pivot [128,238] — 능력치·패턴은 브리핑 뒤 enemies.js 에(2026-09-11 "이제 쓸 건데 다음 맵에서 바로는 아님")      // PR #16 (블루 센티넬 모티브)
  merchant:  { name: '상인', voice: 'low',     palette: 'merchant' },
  cat:       { name: '???',  voice: 'cat',     palette: 'cat' },
  guard:     { name: '경비병', voice: 'robot', palette: 'guard' },
  ghost:     { name: '유령', voice: 'narrator', palette: 'ghost' },
};

/** 동료 걷는 순서(주인공 형섭 바로 뒤부터): 경섭 → 빠맨. 가입 순서와 무관하게 이 순서 (사용자 2026-09-10). 전투 세로 순서도 같다(형섭·경섭·빠맨) */
export const PARTY_ORDER = ['gyeongsub', 'ppaman', 'janitor'];   // 청소부(BUILD226)는 짜장섬에서 요플래 뒤에 붙는다
