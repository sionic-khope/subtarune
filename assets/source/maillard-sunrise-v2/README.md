# 마이야르호 낮은 일출 해 v2

사용자가 지정한 `y70gin1m0tU` 영상 초반의 낮은 수평선 구도와 점진적인 광량 변화만 참고해 새로 생성했다. 영상 프레임이나 원작 에셋을 복사하지 않았다.

- `sun-raw.png`: 내장 이미지 생성 결과. 단색 마젠타 배경의 완전한 해 원본.
- `sun-pipeline-meta.json`: 배경 제거·정렬·QC 기록.
- 런타임: `assets/props/maillard_sun.png`, 256×256 RGBA, 실제 bbox `[53,53,151,150]`.
- 색은 연노랑·크림·옅은 살구 3단계다. 이전의 두꺼운 주황 테두리와 촘촘한 가로 줄은 사용하지 않는다.

생성 프롬프트는 낮은 수평선에 걸리는 거대한 연노랑 해, 얇은 계단형 외곽, 넓은 색면, 원형 전체 보존, 배경 `#FF00FF`, 텍스트·광선·구름·물·풍경 없음으로 제한했다. 런타임이 수평선 아래를 잘라 반원처럼 보이게 한다.

재처리는 `generate2dsprite.py process`의 `asset/single`, 256px, preserve scale, largest component, edge clean 0, strict QC를 사용한다.
