# BUILD301 바다 돌고래 도약

내장 이미지 생성 원본의2×2 네 프레임을 `assets/props/choimis-dolphin-breach.png`의128×32 RGBA strip으로 옮겼다. 셀은32×32, 순서는 emerge→apex→dive→splash-tail이다. 원본의 분리된 물방울도 같은 프레임에 속하므로 `component-mode all`을 사용한다.

전체 네 프레임에 하나의 공통 NEAREST 배율을 적용하며, 가장 큰 원본 가로/세로 범위가28px이 되도록 정한다. 프레임별 bbox 크기에 맞춰 독립 확대하지 않아 마지막 꼬리/물보라 프레임은 더 낮다. 가로 중앙16, 불투명 하단30을 공통 정렬점으로 쓰고 런타임의 월드 도약 곡선과 분리한다. 실제 alpha128 이진화 외에 색키·팔레트 교체·수작업 그림은 없다.

```sh
uv run assets/source/choimis-dolphin301/export.py /absolute/path/to/subtarune
```

`raw-sheet.png`는 변경하지 않은 생성 원본이다. 실제 프롬프트는 생성 담당이 같은 폴더에 기록하며, 도구가 공개하지 않은 모델 ID·비용은 unknown이다. `sheet-transparent.png`, `frame-0.png`~`frame-3.png`, `preview-8x.png`, `animation.gif`, `animation-preview-8x.gif`, `qc-meta.json`, `processor/pipeline-meta.json`을 함께 보관한다. 제작 GIF는350ms씩 총1.4초이며 반복은 미리보기 편의다. 실제 게임은24×24 표시 및 장면 소유의 도약/재등장 타이밍을 사용한다.

검수 범위는 최종PNG의 프레임·알파·경계·포즈 차이와 미리보기다. 장면 preload, 바다 영역 마스킹, 실제 도약 곡선은 배경 통합 담당의 별도 검증을 따른다.
