import { BATTLE_PREVIEW, BATTLE_SPRITES } from './battle-sprites.js';

const deckFist = (character, faces) => ({
  src: `assets/sprites/${character}-deck-fist.png`, scale: 0.5, faces,
  colorKey: { rMin: 256, gMax: -1, bMin: 256 },
  frames: [0.22, 0.3, 0.38, 1].map((duration, cell) => ({ rect: [cell * 128, 0, 128, 128], pivot: [64, 120], duration })),
});

export const CHARACTER_MOTIONS = {
  gyeongsub: { deck_fist: deckFist('gyeongsub', 'right') },
  ppaman: { deck_fist: deckFist('ppaman', 'right') },
  // 도미조림·도현(BUILD272 벚꽃 숲 5 공터): gpt-image 2×2 자세 그리드(assets/source/sakura5-v1/*-heumi|leap|wave-raw.png, 참조 = 걷기 시트) → poses_export.py 로 128 칸 4프레임 띠(발 [64,120], 걷기 정면 키에 맞춘 공통 배율).
  //   heumi: 웅크림 → 두 팔 번쩍 들고 “흐미!!” 외침(점프 정점) → 외침 유지 → 내려놓음. leap: 웅크림 → 공중(홍어 뽑음) → 착지(횃불) → 전투 자세(홍어·횃불) — 전투 진입 전 양옆으로 뛰는 hop 과 parallel.
  //   ready: leap 의 마지막 칸을 정지 자세로 반복(착지 뒤 전투 시작까지 서 있음). wave: 손 들어 인사(“안녕하세요 형들”).
  domijorim: {
    heumi: { src: 'assets/sprites/domijorim-heumi.png', scale: 0.5, colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: [[0, 0.12], [1, 0.32], [2, 0.7], [3, 0.22]].map(([cell, duration]) => ({ rect: [cell * 128, 0, 128, 128], pivot: [64, 120], duration })) },
    leap: { src: 'assets/sprites/domijorim-leap.png', scale: 0.5, colorKey: { rMin: 256, gMax: -1, bMin: 256 },   // 칸 160×144(홍어를 옆·위로 뻗는 칸이 128 을 넘는다), 발 = 칸 아래 8px
      frames: [[0, 0.18], [1, 0.62], [2, 0.2], [3, 0.6]].map(([cell, duration]) => ({ rect: [cell * 160, 0, 160, 144], pivot: [80, 136], duration })) },
    ready: { src: 'assets/sprites/domijorim-leap.png', scale: 0.5, colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: [{ rect: [3 * 160, 0, 160, 144], pivot: [80, 136], duration: 1 }] },
  },
  dohyun: {
    wave: { src: 'assets/sprites/dohyun-wave.png', scale: 0.5, colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: [[0, 0.15], [1, 0.35], [2, 0.4], [3, 0.5]].map(([cell, duration]) => ({ rect: [cell * 128, 0, 128, 128], pivot: [64, 120], duration })) },
    hello: { src: 'assets/sprites/dohyun-wave.png', scale: 0.5, colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: [{ rect: [3 * 128, 0, 128, 128], pivot: [64, 120], duration: 1 }] },
    leap: { src: 'assets/sprites/dohyun-leap.png', scale: 0.5, colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: [[0, 0.18], [1, 0.62], [2, 0.2], [3, 0.6]].map(([cell, duration]) => ({ rect: [cell * 128, 0, 128, 128], pivot: [64, 120], duration })) },
    ready: { src: 'assets/sprites/dohyun-leap.png', scale: 0.5, colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: [{ rect: [3 * 128, 0, 128, 128], pivot: [64, 120], duration: 1 }] },
  },
  // 가면 쓴 최미스(BUILD277 벚꽃 숲 6): 가면 걷기 시트(assets/sprites/choimis-masked-walk.png, 발 [64,120])와 같은 규격의 자세 띠 — gpt-image-2.5-sunburst(assets/source/sakura6-v1, 참조 = 가면 정면 한 장) 를 색키·축소해 128 칸에 넣었다.
  //   pick: 허리 굽혀 꽃 따기 0.55초 → 꽃 들어 보기 0.5초(광장 꽃 무더기 옆에서). seup: 코(가면) 비비기 1.4초 → 손가락 총 1.3초(= 스읍 미스 음성 2.7초, 최미스 seup 과 같은 박자)
  choimis_masked: {
    pick: { src: 'assets/sprites/choimis-masked-pick.png', scale: 0.5, colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: [{ rect: [0, 0, 128, 128], pivot: [64, 120], duration: 0.55 }, { rect: [128, 0, 128, 128], pivot: [64, 120], duration: 0.5 }] },
    seup: { src: 'assets/sprites/choimis-masked-seup.png', scale: 0.5, colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: [{ rect: [0, 0, 128, 128], pivot: [64, 120], duration: 1.4 }, { rect: [128, 0, 128, 128], pivot: [64, 120], duration: 1.3 }] },
  },
  // 최미스(BUILD257 빛 드는 공터): 걷기 시트(128 셀, 발 [64,120])와 같은 규격의 자세 그림 — gpt-image-2.5-sunburst(assets/source/choimis-poses-v1, 참조 = 걷기 시트 미리보기) 를 색키·축소해 128 칸에 넣었다.
  //   masked: 디스코드 로고(simple-icons, 블러플)를 정면 0번 얼굴에 가면처럼 씌운 한 장. wink: 눈 뜬 정면 0번 ↔ 윙크. seup: 코 비비기 1.4초 → 손가락 총 1.3초(= 스읍 미스 음성 2.7초)
  choimis: {
    // 이미 투명 PNG 라 colorKey 는 ‘없음’(rMin 256) — 로더가 colorKey 없이는 죽는다(QA 진입 실패 TypeError rMin)
    masked: { src: 'assets/sprites/choimis-masked.png', scale: 0.5, colorKey: { rMin: 256, gMax: -1, bMin: 256 }, frames: [{ rect: [0, 0, 128, 128], pivot: [64, 120], duration: 1 }] },
    facepalm: { src: 'assets/sprites/choimis-facepalm.png', scale: 0.5, colorKey: { rMin: 256, gMax: -1, bMin: 256 }, frames: [{ rect: [0, 0, 128, 128], pivot: [64, 120], duration: 1 }] },
    wink: { src: 'assets/sprites/choimis-wink.png', scale: 0.5, colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: [[1, 0.4], [0, 0.14], [1, 0.5], [0, 0.14], [1, 0.7]].map(([cell, duration]) => ({ rect: [cell * 128, 0, 128, 128], pivot: [64, 120], duration })) },
    seup: { src: 'assets/sprites/choimis-seup.png', scale: 0.5, colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: [{ rect: [0, 0, 128, 128], pivot: [64, 120], duration: 1.4 }, { rect: [128, 0, 128, 128], pivot: [64, 120], duration: 1.3 }] },
  },
  // 청소부 영웅(깃발) 필드 웃음(BUILD254): 전투 웃음 그림(assets/battle/janitor-hero-laugh 192) 그대로. 배율은 characters.js janitor_hero.stillScale 과 같게(요플래 약 2배). 오른쪽을 본다.
  //   대기는 동작 없이 정지 그림(stand) — 깃발 흔드는 idle 시트는 전투 스프라이트(사용자 2026-09-20 “이건 전투스프라이트야”)
  janitor_hero: {
    laugh: {
      src: 'assets/battle/janitor-hero-laugh.png', scale: 128 / (192 * 1.43), faces: 'right',
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: [{ rect: [0, 0, 192, 192], pivot: [138, 180], duration: 1.2 }],
    },
  },
  drum_devil: {
    throw: {
      src: 'assets/enemies/drum-devil-attack.png',
      scale: 220 / (232 * 1.43), faces: 'left',
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: [1, 2].map(index => ({ rect: [(index % 2) * 384, Math.floor(index / 2) * 384, 384, 384], pivot: [216, 320], duration: 0.6 })),
    },
    roar: {
      src: 'assets/enemies/drum-devil-idle.png',
      scale: 220 / (232 * 1.43),
      faces: 'left',
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: [0, 2, 2, 0].map((index, beat) => ({
        rect: [(index % 2) * 384 + 74, Math.floor(index / 2) * 384 + 94, 272, 232],
        pivot: [142, 226], duration: [0.2, 0.3, 0.65, 0.2][beat],
      })),
    },
  },
  park_guardian_costume: {
    bow: {
      src: 'assets/sprites/park-guardian-bow.png',
      scale: 27 / 60,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 8 }, (_, i) => ({ rect: [(i % 2) * 128, Math.floor(i / 2) * 128, 128, 128], pivot: [64, 119], duration: 0.18 })),
    },
  },
  warm_bidet: {
    axe_strike: {
      src: 'assets/sprites/warm-bidet-axe-strike.png',
      scale: 0.96,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 4 }, (_, i) => ({ rect: [(i % 2) * 128, Math.floor(i / 2) * 128, 128, 128], pivot: [64, 119], duration: [0.22, 0.18, 0.38, 0.24][i] })),
    },
  },
  ttuulla: {
    burrow: {
      src: 'assets/sprites/ttuulla-burrow.png',
      scale: 26.5 / 75,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 4 }, (_, i) => ({ rect: [(i % 2) * 128, Math.floor(i / 2) * 128, 128, 128], pivot: [64, 119], duration: [0.24, 0.2, 0.2, 0.22][i] })),
    },
  },
  hyungsub: {
    deck_fist: deckFist('hyungsub', 'left'),
    battle_ready: {
      src: BATTLE_SPRITES.hyungsub.src, scale: 0.13, faces: 'right',
      colorKey: BATTLE_PREVIEW.colorKey, frames: [BATTLE_SPRITES.hyungsub.idle[0]],
    },
    attack: {
      src: BATTLE_SPRITES.hyungsub.src,
      scale: 0.13,
      colorKey: BATTLE_PREVIEW.colorKey,
      frames: BATTLE_SPRITES.hyungsub.attack,
    },
    // 러너 기믹(BUILD230~233, assets/source/runner-v1 gpt-image 5장, 완전 옆모습·델타룬 비율): 준비(땅 짚고 검 뽑기)·달리기·점프(4번째 = 착지 웅크림)·베기·공중 내려치기. runner.js 가 프레임 번호를 직접 고른다(duration 은 형식용).
    // pivot 은 프레임마다 [남색(머리·바지) 가운데, 발 밑변](runner-contract.json), scale 은 달리기 프레임을 44px(걷기 52px 의 0.85)로
    // 러너 시트 9판(BUILD243, 사용자 “검 각 살짝만 위로, 오른손 손바닥·왼손 손등이 보이는 두 손 잡기”: 칼날 거의 수평·끝만 10° 위). 7판(BUILD241, 사용자 2026-09-19 “검이 너무 길어지고 고개를 숙이고 앞으로 달린다는 느낌이 덜 듦, 무게중심 앞으로, 눈이 너무 초롱초롱” + 크리스 달리기 참조): pivot = [흰 셔츠 가운데, 발 밑변], scale = 46px / 달리기 평균 키 — assets/source/runner-v1/runner-contract.json
    runner_prep: {
      src: 'assets/sprites/hyungsub-runner-prep.png',
      scale: 0.1453,
      faces: 'right',
      colorKey: { rMin: 150, gMax: 110, bMin: 150 },
      frames: [
        { rect: [0, 0, 512, 512], pivot: [262, 441], duration: 0.24 },
        { rect: [512, 0, 512, 512], pivot: [239, 441], duration: 0.26 },
        { rect: [0, 512, 512, 512], pivot: [221, 406], duration: 0.12 },
        { rect: [512, 512, 512, 512], pivot: [241, 415], duration: 0.1 },
      ],
    },
    runner_run: {
      src: 'assets/sprites/hyungsub-runner-run.png',
      scale: 0.1453,
      faces: 'right',
      colorKey: { rMin: 150, gMax: 110, bMin: 150 },
      frames: [
        { rect: [0, 0, 512, 512], pivot: [267, 425], duration: 0.08 },
        { rect: [512, 0, 512, 512], pivot: [266, 430], duration: 0.08 },
        { rect: [0, 512, 512, 512], pivot: [264, 421], duration: 0.08 },
        { rect: [512, 512, 512, 512], pivot: [265, 427], duration: 0.08 },
      ],
    },
    runner_jump: {
      src: 'assets/sprites/hyungsub-runner-jump.png',
      scale: 0.1453,
      faces: 'right',
      colorKey: { rMin: 150, gMax: 110, bMin: 150 },
      frames: [
        { rect: [0, 0, 512, 512], pivot: [258, 420], duration: 0.08 },
        { rect: [512, 0, 512, 512], pivot: [242, 391], duration: 0.2 },
        { rect: [0, 512, 512, 512], pivot: [262, 370], duration: 0.2 },
        { rect: [512, 512, 512, 512], pivot: [236, 404], duration: 0.16 },
      ],
    },
    runner_slash: {
      src: 'assets/sprites/hyungsub-runner-slash.png',
      scale: 0.1453,
      faces: 'right',
      colorKey: { rMin: 150, gMax: 110, bMin: 150 },
      frames: [
        { rect: [0, 0, 512, 512], pivot: [245, 459], duration: 0.08 },
        { rect: [512, 0, 512, 512], pivot: [214, 459], duration: 0.08 },
        { rect: [0, 512, 512, 512], pivot: [261, 412], duration: 0.08 },
        { rect: [512, 512, 512, 512], pivot: [251, 412], duration: 0.08 },
      ],
    },
    // 올려베기(BUILD244 → BUILD287 11판, 사용자 “사선 위로 올려보내서 뒷대가리가 보이게 틀어서 치는 걸 원한다”): 허리를 뒤로 꼰 채 검을 엉덩이 뒤 아래(코일) → 사선 위로 올려 베며 고개가 같이 돌아감(뒤통수 3/4)
    //   → 마무리는 머리까지 돌아가 뒤통수·등만 보이고 검은 머리 위 앞 60° → 옆모습 복귀 (runner-upslash11). 기준점은 프레임마다 [신발 가운데 x, 발 밑변](발이 땅에 붙은 채 몸이 휘둘리게)
    runner_upslash: {
      src: 'assets/sprites/hyungsub-runner-upslash.png',
      scale: 0.1453,
      faces: 'right',
      colorKey: { rMin: 150, gMax: 110, bMin: 150 },
      frames: [
        { rect: [0, 0, 512, 512], pivot: [255, 430], duration: 0.08 },
        { rect: [512, 0, 512, 512], pivot: [193, 430], duration: 0.08 },
        { rect: [0, 512, 512, 512], pivot: [249, 432], duration: 0.08 },
        { rect: [512, 512, 512, 512], pivot: [264, 432], duration: 0.08 },
      ],
    },
    runner_airslash: {
      src: 'assets/sprites/hyungsub-runner-airslash.png',
      scale: 0.1453,
      faces: 'right',
      colorKey: { rMin: 150, gMax: 110, bMin: 150 },
      frames: [
        { rect: [0, 0, 512, 512], pivot: [263, 439], duration: 0.09 },
        { rect: [512, 0, 512, 512], pivot: [215, 438], duration: 0.09 },
        { rect: [0, 512, 512, 512], pivot: [255, 363], duration: 0.09 },
        { rect: [512, 512, 512, 512], pivot: [217, 390], duration: 0.09 },
      ],
    },
  },
  expelled_viewer: {
    legraise: {
      src: 'assets/sprites/expelled-viewer-legraise.png',
      scale: 0.8,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 4 }, (_, i) => ({ rect: [(i % 2) * 96, Math.floor(i / 2) * 96, 96, 96], pivot: [48, 88], duration: 0.23 })),
    },
    knockdown: {
      src: 'assets/sprites/expelled-viewer-knockdown.png',
      scale: 0.8,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 4 }, (_, i) => ({ rect: [(i % 2) * 96, Math.floor(i / 2) * 96, 96, 96], pivot: [48, 88], duration: i === 3 ? 0.5 : 0.12 })),
    },
    crouch: {
      src: 'assets/sprites/expelled-viewer-crouch.png',
      scale: 0.8,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 4 }, (_, i) => ({ rect: [(i % 2) * 96, Math.floor(i / 2) * 96, 96, 96], pivot: [48, 88], duration: 0.14 })),
    },
    reveal: {
      src: 'assets/sprites/expelled-viewer-reveal.png',
      scale: 0.8,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 4 }, (_, i) => ({ rect: [(i % 2) * 96, Math.floor(i / 2) * 96, 96, 96], pivot: [48, 88], duration: i === 3 ? 0.6 : 0.12 })),
    },
    dance: {
      src: 'assets/sprites/expelled-viewer-dance.png',
      scale: 0.8,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 8 }, (_, i) => ({ rect: [(i % 2) * 96, Math.floor(i / 2) * 96, 96, 96], pivot: [48, 88], duration: 0.18 })),
    },
  },
  baron_intro: {
    roar: {
      src: 'assets/enemies/baron-roar.png',
      scale: 160 / 256,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: [
        { rect: [0, 0, 256, 256], pivot: [128, 240], duration: 0.25 },
        { rect: [256, 0, 256, 256], pivot: [128, 240], duration: 0.35 },
        { rect: [0, 256, 256, 256], pivot: [128, 240], duration: 0.8 },
        { rect: [256, 256, 256, 256], pivot: [128, 240], duration: 0.35 },
      ],
    },
  },
  // 영클 변신형(BUILD211/212): 테나 전투 대기(사용자 GIF)처럼 웅크린 채 앞으로 뻗은 팔이 작은 원을 그리고 몸이 들썩이는 루프. 시트는 이미 투명이라 colorKey 는 안 걸린다. scale 0.5 = assets/sprites 2x 시트와 같은 크기(320 셀 → 229px)
  youngcle_tvform: {
    idle: {
      src: 'assets/sprites/youngcle_tvform.png',
      scale: 0.5,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 4 }, (_, i) => ({ rect: [i * 320, 0, 320, 320], pivot: [160, 312], duration: 0.16 })),
    },
  },
  // 영클 힘 받는 4단계(BUILD211): 웅크림 → 무릎·주먹 → 노려봄 → 포효. 컷신(ship_control.js)이 단계별로 프레임을 골라 loopCharacterMotion 에 건다(떨림은 두 프레임을 빠르게 번갈아)
  youngcle_powerup: {
    rise: {
      src: 'assets/sprites/youngcle_powerup.png',
      scale: 0.5,
      colorKey: { rMin: 256, gMax: -1, bMin: 256 },
      frames: Array.from({ length: 4 }, (_, i) => ({ rect: [i * 128, 0, 128, 128], pivot: [64, 122], duration: 0.5 })),
    },
  },
  // 청소부 호탕한 웃음(BUILD227 사용자 “얼굴 올려서, 쥰희 웃음마냥”): gpt-image-2.5-sunburst 2×2 raw 그대로(마젠타 색키), 발 밑변 pivot·배율은 assets/source/janitor-v1/laugh-contract.json. 소리는 델타룬 거슨 웃음 원음 laugh_janitor
  janitor: {
    laugh: {
      src: 'assets/sprites/janitor-laugh.png',
      // 옆모습(오른쪽을 보는 시트, BUILD229 사용자 “옆모습으로 웃는 느낌”): faces 'right' — 왼쪽을 보고 있으면 world.js 가 좌우 반전. 배율·pivot 은 걷기 시트 옆 프레임(46px, 발 가운데) 에 맞춤(laugh-contract.json)
      faces: 'right',
      scale: 0.117,
      colorKey: { rMin: 150, gMax: 110, bMin: 150 },
      frames: [
        { rect: [0, 0, 512, 512], pivot: [264, 465], duration: 0.24 },
        { rect: [512, 0, 512, 512], pivot: [253, 465], duration: 0.30 },
        { rect: [0, 512, 512, 512], pivot: [264, 443], duration: 0.24 },
        { rect: [512, 512, 512, 512], pivot: [255, 443], duration: 0.32 },
      ],
    },
  },
  junhee: {
    laugh: {
      src: 'assets/sprites/junhee-laugh.png',
      scale: 84 / 512 / 2,
      colorKey: { rMin: 220, gMax: 40, bMin: 220 },
      frames: [
        { rect: [0, 0, 627, 627], pivot: [317, 585], duration: 0.24 },
        { rect: [627, 0, 627, 627], pivot: [298, 588], duration: 0.30 },
        { rect: [0, 627, 627, 627], pivot: [319, 566], duration: 0.24 },
        { rect: [627, 627, 627, 627], pivot: [298, 567], duration: 0.32 },
      ],
    },
  },
};
