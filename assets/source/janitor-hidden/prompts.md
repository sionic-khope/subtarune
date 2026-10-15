# janitor-hidden 프롬프트·생성 이력

모델 `openai/gpt-image-2.5-sunburst`(OpenGateway, `tools/sprites/imagegen.py`), quality high, n 1, 모두 `images/edits`(참조 1장). 작성 원본 `<이름>.prompt.txt`, 실제 전송 프롬프트 `<이름>-raw.prompt.txt`, usage `<이름>-raw.meta.json`, 실행 로그 `<이름>.gen.log`. 항목당 raw 상한 3.

| # | 항목 | 프롬프트 | 참조(Image1) | 크기 | 시간 | usage(text in / image in / image out) | 결과 |
|---|---|---|---|---|---|---|---|
| 1 | 발차기 | `kick.prompt.txt` | `kick-anchor.png`(승인 공격 0번 프레임 ×3 NEAREST, 768×512 셀 2×2, 발 기준 [430,430]) | 1536×1024 | 33.6s | 684 / 1536 / 1372 | 채택 `kick-raw.png`(셀 1 wind-up·셀 2 kick 사용, 셀 0·3 은 QC 용) |
| 2 | 순간이동 회오리 | `whirl.prompt.txt` | `whirl-ref.png`(제르손 회오리 3장, 마젠타 키, 모양만) | 1024×1024 | 41.4s | 509 / 645 / 1756 | 채택 `whirl-raw.png` |
| 3 | 초승달 휘두르기 궤적 | `slash.prompt.txt` | `slash-ref.png`(제르손 초승달, 좌우 반전해 오른쪽 볼록, 모양만) | 1024×1024 | 40.6s | 466 / 625 / 1756 | 채택 `slash-raw.png`(셀 0–2 사용, 셀 3 가는 점선 조각은 미사용) |
| 4 | 별 탄환 | `star.prompt.txt` | `star-ref.png`(제르손 흰 별 3개, 모양만) | 1024×1024 | 34.0s | 244 / 416 / 1756 | 채택 `star-raw.png` |

합계 4회, 반려·재생성 0회: text in 1,903 · image in 3,222 · image out 6,640 토큰. 응답에 cost 가 없어 실결제액은 미확인. 참고로 providers.md 의 2026-09-14 gpt-image-2 공개 단가(text $5 / image in $8 / image out $30 per 1M)를 대입하면 약 $0.23 이지만 sunburst 단가·게이트웨이 수수료는 확인하지 않았다.

실행 방법(저장소 루트, **bash** 로 — zsh 에서 셸 변수 단어 분리가 안 돼 yongjun-sans 때 호출이 API 에 닿지 않은 적이 있다):

```sh
bash -c '
D=assets/source/janitor-hidden
python3 tools/sprites/imagegen.py generate --prompt-file $D/kick.prompt.txt  --ref $D/kick-anchor.png --size 1536x1024 --quality high --out $D/kick-raw.png
python3 tools/sprites/imagegen.py generate --prompt-file $D/whirl.prompt.txt --ref $D/whirl-ref.png  --size 1024x1024 --quality high --out $D/whirl-raw.png
python3 tools/sprites/imagegen.py generate --prompt-file $D/slash.prompt.txt --ref $D/slash-ref.png  --size 1024x1024 --quality high --out $D/slash-raw.png
python3 tools/sprites/imagegen.py generate --prompt-file $D/star.prompt.txt  --ref $D/star-ref.png   --size 1024x1024 --quality high --out $D/star-raw.png
'
```

raw 는 덮어쓰지 않는다. 다시 만들면 `-raw2.png` 로 번호를 붙인다.
