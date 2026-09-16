---
name: subtarune-imagegen
description: "섭타룬 생성 스프라이트·전투 시트·소품·삽화를 OpenGateway(gpt-image 계열) API 실행기 tools/sprites/imagegen.py 로 Claude가 직접 생성하고, 기존 generate2dsprite processor로 크로마키·정렬·QC·NEAREST export 해 assets/source 계약을 남긴다. '스프라이트 생성', '이미지 생성', '시트 만들어', '도트로 만들어', '얘 버전으로', '생성해줘', 'OG로 만들어' 요청에 사용."
argument-hint: "[무엇을: 예 파크가디언 피격 4프레임 96px, 억빠맨 4방향 이동 시트]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
model: opus
---

# 섭타룬 이미지 생성 실행기 (OpenGateway 경로)

역할 분담: **무엇을·어떤 기준으로** 만들지는 [sprite-production](../subtarune-sprite-production/SKILL.md)과 [공통 이미지 제작 계약](../../../docs/development/sprite-production.md)이 정한다. **어떻게 호출·후처리·기록**하는지가 이 스킬이다. 코드 통합·전달은 [sprite-handoff](../subtarune-sprite-handoff/SKILL.md). 공급자 선택·비용 경계는 [providers](../subtarune-sprite-production/references/providers.md)의 OpenGateway 절을 따른다. 2026-09-14 사용자 확정: 키가 있으면 이 경로가 기본이고 Codex thread 전달(dispatch.md)은 대체 경로다.

## 0. 실행 전

1. sprite-production 1~2단계(승인 자산 찾기·요청 명세)를 먼저 끝낸다. 재생성은 연결 실패의 해결책이 아니다.
2. 키·모델 확인: `python3 tools/sprites/imagegen.py models --images`. 키는 **스크립트가** `OPENGATEWAY_API_KEY` 환경변수 → repo `.env` → `~/.hermes/.env` → macOS 키체인 `og-api-key`(hermes `providers.og.key_cmd`와 같은 항목, 2026-09-14 실측 동작) 순으로 읽는다. 키 값을 대화·파일·로그·프롬프트에 남기지 않는다. 키가 없으면 사용자에게 키체인/환경변수 등록을 요청하고 그동안 자산 독립 작업을 한다.
3. 기본 모델 **`openai/gpt-image-2.5-sunburst`**(2026-09-16 사용자 “2.5 안 쏘?” — 영클 비행 장치 시트로 2·2.5-flare·2.5-sunburst 를 비교해 sunburst 채택: 눈 소용돌이·탈것 음영이 가장 좋고 flare 는 눈동자가 단순해짐). 이전 기본 `openai/gpt-image-2` 는 폴백. 바꾸려면 `--model` 또는 `OPENGATEWAY_IMAGE_MODEL`. 참조 편집(`--ref`)은 `images/edits` multipart로 보낸다. 2026-09-14 실측 계약(Codex 스튜디오, gpt-image-2): `image[]` 배열은 HTTP 400, **단일 `image` 파일 필드**만 성공, `input_fidelity`는 넣지 않음, 참조 PNG 약1.49MB는 HTTP 413·424KB는 성공. 그래서 `--ref`는 한 장만 받고, 역할이 다른 참조 여러 장은 `python3 tools/sprites/imagegen.py compose --out <작업ID>/ref.png --scale 0.5 <앵커.png> <상태.png>`로 한 장에 가로 결합(왼쪽부터 Image1, Image2)한 뒤 보낸다. 프롬프트에 "left part of the image is …, right part is …"로 역할을 적는다. 이 저장소 실행기로 edits를 실제 호출한 기록은 첫 참조 작업에서 providers.md와 STATE에 남긴다.
4. 작업 ID(예 `park158`, `ppaman-hurt-v1`)를 정하고 산출물은 전부 `assets/source/<작업ID>/`에 둔다. 횟수·비용 상한을 요청서에 적는다(기본: 동작당 raw 3회, 초과 시 사용자 보고).

## 1. 프롬프트

