# 용준 샌즈 옷 히든 보스 스프라이트 (yongjun-sans, 2026-10-15)

요청: 박용준(필드 `assets/sprites/yongjun.png`, 상점 `assets/shop/yongjun-counter.png`)이 언더테일 샌즈 옷(앞 열린 파란 후드 집업·흰 털 후드, 흰 티, 흰 옆줄 검은 반바지, 분홍 슬리퍼)을 입은 히든 보스. 전투 코드는 다른 세션이 연결한다. 이 폴더는 이미지 자산까지만(ready, not integrated).

- 공급자/모델: OpenGateway `openai/gpt-image-2.5-sunburst`, quality high, `tools/sprites/imagegen.py`. 생성 7회, 7개 모두 첫 raw 채택(반려 raw 없음).
- 참조: `ref.png` = 필드 정면 ×5 | 필드 왼쪽 ×5 | 상점 얼굴 crop(가로 결합). 기침·울음 = `ref-idle-sheet.png`(채택 idle raw 0.5배, 배율·발 앵커), 구르기·포옹 = `ref-idle-frame.png`(idle raw 0번 칸 512), 어두운 눈 = `dark/ref-frame0-x6.png`(export 된 idle 0번 프레임 ×6 NEAREST, 마젠타 1024 캔버스 offset 32). 물고기는 참조 없음(generations).
- 재현: `uv run assets/source/yongjun-sans/process.py idle cough cry roll fish hug dark` (저장소 루트). 각 raw 는 `tools/sprites/sheet_processor.py --strict-qc` 를 먼저 통과하고(`<이름>/standard/`), 그 `raw-sheet-clean.png` 를 원본 픽셀로 쓴다.

## 런타임 계약

| 파일 | 크기 | 구성 | 피벗 | 비고 |
|---|---|---|---|---|
| `assets/enemies/yongjun-sans-battle-idle.png` | 320×320 | 2×2, 160 셀, 4프레임 row-major | [80,156] | 0 기본·1 들숨·2 기본·3 어깨 으쓱, 양손 주머니. 키 136(3번 139) |
| `assets/enemies/yongjun-sans-cough.png` | 320×320 | 2×2, 160 셀 | [80,156] | 0 고등어 입에·1 반쯤 먹고 씹기·2 켁·3 더 숙인 켁. 몸만 |
| `assets/enemies/yongjun-sans-cry.png` | 320×320 | 2×2, 160 셀 | [80,156] | 0–1 주먹으로 눈 비빔, 2–3 팔 늘어뜨림, 입 크게·눈 꽉 감음. 눈물 없음 |
| `assets/enemies/yongjun-sans-dark.png` | 160×160 | 1프레임 | [80,156] | idle 0번과 실루엣(알파) 동일, 눈 177px 만 바뀜(검은 빈 눈구멍) |
| `assets/enemies/yongjun-sans-roll.png` | 136×136 | 1프레임 정사각 | [68,68] 중심 | 공 지름 약 119×132. 머리 폭을 idle 과 맞춘 배율(0.2031) |
| `assets/enemies/yongjun-sans-hug.png` | 144×149 | 1프레임 | [100,144] = 용준 발 | 여자(왼쪽)가 용준(오른쪽)을 안음. 용준 키 136 = idle 과 같은 높이 배율 |
| `assets/props/yongjun-fish.png` | 42×17 | 1프레임 | [21,8] 중심 | 고등어 38×13, 머리 왼쪽 |

- idle·cough·cry·dark 는 **배율 하나**(raw px × 0.3277, idle 0번 높이 136 기준). 발 정렬 = 프레임 맨 아래 16 raw px 띠의 가로 중심 → x 80, 맨 아래 불투명 행 → y 156(배제적). 네 시트 모두 발 중심 79.5–80.5, 밑변 156.
- NEAREST, 이진 알파, 마젠타 잔여 0, 마젠타 섞인 어두운 윤곽 픽셀은 같은 밝기의 남색으로 중화, 64 raw px 미만 떨어진 점 제거. 셀 경계 접촉 없음(각 `runtime-contract.json`).
- 어두운 눈: 생성 편집본을 6px 블록 중심으로 다시 160 격자에 샘플링한 뒤 **눈 상자 [50,51,93,65] 안의 어두운 덩어리(≥30px)만** idle 0번 위에 얹고, 덮이지 않은 옛 눈선·흰 반짝임은 피부색으로 지웠다(“기존 시트 변형은 얹어서”). 포즈·배율·발은 idle 0번과 바이트 동일.

## 검수 (작성자 자체 확인, 사용자 승인 전)

- 모든 raw 와 export 를 Read 로 확인: 같은 통통한 용준 얼굴(까만 짧은 머리·가는 눈·웃는 입), 샌즈 옷, idle 양손 주머니, 프레임 수·순서, 마젠타 배경, 셀 경계 미접촉.
- `preview-2x.png`(전체), `singles-3x.png`(dark·roll·hug·fish), `dark/compare-3x.png`(idle 0 대 dark), `field-vs-battle-2x.png`(필드 시트 대 전투 idle), `silhouette-2x.png`(gfx.js `monoPortrait` threshold 0.5 의 파이썬 사본으로 만든 흰/검 2톤).
- 2톤에서 cough·cry·roll·fish·hug 모두 실루엣이 읽힌다. 포옹의 여자 머리·치마·스타킹은 어두운 색이라 2톤에서 검게 칠해지고 흰 윤곽만 남는다(용준 쪽은 흰색 위주). 더 하얗게 보이려면 whiteSprite threshold 를 낮춘다.

## 알려진 한계

- 울음의 “고개를 젖힘”은 약하다(얼굴이 거의 정면, 3번에서만 살짝 위). 입 벌림·눈 감음·주먹/팔 자세는 요청대로.
- 3/4 시점은 얼굴·몸이 왼쪽으로 약간 돈 정도(나람·영클 전투 시트 수준)이고 다리는 정면에 가깝다.
- 구르기 공은 idle 머리 폭 기준이라 꽤 크다(136 정사각). 탄막 상자 크기에 맞춰 코드에서 scale 하면 된다.
- 비용: 응답에 cost/job id 없음 → 실결제액 미확인. usage 는 `prompts.md`.
