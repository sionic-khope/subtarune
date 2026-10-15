# yongjun-sans 프롬프트·생성 이력

모델 `openai/gpt-image-2.5-sunburst`(OpenGateway), quality high, n 1. 정확한 전송 프롬프트는 각 `<이름>-raw.prompt.txt`, 응답 usage 는 `<이름>-raw.meta.json`, 실행 로그는 `<이름>.gen.log`. 작성 원본은 `<이름>.prompt.txt`.

| # | 항목 | 프롬프트 | 참조(Image1) | 엔드포인트·크기 | 시간 | usage(text in / image in / image out) | 결과 |
|---|---|---|---|---|---|---|---|
| 1 | idle | `idle.prompt.txt` | `ref.png`(필드 정면·왼쪽 ×5 + 상점 얼굴) | edits 1024×1024 | 40.3s | 670 / 476 / 1756 | 채택 `idle-raw.png` |
| 2 | fish | `fish.prompt.txt` | 없음 | generations 1536×1024 | 28.7s | 277 / 0 / 1372 | 채택 `fish-raw.png` |
| 3 | cough | `cough.prompt.txt` | `ref-idle-sheet.png` | edits 1024×1024 | 44.0s | 620 / 1024 / 1756 | 채택 `cough-raw.png` |
| 4 | cry | `cry.prompt.txt` | `ref-idle-sheet.png` | edits 1024×1024 | 40.0s | 571 / 1024 / 1756 | 채택 `cry-raw.png` |
| 5 | roll | `roll.prompt.txt` | `ref-idle-frame.png` | edits 1024×1024 | 39.8s | 405 / 1024 / 1756 | 채택 `roll-raw.png` |
| 6 | hug | `hug.prompt.txt` | `ref-idle-frame.png` | edits 1536×1024 | 32.5s | 560 / 1024 / 1372 | 채택 `hug-raw.png` |
| 7 | dark | `dark.prompt.txt` | `dark/ref-frame0-x6.png` | edits 1024×1024 | 36.8s | 307 / 1024 / 1756 | 채택 `dark-raw.png`(눈 상자만 얹음) |

합계 7회: text in 3,410 · image in 5,596 · image out 11,524 토큰. 반려·재생성 없음(항목당 상한 3, dark 상한 2 중 1회씩 사용). 응답에 cost 가 없어 실결제액은 미확인. 참고로 providers.md 에 적힌 2026-09-14 gpt-image-2 공개 단가(text $5 / image in $8 / image out $30 per 1M)를 그대로 대입하면 약 $0.41 이지만, sunburst 단가와 게이트웨이 수수료는 확인하지 않았다.

처음 발사한 4건(cough·cry·roll·hug)은 셸 변수 단어 분리 실패로 API 에 닿지 않았다(로그 `no such file or directory`, 과금 없음). 같은 프롬프트로 다시 실행한 것이 위 3–6번이다.

## v2 (2026-10-15 재작업)

모델 `openai/gpt-image-2.5-sunburst`(OpenGateway), quality high, n 1. 작성 원본 `<이름>.prompt.txt`, 실제 전송 프롬프트 `<raw>.prompt.txt`, usage `<raw>.meta.json`, 로그 `<이름>.gen.log`. 항목당 raw 상한 3.

| # | 항목 | 프롬프트 | 참조(Image1) | 엔드포인트·크기 | 시간 | usage(text in / image in / image out) | 결과 |
|---|---|---|---|---|---|---|---|
| 8 | idle | `idle2.prompt.txt` | `ref2-idle.png`(v1 idle 0번 + 상점 얼굴, 피부 흰색으로) | edits 1024×1024 | 40.8s | 920 / 528 / 1756 | 채택 `idle-raw2.png` |
| 9 | 침·눈물·파편 | `fx-drops.prompt.txt` | 없음 | generations 1536×1024 | 26.3s | 379 / 0 / 1372 | 채택 `fx-drops-raw.png` |
| 10 | 가스·불꽃 | `fx-puffs.prompt.txt` | 없음 | generations 1024×1024 | 39.2s | 404 / 0 / 1756 | 불꽃 채택. 가스는 30 art px 로 그려져 16 px 에서 냄새선이 끊겨 반려 → 15 |
| 11 | 번개 | `fx-bolt.prompt.txt` | 없음 | generations 1536×1024 | 29.7s | 300 / 0 / 1372 | 채택 `fx-bolt-raw.png` |
| 12 | 구린내 광선 | `fx-beam.prompt.txt` | 없음 | generations 1536×1024 | 31.5s | 342 / 0 / 1372 | 채택 `fx-beam-raw.png` |
| 13 | cough | `cough2.prompt.txt` | `ref2-idle-sheet.png` | edits 1024×1024 | 35.7s | 765 / 1024 / 1756 | 채택 `cough-raw2.png` |
| 14 | cry | `cry2.prompt.txt` | `ref2-idle-sheet.png` | edits 1024×1024 | 39.2s | 766 / 1024 / 1756 | 채택 `cry-raw2.png`(고개 젖힘 v1 보다 큼) |
| 15 | 가스 v2 | `fx-stench2.prompt.txt` | 없음 | generations 1536×1024 | 27.2s | 402 / 0 / 1372 | 채택 `fx-stench-raw2.png`(16 px 용 굵은 모양) |
| 16 | roll | `roll2.prompt.txt` | `ref2-idle-frame.png` | edits 1024×1024 | 34.0s | 509 / 1024 / 1756 | 채택 `roll-raw2.png`(idle 의 약 1.45배로 그려짐 → 64 에 맞춤) |
| 17 | blaster | `blaster.prompt.txt` | `ref2-idle-frame.png` | edits 1536×1024 | 28.4s | 465 / 1024 / 1372 | 채택 `blaster-raw.png` |
| 18 | dark | `dark2.prompt.txt` | `dark/ref2-frame0-x8.png`(export idle 0 ×8) | edits 1024×1024 | 30.7s | 333 / 1024 / 1756 | 채택 `dark-raw2.png`(눈 상자만 얹음, 눈구멍 이동 0/−1 px) |
| — | hug | `hug2-blocked.prompt.txt` | `ref2-idle-frame.png` | edits 1536×1024 | — | — | **안전 필터 거절**(HTTP 400, 이미지 없음) |
| 19 | hug | `hug2.prompt.txt`(완화) `--moderation low` | `ref2-idle-frame.png` | edits 1536×1024 | 28.5s | 672 / 1024 / 1372 | 반려 `hug-raw2.png`: 단발·날카로운 상은 맞지만 V넥이 팔에 가려 최종 크기에서 안 보임 |
| — | hug | `hug3-blocked.prompt.txt` `--moderation low` | `ref2-idle-frame.png` | edits 1536×1024 | — | — | **안전 필터 거절**(가슴 부위를 직접 묘사한 문장) |
| 20 | hug | `hug3.prompt.txt` `--moderation low` | `ref2-idle-frame.png` | edits 1536×1024 | 28.2s | 703 / 1024 / 1372 | 채택 `hug-raw3.png` |

v2 합계: 성공 13회(text in 6,960 · image in 7,696 · image out 20,140 토큰), 거절 2회(이미지 없음). 처음 발사한 5건(cough2·cry2·roll2·hug2·blaster)은 v1 때와 같은 zsh 단어 분리 실수로 API 에 닿지 않았다(과금 없음, 로그는 재실행으로 덮임). 응답에 cost 가 없어 실결제액 미확인. 항목별 raw 수: idle 2 · cough 2 · cry 2 · roll 2 · dark 2 · hug 3(+거절 2) · blaster 1 · stench 2 · 나머지 이펙트 1.