직접 쓴다. 규칙 원본 `~/.codex/skills/generate2dsprite/references/prompt-rules.md`, 캐릭터 템플릿 `~/.codex/skills/pixel-character-sprites/references/prompt-template.md`, 통과 사례 `assets/source/park155~157/prompts.md`·`lounge148/*-prompt.txt`·`youngcle134/`. 사례 문장을 이번 대상으로 고쳐 쓰되 과거 반려 특징을 기본값으로 끌어오지 않는다.

processor 통과에 필요한 고정 조건:
- 배경 `Solid pure #FF00FF`, 그라데이션·그림자·바닥·텍스트·테두리·라벨·안내선 없음.
- 정확한 그리드 문장(`EXACTLY 2 columns x 3 rows, 1024x1536 canvas, invisible equal 512px cells`). 몸체는 다중행만: 4프레임 2×2, 6프레임 2×3, 8프레임 2×4, 16프레임 4×4. 단일행 raw 금지. 소품 1개는 단일 이미지.
- 셀 중앙 60~70% 안에 전신, 셀 경계에 닿는 귀·팔·꼬리·무기 없음, 모든 프레임 동일 배율·발 기준선(`Keep feet rooted at the same positions`).
- 정체성 보존 항목을 구체적으로(머리·눈·코·입·의상·대표색·향하는 방향). 캐릭터별 규칙(형섭 입 없음 등)은 그 캐릭터에만.
- 도트 밀도: `coarse sparse pixel clusters, flat limited shades, dark stepped outlines, same sparse logical pixel density as image N`. 출력이 커져도 세부를 늘리지 않음.
- 공격/전투 시트는 body-only(분리된 이펙트·잔상·투사체·속도선 없음). 이펙트는 별도 생성.

참조(`--ref`)는 순서가 Image1, Image2…다. 각 이미지의 역할(정체성 / 도트 밀도 / 자세·배율 앵커 / 상태 변형)을 프롬프트에 명시한다. 발 기준선·배율이 중요한 접지 동작은 **앵커 시트**를 먼저 만든다: 승인 프레임을 128px 셀 offset 16에 배치 → 4× NEAREST → 1024×1536(`assets/source/park157/attack-tiers/anchor.py`). 점프·낙하·비행·투사체·이펙트에는 앵커 시트를 쓰지 않는다.

크기: 2×3 그리드 → `1024x1536`, 2×2/4×4/정사각 소품 → `1024x1024`, 가로 소품 → `1536x1024`. `--quality high` 기본.

## 2. 생성

```sh
python3 tools/sprites/imagegen.py generate \
  --prompt-file assets/source/<작업ID>/<이름>.prompt.txt \
  --size 1024x1536 --quality high \
  [--ref <앵커.png> --ref <상태 참조.png>] \
  --out assets/source/<작업ID>/<이름>-raw.png
```

`--dry-run`은 요청 내용만 출력(키 불필요). 결과 옆에 `<이름>-raw.prompt.txt`(실제 프롬프트·모델·size·refs)와 `<이름>-raw.meta.json`(usage·소요시간, 키 없음)이 남는다. raw PNG는 **덮어쓰지 않는다** — 재생성은 `-raw2.png`처럼 번호를 붙이고 반려 초안도 보존한다. 응답이 `usage`를 주지 않으면 unknown으로 적고 임의 토큰 수로 채우지 않는다.

## 3. 눈으로 확인 (Read)

raw를 Read로 열어 본다. 하나라도 어긋나면 해당 문장을 고쳐 재생성한다(상한 도달 시 raw·원인·남은 기준을 보고하고 멈춘다).

- 프레임 수·행열·순서. 4방향 시트는 **실제 나온 행 순서**를 관찰해 적는다(요청 순서와 다르게 나오는 일이 흔하다 — lounge148은 down/right/left/up으로 나왔다).
- 정체성: 참조/기존 시트와 같은 캐릭터인가. 뒷모습에 얼굴이 없는가. 인형탈처럼 안의 몸이 드러나면 안 되는 대상이 드러나지 않았는가.
- 셀 경계 접촉, 셀 간 배율 흔들림, 포즈가 실제로 변하는가(6개 대기 포즈가 아닌가).
- 배경이 순수 마젠타인가. 도트 밀도가 기존 자산과 맞는가(부드러운 일러스트·안티앨리어싱 아님).

## 4. 후처리·QC·export

