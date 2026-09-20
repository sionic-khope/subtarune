const J = text => ({ speaker: '청소부', portrait: 'janitor', voice: 'janitor', text });
const HERO_SCALE = 0.92;
const HERO_BODY_SCALE = HERO_SCALE * 0.8;   // 착지 뒤 대기(깃발 흔드는 ‘댄스’)·공격·회복 자세만 20% 작게(사용자 2026-09-20 “전투 크기만 한 20퍼 줄여줘 그 댄스추고있는애만”). 등장(stand)·웃음은 그대로
export const DRUM_DEVIL_RESCUE = Object.freeze({
  bgm: 'janitor_hero_intro', fade: 1.2, silence: 2, flight: 0.72, surpriseHold: 0.65, lookbackHold: 0.65, reveal: 4.8,
  focusSeconds: 0.75, revealZoom: 0.8, focusZoom: 0.88, revealPan: 500, revealCenterX: 208, focusShake: 1.2,
  flagImpact: { duration: 0.45, recoil: 4, heldRecoil: 10, lean: 0.08, frame: 2, flash: 0.14, shake: 0.32, amp: 7, rightShakeLimit: 2, sound: 'deltarune_release_shoot' },
  // postLanding: 착지 뒤 두 줄(회복·격려)은 요플래(100,164) 발 아래·청소부(122,238) 머리 왼쪽 x 12·y 172 에 두고 꼬리가 오른쪽(청소부 머리, 발에서 headOffset 위)을 가리킨다 — 요플래를 왼쪽으로 옮긴 뒤(2026-09-20) 머리 위 자리(x 12·y ~100)는 요플래 얼굴을 가렸다
  // speech.width 는 상한 — 실제 폭은 가장 긴 줄에 맞춘다(사용자 2026-09-20 "말풍선 너무 빈공간많은것"). offscreen: 카메라가 움직이기 전, 아직 화면 밖(왼쪽)인 청소부의 "도움이 필요한가?" 가 왼쪽 가장자리에서 미끄러져 들어오는 말풍선(x·y 는 화면 좌표, tail 은 왼쪽 밖을 가리키는 꼬리 길이, slide 는 들어오는 시간)
  // charDelay: 구출 말풍선 글자 간격(전투 기본 0.022 의 두 배 이상 — 사용자 2026-09-20 “도움이 필요한가 말풍선도 텍스트 하나씩 띠리링 나와야지”)
  speech: { width: 250, minWidth: 64, pad: 10, lineHeight: 18, fontSize: 14, headOffset: 64, charDelay: 0.055, postLanding: { x: 12, y: 172, width: 100, fontSize: 12, lineHeight: 16, headOffset: 55 }, offscreen: { x: 12, y: 44, tail: 14, slide: 0.22 } },
  laughHold: 1.4, rise: 0.52, returnCamera: 1.28, diveHold: 0.18, dive: 0.34, landHold: 0.8,
  heal: { raise: 0.45, brace: 0.15, hold: 1.05, sound: 'heal' },
  // riseTo -104: 상승이 끝나는 y(reveal y 를 내려도 화면 위로 빠져나가는 높이는 그대로). reveal y 250: 카메라를 뒤로 뺀(zoom 0.8) 화면에서 청소부 발이 200 — 206 이던 때(165)보다 약 20% 아래(사용자 2026-09-20 "카메라 뒤로 전환될때 청소부 위치 살짝만 아래로 20퍼정도"). 246 패널 안에 다 들어온다
  // home 112(전 122): 사용자 2026-09-20 “살짝만 왼쪽에” — 공격 시트 1프레임(왼쪽 끝 14px)이 0.736 배율에서 화면 안에 남는 최소 x 는 110.4. attackHome = home: 공격은 제자리에서(“살짝 앞으로 나가지 말고 제자리에서 바로 공격모션”)
  hero: { src: 'assets/battle/janitor-hero-idle.png', cell: 192, cols: 2, pivot: [138, 180], scale: HERO_BODY_SCALE, frameHolds: [0.1, 0.12, 0.28, 0.14, 0.1, 0.12, 0.28, 0.14], home: [112, 238], attackHome: [112, 238], reveal: [-260, 250], riseTo: -104 },
  stand: { src: 'assets/battle/janitor-hero-stand.png', cell: 192, cols: 1, pivot: [138, 180], scale: HERO_SCALE },
  laugh: { src: 'assets/battle/janitor-hero-laugh.png', cell: 192, cols: 1, pivot: [138, 180], scale: HERO_SCALE },
  kneel: { src: 'assets/battle/yoplait-kneel.png', cell: 96, cols: 1, pivot: [48, 89], scale: 0.8 },
  surprised: { src: 'assets/battle/yoplait-surprised.png', cell: 96, cols: 1, pivot: [48, 89], scale: 0.8 },
  lookback: { src: 'assets/battle/yoplait-lookback.png', cell: 96, cols: 1, pivot: [48, 89], scale: 0.8 },
  flag: { src: 'assets/props/janitor-hero-flag.png', cell: 192, cols: 1, pivot: [96, 96] },
  narration: [
    { voice: 'narrator', text: '... 너무나도 강력하다' },
    { voice: 'narrator', text: '저녀석을 쓰러트릴 방법은 아무래도 없는 것 같다.' },
    { voice: 'narrator', text: '이렇게 나의 운명은 끝나는 것일까.' },
  ],
  greeting: [J('도움이 필요한가?')],
  introduction: [J('옛생각나서 옷을 갈아입었더니 마침 마주치는군'), J('붉은 군단의 전사.'), J('멸공의 깃발이라고 불렸었지.')],
  healLines: [J('많이 힘들어보이네?')],
  ready: [J('자 얼른 저 괴물을 무찔러보게나,')],
});
