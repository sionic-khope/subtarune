# 러너 기믹 스프라이트 (runner-v1, BUILD230, 2026-09-19)

사용자 브리핑: "김형섭이 땅을 짚고 검을 뒤로 피융 꺼내며 … 앞으로 잔상 지면서 촥 달리는 스프라이트, 이때 눈쪽엔 그림자 지면서 검을 뒤로 지고 달리는 느낌. x 점프, c 앞을 가르는 공격, 점프 + c 한 바퀴 공중제비. 캐릭터 크기 살짝 작게."

- 참조 `runner-ref.png` = 주인공 걷기 시트 오른쪽 프레임(5배) + 전투 시트 공격 1프레임(검 모양). 참고 영상(lX0SKoUXI5Y 5:45~6:25, 영상 파일은 저장소에 두지 않음) 프레임은 `ref/contact_a.png`, `ref/contact_b.png`(흰 화면 → 웅크린 실루엣 → 잔상 대시 → 달리기).
- 공급자: OpenGateway `openai/gpt-image-2.5-sunburst`, images/edits, quality high, 1024×1024 2×2 셀. 프롬프트 `runner-{prep,run,jump,slash}.prompt.txt`(전송본 `*-raw.prompt.txt`, usage `*-raw.meta.json`, 로그 `gen-*.log`). 각 1회로 채택.
  - prep: 웅크려 땅 짚고 검 손잡이 → 검 뽑아 뒤로 → 웅크린 채 앞으로 → 첫 발
  - run: 검을 뒤로 지고 달리는 4프레임(눈은 머리 그림자에 가림)
  - jump: 도약 → 상승(무릎 접음) → 정점 웅크림(회전용) → 하강
  - slash: 검 들어 올림 → 수평으로 가름 → 아래로 마무리 → 달리기 자세
- 2판(사용자 “머리카락이 살짝 흩날리거나 옷이 흩날리는 기분 … 별로인 애니메이션은 싫음”): run·jump·slash 를 `runner-{run,jump,slash}2.prompt.txt`(강한 맞바람에 머리카락이 뒤로 불꽃처럼 흐르고 셔츠 자락·소매가 뒤로 펄럭이며 프레임마다 흔들림이 다르게)로 다시 생성 → `runner-*2-raw.png` 채택. prep 은 1판 유지(제자리).
- 3판(사용자 1차 녹화 보고 “두손검처럼 둘 다 뒷짐 지고 하단에 둬야지”, “눈에 그림자 진 거 너무 별로”, “점프 때 대각선 살짝 틀어서 하늘 보는 디테일”): 4장 모두 `runner-*3.prompt.txt` 로 다시 — 양손을 등 뒤에서 함께 잡은 검, 칼날은 아래 뒤로, 눈·안경 정상, 머리·셔츠는 뒤로 흩날림, 점프 상승 프레임은 몸을 젖혀 하늘을 봄, 베기는 양손 가로 베기. `runner-*3-raw.png` 채택(1·2판 raw 는 보관).
- 4판(사용자 “확실하게 옆을 보는 느낌, 꼿꼿히 각 잡고, 머리 휘날리는 건 하지 마, 비율은 델타룬 달리기처럼[`kris-run-ref.png` 제공]”, “점프 공격은 위에서 아래로, 착지 모션도”): 게이트웨이가 참조 한 장만 받으므로 `imagegen compose` 로 `runner-ref2.png`(왼쪽 우리 캐릭터+검, 오른쪽 크리스 장면)를 만들어 `runner-{run,slash,prep}4.prompt.txt`, `runner-jump5.prompt.txt`(4번째 = 착지 웅크림), `runner-airslash4.prompt.txt`(공중 내려치기) 로 생성. 완전 옆모습, 큰 머리·짧은 다리, 양팔 뒤로 꼿꼿한 두 손 검, 흩날림 없음.
- 5판(사용자 “검을 왜 자꾸 위로 들고 있냐 / 칼날이 살짝 위로 들어진 거지 손은 아래로”): 4판은 검이 위로 들려 있었다. 손잡이 규칙을 “손은 허벅지 뒤 아래(어깨 높이 금지), 칼날은 뒤로 뻗되 끝만 살짝 위(어깨 아래)”로 고쳐 `runner-{run,prep,slash,airslash}5.prompt.txt`, `runner-jump6.prompt.txt` 로 5장 재생성 → 채택.
- 6판(사용자 “도적처럼 쥐는 느낌인데 내가 원한 건 두 손”): 5판은 한 손으로 허리 옆에 쥔 듯 보였다. 손잡이 규칙을 “긴 두손검, 양 주먹을 긴 손잡이에 겹쳐 잡고(야구 배트·카타나 두 손 잡기) 팔을 뒤로 쭉 뻗어 엉덩이 뒤 아래에, 칼날은 뒤로 거의 수평”으로 고쳐 `runner-{run,prep,slash,airslash}6.prompt.txt`, `runner-jump7.prompt.txt` 로 5장 재생성 → 채택.
- 런타임: raw 그대로 `assets/sprites/hyungsub-runner-*.png`(마젠타 색키). `CHARACTER_MOTIONS.hyungsub.runner_*` 의 pivot 은 프레임마다 [남색(머리·바지) 가운데, 발 밑변], scale 0.1264(흩날리는 머리 끝까지 46px, 걷기 52px 보다 살짝 작게; 몸 가운데는 반바지 기준) — `runner-contract.json`. `src/world/runner.js` 가 프레임 번호를 직접 고르고 잔상(파란 실루엣)·베기 호·회전 고리를 그린다.
- 소리 `audio/`: 델타룬 디컴파일 저장소(TeamBlossomDevs/DeltaruneDecomp_beta @154f9a9 `sounds/snd_swing`, `snd_criticalswing`, `snd_smallswing`) 원본 wav → `assets/audio/sfx/swing.mp3`(C 베기), `criticalswing.mp3`(공중 회전 베기). smallswing 은 보관만.
