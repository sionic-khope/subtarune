# OpenGateway 실행기 첫 실행 증거 · 2026-09-14

`tools/sprites/imagegen.py`(`/subtarune-imagegen`)의 첫 실제 호출 기록이다. 게임 자산이 아니며 어디에도 등록하지 않는다. 절차 검증용 소품 1장.

## 호출

| 항목 | 값 |
| --- | --- |
| endpoint | `POST https://apis.opengateway.ai/v1/images/generations` (JSON) |
| model | `openai/gpt-image-2` |
| size / quality | 1024x1024 / high |
| 프롬프트 | `extinguisher.prompt.txt` (사본 `extinguisher-raw.prompt.txt`) |
| 소요 | 97.6s |
| usage | input 179(text) / output 7,024(image, 1 page) / total 7,203 tokens — `extinguisher-raw.meta.json` |
| 키 해석 | 스크립트가 macOS 키체인 `og-api-key`에서 읽음(hermes `providers.og.key_cmd`와 동일). 환경변수·`.env` 없이 동작 확인 |
| `models --images` | 10개: `google/gemini-2.5-flash-image`, `gemini-3-pro-image(-preview)`, `gemini-3.1-flash-image(-preview)`, `openai/gpt-image-1-mini`, `gpt-image-1.5`, `gpt-image-2`, `gpt-image-2.5-flare`, `gpt-image-2.5-sunburst` |

## raw 관찰 (Read)

`extinguisher-raw.png` 1024×1024. 순수 마젠타 배경(그라데이션·그림자·글자 없음), 중앙 배치, 굵은 픽셀 클러스터·계단식 검은 외곽선·평면 색, 요청한 왼쪽 호스·상단 게이지·흰 띠 모두 있음. 셀 경계 접촉 없음.

## processor strict-QC

`uv run --with pillow --with numpy python tools/sprites/sheet_processor.py process --input extinguisher-raw.png --target asset --mode single --rows 1 --cols 1 --output-dir standard --cell-size 256 --fit-scale 0.84 --align center --component-mode largest --component-padding 0 --trim-border 0 --strict-qc`

`standard/pipeline-meta.json`: frame 1/1 valid, empty 0, edge_touch 0, paste_clamped 0, component 1개(bbox 383,192–628,798, 면적 113,588). `tools/sprites/sheet_processor.py`는 `lounge148/park-guardian/process-nearest.py`와 같은 저장소 사본이다.

## NEAREST export (테스트 규격)

`final.png` 32×64 셀, pivot(16,62), 최대 envelope 28×60, 실제 bounds (4,2)–(28,62), 배율 0.099, 이진 알파, 마젠타 잔여 0, fringe 제거 20px, 셀 경계 접촉 없음. `preview-4x.png`는 어두운 배경 위 4× NEAREST. 계약 `runtime-contract.json`.

## 미검증

`images/edits`(참조 이미지 첨부, `image[]` multipart)는 아직 호출하지 않았다. 첫 참조 편집 작업에서 응답·참조 반영 여부를 기록한다. 실결제액(gateway 수수료 포함)은 대시보드 로그로 별도 확인한다.