`assets/source/park157/cleaning/process.py`(단일 소품), `park157/attack-tiers/process.py`(시트·공통 배율·앵커), `lounge148/park-guardian/`(4방향 이동·행 재정렬)을 사본으로 시작해 `assets/source/<작업ID>/process.py`를 만든다.

1. processor: `uv run --with pillow --with numpy python tools/sprites/sheet_processor.py process --input <raw> --target <npc|creature|asset|player> --mode <idle|attack|single|player_sheet…> --rows R --cols C --output-dir <작업ID>/<action>/standard --strict-qc --component-mode largest [--align feet --scale-strategy preserve] [--max-body-scale-cv 0.08 --max-anchor-y-std 0.05]`. exit≠0이면 raw를 고친다. 임계값 완화·`--allow-source-edge-touch`는 눈으로 본 사유가 있을 때만, README에 적는다. `tools/sprites/sheet_processor.py`는 Codex 스킬 `generate2dsprite.py`의 저장소 사본(LANCZOS→NEAREST, `lounge148/park-guardian/process-nearest.py`와 동일)이며 이 경로를 기본으로 쓴다. 경로를 꾸며 실행했다고 쓰지 않는다.
2. runtime 픽셀은 `standard/raw-sheet-clean.png`(보간 썸네일 아님)에서 **시트당 하나의 배율**로 NEAREST 추출. 프레임별 fit 금지. 발 기준선을 셀 pivot에 맞춰 이동만 한다.
3. 규격은 기존 자산 계약: 필드 64px 셀 pivot(32,60)·down/up/left/right, 전투 96px 셀 pivot(48,90)·왼쪽 향함, 소품은 셀 하단 중앙 pivot. 보스를 64px로 정규화하지 않는다. 이진 알파(≥128), 마젠타 fringe만 제거(분홍 해골·귀·피부 보존), 색 양자화·블러 금지.
4. 남길 것: `runtime-contract.json`(파일·셀·프레임·bounds·pivot·scale·sampling·command), `preview.png`(2× NEAREST, 승인 idle과 나란히), `README.md`(계약 표·재현 명령·QC 관찰·알려진 한계·이 경로/Codex 경로 구분), `prompts.md`(정확한 프롬프트·모델·size·refs·재생성 이력·usage).

최종 검수 5항목은 [공통 이미지 제작 계약 §최종 결과 검수](../../../docs/development/sprite-production.md)를 따른다.

## 5. 로컬 미리보기 (사용자에게 보여주기)

생성물은 만들 때마다 사용자가 바로 볼 수 있게 띄운다(2026-09-14 사용자 요청).

- 개발 서버(:8000, `./dev.sh`)가 떠 있으면 `tools/sprites/viewer.html`로 연다: `open "http://localhost:8000/tools/sprites/viewer.html?dir=assets/source/<작업ID>&files=<이름>-raw.png,final.png&cell=96x96&fps=8"`. `cell`을 주면 시트를 row-major로 재생하고, 1×/2×/4× NEAREST 확대와 체커 배경을 같이 보여준다. `files`를 비우면 서버 디렉터리 목록에서 PNG를 찾는다.
- 서버가 없으면 `preview*.png`를 `open`으로 연다. 원격에서 보는 사용자에게는 `SendUserFile`로 preview와 raw를 함께 보낸다.
- 보여준 뒤 채택/반려 답을 받아 `prompts.md` 이력에 남긴다. 미리보기가 승인 자산 교체를 뜻하지 않는다.

## 6. 통합·보고

등록·배치·모션 연결은 sprite-handoff "통합자가 검증할 것"과 해당 map/enemy/cutscene 스킬, 완료 판단은 [subtarune-verify](../subtarune-verify/SKILL.md)와 [회귀 검사표](../../../docs/development/regression-checks.md)의 자산 행을 따른다. raw 생성·processor 통과·runtime PNG 존재는 자산 단계(ready)의 증거이며, 게임 연결을 요청받았으면 실제 장면(시작/중간/종료)에서 확인할 때까지 integrated가 아니다.

보고에는 사용 모델·생성 횟수·usage·반려 사유·미검증 범위(예: edits 참조 보존)를 적는다. 사용자가 고른 기존 자산·대사·사운드는 바꾸지 않는다.
