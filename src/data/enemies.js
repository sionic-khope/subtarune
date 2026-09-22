// ─────────────────────────────────────────────────────────────
// 적 레지스트리 — 적 하나 = 항목 하나. 여기만 고치면 새 적이 전투에 나온다 (2026-09-10 전투 브리핑: "여러 적이 생길 때 쉽게 커스텀·추가").
//   name        전투 화면 이름
//   hp          체력 (기본 공격 1, 레드·블루 버프 뒤 2 데미지)
//   image / sheet  그림: image = 단일 PNG(전투 전용, pivot = 발 기준 [x,y], 이미 왼쪽을 보는 그림) | sheet = 오버월드 4x4 시트에서 왼쪽 보는 줄(row 2) 두 프레임을 번갈아
//   scale       그리는 배율
//   damage      탄에 맞았을 때 우리 쪽이 잃는 HP
//   patterns    적 턴에 쓰는 탄막 (src/battle/bullets.js PATTERNS 의 키 + 옵션). 여러 개면 턴마다 돌아가며.
//   board       탄막 상자 크기 [w,h] (없으면 기본 200x150)
//   money       잡으면 얻는 돈(원). 없으면 30
//   boss        true면 승리 징글 없이 브금·화면을 천천히 페이드하고 보상 확인 뒤 후속 연출로 복귀
//   idle        기본 모션 { swayX, swayY, period } — 좌우로 천천히 흔들리며 살짝 위아래 (없으면 7px / 2px / 2.8초)
//   lines       { appear, idle[], die, speak[] }  speak = 적 턴 말풍선(1인칭, 흰 풍선·작은 글씨, 델타룬 전투 참고) — 탄막 전에 뜨고 준비 시간을 준다.  전투 문구 (나레이션 '* ' 포함, 행동 선택 화면에 idle 중 하나가 [공격하기][아이템] 과 같이 뜬다 — 다른 적을 가리키는 문구 금지(그 적이 죽은 뒤에도 뜸) — 언더테일식 잡담 톤: "억빠맨이 CS 막타를 노리고 있는 듯 하다.. (신경쓸 필욘 없다)"). 맞았을 때 문구는 없음
// ─────────────────────────────────────────────────────────────
export const ENEMIES = {
  choimis_flower: {
    name: '최미스', hp: 200, damage: 15, money: 0, boss: true, voice: 'choimis_flower',
    sheet: { src: 'assets/enemies/choimis-flower-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 280, px: 1 },
    actions: { choso: { src: 'assets/enemies/choimis-choso.png', cols: 2, rows: 2, count: 4, fps: 4.5, px: 1, pivot: [80, 152] } },
    pivot: [80, 152], scale: 0.506, scaleY: 1.2, idle: { swayX: 0, swayY: 0, period: 2.4 },
    projectiles: {
      jjajang: 'assets/props/dark_jjajang.png',
      mic: 'assets/enemies/choimis-rap.png',
      fashion: 'assets/props/choimis-fashion.png',
      dao: 'assets/enemies/dao-battle.png',
      bazzi: 'assets/enemies/bazzi-battle.png',
    },
    patterns: [
      { type: 'choimis_jjajang' },
      { type: 'choimis_choso', speak: '내 추구미는 쵸소우야' },
      { type: 'choimis_rap', speak: '요 최미스 래퍼딱지를때이젠앰씨로 포에버 포에버' },
      { type: 'choimis_money', speak: '가져가라.' },
      { type: 'choimis_seup', speak: '스읍 미스' },
      { type: 'choimis_fashion', speak: '이거 패션어떰?' },
      { type: 'choimis_pink_choso', mode: 'choimis_pink_round', scenario: 'choso', speak: '내 추구미는 쵸소우야' },
      { type: 'choimis_pink_kart', mode: 'choimis_pink_round', scenario: 'kart_block', speak: '막자할게' },
      { type: 'choimis_pink_prism', mode: 'choimis_pink_round', scenario: 'pink_prism' },
      { type: 'choimis_eating_race', mode: 'choimis_eating_race' },
    ],
    openingMode: 'choimis_pink_shooter',
    openingLines: [
      { speaker: '최미스', portrait: 'choimis_flower', voice: 'choimis_flower', text: '* 형들 꼭 그렇게 저를 막으셔야겠다면' },
      { speaker: '최미스', portrait: 'choimis_flower', voice: 'choimis_flower', text: '* 여러분들의 마음을 핑크로 물들여보세요.' },
    ],
    lines: {
      appear: '* 최미스가 승부를 걸어왔다.',
      idle: ['* 짜장면의 냄새가 풍긴다.', '* 핑크색이 보인다.'],
      speak: [],
      die: '* 최미스를 쓰러뜨렸다.',
    },
  },
  drum_devil: {
    name: '드럼통의 악마', hp: 300, damage: 15, money: 0, boss: true, support: 'drum_devil',
    sheet: { src: 'assets/enemies/drum-devil-idle.png', cols: 2, rows: 2, count: 4, fps: 4, px: 1 },
    actions: { attack: { src: 'assets/enemies/drum-devil-attack.png', cols: 2, rows: 2, count: 4, fps: 4, px: 1 } },
    // dx -83 은 오른쪽 한계: 대기 2번 프레임의 오른손이 x 464, 구출 피격 밀림(+14)과 흔들림(+2)까지 더하면 480 — 더 오른쪽이면 손이 화면 밖으로 잘린다(tests/unit/drum-devil.test 오른쪽 여백 15). 요플래와의 간격은 요플래 쪽(drum-devil.js heroPartyHome)을 왼쪽으로 옮겨 벌렸다(사용자 2026-09-20)
    pivot: [216, 320], scale: 1.2, dx: -83, dy: 96, board: [240, 160], idle: { swayX: 0, swayY: 0 },
    projectiles: { drum: 'assets/props/jjajang_drum.png' },
    patterns: [{ type: 'drum_bombard' }, { type: 'drum_roll' }, { type: 'drum_chain' }, { type: 'drum_cross' }, { type: 'drum_ring' }],
    lines: { appear: '* 드럼통의 악마인 것 같다.',
      idle: ['* 드럼통이 덜컹거린다.', '* 파란 드럼통이 쌓여 있다.', '* 드럼통의 악마다.', '* 드럼통의 악마가 다음 드럼통을 집어 든다.'],
      speak: ['씨2발년아', '크어어어억', '찢어주겠다'], die: '* 드럼통의 악마가 쓰러졌다.',
    },
  },
  // ── 엄청대박인배 조종실(BUILD207 사용자 브리핑): 영클(비행 장치, hp 40, 맞으면 피함) + 실험체 오방순·나람(공격 전용, 때릴 수 없음). 지원 모듈 youngcle_ship 이 턴마다 패턴 하나를 고른다.
  //    브금 youngcle_battle(사용자 지정 XR2QQMfeJbg). 전투 대기 시트는 전부 gpt-image-2.5-sunburst(assets/source/*-battle-*). 피해 기믹은 다음 명령
  youngcle_hover: {
    name: '영클', hp: 10, damage: 15, money: 0, boss: true, support: 'youngcle_ship', voice: 'youngcle',   // 공격당 15 고정(사용자 2026-09-17 “공격당 15씩만 달게하기로 했잖아” — 피격마다 +10 계단은 폐기, damageStep 0)
    sheet: { src: 'assets/enemies/youngcle-hover-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 180, px: 1 },
    actions: { surprise: { src: 'assets/enemies/youngcle-surprise.png', cols: 2, rows: 1, count: 2, fps: 4, px: 1, pivot: [64, 118] } },   // 놀람(뒤를 봄·끼엑): 아이디어·피날레
    pivot: [64, 118], scale: 0.9, dx: -34, dy: 0, board: [240, 160], idle: { swayX: 0, swayY: 3, period: 2.2 },   // 0.9 = 사용자 “10퍼 작게”(BUILD209, 3/4 시점·비웃는 v2 시트)
    patterns: [{ type: 'youngcle_orbit_laser' }],
    projectiles: { warship: 'assets/props/youngcle-warship.png' },   // youngcle_ship: 유도 함선(흰 도트)
    lines: { appear: '* 영클이 비행 장치 위에서 내려다본다.', idle: ['* 영클의 비행 장치가 웅웅거린다.'], die: '* 영클이 물러났다.', speak: ['ㅋㅋ', '즐', '죽어라 게이야', '후후후후'] },   // ‘죽어라 게이야’·‘후후후후’ 추가(사용자 2026-09-17 “ㅋㅋ만 있지 말고”)
  },
  // 변신 영클(BUILD214/215, TV 머리·굵은 팔다리 — gpt youngcle-tvform-v3 → enemies/youngcle-tvform-battle-idle.png 256 셀, 키 ≈230px): 보통 [공격하기][아이템], 적 턴은 일반(코인 6종, 코인 = 회복) → 특별(섭리오·리듬·마녀재판·팽이 배틀) 번갈아(support/youngcle-tvform.js). hp 200(사용자, BUILD216)
  youngcle_tvform: {
    name: '영클', hp: 200, damage: 15, money: 1000, boss: true, support: 'youngcle_tvform', voice: 'youngcle',   // 승리 보상 1000원(2026-09-17 사용자)
    sheet: { src: 'assets/enemies/youngcle-tvform-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 160, px: 1 },
    // dy 66: 발을 y242(패널 위 4px)에 — 시트 머리 위 여백 10px 라 머리 위가 화면 안 6px(사용자 2026-09-18 “전투 위치 높아서 잘린다”)
    pivot: [128, 246], scale: 1, dx: -14, dy: 66, board: [240, 160], idle: { swayX: 0, swayY: 2, period: 2.4 },
    patterns: [{ type: 'coin_lasers' }],
    projectiles: { warship: 'assets/props/youngcle-warship.png' },
    // 영클 대사는 적 턴 말풍선(youngcle-tvform-battle.js taunts·mazeLine)에서만 — 행동 선택 잡담엔 넣지 않는다(사용자 2026-09-18 “공격하기 누르는 화면에 영클: 즐을 넣냐”)
    // 잡담은 나레이션체(사용자 2026-09-18 “억빠맨이 영클을 향해 패드립했다 효과는 없었다 이런 식”). speak 는 말풍선 예비(실제 말풍선은 support.speechFor → youngcle-tvform-battle.js taunts)
    lines: { appear: '* 변신한 영클이 내려다본다.', idle: ['* 영클의 TV 화면이 지직거린다.', '* 억빠맨이 영클을 향해 패드립했다. 효과는 없었다.'], die: '* 영클이 물러났다.', speak: ['후후후', 'ㅋㅋ', '즐', '이건 다 파악했음', 'ㅈ밥년들'] },
  },
  obangsun: {
    name: '오방순', hp: 1, untargetable: true, damage: 15, money: 0, voice: 'obangsun',
    sheet: { src: 'assets/enemies/obangsun-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 4, px: 1 },
    pivot: [64, 118], scale: 0.9, dx: 40, dy: 6, idle: { swayX: 0, swayY: 0 },
    patterns: [{ type: 'obangsun_rays' }],
    projectiles: { face_closed: 'assets/enemies/obangsun-face-closed.png', face_open: 'assets/enemies/obangsun-face-open.png' },
    lines: { appear: '* 오방순이 옆에 섰다.', idle: ['* 오방순의 머리 장식이 흔들린다.'], die: '* 오방순이 물러났다.', speak: ['흐어어어'] },
  },
  naram_giant: {
    name: '나람이', hp: 1, untargetable: true, damage: 15, money: 0, voice: 'naram',
    sheet: { src: 'assets/enemies/naram-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 4, px: 1 },
    pivot: [64, 118], scale: 0.9, dx: 40, dy: -6, idle: { swayX: 0, swayY: 0 },
    patterns: [{ type: 'naram_slam' }],
    projectiles: { naram: 'assets/sprites/naram_giant.png', tank: 'assets/sprites/naram_tank.png' },   // naram_tank: gpt naram-tank-v1(흰 도트)
    lines: { appear: '* 나람이가 옆에 섰다.', idle: ['* 나람이가 배를 두드린다.'], die: '* 나람이가 물러났다.', speak: ['히요오오옹'] },
  },
  park_guardian: {
    // 승리 보상 500원 (2026-09-15 사용자). QA 지점은 STATE_FROM_FLAGS 의 park_guardian_won 규칙이 이 값을 그대로 유도한다
    name: '파크가디언', hp: 57, damage: 16, money: 500, boss: true, support: 'park_strip', voice: 'park_guardian_costume',
    sheet: { src: 'assets/enemies/park-guardian-dance.png', cols: 2, rows: 2, count: 4, fps: 5, px: 1 },
    actions: {
      dance: { src: 'assets/enemies/park-guardian-dance.png', cols: 2, rows: 2, count: 4, fps: 5, px: 1 },
      loose: { src: 'assets/enemies/park-guardian-loose.png', cols: 2, rows: 2, count: 4, fps: 5, px: 1 },
      slipping: { src: 'assets/enemies/park-guardian-slipping.png', cols: 2, rows: 2, count: 4, fps: 5, px: 1 },
      attack: { src: 'assets/enemies/park-guardian-attack.png', cols: 2, rows: 3, count: 6, fps: 8, px: 1 },
      attackLoose: { src: 'assets/enemies/park-guardian-attack-loose.png', cols: 2, rows: 3, count: 6, fps: 8, px: 1 },
      attackSlipping: { src: 'assets/enemies/park-guardian-attack-slipping.png', cols: 2, rows: 3, count: 6, fps: 8, px: 1 },
      attackAdjust: { src: 'assets/enemies/park-guardian-attack-adjust.png', cols: 2, rows: 3, count: 6, fps: 8, px: 1 },
      adjust: { src: 'assets/enemies/park-guardian-adjust.png', cols: 2, rows: 2, count: 4, fps: 6, px: 1 },
      scratch: { src: 'assets/enemies/park-guardian-scratch.png', cols: 2, rows: 2, count: 4, fps: 7, px: 1, pivot: [64, 90] },
    },
    pivot: [48, 90], scale: 1.35, dx: -12, dy: 0, board: [240, 160], idle: { swayX: 0, swayY: 0 },
    patterns: [{ type: 'park_rabbit_ears' }, { type: 'park_obsessive_hearts' }, { type: 'park_pirate_fans' }, { type: 'park_cleaning', prep: '경섭이형 집좀 치우고 살아.' }],
    projectiles: {
      cleaningBag: 'assets/projectiles/park-cleaning-bag.png',
      cleaningBroom: 'assets/projectiles/park-cleaning-broom.png',
      cleaningDustpan: 'assets/projectiles/park-cleaning-dustpan.png',
    },
    forms: {
      dog: {
        sheet: { src: 'assets/enemies/park-guardian-idle.png', cols: 2, rows: 2, count: 4, fps: 5, px: 1 },
        voice: 'park_guardian', patterns: [{ type: 'park_dog_scratch' }],
        lines: { speak: ['아 보 보지마...', '아 시발 내 인형탈.'] },
      },
    },
    lines: {
      appear: '* 파크가디언이 스테이지를 가로막았다.',
      idle: ['* 파크가디언이 토끼 귀를 까딱인다.', '* 파크가디언이 인형탈의 주름을 편다.'],
      speak: ['형섭아 나도 사랑해줘', '칠라스아트해줘 형섭아', '가재맨 해적지부 많이 사랑해주세요'],
      die: '* 파크가디언이 쓰러졌다.',
    },
  },
  // 아짐키야 3인조(BUILD227 사용자 브리핑: 소나무 숲 공터, 체력 8씩, 이기면 10원(4+3+3), 넷 → 셋으로 정정, 공격 대사 ‘가재맨ㅇㅁ뒤짐~’·‘땡개땡개~ ㅇㅁ뒤짐~’ + 영상 소리, 패턴 = 글자 뿜기·글자 비·역동적 춤).
  //   춤 시트 assets/source/ajimkiya-v1(gpt-image-2.5-sunburst, 사진의 네 사람). 목소리 'none' + speakSfx 클립. 피해 5 는 미지정(잠정)
  ...Object.fromEntries(['ajimkiya1', 'ajimkiya2', 'ajimkiya3'].map((id, i) => [id, {
    name: '아짐키야' + (i + 1), hp: 8, damage: 5, money: [4, 3, 3][i], voice: 'none', soloPattern: true,
    sheet: { src: `assets/enemies/${id}-dance.png`, cols: 2, rows: 2, count: 4, fps: 5, px: 1 },
    pivot: [64, 118], scale: 1.05, dx: [-62, 28, -62][i], dy: [0, 0, 0][i], idle: { swayX: 0, swayY: 2, period: 1.2 },   // 셋: 위·아래는 왼쪽 열, 가운데는 오른쪽 열로 엇갈리게(겹침 방지). 배율 1.05 = 사용자 “캐릭터 크기 더 키워”
    projectiles: { d1: 'assets/enemies/ajimkiya1-dance.png', d2: 'assets/enemies/ajimkiya2-dance.png', d3: 'assets/enemies/ajimkiya3-dance.png' },
    patterns: [{ type: 'ajimkiya_spew' }, { type: 'ajimkiya_rain' }, { type: 'ajimkiya_dance' }],
    // appear/idle/die 는 엔진 형식상 필요한 최소 나레이션(사용자 미지정): 등장은 첫 줄만 4인조 문구, 나머지는 한 줄씩
    lines: { appear: i === 0 ? '* 아짐키야 3인조가 춤추며 나타났다!' : '* 아짐키야' + (i + 1) + '도 춤춘다.', idle: ['* 아짐키야들이 춤을 멈추지 않는다.'], speak: ['가재맨ㅇㅁ뒤짐~', '땡개땡개~ ㅇㅁ뒤짐~'], speakSfx: 'ajimkiya_line', die: '* 아짐키야' + (i + 1) + '이(가) 춤을 멈췄다.' },
  }])),
  // 찢칠라(BUILD242 사용자 브리핑 2026-09-19): 사진(안경 쓴 노인 얼굴의 친칠라) → gpt-image 대기 시트 assets/source/chinchilla-v1. 체력 16(원문), 패턴 = 찢기·드럼통 던지기(src/battle/chinchilla-patterns.js, 아짐키야보다 약 1.8배 촘촘).
  //   전투 대사 3줄(speak)은 원문 그대로. 피해 9(미지정, 잠정: 아짐키야 5 × 1.8)·돈 18(미지정, 잠정)·appear/idle/die 나레이션(엔진 형식상 필요, 미지정). 말풍선 소리는 델타룬 snd_squeaky
  chinchilla: {
    name: '찢칠라', hp: 16, damage: 9, money: 18, voice: 'cat',
    sheet: { src: 'assets/enemies/chinchilla-idle.png', cols: 2, rows: 2, count: 4, fps: 4, px: 1 },
    pivot: [64, 118], scale: 1.3, idle: { swayX: 0, swayY: 0, period: 2 },
    projectiles: { drum: 'assets/props/jjajang_drum.png' },
    patterns: [{ type: 'chin_tear' }, { type: 'chin_drum' }, { type: 'chin_tear', cross: true, drums: true }],
    lines: { appear: '* 찢칠라가 나타났다!', idle: ['* 찢칠라가 안경 너머로 노려본다.', '* 찢칠라의 수염이 씰룩인다.'], speak: ['씨2발년아', '씹구멍 씹구멍', '찍찍찍찍찢'], speakSfx: 'squeaky', die: '* 찢칠라가 쓰러졌다.' },
  },
  // 문코리타(BUILD248 사용자 브리핑 2026-09-19): 사진(안경 쓴 노인 얼굴로 웃는 분홍 돼지 + 위로 솟은 회색 깃털 + 녹색 구슬 목걸이) → gpt-image 대기 시트 assets/source/munkorita-v1.
  //   체력 16(“찢칠라와 똑같이”), 공격 대사 2줄(원문 그대로), 패턴은 덩굴 채찍·소리지르기 둘(원문 “두개로”) — src/battle/munkorita-patterns.js.
  //   피해 9·돈 18 은 미지정(찢칠라와 같은 잠정값), appear/idle/die 나레이션도 엔진 형식상 필요한 최소(미지정)
  // 다오·배찌(BUILD266 사용자 브리핑 2026-09-20 “다오랑 배찌라는 몬스터 … 각각 카트라이더 사운드 쓰는 카트라이더 패턴으로 체력 36씩”): 사용자가 붙인 카트라이더 도트 그림(assets/source/kartrider-v1/paste-a/b)을 그대로 축소해 필드·전투에 쓴다.
  //   체력 36(원문). 패턴은 카트라이더 아이템(src/battle/kart-patterns.js): 다오 = 미사일·부스터·바나나, 배찌 = 물폭탄·자석·물파리(조합). 소리 kart_*(assets/source/kartrider-v1/README.md — 청취 미확인 배정).
  //   피해 12·돈 40 은 미지정(잠정, 찢칠라 9/18 보다 뒤 구간이라 조금 위). speak 는 아이템 이름을 외치는 한 마디(대사 미지정 — 잠정, 사용자 확인 필요), appear/idle/die 나레이션은 엔진 형식상 최소.
  dao: {
    name: '다오', hp: 36, damage: 12, money: 40, voice: 'dao',
    image: 'assets/enemies/dao-battle.png', pivot: [55, 118], scale: 1.2, idle: { swayX: 6, swayY: 2, period: 2.4 },
    projectiles: { kart: 'assets/enemies/dao-battle.png' },
    patterns: [{ type: 'kart_missile', speak: '미사일!' }, { type: 'kart_booster', speak: '부스터!' }, { type: 'kart_banana', speak: '바나나!' }],   // speak: 이번 턴 아이템을 외친다(말풍선이 패턴과 맞게)
    lines: { appear: '* 다오가 나타났다!', idle: ['* 다오가 엔진 소리를 낸다.', '* 다오가 헬멧을 고쳐 쓴다.'], speak: ['미사일!', '부스터!', '바나나!'], die: '* 다오가 쓰러졌다.' },
  },
  bazzi: {
    name: '배찌', hp: 36, damage: 12, money: 40, voice: 'bazzi',
    image: 'assets/enemies/bazzi-battle.png', pivot: [47, 118], scale: 1.2, idle: { swayX: 5, swayY: 3, period: 2.0 },
    projectiles: { kart: 'assets/enemies/bazzi-battle.png' },
    patterns: [{ type: 'kart_waterbomb', speak: '물폭탄!' }, { type: 'kart_magnet', speak: '자석!' }, { type: 'kart_waterfly', speak: '물파리!' }],
    lines: { appear: '* 배찌가 나타났다!', idle: ['* 배찌가 고글을 반짝인다.', '* 배찌가 리본을 만진다.'], speak: ['물폭탄!', '자석!', '물파리!'], die: '* 배찌가 쓰러졌다.' },
  },
  // 도미조림·도현(BUILD271 사용자 브리핑 2026-09-20 벚꽃 숲 5 공터 “얼린홍어를 던지는것, 횃불을 던지는것, 마른 도현이가 위에서 살랑살랑 떨어지는것, 카톡 텍스트 던지는 패턴 … 각각 체력 50씩”):
  //   전투 그림은 gpt-image(assets/source/sakura5-v1) — 도미조림은 오른손에 꼬리 잡은 얼린 홍어·왼손 횃불, 도현은 빈손으로 한 손만 들고(안녕하듯, 사용자 “걍 손하나 들고있다고”). 도현은 “양옆으로 살랑살랑 춤추는 느낌”이라 idle 좌우 흔들림을 크게.
  //   체력 50(원문). 패턴 src/battle/sakura5-patterns.js. 피해 13·돈 45 는 미지정(잠정, 다오·배찌 12/40 다음 구간). 말풍선 대사는 미지정이라 비움(“...”), 잡담은 나레이션체.
  domijorim: {
    name: '도미조림', hp: 48, damage: 13, money: 45, voice: 'domijorim', boss: true,   // hp 48(BUILD281 사용자)   // 보스전: 승리음(won) 없음(사용자 “보스전에서는 승리음 안 떠야”)
    sheet: { src: 'assets/enemies/domijorim-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 4, px: 1 },   // 전투 대기 4프레임(숨쉬기·불꽃, gpt-image 2×2 → 160 셀) — 사용자 “전투 모션으로 두라고, 정적인 이미지 흔들거리지 말고” → 정지 그림+sway 폐기
    pivot: [80, 156], scale: 0.7, dx: -60, dy: 10, idle: { swayX: 0, swayY: 0 },   // scale 0.9 → 0.7(BUILD281 사용자 “전투 스프라이트 비율 더 축소”). 둘이 겹치지 않게: 도미조림은 왼쪽 위(둘일 때 발 130 — 상자 위 139 안 닿음), 도현은 오른쪽(발 236)
    patterns: [{ type: 'skate_boomerang' }, { type: 'torch_pillars' }, { type: 'ak_torch' }],   // ak_torch: 횃불이랑 AK(BUILD281)
    lines: { appear: '* 도미조림이 얼린 홍어를 뽑아 들었다!', idle: ['* 도미조림이 홍어를 흔든다.', '* 횃불 냄새가 난다.', '* 홍어에서 서리가 떨어진다.', '* 도미조림이 꼬리를 고쳐 잡는다.'], speak: ['흐미!!', '내꺼랑께요'], die: '* 도미조림이 쓰러졌다.' },
  },
  dohyun: {
    name: '도현', hp: 48, damage: 13, money: 45, voice: 'dohyun', boss: true,   // hp 48(BUILD281 사용자)
    sheet: { src: 'assets/enemies/dohyun-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 3, px: 1 },   // 전투 대기 4프레임 = 양옆으로 살랑살랑 춤(왼쪽 기울기·정면·오른쪽 기울기·정면, gpt-image 2×2 → 160 셀). sway 로 흔들던 정지 그림은 폐기
    pivot: [80, 156], scale: 0.72, dx: 24, dy: 0, idle: { swayX: 0, swayY: 0 },   // scale 0.72 = 0.9 × 0.8(사용자 “비율 키 20퍼 줄여라”). dx 24: 160 셀 시트가 화면 오른쪽(480) 안에
    projectiles: { dohyun: 'assets/enemies/dohyun-battle.png' },
    patterns: [{ type: 'dohyun_drift' }, { type: 'kakao_burst' }],
    lines: { appear: '* 도현이 한 손을 들고 살랑살랑 다가왔다.', idle: ['* 도현이 양옆으로 살랑살랑 춤춘다.', '* 도현이 눈치를 본다.', '* 도현이 휴대폰을 만지작거린다.', '* 도현이 하품을 한다.'], speak: ['훗..', '악역을 자처하시겠다.', '인면견보단 제가 낫죠', '용준이 어딨지?'], die: '* 도현이 쓰러졌다.' },   // 공격 대사 둘 추가(BUILD281 사용자 원문)
  },
  munkorita: {
    name: '문코리타', hp: 16, damage: 9, money: 18, voice: 'cat',
    sheet: { src: 'assets/enemies/munkorita-idle.png', cols: 2, rows: 2, count: 4, fps: 4, px: 1 },
    pivot: [64, 118], scale: 1.3, idle: { swayX: 0, swayY: 0, period: 2 },
    projectiles: { face: 'assets/enemies/munkorita-idle.png' },
    patterns: [{ type: 'munkorita_vine' }, { type: 'munkorita_shout' }],
    lines: { appear: '* 문코리타가 나타났다!', idle: ['* 문코리타가 활짝 웃고 있다.', '* 문코리타의 깃털이 흔들린다.'], speak: ['훠훠', '사람이뭔줘다'], die: '* 문코리타가 쓰러졌다.' },
  },
  seopnyang: {
    name: '섭냥이', hp: 27, damage: 16, money: 90,
    sheet: { src: 'assets/enemies/seopnyang_idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 180, px: 1 },
    pivot: [32, 60], scale: 1.4, idle: { swayX: 0, swayY: 0, period: 2.4 },
    patterns: [
      { type: 'cat_knead', duration: 4.8, waves: 5, every: 0.82, warn: 0.6, r: 22, hit: 0.24 },
      { type: 'cat_reach', duration: 4.8, waves: 3, every: 1.35, warn: 0.6, reach: 0.72, extend: 0.5, hold: 0.12, retract: 0.4 },
      { type: 'cat_whiskers', duration: 4.8, waves: 2, every: 2, warn: 0.45, speed: 76 },
    ],
    lines: { appear: '* 섭냥이가 앞발을 가지런히 모았다.',
      idle: ['* 섭냥이가 허공에 꾹꾹이를 한다.', '* 섭냥이의 수염이 바짝 섰다.', '* 섭냥이가 자기 발을 보고 뿌듯해한다.'],
      speak: ['여기 내 자리다냥.', '꾹꾹 해주겠다냥.', '수염은 건드리지 마냥.'], die: '* 섭냥이가 발을 털고 물러났다.' },
  },
  gyeongnyang: {
    name: '경냥이', hp: 30, damage: 17, money: 100,
    sheet: { src: 'assets/enemies/gyeongnyang_idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 180, px: 1 },
    pivot: [32, 60], scale: 1.4, idle: { swayX: 0, swayY: 0, period: 2.4 },
    patterns: [
      { type: 'cat_yarn', duration: 4.8, waves: 2, every: 2.05, warn: 0.55, speed: 78, trail: 0.62 },
      { type: 'cat_fish', duration: 4.8, waves: 3, every: 1.4, warn: 0.7, rope: 34, speed: 112 },
      { type: 'cat_tail', duration: 4.8, waves: 2, every: 2.1, warn: 0.7, sweep: 1.2, radius: 49 },
    ],
    lines: { appear: '* 경냥이가 실뭉치를 굴려 왔다.',
      idle: ['* 경냥이가 풀린 실 끝을 감춘다.', '* 경냥이가 생선 장난감을 흔든다.', '* 경냥이의 꼬리가 느긋하게 휘어진다.'],
      speak: ['이 실은 내 거다냥.', '한 번만 잡아 봐라냥.', '꼬리 조심하라냥.'], die: '* 경냥이가 장난감을 챙겨 물러났다.' },
  },
  mankatsuki_junhee: {
    name: '만카츠키 쥰희', hp: 144, voice: 'junhee', money: 500, damage: 16,
    boss: true, attackSfxVolume: 0.36,
    bgmDelay: 0.4,
    sheet: { src: 'assets/enemies/mankatsuki-idle.png', cols: 4, rows: 1, count: 4, fps: 5.5, px: 1 },
    actions: { attack: { src: 'assets/enemies/mankatsuki-attack.png', cols: 6, rows: 1, count: 6, fps: 8, px: 1 } },
    pivot: [64, 119], scale: 1.15, dx: 10, dy: -8, board: [240, 160],
    idle: { swayX: 0, swayY: 0, period: 2.4 },
    reactive: { maxSpeed: 1.4, afterimages: [{ hp: 0.7, count: 2 }, { hp: 0.5, count: 3 }, { hp: 0.2, count: 4 }], hitSfx: 'mankatsuki_hurt' },
    enragedAt: 0.5,
    projectiles: {
      shuriken: 'assets/projectiles/mankatsuki-shuriken.png',
      pig: 'assets/projectiles/mankatsuki-pig.png',
      pan: 'assets/projectiles/mankatsuki-pan.png',
      taco: 'assets/projectiles/mankatsuki-taco.png',
      foodTaco: 'assets/projectiles/mankatsuki-food-taco.png',
      motorcycle: 'assets/projectiles/mankatsuki-motorcycle.png',
      underpants: 'assets/projectiles/mankatsuki-underpants.png',
    },
    patterns: [
      { type: 'mankatsuki_teleport', duration: 6.2, waves: 7, every: 0.66, warn: 0.34, bursts: 2, burstGap: 0.12 },
      { type: 'mankatsuki_underpants', duration: 6.8, waves: 7, every: 0.65, warn: 0.6, speed: 126, safeColumns: 2 },
      { type: 'mankatsuki_food_taco', duration: 6.6, waves: 8, every: 0.6, warn: 0.7, flight: 0.65, chipSpeed: 78, alternateArc: true },
      { type: 'mankatsuki_motorcycle', duration: 6.6, waves: 8, every: 0.62, warn: 0.75, speed: 280, laneOffsets: [0, 26, 0, -26] },
      { type: 'mankatsuki_stampede', duration: 7, safeSize: 58, every: 3.2, fall: 0.3, hit: 0.35, echoDelay: 0.55, echoWarn: 0.3 },
      { type: 'mankatsuki_pan', duration: 6, waves: 14, every: 0.26,
        positions: [0.14, 0.82, 0.4, 0.66, 0.06, 0.94] },
      { type: 'mankatsuki_stocks', duration: 6.2, waves: 14, every: 0.33, aim: true },
      { type: 'mankatsuki_taco', duration: 6.8, warn: 0.85, speed: 276, size: 42, r: 12,
        start: 0.2, count: 18, every: 0.24, inset: 22, recover: 0.24,
        edges: [[0, 0.2], [0.55, 0], [1, 0.65], [1, 0.2], [0.45, 1], [0, 0.65], [0.25, 0], [1, 0.45], [0.7, 1]] },
      { type: 'mankatsuki_clone_crossfire', duration: 7.2, clones: 2, waves: 4, every: 1.1, warn: 0.7, stagger: 0.18 },
    ],
    enragedPatterns: [
      { type: 'mankatsuki_underpants', duration: 6.8, waves: 9, every: 0.48, warn: 0.55, speed: 152, safeColumns: 1 },
      { type: 'mankatsuki_food_motorcycle', duration: 7.4, motorcycleAt: 0.65,
        food: { duration: 7.4, waves: 8, every: 0.64, warn: 0.7, flight: 0.65, chipSpeed: 78, alternateArc: true },
        motorcycle: { duration: 6.7, waves: 6, every: 0.85, warn: 0.8, speed: 280, laneOffsets: [0, 26, 0, -26] } },
      { type: 'mankatsuki_taco_pan', duration: 7.4, panAt: 0.65,
        taco: { duration: 7.4, warn: 0.85, speed: 276, count: 18, every: 0.27,
          edges: [[0, 0.2], [0.55, 0], [1, 0.65], [1, 0.2], [0.45, 1], [0, 0.65], [0.25, 0], [1, 0.45], [0.7, 1]] },
        pan: { duration: 6.7, waves: 6, every: 0.75, warn: 0.6, positions: [0.18, 0.82, 0.5] } },
      { type: 'mankatsuki_taco_stocks', duration: 7.4, stocksAt: 0.35,
        taco: { duration: 7.4, warn: 0.85, speed: 276, count: 18, every: 0.27,
          edges: [[0, 0.2], [0.55, 0], [1, 0.65], [1, 0.2], [0.45, 1], [0, 0.65], [0.25, 0], [1, 0.45], [0.7, 1]] },
        stocks: { duration: 6.7, waves: 6, every: 0.9, warn: 0.75, aim: true } },
      { type: 'mankatsuki_teleport_taco', duration: 7.8, tacoAt: 1.1,
        teleport: { duration: 7.4, waves: 6, every: 0.95, warn: 0.55, bursts: 2, burstGap: 0.12 },
        taco: { duration: 6.6, warn: 0.85, speed: 276, count: 12, every: 0.35 } },
      { type: 'mankatsuki_clone_crossfire', duration: 7.4, clones: 3, waves: 4, every: 1.2, warn: 0.7, stagger: 0.18 },
    ],
    lines: {
      appear: '* 만카츠키 쥰희가 나타났다!',
      speakShuffle: true,
      idle: ['* 만카츠키 쥰희가 이쪽을 노려본다.'],
      speak: ['케케케', '너희 죽는다, 탈출 그거 꼭 하셔야겠습니까?', '아 형님 너네 다 죽이겠습니다.',
        '아 삼전사라고 삼전', '우욱 우욱 우욱 이거 빤쓰 아녀유?'],
      die: '* 만카츠키 쥰희가 쓰러졌다.',
    },
  },
  expelled_viewer: {
    boss: true,
    name: '악질맨', hp: 66, voice: 'expelled_viewer', money: 666, damage: 11,
    sheet: { src: 'assets/sprites/expelled-viewer-dance.png', cols: 2, rows: 4, count: 8, fps: 5, px: 1 },
    pivot: [48, 88], scale: 1.4, dx: 16, dy: 0, board: [216, 156], idle: { swayX: 0, swayY: 0, period: 2 },
    projectiles: {
      chicken: 'assets/battle/expelled-viewer-chicken.png', timeout: 'assets/battle/expelled-viewer-timeout.png',
      rock: 'assets/battle/expelled-viewer-rock.png', shard: 'assets/battle/expelled-viewer-shard.png',
    },
    patterns: [
      { type: 'viewer_eom', duration: 7.5, warn: 0.6, every: 0.95, size: 52, speed: 164 },
      { type: 'viewer_names', duration: 10.7, warn: 0.55, speed: 177.6, letterTime: 0.14 },
      { type: 'viewer_rock', duration: 6.6, flight: 0.7, fuse: 3 },
      { type: 'viewer_explain', duration: 6.8, warn: 0.4, speed: 108, waves: 7, every: 0.83 * 5 / 6 },
      { type: 'viewer_chicken', duration: 6.8, warn: 0.55, speed: 115, waves: 6, every: 0.88 },
      { type: 'viewer_breath', duration: 7.5, warn: 0.55, speed: 132, count: 8, letterTime: 0.78 / 7 },
      { type: 'viewer_timeout', duration: 7.8, warn: 0.65, speed: 103.2, life: 3.4, turn: 2.2 },
    ],
    lines: {
      appear: '* 악질맨이 양팔을 벌렸다.',
      idle: ['* 악질맨이 혼자 춤추고 있다.'],
      speakMosaic: { '노': 4 },
      speak: ['샬케랑왕코랑쥰희어디감?', '이고역어디감?onep어디감?', '행복맨어디감? 어라 행복맨이 누구지', '노',
        '엄준식엄준식엄준식엄준식', '형섭앜ㅋㅋ나는 니 순살ㅂㅈ가 좋더라 귀두키듴ㅋㅋㅋ', 'ㅍㅇㅋ한테 ㅍㄷ립해명좀해주시죠',
        '이이이이잉 기분좋다', '나는 악질 꿀잼 시청자~', '씹섭아 화장실 언제가ㅋㅋㅋ'],
      die: '* 악질맨의 춤이 멈췄다.',
    },
  },
  // 256px 셀 × 0.9 = 230px. 기본 발(396,176)에 dx/dy를 더해 그림 전체를 (233,8)~(463,238)에 둔다.
  baron: {
    boss: true,
    name: '바론', hp: 250, support: 'baron_cannon',
    sheet: { src: 'assets/enemies/baron-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 240, px: 1 },
    pivot: [128, 238], scale: 0.9, dx: -48, dy: 46, damage: 12, money: 300,
    idle: { swayX: 0, swayY: 0, period: 2.4 },
    patterns: [
      { type: 'baron_acid_spit', duration: 6.6, warn: 0.55, poolHold: 1.45, flight: 1.8, streams: 5, weave: 0.09, every: 0.82, volleys: 6 },
      { type: 'baron_tentacle_rake', duration: 6.8, warn: 0.55, hold: 1.65, segments: 17, reach: 1.04, bend: 14, every: 1.48, waves: 4 },
      { type: 'baron_spine_fault', duration: 6.6, warn: 0.55, hold: 1.6, columns: 9, drift: 22, every: 1.4, waves: 4 },
      { type: 'baron_maw_breath', duration: 6.8, warn: 0.6, hold: 2.15, rows: 7, spread: 10, every: 3.15, waves: 2 },
      { type: 'baron_tendril_cage', duration: 6.8, warn: 0.6, hold: 1.45, segments: 30, rotation: 1.35, gapAngle: 0.6, every: 2.15, waves: 3 },
      { type: 'baron_predatory_surge', duration: 6.9, warn: 0.55, hold: 1.65, segments: 15, reach: 1.02, bend: 12, poolHold: 1.1, flight: 1.7, streams: 4, weave: 0.06, columns: 9, drift: 18, rows: 7, spread: 9 },
    ],
    lines: {
      appear: '* 바론이 거대한 몸을 일으킨다!',
      idle: ['* 바론의 입에서 산성 방울이 떨어진다.', '* 바론의 촉수가 바닥을 훑는다.', '* 둥지 바닥이 낮게 울린다.'],
      speak: ['크르르르…', '크아아아!'],
      die: '* 바론이 쓰러졌다.',
    },
  },
  // PR #7 전투 이미지(64×64, 이미 왼쪽을 봄, 발 pivot 32,60) — docs/handoffs/combat-assets.md. 색상별 능력치 차이는 아직 없음(브리핑: CS 각 HP 6)
  cs_red: {
    name: '레드 CS', hp: 6,
    image: 'assets/enemies/cs-red-battle-left.png', pivot: [32, 60], scale: 1.4, damage: 8, money: 30, idle: { swayX: 8, swayY: 2, period: 2.6 },
    patterns: [                                                                    // 레드 = 방패 기사: 방패 벽 → 망치 내리찍기(예고선) → 방패 조준탄
      { type: 'shield_wall', duration: 4.6, rows: 3, speed: 70, every: 1.3, kind: 'red' },
      { type: 'hammer_slam', duration: 4.4, every: 1.1, warn: 0.55, speed: 250, kind: 'red' },
      { type: 'aimed', duration: 4.0, every: 0.6, speed: 115, r: 6, shape: 'shield', kind: 'red', spin: 3 },
    ],
    lines: { appear: '* 레드 CS 가 나타났다!', idle: ['* 억빠맨이 CS 막타를 노리고 있는 듯 하다..{w=0.3} (신경쓸 필욘 없다)', '* 레드 CS 가 방패를 닦고 있다.{w=0.3} 왜인지 뿌듯해 보인다.', '* 레드 CS 가 이쪽을 노려본다.{w=0.3} 눈이 마주쳐서 좀 민망하다.', '* 경섭이 허허 하고 웃었다.{w=0.3} (별 뜻은 없다)'], die: '* 레드 CS 가 쓰러졌다.',
      speak: ['막타는 내 거다.', '방패 좀 닦고 때릴게요.', '어 잠깐 잠깐, 아직 준비 안 됐는데.', '허허 우리도 월급은 받아야지.', '이거 진짜 무거운데요..'] },   // 적 턴 말풍선(1인칭, 델타룬식) — 다른 적 언급 금지
  },
  cs_blue: {
    name: '블루 CS', hp: 6,
    image: 'assets/enemies/cs-blue-battle-left.png', pivot: [32, 60], scale: 1.4, damage: 8, money: 30, idle: { swayX: 8, swayY: 2, period: 3.1 },
    patterns: [                                                                    // 블루 = 망치 기사: 던지는 망치 포물선 → 망치 내리찍기(예고선) → 위에서 쏟아지는 작은 망치
      { type: 'hammer_arc', duration: 4.4, every: 0.7, speed: 150, kind: 'blue' },
      { type: 'hammer_slam', duration: 4.4, every: 1.0, warn: 0.5, speed: 260, kind: 'blue' },
      { type: 'rain', duration: 4.2, rate: 0.3, speed: 110, r: 7, shape: 'hammer', kind: 'blue', spin: 6 },
    ],
    lines: { appear: '* 블루 CS 가 나타났다!', idle: ['* 억빠맨이 CS 막타를 노리고 있는 듯 하다..{w=0.3} (신경쓸 필욘 없다)', '* 블루 CS 가 망치를 만지작거린다.{w=0.3} 어디에 쓰는지는 모른다.', '* 요플래는 아무 생각이 없다.', '* 블루 CS 가 콧노래를 흥얼거린다.{w=0.3} 음정이 하나도 안 맞는다.'], die: '* 블루 CS 가 쓰러졌다.',
      speak: ['이 망치 어디에 쓰는 거지?', '흥얼흥얼~ 음 음~', '블루가 진짜 최고인 거 알지?', '이 게임 브금 좋네요.', '잠깐만요 신발끈 좀..'] },
  },
  // ── 청록숲6 정글 몹 (사용자 브리핑 2026-09-11: 칼날부리·늑대·두꺼비, 40/50/60원). 이미지 = PR #10(docs/handoffs/jungle-enemies-assets.md, 필드 48×48 pivot 24,44 / 전투 64×64 pivot 32,60). 소지품·성격이 탄: 칼날 깃털 / 발톱·도약 / 방울·혀 ──
  razorbeak: {
    name: '칼날부리', hp: 6,
    image: 'assets/enemies/jungle-raptor-battle-left.png', pivot: [32, 60], scale: 1.4, damage: 10, money: 40, idle: { swayX: 6, swayY: 3, period: 2.2 },
    patterns: [                                                                    // 난이도 상향(2026-09-11): 빠르고 촘촘하게 + 두 패턴 동시(combo)
      { type: 'sweep', duration: 4.8, rows: 4, gap: 24, speed: 135, r: 5, every: 0.7, shape: 'feather', kind: 'white' },                       // 깃털 칼날 4줄, 한 줄만 비어 있다
      { type: 'combo', parts: [{ type: 'aimed', duration: 4.6, every: 0.38, speed: 175, r: 5, shape: 'feather', kind: 'white', spin: 7 }, { type: 'rain', duration: 4.6, rate: 0.28, speed: 130, r: 5, shape: 'feather', kind: 'white', spin: 4 }] },   // 조준 깃털 + 깃털 비
      { type: 'combo', parts: [{ type: 'sweep', duration: 4.6, rows: 3, gap: 26, speed: 120, r: 5, every: 0.9, shape: 'feather', kind: 'white' }, { type: 'slam', duration: 4.6, every: 0.9, warn: 0.4, speed: 330, from: 'updown', r: 6, shape: 'feather', kind: 'white' }] },   // 줄 + 위아래 급강하
    ],
    lines: { appear: '* 칼날부리가 나타났다!', idle: ['* 칼날부리가 부리를 갈고 있다.{w=0.3} 소름 돋는 소리다.', '* 칼날부리가 고개를 갸웃한다.', '* 억빠맨은 새를 무서워하는 것 같다.', '* 요플래는 치킨이 먹고 싶어졌다.'], die: '* 칼날부리가 쓰러졌다.',
      speak: ['꾸엑!', '부리 갈아 놨다.', '눈 감아라.', '깃털 값은 따로 받는다.'] },
  },
  wolf: {
    name: '늑대', hp: 7,
    image: 'assets/enemies/jungle-wolf-battle-left.png', pivot: [32, 60], scale: 1.4, damage: 12, money: 50, idle: { swayX: 9, swayY: 1, period: 1.9 },
    patterns: [                                                                    // 난이도 상향: 좌우 번갈아 도약 + 발톱 줄 동시, 튕기는 발톱 4개
      { type: 'combo', parts: [{ type: 'sweep', duration: 4.8, rows: 4, gap: 22, speed: 150, r: 5, every: 0.75, shape: 'claw', kind: 'white' }, { type: 'slam', duration: 4.8, every: 0.8, warn: 0.35, speed: 360, from: 'sides', shape: 'fang', kind: 'white' }] },   // 할큄 줄 + 좌우 도약
      { type: 'combo', parts: [{ type: 'bounce', duration: 4.8, count: 4, speed: 140, r: 6, shape: 'claw', kind: 'white', spin: 6 }, { type: 'aimed', duration: 4.8, every: 0.6, speed: 190, r: 5, shape: 'fang', kind: 'white' }] },   // 튕기는 발톱 + 송곳니 조준
      { type: 'slam', duration: 4.6, every: 0.55, warn: 0.35, speed: 380, from: 'sides', shape: 'fang', kind: 'white' },                                                            // 연속 도약(예고 0.35s)
    ],
    lines: { appear: '* 늑대가 나타났다!', idle: ['* 늑대가 으르렁거린다.', '* 늑대가 꼬리를 흔든다.{w=0.3} 반가운 건 아닌 것 같다.', '* 경섭이 개인 줄 알고 손을 내밀었다.', '* 억빠맨이 늑대를 보며 침을 삼켰다.{w=0.3} 왜?'], die: '* 늑대가 쓰러졌다.',
      speak: ['아우우우—', '간식 시간이다.', '킁킁..{w=0.3} 바나나 냄새?', '도망치면 더 재밌는데.'] },
  },
  toad: {
    name: '두꺼비', hp: 8,
    image: 'assets/enemies/jungle-gromp-battle-left.png', pivot: [32, 60], scale: 1.4, damage: 14, money: 60, idle: { swayX: 3, swayY: 4, period: 3.4 },
    patterns: [                                                                    // 난이도 상향: 방울 5개 + 혀 동시, 방울 비 촘촘
      { type: 'combo', parts: [{ type: 'bounce', duration: 5.0, count: 5, speed: 125, r: 8, shape: 'bubble', kind: 'blue' }, { type: 'slam', duration: 5.0, every: 1.0, warn: 0.45, speed: 300, from: 'bottom', shape: 'tongue', kind: 'red' }] },   // 튕기는 방울 5 + 아래서 혀
      { type: 'combo', parts: [{ type: 'rain', duration: 4.8, rate: 0.13, speed: 115, r: 7, shape: 'bubble', kind: 'blue' }, { type: 'aimed', duration: 4.8, every: 0.7, speed: 150, r: 8, shape: 'bubble', kind: 'blue' }] },   // 방울 비 + 조준 방울
      { type: 'slam', duration: 4.6, every: 0.6, warn: 0.4, speed: 320, from: 'updown', r: 7, shape: 'tongue', kind: 'red' },                                                       // 위아래 번갈아 혀
    ],
    lines: { appear: '* 두꺼비가 나타났다!', idle: ['* 두꺼비가 숨을 크게 들이쉰다.', '* 두꺼비 등에 사마귀가 많다.{w=0.3} 세다가 포기했다.', '* 요플래는 두꺼비를 만지고 싶어졌다.', '* 경섭이 허허 하고 웃었다.{w=0.3} (별 뜻은 없다)'], die: '* 두꺼비가 쓰러졌다.',
      speak: ['개굴.', '.........', '침 좀 튀길게.', '나 원래 안 움직여.'] },
  },
  // ── 청록숲8 정글 2 (사용자 2026-09-11: HP 9/10/11, 70/80/100원, 패턴 어렵게). 이미지 PR #14(docs/handoffs/krug-scuttle-cannon-sprites.md): 전투는 64×64 셀 2×2 대기 4프레임(180ms), pivot 32,60 / 필드 정면 48×48
  krug: {
    name: '돌거북', hp: 9,
    sheet: { src: 'assets/enemies/jungle-krug-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 180, px: 1 }, pivot: [32, 60], scale: 1.4, damage: 12, money: 70, idle: { swayX: 0, swayY: 0, period: 3.6 },
    patterns: [                                                                    // 돌·등껍질: 영역 예고(내리찍기) / 거대 바위 / 튕기는 바위 / 위아래 바위 + 조준 — 시트에 대기 모션이 있어 흔들림(sway)은 0 (사용자 2026-09-11)
      { type: 'zone', cols: 3, rows: 2, count: 3, warn: 0.9, hit: 0.3, every: 1.5, duration: 5.0 },                                                                                        // 바닥 내리찍기: 빨간 칸 예고 → 그 자리에 돌 폭발. 빈 칸으로
      { type: 'giant', from: 'sides', r: 34, speed: 150, warn: 0.8, every: 2.1, shape: 'rock', kind: 'white', spin: 3, duration: 5.0 },                                                       // 거대 바위가 옆에서 굴러온다(띠 예고). 띠 밖으로
      { type: 'combo', parts: [{ type: 'bounce', duration: 5.0, count: 5, speed: 130, r: 9, shape: 'rock', kind: 'white', spin: 2 }, { type: 'sweep', duration: 5.0, rows: 3, gap: 28, speed: 125, r: 5, every: 0.9, shape: 'rock', kind: 'white' }] },   // 튕기는 큰 바위 5 + 자갈 줄
      { type: 'combo', parts: [{ type: 'slam', duration: 4.8, every: 0.55, warn: 0.35, speed: 360, from: 'updown', r: 8, shape: 'rock', kind: 'white' }, { type: 'aimed', duration: 4.8, every: 0.8, speed: 160, r: 9, shape: 'rock', kind: 'white', spin: 5 }] },   // 위아래 바위 + 조준 등껍질
    ],
    lines: { appear: '* 돌거북이 나타났다!', idle: ['* 돌거북이 등껍질 속으로 들어갔다.{w=0.3} 나올 생각이 없어 보인다.', '* 돌거북 등에 이끼가 끼어 있다.', '* 요플래가 돌거북을 두드려 봤다.{w=0.3} 돌 소리가 난다.', '* 억빠맨은 거북이가 느린 줄 알았다.'], die: '* 돌거북이 부서졌다.',
      speak: ['...쿵.', '천천히 가자.', '등껍질은 안 판다.', '돌 맞아 봤어?'] },
  },
  scuttle: {
    name: '바위게', hp: 10,
    sheet: { src: 'assets/enemies/jungle-scuttle-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 180, px: 1 }, pivot: [32, 60], scale: 1.4, damage: 13, money: 80, idle: { swayX: 0, swayY: 0, period: 1.4 },
    patterns: [                                                                    // 옆으로 잽싸게: 빔(집게 궤적) / 따라오는 물방울 / 좌우 집게 돌진 + 물방울 비 / 집게 줄 5 + 조준 방울 — sway 0(시트 대기 모션)
      { type: 'beam', dir: 'h', count: 2, thick: 26, warn: 0.7, hit: 0.25, every: 1.3, duration: 4.8 },                                                                                      // 옆으로 긋는 집게 궤적: 가는 선 예고 → 굵은 빔. 빔 사이로
      { type: 'homing', count: 2, speed: 95, turn: 2.4, life: 2.6, every: 1.6, r: 6, shape: 'bubble', kind: 'blue', duration: 4.8 },                                                          // 따라오는 물방울 — 계속 움직여 따돌린다
      { type: 'combo', parts: [{ type: 'slam', duration: 4.8, every: 0.5, warn: 0.3, speed: 400, from: 'sides', r: 7, shape: 'pincer', kind: 'white' }, { type: 'rain', duration: 4.8, rate: 0.22, speed: 110, r: 6, shape: 'bubble', kind: 'blue' }] },   // 좌우 집게 돌진(예고 0.3) + 물방울 비
      { type: 'combo', parts: [{ type: 'sweep', duration: 4.8, rows: 5, gap: 20, speed: 165, r: 5, every: 0.65, shape: 'pincer', kind: 'white' }, { type: 'aimed', duration: 4.8, every: 0.55, speed: 200, r: 6, shape: 'bubble', kind: 'blue' }] },   // 집게 줄 5(한 줄만 빔) + 조준 방울
    ],
    lines: { appear: '* 바위게가 나타났다!', idle: ['* 바위게가 옆으로 잽싸게 움직인다.', '* 바위게가 집게를 딱딱거린다.', '* 경섭이 게장이 먹고 싶다고 했다.', '* 요플래는 게가 왜 옆으로만 걷는지 궁금해졌다.'], die: '* 바위게가 뒤집혔다.',
      speak: ['딱딱딱.', '옆으로만 갈 수 있어.', '잡으면 시야 줄게.', '거품 좀 물게.'] },
  },
  cannon: {
    name: '대포미니언', hp: 11,
    sheet: { src: 'assets/enemies/jungle-cannon-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 180, px: 1 }, pivot: [32, 60], scale: 1.4, damage: 14, money: 100, idle: { swayX: 0, swayY: 0, period: 2.6 },
    patterns: [                                                                    // 대포: 포탄 낙하(파편) / 광역 포격(한 칸만 안전) / 산탄 / 조준 포탄 + 불티 — sway 0(시트 대기 모션)
      { type: 'bomb', every: 1.3, warn: 0.7, frags: 8, fragSpeed: 130, r: 9, shape: 'cannonball', fragKind: 'orange', duration: 5.0 },                                                       // 포탄 낙하(고리 예고) → 파편 8. 고리에서 멀리
      { type: 'zone', cols: 3, rows: 2, safe: 1, warn: 1.0, hit: 0.35, every: 1.9, duration: 5.2 },                                                                                         // 광역 포격: 한 칸만 안전. 그 칸으로
      { type: 'burst', at: 'top', n: 14, speed: 120, every: 0.9, r: 5, shape: 'cannonball', kind: 'white', duration: 4.6 },                                                                // 산탄(작은 포탄 14발 방사형) — 틈으로
      { type: 'combo', parts: [{ type: 'aimed', duration: 5.0, every: 0.5, speed: 210, r: 10, shape: 'cannonball', kind: 'white' }, { type: 'rain', duration: 5.0, rate: 0.16, speed: 150, r: 4, shape: 'circle', kind: 'orange' }] },   // 조준 포탄 + 불티 비
    ],
    lines: { appear: '* 대포미니언이 나타났다!', idle: ['* 대포미니언이 대포를 재장전한다.', '* 대포미니언은 여기가 정글인 줄 모르는 것 같다.', '* 억빠맨이 귀를 막았다.', '* 요플래는 미니언을 마지막으로 잡아 본 게 언제인지 떠올렸다.'], die: '* 대포미니언이 폭발했다.',
      speak: ['장전 완료.', '라인이 어디죠?', '펑.', '포탑 어디 갔어.'] },
  },
  // ── 청록숲9 사원 문지기 보스 레드·블루 (사용자 2026-09-11: HP 22 씩, 꽤 어렵게, 대사 다채롭게). 둘이 한 전투 — 턴마다 각자 패턴이 동시에 온다.
  //    이미지 PR #16(docs/handoffs/red-blue-buff-sprites.md): 전투 대기 192×192 시트(96×96 셀 2×2, 220ms, 발 pivot 48,89) / 필드 정면 64×64(pivot 32,60). 롤 레드 브램블백·블루 센티넬 모티브
  //    크기 규칙(2026-09-11 포스트모텀): 전투 그림은 화면 480×360 안, 패널 윗선(y 246) 위에 **전부** 들어와야 한다 — 둘이면 각 ≤ 144px(1.5배), 발 144/246 에 가로 40px 엇갈림. tests/playtest/enemy.mjs 가 잰다
  red: {
    boss: true,
    name: '레드', hp: 20, voice: 'red',
    sheet: { src: 'assets/enemies/red-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 220, px: 1 }, pivot: [48, 89], scale: 1.5, dx: 10, dy: 24, damage: 13, money: 150, idle: { swayX: 0, swayY: 0, period: 2.4 },
    patterns: [                                                                    // 방패 기사 = 신성한 영역: 한 칸만 안전 / 십자 성광 / 방패 벽 + 조준 방패 / 거대 방패 + 붉은 비
      { type: 'zone', cols: 3, rows: 2, safe: 1, warn: 1.0, hit: 0.35, every: 1.9, duration: 5.2 },                                                                                         // (2026-09-11 약 10% 완화: 예고 +0.1, 간격·속도 10%)
      { type: 'beam', dir: 'both', count: 1, thick: 26, warn: 0.85, hit: 0.3, every: 1.65, duration: 5.0 },
      { type: 'combo', parts: [{ type: 'shield_wall', duration: 5.0, rows: 4, speed: 86, every: 1.2, kind: 'red' }, { type: 'aimed', duration: 5.0, every: 0.8, speed: 153, r: 7, shape: 'shield', kind: 'red' }] },
      { type: 'combo', parts: [{ type: 'giant', duration: 5.0, from: 'sides', r: 30, speed: 145, warn: 0.9, every: 2.2, kind: 'red' }, { type: 'rain', duration: 5.0, rate: 0.34, speed: 100, r: 4, kind: 'red' }] },
    ],
    lines: { appear: '* 레드가 시험을 시작한다!',
      idle: ['* 레드가 방패를 고쳐 잡는다.', '* 레드의 눈이 붉게 깜빡인다.{w=0.3} 사이렌 소리가 아직 귀에 남아 있다.', '* 억빠맨은 레드가 말을 한다는 게 아직도 안 믿긴다.', '* 요플래는 오브젝트가 대체 뭔지 궁금해졌다.', '* 경섭이 허허 하고 웃었다.{w=0.3} 긴장한 것 같다.', '* 레드가 "침입자" 라고 작게 중얼거린다.'],
      die: '* 레드가 무릎을 꿇었다.{w=0.3} 시험 종료.',
      speak: ['시험 시작.', '침입자 확인.', '신성한 영역이다.', '통과 불가.', '제거하라.', '방패는 뚫리지 않는다.', '경고는 끝났다.', '오브젝트를 지켜라.', '판정. 판정. 판정.', '물러나라.'] },
  },
  blue: {
    boss: true,
    name: '블루', hp: 20, voice: 'blue',
    sheet: { src: 'assets/enemies/blue-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 220, px: 1 }, pivot: [48, 89], scale: 1.5, dx: -30, dy: 10, damage: 13, money: 150, idle: { swayX: 0, swayY: 0, period: 3.0 },
    patterns: [                                                                    // 망치 기사: 망치 낙하(파편) / 위아래 망치 + 방사형 망치 / 포물선 망치 + 따라오는 망치 / 내리찍기 자리 4곳
      { type: 'bomb', every: 1.35, warn: 0.8, frags: 8, fragSpeed: 126, r: 8, shape: 'hammer', fragKind: 'blue', duration: 5.0 },                                                        // (2026-09-11 약 10% 완화)
      { type: 'combo', parts: [{ type: 'slam', duration: 5.0, every: 0.56, warn: 0.4, speed: 345, from: 'updown', shape: 'hammer', rot: Math.PI }, { type: 'burst', duration: 5.0, at: 'random', n: 8, speed: 108, every: 1.2, r: 6, shape: 'hammer', kind: 'blue', spin: 8 }] },
      { type: 'combo', parts: [{ type: 'hammer_arc', duration: 5.0, every: 0.62, speed: 150 }, { type: 'homing', duration: 5.0, count: 1, speed: 90, turn: 2.4, life: 2.4, every: 1.65, r: 6, shape: 'hammer', kind: 'blue', spin: 6 }] },
      { type: 'zone', cols: 4, rows: 2, count: 3, warn: 0.9, hit: 0.3, every: 1.45, duration: 5.0 },
    ],
    lines: { appear: '* 블루도.',
      idle: ['* 블루가 망치를 어깨에 걸쳤다.', '* 블루는 말을 아낀다.{w=0.3} 아니면 못 하는 걸지도.', '* 억빠맨은 블루가 따라 하는 게 웃긴 모양이다.', '* 요플래는 블루의 망치가 몇 kg 인지 궁금해졌다.', '* 블루가 "...하라." 하고 혼자 중얼거렸다.', '* 블루의 눈이 파랗게 깜빡인다.'],
      die: '* 블루가 쓰러졌다.{w=0.3} ...졌다.',
      speak: ['...없다.', '하라.', '영역.', '시험.', '쿵.', '망치 간다.', '한다.', '제거.', '...따라 하는 거 아니다.', '침입자.'] },
  },
};
