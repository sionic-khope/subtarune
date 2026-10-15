# 용준 샌즈 옷 히든 보스 스프라이트 (yongjun-sans)

요청: 박용준(필드 `assets/sprites/yongjun.png`, 상점 `assets/shop/yongjun-counter.png`)이 언더테일 샌즈 옷(앞 열린 파란 후드 집업·흰 털 후드, 흰 티, 흰 옆줄 검은 반바지, 분홍 슬리퍼)을 입은 히든 보스. 전투 코드는 다른 세션이 연결한다. 이 폴더는 이미지 자산까지만(ready, not integrated).

## v2 (2026-10-15 재작업) — 현재 런타임

사용자 반려(v1): “적군 스프라이트 너무 큰거같은데”, “얼굴 디테일이 죽은듯, 그리고 흰색피부로 해줘”, “공격패턴 gpt 도트 잘 쓰라니까”. 이어서 포옹 교체(“단발에 가슴골 더 있어야함 글래머러스한 여자 … 날카로운 상 … 걔가 갑자기 안으니까 전기 우오오오옥!!”)와 구린내 블래스터 추가.

- 공급자/모델: OpenGateway `openai/gpt-image-2.5-sunburst`, quality high, `tools/sprites/imagegen.py`. 이력·usage 는 `prompts.md`.
- 피부: 아주 흰 피부(#FFF2EC 계열). 정체성 참조 `ref2-idle.png` = v1 idle raw 0번 칸 | 상점 얼굴, 둘 다 피부만 기계적으로 하얗게 바꾼 사본(`refs2.py`). 이후 동작은 채택한 `idle-raw2.png` 를 앵커로(`ref2-idle-sheet.png` = 0.5배 시트, `ref2-idle-frame.png` = 0번 칸 512).
- 얼굴이 사는 축소: v1 은 1024 raw 를 NEAREST 점 샘플링으로 약 0.33배 해서 4–5 px 굵기의 눈썹·눈선이 격자 사이로 빠졌다. v2 는 raw 의 획 굵기(≈4.27 raw px)를 게임 1 px 로 잡고(`F = idle 0번 raw 키 / 98`), **블록 투표** 축소를 쓴다: 게임 픽셀마다 F×F raw 블록 전체를 보고 알파는 과반, 색은 가장 많은 색 묶음, 단 어두운 선(lum < 70)이 블록의 40% 이상이면 선이 이긴다. 격자 위상은 0/¼/½/¾ 중 블록 순도가 가장 높은 것을 프레임마다 고른 뒤 정수 이동으로 피벗에 다시 맞춘다. 출력 색은 실제 raw 픽셀의 중앙값(결과 팔레트 양자화 없음).
- 재현(저장소 루트): `uv run assets/source/yongjun-sans/refs2.py` → `uv run assets/source/yongjun-sans/process2.py idle cough cry hug dark roll blaster fx preview`. dark 참조를 다시 만들 때만 `dark-ref`(export 된 idle 기준), 시험 실행은 `--no-export`(소스 폴더에만 씀). 각 raw 는 먼저 `tools/sprites/sheet_processor.py --strict-qc` 를 통과하고(`<이름>/v2/`, 이펙트는 `fx-<이름>/v2/`), 그 `raw-sheet-clean.png` 가 픽셀 원본이다.

### 런타임 계약 (모두 drawScale 1 — 런타임 축소 없음)

| 파일 | 크기 | 구성 | 피벗/기준 | 내용 |
|---|---|---|---|---|
| `assets/enemies/yongjun-sans-battle-idle.png` | 240×240 | 2×2, 120 셀, row-major | [60,116] 발 | 0 기본·1 들숨·2 기본·3 으쓱, 양손 주머니. 키 98(4프레임 모두), 왼쪽 아래 3/4 |
| `assets/enemies/yongjun-sans-cough.png` | 240×240 | 2×2, 120 셀 | [60,116] | 0 고등어 입에·1 반쯤 먹고 씹기·2 켁·3 더 숙인 켁(키 88). 몸만 |
| `assets/enemies/yongjun-sans-cry.png` | 240×240 | 2×2, 120 셀 | [60,116] | 고개 젖히고 입 크게·눈 꽉 감음. 0–1 주먹으로 눈, 2–3 팔 늘어뜨림. 눈물 없음. 키 98–99 |
| `assets/enemies/yongjun-sans-dark.png` | 120×120 | 1프레임 | [60,116] | idle 0번과 눈 상자 [40,38,68,48] 밖은 바이트 동일, 바뀐 64 px = 검은 빈 눈구멍(샌즈 “bad time”) |
| `assets/enemies/yongjun-sans-roll.png` | 64×64 | 1프레임 | [32,32] 중심 | 웅크린 공, bounds [3,1,60,63](57×62) |
| `assets/enemies/yongjun-sans-hug.png` | 90×107 | 1프레임 | [61,104] = 용준 발 | 왼쪽 단발 글래머 여자(날카로운 눈매·빨간 입술·검은 V넥·빨간 펜슬 스커트·하이힐, 한쪽 다리 듦)가 오른쪽 용준을 갑자기 안음, 용준은 굳은 채 동그란 눈·벌린 입 “우오오오옥”. 용준 키 98 = idle 과 같음, 전체 보이는 키 102. 이펙트 없음 |
| `assets/props/yongjun-blaster.png` | 128×64 | 64×64 ×2 가로 | 프레임마다 왼쪽 위 정렬(머리 고정) | 용준 머리 캐리커처 가스터 블래스터, **오른쪽을 봄**. 0 입 닫음, 1 턱 벌림(발사). bounds [2,2,62,56] / [2,2,62,61] |
| `assets/props/yongjun-stench-beam.png` | 128×56 | 128×28 ×2 세로 | 양 끝이 x 0·127 에 닿음(늘이기용 평평한 끝) | 갈색·올리브 구린내 광선, 물결 무늬·가장자리 거품. 0/1 깜빡임. 띠 몸통 y 약 3–25 |
| `assets/props/yongjun-stench.png` | 32×16 | 16×16 ×2 가로 | 중심 | 갈색 가스 덩어리 + 물결 냄새선 2개, 0/1 흔들림 |
| `assets/props/yongjun-spit.png` | 8×8 | 1 | 중심 | 흰/연파랑 침방울(왼쪽 위 꼬리) |
| `assets/props/yongjun-tear.png` | 14×18 | 1 | 중심 | 위가 뾰족한 흰·연파랑 눈물, bounds [1,0,12,18] |
| `assets/props/yongjun-crumb.png` | 10×10 | 1 | 중심 | 나무 파편, bounds [0,0,9,10] |
| `assets/props/yongjun-spark.png` | 24×12 | 12×12 ×2 가로 | 중심 | 노란 전기 불꽃, 0 네 갈래·1 여덟 갈래 |
| `assets/props/yongjun-bolt.png` | 96×40 | 96×20 ×2 세로 | 양 끝이 x 0·95 에 닿음, 몸통 y 약 2–18 | 흰 심·노랑·주황 지그재그 번개(가지 2–3), 0/1 깜빡임. 코드가 회전·늘임 |
| `assets/props/yongjun-fish.png` | 42×17 | 1 | 중심 | v1 그대로(기침 0번 칸 고등어와 크기 맞음) |

- 몸 시트(idle·cough·cry)·dark 는 배율 하나(F = 4.265 raw px / 게임 px). 발 정렬 = 맨 아래 16 raw px 띠의 가로 중심 → x 60, 맨 아래 불투명 행 → y 116. 모든 셀 경계 미접촉(가장 가까운 것: 기침 0번 고등어 꼬리 x 10).
- 이펙트는 효과마다 배율 하나(프레임 둘이 같은 배율): spit 23.0 · tear 26.6 · crumb 29.7 · stench 41.8 · spark 26.7 · blaster 10.5 · roll 7.9. 늘이는 띠(bolt 15.0 / beam 11.1)만 프레임마다 가로 폭에 맞춘 배율(차이 < 1%)이고 가로 위상은 0 으로 고정해 양 끝 열이 비지 않는다. stench 는 1 px 냄새선이 남도록 블록 30% 이상이 불투명이면 불투명(나머지는 과반).
- 이진 알파, 마젠타 잔여 0, NEAREST 계열(블록 투표) — 각 폴더 `runtime-contract2.json`(몸·hug·dark), `fx-<이름>/runtime-contract.json`(이펙트·blaster·roll).

### 검수 (작성자 자체 확인, 사용자 승인 전)

- 모든 raw 와 export 를 Read 로 확인. 얼굴은 최종 크기 4×/8× 로 봤다: idle 네 칸 모두 눈썹·윗눈꺼풀 선·눈동자·코·이 보이는 입, 기침 ><눈·벌린 입, 울음 꽉 감은 눈·위로 벌린 입, 포옹 동그란 눈·벌린 입이 읽힌다.
- `old-vs-new-4x.png`(v1 idle 0 대 v2 idle 0 같은 배율), `preview2-2x.png`(전체), `silhouette2-2x.png`(gfx.js `monoPortrait` threshold 0.5 의 파이썬 사본 2톤).
- 2톤에서 몸·블래스터·번개·눈물·불꽃은 잘 읽힌다. 구린내 광선과 가스는 어두운 올리브라 2톤에서 대부분 검게 칠해지고 테두리만 남는다 — 상자 안에서 원색으로 그리거나 threshold 를 낮추면 된다.

### 알려진 한계

- 구린내 가스·광선 색은 “갈색”보다 올리브 섞인 갈색(광선 요청의 greenish-brown 과 같은 계열)이다.
- 침방울 8×8 은 꼬리가 1 px 점으로만 남는다(그 크기의 한계).
- 포옹 raw 는 용준을 idle 의 약 1.8배로 그려서 hug 만 배율이 다르다(용준 키를 idle 98 에 맞춤). 전체 보이는 키는 102 로 요청 ~96 보다 조금 크다. 96 에 맞추면 용준이 92 로 작아진다.
- 포옹 프롬프트에서 가슴 부위를 직접 묘사한 두 요청은 공급자 안전 필터에 거절됐다(이미지 없음, 과금 없음으로 보임). 채택본은 “V넥이 팔에 가리지 않게”만 적은 raw3.
- 비용: 응답에 cost/job id 없음 → 실결제액 미확인.

## v1 (같은 날 처음 작업, 반려됨)

- raw: `idle-raw.png`·`cough-raw.png`·`cry-raw.png`·`roll-raw.png`·`hug-raw.png`·`dark-raw.png`·`fish-raw.png`, 처리 `process.py`(160 셀, 피벗 [80,156], 키 136, NEAREST 0.3277배). 결과 미리보기 `preview-2x.png`·`singles-3x.png`·`silhouette-2x.png`, 계약 `<이름>/runtime-contract.json`.
- 반려 사유: 너무 큼, 점 샘플링 축소로 얼굴선 손실, 복숭아색 피부, 공격 패턴 그림이 코드 도형. `yongjun-fish.png` 만 v2 에서도 그대로 쓴다.
