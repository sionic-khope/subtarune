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
